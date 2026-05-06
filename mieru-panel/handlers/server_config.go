package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"regexp"
	"strings"

	"mieru-panel/config"
	"mieru-panel/pkg/applog"
)

var portRangeRe = regexp.MustCompile(`^\d{1,5}-\d{1,5}$`)

type serverConfigPayload struct {
	ServerIP        string `json:"serverIP"`
	DefaultPort     int    `json:"defaultPort"`
	ServerPortRange string `json:"serverPortRange"`
}

// HandleServerConfig exposes the public-facing server settings (IP/ports)
// so admins can manage them from the UI without editing config.json.
func (a *App) HandleServerConfig(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		cfg := a.Config.Snapshot()
		writeJSON(w, http.StatusOK, serverConfigPayload{
			ServerIP:        cfg.ServerIP,
			DefaultPort:     cfg.DefaultPort,
			ServerPortRange: cfg.ServerPortRange,
		})
	case http.MethodPut, http.MethodPost:
		var req serverConfigPayload
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, apiError{Error: "invalid json"})
			return
		}
		req.ServerIP = strings.TrimSpace(req.ServerIP)
		req.ServerPortRange = strings.TrimSpace(req.ServerPortRange)

		if req.ServerIP == "" {
			writeJSON(w, http.StatusBadRequest, apiError{Error: "serverIP is required"})
			return
		}
		if req.DefaultPort <= 0 || req.DefaultPort > 65535 {
			writeJSON(w, http.StatusBadRequest, apiError{Error: "defaultPort must be in 1..65535"})
			return
		}
		if !portRangeRe.MatchString(req.ServerPortRange) {
			writeJSON(w, http.StatusBadRequest, apiError{Error: "serverPortRange must be like 2012-2022"})
			return
		}

		if err := a.Config.Update(func(cfg *config.Config) error {
			cfg.ServerIP = req.ServerIP
			cfg.DefaultPort = req.DefaultPort
			cfg.ServerPortRange = req.ServerPortRange
			return nil
		}); err != nil {
			writeJSON(w, http.StatusInternalServerError, apiError{Error: err.Error()})
			return
		}
		applog.Infof("config", "server settings updated: %s:%d (range=%s)", req.ServerIP, req.DefaultPort, req.ServerPortRange)

		// Push the new port range to mita immediately. Failure here is
		// non-fatal: we still saved the config and the user can retry start.
		if err := a.syncMitaUsers(); err != nil {
			applog.Warnf("config", "mita sync after server-settings change failed: %v", err)
			writeJSON(w, http.StatusOK, map[string]any{"ok": true, "warning": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"ok": true})
	default:
		writeJSON(w, http.StatusMethodNotAllowed, apiError{Error: "method not allowed"})
	}
}

// BootstrapMita is called on panel start and brings mita to a known state:
//   - ensure portBindings/loggingLevel/mtu are applied
//   - push current panel users into mita
//
// Best-effort: failures are logged and returned, callers may retry.
func (a *App) BootstrapMita() error {
	cfg := a.Config.Snapshot()
	portRange := strings.TrimSpace(cfg.ServerPortRange)
	opts := MitaApplyOptions{
		LoggingLevel: cfg.LoggingLevel,
		MTU:          cfg.MTU,
		Multiplexing: cfg.Multiplexing,
	}
	if err := a.Mita.EnsurePortBindings(portRange, opts); err != nil {
		return fmt.Errorf("ensure port bindings: %w", err)
	}
	if len(cfg.Users) > 0 {
		if err := a.syncMitaUsers(); err != nil {
			return fmt.Errorf("sync users: %w", err)
		}
	}
	applog.Infof("mita", "bootstrap ok: range=%s users=%d", portRange, len(cfg.Users))
	return nil
}

// ErrMitaUnavailable is returned by BootstrapMita callers when mita is not running
// yet; the panel keeps running and retries in background.
var ErrMitaUnavailable = errors.New("mita is not available")
