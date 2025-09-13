/**
 * Status Badge Component
 * Displays status information with appropriate colors and icons
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ExclamationTriangleIcon, 
  InformationCircleIcon,
  ClockIcon,
  PlayIcon,
  StopIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

// =============================================================================
// Status Badge Variants
// =============================================================================

const statusBadgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive: 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground',
        success: 'border-transparent bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-100',
        warning: 'border-transparent bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-100',
        error: 'border-transparent bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-100',
        info: 'border-transparent bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-100',
        pending: 'border-transparent bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100',
        running: 'border-transparent bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-100',
        passed: 'border-transparent bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-100',
        failed: 'border-transparent bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-100',
        cancelled: 'border-transparent bg-orange-100 text-orange-800 hover:bg-orange-200 dark:bg-orange-900 dark:text-orange-100',
        timeout: 'border-transparent bg-purple-100 text-purple-800 hover:bg-purple-200 dark:bg-purple-900 dark:text-purple-100',
      },
      size: {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-0.5 text-sm',
        lg: 'px-3 py-1 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

// =============================================================================
// Icon Mapping
// =============================================================================

const statusIcons = {
  success: CheckCircleIcon,
  warning: ExclamationTriangleIcon,
  error: XCircleIcon,
  info: InformationCircleIcon,
  pending: ClockIcon,
  running: PlayIcon,
  passed: CheckCircleIcon,
  failed: XCircleIcon,
  cancelled: StopIcon,
  timeout: XMarkIcon,
} as const;

// =============================================================================
// Component Types
// =============================================================================

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statusBadgeVariants> {
  /**
   * The status to display
   */
  status?: keyof typeof statusIcons;
  /**
   * Whether to show an icon
   */
  showIcon?: boolean;
  /**
   * Custom icon to display
   */
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  /**
   * Whether the status is animated (for running states)
   */
  animated?: boolean;
  /**
   * Additional content to display
   */
  children?: React.ReactNode;
}

// =============================================================================
// Status Badge Component
// =============================================================================

const StatusBadge = React.forwardRef<HTMLDivElement, StatusBadgeProps>(
  (
    {
      className,
      variant,
      size,
      status,
      showIcon = true,
      icon: CustomIcon,
      animated = false,
      children,
      ...props
    },
    ref
  ) => {
    // Determine the variant based on status
    const effectiveVariant = variant || status || 'default';
    
    // Get the appropriate icon
    const IconComponent = CustomIcon || (status ? statusIcons[status] : null);
    
    // Icon size based on badge size
    const iconSize = {
      sm: 'h-3 w-3',
      md: 'h-4 w-4',
      lg: 'h-4 w-4',
    }[size || 'md'];

    return (
      <div
        ref={ref}
        className={cn(
          statusBadgeVariants({ variant: effectiveVariant as any, size }),
          animated && status === 'running' && 'animate-pulse',
          className
        )}
        {...props}
      >
        {showIcon && IconComponent && (
          <IconComponent 
            className={cn(
              iconSize,
              animated && status === 'running' && 'animate-spin'
            )} 
          />
        )}
        {children}
      </div>
    );
  }
);

StatusBadge.displayName = 'StatusBadge';

// =============================================================================
// Status Badge Presets
// =============================================================================

/**
 * Test execution status badges
 */
export const TestStatusBadge: React.FC<{
  status: 'pending' | 'running' | 'passed' | 'failed' | 'cancelled' | 'timeout';
  className?: string;
  showIcon?: boolean;
}> = ({ status, className, showIcon = true }) => {
  const statusText = {
    pending: 'Pending',
    running: 'Running',
    passed: 'Passed',
    failed: 'Failed',
    cancelled: 'Cancelled',
    timeout: 'Timeout',
  };

  return (
    <StatusBadge
      status={status}
      variant={status}
      showIcon={showIcon}
      animated={status === 'running'}
      className={className}
    >
      {statusText[status]}
    </StatusBadge>
  );
};

/**
 * General status badges
 */
export const GeneralStatusBadge: React.FC<{
  status: 'success' | 'warning' | 'error' | 'info';
  text: string;
  className?: string;
  showIcon?: boolean;
}> = ({ status, text, className, showIcon = true }) => (
  <StatusBadge
    status={status}
    variant={status}
    showIcon={showIcon}
    className={className}
  >
    {text}
  </StatusBadge>
);

// =============================================================================
// Exports
// =============================================================================

export { StatusBadge, statusBadgeVariants };
export type { StatusBadgeProps };
