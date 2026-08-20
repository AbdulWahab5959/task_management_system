import type { ButtonHTMLAttributes, ReactNode } from 'react';
import LoadingSpinner from './LoadingSpinner';
import { cn } from '../../utils/cn';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: ReactNode;
}

const variantClasses = {
  primary: 'bg-[#8200fa] text-white shadow-sm shadow-[#8200fa]/20 hover:bg-[#7000d9] focus-visible:ring-[#8200fa]',
  secondary: 'border border-slate-200 bg-white/90 text-slate-700 shadow-sm shadow-slate-200/50 hover:border-slate-300 hover:bg-white focus-visible:ring-indigo-500',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-indigo-500',
  danger: 'bg-rose-600 text-white shadow-sm shadow-rose-600/20 hover:bg-rose-500 focus-visible:ring-rose-500',
};

const sizeClasses = {
  sm: 'min-h-8 px-3 text-xs',
  md: 'min-h-10 px-4 text-sm',
  lg: 'min-h-11 px-5 text-base',
};

export default function Button({
  children,
  className,
  disabled,
  icon,
  isLoading = false,
  size = 'md',
  type = 'button',
  variant = 'primary',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
        'active:scale-[0.98]',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {isLoading ? <LoadingSpinner size="sm" className={variant === 'secondary' || variant === 'ghost' ? 'text-slate-500' : 'text-white'} /> : icon}
      {children}
    </button>
  );
}
