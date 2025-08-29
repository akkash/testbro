import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  Play,
  BarChart3,
  Zap,
  Eye,
  Shield,
  ArrowRight,
  CheckCircle,
  Clock,
  Users,
  Target,
  Sparkles,
} from "lucide-react";

export default function HomepageFeatures() {
  const [activeFeature, setActiveFeature] = useState(0);

  const features = [
    {
      id: "ai-generation",
      icon: Brain,
      title: "AI Test Generation",
      subtitle: "From Idea to Test in Seconds",
      description:
        "Describe your app in plain English, and our AI creates comprehensive test suites. No coding required - just tell us what you want to test.",
      benefits: [
        "Natural language test creation",
        "Intelligent edge case detection",
        "Cross-browser compatibility tests",
        "Automatic test maintenance",
      ],

      demoContent: (
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-xl">
          <div className="bg-white rounded-lg p-4 mb-4 border border-gray-200">
            <div className="flex items-center space-x-2 mb-3">
              <Brain className="w-5 h-5 text-blue-600" />

              <span className="font-medium text-gray-900">AI Test Builder</span>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                Active
              </Badge>
            </div>
            <div className="text-sm text-gray-600 mb-3">
              "Test the checkout flow for an e-commerce site with multiple
              payment methods"
            </div>
            <div className="space-y-2">
              <div className="flex items-center text-xs text-gray-500">
                <CheckCircle className="w-3 h-3 text-green-500 mr-2" />
                Generated 12 test scenarios
              </div>
              <div className="flex items-center text-xs text-gray-500">
                <CheckCircle className="w-3 h-3 text-green-500 mr-2" />
                Added edge cases for payment failures
              </div>
              <div className="flex items-center text-xs text-gray-500">
                <Clock className="w-3 h-3 text-yellow-500 mr-2" />
                Creating mobile variants...
              </div>
            </div>
          </div>
          <div className="text-xs text-gray-500 text-center">
            ⚡ Generated in 15 seconds
          </div>
        </div>
      ),
    },
    {
      id: "live-execution",
      icon: Play,
      title: "Live Test Execution",
      subtitle: "Watch Your Tests Run in Real-Time",
      description:
        "See exactly what your AI agent is doing with live browser automation. Debug issues instantly with step-by-step execution logs.",
      benefits: [
        "Real-time browser automation",
        "Live video streaming",
        "Interactive debugging",
        "Parallel test execution",
      ],

      demoContent: (
        <div className="bg-gradient-to-br from-green-50 to-blue-50 p-6 rounded-xl">
          <div className="bg-white rounded-lg p-4 mb-4 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="font-medium text-gray-900">
                  Live Execution
                </span>
              </div>
              <Badge
                variant="secondary"
                className="bg-green-100 text-green-800"
              >
                Running
              </Badge>
            </div>
            <div className="bg-gray-100 rounded-md p-3 mb-3">
              <div className="text-xs text-gray-600 mb-2">Current Step:</div>
              <div className="text-sm font-medium text-gray-900">
                Filling payment form with test data
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-blue-50 rounded p-2">
                <div className="text-sm font-bold text-blue-600">5/12</div>
                <div className="text-xs text-gray-500">Tests</div>
              </div>
              <div className="bg-green-50 rounded p-2">
                <div className="text-sm font-bold text-green-600">4</div>
                <div className="text-xs text-gray-500">Passed</div>
              </div>
              <div className="bg-yellow-50 rounded p-2">
                <div className="text-sm font-bold text-yellow-600">1</div>
                <div className="text-xs text-gray-500">Running</div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "ux-analysis",
      icon: Eye,
      title: "UX Quality Analysis",
      subtitle: "AI-Powered User Experience Insights",
      description:
        "Get detailed UX quality scores and actionable recommendations. Our AI analyzes user flows like a real user would.",
      benefits: [
        "Automated UX scoring",
        "Accessibility compliance checks",
        "Performance impact analysis",
        "Conversion optimization tips",
      ],

      demoContent: (
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-xl">
          <div className="bg-white rounded-lg p-4 mb-4 border border-gray-200">
            <div className="flex items-center space-x-2 mb-3">
              <Eye className="w-5 h-5 text-purple-600" />

              <span className="font-medium text-gray-900">UX Analysis</span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Overall UX Score</span>
                <div className="flex items-center space-x-2">
                  <div className="text-2xl font-bold text-green-600">87</div>
                  <div className="text-sm text-gray-500">/100</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Accessibility</span>
                  <span className="font-medium text-green-600">92/100</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Performance</span>
                  <span className="font-medium text-yellow-600">78/100</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Usability</span>
                  <span className="font-medium text-green-600">91/100</span>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
            <div className="text-xs font-medium text-yellow-800 mb-1">
              💡 AI Recommendation
            </div>
            <div className="text-xs text-yellow-700">
              Optimize image loading to improve page speed by 23%
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "analytics",
      icon: BarChart3,
      title: "Advanced Analytics",
      subtitle: "Data-Driven Testing Insights",
      description:
        "Track trends, identify patterns, and make informed decisions with comprehensive testing analytics and AI-powered insights.",
      benefits: [
        "Test performance trends",
        "Bug pattern analysis",
        "Team productivity metrics",
        "ROI tracking and reporting",
      ],

      demoContent: (
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-6 rounded-xl">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center space-x-2 mb-4">
              <BarChart3 className="w-5 h-5 text-indigo-600" />

              <span className="font-medium text-gray-900">
                Testing Analytics
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center">
                <div className="text-lg font-bold text-indigo-600">98.5%</div>
                <div className="text-xs text-gray-500">Pass Rate</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">2.3s</div>
                <div className="text-xs text-gray-500">Avg Speed</div>
              </div>
            </div>
            <div className="h-16 bg-gradient-to-r from-indigo-100 to-blue-100 rounded-md flex items-end justify-between p-2">
              {[40, 65, 45, 80, 95, 70, 85].map((height, i) => (
                <div
                  key={i}
                  className="bg-indigo-500 rounded-sm w-3"
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
            <div className="text-xs text-gray-500 text-center mt-2">
              Test execution trends (7 days)
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <Badge
            variant="secondary"
            className="bg-blue-100 text-blue-800 border-blue-200 mb-4"
          >
            <Sparkles className="w-3 h-3 mr-1" />
            Powered by AI
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Everything You Need for Modern Testing
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            From AI-powered test generation to real-time execution monitoring,
            TestBro.ai provides a complete testing solution that scales with
            your team.
          </p>
        </div>

        {/* Feature Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <button
                key={feature.id}
                onClick={() => setActiveFeature(index)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-all ${
                  activeFeature === index
                    ? "bg-blue-50 border-blue-200 text-blue-700"
                    : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                <Icon className="w-4 h-4" />

                <span className="font-medium">{feature.title}</span>
              </button>
            );
          })}
        </div>

        {/* Active Feature Display */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Content */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                {React.createElement(features[activeFeature].icon, {
                  className: "w-8 h-8 text-blue-600",
                })}
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {features[activeFeature].title}
                  </h3>
                  <p className="text-blue-600 font-medium">
                    {features[activeFeature].subtitle}
                  </p>
                </div>
              </div>

              <p className="text-lg text-gray-600 leading-relaxed">
                {features[activeFeature].description}
              </p>
            </div>

            {/* Benefits List */}
            <div className="space-y-3">
              {features[activeFeature].benefits.map((benefit, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />

                  <span className="text-gray-700">{benefit}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="pt-4">
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
                Try This Feature
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>

          {/* Right Column - Demo */}
          <div className="relative">
            <div className="bg-gray-100 rounded-2xl p-8 border border-gray-200">
              {features[activeFeature].demoContent}
            </div>

            {/* Floating Badge */}
            <div className="absolute -top-3 -right-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-3 py-1 rounded-full text-xs font-medium">
              Live Demo
            </div>
          </div>
        </div>

        {/* Bottom Stats */}
        <div className="mt-20 bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-8 border border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-900 mb-1">10x</div>
              <div className="text-sm text-gray-600">Faster Testing</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 mb-1">99.9%</div>
              <div className="text-sm text-gray-600">Bug Detection</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 mb-1">70%</div>
              <div className="text-sm text-gray-600">Cost Reduction</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 mb-1">5min</div>
              <div className="text-sm text-gray-600">Setup Time</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
