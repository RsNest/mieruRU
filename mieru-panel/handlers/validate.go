package handlers

import "regexp"

var adminUsernameRe = regexp.MustCompile(`^[a-zA-Z0-9_-]{2,32}$`)

func validAdminUsername(s string) bool {
	return adminUsernameRe.MatchString(s)
}
