#!/bin/sh
set -e

echo "=== mieru-panel init ==="
printf "Server public IP: "
read -r SERVER_IP
printf "Admin password: "
read -r ADMIN_PASS
printf "First username: "
read -r USERNAME
printf "User password (or press Enter to generate): "
read -r USER_PASS

if [ -z "$USER_PASS" ]; then
  USER_PASS=$(openssl rand -base64 24)
  echo "Generated password: $USER_PASS"
fi

./mieru-panel init \
  --server-ip "$SERVER_IP" \
  --admin-pass "$ADMIN_PASS" \
  --first-user "$USERNAME" \
  --first-user-pass "$USER_PASS"

echo "Done. Run: docker compose up -d"
