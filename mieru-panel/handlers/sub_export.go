package handlers

import (
	"fmt"
	"net/http"
	"strings"
	"time"
)

// HandleSubscriptionsExport returns a plaintext list of subscription URLs
// for every non-expired user, one per line, prefixed with the user name.
// The link uses the request Host header so the admin doesn't have to
// remember the public IP/port.
func (a *App) HandleSubscriptionsExport(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, apiError{Error: "method not allowed"})
		return
	}
	cfg := a.Config.Snapshot()
	scheme := "http"
	if r.TLS != nil || strings.EqualFold(r.Header.Get("X-Forwarded-Proto"), "https") {
		scheme = "https"
	}
	host := r.Host
	if host == "" {
		host = strings.TrimSpace(cfg.ServerIP)
	}
	now := time.Now().Unix()
	var b strings.Builder
	b.WriteString("# mieru-panel subscriptions export\n")
	b.WriteString("# format: <user>\\t<sing-box JSON URL>\n")
	for _, u := range cfg.Users {
		if u.ExpiresAt > 0 && u.ExpiresAt < now {
			continue
		}
		fmt.Fprintf(&b, "%s\t%s://%s/sub/%s\n", u.Name, scheme, host, u.SubToken)
	}
	stamp := time.Now().UTC().Format("20060102-150405")
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.Header().Set(
		"Content-Disposition",
		fmt.Sprintf(`attachment; filename="mieru-subscriptions-%s.txt"`, stamp),
	)
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(b.String()))
}
