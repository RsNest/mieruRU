package handlers

import (
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"strings"

	"mieru-panel/config"
	"mieru-panel/pkg/applog"
	"mieru-panel/pkg/audit"
	"mieru-panel/pkg/notify"
)

// HandleSubscription returns a sing-box / Karing compatible JSON profile for
// the user identified by the URL token. Format mirrors the canonical karing.json
// from docs/install-mieru.md (with dns.strategy=ipv4_only so iOS clients work
// on IPv4-only mobile networks).
//
// Side-effects:
//   - records the requesting User-Agent + IP as a "device" of the user
//   - returns 403 when MaxDevices is exceeded by an unknown fingerprint
//   - returns 410 when the user has expired
func (a *App) HandleSubscription(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, apiError{Error: "method not allowed"})
		return
	}
	token := strings.TrimPrefix(r.URL.Path, "/sub/")
	token = strings.TrimSpace(token)
	if token == "" {
		writeJSON(w, http.StatusNotFound, apiError{Error: "token not found"})
		return
	}
	ip := clientIP(r)
	ua := r.Header.Get("User-Agent")
	hwid := strings.TrimSpace(r.Header.Get("X-HWID"))
	if a.SubLimiter != nil && !a.SubLimiter.Allow(token+"|"+ip) {
		applog.Warnf("sub", "rate limited ip=%s token=%s", ip, token[:8])
		writeJSON(w, http.StatusTooManyRequests, apiError{Error: "too many requests"})
		return
	}

	cfg := a.Config.Snapshot()
	now := nowUnix()
	for i := range cfg.Users {
		u := cfg.Users[i]
		if u.SubToken != token {
			continue
		}
		if u.ExpiresAt > 0 && u.ExpiresAt < now {
			applog.Warnf("sub", "expired profile requested for user=%q ip=%s", u.Name, ip)
			audit.Log(audit.Entry{Action: "sub.denied", Target: u.Name, IP: ip, Result: "expired"})
			writeJSON(w, http.StatusGone, apiError{Error: "subscription expired"})
			return
		}
		if cfg.RequireHWID && hwid == "" {
			applog.Warnf("sub", "missing X-HWID for user=%q ip=%s ua=%q", u.Name, ip, ua)
			audit.Log(audit.Entry{Action: "sub.denied", Target: u.Name, IP: ip, Result: "missing_hwid", Fields: map[string]any{"ua": ua}})
			writeJSON(w, http.StatusForbidden, apiError{Error: "client does not present X-HWID"})
			return
		}
		if !uaAllowed(ua, cfg.AllowedUserAgents) {
			applog.Warnf("sub", "blocked UA for user=%q ip=%s ua=%q", u.Name, ip, ua)
			audit.Log(audit.Entry{Action: "sub.denied", Target: u.Name, IP: ip, Result: "ua_blocked", Fields: map[string]any{"ua": ua}})
			writeJSON(w, http.StatusForbidden, apiError{Error: "this client is not permitted"})
			return
		}
		fp := deviceFingerprint(hwid, ua)
		allowed, reason := a.recordDevice(u.Name, fp, hwid, ua, ip)
		if !allowed {
			applog.Warnf("sub", "device limit hit user=%q ip=%s ua=%q hwid=%q", u.Name, ip, ua, hwid)
			audit.Log(audit.Entry{Action: "sub.denied", Target: u.Name, IP: ip, Result: reason, Fields: map[string]any{"ua": ua, "hwid": hwid}})
			notify.Send("mieru-panel: <b>device limit hit</b> for user <code>" + u.Name + "</code> from " + ip)
			writeJSON(w, http.StatusForbidden, apiError{Error: "device limit reached for this subscription"})
			return
		}
		profile := buildSingBoxProfile(cfg, u)
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		writeJSON(w, http.StatusOK, profile)
		applog.Infof("sub", "profile served for user=%q ip=%s ua=%q hwid=%q", u.Name, ip, ua, hwid)
		audit.Log(audit.Entry{Action: "sub.served", Target: u.Name, IP: ip, Result: "ok", Fields: map[string]any{"ua": ua, "hwid": hwid, "fp": fp}})
		return
	}
	applog.Warnf("sub", "invalid token from ip=%s", ip)
	audit.Log(audit.Entry{Action: "sub.invalid_token", IP: ip, Result: "denied"})
	writeJSON(w, http.StatusNotFound, apiError{Error: "invalid token"})
}

