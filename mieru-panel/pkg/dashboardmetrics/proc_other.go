//go:build !linux

package dashboardmetrics

type CPUTimes struct {
	Idle  uint64
	Total uint64
}

func ReadCPUTimes() (CPUTimes, error) { return CPUTimes{}, nil }

func CPUPercent(prev, cur CPUTimes) float64 { return 0 }

func ReadMemUsageMB() (usedMB, totalMB float64, err error) { return 0, 0, nil }

type NetDevBytes struct {
	RxBytes uint64
	TxBytes uint64
}

func ReadPrimaryNetDevBytes() (NetDevBytes, error) { return NetDevBytes{}, nil }

func NetMbps(prev, cur NetDevBytes, dt float64) (rxMbps, txMbps float64) { return 0, 0 }
