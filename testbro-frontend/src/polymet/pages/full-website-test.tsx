import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Globe,
  Plus,
  Search,
  Filter,
  Download,
  RefreshCw,
  Play,
  Pause,
  Eye,
  Settings,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  BarChart3,
  Camera,
  Monitor,
  Smartphone,
  Tablet
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { fullWebsiteTestApi } from '@/lib/fullWebsiteTestApi';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { 
  FullWebsiteTestSession, 
  SessionListParams,
  FullWebsiteTestTemplate 
} from '@/types/full-website-test';

import TestConfigurationModal from '@/components/full-website-test/TestConfigurationModal';
import TestResultsModal from '@/components/full-website-test/TestResultsModal';
import TestProgressCard from '@/components/full-website-test/TestProgressCard';

const FullWebsiteTestDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { selectedProject } = useOrganization();

  // State management
  const [sessions, setSessions] = useState<FullWebsiteTestSession[]>([]);
  const [templates, setTemplates] = useState<FullWebsiteTestTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<FullWebsiteTestSession | null>(null);
  
  // Filter and search states
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(
    (searchParams.get('order') as 'asc' | 'desc') || 'desc'
  );

  // Pagination states
  const [currentPage, setCurrentPage] = useState(
    parseInt(searchParams.get('page') || '1')
  );
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Computed values
  const filteredSessions = useMemo(() => {
    return sessions.filter(session => {
      if (statusFilter !== 'all' && session.status !== statusFilter) return false;
      if (searchQuery && !session.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !session.base_url.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [sessions, statusFilter, searchQuery]);

  // Statistics
  const statistics = useMemo(() => {
    return {
      total: sessions.length,
      running: sessions.filter(s => fullWebsiteTestApi.isSessionRunning(s)).length,
      completed: sessions.filter(s => s.status === 'completed').length,
      failed: sessions.filter(s => s.status === 'failed').length,
      totalUrls: sessions.reduce((sum, s) => sum + s.total_urls, 0),
      totalScreenshots: sessions.reduce((sum, s) => sum + (s.results_summary?.total_screenshots_captured || 0), 0)
    };
  }, [sessions]);

  // Load data
  useEffect(() => {
    loadSessions();
    loadTemplates();
  }, [selectedProject, currentPage, statusFilter, sortBy, sortOrder]);

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (sortBy !== 'created_at') params.set('sort', sortBy);
    if (sortOrder !== 'desc') params.set('order', sortOrder);
    if (currentPage !== 1) params.set('page', currentPage.toString());
    
    setSearchParams(params);
  }, [searchQuery, statusFilter, sortBy, sortOrder, currentPage, setSearchParams]);

  const loadSessions = async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      
      setError(null);

      const params: SessionListParams = {
        page: currentPage,
        limit: 20,
        sort_by: sortBy as any,
        sort_order: sortOrder,
      };

      if (selectedProject?.id) {
        params.project_id = selectedProject.id;
      }

      if (statusFilter !== 'all') {
        params.status = statusFilter as any;
      }

      const response = await fullWebsiteTestApi.getSessions(params);
      setSessions(response.data);
      setTotalPages(response.meta.pagination.totalPages);
      setTotalItems(response.meta.pagination.totalItems);
    } catch (err) {
      console.error('Failed to load test sessions:', err);
      setError('Failed to load test sessions. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const templatesData = await fullWebsiteTestApi.getTemplates();
      setTemplates(templatesData);
    } catch (err) {
      console.error('Failed to load templates:', err);
    }
  };

  const handleStartTest = () => {
    if (!selectedProject) {
      setError('Please select a project first');
      return;
    }
    setShowConfigModal(true);
  };

  const handleViewResults = (session: FullWebsiteTestSession) => {
    setSelectedSession(session);
    setShowResultsModal(true);
  };

  const handleCancelTest = async (sessionId: string) => {
    try {
      await fullWebsiteTestApi.cancelTest(sessionId);
      await loadSessions(true);
    } catch (err) {
      console.error('Failed to cancel test:', err);
      setError('Failed to cancel test. Please try again.');
    }
  };

  const handleTestCreated = (newSession: FullWebsiteTestSession) => {
    setSessions(prev => [newSession, ...prev]);
    setShowConfigModal(false);
  };

  const getStatusIcon = (status: FullWebsiteTestSession['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
      case 'cancelled':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
      case 'discovering_urls':
      case 'taking_screenshots':
      case 'analyzing_changes':
      case 'monitoring':
        return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatDuration = (startedAt?: string, completedAt?: string) => {
    if (!startedAt) return 'Not started';
    
    const start = new Date(startedAt);
    const end = completedAt ? new Date(completedAt) : new Date();
    const duration = Math.round((end.getTime() - start.getTime()) / 1000);
    
    if (duration < 60) return `${duration}s`;
    if (duration < 3600) return `${Math.round(duration / 60)}m`;
    return `${Math.round(duration / 3600)}h`;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Full Website Testing</h1>
            <p className="text-muted-foreground">
              Comprehensive website analysis, monitoring, and testing
            </p>
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Globe className="h-8 w-8 text-blue-600" />
            Full Website Testing
          </h1>
          <p className="text-muted-foreground">
            Comprehensive website analysis, monitoring, and testing
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadSessions(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button 
            onClick={handleStartTest}
            disabled={!selectedProject}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Test
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Tests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              Running Tests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{statistics.running}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{statistics.completed}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Camera className="h-4 w-4 text-purple-500" />
              Screenshots
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{statistics.totalScreenshots}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Test Sessions</CardTitle>
          <CardDescription>
            Manage and monitor your website testing sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search tests by name or URL..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="discovering_urls">Discovering URLs</SelectItem>
                <SelectItem value="taking_screenshots">Taking Screenshots</SelectItem>
                <SelectItem value="analyzing_changes">Analyzing Changes</SelectItem>
                <SelectItem value="monitoring">Monitoring</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
              const [field, order] = value.split('-');
              setSortBy(field);
              setSortOrder(order as 'asc' | 'desc');
            }}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at-desc">Newest First</SelectItem>
                <SelectItem value="created_at-asc">Oldest First</SelectItem>
                <SelectItem value="name-asc">Name A-Z</SelectItem>
                <SelectItem value="name-desc">Name Z-A</SelectItem>
                <SelectItem value="status-asc">Status</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Test Sessions List */}
          <div className="space-y-4">
            {filteredSessions.length === 0 ? (
              <div className="text-center py-12">
                <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No test sessions found</h3>
                <p className="text-muted-foreground mb-4">
                  {sessions.length === 0 
                    ? "Get started by creating your first full website test" 
                    : "Try adjusting your search or filters"}
                </p>
                {sessions.length === 0 && (
                  <Button onClick={handleStartTest} disabled={!selectedProject}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Test
                  </Button>
                )}
              </div>
            ) : (
              filteredSessions.map((session) => (
                <TestProgressCard
                  key={session.id}
                  session={session}
                  onViewResults={() => handleViewResults(session)}
                  onCancel={() => handleCancelTest(session.id)}
                />
              ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * 20) + 1} to {Math.min(currentPage * 20, totalItems)} of {totalItems} results
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                
                <div className="text-sm">
                  Page {currentPage} of {totalPages}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      {showConfigModal && (
        <TestConfigurationModal
          open={showConfigModal}
          onOpenChange={setShowConfigModal}
          onTestCreated={handleTestCreated}
          templates={templates}
          selectedProject={selectedProject}
        />
      )}

      {showResultsModal && selectedSession && (
        <TestResultsModal
          open={showResultsModal}
          onOpenChange={setShowResultsModal}
          session={selectedSession}
        />
      )}
    </div>
  );
};

export default FullWebsiteTestDashboard;
