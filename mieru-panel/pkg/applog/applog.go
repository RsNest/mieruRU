// Package applog provides a small structured logger for mieru-panel.
//
// Output goes to stdout (so `docker logs` sees it) and to an in-memory
// ring buffer that the panel UI streams via /api/logs.
package applog

import (
	"fmt"
	"io"
	"os"
	"strings"
	"sync"
	"time"
)

type Level string

const (
	LevelDebug Level = "DEBUG"
	LevelInfo  Level = "INFO"
	LevelWarn  Level = "WARN"
	LevelError Level = "ERROR"
)

// Entry is one log record returned by /api/logs.
type Entry struct {
	Seq     uint64    `json:"seq"`
	Time    time.Time `json:"time"`
	Level   Level     `json:"level"`
	Source  string    `json:"source,omitempty"`
	Message string    `json:"message"`
}

// Logger keeps a ring buffer of last `cap` entries and writes each
// entry to `out` (typically os.Stdout for docker logs).
type Logger struct {
	mu      sync.RWMutex
	entries []Entry
	cap     int
	seq     uint64
	out     io.Writer
}

// Default is the process-wide logger. Replace via SetDefault.
var Default = NewLogger(1000, os.Stdout)

func NewLogger(capacity int, out io.Writer) *Logger {
	if capacity <= 0 {
		capacity = 500
	}
	return &Logger{cap: capacity, out: out, entries: make([]Entry, 0, capacity)}
}

// SetDefault replaces the process-wide logger.
func SetDefault(l *Logger) {
	if l != nil {
		Default = l
	}
}

func (l *Logger) emit(level Level, source, msg string) Entry {
	if l == nil {
		return Entry{}
	}
	l.mu.Lock()
	l.seq++
	e := Entry{
		Seq:     l.seq,
		Time:    time.Now().UTC(),
		Level:   level,
		Source:  source,
		Message: msg,
	}
	if len(l.entries) >= l.cap {
		l.entries = l.entries[1:]
	}
	l.entries = append(l.entries, e)
	out := l.out
	l.mu.Unlock()

	if out != nil {
		fmt.Fprintf(out, "%s %-5s %s%s\n",
			e.Time.Format("2006-01-02T15:04:05.000Z"),
			string(level),
			sourcePrefix(source),
			msg,
		)
	}
	return e
}

func sourcePrefix(s string) string {
	if s == "" {
		return ""
	}
	return "[" + s + "] "
}

// Snapshot returns a copy of the in-memory log buffer.
// If sinceSeq > 0 only entries with Seq > sinceSeq are returned.
func (l *Logger) Snapshot(sinceSeq uint64) []Entry {
	l.mu.RLock()
	defer l.mu.RUnlock()
	out := make([]Entry, 0, len(l.entries))
	for _, e := range l.entries {
		if e.Seq > sinceSeq {
			out = append(out, e)
		}
	}
	return out
}

func (l *Logger) Debug(source, msg string) Entry { return l.emit(LevelDebug, source, msg) }
func (l *Logger) Info(source, msg string) Entry  { return l.emit(LevelInfo, source, msg) }
func (l *Logger) Warn(source, msg string) Entry  { return l.emit(LevelWarn, source, msg) }
func (l *Logger) Error(source, msg string) Entry { return l.emit(LevelError, source, msg) }

func (l *Logger) Debugf(source, format string, args ...any) Entry {
	return l.emit(LevelDebug, source, fmt.Sprintf(format, args...))
}
func (l *Logger) Infof(source, format string, args ...any) Entry {
	return l.emit(LevelInfo, source, fmt.Sprintf(format, args...))
}
func (l *Logger) Warnf(source, format string, args ...any) Entry {
	return l.emit(LevelWarn, source, fmt.Sprintf(format, args...))
}
func (l *Logger) Errorf(source, format string, args ...any) Entry {
	return l.emit(LevelError, source, fmt.Sprintf(format, args...))
}

// Default helpers.
func Info(source, msg string)  { Default.Info(source, msg) }
func Warn(source, msg string)  { Default.Warn(source, msg) }
func Error(source, msg string) { Default.Error(source, msg) }
func Debug(source, msg string) { Default.Debug(source, msg) }

func Infof(source, format string, args ...any)  { Default.Infof(source, format, args...) }
func Warnf(source, format string, args ...any)  { Default.Warnf(source, format, args...) }
func Errorf(source, format string, args ...any) { Default.Errorf(source, format, args...) }
func Debugf(source, format string, args ...any) { Default.Debugf(source, format, args...) }

// Snapshot returns recent entries from the default logger.
func Snapshot(sinceSeq uint64) []Entry { return Default.Snapshot(sinceSeq) }

// StdlibSink lets you redirect the standard `log` package into applog.
//
//	log.SetOutput(applog.StdlibSink{Source: "go"})
//	log.SetFlags(0)
type StdlibSink struct {
	Source string
}

func (s StdlibSink) Write(p []byte) (int, error) {
	msg := strings.TrimRight(string(p), "\r\n")
	if msg != "" {
		Default.emit(LevelInfo, s.Source, msg)
	}
	return len(p), nil
}
