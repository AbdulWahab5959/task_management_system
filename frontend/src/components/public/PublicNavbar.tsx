import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/contact', label: 'Contact' },
];

export default function PublicNavbar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 text-sm font-bold text-white">
            L
          </div>
          <span className="text-lg font-bold text-white">LaunchPad</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`text-sm font-medium transition ${
                location.pathname === link.to
                  ? 'text-cyan-400'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop Auth Buttons */}
        <div className="hidden items-center gap-3 md:flex">
          <Link
            to="/login"
            className="rounded-xl border border-white/10 px-5 py-2.5 text-sm font-medium text-slate-200 transition hover:border-cyan-400 hover:text-white"
          >
            Log in
          </Link>
          <Link
            to="/register"
            className="rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-cyan-500/25 transition hover:shadow-cyan-500/40"
          >
            Get started
          </Link>
        </div>

        {/* Mobile Toggle */}
        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          className="flex flex-col gap-1.5 md:hidden"
          aria-label="Toggle menu"
        >
          <span
            className={`block h-0.5 w-6 bg-slate-300 transition ${mobileOpen ? 'translate-y-2 rotate-45' : ''}`}
          />
          <span
            className={`block h-0.5 w-6 bg-slate-300 transition ${mobileOpen ? 'opacity-0' : ''}`}
          />
          <span
            className={`block h-0.5 w-6 bg-slate-300 transition ${mobileOpen ? '-translate-y-2 -rotate-45' : ''}`}
          />
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="border-t border-white/10 bg-slate-950 px-6 pb-6 pt-4 md:hidden">
          <div className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={`text-sm font-medium transition ${
                  location.pathname === link.to
                    ? 'text-cyan-400'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <hr className="border-white/10" />
            <Link
              to="/login"
              onClick={() => setMobileOpen(false)}
              className="rounded-xl border border-white/10 px-5 py-2.5 text-center text-sm font-medium text-slate-200 transition hover:border-cyan-400"
            >
              Log in
            </Link>
            <Link
              to="/register"
              onClick={() => setMobileOpen(false)}
              className="rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-2.5 text-center text-sm font-medium text-white shadow-lg shadow-cyan-500/25"
            >
              Get started
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}