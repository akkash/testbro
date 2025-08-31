import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Database,
  Code,
  FileText,
  Hash,
  ArrowRight,
  Copy
} from 'lucide-react';
import { APIDataExtraction } from '../../types/apiTesting';

interface DataExtractionEditorProps {
  extractions: APIDataExtraction[];
  onChange: (extractions: APIDataExtraction[]) => void;
}

const EXTRACTION_SOURCES = [
  {
    value: 'body',
    label: 'Response Body',
    icon: Code,
    description: 'Extract data from JSON response body using JSONPath'
  },
  {
    value: 'header',
    label: 'Response Header',
    icon: FileText,
    description: 'Extract value from response headers'
  },
  {
    value: 'status',
    label: 'Status Code',
    icon: Hash,
    description: 'Extract the HTTP status code'
  }
];

const COMMON_JSONPATHS = [
  { label: 'Root object', path: '$' },
  { label: 'User ID', path: '$.data.user.id' },
  { label: 'User name', path: '$.data.user.name' },
  { label: 'Token', path: '$.access_token' },
  { label: 'Error message', path: '$.error.message' },
  { label: 'First item ID', path: '$.data[0].id' },
  { label: 'Array length', path: '$.data.length' },
  { label: 'Nested value', path: '$.response.result.value' }
];

const COMMON_HEADERS = [
  'Content-Type',
  'Authorization',
  'Set-Cookie',
  'Location',
  'X-Request-ID',
  'X-Rate-Limit-Remaining',
  'ETag',
  'Last-Modified'
];

