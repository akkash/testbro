export interface TestCase {
  id: string;
  name: string;
  description: string;
  type: "e2e" | "ui" | "api" | "performance";
  status: "draft" | "active" | "archived";
  steps: TestStep[];
  expectedOutcome: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  suiteId: string;
  projectId: string; // Added project mapping
  targetIds: string[]; // Added target mapping - can run on multiple targets
  aiGenerated: boolean;
  complexity: "low" | "medium" | "high";
  estimatedDuration: number; // in minutes
}

export interface TestStep {
  id: string;
  order: number;
  action:
    | "click"
    | "type"
    | "navigate"
    | "wait"
    | "verify"
    | "upload"
    | "select";
  element: string;
  value?: string;
  description: string;
  screenshot?: string;
  aiContext?: string;
}

export interface TestSuite {
  id: string;
  name: string;
  description: string;
  testCases: string[];
  projectId: string; // Added project mapping
  targetIds: string[]; // Added target mapping - suite can target multiple applications
  environment: "staging" | "production" | "development";
  schedule?: {
    enabled: boolean;
    cron: string;
    timezone: string;
  };
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  tags: string[];
  isActive: boolean;
}

export interface TestExecution {
  id: string;
  testCaseId: string;
  suiteId: string;
  projectId: string; // Added project reference
  targetId: string; // Made target reference required
  status: "running" | "passed" | "failed" | "skipped" | "cancelled";
  startTime: string;
  endTime?: string;
  duration?: number;
  environment: string;
  browser: string;
  device: string;
  screenshots: string[];
  logs: ExecutionLog[];
  metrics: PerformanceMetrics;
  aiInsights: AIInsights;
  failureReason?: string;
  businessImpact?: "low" | "medium" | "high" | "critical";
}

export interface ExecutionLog {
  timestamp: string;
  level: "info" | "warn" | "error" | "debug";
  message: string;
  stepId?: string;
  screenshot?: string;
}

export interface PerformanceMetrics {
  responseTime: number;
  loadTime: number;
  memoryUsage: number;
  cpuUsage: number;
  networkRequests: number;
  errorRate: number;
  stabilityScore: number;
}

export interface AIInsights {
  uxQualityScore: number;
  userExperienceRating: "excellent" | "good" | "fair" | "poor";
  detectedIssues: DetectedIssue[];
  recommendations: string[];
  confidenceLevel: number;
  learningPoints: string[];
  simulationId?: string;
}

export interface DetectedIssue {
  type: "ux" | "performance" | "accessibility" | "security" | "functional";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  element?: string;
  suggestion: string;
  businessImpact: string;
}

export interface DashboardMetrics {
  totalTests: number;
  passRate: number;
  failRate: number;
  avgExecutionTime: number;
  reliabilityScore: number;
  trendsData: TrendData[];
  recentExecutions: TestExecution[];
  topIssues: DetectedIssue[];
}

export interface TrendData {
  date: string;
  passed: number;
  failed: number;
  avgDuration: number;
  uxScore: number;
}

