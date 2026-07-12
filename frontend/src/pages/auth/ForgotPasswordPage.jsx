import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, KeyRound, Lock, ArrowLeft, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { forgotPassword, verifyOtp, resetPassword } from '../../api/auth';
import { cn } from '../../lib/utils';

const STEPS = ['email', 'otp', 'password', 'done'];

const inputCls = 'w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all focus:bg-slate-800';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step,        setStep]        = useState('email');
  const [email,       setEmail]       = useState('');
  const [otp,         setOtp]         = useState(['', '', '', '', '', '']);
  const [password,    setPassword]    = useState('');
  const [confirm,     setConfirm]     = useState('');
  const [showPw,      setShowPw]      = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');

  const otpRefs = useRef([]);

  /* ── Step 1: Send OTP ── */
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    if (!email) { setError('Please enter your email.'); return; }
    setLoading(true);
    try {
      await forgotPassword(email);
      toast.success('OTP sent to your email — check your inbox.');
      setStep('otp');
    } catch (err) {
      setError(err.response?.data?.error?.message ?? 'Failed to send OTP. Check the email address.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Step 2: Verify OTP ── */
  const otpValue = otp.join('');

  const handleOtpChange = (val, idx) => {
    const digits = val.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[idx] = digits;
    setOtp(next);
    if (digits && idx < 5) otpRefs.current[idx + 1]?.focus();
  };

  const handleOtpKeyDown = (e, idx) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      otpRefs.current[5]?.focus();
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    if (otpValue.length < 6) { setError('Enter the full 6-digit code.'); return; }
    setLoading(true);
    try {
      await verifyOtp(email, otpValue);
      toast.success('OTP verified — set your new password.');
      setStep('password');
    } catch (err) {
      setError(err.response?.data?.error?.message ?? 'Invalid or expired OTP.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Step 3: Reset password ── */
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      await resetPassword(email, otpValue, password);
      toast.success('Password reset successfully!');
      setStep('done');
    } catch (err) {
      setError(err.response?.data?.error?.message ?? 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-transparent">
      {/* ── Left branding panel ── */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] glass-panel border-r border-white/5 p-10 shrink-0 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-[80px] -z-10 rounded-full" />
        <div>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/5 border border-amber-500/30 flex items-center justify-center mb-6 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
            <div className="w-6 h-6 bg-gradient-to-br from-amber-400 to-amber-600 rounded-md shadow-inner" />
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight mb-2">TransitOps</h1>
          <p className="text-base text-slate-400 font-medium leading-relaxed">Smart Transport Operations Platform</p>
        </div>

        {/* Step indicator */}
        <div className="space-y-3">
          {[
            { key: 'email',    label: 'Enter email' },
            { key: 'otp',      label: 'Verify OTP' },
            { key: 'password', label: 'Set new password' },
          ].map(({ key, label }, i) => {
            const done    = STEPS.indexOf(step) > STEPS.indexOf(key);
            const current = step === key || (step === 'done' && key === 'password');
            return (
              <div key={key} className="flex items-center gap-3">
                <div className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 transition-all',
                  done    ? 'bg-emerald-500 text-white' :
                  current ? 'bg-amber-500 text-slate-900' :
                  'bg-slate-800 text-slate-600'
                )}>
                  {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <span className={cn('text-sm', current ? 'text-white font-semibold' : done ? 'text-emerald-400' : 'text-slate-600')}>{label}</span>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-slate-600">TRANSITOPS © 2026 · RBAC #4</p>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/5 blur-[100px] -z-10 rounded-full" />
        <div className="w-full max-w-md glass-panel p-8 sm:p-10 rounded-2xl animate-fade-in-up">

          {/* ── Step 1: Email ── */}
          {step === 'email' && (
            <>
              <div className="mb-8 text-center">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-5 h-5 text-amber-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-1">Forgot Password?</h2>
                <p className="text-sm text-slate-400">Enter your account email — we'll send a 6-digit code.</p>
              </div>

              <form onSubmit={handleSendOtp} className="space-y-5">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Email</label>
                  <input
                    type="email" required autoFocus
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                    placeholder="you@example.com"
                    className={inputCls}
                  />
                </div>

                {error && <ErrorBox message={error} />}

                <button type="submit" disabled={loading} className="w-full btn-amber py-3 font-bold rounded-xl text-sm disabled:opacity-50">
                  {loading ? 'Sending…' : 'Send OTP'}
                </button>

                <Link to="/login" className="flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors">
                  <ArrowLeft className="w-3 h-3" /> Back to Sign In
                </Link>
              </form>
            </>
          )}

          {/* ── Step 2: OTP ── */}
          {step === 'otp' && (
            <>
              <div className="mb-8 text-center">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center mx-auto mb-4">
                  <KeyRound className="w-5 h-5 text-blue-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-1">Check Your Email</h2>
                <p className="text-sm text-slate-400">
                  We sent a 6-digit code to <span className="text-slate-200 font-medium">{email}</span>
                </p>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-5">
                {/* OTP boxes */}
                <div className="flex gap-2.5 justify-center" onPaste={handleOtpPaste}>
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => (otpRefs.current[i] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(e.target.value, i)}
                      onKeyDown={(e) => handleOtpKeyDown(e, i)}
                      className={cn(
                        'w-11 h-12 text-center text-lg font-bold rounded-xl border transition-all focus:outline-none',
                        digit
                          ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                          : 'bg-slate-900/50 border-white/10 text-slate-100',
                        'focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50'
                      )}
                    />
                  ))}
                </div>

                {error && <ErrorBox message={error} />}

                <button type="submit" disabled={loading || otpValue.length < 6} className="w-full btn-amber py-3 font-bold rounded-xl text-sm disabled:opacity-50">
                  {loading ? 'Verifying…' : 'Verify Code'}
                </button>

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <button type="button" onClick={() => setStep('email')} className="flex items-center gap-1 hover:text-slate-300 transition-colors">
                    <ArrowLeft className="w-3 h-3" /> Change email
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setError('');
                      try {
                        await forgotPassword(email);
                        toast.success('New OTP sent.');
                        setOtp(['', '', '', '', '', '']);
                        otpRefs.current[0]?.focus();
                      } catch {
                        toast.error('Could not resend OTP.');
                      }
                    }}
                    className="text-amber-400 hover:text-amber-300 transition-colors"
                  >
                    Resend code
                  </button>
                </div>
              </form>
            </>
          )}

          {/* ── Step 3: New password ── */}
          {step === 'password' && (
            <>
              <div className="mb-8 text-center">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-5 h-5 text-emerald-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-1">Set New Password</h2>
                <p className="text-sm text-slate-400">Choose a strong password for your account.</p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-5">
                <PasswordField label="New Password" value={password} onChange={setPassword} show={showPw} onToggle={() => setShowPw(v => !v)} />
                <PasswordField label="Confirm Password" value={confirm} onChange={setConfirm} show={showConfirm} onToggle={() => setShowConfirm(v => !v)} />

                {error && <ErrorBox message={error} />}

                <button type="submit" disabled={loading} className="w-full btn-amber py-3 font-bold rounded-xl text-sm disabled:opacity-50">
                  {loading ? 'Resetting…' : 'Reset Password'}
                </button>
              </form>
            </>
          )}

          {/* ── Step 4: Done ── */}
          {step === 'done' && (
            <div className="text-center space-y-5 py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Password Reset!</h2>
                <p className="text-sm text-slate-400">Your password has been updated. You can now sign in.</p>
              </div>
              <button
                onClick={() => navigate('/login')}
                className="w-full btn-amber py-3 font-bold rounded-xl text-sm"
              >
                Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ErrorBox({ message }) {
  return (
    <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2.5">
      <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
      <p className="text-sm text-red-400">{message}</p>
    </div>
  );
}

function PasswordField({ label, value, onChange, show, onToggle }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          required
          minLength={6}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="••••••••"
          className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all pr-10 focus:bg-slate-800"
        />
        <button type="button" onClick={onToggle} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 transition-colors">
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
