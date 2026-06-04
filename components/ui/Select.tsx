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

  // Close dropdown when clicking outside
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
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between w-full px-3.5 py-2.5 bg-zinc-50/30 hover:bg-zinc-50/70 focus:bg-white dark:bg-zinc-900/30 dark:hover:bg-zinc-900/60 dark:focus:bg-zinc-900/90 border rounded-xl text-sm transition-all focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 text-left text-zinc-800 dark:text-zinc-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
          error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/5' : 'border-zinc-200 dark:border-zinc-800'
        } ${isOpen ? 'ring-4 ring-indigo-500/5 border-indigo-500 dark:border-indigo-500' : ''}`}
      >
        <span className={selectedOption ? 'text-zinc-800 dark:text-zinc-100 font-medium' : 'text-zinc-400 dark:text-zinc-500'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-zinc-400 dark:text-zinc-500 transition-transform duration-200 ${
            isOpen ? 'transform rotate-180 text-indigo-500' : ''
          }`}
        />
      </button>

      {/* Floating Options Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1.5 bg-white dark:bg-[#0c0c14] border border-zinc-150 dark:border-zinc-800/80 rounded-xl shadow-lg shadow-zinc-200/25 dark:shadow-black/50 max-h-60 overflow-y-auto backdrop-blur-md">
          <ul className="p-1 space-y-0.5">
            {options.length === 0 ? (
              <li className="px-3 py-2 text-xs text-zinc-400 dark:text-zinc-500 text-center">
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
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors duration-150 hover:bg-zinc-50 dark:hover:bg-zinc-900/60 cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-50/60 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 font-semibold'
                          : 'text-zinc-600 dark:text-zinc-400'
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

      {/* Error Message */}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
