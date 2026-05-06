package handlers

import (
	"net/http"
)

// HandleConnections returns the currently active mita sessions parsed from
// `mita get connections`. When the proxy is IDLE this returns an empty list
// with available=false instead of erroring out, so the UI can render
// "no active connections" gracefully.
func (a *App) HandleConnections(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, apiError{Error: "method not allowed"})
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
