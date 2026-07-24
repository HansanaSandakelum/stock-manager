'use client';

import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/components/ThemeProvider';

interface StockChartProps {
  data: Array<{
    date: string;
    in: number;
    out: number;
  }>;
}

const emptySubscribe = () => () => {};

export function StockChart({ data }: StockChartProps) {
  const { theme } = useTheme();
  const mounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  
  const isDark = theme === 'dark';
  
  const gridColor = isDark ? '#27273a' : '#f3f4f6';
  const axisColor = isDark ? '#52525b' : '#9ca3af';
  const barInColor = '#6366f1'; // Modern Indigo accent
  const barOutColor = '#f43f5e'; // Soft minimal Rose accent
  
  const tooltipBg = isDark ? '#0c0c14' : '#ffffff';
  const tooltipBorder = isDark ? '#1f1f2e' : '#f3f4f6';
  const tooltipTextColor = isDark ? '#fafafa' : '#1f2937';
  const cursorColor = isDark ? '#181825' : '#f9fafb';

  if (!mounted) {
    return (
      <Card className="h-[400px] flex flex-col justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 dark:border-zinc-100" />
      </Card>
    );
  }

  return (
    <Card className="p-6 flex flex-col">
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-6">Stock Movement (Last 7 Days)</h3>
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: axisColor, fontSize: 12 }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: axisColor, fontSize: 12 }} />
            <Tooltip 
              contentStyle={{ 
                borderRadius: '12px', 
                border: `1px solid ${tooltipBorder}`, 
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', 
                background: tooltipBg,
                color: tooltipTextColor
              }}
              itemStyle={{ color: tooltipTextColor }}
              labelStyle={{ color: axisColor }}
              cursor={{ fill: cursorColor }}
            />
            <Legend 
              iconType="circle" 
              wrapperStyle={{ paddingTop: '20px' }}
              formatter={(value) => <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{value}</span>}
            />
            <Bar dataKey="in" name="Stock In" fill={barInColor} radius={[4, 4, 0, 0]} maxBarSize={40} />
            <Bar dataKey="out" name="Stock Out" fill={barOutColor} radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
