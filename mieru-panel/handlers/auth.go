package handlers

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
	"mieru-panel/config"
	"mieru-panel/pkg/admin2fa"
	"mieru-panel/pkg/applog"
	"mieru-panel/pkg/audit"
	"mieru-panel/pkg/ratelimit"
)

const sessionCookieName = "mieru_panel_session"

type App struct {
	Config *config.Store
	Mita   MitaClient
	// MitaLogs returns the last <lines> lines of the mita daemon stdout
	// (collected from the shared log file written by docker-compose's tee
	// wrapper). May be nil.
	MitaLogs func(lines int) (string, error)

	// LoginLimiter throttles failed admin logins per IP.
	LoginLimiter *ratelimit.Limiter
	// SubLimiter throttles subscription fetches per token+ip combo,
	// which both rate-limits credential probing and prevents a single
	// runaway client from exhausting the panel.
	SubLimiter *ratelimit.Limiter

	// Admin TOTP — TwoFAStore/TwoFAKey unset disables persistence layer.
	TwoFAKey    []byte
	TwoFAStore  *admin2fa.Store
	TotpLockout *admin2fa.TotpStep2Lockout
}

// MitaApplyOptions mirrors mita.ApplyOptions through the handlers/mita
// boundary so the handler package does not have to import pkg/mita.
type MitaApplyOptions struct {
	LoggingLevel string
	MTU          int
	Multiplexing string
}

type MitaConnection struct {
	SessionID string `json:"sessionId"`
	Protocol  string `json:"protocol"`
	Local     string `json:"local"`
	Remote    string `json:"remote"`
	State     string `json:"state"`
	RecvQ     string `json:"recvQ"`
	SendQ     string `json:"sendQ"`
	LastRecv  string `json:"lastRecv"`
	LastSend  string `json:"lastSend"`
}

type MitaClient interface {
	GetUsers() ([]UserStats, error)
	ApplyUsers(users []MitaUser, serverPortRange string, opts MitaApplyOptions) error
	EnsurePortBindings(serverPortRange string, opts MitaApplyOptions) error
	GetStatus() (string, error)
	GetConnections() ([]MitaConnection, error)
	Start() error
	Stop() error
}

type MitaUser struct {
	Name     string
	Password string
}

type UserStats struct {
	Name      string
	TodayRaw  string
	MonthRaw  string
	TotalRaw  string
	RawRecord string
}

type apiError struct {
	Error string `json:"error"`
}

type loginPayload struct {
	Username         string `json:"username"`
	Password         string `json:"password,omitempty"`
	Code             string `json:"code,omitempty"`
	ChallengeToken   string `json:"challenge_token,omitempty"`
	UseBackup        bool   `json:"use_backup,omitempty"`
}

func consumeFailedPasswordAttempt(a *App, ip string, w http.ResponseWriter) bool {
	if a.LoginLimiter != nil && !a.LoginLimiter.Allow(ip) {
		applog.Warnf("auth", "login throttled ip=%s", ip)
		audit.Log(audit.Entry{Action: "login.throttled", IP: ip, Result: "denied"})
		writeJSON(w, http.StatusTooManyRequests, apiError{Error: "too many attempts, try again later"})
		return false
	}
	return true
}

func (a *App) HandleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, apiError{Error: "method not allowed"})
		return
	}
	ip := clientIP(r)
	var req loginPayload
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, apiError{Error: "invalid json"})
		return
	}
	req.Username = strings.TrimSpace(req.Username)
	cfg := a.Config.Snapshot()

	// ----- Step 2: TOTP or backup within 60s challenge window -----
	if strings.TrimSpace(req.Code) != "" && strings.TrimSpace(req.ChallengeToken) != "" {
		a.handleLoginTotpFinish(w, r, ip, cfg, &req)
		return
	}

	// ----- Step 1: credentials -----
	if req.Username == "" || req.Password == "" {
		if !consumeFailedPasswordAttempt(a, ip, w) {
			return
		}
		writeJSON(w, http.StatusUnauthorized, apiError{Error: "invalid credentials"})
		return
	}
	if req.Username != cfg.AdminUsername {
		if !consumeFailedPasswordAttempt(a, ip, w) {
			return
		}
		applog.Warnf("auth", "login failed (unknown user) ip=%s username=%q", ip, req.Username)
		audit.Log(audit.Entry{Action: "login.failed", IP: ip, Actor: req.Username, Result: "denied", Fields: map[string]any{"reason": "unknown_user"}})
		writeJSON(w, http.StatusUnauthorized, apiError{Error: "invalid credentials"})
		return
	}
	if err := bcrypt.CompareHashAndPassword([]byte(cfg.AdminPasswordHash), []byte(req.Password)); err != nil {
		if !consumeFailedPasswordAttempt(a, ip, w) {
			return
		}
		applog.Warnf("auth", "login failed (bad password) ip=%s username=%q", ip, req.Username)
		audit.Log(audit.Entry{Action: "login.failed", IP: ip, Actor: req.Username, Result: "denied", Fields: map[string]any{"reason": "bad_password"}})
		writeJSON(w, http.StatusUnauthorized, apiError{Error: "invalid credentials"})
		return
	}

	ok2FA, err := a.admin2FAConfiguredAndEnabled()
	if err != nil {
		applog.Errorf("auth", "2FA state: %v", err)
		writeJSON(w, http.StatusInternalServerError, apiError{Error: "2FA unavailable"})
		return
	}

	if ok2FA {
		ctok := signChallengeToken(req.Username, cfg.SessionSecret, 60*time.Second)
		writeJSON(w, http.StatusOK, map[string]any{"requires_2fa": true, "challenge_token": ctok})
		return
	}

	if err := setSessionCookie(w, cfg.SessionSecret, req.Username); err != nil {
		applog.Errorf("auth", "create session: %v", err)
		writeJSON(w, http.StatusInternalServerError, apiError{Error: "failed to create session"})
		return
	}
	applog.Infof("auth", "login ok ip=%s username=%q", ip, req.Username)
	audit.Log(audit.Entry{Action: "login.ok", IP: ip, Actor: req.Username, Result: "ok"})
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func clientIP(r *http.Request) string {
	if v := strings.TrimSpace(r.Header.Get("X-Forwarded-For")); v != "" {
		if i := strings.IndexByte(v, ','); i >= 0 {
			return strings.TrimSpace(v[:i])
		}
		return v
	}
	host := r.RemoteAddr
	if i := strings.LastIndex(host, ":"); i >= 0 {
		host = host[:i]
	}
	return host
}

