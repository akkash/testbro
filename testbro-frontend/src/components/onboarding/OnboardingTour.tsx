import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ArrowRight, 
  ArrowLeft, 
  X, 
  Play, 
  Lightbulb,
  Target,
  MessageCircle,
  Zap,
  CheckCircle,
  MousePointer,
  Eye,
  Rocket
} from 'lucide-react';

interface TourStep {
  id: string;
  title: string;
  content: string;
  target?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  action?: 'highlight' | 'interact' | 'demo';
  demoComponent?: React.ComponentType<any>;
  validation?: () => boolean;
  optional?: boolean;
}

interface OnboardingTourProps {
  isActive: boolean;
  onComplete: () => void;
  onSkip: () => void;
  userType?: 'new' | 'experienced' | 'developer';
  tourType?: 'quick' | 'comprehensive' | 'feature-specific';
}

const tourSteps: Record<string, TourStep[]> = {
  quick: [
    {
      id: 'welcome',
      title: 'Welcome to TestBro!',
      content: 'TestBro makes test automation easy with AI-powered, no-code test creation. Let\'s get you started in just 2 minutes!',
      position: 'bottom'
    },
    {
      id: 'create-test',
      title: 'Create Your First Test',
      content: 'Click here to create a new test. You can choose from three powerful methods: Interactive Recording, Visual Builder, or Conversational AI.',
      target: '[data-tour="create-test-button"]',
      position: 'bottom',
      action: 'highlight'
    },
    {
      id: 'test-methods',
      title: 'Three Ways to Build Tests',
      content: 'Choose your preferred method: Record by clicking through your app, drag-and-drop visual builder, or describe your test in natural language.',
      target: '[data-tour="test-methods"]',
      position: 'right',
      action: 'highlight'
    },
    {
      id: 'run-test',
      title: 'Run and Monitor',
      content: 'Once created, run your test and see real-time results. TestBro automatically handles browser automation and provides detailed reports.',
      target: '[data-tour="run-button"]',
      position: 'left',
      action: 'demo'
    },
    {
      id: 'complete',
      title: 'You\'re Ready!',
      content: 'That\'s it! You\'re ready to create powerful automated tests. Start with any method and TestBro will guide you through the process.',
      position: 'bottom'
    }
  ],
  comprehensive: [
    {
      id: 'welcome',
      title: 'Complete TestBro Tour',
      content: 'Welcome to the comprehensive TestBro experience! We\'ll explore all features and capabilities.',
      position: 'bottom'
    },
    {
      id: 'dashboard-overview',
      title: 'Dashboard Overview',
      content: 'Your dashboard shows test suites, recent runs, and performance metrics. Everything you need at a glance.',
      target: '[data-tour="dashboard"]',
      position: 'bottom',
      action: 'highlight'
    },
    {
      id: 'interactive-recording',
      title: 'Interactive Recording',
      content: 'Record tests by interacting with your application. TestBro captures actions and generates intelligent test steps.',
      target: '[data-tour="interactive-recorder"]',
      position: 'right',
      action: 'highlight'
    },
    {
      id: 'visual-builder',
      title: 'Visual Test Builder',
      content: 'Drag and drop actions to build tests visually. Perfect for complex workflows and test planning.',
      target: '[data-tour="visual-builder"]',
      position: 'right',
      action: 'highlight'
    },
    {
      id: 'conversational-ai',
      title: 'Conversational AI',
      content: 'Describe your test in natural language and let AI generate the complete test case for you.',
      target: '[data-tour="conversational-ai"]',
      position: 'right',
      action: 'highlight'
    },
    {
      id: 'element-selector',
      title: 'Smart Element Selection',
      content: 'TestBro intelligently identifies page elements and suggests the most stable selectors for reliable tests.',
      target: '[data-tour="element-selector"]',
      position: 'top',
      action: 'demo'
    },
    {
      id: 'self-healing',
      title: 'Self-Healing Tests',
      content: 'When UI changes break tests, TestBro automatically adapts selectors to maintain test functionality.',
      target: '[data-tour="self-healing"]',
      position: 'left',
      action: 'highlight'
    },
    {
      id: 'domain-testing',
      title: 'Domain-Wide Testing',
      content: 'Test entire websites automatically. TestBro crawls your domain and generates comprehensive test coverage.',
      target: '[data-tour="domain-testing"]',
      position: 'bottom',
      action: 'highlight'
    },
    {
      id: 'reporting',
      title: 'Rich Reporting',
      content: 'Get detailed test reports with screenshots, performance metrics, and actionable insights.',
      target: '[data-tour="reports"]',
      position: 'top',
      action: 'highlight'
    },
    {
      id: 'complete',
      title: 'Master Level Unlocked!',
      content: 'You\'ve seen all of TestBro\'s powerful features. Ready to revolutionize your testing workflow?',
      position: 'bottom'
    }
  ]
};

