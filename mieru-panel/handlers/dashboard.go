package handlers

import (
	"encoding/json"
	"math"
	"net/http"
	"sync"
	"time"

	"mieru-panel/pkg/applog"
	"mieru-panel/pkg/dashboardmetrics"
)

const (
	mitaGroupCipherServer = "cipher - server"
	mitaGroupTraffic      = "traffic"
	mitaGroupConnections  = "connections"
)

type dashRuntime struct {
	mu sync.RWMutex

	ts *dashboardmetrics.TimeseriesRing

	cpuPercent float64
	memUsedMB  float64
	memTotalMB float64
	netRxMbps  float64
	netTxMbps  float64

	cpuPrev    dashboardmetrics.CPUTimes
	cpuHasPrev bool

	netPrev    dashboardmetrics.NetDevBytes
	netPrevAt  time.Time
	netHasPrev bool

	mitaPrev    *mitaCumSnap
	mitaPrevSet bool
}

type mitaCumSnap struct {
	down, up        int64
	decrypt, failed int64
}

type mitaMetricsFlat struct {
	Version         string `json:"version"`
	UptimeSeconds   int64  `json:"uptimeSeconds"`
	DirectDecrypt   int64  `json:"directDecrypt"`
	FailedDecrypt   int64  `json:"failedDecrypt"`
	IterateDecrypt  int64  `json:"iterateDecrypt"`
	ActiveOpens     int64  `json:"activeOpens"`
	CurrEstablished int64  `json:"currEstablished"`
	MaxConn         int64  `json:"maxConn"`
	PassiveOpens    int64  `json:"passiveOpens"`
	DownloadBytes   int64  `json:"downloadBytes"`
	UploadBytes     int64  `json:"uploadBytes"`
}

type dashboardSystemWire struct {
	CPUPercent float64 `json:"cpuPercent"`
	MemUsedMB  float64 `json:"memUsedMB"`
	MemTotalMB float64 `json:"memTotalMB"`
	NetRxMbps  float64 `json:"netRxMbps"`
	NetTxMbps  float64 `json:"netTxMbps"`
}

type dashboardMetricsWire struct {
	Mita               mitaMetricsFlat     `json:"mita"`
	System             dashboardSystemWire `json:"system"`
	ErrorsLastHour     int64               `json:"errorsLastHour"`
	PanelUptimeSeconds int64               `json:"panelUptimeSeconds"`
}

// InitDashboardRuntime allocates the in-memory timeseries ring. Safe to call once from main.
func (a *App) InitDashboardRuntime() {
	if a.dash != nil {
		return
	}
	a.dash = &dashRuntime{
		ts: dashboardmetrics.NewTimeseriesRing(60),
	}
}

// RunDashboardCollector updates system samples (5s) and per-minute traffic buckets.
func (a *App) RunDashboardCollector() {
	a.InitDashboardRuntime()
	sysTick := time.NewTicker(5 * time.Second)
	minTick := time.NewTicker(60 * time.Second)
	defer sysTick.Stop()
	defer minTick.Stop()

	for {
		select {
		case <-sysTick.C:
			a.dashboardSysSample()
		case <-minTick.C:
			a.dashboardMinuteSample()
		}
	}
}

func (a *App) dashboardSysSample() {
	if a.dash == nil {
		return
	}
	memUsed, memTotal, err := dashboardmetrics.ReadMemUsageMB()
	if err != nil {
		memUsed, memTotal = 0, 0
	}

	curCPU, errCPU := dashboardmetrics.ReadCPUTimes()
	curNet, errNet := dashboardmetrics.ReadPrimaryNetDevBytes()
	now := time.Now()

	a.dash.mu.Lock()
	defer a.dash.mu.Unlock()

	a.dash.memUsedMB = memUsed
	a.dash.memTotalMB = memTotal

	if errCPU == nil {
		if a.dash.cpuHasPrev {
			a.dash.cpuPercent = dashboardmetrics.CPUPercent(a.dash.cpuPrev, curCPU)
		}
		a.dash.cpuPrev = curCPU
		a.dash.cpuHasPrev = true
	}

	if errNet == nil {
		if a.dash.netHasPrev && !a.dash.netPrevAt.IsZero() {
			dt := now.Sub(a.dash.netPrevAt).Seconds()
			rx, tx := dashboardmetrics.NetMbps(a.dash.netPrev, curNet, dt)
			if math.IsNaN(rx) || math.IsInf(rx, 0) {
				rx = 0
			}
			if math.IsNaN(tx) || math.IsInf(tx, 0) {
				tx = 0
			}
			a.dash.netRxMbps = rx
			a.dash.netTxMbps = tx
		}
		a.dash.netPrev = curNet
		a.dash.netPrevAt = now
		a.dash.netHasPrev = true
	}
}

