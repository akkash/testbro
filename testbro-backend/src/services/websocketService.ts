import { Server as SocketIOServer, Socket } from 'socket.io';
import { createServer, Server as HTTPServer } from 'http';
import { supabaseAdmin } from '../config/database';
import { 
  User, 
  WebSocketEvent, 
  BrowserControlEvent, 
  RecordingEvent, 
  PlaybackEvent, 
  LivePreviewEvent, 
  ScreenshotEvent 
} from '../types';

export interface TestBroWebSocketEvent {
  type: 'execution_start' | 'execution_progress' | 'execution_complete' | 'step_start' | 'step_complete' | 'error' | 'log' | 
        'browser_control' | 'recording' | 'playback' | 'live_preview' | 'screenshot';
  execution_id?: string;
  session_id?: string;
  data: any;
  timestamp: string;
  user_id?: string;
}

export interface ConnectedClient {
  socket: Socket;
  user: User;
  subscriptions: Set<string>; // execution/session IDs they're subscribed to
  browserSessions: Set<string>; // browser session IDs they control
  recordingSessions: Set<string>; // recording session IDs they're monitoring
  playbackSessions: Set<string>; // playback session IDs they're monitoring
}

export class WebSocketService {
  private io: SocketIOServer;
  private connectedClients = new Map<string, ConnectedClient>();

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  /**
   * Setup authentication middleware
   */
  private setupMiddleware(): void {
    this.io.use(async (socket: Socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.query.token as string;

        if (!token) {
          return next(new Error('Authentication token required'));
        }

        // Verify JWT token with Supabase
        const { data: userData, error } = await supabaseAdmin.auth.getUser(token);

        if (error || !userData.user) {
          return next(new Error('Invalid authentication token'));
        }

        // Attach user to socket
        (socket as any).user = {
          id: userData.user.id,
          email: userData.user.email || '',
          user_metadata: userData.user.user_metadata || {},
          app_metadata: userData.user.app_metadata || {},
          created_at: userData.user.created_at,
          updated_at: userData.user.updated_at,
        };

        next();
      } catch (error) {
        console.error('Socket authentication error:', error);
        next(new Error('Authentication failed'));
      }
    });
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      const user = (socket as any).user as User;

      console.log(`User ${user.email} connected with socket ${socket.id}`);

      // Register connected client
      this.connectedClients.set(socket.id, {
        socket,
        user,
        subscriptions: new Set(),
        browserSessions: new Set(),
        recordingSessions: new Set(),
        playbackSessions: new Set(),
      });

      // Handle subscription to execution
      socket.on('subscribe_execution', (executionId: string) => {
        this.subscribeToExecution(socket.id, executionId);
      });

      // Handle unsubscription from execution
      socket.on('unsubscribe_execution', (executionId: string) => {
        this.unsubscribeFromExecution(socket.id, executionId);
      });

      // Handle browser session subscription
      socket.on('subscribe_browser_session', (sessionId: string) => {
        this.subscribeToBrowserSession(socket.id, sessionId);
      });

      // Handle browser session unsubscription
      socket.on('unsubscribe_browser_session', (sessionId: string) => {
        this.unsubscribeFromBrowserSession(socket.id, sessionId);
      });

      // Handle recording session subscription
      socket.on('subscribe_recording', (sessionId: string) => {
        this.subscribeToRecording(socket.id, sessionId);
      });

      // Handle recording session unsubscription
      socket.on('unsubscribe_recording', (sessionId: string) => {
        this.unsubscribeFromRecording(socket.id, sessionId);
      });

      // Handle playback session subscription
      socket.on('subscribe_playback', (sessionId: string) => {
        this.subscribeToPlayback(socket.id, sessionId);
      });

      // Handle playback session unsubscription
      socket.on('unsubscribe_playback', (sessionId: string) => {
        this.unsubscribeFromPlayback(socket.id, sessionId);
      });

      // Handle browser control commands
      socket.on('browser_command', (data: {
        session_id: string;
        command: string;
        parameters?: any;
      }) => {
        this.handleBrowserCommand(socket.id, data);
      });

      // Handle recording control
      socket.on('recording_control', (data: {
        session_id: string;
        action: 'start' | 'pause' | 'resume' | 'stop';
        parameters?: any;
      }) => {
        this.handleRecordingControl(socket.id, data);
      });

