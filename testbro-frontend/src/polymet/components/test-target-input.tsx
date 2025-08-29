import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Globe,
  Smartphone,
  Monitor,
  Upload,
  Edit,
  Trash2,
  Play,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { mockTestTargets, TestTarget } from "@/polymet/data/test-data";

interface NewTargetForm {
  name: string;
  url: string;
  platform: "web" | "mobile-web" | "mobile-app";
  description: string;
  environment: "production" | "staging" | "development";
  tags: string;
  authRequired: boolean;
  authType: "basic" | "oauth" | "api-key";
  appFile?: File;
}

const platformIcons = {
  web: Globe,
  "mobile-web": Smartphone,
  "mobile-app": Monitor,
};

const statusConfig = {
  active: { color: "bg-green-100 text-green-800", icon: CheckCircle },
  inactive: { color: "bg-gray-100 text-gray-800", icon: XCircle },
  maintenance: { color: "bg-yellow-100 text-yellow-800", icon: AlertCircle },
};

const lastRunStatusConfig = {
  passed: { color: "text-green-600", icon: CheckCircle },
  failed: { color: "text-red-600", icon: XCircle },
  running: { color: "text-blue-600", icon: Clock },
  cancelled: { color: "text-gray-600", icon: XCircle },
};

export default function TestTargetInput() {
  const [targets, setTargets] = useState<TestTarget[]>(mockTestTargets);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<TestTarget | null>(null);
  const [formData, setFormData] = useState<NewTargetForm>({
    name: "",
    url: "",
    platform: "web",
    description: "",
    environment: "staging",
    tags: "",
    authRequired: false,
    authType: "basic",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newTarget: TestTarget = {
      id: editingTarget ? editingTarget.id : `target-${Date.now()}`,
      name: formData.name,
      url: formData.url,
      platform: formData.platform,
      description: formData.description,
      status: "active",
      createdAt: editingTarget
        ? editingTarget.createdAt
        : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "john.doe@testbro.ai",
      tags: formData.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      totalRuns: editingTarget ? editingTarget.totalRuns : 0,
      passRate: editingTarget ? editingTarget.passRate : 0,
      environment: formData.environment,
      authentication: {
        required: formData.authRequired,
        type: formData.authRequired ? formData.authType : undefined,
      },
    };

    if (formData.appFile && formData.platform === "mobile-app") {
      newTarget.appFile = {
        name: formData.appFile.name,
        size: formData.appFile.size,
        type: formData.appFile.name.endsWith(".ipa") ? "ipa" : "apk",
        uploadedAt: new Date().toISOString(),
      };
    }

    if (editingTarget) {
      setTargets(
        targets.map((t) => (t.id === editingTarget.id ? newTarget : t))
      );
    } else {
      setTargets([...targets, newTarget]);
    }

    resetForm();
    setIsDialogOpen(false);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      url: "",
      platform: "web",
      description: "",
      environment: "staging",
      tags: "",
      authRequired: false,
      authType: "basic",
    });
    setEditingTarget(null);
  };

  const handleEdit = (target: TestTarget) => {
    setEditingTarget(target);
    setFormData({
      name: target.name,
      url: target.url,
      platform: target.platform,
      description: target.description || "",
      environment: target.environment,
      tags: target.tags.join(", "),
      authRequired: target.authentication?.required || false,
      authType: target.authentication?.type || "basic",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (targetId: string) => {
    setTargets(targets.filter((t) => t.id !== targetId));
  };

  const getUxTrend = (target: TestTarget) => {
    // Mock trend calculation
    const trend = Math.random() > 0.5 ? "up" : "down";
    return trend;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Test Targets</h1>
          <p className="text-gray-600">
            Manage target applications and websites for testing
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Add Target
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingTarget ? "Edit Target" : "Add New Target"}
              </DialogTitle>
              <DialogDescription>
                Configure a new target application or website for testing
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Target Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g., Production Website"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="platform">Platform</Label>
                  <Select
                    value={formData.platform}
                    onValueChange={(
                      value: "web" | "mobile-web" | "mobile-app"
                    ) => setFormData({ ...formData, platform: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="web">Web Application</SelectItem>
                      <SelectItem value="mobile-web">Mobile Web</SelectItem>
                      <SelectItem value="mobile-app">Mobile App</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="url">
                  {formData.platform === "mobile-app" ? "App Bundle ID" : "URL"}
                </Label>
                <Input
                  id="url"
                  value={formData.url}
                  onChange={(e) =>
                    setFormData({ ...formData, url: e.target.value })
                  }
                  placeholder={
                    formData.platform === "mobile-app"
                      ? "com.example.app"
                      : "https://example.com"
                  }
                  required
                />
              </div>

              {formData.platform === "mobile-app" && (
                <div className="space-y-2">
                  <Label htmlFor="appFile">App File (APK/IPA)</Label>
                  <Input
                    id="appFile"
                    type="file"
                    accept=".apk,.ipa"
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        appFile: e.target.files?.[0],
                      })
                    }
                  />

                  <p className="text-sm text-gray-500">
                    Upload your mobile app file for testing
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Brief description of the target application"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="environment">Environment</Label>
                  <Select
                    value={formData.environment}
                    onValueChange={(
                      value: "production" | "staging" | "development"
                    ) => setFormData({ ...formData, environment: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="production">Production</SelectItem>
                      <SelectItem value="staging">Staging</SelectItem>
                      <SelectItem value="development">Development</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tags">Tags</Label>
                  <Input
                    id="tags"
                    value={formData.tags}
                    onChange={(e) =>
                      setFormData({ ...formData, tags: e.target.value })
                    }
                    placeholder="e.g., critical, mobile, api"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingTarget ? "Update Target" : "Add Target"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Targets</p>
                <p className="text-2xl font-bold text-gray-900">
                  {targets.length}
                </p>
              </div>
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Globe className="w-4 h-4 text-blue-600" />
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
                  {targets.filter((t) => t.status === "active").length}
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
                <p className="text-sm text-gray-600">Avg Pass Rate</p>
                <p className="text-2xl font-bold text-blue-600">
                  {Math.round(
                    targets.reduce((acc, t) => acc + (t.passRate || 0), 0) /
                      targets.length
                  )}
                  %
                </p>
              </div>
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Runs</p>
                <p className="text-2xl font-bold text-purple-600">
                  {targets.reduce((acc, t) => acc + (t.totalRuns || 0), 0)}
                </p>
              </div>
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <Play className="w-4 h-4 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Targets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Target Applications</CardTitle>
          <CardDescription>
            Manage and monitor your test target applications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Target</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Environment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Run</TableHead>
                <TableHead>Pass Rate</TableHead>
                <TableHead>UX Score</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {targets.map((target) => {
                const PlatformIcon = platformIcons[target.platform];
                const statusConf = statusConfig[target.status];
                const StatusIcon = statusConf.icon;
                const lastRunConf = target.lastRunStatus
                  ? lastRunStatusConfig[target.lastRunStatus]
                  : null;
                const LastRunIcon = lastRunConf?.icon;
                const uxTrend = getUxTrend(target);
                const TrendIcon = uxTrend === "up" ? TrendingUp : TrendingDown;

                return (
                  <TableRow key={target.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                          <PlatformIcon className="w-4 h-4 text-gray-600" />
                        </div>
                        <div>
                          <div className="font-medium">{target.name}</div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {target.url}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {target.platform.replace("-", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          target.environment === "production"
                            ? "bg-red-50 text-red-700 border-red-200"
                            : target.environment === "staging"
                              ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                        }
                      >
                        {target.environment}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={statusConf.color}>
                        <StatusIcon className="w-3 h-3 mr-1" />

                        {target.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {target.lastRunDate &&
                      target.lastRunStatus &&
                      LastRunIcon ? (
                        <div className="flex items-center space-x-2">
                          <LastRunIcon
                            className={`w-4 h-4 ${lastRunConf.color}`}
                          />

                          <span className="text-sm text-gray-600">
                            {new Date(target.lastRunDate).toLocaleDateString()}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Never</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">
                          {target.passRate?.toFixed(1)}%
                        </span>
                        <span className="text-xs text-gray-500">
                          ({target.totalRuns} runs)
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {target.avgUxScore ? (
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">
                            {target.avgUxScore}
                          </span>
                          <TrendIcon
                            className={`w-3 h-3 ${uxTrend === "up" ? "text-green-500" : "text-red-500"}`}
                          />
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />

                          <DropdownMenuItem asChild>
                            <Link to={`/test-execution/${target.id}`}>
                              <Play className="w-4 h-4 mr-2" />
                              Run Tests
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to={`/test-results/${target.id}`}>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              View Results
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(target)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />

                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleDelete(target.id)}
                          >
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
        </CardContent>
      </Card>

      {targets.length === 0 && (
        <div className="text-center py-12">
          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Globe className="w-6 h-6 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No targets configured
          </h3>
          <p className="text-gray-500 mb-4">
            Add your first target application to start testing
          </p>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Target
          </Button>
        </div>
      )}
    </div>
  );
}
