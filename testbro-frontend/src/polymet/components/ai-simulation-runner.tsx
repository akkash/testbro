import React, { useState, useEffect } from "react";
import {
  Play,
  Clock,
  Activity,
  CheckCircle,
  Zap,
  Video,
  Monitor,
  PlayCircle,
  RefreshCw,
  TrendingUp,
} from "lucide-react";

// Custom icon components for missing icons
const Upload = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
  </svg>
);

const FileText = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const AlertCircle = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const Eye = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const MousePointer = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16l4.586-4.586a2 2 0 012.828 0L19 19V4a1 1 0 00-1-1H8a1 1 0 00-1 1z" />
  </svg>
);

const Keyboard = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);

const Scroll = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

const Timer = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const Brain = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

const Sparkles = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l1.5 1.5L5 6 3.5 4.5 5 3zm0 0L3 1m2 2l2-2m6 7l1.5 1.5L15 12l-1.5-1.5L15 9zm0 0L13 7m2 2l2-2m-7 7l1.5 1.5L12 21l-1.5-1.5L12 18zm0 0L10 16m2 2l2-2" />
  </svg>
);

const Lightbulb = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

const MessageSquare = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const Wand2 = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.929 4.929l1.414 1.414M7.05 11.293l1.414-1.414m2.829-2.828l1.414 1.414M15 9l6 6-6 6-6-6 6-6zM9 3l1 1-1 1-1-1 1-1z" />
  </svg>
);

const ChevronRight = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const History = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const MoreHorizontal = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="1"/>
    <circle cx="19" cy="12" r="1"/>
    <circle cx="5" cy="12" r="1"/>
  </svg>
);

const Trash2 = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const Star = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
  </svg>
);

const Calendar = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const Filter = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
  </svg>
);
import BrowserAutomationPlayer from "@/polymet/components/browser-automation-player";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

interface PastSimulation {
  id: string;
  name: string;
  description: string;
  flow: string;
  createdAt: string;
  duration: number;
  status: "completed" | "failed" | "cancelled";
  metrics: {
    pageLoadTime: number;
    rageClicks: number;
    scrollDepth: number;
    uxScore: number;
  };
  stepsCount: number;
  tags: string[];
  isFavorite: boolean;
  thumbnailUrl?: string;
  videoUrl?: string;
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
  const [pastSimulations, setPastSimulations] = useState<PastSimulation[]>([]);
  const [showPastSimulations, setShowPastSimulations] = useState(true);
  const [simulationFilter, setSimulationFilter] = useState<"all" | "favorites" | "recent">("all");

