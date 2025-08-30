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
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Eye,
  Globe,
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
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
  // Enhanced properties for better UX
  projectName?: string;
  testName?: string;
  thumbnailUrl?: string;
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
  const [helpExpanded, setHelpExpanded] = useState(false);
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
          // Enhanced data for better UX
          projectName: "E-commerce Site",
          testName: "User Login Flow",
          thumbnailUrl: "/thumbnails/session-1-preview.png",
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
          // Enhanced data for better UX
          projectName: "Marketing Dashboard",
          testName: "Analytics Report Generation",
          thumbnailUrl: "/thumbnails/session-2-preview.png",
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
          <Badge variant="default" className="bg-green-100 text-green-800 text-sm px-3 py-1">
            <Activity className="w-4 h-4 mr-1" />
            Active
          </Badge>
        );
      case "recording":
        return (
          <Badge variant="destructive" className="animate-pulse text-sm px-3 py-1">
            <Zap className="w-4 h-4 mr-1" />
            Recording
          </Badge>
        );
      case "paused":
        return (
          <Badge variant="secondary" className="text-sm px-3 py-1">
            <Pause className="w-4 h-4 mr-1" />
            Paused
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-sm px-3 py-1">
            <XCircle className="w-4 h-4 mr-1" />
            Closed
          </Badge>
        );
    }
  };

  const InteractiveFeatureHelp = () => {
    const features = [
      {
        title: "Session Management",
        description: "Create, monitor, and control browser sessions with real-time updates",
        icon: Monitor,
        details: [
          "Launch new browser instances",
          "Monitor active sessions",
          "Control session lifecycle",
          "View session statistics"
        ]
      },
      {
        title: "Multi-Browser Support",
        description: "Test across different browsers: Chrome, Firefox, Safari, Edge",
        icon: Globe,
        details: [
          "Cross-browser compatibility",
          "Browser-specific testing",
          "Mobile emulation",
          "Device simulation"
        ]
      },
      {
        title: "Real-time Control",
        description: "Navigate, click, type, scroll in real-time from your dashboard",
        icon: Activity,
        details: [
          "Live browser interaction",
          "Element inspection",
          "Screenshot capture",
          "Performance monitoring"
        ]
      },
      {
        title: "WebSocket Integration",
        description: "Instant feedback and live updates through WebSocket connections",
        icon: Zap,
        details: [
          "Real-time status updates",
          "Live session monitoring",
          "Instant command execution",
          "Event-driven notifications"
        ]
      }
    ];

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <HelpCircle className="w-5 h-5 text-blue-600" />
                <span>Browser Control Features</span>
              </CardTitle>
              <CardDescription>
                Comprehensive browser session management and control
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setHelpExpanded(!helpExpanded)}
            >
              {helpExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        {helpExpanded && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Icon className="w-4 h-4 text-blue-600" />
                      <h4 className="font-medium text-sm">{feature.title}</h4>
                    </div>
                    <p className="text-xs text-gray-600">{feature.description}</p>
                    <ul className="text-xs text-gray-500 space-y-1 ml-4">
                      {feature.details.map((detail, detailIndex) => (
                        <li key={detailIndex} className="flex items-center">
                          <div className="w-1 h-1 bg-gray-400 rounded-full mr-2" />
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </CardContent>
        )}
      </Card>
    );
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

        {/* Interactive Feature Help */}
        <InteractiveFeatureHelp />

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
                  className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center space-x-4">
                    {/* Mini Preview Thumbnail */}
                    <div className="w-16 h-12 bg-gradient-to-br from-blue-50 to-indigo-100 rounded border overflow-hidden flex-shrink-0 relative">
                      {session.thumbnailUrl ? (
                        <img
                          src={session.thumbnailUrl}
                          alt="Session preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              const icon = document.createElement('div');
                              icon.className = 'w-full h-full flex items-center justify-center text-gray-400';
                              icon.innerHTML = '<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7v10c0 5.55 3.84 9.74 9 11 5.16-1.26 9-5.45 9-11V7l-10-5z"/></svg>';
                              parent.appendChild(icon);
                            }
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <div className="text-center">
                            <Monitor className="w-6 h-6 mx-auto mb-1" />
                            <div className="text-xs">Live</div>
                          </div>
                        </div>
                      )}

                      {/* Status indicator overlay */}
                      {session.status === 'recording' && (
                        <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      )}
                    </div>

                    {/* Browser Icon */}
                    {getBrowserIcon(session.browser_type)}

                    {/* Session Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="font-medium text-gray-900">
                          {session.projectName || session.id}
                        </p>
                        <span className="text-gray-400">•</span>
                        <p className="text-sm text-blue-600 truncate">
                          {session.testName || "Test Session"}
                        </p>
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                        {session.url}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {session.viewport.width}×{session.viewport.height}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {session.browser_type}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Status and Actions */}
                  <div className="flex items-center space-x-3">
                    {getStatusBadge(session.status)}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => closeSession(session.id)}
                      className="hover:bg-red-50 hover:border-red-200"
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