// deviceFingerprint hashes (HWID, UA) into a stable opaque identifier.
// HWID is preferred — clients like Karing emit it via X-HWID and it
// survives UA changes, defeating the trivial "rotate the User-Agent
// header" bypass. We intentionally do NOT include the source IP so
// that a phone roaming between Wi-Fi and LTE counts as one device.
func deviceFingerprint(hwid, ua string) string {
	hwid = strings.TrimSpace(hwid)
	if hwid != "" {
		sum := sha256.Sum256([]byte("hwid:" + hwid))
		return hex.EncodeToString(sum[:])[:16]
	}
	clean := strings.TrimSpace(ua)
	if clean == "" {
		clean = "unknown"
	}
	sum := sha256.Sum256([]byte("ua:" + clean))
	return hex.EncodeToString(sum[:])[:16]
}

// uaAllowed reports whether `ua` matches any case-insensitive substring
// in `allowed`. An empty allow-list disables the filter (legacy / "any
// client" mode).
func uaAllowed(ua string, allowed []string) bool {
	if len(allowed) == 0 {
		return true
	}
	low := strings.ToLower(ua)
	for _, p := range allowed {
		p = strings.TrimSpace(p)
		if p == "" {
			continue
		}
		if strings.Contains(low, strings.ToLower(p)) {
			return true
		}
	}
	return false
}

// recordDevice adds (or refreshes) a fingerprint on a user, enforcing
// MaxDevices. Returns (allowed, denyReason). When MaxDevices == 0, the
// limit is disabled and any new fingerprint is accepted.
func (a *App) recordDevice(name, fp, hwid, ua, ip string) (bool, string) {
	allowed := true
	reason := ""
	now := nowUnix()
	updateErr := a.Config.Update(func(cfg *config.Config) error {
		for i := range cfg.Users {
			if cfg.Users[i].Name != name {
				continue
			}
			u := &cfg.Users[i]
			for j := range u.Devices {
				if u.Devices[j].Hash == fp {
					u.Devices[j].LastSeen = now
					u.Devices[j].IP = ip
					if hwid != "" && u.Devices[j].HWID == "" {
						u.Devices[j].HWID = hwid
					}
					if ua != "" {
						u.Devices[j].UserAgent = ua
					}
					return nil
				}
			}
			if u.MaxDevices > 0 && len(u.Devices) >= u.MaxDevices {
				allowed = false
				reason = "device_limit"
				return nil
			}
			u.Devices = append(u.Devices, config.DeviceFingerprint{
				Hash:      fp,
				HWID:      hwid,
				UserAgent: ua,
				IP:        ip,
				FirstSeen: now,
				LastSeen:  now,
			})
			return nil
		}
		return nil
	})
	if updateErr != nil {
		applog.Warnf("sub", "device record update failed user=%q: %v", name, updateErr)
	}
	return allowed, reason
}

// buildSingBoxProfile produces the exact shape Karing/sing-box expects.
// Keep this stable: clients import it once and re-fetch on subscription update.
func buildSingBoxProfile(cfg config.Config, u config.User) map[string]any {
	multiplexing := strings.TrimSpace(cfg.Multiplexing)
	if multiplexing == "" {
		multiplexing = "MULTIPLEXING_HIGH"
	}
	return map[string]any{
		"log": map[string]any{"level": "info"},
		"dns": map[string]any{
			"strategy": "ipv4_only",
			"servers": []map[string]any{
				{"tag": "google", "address": "8.8.8.8"},
			},
		},
		"outbounds": []map[string]any{
			{
				"type":         "mieru",
				"tag":          "mieru-out",
				"server":       cfg.ServerIP,
				"server_port":  cfg.DefaultPort,
				"transport":    "TCP",
				"username":     u.Name,
				"password":     u.Password,
				"multiplexing": multiplexing,
			},
			{"type": "direct", "tag": "direct"},
		},
		"route": map[string]any{"final": "mieru-out"},
	}
}

// HandleUserConfig returns the same sing-box JSON as /sub/<token> but
// for an authenticated admin browsing a user, addressed by name.
// Useful for the UI "Show config" action without sharing the public token.
func (a *App) HandleUserConfig(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, apiError{Error: "method not allowed"})
		return
	}
	path := strings.TrimPrefix(r.URL.Path, "/api/users/")
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) != 2 || parts[1] != "config" || parts[0] == "" {
		writeJSON(w, http.StatusNotFound, apiError{Error: "user not found"})
		return
	}
	name := parts[0]
	cfg := a.Config.Snapshot()
	for _, u := range cfg.Users {
		if u.Name == name {
			writeJSON(w, http.StatusOK, buildSingBoxProfile(cfg, u))
			return
		}
	}
	writeJSON(w, http.StatusNotFound, apiError{Error: "user not found"})
}
