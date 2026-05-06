package handlers

import (
	"errors"
	"net/http"

	"mieru-panel/pkg/applog"
	"mieru-panel/pkg/mita"
)

// logMitaCLI sends mita CLI failures to applog (stdout + UI ring buffer).
func logMitaCLI(operation string, err error) {
	if err == nil {
		return
	}
	var runErr *mita.RunError
	if errors.As(err, &runErr) {
		applog.Errorf("mita", "%s: %s (stderr=%q)", operation, runErr.Reason, runErr.Stderr)
	} else {
		applog.Errorf("mita", "%s: %v", operation, err)
	}
}

// writeMita502 logs mita subprocess failures (including captured stdout/stderr) and responds with JSON 502.
func writeMita502(w http.ResponseWriter, operation string, err error) {
	if err == nil {
		return
	}
	logMitaCLI(operation, err)
	writeJSON(w, http.StatusBadGateway, apiError{Error: err.Error()})
}
