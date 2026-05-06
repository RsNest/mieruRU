package handlers

import (
	"net/http"
	"strconv"

	"mieru-panel/pkg/audit"
)

// HandleAudit returns the latest N audit entries (newest first). Default 200.
func (a *App) HandleAudit(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, apiError{Error: "method not allowed"})
		return
	}
	n := 200
	if v := r.URL.Query().Get("n"); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil && parsed > 0 && parsed <= 5000 {
			n = parsed
		}
	}
	entries, err := audit.Tail(n)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, apiError{Error: err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"entries": entries})
}

// telegramConfigured tells the UI whether notifications would actually
// flow. We don't expose tokens — only a boolean.
func (a *App) telegramConfigured() bool {
	return notifyConfiguredFunc()
}
