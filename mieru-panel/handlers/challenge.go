package handlers

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"strconv"
	"strings"
	"time"
)

func signChallengeToken(username, sessionSecret string, ttl time.Duration) string {
	exp := time.Now().Add(ttl).Unix()
	payload := username + "|" + strconv.FormatInt(exp, 10)
	sig := hex.EncodeToString(hmacSum(payload, sessionSecret))
	value := payload + "|" + sig
	return base64.RawURLEncoding.EncodeToString([]byte(value))
}

func verifyChallengeToken(token, expectedUsername, sessionSecret string) bool {
	decoded, err := base64.RawURLEncoding.DecodeString(strings.TrimSpace(token))
	if err != nil {
		return false
	}
	parts := strings.Split(string(decoded), "|")
	if len(parts) != 3 {
		return false
	}
	username := parts[0]
	expStr := parts[1]
	sig := parts[2]
	if username != expectedUsername {
		return false
	}
	payload := username + "|" + expStr
	if !hmac.Equal([]byte(sig), []byte(hex.EncodeToString(hmacSum(payload, sessionSecret)))) {
		return false
	}
	exp, err := strconv.ParseInt(expStr, 10, 64)
	if err != nil {
		return false
	}
	return time.Now().Unix() <= exp
}

func hmacSum(payload, secret string) []byte {
	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = mac.Write([]byte(payload))
	return mac.Sum(nil)
}
