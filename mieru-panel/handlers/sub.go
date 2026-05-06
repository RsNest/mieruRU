package handlers

import (
	"net/http"
	"strings"

	"mieru-panel/config"
	"mieru-panel/pkg/applog"
)

// HandleSubscription returns a sing-box / Karing compatible JSON profile for
// the user identified by the URL token. Format mirrors the canonical karing.json
// from docs/install-mieru.md (with dns.strategy=ipv4_only so iOS clients work
// on IPv4-only mobile networks).
func (a *App) HandleSubscription(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, apiError{Error: "method not allowed"})
		return
	}
	token := strings.TrimPrefix(r.URL.Path, "/sub/")
	token = strings.TrimSpace(token)
	if token == "" {
		writeJSON(w, http.StatusNotFound, apiError{Error: "token not found"})
		return
	}
	cfg := a.Config.Snapshot()
	now := nowUnix()
	for _, u := range cfg.Users {
		if u.SubToken != token {
			continue
		}
		if u.ExpiresAt > 0 && u.ExpiresAt < now {
			applog.Warnf("sub", "expired profile requested for user=%q ip=%s", u.Name, clientIP(r))
			writeJSON(w, http.StatusGone, apiError{Error: "subscription expired"})
			return
		}
		profile := buildSingBoxProfile(cfg, u)
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		writeJSON(w, http.StatusOK, profile)
		applog.Infof("sub", "profile served for user=%q ip=%s", u.Name, clientIP(r))
		return
	}
	applog.Warnf("sub", "invalid token from ip=%s", clientIP(r))
	writeJSON(w, http.StatusNotFound, apiError{Error: "invalid token"})
}

// buildSingBoxProfile produces the exact shape Karing/sing-box expects.
// Keep this stable: clients import it once and re-fetch on subscription update.
func buildSingBoxProfile(cfg config.Config, u config.User) map[string]any {
	multiplexing := strings.TrimSpace(cfg.Multiplexing)
	if multiplexing == "" {
		multiplexing = "MULTIPLEXING_HIGH"
	}
	return map[string]any{
		"log": map[string]any{"level": "info"},
		"dns": map[string]any{
			"strategy": "ipv4_only",
			"servers": []map[string]any{
				{"tag": "google", "address": "8.8.8.8"},
			},
		},
		"outbounds": []map[string]any{
			{
				"type":         "mieru",
				"tag":          "mieru-out",
				"server":       cfg.ServerIP,
				"server_port":  cfg.DefaultPort,
				"transport":    "TCP",
				"username":     u.Name,
				"password":     u.Password,
				"multiplexing": multiplexing,
			},
			{"type": "direct", "tag": "direct"},
		},
		"route": map[string]any{"final": "mieru-out"},
	}
}

// HandleUserConfig returns the same sing-box JSON as /sub/<token> but
// for an authenticated admin browsing a user, addressed by name.
// Useful for the UI "Show config" action without sharing the public token.
func (a *App) HandleUserConfig(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, apiError{Error: "method not allowed"})
		return
	}
	path := strings.TrimPrefix(r.URL.Path, "/api/users/")
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) != 2 || parts[1] != "config" || parts[0] == "" {
		writeJSON(w, http.StatusNotFound, apiError{Error: "user not found"})
		return
	}
	name := parts[0]
	cfg := a.Config.Snapshot()
	for _, u := range cfg.Users {
		if u.Name == name {
			writeJSON(w, http.StatusOK, buildSingBoxProfile(cfg, u))
			return
		}
	}
	writeJSON(w, http.StatusNotFound, apiError{Error: "user not found"})
}