const TourTooltip: React.FC<{
  step: TourStep;
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  position: { x: number; y: number };
}> = ({ step, currentStep, totalSteps, onNext, onPrev, onSkip, position }) => {
  const getTooltipStyle = () => {
    const tooltipPosition = step.position || 'bottom';
    const offset = 20;
    
    switch (tooltipPosition) {
      case 'top':
        return { 
          left: position.x, 
          top: position.y - offset,
          transform: 'translate(-50%, -100%)'
        };
      case 'bottom':
        return { 
          left: position.x, 
          top: position.y + offset,
          transform: 'translate(-50%, 0)'
        };
      case 'left':
        return { 
          left: position.x - offset, 
          top: position.y,
          transform: 'translate(-100%, -50%)'
        };
      case 'right':
        return { 
          left: position.x + offset, 
          top: position.y,
          transform: 'translate(0, -50%)'
        };
      default:
        return { left: position.x, top: position.y };
    }
  };

  const getIconForStep = () => {
    if (step.id.includes('record')) return <Play className="w-5 h-5" />;
    if (step.id.includes('visual')) return <Target className="w-5 h-5" />;
    if (step.id.includes('conversation')) return <MessageCircle className="w-5 h-5" />;
    if (step.id.includes('ai')) return <Zap className="w-5 h-5" />;
    if (step.id.includes('complete')) return <CheckCircle className="w-5 h-5" />;
    return <Lightbulb className="w-5 h-5" />;
  };

  return (
    <div
      className="fixed z-50 max-w-sm bg-white rounded-lg shadow-xl border border-gray-200 p-6"
      style={getTooltipStyle()}
    >
      {/* Arrow indicator */}
      <div
        className={`absolute w-0 h-0 border-8 ${
          step.position === 'top' 
            ? 'border-t-white border-x-transparent border-b-0 top-full left-1/2 -translate-x-1/2'
            : step.position === 'left'
            ? 'border-l-white border-y-transparent border-r-0 left-full top-1/2 -translate-y-1/2'
            : step.position === 'right'
            ? 'border-r-white border-y-transparent border-l-0 right-full top-1/2 -translate-y-1/2'
            : 'border-b-white border-x-transparent border-t-0 bottom-full left-1/2 -translate-x-1/2'
        }`}
      />

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            {getIconForStep()}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{step.title}</h3>
            <p className="text-sm text-gray-500">
              Step {currentStep + 1} of {totalSteps}
            </p>
          </div>
        </div>
        <button
          onClick={onSkip}
          className="p-1 text-gray-400 hover:text-gray-600 rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="mb-6">
        <p className="text-gray-700 leading-relaxed">{step.content}</p>
        
        {step.action === 'demo' && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center space-x-2 text-blue-700">
              <Rocket className="w-4 h-4" />
              <span className="text-sm font-medium">Interactive Demo</span>
            </div>
            <p className="text-sm text-blue-600 mt-1">
              Click to see this feature in action
            </p>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={onPrev}
          disabled={currentStep === 0}
          className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="flex space-x-2">
          <button
            onClick={onSkip}
            className="px-4 py-2 text-gray-500 hover:text-gray-700"
          >
            Skip Tour
          </button>
          <button
            onClick={onNext}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <span>{currentStep === totalSteps - 1 ? 'Finish' : 'Next'}</span>
            {currentStep < totalSteps - 1 && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export const OnboardingTour: React.FC<OnboardingTourProps> = ({
  isActive,
  onComplete,
  onSkip,
  userType = 'new',
  tourType = 'quick'
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [highlightedElement, setHighlightedElement] = useState<HTMLElement | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const steps = tourSteps[tourType] || tourSteps.quick;
  const currentStep = steps[currentStepIndex];

  // Update tooltip position when target changes
  const updateTooltipPosition = useCallback(() => {
    if (!currentStep.target) {
      // Center of screen for steps without targets
      setTooltipPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2
      });
      return;
    }

    const targetElement = document.querySelector(currentStep.target) as HTMLElement;
    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      setTooltipPosition({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      });
      setHighlightedElement(targetElement);
    } else {
      // Fallback if target not found
      setTooltipPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 3
      });
    }
  }, [currentStep]);

  // Update position when step changes or window resizes
  useEffect(() => {
    if (!isActive) return;

    updateTooltipPosition();
    
    const handleResize = () => updateTooltipPosition();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [currentStepIndex, isActive, updateTooltipPosition]);

  // Highlight target element
  useEffect(() => {
    if (!isActive || !currentStep.target) return;

    const targetElement = document.querySelector(currentStep.target) as HTMLElement;
    if (targetElement && currentStep.action === 'highlight') {
      targetElement.style.position = 'relative';
      targetElement.style.zIndex = '51';
      targetElement.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.5), 0 0 0 8px rgba(59, 130, 246, 0.2)';
      targetElement.style.borderRadius = '8px';
      
      return () => {
        targetElement.style.position = '';
        targetElement.style.zIndex = '';
        targetElement.style.boxShadow = '';
        targetElement.style.borderRadius = '';
      };
    }
  }, [currentStepIndex, isActive, currentStep]);

  const handleNext = () => {
    if (currentStepIndex === steps.length - 1) {
      onComplete();
    } else {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case 'Enter':
          e.preventDefault();
          handleNext();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handlePrev();
          break;
        case 'Escape':
          e.preventDefault();
          handleSkip();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isActive, currentStepIndex, steps.length]);

  if (!isActive) return null;

  return (
    <>
      {/* Overlay */}
      <div
        ref={overlayRef}
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={handleSkip}
      />

      {/* Spotlight effect for highlighted element */}
      {highlightedElement && currentStep.action === 'highlight' && (
        <div
          className="fixed pointer-events-none z-45"
          style={{
            left: highlightedElement.getBoundingClientRect().left - 20,
            top: highlightedElement.getBoundingClientRect().top - 20,
            width: highlightedElement.getBoundingClientRect().width + 40,
            height: highlightedElement.getBoundingClientRect().height + 40,
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            border: '2px solid rgba(59, 130, 246, 0.8)',
            boxShadow: '0 0 30px rgba(59, 130, 246, 0.3)'
          }}
        />
      )}

      {/* Tour Tooltip */}
      <TourTooltip
        step={currentStep}
        currentStep={currentStepIndex}
        totalSteps={steps.length}
        onNext={handleNext}
        onPrev={handlePrev}
        onSkip={handleSkip}
        position={tooltipPosition}
      />

      {/* Tour Controls (Bottom Right) */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-3">
        <div className="bg-white rounded-lg shadow-lg px-4 py-2">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <MousePointer className="w-4 h-4" />
            <span>Use arrow keys or click to navigate</span>
          </div>
        </div>
      </div>

      {/* Mini Progress Indicator */}
      <div className="fixed bottom-6 left-6 z-50">
        <div className="bg-white rounded-lg shadow-lg p-3">
          <div className="flex items-center space-x-2">
            <Eye className="w-4 h-4 text-blue-600" />
            <div className="text-sm font-medium text-gray-900">
              Tour Progress
            </div>
          </div>
          <div className="flex space-x-1 mt-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index <= currentStepIndex 
                    ? 'bg-blue-600' 
                    : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
};