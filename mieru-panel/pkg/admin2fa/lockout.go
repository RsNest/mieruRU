package admin2fa

import (
	"sync"
	"time"
)

const lockoutFailures = 5
const lockoutWindow = 15 * time.Minute
const lockoutDuration = 15 * time.Minute

// TotpStep2Lockout tracks failed admin TOTP verifies (login step 2). In-memory only.
type TotpStep2Lockout struct {
	mu          sync.Mutex
	failTimes   map[string][]time.Time
	lockedUntil map[string]time.Time
}

func NewTotpStep2Lockout() *TotpStep2Lockout {
	return &TotpStep2Lockout{
		failTimes:   make(map[string][]time.Time),
		lockedUntil: make(map[string]time.Time),
	}
}

// LockedUntil returns non-zero Time if username is locked.
func (l *TotpStep2Lockout) LockedUntil(user string, now time.Time) time.Time {
	if l == nil {
		return time.Time{}
	}
	l.mu.Lock()
	defer l.mu.Unlock()
	until := l.lockedUntil[user]
	if until.IsZero() || !now.Before(until) {
		delete(l.lockedUntil, user)
		return time.Time{}
	}
	return until
}

// RecordFailure returns lock-until timestamp if this failure triggered lockout (HTTP 423).
func (l *TotpStep2Lockout) RecordFailure(user string, now time.Time) *time.Time {
	if l == nil {
		return nil
	}
	l.mu.Lock()
	defer l.mu.Unlock()
	if ut, ok := l.lockedUntil[user]; ok && now.Before(ut) {
		t := ut
		return &t
	}
	cutoff := now.Add(-lockoutWindow)
	ts := l.failTimes[user]
	pruned := ts[:0]
	for _, t := range ts {
		if !t.Before(cutoff) {
			pruned = append(pruned, t)
		}
	}
	pruned = append(pruned, now)
	l.failTimes[user] = pruned

	if len(pruned) >= lockoutFailures {
		until := now.Add(lockoutDuration)
		l.lockedUntil[user] = until
		delete(l.failTimes, user)
		return &until
	}
	return nil
}

// Clear resets counters after successful verification.
func (l *TotpStep2Lockout) Clear(user string) {
	if l == nil {
		return
	}
	l.mu.Lock()
	defer l.mu.Unlock()
	delete(l.failTimes, user)
	delete(l.lockedUntil, user)
}
