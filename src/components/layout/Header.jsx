import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  User,
  Wallet,
  LogOut,
  Shield,
  HeartHandshake,
  ChevronDown,
  Sparkles,
  CreditCard,
  Users,
  LayoutDashboard,
  Award,
  Layers,
  Calendar,
  IndianRupee,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  FOUNDATION_NAME,
  FOUNDATION_NAME_HINDI,
  FOUNDATION_SHORT,
  FOUNDATION_LOGO,
} from '../../lib/constants';
import LanguageToggle from '../ui/LanguageToggle';

export const Header = () => {
  const { user, member, wallet, signOut, isAuthenticated, isAdmin } = useAuth();
  const { t, isHindi } = useLanguage();
  const [isScrolled, setIsScrolled] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Scroll effect for subtle shadow depth
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdown on route change
  useEffect(() => {
    setUserDropdownOpen(false);
  }, [location.pathname]);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (err) {
      console.error('Sign out failed', err);
    }
  };

  // Desktop horizontal navbar links with bilingual labels
  const desktopNavLinks = [
    { name: t('nav.home', 'Home'), hindi: 'मुख्य', path: '/' },
    { name: t('nav.gallery', 'Seva Gallery'), hindi: 'सेवा गैलरी', path: '/gallery' },
    { name: t('nav.plans', 'Membership Plans'), hindi: 'योजनाएं', path: '/register' },
    { name: t('nav.team', '12-Level Income'), hindi: '12-स्तरीय आय', path: isAuthenticated ? '/team' : '/#income-plan' },
    { name: t('nav.idCard', 'I-Card'), hindi: 'आई-कार्ड', path: isAuthenticated ? '/id-card' : '/login' },
    { name: t('nav.certificate', 'Puraskar Letter'), hindi: 'पुरस्कार पत्र', path: isAuthenticated ? '/certificates' : '/login' },
    { name: t('nav.dashboard', 'Member Dashboard'), hindi: 'डैशबोर्ड', path: isAuthenticated ? '/dashboard' : '/login' },
  ];

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <header className="sticky top-0 z-40 w-full select-none">
      {/* 1. Official Government Registration & Trust Strip */}
      <div className="bg-emerald-950 text-emerald-200/90 text-[10px] sm:text-[11px] py-1 px-4 font-mono font-medium tracking-tight border-b border-emerald-900/60 flex items-center justify-center text-center">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 overflow-hidden truncate">
          <span className="text-amber-400 font-bold shrink-0">🏛️ GOVT. OF INDIA SECTION 8 ACT 2013</span>
          <span className="hidden sm:inline text-emerald-600">•</span>
          <span className="truncate">Regd. No.: <strong className="text-white">U88900UT2026NPL022025</strong> • PAN: <strong className="text-white">AAECU2542G</strong> • TAN: <strong className="text-white">MRTU05120D</strong> • Kashipur (U.S. Nagar) Uttarakhand</span>
        </div>
      </div>

      {/* 2. Sleek Festive Diwali Blessings Bar */}
      <div className="bg-gradient-to-r from-emerald-900 via-amber-700 to-emerald-900 text-amber-100 text-[11px] sm:text-xs py-1.5 px-4 font-semibold tracking-wide border-b border-amber-500/20 shadow-xs flex items-center justify-center text-center">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 overflow-hidden truncate">
          <span className="text-amber-300 animate-pulse">🪔</span>
          <span className="truncate">
            {isHindi
              ? 'शुभ दीपावली! उत्तम चैरिटेबल वेलफेयर फाउंडेशन की ओर से समस्त देशवासियों को सुख, समृद्धि एवं पावन पर्वों की हार्दिक शुभकामनाएँ 🪔'
              : '🪔 Shubh Deepawali! Warm festive greetings and divine blessings from Uttam Charitable Welfare Foundation to all citizens 🪔'}
          </span>
          <span className="text-amber-300 animate-pulse">🪔</span>
        </div>
      </div>

      {/* 2. Main Desktop Navbar (White Glassmorphic Stripe/Razorpay style) */}
      <div
        className={`w-full transition-all duration-200 bg-white/95 backdrop-blur-md border-b border-slate-200/80 ${
          isScrolled ? 'shadow-[0_4px_20px_rgba(0,0,0,0.06)] py-2.5' : 'py-3'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* =========================================================================
              DESKTOP / PC HORIZONTAL NAVBAR (hidden md:flex)
             ========================================================================= */}
          <div className="hidden md:flex items-center justify-between gap-3 lg:gap-4">
            {/* Foundation Logo & Brand */}
            <Link to="/" className="flex items-center gap-3 group shrink-0">
              <div className="relative flex items-center justify-center w-11 h-11 rounded-full p-0.5 bg-gradient-to-tr from-amber-400 via-amber-500 to-emerald-600 shadow-sm group-hover:scale-105 transition-transform">
                <img
                  src={FOUNDATION_LOGO}
                  alt={FOUNDATION_NAME}
                  className="w-full h-full object-contain rounded-full bg-white p-0.5"
                />
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-base lg:text-lg text-slate-900 tracking-tight leading-none group-hover:text-emerald-700 transition-colors">
                    {FOUNDATION_SHORT}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 uppercase tracking-wider">
                    {t('nav.govtRegd', 'Sec 8 NGO')}
                  </span>
                </div>
                <span className="text-xs font-semibold text-emerald-900 tracking-tight mt-0.5 line-clamp-1">
                  {isHindi ? FOUNDATION_NAME_HINDI : FOUNDATION_NAME}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  {isHindi ? FOUNDATION_NAME : FOUNDATION_NAME_HINDI}
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Tabs */}
            <nav className="flex items-center gap-1 lg:gap-1.5">
              {desktopNavLinks.map((link) => {
                const isActive =
                  location.pathname === link.path ||
                  (link.path === '/register' && location.pathname === '/packages');

                return (
                  <Link
                    key={link.path + link.name}
                    to={link.path}
                    className={`px-3 py-2 rounded-xl text-xs lg:text-[13px] font-semibold transition-all whitespace-nowrap ${
                      isActive
                        ? 'text-emerald-900 bg-emerald-50 font-bold border border-emerald-200/80 shadow-xs'
                        : 'text-slate-600 hover:text-emerald-800 hover:bg-slate-100/70'
                    }`}
                  >
                    {link.name}
                  </Link>
                );
              })}

            </nav>

            {/* Desktop Right Action Area: Language Switcher + User Area / Join CTA */}
            <div className="flex items-center gap-2 lg:gap-3 shrink-0">
              {/* Dynamic Bilingual Language Switcher */}
              <LanguageToggle variant="header" />

              {isAuthenticated ? (
                <>
                  {/* Seva Wallet Pill */}
                  <Link
                    to="/wallet"
                    className="flex items-center gap-2 bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-900 px-3 py-1.5 rounded-full border border-slate-200 hover:border-emerald-300 shadow-2xs transition-all group"
                    title="View Seva Wallet"
                  >
                    <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-white group-hover:scale-105 transition-transform">
                      <Wallet className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-[9px] uppercase text-slate-500 font-bold tracking-wider leading-none">
                        {t('nav.wallet', 'Wallet')}
                      </span>
                      <span className="text-xs font-extrabold text-slate-900 leading-tight">
                        ₹{Number(wallet?.balance || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </Link>

                  {/* Member Dropdown Menu */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                      className="flex items-center gap-2 p-1 pl-2 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 rounded-full transition-all focus:outline-none"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-amber-500 flex items-center justify-center text-white text-xs font-bold shadow-xs overflow-hidden">
                        {member?.avatar_url ? (
                          <img
                            src={member.avatar_url}
                            alt="Member"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          getInitials(member?.full_name || user?.email)
                        )}
                      </div>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-600 pr-1" />
                    </button>

                    <AnimatePresence>
                      {userDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 text-slate-800"
                        >
                          <div className="px-4 py-2.5 border-b border-slate-100">
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {member?.full_name || 'Foundation Member'}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                            {member?.referral_code && (
                              <span className="mt-1 inline-block text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                ID: {member.referral_code}
                              </span>
                            )}
                          </div>
                          <div className="py-1">
                            <Link
                              to="/dashboard"
                              className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800"
                              onClick={() => setUserDropdownOpen(false)}
                            >
                              <LayoutDashboard className="w-4 h-4 text-emerald-600" />
                              <span>{t('nav.dashboard', 'Member Dashboard')}</span>
                            </Link>
                            <Link
                              to="/team"
                              className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800"
                              onClick={() => setUserDropdownOpen(false)}
                            >
                              <Users className="w-4 h-4 text-emerald-600" />
                              <span>{t('nav.team', '12-Level Team')}</span>
                            </Link>
                            <Link
                              to="/id-card"
                              className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800"
                              onClick={() => setUserDropdownOpen(false)}
                            >
                              <CreditCard className="w-4 h-4 text-emerald-600" />
                              <span>{t('nav.idCard', 'Digital ID Card')}</span>
                            </Link>
                            <Link
                              to="/certificates"
                              className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800"
                              onClick={() => setUserDropdownOpen(false)}
                            >
                              <Award className="w-4 h-4 text-emerald-600" />
                              <span>{t('nav.certificate', 'Puraskar Certificates')}</span>
                            </Link>
                            <Link
                              to="/profile"
                              className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800"
                              onClick={() => setUserDropdownOpen(false)}
                            >
                              <User className="w-4 h-4 text-emerald-600" />
                              <span>{t('nav.profile', 'My Profile & KYC')}</span>
                            </Link>
                          </div>
                          <div className="border-t border-slate-100 pt-1">
                            <button
                              type="button"
                              onClick={handleSignOut}
                              className="flex w-full items-center gap-2.5 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 text-left"
                            >
                              <LogOut className="w-4 h-4 text-red-500" />
                              <span>{t('nav.signOut', 'Sign Out (लॉग आउट)')}</span>
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-all border border-slate-200"
                  >
                    {t('nav.login', 'Login')}
                  </Link>
                  <Link
                    to="/register"
                    className="flex items-center gap-1.5 px-4 lg:px-5 py-2 rounded-xl text-xs font-black text-slate-950 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-700 shadow-md shadow-amber-500/20 transform hover:-translate-y-0.5 active:translate-y-0 transition-all uppercase tracking-wider"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{t('nav.joinNow', 'Join Now')}</span>
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* =========================================================================
              NATIVE MOBILE APP-STYLE TOP APP BAR (flex md:hidden)
             ========================================================================= */}
          <div className="flex md:hidden items-center justify-between">
            {/* App Brand & Logo */}
            <Link to="/" className="flex items-center gap-2 group shrink-0">
              <div className="relative flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-emerald-600 p-0.5 shadow-xs shrink-0">
                <img
                  src={FOUNDATION_LOGO}
                  alt={FOUNDATION_SHORT}
                  className="w-full h-full object-contain rounded-full bg-white p-0.5"
                />
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <span className="font-extrabold text-sm text-slate-900 tracking-tight">
                    {FOUNDATION_SHORT}
                  </span>
                  <span className="text-[9px] text-emerald-800 font-bold bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                    NGO
                  </span>
                </div>
                <span className="text-[10px] text-slate-600 font-medium leading-none line-clamp-1 max-w-[130px]">
                  {isHindi ? 'उत्तम फाउंडेशन' : 'Uttam Welfare'}
                </span>
              </div>
            </Link>

            {/* Right Mobile Actions: Language Switcher + Admin Quick Icon + Profile Avatar */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Dynamic Bilingual Language Toggle on Mobile */}
              <LanguageToggle variant="header" className="scale-90" />

              {/* User Profile Avatar / Sign In Button */}
              {isAuthenticated ? (
                <Link
                  to="/profile"
                  className="flex items-center gap-1 p-0.5 bg-slate-100 border border-slate-200 rounded-full active:scale-95 transition-transform"
                  title="Profile"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-emerald-600 to-amber-500 flex items-center justify-center text-white text-[11px] font-bold shadow-xs overflow-hidden">
                    {member?.avatar_url ? (
                      <img
                        src={member.avatar_url}
                        alt="User"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      getInitials(member?.full_name || user?.email)
                    )}
                  </div>
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-500 active:scale-95 transition-all shadow-xs"
                >
                  {t('nav.login', 'Sign In')}
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
