package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"mieru-panel/pkg/admin2fa"
	"mieru-panel/pkg/applog"
	"mieru-panel/pkg/audit"

	"github.com/pquerna/otp/totp"
	"golang.org/x/crypto/bcrypt"
)

func (a *App) twoFACoreEnabled() bool {
	return a.TwoFAStore != nil && a.TwoFAKey != nil && len(a.TwoFAKey) == 32
}

func (a *App) encrypt2FASecret(plain string) (string, error) {
	return admin2fa.SealAESGCM(a.TwoFAKey, []byte(plain))
}

func (a *App) decrypt2FASecret(blob string) (string, error) {
	b, err := admin2fa.OpenAESGCM(a.TwoFAKey, blob)
	if err != nil {
		return "", err
	}
	return string(b), nil
}

func (a *App) persist2FA(update func(*admin2fa.Persisted) error) error {
	return a.TwoFAStore.Write(update)
}

// Handle2FASetup creates an encrypted pending TOTP secret and returns otpauth URI + plaintext secret once.
func (a *App) Handle2FASetup(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, apiError{Error: "method not allowed"})
		return
	}
	if !a.twoFACoreEnabled() {
		writeJSON(w, http.StatusServiceUnavailable, apiError{Error: "two-factor storage unavailable"})
		return
	}
	cur, err := a.TwoFAStore.Read()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, apiError{Error: err.Error()})
		return
	}
	if cur.Enabled {
		writeJSON(w, http.StatusConflict, apiError{Error: "2FA already enabled"})
		return
	}
	cfg := a.Config.Snapshot()
	key, err := totp.Generate(totp.GenerateOpts{
		Issuer:      "mieru",
		AccountName: cfg.AdminUsername,
	})
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, apiError{Error: err.Error()})
		return
	}
	secretPlain := key.Secret()
	enc, err := a.encrypt2FASecret(secretPlain)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, apiError{Error: err.Error()})
		return
	}
	if err := a.persist2FA(func(p *admin2fa.Persisted) error {
		p.PendingSecret = enc
		return nil
	}); err != nil {
		writeJSON(w, http.StatusInternalServerError, apiError{Error: err.Error()})
		return
	}
	applog.Infof("auth", "2FA setup initiated (pending secret)")
	writeJSON(w, http.StatusOK, map[string]any{
		"secret": secretPlain,
		"qrUri":  key.URL(),
	})
}

type verifySetupBody struct {
	Code string `json:"code"`
}

// Handle2FAVerifySetup validates the first OTP and enables 2FA.
func (a *App) Handle2FAVerifySetup(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, apiError{Error: "method not allowed"})
		return
	}
	ip := clientIP(r)
	cfg := a.Config.Snapshot()

	var body verifySetupBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		audit.Log(audit.Entry{Action: "2fa.enabled.failed", IP: ip, Actor: cfg.AdminUsername, Result: "failed", Fields: map[string]any{"reason": "bad_json"}})
		writeJSON(w, http.StatusBadRequest, apiError{Error: "invalid json"})
		return
	}

	p, err := a.TwoFAStore.Read()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, apiError{Error: err.Error()})
		return
	}
	if p.Enabled {
		audit.Log(audit.Entry{Action: "2fa.enabled.failed", IP: ip, Actor: cfg.AdminUsername, Result: "failed", Fields: map[string]any{"reason": "already_active"}})
		writeJSON(w, http.StatusConflict, apiError{Error: "already enabled"})
		return
	}
	if p.PendingSecret == "" {
		audit.Log(audit.Entry{Action: "2fa.enabled.failed", IP: ip, Actor: cfg.AdminUsername, Result: "failed", Fields: map[string]any{"reason": "not_pending"}})
		writeJSON(w, http.StatusBadRequest, apiError{Error: "no pending enrollment"})
		return
	}

	secretPlain, err := a.decrypt2FASecret(p.PendingSecret)
	if err != nil || !validateTOTPCode(secretPlain, body.Code, time.Now().UTC()) {
		audit.Log(audit.Entry{Action: "2fa.enabled.failed", IP: ip, Actor: cfg.AdminUsername, Result: "failed", Fields: map[string]any{"reason": "bad_code"}})
		writeJSON(w, http.StatusUnauthorized, apiError{Error: "invalid code"})
		return
	}

	plains, err := admin2fa.GenerateBackupPlainCodes(10)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, apiError{Error: err.Error()})
		return
	}
	hashes, err := admin2fa.HashBackupCodes(plains)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, apiError{Error: err.Error()})
		return
	}

	if err := a.persist2FA(func(st *admin2fa.Persisted) error {
		st.Enabled = true
		st.Secret = st.PendingSecret
		st.PendingSecret = ""
		st.ActivatedAt = time.Now().UTC().Format(time.RFC3339)
		st.BackupCodes = hashes
		return nil
	}); err != nil {
		writeJSON(w, http.StatusInternalServerError, apiError{Error: err.Error()})
		return
	}

	audit.Log(audit.Entry{Action: "2fa.enabled", IP: ip, Actor: cfg.AdminUsername, Result: "ok"})
	writeJSON(w, http.StatusOK, map[string]any{"backupCodes": plains})
}

type passwordCodeBody struct {
	Password string `json:"password"`
	Code     string `json:"code"`
}

