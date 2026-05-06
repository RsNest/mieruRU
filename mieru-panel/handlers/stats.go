package handlers

import (
	"errors"
	"net/http"
	"strings"

	"mieru-panel/pkg/applog"
	"mieru-panel/pkg/mita"
)

// isDaemonOffline returns true when the mita CLI reports that the server
// daemon is unreachable (process down, socket missing, gRPC EOF, etc).
// We surface this as a normal "OFFLINE" state to the UI instead of a 502
// so polling endpoints don't spam the log with errors while the user is
// configuring the panel.
func isDaemonOffline(err error) bool {
	if err == nil {
		return false
	}
	var runErr *mita.RunError
	if !errors.As(err, &runErr) {
		return false
	}
	msg := strings.ToLower(runErr.Reason + " " + runErr.Stderr + " " + runErr.Stdout)
	switch {
	case strings.Contains(msg, "daemon is not running"),
		strings.Contains(msg, "connection refused"),
		strings.Contains(msg, "no such file or directory"),
		strings.Contains(msg, "code = unavailable"),
		strings.Contains(msg, "transport: error while dialing"),
		strings.Contains(msg, "eof"):
		return true
	}
	return false
}

func (a *App) HandleStats(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, apiError{Error: "method not allowed"})
		return
	}
	stats, err := a.Mita.GetUsers()
	if err != nil {
		if isDaemonOffline(err) {
			writeJSON(w, http.StatusOK, map[string]any{"stats": []any{}, "available": false})
			return
		}
		writeMita502(w, "HandleStats GetUsers", err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"stats": stats, "available": true})
}

func (a *App) HandleStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, apiError{Error: "method not allowed"})
		return
	}
	status, err := a.Mita.GetStatus()
	if err != nil {
		if isDaemonOffline(err) {
			writeJSON(w, http.StatusOK, map[string]any{"status": "OFFLINE", "available": false})
			return
		}
		writeMita502(w, "HandleStatus GetStatus", err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"status": status, "available": true})
}

func (a *App) HandleStart(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, apiError{Error: "method not allowed"})
		return
	}
	cfg := a.Config.Snapshot()
	portRange := strings.TrimSpace(cfg.ServerPortRange)
	if portRange == "" {
		writeJSON(w, http.StatusBadRequest, apiError{
			Error: "server port range is not configured; open Server tab and set it",
		})
		return
	}
	if len(cfg.Users) == 0 {
		writeJSON(w, http.StatusBadRequest, apiError{
			Error: "create at least one user before starting mita",
		})
		return
	}

	// Already running? Just acknowledge and skip the apply/reload/start
	// trio - no point in churning the daemon when a click was duplicated
	// (every UI click otherwise triggers `apply config` + `reload` + `start`).
	if status, err := a.Mita.GetStatus(); err == nil && strings.Contains(strings.ToUpper(status), "RUN") {
		writeJSON(w, http.StatusOK, map[string]any{"ok": true, "alreadyRunning": true})
		return
	}

	// Push current users into mita first; this also creates portBindings if
	// they were missing. Without users mita would refuse to start the proxy
	// and the daemon may close the gRPC connection (EOF on the client side).
	if err := a.syncMitaUsers(); err != nil {
		writeMita502(w, "syncMitaUsers before mita start", err)
		return
	}

	if err := a.Mita.Start(); err != nil {
		writeMita502(w, "mita start", err)
		return
	}
	applog.Infof("mita", "proxy started (users=%d, range=%s)", len(cfg.Users), portRange)
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
	applog.Infof("mita", "proxy stopped")
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}
