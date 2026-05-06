package handlers

import (
	"net/http"
	"strings"
)

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
	for _, u := range cfg.Users {
		if u.SubToken != token {
			continue
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"log": map[string]any{"level": "info"},
			"dns": map[string]any{
				"strategy": "ipv4_only",
				"servers": []map[string]any{
					{"tag": "google", "address": "8.8.8.8", "detour": "mieru-out"},
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
					"multiplexing": "MULTIPLEXING_HIGH",
				},
				{"type": "direct", "tag": "direct"},
			},
			"route": map[string]any{"final": "mieru-out"},
		})
		return
	}
	writeJSON(w, http.StatusNotFound, apiError{Error: "invalid token"})
}
