import { ArrowLeft, CheckCircle2, LogOut, Mail, ShieldCheck, UserPlus, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../components/common/Button';
import { Card, CardContent } from '../components/common/Card';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useAuth } from '../hooks/useAuth';
import { useTenant } from '../hooks/useTenant';
import { teamInvitationsService } from '../services/team-invitations.service';
import type { InvitationPreview } from '../types/team-invitation.types';

export default function InvitationAcceptPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') ?? '';
  const { user, logout } = useAuth();
  const { refreshTenants, selectTenant } = useTenant();
  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    if (!token) {
      queueMicrotask(() => {
        setLoading(false);
        setError('This invitation link is missing its secure token.');
      });
      return () => { mounted = false; };
    }
    queueMicrotask(() => {
      void teamInvitationsService.preview(token).then((response) => {
        if (mounted) setPreview(response.data.data);
      }).catch(() => {
        if (mounted) setError('This invitation is no longer available.');
      }).finally(() => {
        if (mounted) setLoading(false);
      });
    });
    return () => { mounted = false; };
  }, [token]);

  const respond = async (action: 'accept' | 'reject') => {
    setWorking(true);
    setError('');
    try {
      const response = action === 'accept' ? await teamInvitationsService.accept(token) : await teamInvitationsService.reject(token);
      const nextMessage = response.data.message ?? (action === 'accept' ? 'Invitation accepted.' : 'Invitation rejected.');
      if (action === 'accept') {
        const tenants = await refreshTenants();
        const joinedTenant = tenants.find((tenant) => tenant.id === response.data.tenant_id);
        if (joinedTenant) selectTenant(joinedTenant.id);
        navigate('/dashboard/team', { replace: true, state: { teamMessage: `You joined ${preview?.tenant_name ?? 'this organization'}.` } });
        return;
      }
      setMessage(nextMessage);
    } catch (exception: unknown) {
      setError((exception as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Unable to process this invitation.');
    } finally {
      setWorking(false);
    }
  };

  const authRedirect = `/invite/accept?token=${encodeURIComponent(token)}`;
  const invitedEmail = preview?.email ?? '';
  const loginUrl = `/login?redirect=${encodeURIComponent(authRedirect)}&email=${encodeURIComponent(invitedEmail)}`;
  const registerUrl = `/register?redirect=${encodeURIComponent(authRedirect)}&email=${encodeURIComponent(invitedEmail)}`;

  const signOutAndContinue = async () => {
    await logout();
    navigate(loginUrl, { replace: true });
  };

  return <div className="flex min-h-screen items-center justify-center bg-slate-950 px-5 py-10"><Card className="w-full max-w-lg"><CardContent className="p-7 text-center sm:p-9">{loading ? <LoadingSpinner label="Checking invitation" /> : error ? <><XCircle className="mx-auto h-12 w-12 text-rose-500" aria-hidden="true" /><h1 className="mt-5 text-xl font-semibold text-slate-950">Invitation unavailable</h1><p className="mt-2 text-sm text-slate-500">{error}</p><Link className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-500" to="/dashboard"><ArrowLeft className="h-4 w-4" />Back to dashboard</Link></> : message ? <><CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" aria-hidden="true" /><h1 className="mt-5 text-xl font-semibold text-slate-950">{message}</h1><Link className="mt-6 inline-flex text-sm font-semibold text-indigo-600 hover:text-indigo-500" to="/dashboard">Continue to LaunchStack</Link></> : preview ? <><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><Mail className="h-7 w-7" aria-hidden="true" /></div><p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Team invitation</p><h1 className="mt-2 text-2xl font-semibold text-slate-950">Join {preview.tenant_name}</h1><p className="mt-3 text-sm leading-6 text-slate-500">{preview.inviter_name ?? 'A LaunchStack administrator'} invited <strong>{preview.email}</strong> as a {preview.role}.</p>{user ? user.email.toLowerCase() === preview.email.toLowerCase() ? <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center"><Button isLoading={working} icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />} onClick={() => void respond('accept')}>Accept invitation</Button><Button variant="secondary" disabled={working} icon={<XCircle className="h-4 w-4" aria-hidden="true" />} onClick={() => void respond('reject')}>Decline</Button></div> : <div className="mt-7 rounded-xl border border-amber-200 bg-amber-50 p-4 text-left"><h2 className="font-semibold text-amber-950">Wrong account signed in</h2><p className="mt-1 text-sm leading-6 text-amber-900">This invitation was sent to <strong>{preview.email}</strong>, but you are currently signed in as <strong>{user.email}</strong>.</p><div className="mt-4 flex flex-col gap-2 sm:flex-row"><Button size="sm" icon={<LogOut className="h-4 w-4" aria-hidden="true" />} onClick={() => void signOutAndContinue()}>Sign out and continue</Button><Link to="/dashboard"><Button size="sm" variant="secondary">Back to dashboard</Button></Link></div></div> : <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center"><Link to={loginUrl}><Button icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />}>Sign in to accept</Button></Link><Link to={registerUrl}><Button variant="secondary" icon={<UserPlus className="h-4 w-4" aria-hidden="true" />}>Create account to accept invitation</Button></Link></div>}</> : null}</CardContent></Card></div>;
}
