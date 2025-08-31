import React, { useState } from 'react';
import {
  CheckCircle,
  XCircle,
  Clock,
  Database,
  FileText,
  Code,
  AlertTriangle,
  Copy,
  ChevronDown,
  ChevronRight,
  Eye,
  Download
} from 'lucide-react';
import { APITestResult } from '../../types/apiTesting';

interface TestResultsPanelProps {
  result: APITestResult;
  onRetry?: () => void;
  onSaveAsTest?: () => void;
}

export const TestResultsPanel: React.FC<TestResultsPanelProps> = ({
  result,
  onRetry,
  onSaveAsTest
}) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    request: false,
    response: true,
    validations: true,
    extracted: false
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-green-600 bg-green-50';
    if (status >= 300 && status < 400) return 'text-blue-600 bg-blue-50';
    if (status >= 400 && status < 500) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text);
  };

  const CollapsibleSection: React.FC<{
    title: string;
    key: string;
    icon: React.ComponentType<{ className?: string }>;
    children: React.ReactNode;
    defaultExpanded?: boolean;
  }> = ({ title, key, icon: Icon, children, defaultExpanded = false }) => {
    const isExpanded = expandedSections[key] ?? defaultExpanded;

    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <button
          onClick={() => toggleSection(key)}
          className="w-full px-4 py-3 bg-gray-50 flex items-center justify-between hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center space-x-2">
            <Icon className="w-4 h-4 text-gray-600" />
            <span className="font-medium text-gray-900">{title}</span>
          </div>
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-600" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-600" />
          )}
        </button>
        {isExpanded && (
          <div className="p-4 bg-white">
            {children}
          </div>
        )}
      </div>
    );
  };

  const JsonViewer: React.FC<{ data: any; title?: string }> = ({ data, title }) => {
    const jsonString = JSON.stringify(data, null, 2);
    
    return (
      <div className="space-y-2">
        {title && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">{title}</span>
            <button
              onClick={() => copyToClipboard(jsonString)}
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center space-x-1"
            >
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </button>
          </div>
        )}
        <pre className="bg-gray-50 border rounded p-3 text-sm overflow-x-auto max-h-64 overflow-y-auto">
          <code>{jsonString}</code>
        </pre>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Test Results</h3>
        <div className="flex items-center space-x-2">
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Retry
            </button>
          )}
          {onSaveAsTest && (
            <button
              onClick={onSaveAsTest}
              className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
            >
              Save as Test
            </button>
          )}
        </div>
      </div>

      {/* Overall Status */}
      <div className={`p-4 rounded-lg border-2 ${
        result.success 
          ? 'border-green-200 bg-green-50' 
          : 'border-red-200 bg-red-50'
      }`}>
        <div className="flex items-center space-x-3">
          {result.success ? (
            <CheckCircle className="w-6 h-6 text-green-600" />
          ) : (
            <XCircle className="w-6 h-6 text-red-600" />
          )}
          <div>
            <div className={`font-semibold ${
              result.success ? 'text-green-900' : 'text-red-900'
            }`}>
              {result.success ? 'Test Passed' : 'Test Failed'}
            </div>
            <div className="text-sm text-gray-600">
              Executed in {formatDuration(result.executionTime)}
            </div>
          </div>
        </div>

        {result.error && (
          <div className="mt-3 p-3 bg-red-100 border border-red-200 rounded">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800">{result.error}</div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Response Time</span>
          </div>
          <div className="text-lg font-semibold text-gray-900">
            {formatDuration(result.executionTime)}
          </div>
        </div>

        {result.response && (
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center space-x-2">
              <Database className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Response Size</span>
            </div>
            <div className="text-lg font-semibold text-gray-900">
              {formatBytes(result.response.size)}
            </div>
          </div>
        )}
      </div>

      {/* Request Details */}
      <CollapsibleSection
        title="Request Details"
        key="request"
        icon={FileText}
      >
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 text-xs font-medium rounded ${
              result.request.method === 'GET' ? 'bg-green-100 text-green-700' :
              result.request.method === 'POST' ? 'bg-blue-100 text-blue-700' :
              result.request.method === 'PUT' ? 'bg-orange-100 text-orange-700' :
              result.request.method === 'DELETE' ? 'bg-red-100 text-red-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {result.request.method}
            </span>
            <span className="text-sm font-mono text-gray-700 break-all">
              {result.request.url}
            </span>
          </div>

          {result.request.headers && Object.keys(result.request.headers).length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Headers</h4>
              <div className="space-y-1">
                {Object.entries(result.request.headers).map(([key, value]) => (
                  <div key={key} className="flex text-sm">
                    <span className="font-medium text-gray-600 w-32 flex-shrink-0">{key}:</span>
                    <span className="text-gray-800 break-all">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.request.body && (
            <JsonViewer data={result.request.body} title="Request Body" />
          )}
        </div>
      </CollapsibleSection>

      {/* Response Details */}
      {result.response && (
        <CollapsibleSection
          title="Response Details"
          key="response"
          icon={Code}
          defaultExpanded
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">Status:</span>
                <span className={`px-2 py-1 text-sm font-medium rounded ${getStatusColor(result.response.status)}`}>
                  {result.response.status}
                </span>
              </div>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span>{formatBytes(result.response.size)}</span>
                <span>{formatDuration(result.executionTime)}</span>
              </div>
            </div>

            {Object.keys(result.response.headers).length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Response Headers</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {Object.entries(result.response.headers).map(([key, value]) => (
                    <div key={key} className="flex text-sm">
                      <span className="font-medium text-gray-600 w-32 flex-shrink-0">{key}:</span>
                      <span className="text-gray-800 break-all">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <JsonViewer data={result.response.body} title="Response Body" />
          </div>
        </CollapsibleSection>
      )}

      {/* Validation Results */}
      {result.validations.length > 0 && (
        <CollapsibleSection
          title={`Validations (${result.validations.filter(v => v.passed).length}/${result.validations.length} passed)`}
          key="validations"
          icon={CheckCircle}
          defaultExpanded
        >
          <div className="space-y-2">
            {result.validations.map((validation, index) => (
              <div
                key={index}
                className={`flex items-start space-x-3 p-3 rounded-lg ${
                  validation.passed 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-red-50 border border-red-200'
                }`}
              >
                {validation.passed ? (
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <div className={`font-medium ${
                    validation.passed ? 'text-green-900' : 'text-red-900'
                  }`}>
                    {validation.rule.replace('_', ' ').toUpperCase()}
                  </div>
                  <div className={`text-sm ${
                    validation.passed ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {validation.message}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Extracted Data */}
      {Object.keys(result.extractedData).length > 0 && (
        <CollapsibleSection
          title={`Extracted Data (${Object.keys(result.extractedData).length} variables)`}
          key="extracted"
          icon={Database}
        >
          <div className="space-y-3">
            {Object.entries(result.extractedData).map(([key, value]) => (
              <div key={key} className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-purple-900">{key}</span>
                  <button
                    onClick={() => copyToClipboard(`{{${key}}}`)}
                    className="text-xs text-purple-600 hover:text-purple-800 flex items-center space-x-1"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy reference</span>
                  </button>
                </div>
                <div className="text-sm text-purple-700 font-mono bg-purple-100 p-2 rounded break-all">
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </div>
                <div className="mt-2 text-xs text-purple-600">
                  Use <code className="bg-purple-100 px-1 rounded">{`{{${key}}}`}</code> to reference this value
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Execution Timestamp */}
      <div className="text-xs text-gray-500 text-center border-t pt-3">
        Executed at {new Date(result.timestamp).toLocaleString()}
      </div>
    </div>
  );
};