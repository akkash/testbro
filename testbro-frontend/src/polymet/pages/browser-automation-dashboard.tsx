import React, { useState, useEffect } from "react";
import {
  Monitor,
  Play,
  Camera,
  Activity,
  Settings,
  RefreshCw,
  Wifi,
  WifiOff,
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  Download,
  Share,
} from "lucide-react";
import BrowserControlDashboard from "@/polymet/components/browser-control-dashboard";
import TestRecordingInterface from "@/polymet/components/test-recording-interface";
import BrowserTestExecutionMonitor from "@/polymet/components/browser-test-execution-monitor";
import ScreenshotGallery from "@/polymet/components/screenshot-gallery";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Mock data for demonstration
const mockPlaybackSession = {
  id: "pb_session_123",
  recording_session_id: "rec_session_456",
  browser_session_id: "br_session_789",
  status: "running" as const,
  current_step: 3,
  total_steps: 8,
  started_at: new Date().toISOString(),
  playback_speed: 1.0,
  step_results: [
    {
      id: "step_1",
      order: 1,
      action_type: "navigate" as const,
      status: "completed" as const,
      element: {
        tag_name: "body",
        selector: "body",
        text_content: ""
      },
      value: "https://example.com",
      timestamp: new Date(Date.now() - 5000).toISOString(),
      duration_ms: 1200,
      screenshot_url: "/screenshots/step_1.png"
    },
    {
      id: "step_2",
      order: 2,
      action_type: "click" as const,
      status: "completed" as const,
      element: {
        tag_name: "button",
        selector: "#login-button",
        text_content: "Login"
      },
      coordinates: { x: 150, y: 200 },
      timestamp: new Date(Date.now() - 3000).toISOString(),
      duration_ms: 800,
      screenshot_url: "/screenshots/step_2.png"
    },
    {
      id: "step_3",
      order: 3,
      action_type: "type" as const,
      status: "running" as const,
      element: {
        tag_name: "input",
        selector: "#username",
        text_content: ""
      },
      value: "testuser@example.com",
      timestamp: new Date().toISOString(),
    },
    {
      id: "step_4",
      order: 4,
      action_type: "type" as const,
      status: "pending" as const,
      element: {
        tag_name: "input",
        selector: "#password",
        text_content: ""
      },
      value: "password123",
    },
    {
      id: "step_5",
      order: 5,
      action_type: "click" as const,
      status: "pending" as const,
      element: {
        tag_name: "button",
        selector: "#submit",
        text_content: "Submit"
      },
    },
  ],
  screenshots: [
    "/screenshots/step_1.png",
    "/screenshots/step_2.png"
  ]
};

const mockScreenshots = [
  {
    id: "ss_1",
    url: "/screenshots/step_1.png",
    filename: "login_page_initial.png",
    sessionId: "br_session_789",
    stepNumber: 1,
    actionId: "step_1",
    timestamp: new Date(Date.now() - 10000).toISOString(),
    metadata: {
      width: 1920,
      height: 1080,
      fileSize: 245760,
      format: "png",
      pageUrl: "https://example.com/login",
      device: "desktop" as const,
      browser: "Chrome",
      viewport: { width: 1920, height: 1080 }
    },
    tags: ["login", "initial-state"],
    description: "Initial login page state"
  },
  {
    id: "ss_2",
    url: "/screenshots/step_2.png",
    filename: "login_button_click.png",
    sessionId: "br_session_789",
    stepNumber: 2,
    actionId: "step_2",
    timestamp: new Date(Date.now() - 8000).toISOString(),
    metadata: {
      width: 1920,
      height: 1080,
      fileSize: 198432,
      format: "png",
      pageUrl: "https://example.com/login",
      device: "desktop" as const,
      browser: "Chrome",
      viewport: { width: 1920, height: 1080 }
    },
    tags: ["login", "button-click"],
    description: "After clicking login button"
  },
  {
    id: "ss_3",
    url: "/screenshots/step_3.png",
    filename: "username_input.png",
    sessionId: "br_session_789",
    stepNumber: 3,
    actionId: "step_3",
    timestamp: new Date(Date.now() - 5000).toISOString(),
    metadata: {
      width: 1920,
      height: 1080,
      fileSize: 210890,
      format: "png",
      pageUrl: "https://example.com/login",
      device: "desktop" as const,
      browser: "Chrome",
      viewport: { width: 1920, height: 1080 }
    },
    tags: ["login", "input-focus"],
    description: "Username field focused"
  }
];

interface BrowserAutomationDashboardState {
  activeTab: string;
  isConnected: boolean;
  activeSessions: number;
  recordingSessions: number;
  playbackSessions: number;
}

