package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"mieru-panel/config"
	"mieru-panel/pkg/applog"
)

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
	if len(parts) == 2 && parts[1] == "regenerate" && r.Method == http.MethodPost {
		a.regeneratePassword(w, name)
		return
	}
	if len(parts) == 2 && parts[1] == "config" && r.Method == http.MethodGet {
		a.HandleUserConfig(w, r)
		return
	}
	writeJSON(w, http.StatusMethodNotAllowed, apiError{Error: "method not allowed"})
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
	items := make([]map[string]any, 0, len(cfg.Users))
	for _, u := range cfg.Users {
		stat := statsByName[u.Name]
		items = append(items, map[string]any{
			"name":       u.Name,
			"password":   u.Password,
			"subToken":   u.SubToken,
			"quotaDayMB": u.Quotas.DayMB,
			"quotaMonMB": u.Quotas.MonthMB,
			"trafficDay": stat.TodayRaw,
			"trafficMon": stat.MonthRaw,
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
		cfg.Users = append(cfg.Users, config.User{
			Name:     req.Name,
			Password: req.Password,
			SubToken: token,
			Quotas:   config.Quotas{DayMB: req.QuotaDay, MonthMB: req.QuotaMonth},
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
	users := make([]MitaUser, 0, len(cfg.Users))
	for _, u := range cfg.Users {
		users = append(users, MitaUser{Name: u.Name, Password: u.Password})
	}
	portRange := strings.TrimSpace(cfg.ServerPortRange)
	return a.Mita.ApplyUsers(users, portRange)
}

func randomHex(bytesLen int) (string, error) {
	b := make([]byte, bytesLen)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}
