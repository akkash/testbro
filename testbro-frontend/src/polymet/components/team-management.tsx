import { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  Crown as CrownIcon,
  Activity,
  MoreHorizontal,
  Pencil as Edit,
  Trash2,
  Search,
  Download,
  Loader2,
  AlertTriangle,
  Plus,
  BarChart3,
  TrendingUp,
  CheckCircle,
  XCircle,
  Eye,
  FileText,
  UserCog as UserCogIcon,
  Target,
  MessageSquare,
  Link,
  Copy,
  ArrowRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";


import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { OrganizationService } from "@/lib/services/organizationService";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";

// Chart imports for activity trends
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";

// Enhanced role definitions with permissions
const ROLE_DEFINITIONS = {
  admin: {
    name: "Administrator",
    icon: CrownIcon,
    color: "yellow",
    permissions: ["Manage billing", "Manage team", "Edit all tests", "View analytics", "Export data"],
    description: "Full access to all features and settings"
  },
  developer: {
    name: "Developer",
    icon: UserCogIcon,
    color: "purple",
    permissions: ["Create tests", "Edit tests", "Run tests", "View analytics"],
    description: "Can create and manage tests"
  },
  tester: {
    name: "Tester",
    icon: Target,
    color: "blue",
    permissions: ["Run tests", "View results", "Create test cases"],
    description: "Can execute tests and view results"
  },
  analyst: {
    name: "Analyst",
    icon: BarChart3,
    color: "indigo",
    permissions: ["View analytics", "Export reports", "View test results"],
    description: "Can analyze data and generate reports"
  },
  viewer: {
    name: "Viewer",
    icon: Eye,
    color: "green",
    permissions: ["View tests", "View results", "Read-only access"],
    description: "Read-only access to test data"
  }
};

const RoleIcon = ({ role }: { role: string }) => {
  const definition = ROLE_DEFINITIONS[role as keyof typeof ROLE_DEFINITIONS];
  if (!definition) return <User className="w-4 h-4 text-gray-600" />;

  const IconComponent = definition.icon;
  const colorClass = `text-${definition.color}-600`;
  return <IconComponent className={`w-4 h-4 ${colorClass}`} />;
};

const getRoleBadgeColor = (role: string) => {
  const definition = ROLE_DEFINITIONS[role as keyof typeof ROLE_DEFINITIONS];
  if (!definition) return "bg-gray-100 text-gray-800";

  const colorClass = `bg-${definition.color}-100 text-${definition.color}-800`;
  return colorClass;
};

const getRolePermissions = (role: string) => {
  const definition = ROLE_DEFINITIONS[role as keyof typeof ROLE_DEFINITIONS];
  return definition?.permissions || [];
};

const TeamMemberCard = ({
  member,
  onUpdateRole,
  onRemoveMember,
  canManage = false
}: {
  member: any;
  onUpdateRole: (memberId: string, role: string) => void;
  onRemoveMember: (memberId: string) => void;
  canManage: boolean;
}) => {
  const roleDefinition = ROLE_DEFINITIONS[member.role as keyof typeof ROLE_DEFINITIONS];
  const permissions = getRolePermissions(member.role);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Avatar className="w-14 h-14 ring-2 ring-gray-100">
                <AvatarImage src={member.avatar} alt={member.name} />
                <AvatarFallback className="text-lg font-semibold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                  {member.name
                    .split(" ")
                    .map((n: string) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center ${
                member.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
              }`}>
                {member.status === 'active' ? (
                  <CheckCircle className="w-3 h-3 text-white" />
                ) : (
                  <XCircle className="w-3 h-3 text-white" />
                )}
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">{member.name}</h3>
              <p className="text-sm text-gray-500">{member.email}</p>
              <div className="flex items-center mt-1">
                <Badge
                  variant="secondary"
                  className={`${getRoleBadgeColor(member.role)} text-xs`}
                >
                  <RoleIcon role={member.role} />
                  <span className="ml-1 capitalize">{member.role}</span>
                </Badge>
                {member.lastActive && (
                  <span className="text-xs text-gray-400 ml-2">
                    Last active: {new Date(member.lastActive).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>
          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Change Role</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {Object.entries(ROLE_DEFINITIONS).map(([key, definition]) => {
                  const IconComponent = definition.icon;
                  return (
                    <DropdownMenuItem
                      key={key}
                      onClick={() => onUpdateRole(member.id, key)}
                      disabled={member.role === key}
                    >
                      <IconComponent className={`w-4 h-4 mr-2 text-${definition.color}-600`} />
                      {definition.name}
                      {member.role === key && <CheckCircle className="w-4 h-4 ml-auto text-green-500" />}
                    </DropdownMenuItem>
                  );
                })}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600" onClick={() => onRemoveMember(member.id)}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remove User
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Permissions Preview */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-1">
            {permissions.slice(0, 3).map((permission, index) => (
              <Badge key={index} variant="outline" className="text-xs px-2 py-0.5">
                {permission}
              </Badge>
            ))}
            {permissions.length > 3 && (
              <Badge variant="outline" className="text-xs px-2 py-0.5">
                +{permissions.length - 3} more
              </Badge>
            )}
          </div>
        </div>

        {/* Activity Stats */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-lg font-bold text-blue-600">{member.testsCreated || 0}</div>
            <div className="text-xs text-blue-600">Tests Created</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-lg font-bold text-green-600">{member.testsExecuted || 0}</div>
            <div className="text-xs text-green-600">Tests Executed</div>
          </div>
        </div>

        {/* Activity Timeline */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Recent Activity</span>
            <Activity className={`w-4 h-4 ${member.status === 'active' ? 'text-green-500' : 'text-gray-400'}`} />
          </div>
          <div className="text-xs text-gray-500 space-y-1">
            <div>Joined: {new Date(member.joined_at || member.lastActive).toLocaleDateString()}</div>
            {member.lastActivity && (
              <div>Last activity: {member.lastActivity}</div>
            )}
            <div className="flex items-center">
              <span>Status: </span>
              <span className={`ml-1 font-medium ${member.status === 'active' ? 'text-green-600' : 'text-gray-500'}`}>
                {member.status === 'active' ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const InviteMemberDialog = ({
  organizationId,
  onInviteSent,
  open,
  onOpenChange
}: {
  organizationId: string;
  onInviteSent: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const [inviteData, setInviteData] = useState({
    email: '',
    role: 'viewer' as keyof typeof ROLE_DEFINITIONS,
    message: '',
    expiresIn: '7',
    sendEmail: true,
    generateLink: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const handleInvite = async () => {
    if (!inviteData.email) {
      setError('Email is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: inviteError, data } = await OrganizationService.inviteMember(organizationId, {
        email: inviteData.email,
        role: mapFrontendRoleToBackend(inviteData.role),
        message: inviteData.message,
        expiresIn: parseInt(inviteData.expiresIn),
        sendEmail: inviteData.sendEmail,
        generateLink: inviteData.generateLink
      });

      if (inviteError) {
        setError(inviteError);
      } else {
        if (inviteData.generateLink && data?.inviteLink) {
          setInviteLink(data.inviteLink);
        } else {
          setInviteData({
            email: '',
            role: 'viewer',
            message: '',
            expiresIn: '7',
            sendEmail: true,
            generateLink: false
          });
          onOpenChange(false);
          onInviteSent();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
    }

    setLoading(false);
  };

  const copyInviteLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      // You could add a toast notification here
    }
  };

  const selectedRole = ROLE_DEFINITIONS[inviteData.role];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <UserPlus className="w-5 h-5" />
            <span>Invite Team Member</span>
          </DialogTitle>
          <DialogDescription>
            Send an invitation to join your organization with custom settings
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@company.com"
                value={inviteData.email}
                onChange={(e) => setInviteData(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={inviteData.role}
                onValueChange={(value: keyof typeof ROLE_DEFINITIONS) =>
                  setInviteData(prev => ({ ...prev, role: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_DEFINITIONS).map(([key, definition]) => {
                    const IconComponent = definition.icon;
                    return (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center space-x-2">
                          <IconComponent className={`w-4 h-4 text-${definition.color}-600`} />
                          <span>{definition.name}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Role Preview */}
          {selectedRole && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-start space-x-3">
                <div className={`w-8 h-8 rounded-lg bg-${selectedRole.color}-100 flex items-center justify-center`}>
                  <selectedRole.icon className={`w-4 h-4 text-${selectedRole.color}-600`} />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{selectedRole.name}</h4>
                  <p className="text-sm text-gray-600">{selectedRole.description}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedRole.permissions.slice(0, 3).map((permission, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {permission}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Custom Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Personal Message (Optional)</Label>
            <Textarea
              id="message"
              placeholder="Add a personal message to the invitation..."
              value={inviteData.message}
              onChange={(e) => setInviteData(prev => ({ ...prev, message: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Invite Options */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Send Email Invitation</Label>
                <p className="text-xs text-gray-500">Send invitation via email</p>
              </div>
              <Switch
                checked={inviteData.sendEmail}
                onCheckedChange={(checked) =>
                  setInviteData(prev => ({ ...prev, sendEmail: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Generate Shareable Link</Label>
                <p className="text-xs text-gray-500">Create a link for manual sharing</p>
              </div>
              <Switch
                checked={inviteData.generateLink}
                onCheckedChange={(checked) =>
                  setInviteData(prev => ({ ...prev, generateLink: checked }))
                }
              />
            </div>

            {inviteData.sendEmail && (
              <div className="space-y-2">
                <Label htmlFor="expiresIn">Link Expires In</Label>
                <Select
                  value={inviteData.expiresIn}
                  onValueChange={(value) =>
                    setInviteData(prev => ({ ...prev, expiresIn: value }))
                  }
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 day</SelectItem>
                    <SelectItem value="3">3 days</SelectItem>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Generated Link Display */}
          {inviteLink && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-green-900">Invitation Link Generated</h4>
                  <p className="text-sm text-green-700 mt-1">
                    Share this link with the new team member
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyInviteLink}
                  className="text-green-700 border-green-300"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Link
                </Button>
              </div>
              <div className="mt-2 p-2 bg-white rounded border text-xs font-mono text-gray-600 break-all">
                {inviteLink}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleInvite} disabled={loading || !inviteData.email}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : inviteData.generateLink && !inviteLink ? (
              <>
                <Link className="w-4 h-4 mr-2" />
                Generate Link
              </>
            ) : (
              <>
                <MailIcon className="w-4 h-4 mr-2" />
                Send Invitation
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Role mapping function to convert frontend roles to backend roles
const mapFrontendRoleToBackend = (frontendRole: keyof typeof ROLE_DEFINITIONS): 'admin' | 'editor' | 'viewer' => {
  switch (frontendRole) {
    case 'admin':
      return 'admin';
    case 'developer':
    case 'tester':
    case 'analyst':
      return 'editor';
    case 'viewer':
      return 'viewer';
    default:
      return 'viewer';
  }
};

export default function TeamManagement() {
  const {} = useAuth();
  const { currentOrganization, userRole, loading: orgLoading, error: orgError } = useOrganization();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");


  // Data state
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Activity data for charts
  const [activityData] = useState({
    testsCreatedTrend: [
      { month: 'Jan', tests: 45 },
      { month: 'Feb', tests: 52 },
      { month: 'Mar', tests: 38 },
      { month: 'Apr', tests: 67 },
      { month: 'May', tests: 73 },
      { month: 'Jun', tests: 89 }
    ],
    testsExecutedTrend: [
      { month: 'Jan', tests: 234 },
      { month: 'Feb', tests: 289 },
      { month: 'Mar', tests: 312 },
      { month: 'Apr', tests: 345 },
      { month: 'May', tests: 398 },
      { month: 'Jun', tests: 456 }
    ],
    collaborationStats: {
      totalReviews: 1247,
      avgResponseTime: '2.3h',
      topCollaborators: [
        { name: 'Sarah Johnson', reviews: 45, avgTime: '1.8h' },
        { name: 'Mike Chen', reviews: 38, avgTime: '2.1h' },
        { name: 'Emma Davis', reviews: 32, avgTime: '2.5h' }
      ]
    }
  });

  // Load members when organization changes
  useEffect(() => {
    if (currentOrganization) {
      loadMembers();
    } else {
      setMembers([]);
    }
  }, [currentOrganization]);

  const loadMembers = async () => {
    if (!currentOrganization?.id) return;
    
    try {
      setLoading(true);
      setError(null);
      const { data, error: membersError } = await OrganizationService.getOrganizationMembers(currentOrganization.id);
      
      if (membersError) {
        setError(`Failed to load members: ${membersError}`);
      } else {
        // Transform backend data to frontend format
        const transformedMembers = (data || []).map(OrganizationService.transformMemberData);
        setMembers(transformedMembers);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    if (!currentOrganization?.id) return;
    
    try {
      const { error: updateError } = await OrganizationService.updateMemberRole(
        currentOrganization.id, 
        memberId, 
        { role: newRole as 'admin' | 'editor' | 'viewer' }
      );
      
      if (updateError) {
        setError(`Failed to update role: ${updateError}`);
      } else {
        // Refresh members list
        loadMembers();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!currentOrganization?.id) return;
    
    if (!confirm('Are you sure you want to remove this member?')) {
      return;
    }
    
    try {
      const { error: removeError } = await OrganizationService.removeMember(
        currentOrganization.id, 
        memberId
      );
      
      if (removeError) {
        setError(`Failed to remove member: ${removeError}`);
      } else {
        // Refresh members list
        loadMembers();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    }
  };

  const handleInviteSent = () => {
    // Refresh members list after invitation
    loadMembers();
  };

  const filteredMembers = members.filter((member) => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || member.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const roleStats = members.reduce((acc, member) => {
    const role = member.role as keyof typeof ROLE_DEFINITIONS;
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const canManage = userRole === 'admin';
  const isLoading = orgLoading || loading;
  const displayError = orgError || error;

  // Export functionality
  const handleExport = async (format: string) => {
    try {
      const exportData = {
        organization: currentOrganization?.name,
        exportedAt: new Date().toISOString(),
        totalMembers: members.length,
        members: filteredMembers.map(member => ({
          name: member.name,
          email: member.email,
          role: ROLE_DEFINITIONS[member.role as keyof typeof ROLE_DEFINITIONS]?.name || member.role,
          status: member.status,
          testsCreated: member.testsCreated || 0,
          testsExecuted: member.testsExecuted || 0,
          joinedAt: member.joined_at || member.lastActive,
          lastActive: member.lastActive,
          permissions: getRolePermissions(member.role)
        })),
        roleStats,
        activitySummary: {
          totalTestsCreated: members.reduce((sum, m) => sum + (m.testsCreated || 0), 0),
          totalTestsExecuted: members.reduce((sum, m) => sum + (m.testsExecuted || 0), 0),
          collaborationScore: activityData.collaborationStats.totalReviews,
          avgResponseTime: activityData.collaborationStats.avgResponseTime
        }
      };

      if (format === 'csv') {
        const csvContent = [
          ['Name', 'Email', 'Role', 'Status', 'Tests Created', 'Tests Executed', 'Joined Date', 'Last Active'],
          ...exportData.members.map(member => [
            member.name,
            member.email,
            member.role,
            member.status,
            member.testsCreated,
            member.testsExecuted,
            new Date(member.joinedAt).toLocaleDateString(),
            member.lastActive ? new Date(member.lastActive).toLocaleDateString() : 'Never'
          ])
        ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `team-members-${currentOrganization?.name || 'organization'}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (format === 'pdf') {
        // PDF export would require a PDF generation library
        console.log('PDF export would be implemented with a library like jsPDF');
      } else if (format === 'json') {
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `team-data-${currentOrganization?.name || 'organization'}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export failed:', error);
      setError('Failed to export team data');
    }
  };

  if (isLoading && !currentOrganization) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-gray-400 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Loading organization data...</p>
        </div>
      </div>
    );
  }

  if (!currentOrganization) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Organization Found</h3>
          <p className="text-gray-600 mb-4">You need to be part of an organization to manage team members.</p>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Create Organization
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {displayError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{displayError}</AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Team Management</h1>
          <p className="text-gray-600 mt-1">
            Collaborate and manage your testing team for {currentOrganization.name}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export Team Data
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Choose Format</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                <FileText className="w-4 h-4 mr-2" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('json')}>
                <FileText className="w-4 h-4 mr-2" />
                Export as JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('pdf')} disabled>
                <FileText className="w-4 h-4 mr-2" />
                Export as PDF (Coming Soon)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {canManage && (
            <Button size="sm" onClick={() => setShowInviteDialog(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Invite Member
            </Button>
          )}
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <Users className="w-4 h-4" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="members" className="flex items-center space-x-2">
            <UserCogIcon className="w-4 h-4" />
            <span>Members</span>
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center space-x-2">
            <Activity className="w-4 h-4" />
            <span>Activity</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab Content */}
        <TabsContent value="overview" className="space-y-6">
          {/* Enhanced Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Members</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {members.length}
                    </p>
                  </div>
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="w-4 h-4 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {Object.entries(ROLE_DEFINITIONS).map(([key, definition]) => {
              const IconComponent = definition.icon;
              return (
                <Card key={key}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">{definition.name}</p>
                        <p className={`text-2xl font-bold text-${definition.color}-600`}>
                          {roleStats[key] || 0}
                        </p>
                      </div>
                      <div className={`w-8 h-8 bg-${definition.color}-100 rounded-lg flex items-center justify-center`}>
                        <IconComponent className={`w-4 h-4 text-${definition.color}-600`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab("members")}>
              <CardContent className="p-6 text-center">
                <UserCogIcon className="w-12 h-12 text-blue-600 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">Manage Members</h3>
                <p className="text-sm text-gray-600">View and manage team members</p>
                <ArrowRight className="w-5 h-5 text-blue-600 mx-auto mt-3" />
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setShowInviteDialog(true)}>
              <CardContent className="p-6 text-center">
                <MailIcon className="w-12 h-12 text-green-600 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">Invite Members</h3>
                <p className="text-sm text-gray-600">Send invitations to join your team</p>
                <ArrowRight className="w-5 h-5 text-green-600 mx-auto mt-3" />
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab("activity")}>
              <CardContent className="p-6 text-center">
                <BarChart3 className="w-12 h-12 text-purple-600 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">View Activity</h3>
                <p className="text-sm text-gray-600">Track team performance and collaboration</p>
                <ArrowRight className="w-5 h-5 text-purple-600 mx-auto mt-3" />
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="w-5 h-5" />
                <span>Recent Team Activity</span>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab("activity")}>
                  View All
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activityData.collaborationStats.topCollaborators.slice(0, 3).map((collaborator, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="text-xs">
                          {collaborator.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{collaborator.name}</p>
                        <p className="text-xs text-gray-500">Completed {collaborator.reviews} reviews</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {collaborator.avgTime} avg response
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Members Tab Content */}
        <TabsContent value="members" className="space-y-6">
          {/* Filters and Search */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />

                <Input
                  type="search"
                  placeholder="Search team members..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {Object.entries(ROLE_DEFINITIONS).map(([key, definition]) => {
                    const IconComponent = definition.icon;
                    return (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center space-x-2">
                          <IconComponent className={`w-4 h-4 text-${definition.color}-600`} />
                          <span>{definition.name}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant={viewMode === "cards" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("cards")}
              >
                <Users className="w-4 h-4 mr-1" />
                Cards
              </Button>
              <Button
                variant={viewMode === "table" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("table")}
              >
                <Table className="w-4 h-4 mr-1" />
                Table
              </Button>
            </div>
          </div>

          {/* Team Members Display */}
          {viewMode === "cards" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMembers.map((member) => (
                <TeamMemberCard
                  key={member.id}
                  member={member}
                  onUpdateRole={handleUpdateRole}
                  onRemoveMember={handleRemoveMember}
                  canManage={canManage}
                />
              ))}
            </div>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tests Created</TableHead>
                    <TableHead>Tests Executed</TableHead>
                    <TableHead>Joined</TableHead>
                    {canManage && <TableHead className="w-12"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={member.avatar} alt={member.name} />
                            <AvatarFallback className="text-sm">
                              {member.name
                                .split(" ")
                                .map((n: string) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{member.name}</div>
                            <div className="text-sm text-gray-500">
                              {member.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={getRoleBadgeColor(member.role)}
                        >
                          <RoleIcon role={member.role} />
                          <span className="ml-1 capitalize">{ROLE_DEFINITIONS[member.role as keyof typeof ROLE_DEFINITIONS]?.name || member.role}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={member.status === 'active' ? 'default' : 'secondary'}
                          className={member.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                        >
                          {member.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{member.testsCreated || 0}</TableCell>
                      <TableCell>{member.testsExecuted || 0}</TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {new Date(member.joined_at || member.lastActive).toLocaleDateString()}
                      </TableCell>
                      {canManage && (
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {Object.entries(ROLE_DEFINITIONS).map(([key, definition]) => {
                                const IconComponent = definition.icon;
                                return (
                                  <DropdownMenuItem
                                    key={key}
                                    onClick={() => handleUpdateRole(member.id, key)}
                                    disabled={member.role === key}
                                  >
                                    <IconComponent className={`w-4 h-4 mr-2 text-${definition.color}-600`} />
                                    Make {definition.name}
                                    {member.role === key && <CheckCircle className="w-4 h-4 ml-auto text-green-500" />}
                                  </DropdownMenuItem>
                                );
                              })}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600" onClick={() => handleRemoveMember(member.id)}>
                                <Trash2 className="w-4 h-4 mr-2" />
                                Remove User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}

          {filteredMembers.length === 0 && (
            <div className="text-center py-12">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No team members found
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || roleFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "Get started by inviting your first team member"}
              </p>
              {canManage && (
                <Button onClick={() => setShowInviteDialog(true)}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite Team Member
                </Button>
              )}
            </div>
          )}
        </TabsContent>

        {/* Activity Tab Content */}
        <TabsContent value="activity" className="space-y-6">
          {/* Activity Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  <span>Tests Created Trend</span>
                </CardTitle>
                <CardDescription>Monthly test creation activity</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={activityData.testsCreatedTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="tests" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5 text-green-600" />
                  <span>Tests Executed Trend</span>
                </CardTitle>
                <CardDescription>Monthly test execution activity</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={activityData.testsExecutedTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="tests" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Collaboration Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="w-5 h-5 text-purple-600" />
                <span>Collaboration Insights</span>
              </CardTitle>
              <CardDescription>Team collaboration and review activity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <MessageSquare className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-purple-700">{activityData.collaborationStats.totalReviews}</div>
                  <div className="text-sm text-purple-600">Total Reviews</div>
                </div>

                <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <Clock className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-blue-700">{activityData.collaborationStats.avgResponseTime}</div>
                  <div className="text-sm text-blue-600">Avg Response Time</div>
                </div>

                <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                  <Users className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-green-700">89%</div>
                  <div className="text-sm text-green-600">Collaboration Score</div>
                </div>
              </div>

              {/* Top Collaborators */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-4">Top Collaborators</h4>
                <div className="space-y-3">
                  {activityData.collaborationStats.topCollaborators.map((collaborator, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {collaborator.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <h5 className="font-medium text-gray-900">{collaborator.name}</h5>
                          <p className="text-sm text-gray-600">{collaborator.reviews} reviews completed</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="mb-1">
                          {collaborator.avgTime} avg response
                        </Badge>
                        <div className="text-xs text-gray-500">
                          #{index + 1} in team
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Role Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <PieChart className="w-5 h-5 text-indigo-600" />
                <span>Team Role Distribution</span>
              </CardTitle>
              <CardDescription>Breakdown of team members by role</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={Object.entries(roleStats).map(([role, count]) => ({
                        name: ROLE_DEFINITIONS[role as keyof typeof ROLE_DEFINITIONS]?.name || role,
                        value: count,
                        color: ROLE_DEFINITIONS[role as keyof typeof ROLE_DEFINITIONS]?.color || 'gray'
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {Object.entries(roleStats).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={`hsl(${index * 60}, 70%, 50%)`} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>

                <div className="space-y-3">
                  {Object.entries(roleStats).map(([role, count]) => {
                    const definition = ROLE_DEFINITIONS[role as keyof typeof ROLE_DEFINITIONS];
                    const countValue = count as number;
                    if (!definition) return null;

                    const IconComponent = definition.icon;
                    const percentage = ((countValue / members.length) * 100).toFixed(1);

                    return (
                      <div key={role} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <IconComponent className={`w-5 h-5 text-${definition.color}-600`} />
                          <div>
                            <p className="font-medium text-sm">{definition.name}</p>
                            <p className="text-xs text-gray-500">{countValue} members</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {percentage}%
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Close Main Tabs */}
      </Tabs>

      {/* Invite Member Dialog */}
      <InviteMemberDialog
        organizationId={currentOrganization.id}
        onInviteSent={handleInviteSent}
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
      />
    </div>
  );
}
