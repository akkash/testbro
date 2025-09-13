/**
 * Error State Component
 * Displays error messages with appropriate actions and illustrations
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import {
  ExclamationTriangleIcon,
  XCircleIcon,
  SignalSlashIcon,
  ServerStackIcon,
  ShieldExclamationIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// =============================================================================
// Error State Variants
// =============================================================================

const errorStateVariants = cva(
  'flex flex-col items-center justify-center text-center',
  {
    variants: {
      variant: {
        default: '',
        destructive: 'text-destructive',
        warning: 'text-warning',
        muted: 'text-muted-foreground',
      },
      size: {
        sm: 'py-4 px-6',
        md: 'py-8 px-6',
        lg: 'py-12 px-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

// =============================================================================
// Error Type Configurations
// =============================================================================

const errorConfigs = {
  network: {
    icon: SignalSlashIcon,
    title: 'Connection Error',
    description: 'Unable to connect to the server. Please check your internet connection.',
    variant: 'destructive' as const,
  },
  server: {
    icon: ServerStackIcon,
    title: 'Server Error',
    description: 'Something went wrong on our end. Our team has been notified.',
    variant: 'destructive' as const,
  },
  notFound: {
    icon: ExclamationTriangleIcon,
    title: 'Not Found',
    description: 'The resource you are looking for could not be found.',
    variant: 'warning' as const,
  },
  unauthorized: {
    icon: ShieldExclamationIcon,
    title: 'Access Denied',
    description: 'You do not have permission to access this resource.',
    variant: 'destructive' as const,
  },
  timeout: {
    icon: ClockIcon,
    title: 'Request Timeout',
    description: 'The request took too long to complete. Please try again.',
    variant: 'warning' as const,
  },
  validation: {
    icon: XCircleIcon,
    title: 'Invalid Data',
    description: 'Please check your input and try again.',
    variant: 'warning' as const,
  },
  generic: {
    icon: ExclamationTriangleIcon,
    title: 'Something went wrong',
    description: 'An unexpected error occurred. Please try again.',
    variant: 'destructive' as const,
  },
} as const;

// =============================================================================
// Component Types
// =============================================================================

export interface ErrorStateProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof errorStateVariants> {
  /**
   * Error type for predefined configurations
   */
  type?: keyof typeof errorConfigs;
  /**
   * Custom error title
   */
  title?: string;
  /**
   * Custom error description
   */
  description?: string;
  /**
   * Custom icon
   */
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  /**
   * Whether to show the retry button
   */
  showRetry?: boolean;
  /**
   * Retry button text
   */
  retryText?: string;
  /**
   * Retry callback function
   */
  onRetry?: () => void;
  /**
   * Additional action buttons
   */
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  }>;
  /**
   * Whether to render as a card
   */
  asCard?: boolean;
  /**
   * Error details for debugging (only shown in development)
   */
  errorDetails?: string | Error;
}

// =============================================================================
// Error State Component
// =============================================================================

