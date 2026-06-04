'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { Select } from '@/components/ui/Select';

interface ProductFormProps {
  initialData?: any;
  isEditing?: boolean;
}

export function ProductForm({ initialData, isEditing }: ProductFormProps) {
  const router = useRouter();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    sku: initialData?.sku || '',
    category: initialData?.category?._id || initialData?.category || '',
    quantity: initialData?.quantity || 0,
    unitPrice: initialData?.unitPrice || 0,
    supplier: initialData?.supplier || '',
    lowStockThreshold: initialData?.lowStockThreshold || 10,
    image: initialData?.image || '',
  });

  useEffect(() => {
    fetch('/api/categories')
      .then(res => res.json())
      .then(data => {
        if (data.success) setCategories(data.data);
      });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as any;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  const generateSku = () => {
    if (!formData.name) {
      toast('Please enter a name first', 'info');
      return;
    }
    const prefix = formData.name.substring(0, 3).toUpperCase();
    const random = Math.floor(1000 + Math.random() * 9000);
    setFormData(prev => ({ ...prev, sku: `${prefix}-${random}` }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = isEditing ? `/api/products/${initialData._id}` : '/api/products';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to save product');

      toast(`Product ${isEditing ? 'updated' : 'created'} successfully`, 'success');
      router.push('/products');
      router.refresh();
    } catch (error: any) {
      toast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Product Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder="e.g. Wireless Mouse"
          />
          
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input
                label="SKU"
                name="sku"
                value={formData.sku}
                onChange={handleChange}
                required
                placeholder="e.g. WMO-1024"
              />
            </div>
            <Button type="button" variant="secondary" onClick={generateSku}>Generate</Button>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Category</label>
            <Select
              value={formData.category}
              onChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
              options={categories.map(cat => ({ value: cat._id, label: cat.name }))}
              placeholder="Select a category"
            />
          </div>

          <Input
            label="Supplier (Optional)"
            name="supplier"
            value={formData.supplier}
            onChange={handleChange}
            placeholder="e.g. TechCorp Inc."
          />

          <Input
            label="Initial Quantity"
            name="quantity"
            type="number"
            min="0"
            value={formData.quantity}
            onChange={handleChange}
            required
            disabled={isEditing} // usually you shouldn't edit quantity directly after creation
          />

          <Input
            label="Unit Price (Rs.)"
            name="unitPrice"
            type="number"
            min="0"
            step="0.01"
            value={formData.unitPrice}
            onChange={handleChange}
            required
          />

          <Input
            label="Low Stock Threshold"
            name="lowStockThreshold"
            type="number"
            min="0"
            value={formData.lowStockThreshold}
            onChange={handleChange}
            required
          />

          <Input
            label="Image URL (Optional)"
            name="image"
            value={formData.image}
            onChange={handleChange}
            placeholder="https://example.com/image.jpg"
          />
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-zinc-200 dark:border-zinc-800">
          <Button type="button" variant="secondary" onClick={() => router.push('/products')}>
            Cancel
          </Button>
          <Button type="submit" isLoading={loading}>
            {isEditing ? 'Save Changes' : 'Create Product'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
