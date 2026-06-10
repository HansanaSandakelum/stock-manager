'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Package, Clock, TrendingUp, TrendingDown,
  RefreshCw, DollarSign, Calendar, Activity, AlertTriangle,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';

const PAGE_SIZE = 10;
const COL_SPAN = 5;

// == Helper Formatter Functions ==
function fmtDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-LK', {
    day: '2-digit', month: 'short', year: 'numeric',
  }) + ' ' + d.toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit', hour12: true });
}

// == Pagination Component ==
function Pagination({ page, totalPages, total, pageSize, onChange }: {
  page: number; totalPages: number; total: number; pageSize: number; onChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  // Build page number list with ellipsis
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
        {start}-{end} of {total} entries
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="w-7 h-7 flex items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer active:scale-90"
          aria-label="Previous page"
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
          aria-label="Next page"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function fmtCurrency(val: number) {
  return `Rs. ${val.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function stockVariant(qty: number, thr: number): 'success' | 'warning' | 'danger' {
  if (qty === 0) return 'danger';
  if (qty <= thr) return 'warning';
  return 'success';
}

export default function ProductLogPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [product, setProduct] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);

  // == Fetch Data ==
  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      // Fetch Product
      const productRes = await fetch(`/api/products/${id}`);
      const productData = await productRes.json();
      
      if (!productData.success) {
        toast('Product not found', 'error');
        router.push('/stock');
        return;
      }

      setProduct(productData.data);

      // Fetch Transaction Logs (limit 1000)
      const txRes = await fetch(`/api/transactions?product=${id}&limit=1000`);
      const txData = await txRes.json();
      if (txData.success) {
        setTransactions(txData.data);
      }
    } catch (err) {
      toast('Failed to load logs', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // == Statistics ==
  const totalReceived = transactions
    .filter(t => t.type === 'in')
    .reduce((sum, t) => sum + t.quantity, 0);

  const totalIssued = transactions
    .filter(t => t.type === 'out')
    .reduce((sum, t) => sum + t.quantity, 0);

  const netFlow = totalReceived - totalIssued;

  const totalPages = Math.max(1, Math.ceil(transactions.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = transactions.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // == Loading skeleton ==
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <Skeleton className="h-6 w-48 rounded" />
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!product) return null;

  const threshold = product.lowStockThreshold ?? 10;
  const statusCls = stockVariant(product.quantity, threshold);

  return (
    <div className="space-y-6">
      {/* == Back row + Header == */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/stock')}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-150 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors border border-zinc-200 dark:border-zinc-800 cursor-pointer active:scale-95"
            aria-label="Back to Stock"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 truncate">
                {product.name}
              </h2>
              <Badge variant={statusCls}>
                {statusCls === 'success' ? 'In Stock' : statusCls === 'warning' ? 'Low Stock' : 'Out of Stock'}
              </Badge>
            </div>
            <p className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 mt-0.5">SKU: {product.sku}</p>
          </div>
        </div>

        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 self-start sm:self-auto text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* == Stat Strip == */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Metric 1: Current Qty */}
        <Card className="px-4 py-3 bg-white dark:bg-[#0c0c14] border-zinc-100 dark:border-zinc-800/70 flex flex-col justify-between h-24">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-505 uppercase tracking-wider">Current Stock</span>
            <Package className="w-3.5 h-3.5 text-zinc-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-zinc-850 dark:text-zinc-100 tabular-nums">
              {product.quantity.toLocaleString()}
            </span>
            <span className="text-[9px] font-medium text-zinc-450 dark:text-zinc-505 uppercase tracking-wide">units</span>
          </div>
        </Card>

        {/* Metric 2: Stock Value */}
        <Card className="px-4 py-3 bg-white dark:bg-[#0c0c14] border-zinc-100 dark:border-zinc-800/70 flex flex-col justify-between h-24">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-555 uppercase tracking-wider">Inventory Value</span>
            <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="mt-2 flex flex-col">
            <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 truncate">
              {fmtCurrency(product.quantity * product.unitPrice)}
            </span>
            <span className="text-[9px] text-zinc-400 dark:text-zinc-555 truncate mt-0.5">Unit: {fmtCurrency(product.unitPrice)}</span>
          </div>
        </Card>

        {/* Metric 3: Log count */}
        <Card className="px-4 py-3 bg-white dark:bg-[#0c0c14] border-zinc-100 dark:border-zinc-800/70 flex flex-col justify-between h-24">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-505 uppercase tracking-wider">Log Entries</span>
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-indigo-650 dark:text-indigo-400 tabular-nums">
              {transactions.length}
            </span>
            <span className="text-[9px] font-medium text-zinc-450 dark:text-zinc-505 uppercase tracking-wide">changes</span>
          </div>
        </Card>

        {/* Metric 4: Net change */}
        <Card className="px-4 py-3 bg-white dark:bg-[#0c0c14] border-zinc-100 dark:border-zinc-800/70 flex flex-col justify-between h-24">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-505 uppercase tracking-wider">Net Adjustments</span>
            <Clock className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className={`text-base font-extrabold tabular-nums ${netFlow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {netFlow >= 0 ? `+${netFlow}` : netFlow} units
            </span>
            <div className="flex gap-2 text-[9px] text-zinc-400 font-mono">
              <span className="text-emerald-500 font-semibold">+{totalReceived}</span>
              <span className="text-rose-500 font-semibold">-{totalIssued}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* == Alert Warnings == */}
      {product.quantity === 0 && (
        <div className="flex items-start gap-2.5 px-4 py-3 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100/60 dark:border-rose-900/30 rounded-xl text-xs text-rose-700 dark:text-rose-455">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
          <div>
            <strong>Product is Out of Stock.</strong> The system has recorded no available inventory units on hand.
          </div>
        </div>
      )}
      {product.quantity > 0 && product.quantity <= threshold && (
        <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100/60 dark:border-amber-900/30 rounded-xl text-xs text-amber-700 dark:text-amber-455">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
          <div>
            <strong>Stock is below threshold.</strong> Quantity ({product.quantity}) is lower than the safety threshold of {threshold} units.
          </div>
        </div>
      )}

      {/* == Log History Audit Table == */}
      <Card className="p-0 overflow-hidden border border-zinc-100 dark:border-zinc-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.015),0_1px_2px_rgb(0,0,0,0.01)] bg-white dark:bg-[#0c0c14]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/20 dark:bg-zinc-900/30">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-zinc-400" />
            <h3 className="text-xs font-semibold text-zinc-400 dark:text-zinc-505 uppercase tracking-wider">
              Chronological Audit Trail
            </h3>
          </div>
          <span className="text-[9px] font-mono text-zinc-400">Chronological list of stock adjustments</span>
        </div>

        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-400 dark:text-zinc-650 bg-white dark:bg-[#0c0c14]">
            <Package className="w-8 h-8 mb-2 opacity-30 text-zinc-350 dark:text-zinc-600" />
            <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400">No logs found</p>
            <p className="text-[10px] mt-0.5 text-zinc-400 dark:text-zinc-500">Record stock actions on the Stock Handling page to see logs here.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-zinc-50/50 dark:bg-zinc-900/40 border-b border-zinc-100 dark:border-zinc-800/80 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  <tr>
                    <th className="px-3 sm:px-5 py-2.5 sm:py-3.5 font-semibold w-52">Timestamp</th>
                    <th className="px-3 sm:px-5 py-2.5 sm:py-3.5 font-semibold text-center w-24">Type</th>
                    <th className="px-3 sm:px-5 py-2.5 sm:py-3.5 font-semibold text-right w-32">Delta Quantity</th>
                    <th className="px-3 sm:px-5 py-2.5 sm:py-3.5 font-semibold w-40 hidden sm:table-cell">Recorded By</th>
                    <th className="px-3 sm:px-5 py-2.5 sm:py-3.5 font-semibold hidden sm:table-cell">Note / Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  {paginated.map((tx) => {
                    const isIn = tx.type === 'in';
                    return (
                      <tr key={tx._id} className="hover:bg-zinc-50/30 dark:hover:bg-zinc-900/10 transition-colors">
                        {/* Timestamp */}
                        <td className="px-3 sm:px-5 py-3 text-zinc-500 dark:text-zinc-400 font-medium whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-zinc-350 dark:text-zinc-650 flex-shrink-0" />
                            <span>{fmtDate(tx.date ?? tx.createdAt)}</span>
                          </div>
                        </td>

                        {/* IN / OUT Badge */}
                        <td className="px-3 sm:px-5 py-3 text-center">
                          <span className={`inline-flex items-center justify-center text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                            isIn
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/20'
                              : 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/20'
                          }`}>
                            {isIn ? 'IN' : 'OUT'}
                          </span>
                        </td>

                        {/* Quantity */}
                        <td className={`px-3 sm:px-5 py-3 text-right font-extrabold tabular-nums text-sm ${isIn ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {isIn ? `+${tx.quantity}` : `-${tx.quantity}`}
                        </td>

                        {/* Recorded By */}
                        <td className="px-3 sm:px-5 py-3 text-zinc-505 dark:text-zinc-400 font-medium hidden sm:table-cell">
                          {tx.createdBy?.name || '-'}
                        </td>

                        {/* Notes */}
                        <td className="px-3 sm:px-5 py-3 text-zinc-600 dark:text-zinc-400 max-w-sm truncate italic hidden sm:table-cell">
                          {tx.note || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <Pagination
              page={safePage}
              totalPages={totalPages}
              total={transactions.length}
              pageSize={PAGE_SIZE}
              onChange={setPage}
            />
          </>
        )}
      </Card>
    </div>
  );
}
