# 🔧 TestBro.ai MVP Critical Fixes Checklist

## 🚨 **URGENT: Fix These Issues First**

### ✅ **STEP 1: Fix Environment Variables (5 minutes)**

#### **Backend Environment Fix**
Replace `testbro-backend/.env` with:
```bash
# Core Configuration
NODE_ENV=development
PORT=3001

# Supabase Configuration (REPLACE WITH YOUR ACTUAL VALUES)
SUPABASE_URL=https://your-actual-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-actual-service-role-key-here

# Optional: AI Features
OPENROUTER_KEY=your-openrouter-api-key-or-remove-this-line

# Simplified Settings
CORS_ORIGINS=http://localhost:5173
LOG_LEVEL=debug
```

#### **Frontend Environment Fix**
Replace `testbro-frontend/.env` with:
```bash
# Supabase Configuration (REPLACE WITH YOUR ACTUAL VALUES)
VITE_SUPABASE_URL=https://your-actual-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-actual-anon-key-here

# Backend API URL
VITE_API_URL=http://localhost:3001

# Debug Mode
VITE_DEBUG=true
```

---

### ✅ **STEP 2: Create Missing Database Functions (3 minutes)**

Run this in **Supabase SQL Editor**:

```sql
-- Dashboard metrics function (simplified for MVP)
CREATE OR REPLACE FUNCTION get_dashboard_metrics(org_ids UUID[], user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  -- Simple metrics for MVP
  SELECT json_build_object(
    'total_projects', COALESCE((SELECT COUNT(*) FROM projects WHERE organization_id = ANY(org_ids)), 0),
    'total_test_cases', COALESCE((SELECT COUNT(*) FROM test_cases tc 
                                  JOIN projects p ON tc.project_id = p.id 
                                  WHERE p.organization_id = ANY(org_ids)), 0),
    'total_executions', COALESCE((SELECT COUNT(*) FROM test_executions te 
                                  JOIN projects p ON te.project_id = p.id 
                                  WHERE p.organization_id = ANY(org_ids)), 0),
    'recent_executions', COALESCE((SELECT COUNT(*) FROM test_executions te 
                                   JOIN projects p ON te.project_id = p.id 
                                   WHERE p.organization_id = ANY(org_ids) 
                                   AND te.created_at > NOW() - INTERVAL '7 days'), 0)
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### ✅ **STEP 3: Simplify Backend Server (10 minutes)**

Create a simplified `testbro-backend/src/server-mvp.ts`:

```typescript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Import routes
import authRoutes from './routes/auth';
import organizationRoutes from './routes/organizations';
import projectRoutes from './routes/projects';
import testCaseRoutes from './routes/testCases';
import testSuiteRoutes from './routes/testSuites';
import testTargetRoutes from './routes/testTargets';
import executionRoutes from './routes/executions';
import dashboardRoutes from './routes/dashboard';

const app = express();
const PORT = process.env.PORT || 3001;

// Basic middleware
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/test-cases', testCaseRoutes);
app.use('/api/test-suites', testSuiteRoutes);
app.use('/api/test-targets', testTargetRoutes);
app.use('/api/executions', executionRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Error handling
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: err.message || 'Something went wrong'
  });
});

app.use((req, res) => {
  res.status(404).json({
    error: 'NOT_FOUND',
    message: `Route ${req.method} ${req.path} not found`
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔗 API: http://localhost:${PORT}`);
  console.log(`📊 Health: http://localhost:${PORT}/health`);
});
```

Update `package.json` scripts:
```json
{
  "scripts": {
    "dev:mvp": "tsx watch src/server-mvp.ts",
    "dev": "tsx watch src/server.ts"
  }
}
```

---

### ✅ **STEP 4: Simplify Authentication Middleware (5 minutes)**

Create `testbro-backend/src/middleware/auth-simple.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/database';

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authorization header required'
      });
    }

    const token = authHeader.substring(7);
    
    // Verify token with Supabase
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !data.user) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Invalid token'
      });
    }

    req.user = data.user;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Authentication failed'
    });
  }
};
```

---

### ✅ **STEP 5: Test MVP Setup (5 minutes)**

#### **Test Backend**
```bash
cd testbro-backend
npm run dev:mvp
```

#### **Test Frontend**
```bash
cd testbro-frontend  
npm run dev
```

#### **Test Health Check**
```bash
curl http://localhost:3001/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-08-28T...",
  "version": "1.0.0"
}
```

---

## 🎯 **Success Criteria**

Your MVP is working when:
- [ ] ✅ Backend starts without errors on port 3001
- [ ] ✅ Frontend loads at http://localhost:5173
- [ ] ✅ Health check returns 200 OK
- [ ] ✅ User can register/login
- [ ] ✅ Dashboard loads without errors
- [ ] ✅ Can create organization
- [ ] ✅ Can create project

---

## 🚨 **If Issues Persist**

### **Backend Won't Start**
1. Check `.env` file has actual Supabase credentials
2. Verify port 3001 is available: `lsof -ti:3001`
3. Check console for specific error messages

### **Frontend Can't Connect**
1. Verify `VITE_API_URL=http://localhost:3001`
2. Check CORS settings in backend
3. Verify backend is running on port 3001

### **Authentication Fails**
1. Check Supabase auth is enabled
2. Verify anon key and service role key are correct
3. Check browser console for auth errors

---

## 🎉 **Next Steps After MVP Works**

1. **Test core user flows** (register → login → create project → create test case)
2. **Fix any remaining API endpoint issues**
3. **Add error handling** for user experience
4. **Deploy to staging** environment

---

**🎯 Goal**: Get basic functionality working in 30 minutes
**🔧 Focus**: Environment config + simplified architecture
**🚀 Result**: Functional MVP ready for user testing