func (a *App) HandleLogout(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, apiError{Error: "method not allowed"})
		return
	}
	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookieName,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		SameSite: http.SameSiteStrictMode,
	})
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (a *App) HandleMe(w http.ResponseWriter, r *http.Request) {
	cfg := a.Config.Snapshot()
	writeJSON(w, http.StatusOK, map[string]any{
		"authenticated": true,
		"username":      cfg.AdminUsername,
	})
}

const minAdminPasswordLen = 5

func (a *App) HandleAdminCredentials(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, apiError{Error: "method not allowed"})
		return
	}
	var req struct {
		CurrentPassword string `json:"currentPassword"`
		NewUsername     string `json:"newUsername"`
		NewPassword     string `json:"newPassword"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, apiError{Error: "invalid json"})
		return
	}
	req.NewUsername = strings.TrimSpace(req.NewUsername)
	if req.CurrentPassword == "" || req.NewUsername == "" || req.NewPassword == "" {
		writeJSON(w, http.StatusBadRequest, apiError{Error: "missing fields"})
		return
	}
	if len(req.NewPassword) < minAdminPasswordLen {
		writeJSON(w, http.StatusBadRequest, apiError{Error: "password too short"})
		return
	}
	if !validAdminUsername(req.NewUsername) {
		writeJSON(w, http.StatusBadRequest, apiError{Error: "invalid username"})
		return
	}

	cfgSnap := a.Config.Snapshot()
	if err := bcrypt.CompareHashAndPassword([]byte(cfgSnap.AdminPasswordHash), []byte(req.CurrentPassword)); err != nil {
		writeJSON(w, http.StatusUnauthorized, apiError{Error: "invalid current password"})
		return
	}

	newHash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, apiError{Error: "failed to update credentials"})
		return
	}

	if err := a.Config.Update(func(cfg *config.Config) error {
		cfg.AdminUsername = req.NewUsername
		cfg.AdminPasswordHash = string(newHash)
		return nil
	}); err != nil {
		writeJSON(w, http.StatusInternalServerError, apiError{Error: err.Error()})
		return
	}

	applog.Infof("auth", "admin credentials updated (new username=%q)", req.NewUsername)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (a *App) RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		cfg := a.Config.Snapshot()
		if !validateSessionCookie(r, cfg.SessionSecret) {
			writeJSON(w, http.StatusUnauthorized, apiError{Error: "unauthorized"})
			return
		}
		next.ServeHTTP(w, r)
	})
}

func setSessionCookie(w http.ResponseWriter, secret, username string) error {
	expiry := time.Now().Add(24 * time.Hour).Unix()
	payload := username + "|" + strconv.FormatInt(expiry, 10)
	signature := signPayload(payload, secret)
	value := payload + "|" + signature
	cookieValue := base64.RawURLEncoding.EncodeToString([]byte(value))

	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookieName,
		Value:    cookieValue,
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteStrictMode,
		MaxAge:   24 * 60 * 60,
	})
	return nil
}

func validateSessionCookie(r *http.Request, secret string) bool {
	cookie, err := r.Cookie(sessionCookieName)
	if err != nil {
		return false
	}
	decoded, err := base64.RawURLEncoding.DecodeString(cookie.Value)
	if err != nil {
		return false
	}
	parts := strings.Split(string(decoded), "|")
	if len(parts) != 3 {
		return false
	}
	payload := parts[0] + "|" + parts[1]
	signature := parts[2]
	if !hmac.Equal([]byte(signature), []byte(signPayload(payload, secret))) {
		return false
	}
	expiry, ok := parseI64(parts[1])
	if !ok {
		return false
	}
	return time.Now().Unix() <= expiry
}

func signPayload(payload, secret string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = mac.Write([]byte(payload))
	return hex.EncodeToString(mac.Sum(nil))
}

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func parseI64(s string) (int64, bool) {
	ts, err := strconv.ParseInt(s, 10, 64)
	if err != nil {
		return 0, false
	}
	return ts, true
}
