/**
 * Component Utility Functions
 * Enhanced utilities for TestBro UI components
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { designSystem } from '../config/design-system';

// Re-export the main cn function
export { cn } from './utils';

// =============================================================================
// Component Utilities
// =============================================================================

/**
 * Create component variants using our design system
 */
export function createVariants<T extends Record<string, Record<string, any>>>(
  variants: T
): T {
  return variants;
}

/**
 * Combine class names with design system tokens
 */
export function cnWithTokens(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Get color from design system
 */
export function getColor(color: string, shade: number = 500): string {
  const colorFamily = designSystem.colors[color as keyof typeof designSystem.colors];
  if (typeof colorFamily === 'object' && colorFamily !== null) {
    return (colorFamily as Record<number, string>)[shade] || color;
  }
  return color;
}

/**
 * Get spacing from design system
 */
export function getSpacing(space: string | number): string {
  if (typeof space === 'number') {
    return designSystem.spacing[space as keyof typeof designSystem.spacing] || `${space}px`;
  }
  return designSystem.spacing[space as keyof typeof designSystem.spacing] || space;
}

/**
 * Create responsive classes
 */
export function responsive(classes: {
  base?: string;
  sm?: string;
  md?: string;
  lg?: string;
  xl?: string;
  '2xl'?: string;
}): string {
  return cnWithTokens(
    classes.base,
    classes.sm && `sm:${classes.sm}`,
    classes.md && `md:${classes.md}`,
    classes.lg && `lg:${classes.lg}`,
    classes.xl && `xl:${classes.xl}`,
    classes['2xl'] && `2xl:${classes['2xl']}`
  );
}

/**
 * Create state-based classes
 */
export function stateClasses(
  base: string,
  states: {
    hover?: string;
    focus?: string;
    active?: string;
    disabled?: string;
    loading?: string;
  }
): string {
  return cnWithTokens(
    base,
    states.hover && `hover:${states.hover}`,
    states.focus && `focus:${states.focus}`,
    states.active && `active:${states.active}`,
    states.disabled && `disabled:${states.disabled}`,
    states.loading && `data-loading:${states.loading}`
  );
}

// =============================================================================
// Animation Utilities
// =============================================================================

/**
 * Standard transition classes
 */
export const transitions = {
  fast: 'transition-all duration-150 ease-out',
  normal: 'transition-all duration-200 ease-out',
  slow: 'transition-all duration-300 ease-out',
  colors: 'transition-colors duration-200 ease-out',
  transform: 'transition-transform duration-200 ease-out',
  opacity: 'transition-opacity duration-200 ease-out',
} as const;

/**
 * Animation presets
 */
export const animations = {
  fadeIn: 'animate-in fade-in-0',
  fadeOut: 'animate-out fade-out-0',
  slideInFromTop: 'animate-in slide-in-from-top-2',
  slideInFromBottom: 'animate-in slide-in-from-bottom-2',
  slideInFromLeft: 'animate-in slide-in-from-left-2',
  slideInFromRight: 'animate-in slide-in-from-right-2',
  slideOutToTop: 'animate-out slide-out-to-top-2',
  slideOutToBottom: 'animate-out slide-out-to-bottom-2',
  slideOutToLeft: 'animate-out slide-out-to-left-2',
  slideOutToRight: 'animate-out slide-out-to-right-2',
  scaleIn: 'animate-in zoom-in-95',
  scaleOut: 'animate-out zoom-out-95',
  spin: 'animate-spin',
  pulse: 'animate-pulse',
  bounce: 'animate-bounce',
} as const;

// =============================================================================
// Component Size Utilities
// =============================================================================

export const componentSizes = {
  button: {
    xs: 'h-6 px-2 text-xs',
    sm: 'h-8 px-3 text-sm',
    md: 'h-9 px-4 text-sm',
    lg: 'h-10 px-6 text-base',
    xl: 'h-11 px-8 text-base',
  },
  input: {
    sm: 'h-8 px-3 text-sm',
    md: 'h-9 px-3 text-sm',
    lg: 'h-10 px-4 text-base',
  },
  icon: {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
    xl: 'h-8 w-8',
  },
} as const;

// =============================================================================
// Focus and Accessibility Utilities
// =============================================================================

/**
 * Standard focus ring classes
 */
export const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

/**
 * Screen reader only content
 */
export const srOnly = 'sr-only';

/**
 * Create accessible button/interactive element classes
 */
export function accessibleElement(disabled = false): string {
  return cnWithTokens(
    focusRing,
    'select-none',
    disabled ? 'pointer-events-none opacity-50' : 'cursor-pointer'
  );
}

// =============================================================================
// Status and State Utilities
// =============================================================================

/**
 * Status color mappings
 */
export const statusColors = {
  success: 'text-green-600 bg-green-50 border-green-200',
  warning: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  error: 'text-red-600 bg-red-50 border-red-200',
  info: 'text-blue-600 bg-blue-50 border-blue-200',
  neutral: 'text-gray-600 bg-gray-50 border-gray-200',
} as const;

/**
 * Test execution status colors
 */
export const testStatusColors = {
  pending: 'text-gray-600 bg-gray-50 border-gray-200',
  running: 'text-blue-600 bg-blue-50 border-blue-200',
  passed: 'text-green-600 bg-green-50 border-green-200',
  failed: 'text-red-600 bg-red-50 border-red-200',
  cancelled: 'text-orange-600 bg-orange-50 border-orange-200',
  timeout: 'text-purple-600 bg-purple-50 border-purple-200',
} as const;

// =============================================================================
// Layout Utilities
// =============================================================================

/**
 * Container variants
 */
export const containers = {
  page: 'container mx-auto px-4 sm:px-6 lg:px-8',
  section: 'py-8 sm:py-12 lg:py-16',
  content: 'max-w-7xl mx-auto',
  narrow: 'max-w-2xl mx-auto',
  wide: 'max-w-screen-2xl mx-auto',
} as const;

/**
 * Grid utilities
 */
export const grids = {
  cols1: 'grid grid-cols-1',
  cols2: 'grid grid-cols-1 md:grid-cols-2',
  cols3: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  cols4: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  auto: 'grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))]',
} as const;

// =============================================================================
// Validation Utilities
// =============================================================================

/**
 * Form validation state classes
 */
export const validationStates = {
  default: 'border-input',
  valid: 'border-green-500 focus:ring-green-500',
  invalid: 'border-red-500 focus:ring-red-500',
  warning: 'border-yellow-500 focus:ring-yellow-500',
} as const;

/**
 * Get validation classes based on state
 */
export function getValidationClasses(
  isValid?: boolean,
  hasError?: boolean,
  hasWarning?: boolean
): string {
  if (hasError) return validationStates.invalid;
  if (hasWarning) return validationStates.warning;
  if (isValid) return validationStates.valid;
  return validationStates.default;
}

// =============================================================================
// Export All Utilities
// =============================================================================

export default {
  cnWithTokens,
  getColor,
  getSpacing,
  responsive,
  stateClasses,
  transitions,
  animations,
  componentSizes,
  focusRing,
  srOnly,
  accessibleElement,
  statusColors,
  testStatusColors,
  containers,
  grids,
  validationStates,
  getValidationClasses,
  createVariants,
};
