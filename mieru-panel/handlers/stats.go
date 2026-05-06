package handlers

import (
	"net/http"
	"strings"
)

func (a *App) HandleStats(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, apiError{Error: "method not allowed"})
		return
	}
	stats, err := a.Mita.GetUsers()
	if err != nil {
		writeMita502(w, "HandleStats GetUsers", err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"stats": stats})
}

func (a *App) HandleStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, apiError{Error: "method not allowed"})
		return
	}
	status, err := a.Mita.GetStatus()
	if err != nil {
		writeMita502(w, "HandleStatus GetStatus", err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"status": status})
}

func (a *App) HandleStart(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, apiError{Error: "method not allowed"})
		return
	}
	cfg := a.Config.Snapshot()
	portRange := strings.TrimSpace(cfg.ServerPortRange)
	if err := a.Mita.EnsurePortBindings(portRange); err != nil {
		writeMita502(w, "EnsurePortBindings before mita start", err)
		return
	}
	if err := a.Mita.Start(); err != nil {
		writeMita502(w, "mita start", err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (a *App) HandleStop(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, apiError{Error: "method not allowed"})
		return
	}
	if err := a.Mita.Stop(); err != nil {
		writeMita502(w, "mita stop", err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}
