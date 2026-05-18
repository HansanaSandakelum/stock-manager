import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive' | 'outline';
  isLoading?: boolean;
}

export function Button({ variant = 'primary', isLoading, children, className = '', ...props }: ButtonProps) {
  const baseStyle = 'px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 inline-flex items-center justify-center gap-2 active:scale-[0.98]';
  
  const variants = {
    primary: 'bg-zinc-900 text-white hover:bg-zinc-800 active:bg-zinc-950 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200',
    secondary: 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200 active:bg-zinc-300 disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700',
    destructive: 'bg-red-500 text-white hover:bg-red-600 active:bg-red-700 disabled:opacity-50',
    outline: 'border border-zinc-200 text-zinc-900 hover:bg-zinc-50 active:bg-zinc-100 disabled:opacity-50 dark:border-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-900',
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
