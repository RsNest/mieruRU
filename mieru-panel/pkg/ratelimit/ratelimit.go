// Package ratelimit implements a tiny in-memory token-bucket per key that
// the panel uses to throttle login attempts and subscription fetches. It is
// not a network-grade rate limiter and is good enough only for single-node
// panels: state is lost on restart, no clustering.
package ratelimit

import (
	"sync"
	"time"
)

type bucket struct {
	tokens   float64
	lastFill time.Time
}

type Limiter struct {
	mu       sync.Mutex
	buckets  map[string]*bucket
	burst    float64
	rate     float64 // tokens added per second
	expireAt time.Duration
}

// New returns a limiter that allows `burst` tokens and refills `rate`
// tokens per second. `keepFor` controls how long stale buckets are kept
// before they are reaped on the next call.
func New(burst int, perSecond float64, keepFor time.Duration) *Limiter {
	if burst <= 0 {
		burst = 1
	}
	if perSecond <= 0 {
		perSecond = 1
	}
	return &Limiter{
		buckets:  make(map[string]*bucket),
		burst:    float64(burst),
		rate:     perSecond,
		expireAt: keepFor,
	}
}

// Allow consumes one token from the bucket for `key`. Returns false if the
// bucket is empty (caller should reject the request).
func (l *Limiter) Allow(key string) bool {
	if l == nil {
		return true
	}
	l.mu.Lock()
	defer l.mu.Unlock()
	now := time.Now()
	b, ok := l.buckets[key]
	if !ok {
		b = &bucket{tokens: l.burst, lastFill: now}
		l.buckets[key] = b
	} else {
		elapsed := now.Sub(b.lastFill).Seconds()
		b.tokens += elapsed * l.rate
		if b.tokens > l.burst {
			b.tokens = l.burst
		}
		b.lastFill = now
	}
	if b.tokens < 1 {
		l.reap(now)
		return false
	}
	b.tokens -= 1
	l.reap(now)
	return true
}

func (l *Limiter) reap(now time.Time) {
	for k, b := range l.buckets {
		if now.Sub(b.lastFill) > l.expireAt {
			delete(l.buckets, k)
		}
	}
}
