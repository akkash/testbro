import React, { useState } from "react";
import {
  Bot,
  Wand2,
  Play,
  Plus,
  Trash2,
  Edit,
  Move,
  Eye,
  Code,
  Save,
  ArrowRight,
  ArrowDown,
  MousePointer,
  Keyboard,
  Upload,
  CheckCircle,
  AlertCircle,
  Lightbulb,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { TestStep } from "@/polymet/data/test-data";
import { TestStepService } from "@/lib/testStepService";

interface LocalTestStep {
  id: string;
  order: number;
  action: "click" | "type" | "navigate" | "wait" | "verify" | "upload" | "select";
  element?: string;
  value?: string;
  description: string;
  timeout?: number;
  screenshot?: boolean;
  aiContext?: string;
}

const ActionIcon = ({ action }: { action: string }) => {
  const icons = {
    click: MousePointer,
    type: Keyboard,
    navigate: ArrowRight,
    wait: AlertCircle,
    verify: CheckCircle,
    upload: Upload,
    select: ArrowDown,
  };

  const Icon = icons[action as keyof typeof icons] || MousePointer;
  return <Icon className="w-4 h-4" />;
};

const StepCard = ({
  step,
  index,
  onEdit,
  onDelete,
  onMove,
}: {
  step: LocalTestStep;
  index: number;
  onEdit: (step: LocalTestStep) => void;
  onDelete: (stepId: string) => void;
  onMove: (stepId: string, direction: "up" | "down") => void;
}) => {
  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <span className="text-sm font-medium text-blue-600">
              {index + 1}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <ActionIcon action={step.action} />

              <Badge variant="outline" className="text-xs">
                {step.action}
              </Badge>
              {step.aiContext && (
                <Badge
                  variant="secondary"
                  className="text-xs bg-purple-100 text-purple-800"
                >
                  <Bot className="w-3 h-3 mr-1" />
                  AI Context
                </Badge>
              )}
            </div>

            <p className="text-sm font-medium text-gray-900 mb-1">
              {step.description}
            </p>

            {step.element && (
              <p className="text-xs text-gray-500 font-mono bg-gray-50 px-2 py-1 rounded">
                {step.element}
              </p>
            )}

            {step.value && (
              <p className="text-xs text-gray-600 mt-1">
                <span className="font-medium">Value:</span> {step.value}
              </p>
            )}

            {step.aiContext && (
              <div className="mt-2 p-2 bg-purple-50 border border-purple-200 rounded text-xs">
                <div className="flex items-center space-x-1 mb-1">
                  <Lightbulb className="w-3 h-3 text-purple-600" />

                  <span className="font-medium text-purple-800">
                    AI Context
                  </span>
                </div>
                <p className="text-purple-700">{step.aiContext}</p>
              </div>
            )}
          </div>

          <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onMove(step.id, "up")}
                disabled={index === 0}
              >
                <ArrowRight className="w-3 h-3 rotate-[-90deg]" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onMove(step.id, "down")}
              >
                <ArrowRight className="w-3 h-3 rotate-90" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onEdit(step)}>
                <Edit className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(step.id)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const AIGenerationPanel = ({
  onGenerate,
}: {
  onGenerate: (steps: TestStep[]) => void;
}) => {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);

    // Simulate AI generation
    setTimeout(() => {
      const generatedSteps: TestStep[] = [
        {
          id: `step-${Date.now()}-1`,
          order: 1,
          action: "navigate",
          element: "/login",
          description: "Navigate to login page",
          aiContext: "User wants to access their account",
        },
        {
          id: `step-${Date.now()}-2`,
          order: 2,
          action: "type",
          element: '[data-testid="email-input"]',
          value: "user@example.com",
          description: "Enter email address",
          aiContext: "User provides their registered email for authentication",
        },
        {
          id: `step-${Date.now()}-3`,
          order: 3,
          action: "type",
          element: '[data-testid="password-input"]',
          value: "password123",
          description: "Enter password",
          aiContext: "User enters their secure password",
        },
        {
          id: `step-${Date.now()}-4`,
          order: 4,
          action: "click",
          element: '[data-testid="login-button"]',
          description: "Click login button",
          aiContext: "User submits login credentials",
        },
        {
          id: `step-${Date.now()}-5`,
          order: 5,
          action: "verify",
          element: '[data-testid="dashboard"]',
          description: "Verify user is redirected to dashboard",
          aiContext:
            "System confirms successful authentication and shows user dashboard",
        },
      ];

      onGenerate(generatedSteps);
      setIsGenerating(false);
      setPrompt("");
    }, 2000);
  };

  const suggestions = [
    "Test user registration with email verification",
    "Test e-commerce checkout process with payment",
    "Test file upload with validation and progress",
    "Test search functionality with filters",
    "Test responsive design on mobile devices",
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Bot className="w-5 h-5 text-purple-600" />

          <span>AI Test Generator</span>
        </CardTitle>
        <CardDescription>
          Describe what you want to test in plain English, and AI will generate
          the test steps
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="ai-prompt">Test Description</Label>
          <Textarea
            id="ai-prompt"
            placeholder="e.g., Test user login flow with email and password validation..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="mt-1"
            rows={3}
          />
        </div>

        <div>
          <Label className="text-sm text-gray-600 mb-2 block">
            Quick Suggestions
          </Label>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => setPrompt(suggestion)}
                className="text-xs"
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={!prompt.trim() || isGenerating}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Sparkles className="w-4 h-4 mr-2 animate-spin" />
              Generating Test Steps...
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4 mr-2" />
              Generate Test Steps
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default function AITestBuilder() {
  const [testName, setTestName] = useState("");
  const [testDescription, setTestDescription] = useState("");
  const [testType, setTestType] = useState("e2e");
  const [steps, setSteps] = useState<LocalTestStep[]>([]);
  const [activeTab, setActiveTab] = useState("builder");
  const [aiEnabled, setAiEnabled] = useState(true);
  const [testCaseId, setTestCaseId] = useState<string | null>(null); // Track testCaseId for step operations

  // Convert frontend TestStep to LocalTestStep
  const convertTestStep = (step: TestStep): LocalTestStep => {
    return {
      id: step.id,
      order: step.order,
      action: step.action as "click" | "type" | "navigate" | "wait" | "verify" | "upload" | "select",
      element: step.element,
      value: step.value,
      description: step.description,
      // Note: screenshot type is different between frontend and backend
      // Frontend uses string (URL), backend uses boolean
      // For editing, we'll use boolean
      screenshot: typeof step.screenshot === 'string' ? true : step.screenshot,
      aiContext: step.aiContext,
    };
  };

  // Convert LocalTestStep to frontend TestStep
  const convertToLocalTestStep = (step: LocalTestStep): TestStep => {
    return {
      id: step.id,
      order: step.order,
      action: step.action,
      element: step.element || "",
      value: step.value,
      description: step.description,
      screenshot: step.screenshot ? "screenshot-url" : undefined, // Simplified conversion
      aiContext: step.aiContext,
    };
  };

  const handleAddStep = async () => {
    const newStep: Omit<LocalTestStep, 'id'> = {
      order: steps.length + 1,
      action: "click",
      element: "",
      description: "",
    };

    // If we have a testCaseId, save to backend
    if (testCaseId) {
      try {
        const { data, error } = await TestStepService.addTestStep(testCaseId, newStep);
        if (error) {
          console.error("Failed to add step:", error);
          // Fallback to local state update
          const localStep: LocalTestStep = {
            id: `step-${Date.now()}`,
            ...newStep
          };
          setSteps([...steps, localStep]);
        } else {
          // Update with backend response
          setSteps(data.steps);
        }
      } catch (error: any) {
        console.error("Error adding step:", error);
        // Fallback to local state update
        const localStep: LocalTestStep = {
          id: `step-${Date.now()}`,
          ...newStep
        };
        setSteps([...steps, localStep]);
      }
    } else {
      // Just update local state
      const localStep: LocalTestStep = {
        id: `step-${Date.now()}`,
        ...newStep
      };
      setSteps([...steps, localStep]);
    }
  };

  const handleEditStep = async (step: LocalTestStep) => {
    // In a real implementation, this would open a modal or form
    console.log("Edit step:", step);
    
    // If we have a testCaseId and step.id, update backend
    if (testCaseId && step.id) {
      try {
        const { data, error } = await TestStepService.updateTestStep(
          testCaseId,
          step.id,
          {
            action: step.action,
            element: step.element,
            value: step.value,
            description: step.description,
            timeout: step.timeout,
            screenshot: step.screenshot,
            ai_context: step.aiContext,
          }
        );
        
        if (error) {
          console.error("Failed to update step:", error);
        } else {
          // Update local state with backend response
          setSteps(data.steps);
        }
      } catch (error: any) {
        console.error("Error updating step:", error);
      }
    }
  };

  const handleDeleteStep = async (stepId: string) => {
    // If we have a testCaseId, delete from backend
    if (testCaseId && stepId) {
      try {
        const { data, error } = await TestStepService.deleteTestStep(testCaseId, stepId);
        if (error) {
          console.error("Failed to delete step:", error);
          // Fallback to local state update
          setSteps(steps.filter((step) => step.id !== stepId));
        } else {
          // Update with backend response
          setSteps(data.steps);
        }
      } catch (error: any) {
        console.error("Error deleting step:", error);
        // Fallback to local state update
        setSteps(steps.filter((step) => step.id !== stepId));
      }
    } else {
      // Just update local state
      setSteps(steps.filter((step) => step.id !== stepId));
    }
  };

  const handleMoveStep = async (stepId: string, direction: "up" | "down") => {
    const stepIndex = steps.findIndex((step) => step.id === stepId);
    if (stepIndex === -1) return;

    const newSteps = [...steps];
    const targetIndex = direction === "up" ? stepIndex - 1 : stepIndex + 1;

    if (targetIndex >= 0 && targetIndex < steps.length) {
      [newSteps[stepIndex], newSteps[targetIndex]] = [
        newSteps[targetIndex],
        newSteps[stepIndex],
      ];

      // Update order numbers
      newSteps.forEach((step, index) => {
        step.order = index + 1;
      });

      // If we have a testCaseId, update all steps on backend
      if (testCaseId) {
        try {
          // For simplicity, we'll update the entire test case steps
          // In a production app, you might want to optimize this
          const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/test-cases/${testCaseId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('sb-token')}`,
            },
            body: JSON.stringify({
              steps: newSteps,
            }),
          });

          if (response.ok) {
            setSteps(newSteps);
          } else {
            // Fallback to local state update
            setSteps(newSteps);
          }
        } catch (error: any) {
          console.error("Error updating step order:", error);
          // Fallback to local state update
          setSteps(newSteps);
        }
      } else {
        setSteps(newSteps);
      }
    }
  };

  const handleAIGenerate = (generatedSteps: TestStep[]) => {
    // Convert frontend TestSteps to LocalTestSteps
    const localSteps: LocalTestStep[] = generatedSteps.map(convertTestStep);
    setSteps(localSteps);
    setActiveTab("builder");
  };

  const handleSave = async () => {
    if (!testName || steps.length === 0) return;

    const testCase = {
      name: testName,
      description: testDescription,
      type: testType,
      steps: steps,
      aiGenerated: aiEnabled,
      // These would need to be provided by the context or form
      project_id: "", // This should come from context or form selection
      target_id: "", // This should come from context or form selection
    };

    try {
      // If we already have a testCaseId, update the existing test case
      if (testCaseId) {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/test-cases/${testCaseId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('sb-token')}`,
          },
          body: JSON.stringify(testCase),
        });

        if (response.ok) {
          const result = await response.json();
          console.log("Test case updated:", result);
        } else {
          const error = await response.json();
          console.error("Failed to update test case:", error);
        }
      } else {
        // Create a new test case
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/test-cases`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('sb-token')}`,
          },
          body: JSON.stringify(testCase),
        });

        if (response.ok) {
          const result = await response.json();
          console.log("Test case created:", result);
          setTestCaseId(result.data.id); // Track the new testCaseId
        } else {
          const error = await response.json();
          console.error("Failed to create test case:", error);
        }
      }
    } catch (error) {
      console.error("Error saving test case:", error);
    }
  };

  const handleRunTest = () => {
    console.log("Running test with steps:", steps);
    // In a real implementation, this would trigger test execution
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Test Builder</h1>
          <p className="text-gray-600">
            Create intelligent test cases with AI assistance
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={handleRunTest}
            disabled={steps.length === 0}
          >
            <Play className="w-4 h-4 mr-2" />
            Run Test
          </Button>
          <Button
            onClick={handleSave}
            disabled={!testName || steps.length === 0}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Test Case
          </Button>
        </div>
      </div>

      {/* Test Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Test Configuration</CardTitle>
          <CardDescription>
            Basic information about your test case
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="test-name">Test Name</Label>
              <Input
                id="test-name"
                placeholder="e.g., User Login Flow"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="test-type">Test Type</Label>
              <Select value={testType} onValueChange={setTestType}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="e2e">End-to-End</SelectItem>
                  <SelectItem value="ui">UI Testing</SelectItem>
                  <SelectItem value="api">API Testing</SelectItem>
                  <SelectItem value="performance">Performance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="test-description">Description</Label>
            <Textarea
              id="test-description"
              placeholder="Describe what this test validates..."
              value={testDescription}
              onChange={(e) => setTestDescription(e.target.value)}
              className="mt-1"
              rows={2}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="ai-enabled"
              checked={aiEnabled}
              onCheckedChange={setAiEnabled}
            />

            <Label htmlFor="ai-enabled" className="text-sm">
              Enable AI assistance and context understanding
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Main Builder Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ai-generate">AI Generate</TabsTrigger>
          <TabsTrigger value="builder">Visual Builder</TabsTrigger>
          <TabsTrigger value="code">Code View</TabsTrigger>
        </TabsList>

        <TabsContent value="ai-generate" className="space-y-4">
          <AIGenerationPanel onGenerate={handleAIGenerate} />
        </TabsContent>

        <TabsContent value="builder" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Test Steps</h3>
            <Button onClick={handleAddStep}>
              <Plus className="w-4 h-4 mr-2" />
              Add Step
            </Button>
          </div>

          {steps.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Bot className="w-6 h-6 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No test steps yet
                </h3>
                <p className="text-gray-500 mb-4">
                  Start by using AI to generate test steps or add them manually
                </p>
                <div className="flex items-center justify-center space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab("ai-generate")}
                  >
                    <Wand2 className="w-4 h-4 mr-2" />
                    Use AI Generator
                  </Button>
                  <Button onClick={handleAddStep}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Manual Step
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {steps.map((step, index) => (
                <StepCard
                  key={step.id}
                  step={step}
                  index={index}
                  onEdit={handleEditStep}
                  onDelete={handleDeleteStep}
                  onMove={handleMoveStep}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="code" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Code className="w-5 h-5" />

                <span>Generated Test Code</span>
              </CardTitle>
              <CardDescription>
                Preview the generated test code that will be executed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-x-auto">
                <code>
                  {`
// Generated Test Case: ${testName || "Untitled Test"}
// Type: ${testType}
// Description: ${testDescription || "No description provided"}

describe('${testName || "Untitled Test"}', () => {
  it('should complete the test flow successfully', async () => {
${steps
  .map(
    (step, index) => `    // Step ${index + 1}: ${step.description}
    await page.${step.action}('${step.element}'${step.value ? `, '${step.value}'` : ""});`
  )
  .join("\n")}
    
    // Verify test completion
    expect(await page.isVisible('[data-testid="success"]')).toBe(true);
  });
});
                `}
                </code>
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
