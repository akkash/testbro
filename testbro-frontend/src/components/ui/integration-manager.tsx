import React, { useState, useEffect } from 'react'
import {
  Plus,
  Settings,
  Trash2,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  Github,
  Puzzle,
  Zap,
  Clock,
  Bell,
  Link as LinkIcon
} from 'lucide-react'
import { Button } from './button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card'
import { Badge } from './badge'
import { Switch } from './switch'
import { Input } from './input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './dialog'
import { Label } from './label'
import { Textarea } from './textarea'
import {
  Integration,
  NotificationConfig,
  SlackConfig,
  GitHubConfig,
  JiraConfig,
  IntegrationService
} from '@/lib/services/integrationService'

interface IntegrationManagerProps {
  className?: string
}

export function IntegrationManager({ className = '' }: IntegrationManagerProps) {
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [notifications, setNotifications] = useState<NotificationConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [selectedIntegrationType, setSelectedIntegrationType] = useState<'slack' | 'github' | 'jira'>('slack')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [integrationsResult, notificationsResult] = await Promise.all([
        IntegrationService.listIntegrations(),
        IntegrationService.listNotificationConfigs()
      ])
      
      if (integrationsResult.data) {
        setIntegrations(integrationsResult.data)
      }
      
      if (notificationsResult.data) {
        setNotifications(notificationsResult.data)
      }
    } catch (error) {
      console.error('Failed to load integrations:', error)
    } finally {
      setLoading(false)
    }
  }

  const getIntegrationIcon = (type: string) => {
    switch (type) {
      case 'slack':
        return <MessageSquare className="w-5 h-5" />
      case 'github':
        return <Github className="w-5 h-5" />
      case 'jira':
        return <Puzzle className="w-5 h-5" />
      default:
        return <LinkIcon className="w-5 h-5" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'text-green-600 bg-green-100'
      case 'error':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Integrations</h2>
          <p className="text-gray-600">Connect TestBro with your team's workflow tools</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Integration
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Integration</DialogTitle>
              <DialogDescription>
                Connect TestBro with your team's tools for seamless collaboration
              </DialogDescription>
            </DialogHeader>
            <IntegrationSetupForm 
              type={selectedIntegrationType}
              onTypeChange={setSelectedIntegrationType}
              onSuccess={() => {
                setShowAddDialog(false)
                loadData()
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="integrations">
        <TabsList>
          <TabsTrigger value="integrations">Connected Apps</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
        </TabsList>

        <TabsContent value="integrations" className="space-y-4">
          {/* Available Integrations */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[
              {
                type: 'slack' as const,
                name: 'Slack',
                description: 'Get real-time notifications in your team channels',
                icon: <MessageSquare className="w-8 h-8 text-purple-600" />,
                benefits: ['Instant alerts', 'Team collaboration', 'Custom channels']
              },
              {
                type: 'github' as const,
                name: 'GitHub',
                description: 'Create issues and PRs automatically from test results',
                icon: <Github className="w-8 h-8 text-gray-900" />,
                benefits: ['Auto issue creation', 'Deployment PRs', 'Code integration']
              },
              {
                type: 'jira' as const,
                name: 'Jira',
                description: 'Track test failures and improvements in your project',
                icon: <Puzzle className="w-8 h-8 text-blue-600" />,
                benefits: ['Issue tracking', 'Sprint planning', 'Progress reporting']
              }
            ].map((integration) => {
              const isConnected = integrations.some(i => i.type === integration.type)
              
              return (
                <Card key={integration.type} className={`cursor-pointer transition-all ${isConnected ? 'border-green-200 bg-green-50' : 'hover:shadow-md'}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      {integration.icon}
                      {isConnected && (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Connected
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg">{integration.name}</CardTitle>
                    <CardDescription>{integration.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1 text-sm text-gray-600 mb-4">
                      {integration.benefits.map((benefit, index) => (
                        <li key={index} className="flex items-center">
                          <CheckCircle className="w-3 h-3 text-green-500 mr-2" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                    {!isConnected ? (
                      <Button 
                        className="w-full" 
                        variant="outline"
                        onClick={() => {
                          setSelectedIntegrationType(integration.type)
                          setShowAddDialog(true)
                        }}
                      >
                        Connect {integration.name}
                      </Button>
                    ) : (
                      <Button className="w-full" variant="outline">
                        <Settings className="w-4 h-4 mr-2" />
                        Configure
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Connected Integrations */}
          {integrations.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Active Integrations</h3>
              {integrations.map((integration) => (
                <Card key={integration.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getIntegrationIcon(integration.type)}
                        <div>
                          <CardTitle className="text-base">{integration.name}</CardTitle>
                          <CardDescription className="flex items-center space-x-2">
                            <Badge className={getStatusColor(integration.status)}>
                              {integration.status}
                            </Badge>
                            {integration.lastSync && (
                              <span className="text-xs text-gray-500">
                                Last sync: {integration.lastSync.toLocaleString()}
                              </span>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch checked={integration.enabled} />
                        <Button variant="outline" size="sm">
                          <Settings className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <NotificationConfigManager 
            integrations={integrations}
            notifications={notifications}
            onUpdate={loadData}
          />
        </TabsContent>

        <TabsContent value="workflows" className="space-y-4">
          <WorkflowManager integrations={integrations} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface IntegrationSetupFormProps {
  type: 'slack' | 'github' | 'jira'
  onTypeChange: (type: 'slack' | 'github' | 'jira') => void
  onSuccess: () => void
}

function IntegrationSetupForm({ type, onTypeChange, onSuccess }: IntegrationSetupFormProps) {
  const [config, setConfig] = useState<any>({})
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      let result
      switch (type) {
        case 'slack':
          result = await IntegrationService.connectSlack(config)
          break
        case 'github':
          result = await IntegrationService.connectGitHub(config)
          break
        case 'jira':
          result = await IntegrationService.connectJira(config)
          break
      }

      if (result.data) {
        onSuccess()
      }
    } catch (error) {
      console.error('Failed to create integration:', error)
    } finally {
      setLoading(false)
    }
  }

  const renderForm = () => {
    switch (type) {
      case 'slack':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="webhook">Webhook URL</Label>
              <Input
                id="webhook"
                placeholder="https://hooks.slack.com/services/..."
                value={config.webhookUrl || ''}
                onChange={(e) => setConfig({ ...config, webhookUrl: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="channel">Default Channel</Label>
              <Input
                id="channel"
                placeholder="#qa-alerts"
                value={config.defaultChannel || ''}
                onChange={(e) => setConfig({ ...config, defaultChannel: e.target.value })}
              />
            </div>
          </div>
        )
      case 'github':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="token">Personal Access Token</Label>
              <Input
                id="token"
                type="password"
                placeholder="ghp_xxxxxxxxxxxx"
                value={config.accessToken || ''}
                onChange={(e) => setConfig({ ...config, accessToken: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="repo">Repository (owner/repo)</Label>
              <Input
                id="repo"
                placeholder="company/web-app"
                value={config.repository || ''}
                onChange={(e) => setConfig({ ...config, repository: e.target.value })}
              />
            </div>
          </div>
        )
      case 'jira':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="domain">Jira Domain</Label>
              <Input
                id="domain"
                placeholder="company.atlassian.net"
                value={config.domain || ''}
                onChange={(e) => setConfig({ ...config, domain: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@company.com"
                value={config.email || ''}
                onChange={(e) => setConfig({ ...config, email: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="apiToken">API Token</Label>
              <Input
                id="apiToken"
                type="password"
                placeholder="API token from Jira"
                value={config.apiToken || ''}
                onChange={(e) => setConfig({ ...config, apiToken: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="projectKey">Project Key</Label>
              <Input
                id="projectKey"
                placeholder="TEST"
                value={config.projectKey || ''}
                onChange={(e) => setConfig({ ...config, projectKey: e.target.value })}
              />
            </div>
          </div>
        )
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label>Integration Type</Label>
        <Select value={type} onValueChange={onTypeChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="slack">Slack</SelectItem>
            <SelectItem value="github">GitHub</SelectItem>
            <SelectItem value="jira">Jira</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {renderForm()}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Connecting...' : `Connect ${type}`}
      </Button>
    </form>
  )
}

interface NotificationConfigManagerProps {
  integrations: Integration[]
  notifications: NotificationConfig[]
  onUpdate: () => void
}

function NotificationConfigManager({ integrations, notifications, onUpdate }: NotificationConfigManagerProps) {
  const [showAddDialog, setShowAddDialog] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Notification Rules</h3>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Rule
        </Button>
      </div>

      {notifications.map((notification) => {
        const integration = integrations.find(i => i.id === notification.integrationId)
        
        return (
          <Card key={notification.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Bell className="w-5 h-5 text-blue-600" />
                  <div>
                    <CardTitle className="text-base">
                      {notification.eventType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </CardTitle>
                    <CardDescription>
                      Notify via {integration?.name} when conditions are met
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch checked={notification.enabled} />
                  <Button variant="outline" size="sm">
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600">
                Channels: {notification.channels.join(', ')}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

interface WorkflowManagerProps {
  integrations: Integration[]
}

function WorkflowManager({ integrations }: WorkflowManagerProps) {
  const workflows = [
    {
      id: 'test-failure-workflow',
      name: 'Test Failure Response',
      description: 'Automatically respond to test failures',
      triggers: ['Test fails consecutively'],
      actions: ['Send Slack alert', 'Create GitHub issue', 'Assign to QA lead'],
      enabled: true
    },
    {
      id: 'deployment-workflow',
      name: 'Deployment Ready',
      description: 'Notify when tests pass and ready to deploy',
      triggers: ['All tests pass', 'Performance metrics OK'],
      actions: ['Create deployment PR', 'Notify deployment channel'],
      enabled: true
    },
    {
      id: 'weekly-report-workflow',
      name: 'Weekly Summary',
      description: 'Send weekly testing summary to stakeholders',
      triggers: ['Every Monday 9 AM'],
      actions: ['Generate report', 'Send to leadership channel'],
      enabled: false
    }
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Automated Workflows</h3>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Create Workflow
        </Button>
      </div>

      {workflows.map((workflow) => (
        <Card key={workflow.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Zap className="w-5 h-5 text-orange-600" />
                <div>
                  <CardTitle className="text-base">{workflow.name}</CardTitle>
                  <CardDescription>{workflow.description}</CardDescription>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch checked={workflow.enabled} />
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-xs font-medium text-gray-500">TRIGGERS</Label>
                <ul className="mt-1 space-y-1">
                  {workflow.triggers.map((trigger, index) => (
                    <li key={index} className="flex items-center text-gray-600">
                      <Clock className="w-3 h-3 mr-2" />
                      {trigger}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-500">ACTIONS</Label>
                <ul className="mt-1 space-y-1">
                  {workflow.actions.map((action, index) => (
                    <li key={index} className="flex items-center text-gray-600">
                      <Zap className="w-3 h-3 mr-2" />
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}