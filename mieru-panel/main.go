package main

import (
	"bytes"
	"crypto/rand"
	"embed"
	"encoding/hex"
	"encoding/json"
	"errors"
	"flag"
	"io/fs"
	"log"
	"mime"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"mieru-panel/config"
	"mieru-panel/handlers"
	"mieru-panel/pkg/applog"
	"mieru-panel/pkg/mita"

	"golang.org/x/crypto/bcrypt"
)

//go:embed panel/out panel/out/*
var uiDist embed.FS

type mitaAdapter struct {
	client *mita.Client
}

func (m *mitaAdapter) GetUsers() ([]handlers.UserStats, error) {
	stats, err := m.client.GetUsers()
	if err != nil {
		return nil, err
	}
	out := make([]handlers.UserStats, 0, len(stats))
	for _, s := range stats {
		out = append(out, handlers.UserStats{
			Name:      s.Name,
			TodayRaw:  s.TodayRaw,
			MonthRaw:  s.MonthRaw,
			TotalRaw:  s.TotalRaw,
			RawRecord: s.RawRecord,
		})
	}
	return out, nil
}

func (m *mitaAdapter) ApplyUsers(users []handlers.MitaUser, serverPortRange string) error {
	out := make([]mita.User, 0, len(users))
	for _, u := range users {
		out = append(out, mita.User{Name: u.Name, Password: u.Password})
	}
	return m.client.ApplyUsers(out, serverPortRange)
}

func (m *mitaAdapter) EnsurePortBindings(serverPortRange string) error {
	return m.client.EnsurePortBindings(serverPortRange)
}

func (m *mitaAdapter) GetStatus() (string, error) { return m.client.GetStatus() }
func (m *mitaAdapter) Start() error               { return m.client.Start() }
func (m *mitaAdapter) Stop() error                { return m.client.Stop() }

func main() {
	// Pipe everything `log.Print*` does into applog so existing 3rd-party
	// libraries (and any leftover log.Printf calls) end up in docker logs
	// and the in-memory ring buffer.
	log.SetFlags(0)
	log.SetOutput(applog.StdlibSink{Source: "go"})

	if len(os.Args) > 1 && os.Args[1] == "init" {
		if err := runInit(os.Args[2:]); err != nil {
			applog.Errorf("init", "%v", err)
			os.Exit(1)
		}
		return
	}

	configPath := os.Getenv("PANEL_CONFIG")
	if strings.TrimSpace(configPath) == "" {
		configPath = "data/config.json"
	}
	store, err := config.NewStore(configPath)
	if err != nil {
		applog.Errorf("config", "load %s: %v", configPath, err)
		os.Exit(1)
	}

	if err := applyEnvOverrides(store); err != nil {
		applog.Errorf("config", "apply env overrides: %v", err)
	}

	mitaBinary := os.Getenv("MITA_BINARY")
	mitaClient := mita.NewClient(mitaBinary)
	app := &handlers.App{
		Config:   store,
		Mita:     &mitaAdapter{client: mitaClient},
		MitaLogs: mitaClient.Logs,
	}

	go bootstrapMitaLoop(app)

	mux := http.NewServeMux()
	frontendFS, err := fs.Sub(uiDist, "panel/out")
	if err != nil {
		applog.Errorf("ui", "embed fs.Sub: %v", err)
		os.Exit(1)
	}
	mux.Handle("/", spaHandler(frontendFS))
	mux.HandleFunc("/sub/", app.HandleSubscription)
	mux.HandleFunc("/api/login", app.HandleLogin)

	protected := http.NewServeMux()
	protected.HandleFunc("/api/logout", app.HandleLogout)
	protected.HandleFunc("/api/me", app.HandleMe)
	protected.HandleFunc("/api/users", app.HandleUsers)
	protected.HandleFunc("/api/users/", app.HandleUserActions)
	protected.HandleFunc("/api/stats", app.HandleStats)
	protected.HandleFunc("/api/status", app.HandleStatus)
	protected.HandleFunc("/api/mita/start", app.HandleStart)
	protected.HandleFunc("/api/mita/stop", app.HandleStop)
	protected.HandleFunc("/api/mita/logs", app.HandleMitaLogs)
	protected.HandleFunc("/api/admin/credentials", app.HandleAdminCredentials)
	protected.HandleFunc("/api/server-config", app.HandleServerConfig)
	protected.HandleFunc("/api/logs", app.HandleLogs)
	mux.Handle("/api/", app.RequireAuth(protected))

	cfg := store.Snapshot()
	host := strings.TrimSpace(os.Getenv("PANEL_HOST"))
	if host == "" {
		host = "0.0.0.0"
	}
	addr := host + ":" + itoa(cfg.PanelPort)
	applog.Infof("panel", "mieru-panel listening on %s", addr)
	if err := http.ListenAndServe(addr, mux); err != nil {
		applog.Errorf("panel", "listen: %v", err)
		os.Exit(1)
	}
}

