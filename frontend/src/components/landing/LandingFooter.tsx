import React from 'react';

export default function LandingFooter() {
  const showSectionPreview = (id: string, title: string, desc: string) => {
    alert(`${title}\n\n${desc}`);
  };

  return (
    <footer className="bg-[#04081c] text-white border-t border-slate-800/50 relative z-10 w-full pt-16 lg:pt-20 font-sans" id="footer-section">
      <div className="max-w-6xl mx-auto px-6 sm:px-12">

        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8 pb-16 border-b border-slate-800/80">

          {/* Column 1: Brand Info */}
          <div className="lg:col-span-4 space-y-6 text-left">
            <div className="flex items-center gap-2 select-none">
              <span className="text-xl sm:text-2xl font-black tracking-tight text-white font-sans">talented</span>
              <span className="w-5 h-1.5 bg-[#7c3aed] rounded-sm mt-1" />
              <span className="text-xs text-slate-500 font-medium ml-2">© Talented</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 font-medium leading-relaxed max-w-sm">
              Manage your multi-agent pipelines and interfaces like never before. Whether you're a startup, enterprise or a custom builder, Talented is the perfect solution for your UI code needs. All using the latest tech to protect you and your code.
            </p>

            <div className="flex items-center gap-3 pt-2">
              {/* Facebook */}
              <a href="#facebook" className="w-9 h-9 rounded-full bg-[#0e142e] border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white hover:bg-[#7c3aed] hover:border-[#7c3aed] transition-all cursor-pointer" aria-label="Facebook">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
              </a>
              {/* Twitter / X */}
              <a href="#twitter" className="w-9 h-9 rounded-full bg-[#0e142e] border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white hover:bg-[#7c3aed] hover:border-[#7c3aed] transition-all cursor-pointer" aria-label="Twitter">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              {/* Instagram */}
              <a href="#instagram" className="w-9 h-9 rounded-full bg-[#0e142e] border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white hover:bg-[#7c3aed] hover:border-[#7c3aed] transition-all cursor-pointer" aria-label="Instagram">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
              </a>
              {/* GitLab */}
              <a href="#gitlab" className="w-9 h-9 rounded-full bg-[#0e142e] border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white hover:bg-[#7c3aed] hover:border-[#7c3aed] transition-all cursor-pointer" aria-label="GitLab">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 0 1-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 0 1 4.82 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.49h8.1l2.44-7.51A.42.42 0 0 1 18.6 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.51 1.22 3.78a.84.84 0 0 1-.3.94z"/></svg>
              </a>
            </div>
          </div>

          {/* Column 2: Navigation Links */}
          <div className="lg:col-span-2 sm:col-span-1 space-y-4 text-left">
            <h4 className="text-sm font-black text-white tracking-wider uppercase font-sans">Navigation</h4>
            <ul className="space-y-2.5 text-xs sm:text-sm text-slate-400 font-medium">
              <li><a href="#hero-section" className="hover:text-white transition-colors">Intro</a></li>
              <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
              <li><a href="#reviews-section" className="hover:text-white transition-colors">Blog</a></li>
              <li className="flex items-center">
                <a href="#careers" className="hover:text-white transition-colors">Careers</a>
                <span className="bg-[#7c3aed] text-white text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-sm ml-2 select-none tracking-wider">
                  We're Hiring!
                </span>
              </li>
              <li><a href="#faq-section" className="hover:text-white transition-colors">Help Center</a></li>
            </ul>
          </div>

          {/* Column 3: Template Links */}
          <div className="lg:col-span-2 sm:col-span-1 space-y-4 text-left">
            <h4 className="text-sm font-black text-white tracking-wider uppercase font-sans">Template</h4>
            <ul className="space-y-2.5 text-xs sm:text-sm text-slate-400 font-medium">
              <li>
                <button onClick={() => showSectionPreview('getting-started', 'Getting Started with Talented', 'Deploy, inspect, and fine-tune your multi-agent code generation pipelines.')} className="hover:text-white transition-colors text-left cursor-pointer">
                  Getting Started
                </button>
              </li>
              <li>
                <button onClick={() => showSectionPreview('style-guide', 'Style Guide', 'Learn how our design auditing agent enforces visual systems and clean spacing rules.')} className="hover:text-white transition-colors text-left cursor-pointer">
                  Style Guide
                </button>
              </li>
              <li>
                <button onClick={() => showSectionPreview('licensing', 'Licensing', 'Review commercial-use permissions, code compliance, and intellectual property safety metrics.')} className="hover:text-white transition-colors text-left cursor-pointer">
                  Licensing
                </button>
              </li>
              <li>
                <button onClick={() => showSectionPreview('changelog', 'Changelog', 'Browse recent updates, pipeline optimizer speeds, and newly integrated LLM agents.')} className="hover:text-white transition-colors text-left cursor-pointer">
                  Changelog
                </button>
              </li>
            </ul>
          </div>

          {/* Column 4: Stay in the Loop */}
          <div className="lg:col-span-4 space-y-4 text-left">
            <h4 className="text-sm font-black text-white tracking-wider uppercase font-sans">Stay in the loop</h4>
            <p className="text-xs sm:text-sm text-slate-400 font-medium leading-relaxed">
              Get notified straight away when we launch a brand new version or other awesome news
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                alert("Awesome! You've been successfully subscribed to our product updates.");
              }}
              className="flex items-stretch max-w-sm rounded-lg overflow-hidden border border-slate-800/80 bg-slate-900/30 shadow-sm"
            >
              <input
                type="email"
                placeholder="Enter email"
                required
                className="bg-transparent text-white text-xs sm:text-sm px-4 py-3 outline-none w-full placeholder-slate-500 focus:ring-1 focus:ring-[#7c3aed]/50"
              />
              <button
                type="submit"
                className="bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs sm:text-sm font-bold uppercase tracking-wider px-5 py-3 transition-colors shrink-0 cursor-pointer"
              >
                Sign Me Up
              </button>
            </form>
          </div>

        </div>

        {/* Bottom Credits Row */}
        <div className="py-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 font-mono gap-4">
          <p>
            Template made by <span className="font-semibold hover:text-white transition-colors cursor-default">Lightning Lab</span> and proudly powered by <span className="font-semibold hover:text-white transition-colors cursor-default">Webflow</span>. | Template Version: <span>1.1</span>
          </p>
          <div className="flex gap-4">
            <button onClick={() => showSectionPreview('privacy', 'Privacy Policy', 'Your source files, API keys, and pipeline telemetry are fully end-to-end encrypted.')} className="hover:text-slate-300 transition-colors cursor-pointer">
              Privacy Policy
            </button>
            <span>•</span>
            <button onClick={() => showSectionPreview('terms', 'Terms of Service', 'By using the Talented multi-agent generator, you agree to our standard licensing terms.')} className="hover:text-slate-300 transition-colors cursor-pointer">
              Terms of Service
            </button>
          </div>
        </div>

      </div>
    </footer>
  );
}
