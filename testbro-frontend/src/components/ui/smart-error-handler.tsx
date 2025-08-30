import React from 'react'
import { 
  AlertTriangle, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  Database, 
  Clock,
  CheckCircle,
  PlayCircle,
  FileText,
  Lightbulb
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'

export type ErrorType = 
  | 'network' 
  | 'authentication' 
  | 'authorization' 
  | 'server' 
  | 'timeout' 
  | 'not_found'
  | 'validation'
  | 'rate_limit'

export interface ErrorInfo {
  type: ErrorType
  message: string
  code?: string
  details?: string
  timestamp?: Date
}

export interface RecoveryAction {
  label: string
  action: () => void | Promise<void>
  primary?: boolean
  icon?: React.ReactNode
}

export interface SampleDataOption {
  label: string
  description: string
  action: () => void
  icon: React.ReactNode
}

interface SmartErrorHandlerProps {
  error: ErrorInfo
  context: 'projects' | 'targets' | 'cases' | 'suites' | 'results' | 'analytics'
  onRetry?: () => void
  onUseSampleData?: () => void
  sampleDataOptions?: SampleDataOption[]
  className?: string
}

export function SmartErrorHandler({
  error,
  context,
  onRetry,
  onUseSampleData,
  sampleDataOptions = [],
  className = ''
}: SmartErrorHandlerProps) {
  
  const getErrorConfig = (type: ErrorType) => {
    switch (type) {
      case 'network':
        return {
          icon: <WifiOff className="w-6 h-6 text-red-500" />,
          title: 'Connection Problem',
          description: 'Unable to connect to the server. This might be a temporary network issue.',
          color: 'red',
          recoverySteps: [
            'Check your internet connection',
            'Try refreshing the page',
            'Contact support if the problem persists'
          ]
        }
      case 'authentication':
        return {
          icon: <AlertTriangle className="w-6 h-6 text-orange-500" />,
          title: 'Authentication Required',
          description: 'Your session has expired or you need to log in again.',
          color: 'orange',
          recoverySteps: [
            'Try logging in again',
            'Clear your browser cache',
            'Check if your account is still active'
          ]
        }
      case 'authorization':
        return {
          icon: <AlertTriangle className="w-6 h-6 text-red-500" />,
          title: 'Permission Denied',
          description: 'You don\'t have permission to access this resource.',
          color: 'red',
          recoverySteps: [
            'Contact your team admin for access',
            'Verify you\'re in the correct organization',
            'Check your subscription plan limits'
          ]
        }
      case 'server':
        return {
          icon: <Database className="w-6 h-6 text-red-500" />,
          title: 'Server Error',
          description: 'Something went wrong on our end. Our team has been notified.',
          color: 'red',
          recoverySteps: [
            'Try again in a few moments',
            'Check our status page for updates',
            'Contact support if the issue continues'
          ]
        }
      case 'timeout':
        return {
          icon: <Clock className="w-6 h-6 text-yellow-500" />,
          title: 'Request Timeout',
          description: 'The request took too long to complete.',
          color: 'yellow',
          recoverySteps: [
            'Try reducing the data range',
            'Check your network speed',
            'Wait a moment and try again'
          ]
        }
      case 'not_found':
        return {
          icon: <FileText className="w-6 h-6 text-gray-500" />,
          title: 'No Data Found',
          description: 'This might be your first time here, or the data hasn\'t been set up yet.',
          color: 'gray',
          recoverySteps: [
            'Start by creating your first item',
            'Import existing data if available',
            'Use sample data to explore features'
          ]
        }
      case 'rate_limit':
        return {
          icon: <Clock className="w-6 h-6 text-orange-500" />,
          title: 'Rate Limit Exceeded',
          description: 'Too many requests. Please wait before trying again.',
          color: 'orange',
          recoverySteps: [
            'Wait a few minutes before retrying',
            'Reduce the frequency of requests',
            'Consider upgrading your plan for higher limits'
          ]
        }
      default:
        return {
          icon: <AlertTriangle className="w-6 h-6 text-red-500" />,
          title: 'Something Went Wrong',
          description: 'An unexpected error occurred.',
          color: 'red',
          recoverySteps: [
            'Try refreshing the page',
            'Clear your browser cache',
            'Contact support if the problem persists'
          ]
        }
    }
  }

  const errorConfig = getErrorConfig(error.type)
  
  const getContextualActions = (): RecoveryAction[] => {
    const baseActions: RecoveryAction[] = []
    
    if (onRetry) {
      baseActions.push({
        label: 'Try Again',
        action: onRetry,
        primary: true,
        icon: <RefreshCw className="w-4 h-4" />
      })
    }

    // Add context-specific actions
    switch (context) {
      case 'projects':
        baseActions.push({
          label: 'Create First Project',
          action: () => {
            // This would trigger the create project dialog
            console.log('Create project action')
          },
          icon: <PlayCircle className="w-4 h-4" />
        })
        break
      case 'targets':
        baseActions.push({
          label: 'Add Test Target',
          action: () => {
            console.log('Add target action')
          },
          icon: <PlayCircle className="w-4 h-4" />
        })
        break
      case 'cases':
        baseActions.push({
          label: 'Create Test Case',
          action: () => {
            console.log('Create test case action')
          },
          icon: <PlayCircle className="w-4 h-4" />
        })
        break
    }

    return baseActions
  }

  const getDefaultSampleData = (): SampleDataOption[] => {
    if (sampleDataOptions.length > 0) return sampleDataOptions

    switch (context) {
      case 'projects':
        return [
          {
            label: 'E-commerce Demo',
            description: 'Sample project with shopping cart tests',
            action: () => console.log('Load ecommerce demo'),
            icon: <FileText className="w-4 h-4" />
          },
          {
            label: 'SaaS Landing Page',
            description: 'Marketing site with contact forms',
            action: () => console.log('Load saas demo'),
            icon: <FileText className="w-4 h-4" />
          }
        ]
      case 'analytics':
        return [
          {
            label: 'View Sample Analytics',
            description: 'Explore with 30 days of sample data',
            action: () => console.log('Load sample analytics'),
            icon: <FileText className="w-4 h-4" />
          }
        ]
      default:
        return []
    }
  }

  return (
    <div className={`max-w-2xl mx-auto p-6 ${className}`}>
      {/* Error Display */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center space-x-3">
            {errorConfig.icon}
            <div>
              <CardTitle className="text-lg">{errorConfig.title}</CardTitle>
              <CardDescription>{errorConfig.description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Error Details */}
          {(error.details || error.code) && (
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {error.details && <div className="mb-2">{error.details}</div>}
                {error.code && (
                  <div className="text-xs text-gray-500">
                    Error Code: {error.code}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Recovery Steps */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
              <Lightbulb className="w-4 h-4 mr-2" />
              What you can try:
            </h4>
            <ul className="space-y-2">
              {errorConfig.recoverySteps.map((step, index) => (
                <li key={index} className="flex items-start space-x-2 text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {getContextualActions().map((action, index) => (
              <Button
                key={index}
                variant={action.primary ? "default" : "outline"}
                onClick={action.action}
                className="flex items-center"
              >
                {action.icon}
                <span className="ml-2">{action.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sample Data Options */}
      {(error.type === 'not_found' || !onRetry) && getDefaultSampleData().length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Explore with Sample Data</CardTitle>
            <CardDescription>
              Get a feel for the features while we set up your real data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {getDefaultSampleData().map((option, index) => (
                <Button
                  key={index}
                  variant="outline"
                  onClick={option.action}
                  className="flex items-start justify-start p-4 h-auto text-left"
                >
                  <div className="flex items-start space-x-3">
                    {option.icon}
                    <div>
                      <div className="font-medium text-sm">{option.label}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {option.description}
                      </div>
                    </div>
                  </div>
                </Button>
              ))}
            </div>

            {onUseSampleData && (
              <Button 
                onClick={onUseSampleData}
                className="w-full mt-4"
                variant="outline"
              >
                <PlayCircle className="w-4 h-4 mr-2" />
                Use Sample Data for Now
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Help Links */}
      <div className="mt-6 flex items-center justify-center space-x-6 text-sm text-gray-500">
        <a href="/docs/troubleshooting" className="hover:text-gray-700">
          📚 Troubleshooting Guide
        </a>
        <span>•</span>
        <a href="/support" className="hover:text-gray-700">
          💬 Contact Support
        </a>
        <span>•</span>
        <a href="/status" className="hover:text-gray-700">
          📊 System Status
        </a>
      </div>
    </div>
  )
}

// Hook for enhanced error handling
export function useSmartErrorHandler() {
  const handleError = (error: any, context: string): ErrorInfo => {
    // Parse different types of errors
    if (error?.response?.status) {
      const status = error.response.status
      
      switch (status) {
        case 401:
          return {
            type: 'authentication',
            message: 'Authentication required',
            code: `HTTP ${status}`,
            timestamp: new Date()
          }
        case 403:
          return {
            type: 'authorization',
            message: 'Permission denied',
            code: `HTTP ${status}`,
            timestamp: new Date()
          }
        case 404:
          return {
            type: 'not_found',
            message: 'Resource not found',
            code: `HTTP ${status}`,
            timestamp: new Date()
          }
        case 429:
          return {
            type: 'rate_limit',
            message: 'Too many requests',
            code: `HTTP ${status}`,
            timestamp: new Date()
          }
        case 408:
        case 504:
          return {
            type: 'timeout',
            message: 'Request timeout',
            code: `HTTP ${status}`,
            timestamp: new Date()
          }
        default:
          if (status >= 500) {
            return {
              type: 'server',
              message: 'Server error',
              code: `HTTP ${status}`,
              timestamp: new Date()
            }
          }
      }
    }

    // Network errors
    if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('fetch')) {
      return {
        type: 'network',
        message: 'Network connection failed',
        details: 'Check your internet connection and try again',
        timestamp: new Date()
      }
    }

    // Default error
    return {
      type: 'server',
      message: error?.message || 'An unexpected error occurred',
      timestamp: new Date()
    }
  }

  return { handleError }
}