// Mock Projects Data
export const mockProjects: Project[] = [
  {
    id: "project-001",
    name: "E-commerce Platform",
    description: "Main e-commerce website and mobile app testing",
    status: "active",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-24T16:30:00Z",
    createdBy: "john.doe@testbro.ai",
    browserAutomation: {
      masterVideoUrl: "/videos/target-001-master-recording.mp4",
      thumbnailUrl: "/thumbnails/target-001-master-thumb.jpg",
      totalDuration: 930,
      recordingStartTime: "2024-01-24T14:30:00Z",
      recordingEndTime: "2024-01-24T14:45:30Z",
    },
    teamMembers: ["user-001", "user-002", "user-003"],
    targets: ["target-001", "target-004"],
    testSuites: ["suite-001", "suite-002"],
    tags: ["e-commerce", "critical", "revenue"],
    settings: {
      defaultEnvironment: "staging",
      notifications: {
        email: true,
        slack: true,
        webhook:
          "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX",
      },
      retention: {
        testResults: 90,
        screenshots: 30,
        logs: 14,
      },
    },
  },
  {
    id: "project-002",
    name: "Banking Mobile App",
    description: "Secure mobile banking application for iOS and Android",
    status: "active",
    createdAt: "2024-01-05T00:00:00Z",
    updatedAt: "2024-01-24T15:45:00Z",
    createdBy: "jane.smith@testbro.ai",
    browserAutomation: {
      masterVideoUrl: "/videos/target-002-master-recording.mp4",
      thumbnailUrl: "/thumbnails/target-002-master-thumb.jpg",
      totalDuration: 525,
      recordingStartTime: "2024-01-24T12:00:00Z",
      recordingEndTime: "2024-01-24T12:08:45Z",
    },
    teamMembers: ["user-002", "user-003"],
    targets: ["target-002"],
    testSuites: ["suite-003"],
    tags: ["banking", "security", "mobile", "critical"],
    settings: {
      defaultEnvironment: "production",
      notifications: {
        email: true,
        slack: false,
      },
      retention: {
        testResults: 180,
        screenshots: 60,
        logs: 30,
      },
    },
  },
  {
    id: "project-003",
    name: "SaaS Dashboard",
    description: "Business intelligence dashboard and analytics platform",
    status: "active",
    createdAt: "2024-01-10T00:00:00Z",
    updatedAt: "2024-01-24T10:15:00Z",
    createdBy: "mike.johnson@testbro.ai",
    teamMembers: ["user-001", "user-003"],
    targets: ["target-003"],
    testSuites: [],
    tags: ["saas", "dashboard", "analytics"],
    settings: {
      defaultEnvironment: "staging",
      notifications: {
        email: true,
        slack: true,
      },
      retention: {
        testResults: 60,
        screenshots: 21,
        logs: 7,
      },
    },
  },
];

// Mock Data
export const mockTestCases: TestCase[] = [
  {
    id: "tc-001",
    name: "User Registration Flow",
    description:
      "Test complete user registration process with email verification",
    type: "e2e",
    status: "active",
    steps: [
      {
        id: "step-001",
        order: 1,
        action: "navigate",
        element: "/register",
        description: "Navigate to registration page",
        aiContext: "User wants to create a new account",
      },
      {
        id: "step-002",
        order: 2,
        action: "type",
        element: '[data-testid="email-input"]',
        value: "test@example.com",
        description: "Enter email address",
        aiContext: "User provides valid email for account creation",
      },
      {
        id: "step-003",
        order: 3,
        action: "type",
        element: '[data-testid="password-input"]',
        value: "SecurePass123!",
        description: "Enter secure password",
        aiContext: "User creates strong password following security guidelines",
      },
      {
        id: "step-004",
        order: 4,
        action: "click",
        element: '[data-testid="register-button"]',
        description: "Click register button",
        aiContext: "User submits registration form",
      },
      {
        id: "step-005",
        order: 5,
        action: "verify",
        element: '[data-testid="success-message"]',
        description: "Verify registration success message appears",
        aiContext: "System confirms successful account creation",
      },
    ],

    expectedOutcome: "User successfully registers and receives confirmation",
    tags: ["authentication", "user-flow", "critical"],
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-20T14:30:00Z",
    createdBy: "john.doe@testbro.ai",
    suiteId: "suite-001",
    projectId: "project-001",
    targetIds: ["target-001", "target-004"],
    aiGenerated: true,
    complexity: "medium",
    estimatedDuration: 5,
  },
  {
    id: "tc-002",
    name: "E-commerce Checkout Process",
    description: "Complete purchase flow from cart to payment confirmation",
    type: "e2e",
    status: "active",
    steps: [
      {
        id: "step-006",
        order: 1,
        action: "navigate",
        element: "/cart",
        description: "Navigate to shopping cart",
        aiContext: "User reviews items before purchase",
      },
      {
        id: "step-007",
        order: 2,
        action: "click",
        element: '[data-testid="checkout-button"]',
        description: "Proceed to checkout",
        aiContext: "User initiates purchase process",
      },
      {
        id: "step-008",
        order: 3,
        action: "type",
        element: '[data-testid="shipping-address"]',
        value: "123 Main St, City, State 12345",
        description: "Enter shipping address",
        aiContext: "User provides delivery information",
      },
      {
        id: "step-009",
        order: 4,
        action: "select",
        element: '[data-testid="payment-method"]',
        value: "credit-card",
        description: "Select payment method",
        aiContext: "User chooses preferred payment option",
      },
      {
        id: "step-010",
        order: 5,
        action: "click",
        element: '[data-testid="place-order"]',
        description: "Complete purchase",
        aiContext: "User finalizes transaction",
      },
    ],

    expectedOutcome: "Order is successfully placed and confirmation is shown",
    tags: ["e-commerce", "payment", "critical", "conversion"],
    createdAt: "2024-01-16T09:15:00Z",
    updatedAt: "2024-01-22T11:45:00Z",
    createdBy: "jane.smith@testbro.ai",
    suiteId: "suite-002",
    projectId: "project-001",
    targetIds: ["target-001"],
    aiGenerated: false,
    complexity: "high",
    estimatedDuration: 8,
  },
  {
    id: "tc-003",
    name: "File Upload Validation",
    description: "Test file upload with various file types and size validation",
    type: "ui",
    status: "active",
    steps: [
      {
        id: "step-011",
        order: 1,
        action: "navigate",
        element: "/upload",
        description: "Navigate to upload page",
        aiContext: "User needs to upload documents",
      },
      {
        id: "step-012",
        order: 2,
        action: "upload",
        element: '[data-testid="file-input"]',
        value: "test-document.pdf",
        description: "Upload valid PDF file",
        aiContext: "User selects appropriate file for upload",
      },
      {
        id: "step-013",
        order: 3,
        action: "verify",
        element: '[data-testid="upload-progress"]',
        description: "Verify upload progress indicator",
        aiContext: "System shows upload progress to user",
      },
      {
        id: "step-014",
        order: 4,
        action: "verify",
        element: '[data-testid="upload-success"]',
        description: "Verify successful upload message",
        aiContext: "System confirms successful file upload",
      },
    ],

    expectedOutcome:
      "File uploads successfully with proper validation and feedback",
    tags: ["file-upload", "validation", "ui"],
    createdAt: "2024-01-17T13:20:00Z",
    updatedAt: "2024-01-23T16:10:00Z",
    createdBy: "mike.johnson@testbro.ai",
    suiteId: "suite-001",
    projectId: "project-002",
    targetIds: ["target-002"],
    aiGenerated: true,
    complexity: "low",
    estimatedDuration: 3,
  },
];

