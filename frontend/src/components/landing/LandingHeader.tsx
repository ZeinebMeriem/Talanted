import React from 'react';

interface LandingHeaderProps {
  isLoggedIn?: boolean;
  onLogin?: () => void;
  onLogout?: () => void;
  onRegister?: () => void;
  onPreview?: (section: string) => void;
}

const NAV_LINKS = [
  { label: 'Features',    href: '#features' },
  { label: 'How it Works', href: '#walkthrough' },
  { label: 'Pricing',     href: '#pricing' },
  { label: 'Reviews',     href: '#reviews-section' },
  { label: 'FAQ',         href: '#faq-section' },
];

export default function LandingHeader({
  isLoggedIn = false,
  onLogin,
  onLogout,
  onRegister,
  onPreview,
}: LandingHeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 select-none">
      <div className="w-full max-w-7xl mx-auto px-6 sm:px-12 h-20 flex items-center justify-between">

        {/* Logo */}
        <a href="#" className="flex items-center gap-1.5 cursor-pointer group">
          <span className="text-xl font-black tracking-tighter text-slate-900 font-sans group-hover:text-[#7c3aed] transition-colors">
            talented
          </span>
          <span className="w-4 h-1 bg-[#7c3aed] rounded-sm mt-1.5 transition-transform duration-300 group-hover:scale-x-125 inline-block" />
        </a>

        {/* Nav links */}
        <nav className="hidden lg:flex items-center gap-7 text-[14px]">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-slate-600 hover:text-[#7c3aed] transition-colors font-medium"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* CTA buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={onLogin}
            className="px-6 py-2.5 text-sm font-semibold text-[#7c3aed] hover:text-[#5b21b6] hover:bg-purple-50/50 transition-all cursor-pointer bg-white rounded border border-[#7c3aed]/20"
          >
            Sign In
          </button>
          <button
            onClick={onRegister}
            className="px-6 py-2.5 text-sm font-semibold bg-[#7c3aed] hover:bg-[#6c26d8] active:scale-95 text-white rounded transition-all cursor-pointer shadow-md shadow-purple-900/10"
          >
            Sign Up
          </button>
        </div>

      </div>
    </header>
  );
}
