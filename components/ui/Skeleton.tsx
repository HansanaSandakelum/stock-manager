import React from 'react';

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-xl bg-surface-hover dark:bg-dark-surface-hover animate-pulse ${className}`} />
  );
}
