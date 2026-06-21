import { useState } from 'react';
import LandingHeader from '../components/landing/LandingHeader';
import LandingHero from '../components/landing/LandingHero';
import CoreMechanisms from '../components/landing/CoreMechanisms';
import SystemFeatures from '../components/landing/SystemFeatures';
import LandingPricing from '../components/landing/LandingPricing';
import WorkspaceTerminal from '../components/landing/WorkspaceTerminal';
import Newsletter from '../components/landing/Newsletter';
import TechnicalFaq from '../components/landing/TechnicalFaq';
import LandingFooter from '../components/landing/LandingFooter';
import AuthPage from '../components/landing/AuthPage';

interface LandingPageProps {
  onSignIn: () => void;
  onSignInWithCredentials?: (identifier: string, password: string) => Promise<string | null>;
  onRegister?: (firstName: string, lastName: string, email: string, username: string, password: string) => Promise<string | null>;
}

export default function LandingPage({ onSignIn, onSignInWithCredentials, onRegister }: LandingPageProps) {
  const [toast, setToast] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const openLogin = () => {
    setAuthMode('login');
    setShowAuth(true);
  };

  const openSignup = () => {
    setAuthMode('signup');
    setShowAuth(true);
  };

  // Show full-screen auth page when triggered
  if (showAuth) {
    return (
      <AuthPage
        initialMode={authMode}
        onSignIn={onSignIn}
        onSignInWithCredentials={onSignInWithCredentials}
        onRegister={onRegister}
        onBack={() => setShowAuth(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-neutral-900 text-white text-xs font-semibold px-5 py-3 rounded-xl shadow-2xl border border-neutral-700 animate-fade-in max-w-sm text-center">
          {toast}
        </div>
      )}

      <LandingHeader
        isLoggedIn={false}
        onLogin={openLogin}
        onLogout={onSignIn}
        onRegister={openSignup}
      />

      <LandingHero
        onRegister={openSignup}
        onDemoEntry={() => onSignIn()}
        showToast={showToast}
      />

      <CoreMechanisms showToast={showToast} />

      <SystemFeatures showToast={showToast} />

      <LandingPricing onRegister={openSignup} showToast={showToast} />

      <WorkspaceTerminal showToast={showToast} />

      <Newsletter showToast={showToast} />

      <TechnicalFaq showToast={showToast} />

      <LandingFooter />

    </div>
  );
}
