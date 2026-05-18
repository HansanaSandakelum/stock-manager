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

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

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

      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-4 bg-white dark:bg-zinc-900">
          <div className="relative flex-1 max-w-md">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Search by name or SKU..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
            />
          </div>
          <select 
            value={sort} 
            onChange={(e) => setSort(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
          >
            <option value="name">Sort by Name</option>
            <option value="quantity">Sort by Quantity</option>
            <option value="unitPrice">Sort by Price</option>
          </select>
          <button 
            onClick={() => setOrder(order === 'asc' ? 'desc' : 'asc')}
            className="p-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
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
            <table className="w-full text-sm text-left">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400">
                <tr>
                  <th className="px-6 py-4 font-medium">Product</th>
                  <th className="px-6 py-4 font-medium">SKU</th>
                  <th className="px-6 py-4 font-medium">Category</th>
                  <th className="px-6 py-4 font-medium text-right">Price</th>
                  <th className="px-6 py-4 font-medium text-right">Quantity</th>
                  <th className="px-6 py-4 font-medium text-center">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {products.map((product) => (
                  <tr key={product._id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
                      {product.image && (
                        <img src={product.image} alt={product.name} className="w-8 h-8 rounded-md object-cover bg-zinc-100 dark:bg-zinc-800" />
                      )}
                      {product.name}
                    </td>
                    <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400">{product.sku}</td>
                    <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400">{product.category?.name || '-'}</td>
                    <td className="px-6 py-4 text-right text-zinc-900 dark:text-zinc-100">{formatCurrency(product.unitPrice)}</td>
                    <td className="px-6 py-4 text-right font-medium text-zinc-900 dark:text-zinc-100">{product.quantity}</td>
                    <td className="px-6 py-4 text-center">
                      {product.quantity === 0 ? (
                        <Badge variant="danger">Out of Stock</Badge>
                      ) : product.quantity <= product.lowStockThreshold ? (
                        <Badge variant="warning">Low Stock</Badge>
                      ) : (
                        <Badge variant="success">In Stock</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <Link href={`/products/${product._id}/edit`}>
                        <button className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 inline-flex">
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </Link>
                      <button 
                        onClick={() => handleDelete(product._id)}
                        className="p-1.5 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 inline-flex"
                      >
                        <Trash2 className="w-4 h-4" />
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
