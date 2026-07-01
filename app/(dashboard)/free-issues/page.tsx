'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';
import { Gift, Plus, Clock, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { useRouter } from 'next/navigation';

const PAGE_SIZE = 10;

function Pagination({ page, totalPages, total, pageSize, onChange }: {
  page: number; totalPages: number; total: number; pageSize: number; onChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-between px-6 py-2.5 border-t border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/40 dark:bg-zinc-900/20">
      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 tabular-nums">
        {start}-{end} of {total} free issues
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="w-7 h-7 flex items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer active:scale-90"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="w-7 h-7 flex items-center justify-center text-[10px] text-zinc-400">...</span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p as number)}
              className={`w-7 h-7 flex items-center justify-center rounded-lg text-[11px] font-semibold transition-all cursor-pointer active:scale-90 ${
                p === page
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-indigo-300 hover:text-indigo-600'
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          className="w-7 h-7 flex items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer active:scale-90"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function FreeIssuesPage() {
  const router = useRouter();
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [mounted, setMounted] = useState(false);
  const { data: session } = useSession();

  useEffect(() => {
    setMounted(true);
    fetchFreeIssues();
  }, []);

  const fetchFreeIssues = async () => {
    try {
      // Fetch only 'free-issue' transactions
      const res = await fetch('/api/transactions?type=free-issue&limit=1000');
      const data = await res.json();
      if (data.success) {
        setIssues(data.data);
      }
    } catch (error) {
      toast('Failed to load free issues', 'error');
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    if (!issues.length) {
      toast('No free issues to download', 'info');
      return;
    }

    const headers = ['Date', 'Product Name', 'SKU', 'Quantity', 'Created By', 'Note'];
    const csvRows = [headers.join(',')];

    issues.forEach(t => {
      const date = new Date(t.date).toLocaleDateString('en-LK', { day: '2-digit', month: 'short', year: 'numeric' });
      const productName = t.product?.name || 'Deleted Product';
      const sku = t.product?.sku || 'N/A';
      const qty = t.quantity;
      const createdBy = t.createdBy?.name || '';
      const note = t.note || '';
      
      const row = [
        `"${date}"`,
        `"${productName}"`,
        `"${sku}"`,
        `"${qty}"`,
        `"${createdBy}"`,
        `"${note}"`
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `free_issues_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast('Free issues downloaded successfully', 'success');
  };

  const totalPages = Math.max(1, Math.ceil(issues.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = issues.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Gift className="w-5 h-5 text-indigo-500" /> Free Issues
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Track products given out for free, separately from sales.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={downloadCSV} variant="secondary">
            <Download className="w-4 h-4" /> Export
          </Button>
          <Button onClick={() => router.push('/free-issues/new')}>
            <Plus className="w-4 h-4" /> New Free Issue
          </Button>
        </div>
      </div>

      <Card className="p-0 overflow-hidden border border-zinc-100 dark:border-zinc-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.015),0_1px_2px_rgb(0,0,0,0.01)] bg-white dark:bg-[#0c0c14]">
        {loading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
          </div>
        ) : issues.length === 0 ? (
          <EmptyState 
            icon={Gift}
            title="No free issues yet"
            description="Record your first free product issue by clicking the button above."
            actionLabel="New Free Issue"
            onAction={() => router.push('/free-issues/new')}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-zinc-50/50 dark:bg-zinc-900/40 border-b border-zinc-100 dark:border-zinc-800/80 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-400">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 sm:py-4.5 font-semibold">Date</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4.5 font-semibold">Product</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4.5 font-semibold text-right">Quantity</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4.5 font-semibold hidden sm:table-cell">Created By</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4.5 font-semibold hidden sm:table-cell">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  {paginated.map((t) => (
                    <tr key={t._id} className="hover:bg-zinc-50/30 dark:hover:bg-zinc-900/10 transition-colors">
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-zinc-500 dark:text-zinc-400 font-medium">
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          <Clock className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
                          {new Date(t.date).toLocaleDateString('en-LK', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 font-semibold text-zinc-800 dark:text-zinc-200">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                          <span className="truncate max-w-[150px] sm:max-w-none">{t.product?.name || 'Deleted Product'}</span>
                          <span className="text-zinc-400 dark:text-zinc-500 font-mono text-[9px] sm:text-[10px]">({t.product?.sku || 'N/A'})</span>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-right font-extrabold tabular-nums text-indigo-600 dark:text-indigo-400">
                        {t.quantity}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-zinc-500 dark:text-zinc-400 font-medium hidden sm:table-cell">
                        {t.createdBy?.name || '—'}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-zinc-600 dark:text-zinc-400 max-w-[200px] truncate italic hidden sm:table-cell" title={t.note || ''}>
                        {t.note || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              page={safePage}
              totalPages={totalPages}
              total={issues.length}
              pageSize={PAGE_SIZE}
              onChange={setPage}
            />
          </>
        )}
      </Card>
    </div>
  );
}
