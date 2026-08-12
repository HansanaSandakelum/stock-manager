import React from 'react';
import { Card } from '@/components/ui/Card';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export function StatsCard({ title, value, icon: Icon, trend }: StatsCardProps) {
  let accentClass = 'bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400 ring-primary-200/50 dark:ring-primary-700/20';
  
  if (title.toLowerCase().includes('value')) {
    accentClass = 'bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400 ring-success-200/50 dark:ring-success-700/20';
  } else if (title.toLowerCase().includes('low')) {
    accentClass = 'bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-warning-400 ring-warning-200/50 dark:ring-warning-700/20';
  } else if (title.toLowerCase().includes('transaction') || title.toLowerCase().includes('movement')) {
    accentClass = 'bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400 ring-primary-200/50 dark:ring-primary-700/20';
  }

  return (
    <Card className="flex flex-col hover:-translate-y-[2px] transition-all duration-300">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-11 h-11 rounded-xl ${accentClass} ring-1 flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <span className={`text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full ${
            trend.isPositive
              ? 'bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400'
              : 'bg-danger-50 text-danger-700 dark:bg-danger-500/10 dark:text-danger-400'
          }`}>
            {trend.isPositive ? '+' : ''}{trend.value}%
          </span>
        )}
      </div>
      <div>
        <p className="text-xs font-medium text-text-tertiary dark:text-dark-text-tertiary mb-1">{title}</p>
        <p className="text-2xl font-bold text-text dark:text-dark-text tracking-tight">{value}</p>
      </div>
    </Card>
  );
}
