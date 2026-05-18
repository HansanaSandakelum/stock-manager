'use client';

import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Card } from '@/components/ui/Card';

interface StockChartProps {
  data: Array<{
    date: string;
    in: number;
    out: number;
  }>;
}

export function StockChart({ data }: StockChartProps) {
  return (
    <Card className="h-[400px] flex flex-col">
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-6">Stock Movement (Last 7 Days)</h3>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" className="dark:opacity-20" />
            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: '1px solid #e4e4e7', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', background: '#fff' }}
              cursor={{ fill: '#f4f4f5' }}
            />
            <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
            <Bar dataKey="in" name="Stock In" fill="#18181b" radius={[4, 4, 0, 0]} maxBarSize={40} />
            <Bar dataKey="out" name="Stock Out" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
