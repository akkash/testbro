import { apiClient } from '../api'

export interface RecordedAction {
  id: string
  session_id: string
  order: number
  timestamp: string
  action_type: 'click' | 'type' | 'scroll' | 'hover' | 'keypress' | 'select' | 'drag' | 'drop'
  element: {
    selector: string
    xpath: string
    text_content: string
    tag_name: string
    attributes: Record<string, string>
    bounding_box: {
      x: number
      y: number
      width: number
      height: number
    }
  }
  value?: string | null
  coordinates?: {
    x: number
    y: number
  } | null
  modifiers?: string[]
  page_url: string
  viewport_size: {
    width: number
    height: number
  }
  screenshot_before?: string
  screenshot_after?: string
}

export interface RecordingSession {
  id: string
  name: string
  description: string
  browser_session_id: string
  project_id: string
  target_id: string
  user_id: string
  status: 'recording' | 'paused' | 'completed' | 'failed'
  actions: RecordedAction[]
  start_url: string
  total_duration_ms: number
  created_at: string
  completed_at?: string
  tags: string[]
}

export interface BrowserSession {
  id: string
  project_id: string
  target_id: string
  browser_type: 'chromium' | 'firefox' | 'webkit'
  viewport: {
    width: number
    height: number
  }
  status: 'active' | 'closed'
  url: string
  user_id: string
  created_at: string
  last_activity: string
}

export interface RecordingOptions {
  captureScreenshots?: boolean
  includeHoverEvents?: boolean
  includeScrollEvents?: boolean
  includeKeyboardEvents?: boolean
  debounceMs?: number
  excludeSelectors?: string[]
}

export interface CreateBrowserSessionRequest {
  project_id: string
  target_id: string
  browser_type?: 'chromium' | 'firefox' | 'webkit'
  options?: {
    headless?: boolean
    viewport?: { width: number; height: number }
    recordVideo?: boolean
    slowMo?: number
    deviceScaleFactor?: number
  }
}

export interface StartRecordingRequest {
  browser_session_id: string
  name: string
  project_id: string
  target_id: string
  options?: RecordingOptions
}

export class RecordingService {
  /**
   * Create a new browser session for recording
   */
  static async createBrowserSession(sessionData: CreateBrowserSessionRequest) {
    try {
      const result = await apiClient.post('/api/browser-control/sessions', sessionData)
      return { data: result.data, error: null }
    } catch (error: any) {
      console.error('Error creating browser session:', error)
      return { data: null, error: error.message }
    }
  }

  /**
   * Get active browser sessions
   */
  static async getBrowserSessions() {
    try {
      const result = await apiClient.get('/api/browser-control/sessions')
      return { data: result.data, error: null }
    } catch (error: any) {
      console.error('Error fetching browser sessions:', error)
      return { data: [], error: error.message }
    }
  }

  /**
   * Close a browser session
   */
  static async closeBrowserSession(sessionId: string) {
    try {
      await apiClient.delete(`/api/browser-control/sessions/${sessionId}`)
      return { error: null }
    } catch (error: any) {
      console.error('Error closing browser session:', error)
      return { error: error.message }
    }
  }

  /**
   * Start recording actions
   */
  static async startRecording(recordingData: StartRecordingRequest) {
    try {
      const result = await apiClient.post('/api/browser-control/recording/start', recordingData)
      return { data: result.data, error: null }
    } catch (error: any) {
      console.error('Error starting recording:', error)
      return { data: null, error: error.message }
    }
  }

  /**
   * Stop recording
   */
  static async stopRecording(sessionId: string) {
    try {
      const result = await apiClient.post(`/api/browser-control/recording/${sessionId}/stop`)
      return { data: result.data, error: null }
    } catch (error: any) {
      console.error('Error stopping recording:', error)
      return { data: null, error: error.message }
    }
  }

  /**
   * Pause recording
   */
  static async pauseRecording(sessionId: string) {
    try {
      await apiClient.post(`/api/browser-control/recording/${sessionId}/pause`)
      return { error: null }
    } catch (error: any) {
      console.error('Error pausing recording:', error)
      return { error: error.message }
    }
  }

  /**
   * Resume recording
   */
  static async resumeRecording(sessionId: string) {
    try {
      await apiClient.post(`/api/browser-control/recording/${sessionId}/resume`)
      return { error: null }
    } catch (error: any) {
      console.error('Error resuming recording:', error)
      return { error: error.message }
    }
  }

  /**
   * Get recording session details
   */
  static async getRecording(sessionId: string) {
    try {
      const result = await apiClient.get(`/api/browser-control/recording/${sessionId}`)
      return { data: result.data, error: null }
    } catch (error: any) {
      console.error('Error fetching recording:', error)
      return { data: null, error: error.message }
    }
  }

  /**
   * Navigate browser to URL
   */
  static async navigate(sessionId: string, url: string) {
    try {
      const result = await apiClient.post(`/api/browser-control/sessions/${sessionId}/navigate`, { url })
      return { data: result.data, error: null }
    } catch (error: any) {
      console.error('Error navigating:', error)
      return { data: null, error: error.message }
    }
  }

  /**
   * Take a screenshot
   */
  static async takeScreenshot(sessionId: string, options?: { fullPage?: boolean; quality?: number }) {
    try {
      const result = await apiClient.post(`/api/browser-control/sessions/${sessionId}/screenshot`, options || {})
      return { data: result.data, error: null }
    } catch (error: any) {
      console.error('Error taking screenshot:', error)
      return { data: null, error: error.message }
    }
  }

  /**
   * Click on an element (manual control during recording setup)
   */
  static async click(sessionId: string, selector: string, options?: { force?: boolean; timeout?: number }) {
    try {
      const result = await apiClient.post(`/api/browser-control/sessions/${sessionId}/click`, {
        selector,
        options: options || {}
      })
      return { data: result.data, error: null }
    } catch (error: any) {
      console.error('Error clicking element:', error)
      return { data: null, error: error.message }
    }
  }

  /**
   * Type text into an element (manual control during recording setup)
   */
  static async type(sessionId: string, selector: string, text: string, options?: { delay?: number; clear?: boolean }) {
    try {
      const result = await apiClient.post(`/api/browser-control/sessions/${sessionId}/type`, {
        selector,
        text,
        options: options || {}
      })
      return { data: result.data, error: null }
    } catch (error: any) {
      console.error('Error typing text:', error)
      return { data: null, error: error.message }
    }
  }
}