import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div className="w-14 h-14 bg-surface-alt dark:bg-dark-surface-alt rounded-2xl flex items-center justify-center mb-5 ring-1 ring-border dark:ring-dark-border">
        <Icon className="w-7 h-7 text-text-tertiary dark:text-dark-text-tertiary" />
      </div>
      <h3 className="text-base font-semibold text-text dark:text-dark-text mb-1.5">{title}</h3>
      <p className="text-sm text-text-tertiary dark:text-dark-text-tertiary max-w-sm mb-6">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction}>{actionLabel}</Button>
      )}
    </div>
  );
}
