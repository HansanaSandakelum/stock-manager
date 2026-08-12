'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { Search, Package, AlertTriangle } from 'lucide-react';

interface Product {
  _id: string;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  category?: { name: string };
}

interface IssueStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIssued: () => void;
  shopId: string;
  shopName: string;
}

export function IssueStockModal({ isOpen, onClose, onIssued, shopId, shopName }: IssueStockModalProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 16));
  const [saving, setSaving] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedProduct(null);
      setQuantity('');
      setInvoiceNumber('');
      setNote('');
      setDate(new Date().toISOString().slice(0, 16));
      fetchProducts();
    }
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchProducts = async () => {
    setLoadingProducts(true);
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

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products.filter((p) => p.quantity > 0);
    const q = search.toLowerCase();
    return products.filter(
      (p) =>
        p.quantity > 0 &&
        (p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q))
    );
  }, [products, search]);

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setSearch(product.name);
    setShowDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) {
      toast('Please select a product', 'error');
      return;
    }
    const qty = parseInt(quantity);
    if (!qty || qty <= 0) {
      toast('Please enter a valid quantity', 'error');
      return;
    }
    if (qty > selectedProduct.quantity) {
      toast(`Insufficient warehouse stock. Available: ${selectedProduct.quantity}`, 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/shops/${shopId}/stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct._id,
          quantity: qty,
          invoiceNumber: invoiceNumber.trim() || undefined,
          note: note.trim() || undefined,
          date: new Date(date).toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to issue stock');

      toast(`${qty} units of ${selectedProduct.name} issued to ${shopName}`, 'success');
      onIssued();
      onClose();
    } catch (error: any) {
      toast(error.message || 'Failed to issue stock', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Issue Stock to ${shopName}`} maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Product Search */}
        <div ref={dropdownRef} className="relative">
          <label className="text-sm font-medium text-text-secondary dark:text-dark-text-secondary mb-1.5 block">
            Select Product *
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary dark:text-dark-text-tertiary" />
            <input
              type="text"
              placeholder="Search products by name or SKU..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelectedProduct(null);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              className="w-full pl-9 pr-3.5 py-2.5 bg-white dark:bg-dark-surface border border-border dark:border-dark-border rounded-xl text-sm text-text dark:text-dark-text placeholder:text-text-tertiary dark:placeholder:text-dark-text-tertiary transition-all outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 hover:border-primary-300 dark:hover:border-primary-700"
            />
          </div>

          {showDropdown && !selectedProduct && (
            <div className="absolute z-50 w-full mt-1.5 bg-white dark:bg-dark-surface border border-border dark:border-dark-border rounded-xl shadow-lg shadow-black/5 dark:shadow-black/20 max-h-48 overflow-y-auto animate-scale-in">
              {loadingProducts ? (
                <div className="px-3 py-4 text-xs text-center text-text-tertiary dark:text-dark-text-tertiary">
                  Loading products...
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="px-3 py-4 text-xs text-center text-text-tertiary dark:text-dark-text-tertiary">
                  No products with available stock
                </div>
              ) : (
                <ul className="p-1 space-y-0.5">
                  {filteredProducts.slice(0, 20).map((product) => (
                    <li key={product._id}>
                      <button
                        type="button"
                        onClick={() => handleSelectProduct(product)}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs transition-colors duration-150 text-text-secondary dark:text-dark-text-secondary hover:bg-surface-hover dark:hover:bg-dark-surface-hover"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium text-text dark:text-dark-text">{product.name}</span>
                            <span className="ml-2 text-text-tertiary dark:text-dark-text-tertiary">({product.sku})</span>
                          </div>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                            product.quantity > 10
                              ? 'bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400'
                              : 'bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400'
                          }`}>
                            {product.quantity} in stock
                          </span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Selected Product Info */}
        {selectedProduct && (
          <div className="flex items-center gap-3 px-3.5 py-3 rounded-xl bg-primary-50 dark:bg-primary-500/10 border border-primary-200/50 dark:border-primary-700/20">
            <Package className="w-5 h-5 text-primary-600 dark:text-primary-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-primary-700 dark:text-primary-300 truncate">{selectedProduct.name}</p>
              <p className="text-[10px] text-primary-600/70 dark:text-primary-400/70">
                SKU: {selectedProduct.sku} · Warehouse Stock: {selectedProduct.quantity} · Rs. {selectedProduct.unitPrice.toLocaleString()}
              </p>
            </div>
          </div>
        )}

        <Input
          label="Quantity *"
          type="number"
          placeholder="Enter quantity to issue"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          min={1}
          max={selectedProduct?.quantity}
        />

        {selectedProduct && parseInt(quantity) > 0 && parseInt(quantity) <= selectedProduct.quantity && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-alt dark:bg-dark-surface-alt text-xs text-text-secondary dark:text-dark-text-secondary">
            <AlertTriangle className="w-3.5 h-3.5 text-warning-500" />
            After issuing: Warehouse will have {selectedProduct.quantity - parseInt(quantity)} units remaining
          </div>
        )}

        <Input
          label="Invoice Number"
          placeholder="e.g. INV-2026-001 (optional reference)"
          value={invoiceNumber}
          onChange={(e) => setInvoiceNumber(e.target.value)}
        />

        <Input
          label="Date & Time"
          type="datetime-local"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        <Input
          label="Note"
          placeholder="Optional note..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" isLoading={saving}>
            Issue Stock
          </Button>
        </div>
      </form>
    </Modal>
  );
}
