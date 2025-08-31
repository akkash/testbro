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
  Download as SaveIcon,
  Plus,
  Copy,
  Trash2,
  Settings,
  Zap
} from 'lucide-react';
import { NoCodeTestStep, TestCase } from '../../types';

interface ActionPaletteItem {
  id: string;
  type: 'click' | 'type' | 'verify' | 'navigate' | 'wait' | 'select' | 'scroll' | 'hover';
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  category: 'interaction' | 'input' | 'verification' | 'navigation' | 'timing';
  defaultValue?: string;
}

interface DragItem {
  id: string;
  type: string;
  actionType: string;
  index?: number;
}

interface TestStepNode extends NoCodeTestStep {
  position: { x: number; y: number };
  connections?: string[];
}

const actionPalette: ActionPaletteItem[] = [
  // Interaction Actions
  {
    id: 'click',
    type: 'click',
    icon: AlertTriangle,
    label: 'Click',
    description: 'Click on an element',
    category: 'interaction'
  },
  {
    id: 'hover',
    type: 'hover',
    icon: ArrowRight,
    label: 'Hover',
    description: 'Hover over an element',
    category: 'interaction'
  },
  // Input Actions
  {
    id: 'type',
    type: 'type',
    icon: RefreshCw,
    label: 'Type Text',
    description: 'Enter text into a field',
    category: 'input',
    defaultValue: 'Enter text here...'
  },
  {
    id: 'select',
    type: 'select',
    icon: ChevronDown,
    label: 'Select Option',
    description: 'Select from dropdown',
    category: 'input'
  },
  // Verification Actions
  {
    id: 'verify',
    type: 'verify',
    icon: Eye,
    label: 'Verify',
    description: 'Check element exists or content',
    category: 'verification'
  },
  // Navigation Actions
  {
    id: 'navigate',
    type: 'navigate',
    icon: Search,
    label: 'Navigate',
    description: 'Go to a URL',
    category: 'navigation',
    defaultValue: 'https://example.com'
  },
  {
    id: 'scroll',
    type: 'scroll',
    icon: FileText,
    label: 'Scroll',
    description: 'Scroll on page',
    category: 'navigation'
  },
  // Timing Actions
  {
    id: 'wait',
    type: 'wait',
    icon: Clock,
    label: 'Wait',
    description: 'Wait for specified time',
    category: 'timing',
    defaultValue: '2000'
  }
];

