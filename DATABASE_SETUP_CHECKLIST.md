# TestBro.ai Database Setup Checklist ✅

## Quick Setup Instructions

### 1. Supabase SQL Setup (5 minutes)
- [ ] Go to your **Supabase Dashboard → SQL Editor**
- [ ] Copy and paste the entire contents of `supabase_schema.sql`
- [ ] Click **Run** to execute all commands
- [ ] Verify 17+ tables are created successfully

### 2. Authentication Setup (2 minutes)
- [ ] Go to **Authentication → Providers**
- [ ] Enable **Google** provider (add OAuth credentials)
- [ ] Enable **GitHub** provider (add OAuth app credentials)
- [ ] Set **Site URL**: `http://localhost:5173`
- [ ] Add **Redirect URL**: `http://localhost:5173/auth/callback`

### 3. Storage Setup (1 minute)
- [ ] Go to **Storage**
- [ ] Create bucket named `screenshots`
- [ ] Set bucket to **public**
- [ ] Storage policies are automatically created

### 4. Environment Variables (1 minute)
Update your backend `.env` file:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Update your frontend `.env` file:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 5. Verification (1 minute)
- [ ] Run backend: `npm run dev` (should connect to database)
- [ ] Run frontend: `npm run dev` (should show login page)
- [ ] Test login with Google/GitHub
- [ ] Create a test organization

## 🗄️ Database Schema Overview

**18+ Tables Created:**
1. `organizations` - Organization management
2. `organization_members` - Team membership & roles
3. `projects` - Test projects
4. `test_targets` - URLs/apps to test
5. `test_suites` - Collections of test cases (created first)
6. `test_cases` - Individual test cases (proper FK to suites)
7. `test_executions` - Test run results
8. `execution_logs` - Detailed execution logs
9. `execution_screenshots` - Screenshots and visual evidence
10. `execution_videos` - Video recordings of test runs
11. `network_logs` - Network request/response monitoring
12. `performance_metrics` - Core Web Vitals and performance data
13. `console_logs` - Browser console output capture
14. `ai_insights` - AI-generated insights
15. `ux_scores` - UX scoring results
16. `notifications` - User notifications
17. `ai_usage_logs` - AI service usage tracking
18. `sessions` - Session management
19. `audit_logs` - Security audit trail

## 🔒 Security Features Enabled

- ✅ **Row Level Security (RLS)** on all tables
- ✅ **Multi-tenant isolation** by organization
- ✅ **Role-based access control** (admin/editor/viewer)
- ✅ **JWT authentication** integration with proper auth.users constraints
- ✅ **Audit logging** for all actions
- ✅ **Media file access control** for screenshots and videos

## 📊 Performance Optimizations

- ✅ **Optimized indexes** for common queries
- ✅ **Automatic timestamp updates** via triggers
- ✅ **Efficient joins** for organization-based queries
- ✅ **Text search indexes** for name/description fields
- ✅ **GIN indexes** for array columns (tags)
- ✅ **Media file indexing** for fast retrieval
- ✅ **Performance monitoring** table structure

## 🚨 Troubleshooting

**If setup fails:**
1. Check you have Supabase admin access
2. Ensure project billing is enabled (for extensions)
3. Try running SQL commands in smaller batches
4. Check Supabase logs for specific error messages

**If authentication fails:**
1. Verify OAuth provider credentials
2. Check redirect URLs match exactly
3. Ensure environment variables are correct
4. Test with incognito/private browsing

## ⏱️ Total Setup Time: ~10 minutes

Your TestBro.ai database will be fully functional with multi-tenant security, browser automation support, and AI integration capabilities!