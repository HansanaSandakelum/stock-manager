'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';
import { ArrowRightLeft, Plus, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { Select } from '@/components/ui/Select';

const PAGE_SIZE = 10;
const COL_SPAN = 6;

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
        {start}-{end} of {total} transactions
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

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  
  // Filters
  const [filterType, setFilterType] = useState('');
  
  // Form State
  const [formData, setFormData] = useState({
    product: '',
    type: 'in',
    quantity: 1,
    note: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchTransactions();
    fetchProducts();
  }, [filterType]);

  const fetchTransactions = async () => {
    try {
      const url = `/api/transactions?limit=1000${filterType ? `&type=${filterType}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setTransactions(data.data);
      }
    } catch (error) {
      toast('Failed to load transactions', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products?limit=1000');
      const data = await res.json();
      if (data.success) {
        setProducts(data.data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  // Reset to page 1 when filter toggles
  useEffect(() => {
    setPage(1);
  }, [filterType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to process transaction');

      toast('Transaction recorded successfully', 'success');
      setIsModalOpen(false);
      setFormData({
        product: '',
        type: 'in',
        quantity: 1,
        note: '',
        date: new Date().toISOString().split('T')[0]
      });
      fetchTransactions();
    } catch (error: any) {
      toast(error.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(transactions.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = transactions.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Transactions</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Record and view product moving history</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4" /> New Transaction
        </Button>
      </div>

      <Card className="p-0 overflow-hidden border border-zinc-100 dark:border-zinc-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.015),0_1px_2px_rgb(0,0,0,0.01)] bg-white dark:bg-[#0c0c14]">
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800/60 flex items-center gap-4 bg-zinc-50/10 dark:bg-zinc-900/10">
          <Select 
            value={filterType}
            onChange={setFilterType}
            options={[
              { value: '', label: 'All Movements' },
              { value: 'in', label: 'Received (Stock In)' },
              { value: 'out', label: 'Issued (Stock Out)' }
            ]}
            className="w-48"
          />
        </div>

        {loading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
          </div>
        ) : transactions.length === 0 ? (
          <EmptyState 
            icon={ArrowRightLeft}
            title="No transactions found"
            description="Record your first stock movement by clicking the button above."
            actionLabel="New Transaction"
            onAction={() => setIsModalOpen(true)}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-zinc-50/50 dark:bg-zinc-900/40 border-b border-zinc-100 dark:border-zinc-800/80 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  <tr>
                    <th className="px-6 py-4.5 font-semibold">Date</th>
                    <th className="px-6 py-4.5 font-semibold">Product</th>
                    <th className="px-6 py-4.5 font-semibold text-center">Type</th>
                    <th className="px-6 py-4.5 font-semibold text-right">Quantity</th>
                    <th className="px-6 py-4.5 font-semibold">Created By</th>
                    <th className="px-6 py-4.5 font-semibold">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  {paginated.map((t) => (
                    <tr key={t._id} className="hover:bg-zinc-50/30 dark:hover:bg-zinc-900/10 transition-colors">
                      <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-zinc-350 dark:text-zinc-650" />
                          {new Date(t.date).toLocaleDateString('en-LK', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-zinc-800 dark:text-zinc-150">
                        {t.product?.name || 'Deleted Product'} 
                        <span className="text-zinc-400 dark:text-zinc-500 font-mono text-[10px] ml-2">({t.product?.sku || 'N/A'})</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Badge variant={t.type === 'in' ? 'success' : 'danger'}>
                          {t.type === 'in' ? 'IN' : 'OUT'}
                        </Badge>
                      </td>
                      <td className={`px-6 py-4 text-right font-extrabold tabular-nums ${t.type === 'in' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {t.type === 'in' ? `+${t.quantity}` : `-${t.quantity}`}
                      </td>
                      <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400 font-medium">{t.createdBy?.name || '—'}</td>
                      <td className="px-6 py-4 text-zinc-600 dark:text-zinc-405 max-w-[200px] truncate italic">{t.note || '—'}</td>
                    </tr>
                  ))}
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

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title="New Transaction"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Product</label>
            <Select
              value={formData.product}
              onChange={(value) => setFormData({...formData, product: value})}
              options={products.map(p => ({ value: p._id, label: `${p.name} (Available: ${p.quantity})` }))}
              placeholder="Select a product"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Transaction Type</label>
            <div className="flex rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-0.5">
              {(['in', 'out'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFormData({...formData, type: t})}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    formData.type === t
                      ? t === 'in'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-rose-600 text-white shadow-sm'
                      : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer'
                  }`}
                >
                  {t === 'in' ? 'Stock In (Receive)' : 'Stock Out (Issue)'}
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Quantity"
            type="number"
            min="1"
            value={formData.quantity}
            onChange={(e) => setFormData({...formData, quantity: Number(e.target.value)})}
            required
          />

          <Input
            label="Date"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({...formData, date: e.target.value})}
            required
          />

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Note (Optional)</label>
            <textarea
              className="w-full px-3.5 py-2.5 bg-zinc-50/50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all duration-200 text-zinc-800 dark:text-zinc-150 placeholder-zinc-400 dark:placeholder-zinc-650"
              rows={2}
              value={formData.note}
              onChange={(e) => setFormData({...formData, note: e.target.value})}
              placeholder="Reason for transaction"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              Record Transaction
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
