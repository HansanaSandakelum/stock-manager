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

export function StockChart({ data }: StockChartProps) {
  const { theme } = useTheme();
  
  const isDark = theme === 'dark';
  
  const gridColor = isDark ? '#27272a' : '#E5E7EB';
  const axisColor = isDark ? '#a1a1aa' : '#71717a';
  const barInColor = isDark ? '#f4f4f5' : '#18181b';
  const barOutColor = '#ef4444'; // Keep red in both
  
  const tooltipBg = isDark ? '#09090b' : '#ffffff';
  const tooltipBorder = isDark ? '#27272a' : '#e4e4e7';
  const tooltipTextColor = isDark ? '#fafafa' : '#18181b';
  const cursorColor = isDark ? '#18181b' : '#f4f4f5';

  return (
    <Card className="h-[400px] flex flex-col">
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-6">Stock Movement (Last 7 Days)</h3>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
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
