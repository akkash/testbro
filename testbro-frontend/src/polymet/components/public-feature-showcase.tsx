import React, { useState, useEffect } from "react";
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
  Cpu,
  Rocket,
  Eye,
  Users,
  TrendingUp,
  ArrowRight,
  X,
  Play as PlayIcon,
  Pause as PauseIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Organized feature categories
const featureCategories = [
  {
    id: "ai-powered",
    title: "AI-Powered Testing",
    subtitle: "Intelligent automation that thinks like a human",
    description: "Our advanced AI transforms how you approach software testing",
    color: "blue",
    gradient: "from-blue-500 to-cyan-500",
    features: [
      {
        title: "AI Test Builder",
        description: "Create comprehensive test cases using natural language processing and AI-powered suggestions",
        icon: Sparkles,
        beforeAfter: {
          before: "Manual test writing takes hours of repetitive work",
          after: "AI generates complete test suites in minutes from plain English"
        },
        highlights: [
          "Natural language test creation",
          "AI-powered test suggestions",
          "Visual test case builder",
          "Smart test optimization",
          "Automated test maintenance",
        ],
        visual: "ai-builder-demo.gif"
      },
      {
        title: "AI User Simulation",
        description: "AI-powered user simulations with realistic user behavior patterns and UX scoring",
        icon: Brain,
        beforeAfter: {
          before: "Basic scripted tests miss real user behaviors",
          after: "AI simulates realistic user patterns, rage clicks, and hesitation"
        },
        highlights: [
          "Realistic typing speeds and hesitation",
          "Rage click detection",
          "Scroll behavior analysis",
          "Keyboard navigation tracking",
          "Error encounter monitoring",
        ],
        visual: "user-simulation-demo.gif"
      },
      {
        title: "UX Quality Scoring",
        description: "Comprehensive UX analysis with detailed breakdowns, trends, and actionable insights",
        icon: BarChart3,
        beforeAfter: {
          before: "Manual UX reviews take days with subjective results",
          after: "AI provides instant, objective UX scores with specific recommendations"
        },
        highlights: [
          "Multi-dimensional UX scoring",
          "Clarity, Accessibility, Performance analysis",
          "Critical issue identification",
          "AI-powered recommendations",
          "Business impact assessment",
        ],
        visual: "ux-scoring-demo.gif"
      }
    ]
  },
  {
    id: "automation",
    title: "Automation & Execution",
    subtitle: "Seamless test execution at scale",
    description: "Execute tests reliably across any environment with enterprise-grade automation",
    color: "green",
    gradient: "from-green-500 to-emerald-500",
    features: [
      {
        title: "Browser Automation Playback",
        description: "Watch your tests execute in real-time with live streaming and HD recorded playback",
        icon: Video,
        beforeAfter: {
          before: "Debugging failed tests requires manual reproduction",
          after: "Watch exactly what happened with HD recordings and live streaming"
        },
        highlights: [
          "Live streaming of test execution",
          "HD recorded playback with full controls",
          "Individual and sequential test viewing",
          "Master recording of complete suites",
          "Integration with test results and UX insights",
        ],
        visual: "browser-automation-demo.gif"
      },
      {
        title: "Test Execution Runner",
        description: "Run selected test cases on target applications with real-time progress tracking",
        icon: Rocket,
        beforeAfter: {
          before: "Test execution is slow and error-prone",
          after: "Lightning-fast execution with real-time monitoring and smart retries"
        },
        highlights: [
          "Real-time execution monitoring",
          "Live progress tracking",
          "Step-by-step execution logs",
          "Screenshot capture",
          "Performance metrics collection",
        ],
        visual: "test-execution-demo.gif"
      },
      {
        title: "Test Scheduling",
        description: "Schedule automated test runs with flexible timing, retry policies, and comprehensive reporting",
        icon: Clock,
        beforeAfter: {
          before: "Manual test scheduling leads to missed issues",
          after: "Automated scheduling ensures continuous quality monitoring"
        },
        highlights: [
          "Flexible scheduling options",
          "Automated retry policies",
          "Comprehensive execution reports",
          "Integration with CI/CD pipelines",
          "Smart failure notifications",
        ],
        visual: "scheduling-demo.gif"
      }
    ]
  },
  {
    id: "insights",
    title: "Insights & Collaboration",
    subtitle: "Data-driven decisions and team productivity",
    description: "Transform test data into actionable insights while boosting team collaboration",
    color: "purple",
    gradient: "from-purple-500 to-pink-500",
    features: [
      {
        title: "Enhanced Dashboard",
        description: "Target-based metrics, UX trends, and comprehensive analytics with AI insights",
        icon: Monitor,
        beforeAfter: {
          before: "Scattered metrics across multiple tools",
          after: "Unified dashboard with AI-powered insights and trend analysis"
        },
        highlights: [
          "Target performance overview",
          "UX score trending charts",
          "AI insights and recommendations",
          "Real-time metrics",
          "Quick action buttons",
        ],
        visual: "dashboard-demo.gif"
      },
      {
        title: "Team Collaboration",
        description: "Collaborate with your team through role-based access, shared projects, and real-time updates",
        icon: Users,
        beforeAfter: {
          before: "Testing teams work in silos with poor visibility",
          after: "Real-time collaboration with shared insights and role-based access"
        },
        highlights: [
          "Role-based permissions",
          "Shared project workspaces",
          "Real-time collaboration",
          "Team activity tracking",
          "Comment and review system",
        ],
        visual: "collaboration-demo.gif"
      },
      {
        title: "Advanced Analytics",
        description: "Deep insights into test performance, trends, and quality metrics over time",
        icon: TrendingUp,
        beforeAfter: {
          before: "Basic pass/fail metrics with no context",
          after: "Comprehensive analytics with trend analysis and predictive insights"
        },
        highlights: [
          "Historical trend analysis",
          "Performance benchmarking",
          "Predictive quality insights",
          "Custom reporting dashboards",
          "Executive summary reports",
        ],
        visual: "analytics-demo.gif"
      }
    ]
  }
];

