FROM golang:1.25.3-alpine AS builder
WORKDIR /app
RUN apk update && apk add --no-cache ca-certificates

COPY go.mod go.sum* ./
RUN go mod download

COPY . .
ENV CGO_ENABLED=0
RUN go build -trimpath -ldflags="-s -w" -o /app/kv-wsrelay .

FROM golang:1.25.3-alpine AS development
ENV CGO_ENABLED=0
WORKDIR /app
RUN apk update && apk add --no-cache bash && \
    go install github.com/air-verse/air@latest
COPY . .
EXPOSE 8080
CMD ["air", "-c", ".air.toml"]

FROM gcr.io/distroless/static-debian12 AS production
WORKDIR /
COPY --from=builder /app/kv-wsrelay /kv-wsrelay
EXPOSE 8080
ENV WSRELAY_ADDR=:8080
ENTRYPOINT ["/kv-wsrelay"]