export const DataExtractionEditor: React.FC<DataExtractionEditorProps> = ({
  extractions,
  onChange
}) => {
  const [showAddExtraction, setShowAddExtraction] = useState(false);

  const addExtraction = () => {
    const newExtraction: APIDataExtraction = {
      name: '',
      source: 'body',
      path: '',
      description: ''
    };
    onChange([...extractions, newExtraction]);
    setShowAddExtraction(false);
  };

  const updateExtraction = (index: number, updates: Partial<APIDataExtraction>) => {
    const updatedExtractions = extractions.map((extraction, i) =>
      i === index ? { ...extraction, ...updates } : extraction
    );
    onChange(updatedExtractions);
  };

  const removeExtraction = (index: number) => {
    onChange(extractions.filter((_, i) => i !== index));
  };

  const ExtractionCard: React.FC<{ 
    extraction: APIDataExtraction; 
    index: number 
  }> = ({ extraction, index }) => {
    const sourceConfig = EXTRACTION_SOURCES.find(s => s.value === extraction.source);
    const Icon = sourceConfig?.icon || Database;

    return (
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Icon className="w-5 h-5 text-purple-600" />
            <span className="font-medium text-gray-900">
              {extraction.name || 'Unnamed extraction'}
            </span>
          </div>
          <button
            onClick={() => removeExtraction(index)}
            className="text-red-500 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          {/* Variable Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Variable Name
            </label>
            <input
              type="text"
              value={extraction.name}
              onChange={(e) => updateExtraction(index, { name: e.target.value })}
              placeholder="e.g., userId, authToken, userName"
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Use this name to reference the extracted value in subsequent steps
            </p>
          </div>

          {/* Source Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Extract From
            </label>
            <select
              value={extraction.source}
              onChange={(e) => updateExtraction(index, { 
                source: e.target.value as any,
                path: '' // Reset path when changing source
              })}
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
            >
              {EXTRACTION_SOURCES.map(source => (
                <option key={source.value} value={source.value}>
                  {source.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {sourceConfig?.description}
            </p>
          </div>

          {/* Path/Header Name */}
          {extraction.source === 'body' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                JSONPath Expression
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={extraction.path || ''}
                  onChange={(e) => updateExtraction(index, { path: e.target.value })}
                  placeholder="$.data.user.id"
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm pr-8"
                />
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value) {
                        updateExtraction(index, { path: e.target.value });
                      }
                    }}
                    className="text-xs border-none bg-transparent text-blue-600 cursor-pointer"
                  >
                    <option value="">Templates</option>
                    {COMMON_JSONPATHS.map(template => (
                      <option key={template.path} value={template.path}>
                        {template.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Use JSONPath syntax to navigate the response structure
              </p>
            </div>
          )}

          {extraction.source === 'header' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Header Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={extraction.path || ''}
                  onChange={(e) => updateExtraction(index, { path: e.target.value })}
                  placeholder="Content-Type"
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm pr-8"
                />
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value) {
                        updateExtraction(index, { path: e.target.value });
                      }
                    }}
                    className="text-xs border-none bg-transparent text-blue-600 cursor-pointer"
                  >
                    <option value="">Common</option>
                    {COMMON_HEADERS.map(header => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {extraction.source === 'status' && (
            <div className="bg-blue-50 p-3 rounded">
              <p className="text-sm text-blue-700">
                <Hash className="w-4 h-4 inline mr-1" />
                The HTTP status code will be extracted automatically (no path needed)
              </p>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (Optional)
            </label>
            <input
              type="text"
              value={extraction.description || ''}
              onChange={(e) => updateExtraction(index, { description: e.target.value })}
              placeholder="Describe what this value represents"
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
            />
          </div>

          {/* Usage Example */}
          {extraction.name && (
            <div className="bg-green-50 p-3 rounded">
              <p className="text-sm text-green-700 mb-1">
                <ArrowRight className="w-4 h-4 inline mr-1" />
                Usage in subsequent steps:
              </p>
              <code className="text-sm bg-green-100 px-2 py-1 rounded text-green-800">
                {`{{${extraction.name}}}`}
              </code>
              <button
                onClick={() => navigator.clipboard?.writeText(`{{${extraction.name}}}`)}
                className="ml-2 text-green-600 hover:text-green-800"
                title="Copy to clipboard"
              >
                <Copy className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Data Extraction</h3>
          <p className="text-sm text-gray-600">
            Extract values from the API response to use in subsequent test steps
          </p>
        </div>
        <button
          onClick={addExtraction}
          className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Extraction</span>
        </button>
      </div>

      {/* Extraction Cards */}
      <div className="space-y-3">
        {extractions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Database className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No data extractions defined</p>
            <p className="text-sm">Extract values to use in other test steps</p>
          </div>
        ) : (
          extractions.map((extraction, index) => (
            <ExtractionCard key={index} extraction={extraction} index={index} />
          ))
        )}
      </div>

      {/* Quick Templates */}
      {extractions.length === 0 && (
        <div className="border-t pt-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Quick Templates:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <button
              onClick={() => {
                const tokenExtraction: APIDataExtraction = {
                  name: 'authToken',
                  source: 'body',
                  path: '$.access_token',
                  description: 'Authentication token for subsequent requests'
                };
                onChange([tokenExtraction]);
              }}
              className="text-left p-3 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <div className="font-medium text-purple-900">Auth Token</div>
              <div className="text-sm text-purple-700">Extract access token from login response</div>
            </button>
            
            <button
              onClick={() => {
                const userIdExtraction: APIDataExtraction = {
                  name: 'userId',
                  source: 'body',
                  path: '$.data.user.id',
                  description: 'User ID for profile operations'
                };
                onChange([userIdExtraction]);
              }}
              className="text-left p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <div className="font-medium text-blue-900">User ID</div>
              <div className="text-sm text-blue-700">Extract user ID from response</div>
            </button>

            <button
              onClick={() => {
                const locationExtraction: APIDataExtraction = {
                  name: 'resourceUrl',
                  source: 'header',
                  path: 'Location',
                  description: 'URL of newly created resource'
                };
                onChange([locationExtraction]);
              }}
              className="text-left p-3 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
            >
              <div className="font-medium text-green-900">Resource URL</div>
              <div className="text-sm text-green-700">Extract Location header from creation response</div>
            </button>

            <button
              onClick={() => {
                const statusExtraction: APIDataExtraction = {
                  name: 'responseStatus',
                  source: 'status',
                  description: 'HTTP status code for conditional logic'
                };
                onChange([statusExtraction]);
              }}
              className="text-left p-3 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
            >
              <div className="font-medium text-orange-900">Status Code</div>
              <div className="text-sm text-orange-700">Extract status code for conditional testing</div>
            </button>
          </div>
        </div>
      )}

      {/* Help Section */}
      {extractions.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Using Extracted Variables</h4>
          <div className="text-sm text-blue-700 space-y-1">
            <p>• Use <code className="bg-blue-100 px-1 rounded">{`{{variableName}}`}</code> syntax in subsequent API requests</p>
            <p>• Variables can be used in URLs, headers, and request bodies</p>
            <p>• JSONPath expressions support arrays: <code className="bg-blue-100 px-1 rounded">$.data[0].id</code></p>
            <p>• Use dot notation for nested objects: <code className="bg-blue-100 px-1 rounded">$.user.profile.name</code></p>
          </div>
        </div>
      )}
    </div>
  );
};