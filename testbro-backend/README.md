# TestBro.ai Backend

AI-powered automated testing platform backend built with Express.js, Supabase, Playwright, and Redis.

## 🚀 Features

- **Authentication & Authorization** - Supabase Auth with JWT validation
- **Multi-tenant Architecture** - Organization and project-based access control
- **AI Test Generation** - OpenAI-powered test case creation
- **Browser Automation** - Playwright-powered test execution
- **Real-time Updates** - WebSocket support for live execution monitoring
- **Queue Management** - Redis + BullMQ for scalable test execution
- **RESTful API** - Comprehensive API for all platform features

## 🛠️ Tech Stack

- **Framework**: Express.js + TypeScript
- **Database**: Supabase (PostgreSQL + Auth)
- **Browser Automation**: Playwright
- **Real-time**: Socket.io
- **Queue**: Redis + BullMQ
- **AI**: OpenRouter (multi-model API)
- **Deployment**: Docker + Render

## 📋 Prerequisites

- Node.js 18+
- Redis server
- Supabase account
- OpenRouter API key

## 🚀 Quick Start

### 1. Clone and Install

```bash
cd testbro-backend
npm install
```

### 2. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env
```

Required environment variables:
```env
# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# OpenRouter Configuration
OPENROUTER_KEY=your-openrouter-api-key-here

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Server Configuration
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### 3. Database Setup

Create these tables in your Supabase project:

```sql
-- Organizations
CREATE TABLE organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Organization Members
CREATE TABLE organization_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role VARCHAR(20) CHECK (role IN ('admin', 'editor', 'viewer')),
  invited_by UUID NOT NULL,
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  joined_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive')),
  UNIQUE(organization_id, user_id)
);

-- Projects
CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  settings JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Test Targets
CREATE TABLE test_targets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  url TEXT NOT NULL,
  platform VARCHAR(20) CHECK (platform IN ('web', 'mobile-web', 'mobile-app')),
  environment VARCHAR(20) CHECK (environment IN ('production', 'staging', 'development')),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  auth_config JSONB,
  app_file JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Test Cases
CREATE TABLE test_cases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  suite_id UUID,
  target_id UUID REFERENCES test_targets(id) ON DELETE CASCADE,
  steps JSONB DEFAULT '[]',
  tags TEXT[] DEFAULT '{}',
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  ai_generated BOOLEAN DEFAULT FALSE,
  ai_metadata JSONB,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Test Suites
CREATE TABLE test_suites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  test_case_ids UUID[] DEFAULT '{}',
  target_id UUID REFERENCES test_targets(id) ON DELETE CASCADE,
  execution_config JSONB DEFAULT '{}',
  schedule JSONB,
  tags TEXT[] DEFAULT '{}',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Test Executions
CREATE TABLE test_executions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  test_case_id UUID,
  suite_id UUID,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  target_id UUID REFERENCES test_targets(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  browser VARCHAR(20) DEFAULT 'chromium' CHECK (browser IN ('chromium', 'firefox', 'webkit')),
  device VARCHAR(50) DEFAULT 'desktop',
  environment VARCHAR(50) DEFAULT 'staging',
  results JSONB,
  metrics JSONB,
  error_message TEXT,
  initiated_by UUID NOT NULL,
  worker_id VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Execution Logs
CREATE TABLE execution_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  execution_id UUID REFERENCES test_executions(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  level VARCHAR(20) CHECK (level IN ('info', 'warn', 'error', 'debug')),
  message TEXT NOT NULL,
  step_id VARCHAR(50),
  metadata JSONB DEFAULT '{}'
);

-- AI Insights
CREATE TABLE ai_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  execution_id UUID REFERENCES test_executions(id) ON DELETE CASCADE,
  type VARCHAR(30) CHECK (type IN ('ux', 'performance', 'accessibility', 'security', 'functional')),
  severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  element VARCHAR(500),
  suggestion TEXT,
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- UX Scores
CREATE TABLE ux_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  execution_id UUID REFERENCES test_executions(id) ON DELETE CASCADE,
  overall_score DECIMAL(5,2) CHECK (overall_score >= 0 AND overall_score <= 100),
  dimensions JSONB DEFAULT '{}',
  critical_issues TEXT[] DEFAULT '{}',
  recommendations TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Usage Logs
CREATE TABLE ai_usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  request_type VARCHAR(50) NOT NULL,
  request_data JSONB DEFAULT '{}',
  model VARCHAR(50) NOT NULL,
  prompt TEXT,
  confidence_score DECIMAL(3,2),
  tokens_used INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4. Supabase Setup

#### Enable Authentication Providers

1. Go to **Authentication** → **Providers**
2. Enable **Google** and **GitHub** providers
3. Configure OAuth credentials

#### Enable Storage

1. Go to **Storage**
2. Create bucket: `screenshots`
3. Set public access policy

#### Configure Row Level Security (RLS)

Apply RLS policies for each table:

```sql
-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
-- ... enable for all tables

