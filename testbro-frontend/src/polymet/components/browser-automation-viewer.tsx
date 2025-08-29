import React, { useState, useEffect } from "react";
import {
  Play,
  Pause,
  Monitor,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Download,
  Share,
  RotateCcw,
  PlayCircle,
  List,
  Grid3X3,
  Maximize2,
  ChevronRight,
  ChevronLeft,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import BrowserAutomationPlayer from "@/polymet/components/browser-automation-player";
import {
  TargetExecution,
  TargetExecutionResult,
} from "@/polymet/data/test-data";

interface BrowserAutomationViewerProps {
  execution: TargetExecution;
  testCaseNames: Record<string, string>; // testCaseId -> name mapping
  className?: string;
}

type ViewMode = "individual" | "sequential" | "master";

export default function BrowserAutomationViewer({
  execution,
  testCaseNames,
  className = "",
}: BrowserAutomationViewerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("individual");
  const [selectedTestCase, setSelectedTestCase] = useState<string>("");
  const [currentSequentialIndex, setCurrentSequentialIndex] = useState(0);
  const [isSequentialPlaying, setIsSequentialPlaying] = useState(false);

  // Initialize selected test case
  useEffect(() => {
    if (execution.results.length > 0 && !selectedTestCase) {
      setSelectedTestCase(execution.results[0].testCaseId);
    }
  }, [execution.results, selectedTestCase]);

  const getTestCaseResult = (
    testCaseId: string
  ): TargetExecutionResult | undefined => {
    return execution.results.find((result) => result.testCaseId === testCaseId);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "passed":
        return <CheckCircle className="w-4 h-4 text-green-600" />;

      case "failed":
        return <XCircle className="w-4 h-4 text-red-600" />;

      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "passed":
        return "text-green-600 bg-green-50 border-green-200";
      case "failed":
        return "text-red-600 bg-red-50 border-red-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const handleSequentialNext = () => {
    if (currentSequentialIndex < execution.results.length - 1) {
      setCurrentSequentialIndex(currentSequentialIndex + 1);
    } else {
      setIsSequentialPlaying(false);
    }
  };

  const handleSequentialPrevious = () => {
    if (currentSequentialIndex > 0) {
      setCurrentSequentialIndex(currentSequentialIndex - 1);
    }
  };

  const startSequentialPlayback = () => {
    setCurrentSequentialIndex(0);
    setIsSequentialPlaying(true);
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const hasAnyVideos =
    execution.results.some(
      (result) =>
        result.browserAutomation?.videoUrl ||
        result.browserAutomation?.liveStreamUrl
    ) || execution.browserAutomation?.masterVideoUrl;

  if (!hasAnyVideos) {
    return (
      <Card className={className}>
        <CardContent className="text-center py-12">
          <Monitor className="w-16 h-16 text-gray-400 mx-auto mb-4" />

          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Browser Automation Available
          </h3>
          <p className="text-gray-500 mb-4">
            Browser automation recordings are not available for this execution.
            This may be due to recording being disabled or still processing.
          </p>
          <div className="text-sm text-gray-400">
            <p>Execution ID: {execution.id}</p>
            <p>Started: {new Date(execution.startTime).toLocaleString()}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Monitor className="w-5 h-5 text-blue-600" />

              <span>Browser Automation Playback</span>
              {execution.status === "running" && (
                <Badge variant="destructive" className="animate-pulse">
                  LIVE
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Watch how TestBro.ai executed your tests step by step
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Select
              value={viewMode}
              onValueChange={(value: ViewMode) => setViewMode(value)}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">Individual Tests</SelectItem>
                <SelectItem value="sequential">Sequential Play</SelectItem>
                {execution.browserAutomation?.masterVideoUrl && (
                  <SelectItem value="master">Master Recording</SelectItem>
                )}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Download All
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {viewMode === "individual" && (
          <Tabs value={selectedTestCase} onValueChange={setSelectedTestCase}>
            {/* Test Case Tabs */}
            <div className="border-b bg-gray-50 px-6 py-3">
              <ScrollArea className="w-full">
                <TabsList className="inline-flex h-auto p-1 bg-white border">
                  {execution.results.map((result) => {
                    const hasVideo =
                      result.browserAutomation?.videoUrl ||
                      result.browserAutomation?.liveStreamUrl;

                    return (
                      <TabsTrigger
                        key={result.testCaseId}
                        value={result.testCaseId}
                        className="flex items-center space-x-2 px-4 py-2"
                        disabled={!hasVideo}
                      >
                        {getStatusIcon(result.status)}
                        <span className="truncate max-w-32">
                          {testCaseNames[result.testCaseId] ||
                            `Test ${result.testCaseId}`}
                        </span>
                        {hasVideo && (
                          <PlayCircle className="w-3 h-3 text-blue-500" />
                        )}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </ScrollArea>
            </div>

            {/* Individual Test Case Videos */}
            {execution.results.map((result) => (
              <TabsContent
                key={result.testCaseId}
                value={result.testCaseId}
                className="m-0"
              >
                {result.browserAutomation ? (
                  <div className="p-6">
                    <BrowserAutomationPlayer
                      automationData={result.browserAutomation}
                      testCaseName={
                        testCaseNames[result.testCaseId] ||
                        `Test ${result.testCaseId}`
                      }
                      isLive={execution.status === "running"}
                    />

                    {/* Test Case Details */}
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(result.status)}
                          <span className="font-medium capitalize">
                            {result.status}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-gray-500" />

                          <span>
                            Duration: {formatDuration(result.duration)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Eye className="w-4 h-4 text-gray-500" />

                          <span>Screenshots: {result.screenshots.length}</span>
                        </div>
                        {result.uxInsights && (
                          <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 bg-orange-500 rounded-full text-xs text-white flex items-center justify-center font-bold">
                              UX
                            </div>
                            <span>Score: {result.uxInsights.score}/100</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center">
                    <Monitor className="w-12 h-12 text-gray-400 mx-auto mb-4" />

                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Recording Not Available
                    </h3>
                    <p className="text-gray-500">
                      Browser automation recording is not available for this
                      test case.
                    </p>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}

        {viewMode === "sequential" && (
          <div className="p-6">
            {/* Sequential Controls */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-medium text-blue-900">
                    Sequential Playback
                  </h3>
                  <p className="text-sm text-blue-700">
                    Watch all test cases in order, one after another
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSequentialPrevious}
                    disabled={currentSequentialIndex === 0}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={startSequentialPlayback}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Play All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSequentialNext}
                    disabled={
                      currentSequentialIndex === execution.results.length - 1
                    }
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Progress Indicator */}
              <div className="flex items-center space-x-2 text-sm text-blue-700">
                <span>
                  Test {currentSequentialIndex + 1} of{" "}
                  {execution.results.length}:
                </span>
                <span className="font-medium">
                  {testCaseNames[
                    execution.results[currentSequentialIndex]?.testCaseId
                  ] ||
                    `Test ${execution.results[currentSequentialIndex]?.testCaseId}`}
                </span>
              </div>
            </div>

            {/* Current Test Case Video */}
            {execution.results[currentSequentialIndex]?.browserAutomation && (
              <BrowserAutomationPlayer
                automationData={
                  execution.results[currentSequentialIndex].browserAutomation
                }
                testCaseName={
                  testCaseNames[
                    execution.results[currentSequentialIndex].testCaseId
                  ] ||
                  `Test ${execution.results[currentSequentialIndex].testCaseId}`
                }
                isLive={execution.status === "running"}
                onTimeUpdate={(time) => {
                  // Auto-advance when video ends
                  const result = execution.results[currentSequentialIndex];
                  if (
                    result.browserAutomation &&
                    time >= result.browserAutomation.duration - 1 &&
                    isSequentialPlaying
                  ) {
                    setTimeout(() => handleSequentialNext(), 1000);
                  }
                }}
              />
            )}

            {/* Test Case List */}
            <div className="mt-6">
              <h4 className="font-medium mb-3">Test Cases in This Execution</h4>
              <div className="space-y-2">
                {execution.results.map((result, index) => (
                  <div
                    key={result.testCaseId}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                      index === currentSequentialIndex
                        ? "border-blue-200 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setCurrentSequentialIndex(index)}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          index === currentSequentialIndex
                            ? "bg-blue-600 text-white"
                            : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {index + 1}
                      </div>
                      {getStatusIcon(result.status)}
                      <span className="font-medium">
                        {testCaseNames[result.testCaseId] ||
                          `Test ${result.testCaseId}`}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>{formatDuration(result.duration)}</span>
                      {result.browserAutomation?.videoUrl && (
                        <PlayCircle className="w-4 h-4 text-blue-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {viewMode === "master" &&
          execution.browserAutomation?.masterVideoUrl && (
            <div className="p-6">
              <div className="mb-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <h3 className="font-medium text-purple-900 mb-2">
                  Master Recording
                </h3>
                <p className="text-sm text-purple-700">
                  Complete recording of the entire test execution from start to
                  finish
                </p>
              </div>

              <BrowserAutomationPlayer
                automationData={{
                  videoUrl: execution.browserAutomation.masterVideoUrl,
                  thumbnailUrl: execution.browserAutomation.thumbnailUrl,
                  duration: execution.browserAutomation.totalDuration,
                  recordingStartTime:
                    execution.browserAutomation.recordingStartTime,
                  recordingEndTime:
                    execution.browserAutomation.recordingEndTime,
                  playbackControls: {
                    canPlay: true,
                    canPause: true,
                    canSeek: true,
                    availableSpeeds: [0.5, 1, 1.5, 2],
                  },
                }}
                testCaseName={`Complete Execution - ${execution.results.length} Test Cases`}
                isLive={execution.status === "running"}
              />

              {/* Execution Summary */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">
                    {execution.summary.total}
                  </div>
                  <div className="text-sm text-gray-600">Total Tests</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {execution.summary.passed}
                  </div>
                  <div className="text-sm text-gray-600">Passed</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {execution.summary.failed}
                  </div>
                  <div className="text-sm text-gray-600">Failed</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {formatDuration(execution.browserAutomation.totalDuration)}
                  </div>
                  <div className="text-sm text-gray-600">Total Duration</div>
                </div>
              </div>
            </div>
          )}
      </CardContent>
    </Card>
  );
}
