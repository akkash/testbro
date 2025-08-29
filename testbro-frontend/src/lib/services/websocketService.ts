import io, { type Socket } from 'socket.io-client';
import { apiClient } from '../api';

export interface TestBroWebSocketEvent {
  type: 'execution_start' | 'execution_progress' | 'execution_complete' | 'step_start' | 'step_complete' | 'error' | 'log' | 
        'browser_control' | 'recording' | 'playback' | 'live_preview' | 'screenshot';
  execution_id?: string;
  session_id?: string;
  data: any;
  timestamp: string;
  user_id?: string;
}

export interface WebSocketConnectionState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  connectionId?: string;
}

export interface ExecutionProgressData {
  progress: number;
  current_step?: string;
  logs?: any[];
  timestamp: string;
}

export interface StepUpdateData {
  step_id: string;
  step_order: number;
  status: 'running' | 'passed' | 'failed';
  duration_seconds?: number;
  screenshot_url?: string;
  error_message?: string;
  timestamp: string;
}

export interface ExecutionCompleteData {
  status: 'completed' | 'failed' | 'cancelled';
  results: any[];
  metrics: any;
  error_message?: string;
  timestamp: string;
}

export interface BrowserControlEvent {
  session_id: string;
  command: string;
  parameters?: any;
  timestamp: string;
}

export interface RecordingEvent {
  session_id: string;
  action: 'start' | 'pause' | 'resume' | 'stop' | 'action_recorded';
  parameters?: any;
  recording_session?: any;
  recorded_action?: any;
  timestamp: string;
}

export interface PlaybackEvent {
  session_id: string;
  action: 'start' | 'pause' | 'resume' | 'stop' | 'step' | 'seek';
  parameters?: any;
  timestamp: string;
}

export interface LivePreviewEvent {
  session_id: string;
  data: {
    dom_state?: any;
    mouse_position?: { x: number; y: number };
    viewport_size?: { width: number; height: number };
    url?: string;
  };
  timestamp: string;
}

export interface ScreenshotEvent {
  session_id: string;
  data: {
    screenshot_url: string;
    metadata?: any;
  };
  timestamp: string;
}

export type WebSocketEventCallback = (event: TestBroWebSocketEvent) => void;
export type ConnectionStateCallback = (state: WebSocketConnectionState) => void;
export type ExecutionEventCallback = (event: any) => void;

class WebSocketService {
  private socket: any | null = null;
  private connectionState: WebSocketConnectionState = {
    connected: false,
    connecting: false,
    error: null,
  };
  private eventListeners = new Map<string, Set<WebSocketEventCallback>>();
  private connectionStateListeners = new Set<ConnectionStateCallback>();
  private executionEventListeners = new Map<string, Set<ExecutionEventCallback>>();
  private subscriptions = new Set<string>();
  private browserSessions = new Set<string>();
  private recordingSessions = new Set<string>();
  private playbackSessions = new Set<string>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    if (this.socket?.connected) {
      console.log('WebSocket already connected');
      return;
    }

