import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';

// Enhanced event types matching backend
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
  | 'user-presence-update'
  // Legacy events
  | 'execution_progress'
  | 'step_start'
  | 'step_complete'
  | 'execution_complete'
  | 'error'
  | 'log';

// Enhanced WebSocket event structure
export interface EnhancedWebSocketEvent {
  type: WebSocketEventType;
  execution_id?: string;
  session_id?: string;
  step_id?: string;
  user_id?: string;
  data: any;
  timestamp: string;
  metadata?: {
    source: string;
    version: string;
    target?: string;
    [key: string]: any;
  };
}

// Connection status
export interface ConnectionStatus {
  connected: boolean;
  reconnecting: boolean;
  error?: string;
  latency?: number;
  connectionId?: string;
  connectedAt?: Date;
  reconnectCount: number;
}

// User presence
export interface UserPresence {
  userId: string;
  status: 'online' | 'offline' | 'away';
  lastSeen: Date;
}

// System metrics
export interface SystemMetrics {
  connectedClients: number;
  activeUsers: number;
  systemLoad: any;
  memoryUsage: any;
  uptime: number;
  timestamp: string;
}

export interface UseEnhancedWebSocketOptions {
  autoConnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  heartbeatInterval?: number;
  enablePresence?: boolean;
  enableMetrics?: boolean;
}

export interface UseEnhancedWebSocketReturn {
  // Connection state
  socket: Socket | null;
  status: ConnectionStatus;
  
  // Event handling
  on: (eventType: WebSocketEventType, handler: (data: any) => void) => void;
  off: (eventType: WebSocketEventType, handler?: (data: any) => void) => void;
  emit: (eventType: string, data: any) => void;
  
  // Room management
  subscribeToExecution: (executionId: string) => void;
  unsubscribeFromExecution: (executionId: string) => void;
  subscribeToProject: (projectId: string) => void;
  unsubscribeFromProject: (projectId: string) => void;
  subscribeToBrowserSession: (sessionId: string) => void;
  unsubscribeFromBrowserSession: (sessionId: string) => void;
  
  // Presence and activity
  userPresence: Map<string, UserPresence>;
  updateActivity: (activity: any) => void;
  
  // System metrics
  systemMetrics: SystemMetrics | null;
  
  // Connection control
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
}

