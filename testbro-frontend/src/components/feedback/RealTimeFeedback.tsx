import React, { useEffect, useState, useCallback } from 'react';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Lightbulb,
  TrendingUp,
  Wifi,
  WifiOff,
  X,
  Eye,
  Zap,
  Target,
  MessageCircle,
  Bell,
  BellOff
} from 'lucide-react';
import { useRealTimeEvents } from '../../hooks/useRealTimeEvents';
import { motion, AnimatePresence } from 'framer-motion';

interface RealTimeFeedbackProps {
  recordingId?: string;
  testId?: string;
  conversationId?: string;
  healingSessionId?: string;
  isVisible: boolean;
  onToggleVisibility: () => void;
  className?: string;
}

interface FeedbackStats {
  totalSteps: number;
  averageConfidence: number;
  criticalIssues: number;
  suggestions: number;
}

export const RealTimeFeedback: React.FC<RealTimeFeedbackProps> = ({
  recordingId,
  testId,
  conversationId,
  healingSessionId,
  isVisible,
  onToggleVisibility,
  className = ''
}) => {
  const {
    connection,
    recordingFeedback,
    testValidation,
    insights,
    subscribeToRecording,
    unsubscribeFromRecording,
    subscribeToTestValidation,
    unsubscribeFromTestValidation,
    subscribeToConversation,
    unsubscribeFromConversation,
    subscribeToHealing,
    unsubscribeFromHealing,
    getLatestRecordingFeedback,
    getLatestTestValidation,
    getCriticalInsights,
    clearInsights,
    connect
  } = useRealTimeEvents();

  const [stats, setStats] = useState<FeedbackStats>({
    totalSteps: 0,
    averageConfidence: 0,
    criticalIssues: 0,
    suggestions: 0
  });
  
  const [dismissedInsights, setDismissedInsights] = useState<Set<string>>(new Set());
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Subscribe to relevant channels
  useEffect(() => {
    if (!connection.isConnected) {
      connect();
      return;
    }

    if (recordingId) {
      subscribeToRecording(recordingId);
      return () => unsubscribeFromRecording(recordingId);
    }
  }, [recordingId, connection.isConnected, subscribeToRecording, unsubscribeFromRecording, connect]);

  useEffect(() => {
    if (!connection.isConnected) return;

    if (testId) {
      subscribeToTestValidation(testId);
      return () => unsubscribeFromTestValidation(testId);
    }
  }, [testId, connection.isConnected, subscribeToTestValidation, unsubscribeFromTestValidation]);

  useEffect(() => {
    if (!connection.isConnected) return;

    if (conversationId) {
      subscribeToConversation(conversationId);
      return () => unsubscribeFromConversation(conversationId);
    }
  }, [conversationId, connection.isConnected, subscribeToConversation, unsubscribeFromConversation]);

  useEffect(() => {
    if (!connection.isConnected) return;

    if (healingSessionId) {
      subscribeToHealing(healingSessionId);
      return () => unsubscribeFromHealing(healingSessionId);
    }
  }, [healingSessionId, connection.isConnected, subscribeToHealing, unsubscribeFromHealing]);

  // Calculate stats
  useEffect(() => {
    let totalSteps = 0;
    let totalConfidence = 0;
    let criticalIssues = 0;
    let suggestions = 0;

    if (recordingId) {
      const feedback = getLatestRecordingFeedback(recordingId);
      totalSteps = feedback.filter(f => f.type === 'step_captured').length;
      
      feedback.forEach(f => {
        if (f.data.confidence !== undefined) {
          totalConfidence += f.data.confidence;
        }
        if (f.data.suggestions) {
          suggestions += f.data.suggestions.length;
        }
      });
    }

    if (testId) {
      const validation = getLatestTestValidation(testId);
      validation.forEach(v => {
        if (v.data.validation_result) {
          if (!v.data.validation_result.success) {
            criticalIssues++;
          }
          if (v.data.validation_result.suggestions) {
            suggestions += v.data.validation_result.suggestions.length;
          }
        }
      });
    }

    // Count critical insights
    criticalIssues += getCriticalInsights().length;

    setStats({
      totalSteps,
      averageConfidence: totalSteps > 0 ? totalConfidence / totalSteps : 0,
      criticalIssues,
      suggestions
    });
  }, [recordingFeedback, testValidation, insights, recordingId, testId, getLatestRecordingFeedback, getLatestTestValidation, getCriticalInsights]);

  // Play notification sound for critical issues
  useEffect(() => {
    if (soundEnabled && getCriticalInsights().length > 0) {
      // Play notification sound (you can implement this with Web Audio API or audio element)
      console.log('🔔 Critical insight received');
    }
  }, [getCriticalInsights().length, soundEnabled]);

  const handleDismissInsight = useCallback((insightTitle: string) => {
    setDismissedInsights(prev => new Set(prev).add(insightTitle));
  }, []);

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'performance_metric': return <TrendingUp className="w-4 h-4" />;
      case 'best_practice_suggestion': return <Lightbulb className="w-4 h-4" />;
      case 'optimization_tip': return <Target className="w-4 h-4" />;
      case 'error_pattern': return <AlertCircle className="w-4 h-4" />;
      case 'success_feedback': return <CheckCircle className="w-4 h-4" />;
      default: return <Eye className="w-4 h-4" />;
    }
  };

  const getInsightColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-50 border-red-200 text-red-800';
      case 'high': return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'medium': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'low': return 'bg-blue-50 border-blue-200 text-blue-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const visibleInsights = insights.filter(insight => !dismissedInsights.has(insight.title));

  if (!isVisible) {
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className={`fixed bottom-6 right-6 z-40 ${className}`}
      >
        <button
          onClick={onToggleVisibility}
          className="bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors relative"
        >
          <MessageCircle className="w-6 h-6" />
          {stats.criticalIssues > 0 && (
            <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
              {stats.criticalIssues}
            </div>
          )}
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className={`fixed top-20 right-6 w-96 max-h-[80vh] bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-40 ${className}`}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-2 h-2 rounded-full ${connection.isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
            <div>
              <h3 className="font-semibold">Real-Time Feedback</h3>
              <p className="text-xs opacity-90">
                {connection.isConnected ? 'Connected' : 'Disconnected'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-1 rounded hover:bg-white hover:bg-opacity-20"
            >
              {soundEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            </button>
            <button
              onClick={onToggleVisibility}
              className="p-1 rounded hover:bg-white hover:bg-opacity-20"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
          <div className="bg-white bg-opacity-20 rounded p-2">
            <div className="font-medium">Steps</div>
            <div className="text-lg font-bold">{stats.totalSteps}</div>
          </div>
          <div className="bg-white bg-opacity-20 rounded p-2">
            <div className="font-medium">Confidence</div>
            <div className="text-lg font-bold">{Math.round(stats.averageConfidence * 100)}%</div>
          </div>
          <div className="bg-white bg-opacity-20 rounded p-2">
            <div className="font-medium">Issues</div>
            <div className="text-lg font-bold text-red-200">{stats.criticalIssues}</div>
          </div>
          <div className="bg-white bg-opacity-20 rounded p-2">
            <div className="font-medium">Tips</div>
            <div className="text-lg font-bold text-green-200">{stats.suggestions}</div>
          </div>
        </div>
      </div>

      {/* Connection Status */}
      {!connection.isConnected && (
        <div className="bg-red-50 border-b border-red-200 p-3">
          <div className="flex items-center space-x-2 text-red-700">
            <WifiOff className="w-4 h-4" />
            <span className="text-sm font-medium">Connection Lost</span>
          </div>
          <p className="text-xs text-red-600 mt-1">
            Attempting to reconnect... (attempt {connection.reconnectAttempts})
          </p>
        </div>
      )}

      {/* Insights Feed */}
      <div className="flex-1 overflow-y-auto max-h-96">
        <AnimatePresence>
          {visibleInsights.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No insights yet</p>
              <p className="text-xs">Start recording or validating tests to see real-time feedback</p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {visibleInsights.slice(0, 10).map((insight, index) => (
                <motion.div
                  key={`${insight.title}-${index}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 300 }}
                  className={`p-3 rounded-lg border ${getInsightColor(insight.priority)} relative`}
                >
                  <button
                    onClick={() => handleDismissInsight(insight.title)}
                    className="absolute top-2 right-2 p-1 rounded hover:bg-black hover:bg-opacity-10"
                  >
                    <X className="w-3 h-3" />
                  </button>

                  <div className="flex items-start space-x-3 pr-6">
                    <div className="flex-shrink-0 mt-0.5">
                      {getInsightIcon(insight.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium text-sm">{insight.title}</h4>
                        <span className={`inline-block w-2 h-2 rounded-full ${
                          insight.priority === 'critical' ? 'bg-red-500' :
                          insight.priority === 'high' ? 'bg-orange-500' :
                          insight.priority === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                        }`} />
                      </div>
                      
                      <p className="text-xs mb-2 opacity-90">{insight.message}</p>
                      
                      {insight.suggested_actions && insight.suggested_actions.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium">Suggestions:</p>
                          <ul className="text-xs space-y-1">
                            {insight.suggested_actions.slice(0, 3).map((action, actionIndex) => (
                              <li key={actionIndex} className="flex items-start space-x-1">
                                <span className="text-xs opacity-60">•</span>
                                <span>{action}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {insight.action_required && (
                        <div className="mt-2 pt-2 border-t border-current border-opacity-20">
                          <div className="flex items-center space-x-1 text-xs font-medium">
                            <Zap className="w-3 h-3" />
                            <span>Action Required</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Action Bar */}
      <div className="border-t border-gray-200 p-3 bg-gray-50">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center space-x-2">
            {connection.isConnected ? (
              <Wifi className="w-4 h-4 text-green-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-500" />
            )}
            <span>Live Updates</span>
          </div>
          
          <button
            onClick={clearInsights}
            className="text-gray-500 hover:text-gray-700"
          >
            Clear All
          </button>
        </div>
      </div>
    </motion.div>
  );
};