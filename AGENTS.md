# TestBro AI Agents Documentation

## 🚀 Overview

TestBro is an AI-powered automated testing platform that leverages multiple AI agents to provide comprehensive testing solutions. This document outlines the available AI agents, their capabilities, and how to configure them for optimal performance.

## 🤖 Available AI Agents

### 1. **Test Generation Agent**
**Location:** `testbro-backend/src/services/aiService.ts`

**Capabilities:**
- Generates comprehensive test cases from natural language descriptions
- Creates both UI and API test scenarios
- Optimizes element selectors for better test reliability
- Provides step-by-step test instructions

**Configuration:**
```env
OPENROUTER_KEY=your-openrouter-api-key-here
AI_MODEL=gpt-4  # Options: gpt-4, gpt-3.5-turbo, claude-3
```

**Usage:**
```typescript
const testRequest = {
  prompt: "Test user login functionality",
  target_url: "https://example.com/login",
  project_id: "project-123",
  target_id: "target-456"
};

const result = await aiService.generateTest(testRequest);
```

### 2. **UX Analysis Agent**
**Location:** `testbro-backend/src/services/aiService.ts`

**Capabilities:**
- Analyzes user experience during test execution
- Provides UX scoring and recommendations
- Detects common usability issues
- Generates accessibility insights

**Features:**
- Page load time analysis
- User interaction pattern recognition
- Error handling assessment
- Mobile responsiveness evaluation

### 3. **Code Review Agent**
**Location:** `testbro-backend/src/services/aiService.ts`

**Capabilities:**
- Reviews generated test code for best practices
- Suggests improvements for test maintainability
- Identifies potential flakiness issues
- Provides optimization recommendations

## 🛠️ Setup and Configuration

### Prerequisites

1. **Node.js 18+**
2. **Redis Server** (for queue management)
3. **Supabase Account** (for database)
4. **OpenRouter API Key** (for AI services)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd testbro-full

# Install backend dependencies
cd testbro-backend
npm install

# Install frontend dependencies
cd ../testbro-frontend
npm install
```

### Environment Configuration

Create `.env` files in both backend and frontend directories:

#### Backend Configuration (`testbro-backend/.env`)
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

#### Frontend Configuration (`testbro-frontend/.env`)
```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## 🚀 Running the Agents

### Development Mode

```bash
# Backend (with AI agents)
cd testbro-backend
npm run dev

# Frontend
cd ../testbro-frontend
npm run dev
```

### Production Mode

```bash
# Backend
cd testbro-backend
npm run build
npm start

# Frontend
cd ../testbro-frontend
npm run build
```

## 📋 Agent Capabilities Matrix

| Agent | Test Generation | UX Analysis | Code Review | API Testing | Browser Automation |
|-------|----------------|-------------|-------------|-------------|-------------------|
| **Test Generation Agent** | ✅ | ❌ | ✅ | ✅ | ✅ |
| **UX Analysis Agent** | ❌ | ✅ | ❌ | ❌ | ✅ |
| **Code Review Agent** | ❌ | ❌ | ✅ | ❌ | ❌ |

## 🔧 API Endpoints for AI Agents

### Test Generation
```http
POST /api/ai/generate-test
Content-Type: application/json

{
  "prompt": "Test e-commerce checkout process",
  "target_url": "https://example.com",
  "project_id": "project-123",
  "target_id": "target-456",
  "model": "gpt-4"
}
```

### UX Analysis
```http
POST /api/ai/analyze-execution
Content-Type: application/json

{
  "execution_id": "exec-123",
  "test_results": [...],
  "screenshots": [...]
}
```

### Selector Optimization
```http
POST /api/ai/optimize-selectors
Content-Type: application/json

{
  "html": "<html>...</html>",
  "target_url": "https://example.com",
  "current_selectors": ["button.login", "#submit"]
}
```

## 🎯 Agent Performance Optimization

### Memory Management
- Agents automatically clean up temporary data
- Redis is used for session management
- Automatic garbage collection for old results

### Rate Limiting
- OpenRouter API rate limits are respected
- Queue system prevents agent overload
- Exponential backoff for failed requests

### Caching Strategy
- AI responses cached for similar prompts
- Selector optimizations cached by domain
- UX patterns learned and reused

## 🔍 Monitoring and Debugging

