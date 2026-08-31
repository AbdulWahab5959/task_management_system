import { Link } from 'react-router-dom';

export default function PublicFooter() {
  return (
    <footer className="public-footer border-t border-white/10">
      <div className="public-container px-5 py-12 sm:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center gap-2">
              <span className="public-mark public-mark--small">L<span>/</span></span>
              <span className="public-wordmark">LaunchStack</span>
            </Link>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              The modern SaaS boilerplate for building and launching your next big idea.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="public-kicker mb-3">Navigation</h3>
            <div className="flex flex-col gap-2">
              <Link to="/" className="public-footer-link text-sm transition">
                Home
              </Link>
              <Link to="/about" className="public-footer-link text-sm transition">
                About
              </Link>
              <Link to="/contact" className="public-footer-link text-sm transition">
                Contact
              </Link>
            </div>
          </div>

          {/* Auth */}
          <div>
            <h3 className="public-kicker mb-3">Account</h3>
            <div className="flex flex-col gap-2">
              <Link to="/login" className="public-footer-link text-sm transition">
                Log in
              </Link>
              <Link to="/register" className="public-footer-link text-sm transition">
                Register
              </Link>
            </div>
          </div>

          {/* Legal */}
          <div>
            <h3 className="public-kicker mb-3">Legal</h3>
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
