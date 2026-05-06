package handlers

import "mieru-panel/pkg/notify"

// notifyConfiguredFunc is a tiny indirection so handlers don't import
// pkg/notify in multiple places. Tests can swap it out.
var notifyConfiguredFunc = notify.TelegramConfigured
