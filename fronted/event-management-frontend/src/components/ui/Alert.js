import React from 'react';
import { cn } from '../../lib/cn';

const alertVariants = {
  base: 'relative w-full rounded-lg border p-4 shadow-soft',
  variants: {
    info: 'border-primary-200 bg-info-bg text-primary-900',
    success: 'border-green-200 bg-success-bg text-green-900',
    warning: 'border-yellow-200 bg-warning-bg text-yellow-900',
    error: 'border-red-200 bg-error-bg text-red-900',
    default: 'border-border bg-surface text-text',
  }
};

const Alert = React.forwardRef(({ className, variant = 'default', ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants.base, alertVariants.variants[variant], className)}
    {...props}
  />
));
Alert.displayName = 'Alert';

const AlertTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn('mb-1 font-medium leading-none tracking-tight', className)}
    {...props}
  />
));
AlertTitle.displayName = 'AlertTitle';

const AlertDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-sm [&_p]:leading-relaxed', className)}
    {...props}
  />
));
AlertDescription.displayName = 'AlertDescription';

const AlertIcon = React.forwardRef(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('absolute left-4 top-4', className)}
    {...props}
  >
    {children}
  </div>
));
AlertIcon.displayName = 'AlertIcon';

// Pre-built alert icons
export const AlertIcons = {
  Info: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  Success: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  Warning: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  ),
  Error: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
};

// Convenience components with icons
export const InfoAlert = React.forwardRef(({ children, className, ...props }, ref) => (
  <Alert ref={ref} variant="info" className={cn('pl-11', className)} {...props}>
    <AlertIcon>
      <AlertIcons.Info />
    </AlertIcon>
    {children}
  </Alert>
));
InfoAlert.displayName = 'InfoAlert';

export const SuccessAlert = React.forwardRef(({ children, className, ...props }, ref) => (
  <Alert ref={ref} variant="success" className={cn('pl-11', className)} {...props}>
    <AlertIcon>
      <AlertIcons.Success />
    </AlertIcon>
    {children}
  </Alert>
));
SuccessAlert.displayName = 'SuccessAlert';

export const WarningAlert = React.forwardRef(({ children, className, ...props }, ref) => (
  <Alert ref={ref} variant="warning" className={cn('pl-11', className)} {...props}>
    <AlertIcon>
      <AlertIcons.Warning />
    </AlertIcon>
    {children}
  </Alert>
));
WarningAlert.displayName = 'WarningAlert';

export const ErrorAlert = React.forwardRef(({ children, className, ...props }, ref) => (
  <Alert ref={ref} variant="error" className={cn('pl-11', className)} {...props}>
    <AlertIcon>
      <AlertIcons.Error />
    </AlertIcon>
    {children}
  </Alert>
));
ErrorAlert.displayName = 'ErrorAlert';

export { Alert, AlertTitle, AlertDescription, AlertIcon, alertVariants };
