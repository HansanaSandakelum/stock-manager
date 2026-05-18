'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';
import { ArrowRightLeft, Plus } from 'lucide-react';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
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
      const url = `/api/transactions${filterType ? `?type=${filterType}` : ''}`;
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Transactions</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Record and view stock movements</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4" /> New Transaction
        </Button>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-4 bg-white dark:bg-zinc-900">
          <select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
          >
            <option value="">All Types</option>
            <option value="in">Stock In</option>
            <option value="out">Stock Out</option>
          </select>
        </div>

        {loading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full" />)}
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400">
                <tr>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Product</th>
                  <th className="px-6 py-4 font-medium text-center">Type</th>
                  <th className="px-6 py-4 font-medium text-right">Quantity</th>
                  <th className="px-6 py-4 font-medium">Created By</th>
                  <th className="px-6 py-4 font-medium">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {transactions.map((t) => (
                  <tr key={t._id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400">
                      {new Date(t.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">
                      {t.product?.name || 'Deleted Product'} 
                      <span className="text-zinc-400 dark:text-zinc-500 text-xs ml-2">({t.product?.sku || 'N/A'})</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant={t.type === 'in' ? 'success' : 'danger'}>
                        {t.type === 'in' ? 'IN' : 'OUT'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-zinc-900 dark:text-zinc-100">
                      {t.quantity}
                    </td>
                    <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400">{t.createdBy?.name || '-'}</td>
                    <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400 max-w-[200px] truncate">{t.note || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title="New Transaction"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Product</label>
            <select
              required
              value={formData.product}
              onChange={(e) => setFormData({...formData, product: e.target.value})}
              className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
            >
              <option value="">Select a product</option>
              {products.map(p => (
                <option key={p._id} value={p._id}>{p.name} (Qty: {p.quantity})</option>
              ))}
            </select>
          </div>

          <div className="flex gap-4 p-1 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl">
            <button
              type="button"
              className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${formData.type === 'in' ? 'bg-white dark:bg-zinc-900 shadow-sm text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
              onClick={() => setFormData({...formData, type: 'in'})}
            >
              Stock In
            </button>
            <button
              type="button"
              className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${formData.type === 'out' ? 'bg-white dark:bg-zinc-900 shadow-sm text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
              onClick={() => setFormData({...formData, type: 'out'})}
            >
              Stock Out
            </button>
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
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Note (Optional)</label>
            <textarea
              className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 disabled:opacity-50"
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
