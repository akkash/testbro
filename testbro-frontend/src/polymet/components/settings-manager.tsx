import React, { useState } from "react";
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
} from "@heroicons/react/24/outline";

interface SettingsManagerProps {
  className?: string;
}

export default function SettingsManager({
  className = "",
}: SettingsManagerProps) {
  const [activeTab, setActiveTab] = useState("account");
  const [showApiKey, setShowApiKey] = useState(false);
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
              <div className="flex items-center space-x-6">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={settings.avatar} />

                  <AvatarFallback>
                    {settings.firstName[0]}
                    {settings.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <Button variant="outline" size="sm">
                    Change Avatar
                  </Button>
                  <p className="text-sm text-gray-500">
                    JPG, PNG or GIF. Max size 2MB.
                  </p>
                </div>
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
                  <Select
                    value={settings.timezone}
                    onValueChange={(value) =>
                      handleDirectChange("timezone", value)
                    }
                  >
                    <SelectTrigger>
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
                    </SelectContent>
                  </Select>
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
                Manage your subscription and billing information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div>
                  <h3 className="font-semibold text-blue-900">
                    Professional Plan
                  </h3>
                  <p className="text-blue-700">
                    $49/month • Renews on Feb 15, 2024
                  </p>
                </div>
                <Badge
                  variant="secondary"
                  className="bg-blue-100 text-blue-800"
                >
                  Active
                </Badge>
              </div>
              <div className="flex space-x-3">
                <Button variant="outline">Manage Subscription</Button>
                <Button variant="outline">View Billing History</Button>
                <Button variant="outline">Download Invoice</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <KeyIcon className="w-5 h-5" />

                <span>Authentication & Security</span>
              </CardTitle>
              <CardDescription>
                Manage your password, two-factor authentication, and security
                settings
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

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Two-Factor Authentication</h3>
                    <p className="text-sm text-gray-500">
                      Add an extra layer of security to your account
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge
                      variant={
                        settings.twoFactorEnabled ? "default" : "secondary"
                      }
                    >
                      {settings.twoFactorEnabled ? "Enabled" : "Disabled"}
                    </Badge>
                    <Switch
                      checked={settings.twoFactorEnabled}
                      onCheckedChange={(checked) =>
                        handleDirectChange("twoFactorEnabled", checked)
                      }
                    />
                  </div>
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

          {/* API Key Management */}
          <ApiKeyManager />
        </TabsContent>

        {/* Notifications Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <EnvelopeIcon className="w-5 h-5" />

                <span>Email Notifications</span>
              </CardTitle>
              <CardDescription>
                Choose which email notifications you'd like to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(settings.emailNotifications).map(
                ([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium capitalize">
                        {key.replace(/([A-Z])/g, " $1").trim()}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {key === "testResults" &&
                          "Get notified when test executions complete"}
                        {key === "executionFailures" &&
                          "Immediate alerts for failed test executions"}
                        {key === "weeklyReports" &&
                          "Weekly summary of your testing activity"}
                        {key === "teamUpdates" &&
                          "Updates about team member activities"}
                        {key === "systemMaintenance" &&
                          "Important system updates and maintenance"}
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <DevicePhoneMobileIcon className="w-5 h-5" />

                <span>Push Notifications</span>
              </CardTitle>
              <CardDescription>
                Manage browser and mobile push notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(settings.pushNotifications).map(
                ([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium capitalize">
                        {key.replace(/([A-Z])/g, " $1").trim()}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {key === "testResults" &&
                          "Push notifications for completed tests"}
                        {key === "executionFailures" &&
                          "Immediate push alerts for failures"}
                        {key === "mentions" &&
                          "When someone mentions you in comments"}
                        {key === "comments" &&
                          "New comments on your test cases"}
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <LinkIcon className="w-5 h-5" />

                <span>Slack Integration</span>
              </CardTitle>
              <CardDescription>
                Send notifications directly to your Slack workspace
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Enable Slack Notifications</h3>
                  <p className="text-sm text-gray-500">
                    Send test results and alerts to Slack
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
                <div className="space-y-4 pl-4 border-l-2 border-blue-200">
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
                  <Button variant="outline" size="sm">
                    Test Connection
                  </Button>
                </div>
              )}
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
