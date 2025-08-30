import React, { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Plus,
  Globe,
  Smartphone,
  Monitor,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Clock,
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

const platformIcons: Record<NewTargetForm["platform"], LucideIcon> = {
  web: Globe,
  "mobile-web": Smartphone,
  "mobile-app": Monitor,
};

// Simple sparkline component
const Sparkline = ({ data, isPositive }: { data: number[]; isPositive: boolean }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width="80" height="20" viewBox="0 0 100 100" className="overflow-visible">
      <polyline
        fill="none"
        stroke={isPositive ? "#10B981" : "#EF4444"}
        strokeWidth="2"
        points={points}
        className="transition-all duration-200"
      />
    </svg>
  );
};

export default function TestTargetInput() {
  const [targets, setTargets] = useState<TestTarget[]>(mockTestTargets);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<TestTarget | null>(null);
  const [showOnlyFailing, setShowOnlyFailing] = useState(false);
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
      projectId: editingTarget ? editingTarget.projectId : "default-project",
      name: formData.name,
      url: formData.url,
      platform: formData.platform,
      description: formData.description,
      status: "active",
      createdAt: editingTarget ? editingTarget.createdAt : new Date().toISOString(),
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
      ...(editingTarget?.avgUxScore !== undefined && { avgUxScore: editingTarget?.avgUxScore }),
    } as TestTarget;

    if (formData.appFile && formData.platform === "mobile-app") {
      // @ts-ignore - TestTarget may include optional appFile in your model
      newTarget.appFile = {
        name: formData.appFile.name,
        size: formData.appFile.size,
        type: formData.appFile.name.endsWith(".ipa") ? "ipa" : "apk",
        uploadedAt: new Date().toISOString(),
      };
    }

    if (editingTarget) {
      setTargets(targets.map((t) => (t.id === editingTarget.id ? newTarget : t)));
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
      authType: (target.authentication?.type as NewTargetForm["authType"]) || "basic",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (targetId: string) => {
    setTargets(targets.filter((t) => t.id !== targetId));
  };

  const handleRunTarget = (targetId: string) => {
    // Mock run action
    setTargets((prev) =>
      prev.map((t) =>
        t.id === targetId
          ? {
              ...t,
              totalRuns: (t.totalRuns || 0) + 1,
              updatedAt: new Date().toISOString(),
            }
          : t
      )
    );
  };

  // Generate mock trend data for sparklines (derived each render but memoized per target snapshot)
  const passRateTrends = useMemo(() => {
    const trends: Record<string, number[]> = {};
    for (const t of targets) {
      const base = t.passRate || 0;
      const arr: number[] = [];
      for (let i = 0; i < 7; i++) {
        const v = Math.max(0, Math.min(100, base + (Math.random() - 0.5) * 10));
        arr.push(v);
      }
      trends[t.id] = arr;
    }
    return trends;
  }, [targets]);

  const uxScoreTrends = useMemo(() => {
    const trends: Record<string, number[]> = {};
    for (const t of targets) {
      const base = (t as any).avgUxScore || 0;
      const arr: number[] = [];
      for (let i = 0; i < 7; i++) {
        const v = Math.max(0, Math.min(1, base + (Math.random() - 0.5) * 0.4));
        arr.push(v);
      }
      trends[t.id] = arr;
    }
    return trends;
  }, [targets]);

  const filteredTargets = showOnlyFailing ? targets.filter((t) => (t.passRate ?? 0) < 70) : targets;

  return (
    <React.Fragment>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Test Targets</h2>
            <p className="text-sm text-muted-foreground">Manage and monitor your test target applications</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant={showOnlyFailing ? "destructive" : "outline"} onClick={() => setShowOnlyFailing((v) => !v)}>
              {showOnlyFailing ? "Showing Failing" : "Show Only Failing"}
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" /> Add Target
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingTarget ? "Edit Target" : "Add Target"}</DialogTitle>
                  <DialogDescription>Provide details about the application you want to test.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="url">URL</Label>
                      <Input id="url" value={formData.url} onChange={(e) => setFormData({ ...formData, url: e.target.value })} placeholder="https://example.com" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Platform</Label>
                        <Select value={formData.platform} onValueChange={(v: any) => setFormData({ ...formData, platform: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="web">Web</SelectItem>
                            <SelectItem value="mobile-web">Mobile Web</SelectItem>
                            <SelectItem value="mobile-app">Mobile App</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Environment</Label>
                        <Select value={formData.environment} onValueChange={(v: any) => setFormData({ ...formData, environment: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="production">Production</SelectItem>
                            <SelectItem value="staging">Staging</SelectItem>
                            <SelectItem value="development">Development</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tags">Tags (comma separated)</Label>
                      <Input id="tags" value={formData.tags} onChange={(e) => setFormData({ ...formData, tags: e.target.value })} />
                    </div>
                    {formData.platform === "mobile-app" && (
                      <div className="space-y-2">
                        <Label htmlFor="appFile">App File (.apk / .ipa)</Label>
                        <Input id="appFile" type="file" accept=".apk,.ipa" onChange={(e) => setFormData({ ...formData, appFile: e.target.files?.[0] })} />
                      </div>
                    )}
                  </div>
                  <DialogFooter className="gap-2">
                    <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>Cancel</Button>
                    <Button type="submit">{editingTarget ? "Save Changes" : "Create Target"}</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Table */}
        {filteredTargets.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Globe className="w-5 h-5 text-blue-600" />
                <span>Target Applications</span>
                {showOnlyFailing && (
                  <Badge variant="destructive" className="ml-2">
                    Showing {filteredTargets.length} failing targets
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>Manage and monitor your test target applications</CardDescription>
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
                    <TableHead className="w-40">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTargets.map((target) => {
                    const Icon = platformIcons[target.platform];
                    const passTrend = passRateTrends[target.id] || [];
                    const uxTrend = uxScoreTrends[target.id] || [];
                    const uxScore = (target as any).avgUxScore as number | undefined;

                    return (
                      <TableRow key={target.id} className={(target.passRate ?? 0) < 70 ? "bg-red-50 border-l-4 border-red-500" : ""}>
                        <TableCell className="font-medium">{target.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Icon className="w-4 h-4 text-muted-foreground" />
                            <span className="ml-2 capitalize">{target.platform.replace("-", " ")}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">{target.environment}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={target.status === "active" ? "default" : "secondary"} className="capitalize">
                            {target.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{target.updatedAt ? new Date(target.updatedAt).toLocaleString() : "—"}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <span className="mr-2">{target.passRate}%</span>
                            {passTrend.length > 0 && (
                              <Sparkline data={passTrend} isPositive={(target.passRate ?? 0) >= 70} />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <span className="mr-2">{uxScore !== undefined ? uxScore.toFixed(2) : "—"}</span>
                            {uxTrend.length > 0 && (
                              <Sparkline data={uxTrend} isPositive={(uxScore ?? 0) >= 0.5} />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="default" onClick={() => handleRunTarget(target.id)}>
                              Run
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="outline">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEdit(target)}>Edit</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDelete(target.id)}>Delete</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <div className="text-center py-12">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Globe className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {showOnlyFailing ? "No failing targets found" : "No targets configured"}
            </h3>
            <p className="text-gray-500 mb-4">
              {showOnlyFailing ? "All your targets are currently passing! 🎉" : "Add your first target application to start testing"}
            </p>
            <div className="flex items-center justify-center space-x-3">
              {showOnlyFailing && (
                <Button variant="outline" onClick={() => setShowOnlyFailing(false)}>
                  Show All Targets
                </Button>
              )}
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Target
              </Button>
            </div>
          </div>
        )}
      </div>
    </React.Fragment>
  );
}