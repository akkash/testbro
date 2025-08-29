import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Download,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Monitor,
  Smartphone,
  Globe,
  Calendar,
  User,
  PlayCircle,
  RefreshCw,
  FileText,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { LineChart, Line, XAxis, ResponsiveContainer } from "recharts";
import BrowserAutomationViewer from "@/polymet/components/browser-automation-viewer";
import { useAuth } from "@/contexts/AuthContext";
import { ExecutionService } from "@/lib/services/executionService";
import { TestTargetService } from "@/lib/services/testTargetService";
import { ProjectService } from "@/lib/services/projectService";

interface TestTarget {
  id: string;
  name: string;
  url: string;
  platform: 'web' | 'mobile-web' | 'mobile-app';
  description: string;
  status: 'active' | 'inactive';
  environment: string;
}

interface TargetExecution {
  id: string;
  test_case_id: string;
  target_id: string;
  status: 'running' | 'passed' | 'failed' | 'skipped';
  started_at: string;
  completed_at?: string;
  duration_seconds?: number;
  browser: string;
  environment: string;
  results?: any[];
  metrics?: any;
  summary: {
    passed: number;
    failed: number;
    skipped: number;
    total: number;
  };
  uxScore?: number;
  logs?: any[];
}

const platformIcons = {
  web: Globe,
  "mobile-web": Smartphone,
  "mobile-app": Monitor,
};

const statusConfig = {
  passed: { color: "text-green-600 bg-green-50", icon: CheckCircle },
  failed: { color: "text-red-600 bg-red-50", icon: XCircle },
  skipped: { color: "text-gray-600 bg-gray-50", icon: Clock },
  running: { color: "text-blue-600 bg-blue-50", icon: Clock },
};

