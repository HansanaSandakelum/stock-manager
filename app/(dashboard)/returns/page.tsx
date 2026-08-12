'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';
import { 
  Undo2, 
  Plus, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  Trash2, 
  Package, 
  Search, 
  Boxes, 
  DollarSign, 
  FileText,
  Filter
} from 'lucide-react';
import { Select } from '@/components/ui/Select';

const PAGE_SIZE = 10;
const formatCurrency = (val: number) => `Rs. ${val.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
        {start}-{end} of {total} items
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
  const [activeTab, setActiveTab] = useState<'logs' | 'products'>('logs');
  const [returns, setReturns] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Logs tab pagination & filters
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');

  // Products tab pagination & filters
  const [productPage, setProductPage] = useState(1);
  const [productSearch, setProductSearch] = useState('');
  const [showOnlyReturned, setShowOnlyReturned] = useState(true);

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

  useEffect(() => {
    setProductPage(1);
  }, [productSearch, showOnlyReturned]);

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
      setProductsLoading(true);
      const res = await fetch('/api/products?limit=1000');
      const data = await res.json();
      if (data.success) {
        setProducts(data.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setProductsLoading(false);
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
      fetchProducts();
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
      fetchProducts();
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

  // Returned Products Calculations
  const productsWithReturnedStock = useMemo(() => {
    return products.filter((p) => (p.returnedQuantity || 0) > 0);
  }, [products]);

  const filteredProducts = useMemo(() => {
    let list = showOnlyReturned ? productsWithReturnedStock : products;
    if (productSearch.trim()) {
      const q = productSearch.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.category?.name && p.category.name.toLowerCase().includes(q))
      );
    }
    return list;
  }, [products, productsWithReturnedStock, showOnlyReturned, productSearch]);

  const totalReturnedUnits = useMemo(() => {
    return products.reduce((acc, p) => acc + (p.returnedQuantity || 0), 0);
  }, [products]);

  const totalReturnedValue = useMemo(() => {
    return products.reduce(
      (acc, p) => acc + (p.returnedQuantity || 0) * (p.unitPrice || 0),
      0
    );
  }, [products]);

  // Logs Tab Pagination
  const totalPages = Math.max(1, Math.ceil(returns.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedReturns = returns.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Products Tab Pagination
  const totalProductPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const safeProductPage = Math.min(productPage, totalProductPages);
  const paginatedProducts = filteredProducts.slice((safeProductPage - 1) * PAGE_SIZE, safeProductPage * PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Returns Management</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Track return activity logs and inventory returned stock</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4" /> Log Return
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'logs'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Return Logs</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            activeTab === 'logs' ? 'bg-white/20 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
          }`}>
            {returns.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'products'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Products with Returns</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            activeTab === 'products' ? 'bg-white/20 text-white' : 'bg-orange-500/20 text-orange-600 dark:text-orange-400'
          }`}>
            {productsWithReturnedStock.length}
          </span>
        </button>
      </div>

      {/* Tab 1: Return Logs */}
      {activeTab === 'logs' && (
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
                    {paginatedReturns.map((r) => (
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
      )}

      {/* Tab 2: Products with Returns */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4 bg-gradient-to-br from-orange-50/50 to-amber-50/30 dark:from-orange-950/10 dark:to-amber-950/5 border-orange-100 dark:border-orange-900/30">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-orange-100 dark:bg-orange-900/40 rounded-xl text-orange-600 dark:text-orange-400">
                  <Undo2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Total Returned Stock</p>
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{totalReturnedUnits.toLocaleString()} units</h3>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-br from-emerald-50/50 to-teal-50/30 dark:from-emerald-950/10 dark:to-teal-950/5 border-emerald-100 dark:border-emerald-900/30">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl text-emerald-600 dark:text-emerald-400">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Total Returned Value</p>
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{formatCurrency(totalReturnedValue)}</h3>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-br from-indigo-50/50 to-violet-50/30 dark:from-indigo-950/10 dark:to-violet-950/5 border-indigo-100 dark:border-indigo-900/30">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl text-indigo-600 dark:text-indigo-400">
                  <Boxes className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Products with Returns</p>
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{productsWithReturnedStock.length} items</h3>
                </div>
              </div>
            </Card>
          </div>

          {/* Products Table Card */}
          <Card className="p-0 overflow-hidden border border-zinc-100 dark:border-zinc-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.015),0_1px_2px_rgb(0,0,0,0.01)] bg-white dark:bg-[#0c0c14]">
            {/* Filter and Search Bar */}
            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-zinc-50/10 dark:bg-zinc-900/10">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search product by name, SKU or category..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:border-indigo-500 text-zinc-800 dark:text-zinc-200"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowOnlyReturned(!showOnlyReturned)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-2 border transition-all cursor-pointer ${
                    showOnlyReturned
                      ? 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800/50 text-orange-700 dark:text-orange-400'
                      : 'bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>{showOnlyReturned ? 'Returned Stock Only' : 'All Products'}</span>
                </button>
              </div>
            </div>

            {productsLoading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
              </div>
            ) : filteredProducts.length === 0 ? (
              <EmptyState 
                icon={Package}
                title="No returned products found"
                description={
                  showOnlyReturned
                    ? "There are currently no products with returned stock in inventory."
                    : "No products matched your search criteria."
                }
              />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-zinc-50/50 dark:bg-zinc-900/40 border-b border-zinc-100 dark:border-zinc-800/80 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-400">
                      <tr>
                        <th className="px-3 sm:px-6 py-3 sm:py-4.5 font-semibold">Product</th>
                        <th className="px-3 sm:px-6 py-3 sm:py-4.5 font-semibold hidden md:table-cell">Category</th>
                        <th className="px-3 sm:px-6 py-3 sm:py-4.5 font-semibold text-right">Unit Price</th>
                        <th className="px-3 sm:px-6 py-3 sm:py-4.5 font-semibold text-right">Main Stock</th>
                        <th className="px-3 sm:px-6 py-3 sm:py-4.5 font-semibold text-right">Returned Stock</th>
                        <th className="px-3 sm:px-6 py-3 sm:py-4.5 font-semibold text-right">Returned Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                      {paginatedProducts.map((p) => {
                        const returnedQty = p.returnedQuantity || 0;
                        const returnedValue = returnedQty * (p.unitPrice || 0);

                        return (
                          <tr key={p._id} className="hover:bg-zinc-50/30 dark:hover:bg-zinc-900/10 transition-colors">
                            <td className="px-3 sm:px-6 py-3 sm:py-4 font-semibold text-zinc-800 dark:text-zinc-200">
                              <div className="flex items-center gap-3">
                                {p.image ? (
                                  <img src={p.image} alt={p.name} className="w-8 h-8 rounded-lg object-cover bg-zinc-100 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800" />
                                ) : (
                                  <div className="w-8 h-8 rounded-lg bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center border border-zinc-100 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500">
                                    <Package className="w-4 h-4" />
                                  </div>
                                )}
                                <div className="flex flex-col">
                                  <span className="truncate max-w-[150px] sm:max-w-none">{p.name}</span>
                                  <span className="font-mono text-[9px] sm:text-[10px] text-zinc-400 dark:text-zinc-500">{p.sku}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 sm:px-6 py-3 sm:py-4 text-zinc-500 dark:text-zinc-400 hidden md:table-cell">
                              {p.category?.name || '-'}
                            </td>
                            <td className="px-3 sm:px-6 py-3 sm:py-4 text-right text-zinc-600 dark:text-zinc-400 tabular-nums">
                              {formatCurrency(p.unitPrice)}
                            </td>
                            <td className="px-3 sm:px-6 py-3 sm:py-4 text-right font-medium text-zinc-700 dark:text-zinc-300 tabular-nums">
                              {p.quantity}
                            </td>
                            <td className="px-3 sm:px-6 py-3 sm:py-4 text-right">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                returnedQty > 0
                                  ? 'bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800/40'
                                  : 'text-zinc-400 dark:text-zinc-600'
                              }`}>
                                {returnedQty}
                              </span>
                            </td>
                            <td className="px-3 sm:px-6 py-3 sm:py-4 text-right font-extrabold text-orange-600 dark:text-orange-400 tabular-nums">
                              {formatCurrency(returnedValue)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <Pagination
                  page={safeProductPage}
                  totalPages={totalProductPages}
                  total={filteredProducts.length}
                  pageSize={PAGE_SIZE}
                  onChange={setProductPage}
                />
              </>
            )}
          </Card>
        </div>
      )}

      {/* Modal for Logging Returns */}
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
