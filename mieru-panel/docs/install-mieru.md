# Mieru VPN install guide (Ubuntu 24.04)

End-to-end walk-through to deploy the Mieru protocol on a fresh Ubuntu 24.04 host with
Karing clients on Windows / iOS. The same outcome can be reached through the
[mieru-panel](../README.md) UI; this document is the manual reference.

> The panel automates **Section 3** (server config) and **Section 6** (user management)
> via `mita apply config && mita reload`, and renders the per-user JSON from **Section
> 4.1 / 6.4** at `/sub/<token>`. Use the steps below if you prefer to run mita without
> the panel, or to debug what the panel does under the hood.

## Test bench

**Server**

- OS: Ubuntu 24.04.1 LTS (Noble Numbat)
- Architecture: x86_64 (amd64)
- Access: root over SSH
- Mita: v3.32.0

**Clients**

- Windows 10 — Karing v1.2.18.2102
- iPhone (iOS) — Karing from the App Store

**Protocol:** Mieru over TCP, port range `2012-2022`.

## How it works (TL;DR)

Mieru is an encrypted proxy protocol that masks traffic as plain TCP/UDP without
explicit signatures, which makes detection and DPI blocking harder. The server side
runs the **mita** daemon; the client can be the original `mieru` CLI, Karing,
Clash.Meta/mihomo, or sing-box.

In this stack the client is **Karing**, which uses sing-box under the hood and accepts
sing-box JSON.

> ⚠️ **Time matters.** Mieru derives the encryption key from username, password and
> system time. If the server and client clocks drift more than ~30 seconds, the
> connection fails. Keep NTP active on the server (`timedatectl` → `NTP service:
> active`) and **Settings → General → Date & Time → Set automatically** on iPhone.

---

## 1. Server preparation

### 1.1 System update

```bash
apt update && apt upgrade -y
```

### 1.2 Verify clock sync

```bash
timedatectl
```

Expected:

```text
System clock synchronized: yes
NTP service: active
```

If NTP is off:

```bash
timedatectl set-ntp true
```

### 1.3 Architecture

```bash
uname -m
```

Use `amd64` for `x86_64`, `arm64` for `aarch64`.

---

## 2. Install mita

### 2.1 Download and install the package

```bash
cd ~
curl -LSO https://github.com/enfein/mieru/releases/download/v3.32.0/mita_3.32.0_amd64.deb
dpkg -i mita_3.32.0_amd64.deb
```

### 2.2 Verify the daemon

```bash
systemctl status mita
mita status
```

Expect `active (running)` and `mita server status is "IDLE"`. Press `q` to quit.

> If you are not running as root, after the install:
> `sudo usermod -a -G mita $USER`, then re-login.

---

## 3. Server configuration

### 3.1 Generate a password

```bash
openssl rand -base64 24
```

Save the output somewhere safe.

### 3.2 Create the server config

```bash
nano ~/server_config.json
```

```json
{
    "portBindings": [
        { "portRange": "2012-2022", "protocol": "TCP" }
    ],
    "users": [
        { "name": "myuser", "password": "REPLACE_PASSWORD" }
    ],
    "loggingLevel": "INFO",
    "mtu": 1400
}
```

Save: `Ctrl+O`, `Enter`, `Ctrl+X`.

### 3.3 Apply and start

```bash
mita apply config ~/server_config.json
mita describe config
mita start
mita status
```

Expect `mita server status is "RUNNING"`.

### 3.4 Optional: enable BBR

```bash
cd ~
curl -fSsLO https://raw.githubusercontent.com/enfein/mieru/refs/heads/main/tools/enable_tcp_bbr.py
chmod +x enable_tcp_bbr.py
python3 enable_tcp_bbr.py
```

### 3.5 Wipe the password file

```bash
shred -u ~/server_config.json
```

### 3.6 Confirm listeners

```bash
ss -tlnp | grep mita
```

> ⚠️ If the VPS provider has an external firewall (Hetzner, AWS, Oracle, …) — open TCP
> `2012-2022` in the provider's panel.

---

## 4. Karing on Windows 10

### 4.1 Create a config file

`karing.json` (UTF-8):

```json
{
  "log": { "level": "info" },
  "dns": {
    "servers": [
      { "tag": "google", "address": "8.8.8.8" },
      { "tag": "local",  "address": "1.1.1.1", "detour": "direct" }
    ]
  },
  "outbounds": [
    {
      "type": "mieru",
      "tag": "mieru-out",
      "server": "YOUR_SERVER_IP",
      "server_port": 2015,
      "transport": "TCP",
      "username": "myuser",
      "password": "YOUR_PASSWORD",
      "multiplexing": "MULTIPLEXING_HIGH"
    },
    { "type": "direct", "tag": "direct" }
  ],
  "route": { "final": "mieru-out" }
}
```

