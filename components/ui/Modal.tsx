import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-md' }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div 
        className="absolute inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-sm" 
        onClick={onClose}
      />
      <div className={`relative bg-white dark:bg-dark-surface rounded-2xl shadow-xl w-full ${maxWidth} max-h-[90vh] flex flex-col animate-scale-in border border-border dark:border-dark-border`}>
        <div className="flex items-center justify-between p-6 border-b border-border dark:border-dark-border">
          <h2 className="text-lg font-semibold text-text dark:text-dark-text">{title}</h2>
          <button 
            onClick={onClose}
            className="text-text-tertiary hover:text-text dark:text-dark-text-tertiary dark:hover:text-dark-text transition-colors p-1.5 rounded-lg hover:bg-surface-hover dark:hover:bg-dark-surface-hover active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto text-text dark:text-dark-text">
          {children}
        </div>
      </div>
    </div>
  );
}
