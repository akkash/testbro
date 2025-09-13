/**
 * Visual Test Builder Interface
 * Drag-and-drop test creation with visual flow canvas
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Modal,
  FormField,
  LoadingSpinner,
  ErrorState,
  StatusBadge,
  Separator
} from '@/components/ui';
import {
  PlayIcon,
  PauseIcon,
  StopIcon,
  SaveAsIcon,
  ArrowLeftIcon,
  EyeIcon,
  CogIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  PlusIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';

// Test Builder Components
import TestFlowCanvas from './components/TestFlowCanvas';
import ComponentPalette from './components/ComponentPalette';
import StepConfigPanel from './components/StepConfigPanel';
import TestPreview from './components/TestPreview';
import FlowValidation from './components/FlowValidation';

// Types
export interface TestStep {
  id: string;
  type: 'action' | 'assertion' | 'wait' | 'navigation' | 'data';
  action: string;
  selector?: string;
  value?: string;
  condition?: string;
  timeout?: number;
  description: string;
  position: {
    x: number;
    y: number;
  };
  connections: string[];
  config: Record<string, any>;
  status?: 'pending' | 'running' | 'passed' | 'failed';
}

export interface TestFlow {
  id: string;
  name: string;
  description: string;
  projectId: string;
  steps: TestStep[];
  variables: Record<string, any>;
  settings: {
    timeout: number;
    retries: number;
    waitBetweenSteps: number;
    screenshot: boolean;
    video: boolean;
  };
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
}

export default function TestBuilderInterface() {
  const { projectId, flowId } = useParams();
  const navigate = useNavigate();
  const isEdit = !!flowId;

  // Main state
  const [testFlow, setTestFlow] = useState<TestFlow>({
    id: flowId || 'new-flow',
    name: isEdit ? 'Loading...' : 'New Test Flow',
    description: '',
    projectId: projectId || '',
    steps: [],
    variables: {},
    settings: {
      timeout: 30,
      retries: 3,
      waitBetweenSteps: 1,
      screenshot: true,
      video: false
    },
    validation: {
      isValid: true,
      errors: [],
      warnings: []
    }
  });

  // UI State
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [isDragMode, setIsDragMode] = useState(false);
  const [canvasZoom, setCanvasZoom] = useState(1);
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Modal states
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showImportExport, setShowImportExport] = useState(false);

  // Test execution state
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionStep, setExecutionStep] = useState<string | null>(null);

  // Refs
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing test flow
  useEffect(() => {
    if (isEdit) {
      loadTestFlow();
    }
  }, [flowId]);

  const loadTestFlow = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock test flow data
      const mockFlow: TestFlow = {
        id: flowId!,
        name: 'E-commerce Checkout Test',
        description: 'Test the complete checkout process including product selection, cart management, and payment.',
        projectId: projectId!,
        steps: [
          {
            id: 'step-1',
            type: 'navigation',
            action: 'navigate',
            selector: '',
            value: 'https://example.com',
            description: 'Navigate to homepage',
            position: { x: 100, y: 100 },
            connections: ['step-2'],
            config: {
              waitForLoad: true,
              timeout: 10
            }
          },
          {
            id: 'step-2',
            type: 'action',
            action: 'click',
            selector: '[data-testid="product-1"]',
            description: 'Click on first product',
            position: { x: 300, y: 100 },
            connections: ['step-3'],
            config: {
              scrollToElement: true
            }
          },
          {
            id: 'step-3',
            type: 'assertion',
            action: 'assert_visible',
            selector: '[data-testid="add-to-cart"]',
            description: 'Verify add to cart button is visible',
            position: { x: 500, y: 100 },
            connections: ['step-4'],
            config: {
              timeout: 5
            }
          },
          {
            id: 'step-4',
            type: 'action',
            action: 'click',
            selector: '[data-testid="add-to-cart"]',
            description: 'Add product to cart',
            position: { x: 700, y: 100 },
            connections: [],
            config: {}
          }
        ],
        variables: {
          baseUrl: 'https://example.com',
          testUser: 'test@example.com'
        },
        settings: {
          timeout: 30,
          retries: 3,
          waitBetweenSteps: 1,
          screenshot: true,
          video: true
        },
        validation: {
          isValid: true,
          errors: [],
          warnings: ['Consider adding error handling steps']
        }
      };

      setTestFlow(mockFlow);
    } catch (error) {
      console.error('Failed to load test flow:', error);
      toast.error('Failed to load test flow');
    } finally {
      setLoading(false);
    }
  };

  // Handle step operations
  const addStep = useCallback((stepType: TestStep['type'], position: { x: number, y: number }) => {
    const newStep: TestStep = {
      id: `step-${Date.now()}`,
      type: stepType,
      action: getDefaultAction(stepType),
      description: getDefaultDescription(stepType),
      position,
      connections: [],
      config: {}
    };

    setTestFlow(prev => ({
      ...prev,
      steps: [...prev.steps, newStep]
    }));

    setSelectedStepId(newStep.id);
    toast.success('Step added successfully');
  }, []);

  const updateStep = useCallback((stepId: string, updates: Partial<TestStep>) => {
    setTestFlow(prev => ({
      ...prev,
      steps: prev.steps.map(step =>
        step.id === stepId ? { ...step, ...updates } : step
      )
    }));
  }, []);

  const deleteStep = useCallback((stepId: string) => {
    setTestFlow(prev => ({
      ...prev,
      steps: prev.steps.filter(step => step.id !== stepId)
        .map(step => ({
          ...step,
          connections: step.connections.filter(conn => conn !== stepId)
        }))
    }));
    
    if (selectedStepId === stepId) {
      setSelectedStepId(null);
    }
    
    toast.success('Step deleted successfully');
  }, [selectedStepId]);

  const connectSteps = useCallback((fromId: string, toId: string) => {
    setTestFlow(prev => ({
      ...prev,
      steps: prev.steps.map(step =>
        step.id === fromId 
          ? { ...step, connections: [...step.connections, toId] }
          : step
      )
    }));
  }, []);

  const duplicateStep = useCallback((stepId: string) => {
    const step = testFlow.steps.find(s => s.id === stepId);
    if (!step) return;

    const duplicatedStep: TestStep = {
      ...step,
      id: `step-${Date.now()}`,
      description: `${step.description} (copy)`,
      position: {
        x: step.position.x + 50,
        y: step.position.y + 50
      },
      connections: []
    };

    setTestFlow(prev => ({
      ...prev,
      steps: [...prev.steps, duplicatedStep]
    }));

    toast.success('Step duplicated successfully');
  }, [testFlow.steps]);

  // Validation
  const validateFlow = useCallback(() => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for orphaned steps
    const connectedSteps = new Set(testFlow.steps.flatMap(step => step.connections));
    const orphanedSteps = testFlow.steps.filter(step => 
      !connectedSteps.has(step.id) && testFlow.steps.indexOf(step) > 0
    );

    if (orphanedSteps.length > 0) {
      warnings.push(`${orphanedSteps.length} step(s) are not connected to the flow`);
    }

    // Check for missing selectors
    const stepsNeedingSelectors = testFlow.steps.filter(step => 
      ['action', 'assertion'].includes(step.type) && !step.selector?.trim()
    );

    if (stepsNeedingSelectors.length > 0) {
      errors.push(`${stepsNeedingSelectors.length} step(s) are missing selectors`);
    }

    // Check for circular dependencies
    const hasCircularDependency = checkCircularDependencies(testFlow.steps);
    if (hasCircularDependency) {
      errors.push('Flow contains circular dependencies');
    }

    const validation = {
      isValid: errors.length === 0,
      errors,
      warnings
    };

    setTestFlow(prev => ({ ...prev, validation }));
    setValidationErrors(errors);

    return validation;
  }, [testFlow.steps]);

  // Save test flow
  const saveTestFlow = async () => {
    setSaving(true);
    try {
      // Validate before saving
      const validation = validateFlow();
      if (!validation.isValid) {
        toast.error('Cannot save test flow with validation errors');
        return;
      }

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast.success('Test flow saved successfully');
      setShowSaveModal(false);
    } catch (error) {
      console.error('Failed to save test flow:', error);
      toast.error('Failed to save test flow');
    } finally {
      setSaving(false);
    }
  };

  // Execute test flow
  const executeTestFlow = async () => {
    const validation = validateFlow();
    if (!validation.isValid) {
      toast.error('Cannot execute test flow with validation errors');
      return;
    }

    setIsExecuting(true);
    
    try {
      for (const step of testFlow.steps) {
        setExecutionStep(step.id);
        
        // Update step status
        updateStep(step.id, { status: 'running' });
        
        // Simulate step execution
        await new Promise(resolve => 
          setTimeout(resolve, Math.random() * 2000 + 1000)
        );
        
        // Random success/failure for demo
        const success = Math.random() > 0.2;
        updateStep(step.id, { 
          status: success ? 'passed' : 'failed' 
        });
        
        if (!success) {
          toast.error(`Step "${step.description}" failed`);
          break;
        }
      }
      
      toast.success('Test flow executed successfully');
    } catch (error) {
      console.error('Test execution failed:', error);
      toast.error('Test execution failed');
    } finally {
      setIsExecuting(false);
      setExecutionStep(null);
    }
  };

  // Export test flow
  const exportTestFlow = () => {
    const exportData = {
      ...testFlow,
      exportedAt: new Date().toISOString(),
      version: '1.0.0'
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${testFlow.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    toast.success('Test flow exported successfully');
  };

  // Import test flow
  const importTestFlow = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedFlow = JSON.parse(e.target?.result as string);
        
        // Validate imported data
        if (!importedFlow.steps || !Array.isArray(importedFlow.steps)) {
          throw new Error('Invalid test flow format');
        }

        setTestFlow({
          ...importedFlow,
          id: flowId || 'new-flow',
          projectId: projectId || ''
        });
        
        toast.success('Test flow imported successfully');
      } catch (error) {
        console.error('Import failed:', error);
        toast.error('Failed to import test flow');
      }
    };
    
    reader.readAsText(file);
  };

  // Helper functions
  const getDefaultAction = (stepType: TestStep['type']): string => {
    switch (stepType) {
      case 'navigation': return 'navigate';
      case 'action': return 'click';
      case 'assertion': return 'assert_visible';
      case 'wait': return 'wait';
      case 'data': return 'extract_text';
      default: return 'click';
    }
  };

  const getDefaultDescription = (stepType: TestStep['type']): string => {
    switch (stepType) {
      case 'navigation': return 'Navigate to page';
      case 'action': return 'Perform action';
      case 'assertion': return 'Verify condition';
      case 'wait': return 'Wait for condition';
      case 'data': return 'Extract data';
      default: return 'New step';
    }
  };

  const checkCircularDependencies = (steps: TestStep[]): boolean => {
    // Simplified circular dependency check
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (stepId: string): boolean => {
      visited.add(stepId);
      recursionStack.add(stepId);

      const step = steps.find(s => s.id === stepId);
      if (!step) return false;

      for (const connection of step.connections) {
        if (!visited.has(connection)) {
          if (hasCycle(connection)) return true;
        } else if (recursionStack.has(connection)) {
          return true;
        }
      }

      recursionStack.delete(stepId);
      return false;
    };

    return steps.some(step => !visited.has(step.id) && hasCycle(step.id));
  };

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate(`/projects/${projectId}`)}
              className="p-2"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </Button>
            
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {testFlow.name}
              </h1>
              <div className="flex items-center gap-4 mt-1">
                <span className="text-sm text-gray-500">
                  {testFlow.steps.length} steps
                </span>
                <StatusBadge 
                  status={testFlow.validation.isValid ? 'success' : 'error'}
                  size="sm"
                >
                  {testFlow.validation.isValid ? 'Valid' : 'Has Errors'}
                </StatusBadge>
                {isExecuting && (
                  <StatusBadge status="running" size="sm" animated>
                    Executing
                  </StatusBadge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <div className="flex items-center gap-2 text-red-600">
                <ExclamationTriangleIcon className="w-5 h-5" />
                <span className="text-sm">
                  {validationErrors.length} error(s)
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <Button
              variant="outline"
              onClick={() => setShowImportExport(true)}
              disabled={isExecuting}
            >
              <DocumentDuplicateIcon className="w-4 h-4 mr-2" />
              Import/Export
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setShowPreview(true)}
              disabled={testFlow.steps.length === 0}
            >
              <EyeIcon className="w-4 h-4 mr-2" />
              Preview
            </Button>

            <Button
              variant="outline"
              onClick={() => setShowSettingsModal(true)}
            >
              <CogIcon className="w-4 h-4 mr-2" />
              Settings
            </Button>

            <Button
              onClick={executeTestFlow}
              disabled={isExecuting || !testFlow.validation.isValid}
              loading={isExecuting}
            >
              <PlayIcon className="w-4 h-4 mr-2" />
              {isExecuting ? 'Executing...' : 'Run Test'}
            </Button>

            <Button
              onClick={() => setShowSaveModal(true)}
              loading={saving}
              disabled={saving}
            >
              <SaveAsIcon className="w-4 h-4 mr-2" />
              Save
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Component Palette */}
        <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
          <ComponentPalette
            onAddStep={addStep}
            disabled={isExecuting}
          />
        </div>

        {/* Canvas Area */}
        <div className="flex-1 relative overflow-hidden">
          <TestFlowCanvas
            ref={canvasRef}
            testFlow={testFlow}
            selectedStepId={selectedStepId}
            executionStep={executionStep}
            zoom={canvasZoom}
            offset={canvasOffset}
            isDragMode={isDragMode}
            onStepSelect={setSelectedStepId}
            onStepUpdate={updateStep}
            onStepDelete={deleteStep}
            onStepDuplicate={duplicateStep}
            onStepsConnect={connectSteps}
            onZoomChange={setCanvasZoom}
            onOffsetChange={setCanvasOffset}
            disabled={isExecuting}
          />

          {/* Canvas Controls */}
          <div className="absolute bottom-4 left-4 flex flex-col gap-2">
            <div className="bg-white border border-gray-200 rounded-lg p-2 shadow-sm">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCanvasZoom(prev => Math.min(2, prev + 0.1))}
                  disabled={isExecuting}
                >
                  +
                </Button>
                <span className="text-sm font-mono px-2">
                  {Math.round(canvasZoom * 100)}%
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCanvasZoom(prev => Math.max(0.5, prev - 0.1))}
                  disabled={isExecuting}
                >
                  -
                </Button>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCanvasZoom(1);
                setCanvasOffset({ x: 0, y: 0 });
              }}
              disabled={isExecuting}
            >
              <ArrowPathIcon className="w-4 h-4 mr-2" />
              Reset View
            </Button>
          </div>
        </div>

        {/* Step Configuration Panel */}
        {selectedStepId && (
          <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
            <StepConfigPanel
              step={testFlow.steps.find(s => s.id === selectedStepId)!}
              onUpdate={(updates) => updateStep(selectedStepId, updates)}
              onClose={() => setSelectedStepId(null)}
              disabled={isExecuting}
            />
          </div>
        )}
      </div>

      {/* Settings Modal */}
      <Modal
        open={showSettingsModal}
        onOpenChange={setShowSettingsModal}
        title="Test Flow Settings"
        description="Configure test execution settings"
        size="lg"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              type="number"
              name="timeout"
              label="Default Timeout (seconds)"
              value={testFlow.settings.timeout}
              onChange={(value) => setTestFlow(prev => ({
                ...prev,
                settings: { ...prev.settings, timeout: Number(value) }
              }))}
              min={1}
              max={300}
            />

            <FormField
              type="number"
              name="retries"
              label="Retry Count"
              value={testFlow.settings.retries}
              onChange={(value) => setTestFlow(prev => ({
                ...prev,
                settings: { ...prev.settings, retries: Number(value) }
              }))}
              min={0}
              max={10}
            />
          </div>

          <FormField
            type="number"
            name="waitBetweenSteps"
            label="Wait Between Steps (seconds)"
            value={testFlow.settings.waitBetweenSteps}
            onChange={(value) => setTestFlow(prev => ({
              ...prev,
              settings: { ...prev.settings, waitBetweenSteps: Number(value) }
            }))}
            min={0}
            max={10}
            step={0.1}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              type="switch"
              name="screenshot"
              label="Take Screenshots"
              value={testFlow.settings.screenshot}
              onChange={(value) => setTestFlow(prev => ({
                ...prev,
                settings: { ...prev.settings, screenshot: Boolean(value) }
              }))}
              description="Capture screenshots during execution"
            />

            <FormField
              type="switch"
              name="video"
              label="Record Video"
              value={testFlow.settings.video}
              onChange={(value) => setTestFlow(prev => ({
                ...prev,
                settings: { ...prev.settings, video: Boolean(value) }
              }))}
              description="Record video of test execution"
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowSettingsModal(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowSettingsModal(false)}>
              Save Settings
            </Button>
          </div>
        </div>
      </Modal>

      {/* Save Modal */}
      <Modal
        open={showSaveModal}
        onOpenChange={setShowSaveModal}
        title="Save Test Flow"
        description="Save the current test flow"
      >
        <div className="space-y-4">
          <FormField
            type="text"
            name="name"
            label="Test Flow Name"
            value={testFlow.name}
            onChange={(value) => setTestFlow(prev => ({ ...prev, name: String(value) }))}
            placeholder="Enter test flow name"
            required
          />

          <FormField
            type="textarea"
            name="description"
            label="Description"
            value={testFlow.description}
            onChange={(value) => setTestFlow(prev => ({ ...prev, description: String(value) }))}
            placeholder="Describe what this test flow does..."
            rows={3}
          />

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowSaveModal(false)}>
              Cancel
            </Button>
            <Button onClick={saveTestFlow} loading={saving}>
              Save Test Flow
            </Button>
          </div>
        </div>
      </Modal>

      {/* Import/Export Modal */}
      <Modal
        open={showImportExport}
        onOpenChange={setShowImportExport}
        title="Import/Export Test Flow"
        description="Import or export test flow configurations"
      >
        <div className="space-y-6">
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Export Test Flow</h4>
            <p className="text-sm text-gray-600">
              Export the current test flow as a JSON file for backup or sharing.
            </p>
            <Button
              onClick={exportTestFlow}
              variant="outline"
              className="w-full"
            >
              <DocumentDuplicateIcon className="w-4 h-4 mr-2" />
              Export as JSON
            </Button>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="text-sm font-medium">Import Test Flow</h4>
            <p className="text-sm text-gray-600">
              Import a previously exported test flow JSON file.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={importTestFlow}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="w-full"
            >
              <DocumentDuplicateIcon className="w-4 h-4 mr-2" />
              Import JSON File
            </Button>
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setShowImportExport(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Preview Modal */}
      <Modal
        open={showPreview}
        onOpenChange={setShowPreview}
        title="Test Flow Preview"
        description="Preview the test flow execution steps"
        size="xl"
      >
        <TestPreview
          testFlow={testFlow}
          onClose={() => setShowPreview(false)}
          onExecute={executeTestFlow}
        />
      </Modal>

      {/* Flow Validation Component */}
      <FlowValidation
        testFlow={testFlow}
        onValidate={validateFlow}
      />
    </div>
  );
}
