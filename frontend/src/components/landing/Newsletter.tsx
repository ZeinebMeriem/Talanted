import React, { useState } from 'react';
import { CheckCircle } from 'lucide-react';

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
    showToast('Subscribed! Thank you for joining us.');
  };

  return (
    <section className="py-20 lg:py-24 bg-white relative z-10 w-full" id="newsletter-signup">
      <div className="max-w-5xl mx-auto px-6 sm:px-12">

        <div className="bg-[#04081c] rounded-3xl px-8 py-16 md:px-16 md:py-20 text-white shadow-2xl flex flex-col items-center gap-7 relative overflow-hidden text-center border border-slate-800/60">

          <style>{`@keyframes float-star{0%,100%{transform:translateY(0px)}50%{transform:translateY(-18px)}}`}</style>
          <div className="absolute top-4 right-6 opacity-10 select-none pointer-events-none text-white text-[120px] font-black leading-none" style={{animation:'float-star 3.5s ease-in-out infinite'}}>✦</div>

          <span className="bg-white/15 text-white font-extrabold text-[10px] sm:text-xs tracking-widest px-4 py-1.5 rounded-full uppercase border border-white/20 select-none">
            Weekly Insights
          </span>

          <h2 className="text-2xl sm:text-3xl lg:text-[38px] font-normal tracking-tight text-white font-sans leading-tight max-w-2xl">
            Keep up with advanced developer templates and custom designs
          </h2>

          <p className="text-sm text-white/80 font-medium leading-relaxed max-w-lg">
            Join 12,000+ builders. Get pristine curated design inspirations, productivity workflows, and offline utility releases directly inside your inbox.
          </p>

          <form onSubmit={handleNewsletter} className="w-full max-w-md flex items-stretch gap-0 mt-2 z-10 rounded-xl overflow-hidden shadow-lg">
            {isSubscribed ? (
              <div className="w-full bg-white/20 p-4 rounded-xl text-sm font-bold text-emerald-200 flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-300" /> Subscribed successfully! Welcome onboard.
              </div>
            ) : (
              <>
                <input
                  type="email"
                  required
                  placeholder="Enter your professional email address"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="flex-grow bg-white text-slate-800 placeholder-slate-400 text-sm px-5 py-4 outline-none font-medium"
                />
                <button
                  type="submit"
                  className="bg-white hover:bg-slate-100 text-slate-900 font-extrabold text-xs uppercase px-6 py-4 tracking-widest transition-colors cursor-pointer shrink-0"
                >
                  Join Now
                </button>
              </>
            )}
          </form>

          <p className="text-xs text-white/60 font-medium">
            Zero spam. Unsubscribe anytime in a single click.
          </p>

        </div>
      </div>
    </section>
  );
}
