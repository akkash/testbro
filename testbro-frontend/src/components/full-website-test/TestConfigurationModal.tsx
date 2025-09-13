import React, { useState, useEffect } from 'react';
import {
  X,
  Globe,
  Settings,
  Camera,
  Monitor,
  Eye,
  AlertCircle,
  Info,
  Plus,
  Trash2,
  Copy,
  CheckCircle,
  Smartphone,
  Tablet,
  Clock,
  Search,
  Shield,
  Play
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { fullWebsiteTestApi } from '@/lib/fullWebsiteTestApi';
import type {
  FullWebsiteTestConfig,
  FullWebsiteTestTemplate,
  FullWebsiteTestSession,
  PreFlowStep
} from '@/types/full-website-test';

interface TestConfigurationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTestCreated: (session: FullWebsiteTestSession) => void;
  templates: FullWebsiteTestTemplate[];
  selectedProject: any;
}

const defaultConfig: Partial<FullWebsiteTestConfig> = {
  sitemap_discovery: {
    max_depth: 3,
    max_urls: 500,
    follow_external_links: false,
    respect_robots_txt: true,
    include_patterns: ['*'],
    exclude_patterns: [
      '*/admin/*',
      '*/wp-admin/*',
      '*/login/*',
      '*/auth/*',
      '*/logout/*',
      '*/register/*',
      '*/cart/*',
      '*/checkout/*',
      '*.pdf',
      '*.doc',
      '*.docx',
      '*.zip',
      '*.mp3',
      '*.mp4'
    ],
    discover_sitemaps: true,
    crawl_internal_links: true,
    timeout_ms: 30000
  },
  screenshot_options: {
    enabled: true,
    fullPage: true,
    width: 1280,
    height: 720,
    quality: 90,
    format: 'png',
    capture_mobile: false,
    capture_tablet: false,
    compare_with_baseline: false
  },
  pre_flow: {
    enabled: false,
    steps: []
  },
  monitoring: {
    enabled: false,
    check_interval_minutes: 60,
    timeout_seconds: 30,
    monitor_404_pages: true,
    monitor_load_times: true,
    monitor_content_changes: true,
    alert_on_errors: true,
    load_time_threshold_ms: 3000
  },
  batch_size: 5,
  delay_between_requests: 1000,
  max_concurrent_sessions: 2,
  enable_real_time_updates: true
};