export const mockTestSuites: TestSuite[] = [
  {
    id: "suite-001",
    name: "Core User Flows",
    description: "Essential user journeys that must work flawlessly",
    testCases: ["tc-001", "tc-003"],
    projectId: "project-001",
    targetIds: ["target-001", "target-004"],
    environment: "production",
    schedule: {
      enabled: true,
      cron: "0 2 * * *",
      timezone: "UTC",
    },
    createdAt: "2024-01-15T08:00:00Z",
    updatedAt: "2024-01-20T12:00:00Z",
    createdBy: "john.doe@testbro.ai",
    tags: ["critical", "daily"],
    isActive: true,
  },
  {
    id: "suite-002",
    name: "E-commerce Critical Path",
    description: "Revenue-generating user flows and checkout processes",
    testCases: ["tc-002"],
    projectId: "project-001",
    targetIds: ["target-001"],
    environment: "staging",
    schedule: {
      enabled: true,
      cron: "0 */6 * * *",
      timezone: "UTC",
    },
    createdAt: "2024-01-16T09:00:00Z",
    updatedAt: "2024-01-22T15:30:00Z",
    createdBy: "jane.smith@testbro.ai",
    tags: ["revenue", "conversion", "critical"],
    isActive: true,
  },
  {
    id: "suite-003",
    name: "Mobile Banking Security",
    description: "Security and compliance tests for mobile banking",
    testCases: [],
    projectId: "project-002",
    targetIds: ["target-002"],
    environment: "staging",
    createdAt: "2024-01-18T11:00:00Z",
    updatedAt: "2024-01-24T09:15:00Z",
    createdBy: "sarah.wilson@testbro.ai",
    tags: ["mobile", "responsive", "ux"],
    isActive: false,
  },
];

