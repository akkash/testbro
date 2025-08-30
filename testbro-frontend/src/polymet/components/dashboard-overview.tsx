import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Bot,
  Zap,
  Target,
  Activity,
  ArrowRight,
  Play,
  Pause,
  Video,
  Monitor,
  PlayCircle,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,

  Flame,
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

import { Alert, AlertDescription } from "@/components/ui/alert";
// import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import {
  LineChart,
  Line,
  // BarChart,
  // Bar,
  XAxis,
  ResponsiveContainer,
} from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardService, DashboardMetrics, DashboardActivity, DashboardTrends } from "@/lib/services/dashboardService";
import { ProjectService } from "@/lib/services/projectService";
import { ExecutionService } from "@/lib/services/executionService";
import { useWebSocket } from "@/hooks/useWebSocket";

const MetricCard = ({
  title,
  value,
  change,
  changeType,
  icon: Icon,
  description,
}: {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: React.ElementType;
  description?: string;
}) => {
  const changeColor = {
    positive: "text-green-600",
    negative: "text-red-600",
    neutral: "text-gray-600",
  }[changeType || "neutral"];

  const ChangeIcon =
    changeType === "positive"
      ? TrendingUp
      : changeType === "negative"
        ? TrendingDown
        : Activity;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-gray-400" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        {change && (
          <div className={`flex items-center text-xs ${changeColor} mt-1`}>
            <ChangeIcon className="h-3 w-3 mr-1" />

            {change}
          </div>
        )}
        {description && (
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
};

const RecentExecution = ({ execution }: { execution: any }) => {
  const statusConfig = {
    passed: { color: "bg-green-100 text-green-800", icon: CheckCircle },
    failed: { color: "bg-red-100 text-red-800", icon: XCircle },
    running: { color: "bg-blue-100 text-blue-800", icon: Clock },
    cancelled: { color: "bg-gray-100 text-gray-800", icon: Pause },
  };

  const config = statusConfig[execution.status as keyof typeof statusConfig];
  const StatusIcon = config.icon;

  return (
    <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
      <div className="flex items-center space-x-3">
        <StatusIcon className="h-4 w-4 text-gray-400" />

        <div>
          <p className="text-sm font-medium text-gray-900">
            Test Case #{execution.testCaseId.slice(-3)}
          </p>
          <p className="text-xs text-gray-500">
            {execution.environment} • {execution.browser}
          </p>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Badge variant="secondary" className={config.color}>
          {execution.status}
        </Badge>
        <span className="text-xs text-gray-500">
          {execution.duration ? `${Math.round(execution.duration / 60)}m` : ""}
        </span>
      </div>
    </div>
  );
};

const AIInsightCard = ({ insight }: { insight: any }) => {
  const severityConfig = {
    low: "border-yellow-200 bg-yellow-50",
    medium: "border-orange-200 bg-orange-50",
    high: "border-red-200 bg-red-50",
    critical: "border-red-300 bg-red-100",
  };

  return (
    <div
      className={`border rounded-lg p-4 ${severityConfig[insight.severity as keyof typeof severityConfig]}`}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-sm font-medium text-gray-900">
          {insight.description}
        </h4>
        <Badge variant="outline" className="text-xs">
          {insight.severity}
        </Badge>
      </div>
      <p className="text-xs text-gray-600 mb-2">{insight.suggestion}</p>
      <p className="text-xs text-gray-500">
        <span className="font-medium">Business Impact:</span>{" "}
        {insight.businessImpact}
      </p>
    </div>
  );
};

const CriticalIssuesFeed = ({ issues }: { issues: any[] }) => {
  const criticalIssues = issues?.filter(issue => issue.severity === 'critical' || issue.severity === 'high') || [];

  if (criticalIssues.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-center">
        <CheckCircle className="w-12 h-12 text-green-500 mb-3" />
        <h4 className="text-sm font-medium text-gray-900 mb-1">All Clear!</h4>
        <p className="text-xs text-gray-500">No critical issues detected</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2 mb-4">
        <Flame className="w-5 h-5 text-red-500" />
        <h3 className="text-sm font-medium text-gray-900">Critical Issues</h3>
        <Badge variant="destructive" className="text-xs">
          {criticalIssues.length}
        </Badge>
      </div>

      <div className="space-y-3 max-h-64 overflow-y-auto">
        {criticalIssues.slice(0, 5).map((issue: any, index: number) => (
          <div
            key={index}
            className="border border-red-200 bg-red-50 rounded-lg p-3 hover:bg-red-100 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <h4 className="text-xs font-medium text-red-900 flex-1">
                {issue.description}
              </h4>
              <Badge variant="destructive" className="text-xs ml-2">
                {issue.severity}
              </Badge>
            </div>
            <p className="text-xs text-red-700 mb-2">{issue.suggestion}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-red-600">
                Impact: {issue.businessImpact}
              </span>
              <Button size="sm" variant="outline" className="h-6 text-xs">
                Fix Now
              </Button>
            </div>
          </div>
        ))}
      </div>

      {criticalIssues.length > 5 && (
        <Button variant="outline" size="sm" className="w-full mt-3" asChild>
          <Link to="/analytics">
            View All Issues ({criticalIssues.length})
          </Link>
        </Button>
      )}
    </div>
  );
};

export default function DashboardOverview() {
  const { isAuthenticated } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentActivity, setRecentActivity] = useState<DashboardActivity[]>([]);
  const [recentExecutions, setRecentExecutions] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [trends, setTrends] = useState<DashboardTrends[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [browserAutomationExpanded, setBrowserAutomationExpanded] = useState(false);

  // WebSocket for real-time updates
  const { connectionState, addEventListener, removeEventListener } = useWebSocket();

  const loadDashboardData = async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      setError(null);

      // Load all dashboard data in parallel with proper error handling
      const [
        { data: metricsData, error: metricsError },
        { data: activityData },
        { data: executionsData },
        { data: projectsData },
        { data: trendsData }
      ] = await Promise.all([
        DashboardService.getMetrics().catch(() => ({ data: null, error: 'Failed to load metrics' })),
        DashboardService.getRecentActivity(10).catch(() => ({ data: null, error: 'Failed to load activity' })),
        ExecutionService.listExecutions({ limit: 5, sort_by: 'started_at', sort_order: 'desc' }).catch(() => ({ data: null, error: 'Failed to load executions' })),
        ProjectService.listProjects({ limit: 5, sort_by: 'updated_at', sort_order: 'desc' }).catch(() => ({ data: null, error: 'Failed to load projects' })),
        DashboardService.getTrends('30d').catch(() => ({ data: null, error: 'Failed to load trends' }))
      ]);

      // Handle metrics with fallback
      if (metricsError || !metricsData) {
        console.warn('Failed to load metrics:', metricsError);
        setMetrics({
          totalTests: 12,
          passRate: 85,
          failRate: 15,
          avgExecutionTime: 3.5,
          reliabilityScore: 92,
          recentExecutions: [],
          topIssues: [
            {
              description: "Button click timeout on checkout page",
              severity: "high",
              suggestion: "Increase timeout or optimize page load speed",
              businessImpact: "May affect conversion rates"
            }
          ]
        });
      } else {
        setMetrics(metricsData);
      }

      // Handle other data with fallbacks
      setRecentActivity(activityData || []);
      setRecentExecutions(executionsData || [
        {
          id: "exec-1",
          testCaseId: "test-case-001",
          status: "passed",
          environment: "staging",
          browser: "chromium",
          duration: 180
        }
      ]);
      setProjects(projectsData || [
        {
          id: "proj-1",
          name: "E-commerce Platform",
          environment: "production",
          url: "https://shop.example.com",
          passRate: 92.5,
          avgUxScore: 88,
          totalRuns: 156,
          lastRunDate: new Date().toISOString(),
          lastRunStatus: "passed",
          tags: ["critical", "checkout"]
        }
      ]);
      setTrends(trendsData || [
        { date: "2024-01-20", passed: 8, failed: 2, avgDuration: 3.2, uxScore: 85 },
        { date: "2024-01-21", passed: 10, failed: 1, avgDuration: 3.1, uxScore: 87 },
        { date: "2024-01-22", passed: 9, failed: 3, avgDuration: 3.4, uxScore: 82 },
        { date: "2024-01-23", passed: 12, failed: 1, avgDuration: 3.0, uxScore: 89 },
        { date: "2024-01-24", passed: 11, failed: 2, avgDuration: 3.3, uxScore: 86 }
      ]);

    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [isAuthenticated]);

  // Real-time updates via WebSocket
  useEffect(() => {
    const handleRealTimeEvent = (event: any) => {
      if (event.type === 'execution_start' || event.type === 'execution_complete') {
        // Refresh executions and metrics when new ones start or complete
        loadDashboardData();
      }
    };

    if (connectionState.connected) {
      addEventListener('execution_event', handleRealTimeEvent);
    }

    return () => {
      removeEventListener('execution_event', handleRealTimeEvent);
    };
  }, [connectionState.connected, addEventListener, removeEventListener]);

  // Real-time updates via WebSocket - temporarily disabled
  // useEffect(() => {
  //   const handleRealTimeEvent = (event: any) => {
  //     if (event.type === 'execution_start' || event.type === 'execution_complete') {
  //       // Refresh executions and metrics when new ones start or complete
  //       loadDashboardData();
  //     }
  //   };

  //   if (connectionState.connected) {
  //     addEventListener('execution_event', handleRealTimeEvent);
  //   }

  //   return () => {
  //     removeEventListener('execution_event', handleRealTimeEvent);
  //   };
  // }, [connectionState.connected, addEventListener, removeEventListener]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
  };
  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-gray-600">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load dashboard data: {error}
            <Button onClick={handleRefresh} className="ml-2" size="sm" variant="outline">
              <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Not authenticated state
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-600">Please log in to view dashboard</p>
        </div>
      </div>
    );
  }



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">
            AI-powered testing insights and analytics
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700" asChild>
            <Link to="/test-execution">
              <Zap className="w-4 h-4 mr-2" />
              Run Latest Suite
            </Link>
          </Button>
        </div>
      </div>

      {/* Key Metrics & AI Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <MetricCard
          title="Total Tests"
          value={metrics?.totalTests || 0}
          change="+12% from last week"
          changeType="positive"
          icon={Target}
          description="Active test cases"
        />

        <MetricCard
          title="Pass Rate"
          value={`${metrics?.passRate || 0}%`}
          change="+2.3% from last week"
          changeType="positive"
          icon={CheckCircle}
          description="Success rate"
        />

        <MetricCard
          title="Avg Duration"
          value={`${metrics?.avgExecutionTime || 0}m`}
          change="-0.5m from last week"
          changeType="positive"
          icon={Clock}
          description="Per test execution"
        />

        <MetricCard
          title="Reliability Score"
          value={metrics?.reliabilityScore || 0}
          change="+3.2 from last week"
          changeType="positive"
          icon={Bot}
          description="AI-powered analysis"
        />

        {/* AI Insights Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              AI Insights
            </CardTitle>
            <Bot className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 mb-2">
              {metrics?.topIssues?.length || 0}
            </div>
            <div className="flex items-center space-x-2 text-xs text-gray-500 mb-2">
              <AlertTriangle className="w-3 h-3" />
              <span>Issues detected</span>
            </div>
            <Button size="sm" variant="outline" className="w-full" asChild>
              <Link to="/analytics">
                <Bot className="w-3 h-3 mr-1" />
                View Insights
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* UX Score Trends Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>UX Quality Score Trends</CardTitle>
            <CardDescription>
              AI-powered UX analysis trends over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="aspect-[none] h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends}>
                  <XAxis dataKey="date" />
                  <Line
                    type="monotone"
                    dataKey="uxScore"
                    stroke="hsl(var(--chart-3))"
                    strokeWidth={3}
                    name="UX Score"
                    dot={{ fill: "hsl(var(--chart-3))", strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
              <div className="flex items-center space-x-2 mb-2">
                <Bot className="w-4 h-4 text-purple-600" />

                <span className="text-sm font-medium text-purple-900">
                  Latest AI Insights
                </span>
              </div>
              <p className="text-xs text-purple-800">
                {metrics?.topIssues && metrics.topIssues.length > 0
                  ? metrics.topIssues[0]?.description || 'No insights available'
                  : 'Loading AI insights...'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Critical Issues Feed */}
        <Card>
          <CardHeader>
            <CardTitle>Critical Issues</CardTitle>
            <CardDescription>Actionable AI-detected problems</CardDescription>
          </CardHeader>
          <CardContent>
            <CriticalIssuesFeed issues={metrics?.topIssues || []} />
          </CardContent>
        </Card>
      </div>

      {/* Browser Automation Highlights */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CardTitle className="flex items-center space-x-2">
                <Video className="w-5 h-5 text-blue-600" />
                <span>Browser Automation Highlights</span>
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setBrowserAutomationExpanded(!browserAutomationExpanded)}
                className="ml-2"
              >
                {browserAutomationExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/test-results/target-001">
                View All Videos
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </div>
          <CardDescription>
            Recent test execution recordings and live streams
          </CardDescription>
        </CardHeader>
        {browserAutomationExpanded && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Featured Video */}
              <div className="space-y-3">
                <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                  <BrowserAutomationPlayer
                    automationData={{
                      videoUrl: "/videos/featured-test-execution.mp4",
                      thumbnailUrl: "/thumbnails/featured-test.jpg",
                      duration: 240,
                      recordingStartTime: "2024-01-24T14:30:00Z",
                      recordingEndTime: "2024-01-24T14:34:00Z",
                      playbackControls: {
                        canPlay: true,
                        canPause: true,
                        canSeek: true,
                        availableSpeeds: [0.5, 1, 1.5, 2],
                      },
                    }}
                    testCaseName="E-commerce Checkout Flow"
                    isLive={false}
                    className="w-full h-full"
                  />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">
                    Latest Successful Test
                  </h4>
                  <p className="text-sm text-gray-600">
                    E-commerce Checkout • 4m 0s • Production
                  </p>
                  <div className="flex items-center space-x-2 mt-2">
                    <Badge
                      variant="secondary"
                      className="bg-green-100 text-green-800"
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Passed
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      UX Score: 94/100
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Recent Videos List */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Recent Recordings</h4>
                <div className="space-y-3">
                  {[
                    {
                      name: "User Registration Flow",
                      duration: "2m 15s",
                      status: "passed",
                      uxScore: 87,
                      timestamp: "2 hours ago",
                    },
                    {
                      name: "Payment Processing",
                      duration: "3m 30s",
                      status: "failed",
                      uxScore: 62,
                      timestamp: "4 hours ago",
                    },
                    {
                      name: "Product Search",
                      duration: "1m 45s",
                      status: "passed",
                      uxScore: 91,
                      timestamp: "6 hours ago",
                    },
                  ].map((video, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                      <div className="w-12 h-8 bg-gray-200 rounded flex items-center justify-center">
                        <PlayCircle className="w-4 h-4 text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {video.name}
                        </p>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <span>{video.duration}</span>
                          <span>•</span>
                          <span>{video.timestamp}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge
                          variant="secondary"
                          className={`text-xs ${video.status === "passed"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                            }`}
                        >
                          {video.status}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          UX: {video.uxScore}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Live Stream Indicator */}
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />

                    <span className="text-sm font-medium text-red-800">
                      Live Test Execution
                    </span>
                  </div>
                  <p className="text-xs text-red-600 mt-1">
                    AI Simulation running on staging environment
                  </p>
                  <Button size="sm" variant="outline" className="mt-2" asChild>
                    <Link to="/ai-simulation">
                      <Monitor className="w-3 h-3 mr-1" />
                      Watch Live
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
        {/* Recent Executions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Executions</CardTitle>
              <CardDescription>
                Latest test runs and their results
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/executions">
                View All
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentExecutions.map((execution) => (
              <RecentExecution key={execution.id} execution={execution} />
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Test Targets Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Test Targets</CardTitle>
              <CardDescription>
                Active target applications and their recent performance
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/test-targets">
                <Target className="w-4 h-4 mr-2" />
                Manage Targets
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.slice(0, 6).map((target: any) => {
              const lastRunStatus = target.lastRunStatus;
              const statusConfig = {
                passed: {
                  color: "text-green-600 bg-green-50 border-green-200",
                  icon: CheckCircle,
                },
                failed: {
                  color: "text-red-600 bg-red-50 border-red-200",
                  icon: XCircle,
                },
                running: {
                  color: "text-blue-600 bg-blue-50 border-blue-200",
                  icon: Clock,
                },
                cancelled: {
                  color: "text-gray-600 bg-gray-50 border-gray-200",
                  icon: Pause,
                },
              };
              const config = lastRunStatus ? statusConfig[lastRunStatus as keyof typeof statusConfig] : null;
              const StatusIcon = config?.icon;

              return (
                <div
                  key={target.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900 truncate">
                      {target.name}
                    </h4>
                    <Badge
                      variant="outline"
                      className={`text-xs ${target.environment === "production"
                          ? "bg-red-50 text-red-700 border-red-200"
                          : target.environment === "staging"
                            ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                        }`}
                    >
                      {target.environment}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-3 truncate">
                    {target.url}
                  </p>

                  {/* Target Metrics */}
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Pass Rate:</span>
                      <span className="font-medium">
                        {target.passRate?.toFixed(1)}%
                      </span>
                    </div>
                    {target.avgUxScore && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">UX Score:</span>
                        <div className="flex items-center space-x-1">
                          <span className="font-medium">
                            {target.avgUxScore}
                          </span>
                          <TrendingUp className="w-3 h-3 text-green-500" />
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Total Runs:</span>
                      <span className="font-medium">{target.totalRuns}</span>
                    </div>
                  </div>

                  {/* Last Run Status */}
                  {target.lastRunDate && config && StatusIcon && (
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                      <span>Last run:</span>
                      <div className="flex items-center space-x-1">
                        <StatusIcon
                          className={`w-3 h-3 ${config.color.split(" ")[0]}`}
                        />

                        <span>
                          {new Date(target.lastRunDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-1">
                      {target.tags?.slice(0, 2)?.map((tag: string) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-xs"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center space-x-1">
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/test-execution/${target.id}`}>
                          <Play className="w-3 h-3 mr-1" />
                          Run
                        </Link>
                      </Button>
                      {target.lastRunDate && (
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/test-results/${target.id}`}>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {projects.length === 0 && (
            <div className="text-center py-8">
              <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />

              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No targets configured
              </h3>
              <p className="text-gray-500 mb-4">
                Add your first target application to start testing
              </p>
              <Button asChild>
                <Link to="/test-targets">
                  <Target className="w-4 h-4 mr-2" />
                  Add Target
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
