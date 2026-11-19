import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ShieldAlert, 
  Lock, 
  UserCheck, 
  AlertCircle, 
  Loader2, 
  Building2,
  Eye,
  EyeOff,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { FOUNDATION_DETAILS, safeText } from '../lib/constants';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { loginAdmin, loginWithGoogle, isAdmin, loading: authLoading } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!authLoading && isAdmin && window.location.pathname !== '/admin') {
      navigate('/admin', { replace: true });
    }
  }, [isAdmin, authLoading, navigate]);

  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const targetUser = username.trim() || 'admin';

    if (!password) {
      setErrorMsg('कृपया व्यवस्थापक पासवर्ड दर्ज करें। (Please enter Admin Password)');
      return;
    }

    setLoading(true);
    try {
      await loginAdmin(targetUser, password);
      setLoading(false);
      navigate('/admin', { replace: true });
    } catch (err) {
      console.error('Admin login error:', err);
      setErrorMsg(err.message || 'अमान्य व्यवस्थापक क्रेडेंशियल!');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-pink-50/50 py-10 sm:py-16 px-3 sm:px-4 flex items-center justify-center w-full max-w-full">
      <div className="w-full max-w-md mx-auto bg-white border border-pink-200/80 rounded-3xl p-5 sm:p-8 shadow-xl text-slate-900 space-y-6">
        
        {/* Back Link */}
        <Link 
          to="/" 
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-pink-600 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Main Website</span>
        </Link>

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-pink-100 border border-pink-200 text-pink-700 mx-auto flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Super Admin Portal
          </h2>
          <p className="text-xs text-pink-700 font-mono font-bold tracking-wider">
            SECURE MANAGEMENT CONSOLE
          </p>
          <p className="text-[11px] text-slate-500">
            {safeText(FOUNDATION_DETAILS.nameEnglish)}
          </p>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs text-red-700 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{safeText(errorMsg)}</span>
          </div>
        )}

        <div className="p-3 bg-pink-50 border border-pink-200 rounded-2xl text-[11px] text-pink-900 space-y-1">
          <p className="font-bold flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-pink-700" />
            <span>व्यवस्थापक क्रेडेंशियल्स (Admin Credentials):</span>
          </p>
          <div className="flex flex-wrap items-center justify-between gap-1 text-[11px]">
            <span>User: <strong className="font-mono text-slate-900">admin</strong> या <strong className="font-mono text-slate-900">9540648402</strong></span>
            <span>Pass: <strong className="font-mono text-slate-900">Admin@2026</strong></span>
          </div>
          <button
            type="button"
            onClick={() => {
              setUsername('admin');
              setPassword('Admin@2026');
            }}
            className="text-[10px] text-pink-700 font-extrabold underline hover:text-pink-900 mt-0.5 cursor-pointer block"
          >
            ⚡ क्रेडेंशियल्स स्वतः भरें (Auto-Fill Credentials)
          </button>
        </div>

        <form onSubmit={handleAdminSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Admin Username / Email / Mobile
            </label>
            <input
              type="text"
              placeholder="admin या 9540648402"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Admin Secret Password *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 active:scale-[0.99] text-white font-extrabold text-xs shadow-lg shadow-pink-600/20 transition flex items-center justify-center gap-2 disabled:opacity-50 mt-2 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authenticating Credentials...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Login to Admin Panel</span>
              </>
            )}
          </button>
        </form>

        <div className="space-y-2">
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-3 text-[10px] font-bold uppercase text-slate-400">
              OR Cloud Firestore Sync Login
            </span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          <button
            type="button"
            disabled={loading || googleLoading}
            onClick={async () => {
              setErrorMsg('');
              setGoogleLoading(true);
              try {
                const res = await loginWithGoogle();
                const signedEmail = (res?.user?.email || '').trim().toLowerCase();
                if (signedEmail === 'singhshriyansh51@gmail.com' || signedEmail === 'admin@ucwf.online') {
                  navigate('/admin', { replace: true });
                } else {
                  setErrorMsg(`Signed in as ${res?.user?.email}. Cloud Admin sync requires singhshriyansh51@gmail.com, or login above with Admin credentials.`);
                }
              } catch (err) {
                console.error('Google admin login error:', err);
                setErrorMsg(err?.message || 'Google Sign-In रद्द किया गया या विफल रहा।');
              } finally {
                setGoogleLoading(false);
              }
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold text-xs shadow-xs transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {googleLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-pink-600" />
                <span>Connecting Google Cloud Sync...</span>
              </>
            ) : (
              <>
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>Google से Cloud Sync / Admin Login</span>
              </>
            )}
          </button>
        </div>

        <div className="pt-3 text-center text-xs text-slate-500 border-t border-slate-100 flex flex-col items-center gap-1.5">
          <p>
            सदस्य हैं?{' '}
            <Link to="/login" className="font-extrabold text-pink-700 hover:text-pink-800 underline">
              यहाँ से मेंबर पोर्टल में लॉगिन करें (Member Login)
            </Link>
          </p>
          <span className="text-[10px] text-slate-400">
            Authorized personnel only. All access attempts are securely recorded.
          </span>
        </div>

      </div>
    </div>
  );
}
