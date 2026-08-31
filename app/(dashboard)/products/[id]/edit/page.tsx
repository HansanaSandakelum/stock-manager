'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ProductForm } from '@/components/products/ProductForm';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionStatus === 'loading') return;
    const role = (session?.user as any)?.role;
    if (role === 'deliver') {
      toast('Access denied: Deliver role cannot edit products', 'error');
      router.push('/products');
      return;
    }

    const fetchProduct = async () => {
      try {
        const res = await fetch(`/api/products/${params.id}`);
        const data = await res.json();
        
        if (data.success) {
          setProduct(data.data);
        } else {
          toast(data.error, 'error');
        }
      } catch (error) {
        toast('Failed to load product', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [params.id, session, sessionStatus, router]);

  if (loading) {
    return <Skeleton className="h-[500px] w-full" />;
  }

  if (!product) {
    return <div>Product not found</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Edit Product</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Update product information</p>
      </div>
      <ProductForm initialData={product} isEditing />
    </div>
  );
}
