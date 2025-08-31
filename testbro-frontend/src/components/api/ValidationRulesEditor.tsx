import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Code,
  Hash,
  FileText,
  ChevronDown
} from 'lucide-react';
import { APIValidationRule } from '../../types/apiTesting';

interface ValidationRulesEditorProps {
  validations: APIValidationRule[];
  onChange: (validations: APIValidationRule[]) => void;
}

const VALIDATION_TYPES = [
  {
    type: 'status_code',
    label: 'Status Code',
    icon: Hash,
    description: 'Validate HTTP response status code',
    fields: ['expectedValue']
  },
  {
    type: 'response_time',
    label: 'Response Time',
    icon: Clock,
    description: 'Validate response time is within limit',
    fields: ['maxTime']
  },
  {
    type: 'header_exists',
    label: 'Header Exists',
    icon: FileText,
    description: 'Check if response header exists',
    fields: ['headerName']
  },
  {
    type: 'header_value',
    label: 'Header Value',
    icon: FileText,
    description: 'Validate specific header value',
    fields: ['headerName', 'expectedValue', 'operator']
  },
  {
    type: 'body_contains',
    label: 'Body Contains',
    icon: Code,
    description: 'Check if response body contains text',
    fields: ['expectedValue']
  },
  {
    type: 'json_path',
    label: 'JSON Path',
    icon: Code,
    description: 'Validate value at JSON path',
    fields: ['path', 'expectedValue', 'operator']
  },
  {
    type: 'json_schema',
    label: 'JSON Schema',
    icon: Code,
    description: 'Validate response against JSON schema',
    fields: ['schema']
  }
];

const OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: 'Not Contains' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' }
];

