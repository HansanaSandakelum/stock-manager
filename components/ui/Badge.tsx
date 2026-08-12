import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'default';
  size?: 'sm' | 'md';
}

export function Badge({ children, variant = 'default', size = 'sm' }: BadgeProps) {
  const sizes = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
  };

  const variants = {
    success: 'bg-success-50 text-success-700 border-success-200/50 dark:bg-success-700/10 dark:text-success-400 dark:border-success-700/20',
    warning: 'bg-warning-50 text-warning-700 border-warning-200/50 dark:bg-warning-700/10 dark:text-warning-400 dark:border-warning-700/20',
    danger: 'bg-danger-50 text-danger-700 border-danger-200/50 dark:bg-danger-700/10 dark:text-danger-400 dark:border-danger-700/20',
    default: 'bg-surface-alt text-text-tertiary border-border dark:bg-dark-surface-alt dark:text-dark-text-tertiary dark:border-dark-border',
  };

  return (
    <span className={`inline-flex items-center justify-center whitespace-nowrap rounded-full font-semibold tracking-wide border ${sizes[size]} ${variants[variant]}`}>
      {children}
    </span>
  );
}
