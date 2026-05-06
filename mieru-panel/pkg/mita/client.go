package mita

import (
	"bufio"
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"regexp"
	"strings"
	"sync"
	"time"

	"mieru-panel/pkg/applog"
)

// DefaultPortRange is used when the panel config omits ServerPortRange.
const DefaultPortRange = "2012-2022"

// DefaultLogFile is where docker-compose tee'd mita stdout/stderr by default.
// The path can be overridden with the MITA_LOG_FILE environment variable.
const DefaultLogFile = "/var/log/mita/mita.log"

type Client struct {
	binary  string
	logFile string

	// Tracking for noisy "daemon is not running" errors so we don't spam
	// the log every 2-3 seconds while mita is still warming up.
	muNoise         sync.Mutex
	lastOfflineLog  time.Time
	offlineSquelch  time.Duration
}

type User struct {
	Name     string `json:"name"`
	Password string `json:"password"`
}

// PortBinding is a subset of server config used for unmarshaling describe output.
type PortBinding struct {
	PortRange *string `json:"portRange,omitempty"`
	Port      *int    `json:"port,omitempty"`
	Protocol  string  `json:"protocol,omitempty"`
}

// DescribeConfigUser mirrors mita server config JSON for each user entry.
type DescribeConfigUser struct {
	Name           string `json:"name,omitempty"`
	HashedPassword string `json:"hashedPassword,omitempty"`
	Password       string `json:"password,omitempty"`
}

// describeConfigEnvelope matches `mita describe config` JSON (partial).
type describeConfigEnvelope struct {
	PortBindings []PortBinding        `json:"portBindings,omitempty"`
	Users        []DescribeConfigUser `json:"users,omitempty"`
}

type UserStats struct {
	Name      string `json:"name"`
	TodayRaw  string `json:"todayRaw"`
	MonthRaw  string `json:"monthRaw"`
	TotalRaw  string `json:"totalRaw"`
	RawRecord string `json:"rawRecord"`
}

// RunError is returned when a mita subprocess fails; Stdout and Stderr are captured for logs.
type RunError struct {
	Op     string
	Reason string
	Stdout string
	Stderr string
}

func (e *RunError) Error() string {
	return fmt.Sprintf("mita %s failed: %s", e.Op, e.Reason)
}

func NewClient(binary string) *Client {
	if strings.TrimSpace(binary) == "" {
		binary = "mita"
	}
	logFile := strings.TrimSpace(os.Getenv("MITA_LOG_FILE"))
	if logFile == "" {
		logFile = DefaultLogFile
	}
	return &Client{
		binary:         binary,
		logFile:        logFile,
		offlineSquelch: 30 * time.Second,
	}
}

// looksOfflineMessage returns true when the mita CLI failure looks like
// a daemon-not-running issue.
func looksOfflineMessage(msg string) bool {
	m := strings.ToLower(msg)
	return strings.Contains(m, "daemon is not running") ||
		strings.Contains(m, "connection refused") ||
		strings.Contains(m, "no such file or directory") ||
		strings.Contains(m, "code = unavailable") ||
		strings.Contains(m, "transport: error while dialing")
}

// LogFile returns the path the client uses to read mita stdout/stderr.
func (c *Client) LogFile() string { return c.logFile }

func (c *Client) GetConfig() (*describeConfigEnvelope, error) {
	out, _, err := c.run("describe", "config")
	if err != nil {
		return nil, err
	}
	if out == "" {
		return nil, errors.New("empty mita describe config output")
	}
	var cfg describeConfigEnvelope
	if err := json.Unmarshal([]byte(out), &cfg); err != nil {
		return nil, fmt.Errorf("parse mita config: %w", err)
	}
	return &cfg, nil
}

