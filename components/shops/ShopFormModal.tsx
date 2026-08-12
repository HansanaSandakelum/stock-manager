'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';

interface ShopData {
  _id?: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  contactPerson?: string;
}

interface ShopFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  shop?: ShopData | null;
}

export function ShopFormModal({ isOpen, onClose, onSaved, shop }: ShopFormModalProps) {
  const isEdit = !!shop?._id;
  const [form, setForm] = useState<ShopData>({
    name: '',
    code: '',
    address: '',
    phone: '',
    contactPerson: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (shop) {
        setForm({
          name: shop.name || '',
          code: shop.code || '',
          address: shop.address || '',
          phone: shop.phone || '',
          contactPerson: shop.contactPerson || '',
        });
      } else {
        setForm({ name: '', code: '', address: '', phone: '', contactPerson: '' });
      }
    }
  }, [isOpen, shop]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim() || !form.code.trim()) {
      toast('Shop name and code are required', 'error');
      return;
    }

    setSaving(true);
    try {
      const url = isEdit ? `/api/shops/${shop!._id}` : '/api/shops';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save shop');

      toast(isEdit ? 'Shop updated successfully' : 'Shop created successfully', 'success');
      onSaved();
      onClose();
    } catch (error: any) {
      toast(error.message || 'Failed to save shop', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Shop' : 'Add New Shop'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Shop Name *"
          placeholder="e.g., Kandy Branch"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
        <Input
          label="Shop Code *"
          placeholder="e.g., KDY-01"
          value={form.code}
          onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
          disabled={isEdit}
        />
        <Input
          label="Address"
          placeholder="Shop address"
          value={form.address}
          onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
        />
        <Input
          label="Phone"
          placeholder="Contact number"
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
        />
        <Input
          label="Contact Person"
          placeholder="Manager / owner name"
          value={form.contactPerson}
          onChange={(e) => setForm((f) => ({ ...f, contactPerson: e.target.value }))}
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" isLoading={saving}>
            {isEdit ? 'Save Changes' : 'Create Shop'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
