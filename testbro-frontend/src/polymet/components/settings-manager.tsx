import React, { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import ApiKeyManager from "@/polymet/components/api-key-manager";
import {
  UserIcon,
  ShieldCheckIcon,
  BellIcon,
  LinkIcon,
  CogIcon,
  KeyIcon,
  CreditCardIcon,
  GlobeAltIcon,
  CircleStackIcon,
  CloudIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CameraIcon,
  ArrowUpTrayIcon,
  ScissorsIcon,
  MapPinIcon,
  CpuChipIcon,
  DeviceTabletIcon,
  ComputerDesktopIcon,
  ArrowPathIcon,
  QrCodeIcon,
  PhoneIcon,
  ClockIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

interface SettingsManagerProps {
  className?: string;
}

export default function SettingsManager({
  className = "",
}: SettingsManagerProps) {
  const [activeTab, setActiveTab] = useState("account");
  const [showApiKey, setShowApiKey] = useState(false);

  // Avatar upload state
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [showAvatarCropDialog, setShowAvatarCropDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Billing state
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("professional");

  // Security state
  const [showMFADialog, setShowMFADialog] = useState(false);
  const [mfaMethod, setMfaMethod] = useState<"authenticator" | "sms">("authenticator");
  const [mfaCode, setMfaCode] = useState("");
  const [activeSessions, setActiveSessions] = useState([
    { id: "1", device: "Chrome on macOS", location: "San Francisco, CA", lastActive: "2 minutes ago", current: true },
    { id: "2", device: "Safari on iPhone", location: "San Francisco, CA", lastActive: "1 hour ago", current: false },
    { id: "3", device: "Chrome on Windows", location: "New York, NY", lastActive: "2 days ago", current: false },
  ]);
  const [settings, setSettings] = useState({
    // Account Settings
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@company.com",
    company: "Acme Corp",
    role: "QA Engineer",
    timezone: "America/New_York",
    language: "en",
    avatar: "https://github.com/johndoe.png",

    // Security Settings
    twoFactorEnabled: true,
    sessionTimeout: "24",
    passwordLastChanged: "2024-01-15",
    apiKey: "tb_sk_1234567890abcdef",

    // Notification Settings
    emailNotifications: {
      testResults: true,
      executionFailures: true,
      weeklyReports: true,
      teamUpdates: false,
      systemMaintenance: true,
    },
    pushNotifications: {
      testResults: true,
      executionFailures: true,
      mentions: true,
      comments: false,
    },
    slackNotifications: {
      enabled: true,
      webhook: "https://hooks.slack.com/services/...",
      channel: "#qa-alerts",
    },

    // Integration Settings
    integrations: {
      jira: { enabled: true, url: "https://company.atlassian.net" },
      github: { enabled: true, org: "company-org" },
      slack: { enabled: true, workspace: "company-workspace" },
      teams: { enabled: false, tenant: "" },
      jenkins: { enabled: true, url: "https://jenkins.company.com" },
    },

    // Application Settings
    defaultProject: "web-app-testing",
    autoSaveInterval: "30",
    maxConcurrentTests: "5",
    testTimeout: "300",
    screenshotQuality: "high",
    videoRecording: true,
    aiInsights: true,
    dataRetention: "90",
    theme: "system",
    compactMode: false,
  });

  const handleSettingChange = (category: string, key: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [key]: value,
      },
    }));
  };

  const handleDirectChange = (key: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const generateNewApiKey = () => {
    const newKey = `tb_sk_${Math.random().toString(36).substring(2, 18)}`;
    handleDirectChange("apiKey", newKey);
  };

  const testIntegration = (integration: string) => {
    // Simulate integration test
    console.log(`Testing ${integration} integration...`);
  };

  // Avatar upload handlers
  const handleAvatarFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.size <= 2 * 1024 * 1024) { // 2MB limit
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
        setShowAvatarCropDialog(true);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleAvatarDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.size <= 2 * 1024 * 1024) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
        setShowAvatarCropDialog(true);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleAvatarDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
  }, []);

  const saveAvatar = async () => {
    if (!avatarPreview) return;

    setIsAvatarUploading(true);
    // Simulate upload
    await new Promise(resolve => setTimeout(resolve, 2000));

    handleDirectChange("avatar", avatarPreview);
    setIsAvatarUploading(false);
    setShowAvatarCropDialog(false);
    setAvatarPreview(null);
    setAvatarFile(null);
  };

  // Timezone auto-detection
  const detectTimezone = () => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    handleDirectChange("timezone", timezone);
  };

  // Billing plan data
  const plans = {
    starter: {
      name: "Starter",
      price: 19,
      features: ["5 Projects", "100 Tests/month", "Basic Support"],
      limits: { projects: 5, tests: 100 },
      current: false
    },
    professional: {
      name: "Professional",
      price: 49,
      features: ["Unlimited Projects", "1000 Tests/month", "Priority Support", "Advanced Analytics"],
      limits: { projects: -1, tests: 1000 },
      current: true
    },
    enterprise: {
      name: "Enterprise",
      price: 99,
      features: ["Everything", "Unlimited Tests", "24/7 Support", "Custom Integrations", "Dedicated Account Manager"],
      limits: { projects: -1, tests: -1 },
      current: false
    }
  };

  // Current usage (mock data)
  const currentUsage = {
    testsThisMonth: 347,
    projectsUsed: 3,
    storageUsed: 2.1, // GB
    apiCalls: 1247
  };

  // MFA setup functions
  const setupMFA = async () => {
    // Simulate MFA setup
    await new Promise(resolve => setTimeout(resolve, 1000));
    setShowMFADialog(false);
    handleDirectChange("twoFactorEnabled", true);
  };

  const revokeSession = (sessionId: string) => {
    setActiveSessions(prev => prev.filter(session => session.id !== sessionId));
  };

  const revokeAllSessions = () => {
    setActiveSessions(prev => prev.filter(session => session.current));
  };

  return (
    <div className={`max-w-6xl mx-auto space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">
            Manage your account, security, and application preferences
          </p>
        </div>
        <Button>
          <CheckIcon className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="account" className="flex items-center space-x-2">
            <UserIcon className="w-4 h-4" />

            <span>Account</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center space-x-2">
            <ShieldCheckIcon className="w-4 h-4" />

            <span>Security</span>
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="flex items-center space-x-2"
          >
            <BellIcon className="w-4 h-4" />

            <span>Notifications</span>
          </TabsTrigger>
          <TabsTrigger
            value="integrations"
            className="flex items-center space-x-2"
          >
            <LinkIcon className="w-4 h-4" />

            <span>Integrations</span>
          </TabsTrigger>
          <TabsTrigger
            value="application"
            className="flex items-center space-x-2"
          >
            <CogIcon className="w-4 h-4" />

            <span>Application</span>
          </TabsTrigger>
        </TabsList>

        {/* Account Settings */}
        <TabsContent value="account" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <UserIcon className="w-5 h-5" />

                <span>Profile Information</span>
              </CardTitle>
              <CardDescription>
                Update your personal information and profile settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enhanced Avatar Upload */}
              <div className="space-y-4">
                <div className="flex items-center space-x-6">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={settings.avatar} />
                    <AvatarFallback className="text-lg">
                      {settings.firstName[0]}
                      {settings.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <CameraIcon className="w-4 h-4 mr-2" />
                        Change Avatar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDirectChange("avatar", "")}
                        disabled={!settings.avatar}
                      >
                        <XMarkIcon className="w-4 h-4 mr-2" />
                        Remove
                      </Button>
                    </div>
                    <p className="text-sm text-gray-500">
                      Drag and drop or click to upload. JPG, PNG or GIF. Max size 2MB.
                    </p>
                  </div>
                </div>

                {/* Drag & Drop Area */}
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer"
                  onDrop={handleAvatarDrop}
                  onDragOver={handleAvatarDragOver}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ArrowUpTrayIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-1">
                    <span className="text-blue-600 font-medium">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">
                    PNG, JPG, GIF up to 2MB
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFileSelect}
                    className="hidden"
                  />
                </div>

                {/* Avatar Preview Dialog */}
                <Dialog open={showAvatarCropDialog} onOpenChange={setShowAvatarCropDialog}>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center space-x-2">
                        <ScissorsIcon className="w-5 h-5" />
                        <span>Edit Avatar</span>
                      </DialogTitle>
                      <DialogDescription>
                        Preview and adjust your avatar before saving
                      </DialogDescription>
                    </DialogHeader>

                    {avatarPreview && (
                      <div className="space-y-4">
                        <div className="flex justify-center">
                          <img
                            src={avatarPreview}
                            alt="Avatar preview"
                            className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Preview</Label>
                          <div className="flex space-x-2">
                            <div className="text-center">
                              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-1">
                                <img
                                  src={avatarPreview}
                                  alt="Small preview"
                                  className="w-12 h-12 rounded-full object-cover"
                                />
                              </div>
                              <p className="text-xs text-gray-500">Small</p>
                            </div>
                            <div className="text-center">
                              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mb-1">
                                <img
                                  src={avatarPreview}
                                  alt="Tiny preview"
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              </div>
                              <p className="text-xs text-gray-500">Tiny</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowAvatarCropDialog(false);
                          setAvatarPreview(null);
                          setAvatarFile(null);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={saveAvatar}
                        disabled={isAvatarUploading}
                      >
                        {isAvatarUploading ? (
                          <>
                            <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <CheckIcon className="w-4 h-4 mr-2" />
                            Save Avatar
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={settings.firstName}
                    onChange={(e) =>
                      handleDirectChange("firstName", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={settings.lastName}
                    onChange={(e) =>
                      handleDirectChange("lastName", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={settings.email}
                    onChange={(e) =>
                      handleDirectChange("email", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={settings.company}
                    onChange={(e) =>
                      handleDirectChange("company", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Input
                    id="role"
                    value={settings.role}
                    onChange={(e) => handleDirectChange("role", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <div className="flex space-x-2">
                    <Select
                      value={settings.timezone}
                      onValueChange={(value) =>
                        handleDirectChange("timezone", value)
                      }
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="America/New_York">
                          Eastern Time (ET)
                        </SelectItem>
                        <SelectItem value="America/Chicago">
                          Central Time (CT)
                        </SelectItem>
                        <SelectItem value="America/Denver">
                          Mountain Time (MT)
                        </SelectItem>
                        <SelectItem value="America/Los_Angeles">
                          Pacific Time (PT)
                        </SelectItem>
                        <SelectItem value="Europe/London">
                          London (GMT)
                        </SelectItem>
                        <SelectItem value="Europe/Paris">Paris (CET)</SelectItem>
                        <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="Asia/Kolkata">India (IST)</SelectItem>
                        <SelectItem value="Australia/Sydney">Sydney (AEST)</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={detectTimezone}
                      className="px-3"
                    >
                      <MapPinIcon className="w-4 h-4 mr-1" />
                      Auto-detect
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Auto-detect uses your browser's timezone settings
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CreditCardIcon className="w-5 h-5" />
                <span>Billing & Subscription</span>
              </CardTitle>
              <CardDescription>
                Manage your subscription, view usage, and upgrade/downgrade plans
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Current Plan */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <div>
                  <h3 className="font-semibold text-blue-900">
                    {plans.professional.name} Plan
                  </h3>
                  <p className="text-blue-700">
                    ${plans.professional.price}/month • Renews on Feb 15, 2024
                  </p>
                </div>
                <Badge
                  variant="secondary"
                  className="bg-blue-100 text-blue-800"
                >
                  Current Plan
                </Badge>
              </div>

              {/* Usage Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                  <ChartBarIcon className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-green-700">{currentUsage.testsThisMonth}</div>
                  <div className="text-sm text-green-600">Tests This Month</div>
                  <div className="text-xs text-green-500 mt-1">
                    {plans.professional.limits.tests === -1 ? "Unlimited" : `${Math.round((currentUsage.testsThisMonth / plans.professional.limits.tests) * 100)}% used`}
                  </div>
                </div>

                <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <CpuChipIcon className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-blue-700">{currentUsage.apiCalls}</div>
                  <div className="text-sm text-blue-600">API Calls</div>
                  <div className="text-xs text-blue-500 mt-1">This month</div>
                </div>

                <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <DeviceTabletIcon className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-purple-700">{currentUsage.projectsUsed}</div>
                  <div className="text-sm text-purple-600">Projects</div>
                  <div className="text-xs text-purple-500 mt-1">
                    {plans.professional.limits.projects === -1 ? "Unlimited" : `of ${plans.professional.limits.projects}`}
                  </div>
                </div>

                <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <CloudIcon className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-orange-700">{currentUsage.storageUsed}GB</div>
                  <div className="text-sm text-orange-600">Storage Used</div>
                  <div className="text-xs text-orange-500 mt-1">of 10GB</div>
                </div>
              </div>

              {/* Plan Comparison & Actions */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Available Plans</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(plans).map(([key, plan]) => (
                    <div
                      key={key}
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${
                        plan.current
                          ? "border-blue-500 bg-blue-50 shadow-md"
                          : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                      }`}
                      onClick={() => {
                        if (!plan.current) {
                          setSelectedPlan(key);
                          setShowPlanDialog(true);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-semibold text-gray-900">{plan.name}</h5>
                        {plan.current && (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                            Current
                          </Badge>
                        )}
                      </div>
                      <div className="text-2xl font-bold text-gray-900 mb-2">
                        ${plan.price}<span className="text-sm font-normal text-gray-600">/month</span>
                      </div>
                      <ul className="space-y-1 text-sm text-gray-600">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="flex items-center">
                            <CheckIcon className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                      {!plan.current && (
                        <Button
                          className="w-full mt-4"
                          size="sm"
                          variant={key === 'enterprise' ? 'default' : 'outline'}
                        >
                          {key === 'starter' ? 'Downgrade' : 'Upgrade'}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Billing Actions */}
              <div className="flex flex-wrap gap-3">
                <Button variant="outline">
                  <CreditCardIcon className="w-4 h-4 mr-2" />
                  Update Payment Method
                </Button>
                <Button variant="outline">View Billing History</Button>
                <Button variant="outline">Download Invoices</Button>
                <Button variant="outline">Tax Information</Button>
              </div>

              {/* Plan Change Dialog */}
              <Dialog open={showPlanDialog} onOpenChange={setShowPlanDialog}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {selectedPlan === 'starter' ? 'Downgrade' : 'Upgrade'} Plan
                    </DialogTitle>
                    <DialogDescription>
                      {selectedPlan === 'starter'
                        ? 'Downgrade to Starter plan. You will lose access to advanced features.'
                        : `Upgrade to ${plans[selectedPlan as keyof typeof plans]?.name} plan for enhanced features.`
                      }
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium mb-2">Plan Details</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>New Plan:</span>
                          <span className="font-medium">{plans[selectedPlan as keyof typeof plans]?.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Price:</span>
                          <span className="font-medium">${plans[selectedPlan as keyof typeof plans]?.price}/month</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Next Billing:</span>
                          <span className="font-medium">Feb 15, 2024</span>
                        </div>
                      </div>
                    </div>

                    {selectedPlan !== 'starter' && (
                      <Alert>
                        <SparklesIcon className="h-4 w-4" />
                        <AlertDescription>
                          You'll get immediate access to all new features upon upgrade.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowPlanDialog(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={() => {
                        // Handle plan change
                        console.log(`Changing to ${selectedPlan} plan`);
                        setShowPlanDialog(false);
                      }}
                    >
                      {selectedPlan === 'starter' ? 'Downgrade Plan' : 'Upgrade Plan'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6">
          {/* MFA Setup */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ShieldCheckIcon className="w-5 h-5 text-green-600" />
                <span>Two-Factor Authentication</span>
                <Badge variant={settings.twoFactorEnabled ? "default" : "secondary"}>
                  {settings.twoFactorEnabled ? "Enabled" : "Disabled"}
                </Badge>
              </CardTitle>
              <CardDescription>
                Add an extra layer of security to your account with two-factor authentication
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!settings.twoFactorEnabled ? (
                <div className="space-y-4">
                  <Alert>
                    <InformationCircleIcon className="h-4 w-4" />
                    <AlertDescription>
                      Two-factor authentication adds an extra layer of security to your account by requiring a second form of verification.
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div
                      className="border rounded-lg p-4 cursor-pointer hover:border-blue-300 transition-colors"
                      onClick={() => {
                        setMfaMethod("authenticator");
                        setShowMFADialog(true);
                      }}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <QrCodeIcon className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-medium">Authenticator App</h4>
                          <p className="text-sm text-gray-500">Use Google Authenticator or similar</p>
                        </div>
                      </div>
                    </div>

                    <div
                      className="border rounded-lg p-4 cursor-pointer hover:border-blue-300 transition-colors"
                      onClick={() => {
                        setMfaMethod("sms");
                        setShowMFADialog(true);
                      }}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <PhoneIcon className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <h4 className="font-medium">SMS Authentication</h4>
                          <p className="text-sm text-gray-500">Receive codes via SMS</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <ShieldCheckIcon className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-green-900">2FA is Active</h4>
                        <p className="text-sm text-green-700">Your account is protected with two-factor authentication</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDirectChange("twoFactorEnabled", false)}
                    >
                      Disable 2FA
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* MFA Setup Dialog */}
          <Dialog open={showMFADialog} onOpenChange={setShowMFADialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  Setup {mfaMethod === "authenticator" ? "Authenticator App" : "SMS"} 2FA
                </DialogTitle>
                <DialogDescription>
                  {mfaMethod === "authenticator"
                    ? "Scan the QR code with your authenticator app"
                    : "Enter your phone number to receive verification codes"
                  }
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {mfaMethod === "authenticator" ? (
                  <div className="text-center space-y-4">
                    <div className="w-48 h-48 bg-gray-100 rounded-lg mx-auto flex items-center justify-center">
                      <QrCodeIcon className="w-24 h-24 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-600">
                      Or enter this code manually: <code className="bg-gray-100 px-2 py-1 rounded">JBSWY3DPEHPK3PXP</code>
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        placeholder="+1 (555) 123-4567"
                        type="tel"
                      />
                    </div>
                    <p className="text-sm text-gray-600">
                      We'll send a verification code to this number
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="verification">Verification Code</Label>
                  <Input
                    id="verification"
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowMFADialog(false)}>
                  Cancel
                </Button>
                <Button onClick={setupMFA} disabled={mfaCode.length !== 6}>
                  <ShieldCheckIcon className="w-4 h-4 mr-2" />
                  Enable 2FA
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Password & Session Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <KeyIcon className="w-5 h-5" />
                <span>Password & Sessions</span>
              </CardTitle>
              <CardDescription>
                Manage your password and active sessions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Password</h3>
                    <p className="text-sm text-gray-500">
                      Last changed on {settings.passwordLastChanged}
                    </p>
                  </div>
                  <Button variant="outline">Change Password</Button>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Session Timeout</h3>
                      <p className="text-sm text-gray-500">
                        Automatically log out after period of inactivity
                      </p>
                    </div>
                  </div>
                  <Select
                    value={settings.sessionTimeout}
                    onValueChange={(value) =>
                      handleDirectChange("sessionTimeout", value)
                    }
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 hour</SelectItem>
                      <SelectItem value="8">8 hours</SelectItem>
                      <SelectItem value="24">24 hours</SelectItem>
                      <SelectItem value="168">1 week</SelectItem>
                      <SelectItem value="never">Never</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Sessions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ComputerDesktopIcon className="w-5 h-5" />
                <span>Active Sessions</span>
                <Badge variant="outline">{activeSessions.length}</Badge>
              </CardTitle>
              <CardDescription>
                Manage devices and browsers that are signed into your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeSessions.map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        {session.device.includes("Chrome") && "🌐"}
                        {session.device.includes("Safari") && "🧭"}
                        {session.device.includes("Firefox") && "🦊"}
                        {session.device.includes("iPhone") && "📱"}
                        {session.device.includes("Windows") && "🖥️"}
                      </div>
                      <div>
                        <h4 className="font-medium">{session.device}</h4>
                        <p className="text-sm text-gray-500">
                          {session.location} • {session.lastActive}
                          {session.current && <span className="text-blue-600 font-medium"> (Current)</span>}
                        </p>
                      </div>
                    </div>
                    {!session.current && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => revokeSession(session.id)}
                      >
                        Revoke
                      </Button>
                    )}
                  </div>
                ))}

                <Separator />

                <div className="flex justify-between">
                  <div>
                    <h4 className="font-medium text-red-900">Revoke All Other Sessions</h4>
                    <p className="text-sm text-red-700">This will sign you out from all other devices</p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={revokeAllSessions}
                  >
                    Revoke All
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* API Key Management */}
          <ApiKeyManager />
        </TabsContent>

        {/* Notifications Settings */}
        <TabsContent value="notifications" className="space-y-6">
          {/* Notification Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BellIcon className="w-5 h-5 text-blue-600" />
                <span>Notification Preferences</span>
              </CardTitle>
              <CardDescription>
                Configure how and when you receive notifications from TestBro
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <EnvelopeIcon className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-lg font-bold text-blue-700">Email</div>
                  <div className="text-sm text-blue-600">Direct to inbox</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                  <DevicePhoneMobileIcon className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <div className="text-lg font-bold text-green-700">Push</div>
                  <div className="text-sm text-green-600">Browser alerts</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <LinkIcon className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <div className="text-lg font-bold text-purple-700">Slack</div>
                  <div className="text-sm text-purple-600">Team workspace</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Granular Email Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <EnvelopeIcon className="w-5 h-5" />
                <span>Email Notifications</span>
                <Badge variant="outline" className="text-xs">
                  {Object.values(settings.emailNotifications).filter(Boolean).length} of {Object.keys(settings.emailNotifications).length} enabled
                </Badge>
              </CardTitle>
              <CardDescription>
                Choose specific email notifications for different events
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(settings.emailNotifications).map(
                  ([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex-1">
                        <h3 className="font-medium capitalize text-gray-900">
                          {key.replace(/([A-Z])/g, " $1").trim()}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {key === "testResults" && "✅ Test executions complete"}
                          {key === "executionFailures" && "🚨 Failed test executions"}
                          {key === "weeklyReports" && "📊 Weekly activity summary"}
                          {key === "teamUpdates" && "👥 Team member activities"}
                          {key === "systemMaintenance" && "⚙️ System updates & maintenance"}
                        </p>
                      </div>
                      <Switch
                        checked={value}
                        onCheckedChange={(checked) =>
                          handleSettingChange("emailNotifications", key, checked)
                        }
                      />
                    </div>
                  )
                )}
              </div>
            </CardContent>
          </Card>

          {/* Granular Push Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <DevicePhoneMobileIcon className="w-5 h-5" />
                <span>Push Notifications</span>
                <Badge variant="outline" className="text-xs">
                  {Object.values(settings.pushNotifications).filter(Boolean).length} of {Object.keys(settings.pushNotifications).length} enabled
                </Badge>
              </CardTitle>
              <CardDescription>
                Configure browser push notifications for real-time alerts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(settings.pushNotifications).map(
                  ([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex-1">
                        <h3 className="font-medium capitalize text-gray-900">
                          {key.replace(/([A-Z])/g, " $1").trim()}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {key === "testResults" && "🔔 Completed test notifications"}
                          {key === "executionFailures" && "🚨 Immediate failure alerts"}
                          {key === "mentions" && "💬 When mentioned in comments"}
                          {key === "comments" && "💭 New comments on your items"}
                        </p>
                      </div>
                      <Switch
                        checked={value}
                        onCheckedChange={(checked) =>
                          handleSettingChange("pushNotifications", key, checked)
                        }
                      />
                    </div>
                  )
                )}
              </div>

              <Separator />

              <Alert>
                <InformationCircleIcon className="h-4 w-4" />
                <AlertDescription>
                  Push notifications require browser permission. You'll be prompted to allow notifications when enabling these settings.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Enhanced Slack Integration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <LinkIcon className="w-5 h-5" />
                <span>Slack Integration</span>
                <Badge variant={settings.slackNotifications.enabled ? "default" : "secondary"}>
                  {settings.slackNotifications.enabled ? "Connected" : "Disconnected"}
                </Badge>
              </CardTitle>
              <CardDescription>
                Send notifications directly to your Slack workspace with granular control
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="font-medium">Enable Slack Notifications</h3>
                  <p className="text-sm text-gray-500">
                    Send test results and alerts to your Slack workspace
                  </p>
                </div>
                <Switch
                  checked={settings.slackNotifications.enabled}
                  onCheckedChange={(checked) =>
                    handleSettingChange(
                      "slackNotifications",
                      "enabled",
                      checked
                    )
                  }
                />
              </div>

              {settings.slackNotifications.enabled && (
                <div className="space-y-4 pl-4 border-l-2 border-purple-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="slackWebhook">Webhook URL</Label>
                      <Input
                        id="slackWebhook"
                        value={settings.slackNotifications.webhook}
                        onChange={(e) =>
                          handleSettingChange(
                            "slackNotifications",
                            "webhook",
                            e.target.value
                          )
                        }
                        placeholder="https://hooks.slack.com/services/..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="slackChannel">Channel</Label>
                      <Input
                        id="slackChannel"
                        value={settings.slackNotifications.channel}
                        onChange={(e) =>
                          handleSettingChange(
                            "slackNotifications",
                            "channel",
                            e.target.value
                          )
                        }
                        placeholder="#qa-alerts"
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Slack-specific notification toggles */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Slack Notification Events</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { key: 'testResults', label: 'Test Results', icon: '✅', desc: 'Test completion notifications' },
                        { key: 'executionFailures', label: 'Failures', icon: '🚨', desc: 'Failed execution alerts' },
                        { key: 'weeklyReports', label: 'Weekly Reports', icon: '📊', desc: 'Weekly activity summaries' },
                        { key: 'teamUpdates', label: 'Team Updates', icon: '👥', desc: 'Team member activities' },
                        { key: 'systemMaintenance', label: 'System Alerts', icon: '⚙️', desc: 'Maintenance notifications' },
                      ].map((item) => (
                        <div key={item.key} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
                          <div className="flex items-center space-x-3">
                            <span className="text-lg">{item.icon}</span>
                            <div>
                              <h5 className="font-medium text-sm text-purple-900">{item.label}</h5>
                              <p className="text-xs text-purple-700">{item.desc}</p>
                            </div>
                          </div>
                          <Switch
                            checked={settings.emailNotifications[item.key as keyof typeof settings.emailNotifications] || false}
                            onCheckedChange={(checked) =>
                              handleSettingChange("emailNotifications", item.key, checked)
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      Test Connection
                    </Button>
                    <Button variant="outline" size="sm">
                      View Webhook Docs
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Webhook Integration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <SparklesIcon className="w-5 h-5 text-orange-600" />
                <span>Webhook Integration</span>
                <Badge variant="secondary">Advanced</Badge>
              </CardTitle>
              <CardDescription>
                Send notifications to any webhook endpoint for custom integrations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="webhookUrl">Webhook URL</Label>
                  <Input
                    id="webhookUrl"
                    placeholder="https://your-app.com/webhook/testbro"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="webhookSecret">Secret Key (Optional)</Label>
                  <Input
                    id="webhookSecret"
                    type="password"
                    placeholder="Your webhook secret"
                  />
                </div>
                <div className="flex items-center space-x-4">
                  <Button size="sm">
                    <SparklesIcon className="w-4 h-4 mr-2" />
                    Setup Webhook
                  </Button>
                  <Button variant="outline" size="sm">
                    Test Webhook
                  </Button>
                </div>
              </div>

              <Alert>
                <InformationCircleIcon className="h-4 w-4" />
                <AlertDescription>
                  Webhooks allow you to integrate with any external service that supports HTTP POST requests.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations Settings */}
        <TabsContent value="integrations" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(settings.integrations).map(([key, integration]) => (
              <Card key={key}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                        {key === "jira" && "🔗"}
                        {key === "github" && "🐙"}
                        {key === "slack" && "💬"}
                        {key === "teams" && "👥"}
                        {key === "jenkins" && "🔧"}
                      </div>
                      <span className="capitalize">{key}</span>
                    </div>
                    <Badge
                      variant={integration.enabled ? "default" : "secondary"}
                    >
                      {integration.enabled ? "Connected" : "Disconnected"}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    {key === "jira" &&
                      "Link test cases to Jira issues and sync results"}
                    {key === "github" &&
                      "Connect repositories and trigger tests on commits"}
                    {key === "slack" &&
                      "Send notifications and reports to Slack channels"}
                    {key === "teams" &&
                      "Collaborate with Microsoft Teams integration"}
                    {key === "jenkins" &&
                      "Trigger TestBro tests from Jenkins pipelines"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Enable Integration
                    </span>
                    <Switch
                      checked={integration.enabled}
                      onCheckedChange={(checked) =>
                        handleSettingChange("integrations", key, {
                          ...integration,
                          enabled: checked,
                        })
                      }
                    />
                  </div>

                  {integration.enabled && (
                    <div className="space-y-3">
                      {integration.url && (
                        <div className="space-y-2">
                          <Label>URL</Label>
                          <Input
                            value={integration.url}
                            onChange={(e) =>
                              handleSettingChange("integrations", key, {
                                ...integration,
                                url: e.target.value,
                              })
                            }
                          />
                        </div>
                      )}
                      {integration.org && (
                        <div className="space-y-2">
                          <Label>Organization</Label>
                          <Input
                            value={integration.org}
                            onChange={(e) =>
                              handleSettingChange("integrations", key, {
                                ...integration,
                                org: e.target.value,
                              })
                            }
                          />
                        </div>
                      )}
                      {integration.workspace && (
                        <div className="space-y-2">
                          <Label>Workspace</Label>
                          <Input
                            value={integration.workspace}
                            onChange={(e) =>
                              handleSettingChange("integrations", key, {
                                ...integration,
                                workspace: e.target.value,
                              })
                            }
                          />
                        </div>
                      )}
                      {integration.tenant !== undefined && (
                        <div className="space-y-2">
                          <Label>Tenant ID</Label>
                          <Input
                            value={integration.tenant}
                            onChange={(e) =>
                              handleSettingChange("integrations", key, {
                                ...integration,
                                tenant: e.target.value,
                              })
                            }
                            placeholder="Enter Microsoft Teams tenant ID"
                          />
                        </div>
                      )}
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => testIntegration(key)}
                        >
                          Test Connection
                        </Button>
                        <Button variant="outline" size="sm">
                          Configure
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Application Settings */}
        <TabsContent value="application" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CogIcon className="w-5 h-5" />

                <span>General Preferences</span>
              </CardTitle>
              <CardDescription>
                Configure your default application behavior and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="defaultProject">Default Project</Label>
                  <Select
                    value={settings.defaultProject}
                    onValueChange={(value) =>
                      handleDirectChange("defaultProject", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="web-app-testing">
                        Web App Testing
                      </SelectItem>
                      <SelectItem value="mobile-app-testing">
                        Mobile App Testing
                      </SelectItem>
                      <SelectItem value="api-testing">API Testing</SelectItem>
                      <SelectItem value="e2e-testing">E2E Testing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="theme">Theme</Label>
                  <Select
                    value={settings.theme}
                    onValueChange={(value) =>
                      handleDirectChange("theme", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="autoSave">Auto-save Interval (seconds)</Label>
                  <Select
                    value={settings.autoSaveInterval}
                    onValueChange={(value) =>
                      handleDirectChange("autoSaveInterval", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 seconds</SelectItem>
                      <SelectItem value="30">30 seconds</SelectItem>
                      <SelectItem value="60">1 minute</SelectItem>
                      <SelectItem value="300">5 minutes</SelectItem>
                      <SelectItem value="disabled">Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select
                    value={settings.language}
                    onValueChange={(value) =>
                      handleDirectChange("language", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                      <SelectItem value="ja">Japanese</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Compact Mode</h3>
                  <p className="text-sm text-gray-500">
                    Use a more compact interface with reduced spacing
                  </p>
                </div>
                <Switch
                  checked={settings.compactMode}
                  onCheckedChange={(checked) =>
                    handleDirectChange("compactMode", checked)
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CircleStackIcon className="w-5 h-5" />

                <span>Test Execution Settings</span>
              </CardTitle>
              <CardDescription>
                Configure default behavior for test execution and data
                collection
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="maxConcurrent">Max Concurrent Tests</Label>
                  <Select
                    value={settings.maxConcurrentTests}
                    onValueChange={(value) =>
                      handleDirectChange("maxConcurrentTests", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 test</SelectItem>
                      <SelectItem value="3">3 tests</SelectItem>
                      <SelectItem value="5">5 tests</SelectItem>
                      <SelectItem value="10">10 tests</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="testTimeout">Test Timeout (seconds)</Label>
                  <Select
                    value={settings.testTimeout}
                    onValueChange={(value) =>
                      handleDirectChange("testTimeout", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="60">1 minute</SelectItem>
                      <SelectItem value="300">5 minutes</SelectItem>
                      <SelectItem value="600">10 minutes</SelectItem>
                      <SelectItem value="1800">30 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="screenshotQuality">Screenshot Quality</Label>
                  <Select
                    value={settings.screenshotQuality}
                    onValueChange={(value) =>
                      handleDirectChange("screenshotQuality", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low (faster)</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High (slower)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dataRetention">Data Retention (days)</Label>
                  <Select
                    value={settings.dataRetention}
                    onValueChange={(value) =>
                      handleDirectChange("dataRetention", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="180">6 months</SelectItem>
                      <SelectItem value="365">1 year</SelectItem>
                      <SelectItem value="forever">Forever</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Video Recording</h3>
                    <p className="text-sm text-gray-500">
                      Record video of test executions for debugging
                    </p>
                  </div>
                  <Switch
                    checked={settings.videoRecording}
                    onCheckedChange={(checked) =>
                      handleDirectChange("videoRecording", checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">AI Insights</h3>
                    <p className="text-sm text-gray-500">
                      Enable AI-powered analysis and recommendations
                    </p>
                  </div>
                  <Switch
                    checked={settings.aiInsights}
                    onCheckedChange={(checked) =>
                      handleDirectChange("aiInsights", checked)
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CloudIcon className="w-5 h-5" />

                <span>Data & Privacy</span>
              </CardTitle>
              <CardDescription>
                Manage your data, privacy settings, and account cleanup
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <Button variant="outline" className="w-full justify-start">
                  <CircleStackIcon className="w-4 h-4 mr-2" />
                  Export All Data
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <GlobeAltIcon className="w-4 h-4 mr-2" />
                  Privacy Policy
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <InformationCircleIcon className="w-4 h-4 mr-2" />
                  Data Processing Agreement
                </Button>
              </div>

              <Separator />

              <Alert className="border-red-200 bg-red-50">
                <ExclamationTriangleIcon className="w-4 h-4 text-red-600" />

                <AlertDescription className="text-red-800">
                  <strong>Danger Zone:</strong> These actions cannot be undone.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <Button variant="destructive" className="w-full">
                  <XMarkIcon className="w-4 h-4 mr-2" />
                  Delete All Test Data
                </Button>
                <Button variant="destructive" className="w-full">
                  <XMarkIcon className="w-4 h-4 mr-2" />
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
