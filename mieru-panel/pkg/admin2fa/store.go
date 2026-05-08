package admin2fa

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"sync"
)

// Persisted is the JSON shape stored in admin_2fa.json (no sensitive plaintext at rest beyond encrypted blobs).
type Persisted struct {
	Enabled       bool     `json:"enabled"`
	Secret        string   `json:"secret,omitempty"`        // AES-GCM ciphertext (base64)
	PendingSecret string   `json:"pendingSecret,omitempty"` // AES-GCM ciphertext (base64)
	BackupCodes   []string `json:"backupCodes,omitempty"`   // bcrypt hashes
	ActivatedAt   string   `json:"activatedAt,omitempty"`   // RFC3339
}

// Store serializes Persisted alongside config (data/admin_2fa.json by default).
type Store struct {
	path string
	mu   sync.RWMutex
}

func NewStore(absPath string) *Store {
	return &Store{path: absPath}
}

func (s *Store) Read() (*Persisted, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	b, err := os.ReadFile(s.path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return &Persisted{}, nil
		}
		return nil, err
	}
	var p Persisted
	if err := json.Unmarshal(b, &p); err != nil {
		return nil, err
	}
	return &p, nil
}

func (s *Store) Write(update func(*Persisted) error) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	p := Persisted{}
	if b, err := os.ReadFile(s.path); err == nil {
		if err := json.Unmarshal(b, &p); err != nil {
			return err
		}
	}
	if err := update(&p); err != nil {
		return err
	}
	dir := filepath.Dir(s.path)
	if err := os.MkdirAll(dir, 0o750); err != nil {
		return err
	}
	body, err := json.MarshalIndent(&p, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(s.path, body, 0o600)
}