const ActionPaletteItem: React.FC<{ item: ActionPaletteItem }> = ({ item }) => {
  const [, drag] = useDrag(() => ({
    type: 'ACTION_ITEM',
    item: { 
      id: item.id, 
      type: 'ACTION_ITEM',
      actionType: item.type 
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  const Icon = item.icon;

  return (
    <div
      ref={(node) => {
        if (node) {
          drag(node);
        }
      }}
      className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md cursor-move transition-all duration-200 group"
    >
      <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center group-hover:bg-blue-100">
        <Icon className="w-4 h-4 text-blue-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{item.label}</p>
        <p className="text-xs text-gray-500 truncate">{item.description}</p>
      </div>
    </div>
  );
};

const TestStepCard: React.FC<{
  step: TestStepNode;
  index: number;
  onUpdate: (index: number, updates: Partial<TestStepNode>) => void;
  onDelete: (index: number) => void;
  onDuplicate: (index: number) => void;
}> = ({ step, index, onUpdate, onDelete, onDuplicate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(step.value || '');
  const [editDescription, setEditDescription] = useState(step.element_description || '');

  const [, drag] = useDrag(() => ({
    type: 'TEST_STEP',
    item: { 
      id: step.id, 
      type: 'TEST_STEP',
      index 
    },
  }));

  const [, drop] = useDrop(() => ({
    accept: 'TEST_STEP',
    hover: (item: DragItem, monitor: DropTargetMonitor) => {
      if (!monitor.isOver({ shallow: true })) return;
      
      const dragIndex = item.index;
      const hoverIndex = index;

      if (dragIndex === hoverIndex || dragIndex === undefined) return;

      // Move the step
      // This would be handled by the parent component
    },
  }));

  const actionItem = actionPalette.find(a => a.type === step.action_type);
  const Icon = actionItem?.icon || AlertTriangle;

  const handleSave = () => {
    onUpdate(index, {
      value: editValue,
      element_description: editDescription,
      updated_at: new Date().toISOString()
    });
    setIsEditing(false);
  };

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
          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
            <Icon className="w-4 h-4 text-blue-600" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full font-medium">
                Step {step.order}
              </span>
              <span className="text-xs text-gray-500 capitalize">
                {step.action_type}
              </span>
              {step.confidence_score && (
                <span className={`text-xs px-2 py-1 rounded-full ${
                  step.confidence_score > 0.8 
                    ? 'bg-green-100 text-green-700'
                    : step.confidence_score > 0.6
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {Math.round(step.confidence_score * 100)}% confidence
                </span>
              )}
            </div>
            
            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded px-2 py-1 resize-none"
                  placeholder="Describe what this step does..."
                  rows={2}
                />
                {(step.action_type === 'type' || step.action_type === 'navigate' || step.action_type === 'wait') && (
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded px-2 py-1"
                    placeholder={step.action_type === 'wait' ? 'Milliseconds' : 'Value'}
                  />
                )}
                <div className="flex space-x-2">
                  <button
                    onClick={handleSave}
                    className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="text-xs bg-gray-300 text-gray-700 px-3 py-1 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-900 mb-1">
                  {step.natural_language || `${step.action_type} on element`}
                </p>
                <p className="text-xs text-gray-500 mb-1">
                  Target: {step.element_description || 'No element specified'}
                </p>
                {step.value && (
                  <p className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    Value: {step.value}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="flex space-x-1">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="p-1 text-gray-400 hover:text-blue-600 rounded"
              title="Edit step"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDuplicate(index)}
              className="p-1 text-gray-400 hover:text-green-600 rounded"
              title="Duplicate step"
            >
              <Zap className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(index)}
              className="p-1 text-gray-400 hover:text-red-600 rounded"
              title="Delete step"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {step.user_verified === false && (
        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-xs text-yellow-800">
            ⚠️ This step needs verification. Review and update if necessary.
          </p>
        </div>
      )}
    </div>
  );
};

const TestCanvas: React.FC<{
  steps: TestStepNode[];
  onAddStep: (actionType: string, position: { x: number; y: number }) => void;
  onUpdateStep: (index: number, updates: Partial<TestStepNode>) => void;
  onDeleteStep: (index: number) => void;
  onDuplicateStep: (index: number) => void;
  onReorderSteps: (dragIndex: number, hoverIndex: number) => void;
}> = ({ steps, onAddStep, onUpdateStep, onDeleteStep, onDuplicateStep }) => {
  const [, drop] = useDrop(() => ({
    accept: ['ACTION_ITEM', 'TEST_STEP'],
    drop: (item: DragItem, monitor) => {
      if (item.type === 'ACTION_ITEM') {
        const clientOffset = monitor.getClientOffset();
        
        if (clientOffset) {
          onAddStep(item.actionType, {
            x: clientOffset.x,
            y: clientOffset.y
          });
        }
      }
    },
  }));

  return (
    <div
      ref={(node) => {
        if (node) {
          drop(node);
        }
      }}
      className="flex-1 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 min-h-[600px] relative overflow-auto p-6"
    >
      {steps.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <ArrowRight className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Build Your Test Visually
            </h3>
            <p className="text-gray-500 max-w-md">
              Drag actions from the palette to create test steps. 
              Connect and arrange them to build your test flow.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {steps.map((step, index) => (
            <TestStepCard
              key={step.id || index}
              step={step}
              index={index}
              onUpdate={onUpdateStep}
              onDelete={onDeleteStep}
              onDuplicate={onDuplicateStep}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const VisualTestBuilder: React.FC<{
  testCase?: TestCase;
  onSave: (testCase: Partial<TestCase>) => void;
  onRun: () => void;
}> = ({ testCase, onSave, onRun }) => {
  const [testSteps, setTestSteps] = useState<TestStepNode[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [testName, setTestName] = useState(testCase?.name || '');
  const [testDescription, setTestDescription] = useState(testCase?.description || '');
  const [history, setHistory] = useState<TestStepNode[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Recording service would be used here if available
  // const { recordingService } = useNoCodeRecording();

  // Initialize test steps from test case
  useEffect(() => {
    if (testCase?.steps) {
      const stepsWithPositions: TestStepNode[] = testCase.steps.map((step: NoCodeTestStep, index: number) => ({
        ...step,
        position: { x: 50, y: 100 + index * 120 },
        connections: []
      }));
      setTestSteps(stepsWithPositions);
    }
  }, [testCase]);

  const filteredActions = selectedCategory === 'all' 
    ? actionPalette 
    : actionPalette.filter(action => action.category === selectedCategory);

  const categories = [
    { id: 'all', label: 'All Actions' },
    { id: 'interaction', label: 'Interaction' },
    { id: 'input', label: 'Input' },
    { id: 'verification', label: 'Verification' },
    { id: 'navigation', label: 'Navigation' },
    { id: 'timing', label: 'Timing' }
  ];

  const addToHistory = useCallback((newSteps: TestStepNode[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...newSteps]);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const handleAddStep = useCallback((actionType: string, position: { x: number; y: number }) => {
    const actionItem = actionPalette.find(a => a.type === actionType);
    if (!actionItem) return;

    const newStep: TestStepNode = {
      id: `step-${Date.now()}`,
      order: testSteps.length + 1,
      natural_language: `${actionItem.label} action`,
      action_type: actionItem.type,
      element_description: actionItem.description,
      element_selector: '',
      element_alternatives: [],
      value: actionItem.defaultValue || '',
      confidence_score: 0.8,
      user_verified: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      position,
      connections: []
    };

    const updatedSteps = [...testSteps, newStep];
    setTestSteps(updatedSteps);
    addToHistory(updatedSteps);
  }, [testSteps, addToHistory]);

  const handleUpdateStep = useCallback((index: number, updates: Partial<TestStepNode>) => {
    const updatedSteps = testSteps.map((step, i) => 
      i === index ? { ...step, ...updates } : step
    );
    setTestSteps(updatedSteps);
    addToHistory(updatedSteps);
  }, [testSteps, addToHistory]);

  const handleDeleteStep = useCallback((index: number) => {
    const updatedSteps = testSteps.filter((_, i) => i !== index)
      .map((step, i) => ({ ...step, order: i + 1 }));
    setTestSteps(updatedSteps);
    addToHistory(updatedSteps);
  }, [testSteps, addToHistory]);

  const handleDuplicateStep = useCallback((index: number) => {
    const stepToDuplicate = testSteps[index];
    const duplicatedStep: TestStepNode = {
      ...stepToDuplicate,
      id: `step-${Date.now()}`,
      order: stepToDuplicate.order + 1,
      position: {
        x: stepToDuplicate.position.x,
        y: stepToDuplicate.position.y + 120
      }
    };

    const updatedSteps = [
      ...testSteps.slice(0, index + 1),
      duplicatedStep,
      ...testSteps.slice(index + 1).map(step => ({ ...step }))
    ];
    
    setTestSteps(updatedSteps);
    addToHistory(updatedSteps);
  }, [testSteps, addToHistory]);

  const handleReorderSteps = useCallback((dragIndex: number, hoverIndex: number) => {
    const dragStep = testSteps[dragIndex];
    const updatedSteps = [...testSteps];
    updatedSteps.splice(dragIndex, 1);
    updatedSteps.splice(hoverIndex, 0, dragStep);
    
    // Reorder the order property
    const reorderedSteps = updatedSteps.map((step, index) => ({
      ...step,
      order: index + 1
    }));
    
    setTestSteps(reorderedSteps);
    addToHistory(reorderedSteps);
  }, [testSteps, addToHistory]);

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setTestSteps([...history[historyIndex - 1]]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setTestSteps([...history[historyIndex + 1]]);
    }
  };

  const handleSave = () => {
    const testCaseData: Partial<TestCase> = {
      name: testName,
      description: testDescription,
      steps: testSteps.map(({ position, connections, ...step }) => step),
      priority: testCase?.priority || 'medium',
      status: 'active',
      ai_generated: false,
      tags: testCase?.tags || []
    };

    onSave(testCaseData);
  };

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
                placeholder="Test Name"
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
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded"
                title="Undo"
              >
                <Plus className="w-5 h-5" />
              </button>
              <button
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded"
                title="Redo"
              >
                <Copy className="w-5 h-5" />
              </button>
              
              <div className="w-px h-6 bg-gray-300" />
              
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
                <SaveIcon className="w-4 h-4" />
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
              
              {/* Category Filter */}
              <div className="space-y-2">
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
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-3">
                {filteredActions.map(action => (
                  <ActionPaletteItem key={action.id} item={action} />
                ))}
              </div>
            </div>
          </div>

          {/* Test Canvas */}
          <TestCanvas
            steps={testSteps}
            onAddStep={handleAddStep}
            onUpdateStep={handleUpdateStep}
            onDeleteStep={handleDeleteStep}
            onDuplicateStep={handleDuplicateStep}
            onReorderSteps={handleReorderSteps}
          />
        </div>

        {/* Status Bar */}
        <div className="bg-white border-t border-gray-200 px-6 py-3">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-4">
              <span>{testSteps.length} steps</span>
              <span>•</span>
              <span>{testSteps.filter(s => s.user_verified).length} verified</span>
              <span>•</span>
              <span>
                Avg Confidence: {
                  testSteps.length > 0 
                    ? Math.round((testSteps.reduce((sum, step) => sum + (step.confidence_score || 0), 0) / testSteps.length) * 100)
                    : 0
                }%
              </span>
            </div>
            
            <div className="text-xs text-gray-500">
              Drag actions from the palette to build your test
            </div>
          </div>
        </div>
      </div>
    </DndProvider>
  );
};