FROM node:22-alpine AS web-builder
WORKDIR /web
COPY web/package*.json ./
RUN npm install
COPY web ./
RUN npm run build

FROM golang:1.24-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
COPY --from=web-builder /web/dist ./web/dist
RUN CGO_ENABLED=0 GOOS=linux go build -o mieru-panel .

FROM alpine:3.21
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app
COPY --from=enfein/mita:latest /usr/bin/mita /usr/bin/mita
COPY --from=builder /app/mieru-panel .
COPY --from=builder /app/init.sh ./init.sh
RUN chmod +x /app/init.sh
EXPOSE 8080
CMD ["./mieru-panel"]
