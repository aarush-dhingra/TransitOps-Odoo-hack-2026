import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/useAuth';
import { login as loginApi } from '../../api/auth';
import { AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm]       = useState({ email: '', password: '' });
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
    <div className="min-h-screen flex bg-slate-950">
      {/* ── Left branding panel ── */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] bg-slate-900 border-r border-slate-800 p-10 shrink-0">
        <div>
          {/* Logo mark */}
          <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mb-4">
            <div className="w-5 h-5 bg-amber-400 rounded-sm" />
          </div>
          <h1 className="text-2xl font-bold text-white">TransitOps</h1>
          <p className="text-sm text-slate-400 mt-1">Smart Transport Operations Platform</p>
        </div>



        <p className="text-xs text-slate-600">TRANSITOPS © 2026 · RBAC #4</p>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white">Sign in to your account</h2>
            <p className="text-sm text-slate-400 mt-1">Enter your credentials to continue</p>
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
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-md text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-md text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
              />
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
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-semibold py-2.5 px-4 rounded-md text-sm transition-colors"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>


        </div>
      </div>
    </div>
  );
}
