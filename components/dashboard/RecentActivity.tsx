'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

interface Transaction {
  _id: string;
  product: { name: string };
  type: 'in' | 'out';
  quantity: number;
  date: string;
  createdBy: { name: string };
}

export function RecentActivity({ transactions }: { transactions: Transaction[] }) {
  const displayedTransactions = transactions.slice(0, 5);

  return (
    <Card className="h-[400px] flex flex-col justify-between">
      <div className="flex-1 flex flex-col min-h-0">
        <h3 className="text-base font-semibold text-text dark:text-dark-text mb-4">Recent Activity</h3>
        
        {displayedTransactions.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-text-tertiary dark:text-dark-text-tertiary text-xs">
            No recent transactions
          </div>
        ) : (
          <div className="space-y-1 flex-1 min-h-0 overflow-y-auto pr-0.5">
            {displayedTransactions.map((t) => (
              <div key={t._id} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-surface-hover dark:hover:bg-dark-surface-hover transition-all duration-200">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    t.type === 'in'
                      ? 'bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400'
                      : 'bg-danger-50 text-danger-600 dark:bg-danger-500/10 dark:text-danger-400'
                  }`}>
                    {t.type === 'in' ? (
                      <ArrowDownRight className="w-4 h-4" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-text dark:text-dark-text truncate">{t.product?.name || 'Deleted Product'}</p>
                    <p className="text-[10px] text-text-tertiary dark:text-dark-text-tertiary mt-0.5">
                      {new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} &middot; {t.createdBy?.name || 'System'}
                    </p>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-1 shrink-0 ml-3">
                  <span className={`text-xs font-bold tracking-tight ${
                    t.type === 'in' ? 'text-success-600 dark:text-success-400' : 'text-danger-600 dark:text-danger-400'
                  }`}>
                    {t.type === 'in' ? '+' : '-'}{t.quantity}
                  </span>
                  <Badge variant={t.type === 'in' ? 'success' : 'danger'} size="sm">
                    {t.type === 'in' ? 'In' : 'Out'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {transactions.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border dark:border-dark-border">
          <Link href="/transactions" className="w-full block">
            <Button variant="secondary" size="sm" className="w-full font-semibold">
              View More Transactions
            </Button>
          </Link>
        </div>
      )}
    </Card>
  );
}
