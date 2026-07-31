import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: ReactNode;
}

export default function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Background decoration */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-md items-center px-6 py-12">
        <div className="w-full">
          {/* Brand */}
          <div className="mb-8 text-center">
            <Link to="/" className="inline-flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 text-lg font-bold text-white shadow-lg shadow-cyan-500/25">
                L
              </div>
              <span className="text-xl font-bold text-white">LaunchStack</span>
            </Link>
          </div>

          {/* Card */}
          <div className="w-full rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-cyan-950/30 backdrop-blur-sm">
            <h1 className="text-3xl font-semibold">{title}</h1>
            {subtitle && <div className="mt-2 text-sm text-slate-300">{subtitle}</div>}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
