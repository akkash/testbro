import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Play,
  ArrowRight,
  CheckCircle,
  Zap,
  Shield,
  Users,
  Star,
} from "lucide-react";

export default function HomepageHero() {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Content */}
          <div className="space-y-8">
            {/* Trust Badge */}
            <div className="flex items-center space-x-2">
              <Badge
                variant="secondary"
                className="bg-green-100 text-green-800 border-green-200"
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                Trusted by 500+ companies
              </Badge>
              <div className="flex items-center space-x-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-4 h-4 fill-yellow-400 text-yellow-400"
                  />
                ))}
                <span className="text-sm text-gray-600 ml-1">4.9/5</span>
              </div>
            </div>

            {/* Main Headline */}
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                AI-Powered
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                  {" "}
                  Software Testing
                </span>
                <br />
                That Actually Works
              </h1>

              <p className="text-xl text-gray-600 leading-relaxed max-w-2xl">
                Stop wasting time on manual testing. TestBro.ai automatically
                generates, executes, and analyzes your tests with human-like
                intelligence.
                <strong className="text-gray-900">
                  {" "}
                  Catch bugs before your users do.
                </strong>
              </p>
            </div>

            {/* Key Benefits */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Zap className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-sm font-medium text-gray-700">
                  10x Faster Testing
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <Shield className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-sm font-medium text-gray-700">
                  99.9% Bug Detection
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <Users className="w-4 h-4 text-purple-600" />
                </div>
                <span className="text-sm font-medium text-gray-700">
                  Zero Learning Curve
                </span>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/dashboard">
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3"
                >
                  Start Free Trial
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>

              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto border-gray-300 hover:bg-gray-50"
              >
                <Play className="w-4 h-4 mr-2" />
                Watch Demo (2 min)
              </Button>
            </div>

            {/* Social Proof */}
            <div className="text-sm text-gray-500">
              <span className="font-medium">Free 14-day trial</span> • No credit
              card required •
              <span className="font-medium"> Setup in 5 minutes</span>
            </div>
          </div>

          {/* Right Column - Visual Demo */}
          <div className="relative">
            {/* Main Demo Video/Screenshot Container */}
            <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
              {/* Browser Chrome */}
              <div className="bg-gray-100 px-4 py-3 border-b border-gray-200">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  </div>
                  <div className="flex-1 bg-white rounded-md px-3 py-1 text-xs text-gray-500">
                    testbro.ai/dashboard
                  </div>
                </div>
              </div>

              {/* Demo Content */}
              <div className="p-6 bg-gradient-to-br from-blue-50 to-purple-50">
                <div className="space-y-4">
                  {/* AI Test Generation */}
                  <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Zap className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-sm">
                          AI Test Generation
                        </h3>
                        <p className="text-xs text-gray-500">
                          Creating 15 test cases...
                        </p>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full w-3/4"></div>
                    </div>
                  </div>

                  {/* Live Execution */}
                  <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-gray-900">
                        Live Execution
                      </span>
                      <Badge
                        variant="secondary"
                        className="bg-green-100 text-green-800 text-xs"
                      >
                        Running
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-600">
                      Testing checkout flow on production...
                    </div>
                  </div>

                  {/* Results */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white rounded-lg p-3 text-center shadow-sm border border-gray-100">
                      <div className="text-lg font-bold text-green-600">
                        98%
                      </div>
                      <div className="text-xs text-gray-500">Pass Rate</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center shadow-sm border border-gray-100">
                      <div className="text-lg font-bold text-blue-600">
                        2.3s
                      </div>
                      <div className="text-xs text-gray-500">Avg Speed</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center shadow-sm border border-gray-100">
                      <div className="text-lg font-bold text-purple-600">
                        12
                      </div>
                      <div className="text-xs text-gray-500">Issues Found</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Elements */}
            <div className="absolute -top-4 -right-4 bg-white rounded-lg shadow-lg p-3 border border-gray-200">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-gray-700">
                  AI Agent Active
                </span>
              </div>
            </div>

            <div className="absolute -bottom-4 -left-4 bg-white rounded-lg shadow-lg p-3 border border-gray-200">
              <div className="text-xs text-gray-600">
                <div className="font-medium text-gray-900">Bug Detected!</div>
                <div>Payment form validation</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
