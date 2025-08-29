// src/lib/api.ts - New API client with proper authentication
import { supabase } from './supabase'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

interface ApiRequestConfig {
  headers?: Record<string, string>
  useApiKey?: boolean
  apiKey?: string
}

class ApiClient {
  private getAuthHeaders = async (config?: ApiRequestConfig): Promise<Record<string, string>> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...config?.headers
    }

    if (config?.useApiKey && config?.apiKey) {
      // Use API key for programmatic access
      headers['Authorization'] = `Bearer ${config.apiKey}`
      headers['X-API-Key'] = config.apiKey
    } else {
      // Use Supabase JWT for user authentication
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }
    }

    return headers
  }

  private handleResponse = async (response: Response) => {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ 
        error: 'NETWORK_ERROR', 
        message: 'Network request failed' 
      }))
      throw new Error(errorData.message || `HTTP ${response.status}`)
    }
    return response.json()
  }

  public get = async (endpoint: string, config?: ApiRequestConfig) => {
    const headers = await this.getAuthHeaders(config)
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers
    })
    return this.handleResponse(response)
  }

  public post = async (endpoint: string, data?: any, config?: ApiRequestConfig) => {
    const headers = await this.getAuthHeaders(config)
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    })
    return this.handleResponse(response)
  }

  public put = async (endpoint: string, data?: any, config?: ApiRequestConfig) => {
    const headers = await this.getAuthHeaders(config)
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data)
    })
    return this.handleResponse(response)
  }

  public delete = async (endpoint: string, config?: ApiRequestConfig) => {
    const headers = await this.getAuthHeaders(config)
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers
    })
    return this.handleResponse(response)
  }

  public patch = async (endpoint: string, data?: any, config?: ApiRequestConfig) => {
    const headers = await this.getAuthHeaders(config)
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data)
    })
    return this.handleResponse(response)
  }
}

export const apiClient = new ApiClient()
export default apiClient# Real-time Browser Control with Playwright - Implementation Documentation

## Overview

This document provides a comprehensive overview of the real-time browser control system implemented for TestBro.ai, featuring 100% implementation of all requested features.

## Implemented Features

### ✅ Real-time Browser Control with Playwright
- **Service**: `BrowserControlService` 
- **Location**: `/src/services/browserControlService.ts`
- **Features**:
  - Create and manage browser sessions (Chromium, Firefox, WebKit)
  - Real-time navigation, clicking, typing, scrolling
  - Live DOM element inspection and interaction
  - Session state management with database persistence
  - WebSocket integration for real-time updates

### ✅ Action Recording through DOM Event Listeners
- **Service**: `ActionRecordingService`
- **Location**: `/src/services/actionRecordingService.ts`
- **Features**:
  - JavaScript injection for DOM event capture
  - Real-time action recording (click, type, hover, scroll, etc.)
  - Element selector generation (CSS + XPath)
  - Screenshot capture for each action
  - Recording session management with pause/resume
  - Database persistence of recorded actions

### ✅ Test Playback with Step-by-Step Execution
- **Service**: `TestPlaybackService`
- **Location**: `/src/services/testPlaybackService.ts`
- **Features**:
  - Step-by-step test execution with speed control
  - Element highlighting during playback
  - Breakpoints and debugging support
  - Error handling and recovery
  - Real-time progress tracking
  - Screenshot capture for each step

### ✅ Screenshot Capture for Each Step
- **Service**: `ScreenshotService`
- **Location**: `/src/services/screenshotService.ts`
- **Features**:
  - Full page and element-specific screenshots
  - Image optimization and thumbnail generation
  - Screenshot comparison and diff generation
  - Multiple format support (PNG, JPEG)
  - Automatic cleanup of old screenshots
  - Real-time screenshot streaming

### ✅ Code Generation for Standalone Playwright Tests
- **Service**: `CodeGenerationService`
- **Location**: `/src/services/codeGenerationService.ts`
- **Features**:
  - Multi-language support (TypeScript, JavaScript, Python)
  - Framework support (Playwright, Playwright Test)
  - Intelligent selector optimization
  - Code comments and documentation generation
  - Test structure and organization
  - Database persistence of generated tests

### ✅ Database Storage for Test Persistence
- **Implementation**: Extended type definitions and database schemas
- **Location**: `/src/types/index.ts`
- **Features**:
  - Browser session persistence
  - Recording session and action storage
  - Playback session tracking
  - Generated test code storage
  - Comprehensive metadata tracking

### ✅ Live Preview through Browser Automation
- **Integration**: WebSocket + Browser Control + Screenshot Services
- **Features**:
  - Real-time DOM state streaming
  - Live screenshot updates
  - Console log monitoring
  - Network activity tracking
  - Element interaction preview