// GetUsers reads users from `mita describe config` and enriches each row
// with per-user traffic counters from `mita get users`. The metrics call
// is best-effort: if mita is IDLE / not running it simply returns the
// users without metrics so the UI keeps showing the configured user list.
func (c *Client) GetUsers() ([]UserStats, error) {
	env, err := c.GetConfig()
	if err != nil {
		return nil, err
	}
	metrics, _ := c.GetUsersMetrics() // best-effort, may be empty
	stats := make([]UserStats, 0, len(env.Users))
	for _, u := range env.Users {
		name := strings.TrimSpace(u.Name)
		if name == "" {
			continue
		}
		row := UserStats{Name: name}
		if m, ok := metrics[name]; ok {
			row.TodayRaw = combineDownUp(m.DayDown, m.DayUp)
			row.MonthRaw = combineDownUp(m.MonthDown, m.MonthUp)
			row.TotalRaw = combineDownUp(m.MonthDown, m.MonthUp)
			row.RawRecord = m.LastActive
		}
		stats = append(stats, row)
	}
	return stats, nil
}

// UserMetricsRow holds one row from `mita get users` with per-window
// download/upload byte counters as printed by the CLI (in IEC format,
// e.g. "5.6 MiB"). Empty / "-" values are normalised to "".
type UserMetricsRow struct {
	Name       string
	LastActive string
	DayDown    string
	DayUp      string
	WeekDown   string
	WeekUp     string
	MonthDown  string
	MonthUp    string
}

// GetUsersMetrics runs `mita get users` and returns a map of name -> metrics.
// On failure (typically because the proxy is IDLE) it returns an empty map
// and a nil error so the caller can keep rendering the user list.
func (c *Client) GetUsersMetrics() (map[string]UserMetricsRow, error) {
	out, _, err := c.run("get", "users")
	if err != nil {
		// daemon offline / IDLE proxy: not a hard failure for the panel.
		return map[string]UserMetricsRow{}, nil
	}
	return parseGetUsersTable(out), nil
}

// parseGetUsersTable parses the human-friendly table produced by the
// upstream `mita get users` CLI. Columns are separated by 2+ spaces but
// each cell may itself contain a single space (e.g. "10.5 MiB"), so we
// split on whitespace runs of length 2 or more and rely on the header
// row to map column indices.
func parseGetUsersTable(out string) map[string]UserMetricsRow {
	result := make(map[string]UserMetricsRow)
	if strings.TrimSpace(out) == "" {
		return result
	}
	sep := regexp.MustCompile(`\s{2,}`)
	var headerCols []string
	for _, raw := range strings.Split(out, "\n") {
		line := strings.TrimRight(raw, " \t\r")
		if strings.TrimSpace(line) == "" {
			continue
		}
		cols := sep.Split(strings.TrimLeft(line, " "), -1)
		if headerCols == nil {
			if !strings.HasPrefix(strings.TrimSpace(line), "User") {
				continue // skip any leading log noise
			}
			headerCols = cols
			continue
		}
		colByName := map[string]string{}
		for i, h := range headerCols {
			if i < len(cols) {
				colByName[h] = strings.TrimSpace(cols[i])
			}
		}
		name := colByName["User"]
		if name == "" {
			continue
		}
		clean := func(s string) string {
			s = strings.TrimSpace(s)
			if s == "-" {
				return ""
			}
			return s
		}
		result[name] = UserMetricsRow{
			Name:       name,
			LastActive: clean(colByName["LastActive"]),
			DayDown:    clean(colByName["1DayDown"]),
			DayUp:      clean(colByName["1DayUp"]),
			WeekDown:   clean(colByName["7DaysDown"]),
			WeekUp:     clean(colByName["7DaysUp"]),
			MonthDown:  clean(colByName["30DaysDown"]),
			MonthUp:    clean(colByName["30DaysUp"]),
		}
	}
	return result
}

// combineDownUp builds a "↓ 5.6 MiB / ↑ 2.3 MiB" string skipping empty parts.
// When both fields are empty the result is empty too.
func combineDownUp(down, up string) string {
	d, u := strings.TrimSpace(down), strings.TrimSpace(up)
	switch {
	case d == "" && u == "":
		return ""
	case u == "":
		return "↓ " + d
	case d == "":
		return "↑ " + u
	default:
		return "↓ " + d + " / ↑ " + u
	}
}

func effectivePortRange(portRange string) string {
	if strings.TrimSpace(portRange) == "" {
		return DefaultPortRange
	}
	return strings.TrimSpace(portRange)
}

