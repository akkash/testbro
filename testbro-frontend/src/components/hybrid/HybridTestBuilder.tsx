import React, { useState, useCallback, useEffect } from 'react';
import { DndProvider, useDrag, useDrop, DropTargetMonitor } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import {
  AlertTriangle,
  RefreshCw,
  Eye,
  Search,
  Clock,
  Download,
  ChevronDown,
  FileText,
  ArrowRight,
  Play,
  Plus,
  Copy,
  Trash2,
  Settings,
  Zap,
  Globe,
  Code,
  MousePointer
} from 'lucide-react';
import { NoCodeTestStep, TestCase } from '../../types';
import { APITestStep } from '../../types/apiTesting';
import { VisualAPIBuilder } from '../api/VisualAPIBuilder';

interface HybridActionItem {
  id: string;
  type: 'ui' | 'api';
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  uiAction?: {
    actionType: 'click' | 'type' | 'verify' | 'navigate' | 'wait' | 'select' | 'scroll' | 'hover';
    defaultValue?: string;
  };
  apiAction?: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    defaultUrl?: string;
  };
}

interface HybridTestStep {
  id: string;
  type: 'ui' | 'api';
  order: number;
  name: string;
  description?: string;
  
  // UI step properties
  ui_step?: NoCodeTestStep;
  
  // API step properties  
  api_step?: APITestStep;
  
  // Shared properties
  continueOnFailure: boolean;
  position: { x: number; y: number };
  connections?: string[];
  created_at: string;
  updated_at: string;
}

const HYBRID_ACTIONS: HybridActionItem[] = [
  // UI Actions
  {
    id: 'ui-click',
    type: 'ui',
    category: 'UI Interaction',
    icon: MousePointer,
    label: 'Click Element',
    description: 'Click on a UI element',
    uiAction: { actionType: 'click' }
  },
  {
    id: 'ui-type', 
    type: 'ui',
    category: 'UI Interaction',
    icon: FileText,
    label: 'Type Text',
    description: 'Enter text into an input field',
    uiAction: { actionType: 'type', defaultValue: 'Enter text here...' }
  },
  {
    id: 'ui-verify',
    type: 'ui', 
    category: 'UI Verification',
    icon: Eye,
    label: 'Verify Element',
    description: 'Check if element exists or has content',
    uiAction: { actionType: 'verify' }
  },
  {
    id: 'ui-navigate',
    type: 'ui',
    category: 'Navigation', 
    icon: ArrowRight,
    label: 'Navigate',
    description: 'Go to a URL',
    uiAction: { actionType: 'navigate', defaultValue: 'https://example.com' }
  },
  {
    id: 'ui-wait',
    type: 'ui',
    category: 'Timing',
    icon: Clock, 
    label: 'Wait',
    description: 'Wait for specified time',
    uiAction: { actionType: 'wait', defaultValue: '2000' }
  },
  
  // API Actions
  {
    id: 'api-get',
    type: 'api',
    category: 'API Request',
    icon: Globe,
    label: 'GET Request',
    description: 'Send GET request to API endpoint',
    apiAction: { method: 'GET', defaultUrl: '/api/users' }
  },
  {
    id: 'api-post',
    type: 'api', 
    category: 'API Request',
    icon: Code,
    label: 'POST Request', 
    description: 'Send POST request with data',
    apiAction: { method: 'POST', defaultUrl: '/api/users' }
  },
  {
    id: 'api-put',
    type: 'api',
    category: 'API Request', 
    icon: RefreshCw,
    label: 'PUT Request',
    description: 'Update resource via PUT request',
    apiAction: { method: 'PUT', defaultUrl: '/api/users/{{userId}}' }
  },
  {
    id: 'api-delete',
    type: 'api',
    category: 'API Request',
    icon: Trash2,
    label: 'DELETE Request', 
    description: 'Delete resource via DELETE request',
    apiAction: { method: 'DELETE', defaultUrl: '/api/users/{{userId}}' }
  }
];