### ✅ WebSocket Support for Real-time Updates
- **Service**: Enhanced `WebSocketService`
- **Location**: `/src/services/websocketService.ts`
- **Features**:
  - Browser session event streaming
  - Recording progress updates
  - Playback status notifications
  - Live preview data transmission
  - Multi-client synchronization

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                     TestBro Real-time Browser Control               │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   Frontend UI    │◄──►│   WebSocket      │◄──►│  Browser Control │
│                  │    │   Service        │    │   Service        │
└──────────────────┘    └──────────────────┘    └──────────────────┘
                                 │                        │
                                 ▼                        ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   API Routes     │◄──►│   Database       │◄──►│   Playwright     │
│   /browser-ctrl  │    │   (Supabase)     │    │   Instances      │
└──────────────────┘    └──────────────────┘    └──────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   Recording      │    │   Session        │    │   Screenshot     │
│   Service        │    │   Management     │    │   Service        │
└──────────────────┘    └──────────────────┘    └──────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   Playback       │    │   Code           │    │   Live Preview   │
│   Service        │    │   Generation     │    │   Updates        │
└──────────────────┘    └──────────────────┘    └──────────────────┘
```

## API Endpoints

### Browser Session Management
- `POST /api/browser-control/sessions` - Create new browser session
- `DELETE /api/browser-control/sessions/:id` - Close browser session
- `GET /api/browser-control/sessions` - Get active sessions

### Browser Actions
- `POST /api/browser-control/sessions/:id/navigate` - Navigate to URL
- `POST /api/browser-control/sessions/:id/click` - Click element
- `POST /api/browser-control/sessions/:id/type` - Type text
- `POST /api/browser-control/sessions/:id/screenshot` - Take screenshot

### Recording Control
- `POST /api/browser-control/recording/start` - Start recording
- `POST /api/browser-control/recording/:id/stop` - Stop recording
- `POST /api/browser-control/recording/:id/pause` - Pause recording
- `POST /api/browser-control/recording/:id/resume` - Resume recording
- `GET /api/browser-control/recording/:id` - Get recording details

### Playback Control
- `POST /api/browser-control/playback/start` - Start playback
- `POST /api/browser-control/playback/:id/pause` - Pause playback
- `POST /api/browser-control/playback/:id/resume` - Resume playback
- `POST /api/browser-control/playback/:id/stop` - Stop playback

### Code Generation
- `POST /api/browser-control/generate-code` - Generate test code

## WebSocket Events

### Browser Control Events
```typescript
{
  type: 'browser_control',
  session_id: string,
  data: {
    action: 'navigate' | 'click' | 'type' | 'scroll' | 'session_created' | 'session_closed',
    parameters: any
  }
}
```

### Recording Events
```typescript
{
  type: 'recording',
  session_id: string,
  data: {
    action: 'start' | 'pause' | 'resume' | 'stop' | 'action_recorded',
    recording_session?: RecordingSession,
    recorded_action?: RecordedAction
  }
}
```

### Playback Events
```typescript
{
  type: 'playback',
  session_id: string,
  data: {
    action: 'start' | 'pause' | 'resume' | 'stop' | 'step_completed' | 'step_failed',
    playback_session?: PlaybackSession,
    step_result?: PlaybackStepResult
  }
}
```

### Live Preview Events
```typescript
{
  type: 'live_preview',
  session_id: string,
  data: {
    current_url: string,
    page_title: string,
    screenshot_url: string,
    dom_elements: DOMElement[],
    console_logs: ConsoleLog[],
    network_activity: NetworkRequest[]
  }
}
```

## Database Schema

### Browser Sessions
```sql
CREATE TABLE browser_sessions (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL,
  target_id UUID NOT NULL,
  browser_type TEXT NOT NULL,
  viewport JSONB NOT NULL,
  status TEXT NOT NULL,
  url TEXT NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  recording_session_id UUID REFERENCES recording_sessions(id)
);
```

### Recording Sessions
```sql
CREATE TABLE recording_sessions (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  browser_session_id UUID NOT NULL,
  project_id UUID NOT NULL,
  target_id UUID NOT NULL,
  user_id UUID NOT NULL,
  status TEXT NOT NULL,
  start_url TEXT NOT NULL,
  total_duration_ms INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  tags TEXT[]
);
```

### Recorded Actions
```sql
CREATE TABLE recorded_actions (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES recording_sessions(id),
  order_number INTEGER NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  action_type TEXT NOT NULL,
  element JSONB NOT NULL,
  value TEXT,
  coordinates JSONB,
  modifiers TEXT[],
  screenshot_before TEXT,
  screenshot_after TEXT,
  page_url TEXT NOT NULL,
  viewport_size JSONB NOT NULL
);
```

### Playback Sessions
```sql
CREATE TABLE playback_sessions (
  id UUID PRIMARY KEY,
  recording_session_id UUID NOT NULL REFERENCES recording_sessions(id),
  browser_session_id UUID NOT NULL,
  status TEXT NOT NULL,
  current_step INTEGER DEFAULT 1,
  total_steps INTEGER NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  playback_speed DECIMAL DEFAULT 1.0,
  step_results JSONB DEFAULT '[]',
  screenshots TEXT[] DEFAULT '{}',
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Generated Tests
```sql
CREATE TABLE generated_tests (
  id UUID PRIMARY KEY,
  recording_session_id UUID NOT NULL REFERENCES recording_sessions(id),
  name TEXT NOT NULL,
  description TEXT,
  test_code TEXT NOT NULL,
  test_framework TEXT NOT NULL,
  language TEXT NOT NULL,
  imports TEXT[] DEFAULT '{}',
  setup_code TEXT,
  teardown_code TEXT,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID NOT NULL
);
```

## JavaScript Injection for Recording

The system injects a comprehensive recording script into browser pages that:

1. **Event Capture**: Listens for all user interactions
2. **Element Identification**: Generates robust CSS and XPath selectors
3. **Action Serialization**: Converts DOM events to structured data
4. **Real-time Transmission**: Sends actions to backend via fetch API
5. **Performance Optimization**: Debounces rapid events and excludes system elements

## Code Generation Features

### Supported Languages & Frameworks
- **TypeScript**: Playwright, Playwright Test
- **JavaScript**: Playwright, Playwright Test  
- **Python**: Playwright (asyncio), Playwright Test (pytest)

### Generated Code Features
- Intelligent selector optimization
- Error handling and retry logic
- Screenshot capture integration
- Assertion generation
- Comment documentation
- Test structure organization

## Performance Considerations

### Browser Resource Management
- Automatic session cleanup and browser closing
- Memory monitoring and garbage collection
- Connection pooling for multiple sessions
- Resource limits and timeouts

### Screenshot Optimization
- Image compression and format optimization
- Automatic thumbnail generation
- Progressive loading for large screenshots
- Background processing for image operations

### WebSocket Scaling
- Room-based event distribution
- Connection pooling and management
- Message queuing for offline clients
- Rate limiting and throttling

## Security Features

### Authentication & Authorization
- JWT-based session authentication
- User-based session isolation
- Project-level access control
- API key validation

### Browser Security
- Sandboxed browser execution
- Network request filtering
- Script injection validation
- File system access restrictions

## Testing & Validation

### Integration Tests
- Complete API endpoint coverage
- WebSocket event validation
- Browser automation testing
- Database persistence verification

### Unit Tests
- Service layer testing
- Type validation
- Error handling verification
- Mock-based isolation testing

## Deployment Considerations

### Dependencies
- Playwright browser binaries installation
- Sharp image processing library
- Redis for WebSocket scaling
- Supabase for data persistence

### Environment Configuration
```env
# Browser Configuration
PLAYWRIGHT_BROWSERS_PATH=/usr/local/playwright
BROWSER_POOL_SIZE=5
BROWSER_TIMEOUT=30000

# Screenshot Configuration
SCREENSHOT_QUALITY=90
SCREENSHOT_FORMAT=png
SCREENSHOT_STORAGE_PATH=/app/screenshots

# WebSocket Configuration
WS_HEARTBEAT_INTERVAL=25000
WS_TIMEOUT=60000
```

### Resource Requirements
- **CPU**: Multi-core for parallel browser instances
- **Memory**: 2GB+ for browser automation
- **Storage**: 10GB+ for screenshots and recordings
- **Network**: High bandwidth for real-time streaming

## Monitoring & Observability

### Metrics Tracked
- Active browser sessions
- Recording/playback success rates
- Screenshot generation performance
- WebSocket connection health
- API response times

### Logging
- Browser session lifecycle events
- Action recording accuracy
- Playback execution status
- Error tracking and debugging
- Performance metrics

## Future Enhancements

### Planned Features
- Mobile device testing support
- Cross-browser session sharing
- Advanced element waiting strategies
- Test data parameterization
- CI/CD pipeline integration

### Performance Improvements
- Browser session pooling
- Distributed screenshot processing
- Advanced caching strategies
- Real-time collaboration features

---

## Summary

This implementation provides a complete, production-ready real-time browser control system with 100% feature coverage of the original requirements:

✅ **Real-time browser control with Playwright** - Full implementation with multi-browser support  
✅ **Action recording through DOM event listeners** - Comprehensive JavaScript injection system  
✅ **Test playback with step-by-step execution** - Advanced playback engine with debugging features  
✅ **Screenshot capture for each step** - Complete image processing and optimization pipeline  
✅ **Code generation for standalone Playwright tests** - Multi-language code generation engine  
✅ **Database storage for test persistence** - Comprehensive data model and persistence layer  
✅ **Live preview through browser automation** - Real-time state streaming and visualization  
✅ **WebSocket support for real-time updates** - Advanced WebSocket architecture with event management  

The system is designed for scalability, security, and maintainability, with comprehensive testing, documentation, and monitoring capabilities.