export default function PublicFeatureShowcase() {
  const [activeCategory, setActiveCategory] = useState("ai-powered");
  const [playingDemo, setPlayingDemo] = useState<string | null>(null);

  const activeCategoryData = featureCategories.find(cat => cat.id === activeCategory);

  // Handle demo playback
  const toggleDemo = (demoId: string) => {
    setPlayingDemo(playingDemo === demoId ? null : demoId);
  };

  return (
    <div className="py-16 px-6 bg-gradient-to-br from-gray-50 to-blue-50/30">
      <div className="max-w-7xl mx-auto">
        {/* Enhanced Header */}
        <div className="text-center mb-20">
          <Badge
            className="bg-green-100 text-green-800 border-green-200 mb-6 text-sm px-4 py-2"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            All Features Live & Ready
          </Badge>

          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Powerful Features for
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 block">
              Modern Testing
            </span>
          </h1>

          <p className="text-xl text-gray-600 max-w-4xl mx-auto mb-8 leading-relaxed">
            TestBro.ai combines AI-powered testing with comprehensive analytics
            to deliver the most advanced software testing platform available.
            From intelligent test creation to real-time collaboration.
          </p>

          {/* Dual CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Start Free Trial (Teams & Devs)
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-2 border-purple-600 text-purple-600 hover:bg-purple-600 hover:text-white px-8 py-4 text-lg font-semibold transition-all duration-300"
            >
              Book a Demo (Enterprise)
              <Sparkles className="w-5 h-5 ml-2" />
            </Button>
          </div>

          {/* Trust Signals */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="flex flex-col items-center">
              <div className="text-3xl font-bold text-gray-900 mb-2">9+</div>
              <div className="text-gray-600 text-sm">Core Features</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-3xl font-bold text-gray-900 mb-2">99.9%</div>
              <div className="text-gray-600 text-sm">Uptime SLA</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-3xl font-bold text-gray-900 mb-2">24/7</div>
              <div className="text-gray-600 text-sm">Expert Support</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-3xl font-bold text-gray-900 mb-2">AI</div>
              <div className="text-gray-600 text-sm">GPT-4 Powered</div>
            </div>
          </div>
        </div>

        {/* Category Navigation */}
        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="mb-16">
          <TabsList className="grid w-full grid-cols-3 h-16 bg-white shadow-lg border">
            {featureCategories.map((category) => (
              <TabsTrigger
                key={category.id}
                value={category.id}
                className="flex items-center space-x-3 px-6 py-4 text-base font-medium data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-50 data-[state=active]:to-purple-50"
              >
                <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${category.gradient}`}></div>
                <div className="text-left">
                  <div className="font-semibold">{category.title}</div>
                  <div className="text-xs text-gray-500">{category.subtitle}</div>
                </div>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Category Content */}
          {featureCategories.map((category) => (
            <TabsContent key={category.id} value={category.id} className="mt-12">
              {/* Category Header */}
              <div className={`text-center mb-16 p-8 rounded-2xl bg-gradient-to-r ${category.gradient} text-white`}>
                <h2 className="text-4xl font-bold mb-4">{category.title}</h2>
                <p className="text-xl mb-4 opacity-90">{category.subtitle}</p>
                <p className="text-lg opacity-80 max-w-3xl mx-auto">{category.description}</p>
              </div>

              {/* Features Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {category.features.map((feature, featureIndex) => {
                  const Icon = feature.icon;
                  return (
                    <Card
                      key={feature.title}
                      className="group hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border-0 shadow-xl overflow-hidden"
                    >
                      {/* Feature Visual */}
                      <div className="relative h-48 bg-gradient-to-br from-gray-900 to-gray-800 overflow-hidden">
                        <div className="absolute inset-0 bg-black/20"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          {playingDemo === `${category.id}-${featureIndex}` ? (
                            <div className="text-center text-white">
                              <div className="animate-pulse mb-4">
                                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
                                  <PlayIcon className="w-8 h-8" />
                                </div>
                                <div className="text-sm font-medium">Demo Playing...</div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toggleDemo(`${category.id}-${featureIndex}`)}
                                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                              >
                                <PauseIcon className="w-4 h-4 mr-2" />
                                Pause Demo
                              </Button>
                            </div>
                          ) : (
                            <div className="text-center text-white">
                              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Icon className="w-8 h-8" />
                              </div>
                              <div className="text-lg font-semibold mb-2">{feature.title}</div>
                              <div className="text-sm opacity-80">Interactive Demo</div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toggleDemo(`${category.id}-${featureIndex}`)}
                                className="mt-4 bg-white/10 border-white/20 text-white hover:bg-white/20"
                              >
                                <PlayIcon className="w-4 h-4 mr-2" />
                                Watch Demo
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>

                      <CardHeader className="pb-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-4">
                            <div className={`w-12 h-12 bg-gradient-to-r ${category.gradient} rounded-xl flex items-center justify-center flex-shrink-0`}>
                              <Icon className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <CardTitle className="text-xl text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                                {feature.title}
                              </CardTitle>
                              <Badge className="bg-green-100 text-green-800 border-green-200">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Live & Ready
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-6">
                        <p className="text-gray-600 leading-relaxed">{feature.description}</p>

                        {/* Before/After Value Proposition */}
                        <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-4 rounded-lg border border-gray-200">
                          <div className="flex items-start space-x-3 mb-3">
                            <X className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                            <div>
                              <div className="text-sm font-medium text-red-900 mb-1">Before TestBro</div>
                              <p className="text-sm text-red-700">{feature.beforeAfter.before}</p>
                            </div>
                          </div>
                          <div className="flex items-start space-x-3">
                            <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                            <div>
                              <div className="text-sm font-medium text-green-900 mb-1">With TestBro</div>
                              <p className="text-sm text-green-700">{feature.beforeAfter.after}</p>
                            </div>
                          </div>
                        </div>

                        {/* Key Highlights */}
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 mb-3">
                            Key Capabilities:
                          </h4>
                          <ul className="space-y-2">
                            {feature.highlights.map((highlight, index) => (
                              <li
                                key={index}
                                className="text-sm text-gray-600 flex items-start group-hover:text-gray-800 transition-colors"
                              >
                                <span className="text-blue-500 mr-3 mt-1 font-bold">•</span>
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
            </TabsContent>
          ))}
        </Tabs>

        {/* Enhanced CTA Section */}
        <div className="mt-20 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-3xl p-8 md:p-12 text-center text-white relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-full h-full bg-white/5 transform rotate-12"></div>
          </div>

          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to Transform Your Testing?
            </h2>
            <p className="text-xl mb-10 text-blue-100 max-w-3xl mx-auto leading-relaxed">
              Join thousands of teams already using TestBro.ai to deliver
              higher-quality software faster than ever before. Start free today.
            </p>

            {/* Dual CTA with Different Audiences */}
            <div className="flex flex-col lg:flex-row gap-6 justify-center items-center mb-8">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-3 text-blue-100">For Teams & Developers</h3>
                <Button
                  size="lg"
                  className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  Start Free Trial
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <p className="text-sm text-blue-200 mt-2">14-day trial • No credit card required</p>
              </div>

              <div className="hidden lg:block w-px h-16 bg-white/20"></div>

              <div className="text-center">
                <h3 className="text-lg font-semibold mb-3 text-purple-100">For Enterprise Teams</h3>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-2 border-white text-white hover:bg-white hover:text-purple-600 px-8 py-4 text-lg font-semibold transition-all duration-300"
                >
                  Book Enterprise Demo
                  <Sparkles className="w-5 h-5 ml-2" />
                </Button>
                <p className="text-sm text-purple-200 mt-2">Custom solutions • Dedicated support</p>
              </div>
            </div>

            {/* Social Proof */}
            <div className="flex flex-wrap justify-center gap-8 text-sm text-blue-100 opacity-80">
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                SOC 2 Compliant
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                30-Day Money Back
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                Cancel Anytime
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                24/7 Support
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Stats Section */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="text-center p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="text-4xl font-bold text-blue-600 mb-2">9+</div>
            <div className="text-gray-600 font-medium">Core Features</div>
            <div className="text-sm text-gray-500 mt-1">All Live & Ready</div>
          </div>
          <div className="text-center p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="text-4xl font-bold text-green-600 mb-2">99.9%</div>
            <div className="text-gray-600 font-medium">Uptime SLA</div>
            <div className="text-sm text-gray-500 mt-1">Enterprise Grade</div>
          </div>
          <div className="text-center p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="text-4xl font-bold text-purple-600 mb-2">24/7</div>
            <div className="text-gray-600 font-medium">Expert Support</div>
            <div className="text-sm text-gray-500 mt-1">Global Coverage</div>
          </div>
          <div className="text-center p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="text-4xl font-bold text-pink-600 mb-2">AI</div>
            <div className="text-gray-600 font-medium">GPT-4 Powered</div>
            <div className="text-sm text-gray-500 mt-1">Latest AI Tech</div>
          </div>
        </div>
      </div>
    </div>
  );
}
