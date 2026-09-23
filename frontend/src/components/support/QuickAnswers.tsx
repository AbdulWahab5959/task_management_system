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
  const questions = categories
    .flatMap((category) => category.questions)
    .slice(0, expanded ? undefined : 3);

  if (categories.length === 0) return null;

  return (
    <div aria-label="Frequently asked questions" className="support-quick-answers">
      <div className="support-quick-answers__header">
        <div>
          <h3 className="support-quick-answers__title">Suggested topics</h3>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="support-quick-answers__toggle"
          aria-expanded={expanded}
        >
          {expanded ? 'Show less' : 'See all'}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
      </div>

      <div className="support-quick-answers__grid">
        {questions.map((faq) => (
          <button
            key={faq.slug}
            type="button"
            onClick={() => onSelect(faq.slug)}
            disabled={disabled}
            className="group support-quick-answer"
          >
            <span>{faq.question}</span>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-indigo-400" aria-hidden="true" />
          </button>
        ))}
      </div>
    </div>
  );
}
