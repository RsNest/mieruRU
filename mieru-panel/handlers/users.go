package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"mieru-panel/config"
	"mieru-panel/pkg/applog"
	"mieru-panel/pkg/audit"
	"mieru-panel/pkg/notify"
)

func nowUnix() int64 { return time.Now().Unix() }

func (a *App) HandleUsers(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		a.listUsers(w)
	case http.MethodPost:
		a.createUser(w, r)
	default:
		writeJSON(w, http.StatusMethodNotAllowed, apiError{Error: "method not allowed"})
	}
}

func (a *App) HandleUserActions(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/users/")
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) == 0 || parts[0] == "" {
		writeJSON(w, http.StatusNotFound, apiError{Error: "user not found"})
		return
	}
	name := parts[0]
	if len(parts) == 1 && r.Method == http.MethodDelete {
		a.deleteUser(w, name)
		return
	}
	if len(parts) == 1 && (r.Method == http.MethodPatch || r.Method == http.MethodPut) {
		a.updateUser(w, r, name)
		return
	}
	if len(parts) == 2 && parts[1] == "regenerate" && r.Method == http.MethodPost {
		a.regeneratePassword(w, name)
		return
	}
	if len(parts) == 2 && parts[1] == "config" && r.Method == http.MethodGet {
		a.HandleUserConfig(w, r)
		return
	}
	if len(parts) == 2 && parts[1] == "devices" && r.Method == http.MethodDelete {
		a.resetDevices(w, r, name, "")
		return
	}
	if len(parts) == 3 && parts[1] == "devices" && r.Method == http.MethodDelete {
		a.resetDevices(w, r, name, parts[2])
		return
	}
	writeJSON(w, http.StatusMethodNotAllowed, apiError{Error: "method not allowed"})
}

func (a *App) updateUser(w http.ResponseWriter, r *http.Request, name string) {
	var req struct {
		QuotaDay   *int   `json:"quotaDayMB,omitempty"`
		QuotaMonth *int   `json:"quotaMonthMB,omitempty"`
		ExpiresAt  *int64 `json:"expiresAt,omitempty"`
		MaxDevices *int   `json:"maxDevices,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, apiError{Error: "invalid json"})
		return
	}
	err := a.Config.Update(func(cfg *config.Config) error {
		for i := range cfg.Users {
			if cfg.Users[i].Name != name {
				continue
			}
			if req.QuotaDay != nil {
				cfg.Users[i].Quotas.DayMB = *req.QuotaDay
			}
			if req.QuotaMonth != nil {
				cfg.Users[i].Quotas.MonthMB = *req.QuotaMonth
			}
			if req.ExpiresAt != nil {
				cfg.Users[i].ExpiresAt = *req.ExpiresAt
			}
			if req.MaxDevices != nil {
				if *req.MaxDevices < 0 {
					cfg.Users[i].MaxDevices = 0
				} else {
					cfg.Users[i].MaxDevices = *req.MaxDevices
				}
			}
			return nil
		}
		return errors.New("user not found")
	})
	if err != nil {
		writeJSON(w, http.StatusNotFound, apiError{Error: err.Error()})
		return
	}
	if err := a.syncMitaUsers(); err != nil {
		writeMita502(w, "syncMitaUsers updateUser", err)
		return
	}
	applog.Infof("users", "user %q updated", name)
	audit.Log(audit.Entry{Action: "user.update", Target: name, IP: clientIP(r), Result: "ok"})
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

// resetDevices clears the saved fingerprint list. When fp != "", removes
// only that fingerprint; otherwise empties the whole list (so the user
// can re-import the subscription on every device).
func (a *App) resetDevices(w http.ResponseWriter, r *http.Request, name, fp string) {
	err := a.Config.Update(func(cfg *config.Config) error {
		for i := range cfg.Users {
			if cfg.Users[i].Name != name {
				continue
			}
			if fp == "" {
				cfg.Users[i].Devices = nil
				return nil
			}
			next := cfg.Users[i].Devices[:0]
			for _, d := range cfg.Users[i].Devices {
				if d.Hash != fp {
					next = append(next, d)
				}
			}
			cfg.Users[i].Devices = next
			return nil
		}
		return errors.New("user not found")
	})
	if err != nil {
		writeJSON(w, http.StatusNotFound, apiError{Error: err.Error()})
		return
	}
	applog.Infof("users", "devices reset for user=%q fp=%q", name, fp)
	audit.Log(audit.Entry{Action: "user.devices_reset", Target: name, IP: clientIP(r), Result: "ok", Fields: map[string]any{"fp": fp}})
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

// HandleUsersBulk handles POST /api/users/bulk-delete with body
// {"names":["alice","bob"]} and removes every user listed.
func (a *App) HandleUsersBulk(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, apiError{Error: "method not allowed"})
		return
	}
	var req struct {
		Names []string `json:"names"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, apiError{Error: "invalid json"})
		return
	}
	if len(req.Names) == 0 {
		writeJSON(w, http.StatusBadRequest, apiError{Error: "no users specified"})
		return
	}
	want := map[string]bool{}
	for _, n := range req.Names {
		want[strings.TrimSpace(n)] = true
	}
	removed := 0
	if err := a.Config.Update(func(cfg *config.Config) error {
		next := make([]config.User, 0, len(cfg.Users))
		for _, u := range cfg.Users {
			if want[u.Name] {
				removed++
				continue
			}
			next = append(next, u)
		}
		cfg.Users = next
		return nil
	}); err != nil {
		writeJSON(w, http.StatusInternalServerError, apiError{Error: err.Error()})
		return
	}
	if err := a.syncMitaUsers(); err != nil {
		writeMita502(w, "syncMitaUsers bulkDelete", err)
		return
	}
	applog.Infof("users", "bulk delete removed=%d names=%v", removed, req.Names)
	audit.Log(audit.Entry{Action: "user.bulk_delete", IP: clientIP(r), Result: "ok", Fields: map[string]any{"removed": removed, "names": req.Names}})
	notify.Send(fmt.Sprintf("mieru-panel: <b>%d users removed</b> via bulk delete", removed))
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "removed": removed})
}

