import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  Calendar,
  Clock,
  Play,
  Pause,
  Trash2,
  Edit,
  Plus,
  AlertCircle,
  CheckCircle,
  Settings,
  Target,
  TestTube,
  Zap,
  MoreHorizontal,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ScheduledTest {
  id: string;
  name: string;
  description?: string;
  testCases: string[]; // test case IDs
  targets: string[]; // target IDs
  schedule: {
    type: "once" | "recurring";
    cronExpression?: string;
    timezone: string;
    nextRun: string;
    lastRun?: string;
  };
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  notifications: {
    onSuccess: boolean;
    onFailure: boolean;
    onStart: boolean;
    recipients: string[];
  };
  retryPolicy: {
    enabled: boolean;
    maxRetries: number;
    retryDelay: number; // minutes
  };
  executionHistory: {
    id: string;
    startTime: string;
    endTime?: string;
    status: "running" | "completed" | "failed" | "cancelled";
    results?: any;
  }[];
}

interface TestSchedulerProps {
  scheduledTests: ScheduledTest[];
  availableTestCases: { id: string; name: string }[];
  availableTargets: { id: string; name: string }[];
  onCreateSchedule: (
    schedule: Omit<ScheduledTest, "id" | "createdAt" | "executionHistory">
  ) => void;
  onUpdateSchedule: (id: string, schedule: Partial<ScheduledTest>) => void;
  onDeleteSchedule: (id: string) => void;
  onToggleSchedule: (id: string, isActive: boolean) => void;
  onRunNow: (id: string) => void;
  className?: string;
}

const cronPresets = [
  {
    label: "Every minute",
    value: "* * * * *",
    description: "Runs every minute",
  },
  {
    label: "Every 5 minutes",
    value: "*/5 * * * *",
    description: "Runs every 5 minutes",
  },
  {
    label: "Every hour",
    value: "0 * * * *",
    description: "Runs at the start of every hour",
  },
  {
    label: "Every day at 9 AM",
    value: "0 9 * * *",
    description: "Runs daily at 9:00 AM",
  },
  {
    label: "Every weekday at 9 AM",
    value: "0 9 * * 1-5",
    description: "Runs Monday to Friday at 9:00 AM",
  },
  {
    label: "Every Monday at 9 AM",
    value: "0 9 * * 1",
    description: "Runs every Monday at 9:00 AM",
  },
  {
    label: "Every month on 1st at 9 AM",
    value: "0 9 1 * *",
    description: "Runs on the 1st of every month at 9:00 AM",
  },
];

const timezones = [
  "UTC",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Australia/Sydney",
];

