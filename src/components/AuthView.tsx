import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, Info, Loader2, Mail, RefreshCw } from 'lucide-react';
import { ProcifyLogo } from './ProcifyLogo';
import { useWorkspace } from '../context/WorkspaceContext';

interface AuthViewProps {
  initialMode: 'signin' | 'signup' | 'forgot';
  onBackToLanding: () => void;
}

export function AuthView({ initialMode, onBackToLanding }: AuthViewProps) {
  const {
    firebaseUser,
    emailVerified,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    resetPassword,
    resendVerificationEmail,
    refreshUserVerification,
    logout,
    enterDemoMode,
  } = useWorkspace();

  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>(initialMode);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [showEmailProviderHint, setShowEmailProviderHint] = useState(false);

  const mapAuthError = (err: any): string => {
    const code = err?.code || '';
    if (code === 'auth/operation-not-allowed') {
      setShowEmailProviderHint(true);
      return 'Email/Password sign-in is not yet enabled in Firebase Console. Use "Continue with Google" below or enable Email/Password under Firebase Console → Authentication → Sign-in method.';
    }
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
      return 'Invalid email or password. Please check your credentials and try again.';
    }
    if (code === 'auth/email-already-in-use') {
      return 'An account with this email already exists. Try signing in instead.';
    }
    if (code === 'auth/weak-password') {
      return 'Password should be at least 6 characters long.';
    }
    if (code === 'auth/popup-closed-by-user') {
      return 'Sign-in popup was closed before completing authentication.';
    }
    return err?.message || 'Authentication failed. Please try again.';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');
    setShowEmailProviderHint(false);

    if (mode === 'forgot') {
      if (!email.trim()) {
        setErrorMsg('Please enter your email address.');
        return;
      }
      setLoading(true);
      try {
        await resetPassword(email.trim());
        setInfoMsg('Password reset link sent. Check your email inbox.');
      } catch (err) {
        setErrorMsg(mapAuthError(err));
      } finally {
        setLoading(false);
      }
      return;
    }

    if (mode === 'signup') {
      if (!fullName.trim()) {
        setErrorMsg('Full name is required.');
        return;
      }
      if (password.length < 6) {
        setErrorMsg('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match.');
        return;
      }
      setLoading(true);
      try {
        await signUpWithEmail(fullName.trim(), email.trim(), password);
        setInfoMsg('Account created! Please verify your email address using the link we sent.');
      } catch (err) {
        setErrorMsg(mapAuthError(err));
      } finally {
        setLoading(false);
      }
      return;
    }

    // signin
    if (!email.trim() || !password) {
      setErrorMsg('Email and password are required.');
      return;
    }
    setLoading(true);
    try {
      await signInWithEmail(email.trim(), password);
    } catch (err) {
      setErrorMsg(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setInfoMsg('');
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setErrorMsg(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  // Signed in via email/password but waiting for email verification
  if (firebaseUser && !emailVerified) {
    return (
      <div className="min-h-screen bg-[#F7F9FC] dark:bg-[#0B1120] text-[#172033] dark:text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8">
          <div className="w-11 h-11 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#4361EE] dark:text-[#22D3EE] flex items-center justify-center mb-5">
            <Mail className="w-5 h-5" />
          </div>
          <h1 className="font-display text-xl font-bold text-[#10172A] dark:text-white mb-2">
            Verify your email to unlock Firestore
          </h1>
          <p className="text-sm text-[#64748B] dark:text-slate-400 leading-relaxed mb-6">
            We sent a verification link to <strong className="text-[#172033] dark:text-white">{firebaseUser.email}</strong>. Click the link in your inbox, then refresh your verification status below.
          </p>

          {infoMsg && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300">
              {infoMsg}
            </div>
          )}
          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
              {errorMsg}
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={async () => {
                setLoading(true);
                setErrorMsg('');
                const verified = await refreshUserVerification();
                setLoading(false);
                if (!verified) {
                  setErrorMsg('Email is not verified yet. Please click the verification link sent to your inbox.');
                }
              }}
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#4361EE] text-white text-sm font-semibold hover:bg-[#3651D4] transition-colors disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              I Verified My Email — Continue
            </button>
            <button
              onClick={async () => {
                setLoading(true);
                try {
                  await resendVerificationEmail();
                  setInfoMsg('Verification email resent.');
                } catch (err: any) {
                  setErrorMsg(err?.message || 'Unable to resend email right now.');
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Resend Verification Email
            </button>
            <button
              onClick={logout}
              className="w-full px-4 py-2 text-xs text-[#64748B] hover:text-[#172033] dark:hover:text-white transition-colors"
            >
              Sign out and use another account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F9FC] dark:bg-[#0B1120] text-[#172033] dark:text-slate-100 flex flex-col justify-center py-12 px-6">
      <div className="max-w-md w-full mx-auto">
        <button
          onClick={onBackToLanding}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#64748B] dark:text-slate-400 hover:text-[#10172A] dark:hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Procify AI
        </button>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <ProcifyLogo size={36} />
            <div>
              <h1 className="font-display text-xl font-bold text-[#10172A] dark:text-white">
                {mode === 'signin' && 'Sign in to Procify AI'}
                {mode === 'signup' && 'Create your workspace'}
                {mode === 'forgot' && 'Reset your password'}
              </h1>
              <p className="text-xs text-[#64748B] dark:text-slate-400">
                Protected workspace with Firebase Authentication
              </p>
            </div>
          </div>

          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 leading-relaxed">
              {errorMsg}
            </div>
          )}

          {showEmailProviderHint && (
            <div className="mb-5 p-3.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-200 leading-relaxed flex items-start gap-2.5">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong>Firebase Setup Tip:</strong> To enable Email/Password accounts, open Firebase Console → Authentication → Sign-in method and enable <strong>Email/Password</strong>. Google Sign-In and Demo Workspace work immediately.
              </div>
            </div>
          )}

          {infoMsg && (
            <div className="mb-5 p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{infoMsg}</span>
            </div>
          )}

          {/* Google Sign-In */}
          {mode !== 'forgot' && (
            <>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-[#10172A] dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700/70 transition-colors disabled:opacity-60"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z" />
                  <path fill="#FBBC05" d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z" />
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z" />
                </svg>
                Continue with Google
              </button>

              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white dark:bg-slate-900 px-3 text-[#64748B]">
                    or with email
                  </span>
                </div>
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-medium text-[#172033] dark:text-slate-300 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Elena Vance"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-[#4361EE]"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[#172033] dark:text-slate-300 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@organization.edu"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-[#4361EE]"
              />
            </div>

            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-[#172033] dark:text-slate-300">
                    Password
                  </label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot');
                        setErrorMsg('');
                        setInfoMsg('');
                      }}
                      className="text-xs font-medium text-[#4361EE] hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-[#4361EE]"
                />
              </div>
            )}

            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-medium text-[#172033] dark:text-slate-300 mb-1.5">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-[#4361EE]"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#4361EE] hover:bg-[#3651D4] text-white text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === 'signin' && 'Sign In'}
              {mode === 'signup' && 'Create Account'}
              {mode === 'forgot' && 'Send Reset Link'}
            </button>
          </form>

          {/* Mode switching */}
          <div className="mt-5 pt-5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-[#64748B] dark:text-slate-400">
            {mode === 'signin' && (
              <>
                <span>New to Procify AI?</span>
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setErrorMsg('');
                    setInfoMsg('');
                  }}
                  className="font-semibold text-[#4361EE] hover:underline"
                >
                  Create an account
                </button>
              </>
            )}
            {mode === 'signup' && (
              <>
                <span>Already have an account?</span>
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setErrorMsg('');
                    setInfoMsg('');
                  }}
                  className="font-semibold text-[#4361EE] hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
            {mode === 'forgot' && (
              <>
                <span>Remembered your password?</span>
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setErrorMsg('');
                    setInfoMsg('');
                  }}
                  className="font-semibold text-[#4361EE] hover:underline"
                >
                  Back to sign in
                </button>
              </>
            )}
          </div>

          {/* Demo Workspace Access */}
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
            <button
              type="button"
              onClick={enterDemoMode}
              className="text-xs font-medium text-[#10172A] dark:text-[#22D3EE] hover:underline"
            >
              Launch Interactive Demo Workspace (No Sign-In Required)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
