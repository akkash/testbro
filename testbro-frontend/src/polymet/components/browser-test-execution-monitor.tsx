import { useState, useEffect, useCallback } from "react";
import {
  Play,
  Pause,
  Square,
  SkipForward,
  SkipBack,
  Monitor,
  Clock,
  Activity,
  Eye,
  Settings,
  Wifi,
  WifiOff,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  MousePointer,
  Keyboard,
  Navigation,
  Image as ImageIcon,
  Download,
  Maximize2,
  Zap,
  Target,
  Camera,
  Code,
} from "lucide-react";
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
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface PlaybackStep {
  id: string;
  order: number;
  action_type: 'click' | 'type' | 'navigate' | 'scroll' | 'hover' | 'keypress' | 'wait';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  element: {
    tag_name: string;
    selector: string;
    xpath?: string;
    text_content?: string;
  };
  value?: string;
  coordinates?: { x: number; y: number };
  timestamp?: string;
  duration_ms?: number;
  error_message?: string;
  screenshot_url?: string;
  actual_coordinates?: { x: number; y: number };
}

interface PlaybackSession {
  id: string;
  recording_session_id: string;
  browser_session_id: string;
  status: 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  current_step: number;
  total_steps: number;
  started_at: string;
  completed_at?: string;
  playback_speed: number;
  step_results: PlaybackStep[];
  screenshots: string[];
  error_message?: string;
}

interface BrowserTestExecutionMonitorProps {
  playbackSession?: PlaybackSession;
  isConnected?: boolean;
  onPlaybackControl?: (action: 'start' | 'pause' | 'resume' | 'stop') => void;
  onSpeedChange?: (speed: number) => void;
  onStepSkip?: (stepNumber: number) => void;
  className?: string;
}

