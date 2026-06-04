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
      email: Yup.string()
        .email('Please enter a valid email address')
        .required('Email address is required'),
      password: Yup.string()
        .min(6, 'Password must be at least 6 characters')
        .required('Password is required'),
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
    <div className="relative min-h-screen flex items-center justify-center p-4 bg-[#FAFBFC] dark:bg-[#09090B] font-sans overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-[30%] -left-[10%] w-[60%] h-[60%] rounded-full bg-indigo-500/10 blur-[130px] dark:bg-indigo-500/5" />
        <div className="absolute -bottom-[30%] -right-[10%] w-[60%] h-[60%] rounded-full bg-blue-500/10 blur-[130px] dark:bg-blue-500/5" />
      </div>

      <div className="relative overflow-hidden w-full max-w-[420px] backdrop-blur-md bg-white/70 dark:bg-[#0c0c14]/70 border border-zinc-200/50 dark:border-zinc-800/50 rounded-[28px] shadow-[0_20px_50px_rgba(0,0,0,0.03)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.25)] p-8 sm:p-10 transition-all duration-300">
        <div className="flex flex-col items-center mb-10">
          <div className="w-12 h-12 bg-gradient-to-tr from-indigo-600 to-blue-600 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-indigo-500/20 dark:shadow-indigo-500/10 hover:scale-105 transition-transform duration-300">
            <Package className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
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
            className="h-11"
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
            className="h-11"
          />
          <Button 
            type="submit" 
            variant="primary"
            className="w-full h-11 group mt-2"
            isLoading={loading}
          >
            Sign In
            {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />}
          </Button>
        </form>

        {/* <p className="text-center text-sm text-zinc-500 dark:text-zinc-400 mt-8">
          Don't have an account?{' '}
          <Link href="/register" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline underline-offset-4 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors">
            Create account
          </Link>
        </p> */}
      </div>
    </div>
  );
}
