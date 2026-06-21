import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface ForgotPasswordProps {
  resetEmail: string;
  setResetEmail: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  setAuthMode: (mode: 'signup' | 'signin' | 'forgot' | 'resetsent') => void;
  showToast: (msg: string) => void;
}

export const ForgotPassword: React.FC<ForgotPasswordProps> = ({
  resetEmail,
  setResetEmail,
  onSubmit,
  setAuthMode,
  showToast,
}) => {
  return (
    <>
      <h1 className="text-2xl md:text-[28px] font-bold text-neutral-900 tracking-tight leading-tight flex items-center gap-2">
        <span>Reset Password</span>
      </h1>
      
      <p className="text-stone-500 text-xs md:text-sm leading-normal mt-2 mb-6 text-left font-sans">
        Enter your email address below and we will send you an instant secure password restoration link to regain entry.
      </p>

      <form onSubmit={onSubmit} className="space-y-4 font-sans">
        <div>
          <label className="block text-[11px] font-bold text-stone-750 mb-1">Email address</label>
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            className="w-full bg-white border border-stone-200 focus:border-[#019cda] focus:ring-1 focus:ring-[#019cda] outline-none rounded-xl p-3 text-stone-800 placeholder-stone-300 font-medium text-xs transition-all"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-[#15395e] hover:bg-[#204975] active:scale-[0.99] transition-all text-white font-semibold text-xs md:text-sm py-3.5 rounded-xl shadow-lg cursor-pointer"
        >
          Send reset instructions
        </button>
      </form>

      <div className="text-center mt-6 font-sans">
        <button 
          onClick={() => {
            setAuthMode('signin');
            showToast("🏡 Switched to Log In!");
          }}
          className="text-xs text-stone-500 hover:text-stone-900 inline-flex items-center gap-1.5 font-bold hover:underline cursor-pointer"
        >
          <ArrowLeft className="w-3 h-3" /> Back to Log In
        </button>
      </div>
    </>
  );
};
