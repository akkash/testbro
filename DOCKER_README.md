# TestBro.ai Docker Deployment Guide

This guide covers how to deploy TestBro.ai using Docker containers for both development and production environments.

## 📋 Prerequisites

- Docker 20.10+ installed
- Docker Compose v2.0+ installed
- At least 4GB RAM available
- 10GB+ free disk space

## 🚀 Quick Start

### 1. Environment Setup

```bash
# Copy environment template
cp .env.template .env

# Edit environment variables (REQUIRED)
nano .env
```

**Required Environment Variables:**
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- `OPENROUTER_KEY` - Your OpenRouter API key for AI features
- `JWT_SECRET` - Change from default (minimum 32 characters)
- `JWT_REFRESH_SECRET` - Change from default (minimum 32 characters)
- `REDIS_PASSWORD` - Change from default
- `POSTGRES_PASSWORD` - Change from default

### 2. Using Docker Manager Script

The easiest way to manage the Docker stack is using our management script:

```bash
# Setup environment and check requirements
./docker-manager.sh setup

# Build and start all services
./docker-manager.sh build prod
./docker-manager.sh start prod

# Check status
./docker-manager.sh status

# View logs
./docker-manager.sh logs

# Stop services
./docker-manager.sh stop
```

### 3. Manual Docker Compose

Alternatively, you can use Docker Compose directly:

```bash
# Production deployment
docker-compose up -d

# Development with hot reloading
docker-compose -f docker-compose.dev.yml up -d

# With monitoring stack
docker-compose --profile monitoring up -d
```

## 🏗 Architecture Overview

The Docker stack includes:

### Core Services
- **TestBro Frontend** (Port 3000) - React/Vite application with Nginx
- **TestBro Backend** (Port 3001) - Node.js/Express API server
- **PostgreSQL** (Port 5432) - Primary database
- **Redis** (Port 6379) - Cache and session store

### Optional Services (Profiles)
- **Nginx Load Balancer** (Ports 80/443) - Production load balancing
- **Prometheus** (Port 9090) - Metrics collection
- **Grafana** (Port 3030) - Monitoring dashboards

## 🔧 Configuration

### Environment Profiles

#### Development Mode
```bash
./docker-manager.sh start dev
```
- Hot reloading for both frontend and backend
- Debug ports exposed
- Detailed logging
- Development database

#### Production Mode
```bash
./docker-manager.sh start prod
```
- Optimized builds
- Security hardening
- Production logging
- Health checks

#### Production with Monitoring
```bash
./docker-manager.sh start prod monitoring
```
- Includes Prometheus and Grafana
- Advanced metrics collection
- Performance dashboards

### Service URLs

After starting the stack, access these URLs:

| Service | Development | Production |
|---------|-------------|------------|
| Frontend | http://localhost:5173 | http://localhost:3000 |
| Backend API | http://localhost:3001 | http://localhost:3001 |
| Health Check | http://localhost:3001/health | http://localhost:3001/health |
| Metrics | http://localhost:3001/api/metrics | http://localhost:3001/api/metrics |
| Prometheus | - | http://localhost:9090 |
| Grafana | - | http://localhost:3030 |

## 🛠 Development Workflow

### Hot Reloading Development

```bash
# Start development stack
./docker-manager.sh start dev

# View backend logs
./docker-manager.sh logs testbro-backend-dev dev

# View frontend logs
./docker-manager.sh logs testbro-frontend-dev dev

# Open shell in backend container
./docker-manager.sh shell testbro-backend-dev
```

### Debugging

Backend debugging is available on port 9229 in development mode:
- Attach your IDE debugger to `localhost:9229`
- Use Chrome DevTools: `chrome://inspect`

## 📦 Docker Images

### Backend Image Features
- Multi-stage build for optimization
- Non-root user for security
- Health checks
- Log rotation
- Production-ready Node.js setup

### Frontend Image Features
- Nginx-based production server
- Gzip compression
- Security headers
- SPA routing support
- Static asset caching

