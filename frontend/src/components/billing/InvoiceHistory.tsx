import { AlertCircle, ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, Download, ExternalLink, FileText, X, XCircle } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import EmptyState from '../dashboard/EmptyState';
import { downloadInvoice, getInvoice, getInvoices, type InvoiceRecord, type InvoiceStatus } from '../../services/billing.service';
import { cn } from '../../utils/cn';

const money = (value: string, currency: string) => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(value));
const date = (value?: string | null) => value ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value)) : 'Not available';
const statusLabel = (status: InvoiceStatus) => status[0].toUpperCase() + status.slice(1);

function Status({ status }: { status: InvoiceStatus }) {
  const styles = {
    paid: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    pending: 'bg-amber-50 text-amber-800 ring-amber-100',
    failed: 'bg-rose-50 text-rose-700 ring-rose-100',
  }[status];
  const Icon = status === 'paid' ? CheckCircle2 : status === 'failed' ? XCircle : CalendarDays;
  return <span className={cn('inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ring-1', styles)}><Icon className="h-3.5 w-3.5" aria-hidden="true" />{statusLabel(status)}</span>;
}

function Skeleton() {
  return <div className="space-y-3" aria-label="Loading invoice history" role="status">{[1, 2, 3].map((item) => <div key={item} className="grid h-16 animate-pulse grid-cols-5 gap-4 rounded-xl bg-slate-100 px-4 py-3" />)}</div>;
}

