# Build stage
FROM golang:1.20-alpine AS builder

WORKDIR /chaincode

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY *.go ./

# Build the chaincode binary
RUN CGO_ENABLED=0 GOOS=linux go build -o /chaincode-server .

# Production stage
FROM alpine:3.18

WORKDIR /app

# Copy the binary from builder
COPY --from=builder /chaincode-server .

# Copy entrypoint script
COPY docker-entrypoint.sh .
RUN chmod +x docker-entrypoint.sh

# Expose chaincode port
EXPOSE 9999

# Run the chaincode server
ENTRYPOINT ["./docker-entrypoint.sh"]
