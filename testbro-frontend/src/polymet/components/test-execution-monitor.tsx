import React, { useState, useEffect } from "react";
import {
  Play,
  Pause,
  Clock,
  CheckCircle,
  XCircle,
  Monitor,
  Activity,
  RefreshCw,
  Zap,
  Bot,
  Video,
  PlayCircle,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
} from "lucide-react";

// Custom icon components for missing icons
const Square = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6h12v12H6z" />
  </svg>
);

const Wifi = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
  </svg>
);

const WifiOff = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39m3.64 2.39a6.95 6.95 0 00-2.17-.98m-2.17.98a6.95 6.95 0 00-2.17.98M9 16a5 5 0 011.78-.89L12 16l1.22-.89A5 5 0 0115 16M15 16a5 5 0 00-1.22-.89L12 16l-1.22-.89A5 5 0 009 16" />
  </svg>
);

const AlertCircle = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const Smartphone = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a1 1 0 001-1V4a1 1 0 00-1-1H8a1 1 0 00-1 1v16a1 1 0 001 1z" />
  </svg>
);

const Globe = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
  </svg>
);

const Eye = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const Download = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const ImageIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const FileText = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const Terminal = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v14a1 1 0 001 1z" />
  </svg>
);

const Maximize2 = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
  </svg>
);

const Filter = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
  </svg>
);

const Calendar = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const Layers = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
);

const Settings = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const Mail = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const MessageSquare = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const Webhook = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const Bell = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);

const BarChart3 = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const ExternalLink = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

const Database = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <ellipse cx="12" cy="5" rx="9" ry="3"/>
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </svg>
);
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

interface FlakyTest {
  testCaseId: string;
  testCaseName: string;
  failureRate: number;
  totalRuns: number;
  failures: number;
  avgDuration: number;
  environments: string[];
  lastFailure: string;
  pattern: string;
}

