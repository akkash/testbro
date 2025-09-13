/**
 * Test Execution Dashboard
 * Real-time monitoring and management of test executions
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  LoadingSpinner,
  StatusBadge,
  Select,
  FormField
} from '@/components/ui';
import {
  PlayIcon,
  PauseIcon,
  StopIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  EyeIcon,
  DocumentArrowDownIcon,
  ChartBarIcon,
  PhotoIcon,
  VideoCameraIcon,
  BugAntIcon
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';

// Types
interface TestExecution {
  id: string;
  name: string;
  projectId: string;
  testFlowId: string;
  status: 'queued' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  environment: string;
  browser: string;
  device: 'desktop' | 'mobile' | 'tablet';
  progress: {
    current: number;
    total: number;
    percentage: number;
  };
  results: {
    passed: number;
    failed: number;
    skipped: number;
    errors: number;
  };
  metrics: {
    avgResponseTime: number;
    avgLoadTime: number;
    totalRequests: number;
    failedRequests: number;
    screenDiff: number;
  };
  screenshots: string[];
  video?: string;
  logs: ExecutionLog[];
  tags: string[];
}

interface ExecutionLog {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  step: string;
  message: string;
  data?: any;
}

interface ExecutionStats {
  total: number;
  running: number;
  completed: number;
  failed: number;
  avgDuration: number;
  successRate: number;
}

export default function ExecutionDashboard() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  // State
  const [executions, setExecutions] = useState<TestExecution[]>([]);
  const [selectedExecution, setSelectedExecution] = useState<TestExecution | null>(null);
  const [stats, setStats] = useState<ExecutionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [realTimeMode, setRealTimeMode] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('startTime');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Refs
  const refreshIntervalRef = useRef<NodeJS.Timeout>();

  // Load executions
  useEffect(() => {
    loadExecutions();
    
    if (autoRefresh) {
      startAutoRefresh();
    }
    
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [projectId, autoRefresh]);

  const startAutoRefresh = () => {
    refreshIntervalRef.current = setInterval(() => {
      loadExecutions();
    }, 2000); // Refresh every 2 seconds
  };

  const stopAutoRefresh = () => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = undefined;
    }
  };

  useEffect(() => {
    if (autoRefresh) {
      startAutoRefresh();
    } else {
      stopAutoRefresh();
    }
    
    return stopAutoRefresh;
  }, [autoRefresh]);

  const loadExecutions = async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock execution data
      const mockExecutions: TestExecution[] = [
        {
          id: 'exec-1',
          name: 'E-commerce Checkout Flow',
          projectId: projectId!,
          testFlowId: 'flow-1',
          status: 'running',
          startTime: new Date(Date.now() - 5 * 60 * 1000),
          environment: 'staging',
          browser: 'Chrome 119',
          device: 'desktop',
          progress: {
            current: 7,
            total: 12,
            percentage: 58
          },
          results: {
            passed: 5,
            failed: 1,
            skipped: 0,
            errors: 1
          },
          metrics: {
            avgResponseTime: 250,
            avgLoadTime: 1800,
            totalRequests: 25,
            failedRequests: 2,
            screenDiff: 0.12
          },
          screenshots: ['/screenshots/exec-1-1.png', '/screenshots/exec-1-2.png'],
          video: '/videos/exec-1.mp4',
          logs: [
            {
              id: 'log-1',
              timestamp: new Date(Date.now() - 4 * 60 * 1000),
              level: 'info',
              step: 'Navigate to homepage',
              message: 'Successfully navigated to https://example.com'
            },
            {
              id: 'log-2',
              timestamp: new Date(Date.now() - 3 * 60 * 1000),
              level: 'error',
              step: 'Click add to cart',
              message: 'Element not found: [data-testid="add-to-cart"]'
            }
          ],
          tags: ['checkout', 'critical']
        },
        {
          id: 'exec-2',
          name: 'User Registration Flow',
          projectId: projectId!,
          testFlowId: 'flow-2',
          status: 'completed',
          startTime: new Date(Date.now() - 15 * 60 * 1000),
          endTime: new Date(Date.now() - 10 * 60 * 1000),
          duration: 5 * 60 * 1000,
          environment: 'production',
          browser: 'Firefox 121',
          device: 'desktop',
          progress: {
            current: 8,
            total: 8,
            percentage: 100
          },
          results: {
            passed: 8,
            failed: 0,
            skipped: 0,
            errors: 0
          },
          metrics: {
            avgResponseTime: 180,
            avgLoadTime: 1200,
            totalRequests: 15,
            failedRequests: 0,
            screenDiff: 0.02
          },
          screenshots: ['/screenshots/exec-2-1.png'],
          logs: [],
          tags: ['registration', 'smoke']
        },
        {
          id: 'exec-3',
          name: 'Mobile Search Flow',
          projectId: projectId!,
          testFlowId: 'flow-3',
          status: 'failed',
          startTime: new Date(Date.now() - 30 * 60 * 1000),
          endTime: new Date(Date.now() - 25 * 60 * 1000),
          duration: 5 * 60 * 1000,
          environment: 'staging',
          browser: 'Chrome Mobile',
          device: 'mobile',
          progress: {
            current: 4,
            total: 10,
            percentage: 40
          },
          results: {
            passed: 2,
            failed: 2,
            skipped: 6,
            errors: 2
          },
          metrics: {
            avgResponseTime: 450,
            avgLoadTime: 3200,
            totalRequests: 12,
            failedRequests: 5,
            screenDiff: 0.35
          },
          screenshots: ['/screenshots/exec-3-1.png', '/screenshots/exec-3-2.png'],
          logs: [],
          tags: ['mobile', 'search']
        }
      ];

      // Mock stats
      const mockStats: ExecutionStats = {
        total: 150,
        running: 3,
        completed: 120,
        failed: 27,
        avgDuration: 8.5 * 60 * 1000,
        successRate: 84.2
      };

      setExecutions(mockExecutions);
      setStats(mockStats);
      
      if (mockExecutions.length > 0 && !selectedExecution) {
        setSelectedExecution(mockExecutions[0]);
      }
    } catch (error) {
      console.error('Failed to load executions:', error);
      toast.error('Failed to load test executions');
    } finally {
      setLoading(false);
    }
  };

  // Control execution
  const controlExecution = async (executionId: string, action: 'pause' | 'resume' | 'stop') => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setExecutions(prev => prev.map(exec => {
        if (exec.id === executionId) {
          switch (action) {
            case 'pause':
              return { ...exec, status: 'paused' as const };
            case 'resume':
              return { ...exec, status: 'running' as const };
            case 'stop':
              return { 
                ...exec, 
                status: 'cancelled' as const,
                endTime: new Date(),
                duration: Date.now() - exec.startTime.getTime()
              };
          }
        }
        return exec;
      }));
      
      toast.success(`Execution ${action}d successfully`);
    } catch (error) {
      console.error(`Failed to ${action} execution:`, error);
      toast.error(`Failed to ${action} execution`);
    }
  };

  // Filter and sort executions
  const filteredAndSortedExecutions = React.useMemo(() => {
    let filtered = executions;
    
    if (filterStatus !== 'all') {
      filtered = executions.filter(exec => exec.status === filterStatus);
    }
    
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'startTime':
          return b.startTime.getTime() - a.startTime.getTime();
        case 'duration':
          return (b.duration || 0) - (a.duration || 0);
        case 'status':
          return a.status.localeCompare(b.status);
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });
  }, [executions, filterStatus, sortBy]);

  // Format duration
  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  // Get status color
  const getStatusColor = (status: TestExecution['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'running':
        return 'text-blue-600 bg-blue-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      case 'paused':
        return 'text-yellow-600 bg-yellow-100';
      case 'cancelled':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-500 bg-gray-50';
    }
  };

  // Get status icon
  const getStatusIcon = (status: TestExecution['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-4 h-4" />;
      case 'running':
        return <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />;
      case 'failed':
        return <ExclamationTriangleIcon className="w-4 h-4" />;
      case 'paused':
        return <PauseIcon className="w-4 h-4" />;
      default:
        return <ClockIcon className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Test Executions</h1>
          <p className="text-gray-600">Monitor and manage test execution runs</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="auto-refresh"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300"
            />
            <label htmlFor="auto-refresh" className="text-sm text-gray-700">
              Auto-refresh
            </label>
          </div>
          
          <Button
            variant="outline"
            onClick={loadExecutions}
            disabled={loading}
          >
            <ArrowPathIcon className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button onClick={() => navigate(`/projects/${projectId}/test-builder`)}>
            <PlayIcon className="w-4 h-4 mr-2" />
            New Test Run
          </Button>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <p className="text-sm text-gray-600">Total Runs</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{stats.running}</div>
              <p className="text-sm text-gray-600">Running</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
              <p className="text-sm text-gray-600">Completed</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
              <p className="text-sm text-gray-600">Failed</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-gray-900">
                {formatDuration(stats.avgDuration)}
              </div>
              <p className="text-sm text-gray-600">Avg Duration</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {stats.successRate.toFixed(1)}%
              </div>
              <p className="text-sm text-gray-600">Success Rate</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Controls */}
      <div className="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Status:</label>
          <Select
            value={filterStatus}
            onValueChange={setFilterStatus}
            options={[
              { value: 'all', label: 'All' },
              { value: 'running', label: 'Running' },
              { value: 'completed', label: 'Completed' },
              { value: 'failed', label: 'Failed' },
              { value: 'paused', label: 'Paused' }
            ]}
          />
        </div>
        
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Sort by:</label>
          <Select
            value={sortBy}
            onValueChange={setSortBy}
            options={[
              { value: 'startTime', label: 'Start Time' },
              { value: 'duration', label: 'Duration' },
              { value: 'status', label: 'Status' },
              { value: 'name', label: 'Name' }
            ]}
          />
        </div>
        
        <div className="ml-auto text-sm text-gray-600">
          {filteredAndSortedExecutions.length} execution(s)
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Execution List */}
        <div className="lg:col-span-1 space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Recent Executions</h2>
          
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {filteredAndSortedExecutions.map(execution => (
              <Card
                key={execution.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedExecution?.id === execution.id 
                    ? 'ring-2 ring-blue-500 border-blue-200' 
                    : ''
                }`}
                onClick={() => setSelectedExecution(execution)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">
                        {execution.name}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Started {execution.startTime.toLocaleTimeString()}
                      </p>
                    </div>
                    
                    <Badge className={getStatusColor(execution.status)}>
                      {getStatusIcon(execution.status)}
                      <span className="ml-1 capitalize">{execution.status}</span>
                    </Badge>
                  </div>
                  
                  {/* Progress Bar */}
                  {execution.status === 'running' && (
                    <div className="mb-3">
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Progress</span>
                        <span>{execution.progress.current}/{execution.progress.total}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${execution.progress.percentage}%` }}
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Results Summary */}
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1 text-green-600">
                      <CheckCircleIcon className="w-4 h-4" />
                      <span>{execution.results.passed}</span>
                    </div>
                    <div className="flex items-center gap-1 text-red-600">
                      <ExclamationTriangleIcon className="w-4 h-4" />
                      <span>{execution.results.failed}</span>
                    </div>
                    {execution.duration && (
                      <div className="flex items-center gap-1 text-gray-600">
                        <ClockIcon className="w-4 h-4" />
                        <span>{formatDuration(execution.duration)}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Tags */}
                  {execution.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {execution.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            
            {filteredAndSortedExecutions.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center text-gray-500">
                  <ChartBarIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No test executions found</p>
                  <p className="text-sm mt-1">Start a new test run to see results here</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Execution Details */}
        <div className="lg:col-span-2">
          {selectedExecution ? (
            <div className="space-y-6">
              {/* Execution Header */}
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {selectedExecution.name}
                        <Badge className={getStatusColor(selectedExecution.status)}>
                          {getStatusIcon(selectedExecution.status)}
                          <span className="ml-1 capitalize">{selectedExecution.status}</span>
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        {selectedExecution.environment} • {selectedExecution.browser} • {selectedExecution.device}
                      </CardDescription>
                    </div>
                    
                    {selectedExecution.status === 'running' && (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => controlExecution(selectedExecution.id, 'pause')}
                        >
                          <PauseIcon className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => controlExecution(selectedExecution.id, 'stop')}
                        >
                          <StopIcon className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                    
                    {selectedExecution.status === 'paused' && (
                      <Button
                        size="sm"
                        onClick={() => controlExecution(selectedExecution.id, 'resume')}
                      >
                        <PlayIcon className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Started</p>
                      <p className="text-sm text-gray-600">
                        {selectedExecution.startTime.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Duration</p>
                      <p className="text-sm text-gray-600">
                        {selectedExecution.duration 
                          ? formatDuration(selectedExecution.duration)
                          : formatDuration(Date.now() - selectedExecution.startTime.getTime())
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Progress</p>
                      <p className="text-sm text-gray-600">
                        {selectedExecution.progress.current}/{selectedExecution.progress.total} steps
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Success Rate</p>
                      <p className="text-sm text-gray-600">
                        {selectedExecution.results.passed > 0 
                          ? Math.round((selectedExecution.results.passed / (selectedExecution.results.passed + selectedExecution.results.failed)) * 100)
                          : 0
                        }%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm">
                  <EyeIcon className="w-4 h-4 mr-2" />
                  View Full Report
                </Button>
                <Button variant="outline" size="sm">
                  <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
                  Export Results
                </Button>
                <Button variant="outline" size="sm">
                  <PhotoIcon className="w-4 h-4 mr-2" />
                  Screenshots ({selectedExecution.screenshots.length})
                </Button>
                {selectedExecution.video && (
                  <Button variant="outline" size="sm">
                    <VideoCameraIcon className="w-4 h-4 mr-2" />
                    Video Recording
                  </Button>
                )}
                <Button variant="outline" size="sm">
                  <BugAntIcon className="w-4 h-4 mr-2" />
                  Debug
                </Button>
              </div>

              {/* Results Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <CheckCircleIcon className="w-8 h-8 text-green-600" />
                      <div>
                        <div className="text-2xl font-bold text-green-600">
                          {selectedExecution.results.passed}
                        </div>
                        <p className="text-sm text-gray-600">Passed</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
                      <div>
                        <div className="text-2xl font-bold text-red-600">
                          {selectedExecution.results.failed}
                        </div>
                        <p className="text-sm text-gray-600">Failed</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <ClockIcon className="w-8 h-8 text-gray-600" />
                      <div>
                        <div className="text-2xl font-bold text-gray-600">
                          {selectedExecution.results.skipped}
                        </div>
                        <p className="text-sm text-gray-600">Skipped</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <BugAntIcon className="w-8 h-8 text-yellow-600" />
                      <div>
                        <div className="text-2xl font-bold text-yellow-600">
                          {selectedExecution.results.errors}
                        </div>
                        <p className="text-sm text-gray-600">Errors</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Performance Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle>Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Avg Response Time</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {selectedExecution.metrics.avgResponseTime}ms
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Avg Load Time</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {(selectedExecution.metrics.avgLoadTime / 1000).toFixed(1)}s
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Total Requests</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {selectedExecution.metrics.totalRequests}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Failed Requests</p>
                      <p className="text-lg font-semibold text-red-600">
                        {selectedExecution.metrics.failedRequests}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Screen Diff</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {(selectedExecution.metrics.screenDiff * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Logs */}
              {selectedExecution.logs.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Logs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {selectedExecution.logs.map(log => (
                        <div key={log.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className={`px-2 py-1 text-xs rounded-full font-medium ${
                            log.level === 'error' ? 'bg-red-100 text-red-800' :
                            log.level === 'warn' ? 'bg-yellow-100 text-yellow-800' :
                            log.level === 'info' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {log.level}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">{log.step}</span>
                              <span className="text-xs text-gray-500">
                                {log.timestamp.toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700">{log.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                <ChartBarIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Select an execution to view details</p>
                <p className="text-sm mt-1">Click on any execution from the list to see detailed information</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