## 🔒 Security Features

### Container Security
- Non-root user execution
- Minimal base images (Alpine Linux)
- Security headers configuration
- Network isolation
- Resource limits

### Application Security
- JWT authentication with rotation
- Rate limiting
- CSRF protection
- Input validation
- API key authentication
- Comprehensive logging

## 📊 Monitoring & Observability

### Health Checks
All services include health checks:
```bash
# Check health status
curl http://localhost:3001/health

# Detailed health information
curl http://localhost:3001/health | jq
```

### Metrics
Access metrics endpoints:
```bash
# Application metrics
curl http://localhost:3001/api/metrics

# Prometheus metrics
curl http://localhost:3001/metrics

# APM performance data
curl http://localhost:3001/api/apm/performance
```

### Logging
Structured logs are available:
```bash
# View all logs
./docker-manager.sh logs

# View specific service logs
./docker-manager.sh logs testbro-backend

# Follow logs in real-time
docker-compose logs -f testbro-backend
```

## 💾 Data Management

### Persistent Volumes
The following data is persisted:
- PostgreSQL data (`postgres_data`)
- Redis data (`redis_data`)
- Application logs (`backend_logs`)
- File uploads (`backend_uploads`)

### Backup & Restore
```bash
# Create backup
./docker-manager.sh backup

# Restore from backup
./docker-manager.sh restore ./backups/20240101_120000

# Manual database backup
docker-compose exec postgres pg_dump -U testbro testbro > backup.sql
```

## 🔄 Maintenance

### Updates
```bash
# Pull latest images
docker-compose pull

# Rebuild with updates
./docker-manager.sh build prod

# Restart with new images
./docker-manager.sh restart prod
```

### Cleanup
```bash
# Remove unused containers and images
docker system prune -f

# Complete cleanup (WARNING: removes all data)
./docker-manager.sh cleanup
```

## 🐛 Troubleshooting

### Common Issues

#### Environment Variables Not Loaded
```bash
# Check if .env file exists and has correct values
cat .env | grep -E "(SUPABASE_URL|JWT_SECRET)"
```

#### Database Connection Issues
```bash
# Check PostgreSQL status
docker-compose exec postgres pg_isready -U testbro

# Check database logs
./docker-manager.sh logs postgres
```

#### Redis Connection Issues
```bash
# Test Redis connection
docker-compose exec redis redis-cli ping

# Check Redis logs
./docker-manager.sh logs redis
```

#### Service Not Starting
```bash
# Check service status
docker-compose ps

# View service logs
./docker-manager.sh logs [service-name]

# Check resource usage
docker stats
```

### Performance Optimization

#### Memory Usage
```bash
# Monitor memory usage
docker stats --format "table {{.Container}}\\t{{.CPUPerc}}\\t{{.MemUsage}}"

# Adjust memory limits in docker-compose.yml
```

#### Build Optimization
```bash
# Use BuildKit for faster builds
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# Build with no cache
./docker-manager.sh build prod
```

## 📝 Advanced Configuration

### Custom Environment Variables
Add custom variables to `.env`:
```bash
# Custom backend port
BACKEND_PORT=3002

# Custom Redis configuration
REDIS_MAXMEMORY=256mb
REDIS_MAXMEMORY_POLICY=allkeys-lru
```

### SSL/TLS Configuration
For production with SSL:
```bash
# Add SSL certificates to docker-compose.yml
# Update Nginx configuration for HTTPS
# Set environment variables for SSL paths
```

### Scaling Services
```bash
# Scale backend horizontally
docker-compose up -d --scale testbro-backend=3

# Use with load balancer profile
docker-compose --profile production up -d
```

## 🆘 Support

For issues or questions:
1. Check the logs: `./docker-manager.sh logs`
2. Verify environment variables
3. Check Docker resources: `docker system df`
4. Review health checks: `curl localhost:3001/health`

## 📚 Additional Resources

- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [TestBro.ai Documentation](./README.md)
- [Security Guidelines](./SECURITY.md)