export default function InvoiceHistory() {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 15, total: 0 });
  const [status, setStatus] = useState<InvoiceStatus | ''>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<InvoiceRecord | null>(null);
  const [downloadId, setDownloadId] = useState<number | null>(null);
  const [notice, setNotice] = useState('');
  const closeButton = useRef<HTMLButtonElement>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const result = await getInvoices({ status, from, to, page }); setInvoices(result.data); setMeta(result.meta); }
    catch { setError('Invoice history is unavailable right now.'); }
    finally { setLoading(false); }
  }, [from, page, status, to]);

  useEffect(() => {
    const fetchInvoices = async () => { await load(); };
    void fetchInvoices();
  }, [load]);
  useEffect(() => {
    if (!selected) return;
    closeButton.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setSelected(null); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [selected]);

  const openInvoice = async (invoice: InvoiceRecord) => { try { setSelected(await getInvoice(invoice.id)); } catch { setNotice('We could not open this invoice. Please try again.'); } };
  const download = async (invoice: InvoiceRecord) => {
    if (downloadId !== null) return;
    setDownloadId(invoice.id); setNotice('');
    try { const blob = await downloadInvoice(invoice.id); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `invoice-${invoice.id}.pdf`; link.click(); URL.revokeObjectURL(url); setNotice(`${invoice.invoice_number} downloaded.`); }
    catch { setNotice('This invoice PDF is not available yet.'); }
    finally { setDownloadId(null); }
  };
  const reset = () => { setStatus(''); setFrom(''); setTo(''); setPage(1); };
  const filtersActive = Boolean(status || from || to);

  return <section id="invoice-history" className="mt-8 scroll-mt-24" aria-labelledby="invoice-history-title">
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[11px] font-bold uppercase tracking-widest text-indigo-600">Records</p><h2 id="invoice-history-title" className="mt-1 text-xl font-bold tracking-tight text-slate-950">Invoice history</h2><p className="mt-1 text-sm text-slate-500">A secure record of invoices issued to your account.</p></div><div aria-live="polite" className="text-sm text-slate-500 tabular-nums">{meta.total} {meta.total === 1 ? 'invoice' : 'invoices'}</div></div>
    <div className="mb-4 flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"><label className="min-w-36 flex-1 text-xs font-semibold text-slate-600">Status<select aria-label="Filter invoices by status" value={status} onChange={(e) => { setStatus(e.target.value as InvoiceStatus | ''); setPage(1); }} className="dashboard-control mt-1"><option value="">All statuses</option><option value="paid">Paid</option><option value="pending">Pending</option><option value="failed">Failed</option></select></label><label className="min-w-36 flex-1 text-xs font-semibold text-slate-600">From<input aria-label="Invoice date from" type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className="dashboard-control mt-1" /></label><label className="min-w-36 flex-1 text-xs font-semibold text-slate-600">To<input aria-label="Invoice date to" type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className="dashboard-control mt-1" /></label>{filtersActive ? <button type="button" onClick={reset} className="min-h-10 rounded-lg px-3 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200">Reset filters</button> : null}</div>
    {notice ? <div role="status" className="mb-4 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">{notice}</div> : null}
    {error ? <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-800"><div className="flex items-center gap-2"><AlertCircle className="h-4 w-4" />{error}<button type="button" onClick={() => void load()} className="ml-auto min-h-10 rounded-lg px-3 font-semibold hover:bg-rose-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300">Retry</button></div></div> : loading && invoices.length === 0 ? <Skeleton /> : invoices.length === 0 ? <div className="rounded-xl border border-slate-200 bg-white px-6 py-10 shadow-sm"><EmptyState icon={<FileText className="h-6 w-6" aria-hidden="true" />} title={filtersActive ? 'No matching invoices' : 'No invoices yet'} description={filtersActive ? 'Try resetting the filters to see all account invoices.' : 'Invoices appear here after your first paid or pending billing event.'} /></div> : <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="hidden md:block"><table className="dashboard-table"><thead><tr><th>Invoice</th><th>Plan</th><th>Date</th><th className="text-right">Amount</th><th>Status</th><th className="text-right">Actions</th></tr></thead><tbody>{invoices.map((invoice) => <tr key={invoice.id}><td><button type="button" onClick={() => void openInvoice(invoice)} className="min-h-10 text-left font-mono text-xs font-semibold text-slate-900 hover:text-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200">{invoice.invoice_number}</button></td><td>{invoice.plan ?? 'Plan unavailable'}</td><td>{date(invoice.invoice_date)}</td><td className="text-right font-semibold text-slate-950 tabular-nums">{money(invoice.amount, invoice.currency)}</td><td><Status status={invoice.status} /></td><td><div className="flex justify-end gap-1"><button type="button" onClick={() => void openInvoice(invoice)} aria-label={`View invoice ${invoice.invoice_number}`} className="min-h-10 rounded-lg px-2.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200">View</button>{invoice.invoice_pdf_available ? <button type="button" onClick={() => void download(invoice)} disabled={downloadId !== null} aria-label={`Download invoice ${invoice.invoice_number} PDF`} className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200"><Download className="h-3.5 w-3.5" />PDF</button> : null}</div></td></tr>)}</tbody></table></div>
      <div className="divide-y divide-slate-100 md:hidden">{invoices.map((invoice) => <article key={invoice.id} className="space-y-3 p-4"><div className="flex items-start justify-between gap-3"><div><button type="button" onClick={() => void openInvoice(invoice)} className="min-h-10 font-mono text-xs font-semibold text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200">{invoice.invoice_number}</button><p className="text-sm text-slate-500">{invoice.plan ?? 'Plan unavailable'}</p></div><Status status={invoice.status} /></div><div className="flex items-end justify-between gap-3"><div><p className="text-xs text-slate-500">Issued {date(invoice.invoice_date)}</p><p className="text-lg font-bold text-slate-950 tabular-nums">{money(invoice.amount, invoice.currency)}</p></div><div className="flex gap-1"><button type="button" onClick={() => void openInvoice(invoice)} className="min-h-10 rounded-lg px-3 text-xs font-semibold text-indigo-700 hover:bg-indigo-50">View</button>{invoice.invoice_pdf_available ? <button type="button" onClick={() => void download(invoice)} disabled={downloadId !== null} aria-label={`Download invoice ${invoice.invoice_number} PDF`} className="min-h-10 rounded-lg px-3 text-xs font-semibold text-slate-600 hover:bg-slate-100">PDF</button> : null}</div></div></article>)}</div>
      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3"><span className="text-xs text-slate-500 tabular-nums">Page {meta.current_page} of {meta.last_page}</span><div className="flex gap-1"><button type="button" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} aria-label="Previous invoice page" className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40"><ArrowLeft className="h-4 w-4" /></button><button type="button" disabled={page >= meta.last_page || loading} onClick={() => setPage((value) => value + 1)} aria-label="Next invoice page" className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40"><ArrowRight className="h-4 w-4" /></button></div></div>
    </div>}
    {selected ? <div className="fixed inset-0 z-50 bg-slate-950/40" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}><aside role="dialog" aria-modal="true" aria-labelledby="invoice-detail-title" className="ml-auto flex h-full w-full max-w-md flex-col bg-white shadow-2xl"><div className="flex items-start justify-between border-b border-slate-100 px-5 py-5"><div><p className="text-[11px] font-bold uppercase tracking-widest text-indigo-600">Invoice detail</p><h2 id="invoice-detail-title" className="mt-1 font-mono text-base font-bold text-slate-950">{selected.invoice_number}</h2></div><button ref={closeButton} type="button" onClick={() => setSelected(null)} aria-label="Close invoice details" className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200"><X className="h-5 w-5" /></button></div><div className="flex-1 space-y-5 overflow-y-auto px-5 py-6"><div className="flex items-center justify-between"><span className="text-sm text-slate-500">Payment status</span><Status status={selected.status} /></div><div className="grid grid-cols-2 gap-x-4 gap-y-5 text-sm"><div><p className="text-xs text-slate-500">Plan</p><p className="mt-1 font-semibold text-slate-900">{selected.plan ?? 'Plan unavailable'}</p></div><div><p className="text-xs text-slate-500">Invoice date</p><p className="mt-1 font-semibold text-slate-900">{date(selected.invoice_date)}</p></div><div><p className="text-xs text-slate-500">Amount</p><p className="mt-1 font-semibold text-slate-950 tabular-nums">{money(selected.amount, selected.currency)}</p></div><div><p className="text-xs text-slate-500">Currency</p><p className="mt-1 font-semibold uppercase text-slate-900">{selected.currency}</p></div><div className="col-span-2"><p className="text-xs text-slate-500">Billing period</p><p className="mt-1 font-semibold text-slate-900">{selected.billing_period_start ? `${date(selected.billing_period_start)} to ${date(selected.billing_period_end)}` : 'Not available'}</p></div><div><p className="text-xs text-slate-500">Paid date</p><p className="mt-1 font-semibold text-slate-900">{date(selected.paid_at)}</p></div>{selected.payment_reference ? <div><p className="text-xs text-slate-500">Payment reference</p><p className="mt-1 break-all font-mono text-xs text-slate-900">{selected.payment_reference}</p></div> : null}</div></div><div className="space-y-2 border-t border-slate-100 px-5 py-5">{selected.invoice_url ? <a href={selected.invoice_url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300">View invoice <ExternalLink className="h-4 w-4" /></a> : null}{selected.invoice_pdf_available ? <button type="button" onClick={() => void download(selected)} disabled={downloadId !== null} className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><Download className="h-4 w-4" />{downloadId === selected.id ? 'Preparing PDF...' : 'Download PDF'}</button> : <p className="text-xs leading-5 text-slate-500">A PDF download will appear when Stripe makes this invoice available.</p>}</div></aside></div> : null}
  </section>;
}
