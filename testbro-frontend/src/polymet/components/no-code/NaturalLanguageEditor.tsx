import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Edit3, 
  Check, 
  X, 
  Lightbulb, 
  Wand2, 
  ArrowRight,
  AlertTriangle,
  Info,
  Loader2,
  RefreshCw,
  Copy,
  Eye,
  Save
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface NoCodeTestStep {
  id: string;
  order_index: number;
  natural_language: string;
  action_type: 'click' | 'type' | 'verify' | 'navigate' | 'wait' | 'select' | 'scroll' | 'hover';
  element_description: string;
  element_selector: string;
  element_alternatives: string[];
  value?: string;
  confidence_score: number;
  user_verified: boolean;
  ai_metadata?: {
    element_recognition_confidence: number;
    language_generation_confidence: number;
    suggested_improvements: string[];
  };
}

interface AISuggestion {
  text: string;
  confidence: number;
  reasoning: string;
  action_type?: string;
  element_description?: string;
}

interface NaturalLanguageEditorProps {
  step: NoCodeTestStep;
  onUpdate: (step: NoCodeTestStep) => void;
  onSave?: (step: NoCodeTestStep) => void;
  onCancel?: () => void;
  isEditing?: boolean;
  className?: string;
}

export default function NaturalLanguageEditor({ 
  step, 
  onUpdate, 
  onSave, 
  onCancel,
  isEditing = false,
  className = ''
}: NaturalLanguageEditorProps) {
  const [description, setDescription] = useState(step.natural_language);
  const [elementDescription, setElementDescription] = useState(step.element_description);
  const [value, setValue] = useState(step.value || '');
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [editMode, setEditMode] = useState(isEditing);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [previewStep, setPreviewStep] = useState<NoCodeTestStep | null>(null);

  const { toast } = useToast();
  const debounceRef = useRef<NodeJS.Timeout>();

  // Auto-generate suggestions as user types
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      if (description !== step.natural_language && description.length > 10) {
        generateSuggestions();
      }
    }, 1000);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [description, step.natural_language]);

  const generateSuggestions = useCallback(async () => {
    if (!description.trim()) return;

    setIsGeneratingSuggestions(true);
    try {
      // Mock AI suggestions - would be replaced with actual API call
      const mockSuggestions: AISuggestion[] = [
        {
          text: `${description.charAt(0).toUpperCase() + description.slice(1)}`,
          confidence: 0.95,
          reasoning: "Capitalized first letter for better readability"
        },
        {
          text: `Click the "${elementDescription}" button`,
          confidence: 0.88,
          reasoning: "More specific action description using element context"
        },
        {
          text: `Interact with ${elementDescription} to ${description.toLowerCase()}`,
          confidence: 0.82,
          reasoning: "Combined element and action description"
        }
      ];

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      setSuggestions(mockSuggestions);

    } catch (error) {
      console.error('Failed to generate suggestions:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate AI suggestions',
        variant: 'destructive'
      });
    } finally {
      setIsGeneratingSuggestions(false);
    }
  }, [description, elementDescription, toast]);

  const analyzeStepQuality = useCallback(async () => {
    setIsAnalyzing(true);
    try {
      // Mock analysis - would be replaced with actual API call
      const errors: string[] = [];
      
      if (description.length < 5) {
        errors.push('Description is too short');
      }
      
      if (!description.includes(step.action_type)) {
        errors.push(`Description should mention the action type: ${step.action_type}`);
      }
      
      if (step.action_type === 'type' && !value.trim()) {
        errors.push('Type actions should specify what text to enter');
      }

      if (description.length > 100) {
        errors.push('Description is too long - keep it concise');
      }

      await new Promise(resolve => setTimeout(resolve, 300));
      setValidationErrors(errors);

    } catch (error) {
      console.error('Failed to analyze step:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [description, step.action_type, value]);

  const generatePreview = useCallback(() => {
    const updatedStep: NoCodeTestStep = {
      ...step,
      natural_language: description,
      element_description: elementDescription,
      value: value || undefined,
      updated_at: new Date().toISOString()
    };
    
    setPreviewStep(updatedStep);
  }, [step, description, elementDescription, value]);

  const handleSuggestionSelect = (suggestion: AISuggestion) => {
    setDescription(suggestion.text);
    setSuggestions([]);
    
    toast({
      title: 'Suggestion Applied',
      description: suggestion.reasoning,
    });
  };

  const handleSave = () => {
    const updatedStep: NoCodeTestStep = {
      ...step,
      natural_language: description,
      element_description: elementDescription,
      value: value || undefined,
      user_verified: true,
      updated_at: new Date().toISOString()
    };

    onUpdate(updatedStep);
    if (onSave) {
      onSave(updatedStep);
    }
    setEditMode(false);
    
    toast({
      title: 'Step Updated',
      description: 'Your changes have been saved',
    });
  };

  const handleCancel = () => {
    setDescription(step.natural_language);
    setElementDescription(step.element_description);
    setValue(step.value || '');
    setEditMode(false);
    setSuggestions([]);
    setValidationErrors([]);
    
    if (onCancel) {
      onCancel();
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copied',
        description: 'Text copied to clipboard',
      });
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const getActionTypeColor = (actionType: string) => {
    const colorMap: Record<string, string> = {
      click: 'bg-blue-100 text-blue-800',
      type: 'bg-green-100 text-green-800',
      verify: 'bg-purple-100 text-purple-800',
      navigate: 'bg-orange-100 text-orange-800',
      wait: 'bg-gray-100 text-gray-800',
      select: 'bg-indigo-100 text-indigo-800',
      scroll: 'bg-yellow-100 text-yellow-800',
      hover: 'bg-pink-100 text-pink-800'
    };
    return colorMap[actionType] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Edit3 className="w-5 h-5" />
              Natural Language Editor
            </CardTitle>
            <CardDescription>
              Edit and improve test step descriptions with AI assistance
            </CardDescription>
          </div>
          <Badge className={getActionTypeColor(step.action_type)}>
            {step.action_type}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Description Editor */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="description">Step Description</Label>
            <div className="flex gap-2">
              {!editMode ? (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setEditMode(true)}
                >
                  <Edit3 className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              ) : (
                <>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={generateSuggestions}
                    disabled={isGeneratingSuggestions}
                  >
                    {isGeneratingSuggestions ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Wand2 className="w-4 h-4 mr-1" />
                    )}
                    Suggest
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={analyzeStepQuality}
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Eye className="w-4 h-4 mr-1" />
                    )}
                    Analyze
                  </Button>
                </>
              )}
            </div>
          </div>
          
          {editMode ? (
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Click the Login button, Enter email address, Verify welcome message appears"
              className="min-h-20"
              rows={3}
            />
          ) : (
            <div className="p-3 bg-gray-50 rounded-md border min-h-20 flex items-start justify-between">
              <p className="text-sm">{description}</p>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copyToClipboard(description)}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Element Description */}
        {editMode && (
          <div className="space-y-2">
            <Label htmlFor="elementDescription">Element Description</Label>
            <Input
              id="elementDescription"
              value={elementDescription}
              onChange={(e) => setElementDescription(e.target.value)}
              placeholder="e.g., Login button, Email input field"
            />
          </div>
        )}

        {/* Value Field (for type/select actions) */}
        {editMode && ['type', 'select'].includes(step.action_type) && (
          <div className="space-y-2">
            <Label htmlFor="value">
              {step.action_type === 'type' ? 'Text to Enter' : 'Option to Select'}
            </Label>
            <Input
              id="value"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={step.action_type === 'type' ? 'Enter text value...' : 'Select option...'}
            />
          </div>
        )}

        {/* AI Suggestions */}
        {suggestions.length > 0 && editMode && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-yellow-600" />
              <Label className="text-sm font-medium">AI Suggestions</Label>
            </div>
            <div className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="p-3 border rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  onClick={() => handleSuggestionSelect(suggestion)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium mb-1">{suggestion.text}</p>
                      <p className="text-xs text-gray-600">{suggestion.reasoning}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <Badge variant="outline" className="text-xs">
                        {Math.round(suggestion.confidence * 100)}%
                      </Badge>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                {validationErrors.map((error, index) => (
                  <div key={index} className="text-sm">• {error}</div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Step Preview */}
        {previewStep && editMode && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-600" />
              <Label className="text-sm font-medium">Preview</Label>
            </div>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm font-medium mb-1">{previewStep.natural_language}</div>
              <div className="text-xs text-gray-600">
                Element: {previewStep.element_description}
                {previewStep.value && ` | Value: "${previewStep.value}"`}
              </div>
            </div>
          </div>
        )}

        {/* Quality Score */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Quality Score</Label>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  step.confidence_score >= 0.8 ? 'bg-green-500' :
                  step.confidence_score >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${step.confidence_score * 100}%` }}
              />
            </div>
            <span className="text-sm font-medium">
              {Math.round(step.confidence_score * 100)}%
            </span>
          </div>
          <div className="text-xs text-gray-600">
            Based on element identification accuracy and description clarity
          </div>
        </div>

        {/* AI Metadata */}
        {step.ai_metadata && step.ai_metadata.suggested_improvements.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600" />
              <Label className="text-sm font-medium">Suggested Improvements</Label>
            </div>
            <div className="space-y-1">
              {step.ai_metadata.suggested_improvements.map((improvement, index) => (
                <div key={index} className="text-xs text-gray-600 p-2 bg-blue-50 rounded">
                  • {improvement}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {editMode && (
          <>
            <Separator />
            <div className="flex gap-2">
              <Button onClick={generatePreview} variant="outline" className="flex-1">
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </Button>
              <Button 
                onClick={handleSave} 
                className="flex-1"
                disabled={validationErrors.length > 0}
              >
                <Check className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
              <Button onClick={handleCancel} variant="outline">
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          </>
        )}

        {/* Status Info */}
        <div className="text-xs text-gray-500 flex items-center justify-between">
          <span>
            Last updated: {new Date(step.updated_at).toLocaleTimeString()}
          </span>
          <Badge variant={step.user_verified ? "default" : "secondary"} className="text-xs">
            {step.user_verified ? 'Verified' : 'Needs Review'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}