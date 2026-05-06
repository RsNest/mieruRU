// Package audit appends one-line JSON records describing security-relevant
// actions performed in the panel: admin logins, user CRUD, advanced setting
// changes, config restores. The file lives next to the panel's main config
// (default ./var/audit.jsonl) and is intentionally append-only so it can be
// shipped to an external SIEM without modification.
package audit

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

type Entry struct {
	Time   string         `json:"time"`
	Action string         `json:"action"`
	Actor  string         `json:"actor,omitempty"`
	Target string         `json:"target,omitempty"`
	IP     string         `json:"ip,omitempty"`
	Result string         `json:"result,omitempty"`
	Fields map[string]any `json:"fields,omitempty"`
}

var (
	mu   sync.Mutex
	path string
)

// Init configures the destination file. Must be called once on startup.
func Init(p string) error {
	mu.Lock()
	defer mu.Unlock()
	if strings.TrimSpace(p) == "" {
		path = ""
		return nil
	}
	if err := os.MkdirAll(filepath.Dir(p), 0o750); err != nil {
		return err
	}
	path = p
	return nil
}

// Log appends a new entry. Failures are silently ignored so audit can never
// break the request that triggered it.
func Log(e Entry) {
	mu.Lock()
	defer mu.Unlock()
	if path == "" {
		return
	}
	if e.Time == "" {
		e.Time = time.Now().UTC().Format(time.RFC3339Nano)
	}
	body, err := json.Marshal(e)
	if err != nil {
		return
	}
	f, err := os.OpenFile(path, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0o600)
	if err != nil {
		return
	}
	defer f.Close()
	_, _ = f.Write(body)
	_, _ = f.Write([]byte("\n"))
}

// Tail returns up to `n` most recent entries (newest first).
func Tail(n int) ([]Entry, error) {
	mu.Lock()
	defer mu.Unlock()
	if path == "" || n <= 0 {
		return []Entry{}, nil
	}
	body, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return []Entry{}, nil
		}
		return nil, err
	}
	lines := strings.Split(strings.TrimRight(string(body), "\n"), "\n")
	if len(lines) > n {
		lines = lines[len(lines)-n:]
	}
	out := make([]Entry, 0, len(lines))
	for i := len(lines) - 1; i >= 0; i-- {
		var e Entry
		if err := json.Unmarshal([]byte(lines[i]), &e); err == nil {
			out = append(out, e)
		}
	}
	return out, nil
}
