import React from 'react';
import { cn } from '../../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', size = 'md', className, children, ...props }) => {
  const base = 'inline-flex items-center justify-center font-bold rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-[var(--c2i-red)] text-white hover:bg-[var(--c2i-red-deep)] focus:ring-[var(--c2i-red)]',
    secondary: 'bg-[var(--c2i-ink)] text-white hover:bg-[#1a2b3c] focus:ring-[var(--c2i-ink)]',
    outline: 'border-2 border-[var(--c2i-ink)] text-[var(--c2i-ink)] bg-transparent hover:bg-[var(--c2i-ink)] hover:text-white focus:ring-[var(--c2i-ink)]',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-base',
    lg: 'px-8 py-3.5 text-lg',
  };

  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  );
};
