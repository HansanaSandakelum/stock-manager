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
  return (
    <Card className="flex flex-col">
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
          <Icon className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />
        </div>
        {trend && (
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${trend.isPositive ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
            {trend.isPositive ? '+' : ''}{trend.value}%
          </span>
        )}
      </div>
      <div>
        <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">{title}</h3>
        <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{value}</p>
      </div>
    </Card>
  );
}
