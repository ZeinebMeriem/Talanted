import React, { useState, FormEvent } from "react";
import { Eye, EyeOff, Lock, Mail, ArrowRight } from "lucide-react";

/**
 * ============================================================================
 * STANDALONE SECURE SIGN-IN COMPONENT (Talented style)
 * ============================================================================
 * 
 * DESIGN FEATURES:
 * - Ultra-modern Cosmic Slate dark theme matching the Talented layout.
 * - Robust client-side validation for emails and input states.
 * - Interactive states (loading/submitting, hover transitions).
 * - Highly customizable and responsive layout built for Tailwind CSS.
 * 
 * INSTRUCTIONS FOR RUNNING & INTEGRATION:
 * 1. Ensure you have 'lucide-react' installed: npm install lucide-react
 * 2. Copy-paste this file directly into your Vite/React project src folder!
 * 3. Replace the mocked triggerToast/fetch endpoints with actual authentication endpoints.
 */

export interface SignInCredentials {
  email: string;
  password?: string;
  keepMeSigned: boolean;
}

export default function StandaloneSignIn() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [keepMeSigned, setKeepMeSigned] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  
  // Interaction/Validation Feedback States
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [successText, setSuccessText] = useState<string | null>(null);

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setErrorText(null);
    setSuccessText(null);

    // 1. Basic validation
    if (!email) {
      setErrorText("Email address is required.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorText("Please state a valid email format.");
      return;
    }
    if (!password) {
      setErrorText("Password field cannot be empty.");
      return;
    }

    setIsSubmitting(true);

    try {
      // 2. Network Integration Placeholder
      // REPLACE ME: const response = await fetch('/api/login', { method: 'POST', body: JSON.stringify({...}) });
      await new Promise((resolve) => setTimeout(resolve, 1200));
      
      setSuccessText("Securely authenticated! Welcome back.");
    } catch (err: any) {
      setErrorText(err.message || "Something went wrong during login.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = () => {
    setErrorText(null);
    setSuccessText("A recovery link has been safely cached. Ready for production API integrations.");
  };

  return (
    <div className="min-h-screen bg-[#070b19] text-[#e2e8f0] flex flex-col font-sans justify-center items-center p-4">
      <div className="w-full max-w-[660px]">
        
        {/* Brand Header */}
        <div className="flex items-center justify-center gap-2 mb-8 select-none">
          <span className="text-[34px] font-bold tracking-tight text-white">
            Talented
          </span>
          <span className="w-7 h-1.5 bg-[#7c3aed] rounded-sm mt-3.5" />
        </div>

        {/* Auth Card Container */}
        <div className="w-full bg-[#181f33] rounded-[8px] shadow-[0_20px_50px_rgba(2,4,10,0.4)] border border-slate-800/60 p-10 sm:p-12 text-left">
          <h1 className="text-3xl font-semibold tracking-tight text-white mb-10 text-center">
            Sign In
          </h1>

          <form onSubmit={handleSignIn} className="space-y-6">
            
            {/* Display validation or status messages */}
            {errorText && (
              <div id="error-alert" className="p-4 bg-amber-950/20 border border-amber-800 text-amber-200 text-xs rounded-sm font-semibold select-none">
                {errorText}
              </div>
            )}

            {successText && (
              <div id="success-alert" className="p-4 bg-emerald-950/20 border border-emerald-800 text-emerald-250 text-xs rounded-sm font-semibold select-none">
                {successText}
              </div>
            )}

            {/* Email Address */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 tracking-wide mb-2.5">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#232b42] border border-slate-700/60 focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/10 text-white placeholder-slate-500 rounded-sm pl-10 pr-4 py-3.5 text-sm font-medium focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 tracking-wide mb-2.5">
                Password
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#232b42] border border-slate-700/60 focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/10 text-white placeholder-slate-500 rounded-sm pl-10 pr-10 py-3.5 text-sm font-medium focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Controls Row */}
            <div className="flex items-center justify-between pt-1 font-medium text-xs">
              <label className="flex items-center gap-2 select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={keepMeSigned}
                  onChange={(e) => setKeepMeSigned(e.target.checked)}
                  className="rounded-sm border-slate-700 bg-[#232a42] text-[#7c3aed] focus:ring-[#7c3aed]/50 w-4 h-4 cursor-pointer"
                />
                <span className="text-slate-300">
                  Keep me signed in
                </span>
              </label>
              
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-slate-400 hover:text-slate-200 transition-colors focus:outline-none cursor-pointer"
              >
                Forgot Password
              </button>
            </div>

            {/* Submit CTA */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#7c3aed] hover:bg-[#6c26d8] active:bg-[#5b1eb8] text-white py-3.5 rounded-sm font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer select-none"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing In...
                </>
              ) : (
                <>
                  Submit
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
