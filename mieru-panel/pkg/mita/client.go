package mita

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"strings"
)

// DefaultPortRange is used when the panel config omits ServerPortRange.
const DefaultPortRange = "2012-2022"

type Client struct {
	binary string
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
	return &Client{binary: binary}
}

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

// GetUsers reads users from `mita describe config` (there is no `describe users`).
// Traffic fields are cleared; the panel does not have per-user CLI metrics.
func (c *Client) GetUsers() ([]UserStats, error) {
	env, err := c.GetConfig()
	if err != nil {
		return nil, err
	}
	stats := make([]UserStats, 0, len(env.Users))
	for _, u := range env.Users {
		name := strings.TrimSpace(u.Name)
		if name == "" {
			continue
		}
		stats = append(stats, UserStats{
			Name:      name,
			TodayRaw:  "",
			MonthRaw:  "",
			TotalRaw:  "",
			RawRecord: "",
		})
	}
	return stats, nil
}

func effectivePortRange(portRange string) string {
	if strings.TrimSpace(portRange) == "" {
		return DefaultPortRange
	}
	return strings.TrimSpace(portRange)
}

func (c *Client) ApplyUsers(users []User, portRange string) error {
	pr := effectivePortRange(portRange)
	payload := map[string]any{
		"portBindings": []map[string]any{
			{"portRange": pr, "protocol": "TCP"},
		},
		"users":        users,
		"loggingLevel": "INFO",
		"mtu":          1400,
	}
	return c.applyConfigPayload(payload)
}

// EnsurePortBindings applies portBindings (+ logging defaults) when mita has none set.
func (c *Client) EnsurePortBindings(portRange string) error {
	pr := effectivePortRange(portRange)
	env, err := c.GetConfig()
	if err == nil && len(env.PortBindings) > 0 {
		return nil
	}
	payload := map[string]any{
		"portBindings": []map[string]any{
			{"portRange": pr, "protocol": "TCP"},
		},
		"loggingLevel": "INFO",
		"mtu":          1400,
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

func (c *Client) run(args ...string) (stdout, stderr string, err error) {
	cmd := exec.Command(c.binary, args...)
	var stdoutB, stderrB bytes.Buffer
	cmd.Stdout = &stdoutB
	cmd.Stderr = &stderrB

	op := strings.Join(args, " ")
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
		return so, se, &RunError{Op: op, Reason: msg, Stdout: so, Stderr: se}
	}
	return strings.TrimSpace(stdoutB.String()), strings.TrimSpace(stderrB.String()), nil
}
