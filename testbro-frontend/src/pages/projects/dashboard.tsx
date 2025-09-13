/**
 * Project Management Dashboard
 * Comprehensive project overview and management interface
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  DataTable,
  StatusBadge,
  LoadingSpinner,
  ErrorState,
  Modal,
  ConfirmationModal,
  FormField,
  EmailField,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui';
import {
  PlusIcon,
  FolderIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  PlayIcon,
  ChartBarIcon,
  UsersIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';

interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'archived';
  environment: 'development' | 'staging' | 'production';
  url: string;
  owner: {
    id: string;
    name: string;
    email: string;
  };
  team: {
    id: string;
    name: string;
    role: 'owner' | 'editor' | 'viewer';
  }[];
  metrics: {
    totalTests: number;
    passRate: number;
    lastRun: string | null;
    lastRunStatus: 'passed' | 'failed' | 'running' | 'cancelled';
    avgExecutionTime: number;
    uxScore: number;
  };
  settings: {
    notifications: boolean;
    autoRun: boolean;
    failureThreshold: number;
  };
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

interface ProjectFilters {
  status: string;
  environment: string;
  owner: string;
  search: string;
}

export default function ProjectDashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ProjectFilters>({
    status: '',
    environment: '',
    owner: '',
    search: ''
  });
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProjects, setTotalProjects] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortConfig, setSortConfig] = useState<{
    column: string;
    direction: 'asc' | 'desc';
  }>({ column: 'updatedAt', direction: 'desc' });

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showBulkActions, setShowBulkActions] = useState(false);

  const navigate = useNavigate();

  // Mock data - replace with API calls
  const mockProjects: Project[] = [
    {
      id: 'proj-1',
      name: 'E-commerce Platform',
      description: 'Main shopping website with checkout flow testing',
      status: 'active',
      environment: 'production',
      url: 'https://shop.example.com',
      owner: {
        id: 'user-1',
        name: 'John Doe',
        email: 'john@example.com'
      },
      team: [
        { id: 'user-1', name: 'John Doe', role: 'owner' },
        { id: 'user-2', name: 'Jane Smith', role: 'editor' },
        { id: 'user-3', name: 'Bob Johnson', role: 'viewer' }
      ],
      metrics: {
        totalTests: 24,
        passRate: 92.5,
        lastRun: '2024-01-24T14:30:00Z',
        lastRunStatus: 'passed',
        avgExecutionTime: 3.2,
        uxScore: 88
      },
      settings: {
        notifications: true,
        autoRun: false,
        failureThreshold: 80
      },
      createdAt: '2024-01-15T09:00:00Z',
      updatedAt: '2024-01-24T14:30:00Z',
      tags: ['critical', 'ecommerce', 'checkout']
    },
    {
      id: 'proj-2',
      name: 'User Dashboard',
      description: 'Customer portal and account management',
      status: 'active',
      environment: 'staging',
      url: 'https://dashboard.staging.example.com',
      owner: {
        id: 'user-2',
        name: 'Jane Smith',
        email: 'jane@example.com'
      },
      team: [
        { id: 'user-2', name: 'Jane Smith', role: 'owner' },
        { id: 'user-3', name: 'Bob Johnson', role: 'editor' }
      ],
      metrics: {
        totalTests: 18,
        passRate: 88.9,
        lastRun: '2024-01-24T10:15:00Z',
        lastRunStatus: 'failed',
        avgExecutionTime: 2.8,
        uxScore: 85
      },
      settings: {
        notifications: true,
        autoRun: true,
        failureThreshold: 85
      },
      createdAt: '2024-01-10T14:00:00Z',
      updatedAt: '2024-01-24T10:15:00Z',
      tags: ['dashboard', 'user-management']
    },
    {
      id: 'proj-3',
      name: 'Marketing Site',
      description: 'Company marketing website and landing pages',
      status: 'inactive',
      environment: 'production',
      url: 'https://www.example.com',
      owner: {
        id: 'user-3',
        name: 'Bob Johnson',
        email: 'bob@example.com'
      },
      team: [
        { id: 'user-3', name: 'Bob Johnson', role: 'owner' }
      ],
      metrics: {
        totalTests: 12,
        passRate: 100,
        lastRun: '2024-01-20T16:00:00Z',
        lastRunStatus: 'passed',
        avgExecutionTime: 1.5,
        uxScore: 92
      },
      settings: {
        notifications: false,
        autoRun: false,
        failureThreshold: 90
      },
      createdAt: '2024-01-05T11:30:00Z',
      updatedAt: '2024-01-20T16:00:00Z',
      tags: ['marketing', 'landing-pages']
    }
  ];

  // Load projects data
  useEffect(() => {
    const loadProjects = async () => {
      setLoading(true);
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setProjects(mockProjects);
        setTotalProjects(mockProjects.length);
      } catch (error) {
        console.error('Failed to load projects:', error);
        setError('Failed to load projects');
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, [currentPage, pageSize, sortConfig, filters]);

  // Filter projects based on current filters
  const filteredProjects = React.useMemo(() => {
    return projects.filter(project => {
      if (filters.status && project.status !== filters.status) return false;
      if (filters.environment && project.environment !== filters.environment) return false;
      if (filters.owner && project.owner.id !== filters.owner) return false;
      if (filters.search && !project.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
      return true;
    });
  }, [projects, filters]);

  // Data table columns
  const columns = [
    {
      key: 'name',
      title: 'Project Name',
      sortable: true,
      render: (value: string, project: Project) => (
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <div className={`w-3 h-3 rounded-full ${
              project.status === 'active' ? 'bg-green-500' :
              project.status === 'inactive' ? 'bg-yellow-500' : 'bg-gray-500'
            }`} />
          </div>
          <div>
            <Link
              to={`/projects/${project.id}`}
              className="font-medium text-blue-600 hover:text-blue-800"
            >
              {value}
            </Link>
            <p className="text-sm text-gray-500 truncate max-w-xs">
              {project.description}
            </p>
          </div>
        </div>
      )
    },
    {
      key: 'status',
      title: 'Status',
      filterable: true,
      filterType: 'select' as const,
      filterOptions: [
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
        { label: 'Archived', value: 'archived' }
      ],
      render: (value: string) => (
        <StatusBadge 
          status={value === 'active' ? 'success' : value === 'inactive' ? 'warning' : 'pending'}
        >
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </StatusBadge>
      )
    },
    {
      key: 'environment',
      title: 'Environment',
      filterable: true,
      filterType: 'select' as const,
      filterOptions: [
        { label: 'Development', value: 'development' },
        { label: 'Staging', value: 'staging' },
        { label: 'Production', value: 'production' }
      ],
      render: (value: string) => (
        <StatusBadge 
          status={value === 'production' ? 'error' : value === 'staging' ? 'warning' : 'pending'}
          size="sm"
        >
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </StatusBadge>
      )
    },
    {
      key: 'metrics',
      title: 'Test Metrics',
      render: (value: Project['metrics']) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Tests:</span>
            <span className="font-medium">{value.totalTests}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Pass Rate:</span>
            <span className={`font-medium ${
              value.passRate >= 95 ? 'text-green-600' :
              value.passRate >= 80 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {value.passRate.toFixed(1)}%
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">UX Score:</span>
            <span className="font-medium">{value.uxScore}</span>
          </div>
        </div>
      )
    },
    {
      key: 'lastRun',
      title: 'Last Run',
      sortable: true,
      render: (value: string | null, project: Project) => {
        if (!value) {
          return <span className="text-gray-400">Never</span>;
        }
        
        const date = new Date(value);
        const status = project.metrics.lastRunStatus;
        
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              {status === 'passed' && <CheckCircleIcon className="w-4 h-4 text-green-500" />}
              {status === 'failed' && <XCircleIcon className="w-4 h-4 text-red-500" />}
              {status === 'running' && <ClockIcon className="w-4 h-4 text-blue-500" />}
              <StatusBadge 
                status={status === 'passed' ? 'success' : status === 'failed' ? 'error' : 'running'}
                size="sm"
              >
                {status}
              </StatusBadge>
            </div>
            <p className="text-xs text-gray-500">
              {date.toLocaleDateString()} {date.toLocaleTimeString()}
            </p>
          </div>
        );
      }
    },
    {
      key: 'owner',
      title: 'Owner',
      render: (value: Project['owner']) => (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
            <span className="text-xs font-medium text-gray-600">
              {value.name.split(' ').map(n => n[0]).join('')}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium">{value.name}</p>
            <p className="text-xs text-gray-500">{value.email}</p>
          </div>
        </div>
      )
    },
    {
      key: 'team',
      title: 'Team',
      render: (value: Project['team']) => (
        <div className="flex items-center">
          <div className="flex -space-x-1">
            {value.slice(0, 3).map(member => (
              <div
                key={member.id}
                className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center border border-white"
                title={member.name}
              >
                <span className="text-xs font-medium text-gray-600">
                  {member.name.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
            ))}
          </div>
          {value.length > 3 && (
            <span className="ml-2 text-sm text-gray-500">
              +{value.length - 3} more
            </span>
          )}
        </div>
      )
    }
  ];

  // Handle actions
  const handleCreateProject = () => {
    navigate('/projects/new');
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setProjects(prev => prev.filter(p => p.id !== projectId));
      toast.success('Project deleted successfully');
    } catch (error) {
      console.error('Failed to delete project:', error);
      toast.error('Failed to delete project');
    }
    setShowDeleteConfirm(null);
  };

  const handleBulkAction = async (action: string) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      switch (action) {
        case 'activate':
          setProjects(prev => prev.map(p => 
            selectedProjects.includes(p.id) 
              ? { ...p, status: 'active' as const }
              : p
          ));
          toast.success(`Activated ${selectedProjects.length} projects`);
          break;
        case 'deactivate':
          setProjects(prev => prev.map(p => 
            selectedProjects.includes(p.id) 
              ? { ...p, status: 'inactive' as const }
              : p
          ));
          toast.success(`Deactivated ${selectedProjects.length} projects`);
          break;
        case 'archive':
          setProjects(prev => prev.map(p => 
            selectedProjects.includes(p.id) 
              ? { ...p, status: 'archived' as const }
              : p
          ));
          toast.success(`Archived ${selectedProjects.length} projects`);
          break;
      }
      
      setSelectedProjects([]);
      setShowBulkActions(false);
    } catch (error) {
      console.error('Bulk action failed:', error);
      toast.error('Bulk action failed');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ErrorState
          type="server"
          message={error}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
          <p className="mt-2 text-gray-600">
            Manage your testing projects and their configurations
          </p>
        </div>
        <div className="flex gap-3">
          {selectedProjects.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setShowBulkActions(true)}
            >
              <FunnelIcon className="w-4 h-4 mr-2" />
              Bulk Actions ({selectedProjects.length})
            </Button>
          )}
          <Button onClick={handleCreateProject}>
            <PlusIcon className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <FolderIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projects.length}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <ArrowUpIcon className="h-3 w-3 mr-1" />
              +2 this month
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <CheckCircleIcon className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {projects.filter(p => p.status === 'active').length}
            </div>
            <div className="text-xs text-muted-foreground">
              {((projects.filter(p => p.status === 'active').length / projects.length) * 100).toFixed(1)}% of total
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Pass Rate</CardTitle>
            <ChartBarIcon className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(projects.reduce((sum, p) => sum + p.metrics.passRate, 0) / projects.length).toFixed(1)}%
            </div>
            <div className="flex items-center text-xs text-green-600">
              <ArrowUpIcon className="h-3 w-3 mr-1" />
              +2.1% from last week
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <UsersIcon className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {[...new Set(projects.flatMap(p => p.team.map(t => t.id)))].length}
            </div>
            <div className="text-xs text-muted-foreground">
              Across all projects
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Projects Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Projects</CardTitle>
          <CardDescription>
            View and manage all your testing projects
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={filteredProjects}
            columns={columns}
            rowSelection
            selectedRowKeys={selectedProjects}
            onSelectionChange={(keys) => setSelectedProjects(keys as string[])}
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={totalProjects}
            onPageChange={setCurrentPage}
            searchable
            searchValue={filters.search}
            onSearchChange={(value) => setFilters(prev => ({ ...prev, search: value }))}
            filterable
            filters={filters}
            onFilterChange={(newFilters) => setFilters({ ...filters, ...newFilters })}
            sort={sortConfig}
            onSortChange={(column, direction) => setSortConfig({ column, direction })}
            rowActions={(project) => (
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <EyeIcon className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => navigate(`/projects/${project.id}/edit`)}
                >
                  <PencilIcon className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => navigate(`/test-execution/${project.id}`)}
                >
                  <PlayIcon className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowDeleteConfirm(project.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <TrashIcon className="w-4 h-4" />
                </Button>
              </div>
            )}
          />
        </CardContent>
      </Card>

      {/* Bulk Actions Modal */}
      <Modal
        open={showBulkActions}
        onOpenChange={setShowBulkActions}
        title="Bulk Actions"
        description={`Perform actions on ${selectedProjects.length} selected projects`}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <Button
              variant="outline"
              onClick={() => handleBulkAction('activate')}
              className="justify-start"
            >
              <CheckCircleIcon className="w-4 h-4 mr-2" />
              Activate Projects
            </Button>
            <Button
              variant="outline"
              onClick={() => handleBulkAction('deactivate')}
              className="justify-start"
            >
              <ExclamationTriangleIcon className="w-4 h-4 mr-2" />
              Deactivate Projects
            </Button>
            <Button
              variant="outline"
              onClick={() => handleBulkAction('archive')}
              className="justify-start"
            >
              <FolderIcon className="w-4 h-4 mr-2" />
              Archive Projects
            </Button>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowBulkActions(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        open={!!showDeleteConfirm}
        onOpenChange={() => setShowDeleteConfirm(null)}
        title="Delete Project"
        message="Are you sure you want to delete this project? This action cannot be undone and will remove all associated tests and data."
        confirmText="Delete"
        confirmVariant="destructive"
        onConfirm={() => showDeleteConfirm && handleDeleteProject(showDeleteConfirm)}
      />
    </div>
  );
}
