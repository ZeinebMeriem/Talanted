import React, { useState } from 'react';
import { Play, X } from 'lucide-react';

interface LandingWalkthroughProps {
  showToast: (msg: string) => void;
}

export default function LandingWalkthrough({ showToast }: LandingWalkthroughProps) {
  const [videoModalOpen, setVideoModalOpen] = useState(false);

  return (
    <>
      <section
        className="py-20 lg:py-24 bg-[#050a1d] text-white relative z-10 w-full overflow-hidden"
        id="walkthrough"
      >
        {/* Ambient background glows */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_50%,rgba(124,58,237,0.06),transparent_100%)] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#00f3a4]/[0.02] rounded-full blur-[140px] pointer-events-none animate-pulse" />

        <div className="max-w-7xl mx-auto px-6 sm:px-12 relative z-10">

          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-950/40 border border-indigo-900/50 rounded-full text-xs font-semibold text-indigo-400 mb-4">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping shrink-0" />
              <span>Elite Presentation Mockup</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-normal tracking-tight leading-none mb-4">
              Watch Walkthrough Demo
            </h2>
            <p className="text-base sm:text-lg text-slate-400 leading-relaxed">
              Explore how our orchestrator coordinates 11 multi-agent developers to produce uncompressed React files scoring 100/100 WCAG accessibility compliance scores instantly.
            </p>
          </div>

          {/* Mockup card */}
          <div
            onClick={() => setVideoModalOpen(true)}
            className="relative w-full max-w-5xl mx-auto rounded-3xl overflow-hidden shadow-[0_32px_80px_rgba(2,4,12,0.6)] border border-slate-800 bg-[#0b1230] cursor-pointer group"
          >
            <img
              src="/walkthrough_mockup.png"
              alt="Talented App Walkthrough"
              className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-[1.01] opacity-90 group-hover:opacity-100"
            />

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#050a1d]/60 via-transparent to-transparent opacity-70 group-hover:opacity-50 transition-opacity duration-300" />

            {/* Hover border glow */}
            <div className="absolute inset-0 border border-purple-500/0 group-hover:border-purple-500/30 rounded-3xl transition-all duration-300 pointer-events-none" />

            {/* Play button overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-20">
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 hover:scale-110 active:scale-95 transition-transform duration-200 cursor-pointer">
                {/* Ping ring */}
                <div className="absolute inset-0 rounded-full bg-[#7c3aed]/20 animate-ping opacity-75" />
                <div className="w-full h-full rounded-full bg-gradient-to-br from-[#7c3aed] to-[#5b21b6] text-white flex items-center justify-center shadow-[0_12px_44px_rgba(124,58,237,0.6)] border border-purple-400/30 relative">
                  <Play className="w-6 h-6 sm:w-8 sm:h-8 fill-white ml-1 text-white" />
                </div>
              </div>

              <div className="px-5 py-2 bg-[#050a1d]/90 backdrop-blur-md border border-indigo-950 text-xs font-bold rounded-full tracking-wider uppercase text-indigo-300 shadow-md select-none">
                Watch 2-Min Demo Walkthrough
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Video Modal */}
      {videoModalOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setVideoModalOpen(false)}
        >
          <div
            className="relative w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl bg-[#04081c] border border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setVideoModalOpen(false)}
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            {/* Replace this div with an actual <iframe> embed when you have a video URL */}
            <div className="w-full aspect-video bg-[#080e26] flex flex-col items-center justify-center gap-3">
              <Play className="w-12 h-12 text-slate-600" />
              <p className="text-slate-500 text-sm font-medium">Paste your YouTube/Vimeo embed URL here</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
