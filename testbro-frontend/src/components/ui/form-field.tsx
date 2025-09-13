/**
 * Form Field Component
 * Enhanced form field with validation, labels, and various input types
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { EyeIcon, EyeSlashIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FieldError } from '@/components/ui/error-state';
import { cn, getValidationClasses } from '@/lib/component-utils';

// =============================================================================
// Form Field Variants
// =============================================================================

const formFieldVariants = cva('space-y-2', {
  variants: {
    size: {
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

// =============================================================================
// Component Types
// =============================================================================

export interface BaseFieldProps extends VariantProps<typeof formFieldVariants> {
  /**
   * Field label
   */
  label?: string;
  /**
   * Field description or help text
   */
  description?: string;
  /**
   * Error message
   */
  error?: string;
  /**
   * Whether the field is required
   */
  required?: boolean;
  /**
   * Whether the field is disabled
   */
  disabled?: boolean;
  /**
   * Field tooltip
   */
  tooltip?: string;
  /**
   * Additional CSS class for the wrapper
   */
  className?: string;
}

export interface FormFieldProps extends BaseFieldProps {
  /**
   * Field type
   */
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'switch';
  /**
   * Field name
   */
  name?: string;
  /**
   * Field value
   */
  value?: string | number | boolean;
  /**
   * Default value
   */
  defaultValue?: string | number | boolean;
  /**
   * Placeholder text
   */
  placeholder?: string;
  /**
   * Change handler
   */
  onChange?: (value: string | number | boolean) => void;
  /**
   * Blur handler
   */
  onBlur?: () => void;
  /**
   * Focus handler
   */
  onFocus?: () => void;
  /**
   * Options for select, radio, or checkbox fields
   */
  options?: Array<{ label: string; value: string | number; disabled?: boolean }>;
  /**
   * Multiple selection for select fields
   */
  multiple?: boolean;
  /**
   * Number of rows for textarea
   */
  rows?: number;
  /**
   * Minimum value for number fields
   */
  min?: number;
  /**
   * Maximum value for number fields
   */
  max?: number;
  /**
   * Step value for number fields
   */
  step?: number;
  /**
   * Auto-complete attribute
   */
  autoComplete?: string;
  /**
   * Input mode for mobile keyboards
   */
  inputMode?: 'text' | 'decimal' | 'numeric' | 'tel' | 'search' | 'email' | 'url';
  /**
   * Whether to show character count for text fields
   */
  showCharCount?: boolean;
  /**
   * Maximum character count
   */
  maxLength?: number;
}

// =============================================================================
// Form Field Component
// =============================================================================

