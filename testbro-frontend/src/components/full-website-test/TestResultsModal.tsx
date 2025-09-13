import React, { useState, useEffect } from 'react';
import {
  X,
  Globe,
  Camera,
  Monitor,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  Search,
  Filter,
  Eye,
  EyeOff,
  ZoomIn,
  Smartphone,
  Tablet,
  TrendingUp,
  BarChart3,
  Activity,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';

import { fullWebsiteTestApi } from '@/lib/fullWebsiteTestApi';
import type {
  FullWebsiteTestSession,
  FullWebsiteTestResults,
  TestMetricsData,
  DiscoveredUrl,
  PageScreenshot,
  PageHealthCheck,
  PageChangeDetection,
  FullWebsiteTestAlert
} from '@/types/full-website-test';

// Import chart components (you'll need to install recharts)
import {
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  BarChart as RechartsBarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend
} from 'recharts';

interface TestResultsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: FullWebsiteTestSession;
}

const TestResultsModal: React.FC<TestResultsModalProps> = ({
  open,
  onOpenChange,
  session
}) => {
  const [results, setResults] = useState<FullWebsiteTestResults | null>(null);
  const [metrics, setMetrics] = useState<TestMetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState('overview');
  
  // Filter states
  const [urlFilter, setUrlFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [changeTypeFilter, setChangeTypeFilter] = useState('all');
  const [alertTypeFilter, setAlertTypeFilter] = useState('all');
  
  // Screenshot viewer state
  const [selectedScreenshot, setSelectedScreenshot] = useState<PageScreenshot | null>(null);
  const [showScreenshotModal, setShowScreenshotModal] = useState(false);

  useEffect(() => {
    if (open) {
      loadResults();
      loadMetrics();
    }
  }, [open, session.id]);

  const loadResults = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fullWebsiteTestApi.getTestResults(session.id);
      setResults(data);
    } catch (err: any) {
      console.error('Failed to load test results:', err);
      setError(err.message || 'Failed to load test results');
    } finally {
      setLoading(false);
    }
  };

  const loadMetrics = async () => {
    try {
      const metricsData = await fullWebsiteTestApi.getTestMetrics(session.id);
      setMetrics(metricsData);
    } catch (err) {
      console.error('Failed to load metrics:', err);
    }
  };

  const handleExport = async (format: 'json' | 'csv' | 'pdf') => {
    try {
      const blob = await fullWebsiteTestApi.exportResults(session.id, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${session.name}-results.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const filteredUrls = results?.discovered_urls.filter(url => {
    if (urlFilter && !url.url.toLowerCase().includes(urlFilter.toLowerCase())) return false;
    if (statusFilter !== 'all' && url.status !== statusFilter) return false;
    return true;
  }) || [];

  const filteredChanges = results?.change_detections.filter(change => {
    if (changeTypeFilter !== 'all' && change.change_type !== changeTypeFilter) return false;
    return true;
  }) || [];

  const filteredAlerts = results?.alerts.filter(alert => {
    if (alertTypeFilter !== 'all' && alert.alert_type !== alertTypeFilter) return false;
    return true;
  }) || [];

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      completed: 'text-green-600 bg-green-100',
      failed: 'text-red-600 bg-red-100',
      pending: 'text-yellow-600 bg-yellow-100',
      processing: 'text-blue-600 bg-blue-100',
      skipped: 'text-gray-600 bg-gray-100'
    };
    return colors[status] || 'text-gray-600 bg-gray-100';
  };

  const getSeverityColor = (severity: string) => {
    const colors: { [key: string]: string } = {
      critical: 'text-red-800 bg-red-100 border-red-200',
      high: 'text-orange-800 bg-orange-100 border-orange-200',
      medium: 'text-yellow-800 bg-yellow-100 border-yellow-200',
      low: 'text-blue-800 bg-blue-100 border-blue-200'
    };
    return colors[severity] || 'text-gray-800 bg-gray-100 border-gray-200';
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Loading Results...</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error || !results) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Error Loading Results</DialogTitle>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error || 'Failed to load results'}</AlertDescription>
          </Alert>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button onClick={loadResults}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-600" />
                {session.name} - Results
              </DialogTitle>
              <DialogDescription className="flex items-center gap-4">
                <span>{session.base_url}</span>
                <Badge className={getStatusColor(session.status)}>
                  {fullWebsiteTestApi.getStatusText(session.status)}
                </Badge>
              </DialogDescription>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => handleExport('json')}>
                <Download className="h-4 w-4 mr-2" />
                JSON
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExport('pdf')}>
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="h-full flex flex-col">
            <TabsList className="flex-shrink-0 grid grid-cols-6 w-full">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="urls">URLs</TabsTrigger>
              <TabsTrigger value="screenshots">Screenshots</TabsTrigger>
              <TabsTrigger value="health">Health</TabsTrigger>
              <TabsTrigger value="changes">Changes</TabsTrigger>
              <TabsTrigger value="alerts">Alerts</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden">
              {/* Overview Tab */}
              <TabsContent value="overview" className="h-full overflow-y-auto space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-muted-foreground">Pages Discovered</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">
                        {results.summary.total_pages_discovered}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-muted-foreground">Screenshots</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-purple-600">
                        {results.summary.total_screenshots_captured}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-muted-foreground">Changes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-orange-600">
                        {results.summary.total_changes_detected}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-muted-foreground">Health Score</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {results.summary.overall_health_score}/100
                      </div>
                      <Progress value={results.summary.overall_health_score} className="mt-2" />
                    </CardContent>
                  </Card>
                </div>

                {/* Metrics Charts */}
                {metrics && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Response Times Chart */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Response Times</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                          <RechartsBarChart data={metrics.response_times.labels.map((label, i) => ({
                            url: label,
                            time: metrics.response_times.data[i]
                          }))}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="url" />
                            <YAxis />
                            <RechartsTooltip />
                            <Bar dataKey="time" fill="#3B82F6" />
                          </RechartsBarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    {/* Status Codes Chart */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Status Code Distribution</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                          <RechartsPieChart>
                            <Pie
                              data={metrics.status_codes.labels.map((label, i) => ({
                                name: label,
                                value: metrics.status_codes.data[i]
                              }))}
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {metrics.status_codes.labels.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <RechartsTooltip />
                            <Legend />
                          </RechartsPieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    {/* Error Trends */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Error Trends</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                          <RechartsLineChart data={metrics.error_trends.labels.map((label, i) => ({
                            time: label,
                            errors: metrics.error_trends.data[i]
                          }))}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="time" />
                            <YAxis />
                            <RechartsTooltip />
                            <Line type="monotone" dataKey="errors" stroke="#EF4444" strokeWidth={2} />
                          </RechartsLineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    {/* Change Trends */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Change Detection Trends</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                          <RechartsLineChart data={metrics.change_trends.labels.map((label, i) => ({
                            time: label,
                            changes: metrics.change_trends.data[i]
                          }))}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="time" />
                            <YAxis />
                            <RechartsTooltip />
                            <Line type="monotone" dataKey="changes" stroke="#F59E0B" strokeWidth={2} />
                          </RechartsLineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Key Statistics */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Test Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Total Duration</div>
                        <div className="font-semibold">
                          {Math.round(results.summary.test_duration_seconds / 60)}m {results.summary.test_duration_seconds % 60}s
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Average Response Time</div>
                        <div className="font-semibold">{results.summary.average_response_time_ms}ms</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Error Rate</div>
                        <div className="font-semibold">{results.summary.error_rate_percentage.toFixed(1)}%</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Critical Issues</div>
                        <div className="font-semibold text-red-600">{results.summary.critical_issues_count}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* URLs Tab */}
              <TabsContent value="urls" className="h-full overflow-hidden space-y-4">
                <div className="flex gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Filter URLs..."
                      value={urlFilter}
                      onChange={(e) => setUrlFilter(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="skipped">Skipped</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <ScrollArea className="flex-1">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>URL</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Depth</TableHead>
                        <TableHead>Processing Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUrls.map((url) => (
                        <TableRow key={url.id}>
                          <TableCell>
                            <div className="max-w-md truncate">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <a 
                                      href={url.url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-800"
                                    >
                                      {url.url}
                                    </a>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{url.url}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            {url.title && (
                              <div className="text-xs text-muted-foreground truncate">
                                {url.title}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(url.status)}>
                              {url.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{url.source}</Badge>
                          </TableCell>
                          <TableCell>{url.depth}</TableCell>
                          <TableCell>
                            {url.processing_time_ms ? `${url.processing_time_ms}ms` : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </TabsContent>

              {/* Screenshots Tab */}
              <TabsContent value="screenshots" className="h-full overflow-hidden space-y-4">
                <ScrollArea className="flex-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {results.screenshots.map((screenshot) => (
                      <Card key={screenshot.id} className="overflow-hidden">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm truncate">
                              {new URL(screenshot.url).pathname}
                            </CardTitle>
                            <Badge variant="outline">
                              {screenshot.viewport_type}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden mb-3">
                            <img
                              src={fullWebsiteTestApi.getThumbnailUrl(screenshot.thumbnail_path || screenshot.file_path)}
                              alt={`Screenshot of ${screenshot.url}`}
                              className="w-full h-full object-cover cursor-pointer hover:opacity-75 transition-opacity"
                              onClick={() => {
                                setSelectedScreenshot(screenshot);
                                setShowScreenshotModal(true);
                              }}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">
                                {screenshot.width} × {screenshot.height}
                              </span>
                              <span className="text-muted-foreground">
                                {Math.round(screenshot.file_size / 1024)}KB
                              </span>
                            </div>
                            
                            {screenshot.has_significant_changes && (
                              <div className="flex items-center gap-1 text-xs text-orange-600">
                                <AlertTriangle className="h-3 w-3" />
                                Changes detected
                              </div>
                            )}

                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => {
                                setSelectedScreenshot(screenshot);
                                setShowScreenshotModal(true);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Health Tab */}
              <TabsContent value="health" className="h-full overflow-hidden space-y-4">
                <ScrollArea className="flex-1">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>URL</TableHead>
                        <TableHead>Status Code</TableHead>
                        <TableHead>Response Time</TableHead>
                        <TableHead>Content Size</TableHead>
                        <TableHead>Issues</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.health_checks.map((check) => (
                        <TableRow key={check.id}>
                          <TableCell className="max-w-md truncate">
                            {new URL(check.url).pathname}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              className={check.is_error ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}
                            >
                              {check.status_code}
                            </Badge>
                          </TableCell>
                          <TableCell>{check.response_time_ms}ms</TableCell>
                          <TableCell>
                            {check.content_length ? `${Math.round(check.content_length / 1024)}KB` : '-'}
                          </TableCell>
                          <TableCell>
                            {check.is_error && (
                              <div className="flex items-center gap-1 text-red-600">
                                <AlertCircle className="h-4 w-4" />
                                {check.error_type}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </TabsContent>

              {/* Changes Tab */}
              <TabsContent value="changes" className="h-full overflow-hidden space-y-4">
                <div className="flex gap-4">
                  <Select value={changeTypeFilter} onValueChange={setChangeTypeFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="content">Content</SelectItem>
                      <SelectItem value="structure">Structure</SelectItem>
                      <SelectItem value="style">Style</SelectItem>
                      <SelectItem value="performance">Performance</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <ScrollArea className="flex-1">
                  <div className="space-y-3">
                    {filteredChanges.map((change) => (
                      <Card key={change.id}>
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className={getSeverityColor(change.severity)}>
                                  {change.severity}
                                </Badge>
                                <Badge variant="outline">{change.change_type}</Badge>
                              </div>
                              
                              <h4 className="font-medium mb-2">{change.description}</h4>
                              <p className="text-sm text-muted-foreground mb-2">
                                URL: {new URL(change.url).pathname}
                              </p>
                              
                              {(change.old_value || change.new_value) && (
                                <div className="text-xs space-y-1">
                                  {change.old_value && (
                                    <div>
                                      <span className="font-medium text-red-600">Before: </span>
                                      <span className="bg-red-50 px-1 rounded">{change.old_value}</span>
                                    </div>
                                  )}
                                  {change.new_value && (
                                    <div>
                                      <span className="font-medium text-green-600">After: </span>
                                      <span className="bg-green-50 px-1 rounded">{change.new_value}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            <div className="text-xs text-muted-foreground">
                              {new Date(change.detected_at).toLocaleString()}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Alerts Tab */}
              <TabsContent value="alerts" className="h-full overflow-hidden space-y-4">
                <div className="flex gap-4">
                  <Select value={alertTypeFilter} onValueChange={setAlertTypeFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <ScrollArea className="flex-1">
                  <div className="space-y-3">
                    {filteredAlerts.map((alert) => (
                      <Alert key={alert.id} variant={alert.alert_type === 'error' || alert.alert_type === 'critical' ? 'destructive' : 'default'}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={getSeverityColor(alert.alert_type)}>
                                {alert.alert_type}
                              </Badge>
                              {alert.component && (
                                <Badge variant="outline">{alert.component}</Badge>
                              )}
                            </div>
                            
                            <h4 className="font-medium mb-1">{alert.title}</h4>
                            <AlertDescription className="text-sm mb-2">
                              {alert.message}
                            </AlertDescription>
                            
                            {alert.url && (
                              <p className="text-xs text-muted-foreground">
                                URL: {new URL(alert.url).pathname}
                              </p>
                            )}
                          </div>
                          
                          <div className="text-xs text-muted-foreground">
                            {new Date(alert.created_at).toLocaleString()}
                          </div>
                        </div>
                      </Alert>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>

      {/* Screenshot Viewer Modal */}
      {selectedScreenshot && (
        <Dialog open={showScreenshotModal} onOpenChange={setShowScreenshotModal}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Screenshot - {new URL(selectedScreenshot.url).pathname}
              </DialogTitle>
              <DialogDescription>
                {selectedScreenshot.viewport_type} · {selectedScreenshot.width} × {selectedScreenshot.height}
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 overflow-auto">
              <img
                src={fullWebsiteTestApi.getScreenshotUrl(selectedScreenshot.file_path)}
                alt={`Screenshot of ${selectedScreenshot.url}`}
                className="w-full h-auto border rounded"
              />
              
              {selectedScreenshot.has_significant_changes && selectedScreenshot.difference_image_path && (
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Difference Visualization</h4>
                  <img
                    src={fullWebsiteTestApi.getDifferenceImageUrl(selectedScreenshot.difference_image_path)}
                    alt="Difference visualization"
                    className="w-full h-auto border rounded"
                  />
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowScreenshotModal(false)}>
                Close
              </Button>
              <Button asChild>
                <a 
                  href={fullWebsiteTestApi.getScreenshotUrl(selectedScreenshot.file_path)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </a>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
};

export default TestResultsModal;
