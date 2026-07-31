import { useEffect, useState } from 'react';
import { api } from '../services/api';

type HealthResponse = {
  status: string;
  message: string;
};

export default function HealthCheckPage() {
  const [message, setMessage] = useState('Checking backend connection...');
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const checkHealth = async () => {
      try {
        const response = await api.get<HealthResponse>('/health');

        if (!active) {
          return;
        }

        setConnected(response.data.status === 'ok');
        setMessage(response.data.message);
      } catch {
        if (!active) {
          return;
        }

        setConnected(false);
        setMessage('Unable to reach the backend health endpoint.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void checkHealth();

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-4xl items-center px-6 py-12">
        <section className="w-full overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl shadow-cyan-950/30">
          <div className="grid gap-8 bg-[radial-gradient(circle_at_top_right,_rgba(34,211,238,0.18),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(59,130,246,0.16),_transparent_30%)] p-8 md:grid-cols-[1.3fr_0.7fr] md:p-12">
            <div className="space-y-6">
              <p className="inline-flex rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-sm font-medium text-cyan-200">
                LaunchStack local setup
              </p>
              <div className="space-y-3">
                <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">
                  Backend health check
                </h1>
                <p className="max-w-xl text-base leading-7 text-slate-300 md:text-lg">
                  This page confirms the frontend can talk to the Laravel API at the configured
                  local base URL.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
                <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Status</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {loading ? 'Connecting...' : connected ? 'Connected' : 'Disconnected'}
                </p>
                <p className="mt-2 text-slate-300">{message}</p>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-8 text-center shadow-inner shadow-cyan-500/10">
                <div
                  className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full text-2xl font-semibold ${
                    loading
                      ? 'bg-slate-800 text-slate-200'
                      : connected
                        ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30'
                        : 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/30'
                  }`}
                >
                  {loading ? '...' : connected ? 'OK' : 'NO'}
                </div>
                <p className="mt-4 text-sm text-slate-400">Frontend ready for future SaaS modules</p>
                <p className="mt-1 text-sm text-slate-500">Auth, billing, and tenancy stay disabled for now.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}