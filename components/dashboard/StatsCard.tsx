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
  // Dynamically map elegant minimalist gradient borders and text colors based on card purpose
  let colorClasses = "from-indigo-50 to-blue-50 dark:from-indigo-950/10 dark:to-blue-950/10 border-indigo-100/40 dark:border-indigo-900/20 text-indigo-600 dark:text-indigo-400 shadow-indigo-500/5";
  
  if (title.toLowerCase().includes("value")) {
    colorClasses = "from-emerald-50 to-teal-50 dark:from-emerald-950/10 dark:to-teal-950/10 border-emerald-100/40 dark:border-emerald-900/20 text-emerald-600 dark:text-emerald-400 shadow-emerald-500/5";
  } else if (title.toLowerCase().includes("low")) {
    colorClasses = "from-amber-50 to-orange-50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-100/40 dark:border-amber-900/20 text-amber-600 dark:text-amber-400 shadow-amber-500/5";
  } else if (title.toLowerCase().includes("transaction") || title.toLowerCase().includes("movement")) {
    colorClasses = "from-violet-50 to-fuchsia-50 dark:from-violet-950/10 dark:to-fuchsia-950/10 border-violet-100/40 dark:border-violet-900/20 text-violet-600 dark:text-violet-400 shadow-violet-500/5";
  }

  return (
    <Card className="flex flex-col hover:-translate-y-[1.5px] hover:shadow-[0_12px_36px_rgb(0,0,0,0.025),0_1px_3px_rgb(0,0,0,0.015)] transition-all duration-300">
      <div className="flex items-start justify-between mb-5">
        <div className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${colorClasses} border flex items-center justify-center shadow-sm`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <span className={`text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full border ${trend.isPositive ? 'bg-emerald-50 text-emerald-600 border-emerald-100/60 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30' : 'bg-rose-50 text-rose-600 border-rose-100/60 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30'}`}>
            {trend.isPositive ? '+' : ''}{trend.value}%
          </span>
        )}
      </div>
      <div>
        <h3 className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 tracking-wide uppercase mb-1.5">{title}</h3>
        <p className="text-2xl font-bold text-zinc-800 dark:text-zinc-100 tracking-tight">{value}</p>
      </div>
    </Card>
  );
}
