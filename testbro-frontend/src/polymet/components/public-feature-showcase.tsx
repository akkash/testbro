import React from "react";
import {
  Target,
  Brain,
  BarChart3,
  Zap,
  TestTube,
  Play,
  CheckCircle,
  Video,
  Monitor,
  Sparkles,
  Shield,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const features = [
  {
    title: "Target Website/Application Input",
    description:
      "Manage target applications with platform selection, authentication, and comprehensive target management",
    icon: Target,
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
    icon: Monitor,
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
    highlights: [
      "Live streaming of test execution",
      "HD recorded playback with full controls",
      "Individual and sequential test viewing",
      "Master recording of complete suites",
      "Integration with test results and UX insights",
    ],
  },
  {
    title: "AI Test Builder",
    description:
      "Create comprehensive test cases using natural language processing and AI-powered suggestions",
    icon: Sparkles,
    highlights: [
      "Natural language test creation",
      "AI-powered test suggestions",
      "Visual test case builder",
      "Smart test optimization",
      "Automated test maintenance",
    ],
  },
  {
    title: "Team Collaboration",
    description:
      "Collaborate with your team through role-based access, shared projects, and real-time updates",
    icon: Shield,
    highlights: [
      "Role-based permissions",
      "Shared project workspaces",
      "Real-time collaboration",
      "Team activity tracking",
      "Comment and review system",
    ],
  },
  {
    title: "Test Scheduling",
    description:
      "Schedule automated test runs with flexible timing, retry policies, and comprehensive reporting",
    icon: Clock,
    highlights: [
      "Flexible scheduling options",
      "Automated retry policies",
      "Comprehensive execution reports",
      "Integration with CI/CD pipelines",
      "Smart failure notifications",
    ],
  },
];

export default function PublicFeatureShowcase() {
  return (
    <div className="py-16 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Powerful Features for
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              {" "}
              Modern Testing
            </span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            TestBro.ai combines AI-powered testing with comprehensive analytics
            to deliver the most advanced software testing platform available.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card
                key={feature.title}
                className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-0 shadow-lg"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg text-gray-900 mb-2">
                          {feature.title}
                        </CardTitle>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-800 border-green-200">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Live
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-600">{feature.description}</p>

                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-900">
                      Key Capabilities:
                    </h4>
                    <ul className="space-y-2">
                      {feature.highlights.map((highlight, index) => (
                        <li
                          key={index}
                          className="text-sm text-gray-600 flex items-start"
                        >
                          <span className="text-blue-500 mr-3 mt-1">•</span>
                          {highlight}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 md:p-12 text-center text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Transform Your Testing?
          </h2>
          <p className="text-xl mb-8 text-blue-100 max-w-2xl mx-auto">
            Join thousands of teams already using TestBro.ai to deliver
            higher-quality software faster than ever before.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors">
              Start Free Trial
            </button>
            <button className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors">
              Schedule Demo
            </button>
          </div>
        </div>

        {/* Stats Section */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-3xl font-bold text-gray-900 mb-2">10+</div>
            <div className="text-gray-600">Core Features</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-gray-900 mb-2">99.9%</div>
            <div className="text-gray-600">Uptime</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-gray-900 mb-2">24/7</div>
            <div className="text-gray-600">Support</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-gray-900 mb-2">AI</div>
            <div className="text-gray-600">Powered</div>
          </div>
        </div>
      </div>
    </div>
  );
}
