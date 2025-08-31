import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Globe, 
  Play, 
  Pause, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock,
  BarChart3,
  Camera,
  Monitor,
  Smartphone
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/contexts/OrganizationContext';
import { ProjectService, type Project } from '@/lib/services/projectService';

interface DomainCrawlSession {
  id: string;
  name: string;
  seed_url: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  pages_discovered: number;
  pages_crawled: number;
  pages_with_visuals: number;
  total_visual_checkpoints: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

interface CrawlProgress {
  session_id: string;
  status: string;
  total_pages: number;
  crawled_pages: number;
  failed_pages: number;
  progress_percentage: number;
  current_url?: string;
  total_checkpoints: number;
  passed_checkpoints: number;
  failed_checkpoints: number;
  review_needed: number;
  baseline_checkpoints: number;
}

interface VisualCheckpoint {
  id: string;
  checkpoint_name: string;
  checkpoint_type: 'full_page' | 'element' | 'viewport' | 'mobile' | 'tablet';
  screenshot_url?: string;
  comparison_status: 'baseline' | 'passed' | 'failed' | 'review_needed';
  difference_percentage?: number;
  captured_at: string;
  domain_crawl_pages: {
    url: string;
    title?: string;
    page_type?: string;
  };
}

export default function DomainTestingPage() {
  const [sessions, setSessions] = useState<DomainCrawlSession[]>([]);
  const [currentSession, setCurrentSession] = useState<DomainCrawlSession | null>(null);
  const [progress, setProgress] = useState<CrawlProgress | null>(null);
  const [checkpoints, setCheckpoints] = useState<VisualCheckpoint[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    seed_url: '',
    max_depth: 3,
    max_pages: 50,
    visual_enabled: true,
    checkpoint_types: ['full_page', 'viewport']
  });

  const { toast } = useToast();
  const { currentOrganization } = useOrganization();

  useEffect(() => {
    loadProjects();
  }, [currentOrganization]);

  useEffect(() => {
    if (selectedProject) {
      loadSessions();
    }
  }, [selectedProject]);