// applyEnvOverrides lets `docker compose up` work without running init.sh.
// It honours the env vars on every start (so `PANEL_ADMIN_PASS` can be used
// to reset a forgotten password by simply restarting the container).
func applyEnvOverrides(store *config.Store) error {
	envAdminUser := strings.TrimSpace(os.Getenv("PANEL_ADMIN_USER"))
	envAdminPass := os.Getenv("PANEL_ADMIN_PASS")
	envServerIP := strings.TrimSpace(os.Getenv("PANEL_SERVER_IP"))
	envDefaultPort := strings.TrimSpace(os.Getenv("PANEL_DEFAULT_PORT"))
	envPortRange := strings.TrimSpace(os.Getenv("PANEL_PORT_RANGE"))

	var hashedPass []byte
	if envAdminPass != "" {
		h, err := bcrypt.GenerateFromPassword([]byte(envAdminPass), bcrypt.DefaultCost)
		if err != nil {
			return err
		}
		hashedPass = h
	}

	return store.Update(func(cfg *config.Config) error {
		if envAdminUser != "" && cfg.AdminUsername != envAdminUser {
			cfg.AdminUsername = envAdminUser
			applog.Infof("config", "admin username set from env to %q", envAdminUser)
		}
		if hashedPass != nil {
			cfg.AdminPasswordHash = string(hashedPass)
			applog.Infof("config", "admin password updated from PANEL_ADMIN_PASS")
		}
		if envServerIP != "" && cfg.ServerIP != envServerIP {
			cfg.ServerIP = envServerIP
			applog.Infof("config", "server IP set from env to %s", envServerIP)
		}
		if envDefaultPort != "" {
			if n, err := strconv.Atoi(envDefaultPort); err == nil && n > 0 && n < 65536 {
				if cfg.DefaultPort != n {
					cfg.DefaultPort = n
					applog.Infof("config", "default port set from env to %d", n)
				}
			}
		}
		if envPortRange != "" && cfg.ServerPortRange != envPortRange {
			cfg.ServerPortRange = envPortRange
			applog.Infof("config", "server port range set from env to %s", envPortRange)
		}
		return nil
	})
}

// bootstrapMitaLoop applies portBindings + users to mita on startup,
// retrying every 5s while mita is still warming up. It logs each attempt
// and exits the loop once a sync succeeds.
func bootstrapMitaLoop(app *handlers.App) {
	delay := 2 * time.Second
	for attempt := 1; attempt <= 30; attempt++ {
		if err := app.BootstrapMita(); err != nil {
			applog.Warnf("mita", "bootstrap attempt %d failed: %v", attempt, err)
			time.Sleep(delay)
			if delay < 30*time.Second {
				delay += 2 * time.Second
			}
			continue
		}
		return
	}
	applog.Errorf("mita", "bootstrap gave up after 30 attempts; you can retry from the UI (Server → Apply)")
}

