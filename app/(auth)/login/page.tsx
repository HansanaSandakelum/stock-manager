'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Package, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { useFormik } from 'formik';
import * as Yup from 'yup';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const formik = useFormik({
    initialValues: {
      email: '',
      password: '',
    },
    validationSchema: Yup.object({
      email: Yup.string().email('Invalid email address').required('Email is required'),
      password: Yup.string().required('Password is required'),
    }),
    onSubmit: async (values) => {
      setLoading(true);
      const res = await signIn('credentials', {
        email: values.email,
        password: values.password,
        redirect: false,
      });
      setLoading(false);

      if (res?.error) {
        toast(res.error, 'error');
      } else {
        router.push('/');
        router.refresh();
      }
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-50 dark:bg-zinc-950 font-sans">
      <div className="w-full max-w-[400px] bg-white dark:bg-zinc-900 rounded-[24px] shadow-sm border border-zinc-200 dark:border-zinc-800 p-8 sm:p-10">
        <div className="flex flex-col items-center mb-10">
          <div className="w-12 h-12 bg-zinc-900 dark:bg-zinc-100 rounded-2xl flex items-center justify-center mb-6 shadow-md">
            <Package className="w-6 h-6 text-white dark:text-zinc-900" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Welcome back
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 text-center">
            Enter your credentials to access your workspace.
          </p>
        </div>

        <form onSubmit={formik.handleSubmit} className="space-y-5">
          <Input
            label="Email"
            id="email"
            name="email"
            type="email"
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            value={formik.values.email}
            error={formik.touched.email && formik.errors.email ? formik.errors.email : undefined}
            placeholder="name@example.com"
            className="h-11 rounded-xl bg-zinc-50/50 dark:bg-zinc-800/50"
          />
          <Input
            label="Password"
            id="password"
            name="password"
            type="password"
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            value={formik.values.password}
            error={formik.touched.password && formik.errors.password ? formik.errors.password : undefined}
            placeholder="••••••••"
            className="h-11 rounded-xl bg-zinc-50/50 dark:bg-zinc-800/50"
          />
          <Button 
            type="submit" 
            className="w-full h-11 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-medium transition-all group mt-2"
            isLoading={loading}
          >
            Sign In
            {!loading && <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />}
          </Button>
        </form>

        <p className="text-center text-sm text-zinc-500 dark:text-zinc-400 mt-8">
          Don't have an account?{' '}
          <Link href="/register" className="text-zinc-900 dark:text-zinc-100 font-medium hover:underline underline-offset-4">
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
}
