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

type Client struct {
	binary string
}

type User struct {
	Name     string `json:"name"`
	Password string `json:"password"`
}

type MitaConfig struct {
	Users []User `json:"users"`
}

type UserStats struct {
	Name      string `json:"name"`
	TodayRaw  string `json:"todayRaw"`
	MonthRaw  string `json:"monthRaw"`
	TotalRaw  string `json:"totalRaw"`
	RawRecord string `json:"rawRecord"`
}

func NewClient(binary string) *Client {
	if strings.TrimSpace(binary) == "" {
		binary = "mita"
	}
	return &Client{binary: binary}
}

func (c *Client) GetConfig() (*MitaConfig, error) {
	out, err := c.run("describe", "config")
	if err != nil {
		return nil, err
	}
	var cfg MitaConfig
	if err := json.Unmarshal([]byte(out), &cfg); err != nil {
		return nil, fmt.Errorf("parse mita config: %w", err)
	}
	return &cfg, nil
}

func (c *Client) GetUsers() ([]UserStats, error) {
	out, err := c.run("describe", "users")
	if err != nil {
		return nil, err
	}
	return parseUsersOutput(out), nil
}

func (c *Client) ApplyUsers(users []User) error {
	payload := map[string]any{
		"users": users,
	}
	tmp, err := os.CreateTemp("", "mieru_panel_update_*.json")
	if err != nil {
		return err
	}
	tmpPath := tmp.Name()
	defer os.Remove(tmpPath)

	encoder := json.NewEncoder(tmp)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(payload); err != nil {
		_ = tmp.Close()
		return err
	}
	if err := tmp.Close(); err != nil {
		return err
	}

	if _, err := c.run("apply", "config", tmpPath); err != nil {
		return err
	}
	_, err = c.run("reload")
	return err
}

func (c *Client) GetStatus() (string, error) {
	out, err := c.run("status")
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
	_, err := c.run("start")
	return err
}

func (c *Client) Stop() error {
	_, err := c.run("stop")
	return err
}

func (c *Client) run(args ...string) (string, error) {
	cmd := exec.Command(c.binary, args...)
	var stdout bytes.Buffer
	var stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		msg := strings.TrimSpace(stderr.String())
		if msg == "" {
			msg = strings.TrimSpace(stdout.String())
		}
		if msg == "" {
			msg = err.Error()
		}
		return "", fmt.Errorf("mita %s failed: %s", strings.Join(args, " "), msg)
	}
	result := strings.TrimSpace(stdout.String())
	if result == "" {
		return "", errors.New("empty mita response")
	}
	return result, nil
}

func parseUsersOutput(out string) []UserStats {
	lines := strings.Split(out, "\n")
	stats := make([]UserStats, 0, len(lines))
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		lower := strings.ToLower(line)
		if strings.HasPrefix(lower, "name") || strings.HasPrefix(lower, "user") {
			continue
		}
		parts := strings.Fields(line)
		if len(parts) == 0 {
			continue
		}
		item := UserStats{
			Name:      parts[0],
			RawRecord: line,
		}
		if len(parts) > 1 {
			item.TodayRaw = parts[1]
		}
		if len(parts) > 2 {
			item.MonthRaw = parts[2]
		}
		if len(parts) > 3 {
			item.TotalRaw = parts[3]
		}
		stats = append(stats, item)
	}
	return stats
}
