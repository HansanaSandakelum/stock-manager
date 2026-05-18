'use client';

import { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastOptions {
  message: string;
  type: ToastType;
  id: string;
}

let addToastHandler: ((toast: ToastOptions) => void) | null = null;

export function toast(message: string, type: ToastType = 'info') {
  if (addToastHandler) {
    addToastHandler({ message, type, id: Math.random().toString(36).substr(2, 9) });
  }
}

export function Toaster() {
  const [toasts, setToasts] = useState<ToastOptions[]>([]);

  useEffect(() => {
    addToastHandler = (toast: ToastOptions) => {
      setToasts((prev) => [...prev, toast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, 3000);
    };
    return () => {
      addToastHandler = null;
    };
  }, []);

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="flex items-center gap-3 p-4 bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-800 animate-in slide-in-from-right-8 fade-in transition-all duration-300"
        >
          {t.type === 'success' && <CheckCircle className="w-5 h-5 text-green-500" />}
          {t.type === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
          {t.type === 'info' && <Info className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />}
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{t.message}</p>
          <button
            onClick={() => setToasts((prev) => prev.filter((toast) => toast.id !== t.id))}
            className="ml-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
