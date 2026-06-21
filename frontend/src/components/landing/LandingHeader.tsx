import React from 'react';
import { Zap, User, ChevronRight } from 'lucide-react';

interface LandingHeaderProps {
  isLoggedIn?: boolean;
  onLogin?: () => void;
  onLogout?: () => void;
  onRegister?: () => void;
}

export default function LandingHeader({
  isLoggedIn = false,
  onLogin,
  onLogout,
  onRegister
}: LandingHeaderProps) {
  return (
    <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-stone-200/65 px-4 md:px-8 py-3.5 flex items-center justify-between z-50">

      {/* Custom organic overlapping talanted logo */}
      <div className="flex items-center gap-2">
        <span className="w-8 h-8 rounded-xl bg-[#15395e] flex items-center justify-center text-white relative">
          <svg className="w-4 h-5" viewBox="0 0 24 32" fill="currentColor">
            <path d="M24 16c0 8.837-7.163 16-16 16S0 24.837 0 16 7.163 0 16 0s8.837 7.163 8.837 16z" className="opacity-20" />
            <path d="M12 4v24c6.627 0 12-5.373 12-12S18.627 4 12 4z" />
          </svg>
        </span>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-base font-bold tracking-tight text-neutral-900 font-display">talanted</span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#019cda]/5 border border-[#019cda]/15 text-[#019cda]">Workspace</span>
          </div>
          <p className="text-[10px] text-gray-400 font-medium tracking-wide">Inspired Custom Environment</p>
        </div>
      </div>

      {/* Desktop Menu links */}
      <div className="hidden lg:flex items-center gap-7 text-[13px] font-medium text-neutral-600">
        <a href="#explore-more-talanted" className="hover:text-neutral-900 cursor-pointer scroll-smooth transition-colors">Core Features</a>
        <a href="#organizational-efficiency-talanted" className="hover:text-neutral-900 cursor-pointer scroll-smooth transition-colors">Team Efficiency</a>
        <a href="#pixso-pricing" className="hover:text-neutral-900 cursor-pointer scroll-smooth transition-colors">Pricing & Plans</a>
        <a href="#expanded-faqs" className="hover:text-neutral-900 cursor-pointer scroll-smooth transition-colors">Support Q&A</a>
        <a href="#sandbox-terminal" className="hover:text-[#15395e] cursor-pointer text-[#019cda] font-extrabold flex items-center gap-1 bg-[#019cda]/5 px-3 py-1.5 rounded-lg border border-[#019cda]/15 hover:bg-[#019cda]/10 transition-all">
          <Zap className="w-3.5 h-3.5 fill-[#019cda]/20" />
          <span>Sandbox Terminal</span>
        </a>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        {isLoggedIn ? (
          <>
            <button
              onClick={onLogout}
              className="px-4.5 py-2 text-xs font-bold border border-zinc-300 text-[#15395e] rounded-lg transition-transform hover:bg-[#15395e]/5 active:scale-95 shadow-sm inline-flex items-center gap-1 cursor-pointer"
            >
              <User className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
            <button
              onClick={onLogin}
              className="px-4.5 py-2 text-xs font-bold bg-[#15395e] hover:bg-opacity-95 text-white rounded-lg transition-transform active:scale-95 shadow-sm inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Enter App</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onLogin}
              className="text-stone-500 hover:text-stone-900 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              Sign In
            </button>
            <button
              onClick={onRegister}
              className="hidden md:inline-flex px-4.5 py-2 bg-[#15395e] hover:bg-opacity-95 text-white text-xs font-bold tracking-wider uppercase rounded-lg transition-all active:scale-95 cursor-pointer"
            >
              Sign Up Free
            </button>
          </>
        )}
      </div>
    </header>
  );
}
