import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  NoCodeTestStep, 
  ElementIdentification, 
  StandardWebSocketEvent 
} from '../../../types';

interface RecordingFeedback {
  type: 'recording_started' | 'step_captured' | 'element_identified' | 'recording_paused' | 'recording_stopped' | 'error_occurred';
  recording_id: string;
  data: {
    step?: NoCodeTestStep;
    element?: ElementIdentification;
    error?: string;
    confidence?: number;
    suggestions?: string[];
    screenshot_url?: string;
    timestamp: string;
  };
}

interface TestValidation {
  type: 'validation_started' | 'step_validated' | 'element_verified' | 'validation_completed' | 'validation_failed';
  test_id: string;
  execution_id?: string;
  data: {
    step?: NoCodeTestStep;
    validation_result?: {
      success: boolean;
      confidence: number;
      issues: string[];
      suggestions: string[];
    };
    element_health?: {
      element_id: string;
      status: 'healthy' | 'warning' | 'broken';
      selector_confidence: number;
      alternative_selectors: string[];
    };
    overall_health?: {
      total_steps: number;
      healthy_steps: number;
      warning_steps: number;
      broken_steps: number;
      overall_confidence: number;
    };
    timestamp: string;
  };
}

interface RealTimeInsight {
  type: 'performance_metric' | 'best_practice_suggestion' | 'optimization_tip' | 'error_pattern' | 'success_feedback';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  action_required: boolean;
  suggested_actions?: string[];
  related_data?: any;
}

interface WebSocketConnection {
  isConnected: boolean;
  reconnectAttempts: number;
  lastError?: string;
}

