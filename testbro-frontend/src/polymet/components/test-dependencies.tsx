import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  GitBranch,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowRight,
  ArrowDown,
  Network,
  TestTube,
  Play,
  Pause,
  SkipForward,
  AlertCircle,
  Info,
  Edit,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface TestCase {
  id: string;
  name: string;
  description?: string;
  status: "active" | "inactive" | "draft";
  priority: "low" | "medium" | "high";
  estimatedDuration: number; // minutes
  tags: string[];
}

export interface TestDependency {
  id: string;
  fromTestId: string;
  toTestId: string;
  type: "prerequisite" | "setup" | "cleanup" | "data-dependency";
  condition: "success" | "completion" | "failure" | "always";
  description?: string;
  isOptional: boolean;
  timeout?: number; // minutes
}

export interface DependencyGroup {
  id: string;
  name: string;
  description?: string;
  testCases: string[];
  executionOrder: "parallel" | "sequential" | "conditional";
  failureStrategy: "stop-all" | "continue" | "skip-dependents";
}

interface TestDependenciesProps {
  testCases: TestCase[];
  dependencies: TestDependency[];
  groups: DependencyGroup[];
  onAddDependency: (dependency: Omit<TestDependency, "id">) => void;
  onUpdateDependency: (id: string, dependency: Partial<TestDependency>) => void;
  onRemoveDependency: (id: string) => void;
  onCreateGroup: (group: Omit<DependencyGroup, "id">) => void;
  onUpdateGroup: (id: string, group: Partial<DependencyGroup>) => void;
  onDeleteGroup: (id: string) => void;
  onValidateDependencies: () => { isValid: boolean; errors: string[] };
  className?: string;
}

