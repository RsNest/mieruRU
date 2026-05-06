# Mieru VPN 安装指南（Ubuntu 24.04）

在全新 Ubuntu 24.04 主机上完整部署 Mieru 协议,并在 Windows / iOS 端使用 Karing。
通过 [mieru-panel](../README.zh_CN.md) UI 也能达到同样的结果;本文档作为手动操作的参考。

> 第 3 节(服务端配置)和第 6 节(用户管理)的工作,面板会通过
> `mita apply config && mita reload` 自动完成;第 4.1 / 6.4 节中的每用户 JSON 由面板
> 在 `/sub/<token>` 实时生成。无面板运行 mita 或排查面板行为时再参考本文。

## 测试环境

**服务器**

- 系统:Ubuntu 24.04.1 LTS (Noble Numbat)
- 架构:x86_64 (amd64)
- 访问:SSH root
- Mita 版本:v3.32.0

**客户端**

- Windows 10 — Karing v1.2.18.2102
- iPhone (iOS) — App Store 版 Karing

**协议:** Mieru over TCP,端口范围 `2012-2022`。

## 工作原理(简述)

Mieru 是一种带加密的代理协议,把流量伪装成普通 TCP/UDP,没有明显特征,因此 DPI
更难识别和封锁。服务端运行 **mita** 守护进程,客户端可以是原版 `mieru` CLI、
Karing、Clash.Meta / mihomo 或 sing-box。

本套部署使用 **Karing**,内核为 sing-box,接受 sing-box JSON 配置。

> ⚠️ **时间敏感。** Mieru 用用户名、密码和系统时间共同推导出加密密钥。如果服务器与
> 客户端时间相差超过 ~30 秒,连接会失败。服务器请保持 NTP 启用
> (`timedatectl` → `NTP service: active`),iPhone 请打开 **设置 → 通用 → 日期与时间
> → 自动设置**。

---

## 1. 服务器准备

### 1.1 系统更新

```bash
apt update && apt upgrade -y
```

### 1.2 校验时间同步

```bash
timedatectl
```

期望输出:

```text
System clock synchronized: yes
NTP service: active
```

若 NTP 未启用:

```bash
timedatectl set-ntp true
```

### 1.3 架构判断

```bash
uname -m
```

`x86_64` → `amd64`,`aarch64` → `arm64`。

---

## 2. 安装 mita

### 2.1 下载并安装包

```bash
cd ~
curl -LSO https://github.com/enfein/mieru/releases/download/v3.32.0/mita_3.32.0_amd64.deb
dpkg -i mita_3.32.0_amd64.deb
```

### 2.2 验证守护进程

```bash
systemctl status mita
mita status
```

期望 `active (running)` 与 `mita server status is "IDLE"`。按 `q` 退出。

> 非 root 运行时,安装后执行
> `sudo usermod -a -G mita $USER`,然后重新登录。

---

## 3. 服务端配置

### 3.1 生成密码

```bash
openssl rand -base64 24
```

将输出妥善保存。

### 3.2 创建服务端配置

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

保存:`Ctrl+O`、`Enter`、`Ctrl+X`。

### 3.3 应用并启动

```bash
mita apply config ~/server_config.json
mita describe config
mita start
mita status
```

期望 `mita server status is "RUNNING"`。

### 3.4 可选:开启 BBR

```bash
cd ~
curl -fSsLO https://raw.githubusercontent.com/enfein/mieru/refs/heads/main/tools/enable_tcp_bbr.py
chmod +x enable_tcp_bbr.py
python3 enable_tcp_bbr.py
```

### 3.5 删除密码文件

```bash
shred -u ~/server_config.json
```

### 3.6 确认监听

```bash
ss -tlnp | grep mita
```

> ⚠️ VPS 提供商若有外部防火墙(Hetzner、AWS、Oracle 等),请在控制面板开放 TCP
> `2012-2022`。

---

## 4. Windows 10 上的 Karing

### 4.1 创建配置文件

`karing.json`(UTF-8):

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

