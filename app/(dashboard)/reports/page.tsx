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
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-[400px] w-full rounded-2xl" />
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
        {/* Total Inventory Value Card */}
        <div className="p-6 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-600 border border-transparent shadow-md shadow-indigo-500/10 hover:-translate-y-[1.5px] hover:shadow-[0_12px_36px_rgb(99,102,241,0.12)] transition-all duration-300 text-white">
          <h3 className="text-white/80 font-semibold text-xs tracking-wider uppercase mb-1.5">Total Inventory Value</h3>
          <p className="text-3xl font-extrabold tracking-tight">{formatCurrency(grandTotal)}</p>
        </div>

        {/* Total Items Card */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#0c0c14] border border-zinc-100 dark:border-zinc-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.015),0_1px_2px_rgb(0,0,0,0.01)] hover:-translate-y-[1.5px] hover:shadow-[0_12px_36px_rgb(0,0,0,0.025),0_1px_3px_rgb(0,0,0,0.015)] transition-all duration-300">
          <h3 className="text-zinc-400 dark:text-zinc-500 font-semibold text-xs tracking-wider uppercase mb-1.5">Total Products</h3>
          <p className="text-3xl font-extrabold text-zinc-800 dark:text-zinc-100 tracking-tight">{products.length}</p>
        </div>

        {/* Low/Out of Stock Items Card */}
        <div className="p-6 rounded-2xl bg-rose-50/10 dark:bg-rose-950/5 border border-rose-100/50 dark:border-rose-900/10 shadow-[0_8px_30px_rgb(0,0,0,0.015),0_1px_2px_rgb(0,0,0,0.01)] hover:-translate-y-[1.5px] hover:shadow-[0_12px_36px_rgb(0,0,0,0.025),0_1px_3px_rgb(0,0,0,0.015)] transition-all duration-300">
          <h3 className="text-rose-605 dark:text-rose-400 font-semibold text-xs tracking-wider uppercase mb-1.5">Low / Out of Stock</h3>
          <p className="text-3xl font-extrabold text-rose-600 dark:text-rose-400 tracking-tight">{lowStockProducts.length}</p>
        </div>
      </div>

      <Card className="p-0 overflow-hidden border border-zinc-100 dark:border-zinc-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.015),0_1px_2px_rgb(0,0,0,0.01)] bg-white dark:bg-[#0c0c14]">
        <div className="p-5 border-b border-zinc-100 dark:border-zinc-800/60 bg-white dark:bg-[#0c0c14]">
          <h3 className="font-semibold text-zinc-800 dark:text-zinc-150 text-sm">Inventory Valuation Summary</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-zinc-50/50 dark:bg-zinc-900/40 border-b border-zinc-100 dark:border-zinc-800/80 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              <tr>
                <th className="px-6 py-4.5 font-semibold">Product Name</th>
                <th className="px-6 py-4.5 font-semibold">SKU</th>
                <th className="px-6 py-4.5 font-semibold text-right">Quantity</th>
                <th className="px-6 py-4.5 font-semibold text-right">Unit Price</th>
                <th className="px-6 py-4.5 font-semibold text-right">Total Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {products.map((p) => (
                <tr key={p._id} className="hover:bg-zinc-50/30 dark:hover:bg-zinc-900/10 transition-colors">
                  <td className="px-6 py-4 font-semibold text-zinc-800 dark:text-zinc-155">{p.name}</td>
                  <td className="px-6 py-4 text-zinc-400 dark:text-zinc-500 font-mono text-[10px]">{p.sku}</td>
                  <td className="px-6 py-4 text-right text-zinc-700 dark:text-zinc-300 font-semibold tabular-nums">{p.quantity.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right text-zinc-650 dark:text-zinc-350 font-medium tabular-nums">{formatCurrency(p.unitPrice)}</td>
                  <td className="px-6 py-4 text-right font-bold text-zinc-850 dark:text-zinc-150 tabular-nums">
                    {formatCurrency(p.quantity * p.unitPrice)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-zinc-50/30 dark:bg-zinc-900/30 border-t border-zinc-150 dark:border-zinc-800">
              <tr>
                <td colSpan={4} className="px-6 py-5 text-right font-bold text-zinc-500 dark:text-zinc-400 text-xs uppercase tracking-wider">Grand Total:</td>
                <td className="px-6 py-5 text-right font-extrabold text-indigo-600 dark:text-indigo-400 text-xl tabular-nums">
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