func (a *App) dashboardMinuteSample() {
	if a.dash == nil {
		return
	}
	raw, err := a.Mita.GetDaemonMetricsJSON()
	var flat mitaMetricsFlat
	if err == nil {
		flat = flattenMitaMetricsJSON(raw)
	}

	a.dash.mu.Lock()
	defer a.dash.mu.Unlock()

	prev := a.dash.mitaPrev
	bucket := dashboardmetrics.Bucket{T: time.Now().UTC().Truncate(time.Minute)}
	if prev != nil && a.dash.mitaPrevSet {
		bucket.RxBytes = nonNegDelta(flat.DownloadBytes, prev.down)
		bucket.TxBytes = nonNegDelta(flat.UploadBytes, prev.up)
		bucket.Requests = nonNegDelta(flat.DirectDecrypt, prev.decrypt)
		bucket.Errors = nonNegDelta(flat.FailedDecrypt, prev.failed)
	}
	a.dash.mitaPrev = &mitaCumSnap{
		down:    flat.DownloadBytes,
		up:      flat.UploadBytes,
		decrypt: flat.DirectDecrypt,
		failed:  flat.FailedDecrypt,
	}
	a.dash.mitaPrevSet = true
	a.dash.ts.Append(bucket)
}

func nonNegDelta(cur, prev int64) int64 {
	d := cur - prev
	if d < 0 {
		return 0
	}
	return d
}

func flattenMitaMetricsJSON(raw []byte) mitaMetricsFlat {
	out := mitaMetricsFlat{}
	var root map[string]any
	if err := json.Unmarshal(raw, &root); err != nil {
		return out
	}
	for gk, gv := range root {
		if gk == "users" {
			continue
		}
		m, ok := gv.(map[string]any)
		if !ok {
			continue
		}
		switch gk {
		case mitaGroupCipherServer:
			out.DirectDecrypt = asInt64(m["DirectDecrypt"])
			out.FailedDecrypt = asInt64(m["FailedDirectDecrypt"])
			out.IterateDecrypt = asInt64(m["IterateDecrypt"])
		case mitaGroupTraffic:
			out.DownloadBytes = asInt64(m["DownloadBytes"])
			out.UploadBytes = asInt64(m["UploadBytes"])
		case mitaGroupConnections:
			out.ActiveOpens = asInt64(m["ActiveOpens"])
			out.CurrEstablished = asInt64(m["CurrEstablished"])
			out.MaxConn = asInt64(m["MaxConn"])
			out.PassiveOpens = asInt64(m["PassiveOpens"])
		}
	}
	return out
}

func asInt64(v any) int64 {
	switch x := v.(type) {
	case float64:
		return int64(x)
	case int64:
		return x
	case int:
		return int64(x)
	case json.Number:
		i, _ := x.Int64()
		return i
	default:
		return 0
	}
}

// applogErrorsLastHour counts ERROR entries in the in-memory applog ring within the last hour.
// TODO(applog): Default ring capacity is 1000; under heavy logging older ERROR lines can fall
// off and this count becomes a lower bound, not a true hourly rate from disk.
func applogErrorsLastHour() int64 {
	cutoff := time.Now().Add(-time.Hour).UTC()
	var n int64
	for _, e := range applog.Snapshot(0) {
		if e.Level != applog.LevelError {
			continue
		}
		if e.Time.After(cutoff) {
			n++
		}
	}
	return n
}

// HandleDashboardMetrics serves GET /api/dashboard/metrics
func (a *App) HandleDashboardMetrics(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, apiError{Error: "method not allowed"})
		return
	}
	a.InitDashboardRuntime()

	var sys dashboardSystemWire
	if a.dash != nil {
		a.dash.mu.RLock()
		sys = dashboardSystemWire{
			CPUPercent: a.dash.cpuPercent,
			MemUsedMB:  a.dash.memUsedMB,
			MemTotalMB: a.dash.memTotalMB,
			NetRxMbps:  a.dash.netRxMbps,
			NetTxMbps:  a.dash.netTxMbps,
		}
		a.dash.mu.RUnlock()
	}

	mitaOut := mitaMetricsFlat{}
	if raw, err := a.Mita.GetDaemonMetricsJSON(); err == nil {
		mitaOut = flattenMitaMetricsJSON(raw)
	}
	if v, err := a.Mita.DaemonVersion(); err == nil && v != "" {
		mitaOut.Version = v
	}
	// mita daemon process uptime is not present in `mita get metrics` JSON; use panelUptimeSeconds for UI.
	mitaOut.UptimeSeconds = 0

	writeJSON(w, http.StatusOK, dashboardMetricsWire{
		Mita:               mitaOut,
		System:             sys,
		ErrorsLastHour:     applogErrorsLastHour(),
		PanelUptimeSeconds: int64(time.Since(startedAt).Seconds()),
	})
}

type timeseriesWire struct {
	Buckets []dashboardmetrics.BucketJSON `json:"buckets"`
}

// HandleDashboardTimeseries serves GET /api/dashboard/timeseries?range=60m
func (a *App) HandleDashboardTimeseries(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, apiError{Error: "method not allowed"})
		return
	}
	a.InitDashboardRuntime()
	_ = r.URL.Query().Get("range") // only 60m ring implemented for now

	var buckets []dashboardmetrics.BucketJSON
	if a.dash != nil {
		buckets = a.dash.ts.SnapshotJSON()
	}
	writeJSON(w, http.StatusOK, timeseriesWire{Buckets: buckets})
}
