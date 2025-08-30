import React, { useState } from 'react'
import {
  Rocket,
  Building,
  Users,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Target,
  DollarSign,
  Clock,
  Play,
  Download,
  Globe,
  Zap
} from 'lucide-react'
import { Button } from './button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card'
import { Input } from './input'
import { Label } from './label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'
import { Badge } from './badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs'
import { Progress } from './progress'
import { AITemplateGenerator } from './ai-template-generator'
import { BusinessImpactCalculator } from './business-impact-calculator'

export interface QuickStartData {
  userType: 'agency' | 'smb'
  companyName: string
  industry: string
  teamSize: string
  mainGoal: string
  websiteUrl: string
  currentTestingProcess: string
  monthlyRevenue: string
}

interface QuickStartWizardProps {
  onComplete?: (data: QuickStartData) => void
  className?: string
}

export function QuickStartWizard({ onComplete, className = '' }: QuickStartWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<Partial<QuickStartData>>({})
  const [showTemplateGenerator, setShowTemplateGenerator] = useState(false)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])

  const totalSteps = 5

  const updateFormData = (field: keyof QuickStartData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCompletedSteps(prev => [...prev, currentStep])
      setCurrentStep(currentStep + 1)
    }
  }

  const completeWizard = () => {
    if (onComplete) {
      onComplete(formData as QuickStartData)
    }
    setShowTemplateGenerator(true)
  }

  const getProgressPercentage = () => {
    return (currentStep / totalSteps) * 100
  }

  const getUserTypeConfig = () => {
    if (formData.userType === 'agency') {
      return {
        title: 'Agency Setup',
        subtitle: 'Deliver exceptional testing services to your clients',
        icon: <Building className="w-8 h-8 text-blue-600" />,
        benefits: [
          'White-label client reports',
          'ROI dashboards for client meetings',
          'Automated testing workflows',
          'Team collaboration tools'
        ],
        color: 'blue'
      }
    } else {
      return {
        title: 'SMB Setup',
        subtitle: 'Scale your business with reliable automated testing',
        icon: <Users className="w-8 h-8 text-green-600" />,
        benefits: [
          'Instant test generation',
          'Cost savings tracking',
          'Easy team onboarding',
          'Business impact metrics'
        ],
        color: 'green'
      }
    }
  }

  if (showTemplateGenerator) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-600 mr-4" />
              <div>
                <h3 className="text-xl font-bold text-green-800">Setup Complete!</h3>
                <p className="text-green-700">
                  Now let's generate your first AI-powered test in under 5 minutes
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <AITemplateGenerator
          onTemplateGenerated={(template) => {
            console.log('Template generated:', template)
          }}
        />
      </div>
    )
  }

  return (
    <div className={`max-w-4xl mx-auto space-y-6 ${className}`}>
      {/* Header */}
      <Card className="bg-gradient-to-r from-purple-50 via-blue-50 to-green-50 border-purple-200">
        <CardContent className="p-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-3 flex items-center justify-center">
              <Rocket className="w-8 h-8 mr-3 text-purple-600" />
              Quick Start Wizard
            </h1>
            <p className="text-lg text-gray-700 mb-6">
              Get your "aha" moment in under 5 minutes! Let's set up TestBro for your needs.
            </p>
            
            {/* Progress Bar */}
            <div className="max-w-md mx-auto">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>Step {currentStep} of {totalSteps}</span>
                <span>{Math.round(getProgressPercentage())}% complete</span>
              </div>
              <Progress value={getProgressPercentage()} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-purple-700 font-semibold">{currentStep}</span>
            </div>
            <div>
              <CardTitle>
                {currentStep === 1 && 'Choose Your Path'}
                {currentStep === 2 && 'Company Information'}
                {currentStep === 3 && 'Your Goals'}
                {currentStep === 4 && 'Current Process'}
                {currentStep === 5 && 'Ready to Launch'}
              </CardTitle>
              <CardDescription>
                {currentStep === 1 && 'Tell us about your organization type'}
                {currentStep === 2 && 'Basic details about your company'}
                {currentStep === 3 && 'What you want to achieve with TestBro'}
                {currentStep === 4 && 'Your current testing approach'}
                {currentStep === 5 && 'Review and start your testing journey'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: User Type Selection */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Agency Option */}
                <Card 
                  className={`cursor-pointer transition-all ${
                    formData.userType === 'agency' 
                      ? 'border-blue-500 bg-blue-50 shadow-md' 
                      : 'hover:shadow-md hover:border-gray-300'
                  }`}
                  onClick={() => updateFormData('userType', 'agency')}
                >
                  <CardContent className="p-6">
                    <div className="text-center">
                      <Building className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">Agency / Development Team</h3>
                      <p className="text-gray-600 mb-4">
                        Deliver professional testing services to multiple clients
                      </p>
                      <div className="space-y-2 text-left">
                        <div className="flex items-center text-sm text-blue-700">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          <span>White-label reports</span>
                        </div>
                        <div className="flex items-center text-sm text-blue-700">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          <span>Client ROI dashboards</span>
                        </div>
                        <div className="flex items-center text-sm text-blue-700">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          <span>Team collaboration</span>
                        </div>
                        <div className="flex items-center text-sm text-blue-700">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          <span>Multi-project management</span>
                        </div>
                      </div>
                      {formData.userType === 'agency' && (
                        <Badge className="mt-4 bg-blue-100 text-blue-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Selected
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* SMB Option */}
                <Card 
                  className={`cursor-pointer transition-all ${
                    formData.userType === 'smb' 
                      ? 'border-green-500 bg-green-50 shadow-md' 
                      : 'hover:shadow-md hover:border-gray-300'
                  }`}
                  onClick={() => updateFormData('userType', 'smb')}
                >
                  <CardContent className="p-6">
                    <div className="text-center">
                      <Users className="w-12 h-12 text-green-600 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">Small/Medium Business</h3>
                      <p className="text-gray-600 mb-4">
                        Scale your business with reliable automated testing
                      </p>
                      <div className="space-y-2 text-left">
                        <div className="flex items-center text-sm text-green-700">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          <span>Instant cost savings</span>
                        </div>
                        <div className="flex items-center text-sm text-green-700">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          <span>Easy setup & maintenance</span>
                        </div>
                        <div className="flex items-center text-sm text-green-700">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          <span>Business impact tracking</span>
                        </div>
                        <div className="flex items-center text-sm text-green-700">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          <span>Revenue protection</span>
                        </div>
                      </div>
                      {formData.userType === 'smb' && (
                        <Badge className="mt-4 bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Selected
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {formData.userType && (
                <div className="mt-6 text-center">
                  <Button onClick={nextStep} size="lg" className="px-8">
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Company Information */}
          {currentStep === 2 && (
            <div className="space-y-6">
              {formData.userType && (
                <div className="p-4 bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center">
                    {getUserTypeConfig().icon}
                    <div className="ml-3">
                      <h4 className="font-semibold text-gray-900">{getUserTypeConfig().title}</h4>
                      <p className="text-sm text-gray-600">{getUserTypeConfig().subtitle}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    placeholder="Enter your company name"
                    value={formData.companyName || ''}
                    onChange={(e) => updateFormData('companyName', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="industry">Industry</Label>
                  <Select value={formData.industry || ''} onValueChange={(value) => updateFormData('industry', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your industry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ecommerce">E-commerce</SelectItem>
                      <SelectItem value="saas">SaaS</SelectItem>
                      <SelectItem value="fintech">FinTech</SelectItem>
                      <SelectItem value="healthcare">Healthcare</SelectItem>
                      <SelectItem value="education">Education</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="consulting">Consulting</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="teamSize">Team Size</Label>
                  <Select value={formData.teamSize || ''} onValueChange={(value) => updateFormData('teamSize', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select team size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-5">1-5 people</SelectItem>
                      <SelectItem value="6-20">6-20 people</SelectItem>
                      <SelectItem value="21-50">21-50 people</SelectItem>
                      <SelectItem value="51-100">51-100 people</SelectItem>
                      <SelectItem value="100+">100+ people</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="monthlyRevenue">Monthly Revenue Range</Label>
                  <Select value={formData.monthlyRevenue || ''} onValueChange={(value) => updateFormData('monthlyRevenue', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select revenue range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0-10k">$0 - $10K</SelectItem>
                      <SelectItem value="10k-50k">$10K - $50K</SelectItem>
                      <SelectItem value="50k-100k">$50K - $100K</SelectItem>
                      <SelectItem value="100k-500k">$100K - $500K</SelectItem>
                      <SelectItem value="500k+">$500K+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="websiteUrl">Main Website URL</Label>
                <Input
                  id="websiteUrl"
                  placeholder="https://your-website.com"
                  value={formData.websiteUrl || ''}
                  onChange={(e) => updateFormData('websiteUrl', e.target.value)}
                />
              </div>

              {formData.companyName && formData.industry && (
                <div className="text-center">
                  <Button onClick={nextStep} size="lg" className="px-8">
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Goals */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <Label htmlFor="mainGoal">Primary Goal with TestBro</Label>
                <Select value={formData.mainGoal || ''} onValueChange={(value) => updateFormData('mainGoal', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="What's your main objective?" />
                  </SelectTrigger>
                  <SelectContent>
                    {formData.userType === 'agency' ? (
                      <>
                        <SelectItem value="client-reports">Generate professional client reports</SelectItem>
                        <SelectItem value="prove-roi">Prove ROI to clients</SelectItem>
                        <SelectItem value="scale-testing">Scale testing services across clients</SelectItem>
                        <SelectItem value="reduce-costs">Reduce manual testing costs</SelectItem>
                        <SelectItem value="team-efficiency">Improve team efficiency</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="save-money">Save money on testing</SelectItem>
                        <SelectItem value="prevent-bugs">Prevent critical bugs</SelectItem>
                        <SelectItem value="improve-quality">Improve product quality</SelectItem>
                        <SelectItem value="faster-releases">Release features faster</SelectItem>
                        <SelectItem value="protect-revenue">Protect revenue from downtime</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {formData.mainGoal && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <Target className="w-8 h-8 text-blue-600 mt-1" />
                      <div>
                        <h4 className="font-semibold text-blue-900 mb-2">Perfect! We'll optimize TestBro for your goal</h4>
                        <p className="text-blue-800 text-sm">
                          {formData.mainGoal === 'client-reports' && 'We\'ll set up white-label reporting templates and ROI dashboards for your client presentations.'}
                          {formData.mainGoal === 'prove-roi' && 'We\'ll configure business impact calculators and cost savings metrics to demonstrate clear value.'}
                          {formData.mainGoal === 'save-money' && 'We\'ll track your testing cost savings and show you exactly how much you\'re saving monthly.'}
                          {formData.mainGoal === 'prevent-bugs' && 'We\'ll set up comprehensive test coverage to catch critical issues before they reach users.'}
                          {formData.mainGoal === 'scale-testing' && 'We\'ll configure multi-client project management and team collaboration tools.'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {formData.mainGoal && (
                <div className="text-center">
                  <Button onClick={nextStep} size="lg" className="px-8">
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Current Process */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <Label htmlFor="currentTesting">Current Testing Process</Label>
                <Select value={formData.currentTestingProcess || ''} onValueChange={(value) => updateFormData('currentTestingProcess', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="How do you currently test?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Mostly manual testing</SelectItem>
                    <SelectItem value="some-automation">Some basic automation</SelectItem>
                    <SelectItem value="advanced-automation">Advanced automation setup</SelectItem>
                    <SelectItem value="no-testing">No formal testing process</SelectItem>
                    <SelectItem value="outsourced">Outsourced to third party</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.currentTestingProcess && (
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <Zap className="w-8 h-8 text-green-600 mt-1" />
                      <div>
                        <h4 className="font-semibold text-green-900 mb-2">Great! We know exactly how to help</h4>
                        <div className="space-y-2 text-green-800 text-sm">
                          {formData.currentTestingProcess === 'manual' && (
                            <>
                              <p>• We'll show you how to automate 80% of your manual tests</p>
                              <p>• Expect to save 40+ hours monthly and $5,000+ in testing costs</p>
                              <p>• You'll catch 3x more bugs with consistent automated coverage</p>
                            </>
                          )}
                          {formData.currentTestingProcess === 'some-automation' && (
                            <>
                              <p>• We'll help you scale your automation to full coverage</p>
                              <p>• Add AI-powered test generation for complex scenarios</p>
                              <p>• Integrate business impact tracking and ROI reporting</p>
                            </>
                          )}
                          {formData.currentTestingProcess === 'no-testing' && (
                            <>
                              <p>• We'll set up your entire testing foundation from scratch</p>
                              <p>• Start with critical user journeys to protect revenue immediately</p>
                              <p>• Prevent costly bugs and downtime with minimal setup time</p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {formData.currentTestingProcess && (
                <div className="text-center">
                  <Button onClick={nextStep} size="lg" className="px-8">
                    Almost Done!
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Step 5: Ready to Launch */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-purple-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="w-10 h-10 text-purple-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">You're All Set!</h3>
                <p className="text-lg text-gray-600 mb-6">
                  Based on your responses, we've customized TestBro for your {formData.userType === 'agency' ? 'agency' : 'business'} needs.
                </p>
              </div>

              {/* Summary */}
              <Card className="bg-gradient-to-r from-blue-50 to-green-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-center">Your Personalized Setup</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-white border border-blue-200 rounded-lg">
                      <DollarSign className="w-8 h-8 text-green-600 mx-auto mb-2" />
                      <h4 className="font-semibold text-gray-900">Expected Savings</h4>
                      <p className="text-2xl font-bold text-green-600">$8K+</p>
                      <p className="text-sm text-gray-600">Monthly cost reduction</p>
                    </div>
                    
                    <div className="text-center p-4 bg-white border border-green-200 rounded-lg">
                      <Clock className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                      <h4 className="font-semibold text-gray-900">Time Saved</h4>
                      <p className="text-2xl font-bold text-blue-600">60h+</p>
                      <p className="text-sm text-gray-600">Manual testing eliminated</p>
                    </div>
                    
                    <div className="text-center p-4 bg-white border border-purple-200 rounded-lg">
                      <Target className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                      <h4 className="font-semibold text-gray-900">Setup Time</h4>
                      <p className="text-2xl font-bold text-purple-600">&lt;5 min</p>
                      <p className="text-sm text-gray-600">To first automated test</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="text-center space-y-4">
                <Button onClick={completeWizard} size="lg" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-4 text-lg">
                  <Play className="w-5 h-5 mr-2" />
                  Generate My First AI Test Now!
                </Button>
                
                <p className="text-sm text-gray-600">
                  You'll get your "aha" moment in the next 4 seconds ⚡
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bottom Navigation */}
      {currentStep > 1 && currentStep < 5 && (
        <div className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={() => setCurrentStep(currentStep - 1)}
          >
            ← Previous
          </Button>
          <div className="flex space-x-2">
            {Array.from({ length: totalSteps }).map((_, index) => (
              <div
                key={index}
                className={`w-3 h-3 rounded-full ${
                  index + 1 <= currentStep ? 'bg-purple-600' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}