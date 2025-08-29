# TestBro Backend Dockerfile
# Multi-stage build for production optimization

# Build stage
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    postgresql-dev

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies (including dev dependencies for build)
RUN npm ci --only=production=false

# Copy source code
COPY src/ ./src/

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Set NODE_ENV
ENV NODE_ENV=production

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S testbro -u 1001

# Set working directory
WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Create necessary directories with proper permissions
RUN mkdir -p logs logs/audit logs/performance logs/security && \
    chown -R testbro:nodejs /app

# Copy additional files if needed
COPY --chown=testbro:nodejs .env.example .env

# Switch to non-root user
USER testbro

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "const http = require('http'); \
    const options = { hostname: 'localhost', port: 3001, path: '/health', timeout: 5000 }; \
    const req = http.request(options, (res) => { \
        if (res.statusCode === 200) process.exit(0); \
        else process.exit(1); \
    }); \
    req.on('error', () => process.exit(1)); \
    req.end();"

# Start the application
CMD ["node", "dist/server.js"]

# Labels for metadata
LABEL maintainer="TestBro.ai Team"
LABEL version="1.0.0"
LABEL description="TestBro.ai Backend API Server"
LABEL org.opencontainers.image.source="https://github.com/testbro-ai/testbro"
LABEL org.opencontainers.image.title="TestBro Backend"
LABEL org.opencontainers.image.description="AI-powered automated testing platform backend"
LABEL org.opencontainers.image.vendor="TestBro.ai"