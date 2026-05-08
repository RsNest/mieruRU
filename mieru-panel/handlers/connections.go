package handlers

import (
	"net/http"
	"strings"
)

// HandleConnections returns the currently active mita sessions parsed from
// `mita get connections`. When mita is not RUNNING we skip the RPC entirely
// (no CLI call, no log spam) and return an empty list with available=false.
func (a *App) HandleConnections(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, apiError{Error: "method not allowed"})
		return
	}
	status, err := a.Mita.GetStatus()
	if err != nil || !strings.Contains(strings.ToUpper(status), "RUNNING") {
		writeJSON(w, http.StatusOK, map[string]any{
			"items":     []any{},
			"available": false,
			"reason":    "server not running",
		})
		return
	}
	rows, err := a.Mita.GetConnections()
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"items":     []any{},
			"available": false,
			"error":     err.Error(),
		})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"items":     rows,
		"available": true,
	})
}
