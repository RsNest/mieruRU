//go:build linux

package dashboardmetrics

import (
	"bufio"
	"fmt"
	"os"
	"strconv"
	"strings"
)

// CPUTimes holds aggregated jiffies from the first "cpu " line in /proc/stat.
type CPUTimes struct {
	Idle  uint64
	Total uint64
}

// ReadCPUTimes reads aggregate CPU jiffies (all cores) from /proc/stat.
func ReadCPUTimes() (CPUTimes, error) {
	f, err := os.Open("/proc/stat")
	if err != nil {
		return CPUTimes{}, err
	}
	defer f.Close()
	sc := bufio.NewScanner(f)
	if !sc.Scan() {
		return CPUTimes{}, fmt.Errorf("proc/stat: empty")
	}
	line := sc.Text()
	if !strings.HasPrefix(line, "cpu ") {
		return CPUTimes{}, fmt.Errorf("proc/stat: no cpu line")
	}
	fields := strings.Fields(line)
	if len(fields) < 6 {
		return CPUTimes{}, fmt.Errorf("proc/stat: short cpu line")
	}
	var sum uint64
	for i := 1; i < len(fields); i++ {
		v, err := strconv.ParseUint(fields[i], 10, 64)
		if err != nil {
			continue
		}
		sum += v
	}
	idle, _ := strconv.ParseUint(fields[4], 10, 64)
	iowait, _ := strconv.ParseUint(fields[5], 10, 64)
	return CPUTimes{Idle: idle + iowait, Total: sum}, nil
}

// CPUPercent returns CPU usage % from two samples: 100 * (busyDelta / totalDelta).
func CPUPercent(prev, cur CPUTimes) float64 {
	dIdle := float64(cur.Idle) - float64(prev.Idle)
	dTotal := float64(cur.Total) - float64(prev.Total)
	if dTotal <= 0 {
		return 0
	}
	busy := dTotal - dIdle
	p := 100.0 * busy / dTotal
	if p < 0 {
		return 0
	}
	if p > 100 {
		return 100
	}
	return p
}

// ReadMemUsageMB returns (usedMB, totalMB) using MemTotal and MemAvailable from /proc/meminfo.
func ReadMemUsageMB() (usedMB, totalMB float64, err error) {
	f, err := os.Open("/proc/meminfo")
	if err != nil {
		return 0, 0, err
	}
	defer f.Close()
	var memTotal, memAvail, memFree uint64
	sc := bufio.NewScanner(f)
	for sc.Scan() {
		line := sc.Text()
		switch {
		case strings.HasPrefix(line, "MemTotal:"):
			memTotal = parseMeminfoKB(line)
		case strings.HasPrefix(line, "MemAvailable:"):
			memAvail = parseMeminfoKB(line)
		case strings.HasPrefix(line, "MemFree:"):
			memFree = parseMeminfoKB(line)
		}
	}
	if memTotal == 0 {
		return 0, 0, fmt.Errorf("meminfo: no MemTotal")
	}
	if memAvail == 0 {
		memAvail = memFree
	}
	totalMB = float64(memTotal) / 1024.0
	usedKB := float64(memTotal) - float64(memAvail)
	if usedKB < 0 {
		usedKB = 0
	}
	usedMB = usedKB / 1024.0
	return usedMB, totalMB, sc.Err()
}

func parseMeminfoKB(line string) uint64 {
	fields := strings.Fields(line)
	if len(fields) < 2 {
		return 0
	}
	v, _ := strconv.ParseUint(fields[1], 10, 64)
	return v
}

// NetDevBytes is RX/TX byte counters for one interface (from /proc/net/dev).
type NetDevBytes struct {
	RxBytes uint64
	TxBytes uint64
}

// ReadPrimaryNetDevBytes picks the first non-loopback interface with a name.
func ReadPrimaryNetDevBytes() (NetDevBytes, error) {
	f, err := os.Open("/proc/net/dev")
	if err != nil {
		return NetDevBytes{}, err
	}
	defer f.Close()
	sc := bufio.NewScanner(f)
	// skip header lines
	for i := 0; i < 2 && sc.Scan(); i++ {
	}
	var best NetDevBytes
	found := false
	for sc.Scan() {
		line := sc.Text()
		idx := strings.IndexByte(line, ':')
		if idx < 0 {
			continue
		}
		iface := strings.TrimSpace(line[:idx])
		if iface == "lo" {
			continue
		}
		fields := strings.Fields(line[idx+1:])
		if len(fields) < 9 {
			continue
		}
		rx, err1 := strconv.ParseUint(fields[0], 10, 64)
		tx, err2 := strconv.ParseUint(fields[8], 10, 64)
		if err1 != nil || err2 != nil {
			continue
		}
		best = NetDevBytes{RxBytes: rx, TxBytes: tx}
		found = true
		break
	}
	if !found {
		return NetDevBytes{}, fmt.Errorf("proc/net/dev: no suitable iface")
	}
	return best, sc.Err()
}

// NetMbps returns RX/TX megabits/s given byte counters delta over dt.
func NetMbps(prev, cur NetDevBytes, dt float64) (rxMbps, txMbps float64) {
	if dt <= 0 {
		return 0, 0
	}
	dr := float64(cur.RxBytes) - float64(prev.RxBytes)
	dt_ := float64(cur.TxBytes) - float64(prev.TxBytes)
	if dr < 0 {
		dr = 0
	}
	if dt_ < 0 {
		dt_ = 0
	}
	// bytes/s -> bits/s -> Mbps
	rxMbps = (dr / dt) * 8 / 1e6
	txMbps = (dt_ / dt) * 8 / 1e6
	return rxMbps, txMbps
}
