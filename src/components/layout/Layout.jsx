import React from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CheckCircle,
  ArrowDownToLine,
  Receipt,
  Calendar,
  Settings,
  ChevronRight,
  Shield,
  Heart,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Award,
  User,
  Wallet,
  LogOut,
  Sparkles,
  IndianRupee,
  ExternalLink,
  Building2,
  FileCheck2,
  Camera,
  ClipboardCheck,
  Banknote,
} from 'lucide-react';
import Header from './Header';
import MobileNav from './MobileNav';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { LanguageToggle } from '../ui/LanguageToggle';
import SafeIcon from '../ui/SafeIcon';
import {
  FOUNDATION_NAME,
  FOUNDATION_NAME_HINDI,
  FOUNDATION_SHORT,
  FOUNDATION_LOGO,
  FOUNDATION_TAGLINE,
  FOUNDATION_TAGLINE_HINDI,
  CONTACT_INFO,
  ADMIN_NAV_ITEMS,
} from '../../lib/constants';

const ADMIN_ICONS = {
  LayoutDashboard,
  ClipboardCheck,
  Camera,
  Users,
  Banknote,
  Calendar,
  Award,
  IndianRupee,
  CheckCircle,
  ArrowDownToLine,
  Receipt,
  Settings,
};

export const Layout = ({ children, hideFooter = false, adminOnly = false }) => {
  const { user, member, wallet, signOut, isAuthenticated, isAdmin } = useAuth();
  const { t, isHindi } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  // Check if current page is within member portal or admin panel
  const isMemberPortalPath =
    ['/dashboard', '/team', '/wallet', '/id-card', '/certificates', '/profile'].some((p) =>
      location.pathname.startsWith(p)
    );
  const isAdminPath = location.pathname.startsWith('/admin') || adminOnly;
  const showDesktopSidebar = isAuthenticated && (isMemberPortalPath || isAdminPath);

  const memberNavItems = [
    { path: '/dashboard', label: t('nav.dashboard', 'Dashboard'), hindi: 'डैशबोर्ड', icon: LayoutDashboard },
    { path: '/gallery', label: t('nav.gallery', 'Seva Gallery'), hindi: 'सेवा गैलरी', icon: Camera },
    { path: '/team', label: t('nav.team', '12-Level Team'), hindi: '12-स्तरीय टीम', icon: Users },
    { path: '/wallet', label: t('nav.wallet', 'Seva Wallet'), hindi: 'वॉलेट एवं पेआउट', icon: Wallet },
    { path: '/id-card', label: t('nav.idCard', 'Digital ID Card'), hindi: 'आईडी कार्ड', icon: CreditCard },
    { path: '/certificates', label: t('nav.certificate', 'Puraskar & Cert'), hindi: 'सम्मान प्रमाण-पत्र', icon: Award },
    { path: '/profile', label: t('nav.profile', 'Profile & KYC'), hindi: 'प्रोफ़ाइल विवरण', icon: User },
  ];

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-800 font-sans antialiased selection:bg-emerald-600 selection:text-white overflow-x-hidden w-full max-w-full">
      {/* Sticky Dual-Adaptive Header */}
      <Header />

      {/* Main App Container */}
      <div className="flex-1 flex w-full max-w-full overflow-x-hidden">
        {/* =========================================================================
            PERSISTENT CLEAN LEFT SIDEBAR NAVIGATION FOR DESKTOP/PC (hidden md:flex lg:flex)
           ========================================================================= */}
        {showDesktopSidebar && (
          <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-white text-slate-800 border-r border-slate-200/80 shrink-0 sticky top-[97px] h-[calc(100vh-97px)] overflow-y-auto select-none shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
            {/* User Profile Mini Banner */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-amber-500 flex items-center justify-center text-white font-bold text-sm shadow-xs overflow-hidden shrink-0">
                  {member?.avatar_url ? (
                    <img
                      src={member.avatar_url}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    (member?.full_name || user?.email || 'U').charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {member?.full_name || 'Foundation Member'}
                  </p>
                  <p className="text-[11px] text-amber-700 font-semibold truncate">
                    {member?.package_name || 'Seva Mitra'}
                  </p>
                  {member?.referral_code && (
                    <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 inline-block mt-0.5">
                      ID: {member.referral_code}
                    </span>
                  )}
                </div>
              </div>

              {/* Quick Wallet Pill */}
              <div className="mt-3 p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs shadow-2xs">
                <span className="text-slate-500 font-medium">
                  {isHindi ? 'वॉलेट शेष:' : 'Wallet Balance:'}
                </span>
                <span className="font-extrabold text-emerald-800 text-sm">
                  ₹{Number(wallet?.balance || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="p-3 space-y-1 flex-1">
              {isAdminPath && isAdmin ? (
                // Admin Mode Links
                <>
                  <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-amber-800 flex items-center gap-1.5 bg-amber-50 rounded-lg mb-2 border border-amber-200">
                    <Shield className="w-3.5 h-3.5 text-amber-600" />
                    <span>{t('admin.title', 'Admin Controls')}</span>
                  </div>
                  {ADMIN_NAV_ITEMS.map((item) => {
                    const iconTarget = ADMIN_ICONS[item.icon] || LayoutDashboard;
                    const isActive = location.pathname === item.path;

                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                          isActive
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <SafeIcon
                            icon={iconTarget}
                            fallback={LayoutDashboard}
                            className={`w-4 h-4 ${isActive ? 'text-amber-300' : 'text-slate-400'}`}
                          />
                          <span>{item.label}</span>
                        </div>
                        {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/80" />}
                      </Link>
                    );
                  })}
                  <div className="pt-2 border-t border-slate-100 mt-2">
                    <Link
                      to="/dashboard"
                      className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    >
                      <LayoutDashboard className="w-4 h-4 text-emerald-600" />
                      <span>{t('nav.switchMemberView', 'Switch to Member View')}</span>
                    </Link>
                  </div>
                </>
              ) : (
                // Member Portal Links
                <>
                  <div className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5 mb-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>{isHindi ? 'सदस्य नेविगेशन' : 'Member Navigation'}</span>
                  </div>
                  {memberNavItems.map((item) => {
                    const isActive = location.pathname === item.path;

                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                          isActive
                            ? 'bg-emerald-700 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <SafeIcon
                            icon={item.icon}
                            fallback={LayoutDashboard}
                            className={`w-4 h-4 ${isActive ? 'text-amber-300' : 'text-slate-400'}`}
                          />
                          <div>
                            <span className="block leading-tight">{item.label}</span>
                            <span className={`text-[10px] font-normal block leading-none ${isActive ? 'text-emerald-100' : 'text-slate-400'}`}>
                              {item.hindi}
                            </span>
                          </div>
                        </div>
                        {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/80" />}
                      </Link>
                    );
                  })}

                </>
              )}
            </nav>

            {/* Sidebar Footer with Logout */}
            <div className="p-3 border-t border-slate-100 bg-slate-50/50">
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors text-left"
              >
                <LogOut className="w-4 h-4" />
                <span>{t('nav.signOut', 'Log Out')}</span>
              </button>
            </div>
          </aside>
        )}

        {/* Content Body with safe bottom padding for Mobile Bottom Navigation Bar (pb-24 on mobile, pb-8 on desktop) */}
        <main className="flex-1 flex flex-col w-full pb-24 md:pb-8 transition-all overflow-x-hidden max-w-full">
          {children}
        </main>
      </div>

      {/* Global Corporate Public Footer */}
      {!hideFooter && !showDesktopSidebar && (
        <footer className="bg-emerald-950 text-emerald-100 border-t border-emerald-900 mt-auto pb-24 md:pb-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
              {/* Foundation Info */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-white/10 p-0.5 border border-amber-400/40 shadow-sm shrink-0 overflow-hidden">
                    <img
                      src={FOUNDATION_LOGO}
                      alt={FOUNDATION_NAME}
                      className="w-full h-full object-contain rounded-full bg-white p-0.5"
                    />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm lg:text-base leading-tight">
                      {isHindi ? FOUNDATION_NAME_HINDI : FOUNDATION_NAME}
                    </h3>
                    <p className="text-amber-300 text-xs font-semibold">
                      {FOUNDATION_TAGLINE_HINDI}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-emerald-200/90 leading-relaxed">
                  {isHindi
                    ? 'गरीब एवं असहाय परिवारों के उत्थान, निःशुल्क स्वास्थ्य शिविर, बाल शिक्षा एवं सामाजिक समरसता हेतु समर्पित भारत सरकार मान्यता प्राप्त सेक्शन 8 फाउंडेशन।'
                    : 'A Govt. of India Recognized Section 8 Non-Profit Foundation dedicated to healthcare camps, child education scholarships, and socio-economic empowerment.'}
                </p>
                <div className="pt-2 text-xs text-emerald-300 font-mono space-y-1">
                  <div>CIN / Regd: <span className="text-white font-bold">{CONTACT_INFO.regNumber}</span></div>
                  <div>PAN: <span className="text-white font-bold">{CONTACT_INFO.panNumber}</span> | TAN: <span className="text-white font-bold">{CONTACT_INFO.tanNumber}</span></div>
                  <div>Act: <span className="text-amber-300 font-semibold">{CONTACT_INFO.actType}</span></div>
                </div>
              </div>

              {/* Quick Links */}
              <div>
                <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-3">
                  {isHindi ? 'त्वरित लिंक' : 'Quick Navigation'}
                </h4>
                <ul className="space-y-2 text-xs">
                  <li>
                    <Link to="/" className="hover:text-amber-300 transition-colors">
                      {t('nav.home', 'Home')}
                    </Link>
                  </li>
                  <li>
                    <Link to="/register" className="hover:text-amber-300 transition-colors">
                      {t('nav.plans', 'Membership Plans (योजनाएं)')}
                    </Link>
                  </li>
                  <li>
                    <Link to="/#income-plan" className="hover:text-amber-300 transition-colors">
                      {t('nav.team', '12-Level Referral Structure')}
                    </Link>
                  </li>
                  <li>
                    <Link to="/#spend-tracker" className="hover:text-amber-300 transition-colors">
                      {t('nav.spendTracker', 'Foundation Spend Tracker')}
                    </Link>
                  </li>
                  <li>
                    <Link to="/events" className="hover:text-amber-300 transition-colors">
                      {t('nav.events', 'Events & Health Camps')}
                    </Link>
                  </li>
                  <li>
                    <Link to="/login" className="hover:text-amber-300 transition-colors">
                      {t('nav.login', 'Member Sign In')}
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Programs */}
              <div>
                <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-3">
                  {isHindi ? 'सेवा आयाम' : 'Welfare Wings'}
                </h4>
                <ul className="space-y-2 text-xs text-emerald-200/90">
                  <li>• {isHindi ? 'निःशुल्क चिकित्सा एवं नेत्र शिविर' : 'Free Medical & Eye Surgery Camps'}</li>
                  <li>• {isHindi ? 'आपातकालीन रक्तदान वाहिनी' : '24x7 Emergency Blood Donor Network'}</li>
                  <li>• {isHindi ? 'बाल शिक्षा एवं छात्रवृत्ति सहायता' : 'Child Education & Book Kit Distribution'}</li>
                  <li>• {isHindi ? 'महिला स्वावलंबन एवं कौशल विकास' : 'Women Skill Development & Self-Reliance'}</li>
                  <li>• {isHindi ? 'शीतकालीन वस्त्र एवं राशन सहायता' : 'Seasonal Ration & Blankets Distribution'}</li>
                </ul>
              </div>

              {/* Office Contact */}
              <div>
                <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-3">
                  {isHindi ? 'पंजीकृत कार्यालय' : 'Registered Office'}
                </h4>
                <div className="space-y-2.5 text-xs text-emerald-200/90">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-white">{CONTACT_INFO.address}</p>
                      <p className="text-[11px] text-emerald-300">{CONTACT_INFO.addressEnglish}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-amber-400 shrink-0" />
                    <a href={`tel:${CONTACT_INFO.phone}`} className="hover:text-white font-medium">
                      {CONTACT_INFO.phone}
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-amber-400 shrink-0" />
                    <a href={`mailto:${CONTACT_INFO.email}`} className="hover:text-white font-medium">
                      {CONTACT_INFO.email}
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <ExternalLink className="w-4 h-4 text-amber-400 shrink-0" />
                    <a href={CONTACT_INFO.website} target="_blank" rel="noreferrer" className="text-amber-300 hover:text-white font-semibold">
                      {CONTACT_INFO.website}
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-emerald-900 flex flex-col sm:flex-row items-center justify-between text-xs text-emerald-400/90 gap-4">
              <p>© {new Date().getFullYear()} {FOUNDATION_NAME}. Section 8 Regd. U88900UT2026NPL022025.</p>
              <div className="flex items-center gap-1 text-emerald-300">
                <span>Designed with</span>
                <Heart className="w-3.5 h-3.5 text-red-400 fill-red-400 inline" />
                <span>for National Welfare & Service</span>
              </div>
            </div>
          </div>
        </footer>
      )}

      {/* Floating Language Switcher for quick mobile/desktop toggle */}
      <LanguageToggle variant="floating" />

      {/* Fixed Bottom App Navigation for Mobile (md:hidden) */}
      <MobileNav />
    </div>
  );
};

export default Layout;
