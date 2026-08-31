import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: ReactNode;
}

export default function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="auth-site min-h-screen text-white">
      {/* Background decoration */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="auth-grid absolute inset-0" />
      </div>

      <header className="auth-header relative"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8"><Link to="/" className="flex items-center gap-3" aria-label="LaunchStack home"><span className="auth-mark">L<span>/</span></span><span className="auth-wordmark">LaunchStack</span></Link><Link to="/contact" className="auth-header-link">Need help?</Link></div></header>

      <div className="relative mx-auto flex min-h-[calc(100vh-73px)] max-w-md items-center px-5 py-10 sm:px-6 sm:py-16">
        <div className="w-full">
          {/* Brand */}
          <div className="mb-8 text-center"><p className="auth-kicker">LaunchStack / account</p></div>

          {/* Card */}
          <div className="auth-card w-full rounded-3xl border p-7 shadow-2xl sm:p-9">
            <h1 className="text-3xl font-black tracking-[-.05em]">{title}</h1>
            {subtitle && <div className="mt-2 text-sm text-slate-300">{subtitle}</div>}
            {children}
          </div>
        </div>
      </div>
      <footer className="auth-footer relative"><div className="mx-auto flex max-w-md flex-wrap justify-center gap-x-5 gap-y-2 px-5 pb-8 text-xs"><Link to="/privacy" className="auth-footer-link">Privacy</Link><Link to="/terms" className="auth-footer-link">Terms</Link><Link to="/chatbots" className="auth-footer-link">Chatbots</Link></div></footer>
    </div>
  );
}
