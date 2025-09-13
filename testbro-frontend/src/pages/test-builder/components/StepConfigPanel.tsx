/**
 * Step Configuration Panel
 * Panel for configuring individual test step properties
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  FormField,
  Separator
} from '@/components/ui';
import {
  XMarkIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  PlayIcon,
  EyeIcon,
  Cog6ToothIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { TestStep, StepConnection } from '../index';

interface StepConfigPanelProps {
  step: TestStep | null;
  onUpdateStep: (stepId: string, updates: Partial<TestStep>) => void;
  onDeleteStep: (stepId: string) => void;
  onDuplicateStep: (stepId: string) => void;
  onClose: () => void;
  onExecuteStep?: (stepId: string) => void;
  connections: StepConnection[];
  isExecuting?: boolean;
}

interface ConfigField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'textarea' | 'boolean' | 'url' | 'file';
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  description?: string;
}

// Configuration fields for different step types
const stepConfigurations: Record<TestStep['type'], ConfigField[]> = {
  navigation: [
    {
      key: 'url',
      label: 'Target URL',
      type: 'url',
      placeholder: 'https://example.com',
      required: true,
      description: 'The URL to navigate to'
    },
    {
      key: 'waitForLoad',
      label: 'Wait for Page Load',
      type: 'boolean',
      description: 'Wait for the page to fully load before continuing'
    },
    {
      key: 'timeout',
      label: 'Timeout (seconds)',
      type: 'number',
      min: 1,
      max: 60,
      description: 'Maximum time to wait for navigation'
    }
  ],
  action: [
    {
      key: 'selector',
      label: 'Element Selector',
      type: 'text',
      placeholder: '#button, .class-name, button[type="submit"]',
      required: true,
      description: 'CSS selector or XPath to identify the element'
    },
    {
      key: 'text',
      label: 'Text Input',
      type: 'text',
      placeholder: 'Text to type or value to set',
      description: 'Text content for type, click, or other actions'
    },
    {
      key: 'scrollToElement',
      label: 'Scroll to Element',
      type: 'boolean',
      description: 'Scroll element into view before interaction'
    },
    {
      key: 'waitForVisible',
      label: 'Wait for Visible',
      type: 'boolean',
      description: 'Wait for element to be visible before interaction'
    },
    {
      key: 'timeout',
      label: 'Timeout (seconds)',
      type: 'number',
      min: 1,
      max: 30,
      description: 'Maximum time to wait for element'
    }
  ],
  assertion: [
    {
      key: 'selector',
      label: 'Element Selector',
      type: 'text',
      placeholder: '#element, .class-name',
      required: true,
      description: 'CSS selector to identify the element to verify'
    },
    {
      key: 'expectedValue',
      label: 'Expected Value',
      type: 'text',
      placeholder: 'Expected text, value, or attribute',
      description: 'The value to compare against'
    },
    {
      key: 'comparison',
      label: 'Comparison Type',
      type: 'select',
      options: [
        { value: 'equals', label: 'Equals' },
        { value: 'contains', label: 'Contains' },
        { value: 'starts_with', label: 'Starts With' },
        { value: 'ends_with', label: 'Ends With' },
        { value: 'regex', label: 'Regular Expression' }
      ],
      description: 'How to compare the actual and expected values'
    },
    {
      key: 'timeout',
      label: 'Timeout (seconds)',
      type: 'number',
      min: 1,
      max: 30,
      description: 'Maximum time to wait for assertion to pass'
    }
  ],
  wait: [
    {
      key: 'condition',
      label: 'Wait Condition',
      type: 'select',
      required: true,
      options: [
        { value: 'time', label: 'Fixed Time' },
        { value: 'visible', label: 'Element Visible' },
        { value: 'hidden', label: 'Element Hidden' },
        { value: 'clickable', label: 'Element Clickable' },
        { value: 'text', label: 'Element Text' },
        { value: 'url', label: 'URL Change' },
        { value: 'load', label: 'Page Load' }
      ],
      description: 'The condition to wait for'
    },
    {
      key: 'selector',
      label: 'Element Selector',
      type: 'text',
      placeholder: '#element, .class-name',
      description: 'CSS selector (required for element-based conditions)'
    },
    {
      key: 'duration',
      label: 'Duration (seconds)',
      type: 'number',
      min: 0.1,
      max: 60,
      description: 'Time to wait (for fixed time waits)'
    },
    {
      key: 'timeout',
      label: 'Timeout (seconds)',
      type: 'number',
      min: 1,
      max: 120,
      description: 'Maximum time to wait for condition'
    }
  ],
  data: [
    {
      key: 'selector',
      label: 'Element Selector',
      type: 'text',
      placeholder: '#element, .class-name',
      description: 'CSS selector to identify the element'
    },
    {
      key: 'variableName',
      label: 'Variable Name',
      type: 'text',
      placeholder: 'extracted_text, user_id',
      description: 'Name to store the extracted data'
    },
    {
      key: 'dataType',
      label: 'Data Type',
      type: 'select',
      options: [
        { value: 'text', label: 'Text Content' },
        { value: 'value', label: 'Input Value' },
        { value: 'attribute', label: 'Attribute' },
        { value: 'url', label: 'Current URL' },
        { value: 'title', label: 'Page Title' }
      ],
      description: 'Type of data to extract'
    },
    {
      key: 'attributeName',
      label: 'Attribute Name',
      type: 'text',
      placeholder: 'href, src, data-id',
      description: 'Attribute name (for attribute extraction)'
    }
  ]
};

export default function StepConfigPanel({
  step,
  onUpdateStep,
  onDeleteStep,
  onDuplicateStep,
  onClose,
  onExecuteStep,
  connections,
  isExecuting
}: StepConfigPanelProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update form data when step changes
  useEffect(() => {
    if (step) {
      setFormData({
        name: step.name,
        description: step.description,
        action: step.action,
        ...step.config
      });
      setErrors({});
    }
  }, [step]);

  if (!step) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center text-gray-500">
          <Cog6ToothIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium">No Step Selected</p>
          <p className="text-sm">Select a step to configure its properties</p>
        </div>
      </div>
    );
  }

  const configFields = stepConfigurations[step.type] || [];

  // Get step connections
  const incomingConnections = connections.filter(c => c.target === step.id);
  const outgoingConnections = connections.filter(c => c.source === step.id);

  // Handle form field changes
  const handleFieldChange = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    
    // Clear error for this field
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: '' }));
    }

    // Update step immediately for basic fields
    if (key === 'name' || key === 'description') {
      onUpdateStep(step.id, { [key]: value });
    }
  };

  // Validate form data
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    configFields.forEach(field => {
      if (field.required && !formData[field.key]) {
        newErrors[field.key] = `${field.label} is required`;
      }

      if (field.type === 'number' && formData[field.key] !== undefined) {
        const num = Number(formData[field.key]);
        if (isNaN(num)) {
          newErrors[field.key] = `${field.label} must be a number`;
        } else if (field.min !== undefined && num < field.min) {
          newErrors[field.key] = `${field.label} must be at least ${field.min}`;
        } else if (field.max !== undefined && num > field.max) {
          newErrors[field.key] = `${field.label} must be at most ${field.max}`;
        }
      }

      if (field.type === 'url' && formData[field.key]) {
        try {
          new URL(formData[field.key]);
        } catch {
          newErrors[field.key] = `${field.label} must be a valid URL`;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save configuration
  const handleSave = () => {
    if (!validateForm()) return;

    const { name, description, action, ...config } = formData;
    onUpdateStep(step.id, {
      name,
      description,
      action,
      config
    });
  };

  // Render form field based on type
  const renderField = (field: ConfigField) => {
    const value = formData[field.key] || '';
    const error = errors[field.key];

    switch (field.type) {
      case 'select':
        return (
          <FormField
            type="select"
            name={field.key}
            label={field.label}
            value={value}
            onChange={(val) => handleFieldChange(field.key, val)}
            options={field.options || []}
            error={error}
            description={field.description}
            required={field.required}
          />
        );

      case 'boolean':
        return (
          <FormField
            type="checkbox"
            name={field.key}
            label={field.label}
            checked={Boolean(value)}
            onChange={(val) => handleFieldChange(field.key, val)}
            description={field.description}
          />
        );

      case 'textarea':
        return (
          <FormField
            type="textarea"
            name={field.key}
            label={field.label}
            value={value}
            onChange={(val) => handleFieldChange(field.key, val)}
            placeholder={field.placeholder}
            error={error}
            description={field.description}
            required={field.required}
          />
        );

      case 'number':
        return (
          <FormField
            type="number"
            name={field.key}
            label={field.label}
            value={value}
            onChange={(val) => handleFieldChange(field.key, val)}
            placeholder={field.placeholder}
            min={field.min}
            max={field.max}
            error={error}
            description={field.description}
            required={field.required}
          />
        );

      default:
        return (
          <FormField
            type={field.type}
            name={field.key}
            label={field.label}
            value={value}
            onChange={(val) => handleFieldChange(field.key, val)}
            placeholder={field.placeholder}
            error={error}
            description={field.description}
            required={field.required}
          />
        );
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${
            step.type === 'navigation' ? 'bg-blue-500' :
            step.type === 'action' ? 'bg-green-500' :
            step.type === 'assertion' ? 'bg-yellow-500' :
            step.type === 'wait' ? 'bg-purple-500' :
            'bg-gray-500'
          }`} />
          <h2 className="text-lg font-semibold text-gray-900">
            Configure Step
          </h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
        >
          <XMarkIcon className="w-4 h-4" />
        </Button>
      </div>

      {/* Step Info */}
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            {step.type} Step
          </span>
          <span className="text-xs text-gray-500">
            ID: {step.id.slice(0, 8)}...
          </span>
        </div>
        
        {/* Connections Info */}
        <div className="flex items-center gap-4 text-xs text-gray-600">
          <span>Inputs: {incomingConnections.length}</span>
          <span>Outputs: {outgoingConnections.length}</span>
        </div>
      </div>

      {/* Configuration Form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Basic Info */}
        <div className="space-y-4">
          <FormField
            type="text"
            name="name"
            label="Step Name"
            value={formData.name || ''}
            onChange={(val) => handleFieldChange('name', val)}
            placeholder="Enter step name"
            required
            description="A descriptive name for this test step"
          />

          <FormField
            type="textarea"
            name="description"
            label="Description"
            value={formData.description || ''}
            onChange={(val) => handleFieldChange('description', val)}
            placeholder="Describe what this step does"
            description="Optional description of the step's purpose"
          />

          <FormField
            type="text"
            name="action"
            label="Action"
            value={formData.action || ''}
            onChange={(val) => handleFieldChange('action', val)}
            placeholder="click, type, navigate, etc."
            required
            description="The action this step performs"
          />
        </div>

        <Separator />

        {/* Step-specific Configuration */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-900">
            Step Configuration
          </h3>
          
          {configFields.length > 0 ? (
            configFields.map(field => (
              <div key={field.key}>
                {renderField(field)}
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">
              No additional configuration required for this step type.
            </p>
          )}
        </div>

        {/* Validation Errors */}
        {Object.keys(errors).length > 0 && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <ExclamationTriangleIcon className="w-4 h-4 text-red-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-red-800">
                  Configuration Errors
                </h4>
                <ul className="text-sm text-red-700 mt-1 space-y-1">
                  {Object.entries(errors).map(([field, error]) => (
                    <li key={field}>• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-gray-200 space-y-3">
        {/* Primary Actions */}
        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            className="flex-1"
            disabled={Object.keys(errors).length > 0}
          >
            Save Changes
          </Button>
          {onExecuteStep && (
            <Button
              variant="outline"
              onClick={() => onExecuteStep(step.id)}
              disabled={isExecuting}
            >
              {isExecuting ? (
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <PlayIcon className="w-4 h-4" />
              )}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => onDuplicateStep(step.id)}
          >
            <DocumentDuplicateIcon className="w-4 h-4" />
          </Button>
        </div>

        {/* Secondary Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <EyeIcon className="w-4 h-4 mr-2" />
            Preview
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onDeleteStep(step.id)}
          >
            <TrashIcon className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