export default function TestDependencies({
  testCases,
  dependencies,
  groups,
  onAddDependency,
  onUpdateDependency,
  onRemoveDependency,
  onCreateGroup,
  onUpdateGroup,
  onDeleteGroup,
  onValidateDependencies,
  className,
}: TestDependenciesProps) {
  const [isAddDependencyOpen, setIsAddDependencyOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [selectedView, setSelectedView] = useState<"graph" | "list" | "groups">(
    "graph"
  );
  const [dependencyForm, setDependencyForm] = useState({
    fromTestId: "",
    toTestId: "",
    type: "prerequisite" as TestDependency["type"],
    condition: "success" as TestDependency["condition"],
    description: "",
    isOptional: false,
    timeout: 30,
  });
  const [groupForm, setGroupForm] = useState({
    name: "",
    description: "",
    testCases: [] as string[],
    executionOrder: "sequential" as DependencyGroup["executionOrder"],
    failureStrategy: "stop-all" as DependencyGroup["failureStrategy"],
  });

  const resetDependencyForm = () => {
    setDependencyForm({
      fromTestId: "",
      toTestId: "",
      type: "prerequisite",
      condition: "success",
      description: "",
      isOptional: false,
      timeout: 30,
    });
  };

  const resetGroupForm = () => {
    setGroupForm({
      name: "",
      description: "",
      testCases: [],
      executionOrder: "sequential",
      failureStrategy: "stop-all",
    });
  };

  const handleAddDependency = () => {
    if (dependencyForm.fromTestId && dependencyForm.toTestId) {
      onAddDependency(dependencyForm);
      setIsAddDependencyOpen(false);
      resetDependencyForm();
    }
  };

  const handleCreateGroup = () => {
    if (groupForm.name && groupForm.testCases.length > 0) {
      onCreateGroup(groupForm);
      setIsCreateGroupOpen(false);
      resetGroupForm();
    }
  };

  const getTestById = (id: string) => testCases.find((tc) => tc.id === id);

  const getDependenciesForTest = (testId: string) => {
    return {
      prerequisites: dependencies.filter((d) => d.toTestId === testId),
      dependents: dependencies.filter((d) => d.fromTestId === testId),
    };
  };

  const getExecutionOrder = useCallback(() => {
    // Simple topological sort for demonstration
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const order: string[] = [];

    const visit = (testId: string): boolean => {
      if (visiting.has(testId)) return false; // Circular dependency
      if (visited.has(testId)) return true;

      visiting.add(testId);

      const prerequisites = dependencies.filter((d) => d.toTestId === testId);
      for (const dep of prerequisites) {
        if (!visit(dep.fromTestId)) return false;
      }

      visiting.delete(testId);
      visited.add(testId);
      order.push(testId);
      return true;
    };

    for (const testCase of testCases) {
      if (!visited.has(testCase.id)) {
        if (!visit(testCase.id)) {
          return { order: [], hasCircularDependency: true };
        }
      }
    }

    return { order, hasCircularDependency: false };
  }, [testCases, dependencies]);

  const getDependencyTypeColor = (type: TestDependency["type"]) => {
    switch (type) {
      case "prerequisite":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "setup":
        return "bg-green-100 text-green-800 border-green-200";
      case "cleanup":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "data-dependency":
        return "bg-purple-100 text-purple-800 border-purple-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getConditionIcon = (condition: TestDependency["condition"]) => {
    switch (condition) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-600" />;

      case "completion":
        return <Clock className="w-4 h-4 text-blue-600" />;

      case "failure":
        return <AlertTriangle className="w-4 h-4 text-red-600" />;

      case "always":
        return <Play className="w-4 h-4 text-gray-600" />;

      default:
        return <Info className="w-4 h-4 text-gray-600" />;
    }
  };

  const executionOrder = getExecutionOrder();

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Test Dependencies
          </h2>
          <p className="text-gray-600 mt-1">
            Manage test execution order and dependencies
          </p>
        </div>
        <div className="flex space-x-2">
          <Dialog open={isCreateGroupOpen} onOpenChange={setIsCreateGroupOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Network className="w-4 h-4 mr-2" />
                Create Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Dependency Group</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="groupName">Group Name</Label>
                  <Input
                    id="groupName"
                    value={groupForm.name}
                    onChange={(e) =>
                      setGroupForm({ ...groupForm, name: e.target.value })
                    }
                    placeholder="e.g., Authentication Flow"
                  />
                </div>

                <div>
                  <Label htmlFor="groupDescription">Description</Label>
                  <Textarea
                    id="groupDescription"
                    value={groupForm.description}
                    onChange={(e) =>
                      setGroupForm({
                        ...groupForm,
                        description: e.target.value,
                      })
                    }
                    placeholder="Optional description"
                  />
                </div>

                <div>
                  <Label>Test Cases</Label>
                  <Select
                    value=""
                    onValueChange={(value) => {
                      if (!groupForm.testCases.includes(value)) {
                        setGroupForm({
                          ...groupForm,
                          testCases: [...groupForm.testCases, value],
                        });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Add test cases to group" />
                    </SelectTrigger>
                    <SelectContent>
                      {testCases.map((testCase) => (
                        <SelectItem key={testCase.id} value={testCase.id}>
                          {testCase.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {groupForm.testCases.map((testId) => {
                      const testCase = getTestById(testId);
                      return (
                        <Badge
                          key={testId}
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
                          <TestTube className="w-3 h-3" />

                          {testCase?.name}
                          <button
                            onClick={() =>
                              setGroupForm({
                                ...groupForm,
                                testCases: groupForm.testCases.filter(
                                  (id) => id !== testId
                                ),
                              })
                            }
                            className="ml-1 hover:text-red-600"
                          >
                            ×
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <Label>Execution Order</Label>
                  <Select
                    value={groupForm.executionOrder}
                    onValueChange={(value: DependencyGroup["executionOrder"]) =>
                      setGroupForm({ ...groupForm, executionOrder: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="parallel">Parallel</SelectItem>
                      <SelectItem value="sequential">Sequential</SelectItem>
                      <SelectItem value="conditional">Conditional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Failure Strategy</Label>
                  <Select
                    value={groupForm.failureStrategy}
                    onValueChange={(
                      value: DependencyGroup["failureStrategy"]
                    ) => setGroupForm({ ...groupForm, failureStrategy: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stop-all">Stop All</SelectItem>
                      <SelectItem value="continue">Continue</SelectItem>
                      <SelectItem value="skip-dependents">
                        Skip Dependents
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setIsCreateGroupOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateGroup}
                  disabled={!groupForm.name || groupForm.testCases.length === 0}
                >
                  Create Group
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog
            open={isAddDependencyOpen}
            onOpenChange={setIsAddDependencyOpen}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Dependency
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Test Dependency</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>From Test (Prerequisite)</Label>
                  <Select
                    value={dependencyForm.fromTestId}
                    onValueChange={(value) =>
                      setDependencyForm({
                        ...dependencyForm,
                        fromTestId: value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select prerequisite test" />
                    </SelectTrigger>
                    <SelectContent>
                      {testCases.map((testCase) => (
                        <SelectItem key={testCase.id} value={testCase.id}>
                          {testCase.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>To Test (Dependent)</Label>
                  <Select
                    value={dependencyForm.toTestId}
                    onValueChange={(value) =>
                      setDependencyForm({ ...dependencyForm, toTestId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select dependent test" />
                    </SelectTrigger>
                    <SelectContent>
                      {testCases
                        .filter((tc) => tc.id !== dependencyForm.fromTestId)
                        .map((testCase) => (
                          <SelectItem key={testCase.id} value={testCase.id}>
                            {testCase.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Dependency Type</Label>
                  <Select
                    value={dependencyForm.type}
                    onValueChange={(value: TestDependency["type"]) =>
                      setDependencyForm({ ...dependencyForm, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prerequisite">Prerequisite</SelectItem>
                      <SelectItem value="setup">Setup</SelectItem>
                      <SelectItem value="cleanup">Cleanup</SelectItem>
                      <SelectItem value="data-dependency">
                        Data Dependency
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Condition</Label>
                  <Select
                    value={dependencyForm.condition}
                    onValueChange={(value: TestDependency["condition"]) =>
                      setDependencyForm({ ...dependencyForm, condition: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="success">On Success</SelectItem>
                      <SelectItem value="completion">On Completion</SelectItem>
                      <SelectItem value="failure">On Failure</SelectItem>
                      <SelectItem value="always">Always</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={dependencyForm.description}
                    onChange={(e) =>
                      setDependencyForm({
                        ...dependencyForm,
                        description: e.target.value,
                      })
                    }
                    placeholder="Optional description of the dependency"
                  />
                </div>

                <div>
                  <Label htmlFor="timeout">Timeout (minutes)</Label>
                  <Input
                    id="timeout"
                    type="number"
                    min="1"
                    max="120"
                    value={dependencyForm.timeout}
                    onChange={(e) =>
                      setDependencyForm({
                        ...dependencyForm,
                        timeout: parseInt(e.target.value) || 30,
                      })
                    }
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setIsAddDependencyOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddDependency}
                  disabled={
                    !dependencyForm.fromTestId || !dependencyForm.toTestId
                  }
                >
                  Add Dependency
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Validation Status */}
      {(() => {
        const validation = onValidateDependencies();
        return (
          <div
            className={cn(
              "p-4 rounded-lg border",
              validation.isValid
                ? "bg-green-50 border-green-200"
                : "bg-red-50 border-red-200"
            )}
          >
            <div className="flex items-center space-x-2">
              {validation.isValid ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-600" />
              )}
              <span
                className={cn(
                  "font-medium",
                  validation.isValid ? "text-green-900" : "text-red-900"
                )}
              >
                {validation.isValid
                  ? "Dependencies are valid"
                  : "Dependency issues found"}
              </span>
            </div>
            {!validation.isValid && validation.errors.length > 0 && (
              <ul className="mt-2 text-sm text-red-700 space-y-1">
                {validation.errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            )}
          </div>
        );
      })()}

      {/* View Tabs */}
      <Tabs
        value={selectedView}
        onValueChange={(value: any) => setSelectedView(value)}
      >
        <TabsList>
          <TabsTrigger value="graph">Dependency Graph</TabsTrigger>
          <TabsTrigger value="list">Dependencies List</TabsTrigger>
          <TabsTrigger value="groups">Groups</TabsTrigger>
        </TabsList>

        <TabsContent value="graph" className="space-y-4">
          {/* Execution Order */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ArrowRight className="w-5 h-5" />

                <span>Execution Order</span>
              </CardTitle>
              <CardDescription>
                Recommended execution order based on dependencies
              </CardDescription>
            </CardHeader>
            <CardContent>
              {executionOrder.hasCircularDependency ? (
                <div className="flex items-center space-x-2 text-red-600">
                  <AlertTriangle className="w-5 h-5" />

                  <span>
                    Circular dependency detected! Please review your
                    dependencies.
                  </span>
                </div>
              ) : (
                <div className="space-y-3">
                  {executionOrder.order.map((testId, index) => {
                    const testCase = getTestById(testId);
                    const deps = getDependenciesForTest(testId);

                    return (
                      <div
                        key={testId}
                        className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg"
                      >
                        <Badge
                          variant="outline"
                          className="w-8 h-8 rounded-full flex items-center justify-center"
                        >
                          {index + 1}
                        </Badge>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <TestTube className="w-4 h-4" />

                            <span className="font-medium">
                              {testCase?.name}
                            </span>
                          </div>
                          {deps.prerequisites.length > 0 && (
                            <div className="text-sm text-gray-600 mt-1">
                              Depends on:{" "}
                              {deps.prerequisites
                                .map((d) => getTestById(d.fromTestId)?.name)
                                .join(", ")}
                            </div>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          ~{testCase?.estimatedDuration || 0}min
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Visual Dependency Graph */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Network className="w-5 h-5" />

                <span>Dependency Graph</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {testCases.map((testCase) => {
                  const deps = getDependenciesForTest(testCase.id);

                  return (
                    <div
                      key={testCase.id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <TestTube className="w-4 h-4" />

                          <span className="font-medium">{testCase.name}</span>
                          <Badge
                            variant="outline"
                            className={cn(
                              testCase.priority === "high" &&
                                "border-red-200 text-red-800",
                              testCase.priority === "medium" &&
                                "border-yellow-200 text-yellow-800",
                              testCase.priority === "low" &&
                                "border-green-200 text-green-800"
                            )}
                          >
                            {testCase.priority}
                          </Badge>
                        </div>
                        <span className="text-sm text-gray-500">
                          {testCase.estimatedDuration}min
                        </span>
                      </div>

                      {deps.prerequisites.length > 0 && (
                        <div className="mb-2">
                          <Label className="text-xs text-gray-500">
                            PREREQUISITES
                          </Label>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {deps.prerequisites.map((dep) => {
                              const fromTest = getTestById(dep.fromTestId);
                              return (
                                <div
                                  key={dep.id}
                                  className="flex items-center space-x-1 text-sm"
                                >
                                  <Badge
                                    variant="outline"
                                    className={getDependencyTypeColor(dep.type)}
                                  >
                                    {fromTest?.name}
                                  </Badge>
                                  {getConditionIcon(dep.condition)}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {deps.dependents.length > 0 && (
                        <div>
                          <Label className="text-xs text-gray-500">
                            DEPENDENTS
                          </Label>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {deps.dependents.map((dep) => {
                              const toTest = getTestById(dep.toTestId);
                              return (
                                <Badge
                                  key={dep.id}
                                  variant="outline"
                                  className="text-sm"
                                >
                                  {toTest?.name}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Dependencies</CardTitle>
              <CardDescription>
                {dependencies.length} dependencies configured
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dependencies.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <GitBranch className="w-8 h-8 mx-auto mb-2 opacity-50" />

                  <p>No dependencies configured yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dependencies.map((dependency) => {
                    const fromTest = getTestById(dependency.fromTestId);
                    const toTest = getTestById(dependency.toTestId);

                    return (
                      <div
                        key={dependency.id}
                        className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline">{fromTest?.name}</Badge>
                            <ArrowRight className="w-4 h-4 text-gray-400" />

                            <Badge variant="outline">{toTest?.name}</Badge>
                          </div>

                          <Badge
                            variant="outline"
                            className={getDependencyTypeColor(dependency.type)}
                          >
                            {dependency.type}
                          </Badge>

                          <div className="flex items-center space-x-1">
                            {getConditionIcon(dependency.condition)}
                            <span className="text-sm text-gray-600">
                              {dependency.condition}
                            </span>
                          </div>

                          {dependency.isOptional && (
                            <Badge variant="outline" className="text-xs">
                              Optional
                            </Badge>
                          )}
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onRemoveDependency(dependency.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="groups" className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {groups.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Network className="w-12 h-12 mx-auto text-gray-400 mb-4" />

                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No Groups Created
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Create dependency groups to organize related test cases.
                  </p>
                  <Button onClick={() => setIsCreateGroupOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Group
                  </Button>
                </CardContent>
              </Card>
            ) : (
              groups.map((group) => (
                <Card key={group.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{group.name}</CardTitle>
                        {group.description && (
                          <CardDescription>{group.description}</CardDescription>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onDeleteGroup(group.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <Label className="text-xs text-gray-500">
                          EXECUTION ORDER
                        </Label>
                        <p className="font-medium capitalize">
                          {group.executionOrder}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">
                          FAILURE STRATEGY
                        </Label>
                        <p className="font-medium">
                          {group.failureStrategy.replace("-", " ")}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">
                          TEST CASES
                        </Label>
                        <p className="font-medium">
                          {group.testCases.length} tests
                        </p>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-gray-500">
                        TEST CASES
                      </Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {group.testCases.map((testId) => {
                          const testCase = getTestById(testId);
                          return (
                            <Badge
                              key={testId}
                              variant="outline"
                              className="flex items-center gap-1"
                            >
                              <TestTube className="w-3 h-3" />

                              {testCase?.name}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
