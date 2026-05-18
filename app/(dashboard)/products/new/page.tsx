'use client';

import { ProductForm } from '@/components/products/ProductForm';

export default function NewProductPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Add New Product</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Create a new product in your inventory</p>
      </div>
      <ProductForm />
    </div>
  );
}