  // Mock past simulations data
  const mockPastSimulations: PastSimulation[] = [
    {
      id: "sim_1",
      name: "Login Flow Analysis",
      description: "User authentication with email/password",
      flow: "login",
      createdAt: "2024-01-15T10:30:00Z",
      duration: 15300,
      status: "completed",
      metrics: {
        pageLoadTime: 1200,
        rageClicks: 2,
        scrollDepth: 45,
        uxScore: 87
      },
      stepsCount: 7,
      tags: ["authentication", "ui-test"],
      isFavorite: true,
      thumbnailUrl: "/thumbnails/login-simulation.jpg",
      videoUrl: "/videos/login-simulation.mp4"
    },
    {
      id: "sim_2",
      name: "E-commerce Checkout",
      description: "Complete purchase flow with payment processing",
      flow: "checkout",
      createdAt: "2024-01-14T16:45:00Z",
      duration: 28500,
      status: "completed",
      metrics: {
        pageLoadTime: 1800,
        rageClicks: 0,
        scrollDepth: 78,
        uxScore: 92
      },
      stepsCount: 12,
      tags: ["e-commerce", "payment", "conversion"],
      isFavorite: false,
      thumbnailUrl: "/thumbnails/checkout-simulation.jpg",
      videoUrl: "/videos/checkout-simulation.mp4"
    },
    {
      id: "sim_3",
      name: "Search & Filter",
      description: "Product search with multiple filters applied",
      flow: "search",
      createdAt: "2024-01-13T09:15:00Z",
      duration: 19200,
      status: "completed",
      metrics: {
        pageLoadTime: 950,
        rageClicks: 1,
        scrollDepth: 62,
        uxScore: 89
      },
      stepsCount: 9,
      tags: ["search", "filters", "product-discovery"],
      isFavorite: true,
      thumbnailUrl: "/thumbnails/search-simulation.jpg",
      videoUrl: "/videos/search-simulation.mp4"
    },
    {
      id: "sim_4",
      name: "User Registration",
      description: "New account creation with email verification",
      flow: "registration",
      createdAt: "2024-01-12T14:20:00Z",
      duration: 22800,
      status: "failed",
      metrics: {
        pageLoadTime: 2100,
        rageClicks: 4,
        scrollDepth: 35,
        uxScore: 68
      },
      stepsCount: 8,
      tags: ["onboarding", "registration", "email-verification"],
      isFavorite: false,
      thumbnailUrl: "/thumbnails/registration-simulation.jpg"
    },
    {
      id: "sim_5",
      name: "Mobile Navigation",
      description: "Mobile-first navigation and menu interaction",
      flow: "mobile",
      createdAt: "2024-01-11T11:30:00Z",
      duration: 12600,
      status: "completed",
      metrics: {
        pageLoadTime: 1400,
        rageClicks: 0,
        scrollDepth: 55,
        uxScore: 91
      },
      stepsCount: 6,
      tags: ["mobile", "navigation", "responsive"],
      isFavorite: false,
      thumbnailUrl: "/thumbnails/mobile-simulation.jpg",
      videoUrl: "/videos/mobile-simulation.mp4"
    }
  ];

  // Initialize past simulations
  useEffect(() => {
    setPastSimulations(mockPastSimulations);
  }, []);

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
      const step: SimulationStep = { ...mockSimulationSteps[i], status: "running" };
      setCurrentStep(step);

      // Simulate step execution time
      await new Promise((resolve) => setTimeout(resolve, step.duration));

      const completedStep: SimulationStep = { ...step, status: "completed" };
      setSimulationSteps((prev) => [...prev, completedStep]);
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

  // Helper functions for past simulations
  const filteredSimulations = pastSimulations.filter(sim => {
    switch (simulationFilter) {
      case "favorites":
        return sim.isFavorite;
      case "recent":
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return new Date(sim.createdAt) > sevenDaysAgo;
      default:
        return true;
    }
  });

  const handleReplaySimulation = (simulation: PastSimulation) => {
    // Load the simulation data and replay it
    setNaturalLanguageInput(simulation.description);
    setInputMode("natural");
    
    // Simulate loading the previous simulation
    if (simulation.videoUrl) {
      setBrowserAutomation({
        videoUrl: simulation.videoUrl,
        thumbnailUrl: simulation.thumbnailUrl || "/thumbnails/default-sim.jpg",
        duration: simulation.duration,
        recordingStartTime: simulation.createdAt,
        recordingEndTime: new Date(new Date(simulation.createdAt).getTime() + simulation.duration).toISOString(),
        playbackControls: {
          canPlay: true,
          canPause: true,
          canSeek: true,
          availableSpeeds: [0.5, 1, 1.5, 2],
        },
      });
      setShowBrowserView(true);
      setShowResults(true);
    }
    
    console.log('Replaying simulation:', simulation.name);
  };

  const handleToggleFavorite = (simulationId: string) => {
    setPastSimulations(prev => 
      prev.map(sim => 
        sim.id === simulationId 
          ? { ...sim, isFavorite: !sim.isFavorite }
          : sim
      )
    );
  };

