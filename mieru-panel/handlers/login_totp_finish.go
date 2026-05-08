package handlers

import (
	"net/http"
	"strings"
	"time"

	"mieru-panel/config"
	"mieru-panel/pkg/admin2fa"
	"mieru-panel/pkg/applog"
	"mieru-panel/pkg/audit"
)

func (a *App) admin2FAConfiguredAndEnabled() (bool, error) {
	if a.TwoFAStore == nil || a.TwoFAKey == nil || len(a.TwoFAKey) != 32 {
		return false, nil
	}
	p, err := a.TwoFAStore.Read()
	if err != nil {
		return false, err
	}
	return p.Enabled && strings.TrimSpace(p.Secret) != "", nil
}

func (a *App) handleLoginTotpFinish(w http.ResponseWriter, _ *http.Request, ip string, cfg config.Config, req *loginPayload) {
	now := time.Now()
	if ut := a.TotpLockout.LockedUntil(req.Username, now); !ut.IsZero() {
		audit.Log(audit.Entry{Action: "2fa.verify.locked", IP: ip, Actor: req.Username, Result: "denied"})
		writeLockedLogin(w, ut, "Too many invalid codes. Try again later.")
		return
	}

	if req.Username != cfg.AdminUsername {
		audit.Log(audit.Entry{Action: "2fa.verify.failed", IP: ip, Actor: req.Username, Result: "denied", Fields: map[string]any{"reason": "wrong_user"}})
		writeJSON(w, http.StatusUnauthorized, apiError{Error: "invalid challenge"})
		return
	}

	if !verifyChallengeToken(req.ChallengeToken, req.Username, cfg.SessionSecret) {
		audit.Log(audit.Entry{Action: "2fa.verify.failed", IP: ip, Actor: req.Username, Result: "denied", Fields: map[string]any{"reason": "bad_challenge"}})
		writeJSON(w, http.StatusUnauthorized, apiError{Error: "invalid or expired challenge"})
		return
	}

	if a.TwoFAStore == nil || a.TwoFAKey == nil || len(a.TwoFAKey) != 32 {
		writeJSON(w, http.StatusInternalServerError, apiError{Error: "two-factor unavailable"})
		return
	}

	state, err := a.TwoFAStore.Read()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, apiError{Error: err.Error()})
		return
	}
	if !state.Enabled || state.Secret == "" {
		writeJSON(w, http.StatusBadRequest, apiError{Error: "two-factor not enabled"})
		return
	}

	secretPlainStr, err := a.decrypt2FASecret(state.Secret)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, apiError{Error: "2FA decryption failed"})
		return
	}

	ok := false
	if req.UseBackup {
		ok = a.maybeConsumeBackup(ip, req.Username, req.Code, state)
	} else if validateTOTPCode(secretPlainStr, req.Code, time.Now().UTC()) {
		ok = true
	} else {
		ok = a.maybeConsumeBackup(ip, req.Username, req.Code, state)
	}

	if !ok {
		audit.Log(audit.Entry{Action: "2fa.verify.failed", IP: ip, Actor: req.Username, Result: "failed", Fields: map[string]any{"reason": "bad_code"}})
		if lock := a.TotpLockout.RecordFailure(req.Username, now); lock != nil {
			audit.Log(audit.Entry{Action: "2fa.verify.locked", IP: ip, Actor: req.Username, Result: "denied"})
			writeLockedLogin(w, *lock, "Too many invalid codes. Try again later.")
			return
		}
		writeJSON(w, http.StatusUnauthorized, apiError{Error: "invalid code"})
		return
	}

	a.TotpLockout.Clear(req.Username)
	if err := setSessionCookie(w, cfg.SessionSecret, req.Username); err != nil {
		applog.Errorf("auth", "create session after 2FA: %v", err)
		writeJSON(w, http.StatusInternalServerError, apiError{Error: "failed to create session"})
		return
	}
	applog.Infof("auth", "login ok (2FA) ip=%s username=%q", ip, req.Username)
	audit.Log(audit.Entry{Action: "2fa.verify.ok", IP: ip, Actor: req.Username, Result: "ok"})
	audit.Log(audit.Entry{Action: "login.ok", IP: ip, Actor: req.Username, Result: "ok"})
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

// maybeConsumeBackup tries to match a backup code against `state` (DB snapshot) and removes it on success.
func (a *App) maybeConsumeBackup(ip, username, code string, state *admin2fa.Persisted) bool {
	idx := admin2fa.MatchBackupCode(code, state.BackupCodes)
	if idx < 0 {
		return false
	}
	if err := a.TwoFAStore.Write(func(st *admin2fa.Persisted) error {
		next := append([]string{}, st.BackupCodes...)
		copy(next[idx:], next[idx+1:])
		st.BackupCodes = next[:len(next)-1]
		return nil
	}); err != nil {
		return false
	}
	audit.Log(audit.Entry{Action: "2fa.backup_used", IP: ip, Actor: username, Result: "ok"})
	return true
}
