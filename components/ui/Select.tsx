'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  error?: string;
}

export function Select({
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  className = '',
  disabled = false,
  error
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between w-full px-3.5 py-2.5 bg-white dark:bg-dark-surface border rounded-xl text-sm transition-all outline-none text-left cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
          error ? 'border-danger-500 focus:border-danger-500 focus:ring-4 focus:ring-danger-500/10' : 'border-border dark:border-dark-border hover:border-primary-300 dark:hover:border-primary-700 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10'
        } ${isOpen ? 'ring-4 ring-primary-500/10 border-primary-500' : ''}`}
      >
        <span className={selectedOption ? 'text-text dark:text-dark-text font-medium' : 'text-text-tertiary dark:text-dark-text-tertiary'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-text-tertiary dark:text-dark-text-tertiary transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-primary-500' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1.5 bg-white dark:bg-dark-surface border border-border dark:border-dark-border rounded-xl shadow-lg shadow-black/5 dark:shadow-black/20 max-h-60 overflow-y-auto animate-scale-in">
          <ul className="p-1 space-y-0.5">
            {options.length === 0 ? (
              <li className="px-3 py-2 text-xs text-text-tertiary dark:text-dark-text-tertiary text-center">
                No options available
              </li>
            ) : (
              options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <li key={option.value}>
                    <button
                      type="button"
                      onClick={() => handleSelect(option.value)}
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors duration-150 ${
                        isSelected
                          ? 'bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-400 font-semibold'
                          : 'text-text-secondary dark:text-dark-text-secondary hover:bg-surface-hover dark:hover:bg-dark-surface-hover'
                      }`}
                    >
                      {option.label}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}

      {error && <p className="mt-1 text-xs text-danger-600 dark:text-danger-400">{error}</p>}
    </div>
  );
}
