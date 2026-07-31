import { Link } from 'react-router-dom';

export default function PublicFooter() {
  return (
    <footer className="border-t border-white/10 bg-slate-950">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 text-xs font-bold text-white">
                L
              </div>
              <span className="text-base font-bold text-white">LaunchStack</span>
            </Link>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              The modern SaaS boilerplate for building and launching your next big idea.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-white">Navigation</h3>
            <div className="flex flex-col gap-2">
              <Link to="/" className="text-sm text-slate-400 transition hover:text-cyan-400">
                Home
              </Link>
              <Link to="/about" className="text-sm text-slate-400 transition hover:text-cyan-400">
                About
              </Link>
              <Link to="/contact" className="text-sm text-slate-400 transition hover:text-cyan-400">
                Contact
              </Link>
            </div>
          </div>

          {/* Auth */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-white">Account</h3>
            <div className="flex flex-col gap-2">
              <Link to="/login" className="text-sm text-slate-400 transition hover:text-cyan-400">
                Log in
              </Link>
              <Link to="/register" className="text-sm text-slate-400 transition hover:text-cyan-400">
                Register
              </Link>
            </div>
          </div>

          {/* Legal */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-white">Legal</h3>
            <div className="flex flex-col gap-2">
              <span className="text-sm text-slate-400">Privacy Policy</span>
              <span className="text-sm text-slate-400">Terms of Service</span>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 text-center text-sm text-slate-500">
          &copy; {new Date().getFullYear()} LaunchStack. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