interface HybridTestBuilderProps {
  testCase?: TestCase;
  onSave: (testCase: Partial<TestCase>) => void;
  onRun: () => void;
}

export const HybridTestBuilder: React.FC<HybridTestBuilderProps> = ({
  testCase,
  onSave, 
  onRun
}) => {
  const [testSteps, setTestSteps] = useState<HybridTestStep[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [testName, setTestName] = useState(testCase?.name || '');
  const [testDescription, setTestDescription] = useState(testCase?.description || '');
  const [editingStep, setEditingStep] = useState<HybridTestStep | null>(null);
  const [showAPIBuilder, setShowAPIBuilder] = useState(false);

  // Initialize test steps from test case
  useEffect(() => {
    if (testCase?.steps) {
      const hybridSteps: HybridTestStep[] = testCase.steps.map((step, index) => ({
        id: step.id,
        type: 'ui',
        order: index + 1,
        name: step.natural_language || `Step ${index + 1}`,
        description: step.element_description,
        ui_step: step,
        continueOnFailure: false,
        position: { x: 50, y: 100 + index * 120 },
        connections: [],
        created_at: step.created_at,
        updated_at: step.updated_at
      }));
      setTestSteps(hybridSteps);
    }
  }, [testCase]);

  const filteredActions = selectedCategory === 'all'
    ? HYBRID_ACTIONS
    : HYBRID_ACTIONS.filter(action => action.category === selectedCategory);

  const categories = [
    { id: 'all', label: 'All Actions' },
    { id: 'UI Interaction', label: 'UI Interaction' },
    { id: 'UI Verification', label: 'UI Verification' },
    { id: 'Navigation', label: 'Navigation' },  
    { id: 'Timing', label: 'Timing' },
    { id: 'API Request', label: 'API Requests' }
  ];

  const addStep = useCallback((actionId: string, position: { x: number; y: number }) => {
    const action = HYBRID_ACTIONS.find(a => a.id === actionId);
    if (!action) return;

    const stepId = `${action.type}-step-${Date.now()}`;
    
    const newStep: HybridTestStep = {
      id: stepId,
      type: action.type,
      order: testSteps.length + 1,
      name: action.label,
      description: action.description,
      continueOnFailure: false,
      position,
      connections: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (action.type === 'ui' && action.uiAction) {
      newStep.ui_step = {
        id: stepId,
        order: newStep.order,
        natural_language: action.label,
        action_type: action.uiAction.actionType,
        element_description: action.description,
        element_selector: '',
        element_alternatives: [],
        value: action.uiAction.defaultValue || '',
        confidence_score: 0.8,
        user_verified: false,
        created_at: newStep.created_at,
        updated_at: newStep.updated_at
      };
    } else if (action.type === 'api' && action.apiAction) {
      newStep.api_step = {
        id: stepId,
        name: action.label,
        description: action.description,
        order: newStep.order,
        request: {
          method: action.apiAction.method,
          url: action.apiAction.defaultUrl || '',
          headers: {},
          body: null
        },
        validations: [],
        dataExtractions: [],
        continueOnFailure: false,
        retryCount: 0,
        retryDelay: 1000,
        tags: [],
        created_at: newStep.created_at,
        updated_at: newStep.updated_at
      };
    }

    setTestSteps(prev => [...prev, newStep]);
  }, [testSteps]);

  const updateStep = useCallback((stepId: string, updates: Partial<HybridTestStep>) => {
    setTestSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { ...step, ...updates, updated_at: new Date().toISOString() }
        : step
    ));
  }, []);

  const deleteStep = useCallback((stepId: string) => {
    setTestSteps(prev => prev.filter(step => step.id !== stepId));
  }, []);

  const editStep = useCallback((step: HybridTestStep) => {
    setEditingStep(step);
    if (step.type === 'api') {
      setShowAPIBuilder(true);
    }
  }, []);

  const handleSaveAPIStep = useCallback((apiStep: APITestStep) => {
    if (editingStep) {
      updateStep(editingStep.id, {
        api_step: apiStep,
        name: apiStep.name,
        description: apiStep.description
      });
    }
    setShowAPIBuilder(false);
    setEditingStep(null);
  }, [editingStep, updateStep]);

  const handleSave = () => {
    // Convert hybrid steps back to regular test case format
    const uiSteps = testSteps
      .filter(step => step.type === 'ui' && step.ui_step)
      .map(step => step.ui_step!)
      .sort((a, b) => a.order - b.order);

    const testCaseData: Partial<TestCase> = {
      name: testName,
      description: testDescription,
      steps: uiSteps,
      priority: testCase?.priority || 'medium',
      status: 'active',
      ai_generated: false,
      tags: testCase?.tags || []
    };

    onSave(testCaseData);
  };

  const HybridActionPaletteItem: React.FC<{ item: HybridActionItem }> = ({ item }) => {
    const [, drag] = useDrag(() => ({
      type: 'HYBRID_ACTION',
      item: { id: item.id, type: 'HYBRID_ACTION' },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }));

    const Icon = item.icon;
    const typeColor = item.type === 'ui' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600';

    return (
      <div
        ref={drag}
        className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md cursor-move transition-all duration-200 group"
      >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${typeColor}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium text-gray-900">{item.label}</p>
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
              item.type === 'ui' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
            }`}>
              {item.type.toUpperCase()}
            </span>
          </div>
          <p className="text-xs text-gray-500 truncate">{item.description}</p>
        </div>
      </div>
    );
  };

  const HybridTestStepCard: React.FC<{ step: HybridTestStep }> = ({ step }) => {
    const [, drag] = useDrag(() => ({
      type: 'HYBRID_STEP',
      item: { id: step.id, type: 'HYBRID_STEP' },
    }));

    const [, drop] = useDrop(() => ({
      accept: 'HYBRID_STEP',
      hover: (item: any, monitor: DropTargetMonitor) => {
        if (!monitor.isOver({ shallow: true })) return;
        // Handle reordering logic here
      },
    }));

    const Icon = step.type === 'ui' ? MousePointer : Globe;
    const typeColor = step.type === 'ui' 
      ? 'bg-blue-50 border-blue-200 text-blue-700' 
      : 'bg-purple-50 border-purple-200 text-purple-700';

    return (
      <div
        ref={(node) => {
          if (node) {
            drag(node);
            drop(node);
          }
        }}
        className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all duration-200 group"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${typeColor} border`}>
              <Icon className="w-4 h-4" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full font-medium">
                  Step {step.order}
                </span>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  step.type === 'ui' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                }`}>
                  {step.type.toUpperCase()}
                </span>
              </div>
              
              <div>
                <p className="text-sm text-gray-900 mb-1 font-medium">
                  {step.name}
                </p>
                {step.description && (
                  <p className="text-xs text-gray-500 mb-1">
                    {step.description}
                  </p>
                )}
                
                {/* Step-specific details */}
                {step.type === 'ui' && step.ui_step && (
                  <div className="text-xs text-gray-600">
                    <span className="capitalize">{step.ui_step.action_type}</span>
                    {step.ui_step.value && (
                      <span className="ml-2 bg-blue-50 px-1 py-0.5 rounded">
                        Value: {step.ui_step.value}
                      </span>
                    )}
                  </div>
                )}
                
                {step.type === 'api' && step.api_step && (
                  <div className="text-xs text-gray-600 flex items-center space-x-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      step.api_step.request.method === 'GET' ? 'bg-green-100 text-green-700' :
                      step.api_step.request.method === 'POST' ? 'bg-blue-100 text-blue-700' :  
                      step.api_step.request.method === 'PUT' ? 'bg-orange-100 text-orange-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {step.api_step.request.method}
                    </span>
                    <span className="truncate font-mono">
                      {step.api_step.request.url}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="flex space-x-1">
              <button
                onClick={() => editStep(step)}
                className="p-1 text-gray-400 hover:text-blue-600 rounded"
                title="Edit step"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  const duplicatedStep = {
                    ...step,
                    id: `${step.type}-step-${Date.now()}`,
                    order: testSteps.length + 1,
                    position: {
                      x: step.position.x,
                      y: step.position.y + 120
                    }
                  };
                  setTestSteps(prev => [...prev, duplicatedStep]);
                }}
                className="p-1 text-gray-400 hover:text-green-600 rounded"
                title="Duplicate step"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button
                onClick={() => deleteStep(step.id)}
                className="p-1 text-gray-400 hover:text-red-600 rounded"
                title="Delete step"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const HybridTestCanvas: React.FC = () => {
    const [, drop] = useDrop(() => ({
      accept: ['HYBRID_ACTION', 'HYBRID_STEP'],
      drop: (item: any, monitor) => {
        if (item.type === 'HYBRID_ACTION') {
          const clientOffset = monitor.getClientOffset();
          if (clientOffset) {
            addStep(item.id, {
              x: clientOffset.x,
              y: clientOffset.y
            });
          }
        }
      },
    }));

    return (
      <div
        ref={drop}
        className="flex-1 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 min-h-[600px] relative overflow-auto p-6"
      >
        {testSteps.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Build Hybrid Tests
              </h3>
              <p className="text-gray-500 max-w-md">
                Combine UI interactions and API calls in a single test flow. 
                Drag actions from the palette to create comprehensive test scenarios.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {testSteps
              .sort((a, b) => a.order - b.order)
              .map((step) => (
                <HybridTestStepCard key={step.id} step={step} />
              ))}
          </div>
        )}
      </div>
    );
  };

  if (showAPIBuilder && editingStep?.api_step) {
    return (
      <VisualAPIBuilder
        testStep={editingStep.api_step}
        onSave={handleSaveAPIStep}
        onTest={async (step) => {
          // Handle API test execution
          console.log('Testing API step:', step);
        }}
        onCancel={() => {
          setShowAPIBuilder(false);
          setEditingStep(null);
        }}
      />
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-screen flex flex-col bg-gray-100">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <input
                type="text"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                placeholder="Hybrid Test Name"
                className="text-lg font-semibold bg-transparent border-none outline-none text-gray-900 placeholder-gray-400"
              />
              <input
                type="text"
                value={testDescription}
                onChange={(e) => setTestDescription(e.target.value)}
                placeholder="Test Description"
                className="block text-sm bg-transparent border-none outline-none text-gray-600 placeholder-gray-400 mt-1"
              />
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={onRun}
                className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                <Play className="w-4 h-4" />
                <span>Run Test</span>
              </button>
              <button
                onClick={handleSave}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Save</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex">
          {/* Action Palette Sidebar */}
          <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Action Palette</h2>
              <p className="text-sm text-gray-600 mb-3">
                Drag UI and API actions to build comprehensive test flows
              </p>
              
              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-3">
                {filteredActions.map(action => (
                  <HybridActionPaletteItem key={action.id} item={action} />
                ))}
              </div>
            </div>
          </div>

          {/* Test Canvas */}
          <HybridTestCanvas />
        </div>

        {/* Status Bar */}
        <div className="bg-white border-t border-gray-200 px-6 py-3">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-4">
              <span>{testSteps.length} steps</span>
              <span>•</span>
              <span>{testSteps.filter(s => s.type === 'ui').length} UI actions</span>
              <span>•</span>
              <span>{testSteps.filter(s => s.type === 'api').length} API calls</span>
            </div>
            
            <div className="text-xs text-gray-500">
              Drag actions to build your hybrid test flow
            </div>
          </div>
        </div>
      </div>
    </DndProvider>
  );
};