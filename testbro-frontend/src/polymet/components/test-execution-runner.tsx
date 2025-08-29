import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Play,
  Pause,
  Square,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Download,
  RefreshCw,
  AlertTriangle,
  ArrowLeft,
  Bot,
  Monitor,
  Smartphone,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import LiveExecutionMonitor from "@/polymet/components/live-execution-monitor";
import { TestTargetService } from "@/lib/services/testTargetService";
import { TestCaseService } from "@/lib/services/testCaseService";
import { TestSuiteService } from "@/lib/services/testSuiteService";
import { ExecutionService } from "@/lib/services/executionService";
import { useExecutionWebSocket } from "@/hooks/useWebSocket";
import { useAuth } from "@/contexts/AuthContext";

// API-based interfaces
interface TestTarget {
  id: string;
  name: string;
  url: string;
  platform: 'web' | 'mobile-web' | 'mobile-app';
  environment: 'development' | 'staging' | 'production';
  status: 'active' | 'inactive';
  project_id: string;
}

interface TestCase {
  id: string;
  name: string;
  description: string;
  type: 'e2e' | 'ui' | 'api' | 'performance';
  status: 'draft' | 'active' | 'archived';
  steps: TestStep[];
  tags: string[];
  project_id: string;
  target_id: string;
  suite_id?: string;
}

interface TestStep {
  id: string;
  order: number;
  action: 'click' | 'type' | 'navigate' | 'wait' | 'verify' | 'upload' | 'select';
  element: string;
  value?: string;
  description: string;
}

interface TestSuite {
  id: string;
  name: string;
  description: string;
  test_case_ids: string[];
  project_id: string;
  target_id: string;
  environment: 'staging' | 'production' | 'development';
  tags: string[];
}

interface ExecutionStep {
  id: string;
  testCaseId: string;
  stepOrder: number;
  description: string;
  status: "pending" | "running" | "passed" | "failed" | "skipped";
  startTime?: string;
  endTime?: string;
  screenshot?: string;
  errorMessage?: string;
}

const platformIcons = {
  web: Globe,
  "mobile-web": Smartphone,
  "mobile-app": Monitor,
};

