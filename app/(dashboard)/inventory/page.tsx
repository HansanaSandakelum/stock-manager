'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Package, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';

// Low-stock threshold - change this one constant to retune all badges
const LOW_STOCK_THRESHOLD = 5;
const PAGE_SIZE = 10;
const COL_SPAN = 5;

function stockStatus(qty: number, threshold: number) {
  if (qty === 0) return { label: 'Out of stock', variant: 'danger' as const };
  if (qty <= threshold) return { label: 'Low stock', variant: 'warning' as const };
  return { label: 'In stock', variant: 'success' as const };
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
        {start}-{end} of {total} products
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

export default function InventoryPage() {
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // -- Fetch real products from the API --
  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products?limit=1000');
      const data = await res.json();
      if (data.success) setProducts(data.data);
    } catch {
      toast('Failed to load inventory', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchProducts(); 
    
    // Redirect deliver role
    const checkRole = async () => {
      const res = await fetch('/api/auth/session');
      const session = await res.json();
      if (session?.user?.role === 'deliver') {
        router.push('/products');
      }
    };
    checkRole();
  }, [router]);

  // -- Derived summary counts --
  const totalItems = products.length;
  const totalUnits = products.reduce((s: number, p: any) => s + (p.quantity ?? 0), 0);
  const lowStock   = products.filter((p: any) => p.quantity > 0 && p.quantity <= (p.lowStockThreshold ?? LOW_STOCK_THRESHOLD)).length;
  const outOfStock = products.filter((p: any) => p.quantity === 0).length;

  // -- Live search --
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p: any) =>
        p.name?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.category?.name?.toLowerCase().includes(q),
    );
  }, [products, search]);

  // Reset to page 1 when search query changes
  useEffect(() => {
    setPage(1);
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="space-y-6">

      {/* -- Compact header -- */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            Inventory
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            {totalItems.toLocaleString()} product{totalItems !== 1 ? 's' : ''} * {' '}
            {totalUnits.toLocaleString()} unit{totalUnits !== 1 ? 's' : ''} on hand
          </p>
        </div>
        <Button onClick={() => router.push('/products/new')}>
          <Plus className="w-4 h-4" />
          Add item
        </Button>
      </div>

      {/* -- Summary cards -- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total items card */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0c0c14] border border-zinc-100 dark:border-zinc-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.015),0_1px_2px_rgb(0,0,0,0.01)] hover:-translate-y-[1.5px] hover:shadow-[0_12px_36px_rgb(0,0,0,0.025),0_1px_3px_rgb(0,0,0,0.015)] transition-all duration-300">
          <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Total Items</p>
          <p className="text-2xl font-bold text-zinc-800 dark:text-zinc-200 mt-1.5 tracking-tight">{totalItems.toLocaleString()}</p>
        </div>
        {/* Units in stock */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0c0c14] border border-zinc-100 dark:border-zinc-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.015),0_1px_2px_rgb(0,0,0,0.01)] hover:-translate-y-[1.5px] hover:shadow-[0_12px_36px_rgb(0,0,0,0.025),0_1px_3px_rgb(0,0,0,0.015)] transition-all duration-300">
          <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Units In Stock</p>
          <p className="text-2xl font-bold text-zinc-800 dark:text-zinc-200 mt-1.5 tracking-tight">{totalUnits.toLocaleString()}</p>
        </div>
        {/* Low Stock */}
        <div className="p-4 rounded-2xl bg-amber-50/10 dark:bg-amber-950/5 border border-amber-100/50 dark:border-amber-900/10 shadow-[0_8px_30px_rgb(0,0,0,0.015),0_1px_2px_rgb(0,0,0,0.01)] hover:-translate-y-[1.5px] hover:shadow-[0_12px_36px_rgb(0,0,0,0.025),0_1px_3px_rgb(0,0,0,0.015)] transition-all duration-300">
          <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Low Stock</p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1.5 tracking-tight">{lowStock.toLocaleString()}</p>
        </div>
        {/* Out of Stock */}
        <div className="p-4 rounded-2xl bg-rose-50/10 dark:bg-rose-950/5 border border-rose-100/50 dark:border-rose-900/10 shadow-[0_8px_30px_rgb(0,0,0,0.015),0_1px_2px_rgb(0,0,0,0.01)] hover:-translate-y-[1.5px] hover:shadow-[0_12px_36px_rgb(0,0,0,0.025),0_1px_3px_rgb(0,0,0,0.015)] transition-all duration-300">
          <p className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Out Of Stock</p>
          <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1.5 tracking-tight">{outOfStock.toLocaleString()}</p>
        </div>
      </div>

      {/* -- Search -- */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search by name, SKU, or category..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          aria-label="Search inventory"
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#0c0c14] border border-zinc-200 dark:border-zinc-800/80 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all duration-200"
        />
      </div>

      {/* -- Inventory table -- */}
      <Card className="p-0 overflow-hidden border border-zinc-100 dark:border-zinc-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.015),0_1px_2px_rgb(0,0,0,0.01)] bg-white dark:bg-[#0c0c14]">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-zinc-50/50 dark:bg-zinc-900/40 border-b border-zinc-100 dark:border-zinc-800/80 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              <tr>
                <th className="px-6 py-4.5 font-semibold">Product / SKU</th>
                <th className="px-6 py-4.5 font-semibold hidden sm:table-cell">Category</th>
                <th className="px-6 py-4.5 font-semibold text-right">Qty</th>
                <th className="px-6 py-4.5 font-semibold text-right hidden md:table-cell">Price</th>
                <th className="px-6 py-4.5 font-semibold text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={COL_SPAN} className="px-6 py-4">
                      <Skeleton className="h-6 w-full rounded-lg" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={COL_SPAN} className="px-6 py-12 text-center text-zinc-400 dark:text-zinc-500">
                    {search
                      ? <><Package className="w-6 h-6 mx-auto mb-1.5 opacity-40" />{`No items match "${search}".`}</>
                      : <><Package className="w-6 h-6 mx-auto mb-1.5 opacity-40" />No products found.</>
                    }
                  </td>
                </tr>
              ) : (
                paginated.map((product: any) => {
                  const threshold = product.lowStockThreshold ?? LOW_STOCK_THRESHOLD;
                  const { label, variant } = stockStatus(product.quantity, threshold);
                  return (
                    <tr
                      key={product._id}
                      onClick={() => router.push(`/inventory/${product._id}`)}
                      className="hover:bg-zinc-50/30 dark:hover:bg-zinc-900/10 transition-colors cursor-pointer group"
                    >
                      {/* Product + SKU */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {product.image ? (
                            <img src={product.image} alt={product.name} className="w-8 h-8 rounded-lg object-cover bg-zinc-100 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center border border-zinc-100 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500">
                              <Package className="w-4 h-4" />
                            </div>
                          )}
                          <div>
                            <span className="font-semibold text-zinc-800 dark:text-zinc-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors block truncate max-w-[200px]">
                              {product.name}
                            </span>
                            <span className="font-mono text-zinc-400 dark:text-zinc-500 text-[10px]">
                              {product.sku}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400 hidden sm:table-cell">
                        {product.category?.name ?? '-'}
                      </td>

                      {/* Quantity */}
                      <td className="px-6 py-4 text-right font-bold text-zinc-800 dark:text-zinc-200">
                        {product.quantity.toLocaleString()}
                      </td>

                      {/* Price */}
                      <td className="px-6 py-4 text-right text-zinc-700 dark:text-zinc-300 font-medium hidden md:table-cell">
                        Rs.&nbsp;{product.unitPrice?.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 text-center">
                        <Badge variant={variant}>{label}</Badge>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer Controls */}
        {!loading && (
          <Pagination
            page={safePage}
            totalPages={totalPages}
            total={filtered.length}
            pageSize={PAGE_SIZE}
            onChange={setPage}
          />
        )}

        {/* Table footer hint */}
        {!loading && filtered.length > 0 && (
          <div className="px-6 py-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium tracking-wide">
              Click any row to view details, adjust stock, and see product moving history. Safety low-stock threshold uses each product settings.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