func runInit(args []string) error {
	fs := flag.NewFlagSet("init", flag.ContinueOnError)
	var (
		configPath      = fs.String("config", envOr("PANEL_CONFIG", "data/config.json"), "path to config file")
		serverIP        = fs.String("server-ip", "", "mita server public IP")
		adminPass       = fs.String("admin-pass", "", "admin password")
		firstUser       = fs.String("first-user", "", "first username")
		firstUserPass   = fs.String("first-user-pass", "", "first user password")
		defaultPort     = fs.Int("default-port", 2015, "default mita port")
		serverPortRange = fs.String("server-port-range", "2012-2022", "server port range")
	)
	if err := fs.Parse(args); err != nil {
		return err
	}
	if *serverIP == "" || *adminPass == "" {
		return errors.New("server-ip and admin-pass are required")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(*adminPass), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	sessionSecret, err := randomHex(32)
	if err != nil {
		return err
	}
	cfg := config.Config{
		AdminUsername:     "admin",
		AdminPasswordHash: string(hash),
		ServerIP:          *serverIP,
		ServerPortRange:   *serverPortRange,
		DefaultPort:       *defaultPort,
		PanelPort:         8080,
		BindAddr:          "127.0.0.1",
		SessionSecret:     sessionSecret,
		Users:             []config.User{},
	}
	if strings.TrimSpace(*firstUser) != "" {
		if strings.TrimSpace(*firstUserPass) == "" {
			return errors.New("first-user-pass is required when first-user is provided")
		}
		token, err := randomHex(32)
		if err != nil {
			return err
		}
		cfg.Users = append(cfg.Users, config.User{
			Name:     strings.TrimSpace(*firstUser),
			Password: *firstUserPass,
			SubToken: token,
			Quotas:   config.Quotas{},
		})
	}
	if err := os.MkdirAll(filepath.Dir(*configPath), 0o750); err != nil {
		return err
	}
	body, err := jsonMarshalIndent(cfg)
	if err != nil {
		return err
	}
	return os.WriteFile(*configPath, body, 0o600)
}

// spaHandler serves files baked into the embedded Next.js export.
//
// We deliberately do NOT use http.FileServer for the matched file because
// Go's serveFile rewrites canonical paths (it issues 301 "Moved Permanently"
// redirects for /index.html → ./ and for directory paths missing a trailing
// slash). With a static export at "/" that produces an infinite redirect
// loop in the browser. Instead we resolve the file ourselves and stream
// it via http.ServeContent which only sets caching headers.
func spaHandler(static fs.FS) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		p := path.Clean(r.URL.Path)
		if p == "." || p == "/" {
			serveStatic(w, r, static, "index.html")
			return
		}
		target := strings.TrimPrefix(p, "/")
		// Try the literal path, then path.html, then path/index.html
		// to support Next.js static exports of nested routes.
		for _, candidate := range []string{target, target + ".html", path.Join(target, "index.html")} {
			if exists(static, candidate) {
				serveStatic(w, r, static, candidate)
				return
			}
		}
		// SPA fallback for any unknown path.
		serveStatic(w, r, static, "index.html")
	})
}

func exists(static fs.FS, name string) bool {
	f, err := static.Open(name)
	if err != nil {
		return false
	}
	defer f.Close()
	info, err := f.Stat()
	if err != nil {
		return false
	}
	return !info.IsDir()
}

func serveStatic(w http.ResponseWriter, r *http.Request, static fs.FS, name string) {
	data, err := fs.ReadFile(static, name)
	if err != nil {
		http.Error(w, "frontend build not found", http.StatusServiceUnavailable)
		return
	}
	if ct := mime.TypeByExtension(strings.ToLower(filepath.Ext(name))); ct != "" {
		w.Header().Set("Content-Type", ct)
	}
	// HTML must not be cached; fingerprinted assets under /_next/static can
	// be cached aggressively. Anything else gets a short TTL.
	switch {
	case strings.HasSuffix(name, ".html"):
		w.Header().Set("Cache-Control", "no-store")
	case strings.HasPrefix(name, "_next/static/"):
		w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
	default:
		w.Header().Set("Cache-Control", "public, max-age=300")
	}
	var modtime time.Time
	if info, err := fs.Stat(static, name); err == nil {
		modtime = info.ModTime()
	}
	http.ServeContent(w, r, name, modtime, bytes.NewReader(data))
}

func randomHex(size int) (string, error) {
	b := make([]byte, size)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func envOr(key, fallback string) string {
	val := strings.TrimSpace(os.Getenv(key))
	if val == "" {
		return fallback
	}
	return val
}

func itoa(v int) string {
	return strconv.Itoa(v)
}

func jsonMarshalIndent(v any) ([]byte, error) {
	return json.MarshalIndent(v, "", "  ")
}
