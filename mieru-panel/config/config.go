package config

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"sync"

	"golang.org/x/crypto/bcrypt"
)

const (
	defaultBindAddr  = "127.0.0.1"
	defaultPanelPort = 8080
)

type Quotas struct {
	DayMB   int `json:"dayMB"`
	MonthMB int `json:"monthMB"`
}

type DeviceFingerprint struct {
	// Hash is the stable identifier (hex(sha256("hwid:"+X-HWID)) or
	// hex(sha256("ua:"+UserAgent))[:16]). HWID takes precedence — that
	// way changing the User-Agent in the client does NOT spawn a new
	// "device" slot for the same hardware.
	Hash      string `json:"hash"`
	HWID      string `json:"hwid,omitempty"`
	UserAgent string `json:"userAgent,omitempty"`
	IP        string `json:"ip,omitempty"`
	FirstSeen int64  `json:"firstSeen"`
	LastSeen  int64  `json:"lastSeen"`
}

type User struct {
	Name     string `json:"name"`
	Password string `json:"password"`
	SubToken string `json:"subToken"`
	Quotas   Quotas `json:"quotas"`
	// ExpiresAt is the Unix-seconds timestamp after which the user can no
	// longer fetch the subscription. Zero means "never expires".
	ExpiresAt int64 `json:"expiresAt,omitempty"`

	// MaxDevices caps how many distinct UA fingerprints can fetch the
	// subscription. Zero means "no limit". Devices is the rolling list
	// of fingerprints that have already fetched the sub.
	MaxDevices int                 `json:"maxDevices,omitempty"`
	Devices    []DeviceFingerprint `json:"devices,omitempty"`
}

type Config struct {
	AdminUsername     string `json:"adminUsername"`
	AdminPasswordHash string `json:"adminPasswordHash"`
	ServerIP          string `json:"serverIP"`
	ServerPortRange   string `json:"serverPortRange"`
	DefaultPort       int    `json:"defaultPort"`
	PanelPort         int    `json:"panelPort"`
	BindAddr          string `json:"bindAddr"`
	SessionSecret     string `json:"sessionSecret"`
	Users             []User `json:"users"`

	// Advanced mita server knobs surfaced through the Server > Advanced
	// section of the panel UI.
	LoggingLevel string `json:"loggingLevel,omitempty"` // INFO / DEBUG / WARN / ERROR
	MTU          int    `json:"mtu,omitempty"`          // 1280..1500, default 1400
	Multiplexing string `json:"multiplexing,omitempty"` // OFF/LOW/MIDDLE/HIGH (mita MULTIPLEXING_*)

	// AllowedUserAgents are case-insensitive substrings; an incoming
	// /sub fetch is allowed when its User-Agent contains at least one
	// entry. Empty list = filter disabled (any UA accepted).
	AllowedUserAgents []string `json:"allowedUserAgents,omitempty"`
	// RequireHWID rejects subscription fetches that do not present the
	// X-HWID header. Karing/sing-box clients ship one out of the box,
	// so enabling this kills curl-based scrapers and "lite" forks.
	RequireHWID bool `json:"requireHWID,omitempty"`
}

// DefaultAllowedUserAgents is the seed set the UI offers as "official
// clients only". Substring match is case-insensitive.
var DefaultAllowedUserAgents = []string{
	"Karing",
	"sing-box",
	"mihomo",
	"ClashMeta",
	"clash-verge",
	"NekoBox",
	"HiddifyNext",
	"v2ray",
	"FLClash",
}

type Store struct {
	path string
	mu   sync.RWMutex
	cfg  Config
}

func NewStore(path string) (*Store, error) {
	store := &Store{path: path}
	if err := store.loadOrCreate(); err != nil {
		return nil, err
	}
	return store, nil
}

func (s *Store) Snapshot() Config {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return copyConfig(s.cfg)
}

func (s *Store) Update(update func(cfg *Config) error) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	next := copyConfig(s.cfg)
	if err := update(&next); err != nil {
		return err
	}
	if err := writeConfig(s.path, &next); err != nil {
		return err
	}
	s.cfg = next
	return nil
}

func (s *Store) loadOrCreate() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	raw, err := os.ReadFile(s.path)
	if err != nil {
		if !errors.Is(err, os.ErrNotExist) {
			return err
		}
		created, createErr := defaultConfig()
		if createErr != nil {
			return createErr
		}
		if err := writeConfig(s.path, &created); err != nil {
			return err
		}
		s.cfg = created
		return nil
	}

	var cfg Config
	if err := json.Unmarshal(raw, &cfg); err != nil {
		return err
	}
	normalizeDefaults(&cfg)
	s.cfg = cfg
	return nil
}

func defaultConfig() (Config, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte("admin"), bcrypt.DefaultCost)
	if err != nil {
		return Config{}, err
	}
	sessionSecret, err := randomHex(32)
	if err != nil {
		return Config{}, err
	}
	return Config{
		AdminUsername:     "admin",
		AdminPasswordHash: string(hash),
		ServerIP:          "127.0.0.1",
		ServerPortRange:   "2012-2022",
		DefaultPort:       2015,
		PanelPort:         defaultPanelPort,
		BindAddr:          defaultBindAddr,
		SessionSecret:     sessionSecret,
		Users:             []User{},
		LoggingLevel:      "INFO",
		MTU:               1400,
		Multiplexing:      "MULTIPLEXING_HIGH",
	}, nil
}

func normalizeDefaults(cfg *Config) {
	if cfg.AdminUsername == "" {
		cfg.AdminUsername = "admin"
	}
	if cfg.PanelPort == 0 {
		cfg.PanelPort = defaultPanelPort
	}
	if cfg.BindAddr == "" {
		cfg.BindAddr = defaultBindAddr
	}
	if cfg.LoggingLevel == "" {
		cfg.LoggingLevel = "INFO"
	}
	if cfg.MTU == 0 {
		cfg.MTU = 1400
	}
	if cfg.Multiplexing == "" {
		cfg.Multiplexing = "MULTIPLEXING_HIGH"
	}
}

func writeConfig(path string, cfg *Config) error {
	if err := os.MkdirAll(filepath.Dir(path), 0o750); err != nil {
		return err
	}
	body, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, body, 0o600)
}

func copyConfig(cfg Config) Config {
	next := cfg
	next.Users = make([]User, len(cfg.Users))
	copy(next.Users, cfg.Users)
	return next
}

func randomHex(bytesLen int) (string, error) {
	buf := make([]byte, bytesLen)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}
