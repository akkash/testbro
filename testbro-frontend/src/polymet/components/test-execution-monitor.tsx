import React, { useState, useEffect } from "react";
import {
  Play,
  Pause,
  Square,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Monitor,
  Smartphone,
  Globe,
  Activity,
  Eye,
  Download,
  RefreshCw,
  Zap,
  Bot,
  Image as ImageIcon,
  FileText,
  Terminal,
  Video,
  PlayCircle,
  Maximize2,
  Wifi,
  WifiOff,
} from "lucide-react";
import BrowserAutomationPlayer from "@/polymet/components/browser-automation-player";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { ExecutionService } from "@/lib/services/executionService";
import { useWebSocket, useExecutionWebSocket } from "@/hooks/useWebSocket";

const ExecutionCard = ({ 
  execution, 
  isSelected = false, 
  realTimeProgress = null,
  realTimeSteps = [],
  onClick 
}: { 
  execution: any;
  isSelected?: boolean;
  realTimeProgress?: any;
  realTimeSteps?: any[];
  onClick?: () => void;
}) => {
  const [progress, setProgress] = useState(0);
  const [isRunning, setIsRunning] = useState(execution.status === "running");

  // Use real-time progress if available
  useEffect(() => {
    if (realTimeProgress && isSelected) {
      setProgress(realTimeProgress.progress || 0);
      setIsRunning(execution.status === "running");
    } else if (isRunning && !isSelected) {
      // Simulate progress for non-selected running executions
      const interval = setInterval(() => {
        setProgress((prev) => {
          const newProgress = prev + Math.random() * 10;
          if (newProgress >= 100) {
            setIsRunning(false);
            return 100;
          }
          return newProgress;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isRunning, isSelected, realTimeProgress, execution.status]);

  const statusConfig = {
    running: {
      color: "bg-blue-100 text-blue-800",
      icon: Play,
      bgColor: "bg-blue-50",
    },
    passed: {
      color: "bg-green-100 text-green-800",
      icon: CheckCircle,
      bgColor: "bg-green-50",
    },
    failed: {
      color: "bg-red-100 text-red-800",
      icon: XCircle,
      bgColor: "bg-red-50",
    },
    cancelled: {
      color: "bg-gray-100 text-gray-800",
      icon: Square,
      bgColor: "bg-gray-50",
    },
  };

  const config = statusConfig[execution.status as keyof typeof statusConfig] || statusConfig.cancelled;
  const StatusIcon = config.icon;

  const deviceIcon = execution.browser?.includes("Mobile") || execution.environment?.includes("mobile") ? Smartphone : Monitor;
  const DeviceIcon = deviceIcon;

  return (
    <Card
      className={`${config.bgColor} border-l-4 cursor-pointer transition-all duration-200 ${
        execution.status === "running" 
          ? "border-l-blue-500" 
          : execution.status === "passed" 
          ? "border-l-green-500" 
          : execution.status === "failed" 
          ? "border-l-red-500" 
          : "border-l-gray-500"
      } ${
        isSelected ? "ring-2 ring-blue-500 shadow-md" : "hover:shadow-sm"
      }`}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <StatusIcon className="w-5 h-5" />
            <div>
              <CardTitle className="text-lg">
                Test Case #{execution.test_case_id?.slice(-6) || execution.id.slice(-6)}
              </CardTitle>
              <CardDescription className="flex items-center space-x-2 mt-1">
                <DeviceIcon className="w-4 h-4" />
                <span>{execution.browser || 'Unknown Browser'}</span>
                <span>•</span>
                <span>{execution.environment || 'Unknown Environment'}</span>
              </CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className={config.color}>
            {execution.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Progress Bar for Running Tests */}
          {(isRunning || (realTimeProgress && isSelected)) && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Progress</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">
                    {Math.round(realTimeProgress?.progress || progress)}%
                  </span>
                  {isSelected && realTimeProgress && (
                    <Badge variant="outline" className="text-xs animate-pulse">
                      Live
                    </Badge>
                  )}
                </div>
              </div>
              <Progress value={realTimeProgress?.progress || progress} className="h-2" />
              {realTimeProgress?.current_step && (
                <p className="text-xs text-gray-600 mt-1">
                  Current: {realTimeProgress.current_step}
                </p>
              )}
            </div>
          )}

          {/* Execution Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Start Time:</span>
              <p className="font-medium">
                {execution.started_at 
                  ? new Date(execution.started_at).toLocaleTimeString()
                  : 'Not started'
                }
              </p>
            </div>
            {execution.completed_at && execution.duration_seconds && (
              <div>
                <span className="text-gray-500">Duration:</span>
                <p className="font-medium">
                  {Math.round(execution.duration_seconds / 60)}m{" "}
                  {execution.duration_seconds % 60}s
                </p>
              </div>
            )}
            {execution.metrics?.responseTime && (
              <div>
                <span className="text-gray-500">Response Time:</span>
                <p className="font-medium">{execution.metrics.responseTime}ms</p>
              </div>
            )}
            {execution.metrics?.stabilityScore && (
              <div>
                <span className="text-gray-500">Stability Score:</span>
                <p className="font-medium">{execution.metrics.stabilityScore}%</p>
              </div>
            )}
          </div>

          {/* AI Insights */}
          {execution.metrics?.uxScore && (
            <div className="bg-white border border-purple-200 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <Bot className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-800">
                  AI Insights
                </span>
                <Badge variant="outline" className="text-xs">
                  UX Score: {execution.metrics.uxScore}/100
                </Badge>
              </div>
              <p className="text-xs text-purple-700">
                {execution.metrics.uxScore >= 90
                  ? "Excellent user experience detected"
                  : execution.metrics.uxScore >= 70
                  ? "Good user experience with minor improvements possible"
                  : execution.metrics.uxScore >= 50
                  ? "Fair user experience with some issues detected"
                  : "Poor user experience with critical issues requiring attention"}
              </p>
            </div>
          )}

          {/* Error Message */}
          {execution.error_message && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-1">
                <XCircle className="w-4 h-4 text-red-600" />
                <span className="text-sm font-medium text-red-800">
                  Error Details
                </span>
              </div>
              <p className="text-xs text-red-700">{execution.error_message}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 pt-2">
            <Button variant="outline" size="sm">
              <Eye className="w-4 h-4 mr-2" />
              View Details
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Report
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface ExecutionMonitorProps {
  projectId?: string;
  targetId?: string;
  refreshInterval?: number;
}

export default function TestExecutionMonitor({ 
  projectId, 
  targetId,
  refreshInterval = 5000 
}: ExecutionMonitorProps = {}) {
  const { isAuthenticated } = useAuth();
  const [executions, setExecutions] = useState<any[]>([]);
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // WebSocket connection
  const { connectionState } = useWebSocket();
  
  // Real-time execution data for selected execution
  const {
    executionData: realTimeExecution,
    progress: realTimeProgress,
    steps: realTimeSteps,
    logs: realTimeLogs,
    isComplete: realTimeComplete,
    error: realTimeError
  } = useExecutionWebSocket(selectedExecutionId);

  const loadExecutions = async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const { data, error: execError } = await ExecutionService.listExecutions({
        project_id: projectId,
        limit: 20,
        sort_by: 'started_at',
        sort_order: 'desc'
      });

      if (execError) {
        setError(execError);
      } else {
        setExecutions(data || []);
        
        // Auto-select the first running execution for real-time monitoring
        const runningExecution = (data || []).find((exec: any) => exec.status === 'running');
        if (runningExecution && !selectedExecutionId) {
          setSelectedExecutionId(runningExecution.id);
        }
      }
    } catch (err) {
      console.error('Failed to load executions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load executions');
    } finally {
      setLoading(false);
    }
  };

  // Update executions with real-time data
  useEffect(() => {
    if (realTimeExecution && selectedExecutionId) {
      setExecutions(prev => prev.map(exec => 
        exec.id === selectedExecutionId 
          ? { ...exec, ...realTimeExecution, logs: realTimeLogs }
          : exec
      ));
    }
  }, [realTimeExecution, realTimeLogs, selectedExecutionId]);

  useEffect(() => {
    loadExecutions();
    
    // Set up polling for real-time updates
    const interval = setInterval(loadExecutions, refreshInterval);
    return () => clearInterval(interval);
  }, [isAuthenticated, projectId, targetId, refreshInterval]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span className="text-gray-600">Loading executions...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Error Loading Executions
          </h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <Button onClick={loadExecutions}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const runningExecutions = executions.filter((exec: any) => exec.status === "running");
  const completedExecutions = executions.filter((exec: any) => exec.status !== "running");
  
  // Use real-time logs if available, otherwise use execution logs
  const recentLogs = selectedExecutionId && realTimeLogs.length > 0 
    ? realTimeLogs.slice(-50).reverse()
    : executions
        .flatMap((exec: any) => exec.logs || [])
        .sort(
          (a: any, b: any) =>
            new Date(b.timestamp || b.created_at).getTime() - new Date(a.timestamp || a.created_at).getTime()
        )
        .slice(0, 50);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Test Execution Monitor
        </h2>
        <div className="flex items-center space-x-2">
          {/* WebSocket Connection Status */}
          <div className="flex items-center space-x-2">
            {connectionState.connected ? (
              <>
                <Wifi className="w-4 h-4 text-green-600" />
                <Badge variant="outline" className="text-green-700 border-green-300">
                  Live Connected
                </Badge>
              </>
            ) : connectionState.connecting ? (
              <>
                <RefreshCw className="w-4 h-4 text-yellow-600 animate-spin" />
                <Badge variant="outline" className="text-yellow-700 border-yellow-300">
                  Connecting...
                </Badge>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-red-600" />
                <Badge variant="outline" className="text-red-700 border-red-300">
                  Disconnected
                </Badge>
              </>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={loadExecutions}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {executions.length === 0 ? (
        <div className="text-center py-12">
          <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No executions found
          </h3>
          <p className="text-gray-500">
            No test executions are currently running or available.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {executions.slice(0, 5).map((execution: any) => (
            <ExecutionCard 
              key={execution.id} 
              execution={execution}
              isSelected={execution.id === selectedExecutionId}
              realTimeProgress={execution.id === selectedExecutionId ? realTimeProgress : null}
              realTimeSteps={execution.id === selectedExecutionId ? realTimeSteps : []}
              onClick={() => setSelectedExecutionId(execution.id)}
            />
          ))}
        </div>
      )}

      <Tabs defaultValue="running" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="running">
            Running ({runningExecutions.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedExecutions.length})
          </TabsTrigger>
          <TabsTrigger value="logs">Logs ({recentLogs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="running" className="space-y-4">
          {runningExecutions.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No running executions
                </h3>
                <p className="text-gray-500">
                  All tests have completed or no tests are currently running.
                </p>
                {!connectionState.connected && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center justify-center space-x-2">
                      <WifiOff className="w-4 h-4 text-yellow-600" />
                      <span className="text-sm text-yellow-700">
                        Real-time updates unavailable - WebSocket disconnected
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {runningExecutions.map((execution: any) => (
                <ExecutionCard 
                  key={execution.id} 
                  execution={execution}
                  isSelected={execution.id === selectedExecutionId}
                  realTimeProgress={execution.id === selectedExecutionId ? realTimeProgress : null}
                  realTimeSteps={execution.id === selectedExecutionId ? realTimeSteps : []}
                  onClick={() => setSelectedExecutionId(execution.id)}
                />
              ))}
              {connectionState.connected && runningExecutions.length > 0 && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Wifi className="w-4 h-4 text-green-600 animate-pulse" />
                    <span className="text-sm text-green-700 font-medium">
                      Real-time monitoring active
                    </span>
                    <Badge variant="outline" className="text-xs text-green-700">
                      {runningExecutions.length} live execution{runningExecutions.length > 1 ? 's' : ''}
                    </Badge>
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <div className="space-y-4">
            {completedExecutions.map((execution: any) => (
              <ExecutionCard 
                key={execution.id} 
                execution={execution}
                isSelected={execution.id === selectedExecutionId}
                onClick={() => setSelectedExecutionId(execution.id)}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Real-time Execution Logs</CardTitle>
                  <CardDescription>
                    Live logs from test executions via WebSocket
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  {connectionState.connected ? (
                    <Badge variant="outline" className="text-green-700 border-green-300">
                      <Wifi className="w-3 h-3 mr-1" />
                      Live Feed
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-red-700 border-red-300">
                      <WifiOff className="w-3 h-3 mr-1" />
                      Static Logs
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {recentLogs.map((log: any, index: number) => {
                    const isRealTime = selectedExecutionId && realTimeLogs.includes(log);
                    return (
                      <div 
                        key={index} 
                        className={`text-sm font-mono p-3 rounded border-l-2 ${
                          isRealTime ? 'bg-green-50 border-l-green-400 animate-pulse' : 'bg-gray-50 border-l-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-gray-500 text-xs">
                            [{new Date(log.timestamp || log.created_at).toLocaleTimeString()}]
                          </span>
                          {isRealTime && (
                            <Badge variant="outline" className="text-xs text-green-700">
                              Live
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-start space-x-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            log.level === 'error' ? 'bg-red-100 text-red-800' : 
                            log.level === 'warn' ? 'bg-yellow-100 text-yellow-800' : 
                            log.level === 'info' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {(log.level || 'info').toUpperCase()}
                          </span>
                          <span className={`flex-1 ${
                            log.level === 'error' ? 'text-red-700' : 
                            log.level === 'warn' ? 'text-yellow-700' : 
                            'text-gray-900'
                          }`}>
                            {log.message || log.content || 'No message'}
                          </span>
                        </div>
                        {log.step_id && (
                          <div className="mt-1 text-xs text-gray-500">
                            Step: {log.step_id}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {recentLogs.length === 0 && (
                    <div className="text-center py-8">
                      <Terminal className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">
                        {connectionState.connected ? 'Waiting for logs...' : 'No logs available'}
                      </p>
                      {!connectionState.connected && (
                        <p className="text-gray-400 text-xs mt-1">
                          Connect to WebSocket for real-time logs
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}