export default function BrowserAutomationDashboard() {
  const [state, setState] = useState<BrowserAutomationDashboardState>({
    activeTab: "control",
    isConnected: true,
    activeSessions: 2,
    recordingSessions: 1,
    playbackSessions: 1,
  });

  const [connectionStatus, setConnectionStatus] = useState<"connected" | "connecting" | "disconnected">("connected");

  // Simulate connection status changes
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.95) {
        setConnectionStatus(prev => {
          const statuses = ["connected", "connecting", "disconnected"];
          const currentIndex = statuses.indexOf(prev);
          return statuses[(currentIndex + 1) % statuses.length] as any;
        });
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleTabChange = (tab: string) => {
    setState(prev => ({ ...prev, activeTab: tab }));
  };

  const handleSessionCreate = (sessionData: any) => {
    console.log("Creating browser session:", sessionData);
    setState(prev => ({ ...prev, activeSessions: prev.activeSessions + 1 }));
  };

  const handleRecordingComplete = (recording: any) => {
    console.log("Recording completed:", recording);
    setState(prev => ({ ...prev, recordingSessions: prev.recordingSessions + 1 }));
  };

  const handlePlaybackControl = (action: 'start' | 'pause' | 'resume' | 'stop') => {
    console.log("Playback control:", action);
    if (action === 'start') {
      setState(prev => ({ ...prev, playbackSessions: prev.playbackSessions + 1 }));
    } else if (action === 'stop') {
      setState(prev => ({ ...prev, playbackSessions: Math.max(0, prev.playbackSessions - 1) }));
    }
  };

  const handleScreenshotSelect = (screenshot: any) => {
    console.log("Screenshot selected:", screenshot);
  };

  const handleScreenshotDownload = (screenshot: any) => {
    console.log("Downloading screenshot:", screenshot);
    // Simulate download
    const link = document.createElement('a');
    link.href = screenshot.url;
    link.download = screenshot.filename;
    link.click();
  };

  const handleCompareScreenshots = (screenshot1: any, screenshot2: any) => {
    console.log("Comparing screenshots:", screenshot1, screenshot2);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "connected": return "text-green-600 bg-green-50 border-green-200";
      case "connecting": return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "disconnected": return "text-red-600 bg-red-50 border-red-200";
      default: return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  return (
    <TooltipProvider>
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Browser Automation Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              Control browser sessions, record tests, monitor execution, and manage screenshots
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Connection Status */}
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border ${getStatusColor(connectionStatus)}`}>
              {connectionStatus === "connected" ? (
                <Wifi className="w-4 h-4" />
              ) : connectionStatus === "connecting" ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <WifiOff className="w-4 h-4" />
              )}
              <span className="text-sm font-medium capitalize">
                {connectionStatus}
              </span>
            </div>

            {/* Quick Stats */}
            <div className="flex items-center space-x-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center space-x-1 text-sm">
                    <Monitor className="w-4 h-4 text-blue-600" />
                    <span className="font-medium">{state.activeSessions}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Active Browser Sessions</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center space-x-1 text-sm">
                    <Camera className="w-4 h-4 text-green-600" />
                    <span className="font-medium">{state.recordingSessions}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Recording Sessions</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center space-x-1 text-sm">
                    <Play className="w-4 h-4 text-purple-600" />
                    <span className="font-medium">{state.playbackSessions}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Playback Sessions</TooltipContent>
              </Tooltip>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center space-x-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Browser Automation Settings</DialogTitle>
                    <DialogDescription>
                      Configure your browser automation preferences
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Settings panel would be implemented here with options for:
                    </p>
                    <ul className="text-sm text-gray-600 space-y-1 ml-4">
                      <li>• Default browser preferences</li>
                      <li>• Screenshot quality settings</li>
                      <li>• Recording options</li>
                      <li>• Playback speed defaults</li>
                      <li>• WebSocket connection settings</li>
                    </ul>
                  </div>
                </DialogContent>
              </Dialog>

              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>

        {/* Main Dashboard Tabs */}
        <Tabs value={state.activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="control" className="flex items-center space-x-2">
              <Monitor className="w-4 h-4" />
              <span>Browser Control</span>
            </TabsTrigger>
            <TabsTrigger value="recording" className="flex items-center space-x-2">
              <Camera className="w-4 h-4" />
              <span>Test Recording</span>
            </TabsTrigger>
            <TabsTrigger value="execution" className="flex items-center space-x-2">
              <Activity className="w-4 h-4" />
              <span>Execution Monitor</span>
            </TabsTrigger>
            <TabsTrigger value="screenshots" className="flex items-center space-x-2">
              <Eye className="w-4 h-4" />
              <span>Screenshots</span>
            </TabsTrigger>
          </TabsList>

          {/* Browser Control Dashboard */}
          <TabsContent value="control" className="space-y-6">
            <BrowserControlDashboard 
              onSessionCreate={handleSessionCreate}
              className="w-full"
            />
            
            {/* Additional Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span>Browser Control Features</span>
                </CardTitle>
                <CardDescription>
                  Comprehensive browser session management and control
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="space-y-1">
                    <div className="font-medium">Session Management</div>
                    <div className="text-gray-600">Create, monitor, and control browser sessions</div>
                  </div>
                  <div className="space-y-1">
                    <div className="font-medium">Multi-Browser Support</div>
                    <div className="text-gray-600">Chrome, Firefox, Safari, Edge</div>
                  </div>
                  <div className="space-y-1">
                    <div className="font-medium">Real-time Control</div>
                    <div className="text-gray-600">Navigate, click, type, scroll in real-time</div>
                  </div>
                  <div className="space-y-1">
                    <div className="font-medium">WebSocket Integration</div>
                    <div className="text-gray-600">Live updates and instant feedback</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Test Recording Interface */}
          <TabsContent value="recording" className="space-y-6">
            <TestRecordingInterface 
              onRecordingComplete={handleRecordingComplete}
              className="w-full"
            />
            
            {/* Recording Tips */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-blue-600" />
                  <span>Recording Best Practices</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="font-medium">Before Recording:</div>
                    <ul className="text-gray-600 space-y-1 ml-4">
                      <li>• Plan your test steps in advance</li>
                      <li>• Ensure stable network connection</li>
                      <li>• Clear browser cache if needed</li>
                      <li>• Close unnecessary browser tabs</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <div className="font-medium">During Recording:</div>
                    <ul className="text-gray-600 space-y-1 ml-4">
                      <li>• Perform actions slowly and deliberately</li>
                      <li>• Wait for page loads between actions</li>
                      <li>• Add descriptive comments when possible</li>
                      <li>• Verify elements are fully loaded</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Browser Test Execution Monitor */}
          <TabsContent value="execution" className="space-y-6">
            <BrowserTestExecutionMonitor 
              playbackSession={mockPlaybackSession}
              isConnected={connectionStatus === "connected"}
              onPlaybackControl={handlePlaybackControl}
              onSpeedChange={(speed) => console.log("Speed changed:", speed)}
              onStepSkip={(step) => console.log("Skip to step:", step)}
              className="w-full"
            />
            
            {/* Execution Insights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="w-5 h-5 text-purple-600" />
                    <span>Performance Metrics</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Average Step Duration</span>
                      <span className="text-sm font-medium">1.2s</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Success Rate</span>
                      <span className="text-sm font-medium text-green-600">98.5%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Error Rate</span>
                      <span className="text-sm font-medium text-red-600">1.5%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total Runtime</span>
                      <span className="text-sm font-medium">2m 34s</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Activity className="w-5 h-5 text-blue-600" />
                    <span>Execution Status</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Current Session</span>
                      <Badge variant="default" className="animate-pulse">Running</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Steps Completed</span>
                      <span className="text-sm font-medium">3 / 8</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Screenshots Captured</span>
                      <span className="text-sm font-medium">2</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Playback Speed</span>
                      <span className="text-sm font-medium">1.0x</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Screenshot Gallery */}
          <TabsContent value="screenshots" className="space-y-6">
            <ScreenshotGallery 
              screenshots={mockScreenshots}
              sessionId="br_session_789"
              onScreenshotSelect={handleScreenshotSelect}
              onScreenshotDownload={handleScreenshotDownload}
              onCompareScreenshots={handleCompareScreenshots}
              className="w-full"
            />
            
            {/* Gallery Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="text-center p-4">
                  <div className="text-2xl font-bold text-blue-600">
                    {mockScreenshots.length}
                  </div>
                  <div className="text-sm text-gray-600">Total Screenshots</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="text-center p-4">
                  <div className="text-2xl font-bold text-green-600">
                    {Math.round(mockScreenshots.reduce((sum, s) => sum + s.metadata.fileSize, 0) / 1024)} KB
                  </div>
                  <div className="text-sm text-gray-600">Total Size</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="text-center p-4">
                  <div className="text-2xl font-bold text-purple-600">
                    1920×1080
                  </div>
                  <div className="text-sm text-gray-600">Resolution</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="text-center p-4">
                  <div className="text-2xl font-bold text-orange-600">
                    PNG
                  </div>
                  <div className="text-sm text-gray-600">Format</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}