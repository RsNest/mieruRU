package dashboardmetrics

import (
	"sync"
	"time"
)

// Bucket is one minute aggregate for dashboard charts.
type Bucket struct {
	T        time.Time `json:"-"`
	RxBytes  int64     `json:"rxBytes"`
	TxBytes  int64     `json:"txBytes"`
	Errors   int64     `json:"errors"`
	Requests int64     `json:"requests"`
}

// BucketJSON is the wire shape with RFC3339 timestamp.
type BucketJSON struct {
	T        string `json:"t"`
	RxBytes  int64  `json:"rxBytes"`
	TxBytes  int64  `json:"txBytes"`
	Errors   int64  `json:"errors"`
	Requests int64  `json:"requests"`
}

// TimeseriesRing keeps the last n minute buckets (oldest dropped on overflow).
type TimeseriesRing struct {
	mu      sync.Mutex
	max     int
	buckets []Bucket
}

func NewTimeseriesRing(max int) *TimeseriesRing {
	if max < 1 {
		max = 60
	}
	return &TimeseriesRing{max: max, buckets: make([]Bucket, 0, max)}
}

func (r *TimeseriesRing) Append(b Bucket) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if len(r.buckets) >= r.max {
		r.buckets = append(r.buckets[1:], b)
		return
	}
	r.buckets = append(r.buckets, b)
}

func (r *TimeseriesRing) SnapshotJSON() []BucketJSON {
	r.mu.Lock()
	defer r.mu.Unlock()
	out := make([]BucketJSON, len(r.buckets))
	for i, b := range r.buckets {
		ts := b.T
		if ts.IsZero() {
			ts = time.Now().UTC()
		}
		out[i] = BucketJSON{
			T:        ts.UTC().Format(time.RFC3339),
			RxBytes:  b.RxBytes,
			TxBytes:  b.TxBytes,
			Errors:   b.Errors,
			Requests: b.Requests,
		}
	}
	return out
}
