'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Package, Edit2, Save, X,
  ArrowDownCircle, ArrowUpCircle, AlertTriangle,
  Clock, CheckCircle2, TrendingUp, TrendingDown,
  MoveRight, PackageOpen,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';

// ── Helpers ───────────────────────────────────────────────────────────────────
const LOW_STOCK_THRESHOLD = 5;

function stockStatus(qty: number, threshold: number) {
  if (qty === 0) return { label: 'Out of stock', variant: 'danger' as const };
  if (qty <= threshold) return { label: 'Low stock', variant: 'warning' as const };
  return { label: 'In stock', variant: 'success' as const };
}

function fmtDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-LK', {
    day: '2-digit', month: 'short', year: 'numeric',
  }) + ' · ' + d.toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' });
}

function fmtCurrency(val: number) {
  return `Rs. ${val.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function InventoryDetailPage() {
  const params  = useParams();
  const router  = useRouter();
  const id      = params.id as string;

  const [product,      setProduct]      = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [editing,      setEditing]      = useState(false);
  const [saving,       setSaving]       = useState(false);

  // Issue/receive form state
  const [issueOpen,    setIssueOpen]    = useState(false);
  const [issueType,    setIssueType]    = useState<'in' | 'out'>('out');
  const [issueQty,     setIssueQty]     = useState('');
  const [issueNote,    setIssueNote]    = useState('');
  const [issueDate,    setIssueDate]    = useState(() => new Date().toISOString().slice(0, 10));
  const [issuing,      setIssuing]      = useState(false);

  // Edit form state (mirrors product fields)
  const [editData, setEditData] = useState<any>({});

  // ── Fetch product ─────────────────────────────────────────────────────────
  const fetchProduct = useCallback(async () => {
    try {
      const res  = await fetch(`/api/products/${id}`);
      const data = await res.json();
      if (data.success) {
        setProduct(data.data);
        setEditData({
          name:              data.data.name,
          sku:               data.data.sku,
          supplier:          data.data.supplier ?? '',
          unitPrice:         data.data.unitPrice,
          lowStockThreshold: data.data.lowStockThreshold ?? 10,
          image:             data.data.image ?? '',
        });
      } else {
        toast('Product not found', 'error');
      }
    } catch {
      toast('Failed to load product', 'error');
    }
  }, [id]);

  // ── Fetch transactions for this product ───────────────────────────────────
  const fetchTransactions = useCallback(async () => {
    try {
      const res  = await fetch(`/api/transactions?product=${id}&limit=50`);
      const data = await res.json();
      if (data.success) setTransactions(data.data);
    } catch {
      // silent — history is supplemental
    }
  }, [id]);

  useEffect(() => {
    Promise.all([fetchProduct(), fetchTransactions()]).finally(() => setLoading(false));
  }, [fetchProduct, fetchTransactions]);

  // ── Save product edits ────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      const res  = await fetch(`/api/products/${id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(editData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setProduct(data.data);
      setEditing(false);
      toast('Product updated', 'success');
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Record stock issue / receipt ──────────────────────────────────────────
  const handleIssue = async () => {
    const qty = parseInt(issueQty, 10);
    if (!qty || qty <= 0) { toast('Enter a valid quantity', 'error'); return; }
    if (issueType === 'out' && qty > product.quantity) {
      toast(`Only ${product.quantity} units available`, 'error');
      return;
    }
    setIssuing(true);
    try {
      const res  = await fetch('/api/transactions', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ product: id, type: issueType, quantity: qty, note: issueNote.trim(), date: issueDate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Transaction failed');
      toast(issueType === 'out' ? 'Stock issued' : 'Stock received', 'success');
      setIssueQty(''); setIssueNote(''); setIssueOpen(false);
      // Refresh both
      await Promise.all([fetchProduct(), fetchTransactions()]);
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setIssuing(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Package className="w-10 h-10 text-zinc-300 mb-3" />
        <p className="text-sm text-zinc-500">Product not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/inventory')}>
          Back to inventory
        </Button>
      </div>
    );
  }

  const threshold = product.lowStockThreshold ?? LOW_STOCK_THRESHOLD;
  const { label: statusLabel, variant: statusVariant } = stockStatus(product.quantity, threshold);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Back + title row ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/inventory')}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors border border-zinc-200 dark:border-zinc-800 cursor-pointer active:scale-[0.95]"
            aria-label="Back to inventory"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 truncate">
              {product.name}
            </h2>
            <p className="text-xs font-mono text-zinc-400 dark:text-zinc-500 mt-0.5">{product.sku}</p>
          </div>
        </div>
        <div>
          <Badge variant={statusVariant}>{statusLabel}</Badge>
        </div>
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── LEFT: details + edit ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Product details card */}
          <Card className="p-0 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-[#0c0c14]">
              <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                Product details
              </span>
              {editing ? (
                <div className="flex gap-2">
                  <Button variant="outline" className="h-8 px-3 text-xs" onClick={() => setEditing(false)}>
                    <X className="w-3.5 h-3.5" /> Cancel
                  </Button>
                  <Button className="h-8 px-3 text-xs" isLoading={saving} onClick={handleSave}>
                    <Save className="w-3.5 h-3.5" /> Save
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 text-xs text-zinc-550 dark:text-zinc-400 hover:text-indigo-650 dark:hover:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 px-3 py-1.5 rounded-lg transition-all duration-200 font-semibold border border-transparent hover:border-indigo-100/50 dark:hover:border-indigo-900/30 cursor-pointer active:scale-95"
                >
                  <Edit2 className="w-3 h-3" /> Edit
                </button>
              )}
            </div>

            <div className="p-5 bg-white dark:bg-[#0c0c14]">
              {editing ? (
                /* ── Edit form ── */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Product name"
                    value={editData.name}
                    onChange={e => setEditData((p: any) => ({ ...p, name: e.target.value }))}
                  />
                  <Input
                    label="SKU"
                    value={editData.sku}
                    onChange={e => setEditData((p: any) => ({ ...p, sku: e.target.value }))}
                  />
                  <Input
                    label="Supplier"
                    value={editData.supplier}
                    onChange={e => setEditData((p: any) => ({ ...p, supplier: e.target.value }))}
                  />
                  <Input
                    label="Unit price (Rs.)"
                    type="number"
                    min="0"
                    step="0.01"
                    value={editData.unitPrice}
                    onChange={e => setEditData((p: any) => ({ ...p, unitPrice: Number(e.target.value) }))}
                  />
                  <Input
                    label="Low-stock threshold"
                    type="number"
                    min="0"
                    value={editData.lowStockThreshold}
                    onChange={e => setEditData((p: any) => ({ ...p, lowStockThreshold: Number(e.target.value) }))}
                  />
                  <Input
                    label="Image URL"
                    value={editData.image}
                    onChange={e => setEditData((p: any) => ({ ...p, image: e.target.value }))}
                    placeholder="https://…"
                  />
                </div>
              ) : (
                /* ── Read-only detail grid ── */
                <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <DetailRow label="Category"    value={product.category?.name ?? '—'} />
                  <DetailRow label="Unit price"  value={fmtCurrency(product.unitPrice)} />
                  <DetailRow label="Supplier"    value={product.supplier || '—'} />
                  <DetailRow label="Low-stock threshold" value={`${product.lowStockThreshold ?? 10} units`} />
                  <DetailRow label="Created"     value={fmtDate(product.createdAt)} />
                  <DetailRow label="Last updated" value={fmtDate(product.updatedAt)} />
                </dl>
              )}
            </div>
          </Card>

          {/* ── Stock alerts ── */}
          {product.quantity === 0 && (
            <div className="flex items-start gap-3 px-4 py-3.5 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100/60 dark:border-rose-900/30 rounded-2xl text-xs text-rose-700 dark:text-rose-400">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>This product is <strong>out of stock</strong>. Record a stock receipt to replenish.</span>
            </div>
          )}
          {product.quantity > 0 && product.quantity <= threshold && (
            <div className="flex items-start gap-3 px-4 py-3.5 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100/60 dark:border-amber-900/30 rounded-2xl text-xs text-amber-700 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Stock is below the threshold of <strong>{threshold} units</strong>. Consider restocking soon.</span>
            </div>
          )}

          {/* ── Product moving history ── */}
          <Card className="p-0 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-[#0c0c14]">
              <div className="flex items-center gap-2">
                <MoveRight className="w-4 h-4 text-zinc-400" />
                <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                  Product moving history
                </span>
              </div>
              {transactions.length > 0 && (
                <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900/50 px-2 py-0.5 rounded-md border border-zinc-100 dark:border-zinc-800/80">
                  {transactions.length} movement{transactions.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {transactions.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-zinc-400 dark:text-zinc-500 bg-white dark:bg-[#0c0c14]">
                <PackageOpen className="w-8 h-8 mb-2 opacity-40 text-zinc-300 dark:text-zinc-600" />
                <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">No movements recorded yet.</p>
                <p className="text-[10px] mt-0.5 text-zinc-400 dark:text-zinc-500">Use Receive or Issue to log stock changes.</p>
              </div>
            ) : (
              <div className="relative bg-white dark:bg-[#0c0c14]">
                {/* Timeline track */}
                <div className="absolute left-[2.45rem] top-0 bottom-0 w-px bg-zinc-100 dark:bg-zinc-800/80 pointer-events-none" />

                <ul className="py-2">
                  {transactions.map((tx: any, idx: number) => {
                    const isIn = tx.type === 'in';
                    return (
                      <li
                        key={tx._id}
                        className="flex gap-4 px-5 py-4 transition-colors hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20"
                      >
                        {/* Timeline dot */}
                        <div className="flex flex-col items-center shrink-0 pt-0.5">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center border-2 z-10 ${
                            isIn
                              ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30'
                              : 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/30'
                          }`}>
                            {isIn
                              ? <ArrowDownCircle className="w-4 h-4 text-emerald-500" />
                              : <ArrowUpCircle   className="w-4 h-4 text-rose-500" />
                            }
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 pb-1">
                          {/* Row 1: movement type + qty + badge */}
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                                {isIn ? 'Stock received' : 'Stock issued'}
                              </span>
                              <span className={`text-xs font-extrabold tabular-nums ${
                                isIn ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                              }`}>
                                {isIn ? `+${tx.quantity}` : `−${tx.quantity}`}
                              </span>
                            </div>
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 border ${
                              isIn
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/20'
                                : 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/20'
                            }`}>
                              {isIn ? 'In' : 'Out'}
                            </span>
                          </div>

                          {/* Row 2: date stamp */}
                          <div className="flex items-center gap-1 mt-1">
                            <Clock className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-600 shrink-0" />
                            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
                              {fmtDate(tx.date ?? tx.createdAt)}
                            </span>
                          </div>

                          {/* Row 3: note */}
                          {tx.note && (
                            <p className="mt-2 text-[11px] text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl px-3.5 py-2 border border-zinc-200/50 dark:border-zinc-800/60 leading-relaxed italic">
                              &ldquo;{tx.note}&rdquo;
                            </p>
                          )}

                          {/* Row 4: user */}
                          {tx.createdBy?.name && (
                            <p className="mt-2 text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
                              Recorded by <span className="font-semibold text-zinc-500 dark:text-zinc-400">{tx.createdBy.name}</span>
                            </p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </Card>
        </div>

        {/* ── RIGHT: stock panel ── */}
        <div className="space-y-6">

          {/* Current stock */}
          <Card className="p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-[#0c0c14]">
              <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                Current stock
              </span>
            </div>
            <div className="px-5 py-6 flex flex-col items-center gap-1 bg-white dark:bg-[#0c0c14]">
              <p className="text-5xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
                {product.quantity.toLocaleString()}
              </p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 font-semibold uppercase tracking-wider mt-1">units on hand</p>
              <div className="mt-3">
                <Badge variant={statusVariant}>{statusLabel}</Badge>
              </div>

              {/* Stock value */}
              <div className="mt-6 w-full pt-4 border-t border-zinc-100 dark:border-zinc-800 grid grid-cols-2 gap-3 text-center bg-zinc-50/30 dark:bg-zinc-900/10 p-3 rounded-2xl border border-zinc-100/50 dark:border-zinc-800/50">
                <div>
                  <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Stock value</p>
                  <p className="text-sm font-extrabold text-emerald-650 dark:text-emerald-400 mt-1">
                    {fmtCurrency(product.quantity * product.unitPrice)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Unit price</p>
                  <p className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200 mt-1">
                    {fmtCurrency(product.unitPrice)}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Issue / Receive toggle */}
          <Card className="p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-[#0c0c14]">
              <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                Adjust stock
              </span>
              {!issueOpen && (
                <div className="flex gap-1.5">
                  <button
                    onClick={() => { setIssueType('in');  setIssueOpen(true); }}
                    className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 px-3 py-1.5 rounded-lg border border-transparent hover:border-emerald-100/50 dark:hover:border-emerald-900/30 transition-all cursor-pointer active:scale-95"
                  >
                    <TrendingUp className="w-3.5 h-3.5" /> Receive
                  </button>
                  <button
                    onClick={() => { setIssueType('out'); setIssueOpen(true); }}
                    className="flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 px-3 py-1.5 rounded-lg border border-transparent hover:border-rose-100/50 dark:hover:border-rose-900/30 transition-all cursor-pointer active:scale-95"
                  >
                    <TrendingDown className="w-3.5 h-3.5" /> Issue
                  </button>
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-[#0c0c14]">
              {issueOpen ? (
                <div className="px-5 py-4 space-y-4">
                  {/* Type toggle */}
                  <div className="flex rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-0.5">
                    {(['in', 'out'] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => setIssueType(t)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          issueType === t
                            ? t === 'in'
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-rose-600 text-white shadow-sm'
                            : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer'
                        }`}
                      >
                        {t === 'in' ? 'Stock Receipt' : 'Stock Issue'}
                      </button>
                    ))}
                  </div>

                  {/* Fields */}
                  <div>
                    <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1 block">Quantity *</label>
                    <input
                      type="number"
                      min={1}
                      value={issueQty}
                      onChange={e => setIssueQty(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 bg-zinc-50/50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all duration-200"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1 block">Date</label>
                    <input
                      type="date"
                      value={issueDate}
                      onChange={e => setIssueDate(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-50/50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all duration-200 text-zinc-700 dark:text-zinc-300"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1 block">Note (optional)</label>
                    <input
                      type="text"
                      value={issueNote}
                      onChange={e => setIssueNote(e.target.value)}
                      placeholder="e.g. Monthly restock, Sale order #123…"
                      className="w-full px-3 py-2 bg-zinc-50/50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all duration-200"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button
                      className="flex-1 h-9 text-xs font-bold"
                      isLoading={issuing}
                      onClick={handleIssue}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Confirm
                    </Button>
                    <Button
                      variant="outline"
                      className="h-9 px-3 text-xs"
                      onClick={() => { setIssueOpen(false); setIssueQty(''); setIssueNote(''); }}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="px-5 py-6 text-center text-xs text-zinc-400 dark:text-zinc-500">
                  Use <strong className="text-zinc-750 dark:text-zinc-300">Receive</strong> to add stock or{' '}
                  <strong className="text-zinc-750 dark:text-zinc-300">Issue</strong> to deduct it.
                </div>
              )}
            </div>
          </Card>

          {/* Quick stats from transactions */}
          {transactions.length > 0 && (
            <Card className="p-5">
              <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-3">
                All-time summary
              </p>
              <div className="space-y-2.5">
                <StatRow
                  icon={<ArrowDownCircle className="w-4 h-4 text-emerald-500" />}
                  label="Total received"
                  value={`${transactions.filter(t => t.type === 'in').reduce((s, t) => s + t.quantity, 0).toLocaleString()} units`}
                />
                <StatRow
                  icon={<ArrowUpCircle className="w-4 h-4 text-rose-500" />}
                  label="Total issued"
                  value={`${transactions.filter(t => t.type === 'out').reduce((s, t) => s + t.quantity, 0).toLocaleString()} units`}
                />
                <StatRow
                  icon={<Clock className="w-4 h-4 text-zinc-400" />}
                  label="Transactions"
                  value={transactions.length.toLocaleString()}
                />
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Small sub-components ──────────────────────────────────────────────────────
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-zinc-50/50 dark:bg-zinc-900/30 border border-zinc-100/60 dark:border-zinc-800/40 p-3 rounded-2xl">
      <dt className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
        {label}
      </dt>
      <dd className="text-xs text-zinc-800 dark:text-zinc-200 font-bold">{value}</dd>
    </div>
  );
}

function StatRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
        {icon}
        {label}
      </div>
      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{value}</span>
    </div>
  );
}
