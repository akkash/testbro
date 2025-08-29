import React, { useState, useEffect } from "react";
import {
  Play,
  Pause,
  Square,
  Monitor,
  Clock,
  Activity,
  Eye,
  Users,
  Wifi,
  WifiOff,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  Maximize2,
  Volume2,
  Settings,
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
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import BrowserAutomationPlayer from "@/polymet/components/browser-automation-player";

interface LiveTestStep {
  id: string;
  name: string;
  status: "pending" | "running" | "completed" | "failed";
  startTime?: string;
  duration?: number;
  description: string;
}

interface LiveTestCase {
  id: string;
  name: string;
  status: "pending" | "running" | "completed" | "failed";
  progress: number;
  currentStep?: LiveTestStep;
  steps: LiveTestStep[];
  startTime?: string;
  estimatedDuration: number;
  actualDuration?: number;
  browserAutomation?: {
    liveStreamUrl: string;
    thumbnailUrl?: string;
    recordingStartTime: string;
    playbackControls: {
      canPlay: boolean;
      canPause: boolean;
      canSeek: boolean;
      availableSpeeds: number[];
    };
  };
}

interface LiveExecutionMonitorProps {
  executionId: string;
  targetName: string;
  testCases: LiveTestCase[];
  isConnected: boolean;
  onStopExecution?: () => void;
  onPauseExecution?: () => void;
  onResumeExecution?: () => void;
  className?: string;
}

export default function LiveExecutionMonitor({
  executionId,
  targetName,
  testCases,
  isConnected,
  onStopExecution,
  onPauseExecution,
  onResumeExecution,
  className = "",
}: LiveExecutionMonitorProps) {
  const [selectedTestCase, setSelectedTestCase] = useState<string>("");
  const [viewMode, setViewMode] = useState<"grid" | "focus">("focus");
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "connecting" | "disconnected"
  >("connected");
  const [viewers, setViewers] = useState(3);

  // Initialize selected test case
  useEffect(() => {
    const runningTestCase = testCases.find((tc) => tc.status === "running");
    if (runningTestCase && selectedTestCase !== runningTestCase.id) {
      setSelectedTestCase(runningTestCase.id);
    } else if (!selectedTestCase && testCases.length > 0) {
      setSelectedTestCase(testCases[0].id);
    }
  }, [testCases, selectedTestCase]);

  // Simulate connection status changes
  useEffect(() => {
    if (!isConnected) {
      setConnectionStatus("disconnected");
    } else {
      setConnectionStatus("connected");
    }
  }, [isConnected]);

  const getOverallProgress = () => {
    if (testCases.length === 0) return 0;
    const totalProgress = testCases.reduce((sum, tc) => sum + tc.progress, 0);
    return Math.round(totalProgress / testCases.length);
  };

  const getOverallStatus = () => {
    const hasRunning = testCases.some((tc) => tc.status === "running");
    const hasFailed = testCases.some((tc) => tc.status === "failed");
    const allCompleted = testCases.every((tc) => tc.status === "completed");

    if (hasRunning) return "running";
    if (hasFailed) return "failed";
    if (allCompleted) return "completed";
    return "pending";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "running":
        return <Loader2 className="w-4 h-4 animate-spin text-blue-600" />;

      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-600" />;

      case "failed":
        return <XCircle className="w-4 h-4 text-red-600" />;

      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "running":
        return "text-blue-600 bg-blue-50 border-blue-200";
      case "completed":
        return "text-green-600 bg-green-50 border-green-200";
      case "failed":
        return "text-red-600 bg-red-50 border-red-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const selectedTestCaseData = testCases.find(
    (tc) => tc.id === selectedTestCase
  );

  return (
    <TooltipProvider>
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="w-5 h-5 text-blue-600" />

                <span>Live Test Execution</span>
                <Badge
                  variant={
                    connectionStatus === "connected" ? "default" : "destructive"
                  }
                  className={
                    connectionStatus === "connected" ? "animate-pulse" : ""
                  }
                >
                  {connectionStatus === "connected" && (
                    <Wifi className="w-3 h-3 mr-1" />
                  )}
                  {connectionStatus === "disconnected" && (
                    <WifiOff className="w-3 h-3 mr-1" />
                  )}
                  {connectionStatus.toUpperCase()}
                </Badge>
              </CardTitle>
              <CardDescription>
                {targetName} • Execution ID: {executionId}
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1 text-sm text-gray-500">
                <Users className="w-4 h-4" />

                <span>{viewers} watching</span>
              </div>
              <Separator orientation="vertical" className="h-6" />

              <Button
                variant="outline"
                size="sm"
                onClick={onPauseExecution}
                disabled={getOverallStatus() !== "running"}
              >
                <Pause className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onStopExecution}
                disabled={getOverallStatus() === "completed"}
              >
                <Square className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Overall Progress */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getStatusIcon(getOverallStatus())}
                <span className="font-medium capitalize">
                  {getOverallStatus()}
                </span>
              </div>
              <span className="text-sm text-gray-500">
                {getOverallProgress()}% Complete
              </span>
            </div>
            <Progress value={getOverallProgress()} className="h-2" />

            <div className="flex justify-between text-xs text-gray-500">
              <span>
                {testCases.filter((tc) => tc.status === "completed").length} of{" "}
                {testCases.length} tests completed
              </span>
              <span>
                {testCases.filter((tc) => tc.status === "failed").length > 0 &&
                  `${testCases.filter((tc) => tc.status === "failed").length} failed`}
              </span>
            </div>
          </div>

          {/* Live Browser Automation */}
          {selectedTestCaseData?.browserAutomation && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Live Browser View</h3>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-xs">
                    <Eye className="w-3 h-3 mr-1" />
                    Live Stream
                  </Badge>
                  <Button variant="outline" size="sm">
                    <Maximize2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <BrowserAutomationPlayer
                automationData={{
                  liveStreamUrl:
                    selectedTestCaseData.browserAutomation.liveStreamUrl,
                  thumbnailUrl:
                    selectedTestCaseData.browserAutomation.thumbnailUrl,
                  duration: 0, // Live stream has no fixed duration
                  recordingStartTime:
                    selectedTestCaseData.browserAutomation.recordingStartTime,
                  playbackControls:
                    selectedTestCaseData.browserAutomation.playbackControls,
                }}
                testCaseName={selectedTestCaseData.name}
                isLive={true}
              />
            </div>
          )}

          {/* Test Cases List */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Test Cases</h3>
            <div className="space-y-3">
              {testCases.map((testCase) => (
                <Card
                  key={testCase.id}
                  className={`cursor-pointer transition-all ${
                    selectedTestCase === testCase.id
                      ? "border-blue-200 bg-blue-50"
                      : "hover:border-gray-300"
                  }`}
                  onClick={() => setSelectedTestCase(testCase.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(testCase.status)}
                        <div>
                          <h4 className="font-medium">{testCase.name}</h4>
                          {testCase.currentStep && (
                            <p className="text-sm text-gray-600">
                              Current: {testCase.currentStep.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant="outline"
                          className={getStatusColor(testCase.status)}
                        >
                          {testCase.status}
                        </Badge>
                        {testCase.browserAutomation && (
                          <div className="mt-1">
                            <Badge variant="outline" className="text-xs">
                              <Monitor className="w-3 h-3 mr-1" />
                              Live
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{testCase.progress}%</span>
                      </div>
                      <Progress value={testCase.progress} className="h-1" />
                    </div>

                    {/* Timing Information */}
                    <div className="mt-3 flex justify-between text-xs text-gray-500">
                      <div className="flex items-center space-x-4">
                        {testCase.startTime && (
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />

                            <span>
                              Started:{" "}
                              {new Date(
                                testCase.startTime
                              ).toLocaleTimeString()}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />

                          <span>
                            Est: {formatDuration(testCase.estimatedDuration)}
                            {testCase.actualDuration &&
                              ` • Actual: ${formatDuration(testCase.actualDuration)}`}
                          </span>
                        </div>
                      </div>
                      <div>{testCase.steps.length} steps</div>
                    </div>

                    {/* Steps Progress (for running test case) */}
                    {testCase.status === "running" &&
                      selectedTestCase === testCase.id && (
                        <div className="mt-4 pt-3 border-t">
                          <h5 className="text-sm font-medium mb-2">
                            Test Steps
                          </h5>
                          <div className="space-y-2">
                            {testCase.steps.map((step, index) => (
                              <div
                                key={step.id}
                                className="flex items-center space-x-3 text-sm"
                              >
                                <div
                                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                    step.status === "completed"
                                      ? "bg-green-100 text-green-700"
                                      : step.status === "running"
                                        ? "bg-blue-100 text-blue-700"
                                        : step.status === "failed"
                                          ? "bg-red-100 text-red-700"
                                          : "bg-gray-100 text-gray-500"
                                  }`}
                                >
                                  {step.status === "running" ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    index + 1
                                  )}
                                </div>
                                <span
                                  className={
                                    step.status === "running"
                                      ? "font-medium"
                                      : ""
                                  }
                                >
                                  {step.description}
                                </span>
                                {step.duration && (
                                  <span className="text-gray-400 ml-auto">
                                    {formatDuration(step.duration)}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Connection Status */}
          {connectionStatus !== "connected" && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-yellow-600" />

                <div>
                  <h4 className="font-medium text-yellow-800">
                    Connection Issue
                  </h4>
                  <p className="text-sm text-yellow-700">
                    {connectionStatus === "disconnected"
                      ? "Lost connection to live stream. Attempting to reconnect..."
                      : "Connecting to live stream..."}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
