import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  PlayIcon,
  PlusIcon,
  SearchIcon,
  MoreHorizontalIcon,
  CalendarIcon,
  ClockIcon,
  TestTubeIcon,
  TargetIcon,
  EditIcon,
  TrashIcon,
  CopyIcon,
  PauseIcon,
  SettingsIcon,
  FolderIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon as ScheduleIcon,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { TestSuiteService } from "@/lib/services/testSuiteService";
import { ProjectService } from "@/lib/services/projectService";
import { TestTargetService } from "@/lib/services/testTargetService";

export default function TestSuiteManager() {
  const { isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedSuite, setSelectedSuite] = useState<string | null>(null);
  
  // State for real data
  const [testSuites, setTestSuites] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [testTargets, setTestTargets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      setLoading(true);

      // Load all data in parallel
      const [
        { data: suitesData, error: suitesError },
        { data: projectsData, error: projectsError },
        { data: targetsData, error: targetsError }
      ] = await Promise.all([
        TestSuiteService.listTestSuites({ limit: 100 }),
        ProjectService.listProjects({ limit: 100 }),
        TestTargetService.listTestTargets({ limit: 100 })
      ]);

      if (suitesError) {
        console.warn('Failed to load test suites:', suitesError);
        setTestSuites([]);
      } else {
        setTestSuites(suitesData || []);
      }

      if (projectsError) {
        console.warn('Failed to load projects:', projectsError);
        setProjects([]);
      } else {
        setProjects(projectsData || []);
      }

      if (targetsError) {
        console.warn('Failed to load test targets:', targetsError);
        setTestTargets([]);
      } else {
        setTestTargets(targetsData || []);
      }

    } catch (err) {
      console.error('Failed to load test suite data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isAuthenticated]);

  // Filter suites based on search and filters
  const filteredSuites = testSuites.filter((suite) => {
    const matchesSearch =
      suite.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      suite.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && suite.is_active) ||
      (statusFilter === "inactive" && !suite.is_active);
    const matchesProject =
      projectFilter === "all" || suite.project_id === projectFilter;

    return matchesSearch && matchesStatus && matchesProject;
  });

  const getProjectName = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    return project?.name || "Unknown Project";
  };

  const getTestCaseCount = (testCaseIds: string[]) => {
    return testCaseIds?.length || 0;
  };

  const getTargetNames = (targetIds: string[]) => {
    return (targetIds || []).map((id) => {
      const target = testTargets.find((t) => t.id === id);
      return target?.name || "Unknown Target";
    });
  };

  const handleRunSuite = async (suiteId: string) => {
    try {
      const { error } = await TestSuiteService.executeTestSuite(suiteId);
      if (error) {
        console.error('Failed to run test suite:', error);
      } else {
        console.log('Test suite execution started:', suiteId);
        // Refresh data to show updated status
        loadData();
      }
    } catch (err) {
      console.error('Error running test suite:', err);
    }
  };

  const handleEditSuite = (suiteId: string) => {
    setSelectedSuite(suiteId);
    setIsCreateDialogOpen(true);
  };

  const handleDeleteSuite = async (suiteId: string) => {
    if (!confirm('Are you sure you want to delete this test suite?')) {
      return;
    }
    
    try {
      const { error } = await TestSuiteService.deleteTestSuite(suiteId);
      if (error) {
        console.error('Failed to delete test suite:', error);
      } else {
        console.log('Test suite deleted:', suiteId);
        // Refresh data to remove deleted suite
        loadData();
      }
    } catch (err) {
      console.error('Error deleting test suite:', err);
    }
  };

  const handleDuplicateSuite = (suiteId: string) => {
    console.log("Duplicating test suite:", suiteId);
    // Implementation for duplicating test suite
  };

  const handleToggleSchedule = (suiteId: string) => {
    console.log("Toggling schedule for suite:", suiteId);
    // Implementation for toggling schedule
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span className="text-gray-600">Loading test suites...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Error Loading Test Suites
          </h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <Button onClick={loadData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-600">Please log in to view test suites</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Test Suites</h1>
          <p className="text-gray-600">
            Organize and manage collections of test cases
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <SettingsIcon className="w-4 h-4 mr-2" />
            Bulk Actions
          </Button>
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button>
                <PlusIcon className="w-4 h-4 mr-2" />
                New Test Suite
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Test Suite</DialogTitle>
                <DialogDescription>
                  Create a collection of test cases that can be run together
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="suite-name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="suite-name"
                    placeholder="Enter suite name"
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="suite-description" className="text-right">
                    Description
                  </Label>
                  <Textarea
                    id="suite-description"
                    placeholder="Describe the purpose of this test suite"
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="suite-project" className="text-right">
                    Project
                  </Label>
                  <Select>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="suite-environment" className="text-right">
                    Environment
                  </Label>
                  <Select>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select environment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="development">Development</SelectItem>
                      <SelectItem value="staging">Staging</SelectItem>
                      <SelectItem value="production">Production</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="suite-schedule" className="text-right">
                    Enable Schedule
                  </Label>
                  <div className="col-span-3">
                    <Switch id="suite-schedule" />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={() => setIsCreateDialogOpen(false)}>
                  Create Suite
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Suites</p>
                <p className="text-2xl font-bold text-gray-900">
                  {testSuites.length}
                </p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <FolderIcon className="w-5 h-5 text-blue-600" />
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
                  {testSuites.filter((s: any) => s.is_active).length}
                </p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircleIcon className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Scheduled</p>
                <p className="text-2xl font-bold text-purple-600">
                  {testSuites.filter((s: any) => s.schedule?.enabled).length}
                </p>
              </div>
              <div className="p-2 bg-purple-100 rounded-lg">
                <ScheduleIcon className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Test Cases</p>
                <p className="text-2xl font-bold text-orange-600">
                  {testSuites.reduce(
                    (acc: number, suite: any) => acc + (suite.test_case_ids?.length || 0),
                    0
                  )}
                </p>
              </div>
              <div className="p-2 bg-orange-100 rounded-lg">
                <TestTubeIcon className="w-5 h-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />

            <Input
              placeholder="Search test suites..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((project: any) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center border rounded-lg">
            <Button
              variant={viewMode === "cards" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("cards")}
              className="rounded-r-none"
            >
              Cards
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
              className="rounded-l-none"
            >
              Table
            </Button>
          </div>
        </div>
      </div>

      {/* Test Suites Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSuites.map((suite) => (
          <Card key={suite.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg font-semibold text-gray-900 mb-1">
                    {suite.name}
                  </CardTitle>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {suite.description}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontalIcon className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleRunSuite(suite.id)}>
                      <PlayIcon className="w-4 h-4 mr-2" />
                      Run Suite
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleEditSuite(suite.id)}>
                      <EditIcon className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDuplicateSuite(suite.id)}
                    >
                      <CopyIcon className="w-4 h-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                      onClick={() => handleToggleSchedule(suite.id)}
                    >
                      {suite.schedule?.enabled ? (
                        <>
                          <PauseIcon className="w-4 h-4 mr-2" />
                          Disable Schedule
                        </>
                      ) : (
                        <>
                          <CalendarIcon className="w-4 h-4 mr-2" />
                          Enable Schedule
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                      onClick={() => handleDeleteSuite(suite.id)}
                      className="text-red-600"
                    >
                      <TrashIcon className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Status and Environment */}
              <div className="flex items-center gap-2">
                <Badge variant={suite.isActive ? "default" : "secondary"}>
                  {suite.isActive ? "Active" : "Inactive"}
                </Badge>
                <Badge variant="outline">{suite.environment}</Badge>
                {suite.schedule?.enabled && (
                  <Badge
                    variant="outline"
                    className="text-purple-600 border-purple-200"
                  >
                    <CalendarIcon className="w-3 h-3 mr-1" />
                    Scheduled
                  </Badge>
                )}
              </div>

              {/* Project and Targets */}
              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-600">
                  <FolderIcon className="w-4 h-4 mr-2" />

                  {getProjectName(suite.projectId)}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <TargetIcon className="w-4 h-4 mr-2" />

                  {getTargetNames(suite.targetIds).join(", ")}
                </div>
              </div>

              {/* Test Cases Count */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center text-gray-600">
                  <TestTubeIcon className="w-4 h-4 mr-2" />
                  {getTestCaseCount(suite.testCases)} test cases
                </div>
                {suite.schedule?.enabled && (
                  <div className="flex items-center text-gray-500">
                    <ClockIcon className="w-4 h-4 mr-1" />

                    {suite.schedule.cron}
                  </div>
                )}
              </div>

              {/* Tags */}
              {suite.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {suite.tags?.slice(0, 3)?.map((tag: string) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {suite.tags.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{suite.tags.length - 3}
                    </Badge>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                <Button
                  size="sm"
                  onClick={() => handleRunSuite(suite.id)}
                  className="flex-1"
                >
                  <PlayIcon className="w-4 h-4 mr-2" />
                  Run Suite
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditSuite(suite.id)}
                >
                  <EditIcon className="w-4 h-4" />
                </Button>
              </div>

              {/* Last Updated */}
              <div className="text-xs text-gray-500 pt-2 border-t">
                Updated {new Date(suite.updatedAt).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredSuites.length === 0 && (
        <div className="text-center py-12">
          <FolderIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />

          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No test suites found
          </h3>
          <p className="text-gray-600 mb-4">
            {searchQuery || statusFilter !== "all" || projectFilter !== "all"
              ? "Try adjusting your search or filters"
              : "Create your first test suite to get started"}
          </p>
          {!searchQuery &&
            statusFilter === "all" &&
            projectFilter === "all" && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <PlusIcon className="w-4 h-4 mr-2" />
                Create Test Suite
              </Button>
            )}
        </div>
      )}
    </div>
  );
}
