'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';
import { Package, Plus, Edit2, Trash2, Search, ArrowUpDown } from 'lucide-react';
import { Select } from '@/components/ui/Select';

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('name');
  const [order, setOrder] = useState('asc');

  useEffect(() => {
    fetchProducts();
  }, [search, sort, order]);

  const fetchProducts = async () => {
    try {
      const res = await fetch(`/api/products?search=${search}&sort=${sort}&order=${order}`);
      const data = await res.json();
      if (data.success) {
        setProducts(data.data);
      }
    } catch (error) {
      toast('Failed to load products', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure? This will also delete all related transactions.')) return;

    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast('Product deleted', 'success');
        fetchProducts();
      } else {
        toast('Failed to delete product', 'error');
      }
    } catch (error) {
      toast('Error deleting product', 'error');
    }
  };

  const formatCurrency = (val: number) => `Rs. ${val.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Products</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Manage your entire inventory</p>
        </div>
        <Link href="/products/new">
          <Button><Plus className="w-4 h-4" /> Add Product</Button>
        </Link>
      </div>

      <Card className="p-0 overflow-hidden border border-zinc-100 dark:border-zinc-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.015),0_1px_2px_rgb(0,0,0,0.01)]">
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800/60 flex flex-wrap items-center gap-3.5 bg-white dark:bg-[#0c0c14]">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Search by name or SKU..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-zinc-50/30 hover:bg-zinc-50/70 focus:bg-white dark:bg-zinc-900/30 dark:hover:bg-zinc-900/60 dark:focus:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all duration-200"
            />
          </div>
          <Select 
            value={sort} 
            onChange={setSort}
            options={[
              { value: 'name', label: 'Sort by Name' },
              { value: 'quantity', label: 'Sort by Quantity' },
              { value: 'unitPrice', label: 'Sort by Price' }
            ]}
            className="w-44"
          />
          <button 
            onClick={() => setOrder(order === 'asc' ? 'desc' : 'asc')}
            className="p-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all duration-200 cursor-pointer active:scale-95"
          >
            <ArrowUpDown className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : products.length === 0 ? (
          <EmptyState 
            icon={Package}
            title="No products found"
            description="Add a new product or adjust your search filters."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-zinc-50/50 dark:bg-zinc-900/40 border-b border-zinc-100 dark:border-zinc-800/80 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-505">
                <tr>
                  <th className="px-3 sm:px-6 py-3 sm:py-4.5 font-semibold">Product</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4.5 font-semibold hidden sm:table-cell">SKU</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4.5 font-semibold hidden md:table-cell">Category</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4.5 font-semibold text-right hidden sm:table-cell">Price</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4.5 font-semibold text-right">Quantity</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4.5 font-semibold text-center hidden md:table-cell">Status</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {products.map((product) => (
                  <tr key={product._id} className="hover:bg-zinc-50/30 dark:hover:bg-zinc-900/10 transition-colors">
                    <td className="px-3 sm:px-6 py-3 sm:py-4 font-semibold text-zinc-800 dark:text-zinc-155 flex items-center gap-3">
                      {product.image ? (
                        <img src={product.image} alt={product.name} className="w-8 h-8 rounded-lg object-cover bg-zinc-100 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center border border-zinc-100 dark:border-zinc-800 text-zinc-400 dark:text-zinc-505">
                          <Package className="w-4 h-4" />
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span className="truncate max-w-[140px] sm:max-w-none">{product.name}</span>
                        <span className="font-mono text-[10px] text-zinc-400 dark:text-zinc-505 sm:hidden mt-0.5">{product.sku}</span>
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-zinc-400 dark:text-zinc-550 hidden sm:table-cell">{product.sku}</td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-zinc-550 dark:text-zinc-400 hidden md:table-cell">{product.category?.name || '-'}</td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-right text-zinc-750 dark:text-zinc-300 font-medium hidden sm:table-cell">{formatCurrency(product.unitPrice)}</td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-right font-bold text-zinc-850 dark:text-zinc-200">{product.quantity}</td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-center hidden md:table-cell">
                      {product.quantity === 0 ? (
                        <Badge variant="danger">Out of Stock</Badge>
                      ) : product.quantity <= product.lowStockThreshold ? (
                        <Badge variant="warning">Low Stock</Badge>
                      ) : (
                        <Badge variant="success">In Stock</Badge>
                      )}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-right space-x-1.5 whitespace-nowrap">
                      <Link href={`/products/${product._id}/edit`}>
                        <button className="p-2 text-zinc-450 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 inline-flex active:scale-95">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </Link>
                      <button 
                        onClick={() => handleDelete(product._id)}
                        className="p-2 text-zinc-450 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-red-50/50 dark:hover:bg-red-950/20 inline-flex active:scale-95"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