    try {
      this.updateConnectionState({ connecting: true, error: null });

      // Get authentication token
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      // Create socket connection
      this.socket = io(this.getWebSocketUrl(), {
        auth: { token },
        transports: ['websocket'],
        timeout: 20000,
        autoConnect: true,
      });

      this.setupEventHandlers();
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('WebSocket connection timeout'));
        }, 10000);

        this.socket!.on('connect', () => {
          clearTimeout(timeout);
          this.reconnectAttempts = 0;
          this.updateConnectionState({ 
            connected: true, 
            connecting: false, 
            error: null,
            connectionId: this.socket!.id 
          });
          console.log('WebSocket connected:', this.socket!.id);
          resolve();
        });

        this.socket!.on('connect_error', (error: any) => {
          clearTimeout(timeout);
          console.error('WebSocket connection error:', error);
          this.updateConnectionState({ 
            connected: false, 
            connecting: false, 
            error: error.message 
          });
          reject(error);
        });
      });
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      this.updateConnectionState({ 
        connected: false, 
        connecting: false, 
        error: error instanceof Error ? error.message : 'Connection failed' 
      });
      throw error;
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.updateConnectionState({ 
      connected: false, 
      connecting: false, 
      error: null 
    });
    this.clearSubscriptions();
  }

  /**
   * Subscribe to execution updates
   */
  subscribeToExecution(executionId: string, callback?: ExecutionEventCallback): void {
    if (!this.socket?.connected) {
      console.warn('WebSocket not connected, cannot subscribe to execution');
      return;
    }

    this.subscriptions.add(executionId);
    this.socket.emit('subscribe_execution', executionId);

    if (callback) {
      if (!this.executionEventListeners.has(executionId)) {
        this.executionEventListeners.set(executionId, new Set());
      }
      this.executionEventListeners.get(executionId)!.add(callback);
    }

    console.log(`Subscribed to execution: ${executionId}`);
  }

  /**
   * Unsubscribe from execution updates
   */
  unsubscribeFromExecution(executionId: string, callback?: ExecutionEventCallback): void {
    if (!this.socket) return;

    this.subscriptions.delete(executionId);
    this.socket.emit('unsubscribe_execution', executionId);

    if (callback && this.executionEventListeners.has(executionId)) {
      this.executionEventListeners.get(executionId)!.delete(callback);
      if (this.executionEventListeners.get(executionId)!.size === 0) {
        this.executionEventListeners.delete(executionId);
      }
    }

    console.log(`Unsubscribed from execution: ${executionId}`);
  }

  /**
   * Subscribe to browser session updates
   */
  subscribeToBrowserSession(sessionId: string): void {
    if (!this.socket?.connected) {
      console.warn('WebSocket not connected, cannot subscribe to browser session');
      return;
    }

    this.browserSessions.add(sessionId);
    this.socket.emit('subscribe_browser_session', sessionId);
    console.log(`Subscribed to browser session: ${sessionId}`);
  }

  /**
   * Unsubscribe from browser session updates
   */
  unsubscribeFromBrowserSession(sessionId: string): void {
    if (!this.socket) return;

    this.browserSessions.delete(sessionId);
    this.socket.emit('unsubscribe_browser_session', sessionId);
    console.log(`Unsubscribed from browser session: ${sessionId}`);
  }

  /**
   * Subscribe to recording session updates
   */
  subscribeToRecording(sessionId: string): void {
    if (!this.socket?.connected) {
      console.warn('WebSocket not connected, cannot subscribe to recording');
      return;
    }

    this.recordingSessions.add(sessionId);
    this.socket.emit('subscribe_recording', sessionId);
    console.log(`Subscribed to recording session: ${sessionId}`);
  }

  /**
   * Unsubscribe from recording session updates
   */
  unsubscribeFromRecording(sessionId: string): void {
    if (!this.socket) return;

    this.recordingSessions.delete(sessionId);
    this.socket.emit('unsubscribe_recording', sessionId);
    console.log(`Unsubscribed from recording session: ${sessionId}`);
  }

  /**
   * Subscribe to playback session updates
   */
  subscribeToPlayback(sessionId: string): void {
    if (!this.socket?.connected) {
      console.warn('WebSocket not connected, cannot subscribe to playback');
      return;
    }

    this.playbackSessions.add(sessionId);
    this.socket.emit('subscribe_playback', sessionId);
    console.log(`Subscribed to playback session: ${sessionId}`);
  }

  /**
   * Unsubscribe from playback session updates
   */
  unsubscribeFromPlayback(sessionId: string): void {
    if (!this.socket) return;

    this.playbackSessions.delete(sessionId);
    this.socket.emit('unsubscribe_playback', sessionId);
    console.log(`Unsubscribed from playback session: ${sessionId}`);
  }

  /**
   * Send browser control command
   */
  sendBrowserCommand(sessionId: string, command: string, parameters?: any): void {
    if (!this.socket?.connected) {
      console.warn('WebSocket not connected, cannot send browser command');
      return;
    }

    this.socket.emit('browser_command', {
      session_id: sessionId,
      command,
      parameters,
    });
  }

  /**
   * Send recording control command
   */
  sendRecordingControl(sessionId: string, action: 'start' | 'pause' | 'resume' | 'stop', parameters?: any): void {
    if (!this.socket?.connected) {
      console.warn('WebSocket not connected, cannot send recording control');
      return;
    }

    this.socket.emit('recording_control', {
      session_id: sessionId,
      action,
      parameters,
    });
  }

  /**
   * Send playback control command
   */
  sendPlaybackControl(sessionId: string, action: 'start' | 'pause' | 'resume' | 'stop' | 'step' | 'seek', parameters?: any): void {
    if (!this.socket?.connected) {
      console.warn('WebSocket not connected, cannot send playback control');
      return;
    }

    this.socket.emit('playback_control', {
      session_id: sessionId,
      action,
      parameters,
    });
  }

  /**
   * Send replay control command
   */
  sendReplayControl(executionId: string, action: 'play' | 'pause' | 'stop' | 'seek', timestamp?: number): void {
    if (!this.socket?.connected) {
      console.warn('WebSocket not connected, cannot send replay control');
      return;
    }

    this.socket.emit('replay_control', {
      execution_id: executionId,
      action,
      timestamp,
    });
  }

  /**
   * Add event listener
   */
  addEventListener(event: string, callback: WebSocketEventCallback): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  /**
   * Remove event listener
   */
  removeEventListener(event: string, callback: WebSocketEventCallback): void {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event)!.delete(callback);
      if (this.eventListeners.get(event)!.size === 0) {
        this.eventListeners.delete(event);
      }
    }
  }

  /**
   * Add connection state listener
   */
  addConnectionStateListener(callback: ConnectionStateCallback): void {
    this.connectionStateListeners.add(callback);
  }

  /**
   * Remove connection state listener
   */
  removeConnectionStateListener(callback: ConnectionStateCallback): void {
    this.connectionStateListeners.delete(callback);
  }

  /**
   * Get current connection state
   */
  getConnectionState(): WebSocketConnectionState {
    return { ...this.connectionState };
  }

  /**
   * Get active subscriptions
   */
  getSubscriptions(): string[] {
    return Array.from(this.subscriptions);
  }

  /**
   * Setup event handlers for socket
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connected', (data: any) => {
      console.log('WebSocket welcome message:', data);
    });

    this.socket.on('disconnect', (reason: any) => {
      console.log('WebSocket disconnected:', reason);
      this.updateConnectionState({ 
        connected: false, 
        connecting: false, 
        error: `Disconnected: ${reason}` 
      });

      // Attempt to reconnect
      if (reason === 'io server disconnect') {
        // Server disconnected, don't try to reconnect
        return;
      }

      this.attemptReconnect();
    });

    // Subscription confirmations
    this.socket.on('subscription_confirmed', (data: any) => {
      console.log('Subscription confirmed:', data);
    });

    this.socket.on('browser_session_subscribed', (data: any) => {
      console.log('Browser session subscribed:', data);
    });

    this.socket.on('recording_subscribed', (data: any) => {
      console.log('Recording subscribed:', data);
    });

    this.socket.on('playback_subscribed', (data: any) => {
      console.log('Playback subscribed:', data);
    });

    // Execution events
    this.socket.on('execution_event', (event: TestBroWebSocketEvent) => {
      this.handleExecutionEvent(event);
    });

    // Browser control events
    this.socket.on('browser_control', (event: BrowserControlEvent) => {
      this.emitEvent('browser_control', event);
    });

    // Recording events
    this.socket.on('recording', (event: RecordingEvent) => {
      this.emitEvent('recording', event);
    });

    // Playback events
    this.socket.on('playback', (event: PlaybackEvent) => {
      this.emitEvent('playback', event);
    });

    // Live preview events
    this.socket.on('live_preview', (event: LivePreviewEvent) => {
      this.emitEvent('live_preview', event);
    });

    // Screenshot events
    this.socket.on('screenshot', (event: ScreenshotEvent) => {
      this.emitEvent('screenshot', event);
    });

    // Replay control events
    this.socket.on('replay_control', (data: any) => {
      this.emitEvent('replay_control', data);
    });

    // Error handling
    this.socket.on('error', (error: any) => {
      console.error('WebSocket error:', error);
      this.emitEvent('error', error);
    });

    // System messages
    this.socket.on('system_message', (data: any) => {
      console.log('System message:', data);
      this.emitEvent('system_message', data);
    });

    // User events
    this.socket.on('user_event', (event: TestBroWebSocketEvent) => {
      this.emitEvent('user_event', event);
    });

    // Broadcast events
    this.socket.on('broadcast_event', (event: TestBroWebSocketEvent) => {
      this.emitEvent('broadcast_event', event);
    });
  }

  /**
   * Handle execution events
   */
  private handleExecutionEvent(event: TestBroWebSocketEvent): void {
    // Emit to general event listeners
    this.emitEvent('execution_event', event);

    // Emit to execution-specific listeners
    if (event.execution_id && this.executionEventListeners.has(event.execution_id)) {
      const listeners = this.executionEventListeners.get(event.execution_id)!;
      listeners.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error('Error in execution event callback:', error);
        }
      });
    }
  }

  /**
   * Emit event to listeners
   */
  private emitEvent(eventType: string, data: any): void {
    if (this.eventListeners.has(eventType)) {
      const listeners = this.eventListeners.get(eventType)!;
      listeners.forEach(callback => {
        try {
          callback({ type: eventType as any, data, timestamp: new Date().toISOString() });
        } catch (error) {
          console.error(`Error in ${eventType} event callback:`, error);
        }
      });
    }
  }

  /**
   * Update connection state and notify listeners
   */
  private updateConnectionState(updates: Partial<WebSocketConnectionState>): void {
    this.connectionState = { ...this.connectionState, ...updates };
    this.connectionStateListeners.forEach(callback => {
      try {
        callback(this.connectionState);
      } catch (error) {
        console.error('Error in connection state callback:', error);
      }
    });
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      this.updateConnectionState({ 
        error: 'Max reconnection attempts reached' 
      });
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      this.connect().catch(error => {
        console.error('Reconnection failed:', error);
      });
    }, delay);
  }

  /**
   * Clear all subscriptions
   */
  private clearSubscriptions(): void {
    this.subscriptions.clear();
    this.browserSessions.clear();
    this.recordingSessions.clear();
    this.playbackSessions.clear();
    this.executionEventListeners.clear();
  }

  /**
   * Get authentication token
   */
  private async getAuthToken(): Promise<string | null> {
    try {
      // Try to get token from localStorage
      const authData = localStorage.getItem('sb-auth-token');
      if (authData) {
        const parsed = JSON.parse(authData);
        return parsed.access_token;
      }

      // Alternative: get from supabase session
      const session = localStorage.getItem('sb-session');
      if (session) {
        const parsed = JSON.parse(session);
        return parsed.access_token;
      }

      return null;
    } catch (error) {
      console.error('Failed to get auth token:', error);
      return null;
    }
  }

  /**
   * Get WebSocket URL
   */
  private getWebSocketUrl(): string {
    // Use environment variable or default to development URL
    const baseUrl = process.env.VITE_WEBSOCKET_URL || 'http://localhost:3001';
    return baseUrl;
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();
export default websocketService;