package admin2fa

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"io"
)

// SealAESGCM encrypts plaintext with AES-256-GCM; output is STD base64(nonce|ciphertext+ciphertextIncludesTag).
func SealAESGCM(key []byte, plaintext []byte) (string, error) {
	if len(key) != 32 {
		return "", errors.New("admin2fa: AES key must be 32 bytes")
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}
	out := gcm.Seal(nonce, nonce, plaintext, nil)
	return base64.StdEncoding.EncodeToString(out), nil
}

// OpenAESGCM decrypts a string produced by SealAESGCM.
func OpenAESGCM(key []byte, enc string) ([]byte, error) {
	if len(key) != 32 {
		return nil, errors.New("admin2fa: AES key must be 32 bytes")
	}
	raw, err := base64.StdEncoding.DecodeString(enc)
	if err != nil {
		return nil, err
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	if len(raw) < gcm.NonceSize() {
		return nil, errors.New("admin2fa: ciphertext too short")
	}
	nonce := raw[:gcm.NonceSize()]
	ct := raw[gcm.NonceSize():]
	return gcm.Open(nil, nonce, ct, nil)
}
