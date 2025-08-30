import React, { useState, useEffect } from 'react'
import {
  TrendingUp,
  DollarSign,
  Clock,
  Users,
  Target,
  Award,
  BarChart3,
  Download,
  Share,
  CheckCircle,
  Building,
  ArrowRight
} from 'lucide-react'
import { Button } from './button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card'
import { Badge } from './badge'
import { Progress } from './progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'
import { BusinessImpactCalculator } from './business-impact-calculator'
import { AgencyClientReporter } from './agency-client-reporter'

export interface ClientROIData {
  clientId: string
  clientName: string
  industry: string
  startDate: Date
  monthlyRevenue: number
  metrics: {
    testsSaved: number
    timeSaved: number
    costSavings: number
    bugsFound: number
    uptimeImprovement: number
    conversionImprovement: number
  }
  roi: {
    monthlyValue: number
    yearlyProjection: number
    roiPercentage: number
    paybackPeriod: number
  }
}

interface AgencyROIDashboardProps {
  className?: string
}

export function AgencyROIDashboard({ className = '' }: AgencyROIDashboardProps) {
  const [selectedClient, setSelectedClient] = useState<string>('all')
  const [timeRange, setTimeRange] = useState('3m')
  const [clients, setClients] = useState<ClientROIData[]>([])
  const [loading, setLoading] = useState(true)

  // Mock client data
  useEffect(() => {
    const mockClients: ClientROIData[] = [
      {
        clientId: 'client-1',
        clientName: 'TechCorp Solutions',
        industry: 'SaaS',
        startDate: new Date('2024-06-01'),
        monthlyRevenue: 250000,
        metrics: {
          testsSaved: 45,
          timeSaved: 120,
          costSavings: 18000,
          bugsFound: 23,
          uptimeImprovement: 15,
          conversionImprovement: 8
        },
        roi: {
          monthlyValue: 18000,
          yearlyProjection: 216000,
          roiPercentage: 450,
          paybackPeriod: 8
        }
      },
      {
        clientId: 'client-2',
        clientName: 'E-Shop Masters',
        industry: 'E-commerce',
        startDate: new Date('2024-07-15'),
        monthlyRevenue: 150000,
        metrics: {
          testsSaved: 32,
          timeSaved: 80,
          costSavings: 12000,
          bugsFound: 18,
          uptimeImprovement: 12,
          conversionImprovement: 12
        },
        roi: {
          monthlyValue: 12000,
          yearlyProjection: 144000,
          roiPercentage: 380,
          paybackPeriod: 12
        }
      },
      {
        clientId: 'client-3',
        clientName: 'FinanceFlow Inc',
        industry: 'FinTech',
        startDate: new Date('2024-05-20'),
        monthlyRevenue: 400000,
        metrics: {
          testsSaved: 67,
          timeSaved: 180,
          costSavings: 28000,
          bugsFound: 34,
          uptimeImprovement: 18,
          conversionImprovement: 6
        },
        roi: {
          monthlyValue: 28000,
          yearlyProjection: 336000,
          roiPercentage: 520,
          paybackPeriod: 6
        }
      }
    ]

    setTimeout(() => {
      setClients(mockClients)
      setLoading(false)
    }, 1000)
  }, [])

  const aggregatedMetrics = clients.reduce((acc, client) => ({
    totalClients: clients.length,
    totalSavings: acc.totalSavings + client.metrics.costSavings,
    totalTimeSaved: acc.totalTimeSaved + client.metrics.timeSaved,
    averageROI: (acc.averageROI + client.roi.roiPercentage) / 2,
    totalBugsFound: acc.totalBugsFound + client.metrics.bugsFound,
    totalTestsSaved: acc.totalTestsSaved + client.metrics.testsSaved
  }), {
    totalClients: 0,
    totalSavings: 0,
    totalTimeSaved: 0,
    averageROI: 0,
    totalBugsFound: 0,
    totalTestsSaved: 0
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading ROI data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Hero Section */}
      <Card className="bg-gradient-to-r from-blue-50 via-purple-50 to-green-50 border-blue-200">
        <CardContent className="p-8">
          <div className="flex items-center justify-between">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-bold text-gray-900 mb-3 flex items-center">
                <Award className="w-8 h-8 mr-3 text-blue-600" />
                Agency ROI Dashboard
              </h2>
              <p className="text-lg text-gray-700 mb-4">
                Prove your testing automation value to clients with comprehensive ROI metrics and professional reports.
              </p>
              <div className="flex items-center space-x-6 text-sm">
                <div className="flex items-center text-green-700">
                  <Building className="w-4 h-4 mr-2" />
                  <span className="font-medium">{aggregatedMetrics.totalClients} Active Clients</span>
                </div>
                <div className="flex items-center text-blue-700">
                  <DollarSign className="w-4 h-4 mr-2" />
                  <span className="font-medium">${aggregatedMetrics.totalSavings.toLocaleString()}/month saved</span>
                </div>
                <div className="flex items-center text-purple-700">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  <span className="font-medium">{Math.round(aggregatedMetrics.averageROI)}% avg ROI</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-blue-600">💼</div>
              <div className="text-sm text-blue-700 mt-2">Agency Success</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Client</label>
            <Select value={selectedClient} onValueChange={setSelectedClient}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {clients.map(client => (
                  <SelectItem key={client.clientId} value={client.clientId}>
                    {client.clientName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline">
            <Share className="w-4 h-4 mr-2" />
            Share Report
          </Button>
          <Button>
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">📊 Overview</TabsTrigger>
          <TabsTrigger value="clients">👥 Client Details</TabsTrigger>
          <TabsTrigger value="roi">💰 ROI Analysis</TabsTrigger>
          <TabsTrigger value="reports">📋 Reports</TabsTrigger>
          <TabsTrigger value="calculator">🧮 Calculator</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Monthly Savings</p>
                    <p className="text-2xl font-bold text-green-600">
                      ${aggregatedMetrics.totalSavings.toLocaleString()}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-600" />
                </div>
                <div className="mt-2">
                  <Badge className="bg-green-100 text-green-800">
                    ${(aggregatedMetrics.totalSavings * 12).toLocaleString()} annually
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
                      {aggregatedMetrics.totalTimeSaved}h
                    </p>
                  </div>
                  <Clock className="w-8 h-8 text-blue-600" />
                </div>
                <div className="mt-2">
                  <Badge className="bg-blue-100 text-blue-800">
                    {Math.round(aggregatedMetrics.totalTimeSaved / aggregatedMetrics.totalClients)}h per client
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Average ROI</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {Math.round(aggregatedMetrics.averageROI)}%
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-purple-600" />
                </div>
                <div className="mt-2">
                  <Badge className="bg-purple-100 text-purple-800">
                    Across {aggregatedMetrics.totalClients} clients
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Issues Prevented</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {aggregatedMetrics.totalBugsFound}
                    </p>
                  </div>
                  <Target className="w-8 h-8 text-orange-600" />
                </div>
                <div className="mt-2">
                  <Badge className="bg-orange-100 text-orange-800">
                    This month
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Client Performance Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                Client Performance Overview
              </CardTitle>
              <CardDescription>
                ROI and impact metrics across all your clients
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {clients.map((client) => (
                  <div key={client.clientId} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-900">{client.clientName}</h4>
                        <p className="text-sm text-gray-600">{client.industry}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-600">
                          ${client.metrics.costSavings.toLocaleString()}/mo
                        </div>
                        <div className="text-sm text-green-700">{client.roi.roiPercentage}% ROI</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-gray-600">Time Saved</div>
                        <div className="font-medium">{client.metrics.timeSaved}h</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Bugs Found</div>
                        <div className="font-medium">{client.metrics.bugsFound}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Uptime +</div>
                        <div className="font-medium text-green-600">+{client.metrics.uptimeImprovement}%</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Conversion +</div>
                        <div className="font-medium text-blue-600">+{client.metrics.conversionImprovement}%</div>
                      </div>
                    </div>
                    
                    <div className="mt-3 flex items-center justify-between">
                      <Badge variant="outline">
                        Since {client.startDate.toLocaleDateString()}
                      </Badge>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Success Highlights */}
          <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center text-green-800">
                <CheckCircle className="w-5 h-5 mr-2" />
                Success Highlights
              </CardTitle>
              <CardDescription className="text-green-700">
                Your biggest wins this month
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-white border border-green-200 rounded-lg">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    ${(aggregatedMetrics.totalSavings * 12).toLocaleString()}
                  </div>
                  <div className="text-sm text-green-700">
                    Annual savings delivered to clients
                  </div>
                </div>
                
                <div className="text-center p-4 bg-white border border-blue-200 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {Math.round(aggregatedMetrics.totalTimeSaved * 4.33)}h
                  </div>
                  <div className="text-sm text-blue-700">
                    Total manual testing hours eliminated
                  </div>
                </div>
                
                <div className="text-center p-4 bg-white border border-purple-200 rounded-lg">
                  <div className="text-3xl font-bold text-purple-600 mb-2">
                    {Math.round(aggregatedMetrics.averageROI)}%
                  </div>
                  <div className="text-sm text-purple-700">
                    Average ROI across all clients
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clients" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {clients.map((client) => (
              <Card key={client.clientId} className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{client.clientName}</CardTitle>
                      <CardDescription>{client.industry}</CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">
                        ${client.metrics.costSavings.toLocaleString()}
                      </div>
                      <div className="text-sm text-green-700">Monthly savings</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>ROI Performance</span>
                        <span>{client.roi.roiPercentage}%</span>
                      </div>
                      <Progress value={Math.min(client.roi.roiPercentage / 5, 100)} className="h-2" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Time Saved</span>
                          <span className="font-medium">{client.metrics.timeSaved}h</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Bugs Found</span>
                          <span className="font-medium">{client.metrics.bugsFound}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Uptime +</span>
                          <span className="font-medium text-green-600">+{client.metrics.uptimeImprovement}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Conversion +</span>
                          <span className="font-medium text-blue-600">+{client.metrics.conversionImprovement}%</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex items-center justify-between">
                      <Badge variant="outline">
                        Since {client.startDate.toLocaleDateString()}
                      </Badge>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="roi" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>ROI Analysis Across All Clients</CardTitle>
              <CardDescription>
                Compare performance and identify optimization opportunities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {clients.map((client) => (
                  <div key={client.clientId} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-semibold text-gray-900">{client.clientName}</h4>
                        <p className="text-sm text-gray-600">{client.industry}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-purple-600">{client.roi.roiPercentage}%</div>
                        <div className="text-sm text-purple-700">ROI</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-green-50 border border-green-200 rounded">
                        <div className="text-lg font-bold text-green-600">${client.roi.monthlyValue.toLocaleString()}</div>
                        <div className="text-xs text-green-700">Monthly Value</div>
                      </div>
                      <div className="text-center p-3 bg-blue-50 border border-blue-200 rounded">
                        <div className="text-lg font-bold text-blue-600">${client.roi.yearlyProjection.toLocaleString()}</div>
                        <div className="text-xs text-blue-700">Annual Projection</div>
                      </div>
                      <div className="text-center p-3 bg-purple-50 border border-purple-200 rounded">
                        <div className="text-lg font-bold text-purple-600">{client.roi.roiPercentage}%</div>
                        <div className="text-xs text-purple-700">ROI Percentage</div>
                      </div>
                      <div className="text-center p-3 bg-orange-50 border border-orange-200 rounded">
                        <div className="text-lg font-bold text-orange-600">{client.roi.paybackPeriod}</div>
                        <div className="text-xs text-orange-700">Payback (days)</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <AgencyClientReporter />
        </TabsContent>

        <TabsContent value="calculator" className="space-y-6">
          <BusinessImpactCalculator />
        </TabsContent>
      </Tabs>
    </div>
  )
}