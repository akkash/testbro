import React, { useState } from "react";
import {
  TrendingUp,
  Zap,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Target,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";

// Custom icon components for missing icons
const Award = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
  </svg>
);

const Eye = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const Accessibility = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const Smartphone = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a1 1 0 001-1V4a1 1 0 00-1-1H8a1 1 0 00-1 1v16a1 1 0 001 1z" />
  </svg>
);

const BarChart3 = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const Lightbulb = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

const Download = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const Share = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
  </svg>
);

const Users = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

// Custom icon components for missing icons
const DollarSign = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
  </svg>
);

const FileOutput = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const Code = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
  </svg>
);

const GitBranch = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);

const Wand2 = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.929 4.929l1.414 1.414M7.05 11.293l1.414-1.414m2.829-2.828l1.414 1.414M15 9l6 6-6 6-6-6 6-6zM9 3l1 1-1 1-1-1 1-1z" />
  </svg>
);

const ExternalLink = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

const TrendingDown = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
  </svg>
);

interface UXDimension {
  name: string;
  score: number;
  maxScore: number;
  status: "excellent" | "good" | "needs-improvement" | "poor";
  issues: UXIssue[];
  recommendations: string[];
  icon: React.ComponentType<any>;
}

interface UXIssue {
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  businessImpact: {
    metric: string;
    estimate: string;
    reasoning: string;
  };
  quickFix?: {
    available: boolean;
    description: string;
    codeChange?: string;
    effort: "low" | "medium" | "high";
  };
}

interface CriticalIssue {
  description: string;
  priority: "high" | "critical";
  businessImpact: {
    conversionLoss?: string;
    revenueImpact?: string;
    userExperience: string;
  };
  quickFix?: {
    available: boolean;
    description: string;
    autoFixPossible: boolean;
  };
}

interface AIInsight {
  category: string;
  insight: string;
  businessImpact: string;
  priority: "low" | "medium" | "high" | "critical";
}

interface UXScoreResult {
  overallScore: number;
  verdict: "Smooth Experience" | "Needs Improvement" | "Critical Issues";
  testSuite: string;
  timestamp: string;
  dimensions: UXDimension[];
  criticalIssues: CriticalIssue[];
  aiInsights: AIInsight[];
  performanceMetrics: {
    lcp: number;
    cls: number;
    fid: number;
  };
  businessMetrics: {
    estimatedConversionImpact: number;
    potentialRevenueLoss: string;
    userSatisfactionScore: number;
  };
}

