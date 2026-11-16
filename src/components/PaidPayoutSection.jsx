import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Wallet, 
  CheckCircle2, 
  Clock, 
  IndianRupee, 
  Search, 
  Printer, 
  Download, 
  Filter, 
  ShieldCheck, 
  CreditCard, 
  Check, 
  X, 
  Loader2,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { rtdb } from '../lib/firebase';
import { ref, onValue, update, get, set, push } from 'firebase/database';
import { formatINR, safeText } from '../lib/constants';
import { 
  buildMember12LevelReport, 
  getMemberFullName, 
  normId, 
  parseAmount 
} from '../utils/mlmUtils';
import TableSlideScroller from './ui/TableSlideScroller';
import { VoucherPrintButton } from './CommissionVoucher';

export default function PaidPayoutSection({ isAdmin = false, targetMemberId = '' }) {
  const fileRef = useRef(null);
  const photoRef = useRef(null);
  const inputRef = useRef(null);

  const { currentUser, userProfile, isAdmin: authIsAdmin } = useAuth();
  const effectiveIsAdmin = isAdmin || authIsAdmin || userProfile?.is_admin || userProfile?.role === 'admin';

  const [allUsers, setAllUsers] = useState({});
  const [payoutLogs, setPayoutLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search
  const [filterMode, setFilterMode] = useState('ALL'); // 'ALL' | 'PAID' | 'UNPAID'
  const [searchQuery, setSearchQuery] = useState('');

  // Mark Paid Modal State
  const [payingMember, setPayingMember] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('UPI');
  const [payRefId, setPayRefId] = useState('');
  const [payRemarks, setPayRemarks] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // 1. Listen to users
  useEffect(() => {
    const usersRef = ref(rtdb, 'users');
    const unsub = onValue(usersRef, (snap) => {
      if (snap.exists()) {
        setAllUsers(snap.val());
      } else {
        setAllUsers({});
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // 2. Listen to payout_logs
  useEffect(() => {
    const logsRef = ref(rtdb, 'payout_logs');
    const unsub = onValue(logsRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        const list = Object.entries(val).map(([id, data]) => ({
          id,
          ...data
        })).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setPayoutLogs(list);
      } else {
        setPayoutLogs([]);
      }
    });
    return () => unsub();
  }, []);

  // Build member payout list
  const memberPayoutList = useMemo(() => {
    const list = Object.entries(allUsers).map(([uid, u]) => {
      const report = buildMember12LevelReport(u, allUsers);
      const totalComm = Number(report.totalCommission || 0);
      const paid = Number(u.commissionPaid || u.paidPayout || u.totalWithdrawn || 0);
      const unpaid = Math.max(0, totalComm - paid);
      const isPaid = (unpaid <= 0 && totalComm > 0) || u.commissionStatus === 'Paid';
      const status = isPaid ? 'Paid' : (paid > 0 ? 'Partial' : 'Unpaid');

      return {
        uid,
        ...u,
        fullName: getMemberFullName(u),
        totalCommission: totalComm,
        paidPayout: paid,
        unpaidPayout: unpaid,
        payoutStatus: status
      };
    });

    return list.sort((a, b) => b.totalCommission - a.totalCommission);
  }, [allUsers]);

  // Financial Summaries
  const totals = useMemo(() => {
    let gen = 0;
    let paid = 0;
    let unpaid = 0;
    let paidCount = 0;
    let unpaidCount = 0;

    memberPayoutList.forEach(m => {
      gen += m.totalCommission;
      paid += m.paidPayout;
      unpaid += m.unpaidPayout;
      if (m.unpaidPayout <= 0 && m.totalCommission > 0) paidCount++;
      else if (m.unpaidPayout > 0) unpaidCount++;
    });

    return { gen, paid, unpaid, paidCount, unpaidCount };
  }, [memberPayoutList]);

  // Logged-in member personal view
  const myMemberData = useMemo(() => {
    const myId = targetMemberId || userProfile?.memberId || currentUser?.uid;
    if (!myId) return null;
    return memberPayoutList.find(m => 
      m.uid === myId || normId(m.memberId) === normId(myId) || m.phone === myId
    ) || null;
  }, [memberPayoutList, targetMemberId, userProfile?.memberId, currentUser?.uid]);

  // Filtered members for table
  const filteredMembers = useMemo(() => {
    let list = memberPayoutList;

    if (!effectiveIsAdmin && myMemberData) {
      list = [myMemberData];
      return list;
    }

    if (filterMode === 'PAID') {
      list = list.filter(m => m.payoutStatus === 'Paid');
    } else if (filterMode === 'UNPAID') {
      list = list.filter(m => m.unpaidPayout > 0);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(m => 
        (m.name && m.name.toLowerCase().includes(q)) ||
        (m.memberId && m.memberId.toLowerCase().includes(q)) ||
        (m.phone && m.phone.includes(q))
      );
    }

    return list;
  }, [memberPayoutList, filterMode, searchQuery, effectiveIsAdmin, myMemberData]);

  // Handle Mark Paid Click
  const handleOpenMarkPaid = (m) => {
    setPayingMember(m);
    setPayAmount(String(m.unpaidPayout || ''));
    setPayMode('UPI');
    setPayRefId(`UTR-${Date.now().toString().slice(-8)}`);
    setPayRemarks('');
  };

  const handleConfirmMarkPaid = async (e) => {
    e.preventDefault();
    if (!payingMember) return;

    const amt = parseAmount(payAmount);
    if (amt <= 0) {
      setSuccessMsg('⚠️ कृपया वैध भुगतान राशि दर्ज करें।');
      setTimeout(() => setSuccessMsg(''), 4000);
      return;
    }

    setSubmittingPayment(true);
    try {
      const nowTs = Date.now();
      const logId = `PAYLOG-${nowTs}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const logPayload = {
        id: logId,
        memberUid: payingMember.uid,
        memberId: payingMember.memberId || 'N/A',
        memberName: payingMember.fullName || 'Member',
        phone: payingMember.phone || '',
        amount: amt,
        paymentMode: payMode || 'UPI',
        referenceId: payRefId.trim() || 'N/A',
        remarks: payRemarks.trim(),
        paidBy: userProfile?.name || currentUser?.displayName || 'Admin',
        date: getISTDateString(),
        timestamp: nowTs,
        createdAt: new Date().toISOString()
      };

      const newPaid = (payingMember.paidPayout || 0) + amt;
      const newUnpaid = Math.max(0, (payingMember.totalCommission || 0) - newPaid);
      const newStatus = newUnpaid <= 0 ? 'Paid' : 'Partial';

      const updates = {};
      updates[`/payout_logs/${logId}`] = logPayload;
      updates[`/users/${payingMember.uid}/commissionPaid`] = newPaid;
      updates[`/users/${payingMember.uid}/paidPayout`] = newPaid;
      updates[`/users/${payingMember.uid}/commissionUnpaid`] = newUnpaid;
      updates[`/users/${payingMember.uid}/unpaidPayout`] = newUnpaid;
      updates[`/users/${payingMember.uid}/commissionStatus`] = newStatus;
      updates[`/users/${payingMember.uid}/walletBalance`] = newUnpaid;
      updates[`/users/${payingMember.uid}/lastPaidAt`] = new Date().toISOString();

      await update(ref(rtdb), updates);

      setSuccessMsg(`सदस्य ${payingMember.memberId} को ₹${amt} का मानदेय सफलतापूर्वक 'Paid' दर्ज कर लिया गया!`);
      setPayingMember(null);
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      console.error('Error marking payout as paid:', err);
      setSuccessMsg('⚠️ भुगतान रिकॉर्ड करने में त्रुटि: ' + err.message);
      setTimeout(() => setSuccessMsg(''), 5000);
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const selectedMemberForVoucher = (myMemberData && allUsers[myMemberData.uid]) || Object.values(allUsers).find(u => u && (u.memberId === 'UCWF-0001' || u.memberId === 'UCWF-2026-6401' || u.memberId === 'UCWF-2026-8647' || u.memberId === 'UCWF-2026-0835')) || Object.values(allUsers)[0] || null;

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-teal-200 shadow-sm max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-teal-100">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-600/30">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <span>Paid Payout / मानदेय भुगतान एवं बकाया लेजर</span>
              <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-900 text-xs font-bold font-mono">
                Paid vs Unpaid Ledger
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              सदस्यों का कुल मानदेय (Total Payout), भुगतान प्राप्त मानदेय (Paid Payout) एवं बकाया मानदेय (Unpaid Payout)।
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <VoucherPrintButton
            member={selectedMemberForVoucher}
            allUsers={allUsers}
            size="normal"
          />
          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-300 flex items-center gap-1.5 transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>प्रिंट लेजर</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 3 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Total Payout Generated */}
        <div className="p-5 rounded-2xl bg-purple-50 border-2 border-purple-200 text-slate-900 shadow-xs">
          <span className="text-xs font-bold text-purple-800 uppercase tracking-wider block">
            1. Total Commission Generated
          </span>
          <p className="text-3xl font-black font-mono text-purple-950 mt-1.5">
            {formatINR(totals.gen)}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            12-लेवल में कुल बना हुआ मानदेय
          </p>
        </div>

        {/* Card 2: Total Paid Payout */}
        <div className="p-5 rounded-2xl bg-emerald-50 border-2 border-emerald-400 text-slate-900 shadow-xs">
          <span className="text-xs font-black text-emerald-900 uppercase tracking-wider block flex items-center justify-between">
            <span>2. Paid Commission (भुगतान)</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-950 text-[10px] font-bold">PAID</span>
          </span>
          <p className="text-3xl font-black font-mono text-emerald-900 mt-1.5">
            {formatINR(totals.paid)}
          </p>
          <p className="text-[11px] text-emerald-700 mt-0.5 font-medium">
            कुल पूर्ण भुगतान सदस्य: <strong className="font-mono text-emerald-950 font-bold">{totals.paidCount}</strong>
          </p>
        </div>

        {/* Card 3: Total Balance / Unpaid Payout */}
        <div className="p-5 rounded-2xl bg-rose-50 border-2 border-rose-300 text-slate-900 shadow-xs">
          <span className="text-xs font-black text-rose-900 uppercase tracking-wider block flex items-center justify-between">
            <span>3. Balance / Unpaid (बकाया)</span>
            <span className="px-2 py-0.5 rounded-full bg-rose-200 text-rose-950 text-[10px] font-bold">PENDING</span>
          </span>
          <p className="text-3xl font-black font-mono text-rose-700 mt-1.5">
            {formatINR(totals.unpaid)}
          </p>
          <p className="text-[11px] text-rose-800 mt-0.5 font-medium">
            बकाया मानदेय सदस्य: <strong className="font-mono text-rose-950 font-bold">{totals.unpaidCount}</strong>
          </p>
        </div>
      </div>

      {/* If Member View: Member Personal Payout Strip */}
      {!effectiveIsAdmin && myMemberData && (
        <div className="p-6 rounded-3xl bg-gradient-to-r from-teal-900 via-emerald-900 to-slate-900 text-white space-y-4 shadow-xl border border-teal-400/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-teal-300 font-bold text-xs uppercase tracking-wider">आपका व्यक्तिगत मानदेय हिसाब</span>
              <h3 className="text-2xl font-black text-white mt-1 font-serif">{myMemberData.fullName} ({myMemberData.memberId})</h3>
              <p className="text-xs text-slate-300 mt-0.5">मो: {myMemberData.phone}</p>
            </div>

            <div className="flex items-center gap-3">
              <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase ${
                myMemberData.unpaidPayout <= 0 && myMemberData.totalCommission > 0
                  ? 'bg-emerald-400 text-emerald-950'
                  : myMemberData.paidPayout > 0
                  ? 'bg-amber-400 text-amber-950'
                  : 'bg-rose-400 text-rose-950'
              }`}>
                {myMemberData.unpaidPayout <= 0 && myMemberData.totalCommission > 0 ? '✅ पूर्ण भुगतान (Paid)' : myMemberData.paidPayout > 0 ? '⏳ आंशिक (Partial)' : '⏳ बकाया (Unpaid)'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2 border-t border-white/20 text-center font-mono">
            <div className="p-3 bg-white/10 rounded-2xl">
              <span className="text-[11px] text-slate-300 font-sans block">Total Payout</span>
              <span className="text-xl font-black text-white">{formatINR(myMemberData.totalCommission)}</span>
            </div>
            <div className="p-3 bg-white/10 rounded-2xl">
              <span className="text-[11px] text-emerald-300 font-sans block">Paid Payout</span>
              <span className="text-xl font-black text-emerald-300">{formatINR(myMemberData.paidPayout)}</span>
            </div>
            <div className="p-3 bg-white/10 rounded-2xl">
              <span className="text-[11px] text-rose-300 font-sans block">Balance Unpaid</span>
              <span className="text-xl font-black text-rose-300">{formatINR(myMemberData.unpaidPayout)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      {effectiveIsAdmin && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
          <div className="inline-flex rounded-xl bg-white p-0.5 border border-slate-200 shadow-2xs">
            <button
              type="button"
              onClick={() => setFilterMode('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                filterMode === 'ALL' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({memberPayoutList.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('PAID')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                filterMode === 'PAID' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-800 hover:text-emerald-950'
              }`}
            >
              ✅ Paid ({totals.paidCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('UNPAID')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                filterMode === 'UNPAID' ? 'bg-rose-600 text-white shadow-xs' : 'text-rose-700 hover:text-rose-950'
              }`}
            >
              ⏳ Unpaid / Pending ({totals.unpaidCount})
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="खोजें (नाम, आईडी, मोबाइल)..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 font-bold"
            />
          </div>
        </div>
      )}

      {/* Payout Table */}
      <TableSlideScroller title="Members Commission Payout Ledger">
        <table className="w-full text-xs text-left border-collapse table-auto">
          <thead className="bg-teal-50 text-slate-800 font-bold border-b border-teal-200">
            <tr>
              <th className="py-2.5 px-3 text-center border-r border-teal-100">S.No.</th>
              <th className="py-2.5 px-3 border-r border-teal-100 whitespace-nowrap">Member Name</th>
              <th className="py-2.5 px-3 border-r border-teal-100 whitespace-nowrap">User ID No.</th>
              <th className="py-2.5 px-3 border-r border-teal-100 whitespace-nowrap">Mobile No.</th>
              <th className="py-2.5 px-3 border-r border-teal-100 whitespace-nowrap text-right">Total Payout (₹)</th>
              <th className="py-2.5 px-3 border-r border-teal-100 whitespace-nowrap text-right text-emerald-800">Paid Payout (₹)</th>
              <th className="py-2.5 px-3 border-r border-teal-100 whitespace-nowrap text-right text-rose-700">Balance / Unpaid (₹)</th>
              <th className="py-2.5 px-3 text-center border-r border-teal-100 whitespace-nowrap">Status</th>
              {effectiveIsAdmin && <th className="py-2.5 px-3 text-center whitespace-nowrap">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filteredMembers.length === 0 ? (
              <tr>
                <td colSpan={effectiveIsAdmin ? 9 : 8} className="py-12 text-center text-xs text-slate-400 font-medium">
                  {searchQuery.trim() ? 'खोज के अनुरूप कोई सदस्य नहीं मिला।' : 'कोई सदस्य डेटा उपलब्ध नहीं है।'}
                </td>
              </tr>
            ) : (
              filteredMembers.map((m, idx) => {
                const isPaid = m.unpaidPayout <= 0 && m.totalCommission > 0;
                return (
                  <tr key={m.uid || idx} className="hover:bg-teal-50/30 transition-colors">
                    <td className="py-2 px-3 text-center font-mono text-slate-500 font-medium border-r border-teal-50">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-3 border-r border-teal-50 font-bold text-slate-900 whitespace-nowrap">
                      {m.fullName}
                    </td>
                    <td className="py-2 px-3 border-r border-teal-50 font-mono font-bold text-teal-900 whitespace-nowrap">
                      <span className="bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                        {m.memberId}
                      </span>
                    </td>
                    <td className="py-2 px-3 border-r border-teal-50 font-mono text-slate-700 whitespace-nowrap">
                      <a href={`tel:${m.phone}`} className="hover:underline hover:text-teal-700">{m.phone}</a>
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 border-r border-teal-50 whitespace-nowrap">
                      {formatINR(m.totalCommission)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-800 border-r border-teal-50 whitespace-nowrap">
                      {formatINR(m.paidPayout)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-black text-rose-700 border-r border-teal-50 whitespace-nowrap bg-rose-50/20">
                      {formatINR(m.unpaidPayout)}
                    </td>
                    <td className="py-2 px-3 text-center border-r border-teal-50 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        isPaid
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : m.paidPayout > 0
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-rose-100 text-rose-900 border border-rose-300'
                      }`}>
                        {isPaid ? 'Paid' : (m.paidPayout > 0 ? 'Partial' : 'Unpaid')}
                      </span>
                    </td>
                    {effectiveIsAdmin && (
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {m.unpaidPayout > 0 ? (
                            <button
                              type="button"
                              onClick={() => handleOpenMarkPaid(m)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-xs flex items-center gap-1 transition active:scale-95 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Mark Paid</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-emerald-700 font-bold">✓ Settled</span>
                          )}
                          <VoucherPrintButton member={m} allUsers={allUsers} size="small" label="Voucher" />
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </TableSlideScroller>

      {/* Recent Payout Logs Table */}
      {payoutLogs.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-slate-200">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-600" />
            <span>हाल ही में किए गए भुगतान (Recent Payment Logs - {payoutLogs.length})</span>
          </h3>

          <div className="overflow-x-auto bg-slate-50 rounded-2xl border border-slate-200 p-2">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-200/60 text-slate-700 font-bold border-b border-slate-300">
                <tr>
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Member ID & Name</th>
                  <th className="py-2 px-3">Payment Mode</th>
                  <th className="py-2 px-3">Ref ID / UTR</th>
                  <th className="py-2 px-3 text-right">Amount Paid (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {payoutLogs.slice(0, 10).map((log, i) => (
                  <tr key={log.id || i} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-mono text-slate-700">{log.date || '—'}</td>
                    <td className="py-2 px-3 font-bold text-slate-900">
                      {log.memberName} <span className="font-mono text-teal-800">({log.memberId})</span>
                    </td>
                    <td className="py-2 px-3 text-slate-600 font-mono">{log.paymentMode || 'UPI'}</td>
                    <td className="py-2 px-3 font-mono text-slate-800">{log.referenceId || 'N/A'}</td>
                    <td className="py-2 px-3 text-right font-mono font-black text-emerald-700">
                      {formatINR(log.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MARK PAID MODAL */}
      {payingMember && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-teal-200 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>मानदेय भुगतान दर्ज करें (Mark as Paid)</span>
              </h3>
              <button
                type="button"
                onClick={() => setPayingMember(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-teal-50 rounded-2xl border border-teal-200 space-y-1 text-xs">
              <p className="font-bold text-teal-950">
                सदस्य: <strong>{payingMember.fullName} ({payingMember.memberId})</strong>
              </p>
              <p className="text-slate-600">मोबाइल: {payingMember.phone}</p>
              <p className="text-rose-700 font-bold">
                कुल बकाया मानदेय: <span className="font-mono text-sm">{formatINR(payingMember.unpaidPayout)}</span>
              </p>
            </div>

            <form onSubmit={handleConfirmMarkPaid} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  भुगतान की जाने वाली राशि (₹) *
                </label>
                <input
                  type="number"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 font-mono font-bold text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  भुगतान माध्यम (Payment Mode) *
                </label>
                <select
                  value={payMode}
                  onChange={(e) => setPayMode(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
                  <option value="NEFT/RTGS">NEFT / RTGS (Bank Transfer)</option>
                  <option value="Cash">Cash (नकद भुगतान)</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  ट्रांजेक्शन संदर्भ आईडी / UTR No. *
                </label>
                <input
                  type="text"
                  value={payRefId}
                  onChange={(e) => setPayRefId(e.target.value)}
                  placeholder="UTR / Bank Ref Number"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  रिमार्क / विवरण (Optional Remarks)
                </label>
                <input
                  type="text"
                  value={payRemarks}
                  onChange={(e) => setPayRemarks(e.target.value)}
                  placeholder="उदा. नवम्बर माह मानदेय भुगतान"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setPayingMember(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {submittingPayment ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>दर्ज हो रहा है...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>भुगतान पुष्ट करें (Confirm Paid)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Bottom Print Voucher Button */}
      <div className="flex justify-center pt-2 print:hidden">
        <VoucherPrintButton
          member={selectedMemberForVoucher}
          allUsers={allUsers}
          size="large"
          label="🖨️ वाउचर प्रिंट करें / Print Commission Voucher"
        />
      </div>
    </div>
  );
}
