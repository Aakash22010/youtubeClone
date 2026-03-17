import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { FiMail, FiLock, FiUser, FiAlertCircle, FiShield, FiSun, FiMoon } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import { detectLocationTheme } from '../utils/locationTheme';

export default function Signup() {
  const { signup, googleLogin } = useAuth();
  const { theme, setTheme }     = useTheme();
  const router                  = useRouter();

  const [displayName,      setDisplayName]      = useState('');
  const [email,            setEmail]            = useState('');
  const [password,         setPassword]         = useState('');
  const [confirmPassword,  setConfirmPassword]  = useState('');
  const [error,            setError]            = useState('');
  const [loading,          setLoading]          = useState(false);

  const [isSouthIndia,  setIsSouthIndia]  = useState(false);
  const [locationReady, setLocationReady] = useState(false);

  useEffect(() => {
    detectLocationTheme().then(result => {
      setIsSouthIndia(result.isSouthIndia);
      setLocationReady(true);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) return setError('Passwords do not match');
    if (password.length < 6) return setError('Password must be at least 6 characters');

    setLoading(true);
    try {
      await signup(email, password);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Failed to create an account');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      await googleLogin();
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');
  const isDark      = theme === 'dark';

  const inputCls = `w-full pl-10 pr-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
    isDark
      ? 'bg-[#2a2a2a] border-[#3f3f3f] text-white placeholder-gray-500'
      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
  }`;

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 py-12 transition-colors duration-300 ${
      isDark ? 'bg-[#0f0f0f]' : 'bg-gray-50'
    }`}>
      <div className={`max-w-md w-full space-y-6 p-8 rounded-2xl shadow-xl transition-colors duration-300 ${
        isDark ? 'bg-[#1f1f1f]' : 'bg-white'
      }`}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="text-center relative">
          <button
            onClick={toggleTheme}
            className={`absolute right-0 top-0 p-2 rounded-full transition-colors ${
              isDark
                ? 'text-gray-400 hover:text-white hover:bg-white/10'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
            }`}
            title="Toggle theme"
          >
            {isDark ? <FiSun size={18}/> : <FiMoon size={18}/>}
          </button>

          <Link href="/" className="inline-block">
            <span className="text-3xl font-bold text-red-600">YouTube</span>
          </Link>
          <h2 className={`mt-3 text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Create your account
          </h2>
          <p className={`mt-1.5 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Or{' '}
            <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400">
              sign in to existing account
            </Link>
          </p>

          {/* Region badge */}
          {locationReady && (
            <div className="mt-2 flex justify-center">
              <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                isSouthIndia
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              }`}>
                <FiShield size={11}/>
                {isSouthIndia ? 'South India' : 'Other region'}
              </span>
            </div>
          )}
        </div>

        {/* ── Error ───────────────────────────────────────────────────────── */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-start gap-2">
            <FiAlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={16}/>
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* ── Google ──────────────────────────────────────────────────────── */}
        <button
          onClick={handleGoogle}
          disabled={loading}
          className={`w-full flex items-center justify-center gap-3 py-2.5 px-4 border rounded-lg text-sm font-medium transition-colors ${
            isDark
              ? 'border-[#3f3f3f] text-white hover:bg-white/5'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          } disabled:opacity-50`}
        >
          <FcGoogle size={20}/>
          Continue with Google
        </button>

        <div className="flex items-center gap-3">
          <hr className={`flex-1 ${isDark ? 'border-[#3f3f3f]' : 'border-gray-200'}`}/>
          <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>or sign up with email</span>
          <hr className={`flex-1 ${isDark ? 'border-[#3f3f3f]' : 'border-gray-200'}`}/>
        </div>

        {/* ── Form ────────────────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Display Name */}
          <div>
            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Display Name <span className={`font-normal ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>(optional)</span>
            </label>
            <div className="relative">
              <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
              <input
                type="text" value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Your name"
                className={inputCls}
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Email address
            </label>
            <div className="relative">
              <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
              <input
                type="email" required value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputCls}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Password
            </label>
            <div className="relative">
              <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
              <input
                type="password" required value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className={inputCls}
              />
            </div>
            <p className={`mt-1 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              Must be at least 6 characters
            </p>
          </div>

          {/* Confirm Password */}
          <div>
            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Confirm Password
            </label>
            <div className="relative">
              <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
              <input
                type="password" required value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className={`${inputCls} ${
                  confirmPassword && confirmPassword !== password
                    ? 'border-red-400 focus:ring-red-500'
                    : ''
                }`}
              />
            </div>
            {confirmPassword && confirmPassword !== password && (
              <p className="mt-1 text-xs text-red-500">Passwords do not match</p>
            )}
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className={`text-xs text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          By signing up, you agree to our Terms and Privacy Policy.
        </p>
      </div>
    </div>
  );
}