import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users,
  IndianRupee,
  TrendingUp,
  Clock,
  ArrowUpRight,
  ClipboardCheck,
  Banknote,
  Calendar,
  Award,
  RefreshCw,
  Eye,
  CheckCircle,
  AlertCircle,
  Shield,
  Sparkles,
  Phone,
  Mail,
  CalendarDays,
  CreditCard,
  Trash2,
  AlertTriangle,
  Camera,
} from 'lucide-react';
import AdminLayout from './AdminLayout';
import { supabase } from '../../lib/supabase';
import { db, ref, get, update, remove } from '../../lib/firebase';
import { PACKAGES } from '../../lib/constants';
import { parseAmount } from '../../utils/mlmUtils';
import { useLanguage } from '../../contexts/LanguageContext';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { bi } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalRevenue: 0,
    commissionPaid: 0,
    pendingApprovals: 0,
    totalSpends: 0,
  });
  const [recentMembers, setRecentMembers] = useState([]);
  const [packageDistribution, setPackageDistribution] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const fetchDashboardData = useCallback(async () => {
    try {
      // 1. Fetch Total Members & Status counts from Supabase
      const { data: allMembers, error: membersErr } = await supabase
        .from('members')
        .select('id, package_amount, status, tier_name, created_at');

      if (membersErr) {
        console.warn('Supabase members fetch note:', membersErr);
      }

      let membersList = allMembers || [];

      // 2. Fetch Total Commissions Paid from Supabase wallets
      const { data: walletsData, error: walletsErr } = await supabase
        .from('wallets')
        .select('total_earned');

      if (walletsErr) {
        console.warn('Supabase wallets fetch note:', walletsErr);
      }

      let commissionPaid = (walletsData || []).reduce(
        (sum, w) => sum + (Number(w.total_earned) || 0),
        0
      );

      // 3. Fallback and merge with Firebase Realtime Database
      let rtdbSpendsTotal = 0;
      try {
        const spendsSnap = await get(ref(db, 'spends'));
        if (spendsSnap.exists()) {
          const sVal = spendsSnap.val();
          Object.values(sVal).forEach((s) => {
            rtdbSpendsTotal += Number(s.amount) || 0;
          });
        }

        const [fbUsersSnap, fbMembersSnap] = await Promise.all([
          get(ref(db, 'users')).catch(() => null),
          get(ref(db, 'members')).catch(() => null),
        ]);

        const mergedMap = {};
        if (fbMembersSnap && fbMembersSnap.exists()) {
          const mVal = fbMembersSnap.val();
          Object.entries(mVal).forEach(([k, v]) => {
            const amt = parseAmount(v);
            mergedMap[k] = {
              id: k,
              package_amount: amt,
              status: v.status || (amt > 0 ? 'active' : 'pending'),
              tier_name: v.package_name || v.tier_name || 'Seva Mitra',
              created_at: v.created_at || v.createdAt || new Date().toISOString(),
              full_name: v.full_name || v.name || '',
              phone: v.phone || '',
              email: v.email || '',
              member_id: v.member_id || v.memberId || k,
            };
          });
        }
        if (fbUsersSnap && fbUsersSnap.exists()) {
          const uVal = fbUsersSnap.val();
          Object.entries(uVal).forEach(([k, v]) => {
            const amt = Math.max(parseAmount(v), mergedMap[k]?.package_amount || 0);
            mergedMap[k] = {
              ...(mergedMap[k] || {}),
              id: k,
              package_amount: amt,
              status: v.status || (amt > 0 ? 'active' : 'pending'),
              tier_name: v.packageName || v.package_name || 'Seva Mitra',
              created_at: v.createdAt || v.created_at || new Date().toISOString(),
              full_name: v.name || v.full_name || '',
              phone: v.phone || '',
              email: v.email || '',
              member_id: v.memberId || v.member_id || k,
            };
          });
        }

        if (membersList.length === 0 || Object.keys(mergedMap).length > membersList.length) {
          membersList = Object.values(mergedMap);
        } else {
          membersList = membersList.map((m) => ({
            ...m,
            package_amount: Math.max(parseAmount(m), mergedMap[m.id]?.package_amount || 0),
          }));
        }

        if (commissionPaid === 0) {
          const fbWalletsSnap = await get(ref(db, 'wallets'));
          if (fbWalletsSnap.exists()) {
            const wVal = fbWalletsSnap.val();
            Object.values(wVal).forEach((w) => {
              commissionPaid += Number(w.total_earned) || 0;
            });
          }
        }
      } catch (fbErr) {
        console.warn('Firebase RTDB stats fetch note:', fbErr);
      }

      const totalMembers = membersList.length;
      const pendingApprovals = membersList.filter((m) => m.status === 'pending').length;

      // Active members revenue (using unified parseAmount MAX logic)
      const activeMembers = membersList.filter((m) => m.status === 'active' || parseAmount(m) > 0);
      const totalRevenue = activeMembers.reduce(
        (sum, m) => sum + parseAmount(m),
        0
      );

      setStats({
        totalMembers,
        totalRevenue,
        commissionPaid,
        pendingApprovals,
        totalSpends: rtdbSpendsTotal,
      });

      // 3. Package distribution calculation
      // Initialize with our defined PACKAGES
      const distributionMap = {};
      PACKAGES.forEach((pkg) => {
        distributionMap[pkg.name] = {
          name: pkg.name,
          nameHindi: pkg.nameHindi,
          amount: pkg.amount,
          count: 0,
          color: pkg.color || 'emerald',
          gradient: pkg.gradient || 'from-emerald-500 to-teal-600',
        };
      });

      membersList.forEach((m) => {
        const tier = m.tier_name || 'Seva Mitra';
        if (distributionMap[tier]) {
          distributionMap[tier].count += 1;
        } else {
          // Fallback if tier matches by amount
          const foundByAmount = PACKAGES.find((p) => p.amount === Number(m.package_amount));
          if (foundByAmount && distributionMap[foundByAmount.name]) {
            distributionMap[foundByAmount.name].count += 1;
          } else {
            // Default bucket
            if (!distributionMap[tier]) {
              distributionMap[tier] = {
                name: tier,
                nameHindi: tier,
                amount: m.package_amount || 0,
                count: 0,
                color: 'blue',
                gradient: 'from-blue-500 to-indigo-600',
              };
            }
            distributionMap[tier].count += 1;
          }
        }
      });

      const distArray = Object.values(distributionMap);
      setPackageDistribution(distArray);

      // 4. Fetch 10 most recent registrations
      const { data: recent, error: recentErr } = await supabase
        .from('members')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (recentErr || !recent || recent.length === 0) {
        const sortedList = [...membersList].sort(
          (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        );
        setRecentMembers(sortedList.slice(0, 10));
      } else {
        setRecentMembers(recent || []);
      }
    } catch (err) {
      console.error('Dashboard data fetch failed:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const handleResetDatabase = () => {
    setResetConfirmText('');
    setResetModalOpen(true);
  };

  const executeResetDatabase = async () => {
    if (resetConfirmText.trim() !== 'RESET') {
      showToast(bi('कृपया पुष्टि के लिए बॉक्स में RESET टाइप करें।', 'Please type "RESET" to confirm.'), 'error');
      return;
    }

    setRefreshing(true);
    try {
      // 1. Remove test payments, transactions, payouts
      await remove(ref(db, 'registrations_payments')).catch(() => {});
      await remove(ref(db, 'payments')).catch(() => {});
      await remove(ref(db, 'transactions')).catch(() => {});
      await remove(ref(db, 'payouts')).catch(() => {});

      // 2. Reset members to 0 balance or non-admin members
      const membersSnap = await get(ref(db, 'members'));
      if (membersSnap.exists()) {
        const mems = membersSnap.val();
        for (const [id, m] of Object.entries(mems)) {
          if (m.role !== 'admin' && !m.email?.includes('admin')) {
            await remove(ref(db, `members/${id}`)).catch(() => {});
            await remove(ref(db, `users/${id}`)).catch(() => {});
            await remove(ref(db, `wallets/${id}`)).catch(() => {});
          } else {
            await update(ref(db, `wallets/${id}`), {
              balance: 0,
              total_earned: 0,
              total_withdrawn: 0,
              pending_withdrawn: 0,
            }).catch(() => {});
          }
        }
      }

      setResetModalOpen(false);
      setResetConfirmText('');
      showToast(bi('सभी टेस्ट डेटा सफलतापूर्वक साफ़ कर दिया गया है।', 'All test data has been purged. All metrics are reset to ₹0.'), 'success');
      await fetchDashboardData();
    } catch (err) {
      console.error('Reset error:', err);
      showToast(bi('डेटाबेस रीसेट त्रुटि: ', 'Error resetting database: ') + err.message, 'error');
    } finally {
      setRefreshing(false);
    }
  };

  const openMemberDetail = (member) => {
    setSelectedMember(member);
    setDetailModalOpen(true);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return (
          <Badge variant="success" size="sm" dot>
            Active
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="warning" size="sm" dot>
            Pending
          </Badge>
        );
      case 'blocked':
        return (
          <Badge variant="error" size="sm" dot>
            Blocked
          </Badge>
        );
      default:
        return (
          <Badge variant="navy" size="sm">
            {status || 'Unknown'}
          </Badge>
        );
    }
  };

  const maxDistributionCount = Math.max(
    ...packageDistribution.map((d) => d.count),
    1
  );

  return (
    <AdminLayout>
      {toast && (
        <div
          className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold flex items-center gap-2 ${
            toast.type === 'error'
              ? 'bg-rose-950 text-rose-100 border-rose-500/40'
              : 'bg-emerald-950 text-emerald-100 border-emerald-500/40'
          }`}
        >
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{toast.message}</span>
        </div>
      )}
      <div className="space-y-8">
        {/* Top Header & Quick Refresh */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                {bi('प्रशासन डैशबोर्ड', 'Admin Dashboard')}
              </span>
              <span className="text-xs text-gray-400">{bi('लाइव अवलोकन', 'Live Overview')}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mt-1">
              {bi('प्रशासनिक अवलोकन एवं विश्लेषण', 'Admin Overview & Analytics')}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {bi('फाउंडेशन सदस्यता, कुल राजस्व, 12-स्तरीय मानदेय वितरण एवं लंबित अनुमोदन देखें।', 'Monitor foundation memberships, revenue, 12-tier disbursements, and pending tasks.')}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleResetDatabase}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition-all cursor-pointer active:scale-95 shadow-xs"
              title="Clear all test registrations, transactions, and payouts"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Reset / Clear Test Data</span>
            </button>
            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              loading={refreshing}
              onClick={handleRefresh}
              className="bg-white"
            >
              Refresh Data
            </Button>
          </div>
        </div>

        {/* 4 STATS CARDS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Total Members */}
          <GlassCard className="p-6 bg-white border border-gray-100 shadow-sm relative overflow-hidden group hover:border-emerald-300">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
                  <Users className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  कुल सदस्य
                </span>
              </div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Total Members
              </p>
              <h3 className="text-3xl font-extrabold text-gray-900 mt-1">
                {loading ? '...' : stats.totalMembers.toLocaleString('en-IN')}
              </h3>
              <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                <span className="text-emerald-600 font-semibold">Registered</span> across all tiers
              </p>
            </div>
          </GlassCard>

          {/* Card 2: Total Revenue */}
          <GlassCard className="p-6 bg-white border border-gray-100 shadow-sm relative overflow-hidden group hover:border-blue-300">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shadow-xs">
                  <IndianRupee className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  कुल आय
                </span>
              </div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Total Revenue
              </p>
              <h3 className="text-3xl font-extrabold text-gray-900 mt-1">
                {loading ? '...' : `₹${stats.totalRevenue.toLocaleString('en-IN')}`}
              </h3>
              <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                From active member package contributions
              </p>
            </div>
          </GlassCard>

          {/* Card 3: Commission Paid */}
          <GlassCard className="p-6 bg-white border border-gray-100 shadow-sm relative overflow-hidden group hover:border-purple-300">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shadow-xs">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                  कमीशन वितरित
                </span>
              </div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Commission Distributed
              </p>
              <h3 className="text-3xl font-extrabold text-gray-900 mt-1">
                {loading ? '...' : `₹${stats.commissionPaid.toLocaleString('en-IN')}`}
              </h3>
              <p className="text-xs text-gray-400 mt-2">
                12-Level Seva Incentive to members
              </p>
            </div>
          </GlassCard>

          {/* Card 4: Pending Approvals */}
          <GlassCard
            onClick={() => navigate('/admin/approvals')}
            className="p-6 bg-white border border-gray-100 shadow-sm relative overflow-hidden group hover:border-amber-300 cursor-pointer"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-xs">
                  <Clock className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                  सत्यापन बाकी
                </span>
              </div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Pending Approvals
              </p>
              <h3 className="text-3xl font-extrabold text-amber-700 mt-1 flex items-baseline gap-2">
                {loading ? '...' : stats.pendingApprovals}
                {stats.pendingApprovals > 0 && (
                  <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full animate-pulse">
                    Action Needed
                  </span>
                )}
              </h3>
              <p className="text-xs text-amber-800 font-medium mt-2 flex items-center gap-1 group-hover:underline">
                Review payment proofs <ArrowUpRight className="w-3.5 h-3.5" />
              </p>
            </div>
          </GlassCard>
        </div>

        {/* QUICK ACTIONS BANNER */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => navigate('/admin/approvals')}
            className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl shadow-md shadow-emerald-700/20 hover:from-emerald-700 hover:to-teal-800 transition-all text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-xs">
                <ClipboardCheck className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <p className="font-bold text-sm">Review Approvals</p>
                <p className="text-xs text-emerald-100">
                  {stats.pendingApprovals} awaiting verification
                </p>
              </div>
            </div>
            <ArrowUpRight className="w-5 h-5 text-white/70 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </button>

          <button
            onClick={() => navigate('/admin/payouts')}
            className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-700 to-indigo-800 text-white rounded-2xl shadow-md shadow-blue-800/20 hover:from-blue-800 hover:to-indigo-900 transition-all text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-xs">
                <Banknote className="w-5 h-5 text-emerald-300" />
              </div>
              <div>
                <p className="font-bold text-sm">Process Payouts</p>
                <p className="text-xs text-blue-100">Review withdrawal requests</p>
              </div>
            </div>
            <ArrowUpRight className="w-5 h-5 text-white/70 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </button>

          <button
            onClick={() => navigate('/admin/events')}
            className="flex items-center justify-between p-4 bg-white border border-gray-200 text-gray-800 rounded-2xl shadow-sm hover:border-emerald-500 hover:bg-emerald-50/40 transition-all text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm text-gray-900">Manage Events</p>
                <p className="text-xs text-gray-500">Post camps & gallery updates</p>
              </div>
            </div>
            <ArrowUpRight className="w-5 h-5 text-gray-400 group-hover:text-emerald-600 transition-colors" />
          </button>

          <button
            onClick={() => navigate('/admin/certificates')}
            className="flex items-center justify-between p-4 bg-white border border-gray-200 text-gray-800 rounded-2xl shadow-sm hover:border-amber-500 hover:bg-amber-50/40 transition-all text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm text-gray-900">Issue Certificates</p>
                <p className="text-xs text-gray-500">Puraskar & honor citations</p>
              </div>
            </div>
            <ArrowUpRight className="w-5 h-5 text-gray-400 group-hover:text-amber-600 transition-colors" />
          </button>

          <button
            onClick={() => navigate('/admin/media')}
            className="flex items-center justify-between p-4 bg-white border border-gray-200 text-gray-800 rounded-2xl shadow-sm hover:border-rose-500 hover:bg-rose-50/40 transition-all text-left group sm:col-span-2 lg:col-span-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-100 text-rose-700 rounded-xl">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm text-gray-900">Media Approvals (फोटो व वीडियो अनुमोदन)</p>
                <p className="text-xs text-gray-500">Review member-uploaded seva photos and videos for public gallery</p>
              </div>
            </div>
            <ArrowUpRight className="w-5 h-5 text-gray-400 group-hover:text-rose-600 transition-colors" />
          </button>
        </div>

        {/* 2 COLUMN SECTION: REVENUE / TIER DISTRIBUTION + QUICK LINKS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* PACKAGE DISTRIBUTION (2 cols) */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Package Tier Distribution</h2>
                <p className="text-xs text-gray-500">
                  Breakdown of registered members across foundation packages
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg">
                योजनावार सदस्य
              </span>
            </div>

            {loading ? (
              <div className="py-12 flex justify-center">
                <LoadingSpinner size="md" text="Loading chart data..." />
              </div>
            ) : (
              <div className="space-y-4">
                {packageDistribution.map((pkg) => {
                  const percentage =
                    stats.totalMembers > 0
                      ? Math.round((pkg.count / stats.totalMembers) * 100)
                      : 0;
                  const barWidthPercent =
                    maxDistributionCount > 0
                      ? Math.max(Math.round((pkg.count / maxDistributionCount) * 100), 4)
                      : 4;

                  return (
                    <div key={pkg.name} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs sm:text-sm font-semibold">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-900">{pkg.name}</span>
                          <span className="text-gray-400 text-xs">({pkg.nameHindi})</span>
                          <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-mono font-bold">
                            ₹{pkg.amount}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-gray-900 font-bold">{pkg.count} members</span>
                          <span className="text-gray-400 text-xs w-10 text-right">
                            {percentage}%
                          </span>
                        </div>
                      </div>

                      {/* Visual Bar */}
                      <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden p-0.5 flex items-center">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${barWidthPercent}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                          className={`h-full rounded-full bg-gradient-to-r ${pkg.gradient} shadow-xs`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SIDE SUMMARY CARD */}
          <div className="bg-gradient-to-br from-emerald-950 via-teal-900 to-slate-900 text-white rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-amber-400 border border-white/10">
                  <Shield className="w-5 h-5" />
                </div>
                <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold">
                  Trustee Metrics
                </span>
              </div>

              <h3 className="text-lg font-bold text-white mb-1">
                Welfare Reserve Balance
              </h3>
              <p className="text-xs text-emerald-200/80 leading-relaxed">
                Net foundation inflow retained after Seva incentive disbursements.
              </p>

              <div className="my-6 p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="text-xs text-gray-300">Estimated Net Foundation Fund</p>
                <p className="text-3xl font-extrabold text-amber-400 mt-1">
                  ₹{Math.max(stats.totalRevenue - stats.commissionPaid - (stats.totalSpends || 0), 0).toLocaleString('en-IN')}
                </p>
                <div className="mt-3 text-[11px] text-gray-300 flex flex-wrap items-center justify-between border-t border-white/10 pt-2 gap-1">
                  <span>Intake: ₹{stats.totalRevenue.toLocaleString('en-IN')}</span>
                  <span>Commission: ₹{stats.commissionPaid.toLocaleString('en-IN')}</span>
                  <span>Spends: ₹{(stats.totalSpends || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2.5 pt-4 border-t border-white/10">
              <Button
                variant="gold"
                fullWidth
                size="sm"
                onClick={() => navigate('/admin/approvals')}
              >
                Go to Approvals Queue
              </Button>
              <Button
                variant="outline"
                fullWidth
                size="sm"
                className="text-white border-white/30 hover:bg-white/10"
                onClick={() => navigate('/admin/members')}
              >
                Browse All Members
              </Button>
            </div>
          </div>
        </div>

        {/* RECENT REGISTRATIONS TABLE */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Recent Registrations</h2>
              <p className="text-xs text-gray-500">
                Latest 10 members joined in the foundation
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/members')}
            >
              View All Members
            </Button>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center">
              <LoadingSpinner size="md" text="Loading recent members..." />
            </div>
          ) : recentMembers.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <Users className="w-10 h-10 mx-auto text-gray-300 mb-2" />
              <p className="font-semibold text-gray-700">No member registrations found.</p>
              <p className="text-xs text-gray-400">New signups will appear here automatically.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-50/70 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    <th className="py-3.5 px-6">Member</th>
                    <th className="py-3.5 px-6">Member ID</th>
                    <th className="py-3.5 px-6">Package</th>
                    <th className="py-3.5 px-6">Status</th>
                    <th className="py-3.5 px-6">Date</th>
                    <th className="py-3.5 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {recentMembers.map((m) => (
                    <tr
                      key={m.id}
                      className="hover:bg-emerald-50/30 transition-colors group"
                    >
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs flex-shrink-0">
                            {m.full_name ? m.full_name.charAt(0).toUpperCase() : 'M'}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{m.full_name || 'Anonymous'}</p>
                            <p className="text-xs text-gray-400">{m.phone || m.email || 'No contact'}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-6 font-mono text-xs font-semibold text-gray-700">
                        {m.member_id || m.id.substring(0, 8)}
                      </td>

                      <td className="py-3.5 px-6">
                        <span className="font-semibold text-gray-800">
                          {m.tier_name || 'Seva Mitra'}
                        </span>
                        <span className="block text-xs text-emerald-600 font-bold">
                          ₹{m.package_amount || 500}
                        </span>
                      </td>

                      <td className="py-3.5 px-6">
                        {getStatusBadge(m.status)}
                      </td>

                      <td className="py-3.5 px-6 text-xs text-gray-500">
                        {m.created_at
                          ? new Date(m.created_at).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'N/A'}
                      </td>

                      <td className="py-3.5 px-6 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={Eye}
                          onClick={() => openMemberDetail(m)}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* QUICK VIEW MODAL */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title="Member Summary / सदस्य विवरण"
        subtitle={selectedMember?.member_id || 'Member Profile'}
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDetailModalOpen(false)}
            >
              Close
            </Button>
            {selectedMember?.status === 'pending' ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setDetailModalOpen(false);
                  navigate('/admin/approvals');
                }}
              >
                Go to Approvals
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setDetailModalOpen(false);
                  navigate('/admin/members');
                }}
              >
                Full Member Profile
              </Button>
            )}
          </div>
        }
      >
        {selectedMember && (
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-stone-50 border border-gray-100">
              <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white font-extrabold text-xl flex items-center justify-center shadow-md">
                {selectedMember.full_name ? selectedMember.full_name.charAt(0).toUpperCase() : 'M'}
              </div>
              <div>
                <h4 className="text-base font-bold text-gray-900">{selectedMember.full_name}</h4>
                <p className="text-xs text-gray-500">Member ID: {selectedMember.member_id || selectedMember.id}</p>
                <div className="mt-1 flex items-center gap-2">
                  {getStatusBadge(selectedMember.status)}
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    {selectedMember.tier_name || 'Seva Mitra'} (₹{selectedMember.package_amount})
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-gray-400 font-medium">Contact Phone</p>
                <p className="font-semibold text-gray-800 mt-0.5 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-gray-500" />
                  {selectedMember.phone || 'Not provided'}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-gray-400 font-medium">Email Address</p>
                <p className="font-semibold text-gray-800 mt-0.5 truncate flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-gray-500" />
                  {selectedMember.email || 'Not provided'}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-gray-400 font-medium">Payment UTR</p>
                <p className="font-mono font-bold text-emerald-800 mt-0.5 truncate">
                  {selectedMember.payment_utr || 'None'}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-gray-400 font-medium">Joined On</p>
                <p className="font-semibold text-gray-800 mt-0.5">
                  {selectedMember.created_at
                    ? new Date(selectedMember.created_at).toLocaleDateString('en-IN')
                    : 'N/A'}
                </p>
              </div>
            </div>

            {selectedMember.address && (
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs">
                <p className="text-gray-400 font-medium">Address</p>
                <p className="font-semibold text-gray-800 mt-0.5">{selectedMember.address}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* IN-APP DATABASE RESET CONFIRMATION MODAL (No window.prompt/alert) */}
      <Modal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title={bi('डेटाबेस टेस्ट डेटा रीसेट करें', 'Reset Test Database Data')}
        subtitle={bi('यह क्रिया गैर-एडमिन सदस्य, भुगतान एवं पेआउट साफ़ कर देगी', 'Permanently clears test registrations, transactions, and payouts')}
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="outline" size="sm" onClick={() => setResetModalOpen(false)}>
              {bi('रद्द करें', 'Cancel')}
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={refreshing}
              onClick={executeResetDatabase}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {bi('पुष्टि करें और रीसेट करें', 'Confirm Reset')}
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-xs">
          <p className="text-gray-700 leading-relaxed">
            {bi(
              'सभी टेस्ट पंजीकरण, भुगतान और पेआउट साफ़ करने के लिए नीचे बॉक्स में "RESET" टाइप करें। वास्तविक एडमिन एक्सेस सुरक्षित रहेगा।',
              'Type "RESET" below to permanently clear all test registrations, transactions, and payouts. Real admin access remains intact.'
            )}
          </p>
          <input
            type="text"
            value={resetConfirmText}
            onChange={(e) => setResetConfirmText(e.target.value)}
            placeholder="Type RESET here"
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-mono font-bold text-gray-900 focus:border-rose-500 outline-none"
          />
        </div>
      </Modal>
    </AdminLayout>
  );
}

export { AdminDashboard };
