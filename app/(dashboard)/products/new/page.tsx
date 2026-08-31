'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ProductForm } from '@/components/products/ProductForm';
import { toast } from '@/components/ui/Toast';

export default function NewProductPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();

  useEffect(() => {
    if (sessionStatus === 'loading') return;
    const role = (session?.user as any)?.role;
    if (role === 'deliver') {
      toast('Access denied: Deliver role cannot add products', 'error');
      router.push('/products');
    }
  }, [session, sessionStatus, router]);

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
