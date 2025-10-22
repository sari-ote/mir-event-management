import React from 'react';
import { cn } from '../../lib/cn';

const buttonVariants = {
  base: 'inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-all duration-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  variants: {
    primary: 'bg-primary-700 text-white hover:bg-primary-800 active:bg-primary-900 shadow-soft hover:shadow-medium',
    secondary: 'bg-surface border border-border text-text hover:bg-surface-elevated shadow-soft hover:shadow-medium',
    accent: 'bg-accent text-white hover:bg-accent-600 active:bg-accent-700 shadow-soft hover:shadow-medium',
    ghost: 'hover:bg-surface-elevated text-text',
    outline: 'border border-border bg-background hover:bg-surface text-text',
    success: 'bg-success text-white hover:bg-green-600 shadow-soft hover:shadow-medium',
    warning: 'bg-warning text-white hover:bg-yellow-600 shadow-soft hover:shadow-medium',
    error: 'bg-error text-white hover:bg-red-600 shadow-soft hover:shadow-medium',
    link: 'text-primary-700 underline-offset-4 hover:underline',
  },
  sizes: {
    sm: 'h-8 px-3 text-xs',
    default: 'h-10 px-4 py-2',
    lg: 'h-11 px-8 text-base',
    xl: 'h-12 px-10 text-lg',
    icon: 'h-10 w-10 p-0',
  }
};

const Button = React.forwardRef(({ 
  className, 
  variant = 'primary', 
  size = 'default', 
  loading = false, 
  leftIcon, 
  rightIcon, 
  children, 
  disabled, 
  ...props 
}, ref) => {
  const baseClasses = buttonVariants.base;
  const variantClasses = buttonVariants.variants[variant] || buttonVariants.variants.primary;
  const sizeClasses = buttonVariants.sizes[size] || buttonVariants.sizes.default;
  const loadingClasses = loading ? 'cursor-wait' : '';

  return (
    <button
      className={cn(baseClasses, variantClasses, sizeClasses, loadingClasses, className)}
      ref={ref}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      )}
      {!loading && leftIcon && leftIcon}
      {children}
      {!loading && rightIcon && rightIcon}
    </button>
  );
});

Button.displayName = 'Button';

export { Button, buttonVariants };
