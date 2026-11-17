import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  Award, 
  Users, 
  Heart, 
  GraduationCap, 
  HeartPulse, 
  Trees, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  QrCode, 
  Copy, 
  Check, 
  ChevronRight,
  Building2,
  FileText,
  IndianRupee,
  Share2,
  Calendar,
  Eye,
  EyeOff,
  LogIn,
  UserCheck,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { rtdb } from '../lib/firebase';
import { ref, onValue } from 'firebase/database';
import { FOUNDATION_DETAILS, PACKAGES, formatINR, safeText } from '../lib/constants';
import { parseAmount } from '../utils/mlmUtils';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useDiwaliTheme } from '../contexts/DiwaliThemeContext';
import MemberReportLookup from '../components/MemberReportLookup';
import DiwaliBanner from '../components/diwali/DiwaliBanner';
import GlowingDiya from '../components/diwali/GlowingDiya';
import FeaturedVideoShowcase from '../components/media/FeaturedVideoShowcase';
import PostersShowcase from '../components/media/PostersShowcase';
import SafeQRCode from '../components/ui/SafeQRCode';

export default function Home() {
  const navigate = useNavigate();
  const { currentUser, member, loginUser, logout } = useAuth();
  const { bi } = useLanguage();
  const { isDiwaliActive } = useDiwaliTheme();
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [topPortalTab, setTopPortalTab] = useState('login'); // 'login' | 'report'
  
  // Homepage Member Login Card State
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const handleMemberLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    if (!loginIdentifier.trim()) {
      setLoginError('कृपया सदस्य ID या मोबाइल नंबर दर्ज करें (Please enter ID No. or Mobile)');
      return;
    }
    if (!loginPassword) {
      setLoginError('कृपया पासवर्ड दर्ज करें (Please enter Password)');
      return;
    }
    setLoginLoading(true);
    try {
      await loginUser(loginIdentifier.trim(), loginPassword);
      navigate('/dashboard');
    } catch (err) {
      console.error('Homepage login error:', err);
      let msg = 'लॉगिन विफल रहा। कृपया आईडी/मोबाइल अथवा पासवर्ड जांचें।';
      if (err.message) msg = err.message;
      setLoginError(msg);
      setLoginLoading(false);
    }
  };
  
  // Realtime Live Stats from Firebase RTDB (Starting strictly at 0)
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalFundsRaised: 0,
    totalCharitySpends: 0,
    approvedMediaCount: 0
  });

  // Approved Media Gallery Preview
  const [recentMedia, setRecentMedia] = useState([]);

  useEffect(() => {
    const onErr = (err) => console.warn('Home RTDB listener notice:', err);
    let usersVolume = 0;
    let paymentsVolume = 0;

    // 1. Members count & aggregate package volume
    const usersRef = ref(rtdb, 'users');
    const unsubscribeUsers = onValue(usersRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const entries = Object.values(data).filter(Boolean);
        const count = entries.length;
        usersVolume = entries.reduce((sum, u) => sum + parseAmount(u), 0);
        setStats(prev => ({
          ...prev,
          totalMembers: count,
          totalFundsRaised: Math.max(usersVolume, paymentsVolume)
        }));
      } else {
        usersVolume = 0;
        setStats(prev => ({
          ...prev,
          totalMembers: 0,
          totalFundsRaised: paymentsVolume
        }));
      }
    }, onErr);

    // 2. Approved Funds raised
    const paymentsRef = ref(rtdb, 'payment_requests');
    const unsubscribePayments = onValue(paymentsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        let total = 0;
        Object.values(data).forEach(p => {
          if (p && p.status === 'approved') {
            total += Number(p.amount || 0);
          }
        });
        paymentsVolume = total;
        setStats(prev => ({
          ...prev,
          totalFundsRaised: Math.max(usersVolume, paymentsVolume)
        }));
      } else {
        paymentsVolume = 0;
        setStats(prev => ({
          ...prev,
          totalFundsRaised: usersVolume
        }));
      }
    }, onErr);

    // 3. Charity Spends
    const spendsRef = ref(rtdb, 'spends');
    const unsubscribeSpends = onValue(spendsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        let total = 0;
        Object.values(data).forEach(s => {
          total += Number(s.amount || 0);
        });
        setStats(prev => ({ ...prev, totalCharitySpends: total }));
      } else {
        setStats(prev => ({ ...prev, totalCharitySpends: 0 }));
      }
    }, onErr);

    // 4. Approved Media
    const mediaRef = ref(rtdb, 'media_submissions');
    const unsubscribeMedia = onValue(mediaRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const approved = Object.values(data)
          .filter(item => item && item.status === 'approved')
          .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        
        setStats(prev => ({ ...prev, approvedMediaCount: approved.length }));
        setRecentMedia(approved.slice(0, 3));
      } else {
        setStats(prev => ({ ...prev, approvedMediaCount: 0 }));
        setRecentMedia([]);
      }
    }, onErr);

    return () => {
      unsubscribeUsers();
      unsubscribePayments();
      unsubscribeSpends();
      unsubscribeMedia();
    };
  }, []);

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(FOUNDATION_DETAILS.upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const dynamicUpiUrl = `upi://pay?pa=${encodeURIComponent(FOUNDATION_DETAILS.upiId)}&pn=${encodeURIComponent(FOUNDATION_DETAILS.nameEnglish)}&cu=INR`;

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden">
      
      {/* HERO SECTION - Deep Obsidian & Emerald Frosted Glass Atmosphere */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-emerald-950/85 to-slate-950 text-white pt-16 pb-24 sm:pt-20 sm:pb-32 border-b border-emerald-900/30">
        {/* Ambient Floating Glow Orbs for Glass Refraction */}
        <div className="absolute top-10 left-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-[100px] pointer-events-none animate-pulse" />
        <div className="absolute bottom-10 right-1/4 w-[30rem] h-[30rem] bg-amber-500/15 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:28px_28px] pointer-events-none" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto space-y-7">
            
            {/* Top Festive Diwali Greeting Ribbon */}
            {isDiwaliActive && <DiwaliBanner className="mb-4" />}

            {/* Slot 1: Top Hero Festive Banner / Slider */}
            <PostersShowcase slot="hero" className="mb-6" />

            {/* Top Prominent Member Login & Report Lookup Header Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 sm:gap-3 pb-2 w-full max-w-md mx-auto px-2">
              <button
                type="button"
                onClick={() => {
                  setTopPortalTab('login');
                  document.getElementById('top-hero-portal-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                className={`inline-flex items-center justify-center gap-2 px-3 sm:px-5 py-2.5 rounded-full font-black text-xs sm:text-sm shadow-xl border-2 transition transform hover:scale-105 active:scale-95 cursor-pointer w-full sm:w-auto ${
                  topPortalTab === 'login'
                    ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 text-slate-950 border-white/80 ring-2 ring-amber-400 shadow-amber-500/30'
                    : 'bg-white/15 hover:bg-white/25 text-white border-white/40'
                }`}
              >
                <LogIn className="w-4 h-4 text-slate-950 shrink-0" />
                <span>{bi('सदस्य लॉगिन', 'Member Login')}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTopPortalTab('report');
                  document.getElementById('top-hero-portal-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                className={`inline-flex items-center justify-center gap-2 px-3 sm:px-5 py-2.5 rounded-full font-black text-xs sm:text-sm shadow-xl border-2 transition transform hover:scale-105 active:scale-95 cursor-pointer w-full sm:w-auto ${
                  topPortalTab === 'report'
                    ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white border-white/80 ring-2 ring-pink-400 shadow-pink-600/30'
                    : 'bg-white/15 hover:bg-white/25 text-white border-white/40'
                }`}
              >
                <FileText className="w-4 h-4 text-pink-200 shrink-0" />
                <span>{bi('सदस्य रिपोर्ट देखें', 'Check Member Report')}</span>
              </button>
            </div>

            {/* Official Foundation Circular Logo */}
            <div className="flex justify-center pb-1">
              <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full p-1 border-2 border-white/80 bg-white shadow-2xl flex items-center justify-center">
                <img 
                  src="/logo.png" 
                  alt={safeText(FOUNDATION_DETAILS.nameHindi)} 
                  className="w-full h-full object-contain rounded-full"
                />
              </div>
            </div>

            {/* National Compliance Badge - Frosted Pill */}
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full glass-pill-dark text-emerald-300 text-[11px] sm:text-sm font-medium shadow-lg hover:border-emerald-400/40 transition-colors max-w-full">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="truncate">
                {bi('भारत सरकार द्वारा पंजीकृत (सेक्शन 8 एक्ट 2013)', 'Govt. of India Regd. (Section 8 Act 2013)')} • CIN: {safeText(FOUNDATION_DETAILS.cin)}
              </span>
            </div>

            {/* Official Foundation Title */}
            <h1 className="text-2xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight drop-shadow-sm px-2">
              <span className="bg-gradient-to-r from-white via-slate-100 to-emerald-200 bg-clip-text text-transparent">
                {bi(safeText(FOUNDATION_DETAILS.nameHindi), safeText(FOUNDATION_DETAILS.nameEnglish))}
              </span>
            </h1>
            
            <p className="text-base sm:text-xl text-emerald-200/90 font-semibold tracking-wide drop-shadow-xs">
              {bi(safeText(FOUNDATION_DETAILS.nameEnglish), safeText(FOUNDATION_DETAILS.nameHindi))}
            </p>

            {/* Tagline */}
            <div className="inline-block py-1.5 px-5 rounded-2xl bg-amber-500/10 border border-amber-400/30 text-amber-300 text-sm sm:text-base font-bold backdrop-blur-xl shadow-lg shadow-amber-500/5">
              &quot;{bi(safeText(FOUNDATION_DETAILS.tagline), safeText(FOUNDATION_DETAILS.taglineEnglish))}&quot;
            </div>

            {/* Mission Statement */}
            <p className="text-sm sm:text-base text-slate-300/90 max-w-2xl mx-auto leading-relaxed font-normal">
              {bi(
                'एक राष्ट्रीय गैर-सरकारी संगठन जो शिक्षा, स्वास्थ्य, निराश्रित सहायता एवं जन सहयोग प्रणाली के माध्यम से समाज के अंतिम व्यक्ति तक सामाजिक एवं आर्थिक सशक्तिकरण पहुँचाने हेतु संकल्पित है।',
                'A national non-governmental Section 8 organization dedicated to bringing education, healthcare, relief, and economic empowerment to the last person in society.'
              )}
            </p>

            {/* CTAs */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/register"
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-sm sm:text-base shadow-xl shadow-emerald-600/30 border border-white/20 active:scale-95 transition-all flex items-center justify-center gap-2 group"
              >
                <span>{bi('फाउंडेशन से जुड़ें', 'Join Foundation Now')}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              
              <Link
                to="/gallery"
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl glass-card-dark hover:border-emerald-400/50 text-white font-bold text-sm sm:text-base active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Eye className="w-4 h-4 text-emerald-400" />
                <span>{bi('सेवा कार्य देखें', 'View Seva Gallery')}</span>
              </Link>
            </div>

            {/* TOP HERO PORTAL CARD (Requirement 2: Render Member Login & Check Member Report at Top) */}
            <div 
              id="top-hero-portal-card" 
              className="w-full max-w-4xl mx-auto mt-8 scroll-mt-24 text-left"
            >
              {/* Inner Tab Selector */}
              <div className="flex items-center justify-center p-1.5 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 max-w-md mx-auto mb-4 shadow-lg">
                <button
                  type="button"
                  onClick={() => setTopPortalTab('login')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                    topPortalTab === 'login'
                      ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow font-black'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  <LogIn className="w-4 h-4" />
                  <span>Member Login (लॉगिन)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTopPortalTab('report')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                    topPortalTab === 'report'
                      ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow font-black'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Check Member Report (रिपोर्ट)</span>
                </button>
              </div>

              {topPortalTab === 'login' ? (
                <div 
                  id="member-login-card" 
                  className="w-full max-w-md mx-auto p-4 sm:p-7 rounded-3xl bg-white/95 backdrop-blur-2xl text-slate-900 border-2 border-amber-400/80 shadow-2xl relative text-left"
                >
                  <div className="flex items-center justify-between pb-3.5 border-b border-slate-200">
                    <div className="flex items-center gap-2.5">
                      <div className="w-11 h-11 rounded-full p-0.5 border-2 border-blue-900 bg-white shadow-md flex items-center justify-center shrink-0 overflow-hidden">
                        <img src="/logo.png" alt="Logo" className="w-full h-full object-contain rounded-full" />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-slate-900 leading-tight">
                          Member Login (सदस्य लॉगिन)
                        </h3>
                        <p className="text-[11px] text-slate-500 font-medium">
                          Enter ID No. & Password to View Complete Details
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-mono text-[10px] font-bold">
                      SECURE
                    </span>
                  </div>

                  {loginError && (
                    <div className="mt-3.5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>{loginError}</span>
                    </div>
                  )}

                  {member ? (
                    <div className="mt-4 space-y-3">
                      <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200">
                        <p className="text-xs font-bold text-slate-800">
                          नमस्ते, <strong>{member.displayName || member.name}</strong>
                        </p>
                        <p className="text-xs font-mono text-emerald-700 font-bold mt-0.5">
                          सदस्यता क्रमांक: {member.memberId}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          पद: {member.padNaam || 'कार्यकारिणी सदस्य'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          to="/dashboard"
                          className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs text-center shadow-lg shadow-emerald-700/20"
                        >
                          मेरा डैशबोर्ड खोलें (Open Dashboard)
                        </Link>
                        <button
                          type="button"
                          onClick={() => logout()}
                          className="px-3.5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                        >
                          लॉगआउट
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleMemberLogin} className="mt-4 space-y-3.5">
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1">
                          Member ID / Last 4 Digits / Mobile / Name *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. UCWF-2026-6401 या 6401 या 9540648402"
                          value={loginIdentifier}
                          onChange={(e) => setLoginIdentifier(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 focus:border-emerald-500 focus:bg-white text-xs font-bold text-slate-900 outline-none transition"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1">
                          Password (गोपनीय पासवर्ड) *
                        </label>
                        <div className="relative">
                          <input
                            type={showLoginPassword ? 'text' : 'password'}
                            required
                            placeholder="••••••••••••"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-slate-50 border border-slate-300 focus:border-emerald-500 focus:bg-white text-xs font-bold text-slate-900 outline-none transition"
                          />
                          <button
                            type="button"
                            onClick={() => setShowLoginPassword(!showLoginPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                          >
                            {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loginLoading}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 active:scale-98 text-white font-black text-xs sm:text-sm shadow-xl shadow-emerald-700/25 border border-white/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {loginLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>सत्यापित हो रहा है...</span>
                          </>
                        ) : (
                          <>
                            <LogIn className="w-4 h-4 text-emerald-200" />
                            <span>Login / View My Details</span>
                          </>
                        )}
                      </button>

                      <div className="pt-2 text-center text-xs text-slate-500 font-medium">
                        New Member?{' '}
                        <Link to="/register" className="font-extrabold text-emerald-700 hover:underline">
                          Join Foundation Registration Form →
                        </Link>
                      </div>
                    </form>
                  )}
                </div>
              ) : (
                <div className="w-full">
                  <MemberReportLookup 
                    isAdminMode={false} 
                    embeddedTitle="Instant Member Business & Team Report Lookup (Password Optional)" 
                  />
                </div>
              )}
            </div>

            {/* PAN & TAN Trust Strip - Glass Capsules */}
            <div className="pt-6 flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-[11px] sm:text-xs text-slate-300 max-w-full">
              <div className="flex items-center gap-1.5 glass-pill-dark px-2.5 sm:px-3.5 py-1.5 rounded-xl border border-white/10">
                <FileText className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>PAN: <strong className="text-white font-mono">{safeText(FOUNDATION_DETAILS.pan)}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 glass-pill-dark px-2.5 sm:px-3.5 py-1.5 rounded-xl border border-white/10">
                <FileText className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>TAN: <strong className="text-white font-mono">{safeText(FOUNDATION_DETAILS.tan)}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 glass-pill-dark px-2.5 sm:px-3.5 py-1.5 rounded-xl border border-white/10">
                <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>मुख्यालय: <strong className="text-white">काशीपुर (उत्तराखंड)</strong></span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* REAL-TIME LIVE STATS - Ultra-Luminous Glassmorphic Floating Pods */}
      <section className="relative -mt-12 z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full max-w-full overflow-x-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          
          <div className="glass-card-premium glass-card-interactive p-5 sm:p-6 rounded-3xl flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 text-emerald-700 border border-emerald-500/20 shadow-xs shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold tracking-wide">कुल पंजीकृत सदस्य</p>
              <h3 className="text-2xl font-black text-slate-900 mt-0.5">{safeText(stats.totalMembers)}</h3>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[10px] text-emerald-700 font-extrabold uppercase tracking-wider">लाइव डेटा</p>
              </div>
            </div>
          </div>

          <div className="glass-card-premium glass-card-interactive p-5 sm:p-6 rounded-3xl flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-teal-500/20 to-cyan-500/10 text-teal-700 border border-teal-500/20 shadow-xs shrink-0">
              <IndianRupee className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold tracking-wide">स्वीकृत सहयोग राशि</p>
              <h3 className="text-2xl font-black text-slate-900 mt-0.5">{formatINR(stats.totalFundsRaised)}</h3>
              <p className="text-[10px] text-teal-700 font-extrabold mt-1">100% पारदर्शी खाता</p>
            </div>
          </div>

          <div className="glass-card-premium glass-card-interactive p-5 sm:p-6 rounded-3xl flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500/20 to-yellow-500/10 text-amber-700 border border-amber-500/20 shadow-xs shrink-0">
              <Heart className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold tracking-wide">सेवा कार्य व्यय</p>
              <h3 className="text-2xl font-black text-slate-900 mt-0.5">{formatINR(stats.totalCharitySpends)}</h3>
              <p className="text-[10px] text-amber-700 font-extrabold mt-1">सीधे लाभार्थियों तक</p>
            </div>
          </div>

          <div className="glass-card-premium glass-card-interactive p-5 sm:p-6 rounded-3xl flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/10 text-blue-700 border border-blue-500/20 shadow-xs shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold tracking-wide">प्रमाणित सेवा कार्य</p>
              <h3 className="text-2xl font-black text-slate-900 mt-0.5">{safeText(stats.approvedMediaCount)}</h3>
              <p className="text-[10px] text-blue-700 font-extrabold mt-1">फोटो व वीडियो प्रमाण</p>
            </div>
          </div>

        </div>
      </section>

      {/* CHECK MEMBER BUSINESS & TEAM REPORT SECTION */}
      <section id="member-report-lookup" className="py-8 sm:py-12 max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 scroll-mt-20 w-full max-w-full overflow-x-hidden">
        <MemberReportLookup 
          isAdminMode={false} 
          embeddedTitle="Check Member Business & Team Report (Enter User ID & Password)" 
        />
      </section>

      {/* CONTINUOUS AUTOPLAY & LOOP FEATURED VIDEO SHOWCASE (Requirement 2) */}
      <section className="py-6 sm:py-8 max-w-5xl mx-auto px-2 sm:px-6 lg:px-8 w-full max-w-full overflow-x-hidden">
        <FeaturedVideoShowcase />
      </section>

      {/* SLOT 2: MIDDLE EVENT & CAMPAIGN POSTER GRID (Requirement 3) */}
      <section className="py-4 sm:py-6 max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 w-full max-w-full overflow-x-hidden">
        <PostersShowcase slot="events" />
      </section>

      {/* 4 CORE WELFARE PILLARS */}
      <section className="py-12 sm:py-24 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 w-full max-w-full overflow-x-hidden">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full glass-pill text-emerald-800 text-xs font-bold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>फाउंडेशन के मुख्य सेवा स्तंभ</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            राष्ट्र निर्माण एवं जन कल्याण के 4 प्रमुख संकल्प
          </h2>
          <p className="text-slate-600 text-sm sm:text-base mt-3 leading-relaxed">
            फाउंडेशन का उद्देश्य समाज के हर वर्ग तक शिक्षा, स्वास्थ्य और सम्मानजनक जीवन का अधिकार पहुँचाना है।
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Pillar 1 */}
          <div className="glass-card-premium glass-card-interactive p-7 rounded-3xl flex flex-col justify-between group">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-emerald-500/5 text-emerald-700 border border-emerald-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-xs">
                <GraduationCap className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-900 mb-2">शिक्षा एवं बाल विकास</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                निराश्रित एवं आर्थिक रूप से कमजोर बच्चों को पुस्तकें, यूनिफॉर्म, शुल्क सहायता और कौशल विकास प्रशिक्षण उपलब्ध कराना।
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center text-xs font-bold text-emerald-700 gap-1 group-hover:gap-2 transition-all">
              <span>विस्तार से जानें</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Pillar 2 */}
          <div className="glass-card-premium glass-card-interactive p-7 rounded-3xl flex flex-col justify-between group">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-500/20 to-teal-500/5 text-teal-700 border border-teal-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-xs">
                <HeartPulse className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-900 mb-2">स्वास्थ्य एवं चिकित्सा शिविर</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                ग्रामीण एवं मलिन बस्तियों में निःशुल्क चिकित्सा जांच, दवा वितरण और गंभीर मरीजों के इलाज हेतु आपातकालीन सहायता।
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center text-xs font-bold text-teal-700 gap-1 group-hover:gap-2 transition-all">
              <span>विस्तार से जानें</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Pillar 3 */}
          <div className="glass-card-premium glass-card-interactive p-7 rounded-3xl flex flex-col justify-between group">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-amber-500/5 text-amber-700 border border-amber-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-xs">
                <Sparkles className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-900 mb-2">महिला सशक्तिकरण</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                महिलाओं को सिलाई, हस्तकला एवं डिजिटल साक्षरता का प्रशिक्षण देकर उन्हें आर्थिक रूप से आत्मनिर्भर बनाना।
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center text-xs font-bold text-amber-700 gap-1 group-hover:gap-2 transition-all">
              <span>विस्तार से जानें</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Pillar 4 */}
          <div className="glass-card-premium glass-card-interactive p-7 rounded-3xl flex flex-col justify-between group">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-500/20 to-blue-500/5 text-blue-700 border border-blue-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-xs">
                <Trees className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-900 mb-2">पर्यावरण एवं वृक्षारोपण</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                पर्यावरण संरक्षण हेतु सघन वृक्षारोपण अभियान, जल संरक्षण जन-जागरूकता और स्वच्छ भारत अभियान में जमीनी सहभागिता।
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center text-xs font-bold text-blue-700 gap-1 group-hover:gap-2 transition-all">
              <span>विस्तार से जानें</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </section>

      {/* 5 MEMBERSHIP TIERS (सहयोग संकल्प) */}
      <section className="py-12 sm:py-24 relative overflow-hidden w-full max-w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full glass-pill text-emerald-800 text-xs font-bold uppercase tracking-wider mb-3">
              <Award className="w-3.5 h-3.5 text-emerald-600" />
              <span>पारदर्शी सदस्यता योजना</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              फाउंडेशन सहयोग संकल्प (Membership Tiers)
            </h2>
            <p className="text-slate-600 text-sm sm:text-base mt-3 leading-relaxed">
              अपनी सामर्थ्य अनुसार सहयोग राशि चुनें और फाउंडेशन के जन सहयोग नेटवर्क का सम्मानित सदस्य बनें।
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {PACKAGES.map((pkg) => {
              const isPopular = pkg.id === 'tier_2100';
              return (
                <div
                  key={pkg.id}
                  className={`relative glass-card-premium glass-card-interactive rounded-3xl p-6 flex flex-col justify-between transition-all ${
                    isPopular 
                      ? 'ring-2 ring-emerald-500/80 shadow-[0_25px_60px_-15px_rgba(16,185,129,0.25)] lg:-translate-y-2 z-10' 
                      : ''
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-[10px] font-black tracking-wider uppercase shadow-md shadow-emerald-700/30 border border-white/20">
                      ★ सर्वाधिक लोकप्रिय
                    </div>
                  )}

                  <div>
                    <div className="text-center pb-5 border-b border-slate-200/60">
                      <p className="text-xs font-bold text-emerald-700">{safeText(pkg.nameHindi)}</p>
                      <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1.5">{formatINR(pkg.amount)}</h3>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">{safeText(pkg.nameEnglish)}</p>
                    </div>

                    <ul className="py-5 space-y-3 text-xs text-slate-700">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>आधिकारिक डिजिटल आई-कार्ड</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>प्रशस्ति पत्र (Certificate)</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>मानदेय एवं सम्मान पात्रता</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>सेवा कार्य मीडिया अपलोड</span>
                      </li>
                    </ul>
                  </div>

                  <Link
                    to={`/register?package=${pkg.id}`}
                    className={`w-full py-3 rounded-2xl font-extrabold text-xs text-center transition flex items-center justify-center gap-1.5 ${
                      isPopular
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-600/25 border border-white/25 active:scale-95'
                        : 'glass-pill hover:bg-emerald-600/10 text-slate-800 hover:text-emerald-800'
                    }`}
                  >
                    <span>यह पैकेज चुनें</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* DIRECT DONATION & UPI QR SECTION - Luxury Obsidian Glass (HIDDEN FOR TESTING - CODE 100% PRESERVED) */}
      <section className="hidden py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" style={{ display: 'none' }}>
        <div className="glass-card-dark rounded-3xl p-8 sm:p-14 text-white relative overflow-hidden border border-emerald-500/25 shadow-2xl">
          {/* Subtle Ambient Orb inside the Glass Container */}
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-emerald-500/20 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-amber-500/15 rounded-full blur-[80px] pointer-events-none" />

          <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-10 sm:gap-14 items-center">
            
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-pill-dark text-emerald-300 text-xs font-semibold">
                <Heart className="w-3.5 h-3.5 text-rose-400" />
                <span>सीधा दान एवं जन सहयोग (Direct Foundation Donation)</span>
              </div>
              
              <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
                आपका एक कदम, किसी जरूरतमंद के जीवन में नई रोशनी
              </h2>
              
              <p className="text-sm text-slate-300 leading-relaxed font-normal">
                उत्तम चैरिटेबल वेलफेयर फाउंडेशन के आधिकारिक बैंक खाते या UPI QR कोड पर सीधे सहयोग राशि भेजें। आपका प्रत्येक रुपया सीधे सामाजिक कल्याण, शिक्षा और स्वास्थ्य शिविरों में खर्च होता है।
              </p>

              <div className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl space-y-3.5">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-slate-400">आधिकारिक UPI ID:</span>
                  <div className="flex items-center gap-2 font-mono text-emerald-300 font-bold">
                    <span>{safeText(FOUNDATION_DETAILS.upiId)}</span>
                    <button 
                      type="button"
                      onClick={handleCopyUpi} 
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-emerald-500/30 text-white transition active:scale-95"
                      title="Copy UPI ID"
                    >
                      {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs sm:text-sm border-t border-white/5 pt-3">
                  <span className="text-slate-400">बैंक का नाम:</span>
                  <span className="text-white font-semibold">{safeText(FOUNDATION_DETAILS.bankDetails.bankName)}</span>
                </div>

                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-slate-400">खाता संख्या (A/c No):</span>
                  <span className="text-white font-mono font-bold tracking-wider">{safeText(FOUNDATION_DETAILS.bankDetails.accountNo)}</span>
                </div>

                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-slate-400">IFSC कोड:</span>
                  <span className="text-white font-mono font-bold">{safeText(FOUNDATION_DETAILS.bankDetails.ifsc)}</span>
                </div>

                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-slate-400">शाखा (Branch):</span>
                  <span className="text-white font-medium">{safeText(FOUNDATION_DETAILS.bankDetails.branch)}</span>
                </div>
              </div>
            </div>

            {/* QR Code Presentation (Local Vector QR) */}
            <div className="flex flex-col items-center justify-center text-center p-8 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-2xl shadow-xl">
              <div className="p-4 bg-white rounded-2xl shadow-2xl ring-4 ring-white/10">
                <SafeQRCode value={dynamicUpiUrl} size={208} fgColor="#064e3b" bgColor="#ffffff" />
              </div>
              <div className="mt-5 space-y-1.5">
                <p className="font-extrabold text-sm text-white">आधिकारिक स्कैन एवं भुगतान कोड</p>
                <p className="text-xs text-slate-300">Google Pay • PhonePe • Paytm • BHIM UPI</p>
                <div className="inline-block px-3 py-1 mt-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-bold">
                  {safeText(FOUNDATION_DETAILS.upiId)}
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* APPROVED MEDIA GALLERY PREVIEW */}
      {recentMedia.length > 0 && (
        <section className="py-12 sm:py-20 border-t border-slate-200/60 w-full max-w-full overflow-x-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass-pill text-emerald-800 text-xs font-bold mb-2">
                  <Award className="w-3.5 h-3.5 text-emerald-600" />
                  <span>प्रमाणित गतिविधियाँ</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  हाल के सेवा कार्य (Recent Social Work)
                </h2>
              </div>
              <Link 
                to="/gallery" 
                className="mt-4 sm:mt-0 text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1.5 group"
              >
                <span>पूरी गैलरी देखें</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {recentMedia.map((item) => (
                <div key={item.id} className="glass-card-premium glass-card-interactive rounded-3xl overflow-hidden flex flex-col justify-between group">
                  <div>
                    {item.resourceType === 'video' ? (
                      <video 
                        src={item.url} 
                        controls 
                        className="w-full h-52 object-cover bg-black"
                      />
                    ) : (
                      <div className="relative overflow-hidden h-52 bg-slate-100">
                        <img 
                          src={item.url} 
                          alt={safeText(item.title)} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                    )}
                    <div className="p-5">
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-800 border border-emerald-500/20 text-[10px] font-bold mb-2.5">
                        {safeText(item.category)}
                      </span>
                      <h4 className="font-extrabold text-slate-900 text-sm line-clamp-1">
                        {safeText(item.title)}
                      </h4>
                      <p className="text-xs text-slate-600 mt-1.5 line-clamp-2 leading-relaxed">
                        {safeText(item.caption)}
                      </p>
                    </div>
                  </div>
                  <div className="px-5 py-3 bg-white/40 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span>प्रस्तुतकर्ता: <strong className="text-slate-700">{safeText(item.submittedByName)}</strong></span>
                    <span className="flex items-center gap-1 font-bold text-emerald-700">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      सत्यापित
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

    </div>
  );
}
