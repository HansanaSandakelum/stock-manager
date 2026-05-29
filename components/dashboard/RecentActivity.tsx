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
        <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-100 tracking-tight mb-4">Recent Activity</h3>
        
        {displayedTransactions.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-zinc-400 dark:text-zinc-500 text-xs">
            No recent transactions
          </div>
        ) : (
          <div className="space-y-2 flex-1 min-h-0 overflow-y-auto pr-0.5 scrollbar-thin">
            {displayedTransactions.map((t) => (
              <div key={t._id} className="flex items-center justify-between p-1 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10 rounded-xl transition-all duration-200">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${t.type === 'in' ? 'bg-emerald-50/40 text-emerald-600 border-emerald-100/30 dark:bg-emerald-950/10 dark:text-emerald-400 dark:border-emerald-900/20' : 'bg-rose-50/40 text-rose-600 border-rose-100/30 dark:bg-rose-950/10 dark:text-rose-400 dark:border-rose-900/20'}`}>
                    {t.type === 'in' ? (
                      <ArrowDownRight className="w-3.5 h-3.5" />
                    ) : (
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 line-clamp-1">{t.product?.name || 'Deleted Product'}</p>
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                      {new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} • {t.createdBy?.name || 'System'}
                    </p>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-1 shrink-0">
                  <span className={`text-xs font-bold tracking-tight ${t.type === 'in' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {t.type === 'in' ? '+' : '-'}{t.quantity}
                  </span>
                  <Badge variant={t.type === 'in' ? 'success' : 'danger'}>
                    {t.type === 'in' ? 'In' : 'Out'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {transactions.length > 0 && (
        <div className="mt-3.5 pt-3.5 border-t border-zinc-100 dark:border-zinc-800/80">
          <Link href="/transactions" className="w-full block">
            <Button variant="secondary" className="w-full text-xs font-semibold py-2">
              View More Transactions
            </Button>
          </Link>
        </div>
      )}
    </Card>
  );
}