Replace `YOUR_SERVER_IP` and `YOUR_PASSWORD`. Port `2015` falls inside the `2012-2022`
range.

### 4.2 Import into Karing

1. Open Karing → **Profiles**.
2. **+ Add** → **Import from file**.
3. Pick `karing.json`.
4. Activate the profile, press **Start**.
5. Toggle **System Proxy** or **TUN Mode**.

### 4.3 Test

In Karing press **Test**. Expect green checks and `HTTP connection → succeeded`.

---

## 5. Karing on iPhone

### 5.1 Phone prep

**Settings → General → Date & Time → Set Automatically** must be on.

### 5.2 Load the config

Same `karing.json`. Two delivery options:

**A — GitHub Gist:**

1. Visit <https://gist.github.com/>.
2. Create a **Secret Gist**, file name `karing.json`, paste the JSON.
3. **Create secret gist** → **Raw** → copy the URL.
4. iPhone Karing: **Profiles → + → Add Profile from URL**, paste the URL.

**B — file:**

Send to yourself in Telegram / Notes → open the file → **Share → Open in Karing**.

### 5.3 Connect

Activate the profile, press **Start**, allow the VPN profile installation prompt.

---

## 6. Adding new users

> ⚠️ The `users` section is **replaced** on `apply config`, not merged. List **all** users.

### 6.1 Generate a password

```bash
openssl rand -base64 24
```

### 6.2 Updated user list

```bash
nano ~/add_user.json
```

```json
{
    "users": [
        { "name": "myuser", "password": "FIRST_USER_PASSWORD" },
        {
            "name": "user2",
            "password": "NEW_PASSWORD",
            "quotas": [
                { "days": 1,  "megabytes": 5120 },
                { "days": 30, "megabytes": 51200 }
            ]
        }
    ]
}
```

`user2` quota: 5 GB / day and 50 GB / month.

### 6.3 Apply without dropping connections

```bash
mita apply config ~/add_user.json
mita describe config
mita reload
shred -u ~/add_user.json
```

### 6.4 Client config for the new user

```json
{
  "log": { "level": "info" },
  "dns": {
    "servers": [
      { "tag": "google", "address": "8.8.8.8" },
      { "tag": "local",  "address": "1.1.1.1", "detour": "direct" }
    ]
  },
  "outbounds": [
    {
      "type": "mieru",
      "tag": "mieru-out",
      "server": "YOUR_SERVER_IP",
      "server_port": 2015,
      "transport": "TCP",
      "username": "user2",
      "password": "NEW_PASSWORD",
      "multiplexing": "MULTIPLEXING_HIGH"
    },
    { "type": "direct", "tag": "direct" }
  ],
  "route": { "final": "mieru-out" }
}
```

---

## 7. Useful commands

| Command | Purpose |
|---|---|
| `mita status` | Service status (IDLE / RUNNING) |
| `mita describe config` | Show current configuration |
| `mita describe users` | Per-user statistics and quotas |
| `mita apply config <file>` | Apply a new config |
| `mita reload` | Reload users / logging without restart |
| `mita start` / `mita stop` | Start / stop the proxy |
| `docker compose logs mita` | Recent logs (also mirrored to `/var/log/mita/mita.log`) |
| `systemctl status mita` | Systemd service state |
| `ss -tlnp \| grep mita` | Which ports it listens on |

---

## 8. Common issues

**Karing on Windows: `multiplexing: cannot unmarshal object into string`**
Use `"multiplexing": "MULTIPLEXING_HIGH"` (string), not an object `{ "level": "..." }`.

**Karing: `invalid server_ports format`**
Use a single `"server_port": 2015`, not an array of ranges.

**iPhone: `failed to read socks5 connection response: EOF` on AAAA queries**
Mobile network without IPv6. Add `"strategy": "ipv4_only"` to the `dns` block (the
panel does this by default).

**Connection does not establish**
From Windows: `Test-NetConnection YOUR_IP -Port 2015`. If `False` — open the ports in
the VPS firewall.

**No connection on the phone**
Enable automatic Date & Time in iOS.

**New user added but the old one disappeared**
List all users in `users`; the section is replaced wholesale.

---

## 9. Security

Use long random passwords (at least 24 bytes from `openssl rand -base64`) — weak
passwords in Mieru are dangerous because they enter the encryption key. After
applying configs, wipe the files with `shred -u`. Update mita regularly: download a
new `.deb` and run `dpkg -i` again. When sharing with other people, give each one a
dedicated user with a quota — that gives you traffic control and the ability to
revoke access without touching the rest.

---

## Sources

- Upstream repository: <https://github.com/enfein/mieru>
- Server install: <https://github.com/enfein/mieru/blob/main/docs/server-install.md>
- Client install: <https://github.com/enfein/mieru/blob/main/docs/client-install.md>
- Karing: <https://karing.app/>
