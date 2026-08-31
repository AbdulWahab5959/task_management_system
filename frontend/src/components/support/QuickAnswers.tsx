import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import type { SupportFaqCategory } from '../../types/support.types';

interface QuickAnswersProps {
  faqs: SupportFaqCategory[];
  onSelect: (slug: string) => void;
  disabled?: boolean;
}

export default function QuickAnswers({ faqs, onSelect, disabled = false }: QuickAnswersProps) {
  const categories = faqs.filter((category) => category.questions.length > 0);
  const [expanded, setExpanded] = useState(false);

  if (categories.length === 0) return null;

  return (
    <div aria-label="Frequently asked questions" className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div>
          <h3 className="text-xs font-bold text-slate-800">Start with a topic</h3>
          <p className="mt-0.5 text-[11px] text-slate-400">Common questions, answered instantly</p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-semibold text-indigo-600 transition hover:bg-indigo-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          aria-expanded={expanded}
        >
          {expanded ? 'Show less' : 'See all'}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
      </div>

      {categories.map((category, categoryIndex) => {
        const questions = category.questions.slice(0, expanded ? undefined : categoryIndex === 0 ? 4 : 0);
        if (questions.length === 0) return null;
        return (
        <section key={category.category}>
          <h4 className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">{category.category}</h4>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {questions.map((faq) => (
              <button
                key={faq.slug}
                type="button"
                onClick={() => onSelect(faq.slug)}
                disabled={disabled}
                className="group flex min-h-10 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 text-left text-xs font-semibold text-slate-600 shadow-sm transition duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 hover:border-indigo-200 hover:text-indigo-700 disabled:opacity-60"
              >
                <span>{faq.question}</span>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-indigo-400" aria-hidden="true" />
              </button>
            ))}
          </div>
        </section>
        );
      })}
    </div>
  );
}
