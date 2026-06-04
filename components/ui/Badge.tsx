import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'default';
}

export function Badge({ children, variant = 'default' }: BadgeProps) {
  const variants = {
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-100/60 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30',
    warning: 'bg-amber-50 text-amber-700 border border-amber-100/60 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30',
    danger: 'bg-rose-50 text-rose-700 border border-rose-100/60 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30',
    default: 'bg-zinc-50 text-zinc-600 border border-zinc-200/50 dark:bg-zinc-800/30 dark:text-zinc-400 dark:border-zinc-800/60',
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide border ${variants[variant]}`}>
      {children}
    </span>
  );
}
