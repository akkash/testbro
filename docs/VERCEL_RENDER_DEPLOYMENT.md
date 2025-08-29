# Vercel + Render Deployment Guide

This guide explains how to deploy TestBro.ai using **Vercel for the frontend** and **Render for the backend** - a simple, scalable approach that eliminates the need for Docker or Kubernetes.

## Why Vercel + Render?

### Benefits:
- ✅ **No Docker/Kubernetes complexity**
- ✅ **Automatic scaling** built-in
- ✅ **Zero configuration** deployment
- ✅ **Built-in SSL** certificates
- ✅ **Global CDN** for frontend
- ✅ **Managed infrastructure**
- ✅ **Cost-effective** for startups
- ✅ **Easy monitoring** and logs

### Perfect for:
- Small to medium scale applications
- Startups and MVPs
- Teams wanting simple deployment
- Applications with < 100,000 monthly active users

## Architecture Overview

```
Users
  ↓
Vercel CDN (Frontend)
  ↓ API calls
Render (Backend + Redis + PostgreSQL)
  ↓
Supabase (Additional services)
```

## Frontend Deployment (Vercel)

### 1. Prepare Frontend for Vercel

Update your frontend environment configuration:

```bash
# In testbro-frontend/.env.production
VITE_API_URL=https://testbro-backend.onrender.com
VITE_ENVIRONMENT=production
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_DEBUG=false
```

### 2. Deploy to Vercel

**Option A: Vercel CLI**
```bash
# Install Vercel CLI
npm i -g vercel

# Navigate to frontend directory
cd testbro-frontend

# Deploy
vercel --prod
```

**Option B: Git Integration**
1. Push code to GitHub
2. Connect repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy automatically on git push

### 3. Configure Vercel Environment Variables

In Vercel Dashboard → Settings → Environment Variables:
```
VITE_API_URL = https://testbro-backend.onrender.com
VITE_ENVIRONMENT = production
VITE_ENABLE_ANALYTICS = true
```

### 4. Custom Domain (Optional)
- Add your domain in Vercel dashboard
- Update DNS records as instructed
- SSL certificate is automatic

## Backend Deployment (Render)

### 1. Prepare Backend for Render

Ensure your backend has a proper start script in `package.json`:

```json
{
  "scripts": {
    "start": "node dist/server.js",
    "build": "tsc",
    "dev": "tsx watch src/server.ts"
  }
}
```

### 2. Deploy to Render

**Option A: Render Dashboard**
1. Connect your GitHub repository
2. Choose "Web Service"
3. Configure build and start commands:
   - Build Command: `npm ci && npm run build`
   - Start Command: `npm start`
   - Node Version: 18+

**Option B: render.yaml (Infrastructure as Code)**
The included `render.yaml` file automatically configures:
- Web service with auto-scaling
- Redis instance
- PostgreSQL database
- Environment variables

### 3. Configure Environment Variables

In Render Dashboard → Environment Variables:
```
NODE_ENV=production
LOG_LEVEL=info
PORT=3001
CORS_ORIGIN=https://your-app.vercel.app
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=your_jwt_secret
DATABASE_URL=postgresql://user:pass@host:port/db (auto-generated)
REDIS_URL=redis://user:pass@host:port (auto-generated)
```

### 4. Health Check Configuration

Render automatically uses the `/health` endpoint for health checks. Ensure your backend implements this endpoint.

## Database Setup

### Option 1: Render PostgreSQL (Recommended for simplicity)
- Automatically configured with `render.yaml`
- Managed backups and monitoring
- Easy to scale

### Option 2: Keep Supabase (Current setup)
- Update environment variables to point to Supabase
- More features but additional complexity

## Redis Setup

Render provides managed Redis:
- Automatically configured
- Built-in monitoring
- Easy to scale

## Scaling Configuration

### Frontend (Vercel)
- **Automatic scaling** - handles traffic spikes automatically
- **Global CDN** - serves from 100+ edge locations
- **No configuration needed**

### Backend (Render)
Auto-scaling configuration in `render.yaml`:
```yaml
scaling:
  minInstances: 1      # Always at least 1 instance
  maxInstances: 10     # Scale up to 10 instances
  targetMemoryPercent: 70  # Scale when memory > 70%
  targetCPUPercent: 70     # Scale when CPU > 70%
```

