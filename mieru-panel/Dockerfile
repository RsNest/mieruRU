# syntax=docker/dockerfile:1.7
#
# Builds the mieru-panel image:
#   1. Next.js panel    -> static export in /panel/out
#   2. mita CLI         -> /usr/bin/mita (built from cmd/mita in this repo)
#   3. mieru-panel Go   -> /app/mieru-panel (embeds /panel/out)
#
# Build context: REPO ROOT (see docker-compose.yml `build.context: ..`).

############################
# 1. Frontend (Next.js)
############################
FROM node:22-alpine AS web-builder
WORKDIR /panel
COPY mieru-panel/panel/package*.json ./
RUN npm ci || npm install
COPY mieru-panel/panel ./
RUN npm run build

############################
# 2. mita CLI (from local mieru sources, replaces enfein/mita:latest)
############################
FROM golang:1.24-alpine AS mita-builder
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY apis ./apis
COPY cmd ./cmd
COPY pkg ./pkg
ENV CGO_ENABLED=0
RUN GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/mita ./cmd/mita

############################
# 3. mieru-panel binary (embeds /panel/out)
############################
FROM golang:1.24-alpine AS panel-builder
WORKDIR /app
COPY mieru-panel/go.mod mieru-panel/go.sum ./
RUN go mod download
COPY mieru-panel ./
COPY --from=web-builder /panel/out ./panel/out
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o mieru-panel .

############################
# 4. Runtime
############################
FROM alpine:3.21
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app
COPY --from=mita-builder   /out/mita            /usr/bin/mita
COPY --from=panel-builder  /app/mieru-panel     /app/mieru-panel
COPY --from=panel-builder  /app/init.sh         /app/init.sh
RUN chmod +x /app/init.sh /app/mieru-panel /usr/bin/mita
EXPOSE 8080
CMD ["/app/mieru-panel"]