export const mockExecutions: TestExecution[] = [
  {
    id: "exec-001",
    testCaseId: "tc-001",
    suiteId: "suite-001",
    projectId: "project-001",
    targetId: "target-001",
    status: "passed",
    startTime: "2024-01-24T10:00:00Z",
    endTime: "2024-01-24T10:05:30Z",
    duration: 330,
    environment: "production",
    browser: "Chrome 120",
    device: "Desktop",
    screenshots: [
      "/screenshots/exec-001-step-1.png",
      "/screenshots/exec-001-step-5.png",
    ],

    logs: [
      {
        timestamp: "2024-01-24T10:00:15Z",
        level: "info",
        message: "Navigation to registration page successful",
        stepId: "step-001",
      },
      {
        timestamp: "2024-01-24T10:05:25Z",
        level: "info",
        message: "Registration completed successfully",
        stepId: "step-005",
      },
    ],

    metrics: {
      responseTime: 245,
      loadTime: 1200,
      memoryUsage: 45.2,
      cpuUsage: 12.8,
      networkRequests: 8,
      errorRate: 0,
      stabilityScore: 98.5,
    },
    aiInsights: {
      uxQualityScore: 92,
      userExperienceRating: "excellent",
      detectedIssues: [],
      recommendations: [
        "Consider adding loading indicators for better user feedback",
        "Email validation could be more responsive",
      ],

      confidenceLevel: 95,
      learningPoints: [
        "User successfully completed registration without confusion",
        "Form validation messages were clear and helpful",
      ],
    },
  },
  {
    id: "exec-002",
    testCaseId: "tc-002",
    suiteId: "suite-002",
    projectId: "project-001",
    targetId: "target-001",
    status: "failed",
    startTime: "2024-01-24T14:30:00Z",
    endTime: "2024-01-24T14:35:45Z",
    duration: 345,
    environment: "staging",
    browser: "Firefox 121",
    device: "Desktop",
    screenshots: ["/screenshots/exec-002-failure.png"],
    logs: [
      {
        timestamp: "2024-01-24T14:35:40Z",
        level: "error",
        message: "Payment processing failed - timeout error",
        stepId: "step-010",
      },
    ],

    metrics: {
      responseTime: 8500,
      loadTime: 3200,
      memoryUsage: 78.9,
      cpuUsage: 45.2,
      networkRequests: 15,
      errorRate: 6.7,
      stabilityScore: 65.2,
    },
    aiInsights: {
      uxQualityScore: 45,
      userExperienceRating: "poor",
      detectedIssues: [
        {
          type: "performance",
          severity: "high",
          description: "Payment processing timeout causing user frustration",
          element: '[data-testid="place-order"]',
          suggestion: "Implement timeout handling and retry mechanism",
          businessImpact:
            "High - potential revenue loss from abandoned checkouts",
        },
        {
          type: "ux",
          severity: "medium",
          description: "No loading indicator during payment processing",
          element: '[data-testid="payment-form"]',
          suggestion: "Add loading spinner and progress feedback",
          businessImpact: "Medium - user confusion during checkout process",
        },
      ],

      recommendations: [
        "Implement robust error handling for payment failures",
        "Add user-friendly timeout messages",
        "Consider payment retry mechanisms",
      ],

      confidenceLevel: 88,
      learningPoints: [
        "Payment gateway integration needs improvement",
        "User experience degrades significantly during payment failures",
      ],
    },
    failureReason: "Payment gateway timeout",
    businessImpact: "high",
  },
];

