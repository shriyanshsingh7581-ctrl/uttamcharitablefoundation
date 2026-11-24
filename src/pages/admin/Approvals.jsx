import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardCheck,
  CheckCircle,
  XCircle,
  Eye,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Copy,
  Check,
  User,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Filter,
  Search,
  Sparkles,
} from 'lucide-react';
import AdminLayout from './AdminLayout';
import { supabase, db, ref, update, get } from '../../lib/supabase';
import { distributeCommissions } from '../../utils/commission';
import { parseAmount } from '../../utils/mlmUtils';
import { useLanguage } from '../../contexts/LanguageContext';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

export default function Approvals() {
  const { bi } = useLanguage();
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'active' | 'rejected'
  const [members, setMembers] = useState([]);
  const [referrersMap, setReferrersMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [screenshotModal, setScreenshotModal] = useState({
    isOpen: false,
    imageUrl: '',
    member: null,
    zoom: 1,
  });

  const [approveConfirmModal, setApproveConfirmModal] = useState({
    isOpen: false,
    member: null,
    processing: false,
  });

  const [rejectModal, setRejectModal] = useState({
    isOpen: false,
    member: null,
    reason: '',
    processing: false,
  });

  const [feedbackToast, setFeedbackToast] = useState(null);
  const [copiedUtr, setCopiedUtr] = useState(null);

  const showToast = (message, type = 'success') => {
    setFeedbackToast({ message, type });
    setTimeout(() => {
      setFeedbackToast(null);
    }, 5000);
  };

  // Fetch members by current tab filter
  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('members')
        .select('*')
        .order('created_at', { ascending: false });

      if (activeTab === 'pending') {
        query = query.eq('status', 'pending');
      } else if (activeTab === 'active') {
        query = query.eq('status', 'active').limit(50);
      } else if (activeTab === 'rejected') {
        query = query.in('status', ['rejected', 'blocked']).limit(50);
      }

      const { data, error } = await query;

      if (error || !data || data.length === 0) {
        // Fallback to Supabase Realtime Tree
        try {
          const fbSnap = await get(ref(db, 'members'));
          if (fbSnap.exists()) {
            const fbVal = fbSnap.val();
            const fbList = Object.keys(fbVal).map((k) => ({
              id: k,
              ...fbVal[k],
              package_amount: parseAmount(fbVal[k]),
              payment_utr: fbVal[k].utr_number || fbVal[k].utrNumber || fbVal[k].payment_utr || '',
              tier_name: fbVal[k].package_name || fbVal[k].tier_name || 'Seva Mitra',
            }));
            const filteredFb = fbList.filter((m) => {
              if (activeTab === 'pending') return m.status === 'pending';
              if (activeTab === 'active') return m.status === 'active';
              if (activeTab === 'rejected') return m.status === 'rejected' || m.status === 'blocked';
              return true;
            });
            setMembers(filteredFb);
          } else {
            setMembers([]);
          }
        } catch (e) {
          console.warn('Supabase Realtime approvals fallback note:', e);
          setMembers([]);
        }
      } else {
        const fetchedMembers = (data || []).map((m) => ({
          ...m,
          package_amount: parseAmount(m),
        }));
        setMembers(fetchedMembers);

        // Fetch referrers for all members that have a referrer_id
        const referrerIds = [
          ...new Set(
            fetchedMembers
              .map((m) => m.referrer_id)
              .filter((id) => Boolean(id))
          ),
        ];

        if (referrerIds.length > 0) {
          const { data: refData } = await supabase
            .from('members')
            .select('id, full_name, member_id, phone')
            .in('id', referrerIds);

          if (refData) {
            const map = {};
            refData.forEach((r) => {
              map[r.id] = r;
            });
            setReferrersMap(map);
          }
        }
      }
    } catch (err) {
      console.error('Approvals fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchMembers();
  };

  // Handle Approve Member
  const handleApprove = async () => {
    const memberToApprove = approveConfirmModal.member;
    if (!memberToApprove) return;

    setApproveConfirmModal((prev) => ({ ...prev, processing: true }));

    try {
      const nowIso = new Date().toISOString();

      // 1. Update member record to active
      const { error: updateError } = await supabase
        .from('members')
        .update({
          status: 'active',
          is_active: true,
          activated_at: nowIso,
          updated_at: nowIso,
        })
        .eq('id', memberToApprove.id);

      // Sync approval to Supabase Realtime Tree
      try {
        await update(ref(db, `members/${memberToApprove.id}`), {
          status: 'active',
          is_active: true,
          activated_at: nowIso,
          updated_at: nowIso,
        });
        await update(ref(db, `users/${memberToApprove.id}`), {
          status: 'active',
          is_active: true,
          activated_at: nowIso,
          updated_at: nowIso,
        }).catch(() => {});
        const memberUtr = memberToApprove.utr_number || memberToApprove.utrNumber;
        if (memberUtr) {
          await update(ref(db, `utr_registry/${memberUtr}`), {
            status: 'approved',
            approved_at: nowIso,
          }).catch(() => {});
        }
      } catch (fbErr) {
        console.warn('Supabase Realtime approval sync note:', fbErr);
      }

      if (updateError) {
        console.warn('Supabase update note:', updateError.message);
      }

      // 2. Ensure wallet exists for this member
      const { error: walletError } = await supabase
        .from('wallets')
        .upsert(
          {
            member_id: memberToApprove.id,
            balance: 0,
            total_earned: 0,
            total_withdrawn: 0,
            pending_withdrawn: 0,
            updated_at: nowIso,
          },
          { onConflict: 'member_id' }
        );

      if (walletError) {
        console.warn('Wallet upsert warning:', walletError.message);
      }

      // 3. Distribute 12-Level commissions
      let distributionMessage = '';
      try {
        const commResult = await distributeCommissions(memberToApprove.id, supabase);
        if (commResult?.success) {
          distributionMessage = ` & distributed ₹${commResult.totalDistributed} across ${commResult.levelsDistributed} referral levels`;
        }
      } catch (commErr) {
        console.error('Commission distribution error during approval:', commErr);
      }

      showToast(
        `Member ${memberToApprove.full_name || memberToApprove.id} activated successfully${distributionMessage}!`,
        'success'
      );

      setApproveConfirmModal({ isOpen: false, member: null, processing: false });
      if (screenshotModal.isOpen) {
        setScreenshotModal({ isOpen: false, imageUrl: '', member: null, zoom: 1 });
      }

      fetchMembers();
    } catch (err) {
      console.error('Approval failed:', err);
      showToast(err.message || 'Error approving member', 'error');
      setApproveConfirmModal((prev) => ({ ...prev, processing: false }));
    }
  };

  // Handle Reject Member
  const handleReject = async () => {
    const memberToReject = rejectModal.member;
    if (!memberToReject) return;

    setRejectModal((prev) => ({ ...prev, processing: true }));

    try {
      const nowIso = new Date().toISOString();
      const reason = rejectModal.reason.trim() || 'Payment verification failed / Invalid UTR';

      // Update status to rejected
      const { error } = await supabase
        .from('members')
        .update({
          status: 'rejected',
          is_active: false,
          admin_note: reason,
          updated_at: nowIso,
        })
        .eq('id', memberToReject.id);

      // Sync to Supabase Realtime Tree
      try {
        await update(ref(db, `members/${memberToReject.id}`), {
          status: 'rejected',
          is_active: false,
          admin_note: reason,
          updated_at: nowIso,
        });
        await update(ref(db, `users/${memberToReject.id}`), {
          status: 'rejected',
          is_active: false,
          admin_note: reason,
          updated_at: nowIso,
        }).catch(() => {});
        const memberUtr = memberToReject.utr_number || memberToReject.utrNumber;
        if (memberUtr) {
          await update(ref(db, `utr_registry/${memberUtr}`), {
            status: 'rejected',
            rejected_at: nowIso,
            reject_reason: reason,
          }).catch(() => {});
        }
      } catch (fbErr) {
        console.warn('Supabase Realtime rejection sync note:', fbErr);
      }

      if (error) {
        console.warn('Supabase reject warning:', error.message);
      }

      showToast(`Registration for ${memberToReject.full_name} marked as rejected.`, 'info');
      setRejectModal({ isOpen: false, member: null, reason: '', processing: false });
      if (screenshotModal.isOpen) {
        setScreenshotModal({ isOpen: false, imageUrl: '', member: null, zoom: 1 });
      }

      fetchMembers();
    } catch (err) {
      console.error('Rejection failed:', err);
      showToast(err.message || 'Error rejecting member', 'error');
      setRejectModal((prev) => ({ ...prev, processing: false }));
    }
  };

  const copyUtr = (utr) => {
    if (!utr) return;
    navigator.clipboard.writeText(utr);
    setCopiedUtr(utr);
    setTimeout(() => setCopiedUtr(null), 2500);
  };

  // Filtered members by search query
  const filteredMembers = members.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (m.full_name && m.full_name.toLowerCase().includes(q)) ||
      (m.member_id && m.member_id.toLowerCase().includes(q)) ||
      (m.phone && m.phone.toLowerCase().includes(q)) ||
      (m.email && m.email.toLowerCase().includes(q)) ||
      (m.payment_utr && m.payment_utr.toLowerCase().includes(q))
    );
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* TOAST NOTIFICATION */}
        <AnimatePresence>
          {feedbackToast && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`fixed top-4 right-4 z-[9999] p-4 rounded-2xl shadow-xl flex items-center gap-3 text-sm font-semibold max-w-md ${
                feedbackToast.type === 'error'
                  ? 'bg-rose-600 text-white shadow-rose-600/30'
                  : feedbackToast.type === 'info'
                  ? 'bg-slate-800 text-white shadow-slate-900/30'
                  : 'bg-emerald-600 text-white shadow-emerald-600/30'
              }`}
            >
              {feedbackToast.type === 'error' ? (
                <XCircle className="w-5 h-5 flex-shrink-0" />
              ) : (
                <CheckCircle className="w-5 h-5 flex-shrink-0 text-amber-300" />
              )}
              <span className="flex-1">{feedbackToast.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900">
                <ClipboardCheck className="w-3.5 h-3.5 text-amber-600" />
                सत्यापन कक्ष
              </span>
              <span className="text-xs text-gray-400">Payment Verification</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mt-1 flex items-center gap-3">
              Payment Approvals
              {activeTab === 'pending' && members.length > 0 && (
                <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-amber-500 text-white shadow-xs">
                  {members.length} Pending
                </span>
              )}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Verify UTR transaction IDs and payment screenshots to activate memberships & trigger 12-level payouts.
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

        {/* TABS & SEARCH BAR */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
          {/* Tabs */}
          <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-xl overflow-x-auto">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'pending'
                  ? 'bg-white text-emerald-800 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Pending Verification
              {activeTab === 'pending' && members.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('active')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'active'
                  ? 'bg-white text-emerald-800 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Recently Approved
            </button>

            <button
              onClick={() => setActiveTab('rejected')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'rejected'
                  ? 'bg-white text-emerald-800 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Rejected Registrations
            </button>
          </div>

          {/* Search box */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, phone, UTR..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-stone-50"
            />
          </div>
        </div>

        {/* MEMBERS LIST */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <LoadingSpinner size="lg" text="Fetching pending registrations..." />
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-stone-100 text-gray-400 flex items-center justify-center">
              <CheckCircle className="w-7 h-7 text-emerald-600" />
            </div>
            <h3 className="text-base font-bold text-gray-800">
              {activeTab === 'pending'
                ? 'All Caught Up! कोई सत्यापन लंबित नहीं है'
                : 'No records found for this view'}
            </h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
              {activeTab === 'pending'
                ? 'There are currently no new member payment submissions waiting for approval.'
                : 'Try adjusting your search query or check back later.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMembers.map((m) => {
              const referrer = m.referrer_id ? referrersMap[m.referrer_id] : null;

              return (
                <div
                  key={m.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:border-emerald-200 transition-all p-5"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    {/* Member & Package Info */}
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      {/* Screenshot thumbnail or avatar */}
                      <div className="relative group shrink-0">
                        {m.payment_screenshot_url ? (
                          <div
                            onClick={() =>
                              setScreenshotModal({
                                isOpen: true,
                                imageUrl: m.payment_screenshot_url,
                                member: m,
                                zoom: 1,
                              })
                            }
                            className="w-20 h-20 rounded-xl overflow-hidden border-2 border-emerald-500/30 shadow-xs cursor-pointer relative bg-stone-100"
                          >
                            <img
                              src={m.payment_screenshot_url}
                              alt="Payment Screenshot"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                              <Eye className="w-5 h-5" />
                            </div>
                            <span className="absolute bottom-1 right-1 text-[9px] font-bold bg-black/70 text-white px-1 rounded">
                              Proof
                            </span>
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-extrabold text-xl flex items-center justify-center shadow-sm">
                            {m.full_name ? m.full_name.charAt(0).toUpperCase() : 'M'}
                          </div>
                        )}
                      </div>

                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-bold text-gray-900 leading-tight">
                            {m.full_name || 'Anonymous Member'}
                          </h3>
                          <span className="text-xs font-mono font-semibold text-gray-500 bg-stone-100 px-2 py-0.5 rounded-md">
                            {m.member_id || m.id.substring(0, 8)}
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            {m.tier_name || 'Seva Package'} • ₹{m.package_amount || 500}
                          </span>
                        </div>

                        {/* Contact details */}
                        <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-gray-500 pt-1">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5 text-gray-400" />
                            {m.phone || 'No phone'}
                          </span>
                          {m.email && (
                            <span className="flex items-center gap-1 truncate max-w-[200px]">
                              <Mail className="w-3.5 h-3.5 text-gray-400" />
                              {m.email}
                            </span>
                          )}
                          {m.blood_group && (
                            <span className="text-rose-600 font-bold bg-rose-50 px-1.5 py-0.2 rounded text-[11px]">
                              Blood: {m.blood_group}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-gray-400">
                            <Calendar className="w-3.5 h-3.5" />
                            Joined:{' '}
                            {m.created_at
                              ? new Date(m.created_at).toLocaleDateString('en-IN')
                              : 'N/A'}
                          </span>
                        </div>

                        {/* Referrer Details if present */}
                        <div className="text-xs text-gray-500 pt-1 flex items-center gap-1.5">
                          <span className="text-gray-400">Referrer:</span>
                          {referrer ? (
                            <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                              {referrer.full_name} ({referrer.member_id || referrer.id.substring(0, 8)})
                            </span>
                          ) : m.referrer_id ? (
                            <span className="font-mono text-gray-600">{m.referrer_id.substring(0, 8)}</span>
                          ) : (
                            <span className="text-gray-400 italic">Direct Foundation Join (No upline)</span>
                          )}
                        </div>

                        {m.address && (
                          <p className="text-xs text-gray-400 truncate max-w-lg">
                            Address: {m.address}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* UTR & Payment Proof & Action Buttons */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between lg:justify-end gap-4 border-t lg:border-t-0 pt-3 lg:pt-0 border-gray-100">
                      {/* UTR Box */}
                      <div className="bg-stone-50 border border-gray-200/70 p-2.5 rounded-xl text-left min-w-[200px]">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          Payment UTR / Txn ID
                        </p>
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <span className="font-mono text-xs font-extrabold text-emerald-900 select-all">
                            {m.payment_utr || 'NOT ENTERED'}
                          </span>
                          {m.payment_utr && (
                            <button
                              onClick={() => copyUtr(m.payment_utr)}
                              className="p-1 text-gray-400 hover:text-emerald-700 rounded hover:bg-white transition-colors"
                              title="Copy UTR"
                            >
                              {copiedUtr === m.payment_utr ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                        {m.payment_screenshot_url && (
                          <button
                            onClick={() =>
                              setScreenshotModal({
                                isOpen: true,
                                imageUrl: m.payment_screenshot_url,
                                member: m,
                                zoom: 1,
                              })
                            }
                            className="mt-1 text-[11px] font-semibold text-emerald-600 hover:underline flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" /> View Screenshot
                          </button>
                        )}
                      </div>

                      {/* Action buttons (only in pending state) */}
                      {activeTab === 'pending' ? (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="danger"
                            size="sm"
                            icon={XCircle}
                            onClick={() =>
                              setRejectModal({
                                isOpen: true,
                                member: m,
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
                            icon={CheckCircle}
                            onClick={() =>
                              setApproveConfirmModal({
                                isOpen: true,
                                member: m,
                                processing: false,
                              })
                            }
                          >
                            Approve & Activate
                          </Button>
                        </div>
                      ) : (
                        <div className="text-right">
                          <span
                            className={`inline-block text-xs font-bold px-3 py-1 rounded-full ${
                              m.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {m.status === 'active' ? 'Active Member' : 'Rejected'}
                          </span>
                          {m.activated_at && (
                            <p className="text-[11px] text-gray-400 mt-1">
                              Activated: {new Date(m.activated_at).toLocaleDateString('en-IN')}
                            </p>
                          )}
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
            setApproveConfirmModal({ isOpen: false, member: null, processing: false })
          }
          title="Approve & Activate Member / सदस्यता सक्रियण"
          subtitle="This will immediately activate the member and distribute 12-level referral commissions."
          size="md"
          footer={
            <div className="flex items-center justify-end gap-2.5 w-full">
              <Button
                variant="outline"
                size="sm"
                disabled={approveConfirmModal.processing}
                onClick={() =>
                  setApproveConfirmModal({ isOpen: false, member: null, processing: false })
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
                Confirm & Activate
              </Button>
            </div>
          }
        >
          {approveConfirmModal.member && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                <p className="text-xs text-emerald-800 font-semibold mb-1">Confirmation Details</p>
                <h4 className="text-base font-bold text-emerald-950">
                  {approveConfirmModal.member.full_name}
                </h4>
                <div className="mt-2 text-xs space-y-1 text-emerald-900">
                  <p>
                    <strong>Package:</strong> {approveConfirmModal.member.tier_name || 'Seva Mitra'} (₹
                    {approveConfirmModal.member.package_amount || 500})
                  </p>
                  <p>
                    <strong>Payment UTR:</strong>{' '}
                    <span className="font-mono font-bold">
                      {approveConfirmModal.member.payment_utr || 'N/A'}
                    </span>
                  </p>
                  <p>
                    <strong>Member Phone:</strong> {approveConfirmModal.member.phone || 'N/A'}
                  </p>
                </div>
              </div>

              <div className="text-xs text-gray-500 space-y-1 bg-stone-50 p-3 rounded-xl border border-gray-100">
                <p className="font-bold text-gray-700">What happens on approval:</p>
                <p>1. Status will be changed to &quot;active&quot; with immediate timestamp.</p>
                <p>2. Member wallet will be initialized for transactions & withdrawals.</p>
                <p>3. Referral chain will be traversed up to 12 upline levels to disburse incentives.</p>
              </div>
            </div>
          )}
        </Modal>

        {/* REJECT MODAL */}
        <Modal
          isOpen={rejectModal.isOpen}
          onClose={() =>
            !rejectModal.processing &&
            setRejectModal({ isOpen: false, member: null, reason: '', processing: false })
          }
          title="Reject Member Registration / अस्वीकृत करें"
          subtitle="Specify reason for rejecting this payment registration."
          size="md"
          footer={
            <div className="flex items-center justify-end gap-2.5 w-full">
              <Button
                variant="outline"
                size="sm"
                disabled={rejectModal.processing}
                onClick={() =>
                  setRejectModal({ isOpen: false, member: null, reason: '', processing: false })
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
                Reject Registration
              </Button>
            </div>
          }
        >
          {rejectModal.member && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                You are rejecting registration for{' '}
                <strong className="text-gray-900">{rejectModal.member.full_name}</strong>.
              </p>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Rejection Reason (अस्वीकृति का कारण)
                </label>
                <textarea
                  rows={3}
                  value={rejectModal.reason}
                  onChange={(e) =>
                    setRejectModal((prev) => ({ ...prev, reason: e.target.value }))
                  }
                  placeholder="e.g., Invalid UTR number / Payment screenshot not matching / Amount mismatch"
                  className="w-full p-3 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                />
              </div>
            </div>
          )}
        </Modal>

        {/* SCREENSHOT FULL PREVIEW MODAL */}
        <Modal
          isOpen={screenshotModal.isOpen}
          onClose={() =>
            setScreenshotModal({ isOpen: false, imageUrl: '', member: null, zoom: 1 })
          }
          title="Payment Proof Screenshot / भुगतान प्रमाण"
          subtitle={
            screenshotModal.member
              ? `${screenshotModal.member.full_name} (₹${screenshotModal.member.package_amount})`
              : 'Screenshot Preview'
          }
          size="xl"
          footer={
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  icon={ZoomIn}
                  onClick={() =>
                    setScreenshotModal((prev) => ({ ...prev, zoom: Math.min(prev.zoom + 0.25, 3) }))
                  }
                >
                  Zoom In
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  icon={ZoomOut}
                  onClick={() =>
                    setScreenshotModal((prev) => ({ ...prev, zoom: Math.max(prev.zoom - 0.25, 0.5) }))
                  }
                >
                  Zoom Out
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={RotateCcw}
                  onClick={() => setScreenshotModal((prev) => ({ ...prev, zoom: 1 }))}
                >
                  Reset
                </Button>
              </div>

              <div className="flex items-center gap-2">
                {screenshotModal.member?.status === 'pending' && (
                  <>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        const m = screenshotModal.member;
                        setRejectModal({ isOpen: true, member: m, reason: '', processing: false });
                      }}
                    >
                      Reject
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        const m = screenshotModal.member;
                        setApproveConfirmModal({ isOpen: true, member: m, processing: false });
                      }}
                    >
                      Approve & Activate
                    </Button>
                  </>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setScreenshotModal({ isOpen: false, imageUrl: '', member: null, zoom: 1 })
                  }
                >
                  Close
                </Button>
              </div>
            </div>
          }
        >
          {screenshotModal.imageUrl && (
            <div className="space-y-4">
              {screenshotModal.member && (
                <div className="p-3 bg-stone-50 rounded-xl border border-gray-100 flex flex-wrap items-center justify-between text-xs gap-2">
                  <div>
                    <span className="text-gray-400">UTR / Ref: </span>
                    <span className="font-mono font-bold text-gray-900 select-all">
                      {screenshotModal.member.payment_utr || 'Not provided'}
                    </span>
                  </div>
                  {screenshotModal.member.payment_utr && (
                    <button
                      onClick={() => copyUtr(screenshotModal.member.payment_utr)}
                      className="text-emerald-700 font-semibold hover:underline flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" /> Copy UTR
                    </button>
                  )}
                  <a
                    href={screenshotModal.imageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 font-semibold hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" /> Open in New Tab
                  </a>
                </div>
              )}

              <div className="overflow-auto max-h-[60vh] flex items-center justify-center bg-gray-950/5 rounded-2xl p-4 border border-gray-100">
                <img
                  src={screenshotModal.imageUrl}
                  alt="Payment Screenshot Full Preview"
                  style={{ transform: `scale(${screenshotModal.zoom})`, transformOrigin: 'top center' }}
                  className="max-w-full transition-transform duration-200 rounded-lg shadow-md"
                />
              </div>
            </div>
          )}
        </Modal>
      </div>
    </AdminLayout>
  );
}

export { Approvals };
