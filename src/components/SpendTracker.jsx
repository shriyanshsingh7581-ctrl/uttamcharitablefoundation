import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IndianRupee,
  TrendingDown,
  TrendingUp,
  ShieldCheck,
  Download,
  Search,
  Filter,
  Calendar,
  Building2,
  Users,
  CheckCircle2,
  FileText,
  ExternalLink,
  Glasses,
  Droplets,
  BookOpen,
  Gift,
  Sun,
  HeartHandshake,
  Sparkles,
  PieChart,
} from 'lucide-react';
import { ref, onValue, set } from 'firebase/database';
import { db } from '../lib/firebase';
import { Diya } from './ui/DiwaliDecorations';
import { useLanguage } from '../contexts/LanguageContext';
import SafeIcon from './ui/SafeIcon';

// Foundation Public Welfare Spends (Connected 100% to Realtime Database /spends)
export const DEFAULT_FOUNDATION_SPENDS = [];

export const CATEGORY_ICONS = {
  Healthcare: Glasses,
  LifeSupport: Droplets,
  Education: BookOpen,
  Welfare: Gift,
  Empowerment: Sun,
  Environment: HeartHandshake,
  Admin: Building2,
};

export const CATEGORY_COLORS = {
  Healthcare: 'text-blue-600 bg-blue-50 border-blue-200',
  LifeSupport: 'text-red-600 bg-red-50 border-red-200',
  Education: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  Welfare: 'text-amber-600 bg-amber-50 border-amber-200',
  Empowerment: 'text-purple-600 bg-purple-50 border-purple-200',
  Environment: 'text-teal-600 bg-teal-50 border-teal-200',
  Admin: 'text-slate-600 bg-slate-50 border-slate-200',
};

