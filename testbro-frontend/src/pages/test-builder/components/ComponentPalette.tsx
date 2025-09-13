/**
 * Component Palette
 * Draggable components for test actions and steps
 */

import React, { useState } from 'react';
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
  CursorArrowRaysIcon,
  GlobeAltIcon,
  EyeIcon,
  ClockIcon,
  DocumentTextIcon,
  PlusIcon,
  ChevronDownIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { TestStep } from '../index';

interface ComponentPaletteProps {
  onAddStep: (stepType: TestStep['type'], position: { x: number; y: number }) => void;
  disabled?: boolean;
}

interface ActionCategory {
  id: string;
  name: string;
  icon: React.ElementType;
  description: string;
  actions: ActionItem[];
}

interface ActionItem {
  id: string;
  name: string;
  description: string;
  type: TestStep['type'];
  action: string;
  icon?: React.ElementType;
  config?: Record<string, any>;
}

const actionCategories: ActionCategory[] = [
  {
    id: 'navigation',
    name: 'Navigation',
    icon: GlobeAltIcon,
    description: 'Navigate between pages and URLs',
    actions: [
      {
        id: 'navigate',
        name: 'Navigate to URL',
        description: 'Navigate to a specific URL or page',
        type: 'navigation',
        action: 'navigate',
        config: { waitForLoad: true }
      },
      {
        id: 'go-back',
        name: 'Go Back',
        description: 'Navigate to previous page in history',
        type: 'navigation',
        action: 'go_back'
      },
      {
        id: 'go-forward',
        name: 'Go Forward',
        description: 'Navigate to next page in history',
        type: 'navigation',
        action: 'go_forward'
      },
      {
        id: 'reload',
        name: 'Reload Page',
        description: 'Reload the current page',
        type: 'navigation',
        action: 'reload',
        config: { waitForLoad: true }
      }
    ]
  },
  {
    id: 'actions',
    name: 'Actions',
    icon: CursorArrowRaysIcon,
    description: 'Interact with page elements',
    actions: [
      {
        id: 'click',
        name: 'Click Element',
        description: 'Click on a page element',
        type: 'action',
        action: 'click',
        config: { scrollToElement: true }
      },
      {
        id: 'double-click',
        name: 'Double Click',
        description: 'Double click on a page element',
        type: 'action',
        action: 'double_click'
      },
      {
        id: 'right-click',
        name: 'Right Click',
        description: 'Right click on a page element',
        type: 'action',
        action: 'right_click'
      },
      {
        id: 'hover',
        name: 'Hover Element',
        description: 'Hover over a page element',
        type: 'action',
        action: 'hover'
      },
      {
        id: 'type-text',
        name: 'Type Text',
        description: 'Type text into an input field',
        type: 'action',
        action: 'type',
        config: { clearFirst: true }
      },
      {
        id: 'clear-input',
        name: 'Clear Input',
        description: 'Clear the content of an input field',
        type: 'action',
        action: 'clear'
      },
      {
        id: 'select-option',
        name: 'Select Option',
        description: 'Select an option from a dropdown',
        type: 'action',
        action: 'select_option'
      },
      {
        id: 'check-checkbox',
        name: 'Check Checkbox',
        description: 'Check or uncheck a checkbox',
        type: 'action',
        action: 'check'
      },
      {
        id: 'upload-file',
        name: 'Upload File',
        description: 'Upload a file through file input',
        type: 'action',
        action: 'upload_file'
      },
      {
        id: 'scroll',
        name: 'Scroll',
        description: 'Scroll the page or an element',
        type: 'action',
        action: 'scroll',
        config: { behavior: 'smooth' }
      },
      {
        id: 'press-key',
        name: 'Press Key',
        description: 'Press a keyboard key',
        type: 'action',
        action: 'press_key'
      }
    ]
  },
  {
    id: 'assertions',
    name: 'Assertions',
    icon: EyeIcon,
    description: 'Verify page content and state',
    actions: [
      {
        id: 'assert-visible',
        name: 'Assert Visible',
        description: 'Verify an element is visible',
        type: 'assertion',
        action: 'assert_visible',
        config: { timeout: 5 }
      },
      {
        id: 'assert-hidden',
        name: 'Assert Hidden',
        description: 'Verify an element is hidden',
        type: 'assertion',
        action: 'assert_hidden'
      },
      {
        id: 'assert-text',
        name: 'Assert Text',
        description: 'Verify element contains specific text',
        type: 'assertion',
        action: 'assert_text'
      },
      {
        id: 'assert-value',
        name: 'Assert Value',
        description: 'Verify input field has specific value',
        type: 'assertion',
        action: 'assert_value'
      },
      {
        id: 'assert-attribute',
        name: 'Assert Attribute',
        description: 'Verify element has specific attribute value',
        type: 'assertion',
        action: 'assert_attribute'
      },
      {
        id: 'assert-count',
        name: 'Assert Count',
        description: 'Verify number of matching elements',
        type: 'assertion',
        action: 'assert_count'
      },
      {
        id: 'assert-url',
        name: 'Assert URL',
        description: 'Verify current page URL',
        type: 'assertion',
        action: 'assert_url'
      },
      {
        id: 'assert-title',
        name: 'Assert Title',
        description: 'Verify page title',
        type: 'assertion',
        action: 'assert_title'
      },
      {
        id: 'assert-enabled',
        name: 'Assert Enabled',
        description: 'Verify element is enabled/clickable',
        type: 'assertion',
        action: 'assert_enabled'
      },
      {
        id: 'assert-disabled',
        name: 'Assert Disabled',
        description: 'Verify element is disabled',
        type: 'assertion',
        action: 'assert_disabled'
      }
    ]
  },
  {
    id: 'waits',
    name: 'Wait Conditions',
    icon: ClockIcon,
    description: 'Wait for specific conditions',
    actions: [
      {
        id: 'wait-visible',
        name: 'Wait for Visible',
        description: 'Wait until element becomes visible',
        type: 'wait',
        action: 'wait_for_visible',
        config: { timeout: 10 }
      },
      {
        id: 'wait-hidden',
        name: 'Wait for Hidden',
        description: 'Wait until element becomes hidden',
        type: 'wait',
        action: 'wait_for_hidden'
      },
      {
        id: 'wait-text',
        name: 'Wait for Text',
        description: 'Wait for element to contain specific text',
        type: 'wait',
        action: 'wait_for_text'
      },
      {
        id: 'wait-enabled',
        name: 'Wait for Enabled',
        description: 'Wait until element becomes enabled',
        type: 'wait',
        action: 'wait_for_enabled'
      },
      {
        id: 'wait-clickable',
        name: 'Wait for Clickable',
        description: 'Wait until element becomes clickable',
        type: 'wait',
        action: 'wait_for_clickable'
      },
      {
        id: 'wait-time',
        name: 'Wait Time',
        description: 'Wait for a specific amount of time',
        type: 'wait',
        action: 'wait_time',
        config: { duration: 1 }
      },
      {
        id: 'wait-url',
        name: 'Wait for URL',
        description: 'Wait for URL to change or match pattern',
        type: 'wait',
        action: 'wait_for_url'
      },
      {
        id: 'wait-load',
        name: 'Wait for Load',
        description: 'Wait for page to fully load',
        type: 'wait',
        action: 'wait_for_load',
        config: { networkIdle: true }
      }
    ]
  },
  {
    id: 'data',
    name: 'Data Operations',
    icon: DocumentTextIcon,
    description: 'Extract and manipulate data',
    actions: [
      {
        id: 'extract-text',
        name: 'Extract Text',
        description: 'Extract text content from an element',
        type: 'data',
        action: 'extract_text'
      },
      {
        id: 'extract-attribute',
        name: 'Extract Attribute',
        description: 'Extract attribute value from an element',
        type: 'data',
        action: 'extract_attribute'
      },
      {
        id: 'extract-value',
        name: 'Extract Input Value',
        description: 'Extract value from an input field',
        type: 'data',
        action: 'extract_value'
      },
      {
        id: 'extract-url',
        name: 'Extract Current URL',
        description: 'Extract the current page URL',
        type: 'data',
        action: 'extract_url'
      },
      {
        id: 'extract-title',
        name: 'Extract Page Title',
        description: 'Extract the page title',
        type: 'data',
        action: 'extract_title'
      },
      {
        id: 'set-variable',
        name: 'Set Variable',
        description: 'Set a variable value',
        type: 'data',
        action: 'set_variable'
      },
      {
        id: 'generate-data',
        name: 'Generate Test Data',
        description: 'Generate random test data',
        type: 'data',
        action: 'generate_data',
        config: { type: 'email' }
      }
    ]
  }
];

