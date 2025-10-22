import React from 'react';
import { cn } from '../../lib/cn';

const badgeVariants = {
  base: 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
  variants: {
    default: 'border-transparent bg-surface border border-border text-text',
    primary: 'border-transparent bg-primary-700 text-white',
    accent: 'border-transparent bg-accent text-white',
    secondary: 'border-transparent bg-primary-100 text-primary-900',
    success: 'border-transparent bg-success text-white',
    warning: 'border-transparent bg-warning text-white',
    error: 'border-transparent bg-error text-white',
    info: 'border-transparent bg-info text-white',
    outline: 'text-text border border-border bg-transparent',
  },
  sizes: {
    sm: 'px-2 py-0.5 text-xs',
    default: 'px-2.5 py-0.5 text-xs',
    lg: 'px-3 py-1 text-sm',
  }
};

const Badge = React.forwardRef(({ 
  className, 
  variant = 'default', 
  size = 'default', 
  icon, 
  removable = false, 
  onRemove, 
  children, 
  ...props 
}, ref) => {
  const baseClasses = badgeVariants.base;
  const variantClasses = badgeVariants.variants[variant] || badgeVariants.variants.default;
  const sizeClasses = badgeVariants.sizes[size] || badgeVariants.sizes.default;

  return (
    <div
      className={cn(baseClasses, variantClasses, sizeClasses, className)}
      ref={ref}
      {...props}
    >
      {icon && <span className="mr-1">{icon}</span>}
      {children}
      {removable && onRemove && (
        <button
          onClick={onRemove}
          className="ml-1 rounded-full hover:bg-black/10 focus:outline-none focus:ring-1 focus:ring-white/50"
          aria-label="Remove badge"
        >
          <svg
            className="h-3 w-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
});

Badge.displayName = 'Badge';

export { Badge, badgeVariants };
