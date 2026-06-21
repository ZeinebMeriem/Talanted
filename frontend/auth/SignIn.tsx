import React from 'react';

interface SignInProps {
  authEmail: string;
  setAuthEmail: (val: string) => void;
  authPassword: string;
  setAuthPassword: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  setAuthMode: (mode: 'signup' | 'signin' | 'forgot' | 'resetsent') => void;
  showToast: (msg: string) => void;
  setAuthFirstName: (val: string) => void;
  setAuthLastName: (val: string) => void;
  setAuthUsername: (val: string) => void;
  setIsLoggedIn: (val: boolean) => void;
  setPortalView: (val: 'dashboard' | 'editor' | 'specs' | 'pipeline' | 'docs' | 'settings') => void;
  setCurrentScreen: (val: 'landing' | 'auth' | 'app') => void;
}

export const SignIn: React.FC<SignInProps> = ({
  authEmail,
  setAuthEmail,
  authPassword,
  setAuthPassword,
  onSubmit,
  setAuthMode,
  showToast,
  setAuthFirstName,
  setAuthLastName,
  setAuthUsername,
  setIsLoggedIn,
  setPortalView,
  setCurrentScreen,
}) => {
  return (
    <>
      <h1 className="text-2xl md:text-[28px] font-bold text-neutral-900 tracking-tight leading-tight">
        Welcome back
      </h1>
      
      <p className="text-stone-500 text-xs md:text-sm leading-normal mt-2 mb-6 font-sans">
        Access your design projects and team AI-pipelines inside your talanted workspace instantly.
      </p>

      {/* Google Authentication simulation */}
      <button
        type="button"
        onClick={() => {
          showToast("✨ Logging in as Meriem Boukraa...");
          setAuthFirstName("Meriem");
          setAuthLastName("Boukraa");
          setAuthEmail("you@example.com");
          setAuthUsername("your_username");
          setIsLoggedIn(true);
          setPortalView('dashboard');
          setTimeout(() => {
            setCurrentScreen('app');
            showToast("🔑 Google Account synced! Entering talanted Space...");
          }, 800);
        }}
        className="w-full bg-white border border-stone-200 hover:bg-stone-50/80 active:scale-98 transition-all p-2.5 rounded-xl text-stone-700 text-xs font-bold flex items-center justify-center gap-2.5 shadow-sm cursor-pointer font-sans"
      >
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
          <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.47 14.97 1 12 1 7.35 1 3.37 3.67 1.39 7.56l3.85 2.99C6.16 7.42 8.87 5.04 12 5.04z" />
          <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.29 1.48-1.14 2.73-2.42 3.57v2.96h3.91c2.28-2.1 3.54-5.19 3.54-8.68z" />
          <path fill="#FBBC05" d="M5.24 14.55c-.24-.72-.37-1.49-.37-2.28s.13-1.56.37-2.28L1.39 7.01C.5 8.81 0 10.84 0 13s.5 4.19 1.39 5.99l3.85-2.99s-.01-.01-.01-.45z" />
          <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.91-2.96c-1.08.72-2.47 1.16-4.05 1.16-3.13 0-5.84-2.38-6.76-5.51l-3.85 2.99C3.37 20.33 7.35 23 12 23z" />
        </svg>
        Continue with Google
      </button>

      {/* Visual Divider block "or" */}
      <div className="flex items-center gap-3 my-5 font-mono">
        <div className="h-px bg-stone-150 flex-grow"></div>
        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">or</span>
        <div className="h-px bg-stone-150 flex-grow"></div>
      </div>

      {/* Sign In Email form */}
      <form onSubmit={onSubmit} className="space-y-4 font-sans">
        <div>
          <label className="block text-[11px] font-bold text-stone-750 mb-1">Email address</label>
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
          <div className="flex justify-between items-center mb-1">
            <label className="block text-[11px] font-bold text-stone-750">Password</label>
            <button 
              type="button"
              onClick={() => {
                setAuthMode('forgot');
                showToast("🔑 Let's recover your password credentials!");
              }}
              className="text-[11.5px] text-[#019cda] font-semibold hover:underline cursor-pointer"
            >
              Reset password?
            </button>
          </div>
          <input
            type="password"
            required
            placeholder="••••••••"
            value={authPassword}
            onChange={(e) => setAuthPassword(e.target.value)}
            className="w-full bg-white border border-stone-200 focus:border-[#019cda] focus:ring-1 focus:ring-[#019cda] outline-none rounded-xl p-3 text-stone-800 placeholder-stone-300 font-medium text-xs transition-all"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-[#019cda] hover:bg-[#008fc9] active:scale-[0.99] transition-all text-white font-semibold text-xs md:text-sm py-3.5 rounded-xl shadow-lg shadow-sky-500/10 cursor-pointer"
        >
          Log In
        </button>
      </form>

      <div className="text-center mt-5 font-sans">
        <span className="text-xs text-stone-400">First time using talanted? </span>
        <button 
          onClick={() => {
            setAuthMode('signup');
            showToast("✨ Join our workflow workspace!");
          }}
          className="text-xs text-[#019cda] font-bold hover:underline cursor-pointer"
        >
          Sign Up
        </button>
      </div>
    </>
  );
};
