import { useEffect, useState, useCallback, useRef } from 'react';
import { 
  websocketService, 
  WebSocketConnectionState, 
  TestBroWebSocketEvent, 
  ExecutionProgressData,
  StepUpdateData,
  ExecutionCompleteData,
  BrowserControlEvent,
  RecordingEvent,
  PlaybackEvent,
  LivePreviewEvent,
  ScreenshotEvent
} from '@/lib/services/websocketService';
import { useAuth } from '@/contexts/AuthContext';

export interface UseWebSocketOptions {
  autoConnect?: boolean;
  reconnectOnAuth?: boolean;
}

export interface WebSocketHookState {
  connectionState: WebSocketConnectionState;
  connect: () => Promise<void>;
  disconnect: () => void;
  subscribeToExecution: (executionId: string, callback?: (event: TestBroWebSocketEvent) => void) => void;
  unsubscribeFromExecution: (executionId: string, callback?: (event: TestBroWebSocketEvent) => void) => void;
  subscribeToBrowserSession: (sessionId: string) => void;
  unsubscribeFromBrowserSession: (sessionId: string) => void;
  subscribeToRecording: (sessionId: string) => void;
  unsubscribeFromRecording: (sessionId: string) => void;
  subscribeToPlayback: (sessionId: string) => void;
  unsubscribeFromPlayback: (sessionId: string) => void;
  sendBrowserCommand: (sessionId: string, command: string, parameters?: any) => void;
  sendRecordingControl: (sessionId: string, action: 'start' | 'pause' | 'resume' | 'stop', parameters?: any) => void;
  sendPlaybackControl: (sessionId: string, action: 'start' | 'pause' | 'resume' | 'stop' | 'step' | 'seek', parameters?: any) => void;
  sendReplayControl: (executionId: string, action: 'play' | 'pause' | 'stop' | 'seek', timestamp?: number) => void;
  addEventListener: (event: string, callback: (event: TestBroWebSocketEvent) => void) => void;
  removeEventListener: (event: string, callback: (event: TestBroWebSocketEvent) => void) => void;
  getSubscriptions: () => string[];
}

/**
 * React hook for WebSocket functionality
 */
