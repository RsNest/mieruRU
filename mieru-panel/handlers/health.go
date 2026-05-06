package handlers

import (
	"fmt"
	"net/http"
	"strings"
	"time"
)

var startedAt = time.Now()

// HandleHealthz reports basic process liveness. Always 200 unless the
// configured store cannot be read (catastrophic state).
func (a *App) HandleHealthz(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, apiError{Error: "method not allowed"})
		return
	}
	cfg := a.Config.Snapshot()
	mitaStatus := "unknown"
	if status, err := a.Mita.GetStatus(); err == nil {
		mitaStatus = status
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"ok":         true,
		"uptime_sec": int64(time.Since(startedAt).Seconds()),
		"users":      len(cfg.Users),
		"mita":       mitaStatus,
		"telegram":   a.telegramConfigured(),
	})
}

// HandleMetrics renders a tiny Prometheus exposition. Stable metric
// names so dashboards survive panel upgrades.
func (a *App) HandleMetrics(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, apiError{Error: "method not allowed"})
		return
	}
	cfg := a.Config.Snapshot()
	mitaState := 0
	if status, err := a.Mita.GetStatus(); err == nil {
		if strings.Contains(strings.ToUpper(status), "RUN") {
			mitaState = 1
		}
	}
	connCount := 0
	if rows, err := a.Mita.GetConnections(); err == nil {
		connCount = len(rows)
	}

	var b strings.Builder
	fmt.Fprintf(&b, "# HELP mieru_panel_uptime_seconds Time since panel started.\n")
	fmt.Fprintf(&b, "# TYPE mieru_panel_uptime_seconds counter\n")
	fmt.Fprintf(&b, "mieru_panel_uptime_seconds %d\n", int64(time.Since(startedAt).Seconds()))

	fmt.Fprintf(&b, "# HELP mieru_panel_users_total Number of configured users.\n")
	fmt.Fprintf(&b, "# TYPE mieru_panel_users_total gauge\n")
	fmt.Fprintf(&b, "mieru_panel_users_total %d\n", len(cfg.Users))

	fmt.Fprintf(&b, "# HELP mieru_panel_mita_running 1 when mita reports RUNNING, 0 otherwise.\n")
	fmt.Fprintf(&b, "# TYPE mieru_panel_mita_running gauge\n")
	fmt.Fprintf(&b, "mieru_panel_mita_running %d\n", mitaState)

	fmt.Fprintf(&b, "# HELP mieru_panel_active_connections Number of mita sessions returned by `mita get connections`.\n")
	fmt.Fprintf(&b, "# TYPE mieru_panel_active_connections gauge\n")
	fmt.Fprintf(&b, "mieru_panel_active_connections %d\n", connCount)

	w.Header().Set("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(b.String()))
}
