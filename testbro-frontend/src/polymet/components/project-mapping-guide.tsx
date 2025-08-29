import React from "react";
import {
  FolderOpen,
  Target,
  TestTube,
  ArrowRight,
  Users,
  Settings,
  Play,
  BarChart3,
  CheckCircle,
  Globe,
  Smartphone,
  Monitor,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function ProjectMappingGuide() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Project-Target-Test Case Mapping
        </h1>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          Understanding how TestBro.ai organizes your testing workflow across
          multiple projects, targets, and test cases for enterprise-scale
          testing management.
        </p>
      </div>

      {/* Hierarchy Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            Testing Hierarchy Overview
          </CardTitle>
          <CardDescription>
            How projects, targets, and test cases are organized in TestBro.ai
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row items-center justify-center space-y-6 lg:space-y-0 lg:space-x-8">
            {/* Project Level */}
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <FolderOpen className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Project</h3>
              <p className="text-sm text-gray-600 max-w-xs">
                Top-level organization for related applications and testing
                initiatives
              </p>
              <div className="mt-3 space-y-1">
                <Badge variant="outline" className="text-xs">
                  Team Management
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Settings & Config
                </Badge>
              </div>
            </div>

            <ArrowRight className="w-6 h-6 text-gray-400 hidden lg:block" />

            <div className="lg:hidden">
              <ArrowRight className="w-6 h-6 text-gray-400 rotate-90" />
            </div>

            {/* Target Level */}
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Target className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Targets</h3>
              <p className="text-sm text-gray-600 max-w-xs">
                Specific applications, websites, or mobile apps to be tested
              </p>
              <div className="mt-3 space-y-1">
                <Badge variant="outline" className="text-xs">
                  Web Apps
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Mobile Apps
                </Badge>
              </div>
            </div>

            <ArrowRight className="w-6 h-6 text-gray-400 hidden lg:block" />

            <div className="lg:hidden">
              <ArrowRight className="w-6 h-6 text-gray-400 rotate-90" />
            </div>

            {/* Test Case Level */}
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <TestTube className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Test Cases</h3>
              <p className="text-sm text-gray-600 max-w-xs">
                Individual test scenarios that can run on multiple targets
              </p>
              <div className="mt-3 space-y-1">
                <Badge variant="outline" className="text-xs">
                  E2E Tests
                </Badge>
                <Badge variant="outline" className="text-xs">
                  UI Tests
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Real-world Examples */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* E-commerce Project Example */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <FolderOpen className="w-5 h-5 mr-2 text-blue-600" />
              E-commerce Platform
            </CardTitle>
            <CardDescription>
              Multi-platform e-commerce testing project
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                <Target className="w-4 h-4 mr-2 text-purple-600" />
                Targets (2)
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center space-x-2">
                    <Globe className="w-4 h-4 text-gray-500" />

                    <span className="text-sm">Web Store</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Production
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center space-x-2">
                    <Smartphone className="w-4 h-4 text-gray-500" />

                    <span className="text-sm">Mobile App</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    iOS/Android
                  </Badge>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                <TestTube className="w-4 h-4 mr-2 text-green-600" />
                Test Cases (3)
              </h4>
              <div className="space-y-2">
                <div className="p-2 bg-green-50 rounded">
                  <div className="text-sm font-medium">User Registration</div>
                  <div className="text-xs text-gray-600">
                    Runs on: Web Store, Mobile App
                  </div>
                </div>
                <div className="p-2 bg-green-50 rounded">
                  <div className="text-sm font-medium">Checkout Process</div>
                  <div className="text-xs text-gray-600">
                    Runs on: Web Store
                  </div>
                </div>
                <div className="p-2 bg-green-50 rounded">
                  <div className="text-sm font-medium">Product Search</div>
                  <div className="text-xs text-gray-600">
                    Runs on: Web Store, Mobile App
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Banking Project Example */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <FolderOpen className="w-5 h-5 mr-2 text-blue-600" />
              Banking Mobile App
            </CardTitle>
            <CardDescription>
              Secure mobile banking application testing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                <Target className="w-4 h-4 mr-2 text-purple-600" />
                Targets (1)
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center space-x-2">
                    <Monitor className="w-4 h-4 text-gray-500" />

                    <span className="text-sm">Mobile Web</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Production
                  </Badge>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                <TestTube className="w-4 h-4 mr-2 text-green-600" />
                Test Cases (1)
              </h4>
              <div className="space-y-2">
                <div className="p-2 bg-green-50 rounded">
                  <div className="text-sm font-medium">File Upload</div>
                  <div className="text-xs text-gray-600">
                    Runs on: Mobile Web
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SaaS Project Example */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <FolderOpen className="w-5 h-5 mr-2 text-blue-600" />
              SaaS Dashboard
            </CardTitle>
            <CardDescription>
              Business intelligence dashboard testing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                <Target className="w-4 h-4 mr-2 text-purple-600" />
                Targets (1)
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center space-x-2">
                    <Globe className="w-4 h-4 text-gray-500" />

                    <span className="text-sm">Dashboard</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Staging
                  </Badge>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                <TestTube className="w-4 h-4 mr-2 text-green-600" />
                Test Cases (0)
              </h4>
              <div className="text-center py-4">
                <p className="text-sm text-gray-500">No test cases yet</p>
                <Button variant="outline" size="sm" className="mt-2">
                  Add Test Case
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Key Benefits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
            Key Benefits of This Structure
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">
                  🎯 Multi-Target Testing
                </h4>
                <p className="text-sm text-gray-600">
                  Run the same test case across multiple applications (web,
                  mobile, different environments) to ensure consistency.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">
                  👥 Team Collaboration
                </h4>
                <p className="text-sm text-gray-600">
                  Organize teams by projects with proper access controls and
                  role-based permissions for different testing initiatives.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">
                  📊 Centralized Reporting
                </h4>
                <p className="text-sm text-gray-600">
                  Get project-level insights and cross-target analytics to
                  understand overall quality and performance trends.
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">
                  🔄 Efficient Reuse
                </h4>
                <p className="text-sm text-gray-600">
                  Create test cases once and apply them to multiple targets,
                  reducing duplication and maintenance overhead.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">
                  ⚙️ Flexible Configuration
                </h4>
                <p className="text-sm text-gray-600">
                  Configure different settings, notifications, and retention
                  policies per project based on business requirements.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">
                  📈 Scalable Growth
                </h4>
                <p className="text-sm text-gray-600">
                  Easily add new projects, targets, and test cases as your
                  testing needs grow without restructuring existing work.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workflow Example */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Play className="w-5 h-5 mr-2 text-blue-600" />
            Typical Workflow
          </CardTitle>
          <CardDescription>
            How a customer would set up and manage multiple projects
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-medium text-blue-600">1</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Create Projects</h4>
                <p className="text-sm text-gray-600">
                  Set up separate projects for different business units,
                  applications, or testing initiatives (e.g., "E-commerce
                  Platform", "Mobile Banking", "Internal Tools").
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-medium text-purple-600">2</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Add Targets</h4>
                <p className="text-sm text-gray-600">
                  Define target applications for each project - web apps, mobile
                  apps, different environments (staging, production), or
                  different platforms.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-medium text-green-600">3</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Create Test Cases</h4>
                <p className="text-sm text-gray-600">
                  Build test cases within projects and specify which targets
                  they should run on. A single test case can run on multiple
                  targets for cross-platform validation.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-medium text-orange-600">4</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Execute & Monitor</h4>
                <p className="text-sm text-gray-600">
                  Run tests across all targets, monitor results by project and
                  target, and get comprehensive insights into quality and
                  performance across your entire testing portfolio.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