export default function ComponentPalette({ onAddStep, disabled }: ComponentPaletteProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['navigation', 'actions'])
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [draggedAction, setDraggedAction] = useState<ActionItem | null>(null);

  // Toggle category expansion
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  // Filter actions based on search query
  const filteredCategories = React.useMemo(() => {
    if (!searchQuery.trim()) return actionCategories;

    return actionCategories.map(category => ({
      ...category,
      actions: category.actions.filter(action =>
        action.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        action.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    })).filter(category => category.actions.length > 0);
  }, [searchQuery]);

  // Handle drag start
  const handleDragStart = (e: React.DragEvent, action: ActionItem) => {
    setDraggedAction(action);
    e.dataTransfer.setData('application/json', JSON.stringify(action));
    e.dataTransfer.effectAllowed = 'copy';
  };

  // Handle drag end
  const handleDragEnd = () => {
    setDraggedAction(null);
  };

  // Handle add step with default position
  const handleAddStep = (action: ActionItem) => {
    const position = {
      x: Math.random() * 400 + 100,
      y: Math.random() * 300 + 100
    };
    onAddStep(action.type, position);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Test Actions
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Drag actions to the canvas or click to add them
        </p>
        
        {/* Search */}
        <FormField
          type="search"
          name="search"
          value={searchQuery}
          onChange={(value) => setSearchQuery(String(value))}
          placeholder="Search actions..."
          disabled={disabled}
        />
      </div>

      {/* Categories */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {filteredCategories.map(category => {
          const isExpanded = expandedCategories.has(category.id);
          const Icon = category.icon;

          return (
            <div key={category.id} className="space-y-2">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category.id)}
                className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                disabled={disabled}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5 text-gray-600" />
                  <div className="text-left">
                    <h3 className="text-sm font-medium text-gray-900">
                      {category.name}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {category.description}
                    </p>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronDownIcon className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                )}
              </button>

              {/* Category Actions */}
              {isExpanded && (
                <div className="space-y-1 ml-4">
                  {category.actions.map(action => (
                    <div
                      key={action.id}
                      draggable={!disabled}
                      onDragStart={(e) => handleDragStart(e, action)}
                      onDragEnd={handleDragEnd}
                      className={`group flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg transition-all cursor-grab active:cursor-grabbing hover:border-blue-300 hover:shadow-sm ${
                        disabled ? 'opacity-50 cursor-not-allowed' : ''
                      } ${
                        draggedAction?.id === action.id ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            action.type === 'navigation' ? 'bg-blue-500' :
                            action.type === 'action' ? 'bg-green-500' :
                            action.type === 'assertion' ? 'bg-yellow-500' :
                            action.type === 'wait' ? 'bg-purple-500' :
                            'bg-gray-500'
                          }`} />
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {action.name}
                          </h4>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {action.description}
                        </p>
                      </div>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleAddStep(action)}
                        disabled={disabled}
                        className="opacity-0 group-hover:opacity-100 transition-opacity ml-2"
                      >
                        <PlusIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {filteredCategories.length === 0 && searchQuery && (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">
              No actions found matching "{searchQuery}"
            </p>
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="p-4 border-t border-gray-200 bg-blue-50">
        <div className="text-xs text-blue-800 space-y-1">
          <p className="font-medium">💡 Tips:</p>
          <p>• Drag actions to the canvas to create test steps</p>
          <p>• Click the + button to add to a random position</p>
          <p>• Connect steps to create test flows</p>
        </div>
      </div>
    </div>
  );
}
