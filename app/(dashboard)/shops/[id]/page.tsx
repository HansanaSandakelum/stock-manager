'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Store,
  ArrowLeft,
  Package,
  Coins,
  Plus,
  RefreshCw,
  MapPin,
  Phone,
  User,
  Hash,
  ArrowRightLeft,
  Search,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';
import { ShopStockTable } from '@/components/shops/ShopStockTable';
import { IssueStockModal } from '@/components/shops/IssueStockModal';

interface Shop {
  _id: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  contactPerson?: string;
  isActive: boolean;
  totalProducts: number;
  totalQuantity: number;
  totalValue: number;
}

interface ShopStockItem {
  _id: string;
  quantity: number;
  lastUpdated: string;
  product: {
    _id: string;
    name: string;
    sku: string;
    unitPrice: number;
    quantity: number;
    image?: string;
  };
}

interface Transaction {
  _id: string;
  type: string;
  quantity: number;
  note?: string;
  invoiceNumber?: string;
  date: string;
  product: { name: string; sku: string };
  createdBy?: { name: string };
}

export default function ShopDetailPage() {
  const params = useParams();
  const router = useRouter();
  const shopId = params.id as string;

  const [shop, setShop] = useState<Shop | null>(null);
  const [stockItems, setStockItems] = useState<ShopStockItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'stock' | 'transactions'>('stock');
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [stockSearch, setStockSearch] = useState('');

  const fetchShop = useCallback(async () => {
    try {
      const res = await fetch(`/api/shops/${shopId}`);
      const data = await res.json();
      if (data.success) setShop(data.data);
      else throw new Error(data.error);
    } catch {
      toast('Failed to load shop', 'error');
    }
  }, [shopId]);

  const fetchStock = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (stockSearch) params.set('search', stockSearch);
      const res = await fetch(`/api/shops/${shopId}/stock?${params}`);
      const data = await res.json();
      if (data.success) setStockItems(data.data);
    } catch {
      toast('Failed to load shop stock', 'error');
    }
  }, [shopId, stockSearch]);

  const fetchTransactions = useCallback(async () => {
    try {
      const res = await fetch(`/api/transactions?shop=${shopId}&limit=50`);
      const data = await res.json();
      if (data.success) setTransactions(data.data);
    } catch {
      // Silently fail for transactions — not critical
    }
  }, [shopId]);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchShop(), fetchStock(), fetchTransactions()]);
      setLoading(false);
    };
    loadAll();
  }, [fetchShop, fetchStock, fetchTransactions]);

  const handleRefresh = async () => {
    await Promise.all([fetchShop(), fetchStock(), fetchTransactions()]);
  };

  const formatCurrency = (value: number) =>
    `Rs. ${value.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <Skeleton className="h-10 w-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-[400px] rounded-xl" />
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-text-tertiary dark:text-dark-text-tertiary mb-4">Shop not found</p>
        <Button variant="secondary" onClick={() => router.push('/shops')}>
          <ArrowLeft className="w-4 h-4" /> Back to Shops
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Back button */}
      <button
        onClick={() => router.push('/shops')}
        className="flex items-center gap-1.5 text-xs font-medium text-text-tertiary dark:text-dark-text-tertiary hover:text-text dark:hover:text-dark-text transition-colors group"
      >
        <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
        Back to Shops
      </button>

      {/* Shop Header */}
      <Card>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center font-bold text-xl shrink-0 ring-1 ring-primary-200/50 dark:ring-primary-700/20">
              {shop.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-text dark:text-dark-text">{shop.name}</h2>
                <Badge variant={shop.isActive ? 'success' : 'danger'} size="sm">
                  {shop.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-text-tertiary dark:text-dark-text-tertiary">
                <span className="inline-flex items-center gap-1">
                  <Hash className="w-3 h-3" /> {shop.code}
                </span>
                {shop.address && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {shop.address}
                  </span>
                )}
                {shop.phone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {shop.phone}
                  </span>
                )}
                {shop.contactPerson && (
                  <span className="inline-flex items-center gap-1">
                    <User className="w-3 h-3" /> {shop.contactPerson}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={handleRefresh}>
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </Button>
            {shop.isActive && (
              <Button size="sm" onClick={() => setIssueModalOpen(true)}>
                <Plus className="w-3.5 h-3.5" />
                Issue Stock
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="flex flex-col hover:-translate-y-[2px] transition-all duration-300">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400 ring-1 ring-primary-200/50 dark:ring-primary-700/20 flex items-center justify-center">
              <Package className="w-4.5 h-4.5" />
            </div>
          </div>
          <p className="text-xs font-medium text-text-tertiary dark:text-dark-text-tertiary mb-0.5">Products</p>
          <p className="text-xl font-bold text-text dark:text-dark-text tracking-tight">{shop.totalProducts}</p>
        </Card>
        <Card className="flex flex-col hover:-translate-y-[2px] transition-all duration-300">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-warning-400 ring-1 ring-warning-200/50 dark:ring-warning-700/20 flex items-center justify-center">
              <Store className="w-4.5 h-4.5" />
            </div>
          </div>
          <p className="text-xs font-medium text-text-tertiary dark:text-dark-text-tertiary mb-0.5">Total Quantity</p>
          <p className="text-xl font-bold text-text dark:text-dark-text tracking-tight">{shop.totalQuantity}</p>
        </Card>
        <Card className="flex flex-col hover:-translate-y-[2px] transition-all duration-300">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400 ring-1 ring-success-200/50 dark:ring-success-700/20 flex items-center justify-center">
              <Coins className="w-4.5 h-4.5" />
            </div>
          </div>
          <p className="text-xs font-medium text-text-tertiary dark:text-dark-text-tertiary mb-0.5">Stock Value</p>
          <p className="text-xl font-bold text-text dark:text-dark-text tracking-tight">{formatCurrency(shop.totalValue)}</p>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-surface-alt dark:bg-dark-surface-alt p-1 rounded-xl w-fit border border-border dark:border-dark-border">
        <button
          onClick={() => setActiveTab('stock')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'stock'
              ? 'bg-white dark:bg-dark-surface text-text dark:text-dark-text shadow-sm'
              : 'text-text-tertiary dark:text-dark-text-tertiary hover:text-text dark:hover:text-dark-text'
          }`}
        >
          <Package className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
          Stock ({stockItems.length})
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'transactions'
              ? 'bg-white dark:bg-dark-surface text-text dark:text-dark-text shadow-sm'
              : 'text-text-tertiary dark:text-dark-text-tertiary hover:text-text dark:hover:text-dark-text'
          }`}
        >
          <ArrowRightLeft className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
          Transactions ({transactions.length})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'stock' && (
        <Card className="!p-0 overflow-hidden">
          <div className="p-4 border-b border-border dark:border-dark-border">
            <div className="relative max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary dark:text-dark-text-tertiary" />
              <input
                type="text"
                placeholder="Search products at this shop..."
                value={stockSearch}
                onChange={(e) => setStockSearch(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 bg-surface-alt dark:bg-dark-surface-alt border border-border dark:border-dark-border rounded-xl text-sm text-text dark:text-dark-text placeholder:text-text-tertiary dark:placeholder:text-dark-text-tertiary transition-all outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10"
              />
            </div>
          </div>
          <ShopStockTable
            items={stockItems}
            shopId={shopId}
            shopName={shop.name}
            onStockChanged={handleRefresh}
          />
        </Card>
      )}

      {activeTab === 'transactions' && (
        <Card className="!p-0 overflow-hidden">
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 bg-surface-alt dark:bg-dark-surface-alt rounded-2xl flex items-center justify-center mb-4 ring-1 ring-border dark:ring-dark-border">
                <ArrowRightLeft className="w-6 h-6 text-text-tertiary dark:text-dark-text-tertiary" />
              </div>
              <p className="text-sm font-medium text-text dark:text-dark-text mb-1">No transactions yet</p>
              <p className="text-xs text-text-tertiary dark:text-dark-text-tertiary">Issue stock to this shop to see transactions</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border dark:border-dark-border bg-surface-alt/50 dark:bg-dark-surface-alt/50">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-text-tertiary dark:text-dark-text-tertiary uppercase tracking-wider">Type</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-text-tertiary dark:text-dark-text-tertiary uppercase tracking-wider">Product</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-text-tertiary dark:text-dark-text-tertiary uppercase tracking-wider">Qty</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-text-tertiary dark:text-dark-text-tertiary uppercase tracking-wider hidden md:table-cell">Note</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-text-tertiary dark:text-dark-text-tertiary uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50 dark:divide-dark-border/50">
                  {transactions.map((tx) => (
                    <tr key={tx._id} className="hover:bg-surface-hover/50 dark:hover:bg-dark-surface-hover/50 transition-colors">
                      <td className="py-3 px-4">
                        <Badge
                          variant={tx.type === 'shop-issue' ? 'success' : tx.type === 'shop-return' ? 'warning' : 'default'}
                          size="sm"
                        >
                          {tx.type === 'shop-issue' ? 'Issued' : tx.type === 'shop-return' ? 'Returned' : tx.type}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-text dark:text-dark-text text-sm">{tx.product?.name}</p>
                        <p className="text-[10px] text-text-tertiary dark:text-dark-text-tertiary">{tx.product?.sku}</p>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`text-sm font-semibold ${
                          tx.type === 'shop-issue' ? 'text-success-600 dark:text-success-400' : 'text-warning-600 dark:text-warning-400'
                        }`}>
                          {tx.type === 'shop-issue' ? '+' : '-'}{tx.quantity}
                        </span>
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell">
                        <div className="space-y-0.5">
                          {tx.invoiceNumber && (
                            <span className="inline-block text-[10px] font-medium font-mono px-1.5 py-0.5 rounded bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-300 border border-primary-200/50 dark:border-primary-700/20">
                              Inv: {tx.invoiceNumber}
                            </span>
                          )}
                          <p className="text-xs text-text-tertiary dark:text-dark-text-tertiary truncate max-w-[200px]">{tx.note || '—'}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <p className="text-xs text-text-secondary dark:text-dark-text-secondary">
                          {new Date(tx.date).toLocaleDateString('en-LK', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                        <p className="text-[10px] text-text-tertiary dark:text-dark-text-tertiary">
                          {new Date(tx.date).toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Issue Stock Modal */}
      <IssueStockModal
        isOpen={issueModalOpen}
        onClose={() => setIssueModalOpen(false)}
        onIssued={handleRefresh}
        shopId={shopId}
        shopName={shop.name}
      />
    </div>
  );
}
