import React, { useState } from "react";
import {
  Award,
  TrendingUp,
  TrendingDown,
  Eye,
  Accessibility,
  Zap,
  Smartphone,
  AlertTriangle,
  CheckCircle,
  XCircle,
  BarChart3,
  Target,
  Lightbulb,
  Download,
  Share,
  Clock,
  Users,
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

interface UXDimension {
  name: string;
  score: number;
  maxScore: number;
  status: "excellent" | "good" | "needs-improvement" | "poor";
  issues: string[];
  recommendations: string[];
  icon: React.ComponentType<any>;
}

interface UXScoreResult {
  overallScore: number;
  verdict: "Smooth Experience" | "Needs Improvement" | "Critical Issues";
  testSuite: string;
  timestamp: string;
  dimensions: UXDimension[];
  criticalIssues: string[];
  aiInsights: string[];
  performanceMetrics: {
    lcp: number;
    cls: number;
    fid: number;
  };
}

export default function UXScoringResults() {
  const [selectedDimension, setSelectedDimension] = useState<string | null>(
    null
  );

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
          "Button labels could be more descriptive",
          "Form validation messages unclear",
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
          "Low color contrast on secondary buttons",
          "Missing ARIA labels",
          "No keyboard navigation support",
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
        issues: ["Minor layout shift on mobile"],
        recommendations: ["Optimize image loading sequence"],
        icon: Zap,
      },
      {
        name: "Consistency",
        score: 70,
        maxScore: 100,
        status: "needs-improvement",
        issues: [
          "Different button styles across pages",
          "Inconsistent spacing patterns",
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
        issues: ["Generic error messages in checkout"],
        recommendations: [
          "Provide specific error context",
          "Add recovery suggestions",
        ],

        icon: AlertTriangle,
      },
    ],

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

    performanceMetrics: {
      lcp: 2.1,
      cls: 0.08,
      fid: 45,
    },
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
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
          <Button variant="outline" size="sm">
            <Share className="w-4 h-4 mr-2" />
            Share Results
          </Button>
        </div>
      </div>

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
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Progress value={dimension.score} className="mb-3" />

                    <div className="space-y-2">
                      <div className="text-sm text-gray-600">
                        <strong>Issues ({dimension.issues.length}):</strong>
                      </div>
                      {dimension.issues.slice(0, 2).map((issue, index) => (
                        <p key={index} className="text-xs text-gray-500">
                          • {issue}
                        </p>
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
                        <div className="space-y-2">
                          {dimension.issues.map((issue, index) => (
                            <div
                              key={index}
                              className="flex items-start space-x-2"
                            >
                              <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />

                              <span className="text-sm text-gray-700">
                                {issue}
                              </span>
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
              {mockUXResult.criticalIssues.length} critical issues found that
              require immediate attention
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            {mockUXResult.criticalIssues.map((issue, index) => (
              <Card key={index} className="border-red-200">
                <CardContent className="pt-4">
                  <div className="flex items-start space-x-3">
                    <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />

                    <div className="flex-1">
                      <p className="text-gray-900 font-medium">{issue}</p>
                      <div className="flex items-center space-x-4 mt-2">
                        <Badge variant="destructive" className="text-xs">
                          High Priority
                        </Badge>
                        <span className="text-xs text-gray-500">
                          Impact: User Experience
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
            {mockUXResult.aiInsights.map((insight, index) => (
              <Card
                key={index}
                className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200"
              >
                <CardContent className="pt-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Lightbulb className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-gray-900 font-medium mb-2">
                        AI Insight
                      </p>
                      <p className="text-gray-700 text-sm">{insight}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
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

      {/* Action Buttons */}
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
              <Button>Save to Test Suite</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
