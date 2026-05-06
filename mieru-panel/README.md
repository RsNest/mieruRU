# mieru-panel

Simple web admin panel for `mita` (mieru server), built with Go standard library and a single-page vanilla JS frontend.

## Security defaults

- Binds to `127.0.0.1:8080` by default.
- Admin password stored as bcrypt hash in `config.json`.
- Session cookie is HMAC signed.
- User subscription tokens are random 32-byte hex values.
- User plaintext passwords are stored only in panel config (required for subscription generation and mita apply flow).

## Quick start with Docker

```bash
# 1. Clone
git clone https://github.com/yourname/mieru-panel
cd mieru-panel

# 2. Init config
docker compose run --rm panel ./init.sh

# 3. Start
docker compose up -d

# 4. Check logs
docker compose logs -f

# 5. Panel available at
# http://127.0.0.1:8080 (or via nginx https)
```

## Updating mita

```bash
docker compose pull mita
docker compose up -d mita
```

## Backup

```bash
docker run --rm \
  -v mieru-panel_panel_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/panel-backup.tar.gz /data
```

## Important note about mita image

If `enfein/mita:latest` is unavailable on Docker Hub, build a local image from the upstream repository Dockerfile:

- Source Dockerfile path: `deployments/docker/mita/` in [mieru upstream repo](https://github.com/enfein/mieru)
- Build/tag it locally and update `docker-compose.yml` image reference.

## Nginx reverse proxy with HTTPS

Use `docs/nginx.conf` as a template and expose panel only through HTTPS.

## Local build/install

```bash
make build
sudo make install
```

## Init command

`mieru-panel init` creates the first config file:

```bash
./mieru-panel init \
  --server-ip "147.90.12.43" \
  --admin-pass "change_me" \
  --first-user "ruslan" \
  --first-user-pass "strong_password"
```
