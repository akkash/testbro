import React, { useState, useEffect } from "react";
import {
  Pause,
  Square,
  Play,
  MousePointer,
  Keyboard,
  Activity,
  Monitor,
  Eye,
  Circle,
  RefreshCw,
  AlertTriangle,
  Settings,
  Loader2,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  RecordingService, 
  RecordedAction, 
  RecordingSession, 
  BrowserSession,
  CreateBrowserSessionRequest,
  StartRecordingRequest 
} from "@/lib/services/recordingService";
import { useRecordingWebSocket } from "@/hooks/useWebSocket";
import { useAuth } from "@/contexts/AuthContext";

interface TestRecordingInterfaceProps {
  projectId: string;
  targetId: string;
  browserSessionId?: string;
  onRecordingComplete?: (recording: RecordingSession) => void;
  className?: string;
}

export default function TestRecordingInterface({
  projectId,
  targetId,
  browserSessionId,
  onRecordingComplete,
  className = "",
}: TestRecordingInterfaceProps) {
  const { isAuthenticated } = useAuth();
  
  // Core state
  const [recording, setRecording] = useState<RecordingSession | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [actions, setActions] = useState<RecordedAction[]>([]);
  const [recordingName, setRecordingName] = useState("");
  const [currentBrowserSession, setCurrentBrowserSession] = useState<BrowserSession | null>(null);
  const [availableSessions, setAvailableSessions] = useState<BrowserSession[]>([]);
  
  // Configuration state
  const [recordingOptions, setRecordingOptions] = useState({
    captureScreenshots: true,
    includeHoverEvents: false,
    includeScrollEvents: true,
    includeKeyboardEvents: true,
  });
  
  // UI state
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creatingSession, setCreatingSession] = useState(false);
  
  // WebSocket integration for real-time updates
  const {
    recordingState,
    recordingEvents,
    sendRecordingControl,
    connectionState,
  } = useRecordingWebSocket(recording?.id || null);

  // Load available browser sessions on mount
  useEffect(() => {
    if (isAuthenticated) {
      loadBrowserSessions();
    }
  }, [isAuthenticated]);

  // Set up browser session if provided
  useEffect(() => {
    if (browserSessionId && availableSessions.length > 0) {
      const session = availableSessions.find(s => s.id === browserSessionId);
      if (session) {
        setCurrentBrowserSession(session);
      }
    }
  }, [browserSessionId, availableSessions]);

  // Duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, isPaused]);

  // WebSocket effects for real-time updates
  useEffect(() => {
    if (recordingState) {
      const isCurrentlyRecording = recordingState.action === 'start' || recordingState.action === 'resume';
      const isCurrentlyPaused = recordingState.action === 'pause';
      const isCompleted = recordingState.action === 'stop';
      
      setIsRecording(isCurrentlyRecording);
      setIsPaused(isCurrentlyPaused);
      
      if (isCompleted && recordingState.recording_session) {
        setIsRecording(false);
        setIsPaused(false);
        setRecording(recordingState.recording_session);
        onRecordingComplete?.(recordingState.recording_session);
      }
    }
  }, [recordingState, onRecordingComplete]);

  useEffect(() => {
    if (recordingEvents.length > 0) {
      const latestEvent = recordingEvents[recordingEvents.length - 1];
      if (latestEvent.action === 'action_recorded' && latestEvent.recorded_action) {
        setActions(prev => {
          const newActions = [...prev];
          const existingIndex = newActions.findIndex(a => a.id === latestEvent.recorded_action!.id);
          if (existingIndex >= 0) {
            newActions[existingIndex] = latestEvent.recorded_action!;
          } else {
            newActions.push(latestEvent.recorded_action!);
            newActions.sort((a, b) => a.order - b.order);
          }
          return newActions;
        });
      }
    }
  }, [recordingEvents]);

  const loadBrowserSessions = async () => {
    try {
      setLoading(true);
      const { data, error: sessionsError } = await RecordingService.getBrowserSessions();
      
      if (sessionsError) {
        setError(`Failed to load browser sessions: ${sessionsError}`);
      } else {
        setAvailableSessions(data || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load browser sessions');
    } finally {
      setLoading(false);
    }
  };

  const createBrowserSession = async () => {
    try {
      setCreatingSession(true);
      setError(null);
      
      const sessionData: CreateBrowserSessionRequest = {
        project_id: projectId,
        target_id: targetId,
        browser_type: 'chromium',
        options: {
          headless: false,
          viewport: { width: 1280, height: 720 },
          recordVideo: false,
        }
      };
      
      const { data, error: sessionError } = await RecordingService.createBrowserSession(sessionData);
      
      if (sessionError) {
        setError(`Failed to create browser session: ${sessionError}`);
      } else {
        setCurrentBrowserSession(data);
        // Refresh the sessions list
        await loadBrowserSessions();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create browser session');
    } finally {
      setCreatingSession(false);
    }
  };

  const startRecording = async () => {
    if (!currentBrowserSession) {
      setError('No browser session available. Please create a session first.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const recordingData: StartRecordingRequest = {
        browser_session_id: currentBrowserSession.id,
        name: recordingName || "Untitled Recording",
        project_id: projectId,
        target_id: targetId,
        options: recordingOptions,
      };

      const { data, error: recordingError } = await RecordingService.startRecording(recordingData);
      
      if (recordingError) {
        setError(`Failed to start recording: ${recordingError}`);
      } else {
        setRecording(data);
        setIsRecording(true);
        setDuration(0);
        setActions([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start recording');
    } finally {
      setLoading(false);
    }
  };

  const pauseRecording = async () => {
    if (!recording) return;
    
    try {
      setLoading(true);
      const { error: pauseError } = await RecordingService.pauseRecording(recording.id);
      
      if (pauseError) {
        setError(`Failed to pause recording: ${pauseError}`);
      } else {
        setIsPaused(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pause recording');
    } finally {
      setLoading(false);
    }
  };

  const resumeRecording = async () => {
    if (!recording) return;
    
    try {
      setLoading(true);
      const { error: resumeError } = await RecordingService.resumeRecording(recording.id);
      
      if (resumeError) {
        setError(`Failed to resume recording: ${resumeError}`);
      } else {
        setIsPaused(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resume recording');
    } finally {
      setLoading(false);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    
    try {
      setLoading(true);
      const { data, error: stopError } = await RecordingService.stopRecording(recording.id);
      
      if (stopError) {
        setError(`Failed to stop recording: ${stopError}`);
      } else {
        setIsRecording(false);
        setIsPaused(false);
        setRecording(data);
        onRecordingComplete?.(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop recording');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case "click":
        return <MousePointer className="w-4 h-4 text-blue-500" />;
      case "type":
        return <Keyboard className="w-4 h-4 text-green-500" />;
      case "scroll":
        return <Monitor className="w-4 h-4 text-purple-500" />;
      case "hover":
        return <Eye className="w-4 h-4 text-orange-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* WebSocket Connection Status */}
      {!connectionState.connected && (
        <Alert>
          <RefreshCw className="h-4 w-4" />
          <AlertDescription>
            Real-time updates unavailable. Recordings will still work but you won't see live action updates.
          </AlertDescription>
        </Alert>
      )}

      {/* Browser Session Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Monitor className="w-5 h-5" />
            <span>Browser Session</span>
          </CardTitle>
          <CardDescription>
            Create or select a browser session for recording
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentBrowserSession ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg bg-green-50">
                <div>
                  <div className="font-medium">Active Session</div>
                  <div className="text-sm text-gray-600">
                    {currentBrowserSession.browser_type} • {currentBrowserSession.url}
                  </div>
                </div>
                <Badge variant="outline" className="bg-green-100 text-green-800">
                  {currentBrowserSession.status}
                </Badge>
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => RecordingService.navigate(currentBrowserSession.id, 'https://example.com')}
                  disabled={loading}
                >
                  Navigate to Test URL
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => RecordingService.takeScreenshot(currentBrowserSession.id)}
                  disabled={loading}
                >
                  Take Screenshot
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-center py-6 border-2 border-dashed border-gray-300 rounded-lg">
                <Monitor className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">No browser session available</p>
                <p className="text-sm text-gray-500">Create a new session to start recording</p>
              </div>
              <Button 
                onClick={createBrowserSession} 
                disabled={creatingSession || loading}
                className="w-full"
              >
                {creatingSession ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Session...
                  </>
                ) : (
                  'Create Browser Session'
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recording Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Circle className={`w-5 h-5 ${isRecording ? "text-red-500 animate-pulse" : "text-gray-500"}`} />
            <span>Test Recording</span>
            {isRecording && (
              <Badge variant="destructive" className="animate-pulse">
                RECORDING
              </Badge>
            )}
            {connectionState.connected && (
              <Badge variant="outline" className="bg-green-50 text-green-700">
                Live Updates
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Record user interactions and browser events for test automation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isRecording ? (
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="recording-name">Recording Name</Label>
                <Input
                  id="recording-name"
                  placeholder="Enter recording name"
                  value={recordingName}
                  onChange={(e) => setRecordingName(e.target.value)}
                />
              </div>
              
              <div className="space-y-3">
                <Label>Recording Options</Label>
                <div className="grid gap-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="screenshots">Capture Screenshots</Label>
                    <Switch
                      id="screenshots"
                      checked={recordingOptions.captureScreenshots}
                      onCheckedChange={(checked) =>
                        setRecordingOptions((prev) => ({ ...prev, captureScreenshots: checked }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="hover">Include Hover Events</Label>
                    <Switch
                      id="hover"
                      checked={recordingOptions.includeHoverEvents}
                      onCheckedChange={(checked) =>
                        setRecordingOptions((prev) => ({ ...prev, includeHoverEvents: checked }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="scroll">Include Scroll Events</Label>
                    <Switch
                      id="scroll"
                      checked={recordingOptions.includeScrollEvents}
                      onCheckedChange={(checked) =>
                        setRecordingOptions((prev) => ({ ...prev, includeScrollEvents: checked }))
                      }
                    />
                  </div>
                </div>
              </div>
              
              <Button onClick={startRecording} className="w-full" size="lg">
                <Circle className="w-4 h-4 mr-2" />
                Start Recording
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="text-2xl font-mono font-bold">
                    {formatDuration(duration)}
                  </div>
                  <Badge variant="outline">{actions.length} actions</Badge>
                </div>
                <div className="flex items-center space-x-2">
                  {!isPaused ? (
                    <Button onClick={pauseRecording} variant="outline">
                      <Pause className="w-4 h-4 mr-2" />
                      Pause
                    </Button>
                  ) : (
                    <Button onClick={resumeRecording} variant="outline">
                      <Play className="w-4 h-4 mr-2" />
                      Resume
                    </Button>
                  )}
                  <Button onClick={stopRecording} variant="destructive">
                    <Square className="w-4 h-4 mr-2" />
                    Stop
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recorded Actions */}
      {isRecording && (
        <Card>
          <CardHeader>
            <CardTitle>Recorded Actions</CardTitle>
            <CardDescription>
              Real-time view of captured user interactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {actions.map((action, index) => (
                  <div
                    key={action.id}
                    className="flex items-center space-x-3 p-2 rounded-lg border bg-muted/50"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-muted-foreground">
                        #{index + 1}
                      </span>
                      {getActionIcon(action.action_type)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {action.action_type.charAt(0).toUpperCase() + action.action_type.slice(1)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {action.element?.selector || "Unknown element"}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(action.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}