import { useAuth } from '../../hooks/useAuth';

export default function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-cyan-950/30">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Dashboard</p>
              <h1 className="mt-2 text-3xl font-semibold">Welcome, {user?.name}</h1>
              <p className="mt-2 text-slate-300">You are authenticated and can access protected content.</p>
            </div>

            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-xl border border-white/10 bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:border-cyan-400 hover:text-cyan-200"
            >
              Log out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}