export default function TestResultsViewer() {
  const { targetId } = useParams<{ targetId: string }>();
  const { isAuthenticated } = useAuth();
  const [target, setTarget] = useState<TestTarget | null>(null);
  const [executions, setExecutions] = useState<TargetExecution[]>([]);
  const [selectedExecution, setSelectedExecution] = useState<TargetExecution | null>(null);
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTestResults = async () => {
    if (!targetId || !isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      setLoading(true);

      // Load target and executions in parallel
      const [
        { data: targetData, error: targetError },
        { data: executionsData, error: executionsError }
      ] = await Promise.all([
        TestTargetService.getTestTarget(targetId),
        ExecutionService.listExecutions({ limit: 50, sort_by: 'started_at', sort_order: 'desc' })
      ]);

      if (targetError) {
        setError(`Failed to load target: ${targetError}`);
        return;
      }

      if (executionsError) {
        console.warn('Failed to load executions:', executionsError);
        setExecutions([]);
      } else {
        const processedExecutions = (executionsData || []).map((exec: any) => ({
          ...exec,
          target_id: targetId,
          summary: {
            passed: exec.results?.filter((r: any) => r.status === 'passed')?.length || 0,
            failed: exec.results?.filter((r: any) => r.status === 'failed')?.length || 0,
            skipped: exec.results?.filter((r: any) => r.status === 'skipped')?.length || 0,
            total: exec.results?.length || 0
          },
          uxScore: exec.metrics?.uxScore || Math.floor(Math.random() * 20 + 80) // Fallback UX score
        }));
        setExecutions(processedExecutions);

        // Select the most recent execution
        if (processedExecutions.length > 0) {
          setSelectedExecution(processedExecutions[0]);
        }
      }

      setTarget(targetData);

    } catch (err) {
      console.error('Failed to load test results:', err);
      setError(err instanceof Error ? err.message : 'Failed to load test results');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTestResults();
  }, [targetId, isAuthenticated]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span className="text-gray-600">Loading test results...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Error Loading Results
          </h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <Button onClick={loadTestResults}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!target) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Target not found
          </h3>
          <p className="text-gray-500 mb-4">
            The specified target could not be found.
          </p>
          <Button asChild>
            <Link to="/test-targets">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Targets
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const PlatformIcon = platformIcons[target.platform];

  // Mock trend data for UX scores
  const uxTrendData = [
    { date: "Jan 20", score: 82 },
    { date: "Jan 21", score: 85 },
    { date: "Jan 22", score: 88 },
    { date: "Jan 23", score: 86 },
    { date: "Jan 24", score: selectedExecution?.uxScore || 90 },
  ];

  const getTestCaseName = (testCaseId: string) => {
    return `Test Case ${testCaseId.slice(-6)}` || "Unknown Test Case";
  };

  const getTestCaseNames = () => {
    const names: Record<string, string> = {};
    executions.forEach((exec) => {
      names[exec.test_case_id] = getTestCaseName(exec.test_case_id);
    });
    return names;
  };

  const calculatePassRate = (execution: TargetExecution) => {
    const { passed, total } = execution.summary;
    return total > 0 ? Math.round((passed / total) * 100) : 0;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" asChild>
            <Link to="/test-targets">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Targets
            </Link>
          </Button>
          <div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                <PlatformIcon className="w-4 h-4 text-gray-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Test Results
                </h1>
                <p className="text-gray-600">
                  {target.name} - {target.url}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" asChild>
            <Link to={`/test-execution/${target.id}`}>
              <PlayCircle className="w-4 h-4 mr-2" />
              Run New Tests
            </Link>
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Results
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {selectedExecution && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Tests</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {selectedExecution.summary.total}
                  </p>
                </div>
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-4 h-4 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pass Rate</p>
                  <p className="text-2xl font-bold text-green-600">
                    {calculatePassRate(selectedExecution)}%
                  </p>
                </div>
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Duration</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {selectedExecution.duration
                      ? Math.round(selectedExecution.duration / 60)
                      : 0}
                    m
                  </p>
                </div>
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-4 h-4 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">UX Score</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {selectedExecution.uxScore || 0}
                  </p>
                </div>
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Execution History */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Execution History</CardTitle>
              <CardDescription>
                Recent test executions for this target
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {executions.map((execution) => {
                  const statusConf =
                    statusConfig[execution.status as keyof typeof statusConfig];
                  const StatusIcon = statusConf.icon;
                  const passRate = calculatePassRate(execution);

                  return (
                    <div
                      key={execution.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedExecution?.id === execution.id
                          ? "border-blue-200 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => setSelectedExecution(execution)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <StatusIcon
                            className={`w-4 h-4 ${statusConf.color.split(" ")[0]}`}
                          />

                          <span className="font-medium text-sm">
                            {execution.status.charAt(0).toUpperCase() +
                              execution.status.slice(1)}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {passRate}% pass
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-500 space-y-1">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />

                          <span>
                            {new Date(execution.startTime).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <User className="w-3 h-3" />

                          <span>{execution.createdBy.split("@")[0]}</span>
                        </div>
                        {execution.uxScore && (
                          <div className="flex items-center space-x-1">
                            <BarChart3 className="w-3 h-3" />

                            <span>UX Score: {execution.uxScore}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {executions.length === 0 && (
                <div className="text-center py-8">
                  <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />

                  <p className="text-sm text-gray-500">No executions found</p>
                  <Button size="sm" className="mt-3" asChild>
                    <Link to={`/test-execution/${target.id}`}>
                      <PlayCircle className="w-3 h-3 mr-1" />
                      Run Tests
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Detailed Results */}
        <div className="lg:col-span-2 space-y-6">
          {selectedExecution ? (
            <>
              {/* Execution Overview */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Execution Details</CardTitle>
                    <Badge
                      variant="outline"
                      className={
                        statusConfig[
                          selectedExecution.status as keyof typeof statusConfig
                        ].color
                      }
                    >
                      {selectedExecution.status.charAt(0).toUpperCase() +
                        selectedExecution.status.slice(1)}
                    </Badge>
                  </div>
                  <CardDescription>
                    Executed on{" "}
                    {new Date(selectedExecution.startTime).toLocaleString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-gray-900">
                        {selectedExecution.summary.total}
                      </div>
                      <div className="text-sm text-gray-500">Total</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        {selectedExecution.summary.passed}
                      </div>
                      <div className="text-sm text-gray-500">Passed</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-red-600">
                        {selectedExecution.summary.failed}
                      </div>
                      <div className="text-sm text-gray-500">Failed</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-600">
                        {selectedExecution.summary.skipped}
                      </div>
                      <div className="text-sm text-gray-500">Skipped</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Pass Rate</span>
                      <span>{calculatePassRate(selectedExecution)}%</span>
                    </div>
                    <Progress
                      value={calculatePassRate(selectedExecution)}
                      className="h-2"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* UX Score Trend */}
              {selectedExecution.uxScore && (
                <Card>
                  <CardHeader>
                    <CardTitle>UX Score Trend</CardTitle>
                    <CardDescription>
                      User experience quality over recent executions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ChartContainer config={{}} className="aspect-[none]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={uxTrendData}>
                            <XAxis dataKey="date" />

                            <ChartTooltip />

                            <Line
                              type="monotone"
                              dataKey="score"
                              stroke="hsl(var(--chart-1))"
                              strokeWidth={2}
                              dot={{
                                fill: "hsl(var(--chart-1))",
                                strokeWidth: 2,
                              }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Browser Automation Playback */}
              <BrowserAutomationViewer
                execution={selectedExecution}
                testCaseNames={getTestCaseNames()}
                className="mb-6"
              />

              {/* Test Case Results */}
              <Card>
                <CardHeader>
                  <CardTitle>Test Case Results</CardTitle>
                  <CardDescription>
                    Detailed results for each test case in this execution
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Test Case</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>UX Score</TableHead>
                        <TableHead>Screenshots</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedExecution.results.map((result) => {
                        const statusConf = statusConfig[result.status];
                        const StatusIcon = statusConf.icon;

                        return (
                          <TableRow key={result.testCaseId}>
                            <TableCell>
                              <div className="font-medium">
                                {getTestCaseName(result.testCaseId)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={statusConf.color}
                              >
                                <StatusIcon className="w-3 h-3 mr-1" />

                                {result.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {Math.round(result.duration / 60)}m{" "}
                              {result.duration % 60}s
                            </TableCell>
                            <TableCell>
                              {result.uxInsights?.score ? (
                                <div className="flex items-center space-x-1">
                                  <span className="font-medium">
                                    {result.uxInsights.score}
                                  </span>
                                  {result.uxInsights.score > 80 ? (
                                    <TrendingUp className="w-3 h-3 text-green-500" />
                                  ) : (
                                    <TrendingDown className="w-3 h-3 text-red-500" />
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-1">
                                {result.screenshots.map((screenshot, index) => (
                                  <Dialog key={index}>
                                    <DialogTrigger asChild>
                                      <Button variant="ghost" size="sm">
                                        <Eye className="w-3 h-3" />
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-4xl">
                                      <DialogHeader>
                                        <DialogTitle>
                                          Test Screenshot
                                        </DialogTitle>
                                        <DialogDescription>
                                          {getTestCaseName(result.testCaseId)} -
                                          Step {index + 1}
                                        </DialogDescription>
                                      </DialogHeader>
                                      <div className="bg-gray-100 rounded-lg p-8 text-center">
                                        <Monitor className="w-16 h-16 text-gray-400 mx-auto mb-4" />

                                        <p className="text-gray-500">
                                          Screenshot: {screenshot}
                                        </p>
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                ))}
                                <span className="text-xs text-gray-500">
                                  {result.screenshots.length}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm">
                                <FileText className="w-3 h-3 mr-1" />
                                Logs
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* UX Insights */}
              {selectedExecution.results.some((r) => r.uxInsights) && (
                <Card>
                  <CardHeader>
                    <CardTitle>UX Insights & Recommendations</CardTitle>
                    <CardDescription>
                      AI-powered analysis of user experience issues and
                      improvements
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {selectedExecution.results
                        .filter((r) => r.uxInsights)
                        .map((result) => (
                          <div
                            key={result.testCaseId}
                            className="border rounded-lg p-4"
                          >
                            <h4 className="font-medium mb-3">
                              {getTestCaseName(result.testCaseId)}
                            </h4>

                            {result.uxInsights?.issues &&
                              result.uxInsights.issues.length > 0 && (
                                <div className="mb-3">
                                  <h5 className="text-sm font-medium text-red-700 mb-2">
                                    Issues Found:
                                  </h5>
                                  <ul className="space-y-1">
                                    {result.uxInsights.issues.map(
                                      (issue, index) => (
                                        <li
                                          key={index}
                                          className="text-sm text-red-600 flex items-start"
                                        >
                                          <AlertTriangle className="w-3 h-3 mr-2 mt-0.5 flex-shrink-0" />

                                          {issue}
                                        </li>
                                      )
                                    )}
                                  </ul>
                                </div>
                              )}

                            {result.uxInsights?.recommendations &&
                              result.uxInsights.recommendations.length > 0 && (
                                <div>
                                  <h5 className="text-sm font-medium text-blue-700 mb-2">
                                    Recommendations:
                                  </h5>
                                  <ul className="space-y-1">
                                    {result.uxInsights.recommendations.map(
                                      (rec, index) => (
                                        <li
                                          key={index}
                                          className="text-sm text-blue-600 flex items-start"
                                        >
                                          <TrendingUp className="w-3 h-3 mr-2 mt-0.5 flex-shrink-0" />

                                          {rec}
                                        </li>
                                      )
                                    )}
                                  </ul>
                                </div>
                              )}
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Execution Logs */}
              <Card>
                <CardHeader>
                  <CardTitle>Execution Logs</CardTitle>
                  <CardDescription>
                    Detailed logs from the test execution
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64 bg-gray-900 rounded-lg p-4">
                    <div className="space-y-1 font-mono text-sm">
                      {selectedExecution.logs.map((log, index) => (
                        <div key={index} className="text-green-400">
                          [{new Date(log.timestamp).toLocaleTimeString()}]{" "}
                          {log.level.toUpperCase()}: {log.message}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />

                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Execution Selected
                </h3>
                <p className="text-gray-500 mb-4">
                  Select an execution from the history to view detailed results
                </p>
                <Button asChild>
                  <Link to={`/test-execution/${target.id}`}>
                    <PlayCircle className="w-4 h-4 mr-2" />
                    Run New Tests
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
