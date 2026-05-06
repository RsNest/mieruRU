BIN := mieru-panel

.PHONY: web build install docker-build docker-up docker-down docker-logs docker-restart docker-shell

web:
	cd web && npm install && npm run build

build:
	$(MAKE) web
	go build -o $(BIN) .

install: build
	install -m 0755 $(BIN) /usr/local/bin/$(BIN)
	install -d /etc/systemd/system
	printf '%s\n' \
	'[Unit]' \
	'Description=mieru-panel service' \
	'After=network.target' \
	'' \
	'[Service]' \
	'Type=simple' \
	'WorkingDirectory=/opt/mieru-panel' \
	'ExecStart=/usr/local/bin/mieru-panel' \
	'Restart=always' \
	'Environment=PANEL_CONFIG=/opt/mieru-panel/data/config.json' \
	'' \
	'[Install]' \
	'WantedBy=multi-user.target' > /etc/systemd/system/mieru-panel.service
	systemctl daemon-reload
	systemctl enable mieru-panel

docker-build:
	docker compose build

docker-up:
	docker compose up -d

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f

docker-restart:
	docker compose restart panel

docker-shell:
	docker exec -it mieru-panel sh
