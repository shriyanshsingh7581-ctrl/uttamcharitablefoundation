import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { 
  UserPlus, 
  FileText, 
  User, 
  Layers, 
  IndianRupee, 
  TrendingDown, 
  Wallet, 
  Calendar,
  ShieldCheck,
  CheckCircle2,
  Clock,
  LogOut,
  Copy,
  Check,
  Phone,
  Sparkles,
  ExternalLink,
  Printer
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { rtdb, ref, onValue } from '../lib/supabase';
import { FOUNDATION_DETAILS, formatINR, safeText } from '../lib/constants';
import { useDiwaliTheme } from '../contexts/DiwaliThemeContext';
import DiwaliBanner from '../components/diwali/DiwaliBanner';
import GlowingDiya from '../components/diwali/GlowingDiya';
import MidnightCountdownBadge from '../components/ui/MidnightCountdownBadge';
import { getMemberFullName, normId, parseAmount } from '../utils/mlmUtils';

// 8 Dedicated Streamlined Option Components
import NewJoiningSection from '../components/NewJoiningSection';
import DonationSlipSection from '../components/DonationSlipSection';
import MyReportSection from '../components/MyReportSection';
import DownlineReportSection from '../components/DownlineReportSection';
import MyPayoutSection from '../components/MyPayoutSection';
import PaidExpenseSection from '../components/PaidExpenseSection';
import PaidPayoutSection from '../components/PaidPayoutSection';
import DailyReportSection from '../components/DailyReportSection';

export default function Dashboard() {
  const fileRef = useRef(null);
  const photoRef = useRef(null);
  const inputRef = useRef(null);

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentUser, userProfile, member, logout } = useAuth();
  const { bi } = useLanguage();
  const { isDiwaliActive } = useDiwaliTheme();

  const activeUser = userProfile || member || { memberId: 'UCWF-2026-MEMBER' };
  const memberId = activeUser?.memberId || 'UCWF-2026-MEMBER';
  const resolvedMemberId = (memberId && memberId !== 'UCWF-2026-MEMBER') ? memberId : 'UCWF-0001';

  // 8 Canonical Options Drawn by the Client
  // 'new-joining' | 'donation-slip' | 'my-report' | 'downline-report' | 'my-payout' | 'paid-expense' | 'paid-payout' | 'date-by-report'
  const [activeTab, setActiveTab] = useState(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'new-joining' || tabParam === 'joining' || tabParam === 'register') return 'new-joining';
    if (tabParam === 'donation-slip' || tabParam === 'slip' || tabParam === 'receipt') return 'donation-slip';
    if (tabParam === 'downline-report' || tabParam === 'downline' || tabParam === 'team') return 'downline-report';
    if (tabParam === 'my-payout' || tabParam === 'payout') return 'my-payout';
    if (tabParam === 'paid-expense' || tabParam === 'expenses') return 'paid-expense';
    if (tabParam === 'paid-payout' || tabParam === 'withdrawals') return 'paid-payout';
    if (tabParam === 'date-by-report' || tabParam === 'daily' || tabParam === 'daily-report') return 'date-by-report';
    return 'my-report';
  });

  const [allUsers, setAllUsers] = useState({});
  const [copiedId, setCopiedId] = useState(false);

  // Sync tab with URL parameter
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      if (tabParam === 'new-joining' || tabParam === 'joining') setActiveTab('new-joining');
      else if (tabParam === 'donation-slip' || tabParam === 'slip' || tabParam === 'receipt') setActiveTab('donation-slip');
      else if (tabParam === 'my-report' || tabParam === 'report') setActiveTab('my-report');
      else if (tabParam === 'downline-report' || tabParam === 'downline' || tabParam === 'team') setActiveTab('downline-report');
      else if (tabParam === 'my-payout' || tabParam === 'payout') setActiveTab('my-payout');
      else if (tabParam === 'paid-expense' || tabParam === 'expenses') setActiveTab('paid-expense');
      else if (tabParam === 'paid-payout') setActiveTab('paid-payout');
      else if (tabParam === 'date-by-report' || tabParam === 'daily') setActiveTab('date-by-report');
    }
  }, [searchParams]);

  // Load live users with error callback
  useEffect(() => {
    const usersRef = ref(rtdb, 'users');
    const unsub = onValue(
      usersRef,
      (snap) => {
        if (snap.exists()) setAllUsers(snap.val());
        else setAllUsers({});
      },
      (err) => {
        console.warn('Dashboard RTDB users listener error:', err);
      }
    );
    return () => unsub();
  }, []);

  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    setSearchParams({ tab: tabKey });
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(memberId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // 8 Canonical Navigation Boxes Configuration
  const optionsConfig = [
    {
      id: 'new-joining',
      number: 1,
      title: bi('नया जॉइनिंग / डोनेशन', 'New Joining / Donation'),
      description: bi('नया सदस्य पंजीकरण एवं डोनेशन संकल्प', 'New member joining & donation pledge'),
      icon: UserPlus,
      color: 'emerald',
      bgActive: 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-600/30 ring-2 ring-emerald-400',
      bgInactive: 'bg-white text-slate-800 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40',
      badge: 'Auto-Activate'
    },
    {
      id: 'donation-slip',
      number: 2,
      title: bi('डोनेशन की स्लिप', 'Donation Slip & Docs'),
      description: bi('रसीद, डिजिटल आई-कार्ड व सम्मान पत्र', 'Receipt, Digital ID Card & Certificate'),
      icon: FileText,
      color: 'amber',
      bgActive: 'bg-amber-600 text-white border-amber-600 shadow-lg shadow-amber-600/30 ring-2 ring-amber-400',
      bgInactive: 'bg-white text-slate-800 border-slate-200 hover:border-amber-400 hover:bg-amber-50/40',
      badge: 'Print Ready'
    },
    {
      id: 'my-report',
      number: 3,
      title: bi('मेरी रिपोर्ट (My Report)', 'My Report'),
      description: bi('सदस्य प्रोफाइल, आईडी-पासवर्ड व टर्नओवर', 'Member profile, credentials & turnover'),
      icon: User,
      color: 'blue',
      bgActive: 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/30 ring-2 ring-blue-400',
      bgInactive: 'bg-white text-slate-800 border-slate-200 hover:border-blue-400 hover:bg-blue-50/40',
      badge: 'Full Profile'
    },
    {
      id: 'downline-report',
      number: 4,
      title: bi('डाउनलाइन रिपोर्ट (L1–L12)', 'Downline Report (L1–L12)'),
      description: bi('क्रमिक 12-लेवल डाउनलाइन सदस्य सूची', 'Sequential 12-level downline member tree'),
      icon: Layers,
      color: 'purple',
      bgActive: 'bg-purple-700 text-white border-purple-700 shadow-lg shadow-purple-700/30 ring-2 ring-purple-400',
      bgInactive: 'bg-white text-slate-800 border-slate-200 hover:border-purple-400 hover:bg-purple-50/40',
      badge: 'L1 to L12'
    },
    {
      id: 'my-payout',
      number: 5,
      title: bi('मेरा पेआउट (My Payout)', 'My Payout'),
      description: bi('लेवल 1 से 12 तक 50% वितरण तालिका', 'Level 1 to 12 commission ledger (Self = 0%)'),
      icon: IndianRupee,
      color: 'emerald',
      bgActive: 'bg-emerald-700 text-white border-emerald-700 shadow-lg shadow-emerald-700/30 ring-2 ring-emerald-400',
      bgInactive: 'bg-white text-slate-800 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40',
      badge: '50% Pool'
    },
    {
      id: 'paid-expense',
      number: 6,
      title: bi('भुगतान खर्च (Paid Expense)', 'Paid Expense'),
      description: bi('ट्रस्ट एवं कार्यालय खर्च लेजर व शुद्ध बचत', 'Trust & office expenses ledger and net reserve'),
      icon: TrendingDown,
      color: 'rose',
      bgActive: 'bg-rose-600 text-white border-rose-600 shadow-lg shadow-rose-600/30 ring-2 ring-rose-400',
      bgInactive: 'bg-white text-slate-800 border-slate-200 hover:border-rose-400 hover:bg-rose-50/40',
      badge: 'Net Balance'
    },
    {
      id: 'paid-payout',
      number: 7,
      title: bi('पेड पेआउट (Paid Payout)', 'Paid Payout'),
      description: bi('भुगतान प्राप्त एवं बकाया मानदेय लेजर', 'Paid vs unpaid commission settlement ledger'),
      icon: Wallet,
      color: 'teal',
      bgActive: 'bg-teal-600 text-white border-teal-600 shadow-lg shadow-teal-600/30 ring-2 ring-teal-400',
      bgInactive: 'bg-white text-slate-800 border-slate-200 hover:border-teal-400 hover:bg-teal-50/40',
      badge: 'Payment Logs'
    },
    {
      id: 'date-by-report',
      number: 8,
      title: bi('दैनिक रिपोर्ट (Date by Report)', 'Date by Report'),
      description: bi('दैनिक रिपोर्ट व 12:00 AM क्लोजिंग हिसाब', 'Day-by-day & 12:00 AM midnight closing report'),
      icon: Calendar,
      color: 'indigo',
      bgActive: 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/30 ring-2 ring-indigo-400',
      bgInactive: 'bg-white text-slate-800 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40',
      badge: '12:00 AM'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50/60 pb-24 selection:bg-emerald-500 selection:text-white w-full max-w-full overflow-x-hidden">
      {/* Top Festive Toran / Sparkles if active */}
      {isDiwaliActive && <DiwaliBanner className="mb-2" />}

      {/* Top Member Header Strip */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-950 text-white border-b border-emerald-900/60 shadow-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Member Profile Quick Glance */}
            <div className="flex items-center gap-3.5">
              <div className="w-13 h-13 rounded-2xl bg-white/10 border-2 border-emerald-400 p-0.5 flex items-center justify-center shrink-0 overflow-hidden shadow-md">
                {activeUser?.photoUrl ? (
                  <img src={activeUser.photoUrl} alt="Member" className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <User className="w-7 h-7 text-emerald-300" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-black text-white font-serif leading-tight">
                    {getMemberFullName(activeUser)}
                  </h1>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                    {safeText(activeUser?.padNaam || 'कार्यकारिणी सदस्य')}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 mt-0.5">
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="text-slate-400">ID:</span>
                    <strong className="text-amber-300 font-bold bg-white/10 px-2 py-0.2 rounded border border-white/20">
                      {memberId}
                    </strong>
                    <button
                      type="button"
                      onClick={handleCopyId}
                      className="text-slate-400 hover:text-white p-0.5"
                      title="Copy Member ID"
                    >
                      {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <span>•</span>
                  <span>स्पॉन्सर: <strong className="text-emerald-300 font-mono">{activeUser?.sponsorId || 'DIRECT'}</strong></span>
                  <span>•</span>
                  <span>फोन: <strong className="text-white font-mono">{activeUser?.phone || '—'}</strong></span>
                  <span>•</span>
                  <span>कुल सदस्य: <strong className="text-amber-300 font-mono">{Object.keys(allUsers || {}).length}</strong></span>
                </div>
              </div>
            </div>

            {/* Right Quick Actions & Midnight Badge */}
            <div className="flex flex-wrap items-center gap-2.5">
              <MidnightCountdownBadge />
              <button
                type="button"
                onClick={handleLogout}
                className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-rose-600/80 text-white font-bold text-xs border border-white/20 flex items-center gap-1.5 transition cursor-pointer"
                title="Logout from portal"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{bi('लॉगआउट', 'Logout')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6 sm:space-y-8 w-full max-w-full">
        <div>
          <div className="flex items-center justify-between pb-3">
            <div>
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span>{bi('पोर्टल मुख्य विकल्प', 'Member Portal Options')}</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 text-[11px] font-mono font-bold">
                  {bi('8 विकल्प', '8 Options')}
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                {bi(
                  'नीचे दिए गए 8 विकल्पों में से किसी पर भी क्लिक करके संबंधित विवरण देखें अथवा डाउनलोड करें।',
                  'Click any of the 8 portal options below to view reports, vouchers, or download documents.'
                )}
              </p>
            </div>
          </div>

          {/* 8 Clean, Prominent Boxes Grid (4 columns on desktop, 2 on mobile) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {optionsConfig.map((opt) => {
              const IconComponent = opt.icon;
              const isActive = activeTab === opt.id;

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleTabChange(opt.id)}
                  className={`p-4 rounded-3xl border-2 text-left transition-all duration-150 transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex flex-col justify-between min-h-[125px] ${
                    isActive ? opt.bgActive : opt.bgInactive
                  }`}
                >
                  <div className="flex items-start justify-between w-full">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-800'
                    }`}>
                      <IconComponent className="w-5 h-5" />
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${
                      isActive ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      #{opt.number}
                    </span>
                  </div>

                  <div className="mt-3">
                    <h3 className={`text-xs sm:text-sm font-black leading-snug line-clamp-2 ${
                      isActive ? 'text-white' : 'text-slate-900'
                    }`}>
                      {opt.title}
                    </h3>
                    <p className={`text-[10px] sm:text-[11px] font-medium mt-0.5 line-clamp-1 ${
                      isActive ? 'text-white/80' : 'text-slate-500'
                    }`}>
                      {opt.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* =========================================================================
            ACTIVE SECTION CONTENT (Rendered dynamically for each of the 8 options)
           ========================================================================= */}
        <div className="animate-fadeIn">
          {/* OPTION 1: New Joining / डोनेशन */}
          {activeTab === 'new-joining' && (
            <NewJoiningSection
              defaultSponsorId={resolvedMemberId}
              onCreated={() => handleTabChange('my-report')}
            />
          )}

          {/* OPTION 2: डोनेशन की स्लिप (Donation Slip) */}
          {activeTab === 'donation-slip' && (
            <DonationSlipSection initialMemberId={resolvedMemberId} />
          )}

          {/* OPTION 3: My Report */}
          {activeTab === 'my-report' && (
            <MyReportSection targetMember={activeUser} />
          )}

          {/* OPTION 4: Downline Report */}
          {activeTab === 'downline-report' && (
            <DownlineReportSection initialMemberId={resolvedMemberId} />
          )}

          {/* OPTION 5: My Payout */}
          {activeTab === 'my-payout' && (
            <MyPayoutSection initialMemberId={resolvedMemberId} />
          )}

          {/* OPTION 6: Paid Expense */}
          {activeTab === 'paid-expense' && (
            <PaidExpenseSection isAdmin={false} />
          )}

          {/* OPTION 7: Paid Payout */}
          {activeTab === 'paid-payout' && (
            <PaidPayoutSection isAdmin={false} targetMemberId={resolvedMemberId} />
          )}

          {/* OPTION 8: Date by Report */}
          {activeTab === 'date-by-report' && (
            <DailyReportSection 
              users={allUsers} 
              scopedUser={activeUser} 
              title="📅 Date by Report / दैनिक रिपोर्ट एवं 12:00 AM मिडनाइट क्लोजिंग"
              subtitle="दैनिक नया सदस्य पंजीकरण, पैकेज डोनेशन, 12-स्तरीय कमीशन एवं रात्रि 12:00 बजे की क्लोजिंग रिपोर्ट"
            />
          )}
        </div>
      </div>
    </div>
  );
}
