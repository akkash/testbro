import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Play,
  Clock,
  Target,
  Pause,
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Zap,
  ChevronDown,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { TestSuiteService } from "@/lib/services/testSuiteService";
import { ProjectService } from "@/lib/services/projectService";
import { TestTargetService } from "@/lib/services/testTargetService";

// Custom icon components for missing icons
// Custom icon components for missing icons
const PlusIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const SearchIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const MoreHorizontalIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="1"/>
    <circle cx="19" cy="12" r="1"/>
    <circle cx="5" cy="12" r="1"/>
  </svg>
);

const CalendarIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const EditIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const TrashIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const CopyIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const SettingsIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const FolderIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
  </svg>
);

const Users = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const Timer = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const TestTubeIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2z" />
  </svg>
);

const ScheduleIcon = Clock;

const DollarSign = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
  </svg>
);

const ShoppingCart = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17M17 13v4a2 2 0 01-2 2H9a2 2 0 01-2-2v-4m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
  </svg>
);

const Gauge = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12a9 9 0 1118 0M9 12l2 2 4-4" />
  </svg>
);

const Shield = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const Smartphone = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a1 1 0 001-1V4a1 1 0 00-1-1H8a1 1 0 00-1 1v16a1 1 0 001 1z" />
  </svg>
);

const Sparkles = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l1.5 1.5L5 6 3.5 4.5 5 3zm0 0L3 1m2 2l2-2m6 7l1.5 1.5L15 12l-1.5-1.5L15 9zm0 0L13 7m2 2l2-2m-7 7l1.5 1.5L12 21l-1.5-1.5L12 18zm0 0L10 16m2 2l2-2" />
  </svg>
);

const TestTube = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2z" />
  </svg>
);

const BarChart3 = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

// Test Suite Templates
const suiteTemplates = [
  {
    id: "smoke",
    name: "Smoke Test Suite",
    description: "Quick verification of critical functionality after deployment",
    icon: Zap,
    color: "bg-green-500",
    testTypes: ["login", "navigation", "core-features"],
    estimatedTime: "15 min",
    schedule: "After each deployment",
    roi: { timeSaved: 45, costSaved: 180 }
  },
  {
    id: "regression",
    name: "Regression Test Suite",
    description: "Comprehensive testing to catch breaking changes",
    icon: BarChart3,
    color: "bg-blue-500",
    testTypes: ["ui", "api", "integration", "performance"],
    estimatedTime: "2-4 hours",
    schedule: "Nightly",
    roi: { timeSaved: 480, costSaved: 1920 }
  },
  {
    id: "checkout",
    name: "Checkout Flow Suite",
    description: "End-to-end testing of purchase and payment flows",
    icon: ShoppingCart,
    color: "bg-purple-500",
    testTypes: ["cart", "payment", "confirmation", "email"],
    estimatedTime: "30 min",
    schedule: "Daily",
    roi: { timeSaved: 120, costSaved: 480 }
  },
  {
    id: "performance",
    name: "Performance Test Suite",
    description: "Load and speed testing for optimal user experience",
    icon: Gauge,
    color: "bg-orange-500",
    testTypes: ["load-time", "stress-test", "memory", "responsiveness"],
    estimatedTime: "1-2 hours",
    schedule: "Weekly",
    roi: { timeSaved: 360, costSaved: 1440 }
  },
  {
    id: "security",
    name: "Security Test Suite",
    description: "Vulnerability and compliance testing",
    icon: Shield,
    color: "bg-red-500",
    testTypes: ["auth", "permissions", "data-validation", "xss"],
    estimatedTime: "45 min",
    schedule: "Weekly",
    roi: { timeSaved: 240, costSaved: 960 }
  },
  {
    id: "mobile",
    name: "Mobile Test Suite",
    description: "Cross-device and responsive testing",
    icon: Smartphone,
    color: "bg-indigo-500",
    testTypes: ["responsive", "touch", "orientation", "performance"],
    estimatedTime: "1 hour",
    schedule: "Bi-weekly",
    roi: { timeSaved: 300, costSaved: 1200 }
  }
];

