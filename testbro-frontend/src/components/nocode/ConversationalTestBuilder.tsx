import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  MessageCircle, 
  Bot, 
  User, 
  Sparkles,
  Code,
  Play,
  Save,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Lightbulb,
  ArrowRight,
  Copy,
  Download
} from 'lucide-react';
import { ConversationMessage, NoCodeTestStep, TestCase } from '../../../types';
import { useConversationalAI } from '../hooks/useConversationalAI';

interface TestGenerationProgress {
  stage: 'understanding' | 'planning' | 'generating' | 'validating' | 'completed';
  progress: number;
  message: string;
  details?: string;
}

interface ConversationContextType {
  target_url?: string;
  user_intent?: string;
  test_type?: 'functional' | 'regression' | 'smoke' | 'integration' | 'e2e';
  complexity?: 'simple' | 'moderate' | 'complex';
  previous_steps?: NoCodeTestStep[];
  domain_knowledge?: string;
}

const messageSuggestions = [
  "Create a login test for my website",
  "Test the checkout process for an e-commerce site",
  "Verify the contact form submission",
  "Test user registration with email verification",
  "Check that the search functionality works correctly",
  "Test password reset flow",
  "Verify mobile responsive navigation menu",
  "Test file upload functionality"
];

const ConversationMessage: React.FC<{
  message: ConversationMessage;
  isLatest: boolean;
  onRegenerateResponse?: () => void;
  onCopyTest?: (steps: NoCodeTestStep[]) => void;
}> = ({ message, isLatest, onRegenerateResponse, onCopyTest }) => {
  const isUser = message.type === 'user';
  const isSystem = message.type === 'system';
  
  const renderMessageContent = () => {
    if (message.metadata?.generated_steps) {
      return (
        <div className="space-y-4">
          <div className="prose prose-sm max-w-none">
            <p>{message.content}</p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-900">Generated Test Steps</h4>
              <div className="flex space-x-2">
                <button
                  onClick={() => onCopyTest?.(message.metadata?.generated_steps || [])}
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy Test</span>
                </button>
                <button
                  onClick={onRegenerateResponse}
                  className="text-xs text-gray-600 hover:text-gray-800 flex items-center space-x-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Regenerate</span>
                </button>
              </div>
            </div>
            
            <div className="space-y-2">
              {message.metadata.generated_steps.map((step: any, index: number) => (
                <div key={index} className="flex items-start space-x-3 p-2 bg-white rounded border">
                  <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{step.natural_language || step.description}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        {step.action_type}
                      </span>
                      {step.confidence_score && (
                        <span className={`text-xs px-2 py-1 rounded ${
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
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (message.metadata?.suggestions) {
      return (
        <div className="space-y-3">
          <div className="prose prose-sm max-w-none">
            <p>{message.content}</p>
          </div>
          <div className="space-y-2">
            {message.metadata.suggestions.map((suggestion: string, index: number) => (
              <div key={index} className="flex items-start space-x-2 text-sm">
                <Lightbulb className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">{suggestion}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="prose prose-sm max-w-none">
        <p>{message.content}</p>
      </div>
    );
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 ${isUser ? 'ml-3' : 'mr-3'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            isUser 
              ? 'bg-blue-600 text-white' 
              : isSystem 
              ? 'bg-gray-500 text-white'
              : 'bg-green-600 text-white'
          }`}>
            {isUser ? <User className="w-4 h-4" /> : isSystem ? <AlertCircle className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
          </div>
        </div>

        {/* Message Content */}
        <div className={`px-4 py-3 rounded-lg ${
          isUser 
            ? 'bg-blue-600 text-white' 
            : isSystem
            ? 'bg-gray-100 text-gray-900'
            : 'bg-white border border-gray-200 text-gray-900'
        }`}>
          <div className="text-sm">
            {renderMessageContent()}
          </div>
          
          {/* Metadata */}
          <div className={`text-xs mt-2 ${isUser ? 'text-blue-100' : 'text-gray-500'}`}>
            {new Date(message.timestamp).toLocaleTimeString()}
            {message.metadata?.confidence && (
              <span className="ml-2">
                • {Math.round(message.metadata.confidence * 100)}% confident
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const TestGenerationProgressIndicator: React.FC<{ progress: TestGenerationProgress }> = ({ progress }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center">
            <Bot className="w-4 h-4" />
          </div>
        </div>
        
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-900">{progress.message}</span>
            <span className="text-xs text-gray-500">{progress.progress}%</span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-600 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress.progress}%` }}
            />
          </div>
          
          {progress.details && (
            <p className="text-xs text-gray-600 mt-2">{progress.details}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export const ConversationalTestBuilder: React.FC<{
  sessionId?: string;
  context?: ConversationContextType;
  onTestGenerated: (testCase: Partial<TestCase>) => void;
  onSaveSession: (sessionId: string) => void;
}> = ({ sessionId, context, onTestGenerated, onSaveSession }) => {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<TestGenerationProgress | null>(null);
  const [conversationContext, setConversationContext] = useState<ConversationContextType>(context || {});
  const [selectedSuggestion, setSelectedSuggestion] = useState<string>('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { generateTestFromConversation, sendMessage, getSessionHistory } = useConversationalAI();

  // Initialize conversation
  useEffect(() => {
    if (sessionId) {
      loadSessionHistory();
    } else {
      initializeConversation();
    }
  }, [sessionId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, generationProgress]);

  const loadSessionHistory = async () => {
    if (!sessionId) return;
    try {
      const history = await getSessionHistory(sessionId);
      setMessages(history);
    } catch (error) {
      console.error('Failed to load session history:', error);
    }
  };

  const initializeConversation = () => {
    const welcomeMessage: ConversationMessage = {
      id: `msg-${Date.now()}`,
      session_id: sessionId || '',
      type: 'assistant',
      content: "Hi! I'm here to help you create automated tests using natural language. Just describe what you want to test, and I'll generate the test steps for you.",
      metadata: {
        intent: 'welcome',
        suggestions: [
          "Be specific about the functionality you want to test",
          "Mention the type of application (web, mobile, etc.)",
          "Include any specific user flows or scenarios",
          "Tell me about the expected outcomes"
        ]
      },
      timestamp: new Date().toISOString()
    };

    setMessages([welcomeMessage]);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isGenerating) return;

    const userMessage: ConversationMessage = {
      id: `msg-${Date.now()}`,
      session_id: sessionId || `session-${Date.now()}`,
      type: 'user',
      content: inputMessage.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsGenerating(true);

    try {
      // Simulate AI processing with progress updates
      await simulateAIProcessing();

      // Generate AI response
      const response = await sendMessage(userMessage.content, {
        session_id: userMessage.session_id,
        context: conversationContext
      });

      const aiMessage: ConversationMessage = {
        id: `msg-${Date.now()}`,
        session_id: userMessage.session_id,
        type: 'assistant',
        content: response.content,
        metadata: response.metadata,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, aiMessage]);

      // Update conversation context
      if (response.metadata?.updated_context) {
        setConversationContext(prev => ({ ...prev, ...response.metadata.updated_context }));
      }

    } catch (error) {
      const errorMessage: ConversationMessage = {
        id: `msg-${Date.now()}`,
        session_id: userMessage.session_id,
        type: 'system',
        content: 'Sorry, I encountered an error while processing your request. Please try again.',
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsGenerating(false);
      setGenerationProgress(null);
    }
  };

  const simulateAIProcessing = async () => {
    const stages: Omit<TestGenerationProgress, 'progress'>[] = [
      { stage: 'understanding', message: 'Understanding your request...', details: 'Analyzing the test requirements and user intent' },
      { stage: 'planning', message: 'Planning test structure...', details: 'Identifying test steps and user flows' },
      { stage: 'generating', message: 'Generating test steps...', details: 'Creating automated test actions' },
      { stage: 'validating', message: 'Validating test logic...', details: 'Ensuring test completeness and accuracy' },
      { stage: 'completed', message: 'Test generation complete!', details: 'Ready to review and use your test' }
    ];

    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      const progress = ((i + 1) / stages.length) * 100;
      
      setGenerationProgress({
        ...stage,
        progress
      });

      await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400));
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputMessage(suggestion);
    inputRef.current?.focus();
  };

  const handleRegenerateResponse = async () => {
    if (messages.length < 2) return;

    const lastUserMessage = [...messages].reverse().find(m => m.type === 'user');
    if (!lastUserMessage) return;

    // Remove the last AI response
    setMessages(prev => prev.filter(m => 
      !(m.type === 'assistant' && m.timestamp > lastUserMessage.timestamp)
    ));

    setIsGenerating(true);

    try {
      await simulateAIProcessing();

      const response = await sendMessage(lastUserMessage.content, {
        session_id: lastUserMessage.session_id,
        context: conversationContext,
        regenerate: true
      });

      const aiMessage: ConversationMessage = {
        id: `msg-${Date.now()}`,
        session_id: lastUserMessage.session_id,
        type: 'assistant',
        content: response.content,
        metadata: response.metadata,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error('Failed to regenerate response:', error);
    } finally {
      setIsGenerating(false);
      setGenerationProgress(null);
    }
  };

  const handleCopyTest = (steps: NoCodeTestStep[]) => {
    const testCase: Partial<TestCase> = {
      name: `AI Generated Test - ${new Date().toLocaleString()}`,
      description: `Test generated from conversation: "${messages.find(m => m.type === 'user')?.content || 'AI Generated'}"`,
      steps: steps,
      priority: 'medium',
      status: 'draft',
      ai_generated: true,
      ai_metadata: {
        prompt: messages.filter(m => m.type === 'user').map(m => m.content).join(' '),
        model: 'gpt-4',
        confidence_score: steps.reduce((sum, step) => sum + (step.confidence_score || 0), 0) / steps.length,
        generated_at: new Date().toISOString()
      },
      tags: ['ai-generated', 'conversational']
    };

    onTestGenerated(testCase);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-green-500 text-white rounded-lg flex items-center justify-center">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Conversational Test Builder</h1>
              <p className="text-sm text-gray-600">Describe your test requirements in natural language</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onSaveSession(sessionId || `session-${Date.now()}`)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Save className="w-4 h-4" />
              <span>Save Session</span>
            </button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          {/* Context Display */}
          {Object.keys(conversationContext).length > 0 && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-2">Test Context</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {conversationContext.target_url && (
                  <div>
                    <span className="text-blue-700 font-medium">Target URL:</span>
                    <span className="ml-2 text-blue-600">{conversationContext.target_url}</span>
                  </div>
                )}
                {conversationContext.test_type && (
                  <div>
                    <span className="text-blue-700 font-medium">Test Type:</span>
                    <span className="ml-2 text-blue-600 capitalize">{conversationContext.test_type}</span>
                  </div>
                )}
                {conversationContext.complexity && (
                  <div>
                    <span className="text-blue-700 font-medium">Complexity:</span>
                    <span className="ml-2 text-blue-600 capitalize">{conversationContext.complexity}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((message) => (
            <ConversationMessage
              key={message.id}
              message={message}
              isLatest={message.id === messages[messages.length - 1]?.id}
              onRegenerateResponse={handleRegenerateResponse}
              onCopyTest={handleCopyTest}
            />
          ))}

          {/* Generation Progress */}
          {generationProgress && (
            <TestGenerationProgressIndicator progress={generationProgress} />
          )}

          {/* Message Suggestions */}
          {messages.length <= 1 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Try asking me to:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {messageSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="text-left p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all duration-200"
                  >
                    <div className="flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{suggestion}</span>
                      <ArrowRight className="w-4 h-4 text-gray-400 ml-auto" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end space-x-3">
            <div className="flex-1">
              <textarea
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Describe the test you want to create... (e.g., 'Test user login with invalid credentials')"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows={3}
                disabled={isGenerating}
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isGenerating}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isGenerating ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
              <span>{isGenerating ? 'Generating...' : 'Send'}</span>
            </button>
          </div>
          
          <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
            <div>Press Enter to send, Shift+Enter for new line</div>
            <div>{inputMessage.length}/1000 characters</div>
          </div>
        </div>
      </div>
    </div>
  );
};