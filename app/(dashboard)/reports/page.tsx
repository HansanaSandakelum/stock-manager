'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Download } from 'lucide-react';

export default function ReportsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/products?limit=1000')
      .then(res => res.json())
      .then(data => {
        if (data.success) setProducts(data.data);
        setLoading(false);
      });
  }, []);

  const formatCurrency = (val: number) => `Rs. ${val.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const downloadCSV = () => {
    if (!products.length) return;

    const headers = ['Name', 'SKU', 'Category', 'Unit Price', 'Quantity', 'Total Value', 'Status'];
    const csvRows = [headers.join(',')];

    products.forEach(p => {
      const status = p.quantity === 0 ? 'Out of Stock' : p.quantity <= p.lowStockThreshold ? 'Low Stock' : 'In Stock';
      const row = [
        `"${p.name}"`,
        `"${p.sku}"`,
        `"${p.category?.name || ''}"`,
        p.unitPrice,
        p.quantity,
        (p.quantity * p.unitPrice).toFixed(2),
        status
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `stock_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const grandTotal = products.reduce((sum, p) => sum + (p.quantity * p.unitPrice), 0);
  const lowStockProducts = products.filter(p => p.quantity <= p.lowStockThreshold);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Reports</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">View and export your inventory data</p>
        </div>
        <Button onClick={downloadCSV} variant="secondary">
          <Download className="w-4 h-4" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900">
          <h3 className="text-zinc-300 dark:text-zinc-600 font-medium text-sm mb-1">Total Inventory Value</h3>
          <p className="text-3xl font-bold">{formatCurrency(grandTotal)}</p>
        </Card>
        <Card>
          <h3 className="text-zinc-500 dark:text-zinc-400 font-medium text-sm mb-1">Total Items</h3>
          <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{products.length}</p>
        </Card>
        <Card>
          <h3 className="text-zinc-500 dark:text-zinc-400 font-medium text-sm mb-1">Low/Out of Stock Items</h3>
          <p className="text-3xl font-bold text-red-600 dark:text-red-400">{lowStockProducts.length}</p>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Inventory Valuation Summary</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400">
              <tr>
                <th className="px-6 py-4 font-medium">Product Name</th>
                <th className="px-6 py-4 font-medium">SKU</th>
                <th className="px-6 py-4 font-medium text-right">Quantity</th>
                <th className="px-6 py-4 font-medium text-right">Unit Price</th>
                <th className="px-6 py-4 font-medium text-right">Total Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {products.map((p) => (
                <tr key={p._id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">{p.name}</td>
                  <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400">{p.sku}</td>
                  <td className="px-6 py-4 text-right text-zinc-900 dark:text-zinc-100">{p.quantity}</td>
                  <td className="px-6 py-4 text-right text-zinc-900 dark:text-zinc-100">{formatCurrency(p.unitPrice)}</td>
                  <td className="px-6 py-4 text-right font-medium text-zinc-900 dark:text-zinc-100">
                    {formatCurrency(p.quantity * p.unitPrice)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-800">
              <tr>
                <td colSpan={4} className="px-6 py-4 text-right font-semibold text-zinc-900 dark:text-zinc-100">Grand Total:</td>
                <td className="px-6 py-4 text-right font-bold text-zinc-900 dark:text-zinc-100 text-lg">
                  {formatCurrency(grandTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
}
