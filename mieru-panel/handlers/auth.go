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

	"mieru-panel/config"
	"golang.org/x/crypto/bcrypt"
)

const sessionCookieName = "mieru_panel_session"

type App struct {
	Config *config.Store
	Mita   MitaClient
}

type MitaClient interface {
	GetUsers() ([]UserStats, error)
	ApplyUsers(users []MitaUser) error
	GetStatus() (string, error)
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

func (a *App) HandleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, apiError{Error: "method not allowed"})
		return
	}
	var req struct {
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, apiError{Error: "invalid json"})
		return
	}
	cfg := a.Config.Snapshot()
	if err := bcrypt.CompareHashAndPassword([]byte(cfg.AdminPasswordHash), []byte(req.Password)); err != nil {
		writeJSON(w, http.StatusUnauthorized, apiError{Error: "invalid credentials"})
		return
	}
	if err := setSessionCookie(w, cfg.SessionSecret); err != nil {
		writeJSON(w, http.StatusInternalServerError, apiError{Error: "failed to create session"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
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
	writeJSON(w, http.StatusOK, map[string]any{"authenticated": true})
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

func setSessionCookie(w http.ResponseWriter, secret string) error {
	expiry := time.Now().Add(24 * time.Hour).Unix()
	payload := "admin|" + strconv.FormatInt(expiry, 10)
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
