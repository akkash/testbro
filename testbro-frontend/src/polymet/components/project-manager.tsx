import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Settings,
  Users,
  Target,
  TestTube,
  Calendar,
  Activity,
  CheckCircle,
  XCircle,
  AlertCircle,
  FolderOpen,
  Globe,
  Smartphone,
  Monitor,
  Loader2,
  Play,
  Zap,
  TrendingDown,
  Clock,
  Folder,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import ProjectCreationDialog from "@/polymet/components/project-creation-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { ProjectService, Project, CreateProjectData } from "@/lib/services/projectService";

const ProjectCard = ({ project }: { project: Project }) => {
  const statusConfig = {
    active: { color: "bg-green-100 text-green-800", icon: CheckCircle },
    inactive: { color: "bg-gray-100 text-gray-800", icon: XCircle },
    archived: { color: "bg-red-100 text-red-800", icon: AlertCircle },
  };

  const config = statusConfig[project.status];
  const StatusIcon = config.icon;

  // Using real data from API response
  const totalTargets = project.test_targets_count || 0;
  const activeTargets = totalTargets; // Assume all targets are active for now
  const totalTestCases = project.test_cases_count || 0;
  const avgPassRate = 85; // TODO: Calculate from actual metrics when available

  // Mock recent failures data (would come from API)
  const recentFailures = [
    { name: "Login Form Validation", time: "2 hours ago", severity: "high" },
    { name: "Checkout Process", time: "5 hours ago", severity: "medium" },
  ];

  const handleRunAllTests = () => {
    console.log(`Running all tests for project: ${project.name}`);
    // TODO: Implement test execution logic
  };



  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "web":
        return Globe;
      case "mobile-web":
        return Monitor;
      case "mobile-app":
        return Smartphone;
      default:
        return Globe;
    }
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg mb-1">{project.name}</CardTitle>
            <CardDescription className="text-sm">
              {project.description}
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            {/* Run All Tests Button */}
            <Button
              size="sm"
              onClick={handleRunAllTests}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Zap className="w-3 h-3 mr-1" />
              Run All Tests
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuItem>
                  <Settings className="w-4 h-4 mr-2" />
                  Project Settings
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Users className="w-4 h-4 mr-2" />
                  Manage Team
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Target className="w-4 h-4 mr-2" />
                  Add Target
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <TestTube className="w-4 h-4 mr-2" />
                  View Test Cases
                </DropdownMenuItem>
                <DropdownMenuSeparator />

                <DropdownMenuItem className="text-red-600">
                  <XCircle className="w-4 h-4 mr-2" />
                  Archive Project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Status and Tags */}
          <div className="flex items-center justify-between">
            <div className="flex items-center flex-wrap gap-2">
              <Badge variant="secondary" className={config.color}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {project.status}
              </Badge>
              {project.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <Globe className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600">{totalTargets} targets</span>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
              <div className="text-2xl font-bold text-blue-700">{totalTestCases}</div>
              <div className="text-xs text-blue-600">Test Cases</div>
            </div>
            <div className="text-center p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
              <div className="text-2xl font-bold text-green-700">{avgPassRate}%</div>
              <div className="text-xs text-green-600">Pass Rate</div>
            </div>
            <div className="text-center p-3 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
              <div className="text-2xl font-bold text-purple-700">{totalTargets}</div>
              <div className="text-xs text-purple-600">Targets</div>
            </div>
          </div>

          {/* Recent Failures */}
          {recentFailures.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <TrendingDown className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-medium text-gray-700">Recent Failures</span>
                  <Badge variant="destructive" className="text-xs">
                    {recentFailures.length}
                  </Badge>
                </div>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" asChild>
                  <Link to={`/test-results/${project.id}`}>View All</Link>
                </Button>
              </div>
              <div className="space-y-2">
                {recentFailures.slice(0, 2).map((failure, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-red-50 rounded-md border border-red-100">
                    <div className="flex items-center space-x-2">
                      <XCircle className="w-3 h-3 text-red-500" />
                      <span className="text-xs font-medium text-red-900">{failure.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          failure.severity === 'high'
                            ? 'border-red-300 text-red-700'
                            : 'border-orange-300 text-orange-700'
                        }`}
                      >
                        {failure.severity}
                      </Badge>
                      <span className="text-xs text-gray-500">{failure.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Team and Last Updated */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-gray-500" />
              <div className="flex -space-x-2">
                <div className="w-6 h-6 bg-gray-100 border-2 border-white rounded-full flex items-center justify-center">
                  <span className="text-xs text-gray-600">1</span>
                </div>
              </div>
              <span className="text-xs text-gray-600">member</span>
            </div>
            <div className="flex items-center space-x-1 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              <span>{new Date(project.updated_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function ProjectManager() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();

  // Load projects from API
  useEffect(() => {
    const loadProjects = async () => {
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null); // Clear any previous errors
        const { data, error: projectError } = await ProjectService.listProjects();
        if (projectError) {
          // Check if it's a "no projects" case vs actual error
          if (projectError.includes('404') || projectError.includes('Not Found') || projectError.includes('No projects found')) {
            // This is likely an empty state, not an error
            setProjects([]);
            setError(null);
          } else {
            setError(projectError);
            console.error('Failed to load projects:', projectError);
          }
        } else {
          setProjects(data || []);
        }
      } catch (err) {
        // Only set error for actual network/server errors
        if (err instanceof Error && err.message.includes('fetch')) {
          const errorMessage = 'Unable to connect to server. Please check your connection and try again.';
          setError(errorMessage);
          console.error('Network error loading projects:', err);
        } else {
          // For other errors, treat as empty state
          setProjects([]);
          setError(null);
        }
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, [isAuthenticated]);

  const handleCreateProject = async (newProjectData: CreateProjectData) => {
    try {
      const { data, error } = await ProjectService.createProject(newProjectData);
      if (error) {
        console.error('Failed to create project:', error);
        setError(error);
      } else if (data) {
        setProjects((prev) => [data, ...prev]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create project';
      console.error('Error creating project:', err);
      setError(errorMessage);
    }
  };

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.tags.some((tag) =>
        tag.toLowerCase().includes(searchTerm.toLowerCase())
      );

    const matchesStatus =
      statusFilter === "all" || project.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: projects.length,
    active: projects.filter((p) => p.status === "active").length,
    inactive: projects.filter((p) => p.status === "inactive").length,
    archived: projects.filter((p) => p.status === "archived").length,
  };

  // Show loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
            <p className="text-gray-600">
              Manage your testing projects, targets, and team collaboration
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Loading projects...</span>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
            <p className="text-gray-600">
              Manage your testing projects, targets, and team collaboration
            </p>
          </div>
        </div>
        <div className="text-center py-12">
          <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Failed to load projects
          </h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Show authentication required state
  if (!isAuthenticated) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
            <p className="text-gray-600">
              Manage your testing projects, targets, and team collaboration
            </p>
          </div>
        </div>
        <div className="text-center py-12">
          <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Users className="w-6 h-6 text-yellow-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Authentication Required
          </h3>
          <p className="text-gray-500 mb-4">
            Please sign in to manage your projects
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-600">
            Manage your testing projects, targets, and team collaboration
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
          <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Projects</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.total}
                </p>
              </div>
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <FolderOpen className="w-4 h-4 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.active}
                </p>
              </div>
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Inactive</p>
                <p className="text-2xl font-bold text-gray-600">
                  {stats.inactive}
                </p>
              </div>
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                <XCircle className="w-4 h-4 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Archived</p>
                <p className="text-2xl font-bold text-orange-600">
                  {stats.archived}
                </p>
              </div>
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-4 h-4 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />

            <Input
              type="search"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>

      {/* Empty State and Onboarding */}
      {filteredProjects.length === 0 && !error && (
        <div className="text-center py-16">
          {projects.length === 0 && !searchTerm && statusFilter === "all" ? (
            // True empty state - no projects exist
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Folder className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                You don't have projects yet
              </h3>
              <p className="text-gray-600 mb-8 leading-relaxed">
                Create your first project to group tests & targets. Projects help you organize your testing workflow and collaborate with your team.
              </p>
              
              <div className="space-y-4">
                <Button 
                  size="lg" 
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create Your First Project
                </Button>
                
                {/* Onboarding Steps */}
                <div className="mt-8 p-6 bg-gray-50 rounded-lg border">
                  <h4 className="text-sm font-medium text-gray-900 mb-4">What you can do with projects:</h4>
                  <div className="space-y-3 text-sm text-gray-600">
                    <div className="flex items-start space-x-3">
                      <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                        <span className="text-xs font-medium text-blue-600">1</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Organize test targets</span>
                        <p className="text-xs text-gray-500 mt-1">Group related websites, apps, and APIs for testing</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                        <span className="text-xs font-medium text-green-600">2</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Create test cases</span>
                        <p className="text-xs text-gray-500 mt-1">Build automated tests using AI or manual recording</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-5 h-5 bg-purple-100 rounded-full flex items-center justify-center mt-0.5">
                        <span className="text-xs font-medium text-purple-600">3</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Collaborate with team</span>
                        <p className="text-xs text-gray-500 mt-1">Share projects and track progress together</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Quick Links */}
                <div className="mt-6 flex items-center justify-center space-x-4 text-sm">
                  <Link 
                    to="/features" 
                    className="flex items-center text-blue-600 hover:text-blue-700"
                  >
                    <BookOpen className="w-4 h-4 mr-1" />
                    Learn more
                  </Link>
                  <span className="text-gray-300">•</span>
                  <Link 
                    to="/test-targets" 
                    className="flex items-center text-blue-600 hover:text-blue-700"
                  >
                    <Target className="w-4 h-4 mr-1" />
                    Browse test targets
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            // Filtered empty state - projects exist but none match current filters
            <div className="max-w-sm mx-auto">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Search className="w-6 h-6 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No projects found
              </h3>
              <p className="text-gray-500 mb-4">
                Try adjusting your search or filters to find what you're looking for.
              </p>
              <div className="flex items-center justify-center space-x-3">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                  }}
                >
                  Clear Filters
                </Button>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Project
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Archived Projects Section */}
      {stats.archived > 0 && statusFilter === "all" && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              <h2 className="text-lg font-semibold text-gray-900">Archived Projects</h2>
              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                {stats.archived}
              </Badge>
            </div>
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Manage Archives
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-75">
            {projects
              .filter((project) => project.status === "archived")
              .slice(0, 3)
              .map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
          </div>
          {stats.archived > 3 && (
            <div className="text-center mt-4">
              <Button variant="ghost" size="sm">
                View All Archived Projects ({stats.archived})
              </Button>
            </div>
          )}
        </div>
      )}

      {filteredProjects.length === 0 && (
        <div className="text-center py-12">
          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Search className="w-6 h-6 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No projects found
          </h3>
          <p className="text-gray-500 mb-4">
            {searchTerm || statusFilter !== "all"
              ? "Try adjusting your search or filters"
              : "Get started by creating your first project"}
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Project
          </Button>
        </div>
      )}

      {/* Project Creation Dialog */}
      <ProjectCreationDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreateProject={handleCreateProject}
      />
    </div>
  );
}
