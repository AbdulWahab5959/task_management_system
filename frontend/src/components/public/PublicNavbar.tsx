import { ArrowUpRight, LayoutDashboard, Menu, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/contact', label: 'Contact' },
  { to: '/chatbots', label: 'Chatbots' },
];

export default function PublicNavbar() {
  const location = useLocation();
  const { user, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAuthenticated = Boolean(user);

  return (
    <nav className="public-nav fixed left-0 right-0 top-0 z-50">
      <div className="public-container flex items-center justify-between px-5 py-4 sm:px-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3" aria-label="LaunchStack home">
          <span className="public-mark">L<span>/</span></span>
          <span className="public-wordmark">LaunchStack</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden items-center gap-7 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`public-nav-link text-sm font-medium transition ${
                location.pathname === link.to
                  ? 'is-active'
                  : ''
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop Auth Buttons */}
        {!loading ? <div className="hidden items-center gap-3 md:flex">
          {isAuthenticated ? <Link to="/dashboard" className="public-button public-button--lime"><LayoutDashboard className="h-4 w-4" aria-hidden="true" /> Dashboard</Link> : <>
            <Link to="/login" className="public-button public-button--quiet">Log in</Link>
            <Link to="/register" className="public-button public-button--lime">Start building <ArrowUpRight className="h-4 w-4" /></Link>
          </>}
        </div> : null}

        {/* Mobile Toggle */}
        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          className="public-menu-button md:hidden"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="public-mobile-menu px-5 pb-6 pt-3 md:hidden">
          <div className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                  className={`public-nav-link text-sm font-medium transition ${
                  location.pathname === link.to
                    ? 'is-active'
                    : ''
                }`}
              >
                {link.label}
              </Link>
            ))}
            <hr className="border-white/10" />
            {!loading ? (isAuthenticated ? <Link to="/dashboard" onClick={() => setMobileOpen(false)} className="public-button public-button--lime"><LayoutDashboard className="h-4 w-4" aria-hidden="true" /> Dashboard</Link> : <>
            <Link to="/login" onClick={() => setMobileOpen(false)} className="public-button public-button--quiet">Log in</Link>
              <Link to="/register" onClick={() => setMobileOpen(false)} className="public-button public-button--lime">Start building <ArrowUpRight className="h-4 w-4" /></Link>
            </> ) : null}
          </div>
        </div>
      )}
    </nav>
  );
}
