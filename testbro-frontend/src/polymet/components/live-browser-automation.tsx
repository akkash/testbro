import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  Square,
  Monitor,
  RotateCcw,
  Settings,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  Mouse,
  Keyboard,
  Eye,
  VideoIcon as Record,
  Download,
  Share,
  RefreshCw,
  AlertTriangle,
  Camera,
  VideoIcon,
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
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useBrowserWebSocket, useRecordingWebSocket } from "@/hooks/useWebSocket";

interface LiveBrowserAutomationProps {
  sessionId: string | null;
  executionId?: string;
  className?: string;
}

export default function LiveBrowserAutomation({
  sessionId,
  executionId,
  className = "",
}: LiveBrowserAutomationProps) {
  // Browser WebSocket state
  const {
    browserState,
    livePreview,
    screenshots,
    sendBrowserCommand,
    connectionState: browserConnectionState,
  } = useBrowserWebSocket(sessionId);

  // Recording WebSocket state  
  const {
    recordingState,
    recordingEvents,
    sendRecordingControl,
    connectionState: recordingConnectionState,
  } = useRecordingWebSocket(sessionId);

  // Local state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState([1]);
  const [volume, setVolume] = useState([80]);
  const [isMuted, setIsMuted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [browserSize, setBrowserSize] = useState({ width: 1920, height: 1080 });
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Update recording state
  useEffect(() => {
    if (recordingState) {
      const isCurrentlyRecording = recordingState.action === 'start' || recordingState.action === 'resume';
      setIsRecording(isCurrentlyRecording);
      
      if (isCurrentlyRecording && !recordingTimerRef.current) {
        recordingTimerRef.current = setInterval(() => {
          setRecordingDuration(prev => prev + 1);
        }, 1000);
      } else if (!isCurrentlyRecording && recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  }, [recordingState]);

  // Update live preview
  useEffect(() => {
    if (livePreview) {
      if (livePreview.data.viewport_size) {
        setBrowserSize(livePreview.data.viewport_size);
      }
      if (livePreview.data.mouse_position) {
        setMousePosition(livePreview.data.mouse_position);
      }
    }
  }, [livePreview]);

  // Cleanup recording timer
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  const handleBrowserControl = (command: string, parameters?: any) => {
    if (sessionId) {
      sendBrowserCommand(command, parameters);
    }
  };

  const handleRecordingControl = (action: 'start' | 'pause' | 'resume' | 'stop') => {
    if (sessionId) {
      sendRecordingControl(action);
      
      if (action === 'start') {
        setRecordingDuration(0);
      } else if (action === 'stop') {
        setRecordingDuration(0);
      }
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isConnected = browserConnectionState.connected && recordingConnectionState.connected;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Connection Status */}
      {!isConnected && (
        <Alert variant="destructive">
          <WifiOff className="h-4 w-4" />
          <AlertDescription>
            WebSocket connection required for live browser automation. 
            {!browserConnectionState.connected && " Browser session disconnected."}
            {!recordingConnectionState.connected && " Recording session disconnected."}
          </AlertDescription>
        </Alert>
      )}

      {/* Control Panel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Monitor className="w-5 h-5" />
                <span>Live Browser Automation</span>
                {isConnected && (
                  <Badge variant="outline" className="text-green-700 border-green-300">
                    <Wifi className="w-3 h-3 mr-1" />
                    Live
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Real-time browser control and monitoring via WebSocket
                {sessionId && (
                  <span className="block text-xs text-gray-500 mt-1">
                    Session: {sessionId.slice(-8)}
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Browser Controls */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBrowserControl('navigate', { url: 'about:blank' })}
                disabled={!isConnected}
              >
                <Play className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBrowserControl('pause')}
                disabled={!isConnected}
              >
                <Pause className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBrowserControl('stop')}
                disabled={!isConnected}
              >
                <Square className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBrowserControl('refresh')}
                disabled={!isConnected}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex-1" />

            {/* Recording Controls */}
            <div className="flex items-center space-x-2">
              {isRecording && (
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-sm font-mono text-red-600">
                    {formatDuration(recordingDuration)}
                  </span>
                </div>
              )}
              <Button
                variant={isRecording ? "destructive" : "outline"}
                size="sm"
                onClick={() => 
                  isRecording 
                    ? handleRecordingControl('stop') 
                    : handleRecordingControl('start')
                }
                disabled={!isConnected}
              >
                {isRecording ? (
                  <Square className="w-4 h-4" />
                ) : (
                  <VideoIcon className="w-4 h-4" />
                )}
                {isRecording ? "Stop" : "Record"}
              </Button>
              {isRecording && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRecordingControl('pause')}
                  disabled={!isConnected}
                >
                  <Pause className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Browser Settings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Browser Size</label>
              <Select 
                value={`${browserSize.width}x${browserSize.height}`}
                onValueChange={(value) => {
                  const [width, height] = value.split('x').map(Number);
                  setBrowserSize({ width, height });
                  handleBrowserControl('resize', { width, height });
                }}
                disabled={!isConnected}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1920x1080">1920×1080 (Full HD)</SelectItem>
                  <SelectItem value="1366x768">1366×768 (HD)</SelectItem>
                  <SelectItem value="1280x720">1280×720 (HD)</SelectItem>
                  <SelectItem value="1024x768">1024×768 (XGA)</SelectItem>
                  <SelectItem value="800x600">800×600 (SVGA)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Playback Speed</label>
              <div className="flex items-center space-x-2">
                <Slider
                  value={playbackSpeed}
                  onValueChange={(value) => {
                    setPlaybackSpeed(value);
                    handleBrowserControl('setSpeed', { speed: value[0] });
                  }}
                  max={3}
                  min={0.25}
                  step={0.25}
                  className="flex-1"
                  disabled={!isConnected}
                />
                <span className="text-sm font-mono min-w-[3rem]">
                  {playbackSpeed[0]}x
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Volume</label>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMuted(!isMuted)}
                >
                  {isMuted ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </Button>
                <Slider
                  value={volume}
                  onValueChange={setVolume}
                  max={100}
                  min={0}
                  className="flex-1"
                  disabled={isMuted}
                />
                <span className="text-sm font-mono min-w-[3rem]">
                  {isMuted ? 0 : volume[0]}%
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Live Preview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Eye className="w-5 h-5" />
              <span>Live Preview</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-xs">
                {browserSize.width}×{browserSize.height}
              </Badge>
              {mousePosition.x > 0 && (
                <Badge variant="outline" className="text-xs">
                  <Mouse className="w-3 h-3 mr-1" />
                  {mousePosition.x}, {mousePosition.y}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div 
            className={`relative bg-gray-100 rounded-lg overflow-hidden ${
              isFullscreen ? 'fixed inset-0 z-50 bg-black' : 'aspect-video'
            }`}
          >
            {/* Live Video Stream Placeholder */}
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-700">
              {isConnected ? (
                <div className="text-center">
                  <Monitor className="w-16 h-16 text-white/60 mx-auto mb-4" />
                  <p className="text-white/80 text-lg mb-2">Live Browser Preview</p>
                  <p className="text-white/60 text-sm">
                    WebSocket stream would display here
                  </p>
                  {livePreview && (
                    <div className="mt-4 space-y-1">
                      <p className="text-white/80 text-xs">
                        URL: {livePreview.data?.url || 'about:blank'}
                      </p>
                      <p className="text-white/60 text-xs">
                        Last updated: {new Date(livePreview.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center">
                  <WifiOff className="w-16 h-16 text-white/40 mx-auto mb-4" />
                  <p className="text-white/60 text-lg mb-2">Connection Required</p>
                  <p className="text-white/40 text-sm">
                    Connect to WebSocket for live preview
                  </p>
                </div>
              )}
            </div>

            {/* Mouse Cursor Overlay */}
            {mousePosition.x > 0 && (
              <div
                className="absolute w-4 h-4 bg-red-500 rounded-full border-2 border-white pointer-events-none z-10"
                style={{
                  left: `${(mousePosition.x / browserSize.width) * 100}%`,
                  top: `${(mousePosition.y / browserSize.height) * 100}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              />
            )}

            {/* Recording Indicator */}
            {isRecording && (
              <div className="absolute top-4 left-4 flex items-center space-x-2 bg-red-500 text-white px-3 py-1 rounded-full">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span className="text-sm font-medium">Recording</span>
                <span className="text-sm font-mono">
                  {formatDuration(recordingDuration)}
                </span>
              </div>
            )}

            {/* Screenshot Counter */}
            {screenshots.length > 0 && (
              <div className="absolute top-4 right-4 bg-black/60 text-white px-3 py-1 rounded-full">
                <div className="flex items-center space-x-1">
                  <Camera className="w-3 h-3" />
                  <span className="text-xs font-medium">
                    {screenshots.length} shots
                  </span>
                </div>
              </div>
            )}

            {/* Fullscreen Controls */}
            {isFullscreen && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsFullscreen(false)}
                  >
                    <Minimize2 className="w-4 h-4" />
                    Exit Fullscreen
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Screenshots */}
      {screenshots.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Camera className="w-5 h-5" />
              <span>Recent Screenshots</span>
              <Badge variant="secondary">{screenshots.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {screenshots.slice(-8).map((screenshot, index) => (
                <div key={index} className="space-y-2">
                  <div className="aspect-video bg-gray-100 rounded border flex items-center justify-center">
                    <Camera className="w-8 h-8 text-gray-400" />
                  </div>
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>{new Date(screenshot.timestamp).toLocaleTimeString()}</p>
                    <p className="truncate">{screenshot.data.screenshot_url}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Session Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Browser Connection:</span>
              <div className="flex items-center space-x-1 mt-1">
                {browserConnectionState.connected ? (
                  <Wifi className="w-3 h-3 text-green-500" />
                ) : (
                  <WifiOff className="w-3 h-3 text-red-500" />
                )}
                <span className={browserConnectionState.connected ? 'text-green-600' : 'text-red-600'}>
                  {browserConnectionState.connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
            <div>
              <span className="text-gray-500">Recording Status:</span>
              <div className="flex items-center space-x-1 mt-1">
                {isRecording ? (
                  <Record className="w-3 h-3 text-red-500" />
                ) : (
                  <Square className="w-3 h-3 text-gray-500" />
                )}
                <span className={isRecording ? 'text-red-600' : 'text-gray-600'}>
                  {isRecording ? 'Recording' : 'Stopped'}
                </span>
              </div>
            </div>
            <div>
              <span className="text-gray-500">Events Received:</span>
              <p className="font-mono text-sm mt-1">
                {recordingEvents.length + screenshots.length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}