const TestConfigurationModal: React.FC<TestConfigurationModalProps> = ({
  open,
  onOpenChange,
  onTestCreated,
  templates,
  selectedProject
}) => {
  const [config, setConfig] = useState<Partial<FullWebsiteTestConfig>>(defaultConfig);
  const [testName, setTestName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [selectedTargetId, setSelectedTargetId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [targets, setTargets] = useState<any[]>([]);
  const [currentTab, setCurrentTab] = useState('basic');

  useEffect(() => {
    if (open) {
      loadTargets();
      resetForm();
    }
  }, [open, selectedProject]);

  const loadTargets = async () => {
    if (!selectedProject?.id) return;
    
    try {
      // Load project targets - this should be implemented in your existing API
      // const targets = await api.get(`/api/projects/${selectedProject.id}/test-targets`);
      // setTargets(targets.data);
      setTargets([]); // Placeholder
    } catch (err) {
      console.error('Failed to load targets:', err);
    }
  };

  const resetForm = () => {
    setConfig(defaultConfig);
    setTestName('');
    setBaseUrl('');
    setSelectedTargetId('');
    setError(null);
    setSelectedTemplate('');
    setCurrentTab('basic');
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setConfig(prev => ({
        ...prev,
        ...template.config
      }));
    }
  };

  const updateConfig = (path: string, value: any) => {
    setConfig(prev => {
      const newConfig = { ...prev };
      const keys = path.split('.');
      let current = newConfig as any;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!(keys[i] in current)) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newConfig;
    });
  };

  const addPreFlowStep = () => {
    const newStep: PreFlowStep = {
      action: 'navigate',
      description: ''
    };
    
    updateConfig('pre_flow.steps', [...(config.pre_flow?.steps || []), newStep]);
  };

  const removePreFlowStep = (index: number) => {
    const steps = [...(config.pre_flow?.steps || [])];
    steps.splice(index, 1);
    updateConfig('pre_flow.steps', steps);
  };

  const updatePreFlowStep = (index: number, field: keyof PreFlowStep, value: any) => {
    const steps = [...(config.pre_flow?.steps || [])];
    steps[index] = { ...steps[index], [field]: value };
    updateConfig('pre_flow.steps', steps);
  };

  const addPattern = (type: 'include' | 'exclude') => {
    const currentPatterns = config.sitemap_discovery?.[`${type}_patterns`] || [];
    updateConfig(`sitemap_discovery.${type}_patterns`, [...currentPatterns, '']);
  };

  const removePattern = (type: 'include' | 'exclude', index: number) => {
    const currentPatterns = [...(config.sitemap_discovery?.[`${type}_patterns`] || [])];
    currentPatterns.splice(index, 1);
    updateConfig(`sitemap_discovery.${type}_patterns`, currentPatterns);
  };

  const updatePattern = (type: 'include' | 'exclude', index: number, value: string) => {
    const currentPatterns = [...(config.sitemap_discovery?.[`${type}_patterns`] || [])];
    currentPatterns[index] = value;
    updateConfig(`sitemap_discovery.${type}_patterns`, currentPatterns);
  };

  const validateForm = (): string | null => {
    if (!testName.trim()) return 'Test name is required';
    if (!baseUrl.trim()) return 'Base URL is required';
    
    try {
      new URL(baseUrl);
    } catch {
      return 'Please enter a valid URL';
    }

    if (!selectedProject?.id) return 'Project is required';
    
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const fullConfig: FullWebsiteTestConfig = {
        name: testName,
        project_id: selectedProject.id,
        target_id: selectedTargetId || selectedProject.id, // Fallback to project if no target
        base_url: baseUrl,
        sitemap_discovery: config.sitemap_discovery!,
        screenshot_options: config.screenshot_options!,
        pre_flow: config.pre_flow!,
        monitoring: config.monitoring!,
        batch_size: config.batch_size,
        delay_between_requests: config.delay_between_requests,
        max_concurrent_sessions: config.max_concurrent_sessions,
        enable_real_time_updates: config.enable_real_time_updates
      };

      const newSession = await fullWebsiteTestApi.startTest(fullConfig);
      onTestCreated(newSession);
    } catch (err: any) {
      console.error('Failed to start test:', err);
      setError(err.message || 'Failed to start test. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-600" />
            Configure Full Website Test
          </DialogTitle>
          <DialogDescription>
            Set up comprehensive website testing with screenshots, monitoring, and change detection
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          {/* Template Selection */}
          {templates.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Quick Start Templates</CardTitle>
                <CardDescription className="text-xs">
                  Choose a pre-configured template or start from scratch
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {templates.map((template) => (
                    <Card
                      key={template.id}
                      className={`cursor-pointer transition-all ${
                        selectedTemplate === template.id 
                          ? 'ring-2 ring-blue-500 bg-blue-50' 
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => handleTemplateSelect(template.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm">{template.name}</h4>
                          {selectedTemplate === template.id && (
                            <CheckCircle className="h-4 w-4 text-blue-600" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{template.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Basic Configuration */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="testName">Test Name</Label>
                <Input
                  id="testName"
                  placeholder="e.g., Homepage Weekly Check"
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="baseUrl">Base URL</Label>
                <Input
                  id="baseUrl"
                  placeholder="https://example.com"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Advanced Configuration Tabs */}
          <Tabs value={currentTab} onValueChange={setCurrentTab}>
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="discovery" className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Discovery
              </TabsTrigger>
              <TabsTrigger value="screenshots" className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Screenshots
              </TabsTrigger>
              <TabsTrigger value="preflow" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Pre-flow
              </TabsTrigger>
              <TabsTrigger value="monitoring" className="flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                Monitoring
              </TabsTrigger>
            </TabsList>

            {/* URL Discovery Tab */}
            <TabsContent value="discovery" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">URL Discovery Settings</CardTitle>
                  <CardDescription className="text-xs">
                    Configure how the test discovers and crawls website pages
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Max Crawl Depth</Label>
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        value={config.sitemap_discovery?.max_depth || 3}
                        onChange={(e) => updateConfig('sitemap_discovery.max_depth', parseInt(e.target.value))}
                      />
                      <p className="text-xs text-muted-foreground">How deep to crawl from the base URL</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Max URLs</Label>
                      <Input
                        type="number"
                        min="1"
                        max="10000"
                        value={config.sitemap_discovery?.max_urls || 500}
                        onChange={(e) => updateConfig('sitemap_discovery.max_urls', parseInt(e.target.value))}
                      />
                      <p className="text-xs text-muted-foreground">Maximum number of URLs to process</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="discover_sitemaps"
                        checked={config.sitemap_discovery?.discover_sitemaps || false}
                        onCheckedChange={(checked) => updateConfig('sitemap_discovery.discover_sitemaps', checked)}
                      />
                      <Label htmlFor="discover_sitemaps">Discover sitemaps</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="crawl_internal_links"
                        checked={config.sitemap_discovery?.crawl_internal_links || false}
                        onCheckedChange={(checked) => updateConfig('sitemap_discovery.crawl_internal_links', checked)}
                      />
                      <Label htmlFor="crawl_internal_links">Crawl internal links</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="respect_robots_txt"
                        checked={config.sitemap_discovery?.respect_robots_txt || false}
                        onCheckedChange={(checked) => updateConfig('sitemap_discovery.respect_robots_txt', checked)}
                      />
                      <Label htmlFor="respect_robots_txt">Respect robots.txt</Label>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium">Include Patterns</Label>
                      <p className="text-xs text-muted-foreground mb-2">URLs matching these patterns will be included</p>
                      {config.sitemap_discovery?.include_patterns?.map((pattern, index) => (
                        <div key={index} className="flex items-center gap-2 mb-2">
                          <Input
                            value={pattern}
                            onChange={(e) => updatePattern('include', index, e.target.value)}
                            placeholder="e.g., */blog/*"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removePattern('include', index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addPattern('include')}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Pattern
                      </Button>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Exclude Patterns</Label>
                      <p className="text-xs text-muted-foreground mb-2">URLs matching these patterns will be excluded</p>
                      {config.sitemap_discovery?.exclude_patterns?.map((pattern, index) => (
                        <div key={index} className="flex items-center gap-2 mb-2">
                          <Input
                            value={pattern}
                            onChange={(e) => updatePattern('exclude', index, e.target.value)}
                            placeholder="e.g., */admin/*"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removePattern('exclude', index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addPattern('exclude')}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Pattern
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Screenshots Tab */}
            <TabsContent value="screenshots" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Screenshot Configuration</CardTitle>
                  <CardDescription className="text-xs">
                    Configure screenshot capture and comparison settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="screenshots_enabled"
                      checked={config.screenshot_options?.enabled || false}
                      onCheckedChange={(checked) => updateConfig('screenshot_options.enabled', checked)}
                    />
                    <Label htmlFor="screenshots_enabled">Enable screenshot capture</Label>
                  </div>

                  {config.screenshot_options?.enabled && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Desktop Width</Label>
                          <Input
                            type="number"
                            min="320"
                            max="1920"
                            value={config.screenshot_options?.width || 1280}
                            onChange={(e) => updateConfig('screenshot_options.width', parseInt(e.target.value))}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Desktop Height</Label>
                          <Input
                            type="number"
                            min="240"
                            max="1080"
                            value={config.screenshot_options?.height || 720}
                            onChange={(e) => updateConfig('screenshot_options.height', parseInt(e.target.value))}
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="capture_mobile"
                            checked={config.screenshot_options?.capture_mobile || false}
                            onCheckedChange={(checked) => updateConfig('screenshot_options.capture_mobile', checked)}
                          />
                          <Label htmlFor="capture_mobile" className="flex items-center gap-2">
                            <Smartphone className="h-4 w-4" />
                            Capture mobile viewport
                          </Label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="capture_tablet"
                            checked={config.screenshot_options?.capture_tablet || false}
                            onCheckedChange={(checked) => updateConfig('screenshot_options.capture_tablet', checked)}
                          />
                          <Label htmlFor="capture_tablet" className="flex items-center gap-2">
                            <Tablet className="h-4 w-4" />
                            Capture tablet viewport
                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Switch
                            id="full_page"
                            checked={config.screenshot_options?.fullPage || false}
                            onCheckedChange={(checked) => updateConfig('screenshot_options.fullPage', checked)}
                          />
                          <Label htmlFor="full_page">Capture full page</Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Switch
                            id="compare_baseline"
                            checked={config.screenshot_options?.compare_with_baseline || false}
                            onCheckedChange={(checked) => updateConfig('screenshot_options.compare_with_baseline', checked)}
                          />
                          <Label htmlFor="compare_baseline">Compare with baseline</Label>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Format</Label>
                          <Select
                            value={config.screenshot_options?.format || 'png'}
                            onValueChange={(value) => updateConfig('screenshot_options.format', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="png">PNG</SelectItem>
                              <SelectItem value="jpeg">JPEG</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Quality ({config.screenshot_options?.quality || 90}%)</Label>
                          <Input
                            type="range"
                            min="1"
                            max="100"
                            value={config.screenshot_options?.quality || 90}
                            onChange={(e) => updateConfig('screenshot_options.quality', parseInt(e.target.value))}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Pre-flow Tab */}
            <TabsContent value="preflow" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Pre-flow Steps</CardTitle>
                  <CardDescription className="text-xs">
                    Actions to perform before starting the main test (login, cookie acceptance, etc.)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="preflow_enabled"
                      checked={config.pre_flow?.enabled || false}
                      onCheckedChange={(checked) => updateConfig('pre_flow.enabled', checked)}
                    />
                    <Label htmlFor="preflow_enabled">Enable pre-flow steps</Label>
                  </div>

                  {config.pre_flow?.enabled && (
                    <div className="space-y-3">
                      {config.pre_flow.steps?.map((step, index) => (
                        <Card key={index} className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-medium">Step {index + 1}</h4>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removePreFlowStep(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <Label>Action</Label>
                                <Select
                                  value={step.action}
                                  onValueChange={(value) => updatePreFlowStep(index, 'action', value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="navigate">Navigate</SelectItem>
                                    <SelectItem value="click">Click</SelectItem>
                                    <SelectItem value="type">Type</SelectItem>
                                    <SelectItem value="wait">Wait</SelectItem>
                                    <SelectItem value="accept_cookies">Accept Cookies</SelectItem>
                                    <SelectItem value="login">Login</SelectItem>
                                    <SelectItem value="custom">Custom</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              {step.action === 'navigate' && (
                                <div className="space-y-2">
                                  <Label>URL</Label>
                                  <Input
                                    value={step.url || ''}
                                    onChange={(e) => updatePreFlowStep(index, 'url', e.target.value)}
                                    placeholder="https://example.com/login"
                                  />
                                </div>
                              )}
                              
                              {(step.action === 'click' || step.action === 'type') && (
                                <div className="space-y-2">
                                  <Label>Selector</Label>
                                  <Input
                                    value={step.selector || ''}
                                    onChange={(e) => updatePreFlowStep(index, 'selector', e.target.value)}
                                    placeholder="#login-button"
                                  />
                                </div>
                              )}
                              
                              {step.action === 'type' && (
                                <div className="space-y-2">
                                  <Label>Value</Label>
                                  <Input
                                    value={step.value || ''}
                                    onChange={(e) => updatePreFlowStep(index, 'value', e.target.value)}
                                    placeholder="Text to type"
                                  />
                                </div>
                              )}
                              
                              {step.action === 'wait' && (
                                <div className="space-y-2">
                                  <Label>Timeout (ms)</Label>
                                  <Input
                                    type="number"
                                    value={step.timeout || 5000}
                                    onChange={(e) => updatePreFlowStep(index, 'timeout', parseInt(e.target.value))}
                                  />
                                </div>
                              )}
                            </div>
                            
                            <div className="space-y-2">
                              <Label>Description</Label>
                              <Input
                                value={step.description || ''}
                                onChange={(e) => updatePreFlowStep(index, 'description', e.target.value)}
                                placeholder="Describe what this step does"
                              />
                            </div>
                          </div>
                        </Card>
                      ))}
                      
                      <Button
                        variant="outline"
                        onClick={addPreFlowStep}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Step
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Monitoring Tab */}
            <TabsContent value="monitoring" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Monitoring & Alerts</CardTitle>
                  <CardDescription className="text-xs">
                    Configure ongoing monitoring and alert settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="monitoring_enabled"
                      checked={config.monitoring?.enabled || false}
                      onCheckedChange={(checked) => updateConfig('monitoring.enabled', checked)}
                    />
                    <Label htmlFor="monitoring_enabled">Enable continuous monitoring</Label>
                  </div>

                  {config.monitoring?.enabled && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Check Interval (minutes)</Label>
                          <Input
                            type="number"
                            min="1"
                            max="1440"
                            value={config.monitoring?.check_interval_minutes || 60}
                            onChange={(e) => updateConfig('monitoring.check_interval_minutes', parseInt(e.target.value))}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Timeout (seconds)</Label>
                          <Input
                            type="number"
                            min="5"
                            max="300"
                            value={config.monitoring?.timeout_seconds || 30}
                            onChange={(e) => updateConfig('monitoring.timeout_seconds', parseInt(e.target.value))}
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="monitor_404_pages"
                            checked={config.monitoring?.monitor_404_pages || false}
                            onCheckedChange={(checked) => updateConfig('monitoring.monitor_404_pages', checked)}
                          />
                          <Label htmlFor="monitor_404_pages">Monitor for 404 pages</Label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="monitor_load_times"
                            checked={config.monitoring?.monitor_load_times || false}
                            onCheckedChange={(checked) => updateConfig('monitoring.monitor_load_times', checked)}
                          />
                          <Label htmlFor="monitor_load_times">Monitor load times</Label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="monitor_content_changes"
                            checked={config.monitoring?.monitor_content_changes || false}
                            onCheckedChange={(checked) => updateConfig('monitoring.monitor_content_changes', checked)}
                          />
                          <Label htmlFor="monitor_content_changes">Monitor content changes</Label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="alert_on_errors"
                            checked={config.monitoring?.alert_on_errors || false}
                            onCheckedChange={(checked) => updateConfig('monitoring.alert_on_errors', checked)}
                          />
                          <Label htmlFor="alert_on_errors">Alert on errors</Label>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Load Time Threshold (ms)</Label>
                        <Input
                          type="number"
                          min="100"
                          max="30000"
                          value={config.monitoring?.load_time_threshold_ms || 3000}
                          onChange={(e) => updateConfig('monitoring.load_time_threshold_ms', parseInt(e.target.value))}
                        />
                        <p className="text-xs text-muted-foreground">
                          Alert when pages load slower than this threshold
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Performance Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Performance Settings</CardTitle>
              <CardDescription className="text-xs">
                Configure test execution performance and concurrency
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Batch Size</Label>
                  <Input
                    type="number"
                    min="1"
                    max="20"
                    value={config.batch_size || 5}
                    onChange={(e) => updateConfig('batch_size', parseInt(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">URLs processed simultaneously</p>
                </div>
                
                <div className="space-y-2">
                  <Label>Delay (ms)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="10000"
                    value={config.delay_between_requests || 1000}
                    onChange={(e) => updateConfig('delay_between_requests', parseInt(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">Delay between requests</p>
                </div>
                
                <div className="space-y-2">
                  <Label>Max Sessions</Label>
                  <Input
                    type="number"
                    min="1"
                    max="5"
                    value={config.max_concurrent_sessions || 2}
                    onChange={(e) => updateConfig('max_concurrent_sessions', parseInt(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">Concurrent test sessions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          
          <Button
            onClick={handleSubmit}
            disabled={loading || !testName.trim() || !baseUrl.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Starting Test...
              </div>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Start Test
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TestConfigurationModal;
