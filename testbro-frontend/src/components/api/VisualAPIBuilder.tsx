import React, { useState, useCallback, useEffect } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import {
  Globe,
  Send,
  Settings,
  Eye,
  Download,
  Play,
  Plus,
  Trash2,
  Copy,
  ArrowRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { APITestStep, APIRequestConfig, APIValidationRule, APIEnvironment } from '../../types/apiTesting';

interface APIMethodItem {
  method: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}

const HTTP_METHODS: APIMethodItem[] = [
  { method: 'GET', color: 'bg-green-500', icon: Eye },
  { method: 'POST', color: 'bg-blue-500', icon: Send },
  { method: 'PUT', color: 'bg-orange-500', icon: Settings },
  { method: 'DELETE', color: 'bg-red-500', icon: Trash2 },
  { method: 'PATCH', color: 'bg-purple-500', icon: Settings },
  { method: 'HEAD', color: 'bg-gray-500', icon: Eye },
  { method: 'OPTIONS', color: 'bg-indigo-500', icon: Settings }
];

interface VisualAPIBuilderProps {
  testStep?: APITestStep;
  environment?: APIEnvironment;
  onSave: (step: APITestStep) => void;
  onTest: (step: APITestStep) => void;
  onCancel: () => void;
}

export const VisualAPIBuilder: React.FC<VisualAPIBuilderProps> = ({
  testStep,
  environment,
  onSave,
  onTest,
  onCancel
}) => {
  const [step, setStep] = useState<APITestStep>(
    testStep || {
      id: `api-${Date.now()}`,
      name: 'New API Request',
      description: '',
      order: 1,
      request: {
        method: 'GET',
        url: '',
        headers: {},
        body: null
      },
      validations: [],
      dataExtractions: [],
      continueOnFailure: false,
      retryCount: 0,
      retryDelay: 1000,
      tags: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  );

  const [activeTab, setActiveTab] = useState<'request' | 'validation' | 'extraction'>('request');
  const [testResult, setTestResult] = useState<any>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const updateRequest = useCallback((updates: Partial<APIRequestConfig>) => {
    setStep(prev => ({
      ...prev,
      request: { ...prev.request, ...updates },
      updated_at: new Date().toISOString()
    }));
  }, []);

  const updateValidations = useCallback((validations: APIValidationRule[]) => {
    setStep(prev => ({
      ...prev,
      validations,
      updated_at: new Date().toISOString()
    }));
  }, []);

  const handleExecuteTest = async () => {
    setIsExecuting(true);
    try {
      await onTest(step);
      // Test result would be received via WebSocket or callback
    } finally {
      setIsExecuting(false);
    }
  };

  const MethodSelector: React.FC = () => (
    <div className="flex flex-wrap gap-2 mb-4">
      {HTTP_METHODS.map(({ method, color, icon: Icon }) => (
        <button
          key={method}
          onClick={() => updateRequest({ method: method as any })}
          className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-white font-medium transition-all ${
            step.request.method === method 
              ? color 
              : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
          }`}
        >
          <Icon className="w-4 h-4" />
          <span>{method}</span>
        </button>
      ))}
    </div>
  );

  const URLBuilder: React.FC = () => {
    const [urlParts, setUrlParts] = useState(() => {
      const url = step.request.url || '';
      const [baseUrl, queryString] = url.split('?');
      const queryParams = queryString 
        ? queryString.split('&').map(param => {
            const [key, value] = param.split('=');
            return { key, value: value || '', enabled: true };
          })
        : [{ key: '', value: '', enabled: true }];
      
      return { baseUrl, queryParams };
    });

    const updateURL = () => {
      const activeParams = urlParts.queryParams
        .filter(p => p.enabled && p.key)
        .map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
        .join('&');
      
      const finalUrl = urlParts.baseUrl + (activeParams ? `?${activeParams}` : '');
      updateRequest({ url: finalUrl });
    };

    useEffect(() => {
      updateURL();
    }, [urlParts]);

    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Base URL</label>
          <input
            type="text"
            value={urlParts.baseUrl}
            onChange={(e) => setUrlParts(prev => ({ ...prev, baseUrl: e.target.value }))}
            placeholder="https://api.example.com/v1/users"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">Query Parameters</label>
            <button
              onClick={() => setUrlParts(prev => ({
                ...prev,
                queryParams: [...prev.queryParams, { key: '', value: '', enabled: true }]
              }))}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center space-x-1"
            >
              <Plus className="w-4 h-4" />
              <span>Add Parameter</span>
            </button>
          </div>

          <div className="space-y-2">
            {urlParts.queryParams.map((param, index) => (
              <div key={index} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={param.enabled}
                  onChange={(e) => {
                    const newParams = [...urlParts.queryParams];
                    newParams[index].enabled = e.target.checked;
                    setUrlParts(prev => ({ ...prev, queryParams: newParams }));
                  }}
                  className="rounded border-gray-300"
                />
                <input
                  type="text"
                  placeholder="key"
                  value={param.key}
                  onChange={(e) => {
                    const newParams = [...urlParts.queryParams];
                    newParams[index].key = e.target.value;
                    setUrlParts(prev => ({ ...prev, queryParams: newParams }));
                  }}
                  className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                />
                <span className="text-gray-400">=</span>
                <input
                  type="text"
                  placeholder="value"
                  value={param.value}
                  onChange={(e) => {
                    const newParams = [...urlParts.queryParams];
                    newParams[index].value = e.target.value;
                    setUrlParts(prev => ({ ...prev, queryParams: newParams }));
                  }}
                  className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                />
                <button
                  onClick={() => {
                    const newParams = urlParts.queryParams.filter((_, i) => i !== index);
                    setUrlParts(prev => ({ ...prev, queryParams: newParams }));
                  }}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const HeadersEditor: React.FC = () => {
    const [headers, setHeaders] = useState(() => {
      return Object.entries(step.request.headers || {}).map(([key, value]) => ({
        key,
        value,
        enabled: true
      }));
    });

    useEffect(() => {
      const activeHeaders = headers
        .filter(h => h.enabled && h.key)
        .reduce((acc, h) => ({ ...acc, [h.key]: h.value }), {});
      
      updateRequest({ headers: activeHeaders });
    }, [headers]);

    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-700">Headers</h3>
          <button
            onClick={() => setHeaders(prev => [...prev, { key: '', value: '', enabled: true }])}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center space-x-1"
          >
            <Plus className="w-4 h-4" />
            <span>Add Header</span>
          </button>
        </div>

        <div className="space-y-2">
          {headers.map((header, index) => (
            <div key={index} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={header.enabled}
                onChange={(e) => {
                  const newHeaders = [...headers];
                  newHeaders[index].enabled = e.target.checked;
                  setHeaders(newHeaders);
                }}
                className="rounded border-gray-300"
              />
              <input
                type="text"
                placeholder="Header name"
                value={header.key}
                onChange={(e) => {
                  const newHeaders = [...headers];
                  newHeaders[index].key = e.target.value;
                  setHeaders(newHeaders);
                }}
                className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
              />
              <input
                type="text"
                placeholder="Header value"
                value={header.value}
                onChange={(e) => {
                  const newHeaders = [...headers];
                  newHeaders[index].value = e.target.value;
                  setHeaders(newHeaders);
                }}
                className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
              />
              <button
                onClick={() => setHeaders(prev => prev.filter((_, i) => i !== index))}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const BodyEditor: React.FC = () => {
    const [bodyType, setBodyType] = useState<'none' | 'json' | 'form' | 'text'>('none');
    const [bodyContent, setBodyContent] = useState('');

    const handleBodyTypeChange = (type: string) => {
      setBodyType(type as any);
      
      if (type === 'none') {
        updateRequest({ body: null });
      } else if (type === 'json') {
        try {
          updateRequest({ body: JSON.parse(bodyContent || '{}') });
        } catch {
          updateRequest({ body: {} });
        }
      } else {
        updateRequest({ body: bodyContent });
      }
    };

    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Body Type</label>
          <div className="flex space-x-2">
            {['none', 'json', 'form', 'text'].map(type => (
              <button
                key={type}
                onClick={() => handleBodyTypeChange(type)}
                className={`px-3 py-1 text-sm rounded ${
                  bodyType === type
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {type.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {bodyType !== 'none' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {bodyType === 'json' ? 'JSON Body' : 'Body Content'}
            </label>
            <textarea
              value={bodyContent}
              onChange={(e) => {
                setBodyContent(e.target.value);
                if (bodyType === 'json') {
                  try {
                    updateRequest({ body: JSON.parse(e.target.value) });
                  } catch {
                    // Invalid JSON, don't update
                  }
                } else {
                  updateRequest({ body: e.target.value });
                }
              }}
              placeholder={
                bodyType === 'json' 
                  ? '{\n  "key": "value"\n}'
                  : 'Enter body content...'
              }
              className="w-full h-32 border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-screen flex flex-col bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <input
                type="text"
                value={step.name}
                onChange={(e) => setStep(prev => ({ ...prev, name: e.target.value }))}
                placeholder="API Request Name"
                className="text-lg font-semibold bg-transparent border-none outline-none text-gray-900 placeholder-gray-400"
              />
              <input
                type="text"
                value={step.description || ''}
                onChange={(e) => setStep(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Description (optional)"
                className="block text-sm bg-transparent border-none outline-none text-gray-600 placeholder-gray-400 mt-1"
              />
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={handleExecuteTest}
                disabled={isExecuting || !step.request.url}
                className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExecuting ? (
                  <Clock className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                <span>{isExecuting ? 'Testing...' : 'Test'}</span>
              </button>
              <button
                onClick={() => onSave(step)}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Save</span>
              </button>
              <button
                onClick={onCancel}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex">
          {/* Main Builder Area */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Method Selection */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Globe className="w-5 h-5 mr-2" />
                  HTTP Request Configuration
                </h2>
                
                <MethodSelector />
                <URLBuilder />
              </div>

              {/* Tabs for Request Details */}
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="border-b border-gray-200">
                  <nav className="flex space-x-8 px-6">
                    {[
                      { id: 'request', label: 'Request Details' },
                      { id: 'validation', label: 'Response Validation' },
                      { id: 'extraction', label: 'Data Extraction' }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${
                          activeTab === tab.id
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </nav>
                </div>

                <div className="p-6">
                  {activeTab === 'request' && (
                    <div className="space-y-6">
                      <HeadersEditor />
                      <BodyEditor />
                    </div>
                  )}

                  {activeTab === 'validation' && (
                    <div>
                      <ValidationRulesEditor 
                        validations={step.validations}
                        onChange={updateValidations}
                      />
                    </div>
                  )}

                  {activeTab === 'extraction' && (
                    <div>
                      <DataExtractionEditor 
                        extractions={step.dataExtractions}
                        onChange={(extractions) => setStep(prev => ({ ...prev, dataExtractions: extractions }))}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Test Results Sidebar */}
          {testResult && (
            <div className="w-96 bg-white border-l border-gray-200 p-4 overflow-y-auto">
              <TestResultsPanel result={testResult} />
            </div>
          )}
        </div>
      </div>
    </DndProvider>
  );
};

// Additional components would be implemented separately:
// - ValidationRulesEditor
// - DataExtractionEditor  
// - TestResultsPanel
// - AuthenticationEditor