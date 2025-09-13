/**
 * Test Flow Preview
 * Component for previewing and validating test flows before execution
 */

import React, { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Separator
} from '@/components/ui';
import {
  PlayIcon,
  PauseIcon,
  StopIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ClockIcon,
  EyeIcon,
  DocumentArrowDownIcon,
  ShareIcon,
  ArrowRightIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { TestStep, StepConnection, TestExecution } from '../index';

interface TestFlowPreviewProps {
  steps: TestStep[];
  connections: StepConnection[];
  execution?: TestExecution;
  onExecuteFlow: () => void;
  onPauseExecution: () => void;
  onStopExecution: () => void;
  onExportFlow: () => void;
  onShareFlow: () => void;
  isExecuting?: boolean;
  isPaused?: boolean;
}

interface FlowValidation {
  isValid: boolean;
  warnings: ValidationIssue[];
  errors: ValidationIssue[];
}

interface ValidationIssue {
  id: string;
  type: 'error' | 'warning';
  message: string;
  stepId?: string;
  suggestion?: string;
}

interface ExecutionStep {
  step: TestStep;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  error?: string;
  result?: any;
}

export default function TestFlowPreview({
  steps,
  connections,
  execution,
  onExecuteFlow,
  onPauseExecution,
  onStopExecution,
  onExportFlow,
  onShareFlow,
  isExecuting = false,
  isPaused = false
}: TestFlowPreviewProps) {
  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(true);

  // Validate the test flow
  const validation = useMemo((): FlowValidation => {
    const warnings: ValidationIssue[] = [];
    const errors: ValidationIssue[] = [];

    // Check if flow has steps
    if (steps.length === 0) {
      errors.push({
        id: 'no-steps',
        type: 'error',
        message: 'Test flow must have at least one step',
        suggestion: 'Add test steps from the component palette'
      });
    }

    // Find entry points (steps with no incoming connections)
    const entryPoints = steps.filter(step => 
      !connections.some(conn => conn.target === step.id)
    );

    if (entryPoints.length === 0 && steps.length > 0) {
      errors.push({
        id: 'no-entry',
        type: 'error',
        message: 'Test flow must have at least one entry point',
        suggestion: 'Ensure at least one step has no incoming connections'
      });
    }

    if (entryPoints.length > 1) {
      warnings.push({
        id: 'multiple-entries',
        type: 'warning',
        message: `Multiple entry points found (${entryPoints.length})`,
        suggestion: 'Consider using a single entry point for clearer flow'
      });
    }

    // Check for orphaned steps
    steps.forEach(step => {
      const hasIncoming = connections.some(conn => conn.target === step.id);
      const hasOutgoing = connections.some(conn => conn.source === step.id);
      
      if (!hasIncoming && !hasOutgoing && steps.length > 1) {
        warnings.push({
          id: `orphaned-${step.id}`,
          type: 'warning',
          message: `Step "${step.name}" is not connected to other steps`,
          stepId: step.id,
          suggestion: 'Connect this step to create a proper flow'
        });
      }
    });

    // Check for circular dependencies
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const detectCycle = (stepId: string): boolean => {
      if (recursionStack.has(stepId)) return true;
      if (visited.has(stepId)) return false;

      visited.add(stepId);
      recursionStack.add(stepId);

      const outgoingConnections = connections.filter(conn => conn.source === stepId);
      for (const conn of outgoingConnections) {
        if (detectCycle(conn.target)) return true;
      }

      recursionStack.delete(stepId);
      return false;
    };

    for (const step of steps) {
      if (detectCycle(step.id)) {
        errors.push({
          id: 'circular-dependency',
          type: 'error',
          message: 'Circular dependency detected in test flow',
          suggestion: 'Remove circular connections to create a valid flow'
        });
        break;
      }
    }

    // Check step configurations
    steps.forEach(step => {
      if (!step.name || step.name.trim() === '') {
        warnings.push({
          id: `no-name-${step.id}`,
          type: 'warning',
          message: `Step of type "${step.type}" has no name`,
          stepId: step.id,
          suggestion: 'Provide a descriptive name for this step'
        });
      }

      if (!step.action || step.action.trim() === '') {
        errors.push({
          id: `no-action-${step.id}`,
          type: 'error',
          message: `Step "${step.name}" has no action defined`,
          stepId: step.id,
          suggestion: 'Configure the action for this step'
        });
      }

      // Validate step-specific requirements
      if (step.type === 'navigation' && !step.config?.url) {
        errors.push({
          id: `no-url-${step.id}`,
          type: 'error',
          message: `Navigation step "${step.name}" has no URL`,
          stepId: step.id,
          suggestion: 'Provide a target URL for navigation'
        });
      }

      if (step.type === 'action' && !step.config?.selector) {
        errors.push({
          id: `no-selector-${step.id}`,
          type: 'error',
          message: `Action step "${step.name}" has no element selector`,
          stepId: step.id,
          suggestion: 'Provide a CSS selector for the target element'
        });
      }

      if (step.type === 'assertion' && (!step.config?.selector || !step.config?.expectedValue)) {
        errors.push({
          id: `incomplete-assertion-${step.id}`,
          type: 'error',
          message: `Assertion step "${step.name}" is incomplete`,
          stepId: step.id,
          suggestion: 'Provide both selector and expected value'
        });
      }
    });

    return {
      isValid: errors.length === 0,
      warnings,
      errors
    };
  }, [steps, connections]);

  // Create execution steps with status
  const executionSteps = useMemo((): ExecutionStep[] => {
    return steps.map(step => {
      const execStep = execution?.steps?.find(es => es.stepId === step.id);
      return {
        step,
        status: execStep?.status || 'pending',
        startTime: execStep?.startTime,
        endTime: execStep?.endTime,
        duration: execStep?.duration,
        error: execStep?.error,
        result: execStep?.result
      };
    });
  }, [steps, execution]);

  // Get execution statistics
  const executionStats = useMemo(() => {
    if (!execution) return null;

    const total = executionSteps.length;
    const completed = executionSteps.filter(s => s.status === 'completed').length;
    const failed = executionSteps.filter(s => s.status === 'failed').length;
    const running = executionSteps.filter(s => s.status === 'running').length;

    return { total, completed, failed, running };
  }, [executionSteps, execution]);

  // Format duration
  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // Get status color
  const getStatusColor = (status: ExecutionStep['status']): string => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'running': return 'text-blue-600 bg-blue-100';
      case 'skipped': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-500 bg-gray-50';
    }
  };

  // Get status icon
  const getStatusIcon = (status: ExecutionStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <XCircleIcon className="w-4 h-4 text-red-600" />;
      case 'running':
        return <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />;
      default:
        return <ClockIcon className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Test Flow Preview
          </h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
            >
              <EyeIcon className="w-4 h-4 mr-2" />
              {showDetails ? 'Hide' : 'Show'} Details
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onExportFlow}
            >
              <DocumentArrowDownIcon className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onShareFlow}
            >
              <ShareIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Flow Statistics */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{steps.length}</div>
            <div className="text-sm text-gray-500">Total Steps</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{connections.length}</div>
            <div className="text-sm text-gray-500">Connections</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{validation.warnings.length}</div>
            <div className="text-sm text-gray-500">Warnings</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{validation.errors.length}</div>
            <div className="text-sm text-gray-500">Errors</div>
          </div>
        </div>

        {/* Execution Statistics */}
        {executionStats && (
          <div className="grid grid-cols-4 gap-4 mb-4 p-3 bg-blue-50 rounded-lg">
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-900">{executionStats.completed}</div>
              <div className="text-xs text-blue-700">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-900">{executionStats.failed}</div>
              <div className="text-xs text-blue-700">Failed</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-900">{executionStats.running}</div>
              <div className="text-xs text-blue-700">Running</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-900">
                {execution?.duration ? formatDuration(execution.duration) : '0s'}
              </div>
              <div className="text-xs text-blue-700">Duration</div>
            </div>
          </div>
        )}

        {/* Validation Status */}
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
            validation.isValid 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {validation.isValid ? (
              <CheckCircleIcon className="w-4 h-4" />
            ) : (
              <XCircleIcon className="w-4 h-4" />
            )}
            {validation.isValid ? 'Valid Flow' : 'Invalid Flow'}
          </div>

          {/* Execution Controls */}
          <div className="flex items-center gap-2 ml-auto">
            {!isExecuting ? (
              <Button
                onClick={onExecuteFlow}
                disabled={!validation.isValid}
                className="flex items-center gap-2"
              >
                <PlayIcon className="w-4 h-4" />
                Execute Flow
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={isPaused ? onExecuteFlow : onPauseExecution}
                  className="flex items-center gap-2"
                >
                  {isPaused ? (
                    <PlayIcon className="w-4 h-4" />
                  ) : (
                    <PauseIcon className="w-4 h-4" />
                  )}
                  {isPaused ? 'Resume' : 'Pause'}
                </Button>
                <Button
                  variant="destructive"
                  onClick={onStopExecution}
                  className="flex items-center gap-2"
                >
                  <StopIcon className="w-4 h-4" />
                  Stop
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Validation Issues */}
        {(validation.errors.length > 0 || validation.warnings.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />
                Flow Validation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {validation.errors.map(error => (
                <div key={error.id} className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <XCircleIcon className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800">{error.message}</p>
                    {error.suggestion && (
                      <p className="text-sm text-red-600 mt-1">{error.suggestion}</p>
                    )}
                  </div>
                </div>
              ))}
              
              {validation.warnings.map(warning => (
                <div key={warning.id} className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-800">{warning.message}</p>
                    {warning.suggestion && (
                      <p className="text-sm text-yellow-600 mt-1">{warning.suggestion}</p>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Execution Flow */}
        {showDetails && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Execution Flow</CardTitle>
              <CardDescription>
                Step-by-step execution preview and status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {executionSteps.length > 0 ? (
                <div className="space-y-2">
                  {executionSteps.map((execStep, index) => (
                    <div
                      key={execStep.step.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                        selectedStep === execStep.step.id
                          ? 'border-blue-300 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedStep(
                        selectedStep === execStep.step.id ? null : execStep.step.id
                      )}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-sm text-gray-500 w-8">
                          {index + 1}.
                        </span>
                        {getStatusIcon(execStep.status)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-gray-900">
                              {execStep.step.name || `${execStep.step.type} Step`}
                            </span>
                            <Badge
                              variant="outline"
                              className={getStatusColor(execStep.status)}
                            >
                              {execStep.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {execStep.step.action} • {execStep.step.type}
                          </p>
                        </div>
                      </div>

                      {execStep.duration && (
                        <span className="text-xs text-gray-500">
                          {formatDuration(execStep.duration)}
                        </span>
                      )}

                      <ArrowRightIcon className="w-4 h-4 text-gray-400" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Cog6ToothIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No steps to preview</p>
                  <p className="text-sm">Add steps to see the execution flow</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Selected Step Details */}
        {selectedStep && showDetails && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Step Details</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const execStep = executionSteps.find(es => es.step.id === selectedStep);
                if (!execStep) return null;

                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Name:</span>
                        <span className="ml-2 text-gray-900">{execStep.step.name}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Type:</span>
                        <span className="ml-2 text-gray-900">{execStep.step.type}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Action:</span>
                        <span className="ml-2 text-gray-900">{execStep.step.action}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Status:</span>
                        <Badge
                          variant="outline"
                          className={`ml-2 ${getStatusColor(execStep.status)}`}
                        >
                          {execStep.status}
                        </Badge>
                      </div>
                    </div>

                    {execStep.step.description && (
                      <div>
                        <span className="font-medium text-gray-700 text-sm">Description:</span>
                        <p className="mt-1 text-sm text-gray-600">{execStep.step.description}</p>
                      </div>
                    )}

                    {Object.keys(execStep.step.config || {}).length > 0 && (
                      <div>
                        <span className="font-medium text-gray-700 text-sm">Configuration:</span>
                        <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                          <pre className="text-xs text-gray-800">
                            {JSON.stringify(execStep.step.config, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}

                    {execStep.error && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <span className="font-medium text-red-800 text-sm">Error:</span>
                        <p className="mt-1 text-sm text-red-700">{execStep.error}</p>
                      </div>
                    )}

                    {execStep.result && (
                      <div>
                        <span className="font-medium text-gray-700 text-sm">Result:</span>
                        <div className="mt-2 p-3 bg-green-50 rounded-lg">
                          <pre className="text-xs text-green-800">
                            {JSON.stringify(execStep.result, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
