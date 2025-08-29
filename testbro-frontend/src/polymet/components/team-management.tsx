import React, { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  Crown,
  Shield,
  User,
  Mail,
  Calendar,
  Activity,
  MoreHorizontal,
  Edit,
  Trash2,
  Settings,
  Search,
  Filter,
  Download,
  Loader2,
  AlertTriangle,
  Plus,
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
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  OrganizationService, 
  OrganizationMember, 
  InviteMemberRequest, 
  UpdateMemberRoleRequest 
} from "@/lib/services/organizationService";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";

const RoleIcon = ({ role }: { role: string }) => {
  switch (role) {
    case "admin":
      return <Crown className="w-4 h-4 text-yellow-600" />;
    case "editor":
      return <Edit className="w-4 h-4 text-blue-600" />;
    case "viewer":
      return <User className="w-4 h-4 text-green-600" />;
    default:
      return <User className="w-4 h-4 text-gray-600" />;
  }
};

const getRoleBadgeColor = (role: string) => {
  switch (role) {
    case "admin":
      return "bg-yellow-100 text-yellow-800";
    case "editor":
      return "bg-blue-100 text-blue-800";
    case "viewer":
      return "bg-green-100 text-green-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
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
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Avatar className="w-12 h-12">
              <AvatarImage src={member.avatar} alt={member.name} />
              <AvatarFallback>
                {member.name
                  .split(" ")
                  .map((n: string) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-gray-900">{member.name}</h3>
              <p className="text-sm text-gray-500">{member.email}</p>
            </div>
          </div>
          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onUpdateRole(member.id, 'admin')}>
                  <Crown className="w-4 h-4 mr-2" />
                  Make Admin
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onUpdateRole(member.id, 'editor')}>
                  <Edit className="w-4 h-4 mr-2" />
                  Make Editor
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onUpdateRole(member.id, 'viewer')}>
                  <User className="w-4 h-4 mr-2" />
                  Make Viewer
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600" onClick={() => onRemoveMember(member.id)}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remove User
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Role</span>
            <Badge
              variant="secondary"
              className={getRoleBadgeColor(member.role)}
            >
              <RoleIcon role={member.role} />
              <span className="ml-1 capitalize">{member.role}</span>
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Status</span>
            <Badge 
              variant={member.status === 'active' ? 'default' : 'secondary'}
              className={member.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
            >
              {member.status}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Tests Created</span>
            <span className="font-medium">{member.testsCreated}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Tests Executed</span>
            <span className="font-medium">{member.testsExecuted}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Joined</span>
            <span className="text-sm text-gray-500">
              {new Date(member.joined_at || member.lastActive).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center space-x-2">
            <Activity className={`w-4 h-4 ${member.status === 'active' ? 'text-green-500' : 'text-gray-400'}`} />
            <span className={`text-sm ${member.status === 'active' ? 'text-green-600' : 'text-gray-500'}`}>
              {member.status === 'active' ? 'Active' : 'Inactive'}
            </span>
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
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'editor' | 'viewer'>('viewer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInvite = async () => {
    if (!email) {
      setError('Email is required');
      return;
    }

    setLoading(true);
    setError(null);

    const { error: inviteError } = await OrganizationService.inviteMember(organizationId, {
      email,
      role,
    });

    if (inviteError) {
      setError(inviteError);
    } else {
      setEmail('');
      setRole('viewer');
      onOpenChange(false);
      onInviteSent();
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            Send an invitation to join your organization
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={(value: any) => setRole(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">Viewer - Read-only access</SelectItem>
                <SelectItem value="editor">Editor - Can create and edit tests</SelectItem>
                <SelectItem value="admin">Admin - Full management access</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleInvite} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              'Send Invitation'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default function TeamManagement() {
  const { user } = useAuth();
  const { currentOrganization, userRole, loading: orgLoading, error: orgError } = useOrganization();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  
  // Data state
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const roleStats = OrganizationService.calculateRoleStats(members);
  const canManage = userRole === 'admin';
  const isLoading = orgLoading || loading;
  const displayError = orgError || error;

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
          <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
          <p className="text-gray-600">
            Manage team members for {currentOrganization.name}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          {canManage && (
            <Button size="sm" onClick={() => setShowInviteDialog(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Invite Member
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Members</p>
                <p className="text-2xl font-bold text-gray-900">
                  {roleStats.total}
                </p>
              </div>
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Administrators</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {roleStats.admin}
                </p>
              </div>
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Crown className="w-4 h-4 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Editors</p>
                <p className="text-2xl font-bold text-blue-600">
                  {roleStats.editor}
                </p>
              </div>
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Edit className="w-4 h-4 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Viewers</p>
                <p className="text-2xl font-bold text-green-600">
                  {roleStats.viewer}
                </p>
              </div>
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <User className="w-4 h-4 text-green-600" />
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
              placeholder="Search team members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="editor">Editor</SelectItem>
              <SelectItem value="viewer">Viewer</SelectItem>
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
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={member.avatar} alt={member.name} />

                        <AvatarFallback>
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
                      <span className="ml-1 capitalize">{member.role}</span>
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
                  <TableCell>{member.testsCreated}</TableCell>
                  <TableCell>{member.testsExecuted}</TableCell>
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
                          <DropdownMenuItem onClick={() => handleUpdateRole(member.id, 'admin')}>
                            <Crown className="w-4 h-4 mr-2" />
                            Make Admin
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdateRole(member.id, 'editor')}>
                            <Edit className="w-4 h-4 mr-2" />
                            Make Editor
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdateRole(member.id, 'viewer')}>
                            <User className="w-4 h-4 mr-2" />
                            Make Viewer
                          </DropdownMenuItem>
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
          <Button>
            <UserPlus className="w-4 h-4 mr-2" />
            Invite Team Member
          </Button>
        </div>
      )}

      {/* Team Activity Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Team Activity Summary</CardTitle>
          <CardDescription>
            Recent team activity and collaboration metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 mb-1">156</div>
              <div className="text-sm text-gray-600">
                Tests Created This Month
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 mb-1">
                1,247
              </div>
              <div className="text-sm text-gray-600">
                Tests Executed This Month
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 mb-1">89%</div>
              <div className="text-sm text-gray-600">
                Team Collaboration Score
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