export const ValidationRulesEditor: React.FC<ValidationRulesEditorProps> = ({
  validations,
  onChange
}) => {
  const [showAddRule, setShowAddRule] = useState(false);
  const [selectedRuleType, setSelectedRuleType] = useState<string>('');

  const addValidationRule = () => {
    const ruleType = VALIDATION_TYPES.find(t => t.type === selectedRuleType);
    if (!ruleType) return;

    const newRule: APIValidationRule = {
      id: `validation-${Date.now()}`,
      type: selectedRuleType as any,
      description: ruleType.description,
      expectedValue: '',
      operator: 'equals'
    };

    onChange([...validations, newRule]);
    setShowAddRule(false);
    setSelectedRuleType('');
  };

  const updateValidationRule = (index: number, updates: Partial<APIValidationRule>) => {
    const updatedValidations = validations.map((rule, i) =>
      i === index ? { ...rule, ...updates } : rule
    );
    onChange(updatedValidations);
  };

  const removeValidationRule = (index: number) => {
    onChange(validations.filter((_, i) => i !== index));
  };

  const ValidationRuleCard: React.FC<{ 
    rule: APIValidationRule; 
    index: number 
  }> = ({ rule, index }) => {
    const ruleType = VALIDATION_TYPES.find(t => t.type === rule.type);
    const Icon = ruleType?.icon || CheckCircle;

    return (
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Icon className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-gray-900">{ruleType?.label}</span>
          </div>
          <button
            onClick={() => removeValidationRule(index)}
            className="text-red-500 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <input
              type="text"
              value={rule.description}
              onChange={(e) => updateValidationRule(index, { description: e.target.value })}
              placeholder="Describe what this validation checks"
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
            />
          </div>

          {/* Rule-specific fields */}
          {rule.type === 'status_code' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expected Status Code
              </label>
              <select
                value={rule.expectedValue || ''}
                onChange={(e) => updateValidationRule(index, { expectedValue: parseInt(e.target.value) })}
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
              >
                <option value="">Select status code</option>
                <option value="200">200 - OK</option>
                <option value="201">201 - Created</option>
                <option value="204">204 - No Content</option>
                <option value="400">400 - Bad Request</option>
                <option value="401">401 - Unauthorized</option>
                <option value="403">403 - Forbidden</option>
                <option value="404">404 - Not Found</option>
                <option value="500">500 - Internal Server Error</option>
              </select>
            </div>
          )}

          {rule.type === 'response_time' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Maximum Response Time (ms)
              </label>
              <input
                type="number"
                value={rule.maxTime || ''}
                onChange={(e) => updateValidationRule(index, { maxTime: parseInt(e.target.value) })}
                placeholder="e.g., 5000"
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
              />
            </div>
          )}

          {(rule.type === 'header_exists' || rule.type === 'header_value') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Header Name
              </label>
              <input
                type="text"
                value={rule.headerName || ''}
                onChange={(e) => updateValidationRule(index, { headerName: e.target.value })}
                placeholder="e.g., Content-Type"
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
              />
            </div>
          )}

          {(rule.type === 'header_value' || rule.type === 'body_contains' || rule.type === 'json_path') && (
            <>
              {rule.type === 'json_path' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    JSON Path
                  </label>
                  <input
                    type="text"
                    value={rule.path || ''}
                    onChange={(e) => updateValidationRule(index, { path: e.target.value })}
                    placeholder="e.g., data.users[0].name"
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Operator
                  </label>
                  <select
                    value={rule.operator || 'equals'}
                    onChange={(e) => updateValidationRule(index, { operator: e.target.value as any })}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                  >
                    {OPERATORS.map(op => (
                      <option key={op.value} value={op.value}>
                        {op.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expected Value
                  </label>
                  <input
                    type="text"
                    value={rule.expectedValue || ''}
                    onChange={(e) => updateValidationRule(index, { expectedValue: e.target.value })}
                    placeholder="Expected value"
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                  />
                </div>
              </div>
            </>
          )}

          {rule.type === 'json_schema' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                JSON Schema
              </label>
              <textarea
                value={rule.schema ? JSON.stringify(rule.schema, null, 2) : ''}
                onChange={(e) => {
                  try {
                    const schema = JSON.parse(e.target.value);
                    updateValidationRule(index, { schema });
                  } catch {
                    // Invalid JSON, don't update
                  }
                }}
                placeholder={`{
  "type": "object",
  "properties": {
    "name": {"type": "string"},
    "age": {"type": "number"}
  },
  "required": ["name"]
}`}
                className="w-full h-32 border border-gray-300 rounded px-2 py-1 text-sm font-mono"
              />
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
          <h3 className="text-lg font-semibold text-gray-900">Response Validation Rules</h3>
          <p className="text-sm text-gray-600">
            Define rules to validate the API response meets your expectations
          </p>
        </div>
        <button
          onClick={() => setShowAddRule(true)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Rule</span>
        </button>
      </div>

      {/* Add Rule Modal */}
      {showAddRule && (
        <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
          <h4 className="font-medium text-blue-900 mb-3">Add Validation Rule</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            {VALIDATION_TYPES.map(ruleType => {
              const Icon = ruleType.icon;
              return (
                <button
                  key={ruleType.type}
                  onClick={() => setSelectedRuleType(ruleType.type)}
                  className={`flex items-start space-x-3 p-3 rounded-lg border-2 transition-all ${
                    selectedRuleType === ruleType.type
                      ? 'border-blue-500 bg-white shadow-md'
                      : 'border-gray-200 bg-white hover:border-blue-300'
                  }`}
                >
                  <Icon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
                  <div className="text-left">
                    <div className="font-medium text-gray-900">{ruleType.label}</div>
                    <div className="text-sm text-gray-600">{ruleType.description}</div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex justify-end space-x-2">
            <button
              onClick={() => {
                setShowAddRule(false);
                setSelectedRuleType('');
              }}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={addValidationRule}
              disabled={!selectedRuleType}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Rule
            </button>
          </div>
        </div>
      )}

      {/* Existing Validation Rules */}
      <div className="space-y-3">
        {validations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No validation rules defined</p>
            <p className="text-sm">Add rules to validate the API response</p>
          </div>
        ) : (
          validations.map((rule, index) => (
            <ValidationRuleCard key={rule.id} rule={rule} index={index} />
          ))
        )}
      </div>

      {/* Quick Templates */}
      {validations.length === 0 && (
        <div className="border-t pt-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Quick Templates:</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                const successRule: APIValidationRule = {
                  id: `validation-${Date.now()}`,
                  type: 'status_code',
                  expectedValue: 200,
                  description: 'Verify successful response',
                  operator: 'equals'
                };
                onChange([successRule]);
              }}
              className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded-full hover:bg-green-200"
            >
              Success Response (200)
            </button>
            <button
              onClick={() => {
                const timeRule: APIValidationRule = {
                  id: `validation-${Date.now()}`,
                  type: 'response_time',
                  maxTime: 5000,
                  description: 'Response within 5 seconds',
                  operator: 'equals'
                };
                onChange([timeRule]);
              }}
              className="text-sm bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full hover:bg-yellow-200"
            >
              Fast Response (&lt;5s)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};