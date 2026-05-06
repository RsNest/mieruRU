# mieru-panel

Web admin panel for **mita** (the [mieru](https://github.com/enfein/mieru) server daemon).
Go backend + Next.js (App Router, static export) frontend, embedded into a single Go binary
and shipped with mita inside Docker Compose. Drop-in: `docker compose up -d --build` and
the rest of the work happens in the UI.

## What you get

- **Auth** – session-cookie login (admin user, bcrypt password). Default credentials are
  `admin` / `admin` and can be overridden by env on first start (`PANEL_ADMIN_USER`,
  `PANEL_ADMIN_PASS`) or changed later from the **Server → Administrator account** form.
- **Users CRUD** – create/delete users, regenerate password. Each change writes to
  `data/config.json` and is pushed into mita with `mita apply config && mita reload`,
  so you do not edit config files on the server by hand.
- **Per-user subscription** – every user has a unique `/sub/<token>` URL that returns a
  sing-box / Karing-compatible JSON profile (see *Subscription format* below). The UI
  shows the URL, a QR code for it, and a one-click *Show JSON* preview.
- **Server settings** – `ServerIP`, `DefaultPort`, `ServerPortRange` are editable in
  **Server → Server parameters**. On save the panel pushes the new port range into mita.
- **Status & control** – Start / Stop mita, see `RUNNING` / `IDLE` polling, basic per-user
  daily traffic chart from the panel data.
- **Logs** – structured panel logs (INFO / WARN / ERROR) live-tailed in the UI and also
  written to stdout (`docker logs mieru-panel`), plus an mita-side block that tails the
  daemon stdout from a shared file (`/var/log/mita/mita.log`), the same content you can
  see via `docker compose logs mita`.
- **i18n** – Russian / English / Chinese, three themes (Midnight / Sakura / Ghost).

## Quick start (Docker Compose)

Both images are built **from local sources** in this repo — there is nothing to pull
from Docker Hub, no `enfein/mita:latest` dependency. One command brings up `mita`
plus the panel:

```bash
git clone https://github.com/RsNest/mieruRU
cd mieruRU/mieru-panel

# minimum: tell the panel what your public IP is
export PANEL_SERVER_IP=147.90.12.43
# optional: override admin and ports
export PANEL_ADMIN_USER=admin
export PANEL_ADMIN_PASS=change-me
export PANEL_DEFAULT_PORT=2015
export PANEL_PORT_RANGE=2012-2022

docker compose up -d --build
```

The first build compiles mita (`cmd/mita`) and the panel (Go + Next.js) inside two
multi-stage Dockerfiles; subsequent rebuilds are cached.

The panel listens on port `8080`. With `network_mode: host` (default) it binds to
`0.0.0.0:8080` on the host – put nginx in front if you expose it to the internet
(see `docs/nginx.conf`). mita listens on the TCP port range `2012-2022` directly on
the host (also host networking).

After the containers are up:

1. Open `http://<host>:8080`, sign in.
2. Go to **Server**, fill in *Server parameters* if `PANEL_SERVER_IP` was empty.
3. Add a user in **Users → +**.
4. Click the user row → copy the subscription URL, scan the QR with Karing, or copy the
   sing-box JSON.

`docker compose logs -f` shows everything: panel events (`auth`, `users`, `mita`,
`config`, `sub`, `panel` sources) and the underlying mita CLI calls.

## Environment variables

| Name | Default | Effect |
|---|---|---|
| `PANEL_CONFIG` | `data/config.json` | Path to the panel config inside the container. |
| `PANEL_HOST` | `0.0.0.0` | Listen address for the HTTP server. |
| `PANEL_ADMIN_USER` | `admin` | Admin username. Synced on every start. |
| `PANEL_ADMIN_PASS` | unset | If set, **resets** the admin password on every start (handy for forgotten passwords; clear after use). |
| `PANEL_SERVER_IP` | unset | Public IP that lands inside the user subscription JSON. Editable later in the UI. |
| `PANEL_DEFAULT_PORT` | `2015` | TCP port advertised in the subscription. |
| `PANEL_PORT_RANGE` | `2012-2022` | Range applied to mita `portBindings`. |
| `MITA_BINARY` | `mita` | Path to the mita CLI used by the panel to talk to the daemon socket. |

## Subscription format

The panel returns this JSON for `/sub/<token>` (and `/api/users/<name>/config` for
authenticated admins). It is the canonical sing-box config recommended by the
[install guide](docs/install-mieru.md):

```json
{
  "log": { "level": "info" },
  "dns": {
    "strategy": "ipv4_only",
    "servers": [
      { "tag": "google", "address": "8.8.8.8" }
    ]
  },
  "outbounds": [
    {
      "type": "mieru",
      "tag": "mieru-out",
      "server": "147.90.12.43",
      "server_port": 2015,
      "transport": "TCP",
      "username": "myuser",
      "password": "Bpt/GB0a+SBjqPyiqRyzRXcxJ4dkc/xu",
      "multiplexing": "MULTIPLEXING_HIGH"
    },
    { "type": "direct", "tag": "direct" }
  ],
  "route": { "final": "mieru-out" }
}
```

`server` / `server_port` come from **Server parameters**; `username` / `password` from
the user record. `dns.strategy = ipv4_only` is set by default so iOS / Karing on
mobile networks does not flap on AAAA lookups.

## Logging

Two streams converge in the UI **Logs** tab:

1. **Panel logs** – everything the Go binary emits (`auth`, `users`, `mita`, `config`,
   `sub`, `panel`, `init`, `ui`, `go`). Each entry is `INFO / WARN / ERROR / DEBUG`,
   buffered in memory (last 1000 entries, queryable via `GET /api/logs?since=<seq>`),
   and also written to stdout so `docker logs mieru-panel` is meaningful.
2. **mita logs** – tail of the mita daemon stdout from the shared volume
   (`/var/log/mita/mita.log`), exposed via `GET /api/mita/logs`. The mita
   container writes this file via a `tee` wrapper, so `docker compose logs mita`
   keeps working as well.

If you scale the deployment, prefer collecting stdout via your normal Docker logging
driver – the in-memory buffer is for live debugging from the UI, not for archival.

## Local build

```bash
make web   # builds Next.js into mieru-panel/panel/out
make build # then go build with the embedded UI
```

## Updating mita

mita is built from the in-repo sources (`cmd/mita`, `pkg/`, `apis/`). To pick up
upstream changes pull this repo and rebuild:

```bash
git pull
docker compose up -d --build mita
```

## Backup

```bash
docker run --rm \
  -v mieru-panel_panel_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/panel-backup.tar.gz /data
```

## Init command (legacy / manual)

If you do not want env-driven defaults, you can still bootstrap a config file by hand
before starting the panel:

```bash
./mieru-panel init \
  --server-ip "147.90.12.43" \
  --admin-pass "change_me" \
  --first-user "ruslan" \
  --first-user-pass "strong_password"
```