## Monitoring and Logging

### Vercel Monitoring
- Built-in analytics and performance monitoring
- Real-time logs in dashboard
- Error tracking available

### Render Monitoring
- Built-in metrics (CPU, memory, response time)
- Log aggregation
- Health check monitoring
- Email/Slack alerts

## CI/CD Pipeline

### Automatic Deployment
Both platforms support automatic deployment:

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: vercel/action@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}

  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Render
        uses: render-deploy-action@v1
        with:
          api-key: ${{ secrets.RENDER_API_KEY }}
          service-id: ${{ secrets.RENDER_SERVICE_ID }}
```

## Cost Estimation

### Vercel (Frontend)
- **Hobby**: Free for personal projects
- **Pro**: $20/month (includes team features)
- **Enterprise**: Custom pricing

### Render (Backend)
- **Free Tier**: $0/month (limited)
- **Starter**: $7/month per service
- **Standard**: $25/month per service
- **Pro**: $85/month per service

### Total Monthly Cost (Starter)
- Frontend: $0-20
- Backend: $7
- PostgreSQL: $7
- Redis: $7
- **Total: ~$21-41/month**

## Migration from Docker/Kubernetes

If you decide to move from containerized deployment later:

### 1. Export Database
```bash
# From Render PostgreSQL
pg_dump $DATABASE_URL > backup.sql

# To new system
psql new_database_url < backup.sql
```

### 2. Environment Variables
Export from Render dashboard and import to new system.

### 3. Zero Downtime Migration
1. Set up new infrastructure
2. Sync databases
3. Update DNS/load balancer
4. Decommission old infrastructure

## Security Considerations

### Frontend Security (Vercel)
- Automatic HTTPS
- Security headers configured
- DDoS protection included
- No server-side attack surface

### Backend Security (Render)
- Automatic HTTPS with SSL termination
- Private networking between services
- Regular security updates
- SOC 2 Type II compliant

### Environment Variables
- Encrypted at rest
- Available only to your services
- Support for secret rotation

## Troubleshooting

### Common Issues

#### Frontend Build Failures
```bash
# Check build logs in Vercel dashboard
# Common fixes:
- Ensure all dependencies are in package.json
- Check environment variables
- Verify build command
```

#### Backend Deployment Issues
```bash
# Check deployment logs in Render dashboard
# Common fixes:
- Verify Node.js version compatibility
- Check environment variables
- Ensure health check endpoint works
```

#### CORS Issues
```bash
# Update CORS configuration in backend
app.use(cors({
  origin: ['https://your-app.vercel.app'],
  credentials: true
}));
```

## Best Practices

### 1. Environment Management
- Use different Vercel projects for staging/production
- Use Render environment groups for secrets
- Never commit sensitive data to git

### 2. Performance Optimization
- Enable Vercel Analytics
- Use Render's built-in monitoring
- Implement proper caching strategies

### 3. Backup Strategy
- Enable automatic database backups in Render
- Regular exports to external storage
- Test restore procedures

### 4. Monitoring Setup
- Configure health check endpoints
- Set up error alerting
- Monitor key metrics

## Next Steps After Deployment

1. **Configure monitoring** - Set up alerts for errors and performance
2. **Performance testing** - Load test your application
3. **Backup verification** - Test database restore procedures
4. **Security audit** - Review security configurations
5. **Documentation** - Update operational procedures

## Alternative Platforms

If Vercel + Render don't meet your needs:

### Frontend Alternatives
- **Netlify** - Similar to Vercel
- **Cloudflare Pages** - Good performance
- **AWS Amplify** - Full-stack solution

### Backend Alternatives
- **Railway** - Docker-friendly alternative
- **Fly.io** - Global deployment
- **Heroku** - Classic PaaS (more expensive)

## Conclusion

The Vercel + Render combination provides:
- **Simplicity** over complexity
- **Managed services** over infrastructure management
- **Automatic scaling** over manual configuration
- **Cost efficiency** over enterprise overhead

This approach is perfect for TestBro.ai's current scale and can easily grow to support significant traffic without requiring DevOps expertise.