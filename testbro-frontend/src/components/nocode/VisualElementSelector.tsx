import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Target, 
  Eye, 
  MousePointer, 
  Crosshair,
  Zap,
  Check,
  X,
  RefreshCw,
  Settings,
  Info,
  Search,
  Filter,
  ChevronDown
} from 'lucide-react';
import { ElementIdentification, DOMElement } from '../../../types';

interface ElementHighlight {
  element: DOMElement;
  confidence: number;
  reason: string;
  isSelected: boolean;
  suggestedSelector: string;
}

interface SelectorSuggestion {
  selector: string;
  type: 'id' | 'class' | 'attribute' | 'text' | 'xpath' | 'css';
  confidence: number;
  stability: number;
  description: string;
}

interface ElementInspectionData {
  tagName: string;
  attributes: Record<string, string>;
  textContent: string;
  boundingBox: DOMElement['bounding_box'];
  computedStyles: Record<string, string>;
  parentChain: string[];
  siblingCount: number;
  isVisible: boolean;
  isInteractable: boolean;
}

export const VisualElementSelector: React.FC<{
  isActive: boolean;
  onElementSelected: (element: ElementIdentification) => void;
  onCancel: () => void;
  targetAction?: 'click' | 'type' | 'hover' | 'verify';
  existingElements?: DOMElement[];
  previewMode?: boolean;
}> = ({ 
  isActive, 
  onElementSelected, 
  onCancel, 
  targetAction = 'click',
  existingElements = [],
  previewMode = false
}) => {
  const [isSelecting, setIsSelecting] = useState(false);
  const [hoveredElement, setHoveredElement] = useState<ElementHighlight | null>(null);
  const [selectedElement, setSelectedElement] = useState<ElementHighlight | null>(null);
  const [selectorSuggestions, setSelectorSuggestions] = useState<SelectorSuggestion[]>([]);
  const [elementInspection, setElementInspection] = useState<ElementInspectionData | null>(null);
  const [highlightedElements, setHighlightedElements] = useState<ElementHighlight[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'interactive' | 'visible' | 'text'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  const overlayRef = useRef<HTMLDivElement>(null);
  const inspectorPanelRef = useRef<HTMLDivElement>(null);

  // Initialize element selection mode
  useEffect(() => {
    if (isActive && !previewMode) {
      setIsSelecting(true);
      document.body.style.cursor = 'crosshair';
    } else {
      setIsSelecting(false);
      document.body.style.cursor = 'default';
    }

    return () => {
      document.body.style.cursor = 'default';
    };
  }, [isActive, previewMode]);

  // Mock function to simulate element detection (would integrate with browser automation)
  const detectElements = useCallback(async (): Promise<DOMElement[]> => {
    // This would integrate with the browser automation service to get real DOM elements
    return [
      {
        selector: '#login-button',
        xpath: '//*[@id="login-button"]',
        tag_name: 'button',
        text_content: 'Log In',
        attributes: { id: 'login-button', class: 'btn btn-primary', type: 'button' },
        bounding_box: { x: 100, y: 200, width: 120, height: 40 },
        is_visible: true,
        is_clickable: true
      },
      {
        selector: '#email-input',
        xpath: '//*[@id="email-input"]',
        tag_name: 'input',
        text_content: '',
        attributes: { id: 'email-input', type: 'email', placeholder: 'Enter your email' },
        bounding_box: { x: 100, y: 150, width: 200, height: 35 },
        is_visible: true,
        is_clickable: true
      },
      {
        selector: '.navigation-menu',
        xpath: '//*[@class="navigation-menu"]',
        tag_name: 'nav',
        text_content: 'Home About Contact',
        attributes: { class: 'navigation-menu' },
        bounding_box: { x: 0, y: 0, width: 100, height: 50 },
        is_visible: true,
        is_clickable: false
      }
    ];
  }, []);

  // Generate intelligent selector suggestions
  const generateSelectorSuggestions = useCallback((element: DOMElement): SelectorSuggestion[] => {
    const suggestions: SelectorSuggestion[] = [];

    // ID selector (highest priority)
    if (element.attributes.id) {
      suggestions.push({
        selector: `#${element.attributes.id}`,
        type: 'id',
        confidence: 0.95,
        stability: 0.9,
        description: 'ID selector - most stable and specific'
      });
    }

    // Data-testid attribute (very high priority for testing)
    if (element.attributes['data-testid']) {
      suggestions.push({
        selector: `[data-testid="${element.attributes['data-testid']}"]`,
        type: 'attribute',
        confidence: 0.98,
        stability: 0.95,
        description: 'Test ID - specifically designed for testing'
      });
    }

    // Aria-label (good for accessibility)
    if (element.attributes['aria-label']) {
      suggestions.push({
        selector: `[aria-label="${element.attributes['aria-label']}"]`,
        type: 'attribute',
        confidence: 0.85,
        stability: 0.8,
        description: 'Aria label - accessible and semantic'
      });
    }

    // Text content (for buttons, links)
    if (element.text_content && ['button', 'a', 'span'].includes(element.tag_name)) {
      suggestions.push({
        selector: `${element.tag_name}:contains("${element.text_content.trim()}")`,
        type: 'text',
        confidence: 0.8,
        stability: 0.7,
        description: 'Text content - readable but may change'
      });
    }

    // Class selector (lower priority)
    if (element.attributes.class) {
      const classes = element.attributes.class.split(' ').filter(c => 
        c.trim() && !c.includes('ng-') && !c.includes('_generated')
      );
      if (classes.length > 0) {
        suggestions.push({
          selector: `.${classes.join('.')}`,
          type: 'class',
          confidence: 0.6,
          stability: 0.6,
          description: 'CSS classes - may change during redesigns'
        });
      }
    }

    // XPath (fallback)
    if (element.xpath) {
      suggestions.push({
        selector: element.xpath,
        type: 'xpath',
        confidence: 0.5,
        stability: 0.4,
        description: 'XPath - precise but brittle to structure changes'
      });
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }, []);

  // Analyze element for inspection
  const analyzeElement = useCallback(async (element: DOMElement): Promise<ElementInspectionData> => {
    // This would integrate with browser automation to get computed styles and detailed info
    return {
      tagName: element.tag_name,
      attributes: element.attributes,
      textContent: element.text_content || '',
      boundingBox: element.bounding_box,
      computedStyles: {
        display: 'block',
        position: 'relative',
        backgroundColor: 'rgb(59, 130, 246)',
        color: 'rgb(255, 255, 255)',
        fontSize: '14px'
      },
      parentChain: ['body', 'main', 'div', element.tag_name],
      siblingCount: 3,
      isVisible: element.is_visible,
      isInteractable: element.is_clickable
    };
  }, []);

  // Handle element hover
  const handleElementHover = useCallback(async (element: DOMElement) => {
    const suggestions = generateSelectorSuggestions(element);
    const inspection = await analyzeElement(element);
    
    const highlight: ElementHighlight = {
      element,
      confidence: suggestions[0]?.confidence || 0.5,
      reason: `Best selector: ${suggestions[0]?.selector || 'Unknown'}`,
      isSelected: false,
      suggestedSelector: suggestions[0]?.selector || element.selector
    };

    setHoveredElement(highlight);
    setSelectorSuggestions(suggestions);
    setElementInspection(inspection);
  }, [generateSelectorSuggestions, analyzeElement]);

  // Handle element selection
  const handleElementSelect = useCallback(async (element: DOMElement) => {
    const suggestions = generateSelectorSuggestions(element);
    const inspection = await analyzeElement(element);
    
    const highlight: ElementHighlight = {
      element,
      confidence: suggestions[0]?.confidence || 0.5,
      reason: `Selected for ${targetAction}`,
      isSelected: true,
      suggestedSelector: suggestions[0]?.selector || element.selector
    };

    setSelectedElement(highlight);
    setSelectorSuggestions(suggestions);
    setElementInspection(inspection);
  }, [generateSelectorSuggestions, analyzeElement, targetAction]);

  // Confirm element selection
  const handleConfirmSelection = useCallback(() => {
    if (!selectedElement || !elementInspection) return;

    const elementIdentification: ElementIdentification = {
      id: `element-${Date.now()}`,
      recording_id: '', // Would be set by parent component
      element_type: selectedElement.element.tag_name,
      natural_description: `${selectedElement.element.tag_name} with text "${selectedElement.element.text_content}"`,
      primary_selector: selectedElement.suggestedSelector,
      alternative_selectors: selectorSuggestions.slice(1).map(s => s.selector),
      confidence_scores: selectorSuggestions.map(s => s.confidence),
      visual_context: {
        bounding_box: selectedElement.element.bounding_box,
        is_visible: selectedElement.element.is_visible,
        is_clickable: selectedElement.element.is_clickable
      },
      technical_details: {
        tag_name: selectedElement.element.tag_name,
        attributes: selectedElement.element.attributes,
        text_content: selectedElement.element.text_content,
        computed_styles: elementInspection.computedStyles
      },
      interaction_hints: {
        recommended_action: targetAction,
        interaction_confidence: selectedElement.confidence,
        alternative_actions: getAlternativeActions(selectedElement.element)
      },
      confidence_metrics: {
        selector_stability: selectorSuggestions[0]?.stability || 0.5,
        element_uniqueness: calculateElementUniqueness(selectedElement.element),
        visual_prominence: calculateVisualProminence(selectedElement.element)
      },
      coordinates: {
        x: selectedElement.element.bounding_box.x,
        y: selectedElement.element.bounding_box.y
      },
      page_url: window.location.href,
      page_context: {
        title: document.title,
        url: window.location.href,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    onElementSelected(elementIdentification);
  }, [selectedElement, elementInspection, selectorSuggestions, targetAction, onElementSelected]);

  // Helper functions
  const getAlternativeActions = (element: DOMElement): string[] => {
    const actions = [];
    if (element.is_clickable) actions.push('click', 'hover');
    if (element.tag_name === 'input') actions.push('type', 'clear');
    if (element.tag_name === 'select') actions.push('select');
    if (element.text_content) actions.push('verify');
    return actions;
  };

  const calculateElementUniqueness = (element: DOMElement): number => {
    // Mock calculation - would analyze DOM for uniqueness
    if (element.attributes.id) return 0.95;
    if (element.attributes['data-testid']) return 0.98;
    if (element.text_content && element.text_content.length > 0) return 0.8;
    return 0.6;
  };

  const calculateVisualProminence = (element: DOMElement): number => {
    // Mock calculation based on size, position, styling
    const area = element.bounding_box.width * element.bounding_box.height;
    if (area > 10000) return 0.9;
    if (area > 5000) return 0.7;
    return 0.5;
  };

  // Filter elements based on current filter
  const getFilteredElements = useCallback((elements: DOMElement[]): DOMElement[] => {
    let filtered = elements;

    // Apply type filter
    switch (filterType) {
      case 'interactive':
        filtered = filtered.filter(el => el.is_clickable);
        break;
      case 'visible':
        filtered = filtered.filter(el => el.is_visible);
        break;
      case 'text':
        filtered = filtered.filter(el => el.text_content && el.text_content.trim().length > 0);
        break;
    }

    // Apply search query
    if (searchQuery) {
      filtered = filtered.filter(el => 
        el.text_content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        el.attributes.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        el.tag_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [filterType, searchQuery]);

  // Load and highlight elements
  useEffect(() => {
    if (isActive) {
      detectElements().then(elements => {
        const filtered = getFilteredElements(elements);
        const highlights = filtered.map(element => ({
          element,
          confidence: calculateElementUniqueness(element),
          reason: `${element.tag_name} element`,
          isSelected: false,
          suggestedSelector: generateSelectorSuggestions(element)[0]?.selector || element.selector
        }));
        setHighlightedElements(highlights);
      });
    }
  }, [isActive, filterType, searchQuery, detectElements, getFilteredElements, generateSelectorSuggestions]);

  if (!isActive) return null;

  return (
    <>
      {/* Element Highlighting Overlay */}
      <div
        ref={overlayRef}
        className="fixed inset-0 z-50 pointer-events-none"
        style={{ zIndex: 9999 }}
      >
        {highlightedElements.map((highlight, index) => (
          <div
            key={index}
            className={`absolute border-2 transition-all duration-200 ${
              highlight.isSelected 
                ? 'border-green-500 bg-green-500 bg-opacity-20' 
                : hoveredElement?.element === highlight.element
                ? 'border-blue-500 bg-blue-500 bg-opacity-20'
                : 'border-yellow-500 bg-yellow-500 bg-opacity-10'
            }`}
            style={{
              left: highlight.element.bounding_box.x,
              top: highlight.element.bounding_box.y,
              width: highlight.element.bounding_box.width,
              height: highlight.element.bounding_box.height,
              pointerEvents: 'auto',
              cursor: 'crosshair'
            }}
            onClick={() => handleElementSelect(highlight.element)}
            onMouseEnter={() => handleElementHover(highlight.element)}
            onMouseLeave={() => setHoveredElement(null)}
          >
            {/* Element Label */}
            <div className="absolute -top-6 left-0 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
              {highlight.element.tag_name}
              {highlight.element.attributes.id && `#${highlight.element.attributes.id}`}
              {highlight.element.text_content && ` "${highlight.element.text_content.slice(0, 20)}..."`}
            </div>
            
            {/* Confidence Badge */}
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">
              {Math.round(highlight.confidence * 100)}
            </div>
          </div>
        ))}
      </div>

      {/* Inspector Panel */}
      <div
        ref={inspectorPanelRef}
        className="fixed top-4 right-4 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50"
        style={{ zIndex: 10000 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Target className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Element Selector</h3>
          </div>
          <button
            onClick={onCancel}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters and Search */}
        <div className="p-4 border-b border-gray-200 space-y-3">
          <div className="flex space-x-2">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search elements..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Filter className="w-4 h-4" />
            </button>
          </div>

          {showAdvancedOptions && (
            <div className="space-y-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Elements</option>
                <option value="interactive">Interactive Only</option>
                <option value="visible">Visible Only</option>
                <option value="text">With Text Content</option>
              </select>
            </div>
          )}
        </div>

        {/* Element Information */}
        {(selectedElement || hoveredElement) && (
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="font-medium text-gray-900">
                  {(selectedElement || hoveredElement)?.element.tag_name.toUpperCase()}
                </h4>
                <p className="text-sm text-gray-600">
                  {(selectedElement || hoveredElement)?.element.text_content || 'No text content'}
                </p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs ${
                (selectedElement || hoveredElement)?.confidence! > 0.8
                  ? 'bg-green-100 text-green-800'
                  : (selectedElement || hoveredElement)?.confidence! > 0.6
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {Math.round((selectedElement || hoveredElement)?.confidence! * 100)}% confidence
              </span>
            </div>

            {elementInspection && (
              <div className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-gray-600">Visible:</span>
                    <span className={`ml-2 ${elementInspection.isVisible ? 'text-green-600' : 'text-red-600'}`}>
                      {elementInspection.isVisible ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Interactive:</span>
                    <span className={`ml-2 ${elementInspection.isInteractable ? 'text-green-600' : 'text-red-600'}`}>
                      {elementInspection.isInteractable ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
                
                <div>
                  <span className="text-gray-600">Size:</span>
                  <span className="ml-2 text-gray-900">
                    {elementInspection.boundingBox.width} × {elementInspection.boundingBox.height}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Selector Suggestions */}
        {selectorSuggestions.length > 0 && (
          <div className="p-4 border-b border-gray-200">
            <h5 className="font-medium text-gray-900 mb-3">Selector Suggestions</h5>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {selectorSuggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    index === 0 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <code className="text-sm font-mono text-gray-900">
                      {suggestion.selector}
                    </code>
                    <div className="flex space-x-1">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        {suggestion.type}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        suggestion.confidence > 0.8
                          ? 'bg-green-100 text-green-700'
                          : suggestion.confidence > 0.6
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {Math.round(suggestion.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600">{suggestion.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="p-4">
          <div className="flex space-x-2">
            <button
              onClick={handleConfirmSelection}
              disabled={!selectedElement}
              className="flex-1 flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4" />
              <span>Select Element</span>
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
          
          <div className="mt-3 text-center">
            <p className="text-xs text-gray-500">
              Found {highlightedElements.length} elements • 
              Click on highlighted elements to select them
            </p>
          </div>
        </div>
      </div>

      {/* Help Tooltip */}
      {isSelecting && (
        <div className="fixed bottom-4 left-4 bg-black bg-opacity-75 text-white px-4 py-2 rounded-lg z-50">
          <div className="flex items-center space-x-2">
            <Crosshair className="w-4 h-4" />
            <span className="text-sm">
              Click on any highlighted element to select it for {targetAction}
            </span>
          </div>
        </div>
      )}
    </>
  );
};