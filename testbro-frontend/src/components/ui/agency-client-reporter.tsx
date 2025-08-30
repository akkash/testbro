import React, { useState, useEffect } from 'react'
import {
  FileText,
  Download,
  Calendar,
  Settings,
  Eye,
  Share,
  CheckCircle,
  TrendingUp,
  Users,
  Clock,
  DollarSign,
  Target,
  Award,
  Palette,
  Image,
  Loader2
} from 'lucide-react'
import { Button } from './button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card'
import { Input } from './input'
import { Label } from './label'
import { Textarea } from './textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'
import { Switch } from './switch'
import { Badge } from './badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './dialog'
import { PDFExportService } from '@/lib/utils/pdfExport'
import { DashboardService, ClientReportData } from '@/lib/services/dashboardService'

export interface ClientReportTemplate {
  id: string
  name: string
  description: string
  template: 'executive' | 'technical' | 'business' | 'monthly' | 'custom'
  sections: ReportSection[]
  branding: BrandingConfig
  schedule?: ScheduleConfig
  createdAt: Date
  lastUsed?: Date
}

export interface ReportSection {
  id: string
  type: 'summary' | 'metrics' | 'trends' | 'issues' | 'recommendations' | 'roi' | 'benchmarks'
  title: string
  enabled: boolean
  order: number
  customContent?: string
}

export interface BrandingConfig {
  logoUrl?: string
  primaryColor: string
  secondaryColor: string
  companyName: string
  footerText?: string
  brandingLevel: 'minimal' | 'standard' | 'full'
}

export interface ScheduleConfig {
  frequency: 'weekly' | 'monthly' | 'quarterly'
  dayOfWeek?: number
  dayOfMonth?: number
  recipients: string[]
  enabled: boolean
}

interface AgencyClientReporterProps {
  clientId?: string
  className?: string
}

