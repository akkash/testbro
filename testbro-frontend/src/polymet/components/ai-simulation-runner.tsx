import React, { useState, useEffect } from "react";
import {
  Play,
  Upload,
  FileText,
  Clock,
  Activity,
  CheckCircle,
  AlertCircle,
  Zap,
  Eye,
  MousePointer,
  Keyboard,
  Scroll,
  Timer,
  Brain,
  Video,
  Monitor,
  PlayCircle,
  Sparkles,
  Lightbulb,
  MessageSquare,
  Wand2,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import BrowserAutomationPlayer from "@/polymet/components/browser-automation-player";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SimulationStep {
  id: string;
  timestamp: string;
  action: string;
  element: string;
  duration: number;
  status: "completed" | "running" | "pending";
  details?: string;
}

interface SimulationMetrics {
  pageLoadTime: number;
  rageClicks: number;
  scrollDepth: number;
  keyboardNavigation: number;
  errorEncounters: number;
  taskCompletionTime: number;
}

interface BrowserAutomationData {
  videoUrl?: string;
  liveStreamUrl?: string;
  thumbnailUrl?: string;
  duration: number;
  recordingStartTime: string;
  recordingEndTime?: string;
  playbackControls: {
    canPlay: boolean;
    canPause: boolean;
    canSeek: boolean;
    availableSpeeds: number[];
  };
}

export default function AISimulationRunner() {
  const [naturalLanguageInput, setNaturalLanguageInput] = useState("");
  const [testCaseInput, setTestCaseInput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [simulationProgress, setSimulationProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<SimulationStep | null>(null);
  const [simulationSteps, setSimulationSteps] = useState<SimulationStep[]>([]);
  const [metrics, setMetrics] = useState<SimulationMetrics | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [browserAutomation, setBrowserAutomation] =
    useState<BrowserAutomationData | null>(null);
  const [showBrowserView, setShowBrowserView] = useState(false);
  const [aiPreviewSteps, setAiPreviewSteps] = useState<any[]>([]);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [inputMode, setInputMode] = useState<"natural" | "technical">("natural");

  const mockSimulationSteps: SimulationStep[] = [
    {
      id: "1",
      timestamp: "00:00:01",
      action: "Navigate to page",
      element: "https://app.example.com/login",
      duration: 1200,
      status: "completed",
      details: "Page loaded successfully",
    },
    {
      id: "2",
      timestamp: "00:00:03",
      action: "Type slowly",
      element: "Email input field",
      duration: 2800,
      status: "completed",
      details: "Typed: user@example.com (realistic typing speed)",
    },
    {
      id: "3",
      timestamp: "00:00:06",
      action: "Random click",
      element: "Logo area",
      duration: 150,
      status: "completed",
      details: "Accidental click detected - rage click pattern",
    },
    {
      id: "4",
      timestamp: "00:00:07",
      action: "Type password",
      element: "Password input field",
      duration: 3200,
      status: "completed",
      details: "Password entered with realistic hesitation",
    },
    {
      id: "5",
      timestamp: "00:00:11",
      action: "Scroll behavior",
      element: "Page content",
      duration: 800,
      status: "completed",
      details: "Scrolled 45% of page content",
    },
    {
      id: "6",
      timestamp: "00:00:12",
      action: "Click submit",
      element: "Login button",
      duration: 200,
      status: "completed",
      details: "Button clicked successfully",
    },
    {
      id: "7",
      timestamp: "00:00:15",
      action: "Wait for response",
      element: "Loading state",
      duration: 2100,
      status: "completed",
      details: "Authentication completed",
    },
  ];

  const mockMetrics: SimulationMetrics = {
    pageLoadTime: 1200,
    rageClicks: 2,
    scrollDepth: 45,
    keyboardNavigation: 8,
    errorEncounters: 0,
    taskCompletionTime: 15300,
  };

  const handleRunSimulation = async () => {
    if (!testCaseInput.trim()) return;

    setIsRunning(true);
    setSimulationProgress(0);
    setSimulationSteps([]);
    setShowResults(false);
    setShowBrowserView(true);

    // Initialize live browser automation stream
    setBrowserAutomation({
      liveStreamUrl: "/streams/ai-simulation-live",
      thumbnailUrl: "/thumbnails/ai-simulation-thumb.jpg",
      duration: 0,
      recordingStartTime: new Date().toISOString(),
      playbackControls: {
        canPlay: true,
        canPause: true,
        canSeek: false,
        availableSpeeds: [1],
      },
    });

    // Simulate the AI running through test steps
    for (let i = 0; i < mockSimulationSteps.length; i++) {
      const step = { ...mockSimulationSteps[i], status: "running" as const };
      setCurrentStep(step);

      // Simulate step execution time
      await new Promise((resolve) => setTimeout(resolve, step.duration));

      step.status = "completed";
      setSimulationSteps((prev) => [...prev, step]);
      setSimulationProgress(((i + 1) / mockSimulationSteps.length) * 100);
    }

    setCurrentStep(null);
    setMetrics(mockMetrics);
    setIsRunning(false);
    setShowResults(true);

    // Convert to recorded playback
    setBrowserAutomation({
      videoUrl: "/videos/ai-simulation-recording.mp4",
      thumbnailUrl: "/thumbnails/ai-simulation-complete.jpg",
      duration: 15300, // Total simulation time
      recordingStartTime: new Date(Date.now() - 15300).toISOString(),
      recordingEndTime: new Date().toISOString(),
      playbackControls: {
        canPlay: true,
        canPause: true,
        canSeek: true,
        availableSpeeds: [0.5, 1, 1.5, 2],
      },
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setTestCaseInput(e.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  // Generate AI preview from natural language input
  const generateAIPreview = async () => {
    if (!naturalLanguageInput.trim()) return;

    setIsGeneratingPreview(true);

    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Mock AI-generated steps based on input
    const mockPreviewSteps = [
      {
        id: "preview-1",
        step: 1,
        action: "Navigate to login page",
        description: "Open the main login page URL",
        confidence: 95,
        reasoning: "User mentioned 'login' so we need to start at login page"
      },
      {
        id: "preview-2",
        step: 2,
        action: "Fill email field",
        description: "Enter user email address",
        confidence: 90,
        reasoning: "Login flows typically require email input"
      },
      {
        id: "preview-3",
        step: 3,
        action: "Fill password field",
        description: "Enter user password",
        confidence: 88,
        reasoning: "Password is required for authentication"
      },
      {
        id: "preview-4",
        step: 4,
        action: "Click login button",
        description: "Submit login credentials",
        confidence: 92,
        reasoning: "Submit button completes the login process"
      },
      {
        id: "preview-5",
        step: 5,
        action: "Wait for dashboard",
        description: "Verify successful login",
        confidence: 85,
        reasoning: "Confirm user reached intended destination"
      }
    ];

    setAiPreviewSteps(mockPreviewSteps);
    setIsGeneratingPreview(false);
  };

  // Load sample templates
  const loadSampleTemplate = (template: string) => {
    const templates = {
      "login": "User logs into the application: 1) Navigate to login page, 2) Enter valid email and password, 3) Click login button, 4) Verify dashboard loads",
      "checkout": "User completes purchase: 1) Add items to cart, 2) Proceed to checkout, 3) Fill shipping information, 4) Enter payment details, 5) Complete purchase",
      "registration": "User creates new account: 1) Navigate to signup page, 2) Fill registration form, 3) Verify email address, 4) Complete profile setup",
      "search": "User searches for products: 1) Navigate to homepage, 2) Use search bar to find items, 3) Apply filters, 4) View search results, 5) Select product"
    };

    setNaturalLanguageInput(templates[template as keyof typeof templates] || "");
    setInputMode("natural");
  };

  // Convert natural language to technical format
  const convertToTechnicalFormat = () => {
    if (!naturalLanguageInput.trim()) return;

    // Mock conversion - in real app this would call AI service
    const technicalFormat = `
{
  "testCase": {
    "name": "AI Generated Test Case",
    "description": "${naturalLanguageInput}",
    "steps": ${JSON.stringify(aiPreviewSteps.map(step => ({
      action: step.action,
      selector: ".auto-generated",
      value: "",
      wait: 1000
    })), null, 2)}
  }
}`;

    setTestCaseInput(technicalFormat);
    setInputMode("technical");
  };

  // Effect to generate preview when natural language input changes
  useEffect(() => {
    if (naturalLanguageInput.trim()) {
      const timeoutId = setTimeout(() => {
        generateAIPreview();
      }, 1000); // Debounce for 1 second

      return () => clearTimeout(timeoutId);
    } else {
      setAiPreviewSteps([]);
    }
  }, [naturalLanguageInput]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            AI Simulation Runner
          </h1>
          <p className="text-gray-600 mt-2">
            Upload test cases and run AI-powered user simulations with UX
            scoring
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBrowserView(!showBrowserView)}
          >
            <Monitor className="w-4 h-4 mr-2" />
            {showBrowserView ? "Hide" : "Show"} Browser View
          </Button>
          <Badge variant="secondary" className="bg-purple-100 text-purple-800">
            <Brain className="w-4 h-4 mr-1" />
            AI Powered
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Natural Language Input */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              <span>Describe Your Flow</span>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                <Brain className="w-3 h-3 mr-1" />
                AI Powered
              </Badge>
            </CardTitle>
            <p className="text-sm text-gray-600">
              Tell us in plain English what you want to test, and our AI will generate the perfect simulation
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Sample Templates */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-900 flex items-center">
                <Lightbulb className="w-4 h-4 mr-2 text-yellow-500" />
                Quick Start Templates
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadSampleTemplate("login")}
                  className="text-left justify-start h-auto p-3"
                >
                  <div>
                    <div className="font-medium text-sm">🔐 Login Flow</div>
                    <div className="text-xs text-gray-500">User authentication</div>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadSampleTemplate("checkout")}
                  className="text-left justify-start h-auto p-3"
                >
                  <div>
                    <div className="font-medium text-sm">🛒 Checkout Flow</div>
                    <div className="text-xs text-gray-500">E-commerce purchase</div>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadSampleTemplate("registration")}
                  className="text-left justify-start h-auto p-3"
                >
                  <div>
                    <div className="font-medium text-sm">📝 Registration</div>
                    <div className="text-xs text-gray-500">User signup process</div>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadSampleTemplate("search")}
                  className="text-left justify-start h-auto p-3"
                >
                  <div>
                    <div className="font-medium text-sm">🔍 Product Search</div>
                    <div className="text-xs text-gray-500">Search functionality</div>
                  </div>
                </Button>
              </div>
            </div>

            <Textarea
              id="natural-language-input"
              placeholder="Describe your user flow in plain English...&#10;&#10;Example: 'User logs into the app, searches for products, adds items to cart, and completes checkout'"
              value={naturalLanguageInput}
              onChange={(e) => setNaturalLanguageInput(e.target.value)}
              className="min-h-[120px] text-sm"
            />

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <Button
                onClick={convertToTechnicalFormat}
                disabled={!naturalLanguageInput.trim() || aiPreviewSteps.length === 0}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <Wand2 className="w-4 h-4 mr-2" />
                Convert to Technical
              </Button>
              <Button
                onClick={handleRunSimulation}
                disabled={(!testCaseInput.trim() && !naturalLanguageInput.trim()) || isRunning}
                size="sm"
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {isRunning ? (
                  <>
                    <Activity className="w-4 h-4 mr-2 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Run Simulation
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* AI Preview Panel */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <span>AI Generated Steps</span>
              {isGeneratingPreview && (
                <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                  Generating...
                </Badge>
              )}
            </CardTitle>
            <p className="text-sm text-gray-600">
              Watch as our AI analyzes your description and creates test steps
            </p>
          </CardHeader>
          <CardContent>
            {aiPreviewSteps.length > 0 ? (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {aiPreviewSteps.map((step, index) => (
                  <div key={step.id} className="flex items-start space-x-3 p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      {step.step}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-medium text-gray-900">{step.action}</h4>
                        <Badge variant="outline" className="text-xs bg-white">
                          {step.confidence}% confident
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">{step.description}</p>
                      <div className="flex items-center text-xs text-purple-600">
                        <ChevronRight className="w-3 h-3 mr-1" />
                        <span className="font-medium">AI Reasoning:</span>
                        <span className="ml-1">{step.reasoning}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : naturalLanguageInput.trim() ? (
              <div className="text-center py-8">
                <Sparkles className="w-12 h-12 text-purple-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600 mb-2">AI is analyzing your description...</p>
                <p className="text-xs text-gray-500">Steps will appear here automatically</p>
              </div>
            ) : (
              <div className="text-center py-8">
                <Brain className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-sm font-medium text-gray-900 mb-2">Ready for Your Description</h3>
                <p className="text-xs text-gray-500 mb-4">
                  Describe your user flow above, and watch our AI generate test steps in real-time
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadSampleTemplate("login")}
                  className="text-xs"
                >
                  <Lightbulb className="w-3 h-3 mr-1" />
                  Try Example Simulation
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Technical Input (Collapsible) */}
        <Card className="xl:col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="w-5 h-5" />
              <span>Technical Input</span>
              <Badge variant="outline" className="text-xs">
                Advanced Mode
              </Badge>
            </CardTitle>
            <p className="text-sm text-gray-600">
              For developers: paste JSON/YAML test cases or upload files
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs defaultValue="paste" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="paste">Paste Test Case</TabsTrigger>
                <TabsTrigger value="upload">Upload File</TabsTrigger>
              </TabsList>

              <TabsContent value="paste" className="space-y-4">
                <Textarea
                  placeholder="Paste your test case here (JSON, YAML, or plain text format)..."
                  value={testCaseInput}
                  onChange={(e) => setTestCaseInput(e.target.value)}
                  className="min-h-[150px] font-mono text-sm"
                />
              </TabsContent>

              <TabsContent value="upload" className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-2">Upload test case file</p>
                  <input
                    type="file"
                    accept=".json,.yaml,.yml,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById("file-upload")?.click()}
                  >
                    Choose File
                  </Button>
                </div>
              </TabsContent>
            </Tabs>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Test cases will be automatically added to both Test Cases and Test Suites modules
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Browser Automation Player */}
        {showBrowserView && browserAutomation && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                {isRunning ? (
                  <>
                    <Monitor className="w-5 h-5 text-red-500" />

                    <span>Live Browser Automation</span>
                    <Badge variant="destructive" className="ml-2">
                      LIVE
                    </Badge>
                  </>
                ) : (
                  <>
                    <Video className="w-5 h-5" />

                    <span>Simulation Recording</span>
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BrowserAutomationPlayer
                automationData={browserAutomation}
                testCaseName="AI User Simulation - Live Execution"
                isLive={isRunning}
                onTimeUpdate={(time) => console.log("Simulation time:", time)}
                className="w-full"
              />

              {isRunning && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />

                    <span className="text-sm font-medium text-red-800">
                      Live AI Simulation in Progress
                    </span>
                  </div>
                  <p className="text-xs text-red-600 mt-1">
                    Watch the AI agent interact with the browser in real-time
                  </p>
                </div>
              )}

              {showResults && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <PlayCircle className="w-4 h-4 text-green-600" />

                    <span className="text-sm font-medium text-green-800">
                      Simulation Complete - Recording Available
                    </span>
                  </div>
                  <p className="text-xs text-green-600 mt-1">
                    Review the full simulation with playback controls
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Simulation Progress */}
        <Card className="xl:col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-blue-600" />
              <span>Simulation Progress</span>
              {isRunning && (
                <Badge variant="destructive" className="animate-pulse">
                  <div className="w-2 h-2 bg-white rounded-full mr-1 animate-pulse" />
                  LIVE
                </Badge>
              )}
            </CardTitle>
            <p className="text-sm text-gray-600">
              Real-time execution of AI-generated test steps
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {isRunning || simulationSteps.length > 0 ? (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Progress</span>
                    <span className="text-blue-600 font-bold">{Math.round(simulationProgress)}%</span>
                  </div>
                  <Progress value={simulationProgress} className="w-full h-3" />
                </div>

                {currentStep && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Activity className="w-5 h-5 text-blue-600 animate-spin" />
                      <span className="font-semibold text-blue-900">Currently Executing</span>
                    </div>
                    <p className="text-sm text-blue-800 font-medium">
                      {currentStep.action}
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      {currentStep.element}
                    </p>
                  </div>
                )}

                <div className="space-y-2 max-h-80 overflow-y-auto">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Execution Steps</h4>
                  {simulationSteps.map((step) => (
                    <div
                      key={step.id}
                      className="flex items-start space-x-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200"
                    >
                      <div className="flex-shrink-0 w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center">
                        <CheckCircle className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-sm font-medium text-gray-900">
                            {step.action}
                          </span>
                          <Badge variant="outline" className="text-xs bg-white">
                            {step.timestamp}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600 mb-1">
                          {step.element}
                        </p>
                        {step.details && (
                          <p className="text-xs text-gray-500">
                            {step.details}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-gray-400">
                          {step.duration}ms
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Brain className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Ready to Run Your First AI Simulation
                </h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Describe your user flow in plain English, or choose from our templates to get started instantly
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    onClick={() => loadSampleTemplate("login")}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Lightbulb className="w-4 h-4 mr-2" />
                    Try Example Simulation
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById("natural-language-input")?.focus()}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Describe Your Flow
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Browser Automation Controls */}
      {showBrowserView && !isRunning && browserAutomation && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Video className="w-5 h-5" />

              <span>Browser Automation Analysis</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <Video className="w-8 h-8 text-blue-600 mx-auto mb-2" />

                <h4 className="font-medium text-blue-900 mb-1">
                  Full Recording
                </h4>
                <p className="text-sm text-blue-700">
                  Complete simulation captured
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Duration: {(browserAutomation.duration / 1000).toFixed(1)}s
                </p>
              </div>

              <div className="text-center p-4 bg-green-50 rounded-lg">
                <Brain className="w-8 h-8 text-green-600 mx-auto mb-2" />

                <h4 className="font-medium text-green-900 mb-1">AI Analysis</h4>
                <p className="text-sm text-green-700">
                  Behavioral patterns detected
                </p>
                <p className="text-xs text-green-600 mt-1">
                  {simulationSteps.length} actions analyzed
                </p>
              </div>

              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <Zap className="w-8 h-8 text-purple-600 mx-auto mb-2" />

                <h4 className="font-medium text-purple-900 mb-1">UX Scoring</h4>
                <p className="text-sm text-purple-700">
                  Ready for quality analysis
                </p>
                <Button size="sm" className="mt-2">
                  Generate Score
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Real-time Metrics */}
      {(isRunning || showResults) && metrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="w-5 h-5" />

              <span>Real-time Metrics</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <Timer className="w-6 h-6 text-blue-600 mx-auto mb-1" />

                <p className="text-sm text-blue-800 font-medium">Page Load</p>
                <p className="text-lg font-bold text-blue-900">
                  {metrics.pageLoadTime}ms
                </p>
              </div>

              <div className="text-center p-3 bg-red-50 rounded-lg">
                <MousePointer className="w-6 h-6 text-red-600 mx-auto mb-1" />

                <p className="text-sm text-red-800 font-medium">Rage Clicks</p>
                <p className="text-lg font-bold text-red-900">
                  {metrics.rageClicks}
                </p>
              </div>

              <div className="text-center p-3 bg-green-50 rounded-lg">
                <Scroll className="w-6 h-6 text-green-600 mx-auto mb-1" />

                <p className="text-sm text-green-800 font-medium">
                  Scroll Depth
                </p>
                <p className="text-lg font-bold text-green-900">
                  {metrics.scrollDepth}%
                </p>
              </div>

              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <Keyboard className="w-6 h-6 text-purple-600 mx-auto mb-1" />

                <p className="text-sm text-purple-800 font-medium">
                  Keyboard Nav
                </p>
                <p className="text-lg font-bold text-purple-900">
                  {metrics.keyboardNavigation}
                </p>
              </div>

              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <AlertCircle className="w-6 h-6 text-orange-600 mx-auto mb-1" />

                <p className="text-sm text-orange-800 font-medium">Errors</p>
                <p className="text-lg font-bold text-orange-900">
                  {metrics.errorEncounters}
                </p>
              </div>

              <div className="text-center p-3 bg-indigo-50 rounded-lg">
                <Clock className="w-6 h-6 text-indigo-600 mx-auto mb-1" />

                <p className="text-sm text-indigo-800 font-medium">
                  Total Time
                </p>
                <p className="text-lg font-bold text-indigo-900">
                  {(metrics.taskCompletionTime / 1000).toFixed(1)}s
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Actions */}
      {showResults && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Simulation Complete
                </h3>
                <p className="text-gray-600">
                  Ready to generate UX Quality Score and detailed analysis
                </p>
              </div>
              <div className="flex space-x-3">
                <Button variant="outline">Save to Test Suite</Button>
                <Button variant="outline">
                  <Video className="w-4 h-4 mr-2" />
                  Download Recording
                </Button>
                <Button>Generate UX Score</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