export const mockDashboardMetrics: DashboardMetrics = {
  totalTests: 156,
  passRate: 87.2,
  failRate: 12.8,
  avgExecutionTime: 4.5,
  reliabilityScore: 94.3,
  trendsData: [
    {
      date: "2024-01-18",
      passed: 45,
      failed: 8,
      avgDuration: 4.2,
      uxScore: 89,
    },
    {
      date: "2024-01-19",
      passed: 52,
      failed: 6,
      avgDuration: 4.1,
      uxScore: 91,
    },
    {
      date: "2024-01-20",
      passed: 48,
      failed: 9,
      avgDuration: 4.8,
      uxScore: 87,
    },
    {
      date: "2024-01-21",
      passed: 55,
      failed: 5,
      avgDuration: 3.9,
      uxScore: 93,
    },
    {
      date: "2024-01-22",
      passed: 49,
      failed: 7,
      avgDuration: 4.3,
      uxScore: 90,
    },
    {
      date: "2024-01-23",
      passed: 58,
      failed: 4,
      avgDuration: 4.0,
      uxScore: 94,
    },
    {
      date: "2024-01-24",
      passed: 51,
      failed: 8,
      avgDuration: 4.6,
      uxScore: 88,
    },
  ],

  recentExecutions: mockExecutions,
  topIssues: [
    {
      type: "performance",
      severity: "high",
      description: "Payment processing timeouts",
      suggestion: "Optimize payment gateway integration",
      businessImpact: "Revenue loss from abandoned checkouts",
    },
    {
      type: "ux",
      severity: "medium",
      description: "Missing loading indicators",
      suggestion: "Add progress feedback for long operations",
      businessImpact: "User confusion and potential abandonment",
    },
    {
      type: "accessibility",
      severity: "medium",
      description: "Form labels missing for screen readers",
      suggestion: "Add proper ARIA labels and descriptions",
      businessImpact: "Compliance issues and reduced accessibility",
    },
  ],
};

export const mockIntegrations = [
  {
    id: "github-001",
    name: "GitHub Actions",
    type: "ci-cd",
    status: "connected",
    repository: "testbro-ai/main-app",
    webhook: "https://api.testbro.ai/webhooks/github/abc123",
    triggers: ["push", "pull_request"],
    lastSync: "2024-01-24T15:30:00Z",
  },
  {
    id: "slack-001",
    name: "Engineering Team Slack",
    type: "notification",
    status: "connected",
    channel: "#testing-alerts",
    webhook:
      "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX",
    events: ["test_failure", "suite_completion"],
    lastNotification: "2024-01-24T14:35:50Z",
  },
];

export const mockTeamMembers = [
  {
    id: "user-001",
    name: "John Doe",
    email: "john.doe@testbro.ai",
    role: "admin",
    avatar: "https://github.com/yusufhilmi.png",
    lastActive: "2024-01-24T16:00:00Z",
    testsCreated: 23,
    testsExecuted: 156,
  },
  {
    id: "user-002",
    name: "Jane Smith",
    email: "jane.smith@testbro.ai",
    role: "tester",
    avatar: "https://github.com/kdrnp.png",
    lastActive: "2024-01-24T15:45:00Z",
    testsCreated: 18,
    testsExecuted: 89,
  },
  {
    id: "user-003",
    name: "Mike Johnson",
    email: "mike.johnson@testbro.ai",
    role: "developer",
    avatar: "https://github.com/yahyabedirhan.png",
    lastActive: "2024-01-24T14:20:00Z",
    testsCreated: 12,
    testsExecuted: 45,
  },
];

// UX Simulation Data
export interface UXSimulationResult {
  id: string;
  testCaseId: string;
  suiteId: string;
  overallScore: number;
  verdict: "Smooth Experience" | "Needs Improvement" | "Critical Issues";
  timestamp: string;
  dimensions: {
    clarity: number;
    accessibility: number;
    performance: number;
    consistency: number;
    errorHandling: number;
  };
  criticalIssues: string[];
  aiInsights: string[];
  simulationMetrics: {
    pageLoadTime: number;
    rageClicks: number;
    scrollDepth: number;
    keyboardNavigation: number;
    errorEncounters: number;
    taskCompletionTime: number;
  };
  performanceMetrics: {
    lcp: number;
    cls: number;
    fid: number;
  };
}