export default function TestScheduler({
  scheduledTests,
  availableTestCases,
  availableTargets,
  onCreateSchedule,
  onUpdateSchedule,
  onDeleteSchedule,
  onToggleSchedule,
  onRunNow,
  className,
}: TestSchedulerProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    testCases: [] as string[],
    targets: [] as string[],
    scheduleType: "recurring" as "once" | "recurring",
    cronExpression: "0 9 * * *",
    customCron: "",
    timezone: "UTC",
    isActive: true,
    notifications: {
      onSuccess: true,
      onFailure: true,
      onStart: false,
      recipients: [] as string[],
    },
    retryPolicy: {
      enabled: true,
      maxRetries: 3,
      retryDelay: 5,
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      testCases: [],
      targets: [],
      scheduleType: "recurring",
      cronExpression: "0 9 * * *",
      customCron: "",
      timezone: "UTC",
      isActive: true,
      notifications: {
        onSuccess: true,
        onFailure: true,
        onStart: false,
        recipients: [],
      },
      retryPolicy: {
        enabled: true,
        maxRetries: 3,
        retryDelay: 5,
      },
    });
  };

  const handleCreateSchedule = () => {
    const schedule: Omit<
      ScheduledTest,
      "id" | "createdAt" | "executionHistory"
    > = {
      name: formData.name,
      description: formData.description,
      testCases: formData.testCases,
      targets: formData.targets,
      schedule: {
        type: formData.scheduleType,
        cronExpression: formData.customCron || formData.cronExpression,
        timezone: formData.timezone,
        nextRun: calculateNextRun(
          formData.customCron || formData.cronExpression,
          formData.timezone
        ),
      },
      isActive: formData.isActive,
      createdBy: "current-user",
      notifications: formData.notifications,
      retryPolicy: formData.retryPolicy,
    };

    onCreateSchedule(schedule);
    setIsCreateDialogOpen(false);
    resetForm();
  };

  const calculateNextRun = (
    cronExpression: string,
    timezone: string
  ): string => {
    // This would use a cron parser library in a real implementation
    const now = new Date();
    now.setHours(now.getHours() + 1); // Simple approximation
    return now.toISOString();
  };

  const parseCronExpression = (cron: string) => {
    const preset = cronPresets.find((p) => p.value === cron);
    return preset ? preset.description : "Custom schedule";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "running":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "failed":
        return "bg-red-100 text-red-800 border-red-200";
      case "cancelled":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Test Scheduler</h2>
          <p className="text-gray-600 mt-1">
            Automate test execution with cron-like scheduling
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Schedule Tests
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Schedule Test Execution</DialogTitle>
            </DialogHeader>

            <Tabs defaultValue="basic" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">Basic</TabsTrigger>
                <TabsTrigger value="schedule">Schedule</TabsTrigger>
                <TabsTrigger value="notifications">Notifications</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Schedule Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="e.g., Daily Regression Tests"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      placeholder="Optional description of what this schedule does"
                    />
                  </div>

                  <div>
                    <Label>Test Cases</Label>
                    <Select
                      value=""
                      onValueChange={(value) => {
                        if (!formData.testCases.includes(value)) {
                          setFormData({
                            ...formData,
                            testCases: [...formData.testCases, value],
                          });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select test cases to run" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTestCases.map((testCase) => (
                          <SelectItem key={testCase.id} value={testCase.id}>
                            {testCase.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.testCases.map((testCaseId) => {
                        const testCase = availableTestCases.find(
                          (tc) => tc.id === testCaseId
                        );
                        return (
                          <Badge
                            key={testCaseId}
                            variant="secondary"
                            className="flex items-center gap-1"
                          >
                            <TestTube className="w-3 h-3" />

                            {testCase?.name}
                            <button
                              onClick={() =>
                                setFormData({
                                  ...formData,
                                  testCases: formData.testCases.filter(
                                    (id) => id !== testCaseId
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
                    <Label>Targets</Label>
                    <Select
                      value=""
                      onValueChange={(value) => {
                        if (!formData.targets.includes(value)) {
                          setFormData({
                            ...formData,
                            targets: [...formData.targets, value],
                          });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select targets to test" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTargets.map((target) => (
                          <SelectItem key={target.id} value={target.id}>
                            {target.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.targets.map((targetId) => {
                        const target = availableTargets.find(
                          (t) => t.id === targetId
                        );
                        return (
                          <Badge
                            key={targetId}
                            variant="secondary"
                            className="flex items-center gap-1"
                          >
                            <Target className="w-3 h-3" />

                            {target?.name}
                            <button
                              onClick={() =>
                                setFormData({
                                  ...formData,
                                  targets: formData.targets.filter(
                                    (id) => id !== targetId
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
                </div>
              </TabsContent>

              <TabsContent value="schedule" className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label>Schedule Type</Label>
                    <Select
                      value={formData.scheduleType}
                      onValueChange={(value: "once" | "recurring") =>
                        setFormData({ ...formData, scheduleType: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="once">Run Once</SelectItem>
                        <SelectItem value="recurring">Recurring</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.scheduleType === "recurring" && (
                    <>
                      <div>
                        <Label>Schedule Preset</Label>
                        <Select
                          value={formData.cronExpression}
                          onValueChange={(value) =>
                            setFormData({ ...formData, cronExpression: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {cronPresets.map((preset) => (
                              <SelectItem
                                key={preset.value}
                                value={preset.value}
                              >
                                <div>
                                  <div className="font-medium">
                                    {preset.label}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {preset.description}
                                  </div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="customCron">
                          Custom Cron Expression
                        </Label>
                        <Input
                          id="customCron"
                          value={formData.customCron}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              customCron: e.target.value,
                            })
                          }
                          placeholder="e.g., 0 9 * * 1-5 (weekdays at 9 AM)"
                        />

                        <p className="text-xs text-gray-500 mt-1">
                          Format: minute hour day month day-of-week
                        </p>
                      </div>
                    </>
                  )}

                  <div>
                    <Label>Timezone</Label>
                    <Select
                      value={formData.timezone}
                      onValueChange={(value) =>
                        setFormData({ ...formData, timezone: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timezones.map((tz) => (
                          <SelectItem key={tz} value={tz}>
                            {tz}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="notifications" className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="onSuccess">Notify on Success</Label>
                      <Switch
                        id="onSuccess"
                        checked={formData.notifications.onSuccess}
                        onCheckedChange={(checked) =>
                          setFormData({
                            ...formData,
                            notifications: {
                              ...formData.notifications,
                              onSuccess: checked,
                            },
                          })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="onFailure">Notify on Failure</Label>
                      <Switch
                        id="onFailure"
                        checked={formData.notifications.onFailure}
                        onCheckedChange={(checked) =>
                          setFormData({
                            ...formData,
                            notifications: {
                              ...formData.notifications,
                              onFailure: checked,
                            },
                          })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="onStart">Notify on Start</Label>
                      <Switch
                        id="onStart"
                        checked={formData.notifications.onStart}
                        onCheckedChange={(checked) =>
                          setFormData({
                            ...formData,
                            notifications: {
                              ...formData.notifications,
                              onStart: checked,
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="advanced" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="isActive">Enable Schedule</Label>
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, isActive: checked })
                      }
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="retryEnabled">Enable Retries</Label>
                      <Switch
                        id="retryEnabled"
                        checked={formData.retryPolicy.enabled}
                        onCheckedChange={(checked) =>
                          setFormData({
                            ...formData,
                            retryPolicy: {
                              ...formData.retryPolicy,
                              enabled: checked,
                            },
                          })
                        }
                      />
                    </div>

                    {formData.retryPolicy.enabled && (
                      <>
                        <div>
                          <Label htmlFor="maxRetries">Max Retries</Label>
                          <Input
                            id="maxRetries"
                            type="number"
                            min="1"
                            max="10"
                            value={formData.retryPolicy.maxRetries}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                retryPolicy: {
                                  ...formData.retryPolicy,
                                  maxRetries: parseInt(e.target.value) || 1,
                                },
                              })
                            }
                          />
                        </div>

                        <div>
                          <Label htmlFor="retryDelay">
                            Retry Delay (minutes)
                          </Label>
                          <Input
                            id="retryDelay"
                            type="number"
                            min="1"
                            max="60"
                            value={formData.retryPolicy.retryDelay}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                retryPolicy: {
                                  ...formData.retryPolicy,
                                  retryDelay: parseInt(e.target.value) || 1,
                                },
                              })
                            }
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateSchedule}
                disabled={!formData.name || formData.testCases.length === 0}
              >
                Create Schedule
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Scheduled Tests List */}
      <div className="grid grid-cols-1 gap-4">
        {scheduledTests.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-4" />

              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Scheduled Tests
              </h3>
              <p className="text-gray-600 mb-4">
                Create your first scheduled test to automate your testing
                workflow.
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Schedule Tests
              </Button>
            </CardContent>
          </Card>
        ) : (
          scheduledTests.map((schedule) => (
            <Card
              key={schedule.id}
              className={cn(!schedule.isActive && "opacity-60")}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center space-x-2">
                      <span>{schedule.name}</span>
                      {!schedule.isActive && (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </CardTitle>
                    {schedule.description && (
                      <CardDescription>{schedule.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onRunNow(schedule.id)}
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Run Now
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        onToggleSchedule(schedule.id, !schedule.isActive)
                      }
                    >
                      {schedule.isActive ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onDeleteSchedule(schedule.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Schedule Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <Label className="text-xs text-gray-500">SCHEDULE</Label>
                    <p className="font-medium">
                      {parseCronExpression(
                        schedule.schedule.cronExpression || ""
                      )}
                    </p>
                    <p className="text-gray-600">
                      {schedule.schedule.cronExpression} (
                      {schedule.schedule.timezone})
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">NEXT RUN</Label>
                    <p className="font-medium">
                      {formatDateTime(schedule.schedule.nextRun)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">LAST RUN</Label>
                    <p className="font-medium">
                      {schedule.schedule.lastRun
                        ? formatDateTime(schedule.schedule.lastRun)
                        : "Never"}
                    </p>
                  </div>
                </div>

                {/* Test Cases and Targets */}
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs text-gray-500">
                      TEST CASES ({schedule.testCases.length})
                    </Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {schedule.testCases.slice(0, 3).map((testCaseId) => {
                        const testCase = availableTestCases.find(
                          (tc) => tc.id === testCaseId
                        );
                        return (
                          <Badge
                            key={testCaseId}
                            variant="outline"
                            className="text-xs"
                          >
                            <TestTube className="w-3 h-3 mr-1" />

                            {testCase?.name}
                          </Badge>
                        );
                      })}
                      {schedule.testCases.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{schedule.testCases.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-gray-500">
                      TARGETS ({schedule.targets.length})
                    </Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {schedule.targets.slice(0, 3).map((targetId) => {
                        const target = availableTargets.find(
                          (t) => t.id === targetId
                        );
                        return (
                          <Badge
                            key={targetId}
                            variant="outline"
                            className="text-xs"
                          >
                            <Target className="w-3 h-3 mr-1" />

                            {target?.name}
                          </Badge>
                        );
                      })}
                      {schedule.targets.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{schedule.targets.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Recent Executions */}
                {schedule.executionHistory.length > 0 && (
                  <div>
                    <Label className="text-xs text-gray-500">
                      RECENT EXECUTIONS
                    </Label>
                    <div className="space-y-2 mt-2">
                      {schedule.executionHistory
                        .slice(0, 3)
                        .map((execution) => (
                          <div
                            key={execution.id}
                            className="flex items-center justify-between text-sm"
                          >
                            <div className="flex items-center space-x-2">
                              <Badge
                                variant="outline"
                                className={getStatusColor(execution.status)}
                              >
                                {execution.status}
                              </Badge>
                              <span className="text-gray-600">
                                {formatDateTime(execution.startTime)}
                              </span>
                            </div>
                            {execution.endTime && (
                              <span className="text-gray-500 text-xs">
                                Duration:{" "}
                                {Math.round(
                                  (new Date(execution.endTime).getTime() -
                                    new Date(execution.startTime).getTime()) /
                                    1000 /
                                    60
                                )}
                                m
                              </span>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
