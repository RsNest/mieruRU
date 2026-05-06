// Package notify ships small operational notifications out of the panel.
// Telegram is the only built-in transport for now: configure via env
// PANEL_TG_BOT_TOKEN and PANEL_TG_CHAT_ID. When either is missing, Send
// becomes a no-op so the panel still boots fine without a Telegram bot.
package notify

import (
	"context"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

var (
	tgToken  = strings.TrimSpace(os.Getenv("PANEL_TG_BOT_TOKEN"))
	tgChatID = strings.TrimSpace(os.Getenv("PANEL_TG_CHAT_ID"))
	httpc    = &http.Client{Timeout: 8 * time.Second}
)

// TelegramConfigured reports whether the panel has a usable Telegram
// channel. Used by the UI to render the "telegram bound" status.
func TelegramConfigured() bool {
	return tgToken != "" && tgChatID != ""
}

// Send tries to deliver a short message to the configured Telegram chat.
// Errors are intentionally swallowed: a failed notification must never
// break the request that triggered it.
func Send(text string) {
	if !TelegramConfigured() {
		return
	}
	endpoint := "https://api.telegram.org/bot" + tgToken + "/sendMessage"
	body := url.Values{}
	body.Set("chat_id", tgChatID)
	body.Set("text", text)
	body.Set("parse_mode", "HTML")
	body.Set("disable_web_page_preview", "true")
	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, strings.NewReader(body.Encode()))
	if err != nil {
		return
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	resp, err := httpc.Do(req)
	if err != nil {
		return
	}
	_ = resp.Body.Close()
}
