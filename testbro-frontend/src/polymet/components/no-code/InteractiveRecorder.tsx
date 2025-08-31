import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Play, 
  Pause, 
  Square, 
  Eye, 
  CheckCircle, 
  AlertTriangle,
  Edit,
  Trash2,
  Monitor,
  Smartphone,
  RotateCcw,
  Save,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/contexts/OrganizationContext';

interface NoCodeTestStep {
  id: string;
  order_index: number;
  natural_language: string;
  action_type: 'click' | 'type' | 'verify' | 'navigate' | 'wait' | 'select' | 'scroll' | 'hover';
  element_description: string;
  element_selector: string;
  element_alternatives: string[];
  value?: string;
  confidence_score: number;
  user_verified: boolean;
  screenshot_before?: string;
  screenshot_after?: string;
  created_at: string;
  updated_at: string;
}

interface InteractiveRecording {
  id: string;
  session_id: string;
  project_id: string;
  name: string;
  description?: string;
  status: 'recording' | 'paused' | 'completed' | 'failed' | 'cancelled';
  auto_generate_steps: boolean;
  real_time_preview: boolean;
  steps_count: number;
  duration_seconds: number;
  current_url?: string;
  created_by: string;
  created_at: string;
  completed_at?: string;
}

interface BrowserEvent {
  type: string;
  coordinates: { x: number; y: number };
  element: any;
  timestamp: string;
  page_url: string;
}

