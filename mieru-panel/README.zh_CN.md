# mieru-panel

[mieru](https://github.com/enfein/mieru) 服务器守护进程 **mita** 的 Web 管理面板。
Go 后端 + Next.js（App Router，静态导出）前端嵌入到同一个 Go 二进制，并通过
Docker Compose 与 mita 一起发布。开箱即用：`docker compose up -d --build`，其余操作在
UI 中完成。

## 功能

- **认证** —— 基于 Cookie 的会话登录（管理员账号、bcrypt 密码）。默认凭据为
  `admin` / `admin`；首次启动可用环境变量 `PANEL_ADMIN_USER`、`PANEL_ADMIN_PASS`
  覆盖，之后也可在 **服务器 → 管理员账户** 修改。
- **用户增删改** —— 创建 / 删除用户、重置密码。所有变更写入 `data/config.json`，并通过
  `mita apply config && mita reload` 推送到 mita，无需手动编辑服务器端配置。
- **每用户订阅** —— 每个用户有一条独立的 `/sub/<token>` URL，返回 sing-box / Karing
  兼容的 JSON（见下文 *订阅格式*）。UI 内提供 URL、二维码以及一键 *查看 JSON*。
- **服务器设置** —— `ServerIP`、`DefaultPort`、`ServerPortRange` 可在
  **服务器 → 服务器参数** 编辑，保存时会立即同步到 mita。
- **状态与控制** —— 启动 / 停止 mita，查看 `RUNNING` / `IDLE`，查看基于面板数据的
  当日各用户流量柱状图。
- **日志** —— 结构化面板日志（INFO / WARN / ERROR）在 UI 内实时滚动，同时输出到
  stdout（`docker logs mieru-panel`）。同一面板还会展示 mita 守护进程的 stdout
  尾部（来自共享文件 `/var/log/mita/mita.log`，等价于 `docker compose logs mita`）。
- **国际化** —— 俄 / 英 / 中三语，三套主题（Midnight / Sakura / Ghost）。

## 快速开始（Docker Compose）

两个镜像都在仓库中**本地构建**,不依赖 Docker Hub,也不再需要 `enfein/mita:latest`。
一条命令同时启动 `mita` 与面板:

```bash
git clone https://github.com/RsNest/mieruRU
cd mieruRU/mieru-panel

# 必填：告诉面板你的公网 IP
export PANEL_SERVER_IP=147.90.12.43
# 可选：管理员与端口
export PANEL_ADMIN_USER=admin
export PANEL_ADMIN_PASS=change-me
export PANEL_DEFAULT_PORT=2015
export PANEL_PORT_RANGE=2012-2022

docker compose up -d --build
```

第一次构建会在两个多阶段 Dockerfile 中分别编译 mita（`cmd/mita`）与面板
（Go + Next.js）;之后的重建会命中缓存。

面板监听 `8080` 端口。默认使用 `network_mode: host`,会绑定到主机的
`0.0.0.0:8080`,对外暴露时建议用 nginx(见 `docs/nginx.conf`)。mita 同样以
host 网络运行,直接监听 TCP `2012-2022`。

容器起来后:

1. 打开 `http://<host>:8080` 并登录。
2. 进入 **服务器**,如果 `PANEL_SERVER_IP` 未设置,在 *服务器参数* 中补充。
3. **用户 → +** 添加用户。
4. 点击用户行：复制订阅 URL、用 Karing 扫描二维码,或复制 sing-box JSON。

`docker compose logs -f` 会显示所有内容：面板事件（来源 `auth`、`users`、`mita`、
`config`、`sub`、`panel`)以及底层 mita CLI 调用。

## 环境变量

| 名称 | 默认值 | 作用 |
|---|---|---|
| `PANEL_CONFIG` | `data/config.json` | 面板配置文件路径。 |
| `PANEL_HOST` | `0.0.0.0` | HTTP 监听地址。 |
| `PANEL_ADMIN_USER` | `admin` | 管理员用户名,每次启动同步。 |
| `PANEL_ADMIN_PASS` | 未设置 | 若设置,**每次启动都会重置** admin 密码（用于忘记密码；处理后请清空）。 |
| `PANEL_SERVER_IP` | 未设置 | 写入用户订阅的服务器公网 IP。可在 UI 中后改。 |
| `PANEL_DEFAULT_PORT` | `2015` | 订阅中通告的 TCP 端口。 |
| `PANEL_PORT_RANGE` | `2012-2022` | 应用到 mita `portBindings` 的端口范围。 |
| `MITA_BINARY` | `mita` | 面板调用的 mita CLI 路径(连接 daemon socket)。 |

## 订阅格式

`/sub/<token>` 返回的 JSON(管理员另有 `/api/users/<name>/config`),即
[安装指南](docs/install-mieru.md)推荐的 sing-box 配置:

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

`server` / `server_port` 来自 **服务器参数**;`username` / `password` 来自用户记录。
默认设置 `dns.strategy = ipv4_only`,以避免 iOS / Karing 在仅 IPv4 的移动网络上
因 AAAA 查询而抖动。

## 日志

UI 的 **日志** 标签同时展示两路:

1. **面板日志** —— Go 二进制输出的全部内容(`auth`、`users`、`mita`、`config`、
   `sub`、`panel`、`init`、`ui`、`go`)。每条记录均带 `INFO / WARN / ERROR / DEBUG` 级别,
   保留最近 1000 条(可通过 `GET /api/logs?since=<seq>` 增量获取),并同步写入 stdout,
   方便 `docker logs mieru-panel` 查看。
2. **mita 日志** —— 通过 `GET /api/mita/logs` 读取共享文件
   `/var/log/mita/mita.log`，由 mita 容器的 `tee` 包装写入；同一份内容也可以
   通过 `docker compose logs mita` 查看。

部署规模较大时,请使用宿主 Docker 日志驱动收集 stdout,内存缓冲仅用于 UI 实时调试。

## 本地构建

```bash
make web   # 将 Next.js 构建到 mieru-panel/panel/out
make build # 然后用 go build 嵌入 UI 编译二进制
```

## 更新 mita

mita 从仓库内的源码构建(`cmd/mita`、`pkg/`、`apis/`)。同步上游变更只需:

```bash
git pull
docker compose up -d --build mita
```

## 备份

```bash
docker run --rm \
  -v mieru-panel_panel_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/panel-backup.tar.gz /data
```

## init 命令(传统 / 手动)

如果不希望使用环境变量,也可以在启动前手动生成 config:

```bash
./mieru-panel init \
  --server-ip "147.90.12.43" \
  --admin-pass "change_me" \
  --first-user "ruslan" \
  --first-user-pass "strong_password"
```