export default function TestExecutionRunner() {
  const { targetId } = useParams<{ targetId: string }>();
  const { isAuthenticated } = useAuth();
  
  // Core state
  const [target, setTarget] = useState<TestTarget | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [testSuites, setTestSuites] = useState<TestSuite[]>([]);
  const [availableTargets, setAvailableTargets] = useState<TestTarget[]>([]);
  
  // Selection state
  const [selectedTestCases, setSelectedTestCases] = useState<string[]>([]);
  const [selectedSuite, setSelectedSuite] = useState<string>("");
  
  // Execution state
  const [executionStatus, setExecutionStatus] = useState<
    "idle" | "running" | "completed" | "failed"
  >("idle");
  const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(null);
  const [executionSteps, setExecutionSteps] = useState<ExecutionStep[]>([]);
  const [progress, setProgress] = useState(0);
  const [liveLog, setLiveLog] = useState<string[]>([]);
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const [liveTestCases, setLiveTestCases] = useState<any[]>([]);
  
  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // WebSocket integration for real-time monitoring
  const {
    executionData: realTimeExecution,
    progress: realTimeProgress,
    steps: realTimeSteps,
    logs: realTimeLogs,
    isComplete: realTimeComplete,
    error: realTimeError
  } = useExecutionWebSocket(currentExecutionId);

  // Load data on component mount
  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, targetId]);
  
  // Load all required data
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load available targets first
      const { data: targetsData, error: targetsError } = await TestTargetService.listTestTargets({
        limit: 100
      });
      
      if (targetsError) {
        setError(`Failed to load targets: ${targetsError}`);
        return;
      }
      
      setAvailableTargets(targetsData || []);
      
      if (targetId) {
        // Find the specific target
        const foundTarget = (targetsData || []).find((t: TestTarget) => t.id === targetId);
        if (foundTarget) {
          setTarget(foundTarget);
          
          // Load test cases for this target
          const { data: casesData, error: casesError } = await TestCaseService.listTestCases({
            target_id: targetId,
            limit: 100
          });
          
          if (casesError) {
            console.warn('Failed to load test cases:', casesError);
            setTestCases([]);
          } else {
            setTestCases(casesData || []);
          }
          
          // Load test suites for this target
          const { data: suitesData, error: suitesError } = await TestSuiteService.listTestSuites({
            project_id: foundTarget.project_id,
            limit: 100
          });
          
          if (suitesError) {
            console.warn('Failed to load test suites:', suitesError);
            setTestSuites([]);
          } else {
            // Filter suites that include this target
            const relevantSuites = (suitesData || []).filter((suite: TestSuite) => 
              suite.target_id === targetId
            );
            setTestSuites(relevantSuites);
          }
        } else {
          setError(`Target with ID "${targetId}" not found`);
        }
      }
    } catch (err) {
      console.error('Failed to load data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Filter available test cases based on selected suite
  const availableTestCases = testCases.filter((tc) => {
    if (selectedSuite) {
      const suite = testSuites.find((s) => s.id === selectedSuite);
      return suite?.test_case_ids.includes(tc.id) || false;
    }
    return true;
  });

  const handleTestCaseSelection = (testCaseId: string, checked: boolean) => {
    if (checked) {
      setSelectedTestCases([...selectedTestCases, testCaseId]);
    } else {
      setSelectedTestCases(selectedTestCases.filter((id) => id !== testCaseId));
    }
  };

  const handleSuiteSelection = (suiteId: string) => {
    setSelectedSuite(suiteId);
    if (suiteId) {
      const suite = testSuites.find((s) => s.id === suiteId);
      if (suite) {
        setSelectedTestCases(suite.test_case_ids);
      }
    } else {
      setSelectedTestCases([]);
    }
  };

  const startExecution = async () => {
    if (!target || selectedTestCases.length === 0) return;

    setExecutionStatus("running");
    setProgress(0);
    setLiveLog([]);
    setError(null);

    try {
      // Create execution steps from selected test cases
      const steps: ExecutionStep[] = [];
      selectedTestCases.forEach((testCaseId) => {
        const testCase = testCases.find((tc) => tc.id === testCaseId);
        if (testCase) {
          testCase.steps.forEach((step, index) => {
            steps.push({
              id: `${testCaseId}-${step.id}`,
              testCaseId,
              stepOrder: index + 1,
              description: step.description,
              status: "pending",
            });
          });
        }
      });

      setExecutionSteps(steps);

      // Create live test cases for the monitor
      const liveTests = selectedTestCases.map((testCaseId) => {
        const testCase = testCases.find((tc) => tc.id === testCaseId);
        return {
          id: testCaseId,
          name: testCase?.name || `Test ${testCaseId}`,
          status: "pending" as const,
          progress: 0,
          steps:
            testCase?.steps.map((step, index) => ({
              id: step.id,
              name: step.description,
              status: "pending" as const,
              description: step.description,
            })) || [],
          estimatedDuration: 300, // Default 5 minutes
          browserAutomation: {
            liveStreamUrl: `/streams/live-${testCaseId}`,
            thumbnailUrl: `/thumbnails/live-${testCaseId}-thumb.jpg`,
            recordingStartTime: new Date().toISOString(),
            playbackControls: {
              canPlay: true,
              canPause: true,
              canSeek: false,
              availableSpeeds: [1],
            },
          },
        };
      });

      setLiveTestCases(liveTests);

      // Execute test via API
      let executionResult;
      if (selectedSuite) {
        // Execute test suite
        executionResult = await TestSuiteService.executeTestSuite(selectedSuite, {
          browser: 'chromium',
          environment: target.environment
        });
      } else {
        // Execute individual test cases
        const promises = selectedTestCases.map(testCaseId => 
          ExecutionService.executeTest({
            test_case_id: testCaseId,
            project_id: target.project_id,
            target_id: target.id,
            browser: 'chromium',
            environment: target.environment
          })
        );
        
        const results = await Promise.allSettled(promises);
        // Use the first successful result or handle multiple executions
        const firstSuccess = results.find(r => r.status === 'fulfilled' && r.value.data);
        if (firstSuccess && firstSuccess.status === 'fulfilled') {
          executionResult = firstSuccess.value;
        } else {
          throw new Error('All execution requests failed');
        }
      }

      if (executionResult.error) {
        throw new Error(executionResult.error);
      }

      const executionId = executionResult.data.id;
      setCurrentExecutionId(executionId);

      // Add initial log
      setLiveLog((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Execution started with ID: ${executionId}`,
        `[${new Date().toLocaleTimeString()}] Running ${selectedTestCases.length} test case(s) on ${target.name}`,
      ]);

      // WebSocket will handle real-time updates from here
      console.log(`Test execution started with ID: ${executionId}`);
      
    } catch (err) {
      console.error('Failed to start execution:', err);
      setError(err instanceof Error ? err.message : 'Failed to start execution');
      setExecutionStatus('failed');
      setLiveLog((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] ERROR: ${err instanceof Error ? err.message : 'Failed to start execution'}`,
      ]);
    }
  };

  // WebSocket effects for real-time updates
  useEffect(() => {
    if (realTimeProgress) {
      setProgress(realTimeProgress.progress || 0);
    }
  }, [realTimeProgress]);

  useEffect(() => {
    if (realTimeSteps && realTimeSteps.length > 0) {
      setExecutionSteps(prev => {
        const updated = [...prev];
        realTimeSteps.forEach(stepUpdate => {
          const index = updated.findIndex(s => s.id === stepUpdate.step_id);
          if (index >= 0) {
            updated[index] = {
              ...updated[index],
              status: stepUpdate.status as any,
              startTime: stepUpdate.status === 'running' ? stepUpdate.timestamp : updated[index].startTime,
              endTime: stepUpdate.status === 'passed' || stepUpdate.status === 'failed' ? stepUpdate.timestamp : undefined,
              errorMessage: stepUpdate.error_message,
              screenshot: stepUpdate.screenshot_url,
            };
          }
        });
        return updated;
      });
    }
  }, [realTimeSteps]);

  useEffect(() => {
    if (realTimeLogs && realTimeLogs.length > 0) {
      setLiveLog(prev => {
        const newLogs = realTimeLogs.map(log => 
          `[${new Date(log.timestamp).toLocaleTimeString()}] ${log.message}`
        );
        return [...prev, ...newLogs];
      });
    }
  }, [realTimeLogs]);

  useEffect(() => {
    if (realTimeComplete) {
      setExecutionStatus('completed');
      setLiveLog(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Execution completed successfully`,
      ]);
    }
  }, [realTimeComplete]);

  useEffect(() => {
    if (realTimeError) {
      setExecutionStatus('failed');
      setError(realTimeError);
      setLiveLog(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] ERROR: ${realTimeError}`,
      ]);
    }
  }, [realTimeError]);

  const stopExecution = async () => {
    if (currentExecutionId) {
      try {
        await ExecutionService.cancelExecution(currentExecutionId);
        setLiveLog(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] Execution cancelled by user`,
        ]);
      } catch (err) {
        console.error('Failed to cancel execution:', err);
      }
    }
    
    setExecutionStatus("idle");
    setCurrentExecutionId(null);
    setExecutionSteps([]);
    setProgress(0);
    setLiveLog([]);
    setLiveTestCases([]);
  };

  const pauseExecution = () => {
    // Note: Pause functionality would need to be implemented in the backend
    console.log("Pausing execution...");
    setLiveLog(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] Pause requested (not yet implemented)`,
    ]);
  };

  const resumeExecution = () => {
    // Note: Resume functionality would need to be implemented in the backend
    console.log("Resuming execution...");
    setLiveLog(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] Resume requested (not yet implemented)`,
    ]);
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" asChild>
              <Link to="/test-targets">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Targets
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Test Execution
              </h1>
              <p className="text-gray-600">Loading...</p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 text-gray-400 mx-auto mb-4 animate-spin" />
            <p className="text-gray-600">Loading test execution data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" asChild>
              <Link to="/test-targets">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Targets
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Test Execution
              </h1>
              <p className="text-gray-600">Error loading data</p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center max-w-md">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="flex items-center justify-center space-x-3">
              <Button onClick={loadData} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
              <Button asChild>
                <Link to="/test-targets">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Targets
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  // Target not found or not selected
  if (!target) {
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
              <h1 className="text-2xl font-bold text-gray-900">
                Test Execution
              </h1>
              <p className="text-gray-600">Select a target to run tests</p>
            </div>
          </div>
        </div>

        {/* Target not found message with available targets */}
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center max-w-2xl">
            <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto mb-6" />

            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              {targetId ? "Target not found" : "No target specified"}
            </h3>
            <p className="text-gray-600 mb-8">
              {targetId
                ? `The target with ID "${targetId}" could not be found. Please select from available targets below.`
                : "Please select a target from the available options below to start test execution."}
            </p>

            {/* Available Targets */}
            {availableTargets.length > 0 && (
              <div className="bg-white border rounded-lg p-6 mb-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4">
                  Available Targets
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {availableTargets.map((availableTarget) => {
                    const PlatformIcon = platformIcons[availableTarget.platform];
                    return (
                      <Link
                        key={availableTarget.id}
                        to={`/test-execution/${availableTarget.id}`}
                        className="flex items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors group"
                      >
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-4">
                          <PlatformIcon className="w-5 h-5 text-gray-600" />
                        </div>
                        <div className="flex-1 text-left">
                          <div className="font-medium text-gray-900 group-hover:text-blue-600">
                            {availableTarget.name}
                          </div>
                          <div className="text-sm text-gray-500 truncate">
                            {availableTarget.url}
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {availableTarget.platform.replace("-", " ")}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                availableTarget.environment === "production"
                                  ? "bg-red-50 text-red-700 border-red-200"
                                  : availableTarget.environment === "staging"
                                    ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                                    : "bg-blue-50 text-blue-700 border-blue-200"
                              }`}
                            >
                              {availableTarget.environment}
                            </Badge>
                          </div>
                        </div>
                        <Play className="w-5 h-5 text-gray-400 group-hover:text-blue-600" />
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center justify-center space-x-4">
              <Button asChild>
                <Link to="/test-targets">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Manage Targets
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/dashboard">
                  <Monitor className="w-4 h-4 mr-2" />
                  Go to Dashboard
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const PlatformIcon = platformIcons[target.platform];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" asChild>
            <Link to="/test-targets">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Link>
          </Button>
          <div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                <PlatformIcon className="w-4 h-4 text-gray-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {target.name}
                </h1>
                <p className="text-gray-600">{target.url}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="bg-blue-50 text-blue-700">
            {target.platform.replace("-", " ")}
          </Badge>
          <Badge
            variant="outline"
            className={
              target.environment === "production"
                ? "bg-red-50 text-red-700"
                : target.environment === "staging"
                  ? "bg-yellow-50 text-yellow-700"
                  : "bg-blue-50 text-blue-700"
            }
          >
            {target.environment}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Test Selection */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Test Selection</CardTitle>
              <CardDescription>
                Choose test cases or suites to run on this target
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Suite Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Test Suite (Optional)
                </label>
                <Select
                  value={selectedSuite}
                  onValueChange={handleSuiteSelection}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a test suite" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Individual Test Cases</SelectItem>
                    {testSuites.map((suite) => (
                      <SelectItem key={suite.id} value={suite.id}>
                        {suite.name} ({suite.test_case_ids.length} tests)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Test Case Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Test Cases</label>
                <ScrollArea className="h-64 border rounded-md p-3">
                  <div className="space-y-3">
                    {availableTestCases.map((testCase) => (
                      <div
                        key={testCase.id}
                        className="flex items-start space-x-3"
                      >
                        <Checkbox
                          id={testCase.id}
                          checked={selectedTestCases.includes(testCase.id)}
                          onCheckedChange={(checked) =>
                            handleTestCaseSelection(
                              testCase.id,
                              checked as boolean
                            )
                          }
                          disabled={executionStatus === "running"}
                        />

                        <div className="flex-1 min-w-0">
                          <label
                            htmlFor={testCase.id}
                            className="text-sm font-medium cursor-pointer"
                          >
                            {testCase.name}
                          </label>
                          <p className="text-xs text-gray-500 mt-1">
                            {testCase.description}
                          </p>
                          <div className="flex items-center space-x-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {testCase.type}
                            </Badge>
                            {testCase.tags?.slice(0, 2).map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            <span className="text-xs text-gray-500">
                              {testCase.steps.length} steps
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Execution Controls */}
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span>Selected Tests:</span>
                  <span className="font-medium">
                    {selectedTestCases.length}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Est. Duration:</span>
                  <span className="font-medium">
                    {selectedTestCases.reduce((acc, id) => {
                      const testCase = testCases.find((tc) => tc.id === id);
                      // Estimate 2 minutes per step as a baseline
                      return acc + ((testCase?.steps.length || 0) * 2);
                    }, 0)}
                    min
                  </span>
                </div>

                {executionStatus === "idle" ? (
                  <Button
                    onClick={startExecution}
                    disabled={selectedTestCases.length === 0}
                    className="w-full"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Start Execution
                  </Button>
                ) : executionStatus === "running" ? (
                  <Button
                    onClick={stopExecution}
                    variant="destructive"
                    className="w-full"
                  >
                    <Square className="w-4 h-4 mr-2" />
                    Stop Execution
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <Button asChild className="w-full">
                      <Link to={`/test-results/${target.id}`}>
                        <Eye className="w-4 h-4 mr-2" />
                        View Results
                      </Link>
                    </Button>
                    <Button
                      onClick={() => {
                        setExecutionStatus("idle");
                        setCurrentExecutionId(null);
                        setExecutionSteps([]);
                        setProgress(0);
                        setLiveLog([]);
                        setLiveTestCases([]);
                        setSelectedTestCases([]);
                        setSelectedSuite("");
                      }}
                      variant="outline"
                      className="w-full"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      New Execution
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Execution Progress */}
        <div className="lg:col-span-2 space-y-6">
          {/* Live Execution Monitor */}
          {executionStatus === "running" && liveTestCases.length > 0 && (
            <LiveExecutionMonitor
              executionId={currentExecutionId || ""}
              targetName={target.name}
              testCases={liveTestCases}
              isConnected={true}
              onStopExecution={stopExecution}
              onPauseExecution={pauseExecution}
              onResumeExecution={resumeExecution}
            />
          )}
          {/* Progress Overview */}
          {executionStatus !== "idle" && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Execution Progress</CardTitle>
                  <Badge
                    variant={
                      executionStatus === "running"
                        ? "default"
                        : executionStatus === "completed"
                          ? "secondary"
                          : "destructive"
                    }
                  >
                    {executionStatus === "running" && (
                      <Clock className="w-3 h-3 mr-1" />
                    )}
                    {executionStatus === "completed" && (
                      <CheckCircle className="w-3 h-3 mr-1" />
                    )}
                    {executionStatus === "failed" && (
                      <XCircle className="w-3 h-3 mr-1" />
                    )}
                    {executionStatus.charAt(0).toUpperCase() +
                      executionStatus.slice(1)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Overall Progress</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>

                {executionSteps.length > 0 && (
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-gray-900">
                        {selectedTestCases.length}
                      </div>
                      <div className="text-sm text-gray-500">Total</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        {
                          executionSteps.filter((s) => s.status === "passed")
                            .length
                        }
                      </div>
                      <div className="text-sm text-gray-500">Passed</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-red-600">
                        {
                          executionSteps.filter((s) => s.status === "failed")
                            .length
                        }
                      </div>
                      <div className="text-sm text-gray-500">Failed</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-600">
                        {
                          executionSteps.filter((s) => s.status === "skipped")
                            .length
                        }
                      </div>
                      <div className="text-sm text-gray-500">Skipped</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Live Execution Steps */}
          {executionSteps.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Execution Steps</CardTitle>
                <CardDescription>
                  Live progress of individual test steps
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-3">
                    {executionSteps.map((step, index) => (
                      <div
                        key={step.id}
                        className="flex items-center space-x-3 p-3 rounded-lg border"
                      >
                        <div className="flex-shrink-0">
                          {step.status === "pending" && (
                            <div className="w-4 h-4 rounded-full bg-gray-200" />
                          )}
                          {step.status === "running" && (
                            <div className="w-4 h-4 rounded-full bg-blue-500 animate-pulse" />
                          )}
                          {step.status === "passed" && (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          )}
                          {step.status === "failed" && (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                          {step.status === "skipped" && (
                            <div className="w-4 h-4 rounded-full bg-gray-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">
                              {step.description}
                            </p>
                            {step.screenshot && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <Eye className="w-3 h-3" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-4xl">
                                  <DialogHeader>
                                    <DialogTitle>Step Screenshot</DialogTitle>
                                    <DialogDescription>
                                      {step.description}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="bg-gray-100 rounded-lg p-4 text-center">
                                    <Monitor className="w-16 h-16 text-gray-400 mx-auto mb-2" />

                                    <p className="text-gray-500">
                                      Screenshot: {step.screenshot}
                                    </p>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            )}
                          </div>
                          {step.errorMessage && (
                            <p className="text-sm text-red-600 mt-1">
                              {step.errorMessage}
                            </p>
                          )}
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              Step {step.stepOrder}
                            </Badge>
                            {step.startTime && (
                              <span className="text-xs text-gray-500">
                                {new Date(step.startTime).toLocaleTimeString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Live Log */}
          {liveLog.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Live Execution Log</CardTitle>
                <CardDescription>
                  Real-time execution logs and status updates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-48 bg-gray-900 rounded-lg p-4">
                  <div className="space-y-1 font-mono text-sm">
                    {liveLog.map((log, index) => (
                      <div key={index} className="text-green-400">
                        {log}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {executionStatus === "idle" && (
            <Card>
              <CardContent className="text-center py-12">
                <Bot className="w-12 h-12 text-gray-400 mx-auto mb-4" />

                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Ready to Execute Tests
                </h3>
                <p className="text-gray-500 mb-4">
                  Select test cases from the left panel and click "Start
                  Execution" to begin
                </p>
                <div className="text-sm text-gray-400">
                  AI-powered execution with real-time UX scoring and insights
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
