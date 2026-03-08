import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  FiMail, FiLock, FiAlertCircle, FiPhone, FiShield, FiSun, FiMoon,
} from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
} from 'firebase/auth';
import api from '../lib/api';
import { detectLocationTheme, AuthMethod } from '../utils/locationTheme';

// ── Steps ─────────────────────────────────────────────────────────────────────
type Step = 'credentials' | 'otp';

// ── Recaptcha container id ────────────────────────────────────────────────────
const RECAPTCHA_ID = 'recaptcha-container';

export default function Login() {
  const { login, googleLogin } = useAuth();
  const { theme, setTheme }        = useTheme();
  const router                     = useRouter();

  // ── Form state ─────────────────────────────────────────────────────────────
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [phone,    setPhone]    = useState('');   // for phone OTP users
  const [otp,      setOtp]      = useState('');
  const [step,     setStep]     = useState<Step>('credentials');
  const [error,    setError]    = useState('');
  const [info,     setInfo]     = useState('');
  const [loading,  setLoading]  = useState(false);

  // ── Location / auth method ─────────────────────────────────────────────────
  const [authMethod,   setAuthMethod]   = useState<AuthMethod>('phone-otp');
  const [isSouthIndia, setIsSouthIndia] = useState(false);
  const [locationReady, setLocationReady] = useState(false);

  // ── Firebase phone OTP ─────────────────────────────────────────────────────
  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const recaptchaRef    = useRef<RecaptchaVerifier | null>(null);

  // ── Detect location on mount ───────────────────────────────────────────────
  useEffect(() => {
    detectLocationTheme().then(result => {
      setAuthMethod(result.authMethod);
      setIsSouthIndia(result.isSouthIndia);
      setLocationReady(true);
    });
  }, []);

  // ── Step 1: submit credentials ─────────────────────────────────────────────
  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (authMethod === 'email-otp') {
        // South India: send OTP to email then proceed to OTP step
        await api.post('/otp/send', { email });
        setInfo(`A 6-digit OTP has been sent to ${email}`);
        setStep('otp');
      } else {
        // Non-South India: need phone number — send Firebase phone OTP
        if (!phone) {
          setError('Please enter your phone number to receive OTP.');
          return;
        }
        await sendFirebasePhoneOTP(phone);
        setInfo(`A 6-digit OTP has been sent to ${phone}`);
        setStep('otp');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  // ── Firebase phone OTP sender ──────────────────────────────────────────────
  const sendFirebasePhoneOTP = async (phoneNumber: string) => {
    const auth = getAuth();

    // Destroy old verifier if it exists
    if (recaptchaRef.current) {
      recaptchaRef.current.clear();
      recaptchaRef.current = null;
    }

    const verifier = new RecaptchaVerifier(auth, RECAPTCHA_ID, {
      size: 'invisible',
    });
    recaptchaRef.current = verifier;

    const formatted = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
    confirmationRef.current = await signInWithPhoneNumber(auth, formatted, verifier);
  };

  // ── Step 2: verify OTP ─────────────────────────────────────────────────────
  const handleOTPVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (authMethod === 'email-otp') {
        // 1. Verify OTP with our backend
        const { data } = await api.post('/otp/verify', { email, otp });
        if (!data.success) throw new Error('Invalid OTP');

        // 2. Sign in with Firebase email+password
        await login(email, password);
      } else {
        // 1. Confirm Firebase phone OTP
        if (!confirmationRef.current) throw new Error('Session expired. Please try again.');
        await confirmationRef.current.confirm(otp);
        // Firebase is now signed in — AuthContext will pick it up
      }
      router.push('/');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  // ── Resend OTP ─────────────────────────────────────────────────────────────
  const handleResend = async () => {
    setError('');
    setOtp('');
    setLoading(true);
    try {
      if (authMethod === 'email-otp') {
        await api.post('/otp/send', { email });
        setInfo(`OTP resent to ${email}`);
      } else {
        await sendFirebasePhoneOTP(phone);
        setInfo(`OTP resent to ${phone}`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  // ── Google sign-in ─────────────────────────────────────────────────────────
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

  // ── Theme toggle ───────────────────────────────────────────────────────────
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  // ── UI helpers ─────────────────────────────────────────────────────────────
  const isDark    = theme === 'dark';
  const otpTarget = authMethod === 'email-otp' ? email : phone;

  // ── Region badge ───────────────────────────────────────────────────────────
  const regionBadge = locationReady ? (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
      isSouthIndia
        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    }`}>
      <FiShield size={11}/>
      {isSouthIndia ? 'South India — Email OTP' : 'Other region — Mobile OTP'}
    </span>
  ) : null;

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 py-12 transition-colors duration-300 ${
      isDark ? 'bg-[#0f0f0f]' : 'bg-gray-50'
    }`}>

      {/* Invisible recaptcha container for Firebase phone auth */}
      <div id={RECAPTCHA_ID} />

      <div className={`max-w-md w-full space-y-6 p-8 rounded-2xl shadow-xl transition-colors duration-300 ${
        isDark ? 'bg-[#1f1f1f]' : 'bg-white'
      }`}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="text-center relative">
          {/* Theme toggle */}
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
            {step === 'credentials' ? 'Sign in to your account' : 'Enter your OTP'}
          </h2>
          <p className={`mt-1.5 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {step === 'credentials' ? (
              <>Or{' '}
                <Link href="/signup" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400">
                  create a new account
                </Link>
              </>
            ) : (
              `We sent a code to ${otpTarget}`
            )}
          </p>

          {/* Region badge */}
          {step === 'credentials' && (
            <div className="mt-2 flex justify-center">{regionBadge}</div>
          )}
        </div>

        {/* ── Error ───────────────────────────────────────────────────────── */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-start gap-2">
            <FiAlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={16}/>
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* ── Info ────────────────────────────────────────────────────────── */}
        {info && !error && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-sm text-blue-700 dark:text-blue-300">{info}</p>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            STEP 1 — Credentials
        ══════════════════════════════════════════════════════════════════ */}
        {step === 'credentials' && (
          <>
            {/* Google */}
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
              <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>or sign in with email</span>
              <hr className={`flex-1 ${isDark ? 'border-[#3f3f3f]' : 'border-gray-200'}`}/>
            </div>

            <form onSubmit={handleCredentials} className="space-y-4">
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
                    className={`w-full pl-10 pr-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                      isDark
                        ? 'bg-[#2a2a2a] border-[#3f3f3f] text-white placeholder-gray-500'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                    }`}
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
                    className={`w-full pl-10 pr-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                      isDark
                        ? 'bg-[#2a2a2a] border-[#3f3f3f] text-white placeholder-gray-500'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                    }`}
                  />
                </div>
              </div>

              {/* Phone — only for non-South India */}
              {authMethod === 'phone-otp' && (
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Mobile number <span className="text-gray-400 font-normal">(for OTP)</span>
                  </label>
                  <div className="relative">
                    <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                    <input
                      type="tel" value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className={`w-full pl-10 pr-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                        isDark
                          ? 'bg-[#2a2a2a] border-[#3f3f3f] text-white placeholder-gray-500'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                      }`}
                    />
                  </div>
                  <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    Include country code e.g. +91 for India
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="h-4 w-4 text-blue-600 rounded border-gray-300 dark:bg-[#2a2a2a] dark:border-[#3f3f3f]"/>
                  <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Remember me</span>
                </label>
                <a href="#" className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 font-medium">
                  Forgot password?
                </a>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading
                  ? 'Sending OTP...'
                  : authMethod === 'email-otp'
                  ? 'Continue — Send Email OTP'
                  : 'Continue — Send Mobile OTP'}
              </button>
            </form>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            STEP 2 — OTP entry
        ══════════════════════════════════════════════════════════════════ */}
        {step === 'otp' && (
          <form onSubmit={handleOTPVerify} className="space-y-5">
            <div className={`rounded-xl p-4 text-center ${isDark ? 'bg-[#2a2a2a]' : 'bg-gray-50'}`}>
              <div className="flex justify-center mb-2">
                {authMethod === 'email-otp'
                  ? <FiMail size={28} className="text-blue-500"/>
                  : <FiPhone size={28} className="text-blue-500"/>}
              </div>
              <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {authMethod === 'email-otp' ? 'Check your email' : 'Check your phone'}
              </p>
              <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Sent a 6-digit code to <strong>{otpTarget}</strong>
              </p>
            </div>

            {/* OTP input */}
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Enter 6-digit OTP
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="— — — — — —"
                className={`w-full text-center text-2xl font-bold tracking-[0.5em] py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                  isDark
                    ? 'bg-[#2a2a2a] border-[#3f3f3f] text-white placeholder-gray-600'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-300'
                }`}
              />
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Verifying...' : 'Verify & Sign in'}
            </button>

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => { setStep('credentials'); setOtp(''); setError(''); setInfo(''); }}
                className={`font-medium ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={handleResend}
                disabled={loading}
                className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 disabled:opacity-50"
              >
                Resend OTP
              </button>
            </div>
          </form>
        )}

        <p className={`text-xs text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          By signing in, you agree to our Terms and Privacy Policy.
        </p>
      </div>
    </div>
  );
}