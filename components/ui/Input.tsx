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
        {label && <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</label>}
        <div className="relative w-full">
          <input
            ref={ref}
            type={inputType}
            className={`w-full px-3 py-2.5 ${isPassword ? 'pr-10' : ''} bg-zinc-50/30 hover:bg-zinc-50/70 focus:bg-white dark:bg-zinc-900/30 dark:hover:bg-zinc-900/60 dark:focus:bg-zinc-900/90 border rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 [color-scheme:light] dark:[color-scheme:dark] transition-all focus:outline-none disabled:opacity-50 ${
              error 
                ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/5' 
                : 'border-zinc-200 dark:border-zinc-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5'
            } ${className}`}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors p-0.5 rounded-lg focus:outline-none"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
        {error && <span className="text-xs text-red-500 mt-0.5">{error}</span>}
      </div>
    );
  }
);
Input.displayName = 'Input';