export default function TestSuiteManager() {
  const { isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [scheduleTarget, setScheduleTarget] = useState<string | null>(null);
  const [selectedSuite, setSelectedSuite] = useState<string | null>(null);
  
  // State for real data
  const [testSuites, setTestSuites] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [testTargets, setTestTargets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      setLoading(true);

      // Load all data in parallel
      const [
        { data: suitesData, error: suitesError },
        { data: projectsData, error: projectsError },
        { data: targetsData, error: targetsError }
      ] = await Promise.all([
        TestSuiteService.listTestSuites({ limit: 100 }),
        ProjectService.listProjects({ limit: 100 }),
        TestTargetService.listTestTargets({ limit: 100 })
      ]);

      if (suitesError) {
        console.warn('Failed to load test suites:', suitesError);
        setTestSuites([]);
      } else {
        setTestSuites(suitesData || []);
      }

      if (projectsError) {
        console.warn('Failed to load projects:', projectsError);
        setProjects([]);
      } else {
        setProjects(projectsData || []);
      }

      if (targetsError) {
        console.warn('Failed to load test targets:', targetsError);
        setTestTargets([]);
      } else {
        setTestTargets(targetsData || []);
      }

    } catch (err) {
      console.error('Failed to load test suite data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isAuthenticated]);

  // Filter suites based on search and filters
  const filteredSuites = testSuites.filter((suite) => {
    const matchesSearch =
      suite.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      suite.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && suite.is_active) ||
      (statusFilter === "inactive" && !suite.is_active);
    const matchesProject =
      projectFilter === "all" || suite.project_id === projectFilter;

    return matchesSearch && matchesStatus && matchesProject;
  });

  const getProjectName = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    return project?.name || "Unknown Project";
  };

  const getTestCaseCount = (testCaseIds: string[]) => {
    return testCaseIds?.length || 0;
  };

  const getTargetNames = (targetIds: string[]) => {
    return (targetIds || []).map((id) => {
      const target = testTargets.find((t) => t.id === id);
      return target?.name || "Unknown Target";
    });
  };

  // Generate mock failure summary for test suites
  const getSuiteFailureSummary = (suite: any) => {
    const totalTests = suite.test_case_ids?.length || 0;
    if (totalTests === 0) return { passed: 0, failed: 0 };

    // Mock data - in real app this would come from execution results
    const failed = Math.floor(Math.random() * Math.min(totalTests, 5)); // 0-4 failures
    const passed = totalTests - failed;

    return { passed, failed };
  };

  // Get last execution status for a suite
  const getSuiteLastExecution = (suite: any) => {
    const statuses = ["passed", "failed", "running", "pending"];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const date = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);

    return { status, date };
  };

  // Handle running suite on specific environment
  const handleRunSuiteOnEnvironment = (suiteId: string, environment: string) => {
    console.log(`Running suite ${suiteId} on ${environment} environment`);
    // TODO: Implement environment-specific execution
  };

  // Calculate ROI metrics for all suites
  const calculateROIMetrics = () => {
    const totalSuites = testSuites.length;
    const scheduledSuites = testSuites.filter(s => s.schedule?.enabled).length;
    
    // Mock ROI calculations - in real implementation, this would come from execution data
    const totalTimeSaved = totalSuites * 180; // 3 hours per suite per month
    const totalCostSaved = totalTimeSaved * 4; // $4 per hour saved
    const manualTestingCost = totalSuites * 240; // 4 hours manual testing per suite
    const automationCost = totalSuites * 60; // 1 hour automation maintenance per suite
    const roiPercentage = manualTestingCost > 0 ? ((manualTestingCost - automationCost) / automationCost) * 100 : 0;
    
    return {
      totalTimeSaved,
      totalCostSaved,
      manualTestingCost,
      automationCost,
      roiPercentage,
      scheduledSuites,
      issuesPrevented: Math.floor(totalSuites * 0.3) // Estimated issues prevented
    };
  };

  const roiMetrics = calculateROIMetrics();

  // Handle template selection
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    setIsTemplateDialogOpen(false);
    setIsCreateDialogOpen(true);
  };

  // Handle scheduling a suite
  const handleScheduleSuite = (suiteId: string) => {
    setScheduleTarget(suiteId);
    setIsScheduleDialogOpen(true);
  };

  // Handle running suite immediately
  const handleRunSuiteImmediate = async (suiteId: string) => {
    try {
      const { error } = await TestSuiteService.executeTestSuite(suiteId);
      if (error) {
        console.error('Failed to run test suite:', error);
      } else {
        console.log('Test suite execution started:', suiteId);
        loadData();
      }
    } catch (err) {
      console.error('Error running test suite:', err);
    }
  };

  const handleRunSuite = async (suiteId: string) => {
    try {
      const { error } = await TestSuiteService.executeTestSuite(suiteId);
      if (error) {
        console.error('Failed to run test suite:', error);
      } else {
        console.log('Test suite execution started:', suiteId);
        // Refresh data to show updated status
        loadData();
      }
    } catch (err) {
      console.error('Error running test suite:', err);
    }
  };

  const handleEditSuite = (suiteId: string) => {
    setSelectedSuite(suiteId);
    setIsCreateDialogOpen(true);
  };

  const handleDeleteSuite = async (suiteId: string) => {
    if (!confirm('Are you sure you want to delete this test suite?')) {
      return;
    }
    
    try {
      const { error } = await TestSuiteService.deleteTestSuite(suiteId);
      if (error) {
        console.error('Failed to delete test suite:', error);
      } else {
        console.log('Test suite deleted:', suiteId);
        // Refresh data to remove deleted suite
        loadData();
      }
    } catch (err) {
      console.error('Error deleting test suite:', err);
    }
  };

  const handleDuplicateSuite = (suiteId: string) => {
    console.log("Duplicating test suite:", suiteId);
    // Implementation for duplicating test suite
  };

  const handleToggleSchedule = (suiteId: string) => {
    console.log("Toggling schedule for suite:", suiteId);
    // Implementation for toggling schedule
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span className="text-gray-600">Loading test suites...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Error Loading Test Suites
          </h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <Button onClick={loadData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-600">Please log in to view test suites</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Test Suites</h1>
          <p className="text-gray-600">
            Organize and manage collections of test cases
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <SettingsIcon className="w-4 h-4 mr-2" />
            Bulk Actions
          </Button>
          
          {/* Template Dialog */}
          <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Sparkles className="w-4 h-4 mr-2" />
                Templates
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Choose a Test Suite Template</DialogTitle>
                <DialogDescription>
                  Select a pre-configured template to quickly create test suites for common scenarios
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                {suiteTemplates.map((template) => {
                  const Icon = template.icon;
                  return (
                    <Card 
                      key={template.id} 
                      className="cursor-pointer hover:shadow-md transition-all duration-200 border-2 hover:border-blue-300"
                      onClick={() => handleTemplateSelect(template.id)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 ${template.color} rounded-lg`}>
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-lg">{template.name}</CardTitle>
                            <p className="text-sm text-gray-600">{template.description}</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Estimated Time:</span>
                            <Badge variant="outline">{template.estimatedTime}</Badge>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Recommended Schedule:</span>
                            <Badge variant="outline">{template.schedule}</Badge>
                          </div>
                          <div className="bg-green-50 p-2 rounded-lg border border-green-200">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-green-700 font-medium">ROI Benefits:</span>
                              <div className="text-right">
                                <div className="text-green-700 font-semibold">${template.roi.costSaved}/month</div>
                                <div className="text-xs text-green-600">{template.roi.timeSaved} hours saved</div>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {template.testTypes.map((type) => (
                              <Badge key={type} variant="secondary" className="text-xs">
                                {type}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsTemplateDialogOpen(false)}>
                  Cancel
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          {/* Schedule Dialog */}
          <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Schedule Test Suite</DialogTitle>
                <DialogDescription>
                  Set up automated scheduling for test suite runs
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="schedule-frequency" className="text-right">
                    Frequency
                  </Label>
                  <Select>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Every Hour</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="custom">Custom Cron</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="schedule-time" className="text-right">
                    Time
                  </Label>
                  <Input
                    id="schedule-time"
                    type="time"
                    defaultValue="02:00"
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="schedule-environment" className="text-right">
                    Environment
                  </Label>
                  <Select>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select environment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="development">Development</SelectItem>
                      <SelectItem value="staging">Staging</SelectItem>
                      <SelectItem value="production">Production</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="schedule-notifications" className="text-right">
                    Notifications
                  </Label>
                  <div className="col-span-3 space-y-2">
                    <div className="flex items-center space-x-2">
                      <Switch id="email-notifications" />
                      <Label htmlFor="email-notifications" className="text-sm">
                        Email on failure
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="slack-notifications" />
                      <Label htmlFor="slack-notifications" className="text-sm">
                        Slack notifications
                      </Label>
                    </div>
                  </div>
                </div>
                <div className="col-span-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">
                      SMB Best Practice:
                    </span>
                  </div>
                  <p className="text-sm text-blue-800 mt-1">
                    Schedule nightly regression tests to catch issues before your team starts work. This ensures a stable product for your clients.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsScheduleDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setIsScheduleDialogOpen(false)}>
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  Schedule Suite
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button>
                <PlusIcon className="w-4 h-4 mr-2" />
                New Test Suite
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Test Suite</DialogTitle>
                <DialogDescription>
                  Create a collection of test cases that can be run together
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="suite-name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="suite-name"
                    placeholder="Enter suite name"
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="suite-description" className="text-right">
                    Description
                  </Label>
                  <Textarea
                    id="suite-description"
                    placeholder="Describe the purpose of this test suite"
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="suite-project" className="text-right">
                    Project
                  </Label>
                  <Select>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="suite-environment" className="text-right">
                    Environment
                  </Label>
                  <Select>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select environment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="development">Development</SelectItem>
                      <SelectItem value="staging">Staging</SelectItem>
                      <SelectItem value="production">Production</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="suite-schedule" className="text-right">
                    Enable Schedule
                  </Label>
                  <div className="col-span-3">
                    <Switch id="suite-schedule" />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={() => setIsCreateDialogOpen(false)}>
                  Create Suite
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ROI & Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Traditional Stats */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Suites</p>
                <p className="text-2xl font-bold text-gray-900">
                  {testSuites.length}
                </p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <FolderIcon className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Scheduled</p>
                <p className="text-2xl font-bold text-purple-600">
                  {roiMetrics.scheduledSuites}
                </p>
              </div>
              <div className="p-2 bg-purple-100 rounded-lg">
                <ScheduleIcon className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ROI-focused metrics */}
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 font-medium">Monthly Savings</p>
                <p className="text-2xl font-bold text-green-600">
                  ${roiMetrics.totalCostSaved.toLocaleString()}
                </p>
              </div>
              <div className="p-2 bg-green-200 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-700" />
              </div>
            </div>
            <div className="flex items-center mt-1">
              <TrendingUp className="w-3 h-3 text-green-600 mr-1" />
              <span className="text-xs text-green-600 font-medium">
                {roiMetrics.roiPercentage.toFixed(0)}% ROI
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 font-medium">Time Saved</p>
                <p className="text-2xl font-bold text-blue-600">
                  {roiMetrics.totalTimeSaved}h
                </p>
              </div>
              <div className="p-2 bg-blue-200 rounded-lg">
                <Timer className="w-5 h-5 text-blue-700" />
              </div>
            </div>
            <div className="flex items-center mt-1">
              <span className="text-xs text-blue-600">per month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-700 font-medium">Issues Prevented</p>
                <p className="text-2xl font-bold text-orange-600">
                  {roiMetrics.issuesPrevented}
                </p>
              </div>
              <div className="p-2 bg-orange-200 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-orange-700" />
              </div>
            </div>
            <div className="flex items-center mt-1">
              <span className="text-xs text-orange-600">this month</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ROI Justification Section */}
      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DollarSign className="w-5 h-5 text-indigo-600" />
            <span>Automation ROI Analysis</span>
            <Badge variant="outline" className="bg-white text-indigo-700 border-indigo-300">
              Client Justification Ready
            </Badge>
          </CardTitle>
          <CardDescription>
            Use these metrics to demonstrate the value of test automation to clients and stakeholders
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg border border-indigo-200">
              <h4 className="font-medium text-indigo-900 mb-2">Cost Comparison</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Manual Testing Cost:</span>
                  <span className="font-semibold text-red-600">${roiMetrics.manualTestingCost}/month</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Automation Cost:</span>
                  <span className="font-semibold text-blue-600">${roiMetrics.automationCost}/month</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-900 font-medium">Net Savings:</span>
                  <span className="font-bold text-green-600">${roiMetrics.totalCostSaved}/month</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-indigo-200">
              <h4 className="font-medium text-indigo-900 mb-2">Value Delivered</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">QA Time Freed:</span>
                  <span className="font-semibold">{roiMetrics.totalTimeSaved} hours/month</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tests Running:</span>
                  <span className="font-semibold">{testSuites.length} suites automated</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Reliability:</span>
                  <span className="font-semibold text-green-600">24/7 monitoring</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-indigo-200">
              <h4 className="font-medium text-indigo-900 mb-2">Business Impact</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Faster Releases:</span>
                  <span className="font-semibold text-green-600">2x deployment speed</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Bug Prevention:</span>
                  <span className="font-semibold">{roiMetrics.issuesPrevented} issues caught</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">ROI:</span>
                  <span className="font-bold text-green-600">{roiMetrics.roiPercentage.toFixed(0)}%</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-indigo-100 rounded-lg">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-medium text-indigo-900">
                Client Presentation Tip:
              </span>
            </div>
            <p className="text-sm text-indigo-800 mt-1">
              "In just one month, automation saved ${roiMetrics.totalCostSaved} and {roiMetrics.totalTimeSaved} QA hours, allowing your team to focus on innovation instead of repetitive testing. That's a {roiMetrics.roiPercentage.toFixed(0)}% return on investment."
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Filters and SearchIcon */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />

            <Input
              placeholder="SearchIcon test suites..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((project: any) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center border rounded-lg">
            <Button
              variant={viewMode === "cards" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("cards")}
              className="rounded-r-none"
            >
              Cards
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
              className="rounded-l-none"
            >
              Table
            </Button>
          </div>
        </div>
      </div>

      {/* Test Suites Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSuites.map((suite) => {
          const failureSummary = getSuiteFailureSummary(suite);
          const lastExecution = getSuiteLastExecution(suite);

          return (
            <Card key={suite.id} className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-indigo-500 bg-gradient-to-br from-indigo-50/30 to-white relative overflow-hidden">
              {/* Suite Type Indicator */}
              <div className="absolute top-0 right-0 bg-indigo-600 text-white px-2 py-1 rounded-bl-lg">
                <div className="flex items-center text-xs font-medium">
                  <TestTubeIcon className="w-3 h-3 mr-1" />
                  SUITE
                </div>
              </div>
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-1">
                      <div className="p-2 bg-indigo-100 rounded-lg">
                        <FolderIcon className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-semibold text-gray-900">
                          {suite.name}
                        </CardTitle>
                        <p className="text-xs text-indigo-600 font-medium">TEST SUITE</p>
                      </div>
                      {/* Last Execution Status Indicator */}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className={`w-4 h-4 rounded-full border-2 border-white shadow-sm ${
                              lastExecution.status === 'passed' ? 'bg-green-500' :
                              lastExecution.status === 'failed' ? 'bg-red-500' :
                              lastExecution.status === 'running' ? 'bg-blue-500 animate-pulse' :
                              'bg-gray-400'
                            }`} />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-medium">Last run: {lastExecution.status}</p>
                            <p className="text-xs text-gray-500">{lastExecution.date.toLocaleDateString()}</p>
                            {lastExecution.status === 'failed' && (
                              <p className="text-xs text-red-600 mt-1">⚠️ Check failure details</p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2 ml-11">
                      {suite.description}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontalIcon className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleRunSuite(suite.id)}>
                        <Play className="w-4 h-4 mr-2" />
                        Run Suite
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEditSuite(suite.id)}>
                        <EditIcon className="w-4 h-4 mr-2" />
                        EditIcon
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDuplicateSuite(suite.id)}
                      >
                        <CopyIcon className="w-4 h-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />

                      <DropdownMenuItem
                        onClick={() => handleToggleSchedule(suite.id)}
                      >
                        {suite.schedule?.enabled ? (
                          <>
                            <Pause className="w-4 h-4 mr-2" />
                            Disable Schedule
                          </>
                        ) : (
                          <>
                            <CalendarIcon className="w-4 h-4 mr-2" />
                            Enable Schedule
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />

                      <DropdownMenuItem
                        onClick={() => handleDeleteSuite(suite.id)}
                        className="text-red-600"
                      >
                        <TrashIcon className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Status and Environment */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={suite.is_active ? "default" : "secondary"}>
                      {suite.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <Badge variant="outline">{suite.environment}</Badge>
                    {suite.schedule?.enabled && (
                      <Badge
                        variant="outline"
                        className="text-purple-600 border-purple-200"
                      >
                        <CalendarIcon className="w-3 h-3 mr-1" />
                        Scheduled
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                    <Users className="w-3 h-3" />
                    <span>Team</span>
                  </div>
                </div>

                {/* Enhanced Failure Summary */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-900 flex items-center">
                      <BarChart3 className="w-4 h-4 mr-2 text-indigo-600" />
                      Recent Results
                    </h4>
                    {failureSummary.failed > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        {failureSummary.failed} Failed
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                      <div className="text-xl font-bold text-green-700">{failureSummary.passed}</div>
                      <div className="text-xs text-green-600 font-medium">Passed</div>
                      <div className="text-xs text-green-500 mt-1">
                        <TrendingUp className="w-3 h-3 inline mr-1" />
                        +5%
                      </div>
                    </div>
                    <div className="text-center p-3 bg-gradient-to-br from-red-50 to-red-100 rounded-lg border border-red-200">
                      <div className="text-xl font-bold text-red-700">{failureSummary.failed}</div>
                      <div className="text-xs text-red-600 font-medium">Failed</div>
                      <div className="text-xs text-red-500 mt-1">
                        <TrendingDown className="w-3 h-3 inline mr-1" />
                        -2%
                      </div>
                    </div>
                    <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                      <div className="text-xl font-bold text-blue-700">{getTestCaseCount(suite.test_case_ids)}</div>
                      <div className="text-xs text-blue-600 font-medium">Total</div>
                      <div className="text-xs text-blue-500 mt-1">
                        <Target className="w-3 h-3 inline mr-1" />
                        Tests
                      </div>
                    </div>
                  </div>
                  {lastExecution.status === 'failed' && (
                    <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center text-xs text-red-700">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        <span className="font-medium">Last run failed:</span>
                        <span className="ml-1">{lastExecution.date.toLocaleDateString()}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Project and Targets */}
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-600">
                    <FolderIcon className="w-4 h-4 mr-2 text-blue-500" />
                    <span className="font-medium">{getProjectName(suite.project_id)}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Target className="w-4 h-4 mr-2 text-purple-500" />
                    <span>{getTargetNames(suite.target_ids || []).join(", ")}</span>
                  </div>
                </div>

                {/* Tags */}
                {suite.tags && suite.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {suite.tags.slice(0, 3).map((tag: string) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {suite.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{suite.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Enhanced Actions */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleRunSuite(suite.id)}
                      className="bg-blue-600 hover:bg-blue-700 flex-1"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Run Suite
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleScheduleSuite(suite.id)}
                      className="px-3"
                    >
                      <CalendarIcon className="w-4 h-4" />
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditSuite(suite.id)}
                      className="px-3"
                    >
                      <EditIcon className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Environment Run Dropdown - More Prominent */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 font-medium">Run on:</span>
                    <div className="flex gap-1 flex-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRunSuiteOnEnvironment(suite.id, 'development')}
                        className="flex-1 text-xs border-blue-200 hover:bg-blue-50"
                      >
                        <Target className="w-3 h-3 mr-1 text-blue-500" />
                        Dev
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRunSuiteOnEnvironment(suite.id, 'staging')}
                        className="flex-1 text-xs border-yellow-200 hover:bg-yellow-50"
                      >
                        <Target className="w-3 h-3 mr-1 text-yellow-500" />
                        Staging
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRunSuiteOnEnvironment(suite.id, 'production')}
                        className="flex-1 text-xs border-red-200 hover:bg-red-50"
                      >
                        <Target className="w-3 h-3 mr-1 text-red-500" />
                        Prod
                      </Button>
                    </div>
                  </div>

                  {/* Drag and Drop Hint */}
                  <div className="flex items-center justify-center p-2 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 hover:border-indigo-300 transition-colors">
                    <div className="text-center">
                      <Target className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                      <p className="text-xs text-gray-500">
                        Drag test cases here to add to suite
                      </p>
                    </div>
                  </div>
                </div>

                {/* Last Updated */}
                <div className="text-xs text-gray-500 pt-2 border-t flex items-center justify-between">
                  <span>Updated {new Date(suite.updated_at).toLocaleDateString()}</span>
                  {suite.schedule?.enabled && (
                    <div className="flex items-center text-xs text-purple-600">
                      <Clock className="w-3 h-3 mr-1" />
                      <span>{suite.schedule.cron}</span>
                    </div>
                  )}
                </div>
              </CardContent>
          </Card>
          );
        })}
      </div>

      {/* Enhanced Empty State */}
      {filteredSuites.length === 0 && (
        <div className="text-center py-12">
          {searchQuery || statusFilter !== "all" || projectFilter !== "all" ? (
            // Filtered empty state
            <>
              <FolderIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No test suites found
              </h3>
              <p className="text-gray-600 mb-4">
                Try adjusting your search or filters
              </p>
            </>
          ) : (
            // True empty state with templates
            <>
              <div className="max-w-md mx-auto">
                <FolderIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No test suites found
                </h3>
                <p className="text-gray-600 mb-6">
                  Create your first test suite to get started with automated testing
                </p>
                
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button 
                    onClick={() => setIsCreateDialogOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Create Test Suite
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsTemplateDialogOpen(true)}
                    className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Use Template
                  </Button>
                </div>
              </div>
              
              {/* Quick Template Preview */}
              <div className="mt-12 max-w-4xl mx-auto">
                <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 mr-2 text-indigo-600" />
                  Popular Templates
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {suiteTemplates.slice(0, 3).map((template) => {
                    const Icon = template.icon;
                    return (
                      <Card 
                        key={template.id}
                        className="cursor-pointer hover:shadow-md transition-all duration-200 border-2 hover:border-indigo-300"
                        onClick={() => handleTemplateSelect(template.id)}
                      >
                        <CardContent className="p-4 text-center">
                          <div className={`inline-flex p-3 ${template.color} rounded-lg mb-3`}>
                            <Icon className="w-6 h-6 text-white" />
                          </div>
                          <h5 className="font-medium text-gray-900 mb-1">{template.name}</h5>
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{template.description}</p>
                          <div className="flex items-center justify-between text-xs">
                            <Badge variant="outline">{template.estimatedTime}</Badge>
                            <span className="text-green-600 font-medium">${template.roi.costSaved}/mo</span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
                <div className="mt-4">
                  <Button 
                    variant="ghost" 
                    onClick={() => setIsTemplateDialogOpen(true)}
                    className="text-indigo-600 hover:bg-indigo-50"
                  >
                    View all {suiteTemplates.length} templates
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
      </div>
    </TooltipProvider>
  );
}