export const useRealTimeEvents = () => {
  const [connection, setConnection] = useState<WebSocketConnection>({
    isConnected: false,
    reconnectAttempts: 0
  });
  
  const [recordingFeedback, setRecordingFeedback] = useState<RecordingFeedback[]>([]);
  const [testValidation, setTestValidation] = useState<TestValidation[]>([]);
  const [insights, setInsights] = useState<RealTimeInsight[]>([]);
  const [activeChannels, setActiveChannels] = useState<Set<string>>(new Set());

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // WebSocket connection management
  const connect = useCallback((token?: string) => {
    try {
      const wsUrl = `${process.env.REACT_APP_WS_URL || 'ws://localhost:3001'}/ws`;
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        setConnection(prev => ({
          ...prev,
          isConnected: true,
          reconnectAttempts: 0,
          lastError: undefined
        }));

        // Send authentication if token provided
        if (token) {
          ws.send(JSON.stringify({
            type: 'authenticate',
            token
          }));
        }

        // Start heartbeat
        heartbeatIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const message: StandardWebSocketEvent = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setConnection(prev => ({
          ...prev,
          isConnected: false,
          lastError: event.reason
        }));

        // Clean up heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }

        // Attempt reconnection
        if (event.code !== 1000) { // Not a normal closure
          scheduleReconnect();
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnection(prev => ({
          ...prev,
          lastError: 'Connection error occurred'
        }));
      };

      wsRef.current = ws;

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnection(prev => ({
        ...prev,
        lastError: 'Failed to create connection'
      }));
    }
  }, []);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close(1000, 'User initiated disconnect');
      wsRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }

    setConnection({
      isConnected: false,
      reconnectAttempts: 0
    });
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) return;

    const delay = Math.min(1000 * Math.pow(2, connection.reconnectAttempts), 30000);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      setConnection(prev => ({
        ...prev,
        reconnectAttempts: prev.reconnectAttempts + 1
      }));
      
      connect();
      reconnectTimeoutRef.current = null;
    }, delay);
  }, [connection.reconnectAttempts, connect]);

  // Message handling
  const handleWebSocketMessage = useCallback((message: StandardWebSocketEvent) => {
    switch (message.type) {
      case 'recording_feedback':
        const recordingEvent = message.data as RecordingFeedback;
        setRecordingFeedback(prev => [...prev.slice(-49), recordingEvent]); // Keep last 50
        break;

      case 'test_validation':
        const validationEvent = message.data as TestValidation;
        setTestValidation(prev => [...prev.slice(-49), validationEvent]); // Keep last 50
        break;

      case 'realtime_insight':
        const insight = message.data as RealTimeInsight;
        setInsights(prev => {
          // Remove duplicates and keep last 20
          const filtered = prev.filter(i => i.title !== insight.title);
          return [...filtered.slice(-19), insight];
        });
        break;

      default:
        console.log('Unhandled WebSocket message type:', message.type);
    }
  }, []);

  // Channel subscription management
  const subscribeToChannel = useCallback((channelName: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'subscribe',
        channel: channelName
      }));
      
      setActiveChannels(prev => new Set(prev).add(channelName));
    }
  }, []);

  const unsubscribeFromChannel = useCallback((channelName: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'unsubscribe',
        channel: channelName
      }));
      
      setActiveChannels(prev => {
        const newSet = new Set(prev);
        newSet.delete(channelName);
        return newSet;
      });
    }
  }, []);

  // Recording-specific methods
  const subscribeToRecording = useCallback((recordingId: string) => {
    subscribeToChannel(`recording:${recordingId}`);
  }, [subscribeToChannel]);

  const unsubscribeFromRecording = useCallback((recordingId: string) => {
    unsubscribeFromChannel(`recording:${recordingId}`);
  }, [unsubscribeFromChannel]);

  // Test validation-specific methods
  const subscribeToTestValidation = useCallback((testId: string) => {
    subscribeToChannel(`validation:${testId}`);
  }, [subscribeToChannel]);

  const unsubscribeFromTestValidation = useCallback((testId: string) => {
    unsubscribeFromChannel(`validation:${testId}`);
  }, [unsubscribeFromChannel]);

  // Conversation-specific methods  
  const subscribeToConversation = useCallback((conversationId: string) => {
    subscribeToChannel(`conversation:${conversationId}`);
  }, [subscribeToChannel]);

  const unsubscribeFromConversation = useCallback((conversationId: string) => {
    unsubscribeFromChannel(`conversation:${conversationId}`);
  }, [unsubscribeFromChannel]);

  // Self-healing specific methods
  const subscribeToHealing = useCallback((sessionId: string) => {
    subscribeToChannel(`healing:${sessionId}`);
  }, [subscribeToChannel]);

  const unsubscribeFromHealing = useCallback((sessionId: string) => {
    unsubscribeFromChannel(`healing:${sessionId}`);
  }, [unsubscribeFromChannel]);

  // Utility methods
  const clearFeedback = useCallback(() => {
    setRecordingFeedback([]);
    setTestValidation([]);
  }, []);

  const clearInsights = useCallback(() => {
    setInsights([]);
  }, []);

  const getLatestRecordingFeedback = useCallback((recordingId: string) => {
    return recordingFeedback.filter(f => f.recording_id === recordingId);
  }, [recordingFeedback]);

  const getLatestTestValidation = useCallback((testId: string) => {
    return testValidation.filter(v => v.test_id === testId);
  }, [testValidation]);

  const getInsightsByPriority = useCallback((priority: 'low' | 'medium' | 'high' | 'critical') => {
    return insights.filter(i => i.priority === priority);
  }, [insights]);

  const getCriticalInsights = useCallback(() => {
    return insights.filter(i => i.priority === 'critical' || i.priority === 'high');
  }, [insights]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    // Connection state
    connection,
    activeChannels: Array.from(activeChannels),
    
    // Connection management
    connect,
    disconnect,
    
    // Channel subscription
    subscribeToChannel,
    unsubscribeFromChannel,
    subscribeToRecording,
    unsubscribeFromRecording,
    subscribeToTestValidation,
    unsubscribeFromTestValidation,
    subscribeToConversation,
    unsubscribeFromConversation,
    subscribeToHealing,
    unsubscribeFromHealing,
    
    // Data access
    recordingFeedback,
    testValidation,
    insights,
    getLatestRecordingFeedback,
    getLatestTestValidation,
    getInsightsByPriority,
    getCriticalInsights,
    
    // Utilities
    clearFeedback,
    clearInsights
  };
};