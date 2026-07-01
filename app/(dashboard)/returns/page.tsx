'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';
import { Undo2, Plus, Clock, ChevronLeft, ChevronRight, CheckCircle2, Trash2 } from 'lucide-react';
import { Select } from '@/components/ui/Select';

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
        {start}-{end} of {total} returns
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

export default function ReturnsPage() {
  const [returns, setReturns] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');
  
  const { data: session } = useSession();

  const [formData, setFormData] = useState({
    product: '',
    quantity: 1,
    reason: '',
    customerName: ''
  });

  useEffect(() => {
    fetchReturns();
    fetchProducts();
  }, [filterStatus]);

  useEffect(() => {
    setPage(1);
  }, [filterStatus]);

  const fetchReturns = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/returns');
      const data = await res.json();
      if (res.ok) {
        let filtered = data;
        if (filterStatus) {
          filtered = data.filter((r: any) => r.status === filterStatus);
        }
        setReturns(filtered);
      }
    } catch (error) {
      toast('Failed to load returns', 'error');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to record return');

      toast('Return recorded successfully', 'success');
      setIsModalOpen(false);
      setFormData({
        product: '',
        quantity: 1,
        reason: '',
        customerName: ''
      });
      fetchReturns();
    } catch (error: any) {
      toast(error.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    if (!confirm(`Are you sure you want to mark this return as ${newStatus}?`)) return;

    try {
      const res = await fetch(`/api/returns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to update status');
      
      toast(`Return marked as ${newStatus}`, 'success');
      fetchReturns();
    } catch (error: any) {
      toast(error.message, 'error');
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch(status) {
      case 'Pending': return 'warning';
      case 'Restocked': return 'success';
      case 'Discarded': return 'danger';
      default: return 'default';
    }
  };

  const totalPages = Math.max(1, Math.ceil(returns.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = returns.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Returns</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Track and manage returned products</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4" /> Log Return
        </Button>
      </div>

      <Card className="p-0 overflow-hidden border border-zinc-100 dark:border-zinc-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.015),0_1px_2px_rgb(0,0,0,0.01)] bg-white dark:bg-[#0c0c14]">
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800/60 flex items-center gap-4 bg-zinc-50/10 dark:bg-zinc-900/10">
          <Select 
            value={filterStatus}
            onChange={setFilterStatus}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'Pending', label: 'Pending' },
              { value: 'Restocked', label: 'Stored (Returns)' },
              { value: 'Discarded', label: 'Discarded' }
            ]}
            className="w-48"
          />
        </div>

        {loading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
          </div>
        ) : returns.length === 0 ? (
          <EmptyState 
            icon={Undo2}
            title="No returns found"
            description="Log your first returned product by clicking the button above."
            actionLabel="Log Return"
            onAction={() => setIsModalOpen(true)}
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
                    <th className="px-3 sm:px-6 py-3 sm:py-4.5 font-semibold hidden sm:table-cell">Reason</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4.5 font-semibold text-center">Status</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4.5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  {paginated.map((r) => (
                    <tr key={r._id} className="hover:bg-zinc-50/30 dark:hover:bg-zinc-900/10 transition-colors">
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-zinc-500 dark:text-zinc-400 font-medium">
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          <Clock className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
                          {new Date(r.date).toLocaleDateString('en-LK', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 font-semibold text-zinc-800 dark:text-zinc-200">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                          <span className="truncate max-w-[150px] sm:max-w-none">{r.product?.name || 'Deleted Product'}</span>
                          <span className="text-zinc-400 dark:text-zinc-500 font-mono text-[9px] sm:text-[10px]">({r.product?.sku || 'N/A'})</span>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-right font-extrabold tabular-nums text-zinc-700 dark:text-zinc-300">
                        {r.quantity}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-zinc-600 dark:text-zinc-400 max-w-[150px] truncate hidden sm:table-cell" title={r.reason}>
                        {r.reason}
                        {r.customerName && <div className="text-[10px] text-zinc-400 mt-0.5">From: {r.customerName}</div>}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-center">
                        <Badge variant={getStatusBadgeVariant(r.status)}>
                          {r.status}
                        </Badge>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-right">
                        {r.status === 'Pending' && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => updateStatus(r._id, 'Restocked')}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors title='Store in Returns'"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => updateStatus(r._id, 'Discarded')}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors title='Discard Item'"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                        {r.status !== 'Pending' && (
                          <span className="text-zinc-400 text-[10px] uppercase">Processed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              page={safePage}
              totalPages={totalPages}
              total={returns.length}
              pageSize={PAGE_SIZE}
              onChange={setPage}
            />
          </>
        )}
      </Card>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title="Log Returned Product"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Product</label>
            <Select
              value={formData.product}
              onChange={(value) => setFormData({...formData, product: value})}
              options={products.map(p => ({ value: p._id, label: `${p.name} (${p.sku})` }))}
              placeholder="Select a product"
            />
          </div>

          <Input
            label="Quantity Returned"
            type="number"
            min="1"
            value={formData.quantity}
            onChange={(e) => setFormData({...formData, quantity: Number(e.target.value)})}
            required
          />

          <Input
            label="Customer Name (Optional)"
            type="text"
            value={formData.customerName}
            onChange={(e) => setFormData({...formData, customerName: e.target.value})}
            placeholder="John Doe"
          />

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Reason for Return</label>
            <textarea
              className="w-full px-3.5 py-2.5 bg-zinc-50/50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all duration-200 text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500"
              rows={2}
              value={formData.reason}
              onChange={(e) => setFormData({...formData, reason: e.target.value})}
              placeholder="e.g. Defective, Wrong item, Changed mind"
              required
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              Log Return
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
