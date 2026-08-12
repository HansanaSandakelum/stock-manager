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
  
  const gridColor = isDark ? '#1e1e2e' : '#f1f5f9';
  const axisColor = isDark ? '#64748b' : '#94a3b8';
  const barInColor = '#6366f1';
  const barOutColor = '#f43f5e';
  
  const tooltipBg = isDark ? '#0a0a0f' : '#ffffff';
  const tooltipBorder = isDark ? '#1e1e2e' : '#e2e8f0';
  const tooltipTextColor = isDark ? '#f1f5f9' : '#0f172a';
  const cursorColor = isDark ? '#111118' : '#f8fafc';

  if (!mounted) {
    return (
      <Card className="h-[400px] flex flex-col justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </Card>
    );
  }

  return (
    <Card className="p-6 flex flex-col">
      <h3 className="text-base font-semibold text-text dark:text-dark-text mb-6">Stock Movement (Last 7 Days)</h3>
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
              formatter={(value) => <span className="text-sm font-medium text-text-secondary dark:text-dark-text-secondary">{value}</span>}
            />
            <Bar dataKey="in" name="Stock In" fill={barInColor} radius={[4, 4, 0, 0]} maxBarSize={40} />
            <Bar dataKey="out" name="Stock Out" fill={barOutColor} radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
