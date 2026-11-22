import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { AppShell } from './components/AppShell';
import { AuthView } from './components/AuthView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LandingPage } from './components/LandingPage';
import { WorkspaceProvider, useWorkspace } from './context/WorkspaceContext';

function ProcifyRoot() {
  const { isAuthenticated, emailVerified, authLoading, enterDemoMode } = useWorkspace();
  const [view, setView] = useState<'landing' | 'auth'>('landing');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F7F9FC] dark:bg-[#0B1120] flex items-center justify-center">
        <div className="flex items-center gap-3 text-sm font-medium text-[#64748B]">
          <Loader2 className="w-5 h-5 animate-spin text-[#4361EE]" />
          <span>Initializing Procify AI workspace...</span>
        </div>
      </div>
    );
  }

  if (isAuthenticated && emailVerified) {
    return <AppShell onNavigateLanding={() => setView('landing')} />;
  }

  // Authenticated via email/password but awaiting verification
  if (isAuthenticated && !emailVerified) {
    return <AuthView initialMode="signin" onBackToLanding={() => setView('landing')} />;
  }

  if (view === 'auth') {
    return <AuthView initialMode={authMode} onBackToLanding={() => setView('landing')} />;
  }

  return (
    <LandingPage
      onOpenAuth={(mode) => {
        setAuthMode(mode);
        setView('auth');
      }}
      onExploreDemo={() => enterDemoMode()}
    />
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <WorkspaceProvider>
        <ProcifyRoot />
      </WorkspaceProvider>
    </ErrorBoundary>
  );
}
