import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Bot,
  Video,
  PlayCircle,
  Loader2,
  Wifi,
  WifiOff,
  BarChart3,
  PieChart,
  DollarSign,
  Users,
  Filter,
  Download,
  Calendar,
  ArrowUp,
  ArrowDown,
  Eye,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardService, DashboardMetrics, DashboardTrends, CostSavingsMetrics, IndustryBenchmark, ClientReportData } from "@/lib/services/dashboardService";
import { ExecutionService } from "@/lib/services/executionService";
import { useWebSocket } from "@/hooks/useWebSocket";
import { PDFExportService } from "@/lib/utils/pdfExport";

const MetricCard = ({
  title,
  value,
  change,
  changeType,
  icon: Icon,
  description,
  trend,
}: {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: React.ElementType;
  description?: string;
  trend?: number[];
}) => {
  const changeColor = {
    positive: "text-green-600",
    negative: "text-red-600",
    neutral: "text-gray-600",
  }[changeType || "neutral"];

  const ChangeIcon =
    changeType === "positive"
      ? ArrowUp
      : changeType === "negative"
        ? ArrowDown
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
        {trend && (
          <div className="mt-2 h-8">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend.map((value, index) => ({ value, index }))}>
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={
                    changeType === "positive"
                      ? "#10b981"
                      : changeType === "negative"
                        ? "#ef4444"
                        : "#6b7280"
                  }
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const IssueCard = ({ issue, index }: { issue: any; index: number }) => {
  const severityConfig = {
    low: {
      color: "bg-yellow-100 text-yellow-800 border-yellow-200",
      icon: AlertTriangle,
    },
    medium: {
      color: "bg-orange-100 text-orange-800 border-orange-200",
      icon: AlertTriangle,
    },
    high: {
      color: "bg-red-100 text-red-800 border-red-200",
      icon: AlertTriangle,
    },
    critical: {
      color: "bg-red-200 text-red-900 border-red-300",
      icon: AlertTriangle,
    },
  };

  const config = severityConfig[issue.severity as keyof typeof severityConfig];
  const SeverityIcon = config.icon;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium">
              {index + 1}
            </div>
            <Badge variant="outline" className={config.color}>
              <SeverityIcon className="w-3 h-3 mr-1" />

              {issue.severity}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {issue.type}
            </Badge>
          </div>
        </div>

        <h4 className="font-medium text-gray-900 mb-2">{issue.description}</h4>
        <p className="text-sm text-gray-600 mb-3">{issue.suggestion}</p>

        <div className="bg-blue-50 border border-blue-200 rounded p-3">
          <div className="flex items-center space-x-1 mb-1">
            <DollarSign className="w-3 h-3 text-blue-600" />

            <span className="text-xs font-medium text-blue-800">
              Business Impact
            </span>
          </div>
          <p className="text-xs text-blue-700">{issue.businessImpact}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default function AnalyticsDashboard() {
  const { isAuthenticated } = useAuth();
  const [timeRange, setTimeRange] = useState("7d");
  const [activeTab, setActiveTab] = useState("overview");
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [trends, setTrends] = useState<DashboardTrends[]>([]);
  const [executions, setExecutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realTimeEvents, setRealTimeEvents] = useState<any[]>([]);
  const [costSavings, setCostSavings] = useState<CostSavingsMetrics | null>(null);
  const [benchmarks, setBenchmarks] = useState<IndustryBenchmark[]>([]);
  const [exportLoading, setExportLoading] = useState(false);
  
  // WebSocket connection for real-time updates
  const { connectionState, addEventListener, removeEventListener } = useWebSocket();

  useEffect(() => {
    const loadAnalyticsData = async () => {
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Load analytics data in parallel
        const [
          { data: metricsData, error: metricsError },
          { data: trendsData, error: trendsError },
          { data: executionsData, error: executionsError },
          { data: costSavingsData, error: costSavingsError },
          { data: benchmarksData, error: benchmarksError }
        ] = await Promise.all([
          DashboardService.getMetrics(),
          DashboardService.getTrends(timeRange),
          ExecutionService.listExecutions({ limit: 50, sort_by: 'started_at', sort_order: 'desc' }),
          DashboardService.getCostSavingsMetrics(),
          DashboardService.getIndustryBenchmarks()
        ]);

        if (metricsError) {
          console.warn('Failed to load metrics:', metricsError);
          setMetrics(null);
        } else {
          setMetrics(metricsData);
        }

        if (trendsError) {
          console.warn('Failed to load trends:', trendsError);
          setTrends([]);
        } else {
          setTrends(trendsData || []);
        }

        if (executionsError) {
          console.warn('Failed to load executions:', executionsError);
          setExecutions([]);
        } else {
          setExecutions(executionsData || []);
        }

        if (costSavingsError) {
          console.warn('Failed to load cost savings:', costSavingsError);
          setCostSavings(null);
        } else {
          setCostSavings(costSavingsData);
        }

        if (benchmarksError) {
          console.warn('Failed to load benchmarks:', benchmarksError);
          setBenchmarks([]);
        } else {
          setBenchmarks(benchmarksData || []);
        }

      } catch (err) {
        console.error('Failed to load analytics data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };

    loadAnalyticsData();
  }, [isAuthenticated, timeRange]);

  // Real-time event handler
  useEffect(() => {
    const handleRealTimeEvent = (event: any) => {
      setRealTimeEvents(prev => {
        const newEvents = [event, ...prev.slice(0, 99)]; // Keep last 100 events
        return newEvents;
      });
      
      // Update metrics based on real-time events
      if (event.type === 'execution_complete') {
        // Refresh metrics when execution completes
        // We'll trigger a refresh by updating the timeRange state
        setTimeRange(prev => prev); // This will trigger useEffect
      }
    };

    if (connectionState.connected) {
      addEventListener('execution_event', handleRealTimeEvent);
      addEventListener('user_event', handleRealTimeEvent);
      addEventListener('broadcast_event', handleRealTimeEvent);
    }

    return () => {
      removeEventListener('execution_event', handleRealTimeEvent);
      removeEventListener('user_event', handleRealTimeEvent);
      removeEventListener('broadcast_event', handleRealTimeEvent);
    };
  }, [connectionState.connected, addEventListener, removeEventListener]);

  // Export functions
  const handleExportClientReport = async () => {
    if (!metrics || !costSavings || !benchmarks) {
      alert('Please wait for all data to load before generating report');
      return;
    }

    try {
      setExportLoading(true);
      const { data: reportData } = await DashboardService.getClientReportData('Your Company');
      if (reportData) {
        await PDFExportService.generateClientReport(reportData);
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to generate client report. Please try again.');
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportDashboard = async () => {
    try {
      setExportLoading(true);
      await PDFExportService.exportDashboardToPDF('analytics-dashboard', 'analytics-dashboard');
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export dashboard. Please try again.');
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportSummary = async () => {
    if (!metrics || !costSavings || !benchmarks) {
      alert('Please wait for all data to load before generating summary');
      return;
    }

    try {
      setExportLoading(true);
      await PDFExportService.generateMetricsSummary(metrics, costSavings, benchmarks);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to generate summary. Please try again.');
    } finally {
      setExportLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-gray-600">Loading analytics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load analytics data: {error}
            <Button onClick={() => window.location.reload()} className="ml-2" size="sm" variant="outline">
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Use trends data or create mock performance data for charts
  const performanceData = trends.length > 0 ? trends.map((item) => ({
    ...item,
    responseTime: Math.random() * 2000 + 500,
    errorRate: Math.random() * 5,
    throughput: Math.random() * 100 + 50,
  })) : [];

  const businessImpactData = [
    { name: "Revenue Protected", value: 125000, color: "hsl(var(--chart-1))" },
    {
      name: "Potential Loss Prevented",
      value: 45000,
      color: "hsl(var(--chart-2))",
    },
    {
      name: "User Experience Improved",
      value: 89000,
      color: "hsl(var(--chart-3))",
    },
  ];

  const testTypeDistribution = [
    { name: "E2E Tests", value: 45, color: "hsl(var(--chart-1))" },
    { name: "UI Tests", value: 30, color: "hsl(var(--chart-2))" },
    { name: "API Tests", value: 15, color: "hsl(var(--chart-3))" },
    { name: "Performance", value: 10, color: "hsl(var(--chart-4))" },
  ];

  const aiInsightsData = [
    { category: "UX Issues Detected", count: 23, trend: "up", change: "+15%" },
    {
      category: "Performance Bottlenecks",
      count: 8,
      trend: "down",
      change: "-12%",
    },
    {
      category: "Accessibility Violations",
      count: 12,
      trend: "up",
      change: "+8%",
    },
    { category: "Security Concerns", count: 3, trend: "stable", change: "0%" },
  ];

  return (
    <div id="analytics-dashboard" className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Analytics & Insights
          </h1>
          <p className="text-gray-600 flex items-center space-x-2">
            <span>AI-powered testing analytics and business impact analysis</span>
            {connectionState.connected ? (
              <Badge variant="outline" className="text-green-700 border-green-300">
                <Wifi className="w-3 h-3 mr-1" />
                Live Data
              </Badge>
            ) : (
              <Badge variant="outline" className="text-red-700 border-red-300">
                <WifiOff className="w-3 h-3 mr-1" />
                Static Data
              </Badge>
            )}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExportClientReport}
              disabled={exportLoading}
            >
              <Download className="w-4 h-4 mr-2" />
              {exportLoading ? 'Generating...' : 'Client Report'}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExportSummary}
              disabled={exportLoading}
            >
              <Download className="w-4 h-4 mr-2" />
              Quick Summary
            </Button>
          </div>
          {exportLoading && (
            <div className="flex items-center text-sm text-gray-600">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating PDF...
            </div>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Test Reliability"
          value={metrics?.reliabilityScore ? `${metrics.reliabilityScore.toFixed(1)}%` : "94.3%"}
          change="+2.1% from last week"
          changeType="positive"
          icon={Target}
          description="Overall system reliability"
          trend={[92, 93, 94, 93, 95, 94, 94]}
        />

        <MetricCard
          title="AI Accuracy"
          value="96.8%"
          change="+1.5% from last week"
          changeType="positive"
          icon={Bot}
          description="AI prediction accuracy"
          trend={[95, 96, 97, 96, 97, 97, 97]}
        />

        <MetricCard
          title="Monthly Savings"
          value={costSavings ? `$${costSavings.monthlySavings.toLocaleString()}` : "$12K"}
          change={costSavings ? `+${costSavings.hoursSaved} hours saved` : "+120 hours saved"}
          changeType="positive"
          icon={DollarSign}
          description="Automation cost savings"
          trend={[8000, 9500, 11000, 10500, 12000, 12000, 12000]}
        />

        <MetricCard
          title="User Experience Score"
          value="8.7/10"
          change="+0.3 from last week"
          changeType="positive"
          icon={Users}
          description="AI-calculated UX score"
          trend={[8.2, 8.3, 8.5, 8.4, 8.6, 8.7, 8.7]}
        />
      </div>

      {/* Cost Savings Highlight */}
      {costSavings && (
        <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-green-800 mb-2">
                  🎉 Your automation saved ~{costSavings.hoursSaved} hours manual testing this month
                </h3>
                <p className="text-green-700">
                  That's equivalent to <strong>${costSavings.monthlySavings.toLocaleString()}</strong> in cost savings!
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-800">
                  ${costSavings.yearlyProjectedSavings.toLocaleString()}
                </div>
                <div className="text-sm text-green-600">Projected annual savings</div>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-green-200">
              <div className="text-center">
                <div className="text-lg font-semibold text-green-800">{costSavings.manualTestingHoursAvoided}</div>
                <div className="text-xs text-green-600">Manual testing hours avoided</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-green-800">{costSavings.bugFixTimeReduced}</div>
                <div className="text-xs text-green-600">Bug fix hours reduced</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-green-800">{costSavings.regressionTestsSaved}</div>
                <div className="text-xs text-green-600">Regression tests automated</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-green-800">{costSavings.deploymentTimeReduced}h</div>
                <div className="text-xs text-green-600">Deployment time reduced</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="video-analysis">Video Analysis</TabsTrigger>
          <TabsTrigger value="ai-insights">AI Insights</TabsTrigger>
          <TabsTrigger value="benchmarks">Industry Benchmarks</TabsTrigger>
          <TabsTrigger value="business">Business Impact</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Test Execution Trends */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Test Execution Trends</CardTitle>
                <CardDescription>Daily test results over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="aspect-[none] h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trends}>
                      <XAxis
                        dataKey="date"
                        tickFormatter={(value) =>
                          new Date(value).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })
                        }
                      />
                      <Area
                        type="monotone"
                        dataKey="passed"
                        stackId="1"
                        stroke="hsl(var(--chart-1))"
                        fill="hsl(var(--chart-1))"
                        fillOpacity={0.6}
                        name="Passed Tests"
                      />
                      <Area
                        type="monotone"
                        dataKey="failed"
                        stackId="1"
                        stroke="hsl(var(--chart-2))"
                        fill="hsl(var(--chart-2))"
                        fillOpacity={0.6}
                        name="Failed Tests"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Test Type Distribution</CardTitle>
                <CardDescription>Breakdown by test categories</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="aspect-[none] h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={testTypeDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        dataKey="value"
                      >
                        {testTypeDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {testTypeDistribution.map((item, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      ></div>
                      <span className="text-sm text-gray-600">
                        {item.name} ({item.value}%)
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* UX Quality Trends */}
          <Card>
            <CardHeader>
              <CardTitle>UX Quality Score Trends</CardTitle>
              <CardDescription>
                AI-calculated user experience quality over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="aspect-[none] h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trends}>
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) =>
                        new Date(value).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="uxScore"
                      stroke="hsl(var(--chart-3))"
                      strokeWidth={3}
                      name="UX Score"
                      dot={{
                        fill: "hsl(var(--chart-3))",
                        strokeWidth: 2,
                        r: 4,
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Response Time Trends</CardTitle>
                <CardDescription>
                  Average response times over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="aspect-[none] h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={performanceData}>
                      <XAxis
                        dataKey="date"
                        tickFormatter={(value) =>
                          new Date(value).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })
                        }
                      />
                      <Line
                        type="monotone"
                        dataKey="responseTime"
                        stroke="hsl(var(--chart-1))"
                        strokeWidth={2}
                        name="Response Time (ms)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Error Rate Analysis</CardTitle>
                <CardDescription>
                  Error rates across different test runs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="aspect-[none] h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={performanceData}>
                      <XAxis
                        dataKey="date"
                        tickFormatter={(value) =>
                          new Date(value).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })
                        }
                      />
                      <Bar
                        dataKey="errorRate"
                        fill="hsl(var(--chart-2))"
                        name="Error Rate (%)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="video-analysis" className="space-y-6">
          {/* Video Analytics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <Video className="w-5 h-5 text-blue-600" />

                  <Badge variant="secondary">+23</Badge>
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-2">156</p>
                <p className="text-sm text-gray-600">Total Recordings</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <Clock className="w-5 h-5 text-green-600" />

                  <Badge
                    variant="secondary"
                    className="bg-green-100 text-green-800"
                  >
                    -12s
                  </Badge>
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-2">3m 24s</p>
                <p className="text-sm text-gray-600">Avg Duration</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <Users className="w-5 h-5 text-purple-600" />

                  <Badge
                    variant="secondary"
                    className="bg-purple-100 text-purple-800"
                  >
                    +8%
                  </Badge>
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-2">2,847</p>
                <p className="text-sm text-gray-600">User Interactions</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <Eye className="w-5 h-5 text-orange-600" />

                  <Badge
                    variant="secondary"
                    className="bg-orange-100 text-orange-800"
                  >
                    HD
                  </Badge>
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-2">98.5%</p>
                <p className="text-sm text-gray-600">Video Quality</p>
              </CardContent>
            </Card>
          </div>

          {/* Featured Video Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Video className="w-5 h-5 text-blue-600" />

                <span>Featured Test Analysis</span>
              </CardTitle>
              <CardDescription>
                Detailed analysis of high-impact test execution with AI insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Video Player */}
                <div className="space-y-4">
                  <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                    <BrowserAutomationPlayer
                      automationData={{
                        videoUrl: "/videos/featured-analytics-test.mp4",
                        thumbnailUrl: "/thumbnails/analytics-featured.jpg",
                        duration: 285,
                        recordingStartTime: "2024-01-24T15:45:00Z",
                        recordingEndTime: "2024-01-24T15:49:45Z",
                        playbackControls: {
                          canPlay: true,
                          canPause: true,
                          canSeek: true,
                          availableSpeeds: [0.5, 1, 1.5, 2],
                        },
                      }}
                      testCaseName="Critical User Journey - Payment Flow"
                      isLive={false}
                      className="w-full h-full"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Critical User Journey Analysis
                      </h4>
                      <p className="text-sm text-gray-600">
                        Payment Flow • 4m 45s • Production Environment
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      View Full Analysis
                    </Button>
                  </div>
                </div>

                {/* Analysis Results */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">
                    AI Video Analysis Results
                  </h4>

                  {/* Key Findings */}
                  <div className="space-y-3">
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-red-600" />

                        <span className="text-sm font-medium text-red-800">
                          Critical Issue Detected
                        </span>
                      </div>
                      <p className="text-sm text-red-700">
                        User hesitation detected at payment step (2:34-2:58).
                        24-second delay suggests UX friction.
                      </p>
                    </div>

                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-600" />

                        <span className="text-sm font-medium text-yellow-800">
                          Performance Concern
                        </span>
                      </div>
                      <p className="text-sm text-yellow-700">
                        Page load time exceeded 3 seconds. Consider optimizing
                        checkout page performance.
                      </p>
                    </div>

                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />

                        <span className="text-sm font-medium text-green-800">
                          Positive Behavior
                        </span>
                      </div>
                      <p className="text-sm text-green-700">
                        Smooth navigation through product selection. User
                        confidence indicators are strong.
                      </p>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-lg font-bold text-gray-900">47</p>
                      <p className="text-xs text-gray-600">User Interactions</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-lg font-bold text-gray-900">3</p>
                      <p className="text-xs text-gray-600">Hesitation Points</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-lg font-bold text-gray-900">1</p>
                      <p className="text-xs text-gray-600">User Errors</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-lg font-bold text-gray-900">94%</p>
                      <p className="text-xs text-gray-600">Task Completion</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Video Performance Trends */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>User Interaction Patterns</CardTitle>
                <CardDescription>
                  Analysis of user behavior patterns from video recordings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="aspect-[none] h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trends}>
                      <XAxis
                        dataKey="date"
                        tickFormatter={(value) =>
                          new Date(value).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })
                        }
                      />
                      <Area
                        type="monotone"
                        dataKey="uxScore"
                        stroke="hsl(var(--chart-4))"
                        fill="hsl(var(--chart-4))"
                        fillOpacity={0.6}
                        name="Interaction Quality"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Video-Based Insights</CardTitle>
                <CardDescription>
                  Key insights derived from browser automation recordings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    {
                      title: "Average Task Completion Time",
                      value: "3m 24s",
                      change: "-18s from last week",
                      positive: true,
                    },
                    {
                      title: "User Hesitation Events",
                      value: "2.3 per session",
                      change: "-0.7 from last week",
                      positive: true,
                    },
                    {
                      title: "Error Recovery Rate",
                      value: "89%",
                      change: "+5% from last week",
                      positive: true,
                    },
                    {
                      title: "Navigation Efficiency",
                      value: "94%",
                      change: "+2% from last week",
                      positive: true,
                    },
                  ].map((insight, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {insight.title}
                        </p>
                        <p className="text-lg font-bold text-gray-900">
                          {insight.value}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant={insight.positive ? "default" : "destructive"}
                          className="text-xs"
                        >
                          {insight.change}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ai-insights" className="space-y-6">
          {/* AI Insights Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {aiInsightsData.map((insight, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Bot className="w-5 h-5 text-purple-600" />

                    <Badge
                      variant={
                        insight.trend === "up"
                          ? "destructive"
                          : insight.trend === "down"
                            ? "default"
                            : "secondary"
                      }
                    >
                      {insight.change}
                    </Badge>
                  </div>
                  <h4 className="font-medium text-gray-900 mb-1">
                    {insight.category}
                  </h4>
                  <p className="text-2xl font-bold text-gray-900">
                    {insight.count}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Top Issues */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bot className="w-5 h-5 text-purple-600" />

                <span>AI-Detected Issues</span>
              </CardTitle>
              <CardDescription>
                Critical issues identified by AI analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {metrics?.topIssues?.slice(0, 6)?.map((issue: any, index: number) => (
                  <IssueCard key={index} issue={issue} index={index} />
                )) || (
                  <p className="text-gray-500 col-span-2">No issues detected</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="benchmarks" className="space-y-6">
          {/* Industry Benchmarks Header */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                <span>Industry Performance Comparison</span>
              </CardTitle>
              <CardDescription>
                See how your testing performance compares to industry standards. This helps demonstrate your competitive advantage to clients.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">Your Percentile Ranking</h4>
                  <div className="text-2xl font-bold text-blue-900">
                    {benchmarks.length > 0 ? 
                      `${Math.round(benchmarks.reduce((sum, b) => sum + b.percentile, 0) / benchmarks.length)}th` : 
                      '78th'
                    } Percentile
                  </div>
                  <p className="text-sm text-blue-700 mt-1">
                    You're performing better than {benchmarks.length > 0 ? 
                      Math.round(benchmarks.reduce((sum, b) => sum + b.percentile, 0) / benchmarks.length) : 
                      78
                    }% of companies
                  </p>
                </div>
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-2">Metrics Above Average</h4>
                  <div className="text-2xl font-bold text-green-900">
                    {benchmarks.filter(b => b.yourValue > b.industryAverage).length} / {benchmarks.length}
                  </div>
                  <p className="text-sm text-green-700 mt-1">
                    Strong performance across key metrics
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Benchmark Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {benchmarks.map((benchmark, index) => {
              const isAboveAverage = benchmark.yourValue > benchmark.industryAverage
              const isTopTier = benchmark.yourValue >= benchmark.industryTop10 * 0.95 // Within 5% of top 10%
              
              return (
                <Card key={index} className={`${isTopTier ? 'border-gold-200 bg-yellow-50' : isAboveAverage ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="text-base">{benchmark.metric}</span>
                      <Badge 
                        variant={isTopTier ? "default" : isAboveAverage ? "secondary" : "outline"}
                        className={isTopTier ? "bg-yellow-500 text-white" : isAboveAverage ? "bg-green-500 text-white" : ""}
                      >
                        {benchmark.percentile}th percentile
                      </Badge>
                    </CardTitle>
                    <CardDescription>{benchmark.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Your Performance */}
                      <div className="flex items-center justify-between p-3 bg-white border rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-900">Your Performance</p>
                          <p className="text-2xl font-bold text-blue-600">{benchmark.yourValue}{benchmark.unit}</p>
                        </div>
                        <div className="flex items-center space-x-1">
                          {benchmark.trend === 'improving' && <TrendingUp className="w-4 h-4 text-green-500" />}
                          {benchmark.trend === 'declining' && <TrendingDown className="w-4 h-4 text-red-500" />}
                          {benchmark.trend === 'stable' && <Activity className="w-4 h-4 text-gray-500" />}
                          <span className="text-xs text-gray-500 capitalize">{benchmark.trend}</span>
                        </div>
                      </div>

                      {/* Comparison Bars */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Industry Average</span>
                          <span className="font-medium">{benchmark.industryAverage}{benchmark.unit}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-gray-400 h-2 rounded-full" 
                            style={{width: '50%'}}
                          ></div>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Your Performance</span>
                          <span className="font-medium text-blue-600">{benchmark.yourValue}{benchmark.unit}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              isTopTier ? 'bg-yellow-500' : 
                              isAboveAverage ? 'bg-green-500' : 'bg-red-500'
                            }`}
                            style={{
                              width: `${Math.min(100, (benchmark.yourValue / benchmark.industryTop10) * 100)}%`
                            }}
                          ></div>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Top 10% Companies</span>
                          <span className="font-medium text-yellow-600">{benchmark.industryTop10}{benchmark.unit}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-yellow-500 h-2 rounded-full" style={{width: '90%'}}></div>
                        </div>
                      </div>

                      {/* Performance Message */}
                      <div className={`p-3 rounded-lg ${
                        isTopTier ? 'bg-yellow-100 border border-yellow-300' :
                        isAboveAverage ? 'bg-green-100 border border-green-300' :
                        'bg-red-100 border border-red-300'
                      }`}>
                        <p className={`text-sm font-medium ${
                          isTopTier ? 'text-yellow-800' :
                          isAboveAverage ? 'text-green-800' :
                          'text-red-800'
                        }`}>
                          {isTopTier ? '🏆 Elite Performance' :
                           isAboveAverage ? '✅ Above Industry Average' :
                           '⚠️ Below Industry Average'}
                        </p>
                        <p className={`text-xs mt-1 ${
                          isTopTier ? 'text-yellow-700' :
                          isAboveAverage ? 'text-green-700' :
                          'text-red-700'
                        }`}>
                          {isTopTier ? 'You\'re in the top tier of companies for this metric.' :
                           isAboveAverage ? `You're performing ${((benchmark.yourValue / benchmark.industryAverage - 1) * 100).toFixed(1)}% better than average.` :
                           'Consider focusing on improving this metric to stay competitive.'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Benchmark Summary for Client Presentation */}
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="w-5 h-5 text-blue-600" />
                <span>Client Presentation Summary</span>
              </CardTitle>
              <CardDescription>
                Key points to share with clients about your competitive positioning
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-white border border-blue-200 rounded-lg">
                    <h4 className="font-semibold text-blue-800 mb-2">Overall Ranking</h4>
                    <p className="text-2xl font-bold text-blue-600">
                      {benchmarks.length > 0 ? 
                        `${Math.round(benchmarks.reduce((sum, b) => sum + b.percentile, 0) / benchmarks.length)}th` : 
                        '78th'
                      } percentile
                    </p>
                    <p className="text-sm text-blue-700">Across all metrics</p>
                  </div>
                  
                  <div className="p-4 bg-white border border-green-200 rounded-lg">
                    <h4 className="font-semibold text-green-800 mb-2">Strengths</h4>
                    <p className="text-2xl font-bold text-green-600">
                      {benchmarks.filter(b => b.yourValue > b.industryAverage).length}
                    </p>
                    <p className="text-sm text-green-700">metrics above average</p>
                  </div>
                  
                  <div className="p-4 bg-white border border-purple-200 rounded-lg">
                    <h4 className="font-semibold text-purple-800 mb-2">Elite Performance</h4>
                    <p className="text-2xl font-bold text-purple-600">
                      {benchmarks.filter(b => b.yourValue >= b.industryTop10 * 0.95).length}
                    </p>
                    <p className="text-sm text-purple-700">top-tier metrics</p>
                  </div>
                </div>
                
                <Alert className="border-blue-200 bg-blue-50">
                  <AlertTriangle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    <strong>Client Value Proposition:</strong> Your testing automation program is performing better than {benchmarks.length > 0 ? Math.round(benchmarks.reduce((sum, b) => sum + b.percentile, 0) / benchmarks.length) : 78}% of companies in the industry, demonstrating your commitment to quality and reliability. This competitive advantage translates directly into better user experiences and reduced business risk.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
          {/* Business Impact Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Impact</CardTitle>
                <CardDescription>
                  Financial impact of testing improvements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="aspect-[none] h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={businessImpactData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        dataKey="value"
                      >
                        {businessImpactData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 mt-4">
                  {businessImpactData.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        ></div>
                        <span className="text-sm text-gray-600">
                          {item.name}
                        </span>
                      </div>
                      <span className="text-sm font-medium">
                        ${item.value.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Conversion Impact</CardTitle>
                <CardDescription>
                  How testing improvements affect user conversions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div>
                      <p className="text-sm text-green-800 font-medium">
                        Checkout Completion Rate
                      </p>
                      <p className="text-2xl font-bold text-green-900">
                        +12.5%
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-green-600" />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div>
                      <p className="text-sm text-blue-800 font-medium">
                        User Registration Rate
                      </p>
                      <p className="text-2xl font-bold text-blue-900">+8.3%</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-blue-600" />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <div>
                      <p className="text-sm text-purple-800 font-medium">
                        User Satisfaction Score
                      </p>
                      <p className="text-2xl font-bold text-purple-900">
                        +15.2%
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