export const mockUXSimulations: UXSimulationResult[] = [
  {
    id: "ux-sim-001",
    testCaseId: "tc-001",
    suiteId: "suite-001",
    overallScore: 92,
    verdict: "Smooth Experience",
    timestamp: "2024-01-24T10:05:30Z",
    dimensions: {
      clarity: 95,
      accessibility: 88,
      performance: 94,
      consistency: 90,
      errorHandling: 93,
    },
    criticalIssues: [],
    aiInsights: [
      "Registration flow is intuitive and user-friendly",
      "Form validation provides clear feedback",
      "Loading states are well-implemented",
    ],

    simulationMetrics: {
      pageLoadTime: 1200,
      rageClicks: 0,
      scrollDepth: 85,
      keyboardNavigation: 12,
      errorEncounters: 0,
      taskCompletionTime: 18500,
    },
    performanceMetrics: {
      lcp: 1.8,
      cls: 0.05,
      fid: 35,
    },
  },
  {
    id: "ux-sim-002",
    testCaseId: "tc-002",
    suiteId: "suite-002",
    overallScore: 78,
    verdict: "Needs Improvement",
    timestamp: "2024-01-24T14:35:45Z",
    dimensions: {
      clarity: 85,
      accessibility: 65,
      performance: 92,
      consistency: 70,
      errorHandling: 88,
    },
    criticalIssues: [
      "Login button too small on mobile devices (< 44px touch target)",
      "Payment form lacks proper error recovery flow",
      "Search functionality has 3+ second response time",
    ],

    aiInsights: [
      "Users spend 40% more time on pages with accessibility issues",
      "Mobile conversion drops by 23% due to small touch targets",
      "Error recovery improvements could increase task completion by 15%",
      "Performance optimizations would improve user satisfaction by 12%",
    ],

    simulationMetrics: {
      pageLoadTime: 2100,
      rageClicks: 2,
      scrollDepth: 45,
      keyboardNavigation: 8,
      errorEncounters: 1,
      taskCompletionTime: 35300,
    },
    performanceMetrics: {
      lcp: 2.1,
      cls: 0.08,
      fid: 45,
    },
  },
];

export const mockUXTrends = [
  { date: "Jan 1", score: 72 },
  { date: "Jan 8", score: 75 },
  { date: "Jan 15", score: 78 },
  { date: "Jan 22", score: 76 },
  { date: "Jan 29", score: 78 },
];

// Project Management Data
export interface Project {
  id: string;
  name: string;
  description: string;
  status: "active" | "inactive" | "archived";
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  teamMembers: string[]; // User IDs
  targets: string[]; // Target IDs associated with this project
  testSuites: string[]; // Test Suite IDs
  tags: string[];
  settings: {
    defaultEnvironment: "staging" | "production" | "development";
    notifications: {
      email: boolean;
      slack: boolean;
      webhook?: string;
    };
    retention: {
      testResults: number; // days
      screenshots: number; // days
      logs: number; // days
    };
  };
}

// Target Applications Data
export interface TestTarget {
  id: string;
  name: string;
  url: string;
  platform: "web" | "mobile-web" | "mobile-app";
  description?: string;
  status: "active" | "inactive" | "maintenance";
  projectId: string; // Added project mapping
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  tags: string[];
  lastRunDate?: string;
  lastRunStatus?: "passed" | "failed" | "running" | "cancelled";
  avgUxScore?: number;
  totalRuns: number;
  passRate: number;
  appFile?: {
    name: string;
    size: number;
    type: "apk" | "ipa";
    uploadedAt: string;
  };
  environment: "production" | "staging" | "development";
  authentication?: {
    required: boolean;
    type?: "basic" | "oauth" | "api-key";
    credentials?: Record<string, string>;
  };
}

export interface TargetExecution {
  id: string;
  targetId: string;
  testCaseIds: string[];
  suiteId?: string;
  status: "running" | "completed" | "failed" | "cancelled";
  startTime: string;
  endTime?: string;
  duration?: number;
  results: TargetExecutionResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  uxScore?: number;
  screenshots: string[];
  logs: ExecutionLog[];
  createdBy: string;
  browserAutomation?: {
    masterVideoUrl?: string; // Combined video of entire execution
    liveStreamUrl?: string; // Live stream URL when running
    thumbnailUrl?: string;
    totalDuration: number;
    recordingStartTime: string;
    recordingEndTime?: string;
  };
}

export interface TargetExecutionResult {
  testCaseId: string;
  status: "passed" | "failed" | "skipped";
  duration: number;
  screenshots: string[];
  logs: ExecutionLog[];
  errorMessage?: string;
  uxInsights?: {
    score: number;
    issues: string[];
    recommendations: string[];
  };
  browserAutomation?: {
    videoUrl?: string; // URL to recorded video
    liveStreamUrl?: string; // URL for live streaming (when running)
    thumbnailUrl?: string; // Preview thumbnail
    duration: number; // Video duration in seconds
    recordingStartTime: string;
    recordingEndTime?: string;
    playbackControls: {
      canPlay: boolean;
      canPause: boolean;
      canSeek: boolean;
      availableSpeeds: number[]; // e.g., [0.5, 1, 1.5, 2]
    };
  };
}

