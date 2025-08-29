import { useState, useEffect } from "react";
import {
  Monitor,
  Plus,
  Activity,
  BarChart3,
  Chrome,
  Pause,
  Zap,
  XCircle,
  Loader2,
  Trash2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TooltipProvider,
} from "@/components/ui/tooltip";

interface BrowserSession {
  id: string;
  project_id: string;
  target_id: string;
  browser_type: string;
  viewport: { width: number; height: number };
  status: string;
  url: string;
  user_id: string;
  created_at: string;
  last_activity: string;
  recording_session_id?: string;
}

interface BrowserControlDashboardProps {
  onSessionCreate?: (sessionData: any) => void;
  className?: string;
}

export default function BrowserControlDashboard({
  onSessionCreate,
  className = "",
}: BrowserControlDashboardProps) {
  const [activeSessions, setActiveSessions] = useState<BrowserSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newSessionDialogOpen, setNewSessionDialogOpen] = useState(false);
  const [newSessionData, setNewSessionData] = useState({
    projectId: "",
    targetId: "",
    browserType: "chromium",
    headless: false,
    viewport: { width: 1280, height: 720 },
  });
  const [stats, setStats] = useState({
    activeSessions: 0,
    totalSessions: 0,
    recordingSessions: 0,
    playbackSessions: 0,
    avgSessionDuration: 0,
    resourceUsage: { cpu: 0, memory: 0, network: 0 },
  });

  // Mock data for development
  useEffect(() => {
    // Simulate loading
    setTimeout(() => {
      setActiveSessions([
        {
          id: "session-1",
          project_id: "project-1",
          target_id: "target-1",
          browser_type: "chromium",
          viewport: { width: 1280, height: 720 },
          status: "active",
          url: "https://example.com",
          user_id: "user-1",
          created_at: new Date().toISOString(),
          last_activity: new Date().toISOString(),
        },
        {
          id: "session-2",
          project_id: "project-1",
          target_id: "target-2",
          browser_type: "firefox",
          viewport: { width: 1920, height: 1080 },
          status: "recording",
          url: "https://testapp.com",
          user_id: "user-1",
          created_at: new Date().toISOString(),
          last_activity: new Date().toISOString(),
          recording_session_id: "recording-1",
        },
      ]);

      setStats({
        activeSessions: 2,
        totalSessions: 15,
        recordingSessions: 1,
        playbackSessions: 0,
        avgSessionDuration: 450,
        resourceUsage: { cpu: 45, memory: 62, network: 23 },
      });

      setIsLoading(false);
    }, 1000);
  }, []);

  const createNewSession = async () => {
    try {
      // API call to create new browser session
      const response = await fetch("/api/browser-control/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: newSessionData.projectId,
          target_id: newSessionData.targetId,
          browser_type: newSessionData.browserType,
          options: {
            headless: newSessionData.headless,
            viewport: newSessionData.viewport,
          },
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setActiveSessions((prev) => [...prev, result.data]);
        setNewSessionDialogOpen(false);
        
        // Notify parent component of new session creation
        onSessionCreate?.(result.data);
      }
    } catch (error) {
      console.error("Failed to create session:", error);
    }
  };

  const closeSession = async (sessionId: string) => {
    try {
      await fetch(`/api/browser-control/sessions/${sessionId}`, {
        method: "DELETE",
      });
      setActiveSessions((prev) =>
        prev.filter((session) => session.id !== sessionId)
      );
    } catch (error) {
      console.error("Failed to close session:", error);
    }
  };

  const getBrowserIcon = (browserType: string) => {
    switch (browserType) {
      case "firefox":
        return <Monitor className="w-4 h-4 text-orange-500" />;
      case "webkit":
        return <Monitor className="w-4 h-4 text-blue-500" />;
      default:
        return <Chrome className="w-4 h-4 text-blue-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <Activity className="w-3 h-3 mr-1" />
            Active
          </Badge>
        );
      case "recording":
        return (
          <Badge variant="destructive" className="animate-pulse">
            <Zap className="w-3 h-3 mr-1" />
            Recording
          </Badge>
        );
      case "paused":
        return (
          <Badge variant="secondary">
            <Pause className="w-3 h-3 mr-1" />
            Paused
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <XCircle className="w-3 h-3 mr-1" />
            Closed
          </Badge>
        );
    }
  };

  if (isLoading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="ml-2">Loading browser control dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className={`p-6 space-y-6 ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Browser Control</h1>
            <p className="text-muted-foreground">
              Manage real-time browser automation sessions
            </p>
          </div>
          <Dialog open={newSessionDialogOpen} onOpenChange={setNewSessionDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg">
                <Plus className="w-4 h-4 mr-2" />
                New Session
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Browser Session</DialogTitle>
                <DialogDescription>
                  Launch a new browser instance for automation and testing.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="project" className="text-right">
                    Project
                  </Label>
                  <Select
                    value={newSessionData.projectId}
                    onValueChange={(value) =>
                      setNewSessionData((prev) => ({ ...prev, projectId: value }))
                    }
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="project-1">E-commerce Site</SelectItem>
                      <SelectItem value="project-2">Marketing Dashboard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" onClick={createNewSession}>
                  Create Session
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
              <Monitor className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeSessions}</div>
              <p className="text-xs text-muted-foreground">
                {stats.recordingSessions} recording
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSessions}</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>
        </div>

        {/* Active Sessions */}
        <Card>
          <CardHeader>
            <CardTitle>Active Browser Sessions</CardTitle>
            <CardDescription>
              Currently running browser automation sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    {getBrowserIcon(session.browser_type)}
                    <div>
                      <p className="font-medium">{session.id}</p>
                      <p className="text-sm text-muted-foreground">
                        {session.url}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(session.status)}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => closeSession(session.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}