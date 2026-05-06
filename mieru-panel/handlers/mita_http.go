package handlers

import (
	"errors"
	"log"
	"net/http"

	"mieru-panel/pkg/mita"
)

// logMitaCLI prints mita CLI failures to stderr (e.g. docker logs).
func logMitaCLI(operation string, err error) {
	if err == nil {
		return
	}
	var runErr *mita.RunError
	if errors.As(err, &runErr) {
		log.Printf("mita error [%s]: %v; stdout=%q stderr=%q", operation, err, runErr.Stdout, runErr.Stderr)
	} else {
		log.Printf("mita error [%s]: %v", operation, err)
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
