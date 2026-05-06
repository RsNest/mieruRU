package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"mieru-panel/pkg/applog"
)

// HandleLogs returns the recent panel + mita log entries kept in
// applog's ring buffer. Optional ?since=<seq> for incremental polling.
func (a *App) HandleLogs(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, apiError{Error: "method not allowed"})
		return
	}
	var since uint64
	if v := strings.TrimSpace(r.URL.Query().Get("since")); v != "" {
		if n, err := strconv.ParseUint(v, 10, 64); err == nil {
			since = n
		}
	}
	entries := applog.Snapshot(since)
	writeJSON(w, http.StatusOK, map[string]any{"entries": entries})
}

// HandleMitaLogs proxies `mita logs -n <lines>` so admins can see
// the underlying daemon output from the UI.
func (a *App) HandleMitaLogs(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, apiError{Error: "method not allowed"})
		return
	}
	lines := 200
	if v := strings.TrimSpace(r.URL.Query().Get("lines")); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= 5000 {
			lines = n
		}
	}
	if a.MitaLogs == nil {
		writeJSON(w, http.StatusOK, map[string]any{"output": "", "available": false})
		return
	}
	out, err := a.MitaLogs(lines)
	if err != nil {
		logMitaCLI("HandleMitaLogs", err)
		writeJSON(w, http.StatusOK, map[string]any{"output": "", "available": false, "error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"output": out, "available": true})
}