export function AgencyClientReporter({ clientId, className = '' }: AgencyClientReporterProps) {
  const [templates, setTemplates] = useState<ClientReportTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<ClientReportTemplate | null>(null)
  const [reportData, setReportData] = useState<ClientReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [showBrandingDialog, setShowBrandingDialog] = useState(false)
  const [showScheduleDialog, setShowScheduleDialog] = useState(false)

  useEffect(() => {
    loadTemplates()
    loadReportData()
  }, [clientId])

  const loadTemplates = async () => {
    // Mock templates - in real app, load from API
    const mockTemplates: ClientReportTemplate[] = [
      {
        id: 'executive-summary',
        name: 'Executive Summary',
        description: 'High-level overview for C-suite and stakeholders',
        template: 'executive',
        sections: [
          { id: 'summary', type: 'summary', title: 'Executive Summary', enabled: true, order: 1 },
          { id: 'metrics', type: 'metrics', title: 'Key Metrics', enabled: true, order: 2 },
          { id: 'roi', type: 'roi', title: 'Business Impact', enabled: true, order: 3 },
          { id: 'recommendations', type: 'recommendations', title: 'Recommendations', enabled: true, order: 4 }
        ],
        branding: {
          primaryColor: '#3B82F6',
          secondaryColor: '#1E40AF',
          companyName: 'Your Agency',
          brandingLevel: 'standard'
        },
        createdAt: new Date()
      },
      {
        id: 'technical-detail',
        name: 'Technical Report',
        description: 'Detailed analysis for development teams',
        template: 'technical',
        sections: [
          { id: 'metrics', type: 'metrics', title: 'Performance Metrics', enabled: true, order: 1 },
          { id: 'trends', type: 'trends', title: 'Historical Trends', enabled: true, order: 2 },
          { id: 'issues', type: 'issues', title: 'Issues & Findings', enabled: true, order: 3 },
          { id: 'benchmarks', type: 'benchmarks', title: 'Industry Benchmarks', enabled: true, order: 4 }
        ],
        branding: {
          primaryColor: '#059669',
          secondaryColor: '#047857',
          companyName: 'Your Agency',
          brandingLevel: 'minimal'
        },
        createdAt: new Date()
      }
    ]
    setTemplates(mockTemplates)
    if (mockTemplates.length > 0) {
      setSelectedTemplate(mockTemplates[0])
    }
  }

  const loadReportData = async () => {
    try {
      const { data } = await DashboardService.getClientReportData(clientId || 'Default Client')
      setReportData(data)
    } catch (error) {
      console.error('Failed to load report data:', error)
    }
  }

  const generateReport = async (template: ClientReportTemplate, format: 'pdf' | 'preview' = 'pdf') => {
    if (!reportData) return

    setLoading(true)
    try {
      if (format === 'pdf') {
        // Customize report data with template branding
        const brandedReportData = {
          ...reportData,
          companyName: template.branding.companyName,
          branding: template.branding
        }
        
        await PDFExportService.generateClientReport(brandedReportData)
      } else {
        // Generate preview (could open in modal or new tab)
        console.log('Generating preview for template:', template.name)
      }
    } catch (error) {
      console.error('Failed to generate report:', error)
    } finally {
      setLoading(false)
    }
  }

  const scheduleReport = async (template: ClientReportTemplate, schedule: ScheduleConfig) => {
    try {
      // In real app, this would set up automated report generation
      console.log('Scheduling report:', template.name, schedule)
      
      // Update template with schedule
      const updatedTemplate = { ...template, schedule: { ...schedule, enabled: true } }
      setTemplates(prev => prev.map(t => t.id === template.id ? updatedTemplate : t))
      setSelectedTemplate(updatedTemplate)
    } catch (error) {
      console.error('Failed to schedule report:', error)
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Client Reports</h2>
          <p className="text-gray-600">Generate professional reports for your clients</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={() => setShowBrandingDialog(true)}>
            <Palette className="w-4 h-4 mr-2" />
            Branding
          </Button>
          <Button variant="outline" onClick={() => setShowScheduleDialog(true)}>
            <Calendar className="w-4 h-4 mr-2" />
            Schedule
          </Button>
        </div>
      </div>

      <Tabs defaultValue="templates" className="w-full">
        <TabsList>
          <TabsTrigger value="templates">Report Templates</TabsTrigger>
          <TabsTrigger value="customize">Customize</TabsTrigger>
          <TabsTrigger value="schedule">Scheduling</TabsTrigger>
          <TabsTrigger value="history">Report History</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-6">
          {/* Quick Actions */}
          <Card className="bg-gradient-to-r from-blue-50 to-green-50 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">🚀 Quick Report Generation</h3>
                  <p className="text-blue-700 mb-4">Generate client reports with one click using pre-built templates</p>
                  <div className="flex items-center space-x-4">
                    <Button 
                      onClick={() => selectedTemplate && generateReport(selectedTemplate)}
                      disabled={loading || !selectedTemplate}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-2" />
                          Generate Report
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => selectedTemplate && generateReport(selectedTemplate, 'preview')}
                      disabled={!selectedTemplate}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Preview
                    </Button>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">
                    {reportData ? `$${reportData.costSavings.monthlySavings.toLocaleString()}` : '$12K'}
                  </div>
                  <div className="text-sm text-green-700">Monthly client savings</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Template Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {templates.map((template) => (
              <Card 
                key={template.id}
                className={`cursor-pointer transition-all ${
                  selectedTemplate?.id === template.id ? 'border-blue-500 bg-blue-50' : 'hover:shadow-md'
                }`}
                onClick={() => setSelectedTemplate(template)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: template.branding.primaryColor }}
                      ></div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                    </div>
                    {selectedTemplate?.id === template.id && (
                      <Badge className="bg-blue-100 text-blue-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Selected
                      </Badge>
                    )}
                  </div>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Sections</span>
                      <span className="font-medium">{template.sections.filter(s => s.enabled).length} included</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Branding</span>
                      <Badge variant="outline" className="text-xs">
                        {template.branding.brandingLevel}
                      </Badge>
                    </div>

                    {template.schedule?.enabled && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Scheduled</span>
                        <Badge className="bg-green-100 text-green-800 text-xs">
                          <Clock className="w-3 h-3 mr-1" />
                          {template.schedule.frequency}
                        </Badge>
                      </div>
                    )}

                    <div className="pt-3 border-t">
                      <div className="flex items-center space-x-2">
                        <Button 
                          size="sm" 
                          onClick={(e) => {
                            e.stopPropagation()
                            generateReport(template)
                          }}
                          disabled={loading}
                        >
                          <Download className="w-3 h-3 mr-1" />
                          Generate
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation()
                            generateReport(template, 'preview')
                          }}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Preview
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Client Value Metrics */}
          {reportData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Award className="w-5 h-5 mr-2 text-yellow-600" />
                  Client Value Delivered This Month
                </CardTitle>
                <CardDescription>
                  Key metrics to highlight in your client reports
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
                    <DollarSign className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-green-600">
                      ${reportData.costSavings.monthlySavings.toLocaleString()}
                    </div>
                    <div className="text-sm text-green-700">Cost Savings</div>
                  </div>

                  <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <Clock className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-blue-600">
                      {reportData.costSavings.hoursSaved}h
                    </div>
                    <div className="text-sm text-blue-700">Time Saved</div>
                  </div>

                  <div className="text-center p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <Target className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-purple-600">
                      {reportData.keyMetrics.reliabilityScore.toFixed(1)}%
                    </div>
                    <div className="text-sm text-purple-700">Reliability</div>
                  </div>

                  <div className="text-center p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <CheckCircle className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-orange-600">
                      {reportData.executiveSummary.issuesPrevented}
                    </div>
                    <div className="text-sm text-orange-700">Issues Prevented</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="customize" className="space-y-6">
          <ReportCustomizer 
            template={selectedTemplate}
            onTemplateUpdate={setSelectedTemplate}
          />
        </TabsContent>

        <TabsContent value="schedule" className="space-y-6">
          <ReportScheduler 
            templates={templates}
            onScheduleUpdate={scheduleReport}
          />
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <ReportHistory />
        </TabsContent>
      </Tabs>

      {/* Branding Dialog */}
      <BrandingDialog 
        open={showBrandingDialog}
        onOpenChange={setShowBrandingDialog}
        template={selectedTemplate}
        onBrandingUpdate={(branding) => {
          if (selectedTemplate) {
            const updated = { ...selectedTemplate, branding }
            setSelectedTemplate(updated)
            setTemplates(prev => prev.map(t => t.id === updated.id ? updated : t))
          }
        }}
      />

      {/* Schedule Dialog */}
      <ScheduleDialog 
        open={showScheduleDialog}
        onOpenChange={setShowScheduleDialog}
        template={selectedTemplate}
        onScheduleUpdate={(schedule) => {
          if (selectedTemplate) {
            const updated = { ...selectedTemplate, schedule }
            setSelectedTemplate(updated)
            setTemplates(prev => prev.map(t => t.id === updated.id ? updated : t))
          }
        }}
      />
    </div>
  )
}

