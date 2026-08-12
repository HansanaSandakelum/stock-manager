'use client';

import React, { useState } from 'react';
import { Package, Undo2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { toast } from '@/components/ui/Toast';

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

interface ShopStockTableProps {
  items: ShopStockItem[];
  shopId: string;
  shopName: string;
  onStockChanged: () => void;
}

export function ShopStockTable({ items, shopId, shopName, onStockChanged }: ShopStockTableProps) {
  const [returnModal, setReturnModal] = useState<{
    open: boolean;
    item: ShopStockItem | null;
    quantity: string;
    note: string;
    saving: boolean;
  }>({ open: false, item: null, quantity: '', note: '', saving: false });

  const openReturnModal = (item: ShopStockItem) => {
    setReturnModal({
      open: true,
      item,
      quantity: '',
      note: '',
      saving: false,
    });
  };

  const handleReturn = async () => {
    if (!returnModal.item) return;
    const qty = parseInt(returnModal.quantity);
    if (!qty || qty <= 0) {
      toast('Please enter a valid quantity', 'error');
      return;
    }
    if (qty > returnModal.item.quantity) {
      toast(`Cannot return more than shop stock (${returnModal.item.quantity})`, 'error');
      return;
    }

    setReturnModal((prev) => ({ ...prev, saving: true }));
    try {
      const res = await fetch(`/api/shops/${shopId}/stock/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: returnModal.item.product._id,
          quantity: qty,
          note: returnModal.note.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');

      toast(`${qty} units of ${returnModal.item.product.name} returned to warehouse`, 'success');
      setReturnModal({ open: false, item: null, quantity: '', note: '', saving: false });
      onStockChanged();
    } catch (error: any) {
      toast(error.message || 'Failed to return stock', 'error');
      setReturnModal((prev) => ({ ...prev, saving: false }));
    }
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-12 h-12 bg-surface-alt dark:bg-dark-surface-alt rounded-2xl flex items-center justify-center mb-4 ring-1 ring-border dark:ring-dark-border">
          <Package className="w-6 h-6 text-text-tertiary dark:text-dark-text-tertiary" />
        </div>
        <p className="text-sm font-medium text-text dark:text-dark-text mb-1">No stock at this shop</p>
        <p className="text-xs text-text-tertiary dark:text-dark-text-tertiary">Issue products from warehouse to get started</p>
      </div>
    );
  }

  const formatCurrency = (value: number) =>
    `Rs. ${value.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border dark:border-dark-border">
              <th className="text-left py-3 px-4 text-xs font-semibold text-text-tertiary dark:text-dark-text-tertiary uppercase tracking-wider">
                Product
              </th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-text-tertiary dark:text-dark-text-tertiary uppercase tracking-wider">
                Qty at Shop
              </th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-text-tertiary dark:text-dark-text-tertiary uppercase tracking-wider">
                Unit Price
              </th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-text-tertiary dark:text-dark-text-tertiary uppercase tracking-wider">
                Total Value
              </th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-text-tertiary dark:text-dark-text-tertiary uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50 dark:divide-dark-border/50">
            {items.map((item) => (
              <tr key={item._id} className="group hover:bg-surface-hover/50 dark:hover:bg-dark-surface-hover/50 transition-colors">
                <td className="py-3 px-4">
                  <div>
                    <p className="font-medium text-text dark:text-dark-text text-sm">{item.product.name}</p>
                    <p className="text-[10px] text-text-tertiary dark:text-dark-text-tertiary mt-0.5">SKU: {item.product.sku}</p>
                  </div>
                </td>
                <td className="py-3 px-4 text-center">
                  <Badge variant={item.quantity > 10 ? 'success' : item.quantity > 0 ? 'warning' : 'danger'} size="md">
                    {item.quantity}
                  </Badge>
                </td>
                <td className="py-3 px-4 text-right text-text-secondary dark:text-dark-text-secondary text-xs font-medium">
                  {formatCurrency(item.product.unitPrice)}
                </td>
                <td className="py-3 px-4 text-right text-text dark:text-dark-text text-xs font-semibold">
                  {formatCurrency(item.quantity * item.product.unitPrice)}
                </td>
                <td className="py-3 px-4 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openReturnModal(item)}
                    className="text-warning-600 hover:text-warning-700 dark:text-warning-400 dark:hover:text-warning-300"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    Return
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Return to Warehouse Modal */}
      <Modal
        isOpen={returnModal.open}
        onClose={() => !returnModal.saving && setReturnModal({ open: false, item: null, quantity: '', note: '', saving: false })}
        title="Return to Warehouse"
      >
        {returnModal.item && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 px-3.5 py-3 rounded-xl bg-surface-alt dark:bg-dark-surface-alt border border-border dark:border-dark-border">
              <Package className="w-5 h-5 text-text-tertiary dark:text-dark-text-tertiary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text dark:text-dark-text truncate">{returnModal.item.product.name}</p>
                <p className="text-[10px] text-text-tertiary dark:text-dark-text-tertiary">
                  Currently at {shopName}: {returnModal.item.quantity} units
                </p>
              </div>
            </div>

            <Input
              label="Quantity to Return *"
              type="number"
              placeholder="Enter quantity"
              value={returnModal.quantity}
              onChange={(e) => setReturnModal((prev) => ({ ...prev, quantity: e.target.value }))}
              min={1}
              max={returnModal.item.quantity}
            />

            <Input
              label="Note"
              placeholder="Reason for return..."
              value={returnModal.note}
              onChange={(e) => setReturnModal((prev) => ({ ...prev, note: e.target.value }))}
            />

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                onClick={() => setReturnModal({ open: false, item: null, quantity: '', note: '', saving: false })}
                disabled={returnModal.saving}
              >
                Cancel
              </Button>
              <Button onClick={handleReturn} isLoading={returnModal.saving}>
                Return to Warehouse
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
