import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FAQItem {
  q: string;
  a: string;
}

interface TechnicalFaqProps {
  showToast: (msg: string) => void;
}

const FAQS: FAQItem[] = [
  {
    q: "How does the Multi-Agent pipeline UI generation work?",
    a: "The TALANTED platform orchestrates a pipeline of 11 specialized LLM agents (requirements analysis, Figma skeleton design, React/TypeScript generation, and WCAG accessibility audits) to produce optimal production-ready interface code."
  },
  {
    q: "What specification inputs are supported?",
    a: "You can submit a text prompt, a Figma JSON file or link, a Jira backlog ticket, a specifications PDF file, or even record oral meetings of your team for our agent to automatically extract functional requirements."
  },
  {
    q: "Is the generated code compliant with accessibility criteria?",
    a: "Absolutely. A critical auditing agent is dedicated to WCAG 2.1 Level AA analysis. It scans color contrast, ARIA attributes, and semantic structure, assigning a real-time accessibility score to guarantee legal compliance."
  },
  {
    q: "Are there rollback options and GitLab integration?",
    a: "Yes! Every generated version is saved with the possibility of an instant rollback. You can connect your GitLab repository to automatically push validated UI patches."
  }
];

export default function TechnicalFaq({ showToast }: TechnicalFaqProps) {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  return (
    <section className="px-4 md:px-8 py-16 bg-white border-y border-stone-200/60" id="expanded-faqs">
      <div className="max-w-4xl mx-auto flex flex-col gap-10 scroll-mt-20">

        <div className="text-center space-y-2">
          <span className="text-xs font-bold tracking-widest text-[#019cda] uppercase font-sans">HAVE QUESTIONS?</span>
          <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 pr-5 text-center">Technical Q&amp;A</h2>
          <p className="text-neutral-500 text-xs md:text-sm max-w-xl mx-auto leading-relaxed font-semibold">
            Answers regarding architecture, browser security, and offline operation formats.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {FAQS.map((faq, idx) => {
            const isExpanded = expandedFaq === idx;
            return (
              <div
                key={idx}
                className="bg-neutral-50 border border-neutral-200/70 rounded-xl overflow-hidden transition-all duration-200 cursor-pointer"
                onClick={() => {
                  setExpandedFaq(isExpanded ? null : idx);
                  showToast(`Checked FAQ block: #${idx + 1}`);
                }}
              >
                <div className="px-5 py-4 flex items-center justify-between hover:bg-neutral-100/50 transition-colors">
                  <span className="text-xs md:text-sm font-bold text-neutral-900 pr-4">{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-neutral-500 transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
                {isExpanded && (
                  <div className="px-5 pb-4 text-xs text-stone-500 border-t border-neutral-100/60 pt-3 leading-relaxed bg-white">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
