import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export function Button({ variant = 'primary', size = 'md', isLoading, children, className = '', ...props }: ButtonProps) {
  const sizes = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-5 py-2.5 text-base gap-2.5',
  };
  
  const baseStyle = 'font-medium rounded-xl transition-all duration-200 inline-flex items-center justify-center active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 ring-1 ring-inset ring-transparent hover:ring-opacity-100';
  
  const variants = {
    primary: `${sizes[size]} bg-primary-600 hover:bg-primary-500 text-white shadow-sm shadow-primary-500/10 hover:shadow-primary-500/20 hover:-translate-y-[0.5px] ring-primary-600/0 hover:ring-primary-500/20`,
    secondary: `${sizes[size]} bg-white hover:bg-surface-hover text-text border border-border dark:bg-dark-surface dark:hover:bg-dark-surface-hover dark:border-dark-border dark:text-dark-text hover:-translate-y-[0.5px]`,
    destructive: `${sizes[size]} bg-danger-600 hover:bg-danger-500 text-white shadow-sm shadow-danger-500/10 hover:shadow-danger-500/20 hover:-translate-y-[0.5px] ring-danger-600/0 hover:ring-danger-500/20`,
    outline: `${sizes[size]} border border-border text-text hover:bg-surface-hover dark:border-dark-border dark:text-dark-text dark:hover:bg-dark-surface-hover hover:-translate-y-[0.5px]`,
    ghost: `${sizes[size]} text-text-secondary hover:text-text hover:bg-surface-hover dark:text-dark-text-secondary dark:hover:text-dark-text dark:hover:bg-dark-surface-hover`,
  };

  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : null}
      {children}
    </button>
  );
}
