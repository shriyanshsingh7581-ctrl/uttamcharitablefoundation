import React, { useState, useEffect } from 'react';
import { 
  IndianRupee, 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Building2, 
  Send,
  History,
  ShieldCheck,
  Users,
  TrendingUp,
  Layers,
  Award
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { rtdb } from '../lib/firebase';
import { ref, onValue, push, set, update } from 'firebase/database';
import { formatINR, safeText } from '../lib/constants';

export default function Wallet() {
  const { currentUser, userProfile } = useAuth();
  const { isHindi, t } = useLanguage();

  const [withdrawals, setWithdrawals] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [payoutMode, setPayoutMode] = useState('cash'); // 'cash' (Default) | 'upi' | 'bank'
  const [bankName, setBankName] = useState(userProfile?.bankDetails?.bankName || '');
  const [accountNo, setAccountNo] = useState(userProfile?.bankDetails?.accountNo || '');
  const [ifsc, setIfsc] = useState(userProfile?.bankDetails?.ifsc || '');
  const [upiId, setUpiId] = useState(userProfile?.bankDetails?.upiId || '');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const walletBalance = Number(userProfile?.walletBalance || 0);
  const selfBusiness = Number(userProfile?.selfBusiness || userProfile?.packageAmount || 500);
  const teamBusiness = Number(userProfile?.teamBusiness || 0);
  const downlineBusiness = Number(userProfile?.downlineBusiness || 0);
  const teamCount = Number(userProfile?.teamCount || 0);

  // Sync saved bank details if available
  useEffect(() => {
    if (userProfile?.bankDetails) {
      if (userProfile.bankDetails.bankName) setBankName(userProfile.bankDetails.bankName);
      if (userProfile.bankDetails.accountNo) setAccountNo(userProfile.bankDetails.accountNo);
      if (userProfile.bankDetails.ifsc) setIfsc(userProfile.bankDetails.ifsc);
      if (userProfile.bankDetails.upiId) setUpiId(userProfile.bankDetails.upiId);
    }
  }, [userProfile]);

  // Fetch Member's Transactions & Withdrawals
  useEffect(() => {
    if (!currentUser?.uid) return;

    // 1. Transactions
    const txRef = ref(rtdb, 'transactions');
    const unsubTx = onValue(txRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.values(data)
          .filter(t => t && t.userId === currentUser.uid)
          .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setTransactions(list);
      } else {
        setTransactions([]);
      }
    });

    // 2. Withdrawals
    const wRef = ref(rtdb, 'withdrawals');
    const unsubW = onValue(wRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.values(data)
          .filter(w => w && w.userId === currentUser.uid)
          .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setWithdrawals(list);
      } else {
        setWithdrawals([]);
      }
    });

    return () => {
      unsubTx();
      unsubW();
    };
  }, [currentUser?.uid]);

  // Handle Withdrawal Submission
  const handleWithdrawalSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const amt = parseFloat(withdrawAmount);
    if (isNaN(amt) || amt < 500) {
      setErrorMsg('न्यूनतम निकासी राशि ₹500 होनी चाहिए।');
      return;
    }
    if (amt > walletBalance) {
      setErrorMsg('निकासी राशि आपके उपलब्ध वॉलेट बैलेंस से अधिक नहीं हो सकती।');
      return;
    }

    // Bank / UPI validation only if cash mode is not selected
    if (payoutMode !== 'cash' && !upiId.trim() && (!accountNo.trim() || !ifsc.trim())) {
      setErrorMsg('कृपया या तो UPI ID अथवा बैंक खाता विवरण (Account No + IFSC) दर्ज करें, या फिर नकद भुगतान विकल्प चुनें।');
      return;
    }

    setSubmitting(true);

    try {
      // 1. Create withdrawal request in /withdrawals
      const withdrawalsRef = ref(rtdb, 'withdrawals');
      const newWRef = push(withdrawalsRef);
      const withdrawalId = newWRef.key;

      const withdrawalData = {
        id: withdrawalId,
        userId: currentUser.uid,
        memberId: userProfile?.memberId || 'UCWF-MEMBER',
        userName: userProfile?.displayName || userProfile?.name || 'सम्मानित सदस्य',
        phone: userProfile?.phone || '',
        amount: amt,
        payoutMode: payoutMode, // 'cash' | 'upi' | 'bank'
        payoutMethod: payoutMode === 'cash' 
          ? 'Cash / Offline Office Handover (नकद / ट्रस्ट कार्यालय भुगतान)' 
          : (payoutMode === 'upi' ? 'UPI Transfer' : 'Bank Transfer'),
        upiId: payoutMode === 'cash' ? 'N/A (Cash Mode)' : upiId.trim(),
        bankName: payoutMode === 'cash' ? 'नकद भुगतान (ट्रस्ट कार्यालय)' : bankName.trim(),
        accountNo: payoutMode === 'cash' ? 'N/A (Cash Mode)' : accountNo.trim(),
        ifsc: payoutMode === 'cash' ? 'N/A' : ifsc.trim().toUpperCase(),
        status: 'pending', // pending | approved | rejected
        createdAt: new Date().toISOString(),
        timestamp: Date.now()
      };

      // 2. Decrement user's walletBalance
      const newBalance = walletBalance - amt;

      const updates = {};
      updates[`/withdrawals/${withdrawalId}`] = withdrawalData;
      updates[`/users/${currentUser.uid}/walletBalance`] = newBalance;
      if (payoutMode !== 'cash') {
        updates[`/users/${currentUser.uid}/bankDetails`] = {
          bankName: bankName.trim(),
          accountNo: accountNo.trim(),
          ifsc: ifsc.trim().toUpperCase(),
          upiId: upiId.trim()
        };
      }

      await update(ref(rtdb), updates);

      const msg = payoutMode === 'cash'
        ? `₹${amt} की नकद निकासी का अनुरोध सफलतापूर्वक सबमिट हो गया है! व्यवस्थापक (Admin) द्वारा स्वीकृति उपरांत आप ट्रस्ट के काशीपुर कार्यालय या अधिकृत पदाधिकारी से सीधे नकद मानदेय प्राप्त कर सकते हैं।`
        : `₹${amt} की निकासी का अनुरोध सफलतापूर्वक सबमिट हो गया है! व्यवस्थापक द्वारा स्वीकृति होते ही राशि आपके खाते में अंतरित कर दी जाएगी।`;

      setSuccessMsg(msg);
      setWithdrawAmount('');
      setSubmitting(false);

    } catch (err) {
      console.error('Withdrawal error:', err);
      setErrorMsg('अनुरोध सबमिट करने में विफल: ' + (err.message || 'त्रुटि'));
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen py-6 sm:py-8 px-3 sm:px-6 lg:px-8 w-full max-w-full overflow-x-hidden">
      <div className="max-w-7xl mx-auto space-y-8 w-full max-w-full">
        
        {/* Header - Glassmorphic Pod */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card-premium p-6 sm:p-8 rounded-3xl shadow-xl">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full glass-pill text-emerald-800 text-xs font-bold mb-2">
              <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
              <span>{isHindi ? 'मानदेय एवं वॉलेट प्रबंधन' : 'Honorarium & Wallet Management'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {isHindi ? 'वॉलेट एवं बिज़नेस मॉड्यूल' : 'Wallet & Business Module'}
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {isHindi 
                ? 'वॉलेट बैलेंस, टीम बिज़नेस, डाउनलाइन बिज़नेस, सेल्फ बिज़नेस एवं बैंक निकासी प्रबंधन' 
                : 'Manage your real-time wallet balance, team business, downline business, self business, and withdrawals.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-xl shadow-emerald-700/25 border border-white/20 text-right">
              <p className="text-[11px] text-emerald-100 font-bold uppercase tracking-wider">
                {isHindi ? 'उपलब्ध निकासी बैलेंस' : 'Available Balance'}
              </p>
              <h3 className="text-2xl sm:text-3xl font-black mt-0.5">{formatINR(walletBalance)}</h3>
            </div>
          </div>
        </div>

        {/* 4 CORE CARDS: EXACT MATCH TO HANDWRITTEN SPECIFICATION */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Main Wallet */}
          <div className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-xl shadow-emerald-900/20 border border-white/20">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-100 flex items-center gap-1.5">
                <IndianRupee className="w-4 h-4 text-emerald-200" />
                <span>{isHindi ? '1. वॉलेट' : '1. Main Wallet'}</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold">
                {isHindi ? 'उपलब्ध' : 'Live'}
              </span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight">{formatINR(walletBalance)}</h3>
            <p className="text-[11px] text-emerald-100/90 mt-1 font-medium">
              {isHindi ? 'तत्काल बैंक / UPI निकासी हेतु शेष' : 'Available for Bank/UPI withdrawal'}
            </p>
            <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between">
              <a
                href="#withdraw-section"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-emerald-800 hover:bg-emerald-50 text-xs font-extrabold shadow transition active:scale-95"
              >
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                <span>{isHindi ? 'पेआउट लें' : 'Withdraw'}</span>
              </a>
              <span className="text-[10px] text-emerald-100 font-mono font-bold">न्यूनतम ₹500</span>
            </div>
          </div>

          {/* Card 2: Team Business */}
          <div className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 text-white shadow-xl shadow-blue-900/20 border border-white/20">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-extrabold uppercase tracking-wider text-blue-100 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-200" />
                <span>{isHindi ? '2. टीम बिज़नेस' : '2. Team Business'}</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold">
                {isHindi ? 'कुल टर्नओवर' : 'Total'}
              </span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight">{formatINR(teamBusiness)}</h3>
            <p className="text-[11px] text-blue-100/90 mt-1 font-medium">
              {isHindi ? 'डायरेक्ट + डाउनलाइन कुल जन सहयोग' : 'Total Direct + Downline Turnover'}
            </p>
            <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-xs text-blue-100">
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                <span>{isHindi ? 'टीम सदस्य:' : 'Members:'}</span>
              </span>
              <span className="font-mono font-black text-white">{teamCount}</span>
            </div>
          </div>

          {/* Card 3: Downline Business */}
          <div className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-amber-600 via-orange-600 to-amber-700 text-white shadow-xl shadow-amber-900/20 border border-white/20">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-extrabold uppercase tracking-wider text-amber-100 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-amber-200" />
                <span>{isHindi ? '3. डाउनलाइन बिज़नेस' : '3. Downline Business'}</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold">
                L2 - L12
              </span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight">{formatINR(downlineBusiness)}</h3>
            <p className="text-[11px] text-amber-100/90 mt-1 font-medium">
              {isHindi ? 'लेवल 2 से 12 तक का कुल व्यवसाय' : 'Volume from Level 2 to 12'}
            </p>
            <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-xs text-amber-100">
              <span className="flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>{isHindi ? 'कमीशन दर:' : 'Rate:'}</span>
              </span>
              <span className="font-mono font-bold text-white">10% - 1%</span>
            </div>
          </div>

          {/* Card 4: Self Business */}
          <div className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-purple-600 via-violet-600 to-purple-700 text-white shadow-xl shadow-purple-900/20 border border-white/20">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-extrabold uppercase tracking-wider text-purple-100 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-purple-200" />
                <span>{isHindi ? '4. सेल्फ बिज़नेस' : '4. Self Business'}</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold">
                {isHindi ? 'स्वयं ID' : 'Self ID'}
              </span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight">{formatINR(selfBusiness)}</h3>
            <p className="text-[11px] text-purple-100/90 mt-1 font-medium">
              {isHindi ? 'स्वयं की आईडी का सक्रिय संकल्प' : 'Personal ID Contribution'}
            </p>
            <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-xs text-purple-100">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isHindi ? 'स्थिति:' : 'Status:'}</span>
              </span>
              <span className="font-bold text-emerald-200">{isHindi ? 'सक्रिय' : 'Active'}</span>
            </div>
          </div>

        </div>

        {/* Withdrawal Form & Bank Details */}
        <div id="withdraw-section" className="grid grid-cols-1 lg:grid-cols-3 gap-8 scroll-mt-6">
          
          {/* WITHDRAWAL REQUEST CARD */}
          <div className="lg:col-span-2 glass-card-premium rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2 pb-3.5 border-b border-slate-200/60">
              <ArrowUpRight className="w-5 h-5 text-emerald-600" />
              <span>{isHindi ? 'बैंक खाते / UPI में मानदेय निकासी का अनुरोध' : 'Request Honorarium Withdrawal to Bank / UPI'}</span>
            </h3>

            {errorMsg && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-2.5 text-xs text-red-700 backdrop-blur-md">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{safeText(errorMsg)}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-800 backdrop-blur-md">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{safeText(successMsg)}</span>
              </div>
            )}

            <form onSubmit={handleWithdrawalSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                  {isHindi ? 'निकासी राशि (Withdrawal Amount in ₹) *' : 'Withdrawal Amount (₹) *'}
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    min="500"
                    step="1"
                    required
                    placeholder="उदा. 500, 1000, 2500..."
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="w-full pl-9 pr-4 py-3 rounded-2xl glass-input text-xs font-bold text-slate-900 outline-none"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5">
                  {isHindi 
                    ? `न्यूनतम निकासी सीमा ₹500 है। (उपलब्ध: ${formatINR(walletBalance)})` 
                    : `Minimum withdrawal is ₹500. (Available: ${formatINR(walletBalance)})`}
                </p>
              </div>

              {/* PAYOUT MODE SELECTOR (Cash / Offline Friendly by default) */}
              <div className="space-y-3 pt-2 border-t border-slate-200/80">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-emerald-600" />
                    <span>{isHindi ? 'भुगतान प्राप्ति माध्यम (Payout Mode) *' : 'Payout Mode *'}</span>
                  </label>
                  <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    {isHindi ? '✓ बिना बैंक खाते के नकद भुगतान उपलब्ध' : '✓ Offline Cash Payout Available'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  
                  {/* Mode 1: Cash / Offline Handover (Default) */}
                  <button
                    type="button"
                    onClick={() => setPayoutMode('cash')}
                    className={`p-3 rounded-2xl border-2 text-left transition cursor-pointer flex flex-col justify-between ${
                      payoutMode === 'cash'
                        ? 'bg-emerald-50/80 border-emerald-600 shadow-md ring-2 ring-emerald-500/20'
                        : 'bg-white hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900">💵 {isHindi ? 'नकद भुगतान' : 'Cash Payout'}</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-600 text-white">
                        {isHindi ? 'डिफ़ॉल्ट' : 'Default'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      {isHindi ? 'ट्रस्ट कार्यालय से सीधे नकद प्राप्त करें' : 'Collect cash from trust office'}
                    </p>
                  </button>

                  {/* Mode 2: UPI Transfer */}
                  <button
                    type="button"
                    onClick={() => setPayoutMode('upi')}
                    className={`p-3 rounded-2xl border-2 text-left transition cursor-pointer flex flex-col justify-between ${
                      payoutMode === 'upi'
                        ? 'bg-blue-50/80 border-blue-600 shadow-md ring-2 ring-blue-500/20'
                        : 'bg-white hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900">📱 {isHindi ? 'UPI ट्रांसफर' : 'UPI Transfer'}</span>
                      <span className="text-[10px] text-blue-700 font-bold">QR / VPA</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      {isHindi ? 'Google Pay, PhonePe, Paytm' : 'Direct UPI handle'}
                    </p>
                  </button>

                  {/* Mode 3: Bank Transfer */}
                  <button
                    type="button"
                    onClick={() => setPayoutMode('bank')}
                    className={`p-3 rounded-2xl border-2 text-left transition cursor-pointer flex flex-col justify-between ${
                      payoutMode === 'bank'
                        ? 'bg-purple-50/80 border-purple-600 shadow-md ring-2 ring-purple-500/20'
                        : 'bg-white hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900">🏦 {isHindi ? 'बैंक खाता' : 'Bank Account'}</span>
                      <span className="text-[10px] text-purple-700 font-bold">NEFT/IMPS</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      {isHindi ? 'खाता संख्या एवं IFSC कोड' : 'Account No + IFSC'}
                    </p>
                  </button>

                </div>

                {/* Conditional Fields based on mode */}
                {payoutMode === 'cash' && (
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 space-y-1">
                    <p className="text-xs font-black flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{isHindi ? 'नकद भुगतान (Cash Mode) सक्रिय है:' : 'Cash Mode Active:'}</span>
                    </p>
                    <p className="text-[11px] text-slate-700 leading-relaxed">
                      {isHindi 
                        ? 'आपको कोई बैंक खाता या UPI विवरण भरने की आवश्यकता नहीं है। व्यवस्थापक (Admin) द्वारा स्वीकृति उपरांत आप ट्रस्ट के काशीपुर कार्यालय या अपने क्षेत्र के अधिकृत पदाधिकारी से सीधे नकद मानदेय प्राप्त कर सकते हैं।'
                        : 'No bank account or IFSC needed. Once approved by admin, you can collect cash directly from the Trust office or authorized area coordinator.'
                      }
                    </p>
                  </div>
                )}

                {payoutMode === 'upi' && (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      UPI ID (Google Pay / PhonePe / Paytm) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="उदा. 98XXXXXXXX@upi या name@oksbi"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl glass-input text-xs font-mono font-bold outline-none"
                    />
                  </div>
                )}

                {payoutMode === 'bank' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          {isHindi ? 'बैंक का नाम' : 'Bank Name'} *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="उदा. State Bank of India"
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          {isHindi ? 'खाता संख्या' : 'Account Number'} *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="उदा. 3089XXXXXXXX"
                          value={accountNo}
                          onChange={(e) => setAccountNo(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-mono font-bold outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          {isHindi ? 'IFSC कोड' : 'IFSC Code'} *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="उदा. SBIN0001234"
                          value={ifsc}
                          onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                          className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-mono uppercase font-bold outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting || walletBalance < 500}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 active:scale-[0.99] text-white font-extrabold text-xs shadow-lg shadow-emerald-700/25 border border-white/20 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{isHindi ? 'अनुरोध दर्ज किया जा रहा है...' : 'Submitting Request...'}</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>{isHindi ? 'निकासी अनुरोध सबमिट करें' : 'Submit Withdrawal Request'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* WITHDRAWAL POLICY CARD */}
          <div className="glass-card-premium rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-200/60">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>{isHindi ? 'निकासी नियम एवं दिशानिर्देश' : 'Withdrawal Guidelines & Policy'}</span>
            </h3>

            <ul className="space-y-3.5 text-xs text-slate-600 leading-relaxed font-normal">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  {isHindi 
                    ? 'न्यूनतम निकासी सीमा ₹500 है। आप अपनी सुविधानुसार कभी भी निकासी का अनुरोध कर सकते हैं।' 
                    : 'Minimum withdrawal limit is ₹500. You may request withdrawal anytime once your balance reaches ₹500.'}
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  {isHindi 
                    ? 'अनुरोध सबमिट होने के उपरांत व्यवस्थापक (Admin) द्वारा बैंक ट्रांसफर या UPI के माध्यम से 24 से 48 घंटे में भुगतान किया जाता है।' 
                    : 'Withdrawals are processed by Admin via direct Bank Transfer or UPI within 24 to 48 business hours.'}
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  {isHindi 
                    ? 'कृपया अपना बैंक खाता अथवा UPI ID सही जांचकर भरें ताकि भुगतान बिना किसी रुकावट के प्राप्त हो सके।' 
                    : 'Please ensure your Bank Account / UPI ID details are accurate for seamless direct transfer.'}
                </span>
              </li>
            </ul>

            <div className="p-4 rounded-2xl glass-pill text-xs text-slate-600 mt-4">
              <p className="font-bold text-slate-800 mb-1">{isHindi ? 'सहायता एवं प्रश्न:' : 'Support & Assistance:'}</p>
              <p>{isHindi ? 'किसी भी समस्या हेतु फाउंडेशन के आधिकारिक नंबर या ईमेल पर संपर्क करें।' : 'Contact foundation helpline or official email for prompt assistance.'}</p>
            </div>
          </div>

        </div>

        {/* WITHDRAWALS HISTORY TABLE */}
        <div className="glass-card-premium rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2 pb-3.5 border-b border-slate-200/60">
            <History className="w-5 h-5 text-emerald-600" />
            <span>{isHindi ? 'आपके निकासी अनुरोधों की स्थिति (Withdrawal History)' : 'Your Withdrawal Requests History'}</span>
          </h3>

          {withdrawals.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              {isHindi ? 'अभी तक कोई निकासी अनुरोध दर्ज नहीं हुआ है।' : 'No withdrawal requests placed yet.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="glass-pill text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">{isHindi ? 'अनुरोध आईडी' : 'Request ID'}</th>
                    <th className="py-2.5 px-3">{isHindi ? 'तारीख' : 'Date'}</th>
                    <th className="py-2.5 px-3">{isHindi ? 'राशि' : 'Amount'}</th>
                    <th className="py-2.5 px-3">{isHindi ? 'भुगतान खाता / UPI' : 'Account / UPI'}</th>
                    <th className="py-2.5 px-3 text-center">{isHindi ? 'स्थिति' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {withdrawals.map((w) => (
                    <tr key={w.id} className="hover:bg-white/60 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-slate-500">
                        {safeText(w.id ? w.id.slice(-6) : '-')}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                        {w.createdAt ? new Date(w.createdAt).toLocaleDateString(isHindi ? 'hi-IN' : 'en-US') : '-'}
                      </td>
                      <td className="py-2.5 px-3 font-black text-slate-900">
                        {formatINR(w.amount || 0)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 font-mono">
                        {safeText(w.upiId || w.accountNo || '-')}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {w.status === 'approved' ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            {isHindi ? 'सफल (Paid)' : 'Paid'}
                          </span>
                        ) : w.status === 'rejected' ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-800 text-[10px] font-bold">
                            <AlertCircle className="w-3 h-3 text-red-600" />
                            {isHindi ? 'अस्वीकृत (Rejected)' : 'Rejected'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-800 text-[10px] font-bold">
                            <Clock className="w-3 h-3 text-amber-600" />
                            {isHindi ? 'सत्यापन लंबित (Pending)' : 'Pending'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
