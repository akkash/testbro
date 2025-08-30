import React, { useState, useEffect } from 'react'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  Users,
  ShoppingCart,
  AlertTriangle,
  CheckCircle,
  Calculator,
  Target,
  Zap,
  Award
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card'
import { Button } from './button'
import { Input } from './input'
import { Label } from './label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'
import { Badge } from './badge'
import { Progress } from './progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs'

export interface BusinessMetrics {
  // Revenue Impact
  monthlyRevenue: number
  conversionRate: number
  averageOrderValue: number
  monthlyVisitors: number
  
  // Cost Metrics
  developerHourlyRate: number
  qaHourlyRate: number
  averageFixTime: number
  deploymentFrequency: number
  
  // Current State
  currentTestCoverage: number
  manualTestingHours: number
  bugFixCost: number
  downtime: number
}

export interface ROICalculation {
  // Savings
  monthlySavings: number
  yearlyProjection: number
  timesSaved: number
  issuesPrevented: number
  
  // Revenue Protection
  revenueProtected: number
  conversionImprovements: number
  uptimeImprovement: number
  
  // Efficiency Gains
  deploymentSpeedUp: number
  testingEfficiency: number
  developerProductivity: number
  
  // ROI Metrics
  roiPercentage: number
  paybackPeriod: number
  netBenefit: number
}

interface BusinessImpactCalculatorProps {
  initialMetrics?: Partial<BusinessMetrics>
  onCalculationUpdate?: (calculation: ROICalculation) => void
  className?: string
}

