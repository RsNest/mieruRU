package admin2fa

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"os"
	"path/filepath"
	"strings"
)

const env2FAKey = "PANEL_2FA_KEY"
const secretFileName = ".2fa_key"

// LoadOrCreateSymmetricKey returns a 32-byte AES-256 key. Priority:
//  1. PANEL_2FA_KEY (64 hex chars, or optional base64 of 32 raw bytes — we accept hex only for clarity)
//  2. data/.2fa_key (32 raw bytes); created on first launch with mode 0600.
func LoadOrCreateSymmetricKey(dataDir string) ([]byte, error) {
	dataDir = strings.TrimSpace(dataDir)
	if dataDir == "" {
		return nil, errors.New("admin2fa: empty data dir")
	}
	if v := strings.TrimSpace(os.Getenv(env2FAKey)); v != "" {
		raw, err := hex.DecodeString(v)
		if err != nil || len(raw) != 32 {
			return nil, errors.New(env2FAKey + " must be 64 hex chars (32 bytes)")
		}
		return raw, nil
	}
	keyPath := filepath.Join(dataDir, secretFileName)
	b, err := os.ReadFile(keyPath)
	if err == nil && len(b) >= 32 {
		return b[:32], nil
	}
	if err != nil && !errors.Is(err, os.ErrNotExist) {
		return nil, err
	}
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return nil, err
	}
	if err := os.MkdirAll(dataDir, 0o750); err != nil {
		return nil, err
	}
	if err := os.WriteFile(keyPath, raw, 0o600); err != nil {
		return nil, err
	}
	return raw, nil
}
