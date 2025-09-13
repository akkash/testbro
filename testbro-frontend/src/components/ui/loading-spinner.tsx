/**
 * Loading Spinner Component
 * Various loading indicators for different use cases
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// =============================================================================
// Loading Spinner Variants
// =============================================================================

const spinnerVariants = cva('animate-spin', {
  variants: {
    size: {
      xs: 'h-3 w-3',
      sm: 'h-4 w-4',
      md: 'h-6 w-6',
      lg: 'h-8 w-8',
      xl: 'h-12 w-12',
    },
    variant: {
      default: 'text-primary',
      muted: 'text-muted-foreground',
      white: 'text-white',
      success: 'text-green-600',
      warning: 'text-yellow-600',
      error: 'text-red-600',
    },
  },
  defaultVariants: {
    size: 'md',
    variant: 'default',
  },
});

// =============================================================================
// Component Types
// =============================================================================

export interface LoadingSpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {
  /**
   * Loading message to display
   */
  message?: string;
  /**
   * Whether to show the message
   */
  showMessage?: boolean;
  /**
   * Custom spinner type
   */
  type?: 'circular' | 'dots' | 'bars' | 'pulse' | 'ring';
}

// =============================================================================
// Spinner Components
// =============================================================================

const CircularSpinner: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <circle
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeDasharray="32"
      strokeDashoffset="32"
      className="opacity-25"
    />
    <circle
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeDasharray="32"
      strokeDashoffset="20"
      className="opacity-75"
    />
  </svg>
);

const DotsSpinner: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('flex space-x-1', className)}>
    <div className="h-2 w-2 animate-pulse rounded-full bg-current [animation-delay:-0.3s]" />
    <div className="h-2 w-2 animate-pulse rounded-full bg-current [animation-delay:-0.15s]" />
    <div className="h-2 w-2 animate-pulse rounded-full bg-current" />
  </div>
);

const BarsSpinner: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('flex items-end space-x-1', className)}>
    <div className="h-4 w-1 animate-pulse bg-current [animation-delay:-0.4s]" />
    <div className="h-6 w-1 animate-pulse bg-current [animation-delay:-0.3s]" />
    <div className="h-8 w-1 animate-pulse bg-current [animation-delay:-0.2s]" />
    <div className="h-6 w-1 animate-pulse bg-current [animation-delay:-0.1s]" />
    <div className="h-4 w-1 animate-pulse bg-current" />
  </div>
);

const PulseSpinner: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('h-6 w-6 animate-pulse rounded-full bg-current', className)} />
);

const RingSpinner: React.FC<{ className?: string }> = ({ className }) => (
  <div
    className={cn(
      'inline-block animate-spin rounded-full border-2 border-solid border-current border-e-transparent',
      className
    )}
  />
);

// =============================================================================
// Main Loading Spinner Component
// =============================================================================

const LoadingSpinner = React.forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  (
    {
      className,
      size,
      variant,
      message,
      showMessage = true,
      type = 'circular',
      ...props
    },
    ref
  ) => {
    const baseClasses = cn(
      spinnerVariants({ size, variant }),
      'flex-shrink-0'
    );

    const renderSpinner = () => {
      switch (type) {
        case 'dots':
          return <DotsSpinner className={baseClasses} />;
        case 'bars':
          return <BarsSpinner className={baseClasses} />;
        case 'pulse':
          return <PulseSpinner className={baseClasses} />;
        case 'ring':
          return <RingSpinner className={baseClasses} />;
        case 'circular':
        default:
          return <CircularSpinner className={baseClasses} />;
      }
    };

    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center gap-2',
          message && showMessage ? 'flex-row' : 'justify-center',
          className
        )}
        {...props}
      >
        {renderSpinner()}
        {message && showMessage && (
          <span className="text-sm text-muted-foreground">{message}</span>
        )}
      </div>
    );
  }
);

LoadingSpinner.displayName = 'LoadingSpinner';

// =============================================================================
// Loading State Components
// =============================================================================

/**
 * Page loading overlay
 */
export const PageLoader: React.FC<{
  message?: string;
  className?: string;
}> = ({ message = 'Loading...', className }) => (
  <div
    className={cn(
      'fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm',
      className
    )}
  >
    <div className="flex flex-col items-center space-y-4">
      <LoadingSpinner size="xl" message={message} />
    </div>
  </div>
);

/**
 * Inline loading state
 */
export const InlineLoader: React.FC<{
  message?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}> = ({ message, size = 'sm', className }) => (
  <LoadingSpinner
    size={size}
    message={message}
    className={cn('py-2', className)}
  />
);

/**
 * Button loading state
 */
export const ButtonLoader: React.FC<{
  className?: string;
}> = ({ className }) => (
  <LoadingSpinner
    size="sm"
    type="ring"
    showMessage={false}
    className={className}
  />
);

/**
 * Card loading skeleton
 */
export const CardSkeleton: React.FC<{
  lines?: number;
  showAvatar?: boolean;
  className?: string;
}> = ({ lines = 3, showAvatar = false, className }) => (
  <div className={cn('space-y-3 p-4', className)}>
    {showAvatar && (
      <div className="flex items-center space-x-3">
        <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
        <div className="space-y-2">
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          <div className="h-3 w-16 animate-pulse rounded bg-muted" />
        </div>
      </div>
    )}
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'h-4 animate-pulse rounded bg-muted',
            i === lines - 1 ? 'w-3/4' : 'w-full'
          )}
        />
      ))}
    </div>
  </div>
);

/**
 * Table loading skeleton
 */
export const TableSkeleton: React.FC<{
  rows?: number;
  columns?: number;
  className?: string;
}> = ({ rows = 5, columns = 4, className }) => (
  <div className={cn('space-y-2', className)}>
    {/* Header skeleton */}
    <div className="flex space-x-4 border-b pb-2">
      {Array.from({ length: columns }).map((_, i) => (
        <div key={i} className="h-4 flex-1 animate-pulse rounded bg-muted" />
      ))}
    </div>
    {/* Row skeletons */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="flex space-x-4 py-2">
        {Array.from({ length: columns }).map((_, colIndex) => (
          <div
            key={colIndex}
            className="h-4 flex-1 animate-pulse rounded bg-muted/60"
          />
        ))}
      </div>
    ))}
  </div>
);

// =============================================================================
// Exports
// =============================================================================

export {
  LoadingSpinner,
  spinnerVariants,
  PageLoader,
  InlineLoader,
  ButtonLoader,
  CardSkeleton,
  TableSkeleton,
};
export type { LoadingSpinnerProps };
