import React, { useState, useEffect } from 'react';
import { NavLink, Link, useNavigate, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardCheck,
  Users,
  Calendar,
  Award,
  Banknote,
  ArrowLeft,
  Shield,
  ShieldCheck,
  Menu,
  X,
  LogOut,
  Bell,
  ExternalLink,
  ChevronRight,
  AlertTriangle,
  IndianRupee,
  Camera,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import { db, ref, onValue } from '../../lib/firebase';
import { FOUNDATION_NAME, FOUNDATION_NAME_HINDI } from '../../lib/constants';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Button } from '../../components/ui/Button';
import { Diya } from '../../components/ui/DiwaliDecorations';
import LanguageToggle from '../../components/ui/LanguageToggle';
import SafeIcon from '../../components/ui/SafeIcon';

export default function AdminLayout({ children }) {
  const { user, member, loading, signOut, isAdmin: authIsAdmin } = useAuth();
  const { t, isHindi } = useLanguage();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [pendingPayoutsCount, setPendingPayoutsCount] = useState(0);
  const [pendingMediaCount, setPendingMediaCount] = useState(0);

  // Check admin status: either member.is_admin is true or role is admin or user metadata
  const isUserAdmin = Boolean(
    member?.is_admin === true ||
    member?.role === 'admin' ||
    authIsAdmin ||
    user?.user_metadata?.role === 'admin'
  );

  // Fetch pending badge counts
  useEffect(() => {
    let isMounted = true;

    async function fetchBadgeCounts() {
      try {
        const [approvalsRes, payoutsRes] = await Promise.all([
          supabase
            .from('members')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'pending'),
          supabase
            .from('withdrawals')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'pending'),
        ]);

        if (isMounted) {
          if (!approvalsRes.error && approvalsRes.count !== null) {
            setPendingApprovalsCount(approvalsRes.count);
          }
          if (!payoutsRes.error && payoutsRes.count !== null) {
            setPendingPayoutsCount(payoutsRes.count);
          }
        }
      } catch (err) {
        console.error('Error fetching admin badge counts:', err);
      }
    }

    if (isUserAdmin) {
      fetchBadgeCounts();
      // Optional polling interval every 30 seconds for live updates
      const interval = setInterval(fetchBadgeCounts, 30000);

      // Listen to pending media submissions in Firebase RTDB
      const mediaRef = ref(db, 'media_submissions');
      const unsubMedia = onValue(mediaRef, (snapshot) => {
        if (snapshot.exists()) {
          const list = Object.values(snapshot.val());
          const pending = list.filter((item) => item.status === 'pending').length;
          setPendingMediaCount(pending);
        } else {
          setPendingMediaCount(0);
        }
      });

      return () => {
        isMounted = false;
        clearInterval(interval);
        unsubMedia();
      };
    }
  }, [isUserAdmin]);

  const navItems = [
    {
      to: '/admin',
      label: 'Dashboard',
      labelHindi: 'डैशबोर्ड',
      icon: LayoutDashboard,
      end: true,
    },
    {
      to: '/admin/approvals',
      label: 'Approvals',
      labelHindi: 'सत्यापन',
      icon: ClipboardCheck,
      badge: pendingApprovalsCount,
      badgeColor: 'bg-amber-500 text-white',
    },
    {
      to: '/admin/media',
      label: 'Media Approvals',
      labelHindi: 'मीडिया अनुमोदन',
      icon: Camera,
      badge: pendingMediaCount,
      badgeColor: 'bg-rose-500 text-white font-extrabold',
    },
    {
      to: '/admin/members',
      label: 'Members',
      labelHindi: 'सदस्य',
      icon: Users,
    },
    {
      to: '/admin/events',
      label: 'Events',
      labelHindi: 'कार्यक्रम',
      icon: Calendar,
    },
    {
      to: '/admin/certificates',
      label: 'Certificates',
      labelHindi: 'प्रमाण पत्र',
      icon: Award,
    },
    {
      to: '/admin/payouts',
      label: 'Payouts',
      labelHindi: 'भुगतान',
      icon: Banknote,
      badge: pendingPayoutsCount,
      badgeColor: 'bg-emerald-600 text-white',
    },
    {
      to: '/admin/spends',
      label: 'Spend Tracker',
      labelHindi: 'व्यय लेखा',
      icon: IndianRupee,
      badge: 'Live',
      badgeColor: 'bg-amber-500 text-slate-950 font-black',
    },
  ];

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-sm font-medium text-gray-500">
          प्रशासन पैनल लोड हो रहा है... / Verifying admin access...
        </p>
      </div>
    );
  }

  // Not logged in or not admin
  if (!user || !isUserAdmin) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-gray-100 p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center shadow-inner">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-sm font-semibold text-red-600 mb-3">केवल प्रशासक पहुंच / Admin Access Only</p>
          <p className="text-gray-600 text-sm mb-6 leading-relaxed">
            You do not have administrative privileges to access the Uttam Welfare Foundation administration portal.
            If you are an authorized administrator, please log in with your administrative account.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              to="/dashboard"
              className="flex-1 inline-flex items-center justify-center px-5 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-600/20"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Member Dashboard
            </Link>
            <Link
              to="/"
              className="inline-flex items-center justify-center px-5 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
            >
              Public Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const renderNavLinks = () => (
    <div className="space-y-1">
      {navItems.map((item) => {
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setMobileMenuOpen(false)}
            className={({ isActive }) =>
              `flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold transition-all group ${
                isActive
                  ? 'bg-emerald-50 text-emerald-800 border-r-4 border-emerald-600 shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200 group-hover:text-gray-700'
                    }`}
                  >
                    <SafeIcon icon={item.icon} fallback={LayoutDashboard} className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="leading-tight">{item.label}</span>
                    <span className="text-[11px] font-normal text-gray-400 group-hover:text-gray-500">
                      {item.labelHindi}
                    </span>
                  </div>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${item.badgeColor} shadow-sm animate-pulse`}
                  >
                    {item.badge}
                  </span>
                )}
              </>
            )}
          </NavLink>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col md:flex-row antialiased">
      {/* DESKTOP SIDEBAR (Fixed 260px) */}
      <aside className="hidden md:flex md:w-[260px] md:flex-col md:fixed md:inset-y-0 z-30 bg-white border-r border-gray-200 shadow-sm">
        {/* Sidebar Header */}
        <div className="p-5 border-b border-gray-100 flex items-center gap-3 bg-gradient-to-br from-emerald-900 to-teal-950 text-white">
          <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-amber-400 shadow-inner flex-shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs uppercase font-extrabold tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-md">
                Admin Panel
              </span>
            </div>
            <h1 className="text-sm font-bold truncate text-white mt-1" title={FOUNDATION_NAME}>
              {FOUNDATION_NAME}
            </h1>
            <p className="text-[11px] text-emerald-200 truncate font-medium">
              {FOUNDATION_NAME_HINDI}
            </p>
          </div>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-6">
          <div className="px-1 pb-1">
            <LanguageToggle variant="header" className="w-full justify-center" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-3 mb-2">
              Main Menu / मुख्य मेनू
            </p>
            {renderNavLinks()}
          </div>

          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-3 mb-2">
              Portal Navigation
            </p>
            <div className="space-y-1">
              <Link
                to="/dashboard"
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-emerald-100 group-hover:text-emerald-600">
                  <ArrowLeft className="w-4 h-4" />
                </div>
                <span>Back to Member App</span>
              </Link>
              <Link
                to="/"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-gray-200">
                    <ExternalLink className="w-4 h-4" />
                  </div>
                  <span>Public Website</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </Link>
            </div>
          </div>
        </div>

        {/* Sidebar Footer / Current Admin Profile */}
        <div className="p-3.5 border-t border-gray-100 bg-gray-50/70">
          <div className="flex items-center justify-between gap-3 p-2 rounded-xl bg-white border border-gray-200/80 shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold flex items-center justify-center text-sm shadow-sm flex-shrink-0">
                {member?.full_name ? member.full_name.charAt(0).toUpperCase() : 'A'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-900 truncate">
                  {member?.full_name || user?.email || 'Super Administrator'}
                </p>
                <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                  <Shield className="w-3 h-3 inline" /> Admin Privileges
                </p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign Out"
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* MOBILE TOP BAR */}
      <div className="md:hidden sticky top-0 z-30 bg-emerald-950 text-white px-4 py-3 border-b border-emerald-900 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-800 text-amber-400 flex items-center justify-center flex-shrink-0 border border-emerald-700">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-white leading-tight truncate">
              {FOUNDATION_NAME}
            </h1>
            <p className="text-[10px] text-emerald-300 font-medium">
              Admin Portal • प्रशासन
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <LanguageToggle variant="header" className="scale-90" />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl bg-emerald-800/80 text-white hover:bg-emerald-800 focus:outline-none"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* MOBILE DRAWER OVERLAY */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-xs transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* MOBILE DRAWER */}
      <div
        className={`md:hidden fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-emerald-900 to-teal-900 text-white">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-amber-400" />
            <div>
              <p className="text-xs uppercase font-extrabold text-amber-300 tracking-wider">
                UCWF Admin
              </p>
              <p className="text-xs text-emerald-100 font-semibold truncate max-w-[160px]">
                {FOUNDATION_NAME_HINDI}
              </p>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-2 mb-2">
              Admin Navigation
            </p>
            {renderNavLinks()}
          </div>

          <div className="pt-2 border-t border-gray-100">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-2 mb-2">
              External Links
            </p>
            <Link
              to="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-gray-700 hover:bg-emerald-50 hover:text-emerald-700"
            >
              <ArrowLeft className="w-4 h-4 text-emerald-600" />
              <span>Back to Member Dashboard</span>
            </Link>
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-100"
            >
              <ExternalLink className="w-4 h-4 text-gray-500" />
              <span>Public Website Home</span>
            </Link>
          </div>
        </div>

        {/* Mobile Profile Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
                {member?.full_name ? member.full_name.charAt(0).toUpperCase() : 'A'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-900 truncate">
                  {member?.full_name || 'Admin'}
                </p>
                <p className="text-[10px] text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="p-2 text-gray-500 hover:text-red-600 rounded-lg"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 md:ml-[260px] min-w-0 bg-stone-50 min-h-screen">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          {children || <Outlet />}
        </div>
      </main>
    </div>
  );
}

export { AdminLayout };
