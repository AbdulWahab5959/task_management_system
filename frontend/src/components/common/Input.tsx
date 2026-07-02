import { useId } from 'react';
import type { InputHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
}

export default function Input({ className, error, helperText, id, label, ...props }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const descriptionId = `${inputId}-description`;

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || helperText ? descriptionId : undefined}
        className={cn(
          'block w-full rounded-lg border border-slate-200 bg-white/90 px-3.5 py-2.5 text-sm font-medium text-slate-900 shadow-sm shadow-slate-200/50 outline-none transition-all duration-150 placeholder:font-normal placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500',
          error && 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20',
          className,
        )}
        {...props}
      />
      {error ? (
        <p id={descriptionId} className="mt-1.5 text-sm text-rose-600">
          {error}
        </p>
      ) : helperText ? (
        <p id={descriptionId} className="mt-1.5 text-sm text-slate-500">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