export function useEnhancedWebSocket(
  options: UseEnhancedWebSocketOptions = {}
): UseEnhancedWebSocketReturn {
  const {
    autoConnect = true,
    reconnectAttempts = 5,
    reconnectDelay = 2000,
    heartbeatInterval = 30000,
    enablePresence = true,
    enableMetrics = false
  } = options;

  const { session } = useAuthStore();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>({
    connected: false,
    reconnecting: false,
    reconnectCount: 0
  });
  const [userPresence, setUserPresence] = useState<Map<string, UserPresence>>(new Map());
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);

  const eventHandlers = useRef<Map<WebSocketEventType, Set<(data: any) => void>>>(new Map());
  const heartbeatInterval_ = useRef<NodeJS.Timeout>();
  const reconnectTimeout = useRef<NodeJS.Timeout>();
  const latencyStart = useRef<number>(0);

  // Initialize socket connection
  const connect = useCallback(() => {
    if (socket || !session?.access_token) return;

    const newSocket = io(process.env.VITE_WS_URL || 'http://localhost:3001', {
      auth: {
        token: session.access_token
      },
      transports: ['websocket', 'polling'],
      upgrade: true,
      reconnection: false, // We handle reconnection manually
      timeout: 20000,
      forceNew: true
    });

    // Connection established
    newSocket.on('connect', () => {
      console.log('Enhanced WebSocket connected:', newSocket.id);
      setStatus(prev => ({
        ...prev,
        connected: true,
        reconnecting: false,
        error: undefined,
        connectionId: newSocket.id,
        connectedAt: new Date()
      }));

      // Start heartbeat
      startHeartbeat(newSocket);
    });

    // Connection error
    newSocket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setStatus(prev => ({
        ...prev,
        connected: false,
        error: error.message
      }));
    });

    // Disconnection
    newSocket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      setStatus(prev => ({
        ...prev,
        connected: false,
        reconnecting: false
      }));
      stopHeartbeat();
      
      // Attempt reconnection if not manual disconnect
      if (reason !== 'io client disconnect' && status.reconnectCount < reconnectAttempts) {
        scheduleReconnect();
      }
    });

    // Welcome message
    newSocket.on('connected', (data) => {
      console.log('WebSocket welcome:', data);
    });

    // Heartbeat handling
    newSocket.on('heartbeat', () => {
      const now = Date.now();
      const latency = latencyStart.current ? now - latencyStart.current : 0;
      setStatus(prev => ({
        ...prev,
        latency
      }));
      
      // Send heartbeat response
      newSocket.emit('heartbeat_response', { timestamp: new Date().toISOString() });
    });

    // Enhanced event types
    setupEnhancedEventHandlers(newSocket);

    setSocket(newSocket);
  }, [session?.access_token, status.reconnectCount, reconnectAttempts]);

  // Setup enhanced event handlers
  const setupEnhancedEventHandlers = (socket: Socket) => {
    // Test execution events
    socket.on('visual-test-execution-update', (data: EnhancedWebSocketEvent) => {
      triggerEventHandlers('visual-test-execution-update', data);
    });

    socket.on('scheduled-test-execution-update', (data: EnhancedWebSocketEvent) => {
      triggerEventHandlers('scheduled-test-execution-update', data);
    });

    socket.on('test-execution-progress', (data: EnhancedWebSocketEvent) => {
      triggerEventHandlers('test-execution-progress', data);
    });

    // AI events
    socket.on('ai-generation-status', (data: EnhancedWebSocketEvent) => {
      triggerEventHandlers('ai-generation-status', data);
    });

    // Browser automation events
    socket.on('browser-session-updates', (data: EnhancedWebSocketEvent) => {
      triggerEventHandlers('browser-session-updates', data);
    });

    // System events
    socket.on('system-notification', (data: any) => {
      triggerEventHandlers('system-notification', data);
    });

    socket.on('real-time-metrics', (data: SystemMetrics) => {
      if (enableMetrics) {
        setSystemMetrics(data);
        triggerEventHandlers('real-time-metrics', data);
      }
    });

    // User presence events
    socket.on('user-presence-update', (data: { user_id: string; status: string; timestamp: string }) => {
      if (enablePresence) {
        setUserPresence(prev => {
          const newMap = new Map(prev);
          newMap.set(data.user_id, {
            userId: data.user_id,
            status: data.status as 'online' | 'offline' | 'away',
            lastSeen: new Date(data.timestamp)
          });
          return newMap;
        });
        triggerEventHandlers('user-activity-updates', data);
      }
    });

    // Legacy event support
    socket.on('execution_progress', (data: EnhancedWebSocketEvent) => {
      triggerEventHandlers('execution_progress', data);
    });

    socket.on('step_start', (data: EnhancedWebSocketEvent) => {
      triggerEventHandlers('step_start', data);
    });

    socket.on('step_complete', (data: EnhancedWebSocketEvent) => {
      triggerEventHandlers('step_complete', data);
    });

    socket.on('execution_complete', (data: EnhancedWebSocketEvent) => {
      triggerEventHandlers('execution_complete', data);
    });

    socket.on('error', (data: EnhancedWebSocketEvent) => {
      triggerEventHandlers('error', data);
    });
  };

  // Trigger event handlers
  const triggerEventHandlers = (eventType: WebSocketEventType, data: any) => {
    const handlers = eventHandlers.current.get(eventType);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error('Error in WebSocket event handler:', error);
        }
      });
    }
  };

  // Start heartbeat
  const startHeartbeat = (socket: Socket) => {
    if (heartbeatInterval_) clearInterval(heartbeatInterval_.current);
    
    heartbeatInterval_.current = setInterval(() => {
      if (socket.connected) {
        latencyStart.current = Date.now();
      }
    }, heartbeatInterval);
  };

  // Stop heartbeat
  const stopHeartbeat = () => {
    if (heartbeatInterval_.current) {
      clearInterval(heartbeatInterval_.current);
      heartbeatInterval_.current = undefined;
    }
  };

  // Schedule reconnection
  const scheduleReconnect = () => {
    if (reconnectTimeout.current) return;
    
    setStatus(prev => ({
      ...prev,
      reconnecting: true,
      reconnectCount: prev.reconnectCount + 1
    }));

    const delay = reconnectDelay * Math.pow(2, status.reconnectCount); // Exponential backoff
    
    reconnectTimeout.current = setTimeout(() => {
      reconnectTimeout.current = undefined;
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      connect();
    }, delay);
  };

  // Disconnect socket
  const disconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = undefined;
    }
    
    stopHeartbeat();
    
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
    
    setStatus(prev => ({
      ...prev,
      connected: false,
      reconnecting: false
    }));
  }, [socket]);

  // Reconnect manually
  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(() => connect(), 1000);
  }, [disconnect, connect]);

  // Event handler management
  const on = useCallback((eventType: WebSocketEventType, handler: (data: any) => void) => {
    if (!eventHandlers.current.has(eventType)) {
      eventHandlers.current.set(eventType, new Set());
    }
    eventHandlers.current.get(eventType)!.add(handler);
  }, []);

  const off = useCallback((eventType: WebSocketEventType, handler?: (data: any) => void) => {
    const handlers = eventHandlers.current.get(eventType);
    if (handlers) {
      if (handler) {
        handlers.delete(handler);
      } else {
        handlers.clear();
      }
    }
  }, []);

  // Emit events
  const emit = useCallback((eventType: string, data: any) => {
    if (socket && socket.connected) {
      socket.emit(eventType, data);
    }
  }, [socket]);

  // Room subscriptions
  const subscribeToExecution = useCallback((executionId: string) => {
    emit('subscribe_execution', executionId);
  }, [emit]);

  const unsubscribeFromExecution = useCallback((executionId: string) => {
    emit('unsubscribe_execution', executionId);
  }, [emit]);

  const subscribeToProject = useCallback((projectId: string) => {
    emit('subscribe_project', projectId);
  }, [emit]);

  const unsubscribeFromProject = useCallback((projectId: string) => {
    emit('unsubscribe_project', projectId);
  }, [emit]);

  const subscribeToBrowserSession = useCallback((sessionId: string) => {
    emit('subscribe_browser_session', sessionId);
  }, [emit]);

  const unsubscribeFromBrowserSession = useCallback((sessionId: string) => {
    emit('unsubscribe_browser_session', sessionId);
  }, [emit]);

  // User activity
  const updateActivity = useCallback((activity: any) => {
    emit('user_activity', activity);
  }, [emit]);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect && session?.access_token) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [session?.access_token, autoConnect, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      stopHeartbeat();
      eventHandlers.current.clear();
    };
  }, []);

  return {
    socket,
    status,
    on,
    off,
    emit,
    subscribeToExecution,
    unsubscribeFromExecution,
    subscribeToProject,
    unsubscribeFromProject,
    subscribeToBrowserSession,
    unsubscribeFromBrowserSession,
    userPresence,
    updateActivity,
    systemMetrics,
    connect,
    disconnect,
    reconnect
  };
}
