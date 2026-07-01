'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  FileText,
  Search,
  X,
  AlertCircle,
  Package,
  Loader2,
  Gift,
  Calendar,
} from 'lucide-react';
import { toast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';

interface Product {
  _id: string;
  name: string;
  sku: string;
  quantity: number;
}

export default function NewFreeIssuePage() {
  const router = useRouter();

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  
  const [product, setProduct] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [maxQty, setMaxQty] = useState(0);

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch('/api/products?limit=1000');
        const data = await res.json();
        if (data.success) setProducts(data.data);
      } catch {
        toast('Failed to load products', 'error');
      } finally {
        setLoadingProducts(false);
      }
    };
    fetchProducts();
  }, []);

  const handleProductSelect = (selectedProduct: Product) => {
    setProduct(selectedProduct._id);
    setMaxQty(selectedProduct.quantity);
    setQuantity(1);
    setSearchModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) { toast('Please select a product', 'error'); return; }
    if (quantity <= 0) { toast('Quantity must be greater than zero', 'error'); return; }
    if (quantity > maxQty) { toast(`Insufficient stock. Max: ${maxQty}`, 'error'); return; }

    setSubmitting(true);
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product,
          type: 'free-issue',
          quantity,
          note,
          date,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast('Free issue recorded successfully!', 'success');
        router.push('/free-issues');
      } else {
        throw new Error(data.error || 'Failed to record free issue');
      }
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls =
    "w-full px-3 py-2.5 bg-zinc-50/50 hover:bg-zinc-50/70 focus:bg-white dark:bg-zinc-900/30 dark:hover:bg-zinc-900/60 dark:focus:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm transition-all focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 placeholder-zinc-400 dark:placeholder-zinc-500 text-zinc-800 dark:text-zinc-100 disabled:opacity-50";

  const selectedProductObj = products.find(p => p._id === product);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-28 lg:pb-12">
      {/* Header Card */}
      <div className="bg-white dark:bg-[#0c0c14] p-4 sm:p-5 rounded-2xl border border-zinc-150 dark:border-zinc-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.015),0_1px_2px_rgb(0,0,0,0.01)] flex justify-between items-center max-w-3xl mx-auto">
        <div className="flex items-center gap-3.5 min-w-0">
          <button
            type="button"
            onClick={() => router.push('/free-issues')}
            className="shrink-0 w-10 h-10 flex items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/60 transition-all active:scale-95 cursor-pointer text-zinc-600 dark:text-zinc-400"
          >
            <ArrowLeft className="w-4.5 h-4.5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight leading-none">
              New Free Issue
            </h1>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1.5 hidden sm:block">
              Record a stock out without charge.
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <form
        id="create-free-issue-form"
        onSubmit={handleSubmit}
        className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-4"
      >
        {/* Product details */}
        <section className="bg-white dark:bg-[#0c0c14] rounded-2xl border border-zinc-150 dark:border-zinc-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.015),0_1px_2px_rgb(0,0,0,0.01)] overflow-visible">
          <div className="px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-900 flex items-center gap-2">
            <Package className="w-4 h-4 text-indigo-500" />
            <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
              Product Information
            </span>
          </div>
          
          <div className="p-4 sm:p-5 space-y-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block">
                Select Product <span className="text-rose-500 normal-case font-normal">*required</span>
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setSearchModalOpen(true);
                    setModalSearchQuery("");
                  }}
                  className={`w-full text-left px-3.5 py-3 text-sm rounded-xl border focus:outline-none transition-all flex items-center justify-between ${
                    selectedProductObj
                      ? "bg-indigo-50/30 dark:bg-indigo-950/10 border-indigo-400 text-zinc-900 dark:text-zinc-100 font-bold"
                      : "bg-zinc-50/50 dark:bg-zinc-900/30 border-zinc-200 dark:border-zinc-800/80 hover:border-indigo-400 text-zinc-500"
                  }`}
                >
                  <span className="truncate pr-4 flex items-center gap-2">
                    <Search className="w-4 h-4 text-zinc-400 shrink-0" />
                    {selectedProductObj ? `${selectedProductObj.name} (${selectedProductObj.sku})` : "Click to search products..."}
                  </span>
                </button>
                {selectedProductObj && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setProduct(''); }}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-rose-500 p-1 rounded-lg cursor-pointer bg-white dark:bg-[#0c0c14] shadow-sm"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {selectedProductObj && quantity > maxQty && (
                <p className="flex items-center gap-1.5 text-xs text-rose-500 font-bold mt-2">
                  <AlertCircle className="w-4 h-4" /> Max available stock is {maxQty} units.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5 min-w-0">
                <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block">
                  Quantity
                </label>
                <div className="relative">
                  <Package className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                  <input
                    type="number"
                    min={1}
                    max={maxQty || undefined}
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                    className={`${inputCls} pl-10 pr-4`}
                    disabled={!product}
                  />
                </div>
              </div>

              <div className="space-y-1.5 min-w-0">
                <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block">
                  Date
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={`${inputCls} pl-10 pr-2 sm:pr-4`}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Note section */}
        <section className="bg-white dark:bg-[#0c0c14] rounded-2xl border border-zinc-150 dark:border-zinc-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.015),0_1px_2px_rgb(0,0,0,0.01)]">
          <div className="px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-500" />
            <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
              Reason / Note
            </span>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-550 italic font-semibold">(optional)</span>
          </div>
          <div className="p-4 sm:p-5">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Why is this given for free? (e.g. Sample given to client, promotion)"
              rows={3}
              className="w-full px-4 py-3 text-sm bg-zinc-50/50 hover:bg-zinc-50/70 focus:bg-white dark:bg-zinc-900/30 dark:hover:bg-zinc-900/60 dark:focus:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-850 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 resize-none transition-all text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500"
            />
          </div>
        </section>

        {/* Action Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting || !product}
            className="w-full flex items-center justify-center gap-2 py-3.5 text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 rounded-xl shadow-md hover:shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-60 disabled:hover:translate-y-0 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <Loader2 className="w-5 h-5 animate-spin shrink-0" />
            ) : (
              <Gift className="w-5 h-5 shrink-0" />
            )}
            {submitting ? "Recording..." : "Issue Free Product"}
          </button>
        </div>
      </form>

      {/* Product Search Modal */}
      <Modal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        title="Select Product"
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name or SKU..."
              value={modalSearchQuery}
              onChange={(e) => setModalSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 text-sm bg-zinc-50/50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all"
              autoFocus
            />
          </div>
          <div className="max-h-[300px] overflow-y-auto border border-zinc-100 dark:border-zinc-800/80 rounded-xl divide-y divide-zinc-100 dark:divide-zinc-800/60 bg-white dark:bg-[#0c0c14]">
            {loadingProducts ? (
              <div className="p-8 flex items-center justify-center gap-2 text-zinc-400">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading...
              </div>
            ) : (() => {
              const q = modalSearchQuery.toLowerCase();
              const filtered = products.filter(
                (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
              );
              if (filtered.length === 0) {
                return <div className="p-8 text-center text-zinc-400">No products found.</div>;
              }
              return filtered.map((p) => (
                <button
                  key={p._id}
                  type="button"
                  disabled={p.quantity <= 0}
                  onClick={() => handleProductSelect(p)}
                  className={`w-full p-3 flex items-center gap-3 text-left transition-colors cursor-pointer ${
                    p.quantity <= 0
                      ? "opacity-40 cursor-not-allowed"
                      : "hover:bg-zinc-50/70 dark:hover:bg-zinc-900/40"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-xs text-zinc-800 dark:text-zinc-100 truncate">
                      {p.name}
                    </p>
                    <p className="font-mono text-[9px] text-zinc-400 dark:text-zinc-500 truncate mt-0.5">
                      {p.sku}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[9px] text-zinc-400 dark:text-zinc-500 uppercase font-semibold">Stock</p>
                    <p className={`font-bold text-xs ${p.quantity === 0 ? "text-rose-500" : "text-emerald-600 dark:text-emerald-450"}`}>
                      {p.quantity} left
                    </p>
                  </div>
                </button>
              ));
            })()}
          </div>
          <button
            type="button"
            onClick={() => setSearchModalOpen(false)}
            className="w-full py-2.5 text-sm font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-all cursor-pointer text-center active:scale-[0.98]"
          >
            Cancel
          </button>
        </div>
      </Modal>
    </div>
  );
}
