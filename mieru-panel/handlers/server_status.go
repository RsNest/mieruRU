package handlers

import "strings"

// isMitaRunning reports whether the mita CLI considers the server daemon
// running (same rule as HandleConnections). Used to avoid `mita get
// connections` when idle, including from metrics scrapers.
func (a *App) isMitaRunning() bool {
	status, err := a.Mita.GetStatus()
	if err != nil {
		return false
	}
	return strings.Contains(strings.ToUpper(status), "RUNNING")
}
