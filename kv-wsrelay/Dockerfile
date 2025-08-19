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
