import React from 'react';

export default function LandingFooter() {
  return (
    <footer className="bg-stone-50 border-t border-stone-200/60 px-4 md:px-8 py-10 text-center">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-[#15395e] flex items-center justify-center text-white text-[11px] font-bold">
            t
          </span>
          <span className="text-xs font-bold font-display text-neutral-850">talanted Workspace</span>
        </div>

        <p className="text-[11px] text-gray-400 font-semibold font-sans">
          &copy; {new Date().getFullYear()} talanted. Designed and developed with high-quality Multi-Agent pipelines. All Rights Reserved.
        </p>

        <div className="flex items-center gap-6 text-[11px] font-bold text-neutral-500">
          <a href="#" className="hover:text-neutral-900 transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-neutral-900 transition-colors">Terms of Service</a>
          <a href="#" className="hover:text-neutral-900 transition-colors">Contact Partners</a>
        </div>

      </div>
    </footer>
  );
}
