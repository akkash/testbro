/**
 * Project Creation/Edit Form
 * Comprehensive form for creating and editing projects
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  FormField,
  EmailField,
  URLField,
  LoadingSpinner,
  ErrorState,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Separator
} from '@/components/ui';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  CogIcon,
  UsersIcon,
  TagIcon,
  GlobeAltIcon,
  BellIcon,
  PlayIcon
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';

interface ProjectFormData {
  name: string;
  description: string;
  url: string;
  environment: 'development' | 'staging' | 'production';
  status: 'active' | 'inactive';
  tags: string[];
  
  // Team settings
  teamMembers: {
    email: string;
    role: 'owner' | 'editor' | 'viewer';
  }[];
  
  // Notification settings
  notifications: {
    enabled: boolean;
    testResults: boolean;
    failureAlerts: boolean;
    weeklyReports: boolean;
    emailList: string[];
  };
  
  // Test settings
  testSettings: {
    autoRun: boolean;
    runSchedule: 'never' | 'daily' | 'weekly' | 'custom';
    customCron: string;
    failureThreshold: number;
    retryOnFailure: boolean;
    maxRetries: number;
    timeout: number;
    browsers: string[];
    environments: string[];
  };
  
  // Advanced settings
  advanced: {
    userAgent: string;
    viewport: {
      width: number;
      height: number;
    };
    screenshotOnFailure: boolean;
    videoRecording: boolean;
    performanceMetrics: boolean;
    accessibilityChecks: boolean;
    customHeaders: { key: string; value: string }[];
  };
}

export default function ProjectCreateEdit() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const isEdit = !!projectId;
  
  const [formData, setFormData] = useState<ProjectFormData>({
    name: '',
    description: '',
    url: '',
    environment: 'development',
    status: 'active',
    tags: [],
    
    teamMembers: [],
    
    notifications: {
      enabled: true,
      testResults: true,
      failureAlerts: true,
      weeklyReports: false,
      emailList: []
    },
    
    testSettings: {
      autoRun: false,
      runSchedule: 'never',
      customCron: '',
      failureThreshold: 80,
      retryOnFailure: true,
      maxRetries: 3,
      timeout: 30,
      browsers: ['chromium'],
      environments: ['desktop']
    },
    
    advanced: {
      userAgent: '',
      viewport: {
        width: 1920,
        height: 1080
      },
      screenshotOnFailure: true,
      videoRecording: false,
      performanceMetrics: true,
      accessibilityChecks: false,
      customHeaders: []
    }
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEdit);
  const [activeTab, setActiveTab] = useState('basic');
  const [newTag, setNewTag] = useState('');
  const [newTeamMember, setNewTeamMember] = useState({ email: '', role: 'viewer' as const });
  const [newHeader, setNewHeader] = useState({ key: '', value: '' });

  // Load project data for editing
  useEffect(() => {
    if (isEdit) {
      const loadProject = async () => {
        setInitialLoading(true);
        try {
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Mock project data
          setFormData({
            name: 'E-commerce Platform',
            description: 'Main shopping website with checkout flow testing',
            url: 'https://shop.example.com',
            environment: 'production',
            status: 'active',
            tags: ['critical', 'ecommerce', 'checkout'],
            
            teamMembers: [
              { email: 'john@example.com', role: 'owner' },
              { email: 'jane@example.com', role: 'editor' }
            ],
            
            notifications: {
              enabled: true,
              testResults: true,
              failureAlerts: true,
              weeklyReports: true,
              emailList: ['team@example.com']
            },
            
            testSettings: {
              autoRun: false,
              runSchedule: 'daily',
              customCron: '',
              failureThreshold: 85,
              retryOnFailure: true,
              maxRetries: 3,
              timeout: 30,
              browsers: ['chromium', 'firefox'],
              environments: ['desktop', 'mobile']
            },
            
            advanced: {
              userAgent: '',
              viewport: {
                width: 1920,
                height: 1080
              },
              screenshotOnFailure: true,
              videoRecording: true,
              performanceMetrics: true,
              accessibilityChecks: true,
              customHeaders: [
                { key: 'Authorization', value: 'Bearer token' }
              ]
            }
          });
        } catch (error) {
          console.error('Failed to load project:', error);
          toast.error('Failed to load project data');
        } finally {
          setInitialLoading(false);
        }
      };

      loadProject();
    }
  }, [isEdit, projectId]);

  // Form validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Basic validation
    if (!formData.name.trim()) {
      newErrors.name = 'Project name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Project description is required';
    }

    if (!formData.url.trim()) {
      newErrors.url = 'Project URL is required';
    } else if (!/^https?:\/\/.+/.test(formData.url)) {
      newErrors.url = 'Please enter a valid URL (including http:// or https://)';
    }

    // Test settings validation
    if (formData.testSettings.runSchedule === 'custom' && !formData.testSettings.customCron.trim()) {
      newErrors.customCron = 'Custom cron expression is required';
    }

    if (formData.testSettings.failureThreshold < 0 || formData.testSettings.failureThreshold > 100) {
      newErrors.failureThreshold = 'Failure threshold must be between 0 and 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the form errors');
      return;
    }

    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (isEdit) {
        toast.success('Project updated successfully');
      } else {
        toast.success('Project created successfully');
      }
      
      navigate('/projects');
    } catch (error) {
      console.error('Failed to save project:', error);
      toast.error('Failed to save project');
    } finally {
      setLoading(false);
    }
  };

  // Handle field changes
  const updateField = <K extends keyof ProjectFormData>(
    field: K,
    value: ProjectFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const updateNestedField = <K extends keyof ProjectFormData>(
    field: K,
    subField: keyof ProjectFormData[K],
    value: any
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        [subField]: value
      }
    }));
  };

  // Handle array operations
  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      updateField('tags', [...formData.tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    updateField('tags', formData.tags.filter(tag => tag !== tagToRemove));
  };

  const addTeamMember = () => {
    if (newTeamMember.email.trim()) {
      const exists = formData.teamMembers.some(member => member.email === newTeamMember.email);
      if (!exists) {
        updateField('teamMembers', [...formData.teamMembers, newTeamMember]);
        setNewTeamMember({ email: '', role: 'viewer' });
      }
    }
  };

  const removeTeamMember = (email: string) => {
    updateField('teamMembers', formData.teamMembers.filter(member => member.email !== email));
  };

  const addCustomHeader = () => {
    if (newHeader.key.trim() && newHeader.value.trim()) {
      updateNestedField('advanced', 'customHeaders', [
        ...formData.advanced.customHeaders,
        newHeader
      ]);
      setNewHeader({ key: '', value: '' });
    }
  };

  const removeCustomHeader = (index: number) => {
    updateNestedField('advanced', 'customHeaders', 
      formData.advanced.customHeaders.filter((_, i) => i !== index)
    );
  };

  // Loading state for editing
  if (initialLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/projects')}
          className="p-2"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isEdit ? 'Edit Project' : 'Create New Project'}
          </h1>
          <p className="mt-2 text-gray-600">
            {isEdit 
              ? 'Update project settings and configuration' 
              : 'Set up a new testing project with all necessary configurations'
            }
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="basic" className="flex items-center gap-2">
              <GlobeAltIcon className="w-4 h-4" />
              Basic Info
            </TabsTrigger>
            <TabsTrigger value="team" className="flex items-center gap-2">
              <UsersIcon className="w-4 h-4" />
              Team
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <BellIcon className="w-4 h-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="testing" className="flex items-center gap-2">
              <PlayIcon className="w-4 h-4" />
              Testing
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex items-center gap-2">
              <CogIcon className="w-4 h-4" />
              Advanced
            </TabsTrigger>
          </TabsList>

          {/* Basic Information */}
          <TabsContent value="basic">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>
                  Essential project details and configuration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    type="text"
                    name="name"
                    label="Project Name"
                    value={formData.name}
                    onChange={(value) => updateField('name', String(value))}
                    error={errors.name}
                    placeholder="e.g., E-commerce Platform"
                    required
                    disabled={loading}
                  />

                  <FormField
                    type="select"
                    name="environment"
                    label="Environment"
                    value={formData.environment}
                    onChange={(value) => updateField('environment', value as ProjectFormData['environment'])}
                    options={[
                      { label: 'Development', value: 'development' },
                      { label: 'Staging', value: 'staging' },
                      { label: 'Production', value: 'production' }
                    ]}
                    required
                    disabled={loading}
                  />
                </div>

                <FormField
                  type="textarea"
                  name="description"
                  label="Description"
                  value={formData.description}
                  onChange={(value) => updateField('description', String(value))}
                  error={errors.description}
                  placeholder="Describe what this project tests..."
                  rows={3}
                  required
                  disabled={loading}
                />

                <URLField
                  name="url"
                  label="Project URL"
                  value={formData.url}
                  onChange={(value) => updateField('url', String(value))}
                  error={errors.url}
                  placeholder="https://example.com"
                  required
                  disabled={loading}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    type="select"
                    name="status"
                    label="Status"
                    value={formData.status}
                    onChange={(value) => updateField('status', value as ProjectFormData['status'])}
                    options={[
                      { label: 'Active', value: 'active' },
                      { label: 'Inactive', value: 'inactive' }
                    ]}
                    disabled={loading}
                  />
                </div>

                {/* Tags */}
                <div className="space-y-3">
                  <label className="text-sm font-medium">Tags</label>
                  <div className="flex gap-2 items-center">
                    <FormField
                      type="text"
                      name="newTag"
                      value={newTag}
                      onChange={(value) => setNewTag(String(value))}
                      placeholder="Add a tag..."
                      disabled={loading}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addTag}
                      disabled={loading}
                    >
                      Add
                    </Button>
                  </div>
                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.tags.map(tag => (
                        <div
                          key={tag}
                          className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded-full"
                        >
                          <TagIcon className="w-3 h-3" />
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="ml-1 hover:text-blue-600"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Team Management */}
          <TabsContent value="team">
            <Card>
              <CardHeader>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>
                  Manage who has access to this project and their permissions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Add Team Member */}
                <div className="flex gap-3 items-end">
                  <EmailField
                    name="memberEmail"
                    label="Email Address"
                    value={newTeamMember.email}
                    onChange={(value) => setNewTeamMember(prev => ({ ...prev, email: String(value) }))}
                    placeholder="colleague@example.com"
                    className="flex-1"
                    disabled={loading}
                  />
                  <FormField
                    type="select"
                    name="memberRole"
                    label="Role"
                    value={newTeamMember.role}
                    onChange={(value) => setNewTeamMember(prev => ({ ...prev, role: value as 'owner' | 'editor' | 'viewer' }))}
                    options={[
                      { label: 'Viewer', value: 'viewer' },
                      { label: 'Editor', value: 'editor' },
                      { label: 'Owner', value: 'owner' }
                    ]}
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    onClick={addTeamMember}
                    disabled={loading}
                  >
                    Add Member
                  </Button>
                </div>

                {/* Team Members List */}
                {formData.teamMembers.length > 0 && (
                  <div className="space-y-3">
                    <label className="text-sm font-medium">Current Team Members</label>
                    <div className="space-y-2">
                      {formData.teamMembers.map((member, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-xs font-medium text-blue-600">
                                {member.email.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium">{member.email}</p>
                              <p className="text-xs text-gray-500 capitalize">{member.role}</p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeTeamMember(member.email)}
                            className="text-red-600 hover:text-red-700"
                            disabled={loading}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Role Permissions</h4>
                  <ul className="space-y-1 text-sm text-blue-800">
                    <li><strong>Owner:</strong> Full access including project deletion</li>
                    <li><strong>Editor:</strong> Can modify tests and configurations</li>
                    <li><strong>Viewer:</strong> Can view results and reports only</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>
                  Configure how and when you receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  type="switch"
                  name="notificationsEnabled"
                  label="Enable Notifications"
                  value={formData.notifications.enabled}
                  onChange={(value) => updateNestedField('notifications', 'enabled', Boolean(value))}
                  description="Turn notifications on or off for this project"
                  disabled={loading}
                />

                <Separator />

                <div className="space-y-4">
                  <FormField
                    type="switch"
                    name="testResults"
                    label="Test Result Notifications"
                    value={formData.notifications.testResults}
                    onChange={(value) => updateNestedField('notifications', 'testResults', Boolean(value))}
                    description="Get notified when test executions complete"
                    disabled={!formData.notifications.enabled || loading}
                  />

                  <FormField
                    type="switch"
                    name="failureAlerts"
                    label="Failure Alerts"
                    value={formData.notifications.failureAlerts}
                    onChange={(value) => updateNestedField('notifications', 'failureAlerts', Boolean(value))}
                    description="Immediate alerts for test failures"
                    disabled={!formData.notifications.enabled || loading}
                  />

                  <FormField
                    type="switch"
                    name="weeklyReports"
                    label="Weekly Reports"
                    value={formData.notifications.weeklyReports}
                    onChange={(value) => updateNestedField('notifications', 'weeklyReports', Boolean(value))}
                    description="Receive weekly summary reports"
                    disabled={!formData.notifications.enabled || loading}
                  />
                </div>

                <Separator />

                <div className="space-y-3">
                  <label className="text-sm font-medium">Additional Email Recipients</label>
                  <FormField
                    type="textarea"
                    name="emailList"
                    value={formData.notifications.emailList.join(', ')}
                    onChange={(value) => updateNestedField('notifications', 'emailList', 
                      String(value).split(',').map(email => email.trim()).filter(Boolean)
                    )}
                    placeholder="email1@example.com, email2@example.com"
                    description="Comma-separated list of additional email addresses"
                    disabled={!formData.notifications.enabled || loading}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Testing Settings */}
          <TabsContent value="testing">
            <Card>
              <CardHeader>
                <CardTitle>Testing Configuration</CardTitle>
                <CardDescription>
                  Configure how tests are executed for this project
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    type="switch"
                    name="autoRun"
                    label="Auto-run Tests"
                    value={formData.testSettings.autoRun}
                    onChange={(value) => updateNestedField('testSettings', 'autoRun', Boolean(value))}
                    description="Automatically run tests on schedule"
                    disabled={loading}
                  />

                  <FormField
                    type="select"
                    name="runSchedule"
                    label="Run Schedule"
                    value={formData.testSettings.runSchedule}
                    onChange={(value) => updateNestedField('testSettings', 'runSchedule', value)}
                    options={[
                      { label: 'Never', value: 'never' },
                      { label: 'Daily', value: 'daily' },
                      { label: 'Weekly', value: 'weekly' },
                      { label: 'Custom (Cron)', value: 'custom' }
                    ]}
                    disabled={!formData.testSettings.autoRun || loading}
                  />
                </div>

                {formData.testSettings.runSchedule === 'custom' && (
                  <FormField
                    type="text"
                    name="customCron"
                    label="Custom Cron Expression"
                    value={formData.testSettings.customCron}
                    onChange={(value) => updateNestedField('testSettings', 'customCron', String(value))}
                    error={errors.customCron}
                    placeholder="0 9 * * MON-FRI"
                    description="Standard cron expression format"
                    disabled={loading}
                  />
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FormField
                    type="number"
                    name="failureThreshold"
                    label="Failure Threshold (%)"
                    value={formData.testSettings.failureThreshold}
                    onChange={(value) => updateNestedField('testSettings', 'failureThreshold', Number(value))}
                    error={errors.failureThreshold}
                    min={0}
                    max={100}
                    description="Alert when pass rate falls below this"
                    disabled={loading}
                  />

                  <FormField
                    type="number"
                    name="maxRetries"
                    label="Max Retries"
                    value={formData.testSettings.maxRetries}
                    onChange={(value) => updateNestedField('testSettings', 'maxRetries', Number(value))}
                    min={0}
                    max={10}
                    description="Retry failed tests"
                    disabled={loading}
                  />

                  <FormField
                    type="number"
                    name="timeout"
                    label="Timeout (seconds)"
                    value={formData.testSettings.timeout}
                    onChange={(value) => updateNestedField('testSettings', 'timeout', Number(value))}
                    min={10}
                    max={300}
                    description="Test execution timeout"
                    disabled={loading}
                  />
                </div>

                <div className="space-y-4">
                  <FormField
                    type="switch"
                    name="retryOnFailure"
                    label="Retry on Failure"
                    value={formData.testSettings.retryOnFailure}
                    onChange={(value) => updateNestedField('testSettings', 'retryOnFailure', Boolean(value))}
                    description="Automatically retry failed tests"
                    disabled={loading}
                  />
                </div>

                {/* Browser Selection */}
                <div className="space-y-3">
                  <label className="text-sm font-medium">Browsers</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { id: 'chromium', label: 'Chrome' },
                      { id: 'firefox', label: 'Firefox' },
                      { id: 'webkit', label: 'Safari' },
                      { id: 'edge', label: 'Edge' }
                    ].map(browser => (
                      <FormField
                        key={browser.id}
                        type="checkbox"
                        name={`browser-${browser.id}`}
                        label={browser.label}
                        value={formData.testSettings.browsers.includes(browser.id)}
                        onChange={(value) => {
                          const browsers = Boolean(value)
                            ? [...formData.testSettings.browsers, browser.id]
                            : formData.testSettings.browsers.filter(b => b !== browser.id);
                          updateNestedField('testSettings', 'browsers', browsers);
                        }}
                        disabled={loading}
                      />
                    ))}
                  </div>
                </div>

                {/* Environment Selection */}
                <div className="space-y-3">
                  <label className="text-sm font-medium">Test Environments</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      { id: 'desktop', label: 'Desktop' },
                      { id: 'mobile', label: 'Mobile' },
                      { id: 'tablet', label: 'Tablet' }
                    ].map(env => (
                      <FormField
                        key={env.id}
                        type="checkbox"
                        name={`env-${env.id}`}
                        label={env.label}
                        value={formData.testSettings.environments.includes(env.id)}
                        onChange={(value) => {
                          const environments = Boolean(value)
                            ? [...formData.testSettings.environments, env.id]
                            : formData.testSettings.environments.filter(e => e !== env.id);
                          updateNestedField('testSettings', 'environments', environments);
                        }}
                        disabled={loading}
                      />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Advanced Settings */}
          <TabsContent value="advanced">
            <Card>
              <CardHeader>
                <CardTitle>Advanced Settings</CardTitle>
                <CardDescription>
                  Fine-tune browser behavior and test execution
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  type="text"
                  name="userAgent"
                  label="Custom User Agent"
                  value={formData.advanced.userAgent}
                  onChange={(value) => updateNestedField('advanced', 'userAgent', String(value))}
                  placeholder="Leave empty for default browser user agent"
                  description="Override the default browser user agent"
                  disabled={loading}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    type="number"
                    name="viewportWidth"
                    label="Viewport Width"
                    value={formData.advanced.viewport.width}
                    onChange={(value) => updateNestedField('advanced', 'viewport', {
                      ...formData.advanced.viewport,
                      width: Number(value)
                    })}
                    min={320}
                    max={3840}
                    disabled={loading}
                  />

                  <FormField
                    type="number"
                    name="viewportHeight"
                    label="Viewport Height"
                    value={formData.advanced.viewport.height}
                    onChange={(value) => updateNestedField('advanced', 'viewport', {
                      ...formData.advanced.viewport,
                      height: Number(value)
                    })}
                    min={240}
                    max={2160}
                    disabled={loading}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    type="switch"
                    name="screenshotOnFailure"
                    label="Screenshot on Failure"
                    value={formData.advanced.screenshotOnFailure}
                    onChange={(value) => updateNestedField('advanced', 'screenshotOnFailure', Boolean(value))}
                    description="Capture screenshots when tests fail"
                    disabled={loading}
                  />

                  <FormField
                    type="switch"
                    name="videoRecording"
                    label="Video Recording"
                    value={formData.advanced.videoRecording}
                    onChange={(value) => updateNestedField('advanced', 'videoRecording', Boolean(value))}
                    description="Record video of test execution"
                    disabled={loading}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    type="switch"
                    name="performanceMetrics"
                    label="Performance Metrics"
                    value={formData.advanced.performanceMetrics}
                    onChange={(value) => updateNestedField('advanced', 'performanceMetrics', Boolean(value))}
                    description="Collect performance timing data"
                    disabled={loading}
                  />

                  <FormField
                    type="switch"
                    name="accessibilityChecks"
                    label="Accessibility Checks"
                    value={formData.advanced.accessibilityChecks}
                    onChange={(value) => updateNestedField('advanced', 'accessibilityChecks', Boolean(value))}
                    description="Run automated accessibility tests"
                    disabled={loading}
                  />
                </div>

                {/* Custom Headers */}
                <div className="space-y-4">
                  <label className="text-sm font-medium">Custom Headers</label>
                  <div className="flex gap-3 items-end">
                    <FormField
                      type="text"
                      name="headerKey"
                      label="Header Name"
                      value={newHeader.key}
                      onChange={(value) => setNewHeader(prev => ({ ...prev, key: String(value) }))}
                      placeholder="Authorization"
                      disabled={loading}
                    />
                    <FormField
                      type="text"
                      name="headerValue"
                      label="Header Value"
                      value={newHeader.value}
                      onChange={(value) => setNewHeader(prev => ({ ...prev, value: String(value) }))}
                      placeholder="Bearer token"
                      disabled={loading}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addCustomHeader}
                      disabled={loading}
                    >
                      Add Header
                    </Button>
                  </div>

                  {formData.advanced.customHeaders.length > 0 && (
                    <div className="space-y-2">
                      {formData.advanced.customHeaders.map((header, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div>
                            <span className="font-mono text-sm">{header.key}: {header.value}</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeCustomHeader(index)}
                            className="text-red-600 hover:text-red-700"
                            disabled={loading}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <Card>
          <CardContent className="flex items-center justify-between pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/projects')}
              disabled={loading}
            >
              Cancel
            </Button>
            <div className="flex gap-3">
              {!isEdit && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={loading}
                  onClick={() => {
                    // Save as draft functionality
                    toast.success('Project saved as draft');
                  }}
                >
                  Save as Draft
                </Button>
              )}
              <Button
                type="submit"
                loading={loading}
                disabled={loading}
              >
                <CheckCircleIcon className="w-4 h-4 mr-2" />
                {isEdit ? 'Update Project' : 'Create Project'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
