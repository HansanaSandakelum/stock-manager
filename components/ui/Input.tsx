import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, type, className = '', ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    const isPassword = type === 'password';
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && <label className="text-sm font-medium text-text-secondary dark:text-dark-text-secondary">{label}</label>}
        <div className="relative w-full">
          <input
            ref={ref}
            type={inputType}
            className={`w-full px-3.5 py-2.5 ${isPassword ? 'pr-10' : ''} bg-white dark:bg-dark-surface border rounded-xl text-sm text-text dark:text-dark-text placeholder:text-text-tertiary dark:placeholder:text-dark-text-tertiary transition-all outline-none disabled:opacity-50 ${
              error 
                ? 'border-danger-500 focus:border-danger-500 focus:ring-4 focus:ring-danger-500/10' 
                : 'border-border dark:border-dark-border focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 hover:border-primary-300 dark:hover:border-primary-700'
            } ${className}`}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary dark:text-dark-text-tertiary dark:hover:text-dark-text-secondary transition-colors p-0.5 rounded-lg outline-none"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
        {error && <span className="text-xs text-danger-600 dark:text-danger-400 mt-0.5">{error}</span>}
      </div>
    );
  }
);
Input.displayName = 'Input';