// Mock Target Applications
export const mockTestTargets: TestTarget[] = [
  {
    id: "target-001",
    name: "E-commerce Production",
    url: "https://shop.example.com",
    platform: "web",
    description: "Main production e-commerce website",
    status: "active",
    projectId: "project-001",
    createdAt: "2024-01-10T09:00:00Z",
    updatedAt: "2024-01-24T16:30:00Z",
    createdBy: "john.doe@testbro.ai",
    tags: ["production", "e-commerce", "critical"],
    lastRunDate: "2024-01-24T14:30:00Z",
    lastRunStatus: "passed",
    avgUxScore: 87,
    totalRuns: 45,
    passRate: 89.2,
    environment: "production",
    authentication: {
      required: false,
    },
  },
  {
    id: "target-002",
    name: "Mobile Banking App",
    url: "https://mobile.bank.example.com",
    platform: "mobile-web",
    description: "Mobile banking application for iOS and Android",
    status: "active",
    projectId: "project-002",
    createdAt: "2024-01-12T11:15:00Z",
    updatedAt: "2024-01-24T15:45:00Z",
    createdBy: "jane.smith@testbro.ai",
    tags: ["mobile", "banking", "security", "critical"],
    lastRunDate: "2024-01-24T12:00:00Z",
    lastRunStatus: "failed",
    avgUxScore: 92,
    totalRuns: 32,
    passRate: 94.1,
    environment: "production",
    authentication: {
      required: true,
      type: "oauth",
      credentials: {
        clientId: "banking-app-client",
        scope: "read write",
      },
    },
  },
  {
    id: "target-003",
    name: "SaaS Dashboard Staging",
    url: "https://staging-dashboard.saas.example.com",
    platform: "web",
    description: "Staging environment for SaaS dashboard application",
    status: "active",
    projectId: "project-003",
    createdAt: "2024-01-15T14:20:00Z",
    updatedAt: "2024-01-24T10:15:00Z",
    createdBy: "mike.johnson@testbro.ai",
    tags: ["staging", "saas", "dashboard"],
    lastRunDate: "2024-01-23T18:30:00Z",
    lastRunStatus: "passed",
    avgUxScore: 85,
    totalRuns: 28,
    passRate: 85.7,
    environment: "staging",
    authentication: {
      required: true,
      type: "basic",
      credentials: {
        username: "test-user",
        password: "staging-pass",
      },
    },
  },
  {
    id: "target-004",
    name: "E-commerce Mobile App",
    url: "com.example.ecommerce",
    platform: "mobile-app",
    description: "Native mobile app for e-commerce platform",
    status: "active",
    projectId: "project-001",
    createdAt: "2024-01-18T16:00:00Z",
    updatedAt: "2024-01-24T09:30:00Z",
    createdBy: "sarah.wilson@testbro.ai",
    tags: ["ios", "native", "mobile"],
    lastRunDate: "2024-01-24T08:00:00Z",
    lastRunStatus: "running",
    avgUxScore: 90,
    totalRuns: 15,
    passRate: 93.3,
    environment: "development",
    appFile: {
      name: "TestApp_v2.1.0.ipa",
      size: 45600000, // 45.6 MB
      type: "ipa",
      uploadedAt: "2024-01-24T09:30:00Z",
    },
  },
];