// ApplyOptions controls advanced fields of the mita config payload.
// Empty / zero values fall back to sensible defaults (INFO / 1400 / HIGH).
type ApplyOptions struct {
	LoggingLevel string
	MTU          int
	Multiplexing string
}

func (o ApplyOptions) normalize() ApplyOptions {
	if strings.TrimSpace(o.LoggingLevel) == "" {
		o.LoggingLevel = "INFO"
	}
	if o.MTU <= 0 {
		o.MTU = 1400
	}
	if strings.TrimSpace(o.Multiplexing) == "" {
		o.Multiplexing = "MULTIPLEXING_HIGH"
	}
	return o
}

func (c *Client) ApplyUsers(users []User, portRange string, opts ApplyOptions) error {
	o := opts.normalize()
	pr := effectivePortRange(portRange)
	payload := map[string]any{
		"portBindings": []map[string]any{
			{"portRange": pr, "protocol": "TCP"},
		},
		"users":        users,
		"loggingLevel": o.LoggingLevel,
		"mtu":          o.MTU,
	}
	return c.applyConfigPayload(payload)
}

// EnsurePortBindings applies portBindings (+ logging defaults) when mita has none set.
func (c *Client) EnsurePortBindings(portRange string, opts ApplyOptions) error {
	o := opts.normalize()
	pr := effectivePortRange(portRange)
	env, err := c.GetConfig()
	if err == nil && len(env.PortBindings) > 0 {
		return nil
	}
	payload := map[string]any{
		"portBindings": []map[string]any{
			{"portRange": pr, "protocol": "TCP"},
		},
		"loggingLevel": o.LoggingLevel,
		"mtu":          o.MTU,
	}
	return c.applyConfigPayload(payload)
}

func (c *Client) applyConfigPayload(payload map[string]any) error {
	tmp, err := os.CreateTemp("", "mieru_panel_update_*.json")
	if err != nil {
		return err
	}
	tmpPath := tmp.Name()
	defer func() { _ = os.Remove(tmpPath) }()

	encoder := json.NewEncoder(tmp)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(payload); err != nil {
		_ = tmp.Close()
		return err
	}
	if err := tmp.Close(); err != nil {
		return err
	}

	if _, _, err := c.run("apply", "config", tmpPath); err != nil {
		return err
	}
	_, _, err = c.run("reload")
	return err
}

func (c *Client) GetStatus() (string, error) {
	out, _, err := c.run("status")
	if err != nil {
		return "", err
	}
	up := strings.ToUpper(out)
	switch {
	case strings.Contains(up, "RUNNING"):
		return "RUNNING", nil
	case strings.Contains(up, "IDLE"), strings.Contains(up, "STOPPED"):
		return "IDLE", nil
	default:
		return strings.TrimSpace(out), nil
	}
}

func (c *Client) Start() error {
	_, _, err := c.run("start")
	return err
}

func (c *Client) Stop() error {
	_, _, err := c.run("stop")
	return err
}

// ConnectionInfo describes one row of `mita get connections`.
type ConnectionInfo struct {
	SessionID string `json:"sessionId"`
	Protocol  string `json:"protocol"`
	Local     string `json:"local"`
	Remote    string `json:"remote"`
	State     string `json:"state"`
	RecvQ     string `json:"recvQ"`
	SendQ     string `json:"sendQ"`
	LastRecv  string `json:"lastRecv"`
	LastSend  string `json:"lastSend"`
}

// GetConnections runs `mita get connections` and parses the table.
// Errors are best-effort (returns empty slice when proxy is IDLE).
func (c *Client) GetConnections() ([]ConnectionInfo, error) {
	out, _, err := c.run("get", "connections")
	if err != nil {
		return []ConnectionInfo{}, nil
	}
	return parseConnectionsTable(out), nil
}

