# TestBro Frontend Dockerfile
# Multi-stage build with Nginx for production

# Build stage
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production=false

# Copy source code
COPY . .

# Set production build environment variables
ENV NODE_ENV=production
ENV VITE_API_URL=http://localhost:3001

# Build the application
RUN npm run build

# Production stage with Nginx
FROM nginx:1.25-alpine AS production

# Install security updates
RUN apk update && apk upgrade && apk add --no-cache \
    curl

# Create nginx user and group
RUN addgroup -g 101 -S nginx || true && \
    adduser -S -D -H -u 101 -h /var/cache/nginx -s /sbin/nologin -G nginx -g nginx nginx || true

# Copy built application from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf
COPY nginx-default.conf /etc/nginx/conf.d/default.conf

# Create nginx cache directories
RUN mkdir -p /var/cache/nginx && \
    chown -R nginx:nginx /var/cache/nginx && \
    chmod -R 755 /var/cache/nginx

# Create log directories
RUN mkdir -p /var/log/nginx && \
    chown -R nginx:nginx /var/log/nginx

# Set proper permissions for nginx html directory
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

# Switch to non-root user
USER nginx

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

# Labels for metadata
LABEL maintainer="TestBro.ai Team"
LABEL version="1.0.0"
LABEL description="TestBro.ai Frontend Application"
LABEL org.opencontainers.image.source="https://github.com/testbro-ai/testbro"
LABEL org.opencontainers.image.title="TestBro Frontend"
LABEL org.opencontainers.image.description="AI-powered automated testing platform frontend"
LABEL org.opencontainers.image.vendor="TestBro.ai"