# Build stage
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Install dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o app ./cmd/app

# Final stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates tzdata

WORKDIR /root/

# Copy the binary from builder
COPY --from=builder /app/app .

# Copy configs
COPY --from=builder /app/configs ./configs

# Copy migrations
COPY --from=builder /app/migrations ./migrations

# Copy swagger.yaml (если существует)
RUN --mount=from=builder,source=/app,target=/tmp/app \
    if [ -f /tmp/app/swagger.yaml ]; then \
        cp /tmp/app/swagger.yaml ./swagger.yaml; \
    fi || true

EXPOSE 8080

CMD ["./app"]

