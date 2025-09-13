# Full Website Test Feature 🚀

## Overview

The Full Website Test feature provides comprehensive website analysis, monitoring, and testing capabilities. It includes automated sitemap discovery, screenshot capture, health checks, change detection, and real-time monitoring.

## 🛠️ Setup Instructions

### 1. Install Dependencies

```bash
cd testbro-frontend
./install-full-website-test-deps.sh
```

### 2. Install Required UI Components

If you encounter missing component errors, install the required Shadcn UI components:

```bash
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add card
npx shadcn-ui@latest add button
npx shadcn-ui@latest add input
npx shadcn-ui@latest add label
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add progress
npx shadcn-ui@latest add select
npx shadcn-ui@latest add alert
npx shadcn-ui@latest add table
npx shadcn-ui@latest add tooltip
npx shadcn-ui@latest add scroll-area
npx shadcn-ui@latest add switch
npx shadcn-ui@latest add separator
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add skeleton
```

### 3. Database Setup

Run the database migration in your Supabase SQL editor:

```sql
-- Copy and run the content from:
-- testbro-full/supabase-migrations/full-website-test-tables.sql
```

### 4. Start the Application

```bash
# Backend
cd testbro-backend
npm run dev

# Frontend
cd testbro-frontend
npm run dev
```

## 🎯 Usage

1. **Access the Feature**: Navigate to `/full-website-test` in your browser
2. **Create a Test**: Click "New Test" to configure a comprehensive website test
3. **Monitor Progress**: Watch real-time progress updates with WebSocket integration
4. **Analyze Results**: View detailed results with charts, screenshots, and analysis
5. **Manage Alerts**: Handle system notifications and alerts

## 🏗️ Architecture

### Backend Components

- **SitemapDiscoveryService**: Discovers URLs from sitemaps, robots.txt, and internal links
- **PageScreenshotService**: Captures and compares screenshots across viewports
- **PageMonitoringService**: Monitors health and detects changes
- **FullWebsiteTestService**: Orchestrates all testing components
- **API Routes**: RESTful endpoints with authentication and validation

### Frontend Components

- **FullWebsiteTestDashboard**: Main interface with filtering and statistics
- **TestConfigurationModal**: Advanced test setup with templates
- **TestResultsModal**: Comprehensive results analysis with charts
- **TestProgressCard**: Real-time progress tracking

### Key Features

- **Real-time Updates**: WebSocket integration for live progress
- **Multi-viewport Screenshots**: Desktop, mobile, and tablet capture
- **Change Detection**: Visual and content change analysis
- **Health Monitoring**: Status codes, response times, and error tracking
- **Export Capabilities**: JSON, CSV, and PDF export options
- **Template System**: Pre-configured test templates

## 🔧 Configuration Options

### Sitemap Discovery
- Max crawl depth and URL limits
- Include/exclude patterns
- Robots.txt compliance
- External link following

### Screenshots
- Multi-viewport capture (desktop, mobile, tablet)
- Baseline comparison
- Format and quality options
- Full page vs viewport capture

### Pre-flow Steps
- Login automation
- Cookie acceptance
- Custom navigation steps
- Authentication flows

### Monitoring
- Continuous health checks
- Performance thresholds
- Alert configuration
- Change detection settings

## 📊 Data Visualization

The results modal includes interactive charts powered by Recharts:

- **Response Time Charts**: Bar charts showing page load times
- **Status Code Distribution**: Pie charts for HTTP status analysis
- **Error Trends**: Line charts tracking errors over time
- **Change Detection**: Visual trends for content changes

## 🚨 Troubleshooting

### Common Issues

1. **Import Errors**: Make sure all UI components are installed
2. **API Connection**: Verify backend is running on correct port
3. **WebSocket Issues**: Check firewall settings and WebSocket support
4. **Database Errors**: Ensure migration has been run in Supabase

### Debug Mode

Enable debug logging by setting:
```bash
DEBUG=testbro:full-website-test npm run dev
```

## 📝 API Endpoints

- `POST /api/full-website-test/start` - Start a new test
- `GET /api/full-website-test/sessions` - List test sessions
- `GET /api/full-website-test/sessions/:id` - Get session details
- `GET /api/full-website-test/sessions/:id/results` - Get test results
- `POST /api/full-website-test/sessions/:id/cancel` - Cancel a test
- `GET /api/full-website-test/templates` - Get configuration templates

## 🔒 Security Features

- JWT authentication
- Row-level security (RLS)
- Project-based access control
- Rate limiting
- Input validation
- CSRF protection

## 🎨 UI/UX Features

- Responsive design for all screen sizes
- Dark/light mode support
- Accessibility compliance
- Loading states and error handling
- Real-time progress indicators
- Interactive data visualization

## 📈 Performance

- Efficient data loading with pagination
- WebSocket connection management
- Image optimization with thumbnails
- Background processing with queues
- Caching for improved performance

## 🤝 Contributing

When adding features:

1. Update TypeScript interfaces in `types/full-website-test.ts`
2. Add API methods to `lib/fullWebsiteTestApi.ts`
3. Create reusable UI components
4. Include comprehensive error handling
5. Add appropriate tests and documentation

## 📄 License

This feature is part of the TestBro platform and follows the same licensing terms.

---

## 🎉 Ready to Test!

Your Full Website Test feature is now ready for comprehensive website analysis and monitoring. Visit `/full-website-test` to get started!