  const handleDeleteSimulation = (simulationId: string) => {
    if (confirm('Are you sure you want to delete this simulation?')) {
      setPastSimulations(prev => prev.filter(sim => sim.id !== simulationId));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "cancelled":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return "Today";
    if (diffInDays === 1) return "Yesterday";
    if (diffInDays < 7) return `${diffInDays} days ago`;
    
    return date.toLocaleDateString();
  };

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

      {/* Replay Past Simulations Section */}
      {showPastSimulations && pastSimulations.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <History className="w-5 h-5 text-indigo-600" />
                <CardTitle>Replay Past Simulations</CardTitle>
                <Badge variant="secondary" className="bg-indigo-100 text-indigo-800">
                  {filteredSimulations.length} available
                </Badge>
              </div>
              <div className="flex items-center space-x-2">
                <Select value={simulationFilter} onValueChange={(value: any) => setSimulationFilter(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="recent">Recent</SelectItem>
                    <SelectItem value="favorites">Favorites</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPastSimulations(false)}
                >
                  Hide
                </Button>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Replay previous AI simulations to compare results and iterate on user flows
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSimulations.map((simulation) => (
                <Card key={simulation.id} className="hover:shadow-md transition-all duration-200 border-l-4 border-l-indigo-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium text-gray-900 text-sm">{simulation.name}</h4>
                          {simulation.isFavorite && (
                            <Star className="w-3 h-3 text-yellow-500 fill-current" />
                          )}
                        </div>
                        <Badge className={`text-xs ${getStatusColor(simulation.status)}`}>
                          {simulation.status}
                        </Badge>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <MoreHorizontal className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleToggleFavorite(simulation.id)}>
                            <Star className={`w-3 h-3 mr-2 ${simulation.isFavorite ? 'fill-current text-yellow-500' : ''}`} />
                            {simulation.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeleteSimulation(simulation.id)} className="text-red-600">
                            <Trash2 className="w-3 h-3 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    <p className="text-xs text-gray-600 mb-3 line-clamp-2">{simulation.description}</p>
                    
                    <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                      <div className="bg-blue-50 p-2 rounded">
                        <div className="font-medium text-blue-900">UX Score</div>
                        <div className="text-blue-700">{simulation.metrics.uxScore}/100</div>
                      </div>
                      <div className="bg-green-50 p-2 rounded">
                        <div className="font-medium text-green-900">Duration</div>
                        <div className="text-green-700">{formatDuration(simulation.duration)}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                      <span>{simulation.stepsCount} steps</span>
                      <span>{formatDate(simulation.createdAt)}</span>
                    </div>
                    
                    <div className="flex flex-wrap gap-1 mb-3">
                      {simulation.tags.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs px-1 py-0">
                          {tag}
                        </Badge>
                      ))}
                      {simulation.tags.length > 2 && (
                        <Badge variant="outline" className="text-xs px-1 py-0">
                          +{simulation.tags.length - 2}
                        </Badge>
                      )}
                    </div>
                    
                    <Button
                      onClick={() => handleReplaySimulation(simulation)}
                      size="sm"
                      className="w-full bg-indigo-600 hover:bg-indigo-700"
                      disabled={!simulation.videoUrl && simulation.status !== 'completed'}
                    >
                      <PlayCircle className="w-3 h-3 mr-2" />
                      {simulation.videoUrl ? 'Replay Simulation' : 'View Results'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {filteredSimulations.length === 0 && (
              <div className="text-center py-8">
                <History className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-sm font-medium text-gray-900 mb-2">
                  {simulationFilter === 'favorites' ? 'No Favorite Simulations' : 
                   simulationFilter === 'recent' ? 'No Recent Simulations' : 'No Simulations Found'}
                </h3>
                <p className="text-xs text-gray-500 mb-4">
                  {simulationFilter === 'favorites' ? 'Mark simulations as favorites to see them here' :
                   simulationFilter === 'recent' ? 'Run some simulations to see recent activity' :
                   'Try adjusting your filter or create your first simulation'}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSimulationFilter('all')}
                >
                  Show All Simulations
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Show Past Simulations Button (when hidden) */}
      {!showPastSimulations && pastSimulations.length > 0 && (
        <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <History className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-medium text-indigo-900">Past Simulations Available</h3>
                  <p className="text-sm text-indigo-700">
                    You have {pastSimulations.length} previous simulations ready to replay
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setShowPastSimulations(true)}
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                <PlayCircle className="w-4 h-4 mr-2" />
                View Simulations
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
