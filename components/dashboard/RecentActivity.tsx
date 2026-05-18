'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

interface Transaction {
  _id: string;
  product: { name: string };
  type: 'in' | 'out';
  quantity: number;
  date: string;
  createdBy: { name: string };
}

export function RecentActivity({ transactions }: { transactions: Transaction[] }) {
  return (
    <Card>
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-6">Recent Activity</h3>
      
      {transactions.length === 0 ? (
        <div className="text-center py-8 text-zinc-500 dark:text-zinc-400 text-sm">No recent transactions</div>
      ) : (
        <div className="space-y-6">
          {transactions.map((t) => (
            <div key={t._id} className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${t.type === 'in' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                  {t.type === 'in' ? (
                    <ArrowDownRight className="w-5 h-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <ArrowUpRight className="w-5 h-5 text-red-600 dark:text-red-400" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{t.product?.name || 'Deleted Product'}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} • by {t.createdBy?.name || 'Unknown'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-sm font-bold ${t.type === 'in' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {t.type === 'in' ? '+' : '-'}{t.quantity}
                </span>
                <div className="mt-1">
                  <Badge variant={t.type === 'in' ? 'success' : 'danger'}>
                    {t.type === 'in' ? 'Stock In' : 'Stock Out'}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
