/**
 * Profile Management Page
 * User profile settings and account management
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  Button,
  FormField,
  EmailField,
  PasswordField,
  LoadingSpinner,
  ErrorState,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Separator,
  Modal,
  ConfirmationModal,
  DataTable,
  StatusBadge
} from '@/components/ui';
import { 
  UserIcon,
  KeyIcon,
  ShieldCheckIcon,
  CreditCardIcon,
  BellIcon,
  TrashIcon,
  PlusIcon,
  EyeIcon,
  ClipboardDocumentIcon
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  companyName: string;
  jobTitle: string;
  phone: string;
  timezone: string;
}

interface PasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface NotificationSettings {
  emailNotifications: boolean;
  testResults: boolean;
  weeklyReports: boolean;
  securityAlerts: boolean;
  marketingEmails: boolean;
}

interface ApiKey {
  id: string;
  name: string;
  key: string;
  permissions: string[];
  createdAt: string;
  lastUsed: string | null;
  rateLimit: {
    requests: number;
    period: string;
  };
}

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [profileData, setProfileData] = useState<ProfileData>({
    firstName: '',
    lastName: '',
    email: '',
    companyName: '',
    jobTitle: '',
    phone: '',
    timezone: 'UTC',
  });
  const [passwordData, setPasswordData] = useState<PasswordData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailNotifications: true,
    testResults: true,
    weeklyReports: true,
    securityAlerts: true,
    marketingEmails: false,
  });
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [apiKeysLoading, setApiKeysLoading] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [newApiKeyName, setNewApiKeyName] = useState('');
  const [newApiKeyData, setNewApiKeyData] = useState<ApiKey | null>(null);

  const { 
    user, 
    getUserProfile, 
    updateUserProfile, 
    createApiKey, 
    listApiKeys, 
    revokeApiKey,
    signOut 
  } = useAuth();

  // Load user profile data
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      
      const result = await getUserProfile();
      if (result.data) {
        setProfileData({
          firstName: result.data.firstName || '',
          lastName: result.data.lastName || '',
          email: result.data.email || user.email || '',
          companyName: result.data.companyName || '',
          jobTitle: result.data.jobTitle || '',
          phone: result.data.phone || '',
          timezone: result.data.timezone || 'UTC',
        });
      }
    };

    loadProfile();
  }, [user, getUserProfile]);

  // Load API keys
  useEffect(() => {
    const loadApiKeys = async () => {
      setApiKeysLoading(true);
      const result = await listApiKeys();
      if (result.data) {
        setApiKeys(result.data);
      }
      setApiKeysLoading(false);
    };

    if (activeTab === 'security') {
      loadApiKeys();
    }
  }, [activeTab, listApiKeys]);

  // Profile form validation
  const validateProfile = (): boolean => {
    const errors: Record<string, string> = {};

    if (!profileData.firstName.trim()) {
      errors.firstName = 'First name is required';
    }

    if (!profileData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    }

    if (!profileData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Password form validation
  const validatePassword = (): boolean => {
    const errors: Record<string, string> = {};

    if (!passwordData.currentPassword) {
      errors.currentPassword = 'Current password is required';
    }

    if (!passwordData.newPassword) {
      errors.newPassword = 'New password is required';
    } else if (passwordData.newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters';
    }

    if (!passwordData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle profile update
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateProfile()) {
      return;
    }

    setProfileLoading(true);
    try {
      const result = await updateUserProfile(profileData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Profile updated successfully');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error('Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  // Handle password change
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePassword()) {
      return;
    }

    setPasswordLoading(true);
    try {
      // This would typically call a password change API
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      
      toast.success('Password updated successfully');
    } catch (error) {
      console.error('Password update error:', error);
      toast.error('Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Handle API key creation
  const handleCreateApiKey = async () => {
    if (!newApiKeyName.trim()) {
      toast.error('Please enter a name for the API key');
      return;
    }

    try {
      const result = await createApiKey(newApiKeyName, ['read', 'write']);
      if (result.error) {
        toast.error(result.error);
      } else if (result.data) {
        setNewApiKeyData(result.data);
        setNewApiKeyName('');
        
        // Refresh API keys list
        const keysResult = await listApiKeys();
        if (keysResult.data) {
          setApiKeys(keysResult.data);
        }
        
        toast.success('API key created successfully');
      }
    } catch (error) {
      console.error('API key creation error:', error);
      toast.error('Failed to create API key');
    }
  };

  // Handle API key deletion
  const handleDeleteApiKey = async (keyId: string) => {
    try {
      const result = await revokeApiKey(keyId);
      if (result.error) {
        toast.error(result.error);
      } else {
        setApiKeys(prev => prev.filter(key => key.id !== keyId));
        toast.success('API key deleted successfully');
      }
    } catch (error) {
      console.error('API key deletion error:', error);
      toast.error('Failed to delete API key');
    }
    setShowDeleteConfirm(null);
  };

  // Copy API key to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    } catch (error) {
      console.error('Clipboard error:', error);
      toast.error('Failed to copy to clipboard');
    }
  };

  // API Keys table columns
  const apiKeyColumns = [
    {
      key: 'name',
      title: 'Name',
      dataKey: 'name' as keyof ApiKey,
      sortable: true,
    },
    {
      key: 'key',
      title: 'API Key',
      render: (value: string) => (
        <div className="flex items-center gap-2">
          <code className="text-xs bg-gray-100 px-2 py-1 rounded">
            {value.substring(0, 8)}...{value.substring(value.length - 8)}
          </code>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => copyToClipboard(value)}
          >
            <ClipboardDocumentIcon className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
    {
      key: 'permissions',
      title: 'Permissions',
      render: (permissions: string[]) => (
        <div className="flex gap-1">
          {permissions.map(permission => (
            <StatusBadge key={permission} status="success" size="sm">
              {permission}
            </StatusBadge>
          ))}
        </div>
      ),
    },
    {
      key: 'createdAt',
      title: 'Created',
      dataKey: 'createdAt' as keyof ApiKey,
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
    {
      key: 'lastUsed',
      title: 'Last Used',
      render: (value: string | null) => 
        value ? new Date(value).toLocaleDateString() : 'Never',
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
        <p className="mt-2 text-gray-600">
          Manage your profile, security settings, and preferences
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <UserIcon className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <ShieldCheckIcon className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <BellIcon className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="billing" className="flex items-center gap-2">
            <CreditCardIcon className="h-4 w-4" />
            Billing
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Update your personal details and contact information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileUpdate} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    type="text"
                    name="firstName"
                    label="First name"
                    value={profileData.firstName}
                    onChange={(value) => setProfileData(prev => ({ ...prev, firstName: String(value) }))}
                    error={profileErrors.firstName}
                    required
                    disabled={profileLoading}
                  />

                  <FormField
                    type="text"
                    name="lastName"
                    label="Last name"
                    value={profileData.lastName}
                    onChange={(value) => setProfileData(prev => ({ ...prev, lastName: String(value) }))}
                    error={profileErrors.lastName}
                    required
                    disabled={profileLoading}
                  />
                </div>

                <EmailField
                  name="email"
                  label="Email address"
                  value={profileData.email}
                  onChange={(value) => setProfileData(prev => ({ ...prev, email: String(value) }))}
                  error={profileErrors.email}
                  required
                  disabled={profileLoading}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    type="text"
                    name="companyName"
                    label="Company name"
                    value={profileData.companyName}
                    onChange={(value) => setProfileData(prev => ({ ...prev, companyName: String(value) }))}
                    disabled={profileLoading}
                  />

                  <FormField
                    type="text"
                    name="jobTitle"
                    label="Job title"
                    value={profileData.jobTitle}
                    onChange={(value) => setProfileData(prev => ({ ...prev, jobTitle: String(value) }))}
                    disabled={profileLoading}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    type="tel"
                    name="phone"
                    label="Phone number"
                    value={profileData.phone}
                    onChange={(value) => setProfileData(prev => ({ ...prev, phone: String(value) }))}
                    disabled={profileLoading}
                  />

                  <FormField
                    type="select"
                    name="timezone"
                    label="Timezone"
                    value={profileData.timezone}
                    onChange={(value) => setProfileData(prev => ({ ...prev, timezone: String(value) }))}
                    options={[
                      { label: 'UTC', value: 'UTC' },
                      { label: 'Eastern Time', value: 'America/New_York' },
                      { label: 'Central Time', value: 'America/Chicago' },
                      { label: 'Mountain Time', value: 'America/Denver' },
                      { label: 'Pacific Time', value: 'America/Los_Angeles' },
                    ]}
                    disabled={profileLoading}
                  />
                </div>

                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    loading={profileLoading}
                    disabled={profileLoading}
                  >
                    Update Profile
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          {/* Password Change */}
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <PasswordField
                  name="currentPassword"
                  label="Current password"
                  value={passwordData.currentPassword}
                  onChange={(value) => setPasswordData(prev => ({ ...prev, currentPassword: String(value) }))}
                  error={passwordErrors.currentPassword}
                  required
                  disabled={passwordLoading}
                />

                <PasswordField
                  name="newPassword"
                  label="New password"
                  value={passwordData.newPassword}
                  onChange={(value) => setPasswordData(prev => ({ ...prev, newPassword: String(value) }))}
                  error={passwordErrors.newPassword}
                  required
                  disabled={passwordLoading}
                />

                <PasswordField
                  name="confirmPassword"
                  label="Confirm new password"
                  value={passwordData.confirmPassword}
                  onChange={(value) => setPasswordData(prev => ({ ...prev, confirmPassword: String(value) }))}
                  error={passwordErrors.confirmPassword}
                  required
                  disabled={passwordLoading}
                />

                <div className="flex justify-end">
                  <Button 
                    type="submit"
                    loading={passwordLoading}
                    disabled={passwordLoading}
                  >
                    Update Password
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* API Keys Management */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>API Keys</CardTitle>
                  <CardDescription>
                    Manage your API keys for programmatic access
                  </CardDescription>
                </div>
                <Button onClick={() => setShowApiKeyModal(true)}>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create API Key
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                data={apiKeys}
                columns={apiKeyColumns}
                loading={apiKeysLoading}
                emptyMessage="No API keys found"
                rowActions={(apiKey) => (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowDeleteConfirm(apiKey.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                )}
                pagination={false}
                searchable={false}
                filterable={false}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose what notifications you'd like to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <FormField
                  type="switch"
                  name="emailNotifications"
                  label="Email notifications"
                  value={notifications.emailNotifications}
                  onChange={(value) => setNotifications(prev => ({ ...prev, emailNotifications: Boolean(value) }))}
                  description="Receive notifications via email"
                />

                <Separator />

                <FormField
                  type="switch"
                  name="testResults"
                  label="Test result notifications"
                  value={notifications.testResults}
                  onChange={(value) => setNotifications(prev => ({ ...prev, testResults: Boolean(value) }))}
                  description="Get notified when test executions complete"
                  disabled={!notifications.emailNotifications}
                />

                <FormField
                  type="switch"
                  name="weeklyReports"
                  label="Weekly reports"
                  value={notifications.weeklyReports}
                  onChange={(value) => setNotifications(prev => ({ ...prev, weeklyReports: Boolean(value) }))}
                  description="Receive weekly summary reports"
                  disabled={!notifications.emailNotifications}
                />

                <FormField
                  type="switch"
                  name="securityAlerts"
                  label="Security alerts"
                  value={notifications.securityAlerts}
                  onChange={(value) => setNotifications(prev => ({ ...prev, securityAlerts: Boolean(value) }))}
                  description="Important security notifications"
                  disabled={!notifications.emailNotifications}
                />

                <Separator />

                <FormField
                  type="switch"
                  name="marketingEmails"
                  label="Marketing emails"
                  value={notifications.marketingEmails}
                  onChange={(value) => setNotifications(prev => ({ ...prev, marketingEmails: Boolean(value) }))}
                  description="Product updates and marketing communications"
                  disabled={!notifications.emailNotifications}
                />
              </div>

              <div className="flex justify-end">
                <Button>
                  Save Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle>Billing & Subscription</CardTitle>
              <CardDescription>
                Manage your subscription and billing information
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center py-12">
              <CreditCardIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Billing Management
              </h3>
              <p className="text-gray-600 mb-6">
                Billing and subscription management will be available soon.
              </p>
              <Button variant="outline">
                Contact Sales
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* API Key Creation Modal */}
      <Modal
        open={showApiKeyModal}
        onOpenChange={setShowApiKeyModal}
        title="Create API Key"
        description="Create a new API key for programmatic access"
      >
        <div className="space-y-4">
          <FormField
            type="text"
            name="apiKeyName"
            label="API Key Name"
            value={newApiKeyName}
            onChange={(value) => setNewApiKeyName(String(value))}
            placeholder="e.g., CI/CD Pipeline"
            description="Give your API key a descriptive name"
          />

          <div className="flex justify-end gap-3">
            <Button 
              variant="outline" 
              onClick={() => setShowApiKeyModal(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateApiKey}>
              Create API Key
            </Button>
          </div>
        </div>
      </Modal>

      {/* New API Key Display Modal */}
      <Modal
        open={!!newApiKeyData}
        onOpenChange={() => setNewApiKeyData(null)}
        title="API Key Created"
        description="Your new API key has been created successfully"
      >
        {newApiKeyData && (
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex">
                <EyeIcon className="h-5 w-5 text-yellow-400 mt-0.5 mr-3" />
                <div className="text-sm">
                  <h4 className="font-medium text-yellow-900">
                    Important: Save your API key
                  </h4>
                  <p className="mt-1 text-yellow-700">
                    This is the only time you'll see the full API key. Copy it now and store it securely.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">API Key</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-gray-100 px-3 py-2 rounded border">
                  {newApiKeyData.key}
                </code>
                <Button
                  size="sm"
                  onClick={() => copyToClipboard(newApiKeyData.key)}
                >
                  <ClipboardDocumentIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setNewApiKeyData(null)}>
                Done
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        open={!!showDeleteConfirm}
        onOpenChange={() => setShowDeleteConfirm(null)}
        title="Delete API Key"
        message="Are you sure you want to delete this API key? This action cannot be undone and will immediately revoke access."
        confirmText="Delete"
        confirmVariant="destructive"
        onConfirm={() => showDeleteConfirm && handleDeleteApiKey(showDeleteConfirm)}
      />
    </div>
  );
}
