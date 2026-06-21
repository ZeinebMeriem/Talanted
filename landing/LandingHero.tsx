import React from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';

interface LandingHeroProps {
  onRegister?: () => void;
  onDemoEntry?: (firstName: string, lastName: string, username: string, email: string) => void;
  showToast?: (msg: string) => void;
}

export default function LandingHero({
  onRegister,
  onDemoEntry,
  showToast
}: LandingHeroProps) {
  const gradientText = "bg-gradient-to-r from-[#15395e] via-[#019cda] to-purple-600 bg-clip-text text-transparent";

  return (
    <section className="relative px-4 py-20 bg-white border-b border-stone-200 overflow-hidden flex flex-col items-center text-center">
      
      {/* Ambient background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-60 z-0 pointer-events-none"></div>

      <div className="max-w-4xl w-full mx-auto relative z-10 space-y-7 flex flex-col items-center">
        
        <div className="inline-flex items-center gap-2 bg-[#019cda]/6 border border-[#019cda]/20 px-3.5 py-1.5 rounded-full text-[10px] font-extrabold text-[#15395e] tracking-wider uppercase">
          <Sparkles className="w-3 h-3 text-[#019cda] fill-[#019cda]/20" />
          <span>PIXSO IA TALANTED COLLABORATIVE PLATFORM v2.0</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-neutral-900 leading-tight">
          Generate UIs with <br/>
          the Multi-Agent AI of <span className={gradientText}>talanted</span>
        </h1>

        <p className="text-stone-500 text-sm md:text-md max-w-2xl leading-relaxed">
          Design and development of a full-stack platform for user interface generation through a multi-agent LLM pipeline and intelligent meeting transcription. Enter your prompt, PDF, Jira ticket, or Figma design, and let AI generate accessible code with real-time WCAG 2.1 AA audits.
        </p>

        {/* Button Controls and demo triggers */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mt-8 z-20">
          <button
            onClick={onRegister}
            className="w-full sm:w-auto px-6 py-3 bg-[#15395e] hover:bg-opacity-95 text-white font-bold text-xs tracking-wider uppercase rounded-lg transition-all shadow-xl hover:shadow-[#019cda]/10 active:scale-95 flex items-center justify-center gap-2 cursor-pointer text-center"
          >
            Create my account
          </button>
          <button
            onClick={() => {
              if (onDemoEntry) {
                onDemoEntry("Meriem", "Boukraa", "developer_space", "you@example.com");
              } else if (showToast) {
                showToast("⚡ Logging you in directly as demo user!");
              }
            }}
            className="w-full sm:w-auto px-6 py-3 bg-white hover:bg-neutral-50 text-neutral-800 font-semibold text-xs tracking-wider uppercase rounded-lg border border-neutral-300 transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
          >
            Quick user demo &rarr;
          </button>
        </div>

        {/* Visual Mockup Frame */}
        <div className="w-full max-w-md mt-12 bg-white/90 border border-stone-200/80 rounded-2xl p-4 shadow-xl flex items-center gap-4 text-left z-10 hover:scale-[1.02] transition-transform duration-300">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#15395e] via-[#0b64a0] to-[#019cda] flex items-center justify-center text-white shrink-0 shadow-lg">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="text-[13px] font-bold text-neutral-950 flex items-center gap-2">
              talanted multi-agents pipeline
              <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full font-bold">ACTIVE DEPLOY</span>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">Access your secure developer workspace.</p>
          </div>
          <ArrowRight className="w-5 h-5 ml-auto text-neutral-400" />
        </div>

      </div>

    </section>
  );
}
