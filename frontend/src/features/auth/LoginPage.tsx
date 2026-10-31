import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  AlertCircle,
  KeyRound,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Mail,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { AuthTokens } from '../../types';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const [mode, setMode] = useState<'login' | 'register' | 'verify' | 'forgot' | 'reset'>('login');
  const [email, setEmail] = useState(import.meta.env.DEV ? 'user@fitpulse.ai' : '');
  const [password, setPassword] = useState(import.meta.env.DEV ? 'fitpulse123' : '');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Verification & Reset states
  const [verificationToken, setVerificationToken] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Handlers
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const response = await api.post<AuthTokens>('/auth/login', {
        email: email.trim(),
        password,
      });
      setAuth(response.data);
      if (rememberMe) {
        localStorage.setItem('lifora_remember_email', email.trim());
      } else {
        localStorage.removeItem('lifora_remember_email');
      }
      navigate('/');
    } catch (err: any) {
      if (err.response?.status === 401) {
        setErrorMsg('Invalid email or password. Please verify your credentials.');
      } else {
        setErrorMsg(
          err.response?.data?.detail || 'Failed to authenticate. Ensure the backend is running.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const resp = await api.post('/auth/register', {
        email: email.trim(),
        password,
        confirm_password: confirmPassword,
      });

      const token = resp.data.verification_token;
      setVerificationToken(token);
      setSuccessMsg(
        'Account created successfully! Please verify your email to activate your account.'
      );
      setMode('verify');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyEmail = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!verificationToken.trim()) {
      setErrorMsg('Please enter the verification code/token.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const resp = await api.post('/auth/verify-email', {
        token: verificationToken.trim(),
        email: email.trim(),
      });

      if (resp.data.access_token) {
        setAuth({
          access_token: resp.data.access_token,
          refresh_token: resp.data.refresh_token,
          token_type: 'bearer',
          user: resp.data.user,
        });
        navigate('/');
      } else {
        setSuccessMsg('Email verified successfully! You can now log in.');
        setMode('login');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Verification failed. Token may be invalid or expired.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg('Please enter your email address.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const resp = await api.post('/auth/forgot-password', { email: email.trim() });
      if (resp.data.reset_token) {
        setResetToken(resp.data.reset_token);
        setSuccessMsg(
          'Password reset token generated. In local development, you can proceed directly below.'
        );
        setMode('reset');
      } else {
        setSuccessMsg('If this email is registered, reset instructions have been created.');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Could not process password reset request.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      setErrorMsg('New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await api.post('/auth/reset-password', {
        token: resetToken.trim(),
        new_password: newPassword,
        confirm_new_password: confirmNewPassword,
      });
      setSuccessMsg('Password has been reset successfully! Please sign in with your new password.');
      setPassword(newPassword);
      setMode('login');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Password reset failed. Invalid or expired token.');
    } finally {
      setIsLoading(false);
    }
  };

  const fillSeedCredentials = () => {
    setEmail('user@fitpulse.ai');
    setPassword('fitpulse123');
    setMode('login');
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-[#021816] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Radial emerald background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#042420] border border-emerald-500/30 mb-3 shadow-xl shadow-emerald-950/60 p-2">
            <img src="/logo.png" alt="LIFORA" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-100">
            LIFORA
          </h1>
          <p className="text-xs font-semibold text-emerald-400 uppercase tracking-widest mt-0.5">
            Your Life. Your Space. Your Rules.
          </p>
        </div>

        {/* Auth Box */}
        <div className="bg-[#031f1c]/95 border border-emerald-900/50 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {/* Tabs for Login vs Register */}
          {(mode === 'login' || mode === 'register') && (
            <div className="flex items-center bg-[#021816] p-1 rounded-xl mb-6 border border-emerald-900/40">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                  mode === 'login'
                    ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                  mode === 'register'
                    ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Create Account
              </button>
            </div>
          )}

          {/* Feedback messages */}
          {errorMsg && (
            <div className="flex items-start gap-2.5 p-3.5 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs leading-relaxed animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-start gap-2.5 p-3.5 mb-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs leading-relaxed animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* 1. LOGIN FORM */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full px-3.5 py-2.5 bg-[#021816] border border-emerald-900/50 rounded-xl text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-zinc-300">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full px-3.5 py-2.5 pr-10 bg-[#021816] border border-emerald-900/50 rounded-xl text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-400 hover:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-0 focus:ring-offset-0"
                  />
                  <span>Remember Me</span>
                </label>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full mt-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold"
                isLoading={isLoading}
              >
                Sign In
              </Button>
            </form>
          )}

          {/* 2. REGISTER FORM */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full px-3.5 py-2.5 bg-[#021816] border border-emerald-900/50 rounded-xl text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">Password (min 8 chars)</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    minLength={8}
                    className="w-full px-3.5 py-2.5 pr-10 bg-[#021816] border border-emerald-900/50 rounded-xl text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    minLength={8}
                    className="w-full px-3.5 py-2.5 pr-10 bg-[#021816] border border-emerald-900/50 rounded-xl text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full mt-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold"
                isLoading={isLoading}
              >
                Create Account
              </Button>
            </form>
          )}

          {/* 3. EMAIL VERIFICATION STEP */}
          {mode === 'verify' && (
            <div className="space-y-4">
              <div className="text-center p-3 bg-emerald-950/40 border border-emerald-500/20 rounded-xl">
                <Mail className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-zinc-100">Verify Your Email</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  We sent a verification link to <strong className="text-emerald-300">{email}</strong>.
                </p>
              </div>

              {import.meta.env.DEV && verificationToken && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                  <p className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider mb-1">
                    Local Development Bypass:
                  </p>
                  <p className="text-xs text-zinc-300 font-mono break-all bg-black/40 p-2 rounded">
                    {verificationToken}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleVerifyEmail()}
                    className="w-full mt-2.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>1-Click Dev Verify &amp; Launch</span>
                  </button>
                </div>
              )}

              <form onSubmit={handleVerifyEmail} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Or Enter Verification Token:
                  </label>
                  <input
                    type="text"
                    value={verificationToken}
                    onChange={(e) => setVerificationToken(e.target.value)}
                    placeholder="Paste verification token here"
                    required
                    className="w-full px-3 py-2 bg-[#021816] border border-emerald-900/50 rounded-xl text-xs text-zinc-100 font-mono"
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold"
                  isLoading={isLoading}
                >
                  Verify Email
                </Button>

                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="w-full text-center text-xs text-zinc-400 hover:text-zinc-200 mt-2"
                >
                  Return to Sign In
                </button>
              </form>
            </div>
          )}

          {/* 4. FORGOT PASSWORD STEP */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="text-left">
                <h3 className="text-sm font-semibold text-zinc-100">Reset Your Password</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Enter your email address and we'll generate a secure reset link for your account.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full px-3.5 py-2.5 bg-[#021816] border border-emerald-900/50 rounded-xl text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold"
                isLoading={isLoading}
              >
                Send Reset Instructions
              </Button>

              <button
                type="button"
                onClick={() => setMode('login')}
                className="w-full text-center text-xs text-zinc-400 hover:text-zinc-200 mt-2"
              >
                Back to Sign In
              </button>
            </form>
          )}

          {/* 5. RESET PASSWORD STEP */}
          {mode === 'reset' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="text-left">
                <h3 className="text-sm font-semibold text-zinc-100">Create New Password</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Enter your reset token and your new chosen password.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">Reset Token</label>
                <input
                  type="text"
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  placeholder="Token"
                  required
                  className="w-full px-3 py-2 bg-[#021816] border border-emerald-900/50 rounded-xl text-xs text-zinc-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  minLength={8}
                  className="w-full px-3.5 py-2.5 bg-[#021816] border border-emerald-900/50 rounded-xl text-sm text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  minLength={8}
                  className="w-full px-3.5 py-2.5 bg-[#021816] border border-emerald-900/50 rounded-xl text-sm text-zinc-100"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold"
                isLoading={isLoading}
              >
                Update Password
              </Button>

              <button
                type="button"
                onClick={() => setMode('login')}
                className="w-full text-center text-xs text-zinc-400 hover:text-zinc-200 mt-2"
              >
                Back to Sign In
              </button>
            </form>
          )}

          {/* Quick Demo Credentials Footer (Development Mode Only) */}
          {import.meta.env.DEV && (
            <div className="mt-6 pt-5 border-t border-emerald-900/40 text-center">
              <button
                type="button"
                onClick={fillSeedCredentials}
                className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
              >
                <KeyRound className="w-3.5 h-3.5" />
                Fill Seed Account (user@fitpulse.ai)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default LoginPage;