export function useWebSocket(options: UseWebSocketOptions = {}): WebSocketHookState {
  const { autoConnect = true, reconnectOnAuth = true } = options;
  const { isAuthenticated } = useAuth();
  const [connectionState, setConnectionState] = useState<WebSocketConnectionState>(
    websocketService.getConnectionState()
  );
  
  const connectionStateListenerRef = useRef<((state: WebSocketConnectionState) => void) | null>(null);
  const isInitializedRef = useRef(false);

  // Update connection state when it changes
  useEffect(() => {
    const handleConnectionStateChange = (state: WebSocketConnectionState) => {
      setConnectionState(state);
    };

    connectionStateListenerRef.current = handleConnectionStateChange;
    websocketService.addConnectionStateListener(handleConnectionStateChange);

    return () => {
      if (connectionStateListenerRef.current) {
        websocketService.removeConnectionStateListener(connectionStateListenerRef.current);
      }
    };
  }, []);

  // Auto-connect when authenticated
  useEffect(() => {
    if (isAuthenticated && autoConnect && !connectionState.connected && !connectionState.connecting) {
      if (!isInitializedRef.current) {
        isInitializedRef.current = true;
        websocketService.connect().catch(error => {
          console.error('Auto-connect failed:', error);
        });
      }
    }
  }, [isAuthenticated, autoConnect, connectionState.connected, connectionState.connecting]);

  // Reconnect when authentication changes
  useEffect(() => {
    if (isAuthenticated && reconnectOnAuth && connectionState.connected) {
      // Reconnect to refresh token
      websocketService.disconnect();
      setTimeout(() => {
        websocketService.connect().catch(error => {
          console.error('Reconnect on auth failed:', error);
        });
      }, 100);
    }
  }, [isAuthenticated, reconnectOnAuth]);

  // Disconnect when user logs out
  useEffect(() => {
    if (!isAuthenticated && connectionState.connected) {
      websocketService.disconnect();
    }
  }, [isAuthenticated, connectionState.connected]);

  const connect = useCallback(async (): Promise<void> => {
    if (!isAuthenticated) {
      throw new Error('User must be authenticated to connect to WebSocket');
    }
    return websocketService.connect();
  }, [isAuthenticated]);

  const disconnect = useCallback((): void => {
    websocketService.disconnect();
  }, []);

  const subscribeToExecution = useCallback((executionId: string, callback?: (event: TestBroWebSocketEvent) => void): void => {
    websocketService.subscribeToExecution(executionId, callback);
  }, []);

  const unsubscribeFromExecution = useCallback((executionId: string, callback?: (event: TestBroWebSocketEvent) => void): void => {
    websocketService.unsubscribeFromExecution(executionId, callback);
  }, []);

  const subscribeToBrowserSession = useCallback((sessionId: string): void => {
    websocketService.subscribeToBrowserSession(sessionId);
  }, []);

  const unsubscribeFromBrowserSession = useCallback((sessionId: string): void => {
    websocketService.unsubscribeFromBrowserSession(sessionId);
  }, []);

  const subscribeToRecording = useCallback((sessionId: string): void => {
    websocketService.subscribeToRecording(sessionId);
  }, []);

  const unsubscribeFromRecording = useCallback((sessionId: string): void => {
    websocketService.unsubscribeFromRecording(sessionId);
  }, []);

  const subscribeToPlayback = useCallback((sessionId: string): void => {
    websocketService.subscribeToPlayback(sessionId);
  }, []);

  const unsubscribeFromPlayback = useCallback((sessionId: string): void => {
    websocketService.unsubscribeFromPlayback(sessionId);
  }, []);

  const sendBrowserCommand = useCallback((sessionId: string, command: string, parameters?: any): void => {
    websocketService.sendBrowserCommand(sessionId, command, parameters);
  }, []);

  const sendRecordingControl = useCallback((sessionId: string, action: 'start' | 'pause' | 'resume' | 'stop', parameters?: any): void => {
    websocketService.sendRecordingControl(sessionId, action, parameters);
  }, []);

  const sendPlaybackControl = useCallback((sessionId: string, action: 'start' | 'pause' | 'resume' | 'stop' | 'step' | 'seek', parameters?: any): void => {
    websocketService.sendPlaybackControl(sessionId, action, parameters);
  }, []);

  const sendReplayControl = useCallback((executionId: string, action: 'play' | 'pause' | 'stop' | 'seek', timestamp?: number): void => {
    websocketService.sendReplayControl(executionId, action, timestamp);
  }, []);

  const addEventListener = useCallback((event: string, callback: (event: TestBroWebSocketEvent) => void): void => {
    websocketService.addEventListener(event, callback);
  }, []);

  const removeEventListener = useCallback((event: string, callback: (event: TestBroWebSocketEvent) => void): void => {
    websocketService.removeEventListener(event, callback);
  }, []);

  const getSubscriptions = useCallback((): string[] => {
    return websocketService.getSubscriptions();
  }, []);

  return {
    connectionState,
    connect,
    disconnect,
    subscribeToExecution,
    unsubscribeFromExecution,
    subscribeToBrowserSession,
    unsubscribeFromBrowserSession,
    subscribeToRecording,
    unsubscribeFromRecording,
    subscribeToPlayback,
    unsubscribeFromPlayback,
    sendBrowserCommand,
    sendRecordingControl,
    sendPlaybackControl,
    sendReplayControl,
    addEventListener,
    removeEventListener,
    getSubscriptions,
  };
}

/**
 * Hook for execution-specific WebSocket events
 */
export function useExecutionWebSocket(executionId: string | null) {
  const { subscribeToExecution, unsubscribeFromExecution, connectionState } = useWebSocket();
  const [executionData, setExecutionData] = useState<any>(null);
  const [progress, setProgress] = useState<ExecutionProgressData | null>(null);
  const [steps, setSteps] = useState<StepUpdateData[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExecutionEvent = useCallback((event: TestBroWebSocketEvent) => {
    switch (event.type) {
      case 'execution_start':
        setExecutionData(event.data);
        setIsComplete(false);
        setError(null);
        setSteps([]);
        setLogs([]);
        break;

      case 'execution_progress':
        setProgress(event.data as ExecutionProgressData);
        if (event.data.logs) {
          setLogs(prev => [...prev, ...event.data.logs]);
        }
        break;

      case 'step_start':
      case 'step_complete':
        const stepData = event.data as StepUpdateData;
        setSteps(prev => {
          const existingIndex = prev.findIndex(step => step.step_id === stepData.step_id);
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = stepData;
            return updated;
          } else {
            return [...prev, stepData].sort((a, b) => a.step_order - b.step_order);
          }
        });
        break;

      case 'execution_complete':
        const completeData = event.data as ExecutionCompleteData;
        setExecutionData((prev: any) => ({ ...prev, ...completeData }));
        setIsComplete(true);
        break;

      case 'error':
        setError(event.data.error_message || 'An error occurred');
        break;

      case 'log':
        setLogs(prev => [...prev, event.data]);
        break;

      default:
        console.log('Unhandled execution event:', event.type, event.data);
    }
  }, []);

  useEffect(() => {
    if (executionId && connectionState.connected) {
      subscribeToExecution(executionId, handleExecutionEvent);

      return () => {
        unsubscribeFromExecution(executionId, handleExecutionEvent);
      };
    }
  }, [executionId, connectionState.connected, subscribeToExecution, unsubscribeFromExecution, handleExecutionEvent]);

  return {
    executionData,
    progress,
    steps,
    logs,
    isComplete,
    error,
    connectionState,
  };
}

