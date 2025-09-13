import { Server as SocketIOServer, Socket } from 'socket.io';
import { createServer, Server as HTTPServer } from 'http';
import { supabaseAdmin } from '../config/database';
import { logger, LogCategory } from './loggingService';
import { 
  User, 
  WebSocketEvent, 
  BrowserControlEvent, 
  RecordingEvent, 
  PlaybackEvent, 
  LivePreviewEvent, 
  ScreenshotEvent,
  StandardWebSocketEvent
} from '../types';

// Enhanced event types for all services
export type WebSocketEventType = 
  | 'test-execution-progress'
  | 'ai-generation-status' 
  | 'browser-session-updates'
  | 'visual-test-execution-update'
  | 'scheduled-test-execution-update'
  | 'schedule-notifications'
  | 'real-time-metrics'
  | 'user-activity-updates'
  | 'system-notification'
  | 'connection-status'
  | 'heartbeat'
  // Legacy event types
  | 'execution_progress'
  | 'step_start'
  | 'step_complete'
  | 'execution_complete'
  | 'error'
  | 'log';

// Updated to use standardized WebSocket event structure
export interface TestBroWebSocketEvent extends StandardWebSocketEvent {
  type: WebSocketEventType;
  user_id?: string;
}

// Enhanced client connection interface
export interface ConnectedClient {
  socket: Socket;
  user: User;
  subscriptions: Set<string>; // execution/session IDs they're subscribed to
  browserSessions: Set<string>; // browser session IDs they control
  recordingSessions: Set<string>; // recording session IDs they're monitoring
  playbackSessions: Set<string>; // playback session IDs they're monitoring
  projectRooms: Set<string>; // project-based room subscriptions
  organizationRooms: Set<string>; // organization-based room subscriptions
  connectedAt: Date;
  lastActivity: Date;
  isOnline: boolean;
  heartbeatInterval?: NodeJS.Timeout;
  connectionMetrics: {
    messagesReceived: number;
    messagesSent: number;
    reconnectCount: number;
  };
}

// Rate limiting interface
export interface RateLimit {
  windowMs: number;
  maxRequests: number;
  requests: Map<string, number[]>;
}

export class WebSocketService {
  private static instance: WebSocketService | null = null;
  private io: SocketIOServer;
  private connectedClients = new Map<string, ConnectedClient>();
  private userPresence = new Map<string, { status: 'online' | 'offline' | 'away', lastSeen: Date }>();
  private rateLimiter: RateLimit;
  private metricsInterval: NodeJS.Timeout;
  private cleanupInterval: NodeJS.Timeout;