  useEffect(() => {
    if (currentSession && currentSession.status === 'running') {
      const interval = setInterval(() => {
        loadProgress(currentSession.id);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [currentSession]);

  const loadProjects = async () => {
    if (!currentOrganization) return;
    
    try {
      const { data, error } = await ProjectService.listProjects();
      if (error) {
        throw new Error(error);
      }
      const orgProjects = data?.filter((p: Project) => p.organization_id === currentOrganization.id) || [];
      setProjects(orgProjects);
      if (orgProjects.length > 0 && !selectedProject) {
        setSelectedProject(orgProjects[0]);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load projects',
        variant: 'destructive'
      });
    }
  };

  const loadSessions = async () => {
    if (!selectedProject) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/domain-testing/sessions?project_id=${selectedProject.id}`);
      if (response.ok) {
        const data = await response.json();
        setSessions(data.data || []);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load domain testing sessions',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadProgress = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/domain-testing/sessions/${sessionId}/progress`);
      if (response.ok) {
        const data = await response.json();
        setProgress(data.data.crawl_progress);
      }
    } catch (error) {
      console.error('Failed to load progress:', error);
    }
  };

  const loadCheckpoints = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/domain-testing/sessions/${sessionId}/checkpoints`);
      if (response.ok) {
        const data = await response.json();
        setCheckpoints(data.data || []);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load visual checkpoints',
        variant: 'destructive'
      });
    }
  };

  const createSession = async () => {
    if (!selectedProject) {
      toast({
        title: 'Error',
        description: 'Please select a project first',
        variant: 'destructive'
      });
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch('/api/domain-testing/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          seed_url: formData.seed_url,
          project_id: selectedProject.id,
          target_id: selectedProject.id, // Use project ID as target for now
          crawler_config: {
            max_depth: formData.max_depth,
            max_pages: formData.max_pages,
            respect_robots_txt: true,
            concurrent_crawlers: 2
          },
          visual_ai_config: {
            enabled: formData.visual_enabled,
            checkpoint_types: formData.checkpoint_types,
            auto_create_baselines: true
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentSession(data.data);
        await loadSessions();
        toast({
          title: 'Success',
          description: 'Domain crawl session started successfully'
        });
        
        // Reset form
        setFormData({
          name: '',
          seed_url: '',
          max_depth: 3,
          max_pages: 50,
          visual_enabled: true,
          checkpoint_types: ['full_page', 'viewport']
        });
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create session');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create domain testing session',
        variant: 'destructive'
      });
    } finally {
      setIsCreating(false);
    }
  };

  const selectSession = (session: DomainCrawlSession) => {
    setCurrentSession(session);
    loadProgress(session.id);
    loadCheckpoints(session.id);
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { variant: 'secondary' as const, icon: Clock },
      running: { variant: 'default' as const, icon: Play },
      completed: { variant: 'default' as const, icon: CheckCircle },
      failed: { variant: 'destructive' as const, icon: XCircle },
      cancelled: { variant: 'secondary' as const, icon: Pause }
    };
    
    const config = statusMap[status as keyof typeof statusMap] || statusMap.pending;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getCheckpointIcon = (type: string) => {
    const iconMap = {
      full_page: Monitor,
      viewport: Monitor,
      mobile: Smartphone,
      tablet: Monitor,
      element: Eye
    };
    return iconMap[type as keyof typeof iconMap] || Monitor;
  };

  const getComparisonStatusBadge = (status: string, percentage?: number) => {
    const statusMap = {
      baseline: { variant: 'secondary' as const, label: 'Baseline' },
      passed: { variant: 'default' as const, label: 'Passed' },
      failed: { variant: 'destructive' as const, label: `Failed (${percentage?.toFixed(1)}% diff)` },
      review_needed: { variant: 'outline' as const, label: `Review Needed (${percentage?.toFixed(1)}% diff)` }
    };
    
    const config = statusMap[status as keyof typeof statusMap] || statusMap.baseline;
    
    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Domain-Wide Visual Testing</h1>
          <p className="text-muted-foreground">
            Automatically crawl and test entire domains with AI-powered visual checkpoints
          </p>
        </div>
        <Globe className="w-8 h-8 text-primary" />
      </div>

      {/* Project Selector */}
      {projects.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Label htmlFor="project">Project:</Label>
              <select
                id="project"
                value={selectedProject?.id || ''}
                onChange={(e) => {
                  const project = projects.find(p => p.id === e.target.value);
                  setSelectedProject(project || null);
                }}
                className="px-3 py-2 border rounded-md bg-background"
              >
                <option value="">Select a project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="create" className="space-y-6">
        <TabsList>
          <TabsTrigger value="create">Create Test</TabsTrigger>
          <TabsTrigger value="sessions">Test Sessions</TabsTrigger>
          <TabsTrigger value="monitor">Monitor Progress</TabsTrigger>
          <TabsTrigger value="results">Visual Results</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-6">
          {!selectedProject ? (
            <Alert>
              <AlertDescription>
                Please select a project to create domain testing sessions.
              </AlertDescription>
            </Alert>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Start Domain-Wide Test</CardTitle>
                <CardDescription>
                  Configure and launch a comprehensive test of your entire domain
                </CardDescription>
              </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Test Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Homepage Visual Regression"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="seed_url">Starting URL</Label>
                  <Input
                    id="seed_url"
                    placeholder="https://example.com"
                    value={formData.seed_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, seed_url: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max_depth">Max Crawl Depth</Label>
                  <Input
                    id="max_depth"
                    type="number"
                    min="1"
                    max="5"
                    value={formData.max_depth}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_depth: parseInt(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_pages">Max Pages</Label>
                  <Input
                    id="max_pages"
                    type="number"
                    min="10"
                    max="500"
                    value={formData.max_pages}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_pages: parseInt(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Visual Testing</Label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="visual_enabled"
                      checked={formData.visual_enabled}
                      onChange={(e) => setFormData(prev => ({ ...prev, visual_enabled: e.target.checked }))}
                    />
                    <Label htmlFor="visual_enabled">Enable AI Visual Checkpoints</Label>
                  </div>
                </div>
              </div>

              {formData.visual_enabled && (
                <div className="space-y-2">
                  <Label>Checkpoint Types</Label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: 'full_page', label: 'Full Page', icon: Monitor },
                      { value: 'viewport', label: 'Viewport', icon: Monitor },
                      { value: 'mobile', label: 'Mobile', icon: Smartphone },
                      { value: 'tablet', label: 'Tablet', icon: Monitor }
                    ].map(({ value, label, icon: Icon }) => (
                      <div key={value} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={value}
                          checked={formData.checkpoint_types.includes(value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData(prev => ({
                                ...prev,
                                checkpoint_types: [...prev.checkpoint_types, value]
                              }));
                            } else {
                              setFormData(prev => ({
                                ...prev,
                                checkpoint_types: prev.checkpoint_types.filter(t => t !== value)
                              }));
                            }
                          }}
                        />
                        <Label htmlFor={value} className="flex items-center gap-1">
                          <Icon className="w-4 h-4" />
                          {label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button 
                onClick={createSession} 
                disabled={isCreating || !formData.name || !formData.seed_url || !selectedProject}
                className="w-full"
              >
                {isCreating ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Starting Domain Test...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Start Domain-Wide Test
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
          )}
        </TabsContent>

        <TabsContent value="sessions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Test Sessions</CardTitle>
              <CardDescription>View and manage your domain testing sessions</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Loading sessions...</div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No domain testing sessions found. Create your first test to get started.
                </div>
              ) : (
                <div className="space-y-4">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                        currentSession?.id === session.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => selectSession(session)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h3 className="font-medium">{session.name}</h3>
                          <p className="text-sm text-muted-foreground">{session.seed_url}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{session.pages_crawled} / {session.pages_discovered} pages</span>
                            <span>{session.total_visual_checkpoints} checkpoints</span>
                            <span>Started {new Date(session.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        {getStatusBadge(session.status)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitor" className="space-y-6">
          {currentSession ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    {currentSession.name}
                  </CardTitle>
                  <CardDescription>{currentSession.seed_url}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {progress && (
                    <>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Crawling Progress</span>
                          <span>{progress.progress_percentage.toFixed(1)}%</span>
                        </div>
                        <Progress value={progress.progress_percentage} className="w-full" />
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold">{progress.total_pages}</div>
                          <div className="text-xs text-muted-foreground">Total Pages</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">{progress.crawled_pages}</div>
                          <div className="text-xs text-muted-foreground">Crawled</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">{progress.total_checkpoints}</div>
                          <div className="text-xs text-muted-foreground">Checkpoints</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">{progress.failed_checkpoints}</div>
                          <div className="text-xs text-muted-foreground">Issues Found</div>
                        </div>
                      </div>

                      {progress.current_url && (
                        <Alert>
                          <Globe className="w-4 h-4" />
                          <AlertDescription>
                            Currently crawling: {progress.current_url}
                          </AlertDescription>
                        </Alert>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Select a session from the Sessions tab to monitor its progress
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          {currentSession ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="w-5 h-5" />
                  Visual Checkpoints
                </CardTitle>
                <CardDescription>
                  AI-generated visual checkpoints and comparison results
                </CardDescription>
              </CardHeader>
              <CardContent>
                {checkpoints.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No visual checkpoints available for this session
                  </div>
                ) : (
                  <ScrollArea className="h-96">
                    <div className="space-y-4">
                      {checkpoints.map((checkpoint) => {
                        const Icon = getCheckpointIcon(checkpoint.checkpoint_type);
                        return (
                          <div key={checkpoint.id} className="flex items-center gap-4 p-4 rounded-lg border">
                            <Icon className="w-8 h-8 text-muted-foreground" />
                            <div className="flex-1 space-y-1">
                              <h4 className="font-medium">{checkpoint.checkpoint_name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {checkpoint.domain_crawl_pages.url}
                              </p>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{checkpoint.checkpoint_type}</Badge>
                                {getComparisonStatusBadge(checkpoint.comparison_status, checkpoint.difference_percentage)}
                              </div>
                            </div>
                            {checkpoint.screenshot_url && (
                              <Button variant="outline" size="sm">
                                <Eye className="w-4 h-4 mr-2" />
                                View
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Select a session to view its visual results
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}