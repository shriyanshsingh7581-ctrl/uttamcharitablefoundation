import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Menu,
  X,
  Shield,
  Wallet,
  User,
  LogOut,
  Award,
  CreditCard,
  Sparkles,
  HeartHandshake,
  Image as ImageIcon,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useDiwaliTheme } from '../contexts/DiwaliThemeContext';
import GlowingDiya from './diwali/GlowingDiya';
import LanguageToggle from './ui/LanguageToggle';
import {
  FOUNDATION_NAME,
  FOUNDATION_NAME_HINDI,
  FOUNDATION_LOGO_URL,
  GOVT_REG_NO,
  PAN_NO,
  TAN_NO,
  formatINR,
  safeText,
} from '../lib/constants';

export default function Navbar() {
  const { member, user, logout } = useAuth();
  const { isHindi } = useLanguage();
  const { isDiwaliActive } = useDiwaliTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 w-full select-none">
      {/* 1. Official Government Compliance Strip - Emerald Glass */}
      <div className="bg-emerald-950/95 backdrop-blur-md text-emerald-200 text-[9px] sm:text-xs py-1 px-3 font-mono border-b border-emerald-800/60 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-0.5 sm:gap-2 text-center sm:text-left">
          <div className="flex items-center gap-1.5 font-semibold text-amber-300">
            <Shield className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            <span>GOVT. OF INDIA SECTION 8 ACT 2013</span>
            <span className="hidden md:inline text-emerald-600">•</span>
            <span className="hidden md:inline text-white font-medium">Regd. No.: {GOVT_REG_NO}</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 text-emerald-300 text-[9px] sm:text-[11px]">
            <span>PAN: <strong className="text-white">{PAN_NO}</strong></span>
            <span>•</span>
            <span>TAN: <strong className="text-white">{TAN_NO}</strong></span>
            <span className="hidden lg:inline">• Kashipur (U.S. Nagar) Uttarakhand</span>
          </div>
        </div>
      </div>

      {/* 2. Main High-Trust Navbar - Ultra-Premium Glassmorphism */}
      <nav className="bg-white/80 backdrop-blur-2xl border-b border-white/70 shadow-[0_12px_36px_-10px_rgba(15,23,42,0.06),inset_0_1px_1px_0_rgba(255,255,255,0.95)]">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20 gap-2">
            {/* Logo & Brand Identity */}
            <Link to="/" className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 group">
              <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full p-0.5 border-2 border-blue-900 bg-white shadow-md shadow-blue-950/20 group-hover:scale-105 transition-all overflow-hidden flex items-center justify-center shrink-0">
                <img
                  src="/logo.png"
                  alt={FOUNDATION_NAME}
                  className="w-full h-full object-contain rounded-full"
                  onError={(e) => {
                    e.currentTarget.src = '/logo.png';
                  }}
                />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs sm:text-sm md:text-base font-extrabold text-slate-900 leading-tight tracking-tight group-hover:text-emerald-800 transition-colors truncate">
                    {FOUNDATION_NAME_HINDI}
                  </span>
                  {isDiwaliActive && <GlowingDiya size="xs" className="hidden sm:inline-flex" />}
                </div>
                <span className="text-[8.5px] sm:text-[10px] md:text-[11px] font-bold text-amber-700 uppercase tracking-wider truncate hidden xs:block">
                  {FOUNDATION_NAME}
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden lg:flex items-center gap-1 xl:gap-2">
              <Link
                to="/"
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  isActive('/') 
                    ? 'bg-emerald-600/10 text-emerald-800 border border-emerald-600/25 shadow-xs backdrop-blur-md' 
                    : 'text-slate-600 hover:text-emerald-700 hover:bg-white/60 border border-transparent'
                }`}
              >
                {isHindi ? 'मुख्य पृष्ठ (Home)' : 'Home'}
              </Link>
              <Link
                to="/gallery"
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  isActive('/gallery') 
                    ? 'bg-emerald-600/10 text-emerald-800 border border-emerald-600/25 shadow-xs backdrop-blur-md' 
                    : 'text-slate-600 hover:text-emerald-700 hover:bg-white/60 border border-transparent'
                }`}
              >
                {isHindi ? 'सेवा गैलरी (Gallery)' : 'Gallery'}
              </Link>
              <Link
                to="/id-card"
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  isActive('/id-card') 
                    ? 'bg-emerald-600/10 text-emerald-800 border border-emerald-600/25 shadow-xs backdrop-blur-md' 
                    : 'text-slate-600 hover:text-emerald-700 hover:bg-white/60 border border-transparent'
                }`}
              >
                {isHindi ? 'आई-कार्ड (ID Card)' : 'ID Card'}
              </Link>
              <Link
                to="/certificates"
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  isActive('/certificates') 
                    ? 'bg-emerald-600/10 text-emerald-800 border border-emerald-600/25 shadow-xs backdrop-blur-md' 
                    : 'text-slate-600 hover:text-emerald-700 hover:bg-white/60 border border-transparent'
                }`}
              >
                {isHindi ? 'प्रशस्ति पत्र (Certificate)' : 'Certificate'}
              </Link>

              {member && (
                <>
                  <Link
                    to="/team"
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                      isActive('/team') 
                        ? 'bg-emerald-600/10 text-emerald-800 border border-emerald-600/25 shadow-xs backdrop-blur-md' 
                        : 'text-slate-600 hover:text-emerald-700 hover:bg-white/60 border border-transparent'
                    }`}
                  >
                    {isHindi ? '12-स्तरीय टीम (Team)' : '12-Level Team'}
                  </Link>
                  <Link
                    to="/wallet"
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                      isActive('/wallet') 
                        ? 'bg-emerald-600/10 text-emerald-800 border border-emerald-600/25 shadow-xs backdrop-blur-md' 
                        : 'text-slate-600 hover:text-emerald-700 hover:bg-white/60 border border-transparent'
                    }`}
                  >
                    {isHindi ? 'वॉलेट (Wallet)' : 'Wallet'}
                  </Link>
                </>
              )}
            </div>

            {/* Right Action Buttons */}
            <div className="hidden lg:flex items-center gap-3">
              {/* Prominent Global Hindi / English Toggle */}
              <LanguageToggle />

              {member ? (
                <div className="flex items-center gap-2.5">
                  <Link
                    to="/wallet"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs font-extrabold text-emerald-900 shadow-xs hover:bg-emerald-500/20 backdrop-blur-md transition-all"
                  >
                    <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{formatINR(member.walletBalance || 0)}</span>
                  </Link>

                  <Link
                    to="/dashboard"
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-bold shadow-md shadow-emerald-800/20 border border-white/20 transition-all"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span className="truncate max-w-[110px]">
                      {safeText(member.name, isHindi ? 'डैशबोर्ड' : 'Dashboard')}
                    </span>
                  </Link>

                  <button
                    onClick={handleLogout}
                    title="Logout"
                    className="p-2 text-slate-500 hover:text-rose-600 rounded-xl hover:bg-rose-50/80 border border-transparent hover:border-rose-100 transition-all cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold text-slate-800 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-300/80 shadow-2xs transition-all"
                  >
                    <User className="w-3.5 h-3.5 text-emerald-700" />
                    <span>{isHindi ? 'सदस्य लॉगिन (Login)' : 'Member Login'}</span>
                  </Link>
                  <Link
                    to="/register"
                    className="inline-flex items-center gap-1.5 px-4.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-emerald-600 to-teal-600 hover:from-amber-600 hover:to-teal-700 text-white text-xs font-extrabold shadow-md shadow-emerald-700/20 border border-white/25 active:scale-95 transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isHindi ? 'सदस्यता लें (Join)' : 'Join Now'}</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile / Tablet Compact App Bar Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 lg:hidden">
              {/* Prominent Global Hindi / English Toggle for Mobile */}
              <LanguageToggle />

              {!member && (
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-black shadow-md border border-white/20 active:scale-95 transition-all"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>{isHindi ? 'लॉगिन' : 'Login'}</span>
                </Link>
              )}

              {member && (
                <Link
                  to="/wallet"
                  className="hidden sm:flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs font-bold text-emerald-900"
                >
                  <Wallet className="w-3 h-3 text-emerald-600" />
                  <span>{formatINR(member.walletBalance || 0)}</span>
                </Link>
              )}

              {member && (
                <Link
                  to="/dashboard"
                  className="p-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 transition"
                  title={isHindi ? 'डैशबोर्ड' : 'Dashboard'}
                >
                  <User className="w-4 h-4" />
                </Link>
              )}

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-xl text-slate-700 hover:bg-slate-100/80 border border-slate-200/50 focus:outline-none backdrop-blur-md cursor-pointer"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer - Frosted Glass */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white/95 backdrop-blur-2xl border-b border-white/80 px-4 pt-3 pb-5 space-y-2 shadow-2xl">
            {member && (
              <div className="p-3.5 glass-card-premium rounded-2xl mb-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-extrabold text-slate-900 leading-tight">
                    {safeText(member.salutation)} {safeText(member.name)}
                  </p>
                  <p className="text-[10px] font-mono text-emerald-700 font-bold mt-0.5">
                    ID: {safeText(member.memberId)}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block">वॉलेट बैलेंस</span>
                  <span className="text-xs font-black text-emerald-700">{formatINR(member.walletBalance || 0)}</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 p-2.5 rounded-xl glass-pill text-xs font-bold text-slate-800 hover:bg-emerald-50/80"
              >
                <HeartHandshake className="w-4 h-4 text-emerald-600" />
                <span>{isHindi ? 'मुख्य पृष्ठ (Home)' : 'Home'}</span>
              </Link>
              <Link
                to="/gallery"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 p-2.5 rounded-xl glass-pill text-xs font-bold text-slate-800 hover:bg-emerald-50/80"
              >
                <ImageIcon className="w-4 h-4 text-emerald-600" />
                <span>{isHindi ? 'सेवा गैलरी (Gallery)' : 'Gallery'}</span>
              </Link>
              <Link
                to="/id-card"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 p-2.5 rounded-xl glass-pill text-xs font-bold text-slate-800 hover:bg-emerald-50/80"
              >
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>{isHindi ? 'आईडी कार्ड (I-Card)' : 'ID Card'}</span>
              </Link>
              <Link
                to="/certificates"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 p-2.5 rounded-xl glass-pill text-xs font-bold text-slate-800 hover:bg-emerald-50/80"
              >
                <Award className="w-4 h-4 text-amber-500" />
                <span>{isHindi ? 'प्रशस्ति पत्र (Cert)' : 'Certificate'}</span>
              </Link>
            </div>

            {member ? (
              <div className="pt-2 border-t border-slate-200/60 space-y-2">
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white text-xs font-bold shadow-md shadow-emerald-700/20"
                >
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span>{isHindi ? 'सदस्य डैशबोर्ड (Dashboard)' : 'Member Dashboard'}</span>
                  </div>
                  <ChevronRight className="w-4 h-4" />
                </Link>

                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to="/team"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2.5 rounded-xl bg-emerald-50/90 text-emerald-800 text-xs font-bold text-center border border-emerald-200/70"
                  >
                    {isHindi ? '12-स्तरीय टीम' : '12-Level Team'}
                  </Link>
                  <Link
                    to="/wallet"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2.5 rounded-xl bg-emerald-50/90 text-emerald-800 text-xs font-bold text-center border border-emerald-200/70"
                  >
                    {isHindi ? 'वॉलेट एवं निकासी' : 'Wallet & Payout'}
                  </Link>
                </div>

                <button
                  onClick={handleLogout}
                  className="w-full py-2.5 text-center text-xs font-bold text-rose-600 hover:bg-rose-50/80 rounded-xl transition-colors cursor-pointer"
                >
                  {isHindi ? 'लॉगआउट करें (Sign Out)' : 'Sign Out'}
                </button>
              </div>
            ) : (
              <div className="pt-3 border-t border-slate-200/60 flex flex-col gap-2">
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 via-emerald-600 to-teal-600 text-white font-extrabold text-xs text-center shadow-lg shadow-emerald-700/20 border border-white/20"
                >
                  {isHindi ? 'फाउंडेशन सदस्यता लें (Join UCWF)' : 'Join Foundation'}
                </Link>
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 rounded-xl border border-slate-200 bg-white/70 text-slate-700 font-bold text-xs text-center hover:bg-slate-50"
                >
                  {isHindi ? 'सदस्य लॉगिन (Member Login)' : 'Member Login'}
                </Link>
              </div>
            )}
          </div>
        )}
      </nav>
    </header>
  );
}