  constructor(server: HTTPServer) {
    // Initialize rate limiter
    this.rateLimiter = {
      windowMs: 60000, // 1 minute
      maxRequests: 100, // max 100 messages per minute per user
      requests: new Map()
    };
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL?.split(',') || ["http://localhost:5173"],
        methods: ["GET", "POST"],
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
      maxHttpBufferSize: 1e6, // 1MB
      allowEIO3: true,
      transports: ['websocket', 'polling'],
      upgradeTimeout: 30000,
    });

    this.setupMiddleware();
    this.setupEventHandlers();

    // Start heartbeat and cleanup cycles
    this.metricsInterval = setInterval(() => this.broadcastSystemMetrics(), 15000);
    this.cleanupInterval = setInterval(() => this.cleanupInactiveConnections(), 60000);
  }

  /**
   * Setup authentication middleware
   */
  private setupMiddleware(): void {
    // Rate limiting middleware
    this.io.use((socket: Socket, next) => {
      const clientIp = socket.handshake.address;
      if (this.checkRateLimit(clientIp)) {
        next();
      } else {
        logger.warn('Rate limit exceeded for WebSocket connection', LogCategory.WEBSOCKET, {
          clientIp,
          socketId: socket.id
        });
        next(new Error('Rate limit exceeded'));
      }
    });

    // Authentication middleware
    this.io.use(async (socket: Socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.query.token as string;
        const origin = socket.handshake.headers.origin;

        // Validate origin
        if (origin && !this.isValidOrigin(origin)) {
          logger.warn('Invalid origin for WebSocket connection', LogCategory.SECURITY, {
            origin,
            socketId: socket.id
          });
          return next(new Error('Invalid origin'));
        }

        if (!token) {
          logger.warn('WebSocket connection attempted without token', LogCategory.SECURITY, {
            origin,
            socketId: socket.id
          });
          return next(new Error('Authentication token required'));
        }

        // Verify JWT token with Supabase
        const { data: userData, error } = await supabaseAdmin.auth.getUser(token);

        if (error || !userData.user) {
          logger.warn('Invalid authentication token for WebSocket', LogCategory.SECURITY, {
            error: error?.message,
            socketId: socket.id,
            origin
          });
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

        logger.debug('WebSocket authentication successful', LogCategory.WEBSOCKET, {
          userId: userData.user.id,
          email: userData.user.email,
          socketId: socket.id
        });

        next();
      } catch (error) {
        logger.error('Socket authentication error', LogCategory.SECURITY, {
          error: error instanceof Error ? error.message : error,
          socketId: socket.id
        });
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

      logger.info('WebSocket connection established', LogCategory.WEBSOCKET, {
        userId: user.id,
        email: user.email,
        socketId: socket.id
      });

      // Create enhanced client record
      const client: ConnectedClient = {
        socket,
        user,
        subscriptions: new Set(),
        browserSessions: new Set(),
        recordingSessions: new Set(),
        playbackSessions: new Set(),
        projectRooms: new Set(),
        organizationRooms: new Set(),
        connectedAt: new Date(),
        lastActivity: new Date(),
        isOnline: true,
        connectionMetrics: {
          messagesReceived: 0,
          messagesSent: 0,
          reconnectCount: 0
        }
      };

      // Start heartbeat for this client
      client.heartbeatInterval = setInterval(() => {
        if (client.isOnline) {
          socket.emit('heartbeat', { timestamp: new Date().toISOString() });
        }
      }, 30000);

      // Register connected client
      this.connectedClients.set(socket.id, client);

      // Update user presence
      this.updateUserPresence(user.id, 'online');

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

      // Handle project room subscription
      socket.on('subscribe_project', (projectId: string) => {
        this.subscribeToProject(socket.id, projectId);
      });

      // Handle project room unsubscription
      socket.on('unsubscribe_project', (projectId: string) => {
        this.unsubscribeFromProject(socket.id, projectId);
      });

      // Handle organization room subscription
      socket.on('subscribe_organization', (organizationId: string) => {
        this.subscribeToOrganization(socket.id, organizationId);
      });

      // Handle heartbeat response
      socket.on('heartbeat_response', (data) => {
        client.lastActivity = new Date();
        client.connectionMetrics.messagesReceived++;
      });

      // Handle user activity updates
      socket.on('user_activity', (activity) => {
        this.broadcastUserActivity(user.id, activity);
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        logger.info('WebSocket disconnection', LogCategory.WEBSOCKET, {
          userId: user.id,
          email: user.email,
          socketId: socket.id,
          reason
        });
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
   * Emit execution event to subscribers with standardized structure
   */
  emitExecutionEvent(event: TestBroWebSocketEvent): void {
    const room = `execution_${event.execution_id}`;
    
    console.log(`Emitting event ${event.type} to room ${room}`);
    
    // Ensure standardized structure
    const standardizedEvent: StandardWebSocketEvent = {
      type: event.type,
      execution_id: event.execution_id,
      session_id: event.session_id,
      step_id: event.step_id,
      user_id: event.user_id,
      data: event.data,
      timestamp: event.timestamp || new Date().toISOString(),
      metadata: {
        source: 'websocket_service',
        version: '1.0',
        ...event.metadata
      }
    };
    
    this.io.to(room).emit('execution_event', standardizedEvent);
  }

  /**
   * Emit event to specific session subscribers with standardized structure
   */
  emitToSession(sessionId: string, eventType: string, data: any): void {
    const room = `session_${sessionId}`;
    
    console.log(`Emitting ${eventType} event to session room ${room}`);
    
    const standardizedEvent: StandardWebSocketEvent = {
      type: eventType as any,
      session_id: sessionId,
      data,
      timestamp: new Date().toISOString(),
      metadata: {
        source: 'websocket_service',
        version: '1.0'
      }
    };
    
    this.io.to(room).emit(eventType, standardizedEvent);
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
   * Check rate limit for IP address
   */
  private checkRateLimit(clientIp: string): boolean {
    const now = Date.now();
    const requests = this.rateLimiter.requests.get(clientIp) || [];
    
    // Remove expired requests
    const validRequests = requests.filter(timestamp => 
      now - timestamp < this.rateLimiter.windowMs
    );
    
    if (validRequests.length >= this.rateLimiter.maxRequests) {
      return false;
    }
    
    validRequests.push(now);
    this.rateLimiter.requests.set(clientIp, validRequests);
    return true;
  }

  /**
   * Validate origin for security
   */
  private isValidOrigin(origin: string): boolean {
    const allowedOrigins = process.env.FRONTEND_URL?.split(',') || ["http://localhost:5173"];
    return allowedOrigins.includes(origin);
  }

  /**
   * Update user presence status
   */
  private updateUserPresence(userId: string, status: 'online' | 'offline' | 'away'): void {
    this.userPresence.set(userId, {
      status,
      lastSeen: new Date()
    });
    
    // Broadcast presence update to relevant users
    this.broadcastPresenceUpdate(userId, status);
  }

  /**
   * Subscribe client to project-based room
   */
  private subscribeToProject(socketId: string, projectId: string): void {
    const client = this.connectedClients.get(socketId);
    if (!client) return;

    client.projectRooms.add(projectId);
    client.socket.join(`project_${projectId}`);

    logger.debug('Client subscribed to project room', LogCategory.WEBSOCKET, {
      socketId,
      projectId,
      userId: client.user.id
    });
  }

  /**
   * Unsubscribe client from project-based room
   */
  private unsubscribeFromProject(socketId: string, projectId: string): void {
    const client = this.connectedClients.get(socketId);
    if (!client) return;

    client.projectRooms.delete(projectId);
    client.socket.leave(`project_${projectId}`);

    logger.debug('Client unsubscribed from project room', LogCategory.WEBSOCKET, {
      socketId,
      projectId,
      userId: client.user.id
    });
  }

  /**
   * Subscribe client to organization-based room
   */
  private subscribeToOrganization(socketId: string, organizationId: string): void {
    const client = this.connectedClients.get(socketId);
    if (!client) return;

    client.organizationRooms.add(organizationId);
    client.socket.join(`organization_${organizationId}`);

    logger.debug('Client subscribed to organization room', LogCategory.WEBSOCKET, {
      socketId,
      organizationId,
      userId: client.user.id
    });
  }

  /**
   * Broadcast user activity to relevant rooms
   */
  private broadcastUserActivity(userId: string, activity: any): void {
    const client = Array.from(this.connectedClients.values())
      .find(c => c.user.id === userId);
    
    if (!client) return;

    // Broadcast to all project and organization rooms this user is in
    client.projectRooms.forEach(projectId => {
      this.io.to(`project_${projectId}`).emit('user-activity-updates', {
        user_id: userId,
        activity,
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * Broadcast presence updates
   */
  private broadcastPresenceUpdate(userId: string, status: 'online' | 'offline' | 'away'): void {
    const client = Array.from(this.connectedClients.values())
      .find(c => c.user.id === userId);
    
    if (!client) return;

    client.projectRooms.forEach(projectId => {
      this.io.to(`project_${projectId}`).emit('user-presence-update', {
        user_id: userId,
        status,
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * Broadcast system metrics to all connected clients
   */
  private broadcastSystemMetrics(): void {
    const metrics = {
      connectedClients: this.connectedClients.size,
      activeUsers: this.userPresence.size,
      systemLoad: process.cpuUsage(),
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };

    this.io.emit('real-time-metrics', metrics);
  }

  /**
   * Clean up inactive connections
   */
  private cleanupInactiveConnections(): void {
    const now = Date.now();
    const inactiveThreshold = 5 * 60 * 1000; // 5 minutes
    
    for (const [socketId, client] of this.connectedClients.entries()) {
      if (now - client.lastActivity.getTime() > inactiveThreshold) {
        logger.info('Cleaning up inactive WebSocket connection', LogCategory.WEBSOCKET, {
          socketId,
          userId: client.user.id,
          inactiveDuration: now - client.lastActivity.getTime()
        });
        
        client.socket.disconnect(true);
        this.handleDisconnect(socketId);
      }
    }

    // Clean up rate limiter data
    const rateLimitCleanupThreshold = this.rateLimiter.windowMs;
    for (const [ip, requests] of this.rateLimiter.requests.entries()) {
      const validRequests = requests.filter(timestamp => 
        now - timestamp < rateLimitCleanupThreshold
      );
      
      if (validRequests.length === 0) {
        this.rateLimiter.requests.delete(ip);
      } else {
        this.rateLimiter.requests.set(ip, validRequests);
      }
    }
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
   * Broadcast system message to all connected clients with standardized structure
   */
  broadcastSystemMessage(message: string, type: 'info' | 'warning' | 'error' = 'info'): void {
    const standardizedEvent: StandardWebSocketEvent = {
      type: 'system_message',
      data: {
        message,
        level: type
      },
      timestamp: new Date().toISOString(),
      metadata: {
        source: 'websocket_service',
        version: '1.0',
        target: 'system_broadcast'
      }
    };
    
    this.io.emit('system_message', standardizedEvent);
  }

  /**
   * Enhanced broadcast to user with event type routing
   */
  broadcastToUser(userId: string, eventType: WebSocketEventType, data: any): void {
    // Find all sockets for this user
    for (const [_socketId, client] of this.connectedClients.entries()) {
      if (client.user.id === userId && client.isOnline) {
        const standardizedEvent: StandardWebSocketEvent = {
          type: eventType as any,
          user_id: userId,
          data,
          timestamp: new Date().toISOString(),
          metadata: {
            source: 'websocket_service',
            version: '1.0',
            target: 'user_specific'
          }
        };
        
        client.socket.emit(eventType, standardizedEvent);
        client.connectionMetrics.messagesSent++;
        client.lastActivity = new Date();
      }
    }
  }

  /**
   * Emit event to specific user with standardized structure (backward compatibility)
   */
  emitToUser(userId: string, event: TestBroWebSocketEvent): void {
    this.broadcastToUser(userId, event.type, event.data);
  }

  /**
   * Broadcast event to all connected clients with standardized structure
   */
  broadcastEvent(event: TestBroWebSocketEvent): void {
    const standardizedEvent: StandardWebSocketEvent = {
      type: event.type,
      execution_id: event.execution_id,
      session_id: event.session_id,
      step_id: event.step_id,
      user_id: event.user_id,
      data: event.data,
      timestamp: event.timestamp || new Date().toISOString(),
      metadata: {
        source: 'websocket_service',
        version: '1.0',
        target: 'broadcast',
        ...event.metadata
      }
    };
    
    this.io.emit('broadcast_event', standardizedEvent);
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

    logger.debug('Cleaning up WebSocket client subscriptions', LogCategory.WEBSOCKET, {
      socketId,
      userId: client.user.id,
      subscriptions: client.subscriptions.size,
      connectionDuration: Date.now() - client.connectedAt.getTime()
    });
    
    // Stop heartbeat interval
    if (client.heartbeatInterval) {
      clearInterval(client.heartbeatInterval);
    }
    
    // Update user presence
    client.isOnline = false;
    this.updateUserPresence(client.user.id, 'offline');
    
    // Clean up all subscriptions
    client.subscriptions.forEach(executionId => {
      client.socket.leave(`execution_${executionId}`);
    });
    
    client.browserSessions.forEach(sessionId => {
      client.socket.leave(`session_${sessionId}`);
    });
    
    client.recordingSessions.forEach(sessionId => {
      client.socket.leave(`session_${sessionId}`);
    });
    
    client.playbackSessions.forEach(sessionId => {
      client.socket.leave(`session_${sessionId}`);
    });

    client.projectRooms.forEach(projectId => {
      client.socket.leave(`project_${projectId}`);
    });

    client.organizationRooms.forEach(organizationId => {
      client.socket.leave(`organization_${organizationId}`);
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

  /**
   * Get user presence status
   */
  getUserPresence(userId: string): { status: 'online' | 'offline' | 'away', lastSeen: Date } | null {
    return this.userPresence.get(userId) || null;
  }

  /**
   * Get all online users
   */
  getOnlineUsers(): string[] {
    const onlineUsers = new Set<string>();
    for (const client of this.connectedClients.values()) {
      if (client.isOnline) {
        onlineUsers.add(client.user.id);
      }
    }
    return Array.from(onlineUsers);
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): {
    totalConnections: number;
    uniqueUsers: number;
    averageConnectionDuration: number;
    messagesSent: number;
    messagesReceived: number;
  } {
    const uniqueUsers = new Set<string>();
    let totalMessagesSent = 0;
    let totalMessagesReceived = 0;
    let totalConnectionDuration = 0;
    const now = Date.now();

    for (const client of this.connectedClients.values()) {
      uniqueUsers.add(client.user.id);
      totalMessagesSent += client.connectionMetrics.messagesSent;
      totalMessagesReceived += client.connectionMetrics.messagesReceived;
      totalConnectionDuration += now - client.connectedAt.getTime();
    }

    return {
      totalConnections: this.connectedClients.size,
      uniqueUsers: uniqueUsers.size,
      averageConnectionDuration: this.connectedClients.size > 0 
        ? totalConnectionDuration / this.connectedClients.size 
        : 0,
      messagesSent: totalMessagesSent,
      messagesReceived: totalMessagesReceived
    };
  }

  /**
   * Broadcast to project room
   */
  broadcastToProject(projectId: string, eventType: WebSocketEventType, data: any): void {
    const standardizedEvent: StandardWebSocketEvent = {
      type: eventType as any,
      data,
      timestamp: new Date().toISOString(),
      metadata: {
        source: 'websocket_service',
        version: '1.0',
        target: `project_${projectId}`
      }
    };

    this.io.to(`project_${projectId}`).emit(eventType, standardizedEvent);
  }

  /**
   * Broadcast to organization room
   */
  broadcastToOrganization(organizationId: string, eventType: WebSocketEventType, data: any): void {
    const standardizedEvent: StandardWebSocketEvent = {
      type: eventType as any,
      data,
      timestamp: new Date().toISOString(),
      metadata: {
        source: 'websocket_service',
        version: '1.0',
        target: `organization_${organizationId}`
      }
    };

    this.io.to(`organization_${organizationId}`).emit(eventType, standardizedEvent);
  }

  /**
   * Send system notification
   */
  sendSystemNotification(message: string, type: 'info' | 'warning' | 'error' = 'info', targetUsers?: string[]): void {
    const notification = {
      message,
      type,
      timestamp: new Date().toISOString()
    };

    if (targetUsers && targetUsers.length > 0) {
      // Send to specific users
      targetUsers.forEach(userId => {
        this.broadcastToUser(userId, 'system-notification', notification);
      });
    } else {
      // Broadcast to all connected clients
      this.io.emit('system-notification', notification);
    }
  }

  /**
   * Get singleton instance
   */
  static getInstance(): WebSocketService | null {
    return WebSocketService.instance;
  }

  /**
   * Set singleton instance (called by initWebSocketService)
   */
  static setInstance(instance: WebSocketService): void {
    WebSocketService.instance = instance;
  }

  /**
   * Shutdown WebSocket service
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down WebSocket service', LogCategory.WEBSOCKET);

    // Clear intervals
    if (this.metricsInterval) clearInterval(this.metricsInterval);
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);

    // Disconnect all clients
    for (const [socketId, client] of this.connectedClients.entries()) {
      if (client.heartbeatInterval) {
        clearInterval(client.heartbeatInterval);
      }
      client.socket.disconnect(true);
    }

    // Close Socket.IO server
    this.io.close();
    
    // Clear data structures
    this.connectedClients.clear();
    this.userPresence.clear();
    this.rateLimiter.requests.clear();

    WebSocketService.instance = null;
    
    logger.info('WebSocket service shutdown completed', LogCategory.WEBSOCKET);
  }
}

// Export singleton pattern
export const initWebSocketService = (server: HTTPServer): WebSocketService => {
  if (!WebSocketService.getInstance()) {
    const instance = new WebSocketService(server);
    WebSocketService.setInstance(instance);
    logger.info('WebSocket service initialized', LogCategory.WEBSOCKET, {
      connectedClients: 0,
      timestamp: new Date().toISOString()
    });
  }
  return WebSocketService.getInstance()!;
};

export const getWebSocketService = (): WebSocketService | null => {
  return WebSocketService.getInstance();
};

// Backward compatibility exports
export { WebSocketService };
export default WebSocketService;