const ErrorState = React.forwardRef<HTMLDivElement, ErrorStateProps>(
  (
    {
      className,
      variant,
      size,
      type = 'generic',
      title: customTitle,
      description: customDescription,
      icon: CustomIcon,
      showRetry = true,
      retryText = 'Try Again',
      onRetry,
      actions = [],
      asCard = false,
      errorDetails,
      ...props
    },
    ref
  ) => {
    const config = errorConfigs[type];
    const effectiveVariant = variant || config.variant;
    const title = customTitle || config.title;
    const description = customDescription || config.description;
    const IconComponent = CustomIcon || config.icon;

    // Show error details in development
    const isDevelopment = process.env.NODE_ENV === 'development';
    const detailsText = errorDetails instanceof Error ? errorDetails.message : errorDetails;

    const content = (
      <div className={cn(errorStateVariants({ variant: effectiveVariant, size }), className)} {...props}>
        {/* Icon */}
        <div className="mb-4">
          <IconComponent className="h-16 w-16 text-muted-foreground/60" />
        </div>

        {/* Title */}
        <h3 className="mb-2 text-lg font-semibold">{title}</h3>

        {/* Description */}
        <p className="mb-6 max-w-md text-muted-foreground">{description}</p>

        {/* Error details (development only) */}
        {isDevelopment && detailsText && (
          <details className="mb-6 w-full max-w-md">
            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
              Error Details
            </summary>
            <pre className="mt-2 overflow-auto rounded bg-muted p-2 text-left text-xs">
              {detailsText}
            </pre>
          </details>
        )}

        {/* Actions */}
        {(showRetry || actions.length > 0) && (
          <div className="flex flex-wrap gap-2 justify-center">
            {showRetry && onRetry && (
              <Button onClick={onRetry} variant="default">
                {retryText}
              </Button>
            )}
            {actions.map((action, index) => (
              <Button
                key={index}
                onClick={action.onClick}
                variant={action.variant || 'outline'}
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>
    );

    if (asCard) {
      return (
        <Card ref={ref} className={className}>
          <CardContent className="pt-6">
            {content}
          </CardContent>
        </Card>
      );
    }

    return (
      <div ref={ref}>
        {content}
      </div>
    );
  }
);

ErrorState.displayName = 'ErrorState';

// =============================================================================
// Error State Presets
// =============================================================================

/**
 * Network connection error
 */
export const NetworkError: React.FC<{
  onRetry?: () => void;
  className?: string;
}> = ({ onRetry, className }) => (
  <ErrorState
    type="network"
    onRetry={onRetry}
    className={className}
  />
);

/**
 * Server error
 */
export const ServerError: React.FC<{
  onRetry?: () => void;
  errorDetails?: string | Error;
  className?: string;
}> = ({ onRetry, errorDetails, className }) => (
  <ErrorState
    type="server"
    onRetry={onRetry}
    errorDetails={errorDetails}
    className={className}
  />
);

/**
 * 404 Not Found error
 */
export const NotFoundError: React.FC<{
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}> = ({ title, description, onRetry, className }) => (
  <ErrorState
    type="notFound"
    title={title}
    description={description}
    onRetry={onRetry}
    className={className}
  />
);

/**
 * Unauthorized access error
 */
export const UnauthorizedError: React.FC<{
  onRetry?: () => void;
  className?: string;
}> = ({ onRetry, className }) => (
  <ErrorState
    type="unauthorized"
    onRetry={onRetry}
    retryText="Sign In"
    className={className}
  />
);

/**
 * Request timeout error
 */
export const TimeoutError: React.FC<{
  onRetry?: () => void;
  className?: string;
}> = ({ onRetry, className }) => (
  <ErrorState
    type="timeout"
    onRetry={onRetry}
    className={className}
  />
);

/**
 * Validation error
 */
export const ValidationError: React.FC<{
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}> = ({ title, description, onRetry, className }) => (
  <ErrorState
    type="validation"
    title={title}
    description={description}
    onRetry={onRetry}
    retryText="Go Back"
    className={className}
  />
);

/**
 * Generic error boundary fallback
 */
export const ErrorFallback: React.FC<{
  error?: Error;
  resetError?: () => void;
  className?: string;
}> = ({ error, resetError, className }) => (
  <ErrorState
    type="generic"
    onRetry={resetError}
    errorDetails={error}
    retryText="Reset"
    className={className}
    asCard
  />
);

// =============================================================================
// Inline Error Components
// =============================================================================

/**
 * Inline error message
 */
export const InlineError: React.FC<{
  message: string;
  className?: string;
}> = ({ message, className }) => (
  <div className={cn('flex items-center gap-2 text-sm text-destructive', className)}>
    <XCircleIcon className="h-4 w-4" />
    <span>{message}</span>
  </div>
);

/**
 * Form field error
 */
export const FieldError: React.FC<{
  error?: string;
  className?: string;
}> = ({ error, className }) => {
  if (!error) return null;

  return (
    <p className={cn('mt-1 text-sm text-destructive', className)}>
      {error}
    </p>
  );
};

// =============================================================================
// Exports
// =============================================================================

export {
  ErrorState,
  errorStateVariants,
  NetworkError,
  ServerError,
  NotFoundError,
  UnauthorizedError,
  TimeoutError,
  ValidationError,
  ErrorFallback,
  InlineError,
  FieldError,
};
export type { ErrorStateProps };
