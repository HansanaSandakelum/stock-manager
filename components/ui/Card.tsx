import React from 'react';

export function Card({ children, className = '' }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={`bg-white dark:bg-dark-surface rounded-2xl border border-border dark:border-dark-border shadow-[0_1px_2px_rgba(0,0,0,0.02),0_1px_3px_rgba(0,0,0,0.02)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.2),0_1px_3px_rgba(0,0,0,0.1)] transition-all duration-300 hover:shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)] dark:hover:shadow-[0_1px_3px_rgba(0,0,0,0.3),0_4px_12px_rgba(0,0,0,0.15)] p-6 ${className}`}>
      {children}
    </div>
  );
}