func (a *App) Handle2FADisable(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, apiError{Error: "method not allowed"})
		return
	}
	ip := clientIP(r)
	cfg := a.Config.Snapshot()

	var body passwordCodeBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, apiError{Error: "invalid json"})
		return
	}

	p, err := a.TwoFAStore.Read()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, apiError{Error: err.Error()})
		return
	}
	if !p.Enabled {
		writeJSON(w, http.StatusBadRequest, apiError{Error: "2FA not enabled"})
		return
	}

	if bcrypt.CompareHashAndPassword([]byte(cfg.AdminPasswordHash), []byte(body.Password)) != nil {
		audit.Log(audit.Entry{Action: "2fa.disabled.failed", IP: ip, Actor: cfg.AdminUsername, Result: "failed", Fields: map[string]any{"reason": "bad_password"}})
		writeJSON(w, http.StatusUnauthorized, apiError{Error: "invalid password"})
		return
	}

	sec, err := a.decrypt2FASecret(p.Secret)
	if err != nil || !validateTOTPCode(sec, body.Code, time.Now().UTC()) {
		audit.Log(audit.Entry{Action: "2fa.disabled.failed", IP: ip, Actor: cfg.AdminUsername, Result: "failed", Fields: map[string]any{"reason": "bad_code"}})
		writeJSON(w, http.StatusUnauthorized, apiError{Error: "invalid code"})
		return
	}

	if err := a.persist2FA(func(st *admin2fa.Persisted) error {
		*st = admin2fa.Persisted{}
		return nil
	}); err != nil {
		writeJSON(w, http.StatusInternalServerError, apiError{Error: err.Error()})
		return
	}
	audit.Log(audit.Entry{Action: "2fa.disabled", IP: ip, Actor: cfg.AdminUsername, Result: "ok"})
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (a *App) Handle2FARegenerateBackup(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, apiError{Error: "method not allowed"})
		return
	}
	ip := clientIP(r)
	cfg := a.Config.Snapshot()

	var body passwordCodeBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, apiError{Error: "invalid json"})
		return
	}

	p, err := a.TwoFAStore.Read()
	if err != nil || !p.Enabled {
		writeJSON(w, http.StatusBadRequest, apiError{Error: "2FA not enabled"})
		return
	}

	if bcrypt.CompareHashAndPassword([]byte(cfg.AdminPasswordHash), []byte(body.Password)) != nil {
		audit.Log(audit.Entry{Action: "2fa.regenerate_backup", IP: ip, Actor: cfg.AdminUsername, Result: "failed", Fields: map[string]any{"reason": "bad_password"}})
		writeJSON(w, http.StatusUnauthorized, apiError{Error: "invalid password"})
		return
	}
	sec, err := a.decrypt2FASecret(p.Secret)
	if err != nil || !validateTOTPCode(sec, body.Code, time.Now().UTC()) {
		audit.Log(audit.Entry{Action: "2fa.regenerate_backup", IP: ip, Actor: cfg.AdminUsername, Result: "failed", Fields: map[string]any{"reason": "bad_code"}})
		writeJSON(w, http.StatusUnauthorized, apiError{Error: "invalid code"})
		return
	}

	plains, err := admin2fa.GenerateBackupPlainCodes(10)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, apiError{Error: err.Error()})
		return
	}
	hashes, err := admin2fa.HashBackupCodes(plains)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, apiError{Error: err.Error()})
		return
	}

	if err := a.persist2FA(func(st *admin2fa.Persisted) error {
		st.BackupCodes = hashes
		return nil
	}); err != nil {
		writeJSON(w, http.StatusInternalServerError, apiError{Error: err.Error()})
		return
	}
	audit.Log(audit.Entry{Action: "2fa.regenerate_backup", IP: ip, Actor: cfg.AdminUsername, Result: "ok"})
	writeJSON(w, http.StatusOK, map[string]any{"backupCodes": plains})
}

func (a *App) Handle2FAStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, apiError{Error: "method not allowed"})
		return
	}
	if !a.twoFACoreEnabled() {
		writeJSON(w, http.StatusOK, map[string]any{"enabled": false, "backupCodesRemaining": 0})
		return
	}
	p, err := a.TwoFAStore.Read()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, apiError{Error: err.Error()})
		return
	}
	count := len(p.BackupCodes)
	writeJSON(w, http.StatusOK, map[string]any{
		"enabled":               p.Enabled,
		"backupCodesRemaining":  count,
		"activatedAt":           p.ActivatedAt,
	})
}

func validateTOTPCode(secretBase32, code string, _ time.Time) bool {
	code = strings.TrimSpace(code)
	code = strings.ReplaceAll(code, " ", "")
	if len(code) != 6 || !isAllDigits(code) {
		return false
	}
	return totp.Validate(code, secretBase32)
}

func isAllDigits(s string) bool {
	for _, ch := range s {
		if ch < '0' || ch > '9' {
			return false
		}
	}
	return true
}

func writeLockedLogin(w http.ResponseWriter, until time.Time, msg string) {
	remain := time.Until(until)
	sec := int(remain.Round(time.Second) / time.Second)
	if sec < 1 {
		sec = int((15 * time.Minute).Seconds())
	}
	w.Header().Set("Retry-After", strconv.Itoa(sec))
	secLeft := until.Unix() - time.Now().Unix()
	if secLeft < 1 {
		secLeft = int64(sec)
	}
	writeJSON(w, 423, map[string]any{
		"error":               msg,
		"retry_after_seconds": secLeft,
	})
}