// Mock Target Executions
export const mockTargetExecutions: TargetExecution[] = [
  {
    id: "target-exec-001",
    targetId: "target-001",
    testCaseIds: ["tc-001", "tc-002"],
    suiteId: "suite-001",
    status: "completed",
    startTime: "2024-01-24T14:30:00Z",
    endTime: "2024-01-24T14:45:30Z",
    duration: 930, // 15.5 minutes
    results: [
      {
        testCaseId: "tc-001",
        status: "passed",
        duration: 330,
        screenshots: ["/screenshots/target-001-tc-001-1.png"],
        logs: [
          {
            timestamp: "2024-01-24T14:32:00Z",
            level: "info",
            message: "User registration completed successfully",
          },
        ],

        uxInsights: {
          score: 92,
          issues: [],
          recommendations: ["Consider adding progress indicators"],
        },
        browserAutomation: {
          videoUrl: "/videos/target-001-tc-001-recording.mp4",
          thumbnailUrl: "/thumbnails/target-001-tc-001-thumb.jpg",
          duration: 330,
          recordingStartTime: "2024-01-24T14:30:15Z",
          recordingEndTime: "2024-01-24T14:35:45Z",
          playbackControls: {
            canPlay: true,
            canPause: true,
            canSeek: true,
            availableSpeeds: [0.5, 1, 1.5, 2],
          },
        },
      },
      {
        testCaseId: "tc-002",
        status: "passed",
        duration: 480,
        screenshots: ["/screenshots/target-001-tc-002-1.png"],
        logs: [
          {
            timestamp: "2024-01-24T14:40:00Z",
            level: "info",
            message: "Checkout process completed successfully",
          },
        ],

        uxInsights: {
          score: 88,
          issues: ["Payment form could be more intuitive"],
          recommendations: [
            "Simplify payment flow",
            "Add payment method icons",
          ],
        },
        browserAutomation: {
          videoUrl: "/videos/target-001-tc-002-recording.mp4",
          thumbnailUrl: "/thumbnails/target-001-tc-002-thumb.jpg",
          duration: 480,
          recordingStartTime: "2024-01-24T14:35:50Z",
          recordingEndTime: "2024-01-24T14:43:50Z",
          playbackControls: {
            canPlay: true,
            canPause: true,
            canSeek: true,
            availableSpeeds: [0.5, 1, 1.5, 2],
          },
        },
      },
    ],

    summary: {
      total: 2,
      passed: 2,
      failed: 0,
      skipped: 0,
    },
    uxScore: 90,
    screenshots: [
      "/screenshots/target-001-overview.png",
      "/screenshots/target-001-summary.png",
    ],

    logs: [
      {
        timestamp: "2024-01-24T14:30:00Z",
        level: "info",
        message: "Starting test execution on target: E-commerce Production",
      },
      {
        timestamp: "2024-01-24T14:45:30Z",
        level: "info",
        message: "Test execution completed successfully",
      },
    ],

    createdBy: "john.doe@testbro.ai",
  },
  {
    id: "target-exec-002",
    targetId: "target-002",
    testCaseIds: ["tc-003"],
    status: "failed",
    startTime: "2024-01-24T12:00:00Z",
    endTime: "2024-01-24T12:08:45Z",
    duration: 525, // 8.75 minutes
    results: [
      {
        testCaseId: "tc-003",
        status: "failed",
        duration: 180,
        screenshots: ["/screenshots/target-002-tc-003-error.png"],
        logs: [
          {
            timestamp: "2024-01-24T12:03:00Z",
            level: "error",
            message: "File upload failed: Network timeout",
          },
        ],

        errorMessage: "Network timeout during file upload",
        uxInsights: {
          score: 45,
          issues: ["No timeout handling", "Poor error messaging"],
          recommendations: [
            "Implement retry mechanism",
            "Add better error messages",
            "Show upload progress",
          ],
        },
        browserAutomation: {
          videoUrl: "/videos/target-002-tc-003-recording.mp4",
          thumbnailUrl: "/thumbnails/target-002-tc-003-thumb.jpg",
          duration: 180,
          recordingStartTime: "2024-01-24T12:00:15Z",
          recordingEndTime: "2024-01-24T12:03:15Z",
          playbackControls: {
            canPlay: true,
            canPause: true,
            canSeek: true,
            availableSpeeds: [0.5, 1, 1.5, 2],
          },
        },
      },
    ],

    summary: {
      total: 1,
      passed: 0,
      failed: 1,
      skipped: 0,
    },
    uxScore: 45,
    screenshots: ["/screenshots/target-002-error-overview.png"],
    logs: [
      {
        timestamp: "2024-01-24T12:00:00Z",
        level: "info",
        message: "Starting test execution on target: Mobile Banking App",
      },
      {
        timestamp: "2024-01-24T12:08:45Z",
        level: "error",
        message: "Test execution failed due to network issues",
      },
    ],

    createdBy: "jane.smith@testbro.ai",
  },
];
