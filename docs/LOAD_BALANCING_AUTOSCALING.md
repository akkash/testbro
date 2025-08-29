# Load Balancing and Auto-scaling Configuration

This document outlines the load balancing and auto-scaling configurations available for TestBro.ai production deployment.

## Overview

TestBro.ai supports multiple load balancing and auto-scaling strategies:

1. **Nginx Load Balancer** - Traditional reverse proxy with health checks
2. **Traefik Load Balancer** - Modern reverse proxy with service discovery
3. **Docker Swarm** - Container orchestration with built-in load balancing
4. **Kubernetes** - Full container orchestration platform
5. **Custom Auto-scaler** - Docker Compose-based auto-scaling

## 1. Nginx Load Balancer

### Features
- High-performance reverse proxy
- SSL termination with Let's Encrypt
- Rate limiting and security headers
- Static asset caching
- Health checks and failover

### Configuration Files
- `nginx/production/nginx.conf` - Main Nginx configuration
- `docker-compose.production.yml` - Production Docker Compose with Nginx

### Deployment
```bash
# Start with Nginx load balancer
docker-compose -f docker-compose.yml -f docker-compose.production.yml up -d

# Scale backend services
docker-compose up -d --scale testbro-backend=3 --scale testbro-frontend=2
```

### Upstream Configuration
The Nginx configuration includes:
- **Least connections** load balancing algorithm
- **Health checks** with automatic failover
- **Backup servers** for high availability
- **Connection pooling** with keepalive

### SSL Configuration
- Modern TLS 1.2/1.3 support
- Strong cipher suites
- OCSP stapling
- HSTS headers

## 2. Traefik Load Balancer

### Features
- Automatic service discovery
- Let's Encrypt SSL automation
- Built-in monitoring and metrics
- Dynamic configuration updates
- Modern load balancing algorithms

### Configuration Files
- `docker-compose.traefik.yml` - Traefik-based deployment

### Deployment
```bash
# Create external network
docker network create traefik-public

# Start with Traefik
docker-compose -f docker-compose.traefik.yml up -d

# Services are automatically discovered and load balanced
```

### Service Discovery
Traefik automatically:
- Discovers new service instances
- Updates load balancer configuration
- Manages SSL certificates
- Provides health checks

### Dashboard Access
- URL: `https://traefik.testbro.ai`
- Protected with basic authentication
- Real-time metrics and service status

## 3. Docker Swarm Auto-scaling

### Features
- Native Docker orchestration
- Built-in service scaling
- Rolling updates with zero downtime
- Service constraints and placement
- Resource limits and reservations

### Configuration Files
- `docker-swarm-stack.yml` - Complete Swarm stack definition

### Deployment
```bash
# Initialize Docker Swarm
docker swarm init

# Label nodes for service placement
docker node update --label-add type=app node1
docker node update --label-add type=database node2

# Deploy stack
docker stack deploy -c docker-swarm-stack.yml testbro

# Scale services
docker service scale testbro_testbro-backend=5
```

### Auto-scaling Labels
Services include auto-scaling metadata:
```yaml
labels:
  - "autoscaler.enable=true"
  - "autoscaler.min_replicas=2"
  - "autoscaler.max_replicas=10"
  - "autoscaler.target_cpu=70"
  - "autoscaler.target_memory=80"
```

### Resource Management
- Memory and CPU limits
- Placement constraints
- Rolling update configuration
- Restart policies

## 4. Kubernetes Deployment

### Features
- Enterprise-grade orchestration
- Horizontal Pod Autoscaler (HPA)
- Pod Disruption Budgets
- Network policies for security
- Ingress controllers for load balancing

### Configuration Files
- `k8s/production-deployment.yml` - Complete Kubernetes manifests

### Deployment
```bash
# Create namespace
kubectl apply -f k8s/production-deployment.yml

# Monitor auto-scaling
kubectl get hpa -n testbro-production

# Check pod status
kubectl get pods -n testbro-production
```

### Auto-scaling Configuration
```yaml
spec:
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### Features Included
- **HPA** for automatic scaling based on CPU/memory
- **PDB** to prevent all pods from being terminated
- **Network policies** for security
- **Ingress** with SSL termination
- **ConfigMaps** and **Secrets** for configuration

## 5. Custom Auto-scaler

### Features
- Docker Compose compatible
- Metrics-based scaling decisions
- Configurable thresholds and cooldowns
- Slack notifications
- Systemd service support

### Configuration Files
- `scripts/autoscaler.sh` - Main auto-scaling script
- `scripts/testbro-autoscaler.service` - Systemd service

### Installation
```bash
# Make script executable
chmod +x scripts/autoscaler.sh

# Copy systemd service
sudo cp scripts/testbro-autoscaler.service /etc/systemd/system/
sudo systemctl daemon-reload