export default function SpendTracker({ showHeader = true, compact = false }) {
  const { t, isHindi } = useLanguage();
  const [spends, setSpends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpend, setSelectedSpend] = useState(null);

  // Sync with Firebase Realtime Database
  useEffect(() => {
    try {
      const spendsRef = ref(db, 'spends');
      const unsubscribe = onValue(
        spendsRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val();
            // Convert object to array
            const list = Object.keys(data).map((key) => ({
              id: key,
              ...data[key],
            }));
            setSpends(list);
          } else {
            setSpends([]);
          }
          setLoading(false);
        },
        (error) => {
          console.warn('RTDB spends listener note:', error);
          setSpends([]);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (e) {
      setSpends([]);
      setLoading(false);
    }
  }, []);

  // Total Calculations
  const totalSpent = spends.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const totalBeneficiaries = spends.reduce(
    (sum, item) => sum + (Number(item.beneficiaries) || 0),
    0
  );

  // Filtered Spends
  const filteredSpends = spends.filter((item) => {
    const matchesCategory =
      selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.titleHindi && item.titleHindi.includes(searchQuery)) ||
      (item.utrNumber && item.utrNumber.includes(searchQuery)) ||
      (item.location && item.location.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const categories = ['All', 'Healthcare', 'LifeSupport', 'Education', 'Welfare', 'Empowerment', 'Environment'];

  return (
    <div className="w-full">
      {showHeader && (
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-400/40 text-amber-700 text-xs font-bold uppercase tracking-wider mb-3">
            <Diya size={18} glow={false} />
            <span>
              {isHindi ? '100% वित्तीय पारदर्शिता • ऑडिटेड ब्यौरा' : '100% Financial Transparency • Audited Ledger'}
            </span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            {isHindi ? 'फाउंडेशन खर्च विवरण' : 'Foundation Spend Tracker'}
          </h2>
          <p className="text-sm sm:text-base font-semibold text-emerald-800 mt-1">
            {isHindi
              ? 'फाउंडेशन द्वारा समाज सेवा में व्यय किए गए एक-एक रुपये का सार्वजनिक विवरण'
              : 'Public verification of all charity, health, and welfare funds disbursed'}
          </p>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-2xl mx-auto">
            {isHindi
              ? 'प्रत्येक दान, सदस्यता शुल्क एवं सेवा निधि का 12-अंकों के बैंक यूटीआर व रसीद सहित 100% सत्यापित ऑडिट।'
              : 'Every donation, tier contribution, and welfare fund is tracked with verified 12-digit bank UTR numbers, voucher receipts, and direct field audit proof.'}
          </p>
        </div>
      )}

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {/* Total Welfare Spend */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-950 text-white shadow-xl shadow-emerald-950/20 border border-emerald-600/30 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">
              Total Welfare Expenditure
            </span>
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-amber-300">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black tracking-tight text-white">
            ₹{totalSpent.toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-emerald-200/90 mt-1">
            कुल जनकल्याण व्यय • Verified Bank Disbursals
          </p>
        </div>

        {/* Lives Impacted */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-600 via-amber-700 to-amber-900 text-white shadow-xl shadow-amber-950/20 border border-amber-400/30 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-100">
              Citizens Impacted
            </span>
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-amber-200">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black tracking-tight text-white">
            {totalBeneficiaries.toLocaleString('en-IN')}+
          </p>
          <p className="text-xs text-amber-100/90 mt-1">
            प्रत्यक्ष लाभान्वित नागरिक एवं परिवार
          </p>
        </div>

        {/* Verification Status */}
        <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-xl shadow-slate-200/60 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Audit & Verification
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-gray-900">100% Audited</span>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                UTR Linked
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Registered Indian Public Trust • 12A & 80G Compliant
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-emerald-800 text-white shadow-md'
                    : 'bg-stone-100 text-gray-600 hover:bg-stone-200'
                }`}
              >
                {cat === 'All' ? 'All Wings (सभी)' : cat}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search camp, location or UTR..."
              className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
        </div>
      </div>

      {/* Spend Table / Cards List */}
      <div className="space-y-3">
        {filteredSpends.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 p-6">
            <p className="text-sm font-semibold text-gray-600">
              {isHindi ? 'अभी कोई व्यय रिकॉर्ड उपलब्ध नहीं है' : 'No expenditure records available.'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {isHindi ? 'संस्था द्वारा किए गए व्यय यहाँ स्वतः प्रदर्शित होंगे।' : 'Audited foundation expenditures will appear here once recorded.'}
            </p>
          </div>
        ) : (
          filteredSpends.map((item) => {
            const rawIcon = CATEGORY_ICONS[item.category] || HeartHandshake;
            const colorClass = CATEGORY_COLORS[item.category] || 'text-emerald-700 bg-emerald-50 border-emerald-200';

            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left details */}
                <div className="flex items-start gap-3 sm:gap-4 flex-1">
                  <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 ${colorClass}`}>
                    <SafeIcon icon={rawIcon} fallback={HeartHandshake} className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${colorClass}`}>
                        {item.categoryHindi || item.category}
                      </span>
                      <span className="text-[10px] text-gray-500 font-mono bg-stone-100 px-2 py-0.5 rounded-md">
                        Voucher: {item.voucherNo || item.id}
                      </span>
                      {item.verified && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Audit Verified
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm sm:text-base font-bold text-gray-900 leading-snug">
                      {item.title}
                    </h4>
                    {item.titleHindi && (
                      <p className="text-xs text-amber-700 font-semibold mt-0.5">
                        {item.titleHindi}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {item.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500 mt-2">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        {item.date}
                      </span>
                      <span>•</span>
                      <span>{item.location}</span>
                      {item.utrNumber && (
                        <>
                          <span>•</span>
                          <span className="font-mono text-emerald-800 font-bold">
                            UTR: {item.utrNumber}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Amount & Impact */}
                <div className="flex items-center justify-between md:flex-col md:items-end shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-gray-100">
                  <div className="text-left md:text-right">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
                      Disbursed Fund
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-gray-900">
                      ₹{Number(item.amount).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl">
                      <Users className="w-3.5 h-3.5 text-emerald-700" />
                      <span>{item.beneficiaries} Beneficiaries</span>
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