      // Handle playback control
      socket.on('playback_control', (data: {
        session_id: string;
        action: 'start' | 'pause' | 'resume' | 'stop' | 'step' | 'seek';
        parameters?: any;
      }) => {
        this.handlePlaybackControl(socket.id, data);
      });

      // Handle real-time replay control (existing)
      socket.on('replay_control', (data: {
        execution_id: string;
        action: 'play' | 'pause' | 'stop' | 'seek';
        timestamp?: number;
      }) => {
        this.handleReplayControl(socket.id, data);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`User ${user.email} disconnected`);
        this.handleDisconnect(socket.id);
      });

      // Send welcome message
      socket.emit('connected', {
        message: 'Connected to TestBro.ai real-time service',
        user_id: user.id,
        timestamp: new Date().toISOString(),
      });
    });
  }

  /**
   * Subscribe client to execution updates
   */
  private subscribeToExecution(socketId: string, executionId: string): void {
    const client = this.connectedClients.get(socketId);
    if (!client) return;

    client.subscriptions.add(executionId);

    // Join execution-specific room
    client.socket.join(`execution_${executionId}`);

    console.log(`Socket ${socketId} subscribed to execution ${executionId}`);

    // Send subscription confirmation
    client.socket.emit('subscription_confirmed', {
      execution_id: executionId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Unsubscribe client from execution updates
   */
  private unsubscribeFromExecution(socketId: string, executionId: string): void {
    const client = this.connectedClients.get(socketId);
    if (!client) return;

    client.subscriptions.delete(executionId);

    // Leave execution-specific room
    client.socket.leave(`execution_${executionId}`);

    console.log(`Socket ${socketId} unsubscribed from execution ${executionId}`);
  }

  /**
   * Handle replay control commands
   */
  private handleReplayControl(
    socketId: string,
    data: {
      execution_id: string;
      action: 'play' | 'pause' | 'stop' | 'seek';
      timestamp?: number;
    }
  ): void {
    const client = this.connectedClients.get(socketId);
    if (!client) return;

    // Verify user has access to this execution
    if (!client.subscriptions.has(data.execution_id)) {
      client.socket.emit('error', {
        type: 'replay_error',
        message: 'Not subscribed to this execution',
        execution_id: data.execution_id,
      });
      return;
    }

    // Emit replay control to all subscribers of this execution
    this.io.to(`execution_${data.execution_id}`).emit('replay_control', {
      ...data,
      user_id: client.user.id,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit execution event to subscribers
   */
  emitExecutionEvent(event: TestBroWebSocketEvent): void {
    const room = `execution_${event.execution_id}`;
    
    console.log(`Emitting event ${event.type} to room ${room}`);
    
    this.io.to(room).emit('execution_event', {
      ...event,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit event to specific session subscribers
   */
  emitToSession(sessionId: string, eventType: string, data: any): void {
    const room = `session_${sessionId}`;
    
    console.log(`Emitting ${eventType} event to session room ${room}`);
    
    this.io.to(room).emit(eventType, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit browser control event
   */
  emitBrowserControlEvent(event: BrowserControlEvent): void {
    this.emitToSession(event.session_id, 'browser_control', event);
  }

  /**
   * Emit recording event
   */
  emitRecordingEvent(event: RecordingEvent): void {
    this.emitToSession(event.session_id, 'recording', event);
  }

  /**
   * Emit playback event
   */
  emitPlaybackEvent(event: PlaybackEvent): void {
    this.emitToSession(event.session_id, 'playback', event);
  }

  /**
   * Emit live preview event
   */
  emitLivePreviewEvent(event: LivePreviewEvent): void {
    this.emitToSession(event.session_id, 'live_preview', event);
  }

  /**
   * Emit screenshot event
   */
  emitScreenshotEvent(event: ScreenshotEvent): void {
    this.emitToSession(event.session_id, 'screenshot', event);
  }

  /**
   * Subscribe client to browser session updates
   */
  private subscribeToBrowserSession(socketId: string, sessionId: string): void {
    const client = this.connectedClients.get(socketId);
    if (!client) return;

    client.browserSessions.add(sessionId);
    client.socket.join(`session_${sessionId}`);

    console.log(`Socket ${socketId} subscribed to browser session ${sessionId}`);

    client.socket.emit('browser_session_subscribed', {
      session_id: sessionId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Unsubscribe client from browser session updates
   */
  private unsubscribeFromBrowserSession(socketId: string, sessionId: string): void {
    const client = this.connectedClients.get(socketId);
    if (!client) return;

    client.browserSessions.delete(sessionId);
    client.socket.leave(`session_${sessionId}`);

    console.log(`Socket ${socketId} unsubscribed from browser session ${sessionId}`);
  }

  /**
   * Subscribe client to recording session updates
   */
  private subscribeToRecording(socketId: string, sessionId: string): void {
    const client = this.connectedClients.get(socketId);
    if (!client) return;

    client.recordingSessions.add(sessionId);
    client.socket.join(`session_${sessionId}`);

    console.log(`Socket ${socketId} subscribed to recording session ${sessionId}`);

    client.socket.emit('recording_subscribed', {
      session_id: sessionId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Unsubscribe client from recording session updates
   */
  private unsubscribeFromRecording(socketId: string, sessionId: string): void {
    const client = this.connectedClients.get(socketId);
    if (!client) return;

    client.recordingSessions.delete(sessionId);
    client.socket.leave(`session_${sessionId}`);

    console.log(`Socket ${socketId} unsubscribed from recording session ${sessionId}`);
  }

  /**
   * Subscribe client to playback session updates
   */
  private subscribeToPlayback(socketId: string, sessionId: string): void {
    const client = this.connectedClients.get(socketId);
    if (!client) return;

    client.playbackSessions.add(sessionId);
    client.socket.join(`session_${sessionId}`);

    console.log(`Socket ${socketId} subscribed to playback session ${sessionId}`);

    client.socket.emit('playback_subscribed', {
      session_id: sessionId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Unsubscribe client from playback session updates
   */
  private unsubscribeFromPlayback(socketId: string, sessionId: string): void {
    const client = this.connectedClients.get(socketId);
    if (!client) return;

    client.playbackSessions.delete(sessionId);
    client.socket.leave(`session_${sessionId}`);

    console.log(`Socket ${socketId} unsubscribed from playback session ${sessionId}`);
  }

  /**
   * Handle browser control commands
   */
  private handleBrowserCommand(
    socketId: string,
    data: {
      session_id: string;
      command: string;
      parameters?: any;
    }
  ): void {
    const client = this.connectedClients.get(socketId);
    if (!client) return;

    // Verify user has access to this browser session
    if (!client.browserSessions.has(data.session_id)) {
      client.socket.emit('error', {
        type: 'browser_command_error',
        message: 'Not subscribed to this browser session',
        session_id: data.session_id,
      });
      return;
    }

    // Emit browser command to session room
    this.io.to(`session_${data.session_id}`).emit('browser_command_received', {
      ...data,
      user_id: client.user.id,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle recording control commands
   */
  private handleRecordingControl(
    socketId: string,
    data: {
      session_id: string;
      action: 'start' | 'pause' | 'resume' | 'stop';
      parameters?: any;
    }
  ): void {
    const client = this.connectedClients.get(socketId);
    if (!client) return;

    // Verify user has access to this recording session
    if (!client.recordingSessions.has(data.session_id)) {
      client.socket.emit('error', {
        type: 'recording_control_error',
        message: 'Not subscribed to this recording session',
        session_id: data.session_id,
      });
      return;
    }

    // Emit recording control to session room
    this.io.to(`session_${data.session_id}`).emit('recording_control_received', {
      ...data,
      user_id: client.user.id,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle playback control commands
   */
  private handlePlaybackControl(
    socketId: string,
    data: {
      session_id: string;
      action: 'start' | 'pause' | 'resume' | 'stop' | 'step' | 'seek';
      parameters?: any;
    }
  ): void {
    const client = this.connectedClients.get(socketId);
    if (!client) return;

    // Verify user has access to this playback session
    if (!client.playbackSessions.has(data.session_id)) {
      client.socket.emit('error', {
        type: 'playback_control_error',
        message: 'Not subscribed to this playback session',
        session_id: data.session_id,
      });
      return;
    }

    // Emit playback control to session room
    this.io.to(`session_${data.session_id}`).emit('playback_control_received', {
      ...data,
      user_id: client.user.id,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get connected clients count
   */
  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  /**
   * Get room subscriber count
   */
  getRoomSubscriberCount(roomName: string): number {
    const room = this.io.sockets.adapter.rooms.get(roomName);
    return room ? room.size : 0;
  }

  /**
   * Broadcast system message to all connected clients
   */
  broadcastSystemMessage(message: string, type: 'info' | 'warning' | 'error' = 'info'): void {
    this.io.emit('system_message', {
      type,
      message,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit event to specific user
   */
  emitToUser(userId: string, event: TestBroWebSocketEvent): void {
    // Find all sockets for this user
    for (const [_socketId, client] of this.connectedClients.entries()) {
      if (client.user.id === userId) {
        client.socket.emit('user_event', event);
      }
    }
  }

  /**
   * Broadcast event to all connected clients
   */
  broadcastEvent(event: TestBroWebSocketEvent): void {
    this.io.emit('broadcast_event', event);
  }

  /**
   * Get execution subscribers count
   */
  getExecutionSubscribers(executionId: string): number {
    const room = this.io.sockets.adapter.rooms.get(`execution_${executionId}`);
    return room ? room.size : 0;
  }

  /**
   * Handle client disconnection
   */
  private handleDisconnect(socketId: string): void {
    const client = this.connectedClients.get(socketId);
    if (!client) return;

    console.log(`Cleaning up subscriptions for disconnected socket ${socketId}`);
    
    // Clean up all subscriptions
    client.subscriptions.forEach(executionId => {
      client.socket.leave(`execution_${executionId}`);
    });
    
    client.browserSessions?.forEach(sessionId => {
      client.socket.leave(`session_${sessionId}`);
    });
    
    client.recordingSessions?.forEach(sessionId => {
      client.socket.leave(`session_${sessionId}`);
    });
    
    client.playbackSessions?.forEach(sessionId => {
      client.socket.leave(`session_${sessionId}`);
    });

    // Remove from connected clients
    this.connectedClients.delete(socketId);
  }

  /**
   * Send execution progress update
   */
  sendExecutionProgress(
    executionId: string,
    progress: number,
    currentStep?: string,
    logs?: any[]
  ): void {
    this.emitExecutionEvent({
      type: 'execution_progress',
      execution_id: executionId,
      data: {
        progress,
        current_step: currentStep,
        logs: logs || [],
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send step completion update
   */
  sendStepUpdate(
    executionId: string,
    stepId: string,
    stepOrder: number,
    status: 'running' | 'passed' | 'failed',
    duration?: number,
    screenshotUrl?: string,
    errorMessage?: string
  ): void {
    const eventType = status === 'running' ? 'step_start' : 'step_complete';

    this.emitExecutionEvent({
      type: eventType,
      execution_id: executionId,
      data: {
        step_id: stepId,
        step_order: stepOrder,
        status,
        duration_seconds: duration,
        screenshot_url: screenshotUrl,
        error_message: errorMessage,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send execution completion
   */
  sendExecutionComplete(
    executionId: string,
    status: 'completed' | 'failed' | 'cancelled',
    results: any[],
    metrics: any,
    errorMessage?: string
  ): void {
    this.emitExecutionEvent({
      type: 'execution_complete',
      execution_id: executionId,
      data: {
        status,
        results,
        metrics,
        error_message: errorMessage,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send error event
   */
  sendExecutionError(
    executionId: string,
    error: Error,
    stepId?: string
  ): void {
    this.emitExecutionEvent({
      type: 'error',
      execution_id: executionId,
      data: {
        step_id: stepId,
        error_message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send log message
   */
  sendLogMessage(
    executionId: string,
    level: 'info' | 'warn' | 'error' | 'debug',
    message: string,
    stepId?: string,
    metadata?: any
  ): void {
    this.emitExecutionEvent({
      type: 'log',
      execution_id: executionId,
      data: {
        step_id: stepId,
        level,
        message,
        metadata,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get active subscriptions for a user
   */
  getUserSubscriptions(userId: string): string[] {
    const subscriptions: string[] = [];

    for (const client of this.connectedClients.values()) {
      if (client.user.id === userId) {
        subscriptions.push(...Array.from(client.subscriptions));
      }
    }

    return [...new Set(subscriptions)]; // Remove duplicates
  }

  /**
   * Force disconnect user
   */
  disconnectUser(userId: string): void {
    for (const [_socketId, client] of this.connectedClients.entries()) {
      if (client.user.id === userId) {
        client.socket.disconnect(true);
      }
    }
  }
}

// Export singleton pattern
let websocketService: WebSocketService | null = null;

export const initWebSocketService = (server: HTTPServer): WebSocketService => {
  if (!websocketService) {
    websocketService = new WebSocketService(server);
  }
  return websocketService;
};

export const getWebSocketService = (): WebSocketService | null => {
  return websocketService;
};
