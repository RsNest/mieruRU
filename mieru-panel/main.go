package main

import (
	"crypto/rand"
	"embed"
	"encoding/hex"
	"encoding/json"
	"errors"
	"flag"
	"io/fs"
	"log"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strconv"
	"strings"

	"mieru-panel/config"
	"mieru-panel/handlers"
	"mieru-panel/pkg/mita"

	"golang.org/x/crypto/bcrypt"
)

//go:embed web/dist web/dist/*
var webDist embed.FS

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
	if len(os.Args) > 1 && os.Args[1] == "init" {
		if err := runInit(os.Args[2:]); err != nil {
			log.Fatal(err)
		}
		return
	}

	configPath := os.Getenv("PANEL_CONFIG")
	if strings.TrimSpace(configPath) == "" {
		configPath = "data/config.json"
	}
	store, err := config.NewStore(configPath)
	if err != nil {
		log.Fatal(err)
	}

	mitaBinary := os.Getenv("MITA_BINARY")
	app := &handlers.App{
		Config: store,
		Mita:   &mitaAdapter{client: mita.NewClient(mitaBinary)},
	}

	mux := http.NewServeMux()
	frontendFS, err := fs.Sub(webDist, "web/dist")
	if err != nil {
		log.Fatal(err)
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
	protected.HandleFunc("/api/admin/credentials", app.HandleAdminCredentials)
	mux.Handle("/api/", app.RequireAuth(protected))

	cfg := store.Snapshot()
	host := strings.TrimSpace(os.Getenv("PANEL_HOST"))
	if host == "" {
		host = "0.0.0.0"
	}
	addr := host + ":" + itoa(cfg.PanelPort)
	log.Printf("mieru-panel listening on %s", addr)
	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatal(err)
	}
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

func spaHandler(static fs.FS) http.Handler {
	fileServer := http.FileServer(http.FS(static))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		p := path.Clean(r.URL.Path)
		if p == "." {
			p = "/"
		}
		target := strings.TrimPrefix(p, "/")
		if target == "" {
			target = "index.html"
		}
		f, err := static.Open(target)
		if err == nil {
			_ = f.Close()
			fileServer.ServeHTTP(w, r)
			return
		}
		index, indexErr := static.Open("index.html")
		if indexErr != nil {
			http.Error(w, "frontend build not found", http.StatusServiceUnavailable)
			return
		}
		_ = index.Close()
		r.URL.Path = "/index.html"
		fileServer.ServeHTTP(w, r)
	})
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
