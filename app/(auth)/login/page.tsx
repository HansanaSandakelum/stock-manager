'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
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
            Welcome back
          </h1>
          <p className="text-sm text-text-tertiary dark:text-dark-text-tertiary mt-2 text-center">
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
            Sign In
            {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />}
          </Button>
        </form>
      </div>
    </div>
  );
}