export function BusinessImpactCalculator({
  initialMetrics,
  onCalculationUpdate,
  className = ''
}: BusinessImpactCalculatorProps) {
  const [metrics, setMetrics] = useState<BusinessMetrics>({
    monthlyRevenue: 100000,
    conversionRate: 2.5,
    averageOrderValue: 75,
    monthlyVisitors: 50000,
    developerHourlyRate: 100,
    qaHourlyRate: 80,
    averageFixTime: 4,
    deploymentFrequency: 8,
    currentTestCoverage: 60,
    manualTestingHours: 40,
    bugFixCost: 2000,
    downtime: 2,
    ...initialMetrics
  })

  const [calculation, setCalculation] = useState<ROICalculation | null>(null)
  const [selectedIndustry, setSelectedIndustry] = useState('ecommerce')

  useEffect(() => {
    calculateROI()
  }, [metrics])

  const calculateROI = () => {
    // Time Savings Calculations
    const automatedTestingTimeSaved = metrics.manualTestingHours * 0.8 // 80% automation
    const fasterDeployments = metrics.deploymentFrequency * 2 // 2 hours saved per deployment
    const reducedBugFixTime = (metrics.averageFixTime * 0.6) * 10 // 60% fewer bugs, 10 bugs/month
    const totalTimeSaved = automatedTestingTimeSaved + fasterDeployments + reducedBugFixTime

    // Cost Savings
    const testingCostSavings = automatedTestingTimeSaved * metrics.qaHourlyRate
    const deploymentCostSavings = fasterDeployments * metrics.developerHourlyRate
    const bugFixCostSavings = metrics.bugFixCost * 0.6 * 10 // 60% fewer bugs
    const monthlySavings = testingCostSavings + deploymentCostSavings + bugFixCostSavings

    // Revenue Protection
    const uptimeImprovement = (metrics.downtime * 0.7) / 100 // 70% less downtime
    const revenueFromUptime = metrics.monthlyRevenue * uptimeImprovement
    const conversionImprovement = metrics.conversionRate * 0.15 // 15% improvement
    const revenueFromConversion = (metrics.monthlyVisitors * conversionImprovement * metrics.averageOrderValue) / 100
    const revenueProtected = revenueFromUptime + revenueFromConversion

    // Efficiency Metrics
    const testCoverageImprovement = (85 - metrics.currentTestCoverage) / 100
    const deploymentSpeedUp = 50 // 50% faster deployments
    const testingEfficiency = 75 // 75% more efficient testing

    // ROI Calculations
    const toolCost = 299 // Monthly tool cost
    const netBenefit = monthlySavings + revenueProtected - toolCost
    const roiPercentage = (netBenefit / toolCost) * 100
    const paybackPeriod = toolCost / (monthlySavings + revenueProtected / 12)

    const calculatedROI: ROICalculation = {
      monthlySavings,
      yearlyProjection: (monthlySavings + revenueProtected) * 12,
      timesSaved: totalTimeSaved,
      issuesPrevented: 6, // 6 major issues prevented per month
      revenueProtected,
      conversionImprovements: conversionImprovement,
      uptimeImprovement: uptimeImprovement * 100,
      deploymentSpeedUp,
      testingEfficiency,
      developerProductivity: 25, // 25% productivity improvement
      roiPercentage,
      paybackPeriod,
      netBenefit
    }

    setCalculation(calculatedROI)
    onCalculationUpdate?.(calculatedROI)
  }

  const getIndustryBenchmarks = (industry: string) => {
    const benchmarks = {
      ecommerce: {
        conversionRate: 2.86,
        averageOrderValue: 85,
        downtimeCost: 0.05 // 5% of revenue per hour
      },
      saas: {
        conversionRate: 3.2,
        averageOrderValue: 120,
        downtimeCost: 0.08 // 8% of revenue per hour
      },
      fintech: {
        conversionRate: 2.1,
        averageOrderValue: 250,
        downtimeCost: 0.12 // 12% of revenue per hour
      }
    }
    return benchmarks[industry as keyof typeof benchmarks] || benchmarks.ecommerce
  }

  if (!calculation) return null

  return (
    <div className={`space-y-6 ${className}`}>
      <Tabs defaultValue="calculator" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="calculator">ROI Calculator</TabsTrigger>
          <TabsTrigger value="results">Impact Analysis</TabsTrigger>
          <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
        </TabsList>

        <TabsContent value="calculator" className="space-y-6">
          {/* Input Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calculator className="w-5 h-5 mr-2" />
                Business Metrics Input
              </CardTitle>
              <CardDescription>
                Enter your current business metrics to calculate automation ROI
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="industry">Industry</Label>
                  <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ecommerce">E-commerce</SelectItem>
                      <SelectItem value="saas">SaaS</SelectItem>
                      <SelectItem value="fintech">FinTech</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="revenue">Monthly Revenue ($)</Label>
                  <Input
                    id="revenue"
                    type="number"
                    value={metrics.monthlyRevenue}
                    onChange={(e) => setMetrics({...metrics, monthlyRevenue: Number(e.target.value)})}
                  />
                </div>

                <div>
                  <Label htmlFor="visitors">Monthly Visitors</Label>
                  <Input
                    id="visitors"
                    type="number"
                    value={metrics.monthlyVisitors}
                    onChange={(e) => setMetrics({...metrics, monthlyVisitors: Number(e.target.value)})}
                  />
                </div>

                <div>
                  <Label htmlFor="conversion">Conversion Rate (%)</Label>
                  <Input
                    id="conversion"
                    type="number"
                    step="0.1"
                    value={metrics.conversionRate}
                    onChange={(e) => setMetrics({...metrics, conversionRate: Number(e.target.value)})}
                  />
                </div>

                <div>
                  <Label htmlFor="aov">Average Order Value ($)</Label>
                  <Input
                    id="aov"
                    type="number"
                    value={metrics.averageOrderValue}
                    onChange={(e) => setMetrics({...metrics, averageOrderValue: Number(e.target.value)})}
                  />
                </div>

                <div>
                  <Label htmlFor="devRate">Developer Rate ($/hour)</Label>
                  <Input
                    id="devRate"
                    type="number"
                    value={metrics.developerHourlyRate}
                    onChange={(e) => setMetrics({...metrics, developerHourlyRate: Number(e.target.value)})}
                  />
                </div>

                <div>
                  <Label htmlFor="qaRate">QA Rate ($/hour)</Label>
                  <Input
                    id="qaRate"
                    type="number"
                    value={metrics.qaHourlyRate}
                    onChange={(e) => setMetrics({...metrics, qaHourlyRate: Number(e.target.value)})}
                  />
                </div>

                <div>
                  <Label htmlFor="testHours">Manual Testing (hours/month)</Label>
                  <Input
                    id="testHours"
                    type="number"
                    value={metrics.manualTestingHours}
                    onChange={(e) => setMetrics({...metrics, manualTestingHours: Number(e.target.value)})}
                  />
                </div>

                <div>
                  <Label htmlFor="downtime">Monthly Downtime (%)</Label>
                  <Input
                    id="downtime"
                    type="number"
                    step="0.1"
                    value={metrics.downtime}
                    onChange={(e) => setMetrics({...metrics, downtime: Number(e.target.value)})}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          {/* ROI Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Monthly Savings</p>
                    <p className="text-2xl font-bold text-green-600">
                      ${calculation.monthlySavings.toLocaleString()}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-600" />
                </div>
                <div className="mt-2">
                  <Badge className="bg-green-100 text-green-800">
                    +{Math.round(calculation.roiPercentage)}% ROI
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Time Saved</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {Math.round(calculation.timesSaved)}h
                    </p>
                  </div>
                  <Clock className="w-8 h-8 text-blue-600" />
                </div>
                <div className="mt-2">
                  <Badge className="bg-blue-100 text-blue-800">
                    Per Month
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Revenue Protected</p>
                    <p className="text-2xl font-bold text-purple-600">
                      ${calculation.revenueProtected.toLocaleString()}
                    </p>
                  </div>
                  <Target className="w-8 h-8 text-purple-600" />
                </div>
                <div className="mt-2">
                  <Badge className="bg-purple-100 text-purple-800">
                    Monthly
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Payback Period</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {Math.round(calculation.paybackPeriod)} days
                    </p>
                  </div>
                  <Award className="w-8 h-8 text-orange-600" />
                </div>
                <div className="mt-2">
                  <Badge className="bg-orange-100 text-orange-800">
                    Break Even
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Impact Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Cost Savings Breakdown</CardTitle>
                <CardDescription>Monthly cost reductions from automation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Reduced Manual Testing</span>
                  <span className="font-medium">${Math.round(metrics.manualTestingHours * 0.8 * metrics.qaHourlyRate).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Faster Deployments</span>
                  <span className="font-medium">${Math.round(metrics.deploymentFrequency * 2 * metrics.developerHourlyRate).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Fewer Bug Fixes</span>
                  <span className="font-medium">${Math.round(metrics.bugFixCost * 0.6 * 10).toLocaleString()}</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex items-center justify-between font-medium">
                    <span>Total Monthly Savings</span>
                    <span className="text-green-600">${calculation.monthlySavings.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Impact</CardTitle>
                <CardDescription>Protected and improved revenue streams</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Improved Uptime</span>
                  <span className="font-medium">+{Math.round(calculation.uptimeImprovement * 100) / 100}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Better Conversion Rate</span>
                  <span className="font-medium">+{calculation.conversionImprovements.toFixed(2)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Fewer Failed Transactions</span>
                  <span className="font-medium">-{calculation.issuesPrevented} issues/month</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex items-center justify-between font-medium">
                    <span>Revenue Protected</span>
                    <span className="text-purple-600">${calculation.revenueProtected.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Efficiency Improvements */}
          <Card>
            <CardHeader>
              <CardTitle>Operational Efficiency Gains</CardTitle>
              <CardDescription>Productivity and speed improvements</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Zap className="w-8 h-8 text-blue-600" />
                  </div>
                  <h4 className="font-medium text-gray-900">Deployment Speed</h4>
                  <p className="text-2xl font-bold text-blue-600 mt-1">+{calculation.deploymentSpeedUp}%</p>
                  <p className="text-sm text-gray-600 mt-1">Faster releases</p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h4 className="font-medium text-gray-900">Testing Efficiency</h4>
                  <p className="text-2xl font-bold text-green-600 mt-1">+{calculation.testingEfficiency}%</p>
                  <p className="text-sm text-gray-600 mt-1">More thorough testing</p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Users className="w-8 h-8 text-purple-600" />
                  </div>
                  <h4 className="font-medium text-gray-900">Developer Productivity</h4>
                  <p className="text-2xl font-bold text-purple-600 mt-1">+{calculation.developerProductivity}%</p>
                  <p className="text-sm text-gray-600 mt-1">Focus on features</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Client Presentation Summary */}
          <Card className="bg-gradient-to-r from-blue-50 to-green-50 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Award className="w-5 h-5 mr-2 text-blue-600" />
                Client Presentation Summary
              </CardTitle>
              <CardDescription>
                Key points to share with stakeholders and clients
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-white border border-blue-200 rounded-lg">
                    <h4 className="font-semibold text-blue-800 mb-2">💰 Financial Impact</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• ${calculation.monthlySavings.toLocaleString()} monthly savings</li>
                      <li>• ${calculation.yearlyProjection.toLocaleString()} annual projection</li>
                      <li>• {Math.round(calculation.roiPercentage)}% return on investment</li>
                      <li>• {Math.round(calculation.paybackPeriod)} day payback period</li>
                    </ul>
                  </div>
                  
                  <div className="p-4 bg-white border border-green-200 rounded-lg">
                    <h4 className="font-semibold text-green-800 mb-2">🎯 Business Benefits</h4>
                    <ul className="text-sm text-green-700 space-y-1">
                      <li>• {Math.round(calculation.timesSaved)} hours saved monthly</li>
                      <li>• {calculation.issuesPrevented} critical issues prevented</li>
                      <li>• +{calculation.deploymentSpeedUp}% faster time-to-market</li>
                      <li>• {Math.round(calculation.uptimeImprovement * 100) / 100}% uptime improvement</li>
                    </ul>
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
                  <h4 className="font-semibold text-purple-800 mb-2">🏆 Competitive Advantage</h4>
                  <p className="text-sm text-purple-700">
                    Your testing automation program delivers measurable business value with ${calculation.monthlySavings.toLocaleString()} 
                    in monthly savings and ${calculation.revenueProtected.toLocaleString()} in protected revenue. This positions you ahead of 
                    competitors who rely on manual testing, giving you a {Math.round(calculation.roiPercentage)}% ROI advantage.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scenarios" className="space-y-6">
          <ScenarioComparison initialMetrics={metrics} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface ScenarioComparisonProps {
  initialMetrics: BusinessMetrics
}

function ScenarioComparison({ initialMetrics }: ScenarioComparisonProps) {
  const scenarios = [
    {
      name: 'Current State',
      description: 'Manual testing, minimal automation',
      metrics: initialMetrics,
      color: 'red'
    },
    {
      name: 'TestBro Basic',
      description: 'Automated critical flows, basic monitoring',
      metrics: {
        ...initialMetrics,
        currentTestCoverage: 75,
        manualTestingHours: initialMetrics.manualTestingHours * 0.6,
        downtime: initialMetrics.downtime * 0.8
      },
      color: 'blue'
    },
    {
      name: 'TestBro Pro',
      description: 'Full automation, AI insights, client reports',
      metrics: {
        ...initialMetrics,
        currentTestCoverage: 90,
        manualTestingHours: initialMetrics.manualTestingHours * 0.3,
        downtime: initialMetrics.downtime * 0.5,
        conversionRate: initialMetrics.conversionRate * 1.15
      },
      color: 'green'
    }
  ]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Scenario Comparison</CardTitle>
          <CardDescription>
            Compare different levels of testing automation implementation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {scenarios.map((scenario, index) => (
              <Card key={index} className={`border-2 ${
                scenario.color === 'red' ? 'border-red-200 bg-red-50' :
                scenario.color === 'blue' ? 'border-blue-200 bg-blue-50' :
                'border-green-200 bg-green-50'
              }`}>
                <CardHeader>
                  <CardTitle className="text-lg">{scenario.name}</CardTitle>
                  <CardDescription>{scenario.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Test Coverage</span>
                      <span className="font-medium">{scenario.metrics.currentTestCoverage}%</span>
                    </div>
                    <Progress value={scenario.metrics.currentTestCoverage} className="h-2" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Manual Testing</span>
                      <span className="font-medium">{scenario.metrics.manualTestingHours}h/month</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Downtime</span>
                      <span className="font-medium">{scenario.metrics.downtime}%</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="text-center">
                      <p className={`text-lg font-bold ${
                        scenario.color === 'red' ? 'text-red-600' :
                        scenario.color === 'blue' ? 'text-blue-600' :
                        'text-green-600'
                      }`}>
                        ${Math.round((scenario.metrics.manualTestingHours * 0.8 * 80) + 5000).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-600">Monthly Cost</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}