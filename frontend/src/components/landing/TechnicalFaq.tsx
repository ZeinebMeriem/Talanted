import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';

interface TechnicalFaqProps {
  showToast: (msg: string) => void;
}

const FAQS = [
  {
    id: 'multi-agent',
    question: 'How does the Multi-Agent pipeline UI generation work?',
    answer:
      'The TALANTED platform orchestrates a pipeline of 11 specialized LLM agents (requirements analysis, Figma skeleton design, React/TypeScript generation, and WCAG accessibility audits) to produce optimal production-ready interface code.',
  },
  {
    id: 'spec-inputs',
    question: 'What specification inputs are supported?',
    answer:
      'You can submit a text prompt, a Figma JSON file or link, a Jira backlog ticket, a specifications PDF file, or even record oral meetings of your team for our agent to automatically extract functional requirements.',
  },
  {
    id: 'accessibility',
    question: 'Is the generated code compliant with accessibility criteria?',
    answer:
      'Absolutely. A critical auditing agent is dedicated to WCAG 2.1 Level AA analysis. It scans color contrast, ARIA attributes, and semantic structure, assigning a real-time accessibility score to guarantee legal compliance.',
  },
  {
    id: 'rollback',
    question: 'Are there rollback options and GitLab integration?',
    answer:
      'Yes! Every generated version is saved with the possibility of an instant rollback. You can connect your GitLab repository to automatically push validated UI patches.',
  },
];

export default function TechnicalFaq({ showToast }: TechnicalFaqProps) {
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  return (
    <section className="py-20 lg:py-24 bg-white relative z-10 w-full" id="faq-section">
      <div className="max-w-4xl mx-auto px-6 sm:px-12">

        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-normal tracking-tight text-slate-900 font-sans leading-tight">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-4 max-w-3xl mx-auto">
          {FAQS.map((item) => {
            const isExpanded = expandedFaq === item.id;
            return (
              <div key={item.id} className="transition-all duration-300">
                {isExpanded ? (
                  <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-sm">
                    <div
                      onClick={() => setExpandedFaq(null)}
                      className="bg-[#080e26] p-6 flex items-center justify-between cursor-pointer select-none"
                    >
                      <h4 className="text-sm sm:text-base font-extrabold text-white text-left pr-4 leading-snug">
                        {item.question}
                      </h4>
                      <div className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white shrink-0 transition-colors">
                        <X className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="p-6 sm:p-8 text-left bg-white">
                      <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                        {item.answer}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => setExpandedFaq(item.id)}
                    className="border border-slate-200 rounded-xl bg-white p-5 sm:p-6 flex items-center justify-between cursor-pointer hover:bg-slate-50/70 transition-all select-none group"
                  >
                    <h4 className="text-sm sm:text-base font-extrabold text-slate-800 text-left pr-4 leading-snug group-hover:text-slate-950 transition-colors">
                      {item.question}
                    </h4>
                    <div className="w-7 h-7 flex items-center justify-center text-[#7c3aed] shrink-0 group-hover:scale-110 transition-transform">
                      <Plus className="w-5 h-5 stroke-[2.5]" />
                    </div>
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
