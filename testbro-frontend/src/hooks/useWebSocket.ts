import { useEffect, useRef, useState } from 'react';
import { websocketService, type WebSocketConnectionState } from '../lib/services/websocketService';

/**
 * Hook for WebSocket connection management
 */
export function useWebSocket() {
  const [connectionState, setConnectionState] = useState<WebSocketConnectionState>(
    websocketService.getConnectionState()
  );
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    const handleConnectionStateChange = (state: WebSocketConnectionState) => {
      setConnectionState(state);
      setIsConnecting(state.connecting);
    };

    websocketService.addConnectionStateListener(handleConnectionStateChange);

    // Auto-connect if not connected
    if (!connectionState.connected && !connectionState.connecting) {
      setIsConnecting(true);
      websocketService.connect().catch((error: any) => {
        console.error('WebSocket connection failed:', error);
        setIsConnecting(false);
      });
    }

    return () => {
      websocketService.removeConnectionStateListener(handleConnectionStateChange);
    };
  }, []);

  const connect = async () => {
    if (connectionState.connected || isConnecting) return;
    
    setIsConnecting(true);
    try {
      await websocketService.connect();
    } catch (error: any) {
      console.error('WebSocket connection failed:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    websocketService.disconnect();
  };

  return {
    connectionState,
    isConnecting,
    connect,
    disconnect,
    isConnected: connectionState.connected,
  };
}

/**
 * Hook for execution WebSocket events
 */
export function useExecutionWebSocket(executionId: string | null) {
  const [executionData, setExecutionData] = useState<any>(null);
  const [progress, setProgress] = useState(0);
  const [steps, setSteps] = useState<any[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subscriptionsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!executionId) return;

    // Subscribe to execution events
    const handleExecutionEvent = (event: any) => {
      switch (event.type) {
        case 'execution_start':
          setExecutionData(event.data);
          setProgress(0);
          setIsComplete(false);
          setError(null);
          break;
        case 'execution_progress':
          setProgress(event.data.progress || 0);
          if (event.data.logs) {
            setLogs(prev => [...prev, ...event.data.logs]);
          }
          break;
        case 'step_start':
        case 'step_complete':
          setSteps(prev => {
            const newSteps = [...prev];
            const existingIndex = newSteps.findIndex(s => s.id === event.data.step_id);
            if (existingIndex >= 0) {
              newSteps[existingIndex] = { ...newSteps[existingIndex], ...event.data };
            } else {
              newSteps.push(event.data);
            }
            return newSteps.sort((a, b) => a.step_order - b.step_order);
          });
          break;
        case 'execution_complete':
          setExecutionData(event.data);
          setProgress(100);
          setIsComplete(true);
          break;
        case 'error':
          setError(event.data.message || 'Execution error occurred');
          break;
        case 'log':
          setLogs(prev => [...prev, event.data.message]);
          break;
      }
    };

    websocketService.subscribeToExecution(executionId, handleExecutionEvent);
    subscriptionsRef.current.add(executionId);

    return () => {
      websocketService.unsubscribeFromExecution(executionId, handleExecutionEvent);
      subscriptionsRef.current.delete(executionId);
    };
  }, [executionId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      subscriptionsRef.current.forEach(id => {
        websocketService.unsubscribeFromExecution(id);
      });
    };
  }, []);

  return {
    executionData,
    progress,
    steps,
    logs,
    isComplete,
    error,
  };
}

/**
 * Hook for browser session WebSocket events
 */