func (a *App) listUsers(w http.ResponseWriter) {
	cfg := a.Config.Snapshot()
	statsByName := map[string]UserStats{}
	if stats, err := a.Mita.GetUsers(); err != nil {
		logMitaCLI("listUsers GetUsers", err)
	} else {
		for _, s := range stats {
			statsByName[s.Name] = s
		}
	}
	now := nowUnix()
	items := make([]map[string]any, 0, len(cfg.Users))
	for _, u := range cfg.Users {
		stat := statsByName[u.Name]
		expired := u.ExpiresAt > 0 && u.ExpiresAt < now
		items = append(items, map[string]any{
			"name":       u.Name,
			"password":   u.Password,
			"subToken":   u.SubToken,
			"quotaDayMB": u.Quotas.DayMB,
			"quotaMonMB": u.Quotas.MonthMB,
			"trafficDay": stat.TodayRaw,
			"trafficMon": stat.MonthRaw,
			"lastActive": stat.RawRecord,
			"expiresAt":  u.ExpiresAt,
			"expired":    expired,
			"maxDevices": u.MaxDevices,
			"devices":    u.Devices,
		})
	}
	writeJSON(w, http.StatusOK, map[string]any{"users": items})
}

func (a *App) createUser(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name       string `json:"name"`
		Password   string `json:"password"`
		QuotaDay   int    `json:"quotaDayMB"`
		QuotaMonth int    `json:"quotaMonthMB"`
		ExpiresAt  int64  `json:"expiresAt"`
		MaxDevices int    `json:"maxDevices"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, apiError{Error: "invalid json"})
		return
	}
	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" || req.Password == "" {
		writeJSON(w, http.StatusBadRequest, apiError{Error: "name and password are required"})
		return
	}
	token, err := randomHex(32)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, apiError{Error: err.Error()})
		return
	}

	err = a.Config.Update(func(cfg *config.Config) error {
		for _, u := range cfg.Users {
			if u.Name == req.Name {
				return errors.New("user already exists")
			}
		}
		if req.MaxDevices < 0 {
			req.MaxDevices = 0
		}
		cfg.Users = append(cfg.Users, config.User{
			Name:       req.Name,
			Password:   req.Password,
			SubToken:   token,
			Quotas:     config.Quotas{DayMB: req.QuotaDay, MonthMB: req.QuotaMonth},
			ExpiresAt:  req.ExpiresAt,
			MaxDevices: req.MaxDevices,
		})
		return nil
	})
	if err != nil {
		writeJSON(w, http.StatusBadRequest, apiError{Error: err.Error()})
		return
	}
	if err := a.syncMitaUsers(); err != nil {
		writeMita502(w, "syncMitaUsers createUser", err)
		return
	}
	applog.Infof("users", "user %q created", req.Name)
	audit.Log(audit.Entry{Action: "user.create", Target: req.Name, IP: clientIP(r), Result: "ok"})
	notify.Send(fmt.Sprintf("mieru-panel: <b>user created</b> <code>%s</code>", req.Name))

	// First-user onboarding: if mita is currently IDLE, kick it into
	// RUNNING so the freshly minted user can connect right away. Failures
	// are non-fatal for this endpoint - the panel still reports the user
	// as created and the admin can hit the Start button manually later.
	autoStarted := false
	if status, err := a.Mita.GetStatus(); err == nil && !strings.Contains(strings.ToUpper(status), "RUN") {
		if startErr := a.Mita.Start(); startErr != nil {
			applog.Warnf("mita", "auto-start after first user failed: %v", startErr)
		} else {
			autoStarted = true
			applog.Infof("mita", "proxy auto-started after creating user %q", req.Name)
		}
	}
	writeJSON(w, http.StatusCreated, map[string]any{"ok": true, "autoStarted": autoStarted})
}

func (a *App) deleteUser(w http.ResponseWriter, name string) {
	err := a.Config.Update(func(cfg *config.Config) error {
		next := make([]config.User, 0, len(cfg.Users))
		found := false
		for _, u := range cfg.Users {
			if u.Name == name {
				found = true
				continue
			}
			next = append(next, u)
		}
		if !found {
			return errors.New("user not found")
		}
		cfg.Users = next
		return nil
	})
	if err != nil {
		writeJSON(w, http.StatusNotFound, apiError{Error: err.Error()})
		return
	}
	if err := a.syncMitaUsers(); err != nil {
		writeMita502(w, "syncMitaUsers deleteUser", err)
		return
	}
	applog.Infof("users", "user %q deleted", name)
	audit.Log(audit.Entry{Action: "user.delete", Target: name, Result: "ok"})
	notify.Send(fmt.Sprintf("mieru-panel: <b>user deleted</b> <code>%s</code>", name))
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (a *App) regeneratePassword(w http.ResponseWriter, name string) {
	newPass, err := randomHex(16)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, apiError{Error: err.Error()})
		return
	}
	err = a.Config.Update(func(cfg *config.Config) error {
		for i := range cfg.Users {
			if cfg.Users[i].Name == name {
				cfg.Users[i].Password = newPass
				return nil
			}
		}
		return errors.New("user not found")
	})
	if err != nil {
		writeJSON(w, http.StatusNotFound, apiError{Error: err.Error()})
		return
	}
	if err := a.syncMitaUsers(); err != nil {
		writeMita502(w, "syncMitaUsers regeneratePassword", err)
		return
	}
	applog.Infof("users", "password regenerated for user %q", name)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "password": newPass})
}

func (a *App) syncMitaUsers() error {
	cfg := a.Config.Snapshot()
	now := nowUnix()
	users := make([]MitaUser, 0, len(cfg.Users))
	for _, u := range cfg.Users {
		// Skip expired users — the proxy refuses their auth and the
		// subscription endpoint hides them; no need to ship them to mita.
		if u.ExpiresAt > 0 && u.ExpiresAt < now {
			continue
		}
		users = append(users, MitaUser{Name: u.Name, Password: u.Password})
	}
	portRange := strings.TrimSpace(cfg.ServerPortRange)
	return a.Mita.ApplyUsers(users, portRange, MitaApplyOptions{
		LoggingLevel: cfg.LoggingLevel,
		MTU:          cfg.MTU,
		Multiplexing: cfg.Multiplexing,
	})
}

func randomHex(bytesLen int) (string, error) {
	b := make([]byte, bytesLen)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}
