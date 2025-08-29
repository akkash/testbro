# Redis Configuration for TestBro.ai

This document outlines the Redis caching implementation for performance optimization.

## Overview

Redis is used for:
- **Response caching** - API endpoint responses
- **Session storage** - User authentication sessions  
- **Rate limiting** - Request throttling data
- **User data caching** - Profiles, permissions, preferences
- **Project data caching** - Project metadata, test results
- **Search result caching** - Search queries and results
- **Analytics caching** - Dashboard statistics and metrics
- **File metadata caching** - File information and thumbnails

## Configuration

### Environment Variables

```bash
# Redis Connection
REDIS_HOST=localhost                    # Redis server host
REDIS_PORT=6379                        # Redis server port
REDIS_PASSWORD=                         # Redis password (optional)
REDIS_DB=0                             # Redis database number
REDIS_URL=redis://localhost:6379       # Full Redis connection URL

# Cache Configuration
CACHE_ENABLED=true                      # Enable/disable caching
CACHE_DEFAULT_TTL=900                   # Default TTL in seconds (15 minutes)
CACHE_KEY_PREFIX=testbro               # Prefix for cache keys
CACHE_MAX_MEMORY=1gb                   # Max memory for Redis
CACHE_EVICTION_POLICY=allkeys-lru      # Memory eviction policy
```

### Redis Configuration Files

For production deployments, Redis should be configured with:

```conf
# redis.conf
maxmemory 1gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
appendonly yes
appendfsync everysec
tcp-keepalive 300
timeout 0
```

## Cache Structure

### Cache Keys

Cache keys follow a hierarchical structure:

```
testbro:                           # Key prefix
├── user:profile:{userId}          # User profiles
├── user:permissions:{userId}      # User permissions
├── user:session:{sessionId}       # User sessions
├── project:data:{projectId}       # Project data
├── project:tests:{projectId}      # Project test cases
├── test:results:{testId}          # Test execution results
├── org:data:{orgId}              # Organization data
├── org:members:{orgId}           # Organization members
├── api:response:{hash}           # API response cache
├── search:{hash}                 # Search results
├── analytics:{type}:{period}     # Analytics data
├── dashboard:stats:{userId}      # Dashboard statistics
└── ratelimit:{ip}:{endpoint}     # Rate limiting counters
```

### TTL (Time To Live) Values

Different data types have different cache durations:

```typescript
VERY_SHORT: 60 seconds        // Real-time data
SHORT: 300 seconds (5 min)    // Frequently changing data
MEDIUM: 900 seconds (15 min)  // Semi-static data
LONG: 3600 seconds (1 hour)   // Stable data
VERY_LONG: 86400 seconds (1 day) // Static data
PERSISTENT: 604800 seconds (7 days) // Rarely changing data
```

## Cache Usage Patterns

### 1. Read-Through Caching

```typescript
import { UserCache } from '../services/cacheHelpers';

// Get user profile with automatic fallback to database
const userProfile = await UserCache.getUserProfile(userId);
if (!userProfile.cached) {
  // Data was fetched from database and cached
}
```

### 2. Write-Through Caching

```typescript
// Update user profile in database and cache
await updateUserInDatabase(userId, profileData);
await UserCache.setUserProfile(userId, profileData);
```

### 3. Cache-Aside Pattern

```typescript
import { ProjectCache } from '../services/cacheHelpers';

// Try cache first, fallback to database
const project = await ProjectCache.getProjectWithFallback(
  projectId,
  () => fetchProjectFromDatabase(projectId)
);
```

### 4. Automatic Response Caching

Routes are automatically cached based on configuration:

```typescript
// GET /api/users/:id - cached for 15 minutes
// GET /api/projects - cached for 5 minutes
// GET /api/analytics/dashboard - cached for 15 minutes
```

## Cache Invalidation

### Automatic Invalidation

Cache is automatically invalidated on data mutations:

```typescript
// POST /api/projects - invalidates project list cache
// PUT /api/users/:id - invalidates user profile cache
// DELETE /api/projects/:id - invalidates project cache
```

### Manual Invalidation

```typescript
import { CacheInvalidation } from '../services/cacheHelpers';

// Invalidate specific user data
await CacheInvalidation.invalidateUser(userId);

// Invalidate project data
await CacheInvalidation.invalidateProject(projectId);

// Smart invalidation with relations
await CacheInvalidation.smartInvalidate('user', userId, ['project:123']);
```

### Pattern-based Invalidation

```typescript
import { cacheService } from '../services/cacheService';

// Invalidate all user-related cache
await cacheService.deletePattern('user:*');

// Invalidate all project cache
await cacheService.deletePattern('project:*');
```

## Performance Optimization

### 1. Cache Warming

Critical data is pre-loaded into cache:

```typescript
// Warm up frequently accessed data
await cacheService.warmupCache();
```

### 2. Connection Pooling

Redis connections are pooled for optimal performance:

```typescript
const redis = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
});
```

### 3. Pipelining

Multiple commands are batched:

```typescript
const pipeline = redis.pipeline();
pipeline.get('key1');
pipeline.get('key2');
pipeline.get('key3');
const results = await pipeline.exec();
```

## Monitoring and Metrics

### Cache Statistics

