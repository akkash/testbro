import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Plus,
  Copy,
  Trash2,
  Key,
  AlertTriangle,
  CheckCircle,
  Eye,
  EyeOff,
} from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'

interface ApiKey {
  id: string
  name: string
  key?: string // Only present when first created
  keyPreview: string
  permissions: string[]
  status: 'active' | 'inactive'
  lastUsed?: string
  createdAt: string
  expiresAt?: string
}

const ApiKeyManager: React.FC = () => {
  const { isAuthenticated, createApiKey, listApiKeys, revokeApiKey, lastError, clearError } = useAuth()
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null)
  const [showKeyDialog, setShowKeyDialog] = useState(false)
  const [keyVisible, setKeyVisible] = useState(false)

  const availablePermissions = [
    { value: 'read', label: 'Read', description: 'View projects, test cases, and results' },
    { value: 'write', label: 'Write', description: 'Create and update resources' },
    { value: 'execute', label: 'Execute', description: 'Run tests and executions' },
    { value: 'delete', label: 'Delete', description: 'Delete resources' },
    { value: 'webhook', label: 'Webhooks', description: 'Manage webhook endpoints' },
    { value: 'analytics', label: 'Analytics', description: 'Access analytics and reports' },
  ]

  useEffect(() => {
    if (isAuthenticated) {
      loadApiKeys()
    }
  }, [isAuthenticated])

  const loadApiKeys = async () => {
    setLoading(true)
    try {
      const { data, error } = await listApiKeys()
      if (error) {
        console.error('Failed to load API keys:', error)
      } else {
        setApiKeys(data || [])
      }
    } catch (error) {
      console.error('Error loading API keys:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateApiKey = async () => {
    if (!newKeyName.trim() || selectedPermissions.length === 0) {
      return
    }

    setLoading(true)
    try {
      const { data, error } = await createApiKey(newKeyName.trim(), selectedPermissions)
      if (error) {
        console.error('Failed to create API key:', error)
      } else {
        // Show the new key to the user (this is the only time they'll see it)
        setNewlyCreatedKey(data.key)
        setShowKeyDialog(true)
        
        // Refresh the list
        await loadApiKeys()
        
        // Reset form
        setNewKeyName('')
        setSelectedPermissions([])
        setCreateDialogOpen(false)
      }
    } catch (error) {
      console.error('Error creating API key:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRevokeApiKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return
    }

    setLoading(true)
    try {
      const { error } = await revokeApiKey(keyId)
      if (error) {
        console.error('Failed to revoke API key:', error)
      } else {
        await loadApiKeys()
      }
    } catch (error) {
      console.error('Error revoking API key:', error)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      // You might want to show a toast notification here
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  const togglePermission = (permission: string) => {
    setSelectedPermissions(prev => 
      prev.includes(permission)
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (!isAuthenticated) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            Please sign in to manage API keys
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>
          <p className="text-gray-600">
            Manage API keys for programmatic access to TestBro
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create API Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New API Key</DialogTitle>
              <DialogDescription>
                Create a new API key for programmatic access to TestBro
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="keyName">API Key Name</Label>
                <Input
                  id="keyName"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="Enter a descriptive name"
                />
              </div>
              
              <div>
                <Label>Permissions</Label>
                <div className="space-y-2 mt-2">
                  {availablePermissions.map((permission) => (
                    <div key={permission.value} className="flex items-start space-x-2">
                      <Checkbox
                        id={permission.value}
                        checked={selectedPermissions.includes(permission.value)}
                        onCheckedChange={() => togglePermission(permission.value)}
                      />
                      <div className="grid gap-1.5 leading-none">
                        <Label htmlFor={permission.value} className="text-sm font-medium">
                          {permission.label}
                        </Label>
                        <p className="text-xs text-gray-500">
                          {permission.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateApiKey}
                disabled={!newKeyName.trim() || selectedPermissions.length === 0 || loading}
              >
                Create API Key
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Error Display */}
      {lastError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {lastError}
            <Button
              variant="ghost"
              size="sm"
              className="ml-2"
              onClick={clearError}
            >
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* API Keys List */}
      <Card>
        <CardHeader>
          <CardTitle>Your API Keys</CardTitle>
          <CardDescription>
            Manage your API keys for programmatic access
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-6 text-gray-500">
              Loading API keys...
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="text-center py-6">
              <Key className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No API keys found
              </h3>
              <p className="text-gray-500 mb-4">
                Create your first API key to access TestBro programmatically
              </p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create API Key
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {apiKeys.map((apiKey) => (
                <div key={apiKey.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <h4 className="font-medium">{apiKey.name}</h4>
                      <div className="flex items-center space-x-2">
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                          {apiKey.keyPreview}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(apiKey.keyPreview)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {apiKey.permissions.map((permission) => (
                          <Badge key={permission} variant="outline" className="text-xs">
                            {permission}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span className="flex items-center">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          {apiKey.status}
                        </span>
                        <span>Created: {formatDate(apiKey.createdAt)}</span>
                        {apiKey.lastUsed && (
                          <span>Last used: {formatDate(apiKey.lastUsed)}</span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRevokeApiKey(apiKey.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Revoke
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* New API Key Display Dialog */}
      <Dialog open={showKeyDialog} onOpenChange={setShowKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key Created Successfully</DialogTitle>
            <DialogDescription>
              Your API key has been created. Please copy it now as you won't be able to see it again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Important:</strong> This is the only time you'll see this API key. Store it securely.
              </AlertDescription>
            </Alert>
            <div>
              <Label>Your new API key:</Label>
              <div className="flex items-center space-x-2 mt-2">
                <Input
                  value={newlyCreatedKey || ''}
                  readOnly
                  type={keyVisible ? 'text' : 'password'}
                  className="font-mono"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setKeyVisible(!keyVisible)}
                >
                  {keyVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(newlyCreatedKey || '')}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setShowKeyDialog(false)
                setNewlyCreatedKey(null)
                setKeyVisible(false)
              }}
            >
              I've saved the key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ApiKeyManager