func parseConnectionsTable(out string) []ConnectionInfo {
	result := []ConnectionInfo{}
	if strings.TrimSpace(out) == "" {
		return result
	}
	sep := regexp.MustCompile(`\s{2,}`)
	var headerCols []string
	for _, raw := range strings.Split(out, "\n") {
		line := strings.TrimRight(raw, " \t\r")
		if strings.TrimSpace(line) == "" {
			continue
		}
		cols := sep.Split(strings.TrimLeft(line, " "), -1)
		if headerCols == nil {
			if !strings.HasPrefix(strings.TrimSpace(line), "SessionID") {
				continue
			}
			headerCols = cols
			continue
		}
		colByName := map[string]string{}
		for i, h := range headerCols {
			if i < len(cols) {
				colByName[h] = strings.TrimSpace(cols[i])
			}
		}
		row := ConnectionInfo{
			SessionID: colByName["SessionID"],
			Protocol:  colByName["Protocol"],
			Local:     colByName["Local"],
			Remote:    colByName["Remote"],
			State:     colByName["State"],
			RecvQ:     colByName["RecvQ+Buf"],
			SendQ:     colByName["SendQ+Buf"],
			LastRecv:  colByName["LastRecv"],
			LastSend:  colByName["LastSend"],
		}
		if row.SessionID == "" {
			continue
		}
		result = append(result, row)
	}
	return result
}

func (c *Client) run(args ...string) (stdout, stderr string, err error) {
	cmd := exec.Command(c.binary, args...)
	var stdoutB, stderrB bytes.Buffer
	cmd.Stdout = &stdoutB
	cmd.Stderr = &stderrB

	op := strings.Join(args, " ")
	applog.Debugf("mita", "run: %s", op)
	if err := cmd.Run(); err != nil {
		so := strings.TrimSpace(stdoutB.String())
		se := strings.TrimSpace(stderrB.String())
		msg := se
		if msg == "" {
			msg = so
		}
		if msg == "" {
			msg = err.Error()
		}
		// Daemon-down errors are extremely chatty (every status poll, every
		// stats refresh, etc), so keep them at WARN level and rate-limit.
		if looksOfflineMessage(msg) {
			c.muNoise.Lock()
			squelch := c.offlineSquelch
			now := time.Now()
			report := now.Sub(c.lastOfflineLog) >= squelch
			if report {
				c.lastOfflineLog = now
			}
			c.muNoise.Unlock()
			if report {
				applog.Warnf("mita", "%s: mita daemon offline (%s)", op, firstLine(msg))
			} else {
				applog.Debugf("mita", "%s failed: %s", op, msg)
			}
		} else {
			applog.Errorf("mita", "%s failed: %s", op, msg)
		}
		return so, se, &RunError{Op: op, Reason: msg, Stdout: so, Stderr: se}
	}
	so := strings.TrimSpace(stdoutB.String())
	se := strings.TrimSpace(stderrB.String())
	if se != "" {
		applog.Warnf("mita", "%s stderr: %s", op, se)
	}
	return so, se, nil
}

func firstLine(s string) string {
	if i := strings.IndexByte(s, '\n'); i >= 0 {
		return strings.TrimSpace(s[:i])
	}
	return strings.TrimSpace(s)
}

// Logs returns the last `lines` lines from the shared mita log file.
// The file is populated by docker-compose's `command: ... | tee mita.log`
// wrapper. Returns ("", nil) if the file does not exist yet (e.g. mita
// just started and hasn't written anything yet).
func (c *Client) Logs(lines int) (string, error) {
	if lines <= 0 {
		lines = 200
	}
	path := c.logFile
	if path == "" {
		path = DefaultLogFile
	}
	f, err := os.Open(path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return "", nil
		}
		return "", fmt.Errorf("open mita log %s: %w", path, err)
	}
	defer f.Close()

	const maxRead = 1 << 20 // 1 MiB tail window is enough for ~5000 short lines
	info, statErr := f.Stat()
	var startOff int64
	if statErr == nil && info.Size() > maxRead {
		startOff = info.Size() - maxRead
		if _, err := f.Seek(startOff, io.SeekStart); err != nil {
			return "", err
		}
	}

	scanner := bufio.NewScanner(f)
	scanner.Buffer(make([]byte, 64*1024), 1024*1024)
	ring := make([]string, 0, lines)
	for scanner.Scan() {
		if len(ring) == lines {
			ring = append(ring[1:], scanner.Text())
		} else {
			ring = append(ring, scanner.Text())
		}
	}
	if err := scanner.Err(); err != nil {
		return "", err
	}
	return strings.Join(ring, "\n"), nil
}