export default function UXScoringResults() {
  const [selectedDimension, setSelectedDimension] = useState<string | null>(null);
  const [showQuickFixes, setShowQuickFixes] = useState(false);

  const mockUXResult: UXScoreResult = {
    overallScore: 78,
    verdict: "Needs Improvement",
    testSuite: "E-commerce Checkout Flow",
    timestamp: "2024-01-15 14:30:22",
    dimensions: [
      {
        name: "Clarity",
        score: 85,
        maxScore: 100,
        status: "good",
        issues: [
          {
            description: "Button labels could be more descriptive",
            severity: "medium",
            businessImpact: {
              metric: "Task completion rate",
              estimate: "8% decrease",
              reasoning: "Unclear button labels increase user hesitation and abandonment"
            },
            quickFix: {
              available: true,
              description: "Update button text to action-oriented language",
              codeChange: "Change 'Submit' to 'Complete Purchase'",
              effort: "low"
            }
          },
          {
            description: "Form validation messages unclear",
            severity: "high",
            businessImpact: {
              metric: "Form abandonment rate",
              estimate: "15% increase",
              reasoning: "Users abandon forms when error messages don't clearly explain the issue"
            },
            quickFix: {
              available: true,
              description: "Implement specific, actionable error messages",
              codeChange: "Replace generic messages with field-specific guidance",
              effort: "medium"
            }
          }
        ],
        recommendations: [
          "Use action-oriented button text",
          "Provide specific error guidance",
        ],
        icon: Eye,
      },
      {
        name: "Accessibility",
        score: 65,
        maxScore: 100,
        status: "needs-improvement",
        issues: [
          {
            description: "Low color contrast on secondary buttons",
            severity: "critical",
            businessImpact: {
              metric: "Conversion rate",
              estimate: "12% reduction",
              reasoning: "Poor contrast affects 8% of users and reduces engagement for all users"
            },
            quickFix: {
              available: true,
              description: "Automatically adjust button colors to meet WCAG contrast ratios",
              codeChange: "Update CSS color values to #2563eb for better contrast",
              effort: "low"
            }
          },
          {
            description: "Missing ARIA labels",
            severity: "high",
            businessImpact: {
              metric: "Screen reader usability",
              estimate: "100% failure for assistive tech users",
              reasoning: "Screen readers cannot interpret unlabeled elements"
            },
            quickFix: {
              available: true,
              description: "Add ARIA labels to all interactive elements",
              codeChange: "aria-label='Complete your purchase'",
              effort: "medium"
            }
          },
          {
            description: "No keyboard navigation support",
            severity: "high",
            businessImpact: {
              metric: "Keyboard user completion rate",
              estimate: "45% reduction",
              reasoning: "Keyboard-only users cannot navigate efficiently through checkout"
            },
            quickFix: {
              available: false,
              description: "Requires comprehensive keyboard navigation implementation",
              effort: "high"
            }
          }
        ],
        recommendations: [
          "Increase contrast ratio to 4.5:1",
          "Add proper ARIA attributes",
          "Implement keyboard shortcuts",
        ],
        icon: Accessibility,
      },
      {
        name: "Performance",
        score: 92,
        maxScore: 100,
        status: "excellent",
        issues: [
          {
            description: "Minor layout shift on mobile",
            severity: "low",
            businessImpact: {
              metric: "Core Web Vitals score",
              estimate: "5% reduction",
              reasoning: "Layout shifts create jarring user experience and affect SEO rankings"
            },
            quickFix: {
              available: true,
              description: "Reserve space for dynamic content to prevent shifts",
              codeChange: "Add min-height: 200px to image containers",
              effort: "low"
            }
          }
        ],
        recommendations: ["Optimize image loading sequence"],
        icon: Zap,
      },
      {
        name: "Consistency",
        score: 70,
        maxScore: 100,
        status: "needs-improvement",
        issues: [
          {
            description: "Different button styles across pages",
            severity: "medium",
            businessImpact: {
              metric: "User confidence",
              estimate: "18% decrease in trust",
              reasoning: "Inconsistent design patterns reduce user confidence and perceived professionalism"
            },
            quickFix: {
              available: true,
              description: "Apply consistent button styling from design system",
              codeChange: "Replace custom styles with btn-primary class",
              effort: "low"
            }
          },
          {
            description: "Inconsistent spacing patterns",
            severity: "low",
            businessImpact: {
              metric: "Visual hierarchy clarity",
              estimate: "10% reduction in scanability",
              reasoning: "Inconsistent spacing makes it harder for users to understand page structure"
            },
            quickFix: {
              available: true,
              description: "Apply standardized margin/padding classes",
              codeChange: "Use spacing utilities: mb-4, mt-6, px-8",
              effort: "medium"
            }
          }
        ],
        recommendations: [
          "Establish design system",
          "Standardize component library",
        ],
        icon: Target,
      },
      {
        name: "Error Handling",
        score: 88,
        maxScore: 100,
        status: "good",
        issues: [
          {
            description: "Generic error messages in checkout",
            severity: "medium",
            businessImpact: {
              metric: "Error recovery rate",
              estimate: "25% lower recovery",
              reasoning: "Generic errors don't help users understand or fix the problem"
            },
            quickFix: {
              available: true,
              description: "Implement contextual error messages with recovery suggestions",
              codeChange: "Add specific error types with actionable guidance",
              effort: "medium"
            }
          }
        ],
        recommendations: [
          "Provide specific error context",
          "Add recovery suggestions",
        ],
        icon: AlertTriangle,
      },
    ],

    criticalIssues: [
      {
        description: "Login button too small on mobile devices (< 44px touch target)",
        priority: "critical",
        businessImpact: {
          conversionLoss: "23%",
          revenueImpact: "$45,000/month",
          userExperience: "High frustration on mobile checkout"
        },
        quickFix: {
          available: true,
          description: "Increase button size to meet touch target guidelines",
          autoFixPossible: true
        }
      },
      {
        description: "Payment form lacks proper error recovery flow",
        priority: "high",
        businessImpact: {
          conversionLoss: "18%",
          revenueImpact: "$32,000/month",
          userExperience: "Payment failures lead to cart abandonment"
        },
        quickFix: {
          available: true,
          description: "Add retry mechanism and clearer error states",
          autoFixPossible: false
        }
      },
      {
        description: "Search functionality has 3+ second response time",
        priority: "high",
        businessImpact: {
          conversionLoss: "15%",
          revenueImpact: "$28,000/month",
          userExperience: "Users abandon search due to slow response"
        },
        quickFix: {
          available: false,
          description: "Requires backend optimization and caching implementation",
          autoFixPossible: false
        }
      }
    ],

    aiInsights: [
      {
        category: "Accessibility Impact",
        insight: "Users spend 40% more time on pages with accessibility issues",
        businessImpact: "Low accessibility may reduce conversion by 12%",
        priority: "high"
      },
      {
        category: "Mobile Experience",
        insight: "Mobile conversion drops by 23% due to small touch targets",
        businessImpact: "Mobile users represent 68% of traffic - fixing touch targets could increase mobile revenue by $45,000/month",
        priority: "critical"
      },
      {
        category: "Error Recovery",
        insight: "Error recovery improvements could increase task completion by 15%",
        businessImpact: "Better error handling could recover 15% of failed transactions, worth ~$32,000/month",
        priority: "high"
      },
      {
        category: "Performance Optimization",
        insight: "Performance optimizations would improve user satisfaction by 12%",
        businessImpact: "Faster load times correlate with 7% higher conversion rates in e-commerce",
        priority: "medium"
      },
    ],

    performanceMetrics: {
      lcp: 2.1,
      cls: 0.08,
      fid: 45,
    },

    businessMetrics: {
      estimatedConversionImpact: -18.5,
      potentialRevenueLoss: "$105,000/month",
      userSatisfactionScore: 6.8
    }
  };

  const trendData = [
    { date: "Jan 1", score: 72 },
    { date: "Jan 8", score: 75 },
    { date: "Jan 15", score: 78 },
    { date: "Jan 22", score: 76 },
    { date: "Jan 29", score: 78 },
  ];

  const dimensionData = mockUXResult.dimensions.map((dim) => ({
    name: dim.name,
    score: dim.score,
    fill:
      dim.status === "excellent"
        ? "#10b981"
        : dim.status === "good"
          ? "#3b82f6"
          : dim.status === "needs-improvement"
            ? "#f59e0b"
            : "#ef4444",
  }));

  // Client report export functionality
  const generateClientReport = () => {
    const reportData = {
      executiveSummary: {
        overallScore: mockUXResult.overallScore,
        verdict: mockUXResult.verdict,
        businessImpact: mockUXResult.businessMetrics,
        keyFindings: mockUXResult.criticalIssues.slice(0, 3)
      },
      detailedAnalysis: mockUXResult.dimensions,
      actionItems: mockUXResult.criticalIssues,
      recommendations: mockUXResult.aiInsights,
      roi: {
        estimatedImprovementValue: "$105,000/month",
        implementationCost: "$15,000 (one-time)",
        paybackPeriod: "1.4 months"
      }
    };

    // In a real application, this would generate a PDF or formatted report
    const reportBlob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(reportBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ux-analysis-report-${mockUXResult.testSuite.replace(/\s+/g, '-')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Quick fix implementation
  const implementQuickFix = async (issueDescription: string, quickFix: any) => {
    console.log(`Implementing quick fix for: ${issueDescription}`);
    
    // Simulate API call to apply code changes
    if (quickFix.autoFixPossible) {
      // Auto-apply fix through code repository integration
      alert(`Auto-fix applied: ${quickFix.description}`);
    } else {
      // Create pull request or task
      alert(`Task created for: ${quickFix.description}`);
    }
  };

  // Business impact calculation
  const calculateBusinessImpact = (issues: UXIssue[]) => {
    const criticalIssues = issues.filter(issue => issue.severity === 'critical').length;
    const highIssues = issues.filter(issue => issue.severity === 'high').length;
    
    const impactScore = (criticalIssues * 25) + (highIssues * 15);
    return Math.min(impactScore, 100);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 75) return "text-blue-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBg = (score: number) => {
    if (score >= 90) return "bg-green-50 border-green-200";
    if (score >= 75) return "bg-blue-50 border-blue-200";
    if (score >= 60) return "bg-yellow-50 border-yellow-200";
    return "bg-red-50 border-red-200";
  };

  const getVerdictIcon = (verdict: string) => {
    switch (verdict) {
      case "Smooth Experience":
        return <CheckCircle className="w-6 h-6 text-green-600" />;

      case "Critical Issues":
        return <XCircle className="w-6 h-6 text-red-600" />;

      default:
        return <AlertTriangle className="w-6 h-6 text-yellow-600" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">UX Quality Score</h1>
          <p className="text-gray-600 mt-2">
            Comprehensive user experience analysis and recommendations
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" size="sm" onClick={() => setShowQuickFixes(!showQuickFixes)}>
            <Wand2 className="w-4 h-4 mr-2" />
            {showQuickFixes ? 'Hide' : 'Show'} Quick Fixes
          </Button>
          <Button variant="outline" size="sm" onClick={generateClientReport}>
            <FileOutput className="w-4 h-4 mr-2" />
            Export Client Report
          </Button>
          <Button variant="outline" size="sm">
            <Share className="w-4 h-4 mr-2" />
            Share Results
          </Button>
        </div>
      </div>

      {/* Business Impact Summary */}
      <Card className="bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <TrendingDown className="w-5 h-5 text-red-600" />
                <span className="text-sm font-medium text-red-700">Conversion Impact</span>
              </div>
              <div className="text-3xl font-bold text-red-600">{mockUXResult.businessMetrics.estimatedConversionImpact}%</div>
              <p className="text-xs text-red-600 mt-1">Estimated reduction in conversions</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <DollarSign className="w-5 h-5 text-orange-600" />
                <span className="text-sm font-medium text-orange-700">Revenue at Risk</span>
              </div>
              <div className="text-3xl font-bold text-orange-600">{mockUXResult.businessMetrics.potentialRevenueLoss}</div>
              <p className="text-xs text-orange-600 mt-1">Potential monthly loss</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Users className="w-5 h-5 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-700">User Satisfaction</span>
              </div>
              <div className="text-3xl font-bold text-yellow-600">{mockUXResult.businessMetrics.userSatisfactionScore}/10</div>
              <p className="text-xs text-yellow-600 mt-1">Below industry average (7.8)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overall Score Card */}
      <Card className={`${getScoreBg(mockUXResult.overallScore)} border-2`}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {getVerdictIcon(mockUXResult.verdict)}
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {mockUXResult.verdict}
                </h2>
                <p className="text-gray-600">
                  Test Suite: {mockUXResult.testSuite}
                </p>
                <p className="text-sm text-gray-500">
                  <Clock className="w-4 h-4 inline mr-1" />

                  {mockUXResult.timestamp}
                </p>
              </div>
            </div>
            <div className="text-center">
              <div
                className={`text-6xl font-bold ${getScoreColor(mockUXResult.overallScore)}`}
              >
                {mockUXResult.overallScore}
              </div>
              <div className="text-lg text-gray-600">/ 100</div>
              <Badge variant="secondary" className="mt-2">
                <Award className="w-4 h-4 mr-1" />
                UX Score
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5" />

              <span>Score Breakdown</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer className="aspect-[none] h-80" config={{}}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dimensionData}>
                  <ChartTooltip />

                  <XAxis dataKey="name" />

                  <YAxis domain={[0, 100]} />

                  <Bar dataKey="score" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Score Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5" />

              <span>Score Trend</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer className="aspect-[none] h-80" config={{}}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <ChartTooltip />

                  <CartesianGrid strokeDasharray="3 3" />

                  <XAxis dataKey="date" />

                  <YAxis domain={[60, 85]} />

                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={3}
                    dot={{ fill: "hsl(var(--chart-1))", strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis */}
      <Tabs defaultValue="dimensions" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dimensions">Dimensions</TabsTrigger>
          <TabsTrigger value="issues">Critical Issues</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="dimensions" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockUXResult.dimensions.map((dimension) => {
              const Icon = dimension.icon;
              const businessImpact = calculateBusinessImpact(dimension.issues);
              return (
                <Card
                  key={dimension.name}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedDimension === dimension.name
                      ? "ring-2 ring-blue-500"
                      : ""
                  }`}
                  onClick={() =>
                    setSelectedDimension(
                      selectedDimension === dimension.name
                        ? null
                        : dimension.name
                    )
                  }
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Icon className="w-5 h-5" />
                        <span className="text-lg">{dimension.name}</span>
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        <Badge
                          variant={
                            dimension.status === "excellent"
                              ? "default"
                              : dimension.status === "good"
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {dimension.score}
                        </Badge>
                        {businessImpact > 0 && (
                          <Badge variant="outline" className="text-xs bg-red-50 text-red-600 border-red-200">
                            <DollarSign className="w-3 h-3 mr-1" />
                            -{businessImpact}%
                          </Badge>
                        )}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Progress value={dimension.score} className="mb-3" />
                    <div className="space-y-2">
                      <div className="text-sm text-gray-600">
                        <strong>Issues ({dimension.issues.length}):</strong>
                      </div>
                      {dimension.issues.slice(0, 2).map((issue, index) => (
                        <div key={index} className="text-xs text-gray-500">
                          <p>• {issue.description}</p>
                          {showQuickFixes && issue.quickFix?.available && (
                            <div className="ml-4 mt-1 p-2 bg-blue-50 rounded border border-blue-200">
                              <div className="flex items-center justify-between">
                                <span className="text-blue-700 font-medium text-xs">
                                  Quick Fix Available
                                </span>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="h-6 px-2 text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    implementQuickFix(issue.description, issue.quickFix);
                                  }}
                                >
                                  <Code className="w-3 h-3 mr-1" />
                                  Apply
                                </Button>
                              </div>
                              <p className="text-xs text-blue-600 mt-1">{issue.quickFix.description}</p>
                            </div>
                          )}
                        </div>
                      ))}
                      {dimension.issues.length > 2 && (
                        <p className="text-xs text-blue-600">
                          +{dimension.issues.length - 2} more issues
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {selectedDimension && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>{selectedDimension} - Detailed Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const dimension = mockUXResult.dimensions.find(
                    (d) => d.name === selectedDimension
                  );
                  if (!dimension) return null;

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold text-red-800 mb-3">
                          Issues Found
                        </h4>
                        <div className="space-y-3">
                          {dimension.issues.map((issue, index) => (
                            <div key={index} className="border rounded-lg p-3 bg-red-50 border-red-200">
                              <div className="flex items-start space-x-2 mb-2">
                                <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                                <span className="text-sm text-gray-700 font-medium">
                                  {issue.description}
                                </span>
                              </div>
                              <div className="ml-6 space-y-2">
                                <div className="flex items-center space-x-2">
                                  <Badge variant={issue.severity === 'critical' ? 'destructive' : issue.severity === 'high' ? 'destructive' : 'secondary'} className="text-xs">
                                    {issue.severity} priority
                                  </Badge>
                                  <div className="flex items-center space-x-1 text-xs text-orange-600">
                                    <DollarSign className="w-3 h-3" />
                                    <span>{issue.businessImpact.estimate} impact on {issue.businessImpact.metric}</span>
                                  </div>
                                </div>
                                <p className="text-xs text-gray-600">{issue.businessImpact.reasoning}</p>
                                {issue.quickFix?.available && (
                                  <div className="bg-blue-50 border border-blue-200 rounded p-2">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-xs font-medium text-blue-700">Quick Fix Available</span>
                                      <Button 
                                        size="sm" 
                                        variant="outline" 
                                        className="h-6 px-2 text-xs"
                                        onClick={() => implementQuickFix(issue.description, issue.quickFix)}
                                      >
                                        <Code className="w-3 h-3 mr-1" />
                                        Implement
                                      </Button>
                                    </div>
                                    <p className="text-xs text-blue-600">{issue.quickFix.description}</p>
                                    {issue.quickFix.codeChange && (
                                      <div className="mt-1 p-1 bg-gray-100 rounded text-xs font-mono text-gray-700">
                                        {issue.quickFix.codeChange}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-green-800 mb-3">
                          Recommendations
                        </h4>
                        <div className="space-y-2">
                          {dimension.recommendations.map((rec, index) => (
                            <div
                              key={index}
                              className="flex items-start space-x-2"
                            >
                              <Lightbulb className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />

                              <span className="text-sm text-gray-700">
                                {rec}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="issues" className="space-y-4">
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {mockUXResult.criticalIssues.length} critical issues found that require immediate attention.
              <strong className="ml-2">Estimated revenue impact: {mockUXResult.businessMetrics.potentialRevenueLoss}</strong>
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            {mockUXResult.criticalIssues.map((issue, index) => (
              <Card key={index} className="border-red-200">
                <CardContent className="pt-4">
                  <div className="flex items-start space-x-3">
                    <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-gray-900 font-medium mb-3">{issue.description}</p>
                      
                      {/* Business Impact Section */}
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-3">
                        <h5 className="font-semibold text-orange-800 mb-2 flex items-center">
                          <DollarSign className="w-4 h-4 mr-2" />
                          Business Impact Analysis
                        </h5>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                          {issue.businessImpact.conversionLoss && (
                            <div>
                              <span className="text-orange-700 font-medium">Conversion Loss:</span>
                              <div className="text-orange-600 font-bold">{issue.businessImpact.conversionLoss}</div>
                            </div>
                          )}
                          {issue.businessImpact.revenueImpact && (
                            <div>
                              <span className="text-orange-700 font-medium">Revenue Impact:</span>
                              <div className="text-orange-600 font-bold">{issue.businessImpact.revenueImpact}</div>
                            </div>
                          )}
                          <div>
                            <span className="text-orange-700 font-medium">User Experience:</span>
                            <div className="text-orange-600">{issue.businessImpact.userExperience}</div>
                          </div>
                        </div>
                      </div>

                      {/* Quick Fix Section */}
                      {issue.quickFix?.available ? (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-semibold text-blue-800 flex items-center">
                              <Wand2 className="w-4 h-4 mr-2" />
                              AI Quick Fix Available
                            </h5>
                            <Button 
                              size="sm" 
                              className="bg-blue-600 hover:bg-blue-700"
                              onClick={() => implementQuickFix(issue.description, issue.quickFix)}
                            >
                              {issue.quickFix.autoFixPossible ? (
                                <>
                                  <GitBranch className="w-4 h-4 mr-2" />
                                  Auto-Apply Fix
                                </>
                              ) : (
                                <>
                                  <ExternalLink className="w-4 h-4 mr-2" />
                                  Create Task
                                </>
                              )}
                            </Button>
                          </div>
                          <p className="text-sm text-blue-700 mb-2">{issue.quickFix.description}</p>
                          {issue.quickFix.autoFixPossible && (
                            <div className="text-xs text-blue-600 bg-blue-100 rounded p-2">
                              ✓ This fix can be automatically applied to your codebase
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <h5 className="font-semibold text-gray-700 flex items-center mb-2">
                            <AlertTriangle className="w-4 h-4 mr-2" />
                            Manual Fix Required
                          </h5>
                          <p className="text-sm text-gray-600">This issue requires manual investigation and custom implementation.</p>
                        </div>
                      )}

                      <div className="flex items-center space-x-4 mt-3">
                        <Badge variant="destructive" className="text-xs">
                          {issue.priority} Priority
                        </Badge>
                        <span className="text-xs text-gray-500">
                          Impact Category: Revenue & User Experience
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mockUXResult.aiInsights.map((insight, index) => {
              const priorityColor = insight.priority === 'critical' ? 'red' : insight.priority === 'high' ? 'orange' : insight.priority === 'medium' ? 'yellow' : 'blue';
              return (
                <Card
                  key={index}
                  className={`bg-gradient-to-br from-${priorityColor}-50 to-purple-50 border-${priorityColor}-200`}
                >
                  <CardContent className="pt-4">
                    <div className="flex items-start space-x-3">
                      <div className={`w-8 h-8 bg-${priorityColor}-100 rounded-full flex items-center justify-center flex-shrink-0`}>
                        <Lightbulb className={`w-4 h-4 text-${priorityColor}-600`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-gray-900 font-medium">
                            {insight.category}
                          </p>
                          <Badge 
                            variant={insight.priority === 'critical' ? 'destructive' : 'secondary'}
                            className="text-xs"
                          >
                            {insight.priority} priority
                          </Badge>
                        </div>
                        <p className="text-gray-700 text-sm mb-3">{insight.insight}</p>
                        
                        {/* Business Impact */}
                        <div className={`bg-${priorityColor}-100 border border-${priorityColor}-300 rounded-lg p-3`}>
                          <div className="flex items-start space-x-2">
                            <DollarSign className={`w-4 h-4 text-${priorityColor}-600 mt-0.5 flex-shrink-0`} />
                            <div>
                              <p className={`text-${priorityColor}-800 font-medium text-sm mb-1`}>Business Impact:</p>
                              <p className={`text-${priorityColor}-700 text-xs`}>{insight.businessImpact}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Largest Contentful Paint
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {mockUXResult.performanceMetrics.lcp}s
                </div>
                <p className="text-xs text-gray-500 mt-1">Good (&lt; 2.5s)</p>
                <Progress value={75} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Cumulative Layout Shift
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {mockUXResult.performanceMetrics.cls}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Needs Improvement (&lt; 0.1)
                </p>
                <Progress value={60} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  First Input Delay
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {mockUXResult.performanceMetrics.fid}ms
                </div>
                <p className="text-xs text-gray-500 mt-1">Good (&lt; 100ms)</p>
                <Progress value={85} className="mt-2" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Enhanced Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Next Steps
                </h3>
                <p className="text-gray-600">
                  Save results and create improvement tasks
                </p>
              </div>
              <div className="flex space-x-3">
                <Button variant="outline">
                  <Users className="w-4 h-4 mr-2" />
                  Assign to Team
                </Button>
                <Button>
                  <Download className="w-4 h-4 mr-2" />
                  Save to Project
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-green-900">
                  ROI Opportunity
                </h3>
                <p className="text-green-700 text-sm">
                  Implementing quick fixes could recover <strong>{mockUXResult.businessMetrics.potentialRevenueLoss}</strong> in lost revenue
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Estimated implementation cost: $15,000 • Payback period: 1.4 months
                </p>
              </div>
              <div className="flex space-x-2">
                <Button size="sm" variant="outline" className="bg-white">
                  <FileOutput className="w-4 h-4 mr-2" />
                  ROI Report
                </Button>
                <Button size="sm" className="bg-green-600 hover:bg-green-700">
                  <Wand2 className="w-4 h-4 mr-2" />
                  Start Fixes
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
