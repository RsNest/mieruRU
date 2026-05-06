package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"mieru-panel/config"
	"mieru-panel/pkg/applog"
)

type advancedPayload struct {
	LoggingLevel string `json:"loggingLevel"`
	MTU          int    `json:"mtu"`
	Multiplexing string `json:"multiplexing"`
}

var allowedLogLevels = map[string]struct{}{
	"DEBUG": {}, "INFO": {}, "WARN": {}, "ERROR": {},
}

var allowedMultiplexing = map[string]struct{}{
	"MULTIPLEXING_OFF":    {},
	"MULTIPLEXING_LOW":    {},
	"MULTIPLEXING_MIDDLE": {},
	"MULTIPLEXING_HIGH":   {},
}

// HandleAdvancedSettings exposes mita-side knobs (log level, MTU, mux level)
// so the admin can tweak them from the UI without editing config.json.
func (a *App) HandleAdvancedSettings(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		cfg := a.Config.Snapshot()
		writeJSON(w, http.StatusOK, advancedPayload{
			LoggingLevel: cfg.LoggingLevel,
			MTU:          cfg.MTU,
			Multiplexing: cfg.Multiplexing,
		})
	case http.MethodPut, http.MethodPost:
		var req advancedPayload
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, apiError{Error: "invalid json"})
			return
		}
		req.LoggingLevel = strings.ToUpper(strings.TrimSpace(req.LoggingLevel))
		req.Multiplexing = strings.ToUpper(strings.TrimSpace(req.Multiplexing))
		if _, ok := allowedLogLevels[req.LoggingLevel]; !ok {
			writeJSON(w, http.StatusBadRequest, apiError{
				Error: "loggingLevel must be one of DEBUG/INFO/WARN/ERROR",
			})
			return
		}
		if req.MTU < 1280 || req.MTU > 1500 {
			writeJSON(w, http.StatusBadRequest, apiError{
				Error: "mtu must be in 1280..1500",
			})
			return
		}
		if _, ok := allowedMultiplexing[req.Multiplexing]; !ok {
			writeJSON(w, http.StatusBadRequest, apiError{
				Error: "multiplexing must be one of MULTIPLEXING_OFF/LOW/MIDDLE/HIGH",
			})
			return
		}
		if err := a.Config.Update(func(cfg *config.Config) error {
			cfg.LoggingLevel = req.LoggingLevel
			cfg.MTU = req.MTU
			cfg.Multiplexing = req.Multiplexing
			return nil
		}); err != nil {
			writeJSON(w, http.StatusInternalServerError, apiError{Error: err.Error()})
			return
		}
		applog.Infof("config", "advanced settings updated: log=%s mtu=%d mux=%s",
			req.LoggingLevel, req.MTU, req.Multiplexing)
		if err := a.syncMitaUsers(); err != nil {
			applog.Warnf("mita", "advanced settings: mita sync failed: %v", err)
			writeJSON(w, http.StatusOK, map[string]any{"ok": true, "warning": fmt.Sprintf("mita sync failed: %v", err)})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"ok": true})
	default:
		writeJSON(w, http.StatusMethodNotAllowed, apiError{Error: "method not allowed"})
	}
}