/**
 * Hook for browser session WebSocket events
 */
export function useBrowserWebSocket(sessionId: string | null) {
  const { 
    subscribeToBrowserSession, 
    unsubscribeFromBrowserSession,
    sendBrowserCommand,
    addEventListener,
    removeEventListener,
    connectionState 
  } = useWebSocket();

  const [browserState, setBrowserState] = useState<any>(null);
  const [livePreview, setLivePreview] = useState<LivePreviewEvent | null>(null);
  const [screenshots, setScreenshots] = useState<ScreenshotEvent[]>([]);

  const handleBrowserEvent = useCallback((event: TestBroWebSocketEvent) => {
    switch (event.type) {
      case 'browser_control':
        setBrowserState(event.data);
        break;
      case 'live_preview':
        setLivePreview(event.data as LivePreviewEvent);
        break;
      case 'screenshot':
        setScreenshots(prev => [...prev, event.data as ScreenshotEvent]);
        break;
    }
  }, []);

  useEffect(() => {
    if (sessionId && connectionState.connected) {
      subscribeToBrowserSession(sessionId);
      addEventListener('browser_control', handleBrowserEvent);
      addEventListener('live_preview', handleBrowserEvent);
      addEventListener('screenshot', handleBrowserEvent);

      return () => {
        unsubscribeFromBrowserSession(sessionId);
        removeEventListener('browser_control', handleBrowserEvent);
        removeEventListener('live_preview', handleBrowserEvent);
        removeEventListener('screenshot', handleBrowserEvent);
      };
    }
  }, [sessionId, connectionState.connected]);

  return {
    browserState,
    livePreview,
    screenshots,
    sendBrowserCommand: useCallback((command: string, parameters?: any) => {
      if (sessionId) {
        sendBrowserCommand(sessionId, command, parameters);
      }
    }, [sessionId, sendBrowserCommand]),
    connectionState,
  };
}

/**
 * Hook for recording session WebSocket events
 */
export function useRecordingWebSocket(sessionId: string | null) {
  const { 
    subscribeToRecording, 
    unsubscribeFromRecording,
    sendRecordingControl,
    addEventListener,
    removeEventListener,
    connectionState 
  } = useWebSocket();

  const [recordingState, setRecordingState] = useState<any>(null);
  const [recordingEvents, setRecordingEvents] = useState<RecordingEvent[]>([]);

  const handleRecordingEvent = useCallback((event: TestBroWebSocketEvent) => {
    if (event.type === 'recording') {
      const recordingData = event.data as RecordingEvent;
      setRecordingState(recordingData);
      setRecordingEvents(prev => [...prev, recordingData]);
    }
  }, []);

  useEffect(() => {
    if (sessionId && connectionState.connected) {
      subscribeToRecording(sessionId);
      addEventListener('recording', handleRecordingEvent);

      return () => {
        unsubscribeFromRecording(sessionId);
        removeEventListener('recording', handleRecordingEvent);
      };
    }
  }, [sessionId, connectionState.connected]);

  return {
    recordingState,
    recordingEvents,
    sendRecordingControl: useCallback((action: 'start' | 'pause' | 'resume' | 'stop', parameters?: any) => {
      if (sessionId) {
        sendRecordingControl(sessionId, action, parameters);
      }
    }, [sessionId, sendRecordingControl]),
    connectionState,
  };
}

/**
 * Hook for playback session WebSocket events
 */
export function usePlaybackWebSocket(sessionId: string | null) {
  const { 
    subscribeToPlayback, 
    unsubscribeFromPlayback,
    sendPlaybackControl,
    addEventListener,
    removeEventListener,
    connectionState 
  } = useWebSocket();

  const [playbackState, setPlaybackState] = useState<any>(null);
  const [playbackEvents, setPlaybackEvents] = useState<PlaybackEvent[]>([]);

  const handlePlaybackEvent = useCallback((event: TestBroWebSocketEvent) => {
    if (event.type === 'playback') {
      const playbackData = event.data as PlaybackEvent;
      setPlaybackState(playbackData);
      setPlaybackEvents(prev => [...prev, playbackData]);
    }
  }, []);

  useEffect(() => {
    if (sessionId && connectionState.connected) {
      subscribeToPlayback(sessionId);
      addEventListener('playback', handlePlaybackEvent);

      return () => {
        unsubscribeFromPlayback(sessionId);
        removeEventListener('playback', handlePlaybackEvent);
      };
    }
  }, [sessionId, connectionState.connected]);

  return {
    playbackState,
    playbackEvents,
    sendPlaybackControl: useCallback((action: 'start' | 'pause' | 'resume' | 'stop' | 'step' | 'seek', parameters?: any) => {
      if (sessionId) {
        sendPlaybackControl(sessionId, action, parameters);
      }
    }, [sessionId, sendPlaybackControl]),
    connectionState,
  };
}