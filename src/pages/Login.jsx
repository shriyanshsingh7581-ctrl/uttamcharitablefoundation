import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  LogIn, 
  Lock, 
  Mail, 
  Phone, 
  AlertCircle, 
  Loader2, 
  ShieldCheck,
  Eye,
  EyeOff,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { FOUNDATION_DETAILS, safeText } from '../lib/constants';

export default function Login() {
  const navigate = useNavigate();
  const { loginUser, loginWithGoogle } = useAuth();
  const { bi } = useLanguage();

  const [identifier, setIdentifier] = useState(''); // Email / Member ID / Phone
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!identifier.trim()) {
      setErrorMsg('कृपया ईमेल, सदस्य आईडी (Member ID) अथवा मोबाइल नंबर दर्ज करें।');
      return;
    }
    if (!password) {
      setErrorMsg('कृपया पासवर्ड दर्ज करें।');
      return;
    }

    setLoading(true);
    try {
      await loginUser(identifier.trim(), password);
      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      let msg = 'लॉगिन विफल रहा। कृपया अपनी साख (Credentials) जांचें।';
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = 'गलत पासवर्ड अथवा क्रेडेंशियल। कृपया पुनः प्रयास करें।';
      } else if (err.code === 'auth/user-not-found') {
        msg = 'यह सदस्य पंजीकृत नहीं है। कृपया पहले नया खाता बनाएं।';
      } else if (err.message) {
        msg = err.message;
      }
      setErrorMsg(msg);
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      navigate('/dashboard');
    } catch (err) {
      console.error('Google sign in error:', err);
      setErrorMsg('गूगल लॉगिन विफल रहा: ' + (err.message || ''));
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-10 sm:py-16 px-3 sm:px-4 flex items-center justify-center relative overflow-hidden w-full max-w-full">
      {/* Ambient background flares */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-emerald-500/15 rounded-full blur-[90px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-amber-500/15 rounded-full blur-[90px] pointer-events-none" />

      <div className="w-full max-w-md mx-auto glass-card-premium p-5 sm:p-10 rounded-3xl space-y-6 relative z-10 shadow-2xl">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass-pill text-emerald-800 text-xs font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>{bi('आधिकारिक सदस्य प्रवेश', 'Official Member Access')}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {bi('सदस्य लॉगिन', 'Member Login')}
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            {bi(safeText(FOUNDATION_DETAILS.nameHindi), safeText(FOUNDATION_DETAILS.nameEnglish))}
          </p>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-2.5 text-xs text-red-700 backdrop-blur-md">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{safeText(errorMsg)}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Universal Identifier Input */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              Member ID / Username / Mobile No. / Email *
            </label>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="UCWF-2026-XXXX या यूज़रनेम (नाम) या 9540648402"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl glass-input text-xs font-bold text-slate-900 placeholder:text-slate-400 outline-none"
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1.5">
              आप अपने सदस्य आईडी (UCWF-XXXX), यूज़रनेम (नाम), 10 अंकों के मोबाइल अथवा ईमेल से लॉगिन कर सकते हैं।
            </p>
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-800">
                Password (गोपनीय पासवर्ड) *
              </label>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-11 rounded-2xl glass-input text-xs font-bold text-slate-900 placeholder:text-slate-400 outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 active:scale-[0.99] text-white font-black text-xs sm:text-sm shadow-lg shadow-emerald-700/25 border border-white/20 transition flex items-center justify-center gap-2 disabled:opacity-50 mt-2 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{bi('प्रमाणन जारी है...', 'Signing in...')}</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>{bi('लॉगिन करें / विवरण देखें', 'Login / View My Details')}</span>
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-slate-200/80"></div>
          <span className="flex-shrink mx-3 text-slate-400 text-xs font-medium">{bi('अथवा', 'OR')}</span>
          <div className="flex-grow border-t border-slate-200/80"></div>
        </div>

        {/* Google Sign-in Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
          className="w-full py-3 px-4 rounded-2xl glass-pill hover:bg-white/95 active:scale-[0.99] text-slate-700 font-bold text-xs transition flex items-center justify-center gap-2.5 disabled:opacity-50 shadow-xs cursor-pointer"
        >
          {googleLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          )}
          <span>{bi('Google द्वारा त्वरित प्रवेश', 'Continue with Google')}</span>
        </button>

        {/* Links */}
        <div className="pt-2 text-center space-y-2.5 text-xs">
          <p className="text-slate-600">
            {bi('नया सदस्य बनना चाहते हैं?', 'New member?')}{' '}
            <Link to="/register" className="font-extrabold text-emerald-700 hover:text-emerald-800 underline">
              {bi('यहाँ नया खाता बनाएं', 'Create New Account')}
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
