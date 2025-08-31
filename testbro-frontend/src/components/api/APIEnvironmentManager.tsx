import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Edit3,
  Settings,
  Globe,
  Key,
  Copy,
  Check,
  AlertTriangle,
  Eye,
  EyeOff
} from 'lucide-react';
import { APIEnvironment } from '../../types/apiTesting';

interface APIEnvironmentManagerProps {
  projectId: string;
  onEnvironmentSelect?: (environment: APIEnvironment) => void;
  selectedEnvironmentId?: string;
}

export const APIEnvironmentManager: React.FC<APIEnvironmentManagerProps> = ({
  projectId,
  onEnvironmentSelect,
  selectedEnvironmentId
}) => {
  const [environments, setEnvironments] = useState<APIEnvironment[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingEnvironment, setEditingEnvironment] = useState<APIEnvironment | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchEnvironments();
  }, [projectId]);

  const fetchEnvironments = async () => {
    setLoading(true);
    try {
      // Fetch environments from API
      const response = await fetch(`/api/api-testing/environments?project_id=${projectId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setEnvironments(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch environments:', error);
    } finally {
      setLoading(false);
    }
  };

  const createEnvironment = async (environmentData: Partial<APIEnvironment>) => {
    try {
      const response = await fetch('/api/api-testing/environments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          ...environmentData,
          project_id: projectId
        })
      });

      if (response.ok) {
        await fetchEnvironments();
        setShowCreateForm(false);
      }
    } catch (error) {
      console.error('Failed to create environment:', error);
    }
  };

  const deleteEnvironment = async (environmentId: string) => {
    if (!confirm('Are you sure you want to delete this environment?')) return;

    try {
      const response = await fetch(`/api/api-testing/environments/${environmentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        await fetchEnvironments();
      }
    } catch (error) {
      console.error('Failed to delete environment:', error);
    }
  };

  const EnvironmentForm: React.FC<{
    environment?: APIEnvironment;
    onSave: (data: Partial<APIEnvironment>) => void;
    onCancel: () => void;
  }> = ({ environment, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
      name: environment?.name || '',
      description: environment?.description || '',
      base_url: environment?.base_url || '',
      variables: environment?.variables || {},
      headers: environment?.headers || {},
      authentication: environment?.authentication || { type: 'none' }
    });

    const [newVariable, setNewVariable] = useState({ key: '', value: '' });
    const [newHeader, setNewHeader] = useState({ key: '', value: '' });

    const addVariable = () => {
      if (newVariable.key && newVariable.value) {
        setFormData(prev => ({
          ...prev,
          variables: {
            ...prev.variables,
            [newVariable.key]: newVariable.value
          }
        }));
        setNewVariable({ key: '', value: '' });
      }
    };

    const removeVariable = (key: string) => {
      setFormData(prev => {
        const { [key]: removed, ...rest } = prev.variables;
        return { ...prev, variables: rest };
      });
    };

    const addHeader = () => {
      if (newHeader.key && newHeader.value) {
        setFormData(prev => ({
          ...prev,
          headers: {
            ...prev.headers,
            [newHeader.key]: newHeader.value
          }
        }));
        setNewHeader({ key: '', value: '' });
      }
    };

    const removeHeader = (key: string) => {
      setFormData(prev => {
        const { [key]: removed, ...rest } = prev.headers;
        return { ...prev, headers: rest };
      });
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              {environment ? 'Edit Environment' : 'Create New Environment'}
            </h2>
          </div>

          <div className="p-6 space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Environment Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Development, Staging, Production"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe this environment..."
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Base URL (Optional)
                </label>
                <input
                  type="url"
                  value={formData.base_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, base_url: e.target.value }))}
                  placeholder="https://api.example.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Base URL that will be prepended to all API requests in this environment
                </p>
              </div>
            </div>

            {/* Environment Variables */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Environment Variables</h3>
              
              <div className="space-y-2">
                {Object.entries(formData.variables).map(([key, value]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={key}
                      readOnly
                      className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm bg-gray-50"
                    />
                    <span className="text-gray-400">=</span>
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        variables: { ...prev.variables, [key]: e.target.value }
                      }))}
                      className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                    <button
                      onClick={() => removeVariable(key)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="Variable name"
                    value={newVariable.key}
                    onChange={(e) => setNewVariable(prev => ({ ...prev, key: e.target.value }))}
                    className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                  />
                  <span className="text-gray-400">=</span>
                  <input
                    type="text"
                    placeholder="Variable value"
                    value={newVariable.value}
                    onChange={(e) => setNewVariable(prev => ({ ...prev, value: e.target.value }))}
                    className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                  />
                  <button
                    onClick={addVariable}
                    disabled={!newVariable.key || !newVariable.value}
                    className="text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Default Headers */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Default Headers</h3>
              
              <div className="space-y-2">
                {Object.entries(formData.headers).map(([key, value]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={key}
                      readOnly
                      className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm bg-gray-50"
                    />
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        headers: { ...prev.headers, [key]: e.target.value }
                      }))}
                      className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                    <button
                      onClick={() => removeHeader(key)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="Header name"
                    value={newHeader.key}
                    onChange={(e) => setNewHeader(prev => ({ ...prev, key: e.target.value }))}
                    className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Header value"
                    value={newHeader.value}
                    onChange={(e) => setNewHeader(prev => ({ ...prev, value: e.target.value }))}
                    className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                  />
                  <button
                    onClick={addHeader}
                    disabled={!newHeader.key || !newHeader.value}
                    className="text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Authentication */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Authentication (Optional)</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Authentication Type
                </label>
                <select
                  value={formData.authentication.type}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    authentication: { type: e.target.value as any }
                  }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="none">No Authentication</option>
                  <option value="bearer">Bearer Token</option>
                  <option value="basic">Basic Auth</option>
                  <option value="api_key">API Key</option>
                </select>
              </div>

              {formData.authentication.type === 'bearer' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bearer Token
                  </label>
                  <input
                    type="password"
                    placeholder="Enter bearer token"
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      authentication: {
                        ...prev.authentication,
                        credentials: { token: e.target.value }
                      }
                    }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}

              {formData.authentication.type === 'basic' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      placeholder="Username"
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        authentication: {
                          ...prev.authentication,
                          credentials: { 
                            ...prev.authentication.credentials,
                            username: e.target.value 
                          }
                        }
                      }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      placeholder="Password"
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        authentication: {
                          ...prev.authentication,
                          credentials: { 
                            ...prev.authentication.credentials,
                            password: e.target.value 
                          }
                        }
                      }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              {formData.authentication.type === 'api_key' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Key Location
                      </label>
                      <select
                        value={formData.authentication.credentials?.keyLocation || 'header'}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          authentication: {
                            ...prev.authentication,
                            credentials: { 
                              ...prev.authentication.credentials,
                              keyLocation: e.target.value as any
                            }
                          }
                        }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="header">Header</option>
                        <option value="query">Query Parameter</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Key Name
                      </label>
                      <input
                        type="text"
                        placeholder="X-API-Key"
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          authentication: {
                            ...prev.authentication,
                            credentials: { 
                              ...prev.authentication.credentials,
                              keyName: e.target.value 
                            }
                          }
                        }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      API Key
                    </label>
                    <input
                      type="password"
                      placeholder="Enter API key"
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        authentication: {
                          ...prev.authentication,
                          credentials: { 
                            ...prev.authentication.credentials,
                            apiKey: e.target.value 
                          }
                        }
                      }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(formData)}
              disabled={!formData.name}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {environment ? 'Update' : 'Create'} Environment
            </button>
          </div>
        </div>
      </div>
    );
  };

  const EnvironmentCard: React.FC<{ environment: APIEnvironment }> = ({ environment }) => {
    const [copied, setCopied] = useState<string | null>(null);

    const copyToClipboard = (text: string, key: string) => {
      navigator.clipboard?.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    };

    const isSelected = selectedEnvironmentId === environment.id;

    return (
      <div
        className={`bg-white rounded-lg border-2 p-4 transition-all cursor-pointer ${
          isSelected 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
        }`}
        onClick={() => onEnvironmentSelect?.(environment)}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Globe className={`w-5 h-5 ${isSelected ? 'text-blue-600' : 'text-gray-600'}`} />
            <h3 className={`font-semibold ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
              {environment.name}
            </h3>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditingEnvironment(environment);
              }}
              className="text-gray-400 hover:text-blue-600"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteEnvironment(environment.id);
              }}
              className="text-gray-400 hover:text-red-600"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {environment.description && (
          <p className={`text-sm mb-3 ${isSelected ? 'text-blue-700' : 'text-gray-600'}`}>
            {environment.description}
          </p>
        )}

        <div className="space-y-2">
          {environment.base_url && (
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">Base URL:</span>
              <div className="flex items-center space-x-1">
                <span className="text-xs font-mono text-gray-700 truncate max-w-40">
                  {environment.base_url}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard(environment.base_url!, 'url');
                  }}
                  className="text-gray-400 hover:text-blue-600"
                >
                  {copied === 'url' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Variables:</span>
            <span className="text-xs text-gray-700">
              {Object.keys(environment.variables || {}).length} defined
            </span>
          </div>

          {environment.authentication?.type !== 'none' && (
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">Auth:</span>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                {environment.authentication?.type?.toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {isSelected && (
          <div className="mt-3 p-2 bg-blue-100 rounded border border-blue-200">
            <p className="text-xs text-blue-700 flex items-center">
              <Check className="w-3 h-3 mr-1" />
              Selected for API tests
            </p>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading environments...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">API Environments</h2>
          <p className="text-sm text-gray-600">
            Manage different environments for your API tests (development, staging, production)
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Environment</span>
        </button>
      </div>

      {environments.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Globe className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Environments Yet</h3>
          <p className="text-gray-500 mb-4">
            Create environments to manage different API configurations for testing
          </p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Your First Environment
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {environments.map(environment => (
            <EnvironmentCard key={environment.id} environment={environment} />
          ))}
        </div>
      )}

      {/* Create/Edit Form Modal */}
      {showCreateForm && (
        <EnvironmentForm
          onSave={createEnvironment}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {editingEnvironment && (
        <EnvironmentForm
          environment={editingEnvironment}
          onSave={async (data) => {
            // Update environment logic would go here
            setEditingEnvironment(null);
          }}
          onCancel={() => setEditingEnvironment(null)}
        />
      )}
    </div>
  );
};