export default function InteractiveRecorder() {
  const [recording, setRecording] = useState<InteractiveRecording | null>(null);
  const [steps, setSteps] = useState<NoCodeTestStep[]>([]);
  const [currentStep, setCurrentStep] = useState<NoCodeTestStep | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [browserUrl, setBrowserUrl] = useState('https://example.com');
  const [recordingName, setRecordingName] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Initialize WebSocket connection for real-time updates
  useEffect(() => {
    if (recording) {
      const ws = new WebSocket(`ws://localhost:3001/api/no-code/recording/${recording.id}`);
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        toast({
          title: 'Connection Error',
          description: 'Lost connection to recording service',
          variant: 'destructive'
        });
      };

      wsRef.current = ws;

      return () => {
        if (wsRef.current) {
          wsRef.current.close();
        }
      };
    }
  }, [recording]);

  const handleWebSocketMessage = useCallback((data: any) => {
    switch (data.type) {
      case 'step_generated':
        if (data.step) {
          setSteps(prev => [...prev, data.step]);
          setCurrentStep(data.step);
          
          // Show notification for new step
          toast({
            title: 'Step Generated',
            description: data.step.natural_language,
          });
        }
        break;
        
      case 'step_verified':
        if (data.step) {
          setSteps(prev => prev.map(s => s.id === data.step.id ? data.step : s));
        }
        break;
        
      case 'recording_completed':
        setIsRecording(false);
        setRecording(data.recording);
        toast({
          title: 'Recording Completed',
          description: `Successfully recorded ${data.recording.steps_count} steps`,
        });
        break;
        
      case 'error':
        toast({
          title: 'Recording Error',
          description: data.error || 'An error occurred during recording',
          variant: 'destructive'
        });
        break;
    }
  }, [toast]);

  const startRecording = async () => {
    if (!recordingName.trim() || !selectedProject) {
      toast({
        title: 'Missing Information',
        description: 'Please enter a recording name and select a project',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/no-code/recordings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: `session_${Date.now()}`,
          project_id: selectedProject,
          name: recordingName,
          description: `Interactive recording started at ${new Date().toLocaleString()}`,
          auto_generate_steps: true,
          real_time_preview: true,
          page_url: browserUrl
        })
      });

      if (!response.ok) {
        throw new Error('Failed to start recording');
      }

      const data = await response.json();
      setRecording(data.data);
      setIsRecording(true);
      setSteps([]);
      
      toast({
        title: 'Recording Started',
        description: 'Begin interacting with the page to generate test steps',
      });

    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to start recording',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const pauseRecording = () => {
    setIsPaused(!isPaused);
    toast({
      title: isPaused ? 'Recording Resumed' : 'Recording Paused',
      description: isPaused ? 'Continue interacting with the page' : 'Recording is paused',
    });
  };

  const stopRecording = async () => {
    if (!recording) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/no-code/recordings/${recording.id}/complete`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to complete recording');
      }

      const data = await response.json();
      setRecording(data.data);
      setIsRecording(false);
      setIsPaused(false);

    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to complete recording',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBrowserAction = useCallback(async (event: BrowserEvent) => {
    if (!recording || !isRecording || isPaused) return;

    try {
      const response = await fetch(`/api/no-code/recordings/${recording.id}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event)
      });

      if (!response.ok) {
        throw new Error('Failed to process action');
      }

      // Step will be added via WebSocket message
    } catch (error) {
      console.error('Failed to process browser action:', error);
    }
  }, [recording, isRecording, isPaused]);

  const handleStepEdit = (stepId: string, updates: Partial<NoCodeTestStep>) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, ...updates } : step
    ));
  };

  const handleStepDelete = (stepId: string) => {
    setSteps(prev => prev.filter(step => step.id !== stepId));
    if (currentStep?.id === stepId) {
      setCurrentStep(null);
    }
  };

  const handleStepVerify = async (stepId: string, verified: boolean) => {
    try {
      const response = await fetch(`/api/no-code/steps/${stepId}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ verified })
      });

      if (!response.ok) {
        throw new Error('Failed to verify step');
      }

      // Update will come via WebSocket
      toast({
        title: verified ? 'Step Verified' : 'Step Rejected',
        description: verified ? 'Step marked as verified' : 'Step marked for review',
      });

    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update step verification',
        variant: 'destructive'
      });
    }
  };

  const getActionIcon = (actionType: string) => {
    const iconMap: Record<string, any> = {
      click: Monitor,
      type: Edit,
      navigate: Monitor,
      verify: Eye,
      wait: Loader2,
      select: Monitor,
      scroll: RotateCcw,
      hover: Monitor
    };
    return iconMap[actionType] || Monitor;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Panel: Recording Controls & Generated Steps */}
      <div className="w-1/3 border-r bg-white flex flex-col">
        {/* Recording Controls */}
        <Card className="m-4 mb-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Interactive Recorder</CardTitle>
            <CardDescription>
              Record actions and generate test steps automatically
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!recording && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="recordingName">Recording Name</Label>
                  <Input
                    id="recordingName"
                    value={recordingName}
                    onChange={(e) => setRecordingName(e.target.value)}
                    placeholder="e.g., Login Flow Test"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="projectSelect">Project</Label>
                  <select
                    id="projectSelect"
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                  >
                    <option value="">Select a project</option>
                    <option value="project-1">Demo Project</option>
                    <option value="project-2">E-commerce Site</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="browserUrl">Target URL</Label>
                  <Input
                    id="browserUrl"
                    value={browserUrl}
                    onChange={(e) => setBrowserUrl(e.target.value)}
                    placeholder="https://example.com"
                  />
                </div>
              </>
            )}

            <div className="flex gap-2">
              {!isRecording ? (
                <Button 
                  onClick={startRecording} 
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 mr-2" />
                  )}
                  Start Recording
                </Button>
              ) : (
                <>
                  <Button 
                    onClick={pauseRecording}
                    variant={isPaused ? "default" : "secondary"}
                    className="flex-1"
                  >
                    {isPaused ? (
                      <Play className="w-4 h-4 mr-2" />
                    ) : (
                      <Pause className="w-4 h-4 mr-2" />
                    )}
                    {isPaused ? 'Resume' : 'Pause'}
                  </Button>
                  <Button 
                    onClick={stopRecording}
                    variant="destructive"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Square className="w-4 h-4 mr-2" />
                    )}
                    Stop
                  </Button>
                </>
              )}
            </div>

            {recording && (
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Steps: {steps.length}</span>
                <Badge variant={isRecording ? "default" : "secondary"}>
                  {isPaused ? 'Paused' : isRecording ? 'Recording' : recording.status}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Generated Steps List */}
        <Card className="mx-4 mb-4 flex-1 flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Generated Steps</CardTitle>
            <CardDescription>
              AI-generated test steps from your interactions
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <ScrollArea className="h-full">
              {steps.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  {isRecording ? 
                    'Start interacting with the page to generate steps...' : 
                    'No steps recorded yet'}
                </div>
              ) : (
                <div className="space-y-2 p-4">
                  {steps.map((step, index) => {
                    const ActionIcon = getActionIcon(step.action_type);
                    return (
                      <div
                        key={step.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          currentStep?.id === step.id 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setCurrentStep(step)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <ActionIcon className="w-4 h-4 text-gray-600" />
                              <span className="text-sm font-medium capitalize">
                                {step.action_type}
                              </span>
                              <Badge 
                                variant={step.user_verified ? "default" : "secondary"}
                                className="h-5 text-xs"
                              >
                                {step.user_verified ? (
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                ) : (
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                )}
                                {step.user_verified ? 'Verified' : 'Review'}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-700 mb-1">
                              {step.natural_language}
                            </p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500">
                                {step.element_description}
                              </span>
                              <span className={`text-xs font-medium ${getConfidenceColor(step.confidence_score)}`}>
                                {Math.round(step.confidence_score * 100)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Center: Interactive Browser */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b bg-white">
          <div className="flex items-center gap-2">
            <Monitor className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-medium">Browser Preview</span>
            {isRecording && (
              <Badge variant="destructive" className="ml-auto">
                <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse" />
                {isPaused ? 'Paused' : 'Recording'}
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex-1 bg-gray-100 p-4">
          <div className="w-full h-full bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="h-10 bg-gray-200 flex items-center px-4 gap-2">
              <div className="flex gap-1">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
              <div className="flex-1 bg-white rounded px-3 py-1 text-sm text-gray-600">
                {browserUrl}
              </div>
            </div>
            <iframe
              ref={iframeRef}
              src={browserUrl}
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin allow-forms allow-navigation"
              onLoad={() => {
                // Inject recording script when iframe loads
                if (isRecording && iframeRef.current?.contentWindow) {
                  // This would inject the recording JavaScript
                  console.log('Iframe loaded, ready for recording');
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Right Panel: Step Preview & Editing */}
      <div className="w-1/3 border-l bg-white">
        {currentStep ? (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Step Details</h3>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleStepVerify(currentStep.id, !currentStep.user_verified)}
                >
                  {currentStep.user_verified ? (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 mr-2" />
                  )}
                  {currentStep.user_verified ? 'Verified' : 'Verify'}
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleStepDelete(currentStep.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Action Type</Label>
                <div className="mt-1">
                  <Badge variant="outline" className="capitalize">
                    {currentStep.action_type}
                  </Badge>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Description</Label>
                <p className="mt-1 text-sm text-gray-700">
                  {currentStep.natural_language}
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium">Element</Label>
                <p className="mt-1 text-sm text-gray-700">
                  {currentStep.element_description}
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium">Selector</Label>
                <code className="mt-1 block p-2 bg-gray-100 rounded text-xs font-mono">
                  {currentStep.element_selector}
                </code>
              </div>

              {currentStep.value && (
                <div>
                  <Label className="text-sm font-medium">Value</Label>
                  <p className="mt-1 text-sm text-gray-700 font-mono">
                    "{currentStep.value}"
                  </p>
                </div>
              )}

              <div>
                <Label className="text-sm font-medium">Confidence Score</Label>
                <div className="mt-1 flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        currentStep.confidence_score >= 0.8 ? 'bg-green-500' :
                        currentStep.confidence_score >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${currentStep.confidence_score * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">
                    {Math.round(currentStep.confidence_score * 100)}%
                  </span>
                </div>
              </div>

              {currentStep.element_alternatives.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Alternative Selectors</Label>
                  <div className="mt-1 space-y-1">
                    {currentStep.element_alternatives.map((selector, index) => (
                      <code key={index} className="block p-2 bg-gray-50 rounded text-xs font-mono">
                        {selector}
                      </code>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {!currentStep.user_verified && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  This step was automatically generated and needs verification. 
                  Review the details and verify if the step looks correct.
                </AlertDescription>
              </Alert>
            )}
          </div>
        ) : (
          <div className="p-4 text-center text-gray-500">
            <Eye className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p>Select a step to view details</p>
            <p className="text-sm">
              Click on any generated step to review and edit
            </p>
          </div>
        )}
      </div>
    </div>
  );
}