const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
  (
    {
      className,
      size,
      type = 'text',
      name,
      label,
      description,
      error,
      required,
      disabled,
      tooltip,
      value,
      defaultValue,
      placeholder,
      onChange,
      onBlur,
      onFocus,
      options = [],
      multiple,
      rows = 3,
      min,
      max,
      step,
      autoComplete,
      inputMode,
      showCharCount,
      maxLength,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const [internalValue, setInternalValue] = React.useState(value || defaultValue || '');

    // Handle value changes
    const handleChange = React.useCallback((newValue: string | number | boolean) => {
      setInternalValue(newValue);
      onChange?.(newValue);
    }, [onChange]);

    // Get current value for display
    const currentValue = value !== undefined ? value : internalValue;
    const stringValue = typeof currentValue === 'string' ? currentValue : String(currentValue || '');

    // Character count for text fields
    const charCount = showCharCount && typeof currentValue === 'string' ? currentValue.length : 0;

    // Validation state
    const isValid = !error;
    const validationClasses = getValidationClasses(isValid, !!error, false);

    // Render field based on type
    const renderField = () => {
      const commonProps = {
        name,
        disabled,
        onBlur,
        onFocus,
        'aria-invalid': !!error,
        'aria-describedby': error ? `${name}-error` : description ? `${name}-description` : undefined,
        className: cn(validationClasses),
      };

      switch (type) {
        case 'textarea':
          return (
            <Textarea
              {...commonProps}
              value={stringValue}
              placeholder={placeholder}
              onChange={(e) => handleChange(e.target.value)}
              rows={rows}
              maxLength={maxLength}
              className={cn(validationClasses, size === 'sm' && 'text-sm')}
            />
          );

        case 'select':
          return (
            <Select 
              value={stringValue} 
              onValueChange={handleChange}
              disabled={disabled}
            >
              <SelectTrigger className={cn(validationClasses)}>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem 
                    key={option.value} 
                    value={String(option.value)}
                    disabled={option.disabled}
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );

        case 'checkbox':
          return (
            <div className="flex items-center space-x-2">
              <Checkbox
                id={name}
                checked={Boolean(currentValue)}
                onCheckedChange={handleChange}
                disabled={disabled}
                aria-invalid={!!error}
              />
              {label && (
                <Label 
                  htmlFor={name}
                  className={cn('text-sm font-normal', disabled && 'text-muted-foreground')}
                >
                  {label}
                  {required && <span className="text-destructive ml-1">*</span>}
                </Label>
              )}
            </div>
          );

        case 'radio':
          return (
            <RadioGroup 
              value={stringValue} 
              onValueChange={handleChange}
              disabled={disabled}
              className="flex flex-col space-y-2"
            >
              {options.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <RadioGroupItem 
                    value={String(option.value)} 
                    id={`${name}-${option.value}`}
                    disabled={option.disabled || disabled}
                  />
                  <Label 
                    htmlFor={`${name}-${option.value}`}
                    className={cn(
                      'text-sm font-normal',
                      (option.disabled || disabled) && 'text-muted-foreground'
                    )}
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          );

        case 'switch':
          return (
            <div className="flex items-center space-x-2">
              <Switch
                id={name}
                checked={Boolean(currentValue)}
                onCheckedChange={handleChange}
                disabled={disabled}
                aria-invalid={!!error}
              />
              {label && (
                <Label 
                  htmlFor={name}
                  className={cn('text-sm font-normal', disabled && 'text-muted-foreground')}
                >
                  {label}
                  {required && <span className="text-destructive ml-1">*</span>}
                </Label>
              )}
            </div>
          );

        case 'password':
          return (
            <div className="relative">
              <Input
                {...commonProps}
                type={showPassword ? 'text' : 'password'}
                value={stringValue}
                placeholder={placeholder}
                onChange={(e) => handleChange(e.target.value)}
                autoComplete={autoComplete || 'current-password'}
                maxLength={maxLength}
                className={cn(validationClasses, 'pr-10')}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={disabled}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-4 w-4" />
                ) : (
                  <EyeIcon className="h-4 w-4" />
                )}
                <span className="sr-only">
                  {showPassword ? 'Hide password' : 'Show password'}
                </span>
              </Button>
            </div>
          );

        case 'number':
          return (
            <Input
              {...commonProps}
              type="number"
              value={stringValue}
              placeholder={placeholder}
              onChange={(e) => handleChange(Number(e.target.value))}
              min={min}
              max={max}
              step={step}
              inputMode={inputMode || 'numeric'}
              autoComplete={autoComplete}
              className={cn(validationClasses)}
            />
          );

        default:
          return (
            <Input
              {...commonProps}
              type={type}
              value={stringValue}
              placeholder={placeholder}
              onChange={(e) => handleChange(e.target.value)}
              autoComplete={autoComplete}
              inputMode={inputMode}
              maxLength={maxLength}
              className={cn(validationClasses)}
            />
          );
      }
    };

    // Don't render label for checkbox, radio, and switch (they handle their own labels)
    const showLabel = label && !['checkbox', 'radio', 'switch'].includes(type);

    return (
      <div ref={ref} className={cn(formFieldVariants({ size }), className)} {...props}>
        {/* Label with tooltip */}
        {showLabel && (
          <div className="flex items-center gap-2">
            <Label 
              htmlFor={name}
              className={cn(
                'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
                disabled && 'text-muted-foreground'
              )}
            >
              {label}
              {required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {tooltip && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <InformationCircleIcon className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        )}

        {/* Field input */}
        {renderField()}

        {/* Description */}
        {description && !error && (
          <p 
            id={`${name}-description`}
            className="text-sm text-muted-foreground"
          >
            {description}
          </p>
        )}

        {/* Character count */}
        {showCharCount && maxLength && typeof currentValue === 'string' && (
          <div className="flex justify-end">
            <span className={cn(
              'text-xs text-muted-foreground',
              charCount > maxLength * 0.9 && 'text-yellow-600',
              charCount >= maxLength && 'text-destructive'
            )}>
              {charCount}/{maxLength}
            </span>
          </div>
        )}

        {/* Error message */}
        <FieldError error={error} />
      </div>
    );
  }
);

FormField.displayName = 'FormField';

// =============================================================================
// Field Presets
// =============================================================================

/**
 * Email field
 */
export const EmailField = React.forwardRef<HTMLDivElement, Omit<FormFieldProps, 'type'>>(
  (props, ref) => (
    <FormField 
      ref={ref} 
      type="email" 
      autoComplete="email" 
      inputMode="email" 
      {...props} 
    />
  )
);

/**
 * Password field
 */
export const PasswordField = React.forwardRef<HTMLDivElement, Omit<FormFieldProps, 'type'>>(
  (props, ref) => (
    <FormField 
      ref={ref} 
      type="password" 
      autoComplete="current-password" 
      {...props} 
    />
  )
);

/**
 * Search field
 */
export const SearchField = React.forwardRef<HTMLDivElement, Omit<FormFieldProps, 'type'>>(
  (props, ref) => (
    <FormField 
      ref={ref} 
      type="search" 
      inputMode="search" 
      {...props} 
    />
  )
);

/**
 * URL field
 */
export const URLField = React.forwardRef<HTMLDivElement, Omit<FormFieldProps, 'type'>>(
  (props, ref) => (
    <FormField 
      ref={ref} 
      type="url" 
      autoComplete="url" 
      inputMode="url" 
      {...props} 
    />
  )
);

/**
 * Phone field
 */
export const PhoneField = React.forwardRef<HTMLDivElement, Omit<FormFieldProps, 'type'>>(
  (props, ref) => (
    <FormField 
      ref={ref} 
      type="tel" 
      autoComplete="tel" 
      inputMode="tel" 
      {...props} 
    />
  )
);

// =============================================================================
// Exports
// =============================================================================

export {
  FormField,
  formFieldVariants,
  EmailField,
  PasswordField,
  SearchField,
  URLField,
  PhoneField,
};
export type { FormFieldProps, BaseFieldProps };
