import React, { useState, useEffect } from 'react'
import {
  Sparkles,
  Zap,
  Clock,
  Target,
  DollarSign,
  Play,
  Eye,
  Download,
  Copy,
  CheckCircle,
  ArrowRight,
  Wand2,
  Rocket,
  TrendingUp,
  Users,
  ShoppingCart,
  CreditCard,
  Search,
  UserPlus,
  Shield,
  Smartphone,
  Globe,
  BarChart3
} from 'lucide-react'
import { Button } from './button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card'
import { Input } from './input'
import { Label } from './label'
import { Textarea } from './textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'
import { Badge } from './badge'
import { Progress } from './progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs'
import { Separator } from './separator'

export interface AITestTemplate {
  id: string
  name: string
  description: string
  industry: string
  type: 'e2e' | 'smoke' | 'regression' | 'performance' | 'accessibility' | 'mobile'
  estimatedTime: string
  businessValue: string
  costSavings: number
  steps: AITestStep[]
  generatedIn: number // seconds
  confidence: number // 0-100
  roi: {
    monthlySavings: number
    timesSaved: number
    issuesPrevented: number
  }
}

export interface AITestStep {
  id: string
  action: string
  element: string
  value?: string
  assertion?: string
  description: string
  confidence: number
}

interface AITemplateGeneratorProps {
  onTemplateGenerated?: (template: AITestTemplate) => void
  onTemplateExecute?: (template: AITestTemplate) => void
  className?: string
}

