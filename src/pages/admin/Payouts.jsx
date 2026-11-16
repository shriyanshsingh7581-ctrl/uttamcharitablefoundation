import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Banknote,
  Clock,
  CheckCircle,
  XCircle,
  CreditCard,
  Building,
  Smartphone,
  Copy,
  Check,
  RefreshCw,
  Search,
  Filter,
  ArrowUpRight,
  Send,
  Calendar,
  AlertCircle,
  FileText,
  DollarSign,
  TrendingUp,
  QrCode,
} from 'lucide-react';
import SafeQRCode from '../../components/ui/SafeQRCode';
import AdminLayout from './AdminLayout';
import { supabase } from '../../lib/supabase';
import { db, ref, update, get } from '../../lib/firebase';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

export default function Payouts() {
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'approved' | 'paid' | 'rejected'
  const [withdrawals, setWithdrawals] = useState([]);
  const [membersMap, setMembersMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Summary Metrics
  const [metrics, setMetrics] = useState({
    pendingAmount: 0,
    approvedAmount: 0,
    paidAmount: 0,
    pendingCount: 0,
    totalCount: 0,
  });

  // Action Modals State
  const [markPaidModal, setMarkPaidModal] = useState({
    isOpen: false,
    withdrawal: null,
    reference_id: '',
    payment_mode: 'IMPS/NEFT',
    admin_note: '',
    processing: false,
  });

  const [rejectModal, setRejectModal] = useState({
    isOpen: false,
    withdrawal: null,
    reason: '',
    processing: false,
  });

  const [approveConfirmModal, setApproveConfirmModal] = useState({
    isOpen: false,
    withdrawal: null,
    processing: false,
  });

  const [copiedText, setCopiedText] = useState(null);
  const [feedbackToast, setFeedbackToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setFeedbackToast({ message, type });
    setTimeout(() => setFeedbackToast(null), 4000);
  };

  // Fetch summary metrics across all withdrawal rows
  const fetchSummaryMetrics = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('withdrawals')
        .select('amount, status');

      let rows = data || [];

      if (error || rows.length === 0) {
        // Fallback to Firebase RTDB
        try {
          const snap = await get(ref(db, 'payouts'));
          if (snap.exists()) {
            rows = Object.values(snap.val());
          }
        } catch (e) {
          console.warn('Firebase RTDB payouts metrics note:', e);
        }
      }

      let pendingAmount = 0;
      let approvedAmount = 0;
      let paidAmount = 0;
      let pendingCount = 0;

      rows.forEach((r) => {
        const amt = Number(r.amount) || 0;
        if (r.status === 'pending') {
          pendingAmount += amt;
          pendingCount += 1;
        } else if (r.status === 'approved') {
          approvedAmount += amt;
        } else if (r.status === 'paid') {
          paidAmount += amt;
        }
      });

      setMetrics({
        pendingAmount,
        approvedAmount,
        paidAmount,
        pendingCount,
        totalCount: rows.length,
      });
    } catch (err) {
      console.error('Metrics calculate failed:', err);
    }
  }, []);

  // Fetch withdrawals for active tab
  const fetchWithdrawals = useCallback(async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('status', activeTab)
        .order('created_at', { ascending: false });

      let list = data || [];

      if (error || list.length === 0) {
        // Fallback to Firebase RTDB
        try {
          const snap = await get(ref(db, 'payouts'));
          if (snap.exists()) {
            const allPayouts = Object.keys(snap.val()).map((k) => ({
              id: k,
              ...snap.val()[k],
            }));
            list = allPayouts.filter((p) => p.status === activeTab);
          }
        } catch (e) {
          console.warn('Firebase RTDB payouts list note:', e);
        }
      }

      setWithdrawals(list);

      // Fetch associated members
      const memberIds = [...new Set(list.map((w) => w.member_id).filter(Boolean))];
      if (memberIds.length > 0) {
        const { data: memberData } = await supabase
          .from('members')
          .select('id, full_name, member_id, phone, email')
          .in('id', memberIds);

        if (memberData) {
          const map = {};
          memberData.forEach((m) => {
            map[m.id] = m;
          });
          setMembersMap(map);
        }
      }
    } catch (err) {
      console.error('Failed to load withdrawals:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchWithdrawals();
    fetchSummaryMetrics();
  }, [fetchWithdrawals, fetchSummaryMetrics]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchWithdrawals();
    fetchSummaryMetrics();
  };

  const copyToClipboard = (text, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    showToast(`Copied ${label || 'text'} to clipboard`, 'info');
    setTimeout(() => setCopiedText(null), 2500);
  };

  // 1. Approve Withdrawal Request
  const handleApprove = async () => {
    const w = approveConfirmModal.withdrawal;
    if (!w) return;

    setApproveConfirmModal((prev) => ({ ...prev, processing: true }));

    try {
      const { error } = await supabase
        .from('withdrawals')
        .update({
          status: 'approved',
          updated_at: new Date().toISOString(),
        })
        .eq('id', w.id);

      if (error) throw error;

      showToast(`Withdrawal of ₹${w.amount} approved and queued for payment.`, 'success');
      setApproveConfirmModal({ isOpen: false, withdrawal: null, processing: false });
      fetchWithdrawals();
      fetchSummaryMetrics();
    } catch (err) {
      console.error('Approve withdrawal error:', err);
      showToast(err.message || 'Failed to approve withdrawal', 'error');
      setApproveConfirmModal((prev) => ({ ...prev, processing: false }));
    }
  };

  // 2. Reject Withdrawal Request
  const handleReject = async () => {
    const w = rejectModal.withdrawal;
    if (!w) return;

    setRejectModal((prev) => ({ ...prev, processing: true }));

    try {
      const reason = rejectModal.reason.trim() || 'Bank account details invalid / verification failed';

      const { error } = await supabase
        .from('withdrawals')
        .update({
          status: 'rejected',
          admin_note: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', w.id);

      if (error) throw error;

      showToast(`Withdrawal request marked as rejected.`, 'info');
      setRejectModal({ isOpen: false, withdrawal: null, reason: '', processing: false });
      fetchWithdrawals();
      fetchSummaryMetrics();
    } catch (err) {
      console.error('Reject withdrawal error:', err);
      showToast(err.message || 'Failed to reject withdrawal', 'error');
      setRejectModal((prev) => ({ ...prev, processing: false }));
    }
  };

  // 3. Mark as Paid & Disburse from Member Wallet
  const handleMarkPaid = async () => {
    const w = markPaidModal.withdrawal;
    if (!w) return;

    if (!markPaidModal.reference_id.trim()) {
      showToast('Please enter bank payment reference ID or UTR', 'error');
      return;
    }

    setMarkPaidModal((prev) => ({ ...prev, processing: true }));

    try {
      const nowIso = new Date().toISOString();
      const refId = markPaidModal.reference_id.trim();
      const note = markPaidModal.admin_note.trim() || `Disbursed via ${markPaidModal.payment_mode}`;

      // A. Update withdrawal record
      const { error: wErr } = await supabase
        .from('withdrawals')
        .update({
          status: 'paid',
          reference_id: refId,
          processed_at: nowIso,
          admin_note: note,
          updated_at: nowIso,
        })
        .eq('id', w.id);

      if (wErr) throw wErr;

      // B. Fetch member's current wallet and deduct balance
      const { data: memberWallet } = await supabase
        .from('wallets')
        .select('*')
        .eq('member_id', w.member_id)
        .maybeSingle();

      if (memberWallet) {
        const currentBalance = Number(memberWallet.balance) || 0;
        const currentWithdrawn = Number(memberWallet.total_withdrawn) || 0;
        const withdrawAmt = Number(w.amount) || 0;

        const newBalance = Math.max(Math.round((currentBalance - withdrawAmt) * 100) / 100, 0);
        const newWithdrawn = Math.round((currentWithdrawn + withdrawAmt) * 100) / 100;

        const { error: walletErr } = await supabase
          .from('wallets')
          .update({
            balance: newBalance,
            total_withdrawn: newWithdrawn,
            updated_at: nowIso,
          })
          .eq('id', memberWallet.id);

        if (walletErr) {
          console.warn('Wallet balance deduction warning:', walletErr.message);
        }

        // C. Record transaction debit entry
        const { error: txErr } = await supabase.from('transactions').insert([
          {
            member_id: w.member_id,
            wallet_id: memberWallet.id,
            type: 'withdrawal',
            amount: withdrawAmt,
            description: `Payout processed via ${markPaidModal.payment_mode} (Ref: ${refId})`,
            status: 'completed',
            created_at: nowIso,
          },
        ]);

        if (txErr) {
          console.warn('Transaction record warning:', txErr.message);
        }
      }

      // Sync Payout and Wallet to Firebase Realtime Database
      try {
        await update(ref(db, `payouts/${w.id}`), {
          status: 'paid',
          reference_id: refId,
          processed_at: nowIso,
          admin_note: note,
          updated_at: nowIso,
        });
        if (w.member_id) {
          const withdrawAmt = Number(w.amount) || 0;
          await update(ref(db, `wallets/${w.member_id}`), {
            updated_at: nowIso,
          });
        }
      } catch (fbErr) {
        console.warn('Firebase RTDB payout update note:', fbErr);
      }

      showToast(`Payout of ₹${w.amount} recorded as paid successfully (UTR: ${refId})!`, 'success');
      setMarkPaidModal({
        isOpen: false,
        withdrawal: null,
        reference_id: '',
        payment_mode: 'IMPS/NEFT',
        admin_note: '',
        processing: false,
      });

      fetchWithdrawals();
      fetchSummaryMetrics();
    } catch (err) {
      console.error('Mark paid error:', err);
      showToast(err.message || 'Error processing payout', 'error');
      setMarkPaidModal((prev) => ({ ...prev, processing: false }));
    }
  };

  // Filtered withdrawals
  const filteredWithdrawals = withdrawals.filter((w) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const mem = membersMap[w.member_id];
    const bank = w.bank_details || {};
    return (
      (mem?.full_name && mem.full_name.toLowerCase().includes(q)) ||
      (mem?.member_id && mem.member_id.toLowerCase().includes(q)) ||
      (w.reference_id && w.reference_id.toLowerCase().includes(q)) ||
      (bank.upi_id && bank.upi_id.toLowerCase().includes(q)) ||
      (bank.account_number && bank.account_number.toLowerCase().includes(q))
    );
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* TOAST FEEDBACK */}
        <AnimatePresence>
          {feedbackToast && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`fixed top-4 right-4 z-[9999] p-4 rounded-2xl shadow-xl flex items-center gap-3 text-sm font-semibold max-w-md ${
                feedbackToast.type === 'error'
                  ? 'bg-rose-600 text-white'
                  : 'bg-emerald-600 text-white'
              }`}
            >
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span>{feedbackToast.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900">
                <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                भुगतान व निकासी प्रबंधन
              </span>
              <span className="text-xs text-gray-400">Payouts & Disbursements</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mt-1 flex items-center gap-3">
              Payout Management
              {metrics.pendingCount > 0 && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500 text-white">
                  {metrics.pendingCount} Pending
                </span>
              )}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Review member wallet withdrawal requests, verify bank IFSC & UPI IDs, and disburse Seva incentives.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              loading={refreshing}
              onClick={handleRefresh}
              className="bg-white"
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* 3 SUMMARY METRICS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <GlassCard className="p-5 bg-white border border-gray-100 shadow-sm relative overflow-hidden group hover:border-amber-300">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                Pending Requests (प्रतीक्षारत)
              </span>
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <h3 className="text-3xl font-extrabold text-amber-900">
              ₹{metrics.pendingAmount.toLocaleString('en-IN')}
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              {metrics.pendingCount} requests waiting for approval
            </p>
          </GlassCard>

          <GlassCard className="p-5 bg-white border border-gray-100 shadow-sm relative overflow-hidden group hover:border-blue-300">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                Approved (Ready to Pay)
              </span>
              <CheckCircle className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-3xl font-extrabold text-blue-900">
              ₹{metrics.approvedAmount.toLocaleString('en-IN')}
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Authorized for bank transfer
            </p>
          </GlassCard>

          <GlassCard className="p-5 bg-white border border-gray-100 shadow-sm relative overflow-hidden group hover:border-emerald-300">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                Total Disbursed (कुल भुगतान)
              </span>
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <h3 className="text-3xl font-extrabold text-emerald-900">
              ₹{metrics.paidAmount.toLocaleString('en-IN')}
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Lifetime successfully transferred
            </p>
          </GlassCard>
        </div>

        {/* TABS & SEARCH BAR */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
          {/* Tabs */}
          <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-xl overflow-x-auto">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'pending'
                  ? 'bg-white text-emerald-800 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Pending
              {metrics.pendingCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('approved')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'approved'
                  ? 'bg-white text-emerald-800 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Approved (Ready to Pay)
            </button>

            <button
              onClick={() => setActiveTab('paid')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'paid'
                  ? 'bg-white text-emerald-800 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Paid History
            </button>

            <button
              onClick={() => setActiveTab('rejected')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'rejected'
                  ? 'bg-white text-emerald-800 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Rejected
            </button>
          </div>

          {/* Search box */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search member, UPI ID, or UTR..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-stone-50"
            />
          </div>
        </div>

        {/* WITHDRAWALS LIST */}
        {loading ? (
          <div className="py-20 flex justify-center">
            <LoadingSpinner size="lg" text="Loading withdrawal records..." />
          </div>
        ) : filteredWithdrawals.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <Banknote className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <h3 className="text-base font-bold text-gray-800">
              अभी कोई निकासी अनुरोध उपलब्ध नहीं है (No {activeTab} requests)
            </h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
              सदस्यों द्वारा किए गए निकासी अनुरोध यहाँ स्वतः प्रदर्शित होंगे।
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredWithdrawals.map((w) => {
              const mem = membersMap[w.member_id];
              const bank = w.bank_details || {};

              return (
                <div
                  key={w.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-emerald-200 transition-all"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    {/* Left: Member & Amount */}
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 font-extrabold text-lg flex items-center justify-center shrink-0">
                        ₹
                      </div>

                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-bold text-gray-900 leading-tight">
                            {mem?.full_name || 'Member (ID: ' + w.member_id + ')'}
                          </h3>
                          {mem?.member_id && (
                            <span className="font-mono text-xs text-gray-500 bg-stone-100 px-2 py-0.5 rounded">
                              {mem.member_id}
                            </span>
                          )}
                          <span className="text-lg font-extrabold text-emerald-700 ml-1">
                            ₹{Number(w.amount).toLocaleString('en-IN')}
                          </span>
                        </div>

                        {/* Request dates */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            Requested: {new Date(w.created_at).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {mem?.phone && <span>Phone: {mem.phone}</span>}
                        </div>

                        {/* Admin Note if present */}
                        {w.admin_note && (
                          <p className="text-xs text-gray-500 bg-stone-50 p-2 rounded-lg border border-gray-100 mt-2 max-w-lg">
                            <strong>Note:</strong> {w.admin_note}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Middle: Bank & UPI details */}
                    <div className="bg-stone-50 p-3.5 rounded-xl border border-gray-200/80 text-xs min-w-[280px] space-y-2">
                      <div className="flex items-center justify-between border-b border-gray-200/60 pb-1.5">
                        <span className="font-bold text-gray-700 flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                          Payout Destination Details
                        </span>
                        {bank.account_name && (
                          <span className="text-gray-500 truncate max-w-[120px]">
                            {bank.account_name}
                          </span>
                        )}
                      </div>

                      {/* Bank Details */}
                      {bank.account_number && (
                        <div className="flex items-center justify-between text-gray-700">
                          <span>
                            A/C: <span className="font-mono font-bold select-all">{bank.account_number}</span>
                          </span>
                          <button
                            onClick={() => copyToClipboard(bank.account_number, 'Account Number')}
                            className="text-gray-400 hover:text-emerald-700"
                            title="Copy Account Number"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      {bank.ifsc && (
                        <div className="flex items-center justify-between text-gray-700">
                          <span>
                            IFSC: <span className="font-mono font-bold uppercase select-all">{bank.ifsc}</span>
                          </span>
                          <button
                            onClick={() => copyToClipboard(bank.ifsc, 'IFSC Code')}
                            className="text-gray-400 hover:text-emerald-700"
                            title="Copy IFSC"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      {/* UPI ID */}
                      {bank.upi_id && (
                        <div className="flex items-center justify-between text-emerald-800 font-semibold pt-1 border-t border-gray-200/40">
                          <span className="flex items-center gap-1">
                            <Smartphone className="w-3 h-3 text-emerald-600" />
                            UPI: <span className="font-mono select-all">{bank.upi_id}</span>
                          </span>
                          <button
                            onClick={() => copyToClipboard(bank.upi_id, 'UPI ID')}
                            className="text-gray-400 hover:text-emerald-700"
                            title="Copy UPI"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      {/* Reference ID if paid */}
                      {w.reference_id && (
                        <div className="pt-1 border-t border-gray-200/60 flex items-center justify-between text-[11px] text-gray-500">
                          <span>UTR/Ref:</span>
                          <span className="font-mono font-bold text-gray-900 select-all">
                            {w.reference_id}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Right: Actions based on Status */}
                    <div className="flex items-center justify-end gap-2 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-gray-100">
                      {w.status === 'pending' && (
                        <>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() =>
                              setRejectModal({
                                isOpen: true,
                                withdrawal: w,
                                reason: '',
                                processing: false,
                              })
                            }
                          >
                            Reject
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() =>
                              setApproveConfirmModal({
                                isOpen: true,
                                withdrawal: w,
                                processing: false,
                              })
                            }
                          >
                            Approve
                          </Button>
                        </>
                      )}

                      {w.status === 'approved' && (
                        <>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() =>
                              setRejectModal({
                                isOpen: true,
                                withdrawal: w,
                                reason: '',
                                processing: false,
                              })
                            }
                          >
                            Reject
                          </Button>
                          <Button
                            variant="gold"
                            size="sm"
                            icon={Send}
                            onClick={() =>
                              setMarkPaidModal({
                                isOpen: true,
                                withdrawal: w,
                                reference_id: '',
                                payment_mode: 'IMPS/NEFT',
                                admin_note: '',
                                processing: false,
                              })
                            }
                          >
                            Mark as Paid
                          </Button>
                        </>
                      )}

                      {w.status === 'paid' && (
                        <div className="text-right">
                          <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800">
                            <CheckCircle className="w-3.5 h-3.5" /> Disbursed
                          </span>
                          {w.processed_at && (
                            <p className="text-[11px] text-gray-400 mt-1">
                              Paid: {new Date(w.processed_at).toLocaleDateString('en-IN')}
                            </p>
                          )}
                        </div>
                      )}

                      {w.status === 'rejected' && (
                        <div className="text-right">
                          <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-rose-100 text-rose-800">
                            <XCircle className="w-3.5 h-3.5" /> Rejected
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* APPROVE CONFIRMATION MODAL */}
        <Modal
          isOpen={approveConfirmModal.isOpen}
          onClose={() =>
            !approveConfirmModal.processing &&
            setApproveConfirmModal({ isOpen: false, withdrawal: null, processing: false })
          }
          title="Approve Withdrawal / निकासी स्वीकृत करें"
          subtitle="Authorize this cashout request. It will move to the 'Ready to Pay' queue."
          size="sm"
          footer={
            <div className="flex items-center justify-end gap-2.5 w-full">
              <Button
                variant="outline"
                size="sm"
                disabled={approveConfirmModal.processing}
                onClick={() =>
                  setApproveConfirmModal({ isOpen: false, withdrawal: null, processing: false })
                }
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={approveConfirmModal.processing}
                onClick={handleApprove}
                icon={CheckCircle}
              >
                Approve Request
              </Button>
            </div>
          }
        >
          {approveConfirmModal.withdrawal && (
            <div className="space-y-3 text-xs">
              <p className="text-gray-700">
                You are approving a payout of{' '}
                <strong className="text-emerald-700 text-sm">
                  ₹{approveConfirmModal.withdrawal.amount}
                </strong>
                .
              </p>
              <p className="text-gray-500">
                After approval, proceed to your netbanking or UPI business gateway, send funds, and enter the transaction reference ID in &apos;Mark as Paid&apos;.
              </p>
            </div>
          )}
        </Modal>

        {/* MARK AS PAID MODAL */}
        <Modal
          isOpen={markPaidModal.isOpen}
          onClose={() =>
            !markPaidModal.processing &&
            setMarkPaidModal({
              isOpen: false,
              withdrawal: null,
              reference_id: '',
              payment_mode: 'IMPS/NEFT',
              admin_note: '',
              processing: false,
            })
          }
          title="Confirm Payout Disbursement / भुगतान पुष्टि"
          subtitle="Record payment reference to debit wallet balance & complete the transaction."
          size="md"
          footer={
            <div className="flex items-center justify-end gap-2.5 w-full">
              <Button
                variant="outline"
                size="sm"
                disabled={markPaidModal.processing}
                onClick={() =>
                  setMarkPaidModal({
                    isOpen: false,
                    withdrawal: null,
                    reference_id: '',
                    payment_mode: 'IMPS/NEFT',
                    admin_note: '',
                    processing: false,
                  })
                }
              >
                Cancel
              </Button>
              <Button
                variant="gold"
                size="sm"
                loading={markPaidModal.processing}
                onClick={handleMarkPaid}
                icon={Send}
              >
                Confirm Paid
              </Button>
            </div>
          }
        >
          {markPaidModal.withdrawal && (
            <div className="space-y-4 text-xs">
              <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-emerald-800 font-semibold block">Payout Amount / भुगतान राशि</span>
                  <span className="text-2xl font-black text-emerald-950">
                    ₹{Number(markPaidModal.withdrawal.amount).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="text-right text-[11px] text-emerald-900">
                  <p className="font-semibold">
                    {membersMap[markPaidModal.withdrawal.member_id]?.full_name || 'Member'}
                  </p>
                  <p className="text-gray-500 font-mono">
                    {membersMap[markPaidModal.withdrawal.member_id]?.member_id || markPaidModal.withdrawal.member_id}
                  </p>
                </div>
              </div>

              {/* Dynamic Scannable UPI QR Code if UPI ID is present */}
              {markPaidModal.withdrawal.bank_details?.upi_id && (
                <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200/80 flex flex-col sm:flex-row items-center gap-4">
                  <div className="bg-white p-2 rounded-xl border border-amber-200 shadow-sm shrink-0">
                    <SafeQRCode
                      value={`upi://pay?pa=${encodeURIComponent(markPaidModal.withdrawal.bank_details.upi_id)}&pn=${encodeURIComponent(markPaidModal.withdrawal.bank_details.account_name || membersMap[markPaidModal.withdrawal.member_id]?.full_name || 'Member')}&am=${markPaidModal.withdrawal.amount}&cu=INR&tn=${encodeURIComponent('UCWF Seva Incentive Payout')}`}
                      size={110}
                    />
                  </div>
                  <div className="flex-1 text-center sm:text-left space-y-1.5 w-full">
                    <div className="flex items-center justify-center sm:justify-start gap-1.5 text-amber-950 font-bold">
                      <QrCode className="w-4 h-4 text-amber-700" />
                      <span>Scan & Pay via any UPI App</span>
                    </div>
                    <p className="text-[11px] text-amber-900">
                      UPI ID: <span className="font-mono font-bold select-all bg-white px-1.5 py-0.5 rounded border border-amber-200">{markPaidModal.withdrawal.bank_details.upi_id}</span>
                    </p>
                    <div className="flex items-center justify-center sm:justify-start gap-2 pt-0.5">
                      <a
                        href={`upi://pay?pa=${encodeURIComponent(markPaidModal.withdrawal.bank_details.upi_id)}&pn=${encodeURIComponent(markPaidModal.withdrawal.bank_details.account_name || membersMap[markPaidModal.withdrawal.member_id]?.full_name || 'Member')}&am=${markPaidModal.withdrawal.amount}&cu=INR&tn=${encodeURIComponent('UCWF Seva Incentive Payout')}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[11px] shadow-sm transition-all"
                      >
                        <Smartphone className="w-3 h-3" />
                        Open UPI App
                      </a>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(markPaidModal.withdrawal.bank_details.upi_id, 'UPI ID')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-amber-900 font-semibold text-[11px] hover:bg-amber-50 transition-all"
                      >
                        <Copy className="w-3 h-3" />
                        Copy UPI
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Bank Account Details Card if available */}
              {markPaidModal.withdrawal.bank_details?.account_number && (
                <div className="p-3 bg-stone-50 rounded-xl border border-gray-200 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-700 flex items-center gap-1">
                      <Building className="w-3.5 h-3.5 text-emerald-700" />
                      Bank A/C Details:
                    </span>
                    <span className="text-gray-500 font-medium">
                      {markPaidModal.withdrawal.bank_details.bank_name || 'Bank Transfer'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-gray-800">
                    <span>A/C: <span className="font-mono font-bold">{markPaidModal.withdrawal.bank_details.account_number}</span></span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(markPaidModal.withdrawal.bank_details.account_number, 'A/C Number')}
                      className="text-gray-500 hover:text-emerald-700 text-[11px] flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" /> Copy A/C
                    </button>
                  </div>
                  {markPaidModal.withdrawal.bank_details.ifsc && (
                    <div className="flex items-center justify-between text-gray-800">
                      <span>IFSC: <span className="font-mono font-bold uppercase">{markPaidModal.withdrawal.bank_details.ifsc}</span></span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(markPaidModal.withdrawal.bank_details.ifsc, 'IFSC Code')}
                        className="text-gray-500 hover:text-emerald-700 text-[11px] flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" /> Copy IFSC
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Payment Reference ID / Bank UTR *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., UTR293847291837 or IMPS982348"
                  value={markPaidModal.reference_id}
                  onChange={(e) =>
                    setMarkPaidModal({ ...markPaidModal, reference_id: e.target.value })
                  }
                  className="w-full p-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-amber-500 text-xs font-mono font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Payment Mode</label>
                  <select
                    value={markPaidModal.payment_mode}
                    onChange={(e) =>
                      setMarkPaidModal({ ...markPaidModal, payment_mode: e.target.value })
                    }
                    className="w-full p-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-amber-500 text-xs bg-white"
                  >
                    <option value="IMPS/NEFT">Bank IMPS / NEFT</option>
                    <option value="UPI">UPI Transfer</option>
                    <option value="RTGS">RTGS</option>
                    <option value="Cash/Cheque">Cash / Foundation Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Admin Note / Remarks</label>
                  <input
                    type="text"
                    placeholder="Optional reference memo"
                    value={markPaidModal.admin_note}
                    onChange={(e) =>
                      setMarkPaidModal({ ...markPaidModal, admin_note: e.target.value })
                    }
                    className="w-full p-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-amber-500 text-xs"
                  />
                </div>
              </div>

              <p className="text-[11px] text-gray-400 bg-stone-50 p-2.5 rounded-xl">
                Note: Upon confirmation, ₹{markPaidModal.withdrawal.amount} will be deducted from the member&apos;s available wallet balance and recorded in the transactions ledger.
              </p>
            </div>
          )}
        </Modal>

        {/* REJECT MODAL */}
        <Modal
          isOpen={rejectModal.isOpen}
          onClose={() =>
            !rejectModal.processing &&
            setRejectModal({ isOpen: false, withdrawal: null, reason: '', processing: false })
          }
          title="Reject Withdrawal / निकासी अस्वीकृत करें"
          subtitle="State the reason why this payout could not be processed."
          size="sm"
          footer={
            <div className="flex items-center justify-end gap-2.5 w-full">
              <Button
                variant="outline"
                size="sm"
                disabled={rejectModal.processing}
                onClick={() =>
                  setRejectModal({ isOpen: false, withdrawal: null, reason: '', processing: false })
                }
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                loading={rejectModal.processing}
                onClick={handleReject}
                icon={XCircle}
              >
                Reject Request
              </Button>
            </div>
          }
        >
          {rejectModal.withdrawal && (
            <div className="space-y-3 text-xs">
              <p className="text-gray-700">
                Rejecting withdrawal of ₹{rejectModal.withdrawal.amount}.
              </p>
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Reason for Rejection (अस्वीकृति का कारण)
                </label>
                <textarea
                  rows={3}
                  value={rejectModal.reason}
                  onChange={(e) =>
                    setRejectModal((prev) => ({ ...prev, reason: e.target.value }))
                  }
                  placeholder="e.g., Bank account details incorrect / IFSC not found / Name mismatch"
                  className="w-full p-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-rose-500 text-xs"
                />
              </div>
            </div>
          )}
        </Modal>
      </div>
    </AdminLayout>
  );
}

export { Payouts };