-- Example policy for projects
CREATE POLICY "Users can view projects in their organizations" ON projects
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );
```

### 5. Start Development Server

```bash
# Development mode with hot reload
npm run dev

# Production build
npm run build
npm start

# Run tests
npm test
```

## 📡 API Documentation

### Authentication Endpoints

```
POST   /api/auth/login          - User login
POST   /api/auth/signup         - User registration
POST   /api/auth/logout         - User logout
GET    /api/auth/me             - Get current user
POST   /api/auth/refresh        - Refresh token
POST   /api/auth/reset-password - Request password reset
```

### Project Management

```
GET    /api/projects           - List projects
POST   /api/projects           - Create project
GET    /api/projects/:id       - Get project details
PUT    /api/projects/:id       - Update project
DELETE /api/projects/:id       - Delete project
GET    /api/projects/:id/stats - Get project statistics
```

### Test Management

```
GET    /api/test-cases         - List test cases
POST   /api/test-cases         - Create test case
GET    /api/test-cases/:id     - Get test case
PUT    /api/test-cases/:id     - Update test case
DELETE /api/test-cases/:id     - Delete test case

GET    /api/test-suites        - List test suites
POST   /api/test-suites        - Create test suite
```

### Test Execution

```
POST   /api/executions              - Execute test case/suite
GET    /api/executions/:id          - Get execution details
DELETE /api/executions/:id          - Cancel execution
GET    /api/executions/:id/status   - Get execution status
GET    /api/executions/:id/logs     - Get execution logs
GET    /api/executions/:id/replay   - Get replay data
```

### AI Features

```
POST   /api/ai/generate-test        - Generate test with AI
POST   /api/ai/analyze-execution    - Analyze execution results
POST   /api/ai/optimize-selectors   - Optimize element selectors
GET    /api/ai/models               - Get available AI models
GET    /api/ai/usage                - Get AI usage statistics
```

### Dashboard

```
GET    /api/dashboard/metrics       - Get dashboard metrics
GET    /api/dashboard/recent-activity - Get recent activity
GET    /api/dashboard/trends        - Get execution trends
GET    /api/dashboard/health        - Get system health
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment | `development` |
| `SUPABASE_URL` | Supabase project URL | Required |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Required |
| `OPENROUTER_KEY` | OpenRouter API key | Required |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:5173` |

### Redis Configuration

The application uses Redis for:
- Queue management (BullMQ)
- Session storage
- Cache for frequently accessed data

### WebSocket Events

Real-time events available:
- `execution_start` - Execution started
- `execution_progress` - Execution progress update
- `execution_complete` - Execution completed
- `step_start` - Test step started
- `step_complete` - Test step completed
- `log` - Execution log message
- `error` - Execution error

## 🐳 Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3001

CMD ["npm", "start"]
```

```bash
# Build and run
docker build -t testbro-backend .
docker run -p 3001:3001 --env-file .env testbro-backend
```

## 📊 Monitoring & Logging

### Winston Logger

Structured logging with:
- Request/response logging
- Error tracking
- Performance monitoring
- Security audit logs

### Health Checks

```
GET /health - Overall health status
GET /api/dashboard/health - Detailed health metrics
```

## 🔒 Security

### Authentication
- JWT token validation
- OAuth providers (Google, GitHub)
- Role-based access control (RBAC)

### Authorization
- Row Level Security (RLS) in Supabase
- Organization-based data isolation
- Project-level permissions

### Input Validation
- Joi schema validation
- SQL injection prevention
- XSS protection with Helmet

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific tests
npm test -- auth.test.ts

# Run in watch mode
npm run test:watch
```

## 📈 Scaling

### Horizontal Scaling
- Stateless application design
- Redis for session management
- Queue-based job processing

### Database Scaling
- Supabase handles connection pooling
- Row Level Security for multi-tenancy
- Automatic scaling with Supabase

### Performance Optimization
- Redis caching for frequently accessed data
- Database query optimization
- CDN for static assets

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- **Documentation**: [docs.testbro.ai](https://docs.testbro.ai)
- **Issues**: [GitHub Issues](https://github.com/testbro/backend/issues)
- **Discussions**: [GitHub Discussions](https://github.com/testbro/backend/discussions)

## 🎯 Roadmap

### Phase 1 (Current)
- ✅ Core authentication & authorization
- ✅ Project & test case management
- ✅ Basic test execution
- ✅ AI test generation

### Phase 2 (Next)
- 🔄 Advanced AI features (UX scoring, accessibility)
- 🔄 Browser extension integration
- 🔄 Advanced scheduling
- 🔄 Team collaboration features

### Phase 3 (Future)
- 🔄 Mobile app testing
- 🔄 API testing capabilities
- 🔄 Performance monitoring
- 🔄 Enterprise features
