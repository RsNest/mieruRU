package admin2fa

import (
	cryptorand "crypto/rand"
	"encoding/hex"
	"strings"

	"golang.org/x/crypto/bcrypt"
)

const bcryptBackupCost = bcrypt.DefaultCost

// GenerateBackupPlainCodes produces n codes formatted XXXX-XXXX (8 hex nibbles plus hyphen).
func GenerateBackupPlainCodes(n int) ([]string, error) {
	out := make([]string, 0, n)
	for len(out) < n {
		b := make([]byte, 4)
		if _, err := cryptorand.Read(b); err != nil {
			return nil, err
		}
		line := hex.EncodeToString(b)
		out = append(out, line[:4]+"-"+line[4:])
	}
	return out, nil
}

// HashBackupCodes returns bcrypt hashes for storage.
func HashBackupCodes(plain []string) ([]string, error) {
	hashes := make([]string, 0, len(plain))
	for _, p := range plain {
		hash, err := bcrypt.GenerateFromPassword([]byte(normBackupPlain(p)), bcryptBackupCost)
		if err != nil {
			return nil, err
		}
		hashes = append(hashes, string(hash))
	}
	return hashes, nil
}

func normBackupPlain(s string) string {
	s = strings.ReplaceAll(strings.ToUpper(strings.TrimSpace(s)), "-", "")
	return s
}

// MatchBackupCode finds a bcrypt hash matching the user input and returns its index (-1 if none).
func MatchBackupCode(plainInput string, hashes []string) int {
	want := normBackupPlain(plainInput)
	if len(want) != 8 {
		return -1
	}
	for i, h := range hashes {
		if err := bcrypt.CompareHashAndPassword([]byte(h), []byte(want)); err == nil {
			return i
		}
	}
	return -1
}
