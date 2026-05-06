package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"mieru-panel/config"
	"mieru-panel/pkg/applog"
)

// HandleConfigBackup downloads the panel config.json snapshot. The session
// secret and admin password hash are kept so a clean restore reproduces
// admin login state exactly.
func (a *App) HandleConfigBackup(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, apiError{Error: "method not allowed"})
		return
	}
	cfg := a.Config.Snapshot()
	body, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, apiError{Error: err.Error()})
		return
	}
	stamp := time.Now().UTC().Format("20060102-150405")
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set(
		"Content-Disposition",
		fmt.Sprintf(`attachment; filename="mieru-panel-backup-%s.json"`, stamp),
	)
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(body)
	applog.Infof("config", "backup downloaded by ip=%s", clientIP(r))
}

// HandleConfigRestore replaces the running config with the uploaded JSON.
// Bind addr / panel port / session secret are preserved from the current
// running config so the operator does not get logged out by accident.
func (a *App) HandleConfigRestore(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost && r.Method != http.MethodPut {
		writeJSON(w, http.StatusMethodNotAllowed, apiError{Error: "method not allowed"})
		return
	}
	defer r.Body.Close()
	var incoming config.Config
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(&incoming); err != nil {
		writeJSON(w, http.StatusBadRequest, apiError{
			Error: fmt.Sprintf("invalid json: %v", err),
		})
		return
	}
	current := a.Config.Snapshot()
	if err := a.Config.Update(func(cfg *config.Config) error {
		incoming.PanelPort = current.PanelPort
		incoming.BindAddr = current.BindAddr
		// Session secret only kept if not explicitly overridden in the
		// uploaded backup, so cookies issued before the restore stay valid.
		if strings.TrimSpace(incoming.SessionSecret) == "" {
			incoming.SessionSecret = current.SessionSecret
		}
		if strings.TrimSpace(incoming.AdminPasswordHash) == "" {
			incoming.AdminPasswordHash = current.AdminPasswordHash
		}
		if strings.TrimSpace(incoming.AdminUsername) == "" {
			incoming.AdminUsername = current.AdminUsername
		}
		*cfg = incoming
		return nil
	}); err != nil {
		writeJSON(w, http.StatusInternalServerError, apiError{Error: err.Error()})
		return
	}
	applog.Infof("config", "config restored from backup by ip=%s", clientIP(r))
	if err := a.syncMitaUsers(); err != nil {
		applog.Warnf("mita", "post-restore mita sync failed: %v", err)
		writeJSON(w, http.StatusOK, map[string]any{
			"ok":      true,
			"warning": fmt.Sprintf("mita sync failed: %v", err),
		})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}
