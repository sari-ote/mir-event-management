import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function for merging Tailwind CSS classes
 * Combines clsx for conditional classes with tailwind-merge for proper Tailwind class merging
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Utility for creating conditional classes based on boolean values
 */
export function conditionalClasses(baseClasses, conditionalClasses) {
  return cn(baseClasses, conditionalClasses);
}

/**
 * Utility for focus ring styles that work across the design system
 */
export function focusRing(variant = 'default') {
  const variants = {
    default: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
    inset: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset',
    none: 'focus-visible:outline-none'
  };
  
  return variants[variant];
}

/**
 * Utility for animation classes with proper timing
 */
export function animation(type) {
  const animations = {
    fast: 'transition-all duration-fast ease-smooth',
    normal: 'transition-all duration-normal ease-smooth',
    slow: 'transition-all duration-slow ease-smooth',
    bounce: 'animate-bounce',
    pulse: 'animate-pulse',
    spin: 'animate-spin'
  };
  
  return animations[type];
}
