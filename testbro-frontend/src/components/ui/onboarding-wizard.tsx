import React, { useState } from 'react'
import { 
  CheckCircle, 
  Clock, 
  ArrowRight, 
  Sparkles, 
  Target, 
  Users,
  TrendingUp,
  Gift,
  Play,
  BookOpen
} from 'lucide-react'
import { Button } from './button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card'
import { Badge } from './badge'
import { Progress } from './progress'
import { 
  OnboardingTemplate, 
  OnboardingStep, 
  useOnboarding,
  OnboardingService 
} from '@/lib/services/onboardingService'

interface OnboardingWizardProps {
  context: 'projects' | 'targets' | 'cases' | 'suites' | 'results' | 'analytics'
  onTemplateSelect?: (template: OnboardingTemplate) => void
  onStepComplete?: (stepId: string) => void
  onSkip?: () => void
  className?: string
}

export function OnboardingWizard({ 
  context, 
  onTemplateSelect, 
  onStepComplete,
  onSkip,
  className = '' 
}: OnboardingWizardProps) {
  const { config, templates, markStepCompleted } = useOnboarding()
  const [selectedTemplate, setSelectedTemplate] = useState<OnboardingTemplate | null>(null)
  const [currentStep, setCurrentStep] = useState(0)

  const handleTemplateSelect = (template: OnboardingTemplate) => {
    setSelectedTemplate(template)
    OnboardingService.updateConfig({ selectedTemplate: template.id })
    onTemplateSelect?.(template)
  }

  const handleStepComplete = (step: OnboardingStep) => {
    markStepCompleted(step.id)
    onStepComplete?.(step.id)
    
    if (selectedTemplate && currentStep < selectedTemplate.steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const getContextConfig = () => {
    switch (context) {
      case 'projects':
        return {
          title: "Let's get you started!",
          description: "Choose a template that matches your needs, or create from scratch",
          icon: <Target className="w-8 h-8 text-blue-600" />,
          emptyMessage: "No projects yet",
          primaryAction: "Create First Project"
        }
      case 'targets':
        return {
          title: "Add your first test target",
          description: "Start by adding websites or applications you want to test",
          icon: <Target className="w-8 h-8 text-green-600" />,
          emptyMessage: "No test targets configured",
          primaryAction: "Add Test Target"
        }
      case 'cases':
        return {
          title: "Create your first test case",
          description: "Build automated tests to catch issues before your users do",
          icon: <CheckCircle className="w-8 h-8 text-purple-600" />,
          emptyMessage: "No test cases created",
          primaryAction: "Create Test Case"
        }
      case 'suites':
        return {
          title: "Organize tests into suites",
          description: "Group related tests together for efficient execution",
          icon: <Users className="w-8 h-8 text-orange-600" />,
          emptyMessage: "No test suites configured",
          primaryAction: "Create Test Suite"
        }
      case 'results':
        return {
          title: "Run your first test",
          description: "Execute tests to start monitoring your application's quality",
          icon: <Play className="w-8 h-8 text-red-600" />,
          emptyMessage: "No test results yet",
          primaryAction: "Run Tests"
        }
      case 'analytics':
        return {
          title: "Track your testing progress",
          description: "Monitor test reliability and business impact over time",
          icon: <TrendingUp className="w-8 h-8 text-indigo-600" />,
          emptyMessage: "No analytics data available",
          primaryAction: "View Analytics"
        }
      default:
        return {
          title: "Welcome to TestBro",
          description: "Let's get you set up for success",
          icon: <Sparkles className="w-8 h-8 text-blue-600" />,
          emptyMessage: "Let's get started",
          primaryAction: "Get Started"
        }
    }
  }

  const contextConfig = getContextConfig()

  if (!selectedTemplate) {
    return (
      <div className={`max-w-4xl mx-auto p-6 ${className}`}>
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            {contextConfig.icon}
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {contextConfig.title}
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            {contextConfig.description}
          </p>
        </div>

        {/* Template Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {templates.map((template) => (
            <Card 
              key={template.id}
              className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-blue-300"
              onClick={() => handleTemplateSelect(template)}
            >
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{template.icon}</span>
                  <Badge variant="secondary" className="text-xs">
                    {template.estimatedTime}
                  </Badge>
                </div>
                <CardTitle className="text-lg">{template.name}</CardTitle>
                <CardDescription className="text-sm">
                  {template.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <TrendingUp className="w-4 h-4 text-green-600 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-green-800">Business Value</p>
                        <p className="text-xs text-green-700">{template.businessValue}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    Includes: {template.steps.length} guided steps
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Alternative Actions */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-4">
            <Button size="lg" onClick={() => onSkip?.()}>
              {contextConfig.primaryAction}
            </Button>
            <Button variant="outline" onClick={() => onSkip?.()}>
              Skip Setup
            </Button>
          </div>
          
          <div className="flex items-center justify-center space-x-6 text-sm text-gray-500">
            <a href="/docs" className="flex items-center hover:text-gray-700">
              <BookOpen className="w-4 h-4 mr-1" />
              View Documentation
            </a>
            <span>•</span>
            <a href="/support" className="flex items-center hover:text-gray-700">
              <Users className="w-4 h-4 mr-1" />
              Get Help
            </a>
          </div>
        </div>
      </div>
    )
  }

  // Show guided steps for selected template
  return (
    <div className={`max-w-2xl mx-auto p-6 ${className}`}>
      {/* Progress Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{selectedTemplate.icon}</span>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedTemplate.name}
              </h3>
              <p className="text-sm text-gray-600">
                Step {currentStep + 1} of {selectedTemplate.steps.length}
              </p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setSelectedTemplate(null)}
          >
            Change Template
          </Button>
        </div>
        
        <Progress 
          value={(currentStep / selectedTemplate.steps.length) * 100} 
          className="w-full"
        />
      </div>

      {/* Current Step */}
      {selectedTemplate.steps[currentStep] && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-lg">{selectedTemplate.steps[currentStep].icon}</span>
              </div>
              <div>
                <CardTitle className="text-xl">
                  {selectedTemplate.steps[currentStep].title}
                </CardTitle>
                <CardDescription>
                  {selectedTemplate.steps[currentStep].description}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button 
                onClick={() => handleStepComplete(selectedTemplate.steps[currentStep])}
                className="w-full"
              >
                {currentStep === selectedTemplate.steps.length - 1 ? 'Complete Setup' : 'Complete This Step'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              
              {selectedTemplate.steps[currentStep].action && (
                <Button 
                  variant="outline" 
                  onClick={selectedTemplate.steps[currentStep].action}
                  className="w-full"
                >
                  Quick Action
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Steps Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Setup Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {selectedTemplate.steps.map((step, index) => (
              <div 
                key={step.id}
                className={`flex items-center space-x-3 p-2 rounded-lg ${
                  index === currentStep ? 'bg-blue-50 border border-blue-200' : 
                  index < currentStep ? 'bg-green-50' : 'bg-gray-50'
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                  index < currentStep ? 'bg-green-500 text-white' :
                  index === currentStep ? 'bg-blue-500 text-white' :
                  'bg-gray-300 text-gray-600'
                }`}>
                  {index < currentStep ? '✓' : index + 1}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${
                    index <= currentStep ? 'text-gray-900' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </p>
                  <p className="text-xs text-gray-500">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

interface QuickOnboardingProps {
  title: string
  description: string
  icon: React.ReactNode
  primaryAction: {
    label: string
    onClick: () => void
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  tips?: string[]
  className?: string
}

export function QuickOnboarding({
  title,
  description,
  icon,
  primaryAction,
  secondaryAction,
  tips = [],
  className = ''
}: QuickOnboardingProps) {
  return (
    <div className={`text-center py-12 ${className}`}>
      <div className="max-w-md mx-auto">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          {icon}
        </div>
        
        <h3 className="text-xl font-semibold text-gray-900 mb-3">
          {title}
        </h3>
        
        <p className="text-gray-600 mb-8 leading-relaxed">
          {description}
        </p>
        
        <div className="space-y-4">
          <Button size="lg" onClick={primaryAction.onClick} className="w-full">
            {primaryAction.label}
          </Button>
          
          {secondaryAction && (
            <Button 
              variant="outline" 
              onClick={secondaryAction.onClick}
              className="w-full"
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>

        {tips.length > 0 && (
          <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="text-sm font-medium text-blue-900 mb-3 flex items-center">
              <Gift className="w-4 h-4 mr-2" />
              Pro Tips
            </h4>
            <ul className="space-y-2 text-sm text-blue-800">
              {tips.map((tip, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <span className="text-blue-600">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}