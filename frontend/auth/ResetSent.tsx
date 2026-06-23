import React from 'react';

interface ResetSentProps {
  resetEmail: string;
  setAuthMode: (mode: 'signup' | 'signin' | 'forgot' | 'resetsent') => void;
  showToast: (msg: string) => void;
}

export const ResetSent: React.FC<ResetSentProps> = ({
  resetEmail,
  setAuthMode,
  showToast,
}) => {
  return (
    <div className="text-left space-y-4 font-sans">
      <div className="w-12 h-12 bg-sky-50 rounded-full flex items-center justify-center text-2xl select-none">
        ✉️
      </div>
      <h1 className="text-2xl font-bold text-neutral-900 tracking-tight leading-tight">
        Instructions Dispatched!
      </h1>
      <p className="text-stone-500 text-xs md:text-sm leading-relaxed">
        We have dispatched a secure password restoration verification code and custom snapshot link to <strong className="text-stone-900">{resetEmail || 'your email'}</strong>. Please check your inbox and spam folder.
      </p>
      <div className="pt-2">
        <button
          onClick={() => {
            setAuthMode('signin');
            showToast("🔒 Enter with your new password");
          }}
          className="w-full bg-[#019cda] hover:bg-[#008fc9] text-white text-xs font-semibold py-3 rounded-xl cursor-pointer text-center"
        >
          Back to Log In
        </button>
      </div>
    </div>
  );
};
