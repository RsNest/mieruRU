package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"mieru-panel/config"
	"mieru-panel/pkg/applog"
	"mieru-panel/pkg/audit"
)

type subSecurityPayload struct {
	AllowedUserAgents []string `json:"allowedUserAgents"`
	RequireHWID       bool     `json:"requireHWID"`
	// DefaultsList is read-only: the UI shows it as "official clients"
	// presets so the admin can copy them into AllowedUserAgents.
	DefaultsList []string `json:"defaultsList,omitempty"`
}

// HandleSubscriptionSecurity exposes the /sub UA allow-list and the
// "require X-HWID" toggle. Both options together let the admin pin the
// subscription endpoint to specific official clients (Karing/sing-box)
// so a malicious user cannot bypass the device-limit by simply rotating
// the User-Agent header.
func (a *App) HandleSubscriptionSecurity(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		cfg := a.Config.Snapshot()
		writeJSON(w, http.StatusOK, subSecurityPayload{
			AllowedUserAgents: cfg.AllowedUserAgents,
			RequireHWID:       cfg.RequireHWID,
			DefaultsList:      config.DefaultAllowedUserAgents,
		})
	case http.MethodPut, http.MethodPost:
		var req subSecurityPayload
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, apiError{Error: "invalid json"})
			return
		}
		clean := make([]string, 0, len(req.AllowedUserAgents))
		seen := map[string]bool{}
		for _, p := range req.AllowedUserAgents {
			s := strings.TrimSpace(p)
			if s == "" {
				continue
			}
			key := strings.ToLower(s)
			if seen[key] {
				continue
			}
			seen[key] = true
			clean = append(clean, s)
		}
		if err := a.Config.Update(func(cfg *config.Config) error {
			cfg.AllowedUserAgents = clean
			cfg.RequireHWID = req.RequireHWID
			return nil
		}); err != nil {
			writeJSON(w, http.StatusInternalServerError, apiError{Error: err.Error()})
			return
		}
		applog.Infof("config", "sub security updated: ua_filter=%d require_hwid=%t", len(clean), req.RequireHWID)
		audit.Log(audit.Entry{
			Action: "config.sub_security",
			IP:     clientIP(r),
			Result: "ok",
			Fields: map[string]any{
				"allowed_count": len(clean),
				"require_hwid":  req.RequireHWID,
			},
		})
		writeJSON(w, http.StatusOK, map[string]any{"ok": true})
	default:
		writeJSON(w, http.StatusMethodNotAllowed, apiError{Error: "method not allowed"})
	}
}