Monitor cache performance:

```bash
# Cache hit rate, memory usage, key count
GET /api/cache/stats
```

### Redis Metrics

Key performance indicators:
- **Hit Rate**: Percentage of requests served from cache
- **Memory Usage**: Current Redis memory consumption
- **Connection Count**: Active Redis connections
- **Response Time**: Average cache operation time
- **Key Count**: Total number of cached keys
- **Evicted Keys**: Number of keys removed due to memory pressure

### Health Checks

Redis health is monitored:

```typescript
const health = await cacheService.healthCheck();
// Returns: { healthy: boolean, responseTime: number }
```

## Deployment Configurations

### Development

```yaml
# docker-compose.yml
redis:
  image: redis:7-alpine
  ports:
    - "6379:6379"
  command: redis-server --appendonly yes
```

### Production (Render)

```yaml
# render.yaml
services:
  - type: redis
    name: testbro-redis
    plan: starter
    maxmemoryPolicy: allkeys-lru
```

### Production (Docker)

```yaml
# docker-compose.production.yml
redis:
  image: redis:7-alpine
  command: >
    redis-server --appendonly yes
                 --maxmemory 2gb
                 --maxmemory-policy allkeys-lru
                 --save 900 1
                 --save 300 10
                 --save 60 10000
  volumes:
    - redis_data:/data
```

## Security Considerations

### 1. Authentication

```bash
# Enable Redis AUTH
requirepass your_secure_password
```

### 2. Network Security

```bash
# Bind to specific interfaces
bind 127.0.0.1 ::1

# Disable dangerous commands
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command DEBUG ""
```

### 3. Encryption

For production environments:

```bash
# Enable TLS
tls-port 6380
tls-cert-file /path/to/redis.crt
tls-key-file /path/to/redis.key
```

## Troubleshooting

### Common Issues

#### High Memory Usage

```bash
# Check memory usage
redis-cli info memory

# Analyze key distribution
redis-cli --bigkeys

# Set memory limit
config set maxmemory 1gb
```

#### Cache Misses

```bash
# Monitor cache statistics
redis-cli info stats

# Check hit rate
redis-cli info stats | grep keyspace_hits
```

#### Connection Issues

```bash
# Test connection
redis-cli ping

# Check connection count
redis-cli info clients
```

### Performance Tuning

#### Memory Optimization

```bash
# Use efficient data structures
config set hash-max-ziplist-entries 512
config set list-max-ziplist-size -2
config set set-max-intset-entries 512
```

#### Persistence Tuning

```bash
# Adjust save points
config set save "900 1 300 10 60 10000"

# Tune AOF rewrite
config set auto-aof-rewrite-percentage 100
config set auto-aof-rewrite-min-size 64mb
```

## Best Practices

### 1. Cache Key Design

- Use hierarchical key structures
- Include version information for schema changes
- Avoid very long key names
- Use consistent naming conventions

### 2. TTL Management

- Set appropriate TTL values based on data volatility
- Use shorter TTLs for frequently changing data
- Implement cache warming for critical data
- Monitor and adjust TTL based on usage patterns

### 3. Memory Management

- Set maximum memory limits
- Choose appropriate eviction policies
- Monitor memory usage and key distribution
- Implement cache compression for large values

### 4. Error Handling

- Implement graceful fallbacks when cache is unavailable
- Log cache errors for monitoring
- Don't fail operations due to cache failures
- Use circuit breakers for cache dependencies

### 5. Testing

- Test cache behavior in all environments
- Verify cache invalidation logic
- Load test cache performance
- Monitor cache behavior in production

## Scaling Considerations

### Horizontal Scaling

For large-scale deployments:

1. **Redis Cluster**: Distribute data across multiple nodes
2. **Redis Sentinel**: High availability with automatic failover
3. **Read Replicas**: Scale read operations

### Vertical Scaling

- Increase memory allocation
- Optimize Redis configuration
- Use Redis modules for additional functionality

### Cloud Solutions

- **AWS ElastiCache**: Managed Redis service
- **Google Cloud Memorystore**: Managed Redis service
- **Azure Cache for Redis**: Managed Redis service

## Migration and Backup

### Data Export

```bash
# Create backup
redis-cli --rdb /backup/dump.rdb

# Export specific keys
redis-cli --scan --pattern "user:*" | xargs redis-cli del
```

### Cache Warming Scripts

```bash
#!/bin/bash
# warm-cache.sh
curl -X POST /api/cache/warm
echo "Cache warming completed"
```

## Monitoring Setup

### Metrics Collection

Integrate with monitoring systems:

```typescript
// Export metrics for Prometheus
app.get('/metrics', async (req, res) => {
  const stats = await cacheService.getStats();
  // Format metrics for Prometheus
});
```

### Alerting Rules

Set up alerts for:
- Cache hit rate below threshold (< 80%)
- Memory usage above threshold (> 90%)
- High error rates
- Connection failures

## Future Enhancements

1. **Cache Compression**: Implement compression for large values
2. **Distributed Caching**: Multi-region cache synchronization  
3. **Cache Analytics**: Advanced cache usage analytics
4. **Automatic Tuning**: ML-based cache optimization
5. **Edge Caching**: CDN integration for global performance