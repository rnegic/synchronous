# Build stage
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Install dependencies
COPY go.mod go.sum ./
RUN go mod download

# Install goose for migrations and copy to known location
ENV GOBIN=/go/bin
RUN go install github.com/pressly/goose/v3/cmd/goose@latest && \
    (cp /go/bin/goose /app/goose 2>/dev/null || \
     cp $HOME/go/bin/goose /app/goose 2>/dev/null || \
     cp $(go env GOPATH)/bin/goose /app/goose 2>/dev/null || \
     (echo "Warning: Could not find goose binary" && which goose && ls -la /go/bin/)) && \
    chmod +x /app/goose && \
    ls -la /app/goose

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

# Copy goose binary from builder
COPY --from=builder /app/goose /usr/local/bin/goose
RUN chmod +x /usr/local/bin/goose

# Copy configs
COPY --from=builder /app/configs ./configs

# Copy migrations
COPY --from=builder /app/migrations ./migrations

# Copy migration script (if exists)
COPY --from=builder /app/scripts ./scripts
RUN if [ -f ./scripts/migrate.sh ]; then chmod +x ./scripts/migrate.sh; fi

# Copy swagger.yaml (если существует в корне backend)
RUN --mount=from=builder,source=/app,target=/tmp/app \
    if [ -f /tmp/app/swagger.yaml ]; then \
        cp /tmp/app/swagger.yaml ./swagger.yaml; \
    fi || true

EXPOSE 8080

CMD ["./app"]

