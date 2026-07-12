import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/useAuth';
import { login as loginApi } from '../../api/auth';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm]       = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  // Already logged in
  if (user) {
    navigate(user.role === 'DRIVER' ? '/portal' : '/dashboard', { replace: true });
    return null;
  }

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError('Email and password are required.');
      return;
    }
    setLoading(true);
    try {
      const res = await loginApi(form.email, form.password);
      const { token, user: userData } = res.data.data;
      login(userData, token);
      toast.success(`Welcome back, ${userData.name}!`);
      navigate(userData.role === 'DRIVER' ? '/portal' : '/dashboard', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Invalid email or password.';
      setError(msg);
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
          {/* Logo mark */}
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/5 border border-amber-500/30 flex items-center justify-center mb-6 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
            <div className="w-6 h-6 bg-gradient-to-br from-amber-400 to-amber-600 rounded-md shadow-inner" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent drop-shadow-sm tracking-tight mb-2">TransitOps</h1>
          <p className="text-base text-slate-400 font-medium leading-relaxed">Smart Transport Operations Platform</p>
        </div>



        <p className="text-xs text-slate-600">TRANSITOPS © 2026 · RBAC #4</p>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/5 blur-[100px] -z-10 rounded-full" />
        <div className="w-full max-w-md glass-panel p-8 sm:p-10 rounded-2xl animate-fade-in-up">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Welcome Back</h2>
            <p className="text-sm text-slate-400">Enter your credentials to access your account</p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
                placeholder="user@gmail.com"
                className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all focus:bg-slate-800"
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Password
                </label>
                <Link to="/forgot-password" className="text-xs text-amber-400 hover:text-amber-300 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all pr-10 focus:bg-slate-800"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-bold py-3 px-4 rounded-xl text-sm transition-all shadow-[0_4px_14px_0_rgba(245,158,11,0.39)] hover:shadow-[0_6px_20px_rgba(245,158,11,0.23)] hover:-translate-y-0.5 active:translate-y-0"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>


        </div>
      </div>
    </div>
  );
}