# Start auto-scaler
sudo systemctl start testbro-autoscaler
sudo systemctl enable testbro-autoscaler
```

### Configuration
Environment variables:
```bash
CHECK_INTERVAL=60          # Check every 60 seconds
MIN_REPLICAS=2            # Minimum replicas per service
MAX_REPLICAS=10           # Maximum replicas per service
CPU_THRESHOLD=70          # Scale up at 70% CPU
MEMORY_THRESHOLD=80       # Scale up at 80% memory
SCALE_UP_COOLDOWN=300     # 5 minute cooldown for scaling up
SCALE_DOWN_COOLDOWN=600   # 10 minute cooldown for scaling down
```

### Service Configuration
Per-service settings in script:
```bash
SERVICE_CONFIG[testbro-backend]="min:2,max:10,cpu:70,memory:80"
SERVICE_CONFIG[testbro-frontend]="min:2,max:5,cpu:60,memory:70"
```

### Monitoring
```bash
# Check status
./scripts/autoscaler.sh status

# View logs
journalctl -u testbro-autoscaler -f

# Test scaling
./scripts/autoscaler.sh test testbro-backend
```

## Load Balancing Strategies

### 1. Round Robin
- Default for most configurations
- Even distribution of requests
- Simple and effective

### 2. Least Connections
- Routes to server with fewest active connections
- Better for long-running requests
- Used in Nginx configuration

### 3. IP Hash
- Routes based on client IP
- Ensures session affinity
- Used for WebSocket connections

### 4. Weighted Distribution
- Assigns different weights to servers
- Useful for servers with different capacities
- Can be configured in all load balancers

## Health Checks

### Application Health Checks
All configurations include health checks:
- **Backend**: `GET /health`
- **Frontend**: `GET /` (nginx status)
- **Database**: Connection test
- **Redis**: PING command

### Health Check Parameters
```yaml
healthcheck:
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 60s
```

### Failure Handling
- Automatic removal from load balancer
- Retry with exponential backoff
- Alert notifications
- Automatic recovery when healthy

## Monitoring and Metrics

### Metrics Collection
All deployments include:
- **Prometheus** for metrics collection
- **Grafana** for visualization
- **Custom metrics** for auto-scaling decisions

### Key Metrics
- Request rate and response time
- Error rate and success rate
- CPU and memory utilization
- Active connections and queue depth
- Service health status

### Dashboards
Pre-configured Grafana dashboards for:
- Application performance
- Infrastructure metrics
- Load balancer status
- Auto-scaling events

## Security Considerations

### SSL/TLS
- Automatic SSL certificate management
- Modern TLS configuration
- HSTS headers
- SSL stapling

### Rate Limiting
- Global and per-endpoint limits
- IP-based rate limiting
- Burst handling
- DDoS protection

### Network Security
- Private networks for internal communication
- Network policies in Kubernetes
- Firewall rules for Docker Swarm
- Security headers

### Access Control
- Basic authentication for admin interfaces
- IP whitelisting for sensitive endpoints
- API key authentication
- Role-based access control

## Performance Optimization

### Connection Pooling
- Keep-alive connections
- Connection limits
- Pool size optimization
- Connection timeout settings

### Caching
- Static asset caching
- Response caching
- CDN integration
- Browser caching headers

### Compression
- Gzip compression
- Brotli compression (where supported)
- Response size optimization
- Image optimization

## Deployment Recommendations

### Small to Medium Scale (< 1000 concurrent users)
- Use Docker Compose with custom auto-scaler
- Nginx or Traefik load balancer
- 2-5 backend replicas
- Single database instance

### Medium Scale (1000-10000 concurrent users)
- Docker Swarm deployment
- Multiple worker nodes
- Database replication
- Redis clustering

### Large Scale (> 10000 concurrent users)
- Kubernetes deployment
- Multi-zone deployment
- Database sharding
- CDN integration
- Microservices architecture

## Troubleshooting

### Common Issues

#### Load Balancer Not Routing
```bash
# Check service discovery
docker-compose ps
kubectl get services

# Check health endpoints
curl http://localhost:3001/health
```

#### Auto-scaling Not Working
```bash
# Check metrics collection
docker stats
kubectl top pods

# Verify thresholds
./scripts/autoscaler.sh status
```

#### SSL Certificate Issues
```bash
# Check certificate status
docker-compose logs traefik
kubectl describe certificate

# Manual certificate request
certbot certonly --webroot -w /var/www/html -d testbro.ai
```

### Performance Issues
```bash
# Check resource usage
docker stats
kubectl top nodes

# Monitor connection pools
ss -tuln
netstat -an | grep :80
```

### Log Analysis
```bash
# Application logs
docker-compose logs -f testbro-backend

# Load balancer logs
docker-compose logs -f nginx
docker-compose logs -f traefik

# System logs
journalctl -u testbro-autoscaler
```

## Best Practices

1. **Always use health checks** for reliable failover
2. **Monitor auto-scaling events** to tune thresholds
3. **Set appropriate resource limits** to prevent resource exhaustion
4. **Use staging environment** to test scaling configuration
5. **Implement graceful shutdown** for zero-downtime deployments
6. **Regular backup** of configuration and data
7. **Security scanning** of container images
8. **Performance testing** under expected load

## Next Steps

After implementing load balancing and auto-scaling:

1. **Performance Testing** - Load test to validate scaling behavior
2. **Monitoring Setup** - Configure alerting and dashboards
3. **Backup Strategy** - Implement automated backups
4. **Security Hardening** - Additional security measures
5. **Documentation** - Update operational procedures