### Logs
```bash
# View agent activity logs
tail -f testbro-backend/logs/agent-activity.log

# View API usage
tail -f testbro-backend/logs/api-usage.log
```

### Health Checks
```bash
# Check AI agent health
curl http://localhost:3001/health

# Check queue status
curl http://localhost:3001/api/dashboard/health
```

### Debugging Mode
```bash
# Enable debug logging
export DEBUG=testbro:*
npm run dev
```

## 🐛 Troubleshooting

### Common Issues

#### 1. **"Missing Supabase configuration"**
```bash
# Check if .env file exists
ls -la testbro-backend/.env

# Verify environment variables are loaded
cd testbro-backend
source .env && echo $SUPABASE_URL
```

#### 2. **Redis Connection Failed**
```bash
# Check Redis status
redis-cli ping

# Start Redis if not running
brew services start redis
```

#### 3. **AI Agent Not Responding**
```bash
# Check API key validity
curl -H "Authorization: Bearer $OPENROUTER_KEY" \
     https://openrouter.ai/api/v1/models

# Check rate limits
curl https://openrouter.ai/api/v1/auth/key
```

#### 4. **Test Generation Fails**
```bash
# Verify target URL accessibility
curl -I https://your-target-url.com

# Check for JavaScript errors
npm run test:debug
```

## 📊 Agent Metrics and Analytics

### Performance Metrics
- Response time tracking
- Success rate monitoring
- Token usage analytics
- Error rate monitoring

### Usage Statistics
```typescript
// Get agent usage stats
GET /api/ai/usage

// Response
{
  "total_requests": 1250,
  "success_rate": 0.95,
  "average_response_time": 2.3,
  "tokens_used": 45000,
  "models_used": ["gpt-4", "claude-3"]
}
```

## 🔐 Security Considerations

### API Key Management
- Rotate API keys regularly
- Use environment variables, never hardcode
- Monitor usage for unauthorized access

### Data Privacy
- User data encrypted in transit and at rest
- AI prompts sanitized before processing
- No sensitive data logged

### Rate Limiting
- API requests limited per user/project
- Automatic throttling for abuse prevention
- Queue system prevents resource exhaustion

## 🚀 Advanced Configuration

### Custom AI Models
```typescript
// Configure custom models in aiService.ts
const customModels = {
  'test-generation': 'gpt-4-turbo-preview',
  'ux-analysis': 'claude-3-haiku',
  'code-review': 'gpt-4'
};
```

### Agent Parallelization
```typescript
// Configure concurrent agent processing
const agentConfig = {
  maxConcurrentAgents: 5,
  queueTimeout: 300000, // 5 minutes
  retryAttempts: 3
};
```

## 📚 Best Practices

### For Test Generation
1. Use clear, specific prompts
2. Provide context about the application
3. Specify the type of test needed
4. Include acceptance criteria

### For UX Analysis
1. Run tests on actual user devices
2. Include realistic user scenarios
3. Capture full user journeys
4. Analyze across different browsers

### For Code Review
1. Review generated tests before execution
2. Update selectors for better reliability
3. Add appropriate wait conditions
4. Handle dynamic content properly

## 🤝 Contributing

### Adding New Agents
1. Create new agent in `src/services/`
2. Add TypeScript interfaces
3. Implement error handling
4. Add comprehensive tests
5. Update this documentation

### Improving Existing Agents
1. Monitor performance metrics
2. Identify bottlenecks
3. Implement optimizations
4. Add new capabilities
5. Update tests and documentation

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- **Documentation:** [docs.testbro.ai](https://docs.testbro.ai)
- **Issues:** [GitHub Issues](https://github.com/testbro/backend/issues)
- **Discussions:** [GitHub Discussions](https://github.com/testbro/backend/discussions)

## 🎯 Roadmap

### Phase 1 (Current)
- ✅ Test Generation Agent
- ✅ UX Analysis Agent
- ✅ Code Review Agent
- ✅ Basic agent orchestration

### Phase 2 (Next)
- 🔄 Multi-agent collaboration
- 🔄 Custom agent training
- 🔄 Advanced UX scoring
- 🔄 Browser extension integration

### Phase 3 (Future)
- 🔄 Agent marketplace
- 🔄 Custom model fine-tuning
- 🔄 Real-time collaboration
- 🔄 Advanced analytics dashboard