替换 `YOUR_SERVER_IP` 与 `YOUR_PASSWORD`。`2015` 在 `2012-2022` 范围内。

### 4.2 导入 Karing

1. 打开 Karing → **Profiles**。
2. **+ Add** → **Import from file**。
3. 选择 `karing.json`。
4. 启用配置文件,按 **Start**。
5. 打开 **System Proxy** 或 **TUN Mode**。

### 4.3 测试

Karing 中点击 **Test**。期望出现绿色对勾和 `HTTP connection → succeeded`。

---

## 5. iPhone 上的 Karing

### 5.1 手机准备

务必打开 **设置 → 通用 → 日期与时间 → 自动设置**。

### 5.2 加载配置

仍使用同一份 `karing.json`。两种交付方式:

**A — GitHub Gist:**

1. 访问 <https://gist.github.com/>。
2. 创建 **Secret Gist**,文件名 `karing.json`,粘贴内容。
3. **Create secret gist** → **Raw** → 复制链接。
4. iPhone Karing:**Profiles → + → Add Profile from URL**,粘贴链接。

**B — 文件:**

通过 Telegram / 备忘录把文件发给自己 → 打开 → **共享 → 在 Karing 中打开**。

### 5.3 连接

启用配置,按 **Start**,允许安装 VPN 配置。

---

## 6. 添加新用户

> ⚠️ `apply config` 会**整体替换** `users`,不是合并。请列出全部用户。

### 6.1 生成密码

```bash
openssl rand -base64 24
```

### 6.2 准备新的用户列表

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

`user2` 配额:每天 5 GB,每月 50 GB。

### 6.3 不断流地应用

```bash
mita apply config ~/add_user.json
mita describe config
mita reload
shred -u ~/add_user.json
```

### 6.4 新用户的客户端配置

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

## 7. 常用命令

| 命令 | 用途 |
|---|---|
| `mita status` | 服务状态(IDLE / RUNNING) |
| `mita describe config` | 显示当前配置 |
| `mita describe users` | 用户统计与配额 |
| `mita apply config <file>` | 应用新配置 |
| `mita reload` | 不重启重载 users / logging |
| `mita start` / `mita stop` | 启动 / 停止代理 |
| `docker compose logs mita` | 最近日志（同时镜像到 `/var/log/mita/mita.log`） |
| `systemctl status mita` | systemd 服务状态 |
| `ss -tlnp \| grep mita` | 监听端口 |

---

## 8. 常见问题

**Karing (Windows): `multiplexing: cannot unmarshal object into string`**
使用字符串 `"multiplexing": "MULTIPLEXING_HIGH"`,不要用 `{ "level": "..." }`。

**Karing: `invalid server_ports format`**
使用单个 `"server_port": 2015`,不要传范围数组。

**iPhone: AAAA 查询出现 `failed to read socks5 connection response: EOF`**
移动网络没有 IPv6。在 `dns` 中加入 `"strategy": "ipv4_only"`(面板默认开启)。

**连接建立不了**
Windows 上:`Test-NetConnection YOUR_IP -Port 2015`。返回 `False` 说明端口未开,
请在 VPS 防火墙放行。

**手机端不工作**
开启 iOS 自动日期与时间。

**新增用户后老用户消失**
`users` 必须列出所有用户,该字段会被整体覆盖。

---

## 9. 安全

使用长随机密码(至少 `openssl rand -base64` 24 字节)——Mieru 中弱密码很危险,
因为密码也是密钥的一部分。应用配置后用 `shred -u` 销毁文件。定期更新 mita:
下载新 `.deb` 后再次执行 `dpkg -i`。给他人分享时,建议每人单独一个用户并设置配额,
这样既能管理流量,也方便单独吊销访问而不影响其他人。

---

## 来源

- 官方仓库: <https://github.com/enfein/mieru>
- 服务端安装: <https://github.com/enfein/mieru/blob/main/docs/server-install.md>
- 客户端安装: <https://github.com/enfein/mieru/blob/main/docs/client-install.md>
- Karing: <https://karing.app/>
