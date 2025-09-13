/**
 * Modal Component
 * Modal dialog with overlay, animations, and accessibility features
 */

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cva, type VariantProps } from 'class-variance-authority';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { cn, getAnimationClasses, getFocusClasses } from '@/lib/component-utils';

// =============================================================================
// Modal Variants
// =============================================================================

const modalVariants = cva(
  'fixed left-[50%] top-[50%] z-50 grid w-full translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg',
  {
    variants: {
      size: {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
        full: 'max-w-7xl mx-4',
        fit: 'max-w-fit',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

const modalOverlayVariants = cva(
  'fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
);

// =============================================================================
// Component Types
// =============================================================================

export interface ModalProps extends VariantProps<typeof modalVariants> {
  /**
   * Whether the modal is open
   */
  open?: boolean;
  /**
   * Callback when the modal open state changes
   */
  onOpenChange?: (open: boolean) => void;
  /**
   * Modal content
   */
  children?: React.ReactNode;
  /**
   * Whether to show the close button
   */
  showCloseButton?: boolean;
  /**
   * Whether clicking the overlay closes the modal
   */
  closeOnOverlayClick?: boolean;
  /**
   * Whether pressing escape closes the modal
   */
  closeOnEscape?: boolean;
  /**
   * Additional CSS class for the modal content
   */
  className?: string;
  /**
   * Additional CSS class for the overlay
   */
  overlayClassName?: string;
  /**
   * Modal title (for accessibility)
   */
  title?: string;
  /**
   * Modal description (for accessibility)
   */
  description?: string;
}

export interface ModalHeaderProps {
  /**
   * Header content
   */
  children?: React.ReactNode;
  /**
   * Additional CSS class
   */
  className?: string;
  /**
   * Whether to show the close button
   */
  showCloseButton?: boolean;
  /**
   * Custom close button
   */
  closeButton?: React.ReactNode;
}

export interface ModalBodyProps {
  /**
   * Body content
   */
  children?: React.ReactNode;
  /**
   * Additional CSS class
   */
  className?: string;
}

export interface ModalFooterProps {
  /**
   * Footer content
   */
  children?: React.ReactNode;
  /**
   * Additional CSS class
   */
  className?: string;
}

// =============================================================================
// Modal Components
// =============================================================================

const ModalRoot = DialogPrimitive.Root;
const ModalTrigger = DialogPrimitive.Trigger;
const ModalPortal = DialogPrimitive.Portal;
const ModalClose = DialogPrimitive.Close;

const ModalOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay> & {
    className?: string;
  }
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(modalOverlayVariants(), className)}
    {...props}
  />
));
ModalOverlay.displayName = DialogPrimitive.Overlay.displayName;

const ModalContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & VariantProps<typeof modalVariants>
>(({ className, size, children, ...props }, ref) => (
  <ModalPortal>
    <ModalOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(modalVariants({ size }), getFocusClasses('ring'), className)}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </ModalPortal>
));
ModalContent.displayName = DialogPrimitive.Content.displayName;

const ModalHeader = React.forwardRef<
  HTMLDivElement,
  ModalHeaderProps
>(({ className, children, showCloseButton = true, closeButton, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)}
    {...props}
  >
    <div className="flex items-center justify-between">
      <div className="flex-1">{children}</div>
      {showCloseButton && (
        <div className="flex-shrink-0 ml-4">
          {closeButton || (
            <ModalClose asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-muted"
              >
                <XMarkIcon className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </ModalClose>
          )}
        </div>
      )}
    </div>
  </div>
));
ModalHeader.displayName = 'ModalHeader';

const ModalTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-lg font-semibold leading-none tracking-tight', className)}
    {...props}
  />
));
ModalTitle.displayName = DialogPrimitive.Title.displayName;

const ModalDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
ModalDescription.displayName = DialogPrimitive.Description.displayName;

const ModalBody = React.forwardRef<
  HTMLDivElement,
  ModalBodyProps
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex-1 overflow-y-auto', className)}
    {...props}
  >
    {children}
  </div>
));
ModalBody.displayName = 'ModalBody';

const ModalFooter = React.forwardRef<
  HTMLDivElement,
  ModalFooterProps
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-2',
      className
    )}
    {...props}
  >
    {children}
  </div>
));
ModalFooter.displayName = 'ModalFooter';

// =============================================================================
// Main Modal Component
// =============================================================================

