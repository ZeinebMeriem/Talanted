import React from 'react';

interface SignUpProps {
  authFirstName: string;
  setAuthFirstName: (val: string) => void;
  authLastName: string;
  setAuthLastName: (val: string) => void;
  authEmail: string;
  setAuthEmail: (val: string) => void;
  authUsername: string;
  setAuthUsername: (val: string) => void;
  authPassword: string;
  setAuthPassword: (val: string) => void;
  authConfirmPassword: string;
  setAuthConfirmPassword: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  setAuthMode: (mode: 'signup' | 'signin' | 'forgot' | 'resetsent') => void;
  showToast: (msg: string) => void;
}

export const SignUp: React.FC<SignUpProps> = ({
  authFirstName,
  setAuthFirstName,
  authLastName,
  setAuthLastName,
  authEmail,
  setAuthEmail,
  authUsername,
  setAuthUsername,
  authPassword,
  setAuthPassword,
  authConfirmPassword,
  setAuthConfirmPassword,
  onSubmit,
  setAuthMode,
  showToast,
}) => {
  return (
    <>
      <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 tracking-tight leading-tight">
        Join Talanted
      </h1>
      <p className="text-stone-500 text-xs md:text-sm leading-normal mt-1.5 mb-5 text-left font-sans">
        Create your account and start generating UIs instantly.
      </p>

      {/* Registration Form fields strictly following visual identity */}
      <form onSubmit={onSubmit} className="space-y-4 font-sans">
        <div className="grid grid-cols-2 gap-3.5">
          <div>
            <label className="block text-[11px] font-bold text-stone-700 mb-1">First name</label>
            <input
              type="text"
              required
              placeholder="Meriem"
              value={authFirstName}
              onChange={(e) => setAuthFirstName(e.target.value)}
              className="w-full bg-white border border-stone-200 focus:border-[#019cda] focus:ring-1 focus:ring-[#019cda] outline-none rounded-xl p-3 text-stone-800 placeholder-stone-300 font-medium text-xs transition-all"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-stone-700 mb-1">Last name</label>
            <input
              type="text"
              required
              placeholder="Boukraa"
              value={authLastName}
              onChange={(e) => setAuthLastName(e.target.value)}
              className="w-full bg-white border border-stone-200 focus:border-[#019cda] focus:ring-1 focus:ring-[#019cda] outline-none rounded-xl p-3 text-stone-800 placeholder-stone-300 font-medium text-xs transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-stone-700 mb-1">Email</label>
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={authEmail}
            onChange={(e) => setAuthEmail(e.target.value)}
            className="w-full bg-white border border-stone-200 focus:border-[#019cda] focus:ring-1 focus:ring-[#019cda] outline-none rounded-xl p-3 text-stone-800 placeholder-stone-300 font-medium text-xs transition-all"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-stone-700 mb-1">Username</label>
          <input
            type="text"
            required
            placeholder="your_username"
            value={authUsername}
            onChange={(e) => setAuthUsername(e.target.value)}
            className="w-full bg-white border border-stone-200 focus:border-[#019cda] focus:ring-1 focus:ring-[#019cda] outline-none rounded-xl p-3 text-stone-800 placeholder-stone-300 font-medium text-xs transition-all"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-stone-700 mb-1">Password</label>
          <input
            type="password"
            required
            placeholder="••••••••"
            value={authPassword}
            onChange={(e) => setAuthPassword(e.target.value)}
            className="w-full bg-white border border-stone-200 focus:border-[#019cda] focus:ring-1 focus:ring-[#019cda] outline-none rounded-xl p-3 text-stone-800 placeholder-stone-300 font-medium text-xs transition-all"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-stone-700 mb-1">Confirm password</label>
          <input
            type="password"
            required
            placeholder="••••••••"
            value={authConfirmPassword}
            onChange={(e) => setAuthConfirmPassword(e.target.value)}
            className="w-full bg-white border border-stone-200 focus:border-[#019cda] focus:ring-1 focus:ring-[#019cda] outline-none rounded-xl p-3 text-stone-800 placeholder-stone-300 font-medium text-xs transition-all"
          />
        </div>

        <button
          type="submit"
          className="w-full mt-2 bg-[#019cda] hover:bg-[#008fc9] active:scale-[0.99] transition-all text-white font-semibold text-xs md:text-sm py-3.5 rounded-xl shadow-lg shadow-sky-500/10 cursor-pointer"
        >
          Join Talanted
        </button>
      </form>

      <div className="text-center mt-4 font-sans">
        <span className="text-xs text-stone-400">Already have an account? </span>
        <button 
          onClick={() => {
            setAuthMode('signin');
            showToast("🏡 Switched to Welcome Back portal!");
          }}
          className="text-xs text-[#019cda] font-bold hover:underline cursor-pointer"
        >
          Log In
        </button>
      </div>
    </>
  );
};