export default function BrowserTestExecutionMonitor({
  playbackSession,
  isConnected = true,
  onPlaybackControl,
  onSpeedChange,
  className = "",
}: BrowserTestExecutionMonitorProps) {
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [currentTime, setCurrentTime] = useState(0);
  const [liveStats, setLiveStats] = useState({
    totalDuration: 0,
    averageStepTime: 0,
    successRate: 0,
    errorCount: 0,
  });

  // Simulate real-time updates
  useEffect(() => {
    if (playbackSession?.status === 'running') {
      const interval = setInterval(() => {
        setCurrentTime(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [playbackSession?.status]);

  // Calculate live statistics
  useEffect(() => {
    if (playbackSession) {
      const completedSteps = playbackSession.step_results.filter(step => 
        step.status === 'completed' || step.status === 'failed'
      );
      const successfulSteps = playbackSession.step_results.filter(step => 
        step.status === 'completed'
      );
      const failedSteps = playbackSession.step_results.filter(step => 
        step.status === 'failed'
      );

      const totalDuration = completedSteps.reduce((sum, step) => 
        sum + (step.duration_ms || 0), 0
      );
      const averageStepTime = completedSteps.length > 0 
        ? totalDuration / completedSteps.length : 0;
      const successRate = completedSteps.length > 0 
        ? (successfulSteps.length / completedSteps.length) * 100 : 0;

      setLiveStats({
        totalDuration,
        averageStepTime,
        successRate,
        errorCount: failedSteps.length,
      });
    }
  }, [playbackSession?.step_results]);

  const handlePlaybackControl = useCallback((action: 'start' | 'pause' | 'resume' | 'stop') => {
    onPlaybackControl?.(action);
  }, [onPlaybackControl]);

  const handleSpeedChange = useCallback((newSpeed: number[]) => {
    const speed = newSpeed[0];
    setPlaybackSpeed(speed);
    onSpeedChange?.(speed);
  }, [onSpeedChange]);

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'click': return MousePointer;
      case 'type': return Keyboard;
      case 'navigate': return Navigation;
      case 'scroll': return Eye;
      case 'hover': return MousePointer;
      case 'keypress': return Keyboard;
      case 'wait': return Clock;
      default: return Activity;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Loader2 className="w-4 h-4 animate-spin text-blue-600" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'skipped': return <SkipForward className="w-4 h-4 text-yellow-600" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-blue-50 border-blue-200';
      case 'completed': return 'bg-green-50 border-green-200';
      case 'failed': return 'bg-red-50 border-red-200';
      case 'skipped': return 'bg-yellow-50 border-yellow-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const currentStep = playbackSession?.step_results.find(step => 
    step.order === playbackSession.current_step
  );

  const progress = playbackSession ? 
    (playbackSession.current_step / playbackSession.total_steps) * 100 : 0;

  if (!playbackSession) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <Monitor className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No active playback session</p>
            <p className="text-sm text-gray-400 mt-1">
              Start a test playback to monitor execution
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Activity className="w-6 h-6 text-blue-600" />
              <div>
                <CardTitle>Browser Test Execution</CardTitle>
                <CardDescription className="flex items-center space-x-2 mt-1">
                  <span>Session: {playbackSession.id.slice(-8)}</span>
                  <Badge 
                    variant={isConnected ? "default" : "destructive"}
                    className="text-xs"
                  >
                    {isConnected ? (
                      <>
                        <Wifi className="w-3 h-3 mr-1" />
                        Connected
                      </>
                    ) : (
                      <>
                        <WifiOff className="w-3 h-3 mr-1" />
                        Disconnected
                      </>
                    )}
                  </Badge>
                </CardDescription>
              </div>
            </div>
            <Badge 
              variant={
                playbackSession.status === 'running' ? 'default' :
                playbackSession.status === 'completed' ? 'secondary' :
                playbackSession.status === 'failed' ? 'destructive' : 'outline'
              }
              className={playbackSession.status === 'running' ? 'animate-pulse' : ''}
            >
              {playbackSession.status.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Overall Progress */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm text-gray-600">
                Step {playbackSession.current_step} of {playbackSession.total_steps}
              </span>
            </div>
            <Progress value={progress} className="h-3" />
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{Math.round(progress)}% complete</span>
              <span>
                {formatDuration(liveStats.totalDuration)} elapsed
              </span>
            </div>
          </div>

          {/* Playback Controls */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2">
              {playbackSession.status === 'running' ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePlaybackControl('pause')}
                >
                  <Pause className="w-4 h-4" />
                </Button>
              ) : playbackSession.status === 'paused' ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePlaybackControl('resume')}
                >
                  <Play className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePlaybackControl('start')}
                  disabled={playbackSession.status === 'completed'}
                >
                  <Play className="w-4 h-4" />
                </Button>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePlaybackControl('stop')}
                disabled={playbackSession.status === 'completed'}
              >
                <Square className="w-4 h-4" />
              </Button>

              <Separator orientation="vertical" className="h-6" />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm">
                    <SkipBack className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Previous Step</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm">
                    <SkipForward className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Next Step</TooltipContent>
              </Tooltip>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600 min-w-[80px]">
                  Speed: {playbackSpeed}x
                </span>
                <Slider
                  value={[playbackSpeed]}
                  onValueChange={handleSpeedChange}
                  min={0.25}
                  max={3}
                  step={0.25}
                  className="w-20"
                />
              </div>

              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Live Statistics */}
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {Math.round(liveStats.successRate)}%
              </div>
              <div className="text-xs text-blue-700">Success Rate</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {Math.round(liveStats.averageStepTime)}ms
              </div>
              <div className="text-xs text-green-700">Avg Step Time</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {formatDuration(currentTime * 1000)}
              </div>
              <div className="text-xs text-purple-700">Runtime</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {liveStats.errorCount}
              </div>
              <div className="text-xs text-red-700">Errors</div>
            </div>
          </div>

          {/* Current Step Details */}
          {currentStep && (
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(currentStep.status)}
                    <span className="font-medium">
                      Step {currentStep.order}: {currentStep.action_type}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {currentStep.duration_ms ? `${currentStep.duration_ms}ms` : 'Running...'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm">
                    <Target className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-600">Target:</span>
                    <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                      {currentStep.element.selector}
                    </code>
                  </div>
                  
                  {currentStep.value && (
                    <div className="flex items-center space-x-2 text-sm">
                      <Keyboard className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-600">Value:</span>
                      <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs">
                        {currentStep.value}
                      </span>
                    </div>
                  )}

                  {currentStep.error_message && (
                    <div className="flex items-start space-x-2 text-sm">
                      <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
                      <span className="text-red-600">{currentStep.error_message}</span>
                    </div>
                  )}

                  {currentStep.screenshot_url && (
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm">
                        <Camera className="w-4 h-4 mr-2" />
                        View Screenshot
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step List */}
          <Tabs defaultValue="steps" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="steps">All Steps</TabsTrigger>
              <TabsTrigger value="screenshots">Screenshots</TabsTrigger>
              <TabsTrigger value="logs">Execution Logs</TabsTrigger>
            </TabsList>

            <TabsContent value="steps" className="space-y-4">
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {playbackSession.step_results.map((step, _index) => {
                    const ActionIcon = getActionIcon(step.action_type);
                    
                    return (
                      <div
                        key={step.id}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors hover:bg-gray-50 ${
                          step.order === playbackSession.current_step ? 'ring-2 ring-blue-500' : ''
                        } ${getStatusColor(step.status)}`}
                        onClick={() => {/* Handle step selection */}}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(step.status)}
                            <span className="text-xs text-gray-500 min-w-[30px]">
                              #{step.order}
                            </span>
                          </div>
                          <ActionIcon className="w-4 h-4 text-gray-600" />
                          <div>
                            <div className="font-medium text-sm">
                              {step.action_type}
                            </div>
                            <div className="text-xs text-gray-500 truncate max-w-[200px]">
                              {step.element.selector}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {step.duration_ms && (
                            <span className="text-xs text-gray-500">
                              {step.duration_ms}ms
                            </span>
                          )}
                          {step.screenshot_url && (
                            <ImageIcon className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="screenshots" className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                {playbackSession.screenshots.map((screenshot, _index) => (
                  <Dialog key={_index}>
                    <DialogTrigger asChild>
                      <div className="relative cursor-pointer group">
                        <div className="aspect-video bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                          <ImageIcon className="w-8 h-8 text-gray-400" />
                        </div>
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center">
                          <Maximize2 className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl">
                      <DialogHeader>
                        <DialogTitle>Screenshot #{_index + 1}</DialogTitle>
                        <DialogDescription>
                          Captured during step execution
                        </DialogDescription>
                      </DialogHeader>
                      <div className="aspect-video bg-gray-100 rounded-lg border flex items-center justify-center">
                        <ImageIcon className="w-16 h-16 text-gray-400" />
                        <span className="ml-2 text-gray-500">Screenshot: {screenshot}</span>
                      </div>
                    </DialogContent>
                  </Dialog>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="logs" className="space-y-4">
              <ScrollArea className="h-64">
                <div className="space-y-2 text-sm font-mono">
                  {playbackSession.step_results.map((step, _index) => (
                    <div key={step.id} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                      <span className="text-gray-500">
                        {step.timestamp?.slice(-8) || '00:00:00'}
                      </span>
                      <span className={
                        step.status === 'completed' ? 'text-green-600' :
                        step.status === 'failed' ? 'text-red-600' :
                        step.status === 'running' ? 'text-blue-600' : 'text-gray-600'
                      }>
                        [{step.status.toUpperCase()}]
                      </span>
                      <span>
                        Step {step.order}: {step.action_type} {step.element.selector}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
              <Button variant="outline" size="sm">
                <Code className="w-4 h-4 mr-2" />
                Generate Code
              </Button>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <ImageIcon className="w-4 h-4 mr-2" />
                View All Screenshots
              </Button>
              <Button variant="outline" size="sm">
                <Eye className="w-4 h-4 mr-2" />
                Live Browser View
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}