interface AlertingConfig {
  enabled: boolean;
  channels: {
    email: {
      enabled: boolean;
      recipients: string[];
    };
    slack: {
      enabled: boolean;
      webhookUrl: string;
      channel: string;
    };
    webhook: {
      enabled: boolean;
      url: string;
      headers: Record<string, string>;
    };
  };
  triggers: {
    onFailure: boolean;
    onConsecutiveFailures: number;
    onFlakyTest: boolean;
    onPerformanceDegradation: boolean;
  };
}
// Enhanced Timeline Component with detailed execution history
const ExecutionTimeline = ({ executions, onSelectExecution }: { executions: any[], onSelectExecution: (id: string) => void }) => {
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');
  const [statusFilter, setStatusFilter] = useState<'all' | 'passed' | 'failed' | 'running'>('all');

  // Filter executions based on time range and status
  const filteredExecutions = executions.filter((execution) => {
    const executionDate = new Date(execution.started_at || execution.created_at);
    const now = new Date();
    const timeDiff = now.getTime() - executionDate.getTime();
    
    let timeMatch = false;
    switch (timeRange) {
      case '24h':
        timeMatch = timeDiff <= 24 * 60 * 60 * 1000;
        break;
      case '7d':
        timeMatch = timeDiff <= 7 * 24 * 60 * 60 * 1000;
        break;
      case '30d':
        timeMatch = timeDiff <= 30 * 24 * 60 * 60 * 1000;
        break;
      default:
        timeMatch = true;
    }
    
    const statusMatch = statusFilter === 'all' || execution.status === statusFilter;
    return timeMatch && statusMatch;
  }).slice(0, 20); // Show last 20 matching executions

  // Calculate success rate for the filtered period
  const successRate = filteredExecutions.length > 0 
    ? (filteredExecutions.filter(e => e.status === 'passed').length / filteredExecutions.length) * 100 
    : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <span className="font-semibold">Execution Timeline</span>
            <Badge variant="outline" className="text-xs">
              {filteredExecutions.length} runs
            </Badge>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Time Range Filter */}
            <div className="flex items-center border rounded-lg">
              {(['24h', '7d', '30d'] as const).map((range) => (
                <Button
                  key={range}
                  variant={timeRange === range ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setTimeRange(range)}
                  className="text-xs px-2 rounded-none first:rounded-l-lg last:rounded-r-lg"
                >
                  {range}
                </Button>
              ))}
            </div>
            
            {/* Status Filter */}
            <div className="flex items-center border rounded-lg">
              {(['all', 'passed', 'failed', 'running'] as const).map((status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setStatusFilter(status)}
                  className="text-xs px-2 rounded-none first:rounded-l-lg last:rounded-r-lg capitalize"
                >
                  {status}
                </Button>
              ))}
            </div>
          </div>
        </div>
        
        <CardDescription className="flex items-center justify-between">
          <span>Chronological view of recent test executions</span>
          <div className="flex items-center space-x-4 text-sm">
            <span>Success Rate: <span className={`font-medium ${
              successRate >= 90 ? 'text-green-600' : 
              successRate >= 70 ? 'text-yellow-600' : 'text-red-600'
            }`}>{successRate.toFixed(1)}%</span></span>
            <span>Avg Duration: <span className="font-medium">
              {filteredExecutions.length > 0 
                ? Math.round(filteredExecutions.reduce((acc, e) => acc + (e.duration_seconds || 0), 0) / filteredExecutions.length / 60) + 'm'
                : 'N/A'
              }
            </span></span>
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {filteredExecutions.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Executions Found</h3>
            <p className="text-gray-500">No executions found for the selected time range and filters.</p>
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-4">
              {filteredExecutions.map((execution, index) => {
                const statusConfig = {
                  running: { color: "bg-blue-500", icon: Play, textColor: "text-blue-700", bgColor: "bg-blue-50" },
                  passed: { color: "bg-green-500", icon: CheckCircle, textColor: "text-green-700", bgColor: "bg-green-50" },
                  failed: { color: "bg-red-500", icon: XCircle, textColor: "text-red-700", bgColor: "bg-red-50" },
                  cancelled: { color: "bg-gray-500", icon: Square, textColor: "text-gray-700", bgColor: "bg-gray-50" },
                };

                const config = statusConfig[execution.status as keyof typeof statusConfig] || statusConfig.cancelled;
                const StatusIcon = config.icon;

                const executionDate = new Date(execution.started_at || execution.created_at);
                const isToday = executionDate.toDateString() === new Date().toDateString();

                return (
                  <div key={execution.id} className="flex items-start space-x-4 relative group">
                    {/* Timeline line */}
                    {index < filteredExecutions.length - 1 && (
                      <div className="absolute left-6 top-12 w-0.5 h-16 bg-gray-200"></div>
                    )}

                    {/* Status indicator */}
                    <div className={`flex-shrink-0 w-12 h-12 rounded-full border-4 border-white shadow-md flex items-center justify-center ${config.color} group-hover:shadow-lg transition-shadow`}>
                      <StatusIcon className="w-5 h-5 text-white" />
                    </div>

                    {/* Content */}
                    <div className={`flex-1 pb-8 p-4 rounded-lg border transition-colors group-hover:shadow-sm ${config.bgColor}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-medium text-gray-900">
                            Test Case #{execution.test_case_id?.slice(-6) || execution.id.slice(-6)}
                          </h4>
                          <Badge variant="outline" className={`text-xs ${config.textColor}`}>
                            {execution.status}
                          </Badge>
                          {execution.environment && (
                            <Badge variant="outline" className="text-xs">
                              {execution.environment}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          {isToday ? (
                            <span>{executionDate.toLocaleTimeString()}</span>
                          ) : (
                            <span>{executionDate.toLocaleDateString()} {executionDate.toLocaleTimeString()}</span>
                          )}
                          {execution.duration_seconds && (
                            <span>• {Math.round(execution.duration_seconds / 60)}m {execution.duration_seconds % 60}s</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-4 text-xs text-gray-600 mb-3">
                        <span className="flex items-center">
                          <Monitor className="w-3 h-3 mr-1" />
                          {execution.browser || 'Unknown'}
                        </span>
                        <span className="flex items-center">
                          <Globe className="w-3 h-3 mr-1" />
                          {execution.environment || 'Unknown'}
                        </span>
                        {execution.metrics?.stabilityScore && (
                          <span className="flex items-center">
                            <Target className="w-3 h-3 mr-1" />
                            Stability: {execution.metrics.stabilityScore}%
                          </span>
                        )}
                      </div>

                      {/* Performance metrics summary */}
                      {execution.metrics && (
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          {execution.metrics.responseTime && (
                            <div className="text-center p-2 bg-white rounded border">
                              <div className="text-xs font-medium text-gray-900">{execution.metrics.responseTime}ms</div>
                              <div className="text-xs text-gray-500">Response</div>
                            </div>
                          )}
                          {execution.metrics.page_load_time && (
                            <div className="text-center p-2 bg-white rounded border">
                              <div className="text-xs font-medium text-gray-900">{execution.metrics.page_load_time}ms</div>
                              <div className="text-xs text-gray-500">Load Time</div>
                            </div>
                          )}
                          {execution.results?.length && (
                            <div className="text-center p-2 bg-white rounded border">
                              <div className="text-xs font-medium text-gray-900">{execution.results.length}</div>
                              <div className="text-xs text-gray-500">Steps</div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Error message for failed executions */}
                      {execution.status === 'failed' && execution.error_message && (
                        <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 mb-2">
                          <div className="flex items-start space-x-1">
                            <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            <span className="line-clamp-2">{execution.error_message}</span>
                          </div>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {execution.status === 'running' && (
                            <Badge variant="outline" className="text-xs animate-pulse">
                              <div className="w-2 h-2 bg-blue-500 rounded-full mr-1 animate-pulse" />
                              Live
                            </Badge>
                          )}
                          {execution.suite_id && (
                            <Badge variant="outline" className="text-xs">
                              <Layers className="w-3 h-3 mr-1" />
                              Suite
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onSelectExecution(execution.id)}
                          className="flex-shrink-0 text-xs"
                        >
                          View Details
                          <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

// Flaky Test Detection Component
const FlakyTestsSection = ({ executions }: { executions: any[] }) => {
  const [showFlakyTests, setShowFlakyTests] = useState(false);
  
  // Calculate flaky tests from execution history
  const detectFlakyTests = (): FlakyTest[] => {
    const testCaseStats: Record<string, {
      totalRuns: number;
      failures: number;
      durations: number[];
      environments: Set<string>;
      lastFailure?: string;
      consecutivePatterns: string[];
    }> = {};

    // Analyze execution history
    executions.forEach(execution => {
      const testId = execution.test_case_id || execution.id;
      if (!testCaseStats[testId]) {
        testCaseStats[testId] = {
          totalRuns: 0,
          failures: 0,
          durations: [],
          environments: new Set(),
          consecutivePatterns: []
        };
      }

      const stats = testCaseStats[testId];
      stats.totalRuns++;
      stats.environments.add(execution.environment || 'unknown');
      
      if (execution.duration_seconds) {
        stats.durations.push(execution.duration_seconds);
      }

      if (execution.status === 'failed') {
        stats.failures++;
        stats.lastFailure = execution.started_at || execution.created_at;
      }

      // Track consecutive status pattern
      stats.consecutivePatterns.push(execution.status);
      if (stats.consecutivePatterns.length > 10) {
        stats.consecutivePatterns = stats.consecutivePatterns.slice(-10);
      }
    });

    // Identify flaky tests (failure rate between 10-90% with multiple runs)
    const flakyTests: FlakyTest[] = [];
    Object.entries(testCaseStats).forEach(([testId, stats]) => {
      if (stats.totalRuns < 3) return; // Need at least 3 runs
      
      const failureRate = (stats.failures / stats.totalRuns) * 100;
      const avgDuration = stats.durations.length > 0 
        ? stats.durations.reduce((a, b) => a + b, 0) / stats.durations.length 
        : 0;
      
      // Consider flaky if failure rate is between 10-90% OR has inconsistent patterns
      const hasInconsistentPattern = stats.consecutivePatterns.length >= 5 && 
        new Set(stats.consecutivePatterns.slice(-5)).size > 1;
      
      if ((failureRate >= 10 && failureRate <= 90) || hasInconsistentPattern) {
        // Determine pattern type
        let pattern = 'Intermittent failures';
        if (failureRate > 60) pattern = 'Frequently failing';
        else if (failureRate < 25) pattern = 'Occasional failures';
        else if (hasInconsistentPattern) pattern = 'Inconsistent behavior';
        
        flakyTests.push({
          testCaseId: testId,
          testCaseName: `Test Case #${testId.slice(-6)}`,
          failureRate,
          totalRuns: stats.totalRuns,
          failures: stats.failures,
          avgDuration,
          environments: Array.from(stats.environments),
          lastFailure: stats.lastFailure || '',
          pattern
        });
      }
    });

    return flakyTests.sort((a, b) => b.failureRate - a.failureRate).slice(0, 10);
  };

  const flakyTests = detectFlakyTests();

  if (flakyTests.length === 0 && !showFlakyTests) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-green-600" />
              <CardTitle className="text-lg">Test Stability</CardTitle>
              <Badge variant="outline" className="text-green-700 bg-green-50">
                Stable
              </Badge>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowFlakyTests(!showFlakyTests)}>
              <Database className="w-4 h-4 mr-2" />
              Analyze
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Flaky Tests Detected</h3>
            <p className="text-gray-500 mb-4">
              All tests show consistent behavior with stable pass/fail patterns.
            </p>
            <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
              <div className="text-center">
                <div className="text-xl font-bold text-green-600">
                  {Math.round((executions.filter(e => e.status === 'passed').length / executions.length) * 100) || 0}%
                </div>
                <div className="text-xs text-gray-600">Success Rate</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-blue-600">{executions.length}</div>
                <div className="text-xs text-gray-600">Total Runs</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-purple-600">
                  {new Set(executions.map(e => e.test_case_id)).size}
                </div>
                <div className="text-xs text-gray-600">Test Cases</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <CardTitle className="text-lg">Flaky Tests Detection</CardTitle>
            <Badge variant="destructive" className="animate-pulse">
              {flakyTests.length} Issues
            </Badge>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowFlakyTests(!showFlakyTests)}>
            {showFlakyTests ? 'Hide Details' : 'Show Details'}
          </Button>
        </div>
        <CardDescription>
          Tests showing inconsistent behavior that may impact reliability
        </CardDescription>
      </CardHeader>
      <CardContent>
        {showFlakyTests && (
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-800">Flaky Test Alert</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    These tests show inconsistent behavior and may need attention. 
                    Flaky tests can undermine confidence in your test suite and hide real issues.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              {flakyTests.map((test, index) => (
                <div key={test.testCaseId} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900">{test.testCaseName}</h4>
                      <p className="text-sm text-gray-600">{test.pattern}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-red-600">
                        {test.failureRate.toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-500">failure rate</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    <div className="text-center p-2 bg-white border rounded">
                      <div className="text-sm font-medium text-gray-900">{test.totalRuns}</div>
                      <div className="text-xs text-gray-500">Total Runs</div>
                    </div>
                    <div className="text-center p-2 bg-white border rounded">
                      <div className="text-sm font-medium text-red-600">{test.failures}</div>
                      <div className="text-xs text-gray-500">Failures</div>
                    </div>
                    <div className="text-center p-2 bg-white border rounded">
                      <div className="text-sm font-medium text-blue-600">{Math.round(test.avgDuration / 60)}m</div>
                      <div className="text-xs text-gray-500">Avg Duration</div>
                    </div>
                    <div className="text-center p-2 bg-white border rounded">
                      <div className="text-sm font-medium text-purple-600">{test.environments.length}</div>
                      <div className="text-xs text-gray-500">Environments</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-xs text-gray-600">
                      <span>Environments: {test.environments.join(', ')}</span>
                      {test.lastFailure && (
                        <span>• Last failure: {new Date(test.lastFailure).toLocaleDateString()}</span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button size="sm" variant="outline" className="text-xs">
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Investigate
                      </Button>
                      <Button size="sm" variant="outline" className="text-xs">
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Re-run
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface ExecutionMonitorProps {
  projectId?: string;
  targetId?: string;
  refreshInterval?: number;
}

interface FlakyTest {
  testCaseId: string;
  testCaseName: string;
  failureRate: number;
  totalRuns: number;
  failures: number;
  avgDuration: number;
  environments: string[];
  lastFailure: string;
  pattern: string;
}

interface AlertingConfig {
  enabled: boolean;
  channels: {
    email: {
      enabled: boolean;
      recipients: string[];
    };
    slack: {
      enabled: boolean;
      webhookUrl: string;
      channel: string;
    };
    webhook: {
      enabled: boolean;
      url: string;
      headers: Record<string, string>;
    };
  };
  triggers: {
    onFailure: boolean;
    onConsecutiveFailures: number;
    onFlakyTest: boolean;
    onPerformanceDegradation: boolean;
  };
}

// Alerting Configuration Component
const AlertingConfigSection = ({ config, onConfigUpdate }: { 
  config: AlertingConfig; 
  onConfigUpdate: (config: AlertingConfig) => void; 
}) => {
  const [showConfig, setShowConfig] = useState(false);
  const [tempConfig, setTempConfig] = useState<AlertingConfig>(config);

  const handleSave = () => {
    onConfigUpdate(tempConfig);
    setShowConfig(false);
  };

  const testAlert = async (channel: 'email' | 'slack' | 'webhook') => {
    // Mock test - in real app this would send actual test alerts
    console.log(`Testing ${channel} alert...`);
    alert(`Test ${channel} alert sent successfully!`);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className={`w-5 h-5 ${config.enabled ? 'text-green-600' : 'text-gray-400'}`} />
            <CardTitle className="text-lg">Alert Configuration</CardTitle>
            <Badge variant={config.enabled ? "default" : "outline"}>
              {config.enabled ? 'Active' : 'Disabled'}
            </Badge>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowConfig(!showConfig)}>
            <Settings className="w-4 h-4 mr-2" />
            {showConfig ? 'Hide Config' : 'Configure'}
          </Button>
        </div>
        <CardDescription>
          Set up notifications for test failures, flaky tests, and performance issues
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!config.enabled && !showConfig && (
          <div className="text-center py-8">
            <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Alerts Disabled</h3>
            <p className="text-gray-500 mb-4">
              Enable alerting to get notified about test failures and issues.
            </p>
            <Button onClick={() => setShowConfig(true)}>
              <Settings className="w-4 h-4 mr-2" />
              Set Up Alerts
            </Button>
          </div>
        )}

        {config.enabled && !showConfig && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Email Channel */}
              <div className={`p-4 border rounded-lg ${
                config.channels.email.enabled ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center space-x-2 mb-2">
                  <Mail className={`w-4 h-4 ${
                    config.channels.email.enabled ? 'text-green-600' : 'text-gray-400'
                  }`} />
                  <span className="font-medium">Email</span>
                  {config.channels.email.enabled && (
                    <Badge variant="outline" className="text-xs">Active</Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  {config.channels.email.enabled 
                    ? `${config.channels.email.recipients.length} recipient(s)`
                    : 'Not configured'
                  }
                </p>
                {config.channels.email.enabled && (
                  <Button size="sm" variant="outline" onClick={() => testAlert('email')} className="text-xs">
                    Test Alert
                  </Button>
                )}
              </div>

              {/* Slack Channel */}
              <div className={`p-4 border rounded-lg ${
                config.channels.slack.enabled ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center space-x-2 mb-2">
                  <MessageSquare className={`w-4 h-4 ${
                    config.channels.slack.enabled ? 'text-green-600' : 'text-gray-400'
                  }`} />
                  <span className="font-medium">Slack</span>
                  {config.channels.slack.enabled && (
                    <Badge variant="outline" className="text-xs">Active</Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  {config.channels.slack.enabled 
                    ? `#${config.channels.slack.channel}`
                    : 'Not configured'
                  }
                </p>
                {config.channels.slack.enabled && (
                  <Button size="sm" variant="outline" onClick={() => testAlert('slack')} className="text-xs">
                    Test Alert
                  </Button>
                )}
              </div>

              {/* Webhook Channel */}
              <div className={`p-4 border rounded-lg ${
                config.channels.webhook.enabled ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center space-x-2 mb-2">
                  <Webhook className={`w-4 h-4 ${
                    config.channels.webhook.enabled ? 'text-green-600' : 'text-gray-400'
                  }`} />
                  <span className="font-medium">Webhook</span>
                  {config.channels.webhook.enabled && (
                    <Badge variant="outline" className="text-xs">Active</Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  {config.channels.webhook.enabled 
                    ? 'Configured'
                    : 'Not configured'
                  }
                </p>
                {config.channels.webhook.enabled && (
                  <Button size="sm" variant="outline" onClick={() => testAlert('webhook')} className="text-xs">
                    Test Alert
                  </Button>
                )}
              </div>
            </div>

            {/* Trigger Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Alert Triggers</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    config.triggers.onFailure ? 'bg-green-500' : 'bg-gray-300'
                  }`} />
                  <span>Test Failures</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    config.triggers.onConsecutiveFailures > 0 ? 'bg-green-500' : 'bg-gray-300'
                  }`} />
                  <span>Consecutive Failures ({config.triggers.onConsecutiveFailures})</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    config.triggers.onFlakyTest ? 'bg-green-500' : 'bg-gray-300'
                  }`} />
                  <span>Flaky Tests</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    config.triggers.onPerformanceDegradation ? 'bg-green-500' : 'bg-gray-300'
                  }`} />
                  <span>Performance Issues</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {showConfig && (
          <div className="space-y-6">
            {/* Enable/Disable Toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium">Enable Alerting</h4>
                <p className="text-sm text-gray-600">Turn on notifications for test events</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={tempConfig.enabled}
                  onChange={(e) => setTempConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {tempConfig.enabled && (
              <>
                {/* Email Configuration */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Mail className="w-5 h-5 text-blue-600" />
                      <h4 className="font-medium">Email Notifications</h4>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={tempConfig.channels.email.enabled}
                        onChange={(e) => setTempConfig(prev => ({
                          ...prev,
                          channels: {
                            ...prev.channels,
                            email: { ...prev.channels.email, enabled: e.target.checked }
                          }
                        }))}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  
                  {tempConfig.channels.email.enabled && (
                    <div className="pl-7">
                      <label className="block text-sm font-medium mb-2">Recipients (comma-separated)</label>
                      <input
                        type="text"
                        className="w-full p-2 border rounded-lg text-sm"
                        placeholder="user1@example.com, user2@example.com"
                        value={tempConfig.channels.email.recipients.join(', ')}
                        onChange={(e) => setTempConfig(prev => ({
                          ...prev,
                          channels: {
                            ...prev.channels,
                            email: {
                              ...prev.channels.email,
                              recipients: e.target.value.split(',').map(email => email.trim()).filter(Boolean)
                            }
                          }
                        }))}
                      />
                    </div>
                  )}
                </div>

                {/* Slack Configuration */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <MessageSquare className="w-5 h-5 text-blue-600" />
                      <h4 className="font-medium">Slack Notifications</h4>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={tempConfig.channels.slack.enabled}
                        onChange={(e) => setTempConfig(prev => ({
                          ...prev,
                          channels: {
                            ...prev.channels,
                            slack: { ...prev.channels.slack, enabled: e.target.checked }
                          }
                        }))}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  
                  {tempConfig.channels.slack.enabled && (
                    <div className="pl-7 space-y-3">
                      <div>
                        <label className="block text-sm font-medium mb-2">Webhook URL</label>
                        <input
                          type="url"
                          className="w-full p-2 border rounded-lg text-sm"
                          placeholder="https://hooks.slack.com/services/..."
                          value={tempConfig.channels.slack.webhookUrl}
                          onChange={(e) => setTempConfig(prev => ({
                            ...prev,
                            channels: {
                              ...prev.channels,
                              slack: { ...prev.channels.slack, webhookUrl: e.target.value }
                            }
                          }))}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Channel</label>
                        <input
                          type="text"
                          className="w-full p-2 border rounded-lg text-sm"
                          placeholder="#test-alerts"
                          value={tempConfig.channels.slack.channel}
                          onChange={(e) => setTempConfig(prev => ({
                            ...prev,
                            channels: {
                              ...prev.channels,
                              slack: { ...prev.channels.slack, channel: e.target.value }
                            }
                          }))}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Alert Triggers */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5 text-blue-600" />
                    <span>Alert Triggers</span>
                  </h4>
                  
                  <div className="space-y-3 pl-7">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">Test Failures</span>
                        <p className="text-sm text-gray-600">Alert on any test failure</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={tempConfig.triggers.onFailure}
                          onChange={(e) => setTempConfig(prev => ({
                            ...prev,
                            triggers: { ...prev.triggers, onFailure: e.target.checked }
                          }))}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">Flaky Test Detection</span>
                        <p className="text-sm text-gray-600">Alert when flaky tests are detected</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={tempConfig.triggers.onFlakyTest}
                          onChange={(e) => setTempConfig(prev => ({
                            ...prev,
                            triggers: { ...prev.triggers, onFlakyTest: e.target.checked }
                          }))}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex-1 mr-4">
                        <span className="font-medium">Consecutive Failures</span>
                        <p className="text-sm text-gray-600">Alert after multiple consecutive failures</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          min="2"
                          max="10"
                          className="w-16 p-1 border rounded text-sm text-center"
                          value={tempConfig.triggers.onConsecutiveFailures}
                          onChange={(e) => setTempConfig(prev => ({
                            ...prev,
                            triggers: { ...prev.triggers, onConsecutiveFailures: parseInt(e.target.value) || 0 }
                          }))}
                        />
                        <span className="text-sm text-gray-600">failures</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <Button variant="outline" onClick={() => setShowConfig(false)}>
                    Cancel
                  </Button>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" onClick={() => setTempConfig(config)}>
                      Reset
                    </Button>
                    <Button onClick={handleSave}>
                      Save Configuration
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

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
  const [retryCount, setRetryCount] = useState(0);

  // New state for filtering and timeline
  const [filterFailedOnly, setFilterFailedOnly] = useState(false);
  const [viewMode, setViewMode] = useState<"cards" | "timeline" | "flaky" | "alerts">("cards");
  const [lastSuiteId, setLastSuiteId] = useState<string | null>(null);
  
  // Alerting configuration state
  const [alertingConfig, setAlertingConfig] = useState<AlertingConfig>({
    enabled: false,
    channels: {
      email: {
        enabled: false,
        recipients: []
      },
      slack: {
        enabled: false,
        webhookUrl: '',
        channel: ''
      },
      webhook: {
        enabled: false,
        url: '',
        headers: {}
      }
    },
    triggers: {
      onFailure: true,
      onConsecutiveFailures: 3,
      onFlakyTest: true,
      onPerformanceDegradation: false
    }
  });
  
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

  const loadExecutions = async (isRetry: boolean = false) => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      if (!isRetry) {
        setError(null);
      }
      
      // Add exponential backoff for retries
      if (isRetry && retryCount > 0) {
        const backoffDelay = Math.min(1000 * Math.pow(2, retryCount - 1), 10000);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      }

      const { data, error: execError } = await ExecutionService.listExecutions({
        project_id: projectId,
        limit: 50, // Increased limit for better flaky test detection
        sort_by: 'started_at',
        sort_order: 'desc'
      });

      if (execError) {
        throw new Error(execError);
      } else {
        setExecutions(data || []);
        setRetryCount(0); // Reset retry count on success
        
        // Auto-select the first running execution for real-time monitoring
        const runningExecution = (data || []).find((exec: any) => exec.status === 'running');
        if (runningExecution && !selectedExecutionId) {
          setSelectedExecutionId(runningExecution.id);
        }

        // Trigger alerts for new failures if alerting is enabled
        if (alertingConfig.enabled && data && data.length > 0) {
          checkForNewFailures(data);
        }
      }
    } catch (err) {
      console.error('Failed to load executions:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load executions';
      
      // Enhanced error handling with specific error types
      let enhancedErrorMessage = errorMessage;
      if (errorMessage.includes('Network')) {
        enhancedErrorMessage = 'Network error: Please check your internet connection and try again.';
      } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        enhancedErrorMessage = 'Authentication error: Please log in again.';
      } else if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
        enhancedErrorMessage = 'Access denied: You may not have permission to view executions.';
      } else if (errorMessage.includes('404')) {
        enhancedErrorMessage = 'No executions found: The API endpoint may not be available.';
      } else if (errorMessage.includes('500')) {
        enhancedErrorMessage = 'Server error: The backend service may be temporarily unavailable.';
      } else if (errorMessage.includes('timeout')) {
        enhancedErrorMessage = 'Request timeout: The server is taking too long to respond.';
      }
      
      setError(enhancedErrorMessage);
      
      // Implement retry logic for transient errors
      if (retryCount < 3 && (
        errorMessage.includes('Network') || 
        errorMessage.includes('timeout') || 
        errorMessage.includes('500')
      )) {
        setRetryCount(prev => prev + 1);
        console.log(`Retrying... (attempt ${retryCount + 1}/3)`);
        setTimeout(() => loadExecutions(true), 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  // Function to check for new failures and trigger alerts
  const checkForNewFailures = (newExecutions: any[]) => {
    // This would typically compare against previously loaded executions
    // and trigger alerts for new failures
    const recentFailures = newExecutions.filter(exec => 
      exec.status === 'failed' && 
      new Date(exec.started_at || exec.created_at).getTime() > Date.now() - 5 * 60 * 1000 // Last 5 minutes
    );

    if (recentFailures.length > 0 && alertingConfig.triggers.onFailure) {
      console.log(`Found ${recentFailures.length} recent failures, would trigger alerts`);
      // In a real app, this would call the alerting service
    }
  };

  // Enhanced retry function with user feedback
  const handleRetry = () => {
    setRetryCount(0);
    setLoading(true);
    loadExecutions();
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

  // Filter executions based on current filter settings
  const filteredExecutions = executions.filter((execution: any) => {
    if (filterFailedOnly) {
      return execution.status === 'failed';
    }
    return true;
  });

  // Get last 10 executions for timeline view
  const timelineExecutions = executions.slice(0, 10);

  // Get stats for today
  const today = new Date();
  const todayString = today.toDateString();
  const todaysExecutions = executions.filter((execution: any) => {
    const executionDate = new Date(execution.started_at || execution.created_at);
    return executionDate.toDateString() === todayString;
  });

  const completedToday = todaysExecutions.filter((exec: any) => exec.status === 'passed').length;
  const failedToday = todaysExecutions.filter((exec: any) => exec.status === 'failed').length;

  // Function to run last suite again
  const runLastSuiteAgain = async () => {
    if (!lastSuiteId) return;

    try {
      // Mock implementation - in real app this would call the actual service
      console.log(`Running last suite: ${lastSuiteId}`);
      // const { error } = await TestSuiteService.executeTestSuite(lastSuiteId);
      // if (error) {
      //   console.error('Failed to run test suite:', error);
      // } else {
      //   console.log('Test suite execution started:', lastSuiteId);
      //   loadExecutions(); // Refresh data
      // }
    } catch (err) {
      console.error('Error running last suite:', err);
    }
  };

  // Update lastSuiteId when executions change
  useEffect(() => {
    if (executions.length > 0) {
      // Find the most recent execution and extract suite ID
      const mostRecent = executions[0];
      // Mock suite ID extraction - in real app this would come from execution data
      const suiteId = mostRecent.suite_id || mostRecent.test_suite_id || `suite-${Math.floor(Math.random() * 1000)}`;
      setLastSuiteId(suiteId);
    }
  }, [executions]);

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
        <div className="text-center max-w-md mx-auto">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Error Loading Executions
          </h3>
          <p className="text-gray-500 mb-4">{error}</p>
          
          {/* Enhanced error actions */}
          <div className="space-y-3">
            <Button onClick={handleRetry} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              {retryCount > 0 ? `Retry (${retryCount}/3)` : 'Retry'}
            </Button>
            
            {retryCount > 0 && (
              <div className="text-sm text-gray-600">
                <p>Retrying automatically... (attempt {retryCount}/3)</p>
                <div className="w-full bg-gray-200 rounded-full h-1 mt-2">
                  <div 
                    className="bg-blue-600 h-1 rounded-full transition-all duration-1000" 
                    style={{ width: `${(retryCount / 3) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}
            
            {/* Troubleshooting tips */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-left">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Troubleshooting Tips:</h4>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• Check your internet connection</li>
                <li>• Verify you're logged in and have proper permissions</li>
                <li>• Try refreshing the page</li>
                <li>• Contact support if the issue persists</li>
              </ul>
            </div>
          </div>
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
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Test Execution Monitor
          </h2>
          <p className="text-gray-600 mt-1">
            Real-time monitoring and execution history
          </p>
        </div>
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
          <Button variant="outline" size="sm" onClick={handleRetry}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Today's Stats */}
      {executions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Completed Today</p>
                  <p className="text-2xl font-bold text-green-600">{completedToday}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Failed Today</p>
                  <p className="text-2xl font-bold text-red-600">{failedToday}</p>
                </div>
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Executions</p>
                  <p className="text-2xl font-bold text-blue-600">{executions.length}</p>
                </div>
                <Activity className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Running Now</p>
                  <p className="text-2xl font-bold text-purple-600">{runningExecutions.length}</p>
                </div>
                <Play className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Controls and Filters */}
      {executions.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Enhanced View Mode Toggle */}
            <div className="flex items-center border rounded-lg">
              <Button
                variant={viewMode === "cards" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("cards")}
                className="rounded-r-none"
              >
                Cards
              </Button>
              <Button
                variant={viewMode === "timeline" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("timeline")}
                className="rounded-none"
              >
                Timeline
              </Button>
              <Button
                variant={viewMode === "flaky" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("flaky")}
                className="rounded-none"
              >
                Flaky Tests
              </Button>
              <Button
                variant={viewMode === "alerts" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("alerts")}
                className="rounded-l-none"
              >
                <Bell className="w-4 h-4 mr-1" />
                Alerts
              </Button>
            </div>

            {/* Filter Toggle - only show for cards and timeline views */}
            {(viewMode === "cards" || viewMode === "timeline") && (
              <Button
                variant={filterFailedOnly ? "destructive" : "outline"}
                size="sm"
                onClick={() => setFilterFailedOnly(!filterFailedOnly)}
              >
                <Filter className="w-4 h-4 mr-2" />
                {filterFailedOnly ? "Show All" : "Failed Only"}
              </Button>
            )}
          </div>

          {/* Run Last Suite CTA - only show for cards and timeline views */}
          {(viewMode === "cards" || viewMode === "timeline") && lastSuiteId && (
            <Button onClick={runLastSuiteAgain} className="bg-blue-600 hover:bg-blue-700">
              <Play className="w-4 h-4 mr-2" />
              Run Last Suite Again
            </Button>
          )}
        </div>
      )}

      {executions.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Activity className="w-10 h-10 text-blue-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-3">
            No Test Executions Yet
          </h3>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            Start your first test execution to see real-time monitoring and execution history here.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={runLastSuiteAgain}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={!lastSuiteId}
            >
              <Play className="w-4 h-4 mr-2" />
              Run Last Suite Again
            </Button>
            <Button variant="outline" onClick={() => handleRetry()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      ) : viewMode === "timeline" ? (
        <ExecutionTimeline
          executions={filteredExecutions}
          onSelectExecution={setSelectedExecutionId}
        />
      ) : viewMode === "flaky" ? (
        <FlakyTestsSection executions={executions} />
      ) : viewMode === "alerts" ? (
        <AlertingConfigSection 
          config={alertingConfig}
          onConfigUpdate={setAlertingConfig}
        />
      ) : (
        <div className="space-y-4">
          {filteredExecutions.slice(0, 10).map((execution: any) => (
            <ExecutionCard
              key={execution.id}
              execution={execution}
              isSelected={execution.id === selectedExecutionId}
              realTimeProgress={execution.id === selectedExecutionId ? realTimeProgress : null}
              realTimeSteps={execution.id === selectedExecutionId ? realTimeSteps : []}
              onClick={() => setSelectedExecutionId(execution.id)}
            />
          ))}

          {filteredExecutions.length === 0 && filterFailedOnly && (
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Failed Executions
              </h3>
              <p className="text-gray-500 mb-4">
                Great! All your recent executions have passed successfully.
              </p>
              <Button
                variant="outline"
                onClick={() => setFilterFailedOnly(false)}
              >
                Show All Executions
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Real-time Logs Section */}
      {executions.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <Terminal className="w-5 h-5 text-gray-600" />
                  <span>Real-time Execution Logs</span>
                </CardTitle>
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
            <ScrollArea className="h-64">
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
      )}
    </div>
  );
}