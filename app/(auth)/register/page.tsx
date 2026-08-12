'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Package, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { useFormik } from 'formik';
import * as Yup from 'yup';

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'authenticated') {
      if ((session?.user as any)?.role !== 'admin') {
        router.push('/');
      }
    } else if (status === 'unauthenticated') {
      fetch('/api/auth/register')
        .then((res) => res.json())
        .then((data) => {
          if (data.hasUsers) {
            toast('Access denied. Public registration is disabled.', 'error');
            router.push('/login');
          }
        })
        .catch(() => {});
    }
  }, [status, session, router]);

  const formik = useFormik({
    initialValues: {
      name: '',
      email: '',
      password: '',
    },
    validationSchema: Yup.object({
      name: Yup.string()
        .min(3, 'Name must be at least 3 characters')
        .max(50, 'Name must be at most 50 characters')
        .required('Full name is required'),
      email: Yup.string()
        .email('Please enter a valid email address')
        .required('Email address is required'),
      password: Yup.string()
        .min(6, 'Password must be at least 6 characters')
        .matches(/[A-Za-z]/, 'Password must contain at least one letter')
        .matches(/[0-9]/, 'Password must contain at least one number')
        .required('Password is required'),
    }),
    onSubmit: async (values) => {
      setLoading(true);

      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Registration failed');
        }

        toast('Registration successful! Please sign in.', 'success');
        router.push('/login');
      } catch (err: any) {
        toast(err.message, 'error');
      } finally {
        setLoading(false);
      }
    },
  });

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 bg-surface-alt dark:bg-dark-surface overflow-hidden">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-[30%] -left-[10%] w-[60%] h-[60%] rounded-full bg-primary-500/10 blur-[130px] dark:bg-primary-500/5" />
        <div className="absolute -bottom-[30%] -right-[10%] w-[60%] h-[60%] rounded-full bg-primary-400/10 blur-[130px] dark:bg-primary-400/5" />
      </div>

      <div className="relative w-full max-w-[420px] bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl border border-border dark:border-dark-border rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.03)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.25)] p-8 sm:p-10 transition-all duration-300">
        <div className="flex flex-col items-center mb-10">
          <div className="w-12 h-12 bg-primary-600 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-primary-500/20 dark:shadow-primary-500/10">
            <Package className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-text dark:text-dark-text">
            Create account
          </h1>
          <p className="text-sm text-text-tertiary dark:text-dark-text-tertiary mt-2 text-center">
            Sign up to get started with AraliyaStocks.
          </p>
        </div>

        <form onSubmit={formik.handleSubmit} className="space-y-5">
          <Input
            label="Full Name"
            id="name"
            name="name"
            type="text"
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            value={formik.values.name}
            error={formik.touched.name && formik.errors.name ? formik.errors.name : undefined}
            placeholder="John Doe"
          />
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
          />
          <Button 
            type="submit" 
            variant="primary"
            className="w-full h-11 group mt-2"
            isLoading={loading}
          >
            Create Account
            {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />}
          </Button>
        </form>

        <p className="text-center text-sm text-text-tertiary dark:text-dark-text-tertiary mt-8">
          Already have an account?{' '}
          <Link href="/login" className="text-primary-600 dark:text-primary-400 font-semibold hover:underline underline-offset-4 hover:text-primary-500 dark:hover:text-primary-300 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