const Modal = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  ModalProps
>(
  (
    {
      open,
      onOpenChange,
      children,
      size,
      showCloseButton = true,
      closeOnOverlayClick = true,
      closeOnEscape = true,
      className,
      overlayClassName,
      title,
      description,
      ...props
    },
    ref
  ) => {
    return (
      <ModalRoot open={open} onOpenChange={onOpenChange}>
        <ModalPortal>
          <ModalOverlay
            className={overlayClassName}
            onClick={closeOnOverlayClick ? undefined : (e) => e.preventDefault()}
          />
          <DialogPrimitive.Content
            ref={ref}
            className={cn(modalVariants({ size }), getFocusClasses('ring'), className)}
            onEscapeKeyDown={closeOnEscape ? undefined : (e) => e.preventDefault()}
            {...props}
          >
            {title && (
              <DialogPrimitive.Title className="sr-only">
                {title}
              </DialogPrimitive.Title>
            )}
            {description && (
              <DialogPrimitive.Description className="sr-only">
                {description}
              </DialogPrimitive.Description>
            )}
            {children}
            {showCloseButton && (
              <ModalClose asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-4 top-4 h-6 w-6 p-0 hover:bg-muted"
                >
                  <XMarkIcon className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </Button>
              </ModalClose>
            )}
          </DialogPrimitive.Content>
        </ModalPortal>
      </ModalRoot>
    );
  }
);
Modal.displayName = 'Modal';

// =============================================================================
// Modal Presets
// =============================================================================

/**
 * Confirmation Modal
 */
export interface ConfirmationModalProps extends Omit<ModalProps, 'children'> {
  /**
   * Confirmation title
   */
  title: string;
  /**
   * Confirmation message
   */
  message: string;
  /**
   * Confirm button text
   */
  confirmText?: string;
  /**
   * Cancel button text
   */
  cancelText?: string;
  /**
   * Confirm button variant
   */
  confirmVariant?: 'default' | 'destructive' | 'secondary' | 'ghost' | 'link' | 'outline';
  /**
   * Whether the action is loading
   */
  loading?: boolean;
  /**
   * Confirm handler
   */
  onConfirm?: () => void;
  /**
   * Cancel handler
   */
  onCancel?: () => void;
}

export const ConfirmationModal = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  ConfirmationModalProps
>(
  (
    {
      title,
      message,
      confirmText = 'Confirm',
      cancelText = 'Cancel',
      confirmVariant = 'default',
      loading = false,
      onConfirm,
      onCancel,
      onOpenChange,
      ...props
    },
    ref
  ) => {
    const handleCancel = () => {
      onCancel?.();
      onOpenChange?.(false);
    };

    const handleConfirm = () => {
      onConfirm?.();
      // Note: Don't auto-close on confirm, let the parent handle it
    };

    return (
      <Modal
        ref={ref}
        size="sm"
        onOpenChange={onOpenChange}
        closeOnOverlayClick={!loading}
        closeOnEscape={!loading}
        showCloseButton={!loading}
        title={title}
        description={message}
        {...props}
      >
        <ModalHeader showCloseButton={!loading}>
          <ModalTitle>{title}</ModalTitle>
        </ModalHeader>
        
        <ModalBody>
          <ModalDescription>{message}</ModalDescription>
        </ModalBody>

        <ModalFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            variant={confirmVariant}
            onClick={handleConfirm}
            loading={loading}
          >
            {confirmText}
          </Button>
        </ModalFooter>
      </Modal>
    );
  }
);

ConfirmationModal.displayName = 'ConfirmationModal';

// =============================================================================
// Hook for Modal State
// =============================================================================

/**
 * Hook to manage modal state
 */
export function useModal(initialOpen = false) {
  const [open, setOpen] = React.useState(initialOpen);

  const openModal = React.useCallback(() => setOpen(true), []);
  const closeModal = React.useCallback(() => setOpen(false), []);
  const toggleModal = React.useCallback(() => setOpen(prev => !prev), []);

  return {
    open,
    setOpen,
    openModal,
    closeModal,
    toggleModal,
  };
}

// =============================================================================
// Exports
// =============================================================================

export {
  Modal,
  ModalRoot,
  ModalTrigger,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
  ModalClose,
  ModalOverlay,
  ConfirmationModal,
  modalVariants,
  useModal,
};

export type {
  ModalProps,
  ModalHeaderProps,
  ModalBodyProps,
  ModalFooterProps,
  ConfirmationModalProps,
};
