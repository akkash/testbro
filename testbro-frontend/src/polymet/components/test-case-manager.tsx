import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Play,
  Edit,
  Trash2,
  Copy,
  Bot,
  Clock,
  Tag,
  User,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  FolderOpen,
  Target,
  Loader2,
} from "lucide-react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { TestCaseService, TestCase } from "@/lib/services/testCaseService";
import { ProjectService, Project } from "@/lib/services/projectService";
import { useAuth } from "@/contexts/AuthContext";

const TestCaseCard = ({ testCase, projects }: { testCase: TestCase; projects: Project[] }) => {
  const statusConfig = {
    draft: { color: "bg-gray-100 text-gray-800", icon: AlertCircle },
    active: { color: "bg-green-100 text-green-800", icon: CheckCircle },
    archived: { color: "bg-red-100 text-red-800", icon: XCircle },
  };

  const priorityConfig = {
    low: "bg-blue-100 text-blue-800",
    medium: "bg-yellow-100 text-yellow-800",
    high: "bg-orange-100 text-orange-800",
    critical: "bg-red-100 text-red-800",
  };

  const config = statusConfig[testCase.status];
  const StatusIcon = config.icon;

  // Find the project this test case belongs to
  const project = projects.find((p) => p.id === testCase.project_id);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg mb-1">{testCase.name}</CardTitle>
            <CardDescription className="text-sm">
              {testCase.description}
            </CardDescription>
          </div>
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
                <Play className="w-4 h-4 mr-2" />
                Run Test
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/ai-simulation">
                  <Bot className="w-4 h-4 mr-2" />
                  AI Simulation
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Copy className="w-4 h-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />

              <DropdownMenuItem className="text-red-600">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Status and Type */}
          <div className="flex items-center flex-wrap gap-2">
            <Badge variant="secondary" className={config.color}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {testCase.status}
            </Badge>
            <Badge variant="outline">{testCase.type}</Badge>
            <Badge
              variant="outline"
              className={priorityConfig[testCase.priority]}
            >
              {testCase.priority}
            </Badge>
            {testCase.ai_generated && (
              <Badge
                variant="outline"
                className="bg-purple-100 text-purple-800 flex items-center"
              >
                <Bot className="w-3 h-3 mr-1" />
                AI Generated
              </Badge>
            )}
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1">
            {testCase.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                <Tag className="w-3 h-3 mr-1" />

                {tag}
              </Badge>
            ))}
            {testCase.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{testCase.tags.length - 3} more
              </Badge>
            )}
          </div>

          {/* Project and Target Info */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-1 text-blue-600">
                <FolderOpen className="w-3 h-3" />
                <span className="font-medium">
                  {project?.name || "Unknown Project"}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {/* TODO: Display target info when target service is available */}
              <Badge
                variant="outline"
                className="text-xs bg-purple-50 text-purple-700"
              >
                <Target className="w-3 h-3 mr-1" />
                Target: {testCase.target_id}
              </Badge>
            </div>
          </div>

          {/* Metadata */}
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <User className="w-3 h-3" />
                <span>{testCase.created_by.split("@")[0]}</span>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <Calendar className="w-3 h-3" />
              <span>{new Date(testCase.updated_at).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Steps Preview */}
          <div className="text-sm text-gray-600">
            <span className="font-medium">{testCase.steps.length} steps</span>
            <span className="mx-2">•</span>
            <span>Priority: {testCase.priority}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function TestCaseManager() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [targetFilter, setTargetFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  
  // State for real data
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();

  // Load data from APIs
  useEffect(() => {
    const loadData = async () => {
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Load projects and test cases in parallel
        const [projectsResult, testCasesResult] = await Promise.all([
          ProjectService.listProjects(),
          TestCaseService.listTestCases()
        ]);

        if (projectsResult.error) {
          console.error('Failed to load projects:', projectsResult.error);
        } else {
          setProjects(projectsResult.data || []);
        }

        if (testCasesResult.error) {
          setError(testCasesResult.error);
          console.error('Failed to load test cases:', testCasesResult.error);
        } else {
          setTestCases(testCasesResult.data || []);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
        setError(errorMessage);
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isAuthenticated]);

  const filteredTestCases = testCases.filter((testCase) => {
    const matchesSearch =
      testCase.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      testCase.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      testCase.tags.some((tag) =>
        tag.toLowerCase().includes(searchTerm.toLowerCase())
      );

    const matchesStatus =
      statusFilter === "all" || testCase.status === statusFilter;
    const matchesType = typeFilter === "all" || testCase.type === typeFilter;
    const matchesProject =
      projectFilter === "all" || testCase.project_id === projectFilter;
    const matchesTarget =
      targetFilter === "all" || testCase.target_id === targetFilter;

    return (
      matchesSearch &&
      matchesStatus &&
      matchesType &&
      matchesProject &&
      matchesTarget
    );
  });

  const stats = {
    total: testCases.length,
    active: testCases.filter((tc) => tc.status === "active").length,
    draft: testCases.filter((tc) => tc.status === "draft").length,
    aiGenerated: testCases.filter((tc) => tc.ai_generated).length,
  };

  // Show loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Test Cases</h1>
            <p className="text-gray-600">
              Manage and organize your AI-powered test cases
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Loading test cases...</span>
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
            <h1 className="text-2xl font-bold text-gray-900">Test Cases</h1>
            <p className="text-gray-600">
              Manage and organize your AI-powered test cases
            </p>
          </div>
        </div>
        <div className="text-center py-12">
          <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Failed to load test cases
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
            <h1 className="text-2xl font-bold text-gray-900">Test Cases</h1>
            <p className="text-gray-600">
              Manage and organize your AI-powered test cases
            </p>
          </div>
        </div>
        <div className="text-center py-12">
          <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-6 h-6 text-yellow-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Authentication Required
          </h3>
          <p className="text-gray-500 mb-4">
            Please sign in to manage your test cases
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
          <h1 className="text-2xl font-bold text-gray-900">Test Cases</h1>
          <p className="text-gray-600">
            Manage and organize your AI-powered test cases
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" asChild>
            <Link to="/ai-simulation">
              <Bot className="w-4 h-4 mr-2" />
              AI Simulation
            </Link>
          </Button>
          <Button variant="outline" size="sm">
            <Bot className="w-4 h-4 mr-2" />
            AI Generate
          </Button>
          <Button size="sm" asChild>
            <Link to="/test-cases/new">
              <Plus className="w-4 h-4 mr-2" />
              New Test Case
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Tests</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.total}
                </p>
              </div>
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-blue-600" />
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
                <Play className="w-4 h-4 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Draft</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {stats.draft}
                </p>
              </div>
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Edit className="w-4 h-4 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">AI Generated</p>
                <p className="text-2xl font-bold text-purple-600">
                  {stats.aiGenerated}
                </p>
              </div>
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <Bot className="w-4 h-4 text-purple-600" />
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
              placeholder="Search test cases..."
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
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="e2e">E2E</SelectItem>
              <SelectItem value="ui">UI</SelectItem>
              <SelectItem value="api">API</SelectItem>
              <SelectItem value="performance">Performance</SelectItem>
            </SelectContent>
          </Select>

          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={targetFilter} onValueChange={setTargetFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Target" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Targets</SelectItem>
              {/* TODO: Add targets when target service is available */}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === "cards" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("cards")}
          >
            Cards
          </Button>
          <Button
            variant={viewMode === "table" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("table")}
          >
            Table
          </Button>
        </div>
      </div>

      {/* Test Cases Display */}
      {viewMode === "cards" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTestCases.map((testCase) => (
            <TestCaseCard key={testCase.id} testCase={testCase} projects={projects} />
          ))}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Steps</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTestCases.map((testCase) => {
                const statusConfig = {
                  draft: "bg-gray-100 text-gray-800",
                  active: "bg-green-100 text-green-800",
                  archived: "bg-red-100 text-red-800",
                };

                return (
                  <TableRow key={testCase.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{testCase.name}</div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {testCase.description}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{testCase.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={statusConfig[testCase.status]}
                      >
                        {testCase.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{testCase.priority}</Badge>
                    </TableCell>
                    <TableCell>{testCase.steps.length}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src="https://github.com/yusufhilmi.png" />

                          <AvatarFallback>
                            {testCase.created_by.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">
                          {testCase.created_by.split("@")[0]}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {new Date(testCase.updated_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Play className="w-4 h-4 mr-2" />
                            Run Test
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to="/ai-simulation">
                              <Bot className="w-4 h-4 mr-2" />
                              AI Simulation
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />

                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {filteredTestCases.length === 0 && (
        <div className="text-center py-12">
          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Search className="w-6 h-6 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No test cases found
          </h3>
          <p className="text-gray-500 mb-4">
            {searchTerm ||
            statusFilter !== "all" ||
            typeFilter !== "all" ||
            projectFilter !== "all" ||
            targetFilter !== "all"
              ? "Try adjusting your search or filters"
              : "Get started by creating your first test case"}
          </p>
          <Button asChild>
            <Link to="/test-cases/new">
              <Plus className="w-4 h-4 mr-2" />
              Create Test Case
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
