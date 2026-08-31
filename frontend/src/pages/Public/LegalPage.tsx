import { ArrowLeft, FileText, LockKeyhole } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export type LegalSection = { id: string; title: string; content: ReactNode };

interface LegalPageProps {
  eyebrow: string;
  title: string;
  intro: string;
  updated: string;
  sections: LegalSection[];
  kind: 'privacy' | 'terms';
}

export default function LegalPage({ eyebrow, title, intro, updated, sections, kind }: LegalPageProps) {
  const Icon = kind === 'privacy' ? LockKeyhole : FileText;

  return <div className="public-container px-5 py-20 sm:px-8 sm:py-28">
    <div className="grid gap-12 lg:grid-cols-[.65fr_1.35fr]">
      <aside className="self-start lg:sticky lg:top-28">
        <Link to="/" className="mb-10 inline-flex items-center gap-2 text-sm font-bold text-slate-400 transition hover:text-[#d7f36b]"><ArrowLeft className="h-4 w-4" /> Back to LaunchStack</Link>
        <div className="flex h-12 w-12 items-center justify-center border border-[#d7f36b]/40 text-[#d7f36b]"><Icon className="h-5 w-5" /></div>
        <p className="public-kicker mt-8">{eyebrow}</p>
        <h1 className="mt-5 text-5xl font-black leading-[.95] tracking-[-.07em] text-white sm:text-6xl">{title}</h1>
        <p className="mt-6 max-w-sm text-lg leading-8 text-slate-300">{intro}</p>
        <p className="mt-8 text-xs uppercase tracking-[.12em] text-slate-500">Last updated: {updated}</p>
      </aside>
      <article className="public-panel p-6 sm:p-10 lg:p-12">
        <div className="mb-10 border-b border-[#d7f36b]/25 bg-[#d7f36b]/[.06] p-4 text-sm leading-6 text-slate-300">This starter policy is provided for the LaunchStack project and should be reviewed and adapted by qualified legal counsel before production use.</div>
        <nav aria-label={`${title} sections`} className="mb-12 border-b border-white/10 pb-8"><p className="public-kicker mb-4">On this page</p><div className="grid gap-2 sm:grid-cols-2">{sections.map((section) => <a key={section.id} href={`#${section.id}`} className="text-sm text-slate-400 underline-offset-4 transition hover:text-[#d7f36b] hover:underline">{section.title}</a>)}</div></nav>
        <div className="space-y-12">{sections.map((section) => <section key={section.id} id={section.id} className="scroll-mt-28"><h2 className="text-2xl font-bold tracking-[-.03em] text-white">{section.title}</h2><div className="mt-4 space-y-4 text-[.98rem] leading-8 text-slate-300">{section.content}</div></section>)}</div>
      </article>
    </div>
  </div>;
}