export function AITemplateGenerator({
  onTemplateGenerated,
  onTemplateExecute,
  className = ''
}: AITemplateGeneratorProps) {
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [selectedScenario, setSelectedScenario] = useState<string>('')
  const [customRequirements, setCustomRequirements] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generatedTemplate, setGeneratedTemplate] = useState<AITestTemplate | null>(null)
  const [progress, setProgress] = useState(0)

  // Pre-built scenarios for quick "aha" moment
  const quickScenarios = [
    {
      id: 'ecommerce-checkout',
      name: '🛒 E-commerce Checkout',
      description: 'Complete purchase flow from product to payment',
      industry: 'E-commerce',
      icon: <ShoppingCart className="w-5 h-5" />,
      estimatedSavings: 15000,
      timesSaved: 40
    },
    {
      id: 'user-registration',
      name: '👤 User Registration',
      description: 'Sign up process with email verification',
      industry: 'SaaS',
      icon: <UserPlus className="w-5 h-5" />,
      estimatedSavings: 8000,
      timesSaved: 25
    },
    {
      id: 'login-flow',
      name: '🔐 Login & Authentication',
      description: 'User login with error handling',
      industry: 'All',
      icon: <Shield className="w-5 h-5" />,
      estimatedSavings: 5000,
      timesSaved: 15
    },
    {
      id: 'search-filter',
      name: '🔍 Search & Filter',
      description: 'Product search with filtering options',
      industry: 'E-commerce',
      icon: <Search className="w-5 h-5" />,
      estimatedSavings: 12000,
      timesSaved: 30
    },
    {
      id: 'contact-form',
      name: '📧 Contact Form',
      description: 'Lead generation form submission',
      industry: 'Marketing',
      icon: <Users className="w-5 h-5" />,
      estimatedSavings: 6000,
      timesSaved: 20
    },
    {
      id: 'payment-processing',
      name: '💳 Payment Flow',
      description: 'Credit card processing and confirmation',
      industry: 'FinTech',
      icon: <CreditCard className="w-5 h-5" />,
      estimatedSavings: 25000,
      timesSaved: 60
    }
  ]

  const generateTemplate = async () => {
    if (!websiteUrl || !selectedScenario) return

    setGenerating(true)
    setProgress(0)

    // Simulate AI generation with realistic progress
    const steps = [
      'Analyzing website structure...',
      'Identifying key elements...',
      'Generating test steps...',
      'Optimizing for reliability...',
      'Calculating business impact...'
    ]

    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 800))
      setProgress((i + 1) * 20)
    }

    // Generate the actual template
    const selectedScenarioData = quickScenarios.find(s => s.id === selectedScenario)
    if (!selectedScenarioData) return

    const mockTemplate: AITestTemplate = {
      id: `template_${Date.now()}`,
      name: `${selectedScenarioData.name} - ${new URL(websiteUrl).hostname}`,
      description: `AI-generated test for ${selectedScenarioData.description.toLowerCase()} on ${websiteUrl}`,
      industry: selectedScenarioData.industry,
      type: 'e2e',
      estimatedTime: '3-5 minutes',
      businessValue: `Prevents ${Math.floor(selectedScenarioData.timesSaved / 4)} critical bugs monthly`,
      costSavings: selectedScenarioData.estimatedSavings,
      generatedIn: 4,
      confidence: 94,
      roi: {
        monthlySavings: selectedScenarioData.estimatedSavings,
        timesSaved: selectedScenarioData.timesSaved,
        issuesPrevented: Math.floor(selectedScenarioData.timesSaved / 4)
      },
      steps: generateStepsForScenario(selectedScenario, websiteUrl)
    }

    setGeneratedTemplate(mockTemplate)
    onTemplateGenerated?.(mockTemplate)
    setGenerating(false)
    setProgress(100)
  }

  const generateStepsForScenario = (scenarioId: string, url: string): AITestStep[] => {
    const baseSteps = {
      'ecommerce-checkout': [
        { action: 'navigate', element: 'page', value: url, description: 'Navigate to homepage', confidence: 98 },
        { action: 'click', element: '.product-item:first-child', description: 'Click on first product', confidence: 92 },
        { action: 'click', element: '[data-testid="add-to-cart"], .add-to-cart', description: 'Add product to cart', confidence: 95 },
        { action: 'click', element: '[data-testid="cart"], .cart-icon', description: 'Open shopping cart', confidence: 90 },
        { action: 'click', element: '[data-testid="checkout"], .checkout-btn', description: 'Proceed to checkout', confidence: 88 },
        { action: 'type', element: '[name="email"]', value: 'test@example.com', description: 'Enter email address', confidence: 96 },
        { action: 'type', element: '[name="firstName"]', value: 'John', description: 'Enter first name', confidence: 96 },
        { action: 'type', element: '[name="lastName"]', value: 'Doe', description: 'Enter last name', confidence: 96 },
        { action: 'assert', element: '.order-total', assertion: 'contains text', description: 'Verify order total is displayed', confidence: 94 }
      ],
      'user-registration': [
        { action: 'navigate', element: 'page', value: `${url}/signup`, description: 'Navigate to signup page', confidence: 98 },
        { action: 'type', element: '[name="email"]', value: 'newuser@example.com', description: 'Enter email address', confidence: 96 },
        { action: 'type', element: '[name="password"]', value: 'SecurePass123!', description: 'Enter password', confidence: 96 },
        { action: 'type', element: '[name="confirmPassword"]', value: 'SecurePass123!', description: 'Confirm password', confidence: 96 },
        { action: 'click', element: '[type="submit"], .signup-btn', description: 'Submit registration form', confidence: 92 },
        { action: 'assert', element: '.success-message, .confirmation', assertion: 'is visible', description: 'Verify success message appears', confidence: 90 }
      ],
      'login-flow': [
        { action: 'navigate', element: 'page', value: `${url}/login`, description: 'Navigate to login page', confidence: 98 },
        { action: 'type', element: '[name="email"], [name="username"]', value: 'user@example.com', description: 'Enter email/username', confidence: 96 },
        { action: 'type', element: '[name="password"]', value: 'password123', description: 'Enter password', confidence: 96 },
        { action: 'click', element: '[type="submit"], .login-btn', description: 'Click login button', confidence: 94 },
        { action: 'assert', element: '.dashboard, .profile, [data-testid="user-menu"]', assertion: 'is visible', description: 'Verify successful login', confidence: 88 }
      ]
    }

    const steps = baseSteps[scenarioId as keyof typeof baseSteps] || baseSteps['login-flow']
    
    return steps.map((step, index) => ({
      id: `step_${index + 1}`,
      ...step
    }))
  }

  const executeTemplate = async () => {
    if (!generatedTemplate) return
    onTemplateExecute?.(generatedTemplate)
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Hero Section */}
      <Card className="bg-gradient-to-r from-purple-50 via-blue-50 to-green-50 border-purple-200">
        <CardContent className="p-8">
          <div className="flex items-center justify-between">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-bold text-gray-900 mb-3 flex items-center">
                <Sparkles className="w-8 h-8 mr-3 text-purple-600" />
                AI Test Generator
              </h2>
              <p className="text-lg text-gray-700 mb-4">
                Get your "aha" moment in under 5 minutes! Generate professional test cases instantly using AI.
              </p>
              <div className="flex items-center space-x-6 text-sm">
                <div className="flex items-center text-green-700">
                  <Clock className="w-4 h-4 mr-2" />
                  <span className="font-medium">Ready in 4 seconds</span>
                </div>
                <div className="flex items-center text-blue-700">
                  <Target className="w-4 h-4 mr-2" />
                  <span className="font-medium">94% accuracy</span>
                </div>
                <div className="flex items-center text-purple-700">
                  <DollarSign className="w-4 h-4 mr-2" />
                  <span className="font-medium">$15K+ monthly savings</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-purple-600">⚡</div>
              <div className="text-sm text-purple-700 mt-2">Instant Testing</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="quick-start" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="quick-start">🚀 Quick Start (2 min)</TabsTrigger>
          <TabsTrigger value="custom">🎯 Custom Requirements</TabsTrigger>
        </TabsList>

        <TabsContent value="quick-start" className="space-y-6">
          {/* Website Input */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Globe className="w-5 h-5 mr-2" />
                Step 1: Enter Your Website
              </CardTitle>
              <CardDescription>
                We'll analyze your site and generate the perfect test template
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="website">Website URL</Label>
                  <Input
                    id="website"
                    placeholder="https://your-website.com"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    className="text-lg"
                  />
                </div>
                
                {websiteUrl && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center text-green-800">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      <span className="text-sm font-medium">
                        Great! We can test {new URL(websiteUrl).hostname}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Scenario Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Wand2 className="w-5 h-5 mr-2" />
                Step 2: Choose What to Test
              </CardTitle>
              <CardDescription>
                Pick the most critical user journey for your business
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {quickScenarios.map((scenario) => (
                  <Card 
                    key={scenario.id}
                    className={`cursor-pointer transition-all ${
                      selectedScenario === scenario.id 
                        ? 'border-purple-500 bg-purple-50 shadow-md' 
                        : 'hover:shadow-md hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedScenario(scenario.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        {scenario.icon}
                        {selectedScenario === scenario.id && (
                          <Badge className="bg-purple-100 text-purple-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Selected
                          </Badge>
                        )}
                      </div>
                      
                      <h4 className="font-semibold text-gray-900 mb-2">{scenario.name}</h4>
                      <p className="text-sm text-gray-600 mb-3">{scenario.description}</p>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">Monthly Savings</span>
                          <span className="font-medium text-green-600">
                            ${scenario.estimatedSavings.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">Time Saved</span>
                          <span className="font-medium text-blue-600">{scenario.timesSaved}h</span>
                        </div>
                        <Badge variant="outline" className="text-xs w-full justify-center">
                          {scenario.industry}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Generate Button */}
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <Button
                  onClick={generateTemplate}
                  disabled={!websiteUrl || !selectedScenario || generating}
                  size="lg"
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-4 text-lg"
                >
                  {generating ? (
                    <>
                      <Wand2 className="w-5 h-5 mr-2 animate-spin" />
                      Generating Your Test...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Generate AI Test in 4 Seconds
                    </>
                  )}
                </Button>
                
                {generating && (
                  <div className="mt-4 max-w-md mx-auto">
                    <Progress value={progress} className="h-2" />
                    <p className="text-sm text-gray-600 mt-2">
                      {progress < 20 && 'Analyzing website structure...'}
                      {progress >= 20 && progress < 40 && 'Identifying key elements...'}
                      {progress >= 40 && progress < 60 && 'Generating test steps...'}
                      {progress >= 60 && progress < 80 && 'Optimizing for reliability...'}
                      {progress >= 80 && 'Calculating business impact...'}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custom" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Custom Test Requirements</CardTitle>
              <CardDescription>
                Describe your specific testing needs for AI-powered generation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="custom-url">Website URL</Label>
                <Input id="custom-url" placeholder="https://your-website.com" />
              </div>
              
              <div>
                <Label htmlFor="requirements">What should this test do?</Label>
                <Textarea 
                  id="requirements"
                  placeholder="Example: Test the complete user registration process including email verification, profile setup, and welcome flow..."
                  rows={4}
                  value={customRequirements}
                  onChange={(e) => setCustomRequirements(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="test-type">Test Type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="e2e">End-to-End</SelectItem>
                      <SelectItem value="smoke">Smoke Test</SelectItem>
                      <SelectItem value="regression">Regression</SelectItem>
                      <SelectItem value="performance">Performance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="industry">Industry</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ecommerce">E-commerce</SelectItem>
                      <SelectItem value="saas">SaaS</SelectItem>
                      <SelectItem value="fintech">FinTech</SelectItem>
                      <SelectItem value="healthcare">Healthcare</SelectItem>
                      <SelectItem value="education">Education</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button className="w-full" size="lg">
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Custom Test
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Generated Template Display */}
      {generatedTemplate && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center text-green-800">
                  <CheckCircle className="w-6 h-6 mr-2" />
                  Test Generated Successfully!
                </CardTitle>
                <CardDescription className="text-green-700">
                  Ready to run in {generatedTemplate.estimatedTime} • {generatedTemplate.confidence}% confidence
                </CardDescription>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">
                  ${generatedTemplate.costSavings.toLocaleString()}
                </div>
                <div className="text-sm text-green-700">Monthly savings potential</div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <GeneratedTemplatePreview 
              template={generatedTemplate}
              onExecute={executeTemplate}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

interface GeneratedTemplatePreviewProps {
  template: AITestTemplate
  onExecute: () => void
}

function GeneratedTemplatePreview({ template, onExecute }: GeneratedTemplatePreviewProps) {
  const [activeTab, setActiveTab] = useState('preview')

  return (
    <div className="space-y-4">
      {/* ROI Highlight */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-white border border-green-200 rounded-lg">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">${template.roi.monthlySavings.toLocaleString()}</div>
          <div className="text-sm text-green-700">Monthly Savings</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{template.roi.timesSaved}h</div>
          <div className="text-sm text-blue-700">Time Saved</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">{template.roi.issuesPrevented}</div>
          <div className="text-sm text-purple-700">Issues Prevented</div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="preview">👁️ Preview Steps</TabsTrigger>
          <TabsTrigger value="code">📄 Export Code</TabsTrigger>
          <TabsTrigger value="impact">📊 Business Impact</TabsTrigger>
        </TabsList>

        <TabsContent value="preview">
          <div className="space-y-3">
            {template.steps.map((step, index) => (
              <div key={step.id} className="flex items-center space-x-3 p-3 bg-white border rounded-lg">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-sm font-medium text-purple-700">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{step.description}</div>
                  <div className="text-sm text-gray-600">
                    {step.action} {step.element} {step.value && `→ "${step.value}"`}
                  </div>
                </div>
                <div className="text-right">
                  <Badge className="bg-green-100 text-green-800">{step.confidence}%</Badge>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="code">
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
            <div className="mb-2 text-gray-400">// Generated Playwright test</div>
            {template.steps.map((step, index) => (
              <div key={index} className="mb-1">
                {step.action === 'navigate' && `await page.goto('${step.value}');`}
                {step.action === 'click' && `await page.click('${step.element}');`}
                {step.action === 'type' && `await page.fill('${step.element}', '${step.value}');`}
                {step.action === 'assert' && `await expect(page.locator('${step.element}')).toBeVisible();`}
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="impact">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Time & Cost Savings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Manual testing time</span>
                    <span className="font-medium">{template.roi.timesSaved}h/month</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Cost at $100/hour</span>
                    <span className="font-medium">${template.roi.monthlySavings.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Annual projection</span>
                    <span className="font-medium text-green-600">${(template.roi.monthlySavings * 12).toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quality Impact</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Issues prevented</span>
                    <span className="font-medium">{template.roi.issuesPrevented}/month</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Test confidence</span>
                    <span className="font-medium">{template.confidence}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Reliability improvement</span>
                    <span className="font-medium text-blue-600">+15%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex items-center space-x-3 pt-4">
        <Button onClick={onExecute} size="lg" className="bg-green-600 hover:bg-green-700">
          <Play className="w-4 h-4 mr-2" />
          Run Test Now
        </Button>
        <Button variant="outline" size="lg">
          <Download className="w-4 h-4 mr-2" />
          Export Code
        </Button>
        <Button variant="outline" size="lg">
          <Copy className="w-4 h-4 mr-2" />
          Add to Suite
        </Button>
      </div>
    </div>
  )
}