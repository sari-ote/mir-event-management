import React from 'react';
import { useTheme } from '../themes/ThemeProvider';

export function ThemeSwitch({ 
  className = '', 
  size = 'md',
  showLabel = false 
}) {
  const { theme, toggleTheme } = useTheme();
  
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg'
  };

  const iconSize = {
    sm: '16',
    md: '20',
    lg: '24'
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={toggleTheme}
        className={`
          ${sizeClasses[size]}
          relative overflow-hidden rounded-full
          bg-surface-elevated hover:bg-surface
          border border-border
          transition-all duration-normal
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2
          group
        `}
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Sun Icon */}
          <svg
            width={iconSize[size]}
            height={iconSize[size]}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`
              text-accent transition-all duration-normal
              ${theme === 'dark' 
                ? 'opacity-0 rotate-90 scale-0' 
                : 'opacity-100 rotate-0 scale-100'
              }
            `}
          >
            <circle cx="12" cy="12" r="5" />
            <path d="M12 1v2" />
            <path d="M12 21v2" />
            <path d="M4.22 4.22l1.42 1.42" />
            <path d="M18.36 18.36l1.42 1.42" />
            <path d="M1 12h2" />
            <path d="M21 12h2" />
            <path d="M4.22 19.78l1.42-1.42" />
            <path d="M18.36 5.64l1.42-1.42" />
          </svg>
          
          {/* Moon Icon */}
          <svg
            width={iconSize[size]}
            height={iconSize[size]}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`
              absolute text-primary-700 transition-all duration-normal
              ${theme === 'light' 
                ? 'opacity-0 -rotate-90 scale-0' 
                : 'opacity-100 rotate-0 scale-100'
              }
            `}
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        </div>
        
        {/* Hover effect */}
        <div className="absolute inset-0 bg-primary-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-normal" />
      </button>
      
      {showLabel && (
        <span className="text-sm font-medium text-text-subtle capitalize">
          {theme} mode
        </span>
      )}
    </div>
  );
}
