'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Store,
  Search,
  Plus,
  Edit3,
  Power,
  PowerOff,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Phone,
  User,
  Package,
  Coins,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { toast } from '@/components/ui/Toast';
import { ShopFormModal } from '@/components/shops/ShopFormModal';

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
  createdAt: string;
}

const PAGE_SIZE = 10;

export default function ShopsPage() {
  const router = useRouter();
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Modal state
  const [formModal, setFormModal] = useState<{ open: boolean; shop: Shop | null }>({
    open: false,
    shop: null,
  });

  const fetchShops = useCallback(
    async (silent = false) => {
      silent ? setRefreshing(true) : setLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: PAGE_SIZE.toString(),
          showInactive: showInactive.toString(),
        });
        if (search) params.set('search', search);

        const res = await fetch(`/api/shops?${params}`);
        const data = await res.json();
        if (data.success) {
          setShops(data.data);
          setTotalPages(data.pagination.pages);
          setTotal(data.pagination.total);
        }
      } catch {
        toast('Failed to load shops', 'error');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, search, showInactive]
  );

  useEffect(() => {
    fetchShops();
  }, [fetchShops]);

  useEffect(() => {
    setPage(1);
  }, [search, showInactive]);

  const handleToggleActive = async (shop: Shop) => {
    try {
      const res = await fetch(`/api/shops/${shop._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !shop.isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast(`${shop.name} ${shop.isActive ? 'deactivated' : 'activated'}`, 'success');
      fetchShops(true);
    } catch (error: any) {
      toast(error.message || 'Failed to update shop', 'error');
    }
  };

  const formatCurrency = (value: number) =>
    `Rs. ${value.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Stats
  const activeShops = shops.filter((s) => s.isActive).length;
  const totalStockValue = shops.reduce((sum, s) => sum + (s.totalValue || 0), 0);
  const totalProductsHeld = shops.reduce((sum, s) => sum + (s.totalProducts || 0), 0);

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-[500px] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="flex flex-col hover:-translate-y-[2px] transition-all duration-300">
          <div className="flex items-start justify-between mb-4">
            <div className="w-11 h-11 rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400 ring-1 ring-primary-200/50 dark:ring-primary-700/20 flex items-center justify-center">
              <Store className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs font-medium text-text-tertiary dark:text-dark-text-tertiary mb-1">Total Shops</p>
          <p className="text-2xl font-bold text-text dark:text-dark-text tracking-tight">{total}</p>
        </Card>
        <Card className="flex flex-col hover:-translate-y-[2px] transition-all duration-300">
          <div className="flex items-start justify-between mb-4">
            <div className="w-11 h-11 rounded-xl bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400 ring-1 ring-success-200/50 dark:ring-success-700/20 flex items-center justify-center">
              <Power className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs font-medium text-text-tertiary dark:text-dark-text-tertiary mb-1">Active Shops</p>
          <p className="text-2xl font-bold text-text dark:text-dark-text tracking-tight">{activeShops}</p>
        </Card>
        <Card className="flex flex-col hover:-translate-y-[2px] transition-all duration-300">
          <div className="flex items-start justify-between mb-4">
            <div className="w-11 h-11 rounded-xl bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-warning-400 ring-1 ring-warning-200/50 dark:ring-warning-700/20 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs font-medium text-text-tertiary dark:text-dark-text-tertiary mb-1">Products at Shops</p>
          <p className="text-2xl font-bold text-text dark:text-dark-text tracking-tight">{totalProductsHeld}</p>
        </Card>
        <Card className="flex flex-col hover:-translate-y-[2px] transition-all duration-300">
          <div className="flex items-start justify-between mb-4">
            <div className="w-11 h-11 rounded-xl bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400 ring-1 ring-success-200/50 dark:ring-success-700/20 flex items-center justify-center">
              <Coins className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs font-medium text-text-tertiary dark:text-dark-text-tertiary mb-1">Total Shop Stock Value</p>
          <p className="text-2xl font-bold text-text dark:text-dark-text tracking-tight">{formatCurrency(totalStockValue)}</p>
        </Card>
      </div>

      {/* Toolbar */}
      <Card className="!p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
          <div className="flex items-center gap-3 flex-1 w-full sm:w-auto">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary dark:text-dark-text-tertiary" />
              <input
                type="text"
                placeholder="Search shops..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 bg-surface-alt dark:bg-dark-surface-alt border border-border dark:border-dark-border rounded-xl text-sm text-text dark:text-dark-text placeholder:text-text-tertiary dark:placeholder:text-dark-text-tertiary transition-all outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10"
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-text-secondary dark:text-dark-text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded border-border dark:border-dark-border text-primary-600 focus:ring-primary-500"
              />
              Show inactive
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fetchShops(true)}
              disabled={refreshing}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={() => setFormModal({ open: true, shop: null })}>
              <Plus className="w-3.5 h-3.5" />
              Add Shop
            </Button>
          </div>
        </div>
      </Card>

      {/* Shops Table */}
      <Card className="!p-0 overflow-hidden">
        {shops.length === 0 ? (
          <EmptyState
            icon={Store}
            title="No shops found"
            description={search ? 'No shops match your search criteria' : 'Create your first shop to start managing shop-level stock'}
            actionLabel={!search ? 'Add Shop' : undefined}
            onAction={!search ? () => setFormModal({ open: true, shop: null }) : undefined}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border dark:border-dark-border bg-surface-alt/50 dark:bg-dark-surface-alt/50">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-text-tertiary dark:text-dark-text-tertiary uppercase tracking-wider">
                      Shop
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-text-tertiary dark:text-dark-text-tertiary uppercase tracking-wider hidden md:table-cell">
                      Contact
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-text-tertiary dark:text-dark-text-tertiary uppercase tracking-wider">
                      Products
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-text-tertiary dark:text-dark-text-tertiary uppercase tracking-wider hidden lg:table-cell">
                      Stock Value
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-text-tertiary dark:text-dark-text-tertiary uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-text-tertiary dark:text-dark-text-tertiary uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50 dark:divide-dark-border/50">
                  {shops.map((shop) => (
                    <tr
                      key={shop._id}
                      className="group hover:bg-surface-hover/50 dark:hover:bg-dark-surface-hover/50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/shops/${shop._id}`)}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center font-bold text-sm shrink-0">
                            {shop.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-text dark:text-dark-text text-sm truncate">{shop.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] font-mono text-text-tertiary dark:text-dark-text-tertiary bg-surface-alt dark:bg-dark-surface-alt px-1.5 py-0.5 rounded">
                                {shop.code}
                              </span>
                              {shop.address && (
                                <span className="text-[10px] text-text-tertiary dark:text-dark-text-tertiary truncate max-w-[150px] hidden sm:inline-flex items-center gap-0.5">
                                  <MapPin className="w-2.5 h-2.5 shrink-0" />
                                  {shop.address}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 hidden md:table-cell">
                        <div className="space-y-0.5">
                          {shop.contactPerson && (
                            <div className="flex items-center gap-1.5 text-xs text-text-secondary dark:text-dark-text-secondary">
                              <User className="w-3 h-3 text-text-tertiary dark:text-dark-text-tertiary" />
                              {shop.contactPerson}
                            </div>
                          )}
                          {shop.phone && (
                            <div className="flex items-center gap-1.5 text-xs text-text-tertiary dark:text-dark-text-tertiary">
                              <Phone className="w-3 h-3" />
                              {shop.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="text-sm font-semibold text-text dark:text-dark-text">{shop.totalProducts}</span>
                        <span className="text-[10px] text-text-tertiary dark:text-dark-text-tertiary block">
                          {shop.totalQuantity} units
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right hidden lg:table-cell">
                        <span className="text-xs font-semibold text-text dark:text-dark-text">{formatCurrency(shop.totalValue)}</span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Badge variant={shop.isActive ? 'success' : 'danger'} size="sm">
                          {shop.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setFormModal({ open: true, shop })}
                            title="Edit shop"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(shop)}
                            title={shop.isActive ? 'Deactivate' : 'Activate'}
                            className={shop.isActive ? 'text-danger-500 hover:text-danger-600' : 'text-success-500 hover:text-success-600'}
                          >
                            {shop.isActive ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-2.5 border-t border-border dark:border-dark-border bg-surface-alt/40 dark:bg-dark-surface-alt/40">
                <span className="text-[10px] text-text-tertiary dark:text-dark-text-tertiary tabular-nums">
                  {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, total)} of {total} shops
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-border dark:border-dark-border text-text-tertiary dark:text-dark-text-tertiary hover:border-primary-300 hover:text-primary-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs font-medium text-text-secondary dark:text-dark-text-secondary px-2">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-border dark:border-dark-border text-text-tertiary dark:text-dark-text-tertiary hover:border-primary-300 hover:text-primary-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Form Modal */}
      <ShopFormModal
        isOpen={formModal.open}
        onClose={() => setFormModal({ open: false, shop: null })}
        onSaved={() => fetchShops(true)}
        shop={formModal.shop}
      />
    </div>
  );
}