// Sub-components would be implemented here...
function ReportCustomizer({ template, onTemplateUpdate }: any) {
  if (!template) return <div>Select a template to customize</div>
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Customize Report Sections</CardTitle>
        <CardDescription>Enable/disable sections and customize content</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {template.sections.map((section: any) => (
            <div key={section.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <Switch checked={section.enabled} />
                <div>
                  <div className="font-medium">{section.title}</div>
                  <div className="text-sm text-gray-600">{section.type} section</div>
                </div>
              </div>
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function ReportScheduler({ templates, onScheduleUpdate }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Automated Report Scheduling</CardTitle>
        <CardDescription>Set up automatic report generation and delivery</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-gray-500">
          <Calendar className="w-12 h-12 mx-auto mb-4" />
          <p>Automated scheduling will be available in the next update</p>
        </div>
      </CardContent>
    </Card>
  )
}

function ReportHistory() {
  const mockHistory = [
    { id: '1', name: 'Executive Summary - March 2024', generated: '2024-03-01', downloaded: 23 },
    { id: '2', name: 'Technical Report - March 2024', generated: '2024-03-01', downloaded: 8 },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Report History</CardTitle>
        <CardDescription>Previously generated reports</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {mockHistory.map((report) => (
            <div key={report.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div className="font-medium">{report.name}</div>
                <div className="text-sm text-gray-600">Generated {report.generated}</div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline">{report.downloaded} downloads</Badge>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function BrandingDialog({ open, onOpenChange, template, onBrandingUpdate }: any) {
  const [branding, setBranding] = useState(template?.branding || {
    primaryColor: '#3B82F6',
    secondaryColor: '#1E40AF',
    companyName: 'Your Agency',
    brandingLevel: 'standard'
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Report Branding</DialogTitle>
          <DialogDescription>Customize the appearance of your client reports</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="companyName">Company Name</Label>
            <Input 
              id="companyName"
              value={branding.companyName}
              onChange={(e) => setBranding({...branding, companyName: e.target.value})}
            />
          </div>
          
          <div>
            <Label htmlFor="primaryColor">Primary Color</Label>
            <div className="flex items-center space-x-2">
              <Input 
                id="primaryColor"
                type="color"
                value={branding.primaryColor}
                onChange={(e) => setBranding({...branding, primaryColor: e.target.value})}
                className="w-12 h-8"
              />
              <Input 
                value={branding.primaryColor}
                onChange={(e) => setBranding({...branding, primaryColor: e.target.value})}
                placeholder="#3B82F6"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="brandingLevel">Branding Level</Label>
            <Select value={branding.brandingLevel} onValueChange={(value) => setBranding({...branding, brandingLevel: value})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="minimal">Minimal</SelectItem>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="full">Full Branding</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={() => {
            onBrandingUpdate(branding)
            onOpenChange(false)
          }} className="w-full">
            Apply Branding
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ScheduleDialog({ open, onOpenChange, template, onScheduleUpdate }: any) {
  const [schedule, setSchedule] = useState({
    frequency: 'monthly',
    recipients: [''],
    enabled: false
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule Reports</DialogTitle>
          <DialogDescription>Set up automatic report generation and delivery</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="frequency">Frequency</Label>
            <Select value={schedule.frequency} onValueChange={(value) => setSchedule({...schedule, frequency: value})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="recipients">Recipients (comma-separated emails)</Label>
            <Textarea 
              id="recipients"
              placeholder="client@company.com, manager@company.com"
              value={schedule.recipients.join(', ')}
              onChange={(e) => setSchedule({...schedule, recipients: e.target.value.split(',').map(s => s.trim())})}
            />
          </div>

          <Button onClick={() => {
            onScheduleUpdate(schedule)
            onOpenChange(false)
          }} className="w-full">
            Set Schedule
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}