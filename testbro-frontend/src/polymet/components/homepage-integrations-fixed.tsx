import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  GitBranch, 
  MessageSquare, 
  Zap, 
  Database,
  Cloud,
  Code,
  ArrowRight,
  CheckCircle,
  Plus,
  Workflow
} from "lucide-react";

export default function HomepageIntegrations() {
  const integrationCategories = [
    {
      title: "CI/CD & Development",
      icon: GitBranch,
      color: "blue",
      integrations: [
        { name: "GitHub Actions", logo: "GH", popular: true },
        { name: "GitLab CI", logo: "GL", popular: true },
        { name: "Jenkins", logo: "JK", popular: true },
        { name: "CircleCI", logo: "CC", popular: false },
        { name: "Azure DevOps", logo: "AD", popular: false },
        { name: "Bitbucket", logo: "BB", popular: false }
      ]
    },
    {
      title: "Communication & Alerts",
      icon: MessageSquare,
      color: "green",
      integrations: [
        { name: "Slack", logo: "SL", popular: true },
        { name: "Microsoft Teams", logo: "MT", popular: true },
        { name: "Discord", logo: "DC", popular: false },
        { name: "Email", logo: "EM", popular: true },
        { name: "Webhook", logo: "WH", popular: false },
        { name: "PagerDuty", logo: "PD", popular: false }
      ]
    },
    {
      title: "Project Management",
      icon: Workflow,
      color: "purple",
      integrations: [
        { name: "Jira", logo: "JR", popular: true },
        { name: "Linear", logo: "LN", popular: true },
        { name: "Asana", logo: "AS", popular: false },
        { name: "Trello", logo: "TR", popular: false },
        { name: "Monday.com", logo: "MN", popular: false },
        { name: "Notion", logo: "NT", popular: false }
      ]
    },
    {
      title: "Cloud & Infrastructure",
      icon: Cloud,
      color: "indigo",
      integrations: [
        { name: "AWS", logo: "AW", popular: true },
        { name: "Google Cloud", logo: "GC", popular: true },
        { name: "Azure", logo: "AZ", popular: true },
        { name: "Docker", logo: "DK", popular: false },
        { name: "Kubernetes", logo: "K8", popular: false },
        { name: "Vercel", logo: "VC", popular: false }
      ]
    }
  ];

  const workflowSteps = [
    {
      step: 1,
      title: "Code Push",
      description: "Developer pushes code to repository",
      icon: Code,
      color: "blue"
    },
    {
      step: 2,
      title: "Auto Trigger",
      description: "TestBro.ai automatically detects changes",
      icon: Zap,
      color: "yellow"
    },
    {
      step: 3,
      title: "AI Testing",
      description: "Comprehensive tests run across environments",
      icon: Workflow,
      color: "purple"
    },
    {
      step: 4,
      title: "Team Notification",
      description: "Results sent to Slack, Teams, or email",
      icon: MessageSquare,
      color: "green"
    }
  ];

  const getColorClasses = (color: string) => {
    const colorMap = {
      blue: "bg-blue-100 text-blue-600 border-blue-200",
      green: "bg-green-100 text-green-600 border-green-200",
      purple: "bg-purple-100 text-purple-600 border-purple-200",
      indigo: "bg-indigo-100 text-indigo-600 border-indigo-200",
      yellow: "bg-yellow-100 text-yellow-600 border-yellow-200"
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.blue;
  };

  return (
    <div className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200 mb-4">
            <Plus className="w-3 h-3 mr-1" />
            100+ Integrations
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Fits Seamlessly Into Your Workflow
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            TestBro.ai integrates with the tools you already use. Set up automated testing 
            in your existing CI/CD pipeline and get instant notifications in your favorite apps.
          </p>
        </div>

        {/* Integration Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {integrationCategories.map((category, index) => {
            const Icon = category.icon;
            return (
              <div key={index} className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                <div className="flex items-center space-x-3 mb-6">
                  <div className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center ${getColorClasses(category.color)}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-gray-900">{category.title}</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  {category.integrations.map((integration, integrationIndex) => (
                    <div 
                      key={integrationIndex}
                      className={`bg-white rounded-lg p-3 border border-gray-200 hover:border-gray-300 transition-colors ${
                        integration.popular ? 'ring-1 ring-blue-100' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-gradient-to-br from-gray-400 to-gray-600 rounded text-white text-xs font-bold flex items-center justify-center">
                          {integration.logo}
                        </div>
                        <span className="text-xs font-medium text-gray-700 truncate">
                          {integration.name}
                        </span>
                      </div>
                      {integration.popular && (
                        <div className="mt-1">
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                            Popular
                          </Badge>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Workflow Visualization */}
        <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl p-8 border border-gray-200 mb-16">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Automated Testing Workflow
            </h3>
            <p className="text-gray-600">
              See how TestBro.ai integrates into your development process
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {workflowSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={index} className="relative">
                  <div className="bg-white rounded-xl p-6 border border-gray-200 text-center">
                    <div className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center mx-auto mb-4 ${getColorClasses(step.color)}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    
                    <div className="mb-2">
                      <Badge variant="secondary" className="bg-gray-100 text-gray-700 text-xs">
                        Step {step.step}
                      </Badge>
                    </div>
                    
                    <h4 className="font-semibold text-gray-900 mb-2">{step.title}</h4>
                    <p className="text-sm text-gray-600">{step.description}</p>
                  </div>

                  {/* Arrow */}
                  {index < workflowSteps.length - 1 && (
                    <div className="hidden md:block absolute top-1/2 -right-3 transform -translate-y-1/2">
                      <ArrowRight className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* API & Custom Integrations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Don't See Your Tool? No Problem.
            </h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Use our comprehensive REST API and webhooks to build custom integrations. 
              Our developer-friendly documentation and SDKs make it easy to connect 
              TestBro.ai with any tool in your stack.
            </p>
            
            <div className="space-y-4 mb-6">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-gray-700">RESTful API with comprehensive documentation</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-gray-700">Webhooks for real-time notifications</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-gray-700">SDKs for popular programming languages</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-gray-700">Zapier integration for no-code automation</span>
              </div>
            </div>

            <Button variant="outline" className="border-gray-300 hover:bg-gray-50">
              View API Documentation
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          <div className="bg-gray-900 rounded-2xl p-6 text-green-400 font-mono text-sm">
            <div className="mb-4">
              <span className="text-gray-500"># Start a test run via API</span>
            </div>
            <div className="space-y-2">
              <div>
                <span className="text-blue-400">curl</span> -X POST \
              </div>
              <div className="ml-4">
                https://api.testbro.ai/v1/runs \
              </div>
              <div className="ml-4">
                -H <span className="text-yellow-400">"Authorization: Bearer $API_KEY"</span> \
              </div>
              <div className="ml-4">
                -H <span className="text-yellow-400">"Content-Type: application/json"</span> \
              </div>
              <div className="ml-4">
                -d <span className="text-yellow-400">'{"target_id": "prod-app", "suite_id": "regression"}'</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-700">
              <div className="text-gray-500"># Response</div>
              <div className="text-green-400">
                {"run_id": "run_123", "status": "running"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}