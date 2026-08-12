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
      }, 4000);
    };
    return () => {
      addToastHandler = null;
    };
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-dark-surface rounded-xl shadow-lg border border-border dark:border-dark-border animate-slide-up min-w-[300px] max-w-[400px]"
        >
          {t.type === 'success' && <CheckCircle className="w-5 h-5 text-success-500 shrink-0" />}
          {t.type === 'error' && <AlertCircle className="w-5 h-5 text-danger-500 shrink-0" />}
          {t.type === 'info' && <Info className="w-5 h-5 text-primary-500 shrink-0" />}
          <p className="text-sm font-medium text-text dark:text-dark-text flex-1">{t.message}</p>
          <button
            onClick={() => setToasts((prev) => prev.filter((toast) => toast.id !== t.id))}
            className="text-text-tertiary hover:text-text dark:text-dark-text-tertiary dark:hover:text-dark-text transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
