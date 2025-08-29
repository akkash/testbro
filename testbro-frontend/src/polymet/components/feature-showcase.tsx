import React from "react";
import { Link } from "react-router-dom";
import {
  Target,
  Brain,
  BarChart3,
  Zap,
  TestTube,
  Play,
  CheckCircle,
  ArrowRight,
  Video,
  Monitor,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const features = [
  {
    title: "Target Website/Application Input",
    description:
      "Manage target applications with platform selection, authentication, and comprehensive target management",
    icon: Target,
    route: "/test-targets",
    status: "implemented",
    highlights: [
      "Web, Mobile-Web, and Mobile-App support",
      "Authentication configuration",
      "Environment management (prod/staging/dev)",
      "File upload for mobile apps",
      "Target performance tracking",
    ],
  },
  {
    title: "Test Execution Runner",
    description:
      "Run selected test cases on target applications with real-time progress tracking and live logs",
    icon: Play,
    route: "/test-execution/target-001",
    status: "implemented",
    highlights: [
      "Real-time execution monitoring",
      "Live progress tracking",
      "Step-by-step execution logs",
      "Screenshot capture",
      "Performance metrics collection",
    ],
  },
  {
    title: "AI User Simulation",
    description:
      "AI-powered user simulations with realistic user behavior patterns and UX scoring",
    icon: Brain,
    route: "/ai-simulation",
    status: "implemented",
    highlights: [
      "Realistic typing speeds and hesitation",
      "Rage click detection",
      "Scroll behavior analysis",
      "Keyboard navigation tracking",
      "Error encounter monitoring",
    ],
  },
  {
    title: "UX Quality Scoring",
    description:
      "Comprehensive UX analysis with detailed breakdowns, trends, and actionable insights",
    icon: BarChart3,
    route: "/ux-results",
    status: "implemented",
    highlights: [
      "Multi-dimensional UX scoring",
      "Clarity, Accessibility, Performance analysis",
      "Critical issue identification",
      "AI-powered recommendations",
      "Business impact assessment",
    ],
  },
  {
    title: "Enhanced Dashboard",
    description:
      "Target-based metrics, UX trends, and comprehensive analytics with AI insights",
    icon: BarChart3,
    route: "/dashboard",
    status: "implemented",
    highlights: [
      "Target performance overview",
      "UX score trending charts",
      "AI insights and recommendations",
      "Real-time metrics",
      "Quick action buttons",
    ],
  },
  {
    title: "Test Results Viewer",
    description:
      "Detailed test execution results with UX insights, trends, and comprehensive analysis",
    icon: TestTube,
    route: "/test-results/target-001",
    status: "implemented",
    highlights: [
      "Execution result analysis",
      "UX insights integration",
      "Screenshot galleries",
      "Performance metrics",
      "AI recommendations",
    ],
  },
  {
    title: "Browser Automation Playback",
    description:
      "Watch your tests execute in real-time with live streaming and HD recorded playback of browser automation",
    icon: Video,
    route: "/test-results/target-001",
    status: "new",
    highlights: [
      "Live streaming of test execution",
      "HD recorded playback with full controls",
      "Individual and sequential test viewing",
      "Master recording of complete suites",
      "Integration with test results and UX insights",
    ],
  },
];

export default function FeatureShowcase() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          TestBro.ai Feature Showcase
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          All the latest features have been implemented and are ready to use.
          Click on any feature below to explore its functionality.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <Card
              key={feature.title}
              className="hover:shadow-lg transition-shadow"
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Icon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{feature.title}</CardTitle>
                    </div>
                  </div>
                  <Badge
                    variant="secondary"
                    className={
                      feature.status === "new"
                        ? "bg-purple-100 text-purple-800"
                        : "bg-green-100 text-green-800"
                    }
                  >
                    <CheckCircle className="w-3 h-3 mr-1" />

                    {feature.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600 text-sm">{feature.description}</p>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-900">
                    Key Features:
                  </h4>
                  <ul className="space-y-1">
                    {feature.highlights.map((highlight, index) => (
                      <li
                        key={index}
                        className="text-xs text-gray-600 flex items-start"
                      >
                        <span className="text-blue-500 mr-2">•</span>
                        {highlight}
                      </li>
                    ))}
                  </ul>
                </div>

                <Button asChild className="w-full" size="sm">
                  <Link to={feature.route}>
                    Explore Feature
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              All Features Are Live! 🎉
            </h2>
            <p className="text-gray-600 mb-4">
              Every feature from the previous iterations has been successfully
              implemented and integrated. You can now use the complete
              TestBro.ai platform with AI-powered testing capabilities.
            </p>
            <div className="flex justify-center space-x-3">
              <Button asChild>
                <Link to="/dashboard">Go to Dashboard</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/test-targets">Start Testing</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
