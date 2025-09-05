FROM golang:1.25-alpine as base

WORKDIR /app

# Install air for hot reloading
RUN go install github.com/air-verse/air@latest

# Copy go module files
COPY go.mod go.sum* ./
RUN go mod download

FROM base as development

# Copy source code
COPY . .

# Expose server port
EXPOSE 8080

# Start with air for hot reloading
CMD ["air", "-c", ".air.toml"]

# --- Production build ---
FROM golang:1.25-alpine as builder
WORKDIR /app
COPY go.mod go.sum* ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o kv-wsrelay

FROM alpine:3.20 as production
WORKDIR /app
COPY --from=builder /app/kv-wsrelay /usr/local/bin/kv-wsrelay
EXPOSE 8080
ENV WSRELAY_ADDR=:8080
ENTRYPOINT ["kv-wsrelay"]
