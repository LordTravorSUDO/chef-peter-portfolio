/**
 * /admin/login — Supabase email + password authentication.
 *
 * Security:
 *  - No public registration path exists.
 *  - signInWithPassword only; PKCE flow configured in supabase.ts.
 *  - Password reset uses Supabase's built-in email link flow.
 *  - Errors are surfaced generically (no enumeration of valid emails).
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Award, Eye, EyeOff } from 'lucide-react';
import { signIn } from '../../lib/services/auth';
import { supabase } from '../../lib/supabase';
import Button from '../../components/admin/ui/Button';
import Input from '../../components/admin/ui/Input';

export default function AdminLoginPage() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const from      = (location.state as { from?: string })?.from ?? '/admin';

  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [showPwd,    setShowPwd]    = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [resetMode,  setResetMode]  = useState(false);
  const [resetSent,  setResetSent]  = useState(false);
  const [resetLoad,  setResetLoad]  = useState(false);

  // If already signed in, go straight to admin
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate(from, { replace: true });
    });
  }, [from, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      // Generic message to prevent email enumeration
      setError('Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Enter your email address first.');
      return;
    }
    setError(null);
    setResetLoad(true);
    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: `${window.location.origin}/admin/login` }
      );
      if (resetErr) throw resetErr;
      setResetSent(true);
    } catch {
      setError('Could not send reset email. Verify the address and try again.');
    } finally {
      setResetLoad(false);
    }
  };

  return (
    <>
      <title>Admin Login | Chef Peter the Teacher</title>
      <meta name="robots" content="noindex, nofollow" />

      <div className="min-h-screen bg-[#F4F6F8] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#1B365D] mb-4">
              <Award className="w-6 h-6 text-[#D99B26]" />
            </div>
            <h1 className="text-2xl font-bold text-[#1B365D]">
              {resetMode ? 'Reset Password' : 'CMS Sign In'}
            </h1>
            <p className="mt-1 text-sm text-[#6B7A8D]">
              {resetMode
                ? 'Enter your email and we\'ll send a reset link.'
                : 'Chef Peter the Teacher — editorial dashboard'}
            </p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#DDE3EA] p-8">
            {resetSent ? (
              <div className="text-center space-y-4">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm text-[#1A2B40] font-medium">Check your inbox</p>
                <p className="text-sm text-[#6B7A8D]">
                  A password reset link has been sent to <strong>{email}</strong>.
                </p>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => { setResetMode(false); setResetSent(false); }}
                >
                  Back to sign in
                </Button>
              </div>
            ) : resetMode ? (
              <form onSubmit={handlePasswordReset} className="space-y-4">
                <Input
                  label="Email address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="chef@example.com"
                  required
                  autoComplete="email"
                />
                {error && <p className="text-xs text-[#C0392B]" role="alert">{error}</p>}
                <Button type="submit" className="w-full" loading={resetLoad}>
                  Send reset link
                </Button>
                <button
                  type="button"
                  onClick={() => { setResetMode(false); setError(null); }}
                  className="w-full text-sm text-[#4A777A] hover:underline text-center"
                >
                  Back to sign in
                </button>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4" noValidate>
                <Input
                  label="Email address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="chef@example.com"
                  required
                  autoComplete="email"
                />
                {/* Password with show/hide toggle */}
                <div className="space-y-1">
                  <label htmlFor="password" className="block text-sm font-medium text-[#1A2B40]">
                    Password <span className="text-[#C0392B]" aria-hidden>*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPwd ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      placeholder="••••••••"
                      className="w-full rounded-lg border border-[#DDE3EA] px-3 py-2 pr-10 text-sm text-[#1A2B40] bg-white focus:outline-none focus:ring-2 focus:ring-[#1B365D]/30 focus:border-[#1B365D] transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(!showPwd)}
                      aria-label={showPwd ? 'Hide password' : 'Show password'}
                      className="absolute inset-y-0 right-0 px-3 text-[#6B7A8D] hover:text-[#1A2B40]"
                    >
                      {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && <p className="text-xs text-[#C0392B]" role="alert">{error}</p>}

                <Button type="submit" className="w-full" loading={loading}>
                  Sign in
                </Button>

                <button
                  type="button"
                  onClick={() => { setResetMode(true); setError(null); }}
                  className="w-full text-sm text-[#4A777A] hover:underline text-center"
                >
                  Forgot password?
                </button>
              </form>
            )}
          </div>

          <p className="mt-6 text-center text-xs text-[#6B7A8D]">
            <Link to="/" className="hover:text-[#1B365D] transition">← Back to website</Link>
          </p>
        </div>
      </div>
    </>
  );
}