export function useBrowserWebSocket(sessionId: string | null) {
  const [sessionState, setSessionState] = useState<any>(null);
  const [livePreview, setLivePreview] = useState<any>(null);
  const [screenshots, setScreenshots] = useState<any[]>([]);

  useEffect(() => {
    if (!sessionId) return;

    const handleBrowserEvent = (event: any) => {
      switch (event.type) {
        case 'browser_control':
          setSessionState(event.data);
          break;
        case 'live_preview':
          setLivePreview(event.data);
          break;
        case 'screenshot':
          setScreenshots(prev => [...prev, event.data]);
          break;
      }
    };

    websocketService.addEventListener('browser_control', handleBrowserEvent);
    websocketService.addEventListener('live_preview', handleBrowserEvent);
    websocketService.addEventListener('screenshot', handleBrowserEvent);
    websocketService.subscribeToBrowserSession(sessionId);

    return () => {
      websocketService.removeEventListener('browser_control', handleBrowserEvent);
      websocketService.removeEventListener('live_preview', handleBrowserEvent);
      websocketService.removeEventListener('screenshot', handleBrowserEvent);
      websocketService.unsubscribeFromBrowserSession(sessionId);
    };
  }, [sessionId]);

  const sendCommand = (command: string, parameters?: any) => {
    if (sessionId) {
      websocketService.sendBrowserCommand(sessionId, command, parameters);
    }
  };

  return {
    sessionState,
    livePreview,
    screenshots,
    sendCommand,
  };
}

/**
 * Hook for recording session WebSocket events
 */
export function useRecordingWebSocket(sessionId: string | null) {
  const [recordingState, setRecordingState] = useState<any>(null);
  const [recordingEvents, setRecordingEvents] = useState<any[]>([]);
  const [connectionState, setConnectionState] = useState<WebSocketConnectionState>(
    websocketService.getConnectionState()
  );

  useEffect(() => {
    const handleConnectionStateChange = (state: WebSocketConnectionState) => {
      setConnectionState(state);
    };

    websocketService.addConnectionStateListener(handleConnectionStateChange);

    return () => {
      websocketService.removeConnectionStateListener(handleConnectionStateChange);
    };
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    const handleRecordingEvent = (event: any) => {
      switch (event.type) {
        case 'recording':
          if (event.data.action === 'action_recorded') {
            setRecordingEvents(prev => [...prev, event.data.recorded_action]);
          } else {
            setRecordingState(event.data);
          }
          break;
      }
    };

    websocketService.addEventListener('recording', handleRecordingEvent);
    websocketService.subscribeToRecording(sessionId);

    return () => {
      websocketService.removeEventListener('recording', handleRecordingEvent);
      websocketService.unsubscribeFromRecording(sessionId);
    };
  }, [sessionId]);

  const sendRecordingControl = (action: 'start' | 'pause' | 'resume' | 'stop', parameters?: any) => {
    if (sessionId) {
      websocketService.sendRecordingControl(sessionId, action, parameters);
    }
  };

  return {
    recordingState,
    recordingEvents,
    sendRecordingControl,
    connectionState,
  };
}

/**
 * Hook for playback session WebSocket events
 */
export function usePlaybackWebSocket(sessionId: string | null) {
  const [playbackState, setPlaybackState] = useState<any>(null);
  const [playbackProgress, setPlaybackProgress] = useState(0);

  useEffect(() => {
    if (!sessionId) return;

    const handlePlaybackEvent = (event: any) => {
      switch (event.type) {
        case 'playback':
          setPlaybackState(event.data);
          if (event.data.progress !== undefined) {
            setPlaybackProgress(event.data.progress);
          }
          break;
      }
    };

    websocketService.addEventListener('playback', handlePlaybackEvent);
    websocketService.subscribeToPlayback(sessionId);

    return () => {
      websocketService.removeEventListener('playback', handlePlaybackEvent);
      websocketService.unsubscribeFromPlayback(sessionId);
    };
  }, [sessionId]);

  const sendPlaybackControl = (action: 'start' | 'pause' | 'resume' | 'stop' | 'step' | 'seek', parameters?: any) => {
    if (sessionId) {
      websocketService.sendPlaybackControl(sessionId, action, parameters);
    }
  };

  return {
    playbackState,
    playbackProgress,
    sendPlaybackControl,
  };
}