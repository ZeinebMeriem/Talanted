import React, { useState } from 'react';
import { Sparkles, CheckCircle } from 'lucide-react';

interface NewsletterProps {
  showToast: (msg: string) => void;
}

export default function Newsletter({ showToast }: NewsletterProps) {
  const [emailInput, setEmailInput] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleNewsletter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setIsSubscribed(true);
    showToast(`🚀 Subscribed! Thank you for joining us.`);
  };

  return (
    <section className="px-4 md:px-8 py-16 max-w-4xl mx-auto text-center" id="newsletter-signup">
      <div className="bg-gradient-to-tr from-[#15395e] via-[#0b64a0] to-purple-700 rounded-3xl p-8 md:p-12 text-white shadow-xl flex flex-col items-center gap-6 relative overflow-hidden">

        <div className="absolute top-0 right-0 p-4 opacity-5">
          <Sparkles className="w-40 h-40" />
        </div>

        <span className="bg-white/10 text-white font-bold text-[10px] tracking-widest px-3 py-1 rounded-full uppercase">
          WEEKLY INSIGHTS
        </span>

        <h3 className="text-xl md:text-3xl font-semibold max-w-xl text-white font-display">
          Keep up with advanced developer templates and custom designs
        </h3>

        <p className="text-stone-100 text-xs md:text-sm max-w-lg leading-relaxed font-sans font-medium text-center">
          Join 12,000+ builders. Get pristine curated design inspirations, productivity workflows, and offline utility releases directly inside your inbox.
        </p>

        <form onSubmit={handleNewsletter} className="w-full max-w-md flex flex-col sm:flex-row gap-2.5 mt-2 z-10">
          {isSubscribed ? (
            <div className="w-full bg-white/20 p-3 rounded-lg text-xs font-bold text-emerald-200 flex items-center justify-center gap-2 font-sans animate-fade-in">
              <CheckCircle className="w-4 h-4 text-emerald-300 animate-bounce" /> Subscribed successfully! Welcome onboard.
            </div>
          ) : (
            <>
              <input
                type="email"
                required
                placeholder="Enter your professional email address"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="flex-grow bg-white text-stone-800 placeholder-stone-400 text-xs px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-violet-400 text-left font-medium"
              />
              <button
                type="submit"
                className="bg-[#18181b] hover:bg-neutral-800 text-white font-bold text-xs uppercase px-5 py-3 rounded-lg tracking-wider transition-all cursor-pointer"
              >
                Join now
              </button>
            </>
          )}
        </form>

        <p className="text-[10px] text-stone-100/80 font-semibold">
          Zero spam. Unsubscribe anytime in a single click.
        </p>

      </div>
    </section>
  );
}
