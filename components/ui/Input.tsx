import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</label>}
        <input
          ref={ref}
          className={`px-3 py-2 bg-white dark:bg-zinc-900 border rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 disabled:opacity-50 ${
            error ? 'border-red-500 focus:ring-red-500' : 'border-zinc-200 dark:border-zinc-800'
          } ${className}`}
          {...props}
        />
        {error && <span className="text-xs text-red-500 mt-0.5">{error}</span>}
      </div>
    );
  }
);
Input.displayName = 'Input';
