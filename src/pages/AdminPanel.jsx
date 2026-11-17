import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Printer,
  Download,
  FileDown,
  User,
  CheckCircle,
  Users, 
  CreditCard, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Copy, 
  Check, 
  Send, 
  Search, 
  Filter, 
  ShieldCheck, 
  Award, 
  IndianRupee, 
  Settings, 
  Upload, 
  Trash2, 
  Edit3, 
  Save, 
  X,
  ExternalLink,
  Loader2,
  Clock,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  UserPlus,
  Percent,
  Wallet,
  Building2,
  TrendingUp,
  TrendingDown,
  PieChart,
  AlertTriangle,
  RefreshCw,
  Calendar,
  FileText,
  ArrowRight,
  Coins,
  Layers,
  Zap,
  LogOut,
  Film,
  Video,
  Image as ImageIcon,
  Star,
  Volume2,
  Play
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useDiwaliTheme } from '../contexts/DiwaliThemeContext';
import DiwaliBanner from '../components/diwali/DiwaliBanner';
import GlowingDiya from '../components/diwali/GlowingDiya';
import { uploadToCloudinary } from '../lib/cloudinary';
import { rtdb } from '../lib/firebase';
import { ref, onValue, update, remove, push, set } from 'firebase/database';
import { 
  getSavedLevelRates, 
  saveLevelRates, 
  getSavedSelfBusinessRate,
  saveSelfBusinessRate,
  getUplineChain, 
  distributeManualCommission, 
  distribute12LevelCommission,
  calculateMemberTreeMetrics,
  syncAndFixAllMemberBalances,
  autoMigrateAndRecalculateUsers
} from '../utils/commission';
import MemberReportLookup from '../components/MemberReportLookup';
import { VoucherPrintButton } from '../components/CommissionVoucher';
import GenerationTreeChart from '../components/GenerationTreeChart';
import { 
  runDailyClosing, 
  cleanAndResetTestData, 
  getISTDateString 
} from '../utils/closingEngine';
import MidnightCountdownBadge from '../components/ui/MidnightCountdownBadge';
import { 
  FOUNDATION_DETAILS, 
  PACKAGES, 
  formatCurrency, 
  formatINR, 
  safeText,
  ENABLE_MANUAL_APPROVAL 
} from '../lib/constants';
import { 
  findParentMember, 
  getMemberFullName, 
  calculateJoinCommission,
  buildMember12LevelReport,
  parseAmount,
  round2,
  normalizeLevelRates,
  extractMemberJoinDateIST,
  formatMemberJoiningDate,
  parseAnyDateToEpochMs,
  DEFAULT_LEVEL_RATES
} from '../utils/mlmUtils';
import PaperRegistrationForm from '../components/PaperRegistrationForm';
import TableSlideScroller from '../components/ui/TableSlideScroller';
import DailyReportSection from '../components/DailyReportSection';
import NewJoiningSection from '../components/NewJoiningSection';
import DonationSlipSection from '../components/DonationSlipSection';
import MyReportSection from '../components/MyReportSection';
import DownlineReportSection from '../components/DownlineReportSection';
import MyPayoutSection from '../components/MyPayoutSection';
import PaidExpenseSection from '../components/PaidExpenseSection';
import PaidPayoutSection from '../components/PaidPayoutSection';

export default function AdminPanel() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { isDiwaliActive, toggleDiwaliTheme } = useDiwaliTheme();
  const [activeTab, setActiveTab] = useState('my-report'); // 'members' | 'payments' | 'withdrawals' | 'media' | 'settings' | 'video-posters'
  
  // Video & Poster Manager States (Requirement 2 & 3)
  const [videoPosterSubTab, setVideoPosterSubTab] = useState('videos'); // 'videos' | 'posters' | 'submissions'
  const [videosList, setVideosList] = useState([]);
  const [postersList, setPostersList] = useState([]);

  // Video Upload Form
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [videoCategory, setVideoCategory] = useState('संस्था गतिविधियाँ');
  const [videoFeatured, setVideoFeatured] = useState(false);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoSuccess, setVideoSuccess] = useState('');
  const [videoError, setVideoError] = useState('');

  // Poster Upload Form
  const [posterFile, setPosterFile] = useState(null);
  const [posterUrl, setPosterUrl] = useState('');
  const [posterTitle, setPosterTitle] = useState('');
  const [posterMessage, setPosterMessage] = useState('');
  const [posterSlot, setPosterSlot] = useState('hero'); // 'hero' | 'events' | 'dashboard' | 'popup' | 'all'
  const [posterLink, setPosterLink] = useState('');
  const [posterUploading, setPosterUploading] = useState(false);
  const [posterSuccess, setPosterSuccess] = useState('');
  const [posterError, setPosterError] = useState('');
  
  // Data States
  const [users, setUsers] = useState({});
  const [paymentRequests, setPaymentRequests] = useState({});
  const [payoutRecords, setPayoutRecords] = useState({});
  const [withdrawals, setWithdrawals] = useState({});
  const [mediaSubmissions, setMediaSubmissions] = useState({});
  const [spends, setSpends] = useState({});
  const [dailyClosings, setDailyClosings] = useState({});
  const [selectedClosingDate, setSelectedClosingDate] = useState(null);
  const [isRunningClosing, setIsRunningClosing] = useState(false);
  const [closingSuccessMsg, setClosingSuccessMsg] = useState('');
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [resetInputText, setResetInputText] = useState('');
  const [isResettingData, setIsResettingData] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adminToast, setAdminToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setAdminToast({ message, type });
    setTimeout(() => setAdminToast(null), 5000);
  };
  const [dialogState, setDialogState] = useState(null);
  const openConfirmDialog = (title, message, onConfirm, danger = false) => {
    setDialogState({ mode: 'confirm', title, message, onConfirm, danger });
  };
  const openPromptDialog = (title, message, defaultValue, onConfirm) => {
    setDialogState({ mode: 'prompt', title, message, inputValue: String(defaultValue ?? ''), onConfirm });
  };

  // Search & Filter
  const [memberSearch, setMemberSearch] = useState('');
  const [memberStatusFilter, setMemberStatusFilter] = useState('ALL');
  const [payoutSearch, setPayoutSearch] = useState('');

  // 12-Level Commission to Payout Command Center State
  const [commissionSubTab, setCommissionSubTab] = useState('structure'); // 'structure' | 'ledger' | 'pipeline' | 'records'
  const [simPackageAmount, setSimPackageAmount] = useState(2100);
  const [simCustomInput, setSimCustomInput] = useState('');
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerFilter, setLedgerFilter] = useState('ALL'); // 'ALL' | 'PAYABLE' | 'SETTLED'
  const [isEditingRatesInTab, setIsEditingRatesInTab] = useState(false);

  // Member Password visibility state
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [copiedKey, setCopiedKey] = useState(null);

  // Day-by-Day Report States (Requirement 4)
  const [dayFilterMode, setDayFilterMode] = useState('today'); // 'today' | 'yesterday' | 'specific' | 'range' | 'summary'
  const [daySpecificDate, setDaySpecificDate] = useState(() => getISTDateString());
  const [dayRangeStart, setDayRangeStart] = useState(() => getISTDateString());
  const [dayRangeEnd, setDayRangeEnd] = useState(() => getISTDateString());
  const [daySearchQuery, setDaySearchQuery] = useState('');

  // Edit Member Modal State
  const fileRef = useRef(null);
  const photoRef = useRef(null);
  const inputRef = useRef(null);
  const [selectedDocMember, setSelectedDocMember] = useState(null);
  const handleDeleteMember = (uid, name) => {
    if (!uid) return;
    openConfirmDialog(
      'Delete Member?',
      `Are you sure you want to delete member "${name || uid}"? This action cannot be undone.`,
      async () => {
        try {
          await remove(ref(rtdb, `users/${uid}`));
          showToast(`Member "${name || uid}" deleted successfully.`);
        } catch (err) {
          showToast('Failed to delete member: ' + (err.message || err), 'error');
        }
      },
      true
    );
  };
  const [editingMember, setEditingMember] = useState(null);
  const [editFather, setEditFather] = useState('');
  const [editMother, setEditMother] = useState('');
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editDesignation, setEditDesignation] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editSponsorId, setEditSponsorId] = useState('');
  const [editStatus, setEditStatus] = useState('active');
  const [editCity, setEditCity] = useState('');
  const [memberSortOrder, setMemberSortOrder] = useState('date-desc'); // 'date-desc' | 'date-asc' | 'name-asc' | 'business-desc' | 'commission-desc'

  // Helper to format joining date as DD/MM/YYYY
  const formatJoiningDate = (m) => formatMemberJoiningDate(m);

  const handleOpenEditMember = (member) => {
    setEditingMember(member);
    setEditName(member?.name || '');
    setEditFather(member?.fatherName || member?.fatherOrSpouseName || '');
    setEditMother(member?.motherName || '');
    setEditPhone(member?.phone || '');
    setEditDesignation(member?.padNaam || member?.designation || '');
    setEditAddress(member?.address || member?.city || '');
  };

  // Add Member Paper Form Modal State
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);

  // Manual 12-Level Commission Settings State
  const [levelRates, setLevelRates] = useState({
    1: 20, 2: 8, 3: 5, 4: 4, 5: 3, 6: 2.5, 7: 2, 8: 1.5, 9: 1, 10: 1, 11: 1, 12: 1
  });
  const [selfBusinessRate, setSelfBusinessRate] = useState(0);
  const [isSavingRates, setIsSavingRates] = useState(false);
  const [saveRatesSuccess, setSaveRatesSuccess] = useState(false);

  // Manual 12-Level Commission Distribution Modal State
  const [manualCommissionModal, setManualCommissionModal] = useState({
    isOpen: false,
    type: 'payment', // 'payment' | 'member'
    sourceItem: null,
    amount: 500,
    memberName: '',
    memberId: '',
    sponsorId: '',
    uplineChain: [],
    loadingChain: false,
    distributionRows: []
  });
  const [isDistributingManual, setIsDistributingManual] = useState(false);

  // Add Charity Spend Form State
  const [spendTitle, setSpendTitle] = useState('');
  const [spendAmount, setSpendAmount] = useState('');
  const [spendCategory, setSpendCategory] = useState('Blanket & Relief Distribution');
  const [spendBeneficiaries, setSpendBeneficiaries] = useState('');

  // Dedicated Verification & Reports States (Requirements 4 & 5)
  const [docSearch, setDocSearch] = useState('');
  const [docFilter, setDocFilter] = useState('ALL'); // 'ALL' | 'VERIFIED' | 'PENDING'
  const [previewIdCardMember, setPreviewIdCardMember] = useState(null);
  const [reportsSubTab, setReportsSubTab] = useState('company'); // 'company' | 'worker'
  const [workerSearchInput, setWorkerSearchInput] = useState('');

  // Sponsor display name helper
  const getSponsorDisplayName = (spId, memberObj = null) => {
    if (!spId || spId === 'DIRECT' || spId === '9540648402' || spId.toUpperCase() === 'UCWF-0001') {
      return 'UCWF-0001 (Dr. Rajendra Singh Saini)';
    }
    const cleanP = spId.replace(/\D/g, '').slice(-10);
    const found = Object.values(users).find(u => 
      (u.memberId && u.memberId.toUpperCase() === spId.toUpperCase()) ||
      (u.phone && cleanP && u.phone.replace(/\D/g, '').slice(-10) === cleanP)
    );
    if (found) {
      return `${found.memberId || spId} (${found.name || 'Member'})`;
    }
    if (memberObj?.sponsorName) {
      return `${spId} (${memberObj.sponsorName})`;
    }
    return spId;
  };

  // 1-Click Toggle Member Active / Pending Status in RTDB
  const handleToggleMemberStatus = async (targetMem) => {
    if (!targetMem || !targetMem.uid) return;
    const current = targetMem.status || 'active';
    const nextStatus = current === 'active' ? 'pending' : 'active';
    try {
      await update(ref(rtdb, `users/${targetMem.uid}`), { 
        status: nextStatus,
        isApproved: nextStatus === 'active'
      });
    } catch (err) {
      showToast('Status update error: ' + (err.message || 'Error'), 'error');
    }
  };

  // Toggle Document Verification in RTDB
  const handleToggleDocVerification = async (uid, currentStatus) => {
    try {
      const newStatus = !currentStatus;
      await update(ref(rtdb, `users/${uid}`), { documentsVerified: newStatus });
    } catch (err) {
      showToast('Verification update error: ' + (err.message || 'Error'), 'error');
    }
  };

  // Commission Filter: 'ALL' | 'PAID' | 'UNPAID'
  const [commissionFilter, setCommissionFilter] = useState('ALL');

  // Universal User Photo Resolver across all 8 possible RTDB keys
  const resolveUserPhoto = (m) => {
    if (!m) return '';
    return (
      m.photoUrl ||
      m.photo ||
      m.profilePhoto ||
      m.photoBase64 ||
      m.avatar ||
      m.image ||
      m.documents?.photo ||
      ''
    );
  };

  // 1-Click Toggle Commission Paid / Unpaid in RTDB
  const handleToggleCommissionPaid = async (member) => {
    if (!member || !member.uid) return;
    const met = memberTreeMetricsMap[member.uid] || {};
    const totalComm = Number(met.totalCommission || member.totalCommission || 0);
    const currentPaid = Number(member.commissionPaid || 0);
    const isCurrentlyPaid = member.commissionStatus === 'Paid' || (currentPaid >= totalComm && totalComm > 0);

    let newPaid = 0;
    let newUnpaid = totalComm;
    let newStatus = 'Unpaid';

    if (!isCurrentlyPaid) {
      newPaid = totalComm;
      newUnpaid = 0;
      newStatus = 'Paid';
    }

    try {
      await update(ref(rtdb, `users/${member.uid}`), {
        commissionPaid: newPaid,
        commissionUnpaid: newUnpaid,
        commissionStatus: newStatus,
        lastCommissionPayoutDate: new Date().toISOString()
      });
    } catch (err) {
      showToast('Failed to update commission payout status: ' + (err.message || 'Error'), 'error');
    }
  };

  // Set Custom Commission Paid Amount
  const handleSetCustomPaidAmount = (member) => {
    if (!member || !member.uid) return;
    const met = memberTreeMetricsMap[member.uid] || {};
    const totalComm = Number(met.totalCommission || member.totalCommission || 0);
    const currentPaid = Number(member.commissionPaid || 0);

    openPromptDialog(
      'Set Commission Paid Amount (₹)',
      `Enter Commission Paid amount (₹) for ${member.name} (${member.memberId || 'N/A'}):\nTotal Commission Earned: ₹${totalComm}`,
      currentPaid,
      async (input) => {
        const num = parseAmount(input);
        if (isNaN(num) || num < 0) {
          showToast('Invalid amount entered.', 'error');
          return;
        }
        const newPaid = round2(num);
        const newUnpaid = Math.max(0, round2(totalComm - newPaid));
        const newStatus = newUnpaid === 0 && newPaid > 0 ? 'Paid' : (newPaid > 0 ? 'Partial' : 'Unpaid');

        try {
          await update(ref(rtdb, `users/${member.uid}`), {
            commissionPaid: newPaid,
            commissionUnpaid: newUnpaid,
            commissionStatus: newStatus,
            lastCommissionPayoutDate: new Date().toISOString()
          });
          showToast(`Updated paid amount to ₹${newPaid} for ${member.name}.`);
        } catch (err) {
          showToast('Failed to update commission amount: ' + (err.message || 'Error'), 'error');
        }
      }
    );
  };

  // Export any tabular data to CSV
  const exportToCSV = (rows, filename = 'report.csv') => {
    if (!rows || !rows.length) {
      showToast('No data to export.', 'error');
      return;
    }
    const headers = Object.keys(rows[0]).join(',');
    const csvContent = [
      headers,
      ...rows.map(r => Object.values(r).map(val => `"${String(val ?? '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Company Report to CSV
  const handleExportCompanyReport = () => {
    if (!sortedMembers || !sortedMembers.length) {
      showToast('No members data to export.', 'error');
      return;
    }
    const data = sortedMembers.map((m, idx) => {
      const met = memberTreeMetricsMap[m.uid] || {
        selfBusiness: Number(m.packageAmount || m.packageTier || 0),
        directMembersCount: 0,
        directBusiness: 0,
        downlineMembersCount: 0,
        downlineBusiness: 0,
        totalCommission: Number(m.totalCommission || 0)
      };
      return {
        'S.No.': idx + 1,
        'Member Name': `${m.salutation || ''} ${m.name || ''}`.trim(),
        'User ID No.': m.memberId || 'N/A',
        'Password': m.plainPassword || m.password || 'UCWF@1234',
        'Mobile Number': m.phone || 'N/A',
        'Referral / Sponsor ID': getSponsorDisplayName(m.sponsorId),
        'Joining Date': formatJoiningDate(m),
        'Self Business (INR)': met.selfBusiness,
        'Direct Members Count': met.directMembersCount,
        'Direct Business Collection (INR)': met.directBusiness,
        'Downline Team Members Count': met.downlineMembersCount,
        'Downline Team Business (INR)': met.downlineBusiness,
        'Total Commission (INR)': met.totalCommission,
      };
    });
    exportToCSV(data, `UCWF_Company_Report_${getISTDateString ? getISTDateString() : new Date().toISOString().split('T')[0]}.csv`);
  };

  // Export Worker Downline Report to CSV
  const handleExportWorkerReport = () => {
    if (!selectedWorker || !workerDownlineResult.rows.length) {
      showToast('No downline records to export for this worker.', 'error');
      return;
    }
    const data = workerDownlineResult.rows.map((row, idx) => ({
      'S.No.': idx + 1,
      'Member Name': `${row.member.salutation || ''} ${row.member.name || ''}`.trim(),
      'User ID No.': row.member.memberId || 'N/A',
      'Password': row.member.plainPassword || row.member.password || 'UCWF@1234',
      'Mobile No.': row.member.phone || 'N/A',
      'Referral / Sponsor ID': getSponsorDisplayName(row.member.sponsorId),
      'Level': `L${row.level} (${row.rate}%)`,
      'Business (INR)': row.business,
      'Commission (INR)': row.commission,
    }));
    const wId = selectedWorker.memberId || 'Worker';
    exportToCSV(data, `UCWF_${wId}_Downline_Report_${getISTDateString ? getISTDateString() : new Date().toISOString().split('T')[0]}.csv`);
  };

  // Auto-migrate all members with active package to 'active' status and recalculate
  useEffect(() => {
    autoMigrateAndRecalculateUsers().catch(err => console.warn('Auto-migration note:', err));
  }, []);

  // 1. Subscribe to Firebase RTDB Realtime updates
  useEffect(() => {
    const unsubList = [];
    const onRtdbErr = (label) => (err) => {
      console.warn(`RTDB listener note (${label}):`, err);
      setLoading(false);
    };
    const loadingTimer = setTimeout(() => {
      setLoading(false);
    }, 3000);

    // Users listener
    const usersRef = ref(rtdb, 'users');
    unsubList.push(onValue(usersRef, (snap) => {
      setUsers(snap.exists() ? snap.val() : {});
      setLoading(false);
    }, onRtdbErr('users')));

    // Payments listener
    const paymentsRef = ref(rtdb, 'payment_requests');
    unsubList.push(onValue(paymentsRef, (snap) => {
      setPaymentRequests(snap.exists() ? snap.val() : {});
    }, onRtdbErr('payment_requests')));

    // Payout records listener (3-part ledger: direct, downline, trust share)
    const payoutsRef = ref(rtdb, 'payout_records');
    unsubList.push(onValue(payoutsRef, (snap) => {
      setPayoutRecords(snap.exists() ? snap.val() : {});
    }, onRtdbErr('payout_records')));

    // Withdrawals listener
    const withdrawalsRef = ref(rtdb, 'withdrawals');
    unsubList.push(onValue(withdrawalsRef, (snap) => {
      setWithdrawals(snap.exists() ? snap.val() : {});
    }, onRtdbErr('withdrawals')));

    // Media submissions listener
    const mediaRef = ref(rtdb, 'media_submissions');
    unsubList.push(onValue(mediaRef, (snap) => {
      setMediaSubmissions(snap.exists() ? snap.val() : {});
    }, onRtdbErr('media_submissions')));

    // Videos listener (Requirement 2)
    const videosRef = ref(rtdb, 'media_gallery/videos');
    unsubList.push(onValue(videosRef, (snap) => {
      if (snap.exists()) {
        const list = Object.entries(snap.val()).map(([id, d]) => ({ id, ...d }));
        list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setVideosList(list);
      } else {
        setVideosList([]);
      }
    }, onRtdbErr('videos')));

    // Posters listener (Requirement 3)
    const postersRef = ref(rtdb, 'media_gallery/posters');
    unsubList.push(onValue(postersRef, (snap) => {
      if (snap.exists()) {
        const list = Object.entries(snap.val()).map(([id, d]) => ({ id, ...d }));
        list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setPostersList(list);
      } else {
        setPostersList([]);
      }
    }, onRtdbErr('posters')));

    // Spends listener
    const spendsRef = ref(rtdb, 'spends');
    unsubList.push(onValue(spendsRef, (snap) => {
      setSpends(snap.exists() ? snap.val() : {});
    }, onRtdbErr('spends')));

    // Level Rates listener
    const ratesRef = ref(rtdb, 'settings/levelRates');
    unsubList.push(onValue(ratesRef, (snap) => {
      if (snap.exists()) {
        setLevelRates(normalizeLevelRates(snap.val()));
      }
    }, onRtdbErr('levelRates')));

    // Self Business Rate listener (Strictly 0% self commission)
    const selfRateRef = ref(rtdb, 'settings/selfBusinessRate');
    unsubList.push(onValue(selfRateRef, () => {
      setSelfBusinessRate(0);
    }, onRtdbErr('selfBusinessRate')));

    // Daily Closings listener
    const closingsRef = ref(rtdb, 'daily_closings');
    unsubList.push(onValue(closingsRef, (snap) => {
      setDailyClosings(snap.exists() ? snap.val() : {});
    }, onRtdbErr('daily_closings')));

    return () => {
      clearTimeout(loadingTimer);
      unsubList.forEach(unsub => unsub());
    };
  }, []);

  // Live Tree Metrics calculation for all members
  const memberTreeMetricsMap = useMemo(() => {
    const map = {};
    if (!users || Object.keys(users).length === 0) return map;
    Object.entries(users).forEach(([uid, u]) => {
      if (u) {
        map[uid] = calculateMemberTreeMetrics(u, users, levelRates, selfBusinessRate);
      }
    });
    return map;
  }, [users, levelRates, selfBusinessRate]);

  // Filter and sort members (Dynamic Date-Wise and Metric sorting)
  const sortedMembers = useMemo(() => {
    let list = Object.entries(users).map(([uid, u]) => ({ uid, ...u }));

    if (memberStatusFilter !== 'ALL') {
      list = list.filter(m => m.status === memberStatusFilter);
    }

    if (commissionFilter === 'PAID') {
      list = list.filter(m => {
        const met = memberTreeMetricsMap[m.uid] || {};
        const totalComm = Number(met.totalCommission ?? m.totalCommission ?? 0);
        const paid = Number(m.commissionPaid || m.totalWithdrawn || 0);
        const unpaid = Math.max(0, round2(totalComm - paid));
        return (m.commissionStatus === 'Paid' || (unpaid <= 0 && paid > 0 && totalComm > 0));
      });
    } else if (commissionFilter === 'UNPAID') {
      list = list.filter(m => {
        const met = memberTreeMetricsMap[m.uid] || {};
        const totalComm = Number(met.totalCommission ?? m.totalCommission ?? 0);
        const paid = Number(m.commissionPaid || m.totalWithdrawn || 0);
        const unpaid = Math.max(0, round2(totalComm - paid));
        return unpaid > 0;
      });
    }

    if (memberSearch.trim()) {
      const q = memberSearch.toLowerCase().trim();
      list = list.filter(m => 
        (m.name && m.name.toLowerCase().includes(q)) ||
        (m.email && m.email.toLowerCase().includes(q)) ||
        (m.phone && m.phone.includes(q)) ||
        (m.memberId && m.memberId.toLowerCase().includes(q)) ||
        (m.utrNumber && m.utrNumber.toLowerCase().includes(q))
      );
    }

    // Dynamic sorting
    list.sort((a, b) => {
      const getTime = (x) => {
        if (x.timestamp && typeof x.timestamp === 'number') return x.timestamp;
        const dStr = x.joiningDate || x.applicationDate || x.createdAt || x.date;
        return parseAnyDateToEpochMs(dStr);
      };

      if (memberSortOrder === 'date-asc') {
        return getTime(a) - getTime(b);
      }
      if (memberSortOrder === 'name-asc') {
        return (a.name || '').localeCompare(b.name || '');
      }
      if (memberSortOrder === 'business-desc') {
        return Number(b.packageAmount || b.packageTier || 0) - Number(a.packageAmount || a.packageTier || 0);
      }
      if (memberSortOrder === 'commission-desc') {
        return Number(b.totalCommission || b.totalEarned || 0) - Number(a.totalCommission || a.totalEarned || 0);
      }
      // default: date-desc (newest joining first)
      return getTime(b) - getTime(a);
    });

    return list;
  }, [users, memberStatusFilter, commissionFilter, memberSearch, memberSortOrder, memberTreeMetricsMap]);

  // 8 Canonical Options Drawn by the Client (Defined safely after sortedMembers)
  const adminOptionsConfig = useMemo(() => [
    {
      id: 'new-joining',
      number: 1,
      title: 'New Joining / डोनेशन',
      titleEnglish: 'New Member Registration',
      description: 'नया सदस्य पंजीकरण एवं डोनेशन संकल्प',
      icon: UserPlus,
      color: 'emerald',
      bgActive: 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-600/30 ring-2 ring-emerald-400',
      bgInactive: 'bg-white text-slate-800 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40',
      badge: 'Auto-Activate'
    },
    {
      id: 'donation-slip',
      number: 2,
      title: 'डोनेशन की स्लिप (Donation Slip)',
      titleEnglish: 'Donation Slip, ID & Certificate',
      description: 'रसीद, डिजिटल आई-कार्ड व सम्मान पत्र',
      icon: FileText,
      color: 'amber',
      bgActive: 'bg-amber-600 text-white border-amber-600 shadow-lg shadow-amber-600/30 ring-2 ring-amber-400',
      bgInactive: 'bg-white text-slate-800 border-slate-200 hover:border-amber-400 hover:bg-amber-50/40',
      badge: 'Print Ready'
    },
    {
      id: 'my-report',
      number: 3,
      title: 'My Report',
      titleEnglish: 'Members Master & Profiles',
      description: 'सदस्य मास्टर, डायरेक्टरी व टर्नओवर',
      icon: User,
      color: 'blue',
      bgActive: 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/30 ring-2 ring-blue-400',
      bgInactive: 'bg-white text-slate-800 border-slate-200 hover:border-blue-400 hover:bg-blue-50/40',
      badge: `${sortedMembers?.length || 0} Members`
    },
    {
      id: 'downline-report',
      number: 4,
      title: 'Downline Report',
      titleEnglish: 'Levels 1 to 12 Hierarchy',
      description: 'क्रमिक 12-लेवल डाउनलाइन सदस्य सूची',
      icon: Layers,
      color: 'purple',
      bgActive: 'bg-purple-700 text-white border-purple-700 shadow-lg shadow-purple-700/30 ring-2 ring-purple-400',
      bgInactive: 'bg-white text-slate-800 border-slate-200 hover:border-purple-400 hover:bg-purple-50/40',
      badge: 'L1 to L12'
    },
    {
      id: 'my-payout',
      number: 5,
      title: 'My Payout',
      titleEnglish: '12-Level Commission Table',
      description: 'लेवल 1 से 12 तक 50% वितरण तालिका',
      icon: IndianRupee,
      color: 'emerald',
      bgActive: 'bg-emerald-700 text-white border-emerald-700 shadow-lg shadow-emerald-700/30 ring-2 ring-emerald-400',
      bgInactive: 'bg-white text-slate-800 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40',
      badge: '50% Locked'
    },
    {
      id: 'paid-expense',
      number: 6,
      title: 'Paid Expense',
      titleEnglish: 'Trust & Office Expenses',
      description: 'ट्रस्ट एवं कार्यालय खर्च लेजर व शुद्ध बचत',
      icon: TrendingDown,
      color: 'rose',
      bgActive: 'bg-rose-600 text-white border-rose-600 shadow-lg shadow-rose-600/30 ring-2 ring-rose-400',
      bgInactive: 'bg-white text-slate-800 border-slate-200 hover:border-rose-400 hover:bg-rose-50/40',
      badge: 'Net Balance'
    },
    {
      id: 'paid-payout',
      number: 7,
      title: 'Paid Payout',
      titleEnglish: 'Paid vs Unpaid Commission',
      description: 'भुगतान प्राप्त एवं बकाया मानदेय लेजर',
      icon: Wallet,
      color: 'teal',
      bgActive: 'bg-teal-600 text-white border-teal-600 shadow-lg shadow-teal-600/30 ring-2 ring-teal-400',
      bgInactive: 'bg-white text-slate-800 border-slate-200 hover:border-teal-400 hover:bg-teal-50/40',
      badge: 'Payment Logs'
    },
    {
      id: 'date-by-report',
      number: 8,
      title: 'Date by Report',
      titleEnglish: 'Day-by-Day & Midnight Closing',
      description: 'दैनिक रिपोर्ट व 12:00 AM क्लोजिंग हिसाब',
      icon: Calendar,
      color: 'indigo',
      bgActive: 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/30 ring-2 ring-indigo-400',
      bgInactive: 'bg-white text-slate-800 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40',
      badge: '12:00 AM'
    }
  ], [sortedMembers]);

  // Aggregate Totals across sorted members
  const memberTotals = useMemo(() => {
    let selfBiz = 0;
    let directBiz = 0;
    let downBiz = 0;
    let totalComm = 0;
    let totalPaid = 0;
    let totalUnpaid = 0;
    let paidCount = 0;
    let unpaidCount = 0;

    // Also calculate global counts across all users
    Object.entries(users).forEach(([uid, u]) => {
      const met = memberTreeMetricsMap[uid] || { totalCommission: Number(u.totalCommission || 0) };
      const comm = Number(met.totalCommission ?? 0);
      const paid = Number(u.commissionPaid || u.totalWithdrawn || 0);
      const unpaid = Math.max(0, round2(comm - paid));
      if (u.commissionStatus === 'Paid' || (unpaid <= 0 && paid > 0 && comm > 0)) {
        paidCount++;
      } else if (unpaid > 0) {
        unpaidCount++;
      }
    });

    sortedMembers.forEach((m) => {
      const met = memberTreeMetricsMap[m.uid] || {
        selfBusiness: parseAmount(m),
        directBusiness: 0,
        downlineBusiness: 0,
        totalCommission: Number(m.totalCommission || 0)
      };
      selfBiz = round2(selfBiz + met.selfBusiness);
      directBiz = round2(directBiz + met.directBusiness);
      downBiz = round2(downBiz + met.downlineBusiness);
      totalComm = round2(totalComm + met.totalCommission);

      const mPaid = Number(m.commissionPaid || m.totalWithdrawn || 0);
      const mUnpaid = Math.max(0, round2(met.totalCommission - mPaid));
      totalPaid = round2(totalPaid + mPaid);
      totalUnpaid = round2(totalUnpaid + mUnpaid);
    });

    return {
      totalSelfBusiness: selfBiz,
      totalDirectBusiness: directBiz,
      totalDownlineBusiness: downBiz,
      totalCommission: totalComm,
      totalCommissionPaid: totalPaid,
      totalCommissionUnpaid: totalUnpaid,
      globalPaidCount: paidCount,
      globalUnpaidCount: unpaidCount
    };
  }, [sortedMembers, users, memberTreeMetricsMap]);

  const totalMembersBusiness = memberTotals.totalSelfBusiness;
  const totalMembersCommission = memberTotals.totalCommission;
  const totalCompanyCommissionPaid = memberTotals.totalCommissionPaid;
  const totalCompanyCommissionUnpaid = memberTotals.totalCommissionUnpaid;

  // Helper to extract YYYY-MM-DD (IST) from any member join timestamp
  const extractJoinDateIST = (m) => extractMemberJoinDateIST(m) || getISTDateString();

  // Day-by-Day Joining Members List (Requirement 4)
  const dayByDayMembersList = useMemo(() => {
    const list = Object.entries(users).map(([uid, u]) => ({ uid, ...u }));
    return list.map(m => {
      const joinDateStr = extractJoinDateIST(m);
      const pkg = Number(m.packageAmount || m.packageTier || m.selfBusiness || 500);
      const joinComm = calculateJoinCommission(m, users, levelRates);
      const sponsor = findParentMember(m, users);
      const sponsorIdResolved = sponsor?.memberId || m.sponsorId || 'DIRECT';
      const sponsorNameResolved = sponsor ? getMemberFullName(sponsor) : (m.sponsorName || 'Foundation Direct');

      return {
        ...m,
        joinDateStr,
        packageAmountCalculated: pkg,
        commissionGenerated: joinComm.commissionGenerated,
        netTrustShare: joinComm.netTrustShare,
        sponsorIdResolved,
        sponsorNameResolved,
        fullNameDisplay: getMemberFullName(m)
      };
    });
  }, [users, levelRates]);

  // Filtered by selected day mode
  const filteredDayMembers = useMemo(() => {
    const todayStr = getISTDateString();
    const yestDate = new Date();
    yestDate.setDate(yestDate.getDate() - 1);
    const yesterdayStr = getISTDateString(yestDate);

    let filtered = dayByDayMembersList;

    if (dayFilterMode === 'today') {
      filtered = filtered.filter(m => m.joinDateStr === todayStr);
    } else if (dayFilterMode === 'yesterday') {
      filtered = filtered.filter(m => m.joinDateStr === yesterdayStr);
    } else if (dayFilterMode === 'specific') {
      filtered = filtered.filter(m => m.joinDateStr === daySpecificDate);
    } else if (dayFilterMode === 'range') {
      filtered = filtered.filter(m => m.joinDateStr >= dayRangeStart && m.joinDateStr <= dayRangeEnd);
    }

    if (daySearchQuery.trim()) {
      const q = daySearchQuery.toLowerCase().trim();
      filtered = filtered.filter(m => 
        (m.name && m.name.toLowerCase().includes(q)) ||
        (m.memberId && m.memberId.toLowerCase().includes(q)) ||
        (m.phone && m.phone.includes(q)) ||
        (m.sponsorIdResolved && m.sponsorIdResolved.toLowerCase().includes(q))
      );
    }

    return filtered.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }, [dayByDayMembersList, dayFilterMode, daySpecificDate, dayRangeStart, dayRangeEnd, daySearchQuery]);

  // Aggregated Date-Wise Summary (Grouping by Date)
  const dateWiseSummaryGroups = useMemo(() => {
    const groups = {};
    dayByDayMembersList.forEach(m => {
      const d = m.joinDateStr || 'Earlier Records';
      if (!groups[d]) {
        groups[d] = {
          date: d,
          totalMembers: 0,
          totalPackageBusiness: 0,
          totalCommissionGenerated: 0,
          totalNetTrustShare: 0
        };
      }
      groups[d].totalMembers++;
      groups[d].totalPackageBusiness += m.packageAmountCalculated;
      groups[d].totalCommissionGenerated += m.commissionGenerated;
      groups[d].totalNetTrustShare += m.netTrustShare;
    });

    return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date));
  }, [dayByDayMembersList]);

  // Day Report Export CSV
  const handleExportDayReport = () => {
    const rows = [];
    rows.push(['UTTAM CHARITABLE WELFARE FOUNDATION - DAY-BY-DAY BUSINESS & JOINING REPORT']);
    rows.push(['Generated On (IST)', getISTDateString()]);
    rows.push(['Filter Mode', dayFilterMode.toUpperCase()]);
    rows.push([]);
    rows.push(['S.No.', 'Joining Date & Time', 'Member ID', 'Full Name', 'Password', 'Mobile No.', 'Sponsor ID', 'Sponsor Name', 'Package Amount (INR)', 'Commission Generated (INR)', 'Net Trust Share (INR)']);

    filteredDayMembers.forEach((m, idx) => {
      rows.push([
        idx + 1,
        m.createdAt || m.applicationDate || m.joinDateStr || 'N/A',
        m.memberId || 'N/A',
        m.fullNameDisplay || m.name || '',
        m.plainPassword || m.password || 'UCWF@1234',
        m.phone || '',
        m.sponsorIdResolved || m.sponsorId || '',
        m.sponsorNameResolved || '',
        m.packageAmountCalculated || 500,
        m.commissionGenerated || 0,
        m.netTrustShare || 0
      ]);
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `UCWF_Day_Report_${dayFilterMode}_${getISTDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 1-Click Recalculate & Fix All Member Balances
  const [isSyncingBalances, setIsSyncingBalances] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState('');
  const [showMemberLookupInAdmin, setShowMemberLookupInAdmin] = useState(true);
  const [showTreeChartInAdmin, setShowTreeChartInAdmin] = useState(false);

  const handleSyncAndFixBalances = () => {
    openConfirmDialog(
      'Recalculate All Balances?',
      'Are you sure you want to recalculate and fix all member commission balances in Firebase? This will overwrite any stale values with live mathematically verified downline tree totals.',
      async () => {
        setIsSyncingBalances(true);
        setSyncStatusMsg('');
        try {
          const res = await syncAndFixAllMemberBalances();
          setSyncStatusMsg(res.message);
          showToast(res.message);
          setTimeout(() => setSyncStatusMsg(''), 6000);
        } catch (err) {
          console.error('Error syncing balances:', err);
          setSyncStatusMsg('Recalculation error: ' + err.message);
          showToast('Recalculation error: ' + err.message, 'error');
        } finally {
          setIsSyncingBalances(false);
        }
      }
    );
  };

  // 1-Click Activate All Pending IDs (⚡ सभी आईडी एक्टिवेट करें)
  const [isActivatingAll, setIsActivatingAll] = useState(false);
  const [activateAllMsg, setActivateAllMsg] = useState('');
  const handleActivateAllPendingIds = () => {
    const pendingCount = Object.values(users).filter(u => u && u.status !== 'active' && u.status !== 'blocked').length;
    const totalCount = Object.keys(users).length;
    openConfirmDialog(
      'Activate All Pending IDs?',
      `⚡ सभी ${pendingCount > 0 ? pendingCount + ' पेंडिंग' : totalCount} सदस्यों की आईडी एक्टिवेट करें?\n\nयह सभी सदस्यों को status: "active", isApproved: true सेट करेगा।`,
      async () => {
        setIsActivatingAll(true);
        setActivateAllMsg('');
        try {
          const batchUpdates = {};
          let activatedCount = 0;
          Object.entries(users).forEach(([uid, u]) => {
            if (!u || u.status === 'blocked') return;
            if (u.status !== 'active' || u.isApproved !== true) {
              batchUpdates[`/users/${uid}/status`] = 'active';
              batchUpdates[`/users/${uid}/isApproved`] = true;
              batchUpdates[`/users/${uid}/paymentVerified`] = true;
              batchUpdates[`/users/${uid}/kycVerified`] = true;
              activatedCount++;
            }
          });
          if (Object.keys(batchUpdates).length > 0) {
            await update(ref(rtdb), batchUpdates);
          }
          const msg = `✅ Member ID Activated Successfully! ${activatedCount > 0 ? activatedCount + ' IDs Activated.' : 'All IDs already active.'} Total Members: ${totalCount}`;
          setActivateAllMsg(msg);
          showToast(msg);
          setTimeout(() => setActivateAllMsg(''), 6000);
        } catch (err) {
          console.error('Activate all IDs error:', err);
          setActivateAllMsg('❌ आईडी एक्टिवेट करने में त्रुटि: ' + err.message);
          showToast('आईडी एक्टिवेट करने में त्रुटि: ' + err.message, 'error');
          setTimeout(() => setActivateAllMsg(''), 6000);
        } finally {
          setIsActivatingAll(false);
        }
      }
    );
  };

  // 1-Click Activate Single Member ID (⚡ आईडी एक्टिवेट करें)
  const handleActivateSingleId = async (member) => {
    if (!member || !member.uid) return;
    const isCurrentlyActive = member.status === 'active' && member.isApproved === true;
    try {
      if (isCurrentlyActive) {
        openConfirmDialog(
          'Deactivate Member ID?',
          `सदस्य ${member.name || ''} (${member.memberId || ''}) की ID वर्तमान में Active है।\n\nक्या आप इसे Inactive / Pending करना चाहते हैं?`,
          async () => {
            try {
              await update(ref(rtdb, `users/${member.uid}`), {
                status: 'pending',
                isApproved: false
              });
              showToast(`⚠️ Member ID ${member.memberId || ''} को Pending/Inactive कर दिया गया है।`);
            } catch (err) {
              showToast('आईडी टॉगल करने में त्रुटि: ' + (err.message || 'Error'), 'error');
            }
          },
          true
        );
      } else {
        await update(ref(rtdb, `users/${member.uid}`), {
          status: 'active',
          isApproved: true,
          paymentVerified: true,
          kycVerified: true
        });
        showToast(`✅ Member ID ${member.memberId || ''} (${member.name || ''}) सफलतापूर्वक एक्टिवेट कर दी गई है!`);
      }
    } catch (err) {
      showToast('आईडी एक्टिवेट/टॉगल करने में त्रुटि: ' + (err.message || 'Error'), 'error');
    }
  };

  // Document Verification filtered list (Requirement 4)
  const docFilteredMembers = useMemo(() => {
    let list = sortedMembers;
    if (docFilter === 'VERIFIED') {
      list = list.filter(m => m.documentsVerified === true);
    } else if (docFilter === 'PENDING') {
      list = list.filter(m => !m.documentsVerified);
    }
    if (docSearch.trim()) {
      const q = docSearch.toLowerCase().trim();
      list = list.filter(m =>
        (m.name && m.name.toLowerCase().includes(q)) ||
        (m.memberId && m.memberId.toLowerCase().includes(q)) ||
        (m.phone && m.phone.includes(q))
      );
    }
    return list;
  }, [sortedMembers, docFilter, docSearch]);

  // Selected Worker & Downline Tree for Reports Tab (Requirement 5)
  const selectedWorker = useMemo(() => {
    const q = (workerSearchInput || '').trim();
    if (!q) return null;
    const cleanQ = q.toUpperCase();
    const cleanPhone = q.replace(/\D/g, '').slice(-10);
    return Object.values(users).find(u => 
      (u.memberId && u.memberId.toUpperCase() === cleanQ) ||
      (u.phone && cleanPhone && u.phone.replace(/\D/g, '').slice(-10) === cleanPhone) ||
      (u.name && u.name.toLowerCase().includes(q.toLowerCase()))
    ) || null;
  }, [workerSearchInput, users]);

  const workerDownlineResult = useMemo(() => {
    if (!selectedWorker) return { rows: [], totalMembers: 0, totalBiz: 0, totalComm: 0 };
    const normalizedRates = normalizeLevelRates(levelRates);
    const report = buildMember12LevelReport(selectedWorker, users, normalizedRates);
    let totalBiz = 0;
    let totalComm = 0;
    const rows = (report.fullDownlineList || []).map((m) => {
      const rate = Number(normalizedRates[m.level] ?? DEFAULT_LEVEL_RATES[m.level] ?? m.rate ?? 1);
      const pkg = parseAmount(m);
      const comm = round2((pkg * rate) / 100);
      totalBiz = round2(totalBiz + pkg);
      totalComm = round2(totalComm + comm);
      return {
        level: m.level,
        rate,
        member: m,
        business: pkg,
        commission: comm,
      };
    });
    return {
      rows,
      totalMembers: rows.length,
      totalBiz,
      totalComm,
    };
  }, [selectedWorker, users, levelRates]);

  // Payment Requests List (Pending first)
  const paymentRequestsList = useMemo(() => {
    return Object.values(paymentRequests).sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (b.status === 'pending' && a.status !== 'pending') return 1;
      return (b.timestamp || 0) - (a.timestamp || 0);
    });
  }, [paymentRequests]);

  // Withdrawals List (Pending first)
  const withdrawalsList = useMemo(() => {
    return Object.values(withdrawals).sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (b.status === 'pending' && a.status !== 'pending') return 1;
      return (b.timestamp || 0) - (a.timestamp || 0);
    });
  }, [withdrawals]);

  // Media Submissions List
  const mediaSubmissionsList = useMemo(() => {
    return Object.values(mediaSubmissions).sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (b.status === 'pending' && a.status !== 'pending') return 1;
      return (b.timestamp || 0) - (a.timestamp || 0);
    });
  }, [mediaSubmissions]);

  // Payout Records List (Newest first, with search)
  const payoutRecordsList = useMemo(() => {
    let list = Object.entries(payoutRecords).map(([id, rec]) => ({ id, ...rec }));
    list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    if (payoutSearch.trim()) {
      const q = payoutSearch.toLowerCase().trim();
      list = list.filter(r => 
        (r.sourceMemberName && r.sourceMemberName.toLowerCase().includes(q)) ||
        (r.sourceMemberId && r.sourceMemberId.toLowerCase().includes(q)) ||
        (r.id && r.id.toLowerCase().includes(q))
      );
    }
    return list;
  }, [payoutRecords, payoutSearch]);

  const totalDirectPaid = useMemo(() => {
    return Object.values(payoutRecords).reduce((acc, curr) => acc + Number(curr.directCommission || 0), 0);
  }, [payoutRecords]);

  const totalDownlinePaid = useMemo(() => {
    return Object.values(payoutRecords).reduce((acc, curr) => acc + Number(curr.downlineCommission || 0), 0);
  }, [payoutRecords]);

  const totalTrustShare = useMemo(() => {
    return Object.values(payoutRecords).reduce((acc, curr) => acc + Number(curr.trustShare || 0), 0);
  }, [payoutRecords]);

  const totalPackagesCollected = useMemo(() => {
    return Object.values(payoutRecords).reduce((acc, curr) => acc + Number(curr.packageAmount || 0), 0);
  }, [payoutRecords]);

  // Member-wise Commission & Payout Master Ledger Calculation
  const membersLedger = useMemo(() => {
    let list = Object.entries(users).map(([uid, u]) => {
      const met = memberTreeMetricsMap[uid] || {};
      const pkg = Number(met.selfBusiness ?? parseAmount(u));
      const selfComm = 0; // ZERO SELF COMMISSION ALWAYS
      const directComm = Number(met.directCommission ?? u.directCommission ?? u.directTeamCommission ?? 0);
      const downlineComm = Number(met.downlineCommission ?? u.downlineCommission ?? 0);
      const totalComm = Number(met.totalCommission ?? u.totalCommission ?? (directComm + downlineComm) ?? u.totalEarned ?? 0);
      const totalPaid = Number(u.commissionPaid || u.totalWithdrawn || 0);
      const netPayable = Math.max(0, round2(totalComm - totalPaid));
      const directBiz = Number(met.directBusiness ?? u.directBusiness ?? u.directTeamBusiness ?? 0);
      const downlineBiz = Number(met.downlineBusiness ?? u.downlineBusiness ?? 0);
      const teamBiz = round2(directBiz + downlineBiz);

      return {
        uid,
        ...u,
        packageAmount: pkg,
        walletBalance: netPayable,
        selfBusiness: pkg,
        selfBusinessCommission: selfComm,
        directCommission: directComm,
        downlineCommission: downlineComm,
        totalCommission: totalComm,
        totalWithdrawn: totalPaid,
        netPayable,
        directBusiness: directBiz,
        downlineBusiness: downlineBiz,
        teamBusiness: teamBiz
      };
    });

    if (ledgerFilter === 'PAYABLE') {
      list = list.filter(m => m.netPayable > 0);
    } else if (ledgerFilter === 'SETTLED') {
      list = list.filter(m => m.netPayable <= 0 && m.totalCommission > 0);
    }

    if (ledgerSearch.trim()) {
      const q = ledgerSearch.toLowerCase().trim();
      list = list.filter(m => 
        (m.name && m.name.toLowerCase().includes(q)) ||
        (m.memberId && m.memberId.toLowerCase().includes(q)) ||
        (m.phone && m.phone.includes(q)) ||
        (m.sponsorId && m.sponsorId.toLowerCase().includes(q))
      );
    }

    return list.sort((a, b) => (b.netPayable - a.netPayable) || (b.totalCommission - a.totalCommission));
  }, [users, memberTreeMetricsMap, ledgerFilter, ledgerSearch]);

  const ledgerTotals = useMemo(() => {
    let totalComm = 0;
    let totalPaid = 0;
    let totalPayable = 0;
    let totalTeamBiz = 0;

    Object.entries(users).forEach(([uid, u]) => {
      if (!u) return;
      const met = memberTreeMetricsMap[uid] || {};
      const directComm = Number(met.directCommission ?? u.directCommission ?? u.directTeamCommission ?? 0);
      const downlineComm = Number(met.downlineCommission ?? u.downlineCommission ?? 0);
      const memberTotalComm = Number(met.totalCommission ?? u.totalCommission ?? (directComm + downlineComm) ?? u.totalEarned ?? 0);
      const memberPaid = Number(u.commissionPaid || u.totalWithdrawn || 0);
      const memberPayable = Math.max(0, round2(memberTotalComm - memberPaid));
      const directBiz = Number(met.directBusiness ?? u.directBusiness ?? 0);
      const downlineBiz = Number(met.downlineBusiness ?? u.downlineBusiness ?? 0);
      const teamBiz = round2(directBiz + downlineBiz);

      totalComm = round2(totalComm + memberTotalComm);
      totalPaid = round2(totalPaid + memberPaid);
      totalPayable = round2(totalPayable + memberPayable);
      totalTeamBiz = round2(totalTeamBiz + teamBiz);
    });

    return { totalComm, totalPaid, totalPayable, totalTeamBiz };
  }, [users, memberTreeMetricsMap]);

  // Instant Cash Payout to a Member from Commission Ledger
  const handlePayMemberInstantCash = (member) => {
    const payAmt = Number(member.netPayable || member.walletBalance || 0);
    if (payAmt <= 0) {
      showToast('इस सदस्य का कोई देय पेआउट (Wallet Balance) शेष नहीं है।', 'error');
      return;
    }

    const confirmMsg = `क्या आप सदस्य ${member.salutation || ''} ${member.name} (${member.memberId || 'N/A'}) को उनके अर्जित कमीशन में से ₹${payAmt} का "नकद पेआउट (Cash Payout Handover)" देना चाहते हैं?\n\n- सदस्य वॉलेट: ₹0 हो जाएगा\n- कुल भुगतान (Paid Out): ₹${(Number(member.totalWithdrawn || 0) + payAmt)} दर्ज होगा`;

    openConfirmDialog('Confirm Cash Payout?', confirmMsg, async () => {
      try {
        const updates = {};
        const currentWithdrawn = Number(member.commissionPaid || member.totalWithdrawn || 0);
        const nowTimestamp = Date.now();
        const nowIso = new Date().toISOString();

        updates[`/users/${member.uid}/walletBalance`] = 0;
        updates[`/users/${member.uid}/totalWithdrawn`] = round2(currentWithdrawn + payAmt);
        updates[`/users/${member.uid}/commissionPaid`] = round2(currentWithdrawn + payAmt);
        updates[`/users/${member.uid}/commissionUnpaid`] = 0;
        updates[`/users/${member.uid}/commissionStatus`] = 'Paid';

        // Log transaction
        const newTxRef = push(ref(rtdb, 'transactions'));
        updates[`/transactions/${newTxRef.key}`] = {
          id: newTxRef.key,
          userId: member.uid,
          memberId: member.memberId || 'N/A',
          amount: payAmt,
          type: 'withdrawal_cash',
          note: `कार्यालय द्वारा नकद पेआउट भुगतान (Cash Payout Handover) - रसीद सं. ${newTxRef.key.slice(-6).toUpperCase()}`,
          status: 'completed',
          timestamp: nowTimestamp,
          paidAt: nowIso
        };

        // Also create record in withdrawals table as completed cash payout
        const newWithdrawalRef = push(ref(rtdb, 'withdrawals'));
        updates[`/withdrawals/${newWithdrawalRef.key}`] = {
          id: newWithdrawalRef.key,
          userId: member.uid,
          userName: `${member.salutation || ''} ${member.name}`.trim(),
          memberId: member.memberId || 'N/A',
          amount: payAmt,
          paymentMode: 'cash',
          status: 'approved',
          paidMode: 'Cash / Manual',
          paidAt: nowIso,
          adminNote: 'व्यवस्थापक द्वारा कमीशन लेजर से सीधा नकद पेआउट भुगतान',
          timestamp: nowTimestamp
        };

        await update(ref(rtdb), updates);
        showToast(`सफलतापूर्वक भुगतान दर्ज! ${member.name} (${member.memberId}) - ₹${payAmt} नकद पेआउट पूर्ण।`);
      } catch (err) {
        console.error('Instant payout error:', err);
        showToast('पेआउट दर्ज करने में त्रुटि: ' + err.message, 'error');
      }
    });
  };

  // Handle Copy to clipboard
  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Toggle Password visibility
  const togglePasswordVisibility = (uid) => {
    setVisiblePasswords(prev => ({ ...prev, [uid]: !prev[uid] }));
  };

  // 1-Click WhatsApp Credentials Dispatch
  const sendWhatsAppCredentials = (member) => {
    const cleanPhone = (member.phone || '').replace(/\D/g, '').slice(-10);
    if (!cleanPhone) {
      showToast('सदस्य का मोबाइल नंबर उपलब्ध नहीं है!', 'error');
      return;
    }

    const portalUrl = window.location.origin + '/login';
    const message = `*उत्तम चैरिटेबल वेलफेयर फाउंडेशन (Regd. Section 8 Act 2013)*\n\nआदरणीय ${member.salutation || ''} ${member.name || ''} जी,\n\nफाउंडेशन परिवार में आपका स्वागत है। आपके आधिकारिक सदस्य खाते का विवरण निम्नवत है:\n\n👤 *Member ID:* ${member.memberId || 'N/A'}\n📧 *Email:* ${member.email || 'N/A'}\n🔑 *Password:* ${member.password || 'N/A'}\n📦 *Package:* ₹${member.packageAmount || 0} (${member.packageName || 'सहयोग संकल्प'})\n\n🌐 *लॉगिन पोर्टल लिंक:*\n${portalUrl}\n\nकृपया अपने खाते में लॉगिन करके अपना आधिकारिक पहचान पत्र (I-Card) एवं प्रशस्ति पत्र प्राप्त करें।\n\nसबका साथ • सबका विकास • सबका कल्याण 🇮🇳`;

    const waUrl = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`;
    const link = document.createElement('a');
    link.href = waUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Save Manual Level Rates (1 to 12) + Self Business Rate to Firebase
  const handleSaveLevelRates = async (e) => {
    if (e) e.preventDefault();
    setIsSavingRates(true);
    setSaveRatesSuccess(false);
    try {
      await saveLevelRates(levelRates);
      await saveSelfBusinessRate(Number(selfBusinessRate || 0));
      setSaveRatesSuccess(true);
      setTimeout(() => setSaveRatesSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save level rates:', err);
      showToast('दरें सुरक्षित करने में त्रुटि: ' + err.message, 'error');
    } finally {
      setIsSavingRates(false);
    }
  };

  // 1-Click Manual Daily Closing Trigger for Admin Testing
  const handleRunManualClosing = async () => {
    setIsRunningClosing(true);
    setClosingSuccessMsg('');
    try {
      const res = await runDailyClosing();
      setClosingSuccessMsg(`दैनिक क्लोजिंग (${res.closingDate}) सफलतापूर्वक जनरेट हो गई! कुल सदस्य: ${res.count}`);
      showToast(`दैनिक क्लोजिंग (${res.closingDate}) जनरेट हो गई! कुल सदस्य: ${res.count}`);
      setTimeout(() => setClosingSuccessMsg(''), 6000);
    } catch (err) {
      console.error('Manual closing error:', err);
      showToast('दैनिक क्लोजिंग जनरेट करने में त्रुटि: ' + err.message, 'error');
    } finally {
      setIsRunningClosing(false);
    }
  };

  // 1-Click Clean & Reset Software Test Data (Already inside Reset Confirmation Modal)
  const handleExecuteCleanReset = async () => {
    setIsResettingData(true);
    try {
      await cleanAndResetTestData();
      setShowResetConfirmModal(false);
      setResetInputText('');
      showToast('✅ सॉफ्टवेयर का समस्त टेस्ट डेटा सफलतापूर्वक क्लीन व रीसेट हो गया है!');
    } catch (err) {
      console.error('Clean reset error:', err);
      showToast('डेटा रीसेट करने में त्रुटि: ' + (err.message || 'त्रुटि'), 'error');
    } finally {
      setIsResettingData(false);
    }
  };

  // Open 100% Manual Commission Modal (Level 1 to 12)
  const handleOpenManualCommissionModal = async (item, type = 'payment') => {
    const memberName = type === 'payment' 
      ? (item.userName || item.name || 'सदस्य') 
      : `${item.salutation || ''} ${item.name || 'सदस्य'}`.trim();
    const memberId = item.memberId || '';
    const userId = item.userId || item.uid || '';
    const pkgAmount = Number(item.amount || item.packageAmount || 500);
    const sponsorId = item.sponsorId || 'DIRECT';

    setManualCommissionModal({
      isOpen: true,
      type,
      sourceItem: item,
      amount: pkgAmount,
      memberName,
      memberId,
      sponsorId,
      uplineChain: [],
      loadingChain: true,
      distributionRows: []
    });

    try {
      const chain = await getUplineChain(memberId || userId);
      const chainMap = {};
      chain.forEach(node => {
        chainMap[node.level] = node;
      });

      // Prepare Level 1 to 12 manual distribution rows
      const rows = [];
      for (let lvl = 1; lvl <= 12; lvl++) {
        const upline = chainMap[lvl];
        const defaultPct = Number(levelRates[lvl] ?? DEFAULT_LEVEL_RATES[lvl] ?? 0);
        const defaultAmt = upline ? round2((pkgAmount * defaultPct) / 100) : 0;

        rows.push({
          level: lvl,
          uid: upline ? upline.uid : '',
          memberId: upline ? upline.memberId : '',
          name: upline ? upline.name : 'कोई अपलाइन नहीं (End of Chain)',
          phone: upline ? upline.phone : '',
          walletBalance: upline ? upline.walletBalance : 0,
          percentage: defaultPct,
          amount: defaultAmt,
          enabled: !!upline
        });
      }

      setManualCommissionModal(prev => ({
        ...prev,
        uplineChain: chain,
        loadingChain: false,
        distributionRows: rows
      }));
    } catch (err) {
      console.error('Failed to load upline chain:', err);
      showToast('अपलाइन सूची लोड करने में त्रुटि: ' + err.message, 'error');
      setManualCommissionModal(prev => ({ ...prev, loadingChain: false }));
    }
  };

  // Handle Manual Commission Field Changes (% or ₹)
  const handleCommissionRowChange = (level, field, value) => {
    setManualCommissionModal(prev => {
      const updatedRows = prev.distributionRows.map(row => {
        if (row.level !== level) return row;

        if (field === 'percentage') {
          const newPct = parseFloat(value) || 0;
          const newAmt = round2((prev.amount * newPct) / 100);
          return { ...row, percentage: value, amount: newAmt };
        } else if (field === 'amount') {
          const newAmt = parseFloat(value) || 0;
          const newPct = prev.amount > 0 ? Number(((newAmt / prev.amount) * 100).toFixed(2)) : 0;
          return { ...row, amount: value, percentage: newPct };
        } else if (field === 'enabled') {
          return { ...row, enabled: value };
        }
        return row;
      });

      return { ...prev, distributionRows: updatedRows };
    });
  };

  // Execute 100% Manual Commission Distribution & Confirmation
  const handleExecuteManualCommission = async () => {
    const { sourceItem, type, amount, distributionRows, memberName, memberId } = manualCommissionModal;
    setIsDistributingManual(true);

    try {
      const sourceMember = {
        uid: sourceItem.userId || sourceItem.uid,
        memberId: sourceItem.memberId || memberId,
        name: memberName,
        salutation: sourceItem.salutation || ''
      };

      // Filter rows that are enabled and have positive amount
      const activeDistributions = distributionRows.filter(r => r.enabled && r.uid && Number(r.amount) > 0);

      // Execute manual distribution strictly with admin-entered figures
      const result = await distributeManualCommission({
        sourceMember,
        packageAmount: amount,
        manualDistributions: activeDistributions
      });

      // Update payment request status if triggered from payments tab
      if (type === 'payment' && sourceItem.id) {
        await update(ref(rtdb, `payment_requests/${sourceItem.id}`), {
          status: 'approved',
          approvedAt: new Date().toISOString(),
          manualCommissionPaid: result.totalDistributed || 0
        });

        if (sourceItem.userId) {
          await update(ref(rtdb, `users/${sourceItem.userId}`), {
            status: 'active',
            activatedAt: new Date().toISOString()
          });
        }
      } else if (type === 'member' && sourceItem.uid) {
        await update(ref(rtdb, `users/${sourceItem.uid}`), {
          status: 'active',
          activatedAt: new Date().toISOString()
        });
      }

      showToast(`सफलतापूर्वक मानदेय वितरित किया गया! कुल स्तर: ${result.count || 0}, कुल क्रेडिट: ₹${result.totalDistributed || 0}`);
      setManualCommissionModal(prev => ({ ...prev, isOpen: false }));
    } catch (err) {
      console.error('Manual commission execution error:', err);
      showToast('मानदेय वितरण में त्रुटि: ' + (err.message || 'त्रुटि'), 'error');
    } finally {
      setIsDistributingManual(false);
    }
  };

  // Redirect handleApprovePayment to Manual Commission Table (No automatic background distribution)
  const handleApprovePayment = (payment) => {
    handleOpenManualCommissionModal(payment, 'payment');
  };

  // Reject Payment Request
  const handleRejectPayment = (payment) => {
    openPromptDialog(
      'भुगतान अस्वीकृत करें',
      'अस्वीकृति का कारण लिखें (उदा. अमान्य UTR):',
      'अमान्य UTR / भुगतान प्राप्त नहीं हुआ',
      async (reason) => {
        if (!reason) return;
        try {
          await update(ref(rtdb, `payment_requests/${payment.id}`), {
            status: 'rejected',
            rejectReason: reason,
            rejectedAt: new Date().toISOString()
          });
          showToast('भुगतान अनुरोध अस्वीकृत किया गया।');
        } catch (err) {
          console.error(err);
          showToast('त्रुटि: ' + err.message, 'error');
        }
      }
    );
  };

  // Approve Withdrawal Request (Supports Cash / Offline Handover or Online)
  const handleApproveWithdrawal = (withdrawal, mode = 'cash') => {
    const isCash = mode === 'cash';
    const confirmMsg = isCash
      ? `क्या आप सदस्य ${withdrawal.userName || 'सदस्य'} (${withdrawal.memberId || ''}) को ₹${withdrawal.amount} का "नकद भुगतान (Cash / Manual Paid)" स्वीकृत करना चाहते हैं?`
      : `क्या आप सदस्य ${withdrawal.userName || 'सदस्य'} (${withdrawal.memberId || ''}) को ₹${withdrawal.amount} का "ऑनलाइन बैंक/UPI ट्रांसफर" स्वीकृत करना चाहते हैं?`;

    openConfirmDialog('निकासी स्वीकृति पुष्टि', confirmMsg, async () => {
      try {
        await update(ref(rtdb, `withdrawals/${withdrawal.id}`), {
          status: 'approved',
          paidMode: isCash ? 'Cash / Manual' : 'Online / Bank',
          paidAt: new Date().toISOString(),
          adminNote: isCash ? 'ट्रस्ट कार्यालय द्वारा नकद भुगतान संपन्न' : 'ऑनलाइन बैंक/UPI ट्रांसफर संपन्न'
        });
        showToast(`निकासी सफलतापूर्वक स्वीकृत (${isCash ? 'नकद भुगतान' : 'ऑनलाइन ट्रांसफर'}) चिह्नित की गई!`);
      } catch (err) {
        showToast('त्रुटि: ' + err.message, 'error');
      }
    });
  };

  // Mark Cash Payout Paid for Member in Daily Closing
  const handleMarkCashPayoutPaid = (st, activeDate) => {
    const paidAmt = Number(st.walletBalance || st.totalCommission || 0);
    if (!st.uid || paidAmt <= 0) {
      showToast('निकासी योग्य राशि उपलब्ध नहीं है।', 'error');
      return;
    }

    openConfirmDialog(
      'Cash Paid Confirmation?',
      `क्या आप सदस्य ${st.name} (${st.memberId}) को ₹${paidAmt} का "नकद पेआउट (Cash Paid)" चिह्नित करना चाहते हैं?`,
      async () => {
        try {
          const updates = {};
          const currentWithdrawn = Number(users[st.uid]?.totalWithdrawn || 0);
          updates[`/users/${st.uid}/walletBalance`] = 0;
          updates[`/users/${st.uid}/totalWithdrawn`] = currentWithdrawn + paidAmt;
          updates[`/daily_closings/${activeDate}/statements/${st.uid}/payoutStatus`] = 'Paid';
          updates[`/daily_closings/${activeDate}/statements/${st.uid}/payoutMethod`] = 'Cash / Manual';
          updates[`/daily_closings/${activeDate}/statements/${st.uid}/paidAt`] = new Date().toISOString();

          const newTxRef = push(ref(rtdb, 'transactions'));
          updates[`/transactions/${newTxRef.key}`] = {
            id: newTxRef.key,
            userId: st.uid,
            memberId: st.memberId,
            amount: paidAmt,
            type: 'withdrawal_cash',
            note: `दैनिक क्लोजिंग (${activeDate}) नकद पेआउट भुगतान (Cash Paid)`,
            status: 'completed',
            timestamp: Date.now()
          };

          await update(ref(rtdb), updates);
          showToast(`सदस्य ${st.name} को ₹${paidAmt} का नकद पेआउट सफलतापूर्वक 'Paid' चिह्नित किया गया!`);
        } catch (err) {
          showToast('त्रुटि: ' + err.message, 'error');
        }
      }
    );
  };

  // Reject Withdrawal Request (Refunds member's walletBalance)
  const handleRejectWithdrawal = (withdrawal) => {
    openPromptDialog(
      'निकासी अस्वीकार करें',
      'निकासी अस्वीकार करने का कारण लिखें:',
      'बैंक विवरण में त्रुटि',
      async (reason) => {
        if (!reason) return;
        try {
          const currentBal = (users[withdrawal.userId]?.walletBalance || 0);
          const refundedBal = currentBal + Number(withdrawal.amount || 0);

          const updates = {};
          updates[`/withdrawals/${withdrawal.id}/status`] = 'rejected';
          updates[`/withdrawals/${withdrawal.id}/rejectReason`] = reason;
          updates[`/withdrawals/${withdrawal.id}/rejectedAt`] = new Date().toISOString();
          updates[`/users/${withdrawal.userId}/walletBalance`] = refundedBal;

          await update(ref(rtdb), updates);
          showToast(`निकासी अस्वीकृत की गई एवं सदस्य के वॉलेट में ₹${withdrawal.amount} वापस जमा कर दिए गए।`);
        } catch (err) {
          showToast('त्रुटि: ' + err.message, 'error');
        }
      }
    );
  };

  // Approve Media Submission
  const handleApproveMedia = async (media) => {
    try {
      await update(ref(rtdb, `media_submissions/${media.id}`), {
        status: 'approved',
        approvedAt: new Date().toISOString()
      });
      showToast('मीडिया स्वीकृत किया गया।');
    } catch (err) {
      showToast('त्रुटि: ' + err.message, 'error');
    }
  };

  // Reject Media Submission
  const handleRejectMedia = async (media) => {
    try {
      await update(ref(rtdb, `media_submissions/${media.id}`), {
        status: 'rejected',
        rejectedAt: new Date().toISOString()
      });
      showToast('मीडिया अस्वीकृत किया गया।');
    } catch (err) {
      showToast('त्रुटि: ' + err.message, 'error');
    }
  };

  // Delete Media Submission
  const handleDeleteMedia = (mediaId) => {
    openConfirmDialog(
      'मीडिया हटाएं?',
      'क्या आप इस मीडिया को हटाना चाहते हैं?',
      async () => {
        try {
          await remove(ref(rtdb, `media_submissions/${mediaId}`));
          showToast('मीडिया सफलतापूर्वक हटा दिया गया।');
        } catch (err) {
          showToast('त्रुटि: ' + err.message, 'error');
        }
      },
      true
    );
  };

  // =========================================================================
  // VIDEO & POSTER MANAGER HANDLERS (Requirement 2 & 3)
  // =========================================================================
  // 1. Add / Upload Video
  const handleAddVideo = async (e) => {
    e.preventDefault();
    setVideoError('');
    setVideoSuccess('');

    let finalUrl = videoUrl.trim();
    if (!finalUrl && !videoFile) {
      setVideoError('कृपया वीडियो फ़ाइल चुनें अथवा डायरेक्ट वीडियो / YouTube लिंक दर्ज करें।');
      return;
    }

    setVideoUploading(true);
    try {
      if (videoFile) {
        const uploadRes = await uploadToCloudinary(videoFile, 'videos');
        finalUrl = uploadRes.secure_url || uploadRes.url;
      }

      const newVideoRef = push(ref(rtdb, 'media_gallery/videos'));
      const videoData = {
        id: newVideoRef.key,
        url: finalUrl,
        title: videoTitle.trim() || 'संस्था विशेष वीडियो',
        category: videoCategory,
        featured: videoFeatured,
        active: true,
        createdAt: Date.now(),
      };

      // If set as featured, clear others
      if (videoFeatured) {
        for (const v of videosList) {
          if (v.featured) {
            await update(ref(rtdb, `media_gallery/videos/${v.id}`), { featured: false });
          }
        }
      }

      await set(newVideoRef, videoData);

      setVideoFile(null);
      setVideoUrl('');
      setVideoTitle('');
      setVideoFeatured(false);
      setVideoSuccess('वीडियो सफलतापूर्वक अपलोड एवं वेबसाइट पर सक्रिय हो गया!');
      setTimeout(() => setVideoSuccess(''), 4000);
    } catch (err) {
      console.error('Failed to upload video:', err);
      setVideoError('वीडियो अपलोड करने में त्रुटि: ' + (err.message || 'Error'));
    } finally {
      setVideoUploading(false);
    }
  };

  // 2. Toggle Video Active
  const handleToggleVideoActive = async (video) => {
    try {
      await update(ref(rtdb, `media_gallery/videos/${video.id}`), {
        active: !video.active,
      });
    } catch (err) {
      showToast('अपडेट विफल: ' + err.message, 'error');
    }
  };

  // 3. Set Video as Primary Featured
  const handleSetFeaturedVideo = async (video) => {
    try {
      for (const v of videosList) {
        if (v.id !== video.id && v.featured) {
          await update(ref(rtdb, `media_gallery/videos/${v.id}`), { featured: false });
        }
      }
      await update(ref(rtdb, `media_gallery/videos/${video.id}`), { featured: true, active: true });
    } catch (err) {
      showToast('Featured सेट विफल: ' + err.message, 'error');
    }
  };

  // 4. Delete Video
  const handleDeleteVideo = (videoId) => {
    openConfirmDialog(
      'वीडियो हटाएं?',
      'क्या आप निश्चित रूप से इस वीडियो को हटाना चाहते हैं?',
      async () => {
        try {
          await remove(ref(rtdb, `media_gallery/videos/${videoId}`));
          showToast('वीडियो हटा दिया गया।');
        } catch (err) {
          showToast('हटाने में त्रुटि: ' + err.message, 'error');
        }
      },
      true
    );
  };

  // 5. Add / Upload Poster
  const handleAddPoster = async (e) => {
    e.preventDefault();
    setPosterError('');
    setPosterSuccess('');

    let finalUrl = posterUrl.trim();
    if (!finalUrl && !posterFile) {
      setPosterError('कृपया पोस्टर इमेज चुनें अथवा इमेज URL दर्ज करें।');
      return;
    }

    setPosterUploading(true);
    try {
      if (posterFile) {
        const uploadRes = await uploadToCloudinary(posterFile, 'posters');
        finalUrl = uploadRes.secure_url || uploadRes.url;
      }

      const newPosterRef = push(ref(rtdb, 'media_gallery/posters'));
      const posterData = {
        id: newPosterRef.key,
        imageUrl: finalUrl,
        title: posterTitle.trim(),
        message: posterMessage.trim(),
        slot: posterSlot,
        link: posterLink.trim(),
        active: true,
        createdAt: Date.now(),
      };

      await set(newPosterRef, posterData);

      setPosterFile(null);
      setPosterUrl('');
      setPosterTitle('');
      setPosterMessage('');
      setPosterLink('');
      setPosterSuccess('पोस्टर सफलतापूर्वक अपलोड एवं चयनित स्लॉट पर लाइव हो गया!');
      setTimeout(() => setPosterSuccess(''), 4000);
    } catch (err) {
      console.error('Failed to upload poster:', err);
      setPosterError('पोस्टर अपलोड करने में त्रुटि: ' + (err.message || 'Error'));
    } finally {
      setPosterUploading(false);
    }
  };

  // 6. Toggle Poster Active
  const handleTogglePosterActive = async (poster) => {
    try {
      await update(ref(rtdb, `media_gallery/posters/${poster.id}`), {
        active: !poster.active,
      });
    } catch (err) {
      showToast('अपडेट विफल: ' + err.message, 'error');
    }
  };

  // 7. Delete Poster
  const handleDeletePoster = (posterId) => {
    openConfirmDialog(
      'पोस्टर हटाएं?',
      'क्या आप निश्चित रूप से इस पोस्टर को हटाना चाहते हैं?',
      async () => {
        try {
          await remove(ref(rtdb, `media_gallery/posters/${posterId}`));
          showToast('पोस्टर हटा दिया गया।');
        } catch (err) {
          showToast('हटाने में त्रुटि: ' + err.message, 'error');
        }
      },
      true
    );
  };

  // Save Member Details from Modal
  const handleSaveMemberEdit = async (e) => {
    e.preventDefault();
    if (!editingMember) return;

    try {
      await update(ref(rtdb, `users/${editingMember.uid}`), {
        salutation: editingMember.salutation || 'श्री',
        name: editingMember.name || editName,
        displayName: `${editingMember.salutation || 'श्री'} ${editingMember.name || editName}`.trim(),
        fatherName: editingMember.fatherName || editingMember.fatherOrSpouseName || editFather || '',
        fatherOrSpouseName: editingMember.fatherName || editingMember.fatherOrSpouseName || editFather || '',
        motherName: editingMember.motherName || editMother || '',
        padNaam: editingMember.padNaam || editingMember.designation || editDesignation || 'कार्यकारिणी सदस्य',
        designation: editingMember.padNaam || editingMember.designation || editDesignation || 'कार्यकारिणी सदस्य',
        email: editingMember.email || editEmail,
        phone: editingMember.phone || editPhone,
        password: editingMember.password || editPassword,
        sponsorId: editingMember.sponsorId || editSponsorId || 'DIRECT',
        status: editingMember.status || editStatus,
        packageAmount: Number(editingMember.packageAmount || 0),
        packageName: editingMember.packageName || '',
        city: editingMember.city || editCity || '',
        state: editingMember.state || '',
        address: editingMember.address || editAddress || editingMember.city || '',
        walletBalance: Number(editingMember.walletBalance || 0),
        selfBusiness: Number(editingMember.selfBusiness ?? editingMember.packageAmount ?? 0),
        teamBusiness: Number(editingMember.teamBusiness ?? 0),
        downlineBusiness: Number(editingMember.downlineBusiness ?? 0),
        directTeamCommission: Number(editingMember.directTeamCommission ?? 0),
        selfBusinessCommission: Number(editingMember.selfBusinessCommission ?? 0),
        downlineCommission: Number(editingMember.downlineCommission ?? 0),
        totalCommission: Number(editingMember.totalCommission ?? 0)
      });
      showToast('सदस्य की जानकारी सफलतापूर्वक अपडेट हो गई!');
      setEditingMember(null);
    } catch (err) {
      showToast('अपडेट में त्रुटि: ' + err.message, 'error');
    }
  };

  // Add Charity Spend
  const handleAddCharitySpend = async (e) => {
    e.preventDefault();
    if (!spendTitle.trim() || !spendAmount) return;

    try {
      const spendsRef = ref(rtdb, 'spends');
      const newRef = push(spendsRef);
      await set(newRef, {
        id: newRef.key,
        title: spendTitle.trim(),
        amount: parseFloat(spendAmount),
        category: spendCategory,
        beneficiaries: spendBeneficiaries.trim(),
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        timestamp: Date.now()
      });

      showToast('व्यय सफलतापूर्वक दर्ज हुआ! होमपेज पर कुल सेवा व्यय तुरंत अपडेट हो गया है।');
      setSpendTitle('');
      setSpendAmount('');
      setSpendBeneficiaries('');
    } catch (err) {
      showToast('व्यय जोड़ने में त्रुटि: ' + err.message, 'error');
    }
  };

  // Delete Spend
  const handleDeleteSpend = (id) => {
    openConfirmDialog(
      'व्यय रिकॉर्ड हटाएं?',
      'क्या आप इस व्यय रिकॉर्ड को हटाना चाहते हैं?',
      async () => {
        try {
          await remove(ref(rtdb, `spends/${id}`));
          showToast('व्यय रिकॉर्ड हटाया गया।');
        } catch (err) {
          showToast('त्रुटि: ' + err.message, 'error');
        }
      },
      true
    );
  };

  return (
    <div className="min-h-screen bg-pink-50/50 text-slate-900 py-6 sm:py-8 px-3 sm:px-6 lg:px-8 font-sans w-full max-w-full overflow-x-hidden">
      <div className="max-w-7xl mx-auto space-y-6 w-full max-w-full">
        
        {/* TOP ADMIN HEADER (Plain White / Soft Light Pink Theme & 100% English Labels) */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-pink-200/80 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-pink-100 border border-pink-200 text-pink-700 rounded-2xl">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-slate-900">Super Admin Control Center</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-800 text-xs font-mono font-bold border border-pink-200">
                  MASTER PORTAL
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {safeText(FOUNDATION_DETAILS.nameEnglish)} • 100% Real-Time Live Database Control
              </p>
            </div>
          </div>

          {/* Action Toolbar & Countdown Badge */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Live Midnight Countdown Timer */}
            <MidnightCountdownBadge onMidnightTrigger={() => {}} />

            {/* 1-Click Diwali Festival Theme Toggle (Requirement 1) */}
            <button
              type="button"
              onClick={toggleDiwaliTheme}
              className={`px-3.5 py-2 rounded-2xl font-black text-xs shadow-md border transition flex items-center gap-1.5 active:scale-95 cursor-pointer ${
                isDiwaliActive
                  ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-amber-500 text-slate-950 border-amber-300 shadow-amber-500/30 ring-2 ring-amber-300'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
              }`}
              title="Toggle Diwali Festive Theme On / Off"
            >
              <GlowingDiya size="xs" />
              <span>🪔 Diwali Theme: {isDiwaliActive ? 'ON' : 'OFF'}</span>
            </button>

            {/* 1-Click Manual Daily Closing Trigger */}
            <button
              type="button"
              onClick={handleRunManualClosing}
              disabled={isRunningClosing}
              className="px-4 py-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs shadow-md shadow-emerald-700/20 border border-white/20 transition flex items-center gap-1.5 active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Execute 12:00 AM Daily Closing Statement"
            >
              {isRunningClosing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating Closing...</span>
                </>
              ) : (
                <>
                  <Clock className="w-3.5 h-3.5 text-emerald-200" />
                  <span>Run Daily Closing Now</span>
                </>
              )}
            </button>

            {/* ⚡ Activate All Pending IDs (सभी आईडी एक्टिवेट करें) */}
            <button
              type="button"
              onClick={handleActivateAllPendingIds}
              disabled={isActivatingAll}
              className="px-4 py-2 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white font-black text-xs shadow-md shadow-green-700/20 border border-white/20 transition flex items-center gap-1.5 active:scale-95 disabled:opacity-60 cursor-pointer"
              title="⚡ Activate All Pending IDs — सभी सदस्यों की आईडी एक्टिवेट करें"
            >
              {isActivatingAll ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Activating...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 text-yellow-300" />
                  <span>⚡ Activate All IDs</span>
                </>
              )}
            </button>

            {/* 1-Click Clean / Reset Software Test Data */}
            <button
              type="button"
              onClick={() => setShowResetConfirmModal(true)}
              className="px-4 py-2 rounded-2xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white font-black text-xs shadow-md shadow-red-700/20 border border-white/20 transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
              title="Reset Test Data"
            >
              <Trash2 className="w-3.5 h-3.5 text-white" />
              <span>Reset Test Data</span>
            </button>

            {/* Admin Logout */}
            <button
              type="button"
              onClick={async () => {
                await logout();
                navigate('/admin-login', { replace: true });
              }}
              className="px-3.5 py-2 rounded-2xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 text-slate-700 font-bold text-xs border border-slate-200 transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
              title="Logout from Admin Panel"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-500 hover:text-rose-600" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Global Closing Success Alert */}
        {closingSuccessMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{safeText(closingSuccessMsg)}</span>
          </div>
        )}

        {/* ⚡ Activate All IDs Success / Error Toast Banner */}
        {activateAllMsg && (
          <div className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 border ${
            activateAllMsg.startsWith('❌')
              ? 'bg-rose-50 border-rose-300 text-rose-800'
              : 'bg-green-50 border-green-400 text-green-900'
          }`}>
            {activateAllMsg.startsWith('❌') ? (
              <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
            )}
            <span>{safeText(activateAllMsg)}</span>
          </div>
        )}

        {/* Festive Diwali Greeting Banner in Admin Panel */}
        {isDiwaliActive && <DiwaliBanner compact={true} className="mb-2" />}

        {/* =========================================================================
            8 PRIMARY OPTIONS DRAWN BY THE CLIENT (Boxes / Cards Grid)
            Drawn on the layout paper:
            1. New Joining / डोनेशन
            2. डोनेशन की स्लिप (Donation Slip)
            3. My Report
            4. Downline Report
            5. My Payout
            6. Paid Expense
            7. Paid Payout
            8. Date by Report
           ========================================================================= */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
            <div>
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span>एडमिन मुख्य विकल्प (Select Option)</span>
                <span className="px-2 py-0.5 rounded-full bg-pink-100 text-pink-800 text-[11px] font-mono font-bold">
                  8 Options
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                क्लाइंट द्वारा निर्धारित 8 मुख्य विकल्प — किसी पर भी क्लिक करके विवरण देखें अथवा प्रबंधित करें।
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('video-posters')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'video-posters' || activeTab === 'media'
                    ? 'bg-amber-600 text-white border-amber-700 shadow-sm'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
                title="Continuous Autoplay Videos & Website Posters Manager"
              >
                <Film className="w-3.5 h-3.5" />
                <span>🎬 Video & Poster Manager</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'settings'
                    ? 'bg-slate-900 text-white border-slate-950 shadow-sm'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
                title="System Settings, Video/Poster Media & Reset"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>⚙️ System Settings</span>
              </button>
            </div>
          </div>

          {/* 8 Clean Prominent Cards Grid (4 columns on desktop, 2 on mobile) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {adminOptionsConfig.map((opt) => {
              const IconComponent = opt.icon;
              const isActive = activeTab === opt.id || 
                (opt.id === 'my-report' && activeTab === 'members') ||
                (opt.id === 'my-payout' && activeTab === 'payouts') ||
                (opt.id === 'date-by-report' && (activeTab === 'day-by-day' || activeTab === 'closings'));

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setActiveTab(opt.id)}
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
                    <p className={`text-[11px] font-medium mt-0.5 line-clamp-1 ${
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
            RENDER THE SELECTED OPTION CONTENT
           ========================================================================= */}
        {/* OPTION 1: NEW JOINING / डोनेशन */}
        {activeTab === 'new-joining' && (
          <div className="space-y-6">
            <NewJoiningSection isAdmin={true} onCreated={() => setActiveTab('my-report')} />
          </div>
        )}

        {/* OPTION 2: डोनेशन की स्लिप (Donation Slip) */}
        {activeTab === 'donation-slip' && (
          <div className="space-y-6">
            <DonationSlipSection initialMemberId="" />
          </div>
        )}

        {/* OPTION 4: DOWNLINE REPORT */}
        {activeTab === 'downline-report' && (
          <div className="space-y-6">
            <DownlineReportSection initialMemberId="UCWF-2026-8647" />
          </div>
        )}

        {/* OPTION 5: MY PAYOUT */}
        {(activeTab === 'my-payout' || activeTab === 'payouts') && (
          <div className="space-y-6">
            <MyPayoutSection initialMemberId="UCWF-2026-8647" />
          </div>
        )}

        {/* OPTION 6: PAID EXPENSE */}
        {activeTab === 'paid-expense' && (
          <div className="space-y-6">
            <PaidExpenseSection isAdmin={true} />
          </div>
        )}

        {/* OPTION 7: PAID PAYOUT */}
        {activeTab === 'paid-payout' && (
          <div className="space-y-6">
            <PaidPayoutSection isAdmin={true} />
          </div>
        )}

        {/* OPTION 8: DATE BY REPORT */}
        {(activeTab === 'date-by-report' || activeTab === 'day-by-day' || activeTab === 'closings') && (
          <div className="space-y-6">
            <DailyReportSection 
              users={users} 
              isAdmin={true} 
              levelRates={levelRates}
              title="📅 Date by Report / हर दिन की रिपोर्ट (Day-by-Day Business & Joining Report)"
              subtitle="संस्था का दैनिक नया सदस्य पंजीकरण, कुल व्यवसाय (Package Business), 12-स्तरीय कमीशन एवं पेआउट हिसाब"
            />
          </div>
        )}

        {/* OPTION 3: MY REPORT / ALL MEMBERS MASTER REPORT */}
        {(activeTab === 'my-report' || activeTab === 'members') && (
          <div className="space-y-6">
            <MyReportSection targetMember={null} />

            <div className="bg-white rounded-3xl p-6 border border-pink-200/80 shadow-sm space-y-6">
            {/* Header Strip */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-pink-100">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-pink-600" />
                  <span>Members Master Report</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-800 text-xs font-mono font-bold">
                    {sortedMembers.length} Members
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Live verified member directory with plain-text credentials, sponsor lineage, business volume and commission.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Add Member Paper Form Button */}
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4 text-pink-200" />
                  <span>+ Add New Member</span>
                </button>

                {/* Print Report */}
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-600" />
                  <span>Print</span>
                </button>

                {/* Export CSV */}
                <button
                  type="button"
                  onClick={handleExportCompanyReport}
                  className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-200 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Export CSV</span>
                </button>

                {/* 1-Click Recalculate & Fix All Balances */}
                <button
                  type="button"
                  disabled={isSyncingBalances}
                  onClick={handleSyncAndFixBalances}
                  className="px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold text-xs border border-purple-200 flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                  title="Recalculate all member balances mathematically from live tree hierarchy"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-purple-700 ${isSyncingBalances ? 'animate-spin' : ''}`} />
                  <span>{isSyncingBalances ? 'Recalculating...' : 'Recalculate & Fix Balances'}</span>
                </button>

                {/* ⚡ Activate All Pending IDs (सभी आईडी एक्टिवेट करें) */}
                <button
                  type="button"
                  disabled={isActivatingAll}
                  onClick={handleActivateAllPendingIds}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50"
                  title="सभी पेंडिंग आईडी एक्टिवेट करें (Activate All Pending IDs)"
                >
                  <Zap className={`w-4 h-4 text-yellow-300 ${isActivatingAll ? 'animate-pulse' : ''}`} />
                  <span>{isActivatingAll ? 'Activating...' : '⚡ Activate All IDs (सभी आईडी एक्टिवेट करें)'}</span>
                </button>

                {/* Visual Generation Tree Chart Toggle */}
                <button
                  type="button"
                  onClick={() => setShowTreeChartInAdmin(!showTreeChartInAdmin)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition cursor-pointer ${
                    showTreeChartInAdmin
                      ? 'bg-purple-700 text-white border-purple-700 shadow-sm'
                      : 'bg-purple-50 hover:bg-purple-100 text-purple-800 border-purple-200'
                  }`}
                  title="Open Visual Generation Network Tree Chart"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{showTreeChartInAdmin ? 'Close Tree Chart' : 'Generation Tree Chart'}</span>
                </button>

                {/* Universal Member Report Lookup Toggle */}
                <button
                  type="button"
                  onClick={() => setShowMemberLookupInAdmin(!showMemberLookupInAdmin)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition cursor-pointer ${
                    showMemberLookupInAdmin
                      ? 'bg-pink-600 text-white border-pink-600 shadow-sm'
                      : 'bg-pink-50 hover:bg-pink-100 text-pink-800 border-pink-200'
                  }`}
                  title="Open Check Member Business & Team Report Tool"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>{showMemberLookupInAdmin ? 'Close Lookup' : 'Check Member Report'}</span>
                </button>

                {/* Search */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search name, ID, phone..."
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {syncStatusMsg && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-bold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{syncStatusMsg}</span>
              </div>
            )}

            {showMemberLookupInAdmin && (
              <div className="p-6 rounded-3xl bg-pink-50/50 border-2 border-pink-200 shadow-sm">
                <MemberReportLookup isAdminMode={true} embeddedTitle="Universal Member Business & Team Report Lookup" />
              </div>
            )}

            {showTreeChartInAdmin && (
              <div className="p-6 rounded-3xl bg-white border-2 border-purple-200 shadow-sm">
                <GenerationTreeChart title="Admin 12-Level Generation Network Tree Chart" />
              </div>
            )}

            {/* Top Commission Paid & Unpaid Summary Pods (Requirement 2) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-400 shadow-xs">
                <span className="text-xs font-black text-emerald-900 uppercase tracking-wider flex items-center justify-between">
                  <span>Commission Paid (भुगतान)</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 text-[10px] font-bold">PAID</span>
                </span>
                <p className="text-2xl font-black text-emerald-900 font-mono mt-1.5">
                  {formatCurrency(totalCompanyCommissionPaid)}
                </p>
                <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
                  कुल भुगतान प्राप्त सदस्य: <strong className="font-mono text-emerald-950 font-bold">{memberTotals.globalPaidCount}</strong>
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-50 to-amber-50 border-2 border-rose-300 shadow-xs">
                <span className="text-xs font-black text-rose-900 uppercase tracking-wider flex items-center justify-between">
                  <span>Commission Unpaid (बकाया)</span>
                  <span className="px-2 py-0.5 rounded-full bg-rose-200 text-rose-900 text-[10px] font-bold">PENDING</span>
                </span>
                <p className="text-2xl font-black text-rose-700 font-mono mt-1.5">
                  {formatCurrency(totalCompanyCommissionUnpaid)}
                </p>
                <p className="text-[11px] text-rose-800 font-medium mt-0.5">
                  बकाया मानदेय सदस्य: <strong className="font-mono text-rose-950 font-bold">{memberTotals.globalUnpaidCount}</strong>
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-pink-50/70 border-2 border-pink-300 shadow-xs">
                <span className="text-xs font-bold text-slate-600 uppercase">Total Company Business</span>
                <p className="text-2xl font-black text-slate-900 font-mono mt-1.5">
                  {formatCurrency(totalMembersBusiness)}
                </p>
                <p className="text-[11px] text-pink-700 font-medium mt-0.5">
                  All Active Contributions
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-purple-50/70 border-2 border-purple-300 shadow-xs">
                <span className="text-xs font-bold text-purple-900 uppercase">Total Commission Generated</span>
                <p className="text-2xl font-black text-purple-950 font-mono mt-1.5">
                  {formatCurrency(totalMembersCommission)}
                </p>
                <p className="text-[11px] text-purple-700 font-medium mt-0.5">
                  12-Level Distributed Earnings
                </p>
              </div>
            </div>

            {/* Sort & Filter Controls Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-pink-50/50 p-3 rounded-2xl border border-pink-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-pink-600" />
                  <span>Sort Order:</span>
                </span>
                <select
                  value={memberSortOrder}
                  onChange={(e) => setMemberSortOrder(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-white border border-pink-200 text-xs font-bold text-slate-800 outline-none focus:border-pink-500 shadow-2xs"
                >
                  <option value="date-desc">📅 Joining Date (Newest First)</option>
                  <option value="date-asc">📅 Joining Date (Oldest First)</option>
                  <option value="name-asc">👤 Name (A to Z)</option>
                  <option value="business-desc">💰 Self Business (High to Low)</option>
                  <option value="commission-desc">🏆 Commission (High to Low)</option>
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">Status:</span>
                  <select
                    value={memberStatusFilter}
                    onChange={(e) => setMemberStatusFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-white border border-pink-200 text-xs font-bold text-slate-800 outline-none focus:border-pink-500 shadow-2xs"
                  >
                    <option value="ALL">All Status ({Object.keys(users).length})</option>
                    <option value="active">Active ID</option>
                    <option value="pending">Pending</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-700">Payout:</span>
                  <div className="inline-flex rounded-xl bg-white p-0.5 border border-pink-200 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setCommissionFilter('ALL')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        commissionFilter === 'ALL' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setCommissionFilter('PAID')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        commissionFilter === 'PAID' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-800 hover:text-emerald-950'
                      }`}
                    >
                      ✅ Paid ({memberTotals.globalPaidCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setCommissionFilter('UNPAID')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        commissionFilter === 'UNPAID' ? 'bg-rose-600 text-white shadow-xs' : 'text-rose-700 hover:text-rose-950'
                      }`}
                    >
                      ⏳ Unpaid ({memberTotals.globalUnpaidCount})
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Members Master Report Table with Universal Slide Scroller */}
            {loading ? (
              <div className="py-16 text-center text-xs text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-pink-600 mx-auto mb-2" />
                Loading members data...
              </div>
            ) : sortedMembers.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-400">
                No members found matching your search.
              </div>
            ) : (
              <TableSlideScroller title="Members Master Report (सम्पूर्ण सदस्य मास्टर रिपोर्ट)">
                <table className="w-full text-xs text-left border-collapse table-auto">
                  <thead className="bg-pink-50/90 text-slate-800 font-bold border-b border-pink-200">
                    <tr>
                      <th className="py-2.5 px-2.5 text-center w-12 border-r border-pink-100 whitespace-nowrap">S.No.</th>
                      <th className="py-2.5 px-3 border-r border-pink-100 whitespace-nowrap">Member Name</th>
                      <th className="py-2.5 px-2.5 border-r border-pink-100 whitespace-nowrap">User ID No.</th>
                      <th className="py-2.5 px-2.5 border-r border-pink-100 whitespace-nowrap">Password</th>
                      <th className="py-2.5 px-2.5 border-r border-pink-100 whitespace-nowrap">Mobile Number</th>
                      <th className="py-2.5 px-2.5 border-r border-pink-100 whitespace-nowrap">Referral / Sponsor ID</th>
                      <th className="py-2.5 px-2.5 text-center border-r border-pink-100 whitespace-nowrap">Joining Date</th>
                      <th className="py-2.5 px-2.5 text-right border-r border-pink-100 whitespace-nowrap">Self Biz (₹)</th>
                      <th className="py-2.5 px-2.5 text-right border-r border-pink-100 whitespace-nowrap">Direct Team & Biz (₹)</th>
                      <th className="py-2.5 px-2.5 text-right border-r border-pink-100 whitespace-nowrap">Downline Team & Biz (₹)</th>
                      <th className="py-2.5 px-2.5 text-right border-r border-pink-100 whitespace-nowrap">Total Commission (₹)</th>
                      <th className="py-2.5 px-2.5 text-right border-r border-pink-100 whitespace-nowrap text-emerald-800">Comm. Paid (₹)</th>
                      <th className="py-2.5 px-2.5 text-right border-r border-pink-100 whitespace-nowrap text-rose-700">Comm. Unpaid (₹)</th>
                      <th className="py-2.5 px-2.5 text-center border-r border-pink-100 whitespace-nowrap">Payout Status</th>
                      <th className="py-2.5 px-2.5 text-center border-r border-pink-100 whitespace-nowrap">ID Status</th>
                      <th className="py-2.5 px-2.5 text-center whitespace-nowrap">Actions & 1-Click Payout</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {sortedMembers.map((member, index) => {
                      const isPassVisible = !!visiblePasswords[member.uid];
                      const met = memberTreeMetricsMap[member.uid] || {
                        selfBusiness: Number(member.packageAmount || member.packageTier || 0),
                        directMembersCount: 0,
                        directBusiness: 0,
                        downlineMembersCount: 0,
                        downlineBusiness: 0,
                        totalCommission: Number(member.totalCommission || 0)
                      };
                      const cleanFullName = `${member.salutation || ''} ${member.name || ''}`.trim() || 'Member';
                      const mComm = Number(met.totalCommission ?? member.totalCommission ?? 0);
                      const mPaid = Number(member.commissionPaid || member.totalWithdrawn || 0);
                      const mUnpaid = Math.max(0, round2(mComm - mPaid));
                      const isPaid = member.commissionStatus === 'Paid' || (mUnpaid <= 0 && mPaid > 0 && mComm > 0);
                      const mStatus = isPaid ? 'Paid' : (mPaid > 0 ? 'Partial' : 'Unpaid');

                      return (
                        <tr key={member.uid || index} className="hover:bg-pink-50/40 transition-colors">
                          {/* 1. S.No. */}
                          <td className="py-2 px-2.5 text-center font-mono text-slate-500 font-medium border-r border-pink-50 whitespace-nowrap">
                            {index + 1}
                          </td>

                          {/* 2. Member Name */}
                          <td className="py-2 px-2.5 border-r border-pink-50 whitespace-nowrap">
                            <div className="font-bold text-slate-900 text-xs">
                              {cleanFullName}
                            </div>
                          </td>

                          {/* 3. User ID No. */}
                          <td className="py-2 px-2.5 border-r border-pink-50 whitespace-nowrap">
                            <span className="font-mono text-pink-700 font-bold bg-pink-50 px-2 py-0.5 rounded border border-pink-200 inline-block">
                              {safeText(member.memberId || 'N/A')}
                            </span>
                          </td>

                          {/* 4. Password */}
                          <td className="py-2 px-2.5 border-r border-pink-50 whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200 font-mono text-xs">
                              <span className="text-slate-800 font-bold">
                                {isPassVisible ? safeText(member.password || member.plainPassword || 'UCWF@1234') : '••••••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() => togglePasswordVisibility(member.uid)}
                                className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                                title="Toggle password visibility"
                              >
                                {isPassVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCopy(member.password || member.plainPassword || 'UCWF@1234', `pass_${member.uid}`)}
                                className="text-slate-400 hover:text-pink-600 p-0.5 cursor-pointer"
                                title="Copy password"
                              >
                                {copiedKey === `pass_${member.uid}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>

                          {/* 5. Mobile Number */}
                          <td className="py-2 px-2.5 font-mono font-medium text-slate-700 border-r border-pink-50 whitespace-nowrap">
                            {safeText(member.phone || '-')}
                          </td>

                          {/* 6. Referral / Sponsor ID */}
                          <td className="py-2 px-2.5 font-mono text-xs text-slate-700 border-r border-pink-50 whitespace-nowrap">
                            {getSponsorDisplayName(member.sponsorId, member)}
                          </td>

                          {/* 7. Joining Date (Date) */}
                          <td className="py-2 px-2.5 text-center font-mono text-xs font-semibold text-slate-800 border-r border-pink-50 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md border border-slate-200 font-mono">
                              <Calendar className="w-3 h-3 text-pink-600" />
                              {formatJoiningDate(member)}
                            </span>
                          </td>

                          {/* 8. Self Business (₹) */}
                          <td className="py-2 px-2.5 text-right font-mono font-bold text-slate-900 border-r border-pink-50 whitespace-nowrap">
                            {formatCurrency(met.selfBusiness)}
                          </td>

                          {/* 9. Direct Members & Direct Business (₹) */}
                          <td className="py-2 px-2.5 text-right border-r border-pink-50 whitespace-nowrap">
                            <span className="font-mono text-xs font-bold text-pink-700">{met.directMembersCount} M</span>
                            <span className="font-mono text-[11px] text-slate-600 ml-1">({formatCurrency(met.directBusiness)})</span>
                          </td>

                          {/* 10. Total Downline Team & Total Business (₹) */}
                          <td className="py-2 px-2.5 text-right border-r border-pink-50 whitespace-nowrap">
                            <span className="font-mono text-xs font-bold text-purple-700">{met.downlineMembersCount} M</span>
                            <span className="font-mono text-[11px] text-slate-600 ml-1">({formatCurrency(met.downlineBusiness)})</span>
                          </td>

                          {/* 11. Total Commission (₹) */}
                          <td className="py-2 px-2.5 text-right font-mono font-bold text-slate-900 border-r border-pink-50 whitespace-nowrap">
                            {formatCurrency(mComm)}
                          </td>

                          {/* 12. Commission Paid (₹) */}
                          <td className="py-2 px-2.5 text-right font-mono font-bold text-emerald-800 border-r border-pink-50 whitespace-nowrap">
                            {formatCurrency(mPaid)}
                          </td>

                          {/* 13. Commission Unpaid (₹) */}
                          <td className="py-2 px-2.5 text-right font-mono font-bold text-rose-700 border-r border-pink-50 whitespace-nowrap">
                            {formatCurrency(mUnpaid)}
                          </td>

                          {/* 14. Payout Status */}
                          <td className="py-2 px-2.5 text-center border-r border-pink-50 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                              isPaid
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : mStatus === 'Partial'
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : 'bg-rose-100 text-rose-800 border border-rose-200'
                            }`}>
                              {mStatus}
                            </span>
                          </td>

                          {/* 15. ID Status & Activation Column */}
                          <td className="py-2 px-2.5 text-center border-r border-pink-50 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleActivateSingleId(member)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition cursor-pointer border flex items-center gap-1 mx-auto ${
                                member.status === 'blocked'
                                  ? 'bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-200'
                                  : member.status === 'active' && member.isApproved
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
                                  : 'bg-green-500 text-white border-green-600 hover:bg-green-600 shadow-sm shadow-green-500/30'
                              }`}
                              title={
                                member.status === 'active' && member.isApproved
                                  ? 'ID Active — Click to toggle Active/Inactive'
                                  : 'Click to Activate this ID (आईडी एक्टिवेट करें)'
                              }
                            >
                              {member.status === 'blocked' ? (
                                <>
                                  <XCircle className="w-3 h-3" />
                                  <span>Blocked</span>
                                </>
                              ) : member.status === 'active' && member.isApproved ? (
                                <>
                                  <CheckCircle className="w-3 h-3" />
                                  <span>✅ ID Active</span>
                                </>
                              ) : (
                                <>
                                  <Zap className="w-3 h-3 text-yellow-200" />
                                  <span>⚡ Activate ID / आईडी एक्टिवेट करें</span>
                                </>
                              )}
                            </button>
                          </td>

                          {/* 16. Actions & 1-Click Toggle */}
                          <td className="py-2 px-2.5 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              {/* 1-Click Mark Paid / Unpaid Button */}
                              <button
                                type="button"
                                onClick={() => handleToggleCommissionPaid(member)}
                                className={`px-2 py-1 rounded-lg font-black text-[10px] transition cursor-pointer flex items-center gap-1 shadow-2xs ${
                                  isPaid
                                    ? 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95'
                                }`}
                                title={isPaid ? 'Mark Unpaid (अदत्त मार्क करें)' : '1-Click Mark Paid (दत्त मार्क करें)'}
                              >
                                <CheckCircle className="w-3 h-3" />
                                <span>{isPaid ? 'Mark Unpaid' : 'Mark Paid'}</span>
                              </button>

                              {/* Custom Paid Amount */}
                              <button
                                type="button"
                                onClick={() => handleSetCustomPaidAmount(member)}
                                className="p-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition cursor-pointer"
                                title="Set Custom Paid Amount (कस्टम भुगतान राशि दर्ज करें)"
                              >
                                <IndianRupee className="w-3.5 h-3.5" />
                              </button>

                              {/* Edit Profile */}
                              <button
                                type="button"
                                onClick={() => setSelectedDocMember(member)}
                                className="p-1 rounded-lg bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 transition cursor-pointer"
                                title="View & Verify KYC Documents (Photo, Signature, Aadhaar)"
                              >
                                <ShieldCheck className="w-3.5 h-3.5 text-pink-600" />
                              </button>

                              <button
                                type="button"
                                onClick={() => setPreviewIdCardMember(member)}
                                className="p-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition cursor-pointer"
                                title="View & Print Digital ID Card"
                              >
                                <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenEditMember(member)}
                                className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition cursor-pointer"
                                title="Edit Member Profile"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-slate-700" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteMember(member.uid, member.name)}
                                className="p-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition cursor-pointer"
                                title="Delete Member"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                              </button>

                              <VoucherPrintButton
                                member={member}
                                allUsers={users}
                                size="small"
                                label="Voucher"
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {/* Summary Row */}
                  <tfoot className="bg-pink-100/70 border-t-2 border-pink-300 font-bold text-slate-900">
                    <tr>
                      <td colSpan={7} className="py-3 px-4 text-slate-800 text-xs font-black whitespace-nowrap">
                        Total Company Members: <span className="font-mono text-pink-700 font-extrabold">{sortedMembers.length}</span>
                      </td>
                      <td className="py-3 px-2.5 text-right font-mono font-black text-slate-950 text-xs whitespace-nowrap">
                        {formatCurrency(memberTotals.totalSelfBusiness)}
                      </td>
                      <td className="py-3 px-2.5 text-right font-mono font-black text-pink-800 text-xs whitespace-nowrap">
                        {formatCurrency(memberTotals.totalDirectBusiness)}
                      </td>
                      <td className="py-3 px-2.5 text-right font-mono font-black text-purple-900 text-xs whitespace-nowrap">
                        {formatCurrency(memberTotals.totalDownlineBusiness)}
                      </td>
                      <td className="py-3 px-2.5 text-right font-mono font-black text-slate-900 text-xs whitespace-nowrap">
                        {formatCurrency(memberTotals.totalCommission)}
                      </td>
                      <td className="py-3 px-2.5 text-right font-mono font-black text-emerald-800 text-xs whitespace-nowrap">
                        {formatCurrency(totalCompanyCommissionPaid)}
                      </td>
                      <td className="py-3 px-2.5 text-right font-mono font-black text-rose-700 text-xs whitespace-nowrap">
                        {formatCurrency(totalCompanyCommissionUnpaid)}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </TableSlideScroller>
            )}
          </div>
          </div>
        )}

        {/* TAB 2: VERIFY AADHAAR, PHOTO, ID & SIGNATURE (Requirement 4) */}
        {activeTab === 'verify-docs' && (
          <div className="bg-white rounded-3xl p-6 border border-pink-200/80 shadow-sm space-y-6">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-pink-100">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-pink-600" />
                  <span>Verify Aadhaar, Photo, ID & Signature</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-800 text-xs font-mono font-bold">
                    {docFilteredMembers.length} Members
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Inspect uploaded KYC documents, download high-res files, preview digital ID cards and toggle approval status.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Status Filter */}
                <select
                  value={docFilter}
                  onChange={(e) => setDocFilter(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-pink-500 cursor-pointer"
                >
                  <option value="ALL">All Status</option>
                  <option value="VERIFIED">Verified Only</option>
                  <option value="PENDING">Pending Verification</option>
                </select>

                {/* Search */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search member, ID, mobile..."
                    value={docSearch}
                    onChange={(e) => setDocSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Document Verification Table */}
            {docFilteredMembers.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-400">
                No members found matching current verification filter.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-pink-100">
                <table className="w-full text-xs text-left">
                  <thead className="bg-pink-50/80 text-slate-700 font-bold border-b border-pink-200">
                    <tr>
                      <th className="py-3 px-3 text-center w-12">S.No.</th>
                      <th className="py-3 px-3">Member Details</th>
                      <th className="py-3 px-3 text-center">Photo</th>
                      <th className="py-3 px-3 text-center">Signature</th>
                      <th className="py-3 px-3 text-center">Aadhaar Card</th>
                      <th className="py-3 px-3 text-center">Digital ID Card</th>
                      <th className="py-3 px-3 text-center w-40">Status & Approval</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {docFilteredMembers.map((member, idx) => {
                      const cleanFullName = `${member.salutation || ''} ${member.name || ''}`.trim() || 'Member';
                      const isVerified = !!member.documentsVerified;

                      return (
                        <tr key={member.uid || idx} className="hover:bg-pink-50/40 transition-colors">
                          {/* S.No. */}
                          <td className="py-3 px-3 text-center font-mono text-slate-500 font-medium">
                            {idx + 1}
                          </td>

                          {/* Member Details */}
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900 text-xs">
                              {cleanFullName}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 font-mono text-[11px]">
                              <span className="text-pink-700 font-bold">{safeText(member.memberId || 'N/A')}</span>
                              <span className="text-slate-300">•</span>
                              <span className="text-slate-600">{safeText(member.phone || '-')}</span>
                            </div>
                          </td>

                          {/* Photo */}
                          <td className="py-3 px-3 text-center">
                            {member.photoUrl ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <a
                                  href={member.photoUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-bold text-[11px] transition"
                                  title="View / Download Passport Photo"
                                >
                                  <Eye className="w-3 h-3 text-blue-600" />
                                  <span>View Photo</span>
                                </a>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">Not Uploaded</span>
                            )}
                          </td>

                          {/* Signature */}
                          <td className="py-3 px-3 text-center">
                            {member.signatureUrl ? (
                              <a
                                href={member.signatureUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 font-bold text-[11px] transition"
                                title="View / Download Signature"
                              >
                                <Eye className="w-3 h-3 text-amber-600" />
                                <span>View Signature</span>
                              </a>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">Not Uploaded</span>
                            )}
                          </td>

                          {/* Aadhaar Card */}
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1 flex-wrap">
                              {(member.aadhaarDocUrl || member.aadhaarUrl) ? (
                                <a
                                  href={member.aadhaarDocUrl || member.aadhaarUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 font-bold text-[11px] transition"
                                  title="View / Download Aadhaar Card"
                                >
                                  <Eye className="w-3 h-3 text-emerald-600" />
                                  <span>Front / Doc</span>
                                </a>
                              ) : null}
                              {member.aadhaarBackDocUrl && (
                                <a
                                  href={member.aadhaarBackDocUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200 font-bold text-[11px] transition"
                                  title="View / Download Aadhaar Back"
                                >
                                  <Eye className="w-3 h-3 text-indigo-600" />
                                  <span>Back</span>
                                </a>
                              )}
                              {!member.aadhaarDocUrl && !member.aadhaarUrl && !member.aadhaarBackDocUrl && (
                                <span className="text-slate-400 italic text-[11px]">Not Uploaded</span>
                              )}
                            </div>
                          </td>

                          {/* Digital ID Card */}
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => setPreviewIdCardMember(member)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-pink-50 text-pink-700 hover:bg-pink-100 border border-pink-200 font-bold text-[11px] transition cursor-pointer"
                              title="View & Print Digital ID Card"
                            >
                              <CreditCard className="w-3 h-3 text-pink-600" />
                              <span>View / Print ID</span>
                            </button>
                          </td>

                          {/* Status & Approval Toggle */}
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleDocVerification(member.uid, isVerified)}
                              className={`w-full px-2.5 py-1.5 rounded-xl font-bold text-[11px] transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
                                isVerified
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300'
                                  : 'bg-amber-100 text-amber-900 hover:bg-emerald-50 hover:text-emerald-800 border border-amber-300'
                              }`}
                              title="Toggle document verification status"
                            >
                              {isVerified ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span>Verified (Approved)</span>
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                  <span>Verify / Approve</span>
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: COMPANY & WORKER REPORTS (Requirement 5) */}
        {activeTab === 'reports' && (
          <div className="bg-white rounded-3xl p-6 border border-pink-200/80 shadow-sm space-y-6">
            {/* Header & Sub-Tab Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-pink-100">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-pink-600" />
                  <span>Company & Worker Business Reports</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Consolidated company-wide audit and individual worker 12-level downline team & commission reports.
                </p>
              </div>

              {/* Sub-tab Pills */}
              <div className="flex items-center p-1 rounded-2xl bg-pink-50 border border-pink-200 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setReportsSubTab('company')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    reportsSubTab === 'company'
                      ? 'bg-pink-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-pink-700'
                  }`}
                >
                  Total Company Report
                </button>
                <button
                  type="button"
                  onClick={() => setReportsSubTab('worker')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    reportsSubTab === 'worker'
                      ? 'bg-pink-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-pink-700'
                  }`}
                >
                  Worker-Wise Team Report
                </button>
              </div>
            </div>

            {/* SUB-TAB 1: TOTAL COMPANY REPORT */}
            {reportsSubTab === 'company' && (
              <div className="space-y-6">
                {/* 6 Metric Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                  <div className="p-3.5 rounded-2xl bg-pink-50/60 border border-pink-200">
                    <p className="text-xs font-bold text-slate-500">Total Registered Members</p>
                    <p className="text-xl font-black text-slate-900 mt-1 font-mono">{sortedMembers.length}</p>
                    <p className="text-[10px] text-pink-700 mt-0.5 font-medium">100% Synced from RTDB</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200">
                    <p className="text-xs font-bold text-slate-500">Active Contributors</p>
                    <p className="text-xl font-black text-emerald-800 mt-1 font-mono">
                      {sortedMembers.filter(m => (m.packageAmount || m.packageTier) > 0 || m.status === 'active').length}
                    </p>
                    <p className="text-[10px] text-emerald-700 mt-0.5 font-medium">ID Activated</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-purple-50/60 border border-purple-200">
                    <p className="text-xs font-bold text-slate-500">Total Company Business</p>
                    <p className="text-xl font-black text-purple-900 mt-1 font-mono">{formatCurrency(totalMembersBusiness)}</p>
                    <p className="text-[10px] text-purple-700 mt-0.5 font-medium">Aggregate Volume</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200">
                    <p className="text-xs font-bold text-slate-500">Total Commission Generated</p>
                    <p className="text-xl font-black text-amber-900 mt-1 font-mono">{formatCurrency(totalMembersCommission)}</p>
                    <p className="text-[10px] text-amber-700 mt-0.5 font-medium">12-Level Team Distribution</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border-2 border-emerald-300">
                    <p className="text-xs font-black text-emerald-900">Total Paid (दत्त)</p>
                    <p className="text-xl font-black text-emerald-900 mt-1 font-mono">{formatCurrency(totalCompanyCommissionPaid)}</p>
                    <p className="text-[10px] text-emerald-700 mt-0.5 font-bold">{memberTotals.globalPaidCount} Members Paid</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-rose-50 border-2 border-rose-300">
                    <p className="text-xs font-black text-rose-900">Total Unpaid (बकाया)</p>
                    <p className="text-xl font-black text-rose-700 mt-1 font-mono">{formatCurrency(totalCompanyCommissionUnpaid)}</p>
                    <p className="text-[10px] text-rose-800 mt-0.5 font-bold">{memberTotals.globalUnpaidCount} Members Pending</p>
                  </div>
                </div>

                {/* Actions Toolbar & Date Sort */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-pink-50/50 p-3 rounded-2xl border border-pink-100">
                  <div>
                    <h3 className="font-black text-sm text-slate-900">
                      Company-Wide Member Business Statement
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      All registered members sorted date-wise with exact joining dates, contributions and payout tracking.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={memberSortOrder}
                      onChange={(e) => setMemberSortOrder(e.target.value)}
                      className="px-3 py-1.5 rounded-xl bg-white border border-pink-200 text-xs font-bold text-slate-800 outline-none focus:border-pink-500 shadow-2xs"
                    >
                      <option value="date-desc">📅 Joining Date (Newest First)</option>
                      <option value="date-asc">📅 Joining Date (Oldest First)</option>
                      <option value="name-asc">👤 Name (A to Z)</option>
                      <option value="business-desc">💰 Business (High to Low)</option>
                      <option value="commission-desc">🏆 Commission (High to Low)</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-600" />
                      <span>Print Report</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExportCompanyReport}
                      className="px-3.5 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export Company CSV</span>
                    </button>
                  </div>
                </div>

                {/* Compact Table with Universal TableSlideScroller */}
                <TableSlideScroller title="Company-Wide Member Business Statement (कम्पनी सम्पूर्ण बिज़नेस विवरण)">
                  <table className="w-full text-xs text-left border-collapse table-auto">
                    <thead className="bg-pink-50/90 text-slate-800 font-bold border-b border-pink-200">
                      <tr>
                        <th className="py-2.5 px-2.5 text-center w-12 border-r border-pink-100 whitespace-nowrap">S.No.</th>
                        <th className="py-2.5 px-3 border-r border-pink-100 whitespace-nowrap">Member Name</th>
                        <th className="py-2.5 px-2.5 border-r border-pink-100 whitespace-nowrap">User ID No.</th>
                        <th className="py-2.5 px-2.5 border-r border-pink-100 whitespace-nowrap">Mobile No.</th>
                        <th className="py-2.5 px-2.5 border-r border-pink-100 whitespace-nowrap">Referral / Sponsor ID</th>
                        <th className="py-2.5 px-2.5 text-center border-r border-pink-100 whitespace-nowrap">Joining Date</th>
                        <th className="py-2.5 px-2.5 text-right border-r border-pink-100 whitespace-nowrap">Self Biz (₹)</th>
                        <th className="py-2.5 px-2.5 text-right border-r border-pink-100 whitespace-nowrap">Total Comm (₹)</th>
                        <th className="py-2.5 px-2.5 text-right border-r border-pink-100 whitespace-nowrap text-emerald-800">Comm. Paid (₹)</th>
                        <th className="py-2.5 px-2.5 text-right border-r border-pink-100 whitespace-nowrap text-rose-700">Comm. Unpaid (₹)</th>
                        <th className="py-2.5 px-2.5 text-center border-r border-pink-100 whitespace-nowrap">Payout Status</th>
                        <th className="py-2.5 px-2.5 text-center whitespace-nowrap">Voucher</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {sortedMembers.map((m, idx) => {
                        const met = memberTreeMetricsMap[m.uid] || {};
                        const mBiz = Number(met.selfBusiness ?? parseAmount(m));
                        const mComm = Number(met.totalCommission ?? m.totalEarned ?? m.totalCommission ?? 0);
                        const mPaid = Number(m.commissionPaid || m.totalWithdrawn || 0);
                        const mUnpaid = Math.max(0, round2(mComm - mPaid));
                        const isPaid = m.commissionStatus === 'Paid' || (mUnpaid <= 0 && mPaid > 0 && mComm > 0);
                        const mStatus = isPaid ? 'Paid' : (mPaid > 0 ? 'Partial' : 'Unpaid');
                        const cleanFullName = `${m.salutation || ''} ${m.name || ''}`.trim() || 'Member';

                        return (
                          <tr key={m.uid || idx} className="hover:bg-pink-50/40">
                            <td className="py-2 px-2.5 text-center font-mono text-slate-500 border-r border-pink-50 whitespace-nowrap">{idx + 1}</td>
                            <td className="py-2 px-2.5 font-bold text-slate-900 border-r border-pink-50 whitespace-nowrap">{cleanFullName}</td>
                            <td className="py-2 px-2.5 font-mono text-pink-700 font-bold border-r border-pink-50 whitespace-nowrap">{m.memberId || 'N/A'}</td>
                            <td className="py-2 px-2.5 font-mono text-slate-700 border-r border-pink-50 whitespace-nowrap">{m.phone || '-'}</td>
                            <td className="py-2 px-2.5 font-mono text-slate-600 border-r border-pink-50 whitespace-nowrap">{getSponsorDisplayName(m.sponsorId)}</td>
                            <td className="py-2 px-2.5 text-center font-mono text-xs font-semibold text-slate-800 border-r border-pink-50 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md border border-slate-200">
                                <Calendar className="w-3 h-3 text-pink-600" />
                                {formatJoiningDate(m)}
                              </span>
                            </td>
                            <td className="py-2 px-2.5 text-right font-mono font-bold text-slate-900 border-r border-pink-50 whitespace-nowrap">{formatCurrency(mBiz)}</td>
                            <td className="py-2 px-2.5 text-right font-mono font-bold text-slate-900 border-r border-pink-50 whitespace-nowrap">{formatCurrency(mComm)}</td>
                            <td className="py-2 px-2.5 text-right font-mono font-bold text-emerald-800 border-r border-pink-50 whitespace-nowrap">{formatCurrency(mPaid)}</td>
                            <td className="py-2 px-2.5 text-right font-mono font-bold text-rose-700 border-r border-pink-50 whitespace-nowrap">{formatCurrency(mUnpaid)}</td>
                            <td className="py-2 px-2.5 text-center border-r border-pink-50 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                isPaid
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : mStatus === 'Partial'
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                  : 'bg-rose-100 text-rose-800 border border-rose-200'
                              }`}>
                                {mStatus}
                              </span>
                            </td>
                            <td className="py-2 px-2.5 text-center whitespace-nowrap">
                              <VoucherPrintButton member={m} allUsers={users} size="small" label="Voucher" />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-pink-100/70 border-t-2 border-pink-300 font-bold text-slate-900">
                      <tr>
                        <td colSpan={6} className="py-3 px-4 text-slate-800 text-xs font-black whitespace-nowrap">
                          Total Company Summary: <span className="font-mono text-pink-700">{sortedMembers.length} Members</span>
                        </td>
                        <td className="py-3 px-2.5 text-right font-mono font-black text-slate-950 text-xs border-r border-pink-200 whitespace-nowrap">
                          {formatCurrency(totalMembersBusiness)}
                        </td>
                        <td className="py-3 px-2.5 text-right font-mono font-black text-slate-900 text-xs border-r border-pink-200 whitespace-nowrap">
                          {formatCurrency(totalMembersCommission)}
                        </td>
                        <td className="py-3 px-2.5 text-right font-mono font-black text-emerald-800 text-xs border-r border-pink-200 whitespace-nowrap">
                          {formatCurrency(totalCompanyCommissionPaid)}
                        </td>
                        <td className="py-3 px-2.5 text-right font-mono font-black text-rose-700 text-xs whitespace-nowrap border-r border-pink-200">
                          {formatCurrency(totalCompanyCommissionUnpaid)}
                        </td>
                        <td colSpan={2}></td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </TableSlideScroller>
              </div>
            )}

            {/* SUB-TAB 2: WORKER-WISE / MEMBER ID-WISE TEAM & BUSINESS REPORT (SINGLE UNIFIED VIEW - ZERO DUPLICATE TABLES) */}
            {reportsSubTab === 'worker' && (
              <div className="space-y-6">
                <MemberReportLookup isAdminMode={true} embeddedTitle="Worker / Member 12-Level Business & Team Report" />
              </div>
            )}
          </div>
        )}


        {/* TAB: DAY-BY-DAY / DEDICATED DAILY REPORT */}
        {activeTab === 'day-by-day' && (
          <DailyReportSection 
            users={users} 
            isAdmin={true} 
            levelRates={levelRates} 
            title="📅 Daily Report / हर दिन की रिपोर्ट (Day-by-Day Business & Joining Report)"
            subtitle="संस्था का दैनिक नया सदस्य पंजीकरण, कुल व्यवसाय (Package Business), 12-स्तरीय कमीशन एवं पेआउट हिसाब"
          />
        )}

        {/* TAB 2: UTR PAYMENT APPROVALS */}
        {activeTab === 'payments' && (
          <div className="bg-white rounded-3xl p-6 border border-pink-200/80 shadow-sm text-slate-900 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                <span>UTR भुगतान सत्यापन एवं 12-लेवल मानदेय स्वीकृति</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                भुगतान स्वीकृत करते ही संबंधित सदस्य सक्रिय हो जाएगा और उसके 12 अपलाइनों को कमीशन स्वतः वितरित हो जाएगा।
              </p>
            </div>

            {paymentRequestsList.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-400">
                कोई भुगतान अनुरोध दर्ज नहीं है।
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-pink-50/80 text-slate-700 font-bold border-b border-pink-200">
                    <tr>
                      <th className="py-3 px-3">तारीख</th>
                      <th className="py-3 px-3">सदस्य का नाम</th>
                      <th className="py-3 px-3">Member ID</th>
                      <th className="py-3 px-3">सहयोग राशि</th>
                      <th className="py-3 px-3">12 अंकों का UTR नंबर</th>
                      <th className="py-3 px-3">स्पॉन्सर ID</th>
                      <th className="py-3 px-3 text-center">स्थिति</th>
                      <th className="py-3 px-3 text-right">स्वीकृति / अस्वीकृति</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-pink-100">
                    {paymentRequestsList.map((payment) => (
                      <tr key={payment.id} className="hover:bg-pink-50/40">
                        <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                          {payment.createdAt ? new Date(payment.createdAt).toLocaleDateString('hi-IN') : '-'}
                        </td>
                        <td className="py-3 px-3 font-bold text-white">
                          {safeText(payment.userName)}
                        </td>
                        <td className="py-3 px-3 font-mono text-emerald-400">
                          {safeText(payment.memberId)}
                        </td>
                        <td className="py-3 px-3 font-bold text-white">
                          {formatINR(payment.amount || 0)}
                        </td>
                        <td className="py-3 px-3 font-mono text-amber-400 font-bold">
                          <div>{safeText(payment.utrNumber)}</div>
                          {payment.paymentReceiptUrl && (
                            <a
                              href={payment.paymentReceiptUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 text-[10px] font-bold border border-purple-500/30"
                              title="भुगतान रसीद स्क्रीनशॉट देखें"
                            >
                              <Eye className="w-2.5 h-2.5" />
                              <span>रसीद देखें</span>
                            </a>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-400">
                          {safeText(payment.sponsorId || 'DIRECT')}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {payment.status === 'approved' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              स्वीकृत
                            </span>
                          ) : payment.status === 'rejected' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 text-[10px] font-bold">
                              <XCircle className="w-3 h-3 text-red-400" />
                              अस्वीकृत
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                              <Clock className="w-3 h-3 text-amber-400" />
                              लंबित
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          {payment.status === 'pending' ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleApprovePayment(payment)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                                title="भुगतान सत्यापन एवं 100% मैनुअल मानदेय वितरण तालिका खोलें"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>स्वीकृति एवं मानदेय वितरण</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRejectPayment(payment)}
                                className="px-3 py-1.5 rounded-xl bg-red-900/60 hover:bg-red-800 text-red-300 text-xs transition"
                              >
                                अस्वीकार
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-500">निस्तारित</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB: 12-LEVEL COMMISSION & PAYOUT COMMAND CENTER */}
        {activeTab === 'payouts' && (() => {
          const simPkg = Number(simPackageAmount || 2100);
          const simSelfRate = 0; // ZERO SELF COMMISSION
          const simSelfAmt = 0;
          
          const simLvlRates = Array.from({ length: 12 }, (_, i) => ({ 
            level: i + 1, 
            rate: Number(levelRates[i + 1] ?? DEFAULT_LEVEL_RATES[i + 1] ?? 0) 
          }));
          const simLvlRows = simLvlRates.map(item => ({ 
            ...item, 
            amount: round2((simPkg * item.rate) / 100) 
          }));
          
          const simDirectAmt = simLvlRows.find(r => r.level === 1)?.amount || 0;
          const simDirectRate = simLvlRows.find(r => r.level === 1)?.rate || 0;
          const simDownlineRows = simLvlRows.filter(r => r.level > 1);
          const simDownlineAmt = round2(simDownlineRows.reduce((acc, r) => acc + r.amount, 0));
          const simDownlineRate = round2(simDownlineRows.reduce((acc, r) => acc + r.rate, 0));
          const simTotalDistributed = round2(simDirectAmt + simDownlineAmt);
          const simTotalDistributedRate = round2(simDirectRate + simDownlineRate);
          const simTrustShareAmt = Math.max(0, round2(simPkg - simTotalDistributed));
          const simTrustShareRate = Math.max(0, round2(100 - simTotalDistributedRate));

          return (
            <div className="space-y-6">
              
              {/* TOP COMMAND HEADER */}
              <div className="bg-white rounded-3xl p-6 border border-pink-200/80 shadow-sm text-slate-900 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold mb-2">
                    <Percent className="w-3.5 h-3.5 text-emerald-400" />
                    <span>12-स्तरीय कमीशन एवं पेआउट कमांड सेंटर (Admin Only)</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                    <span>12-स्तरीय कमीशन एवं पेआउट मास्टर</span>
                    <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-mono">
                      Level 1 से 12
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 max-w-3xl">
                    कमीशन से लेकर पेआउट तक का संपूर्ण विवरण: 12-स्तरीय मानदेय दरें, लाइव पैकेज सिम्युलेटर, सदस्यवार कमीशन व पेआउट लेजर एवं तत्काल नकद/बैंक पेआउट निस्तारण।
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsEditingRatesInTab(prev => !prev)}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                      isEditingRatesInTab
                        ? 'bg-amber-600 hover:bg-amber-500 text-slate-950 font-black ring-2 ring-amber-400'
                        : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                    }`}
                  >
                    <Edit3 className="w-4 h-4 text-emerald-400" />
                    <span>{isEditingRatesInTab ? 'संपादक बंद करें (Close)' : '12-स्तरीय दरें संपादित करें (Edit)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowAddMemberModal(true)}
                    className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-900/30 border border-emerald-400/30 transition flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>+ नया सदस्य जोड़ें</span>
                  </button>
                </div>
              </div>

              {/* 4 MASTER SUMMARY METRIC CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Metric 1: Total Commission Earned */}
                <div className="bg-gradient-to-br from-blue-950/60 via-slate-800 to-slate-900 p-5 rounded-3xl border border-blue-500/30 shadow-lg relative overflow-hidden">
                  <div className="flex items-center justify-between text-blue-400 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">कुल मानदेय / कमीशन</span>
                    <div className="p-2.5 bg-blue-500/10 rounded-2xl">
                      <Wallet className="w-5 h-5 text-blue-400" />
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-white font-mono">
                    {formatINR(ledgerTotals.totalComm)}
                  </div>
                  <p className="text-[11px] text-blue-300/80 mt-1.5 flex items-center justify-between">
                    <span>12 स्तरों व सेल्फ मानदेय का कुल योग</span>
                    <span className="font-mono font-bold text-blue-400">100% संचित</span>
                  </p>
                </div>

                {/* Metric 2: Total Settled Payouts */}
                <div className="bg-gradient-to-br from-emerald-950/60 via-slate-800 to-slate-900 p-5 rounded-3xl border border-emerald-500/30 shadow-lg relative overflow-hidden">
                  <div className="flex items-center justify-between text-emerald-400 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">कुल निस्तारित पेआउट</span>
                    <div className="p-2.5 bg-emerald-500/10 rounded-2xl">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-emerald-300 font-mono">
                    {formatINR(ledgerTotals.totalPaid)}
                  </div>
                  <p className="text-[11px] text-emerald-400/80 mt-1.5 flex items-center justify-between">
                    <span>नकद व बैंक द्वारा प्रदत्त कुल पेआउट</span>
                    <span className="font-mono font-bold text-emerald-300">Paid Out</span>
                  </p>
                </div>

                {/* Metric 3: Net Payable Wallet Balance */}
                <div className="bg-gradient-to-br from-amber-950/60 via-slate-800 to-slate-900 p-5 rounded-3xl border border-amber-500/30 shadow-lg relative overflow-hidden">
                  <div className="flex items-center justify-between text-amber-400 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">शुद्ध देय पेआउट (शेष)</span>
                    <div className="p-2.5 bg-amber-500/10 rounded-2xl">
                      <Coins className="w-5 h-5 text-amber-400" />
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-amber-300 font-mono">
                    {formatINR(ledgerTotals.totalPayable)}
                  </div>
                  <p className="text-[11px] text-amber-300/80 mt-1.5 flex items-center justify-between">
                    <span>सदस्यों के वॉलेट में तत्काल निकासी हेतु</span>
                    <span className="font-mono font-bold text-amber-400">Net Payable</span>
                  </p>
                </div>

                {/* Metric 4: Trust / Welfare Share */}
                <div className="bg-gradient-to-br from-purple-950/60 via-slate-800 to-slate-900 p-5 rounded-3xl border border-purple-500/30 shadow-lg relative overflow-hidden">
                  <div className="flex items-center justify-between text-purple-400 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">ट्रस्ट जनकल्याण संचय</span>
                    <div className="p-2.5 bg-purple-500/10 rounded-2xl">
                      <Building2 className="w-5 h-5 text-purple-400" />
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-purple-300 font-mono">
                    {formatINR(totalTrustShare)}
                  </div>
                  <p className="text-[11px] text-purple-300/80 mt-1.5 flex items-center justify-between">
                    <span>कमीशन काटकर ट्रस्ट के खाते में सुरक्षित</span>
                    <span className="font-mono font-bold text-purple-400">Trust Fund</span>
                  </p>
                </div>

              </div>

              {/* 4 COMMISSION SUB-NAVIGATION TABS */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-slate-700/80">
                <button
                  type="button"
                  onClick={() => setCommissionSubTab('structure')}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                    commissionSubTab === 'structure'
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                      : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  <Percent className="w-4 h-4 text-emerald-400" />
                  <span>🎯 1. 12-स्तरीय दरें व लाइव कैलकुलेटर (Rates & Simulator)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCommissionSubTab('ledger')}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap relative cursor-pointer ${
                    commissionSubTab === 'ledger'
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                      : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  <Users className="w-4 h-4 text-blue-400" />
                  <span>👥 2. सदस्यवार कमीशन व पेआउट लेजर (Master Ledger)</span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-black">
                    {membersLedger.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setCommissionSubTab('pipeline')}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                    commissionSubTab === 'pipeline'
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                      : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  <RefreshCw className="w-4 h-4 text-amber-400" />
                  <span>🔄 3. कमीशन से पेआउट तक का चक्र (Workflow Flowchart)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCommissionSubTab('records')}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap relative cursor-pointer ${
                    commissionSubTab === 'records'
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                      : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  <FileText className="w-4 h-4 text-purple-400" />
                  <span>📜 4. सदस्यता अनुसार वितरण लॉग (Activation Records)</span>
                  {payoutRecordsList.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold">
                      {payoutRecordsList.length}
                    </span>
                  )}
                </button>
              </div>

              {/* ============================================================== */}
              {/* SUB-TAB 1: 12-LEVEL COMMISSION RATES & INTERACTIVE SIMULATOR */}
              {/* ============================================================== */}
              {commissionSubTab === 'structure' && (
                <div className="space-y-6">
                  
                  {/* Rates Configuration & Quick Save Box */}
                  <div className="bg-white rounded-3xl p-6 border border-pink-200/80 shadow-sm text-slate-900 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-700 gap-3">
                      <div>
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                          <Percent className="w-5 h-5 text-emerald-400" />
                          <span>सक्रिय 12-स्तरीय मानदेय प्रतिशत संरचना (Level 1 to 12 Structure)</span>
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          यह दरें केवल सुपर एडमिन को दिखाई देती हैं। सार्वजनिक पेजों से यह पूर्णतः गुप्त हैं।
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        {saveRatesSuccess && (
                          <div className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5 animate-pulse">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>दरें रीयलटाइम में सुरक्षित हो गईं!</span>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={handleSaveLevelRates}
                          disabled={isSavingRates}
                          className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-900/30 transition cursor-pointer active:scale-95 disabled:opacity-50"
                        >
                          {isSavingRates ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>सुरक्षित हो रहा है...</span>
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4" />
                              <span>दरें सुरक्षित करें (Save Rates)</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Self Business Rate Strip */}
                    <div className="p-4 bg-gradient-to-r from-purple-950/40 via-slate-900 to-indigo-950/40 rounded-2xl border border-purple-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                          <Award className="w-4 h-4 text-purple-400" />
                          <span>सेल्फ बिज़नेस मानदेय (Self Business Commission)</span>
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          सदस्य के स्वयं के पैकेज/योगदान पर मानदेय (डिफ़ॉल्ट 0% - नियमानुसार स्वयं के दान पर कमीशन शून्य)
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="relative w-32">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            disabled={!isEditingRatesInTab}
                            value={selfBusinessRate !== undefined ? selfBusinessRate : 0}
                            onChange={(e) => setSelfBusinessRate(e.target.value)}
                            placeholder="0"
                            className={`w-full px-3 py-2 pr-7 rounded-xl font-mono font-bold text-xs outline-none transition ${
                              isEditingRatesInTab
                                ? 'bg-slate-800 border border-purple-400 text-white focus:ring-2 focus:ring-purple-500'
                                : 'bg-slate-900/80 border border-purple-500/30 text-purple-300 cursor-not-allowed'
                            }`}
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-purple-300 font-bold text-xs">%</span>
                        </div>
                      </div>
                    </div>

                    {/* 12 Levels Grid */}
                    <div>
                      <div className="text-xs font-bold text-slate-300 mb-2 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Percent className="w-3.5 h-3.5 text-emerald-400" />
                          <span>स्तर 1 से 12 तक की मानदेय दरें (Level 1 to 12 Rates):</span>
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          कुल नेटवर्क कमीशन: <strong className="text-emerald-400">{simTotalDistributedRate}%</strong> | ट्रस्ट शेयर: <strong className="text-purple-400">{simTrustShareRate}%</strong>
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((lvl) => {
                          const isDirect = lvl === 1;
                          const currentVal = levelRates[lvl] !== undefined ? levelRates[lvl] : 0;
                          return (
                            <div 
                              key={lvl} 
                              className={`p-3 rounded-2xl border transition-all ${
                                isDirect 
                                  ? 'bg-blue-950/30 border-blue-500/40 shadow-sm shadow-blue-500/10' 
                                  : 'bg-slate-900/90 border-slate-700/80'
                              }`}
                            >
                              <div className="flex items-center justify-between text-xs font-bold pb-1 mb-1 border-b border-slate-800">
                                <span className={isDirect ? 'text-blue-300' : 'text-slate-300'}>
                                  L{lvl} {isDirect ? '(डायरेक्ट)' : ''}
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono">
                                  {isDirect ? 'Level 1' : `Downline ${lvl}`}
                                </span>
                              </div>

                              <div className="relative mt-1">
                                <input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  max="100"
                                  disabled={!isEditingRatesInTab}
                                  value={currentVal}
                                  onChange={(e) => setLevelRates(prev => ({ ...prev, [lvl]: e.target.value }))}
                                  placeholder="0"
                                  className={`w-full px-2.5 py-1.5 pr-6 rounded-xl font-mono font-black text-xs outline-none transition ${
                                    isEditingRatesInTab
                                      ? 'bg-slate-800 border border-emerald-500 text-white focus:ring-2 focus:ring-emerald-400'
                                      : 'bg-slate-950 border border-slate-800 text-emerald-400 cursor-not-allowed'
                                  }`}
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">%</span>
                              </div>

                              <div className="mt-1 text-[10px] text-slate-400 font-mono flex items-center justify-between">
                                <span>₹{simPkg} पर:</span>
                                <strong className={isDirect ? 'text-blue-300' : 'text-emerald-400'}>
                                  {formatINR(round2((simPkg * Number(currentVal || 0)) / 100))}
                                </strong>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>

                  {/* INTERACTIVE LIVE PACKAGE COMMISSION SIMULATOR */}
                  <div className="bg-white rounded-3xl p-6 border border-pink-200/80 shadow-sm text-slate-900 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-700 gap-3">
                      <div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-bold mb-1.5">
                          <Zap className="w-3.5 h-3.5 text-blue-400" />
                          <span>रीयलटाइम कैलकुलेटर (Live Calculator)</span>
                        </div>
                        <h3 className="text-base font-black text-white">
                          पैकेज अनुसार 12-स्तरीय कमीशन एवं ट्रस्ट शेयर सिमुलेटर
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          किसी भी पैकेज या कस्टम राशि का चयन करें और देखें कि हर स्तर (L1 से L12) और ट्रस्ट को कितनी राशि जाएगी।
                        </p>
                      </div>

                      {/* Package Selector Pills */}
                      <div className="flex flex-wrap items-center gap-2">
                        {[500, 1100, 2100, 5100, 11000].map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => {
                              setSimPackageAmount(amt);
                              setSimCustomInput('');
                            }}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-extrabold transition cursor-pointer ${
                              simPackageAmount === amt && !simCustomInput
                                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md ring-2 ring-emerald-400/50'
                                : 'bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
                            }`}
                          >
                            ₹{amt}
                          </button>
                        ))}

                        <div className="relative w-28">
                          <input
                            type="number"
                            placeholder="कस्टम ₹"
                            value={simCustomInput}
                            onChange={(e) => {
                              const v = e.target.value;
                              setSimCustomInput(v);
                              if (v && Number(v) > 0) {
                                setSimPackageAmount(Number(v));
                              }
                            }}
                            className="w-full px-2.5 py-1.5 pl-5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:ring-2 focus:ring-emerald-500 outline-none placeholder-slate-500"
                          />
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">₹</span>
                        </div>
                      </div>
                    </div>

                    {/* Simulator Result Breakdown Cards (3 Main Segments) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      
                      {/* Segment 1: Direct Commission (L1) */}
                      <div className="p-5 rounded-2xl bg-blue-950/30 border border-blue-500/40 shadow">
                        <div className="flex items-center justify-between text-blue-400 mb-1">
                          <span className="text-xs font-bold uppercase tracking-wider">1. डायरेक्ट कमीशन (Level 1)</span>
                          <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 font-mono text-[11px] font-bold">
                            {simDirectRate}%
                          </span>
                        </div>
                        <div className="text-2xl font-black text-white font-mono mt-1">
                          {formatINR(simDirectAmt)}
                        </div>
                        <p className="text-[11px] text-blue-300/80 mt-1">
                          सीधे जोड़ने वाले प्रायोजक (Direct Sponsor) को तत्काल क्रेडिट
                        </p>
                      </div>

                      {/* Segment 2: Downline Commission (L2-L12) */}
                      <div className="p-5 rounded-2xl bg-amber-950/30 border border-amber-500/40 shadow">
                        <div className="flex items-center justify-between text-amber-400 mb-1">
                          <span className="text-xs font-bold uppercase tracking-wider">2. डाउनलाइन कमीशन (L2–L12)</span>
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-mono text-[11px] font-bold">
                            {simDownlineRate}%
                          </span>
                        </div>
                        <div className="text-2xl font-black text-white font-mono mt-1">
                          {formatINR(simDownlineAmt)}
                        </div>
                        <p className="text-[11px] text-amber-300/80 mt-1">
                          स्तर 2 से स्तर 12 तक के समस्त अपलाइन मार्गदर्शकों में विभाजित
                        </p>
                      </div>

                      {/* Segment 3: Trust Welfare Retained Share */}
                      <div className="p-5 rounded-2xl bg-purple-950/30 border border-purple-500/40 shadow">
                        <div className="flex items-center justify-between text-purple-400 mb-1">
                          <span className="text-xs font-bold uppercase tracking-wider">3. ट्रस्ट जनकल्याण शेयर</span>
                          <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 font-mono text-[11px] font-bold">
                            {simTrustShareRate}%
                          </span>
                        </div>
                        <div className="text-2xl font-black text-purple-300 font-mono mt-1">
                          {formatINR(simTrustShareAmt)}
                        </div>
                        <p className="text-[11px] text-purple-300/80 mt-1">
                          कमीशन भुगतान उपरांत जनहित एवं परोपकार कार्यों हेतु सुरक्षित
                        </p>
                      </div>

                    </div>

                    {/* Progress Bar of Distribution */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-300">पैकेज राशि ₹{simPkg} का संपूर्ण विभाजन प्रतिशत:</span>
                        <span className="font-mono text-emerald-400">
                          कमीशन {simTotalDistributedRate}% ({formatINR(simTotalDistributed)}) + ट्रस्ट {simTrustShareRate}% ({formatINR(simTrustShareAmt)}) = 100%
                        </span>
                      </div>
                      <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden flex border border-slate-700">
                        <div 
                          style={{ width: `${simDirectRate}%` }} 
                          className="bg-blue-500 h-full transition-all" 
                          title={`डायरेक्ट L1: ${simDirectRate}%`}
                        />
                        <div 
                          style={{ width: `${simDownlineRate}%` }} 
                          className="bg-amber-500 h-full transition-all" 
                          title={`डाउनलाइन L2-12: ${simDownlineRate}%`}
                        />
                        <div 
                          style={{ width: `${simTrustShareRate}%` }} 
                          className="bg-purple-500 h-full transition-all" 
                          title={`ट्रस्ट शेयर: ${simTrustShareRate}%`}
                        />
                      </div>
                    </div>

                    {/* Full 12-Level Breakdown Simulation Table */}
                    <div className="overflow-x-auto rounded-2xl border border-slate-700">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-pink-50/80 text-slate-700 font-bold border-b border-pink-200">
                          <tr>
                            <th className="py-3 px-3">स्तर (Level)</th>
                            <th className="py-3 px-3">लाभार्थी विवरण (Beneficiary)</th>
                            <th className="py-3 px-3 text-center">सक्रिय दर (%)</th>
                            <th className="py-3 px-3 text-right">अनुमानित मानदेय राशि (₹)</th>
                            <th className="py-3 px-3 text-center">वितरण प्रकार</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-pink-100 font-medium">
                          {/* Self Business Row */}
                          <tr className="bg-purple-950/15 hover:bg-purple-950/30 transition-colors">
                            <td className="py-3 px-3 font-mono font-bold text-purple-300">सेल्फ (Self)</td>
                            <td className="py-3 px-3 font-bold text-white">सदस्य स्वयं (Self Business Incentive)</td>
                            <td className="py-3 px-3 text-center font-mono font-black text-purple-400">{simSelfRate}%</td>
                            <td className="py-3 px-3 text-right font-mono font-black text-purple-300">+{formatINR(simSelfAmt)}</td>
                            <td className="py-3 px-3 text-center">
                              <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold">
                                स्वयं का प्रोत्साहन
                              </span>
                            </td>
                          </tr>

                          {/* Level 1 to 12 Rows */}
                          {simLvlRows.map((r) => {
                            const isL1 = r.level === 1;
                            return (
                              <tr 
                                key={r.level} 
                                className={`hover:bg-slate-700/30 transition-colors ${
                                  isL1 ? 'bg-blue-950/10 font-bold' : ''
                                }`}
                              >
                                <td className="py-3 px-3 font-mono">
                                  <span className={`px-2 py-0.5 rounded-md text-[11px] font-black ${
                                    isL1 ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30' : 'bg-slate-900 text-slate-300'
                                  }`}>
                                    L{r.level}
                                  </span>
                                </td>
                                <td className="py-3 px-3">
                                  <div className="text-white text-xs">
                                    {isL1 ? 'प्रत्यक्ष प्रायोजक (Direct Sponsor)' : `स्तर ${r.level} अपलाइन मार्गदर्शक`}
                                  </div>
                                  <div className="text-[10px] text-slate-500 font-mono">
                                    {isL1 ? 'Immediate Upline Sponsor' : `${r.level - 1} Degree Indirect Upline`}
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-center font-mono font-black text-emerald-400">
                                  {r.rate}%
                                </td>
                                <td className="py-3 px-3 text-right font-mono font-black text-white">
                                  <span className={isL1 ? 'text-blue-300' : 'text-emerald-400'}>
                                    +{formatINR(r.amount)}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-center whitespace-nowrap">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    isL1 ? 'bg-blue-500/20 text-blue-300' : 'bg-slate-900 text-slate-400'
                                  }`}>
                                    {isL1 ? 'डायरेक्ट मानदेय' : `डाउनलाइन L${r.level}`}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}

                          {/* Trust Share Summary Row */}
                          <tr className="bg-emerald-950/20 border-t-2 border-slate-600 font-bold">
                            <td className="py-3.5 px-3 font-mono text-emerald-300">ट्रस्ट (Trust)</td>
                            <td className="py-3.5 px-3 text-white">
                              <div>उत्तम चैरिटेबल वेलफेयर फाउंडेशन जनसेवा खाता</div>
                              <div className="text-[10px] text-slate-400 font-mono">Net Retained for Social Charity & Welfare Work</div>
                            </td>
                            <td className="py-3.5 px-3 text-center font-mono font-black text-emerald-300">
                              {simTrustShareRate}%
                            </td>
                            <td className="py-3.5 px-3 text-right font-mono font-black text-emerald-300 text-sm">
                              +{formatINR(simTrustShareAmt)}
                            </td>
                            <td className="py-3.5 px-3 text-center">
                              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black">
                                जनसेवा सुरक्षित फंड
                              </span>
                            </td>
                          </tr>

                        </tbody>
                      </table>
                    </div>

                  </div>

                </div>
              )}

              {/* ============================================================== */}
              {/* SUB-TAB 2: MEMBER-WISE COMMISSION & PAYOUT MASTER LEDGER */}
              {/* ============================================================== */}
              {commissionSubTab === 'ledger' && (
                <div className="bg-white rounded-3xl p-6 border border-pink-200/80 shadow-sm text-slate-900 space-y-4">
                  
                  {/* Ledger Header & Search */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-700">
                    <div>
                      <h3 className="text-base font-black text-white flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-400" />
                        <span>सदस्यवार 12-स्तरीय कमीशन एवं पेआउट मास्टर लेजर</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        प्रत्येक सदस्य का 12-स्तरीय बिज़नेस, डायरेक्ट व डाउनलाइन कमीशन, प्राप्त पेआउट, और देय राशि
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                      {/* Filter Buttons */}
                      <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-700">
                        <button
                          type="button"
                          onClick={() => setLedgerFilter('ALL')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                            ledgerFilter === 'ALL'
                              ? 'bg-emerald-600 text-white'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          सभी ({Object.keys(users).length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setLedgerFilter('PAYABLE')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                            ledgerFilter === 'PAYABLE'
                              ? 'bg-amber-600 text-slate-950 font-black'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          देय पेआउट ({membersLedger.filter(m => m.netPayable > 0).length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setLedgerFilter('SETTLED')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                            ledgerFilter === 'SETTLED'
                              ? 'bg-blue-600 text-white'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          निस्तारित
                        </button>
                      </div>

                      {/* Search Input */}
                      <div className="relative w-full sm:w-64">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={ledgerSearch}
                          onChange={(e) => setLedgerSearch(e.target.value)}
                          placeholder="सदस्य नाम, आईडी या फोन..."
                          className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                        {ledgerSearch && (
                          <button
                            type="button"
                            onClick={() => setLedgerSearch('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Master Ledger Table */}
                  {membersLedger.length === 0 ? (
                    <div className="py-16 text-center text-xs text-slate-400 space-y-2">
                      <Users className="w-8 h-8 text-slate-600 mx-auto" />
                      <p>कोई सदस्य रिकॉर्ड उपलब्ध नहीं है।</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-pink-50/80 text-slate-700 font-bold border-b border-pink-200">
                          <tr>
                            <th className="py-3 px-3">सदस्य विवरण</th>
                            <th className="py-3 px-3">स्पॉन्सर विवरण</th>
                            <th className="py-3 px-3 text-center">पैकेज (₹)</th>
                            <th className="py-3 px-3 text-right">12-स्तरीय बिज़नेस</th>
                            <th className="py-3 px-3 text-right bg-emerald-950/20 text-emerald-300">
                              कुल अर्जित कमीशन
                            </th>
                            <th className="py-3 px-3 text-right">प्राप्त पेआउट</th>
                            <th className="py-3 px-3 text-right bg-amber-950/20 text-amber-300">
                              शुद्ध देय पेआउट (Wallet)
                            </th>
                            <th className="py-3 px-3 text-center">पेआउट स्थिति</th>
                            <th className="py-3 px-3 text-right">कार्य (Action)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-pink-100 font-medium">
                          {membersLedger.map((m) => {
                            const hasPayable = m.netPayable > 0;
                            return (
                              <tr key={m.uid} className="hover:bg-pink-50/40 transition-colors">
                                
                                {/* Member Info */}
                                <td className="py-3.5 px-3">
                                  <div className="font-bold text-white text-xs">
                                    {m.salutation || ''} {m.name}
                                  </div>
                                  <div className="text-[11px] font-mono font-bold text-emerald-400">
                                    {m.memberId || 'N/A'}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono">
                                    {m.phone || 'N/A'} {m.designation ? `• ${m.designation}` : ''}
                                  </div>
                                </td>

                                {/* Sponsor Info */}
                                <td className="py-3.5 px-3">
                                  <div className="font-mono text-slate-300 text-[11px] font-bold">
                                    {m.sponsorId || 'DIRECT'}
                                  </div>
                                  <div className="text-[10px] text-slate-500">
                                    {m.sponsorName || 'उत्तम फाउंडेशन'}
                                  </div>
                                </td>

                                {/* Package */}
                                <td className="py-3.5 px-3 text-center font-mono font-bold text-white">
                                  {formatINR(m.packageAmount)}
                                </td>

                                {/* 12-Level Business Volume */}
                                <td className="py-3.5 px-3 text-right font-mono">
                                  <div className="text-white font-bold">
                                    कुल: {formatINR(m.teamBusiness)}
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    डायरेक्ट: {formatINR(m.directBusiness)}
                                  </div>
                                  <div className="text-[10px] text-slate-500">
                                    डाउनलाइन: {formatINR(m.downlineBusiness)}
                                  </div>
                                </td>

                                {/* Earned Commission */}
                                <td className="py-3.5 px-3 text-right font-mono bg-emerald-950/10">
                                  <div className="text-emerald-300 font-black text-sm">
                                    +{formatINR(m.totalCommission)}
                                  </div>
                                  <div className="text-[10px] text-blue-300">
                                    L1 डायरेक्ट: +{formatINR(m.directCommission)}
                                  </div>
                                  <div className="text-[10px] text-amber-300">
                                    L2-12 डाउन.: +{formatINR(m.downlineCommission)}
                                  </div>
                                </td>

                                {/* Total Paid Out */}
                                <td className="py-3.5 px-3 text-right font-mono text-slate-300 font-bold">
                                  {formatINR(m.totalWithdrawn)}
                                </td>

                                {/* Net Payable Wallet Balance */}
                                <td className="py-3.5 px-3 text-right font-mono bg-amber-950/10">
                                  <div className={`text-sm font-black ${hasPayable ? 'text-amber-300' : 'text-slate-500'}`}>
                                    {formatINR(m.netPayable)}
                                  </div>
                                  {hasPayable && (
                                    <div className="text-[9px] text-amber-400/90 font-bold uppercase">
                                      तत्काल निकासी योग्य
                                    </div>
                                  )}
                                </td>

                                {/* Status */}
                                <td className="py-3.5 px-3 text-center whitespace-nowrap">
                                  {hasPayable ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                                      <Clock className="w-3 h-3 text-amber-400" />
                                      <span>देय पेआउट शेष</span>
                                    </span>
                                  ) : m.totalCommission > 0 ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                      <span>पूर्ण निस्तारित</span>
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-slate-500 font-mono">
                                      नया सदस्य
                                    </span>
                                  )}
                                </td>

                                {/* Actions */}
                                <td className="py-3.5 px-3 text-right whitespace-nowrap">
                                  <div className="flex items-center justify-end gap-1.5">
                                    {hasPayable && (
                                      <button
                                        type="button"
                                        onClick={() => handlePayMemberInstantCash(m)}
                                        className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-[11px] transition shadow cursor-pointer active:scale-95 flex items-center gap-1"
                                        title="कार्यालय से नकद पेआउट भुगतान करें"
                                      >
                                        <IndianRupee className="w-3.5 h-3.5" />
                                        <span>💵 नकद पेआउट दें</span>
                                      </button>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => handleOpenManualCommissionModal(m, 'member')}
                                      className="px-2.5 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-[11px] font-bold transition cursor-pointer flex items-center gap-1"
                                      title="12-स्तरीय अपलाइन एवं मानदेय वितरण जांचें"
                                    >
                                      <Users className="w-3.5 h-3.5 text-blue-400" />
                                      <span>12 अपलाइन</span>
                                    </button>

                                    <VoucherPrintButton member={m} allUsers={users} size="small" label="Voucher" />
                                  </div>
                                </td>

                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                </div>
              )}

              {/* ============================================================== */}
              {/* SUB-TAB 3: COMMISSION TO PAYOUT PIPELINE FLOWCHART */}
              {/* ============================================================== */}
              {commissionSubTab === 'pipeline' && (
                <div className="bg-white rounded-3xl p-6 border border-pink-200/80 shadow-sm text-slate-900 space-y-6">
                  <div>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      <RefreshCw className="w-5 h-5 text-amber-400" />
                      <span>कमीशन से पेआउट तक का संपूर्ण चक्र (End-to-End Workflow Pipeline)</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      उत्तम फाउंडेशन सॉफ्टवेयर में सदस्य के जुड़ने से लेकर उसके अंतिम पेआउट भुगतान तक का पूर्णतः पारदर्शी 5-चरणीय चक्र:
                    </p>
                  </div>

                  {/* 5 Stages Flow */}
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
                    
                    {/* Stage 1 */}
                    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-700 space-y-2 relative">
                      <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 font-mono font-black flex items-center justify-center text-sm">
                        1
                      </div>
                      <h4 className="text-xs font-black text-white">सदस्यता एवं पैकेज</h4>
                      <p className="text-[11px] text-slate-400">
                        नया सदस्य जुड़ता है और पैकेज राशि (₹500, ₹1100, ₹2100, ₹5100 या ₹11000) नकद अथवा UTR से जमा करता है।
                      </p>
                      <span className="inline-block px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 text-[10px] font-bold">
                        सदस्यता सक्रिय
                      </span>
                    </div>

                    {/* Stage 2 */}
                    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-700 space-y-2 relative">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 font-mono font-black flex items-center justify-center text-sm">
                        2
                      </div>
                      <h4 className="text-xs font-black text-white">12-स्तरीय कमीशन गणना</h4>
                      <p className="text-[11px] text-slate-400">
                        सिस्टम तुरंत 12-लेवल अपलाइन चेन ढूंढता है: डायरेक्ट स्पॉन्सर को L1 (20%), L2 (8%), L3 (5%), L4 (4%), L5 (3%), L6 (2.5%), L7 (2%), L8 (1.5%), व L9–L12 (1%) — कुल 50% व 50% ट्रस्ट शेयर विभाजित होता है।
                      </p>
                      <span className="inline-block px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 text-[10px] font-bold">
                        स्वचालित विभाजन
                      </span>
                    </div>

                    {/* Stage 3 */}
                    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-700 space-y-2 relative">
                      <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 font-mono font-black flex items-center justify-center text-sm">
                        3
                      </div>
                      <h4 className="text-xs font-black text-white">डिजिटल वॉलेट क्रेडिट</h4>
                      <p className="text-[11px] text-slate-400">
                        सभी पात्र अपलाइन सदस्यों के डिजिटल वॉलेट में मानदेय राशि रीयलटाइम में जुड़ जाती है और पासबुक में ट्रांजैक्शन आईडी दर्ज होती है।
                      </p>
                      <span className="inline-block px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 text-[10px] font-bold">
                        रीयलटाइम बैलेंस
                      </span>
                    </div>

                    {/* Stage 4 */}
                    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-700 space-y-2 relative">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 font-mono font-black flex items-center justify-center text-sm">
                        4
                      </div>
                      <h4 className="text-xs font-black text-white">12:00 AM डेली क्लोजिंग</h4>
                      <p className="text-[11px] text-slate-400">
                        प्रतिदिन रात्रि 12:00 बजे स्वचालित इंजन समस्त सदस्यों के सेल्फ, डायरेक्ट व टीम बिज़नेस का क्लोजिंग स्टेटमेंट लॉक व ऑडिट करता है।
                      </p>
                      <span className="inline-block px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 text-[10px] font-bold">
                        डेली ऑडिट लॉक
                      </span>
                    </div>

                    {/* Stage 5 */}
                    <div className="p-4 rounded-2xl bg-slate-900 border border-emerald-500/40 space-y-2 relative shadow-lg shadow-emerald-950/40">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 font-mono font-black flex items-center justify-center text-sm">
                        5
                      </div>
                      <h4 className="text-xs font-black text-emerald-300">पेआउट निस्तारण (Payout)</h4>
                      <p className="text-[11px] text-slate-300">
                        सदस्य अपने वॉलेट से निकासी अनुरोध करते हैं, या कार्यालय से नकद पेआउट प्राप्त करते हैं। एडमिन 1-क्लिक में रसीद सहित Paid मार्क करते हैं।
                      </p>
                      <span className="inline-block px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-black">
                        💵 नकद / बैंक पेआउट
                      </span>
                    </div>

                  </div>

                  {/* Highlights Banner */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-teal-950/40 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-0.5">
                      <span className="font-black text-white block">✅ 100% धारा 8 कंपनी अधिनियम 2013 एवं ट्रस्ट नियमों के अनुकूल</span>
                      <span className="text-slate-400 block">सॉफ्टवेयर में कोई भी अप्रमाणित या गुप्त कटौती नहीं होती। प्रत्येक पाई का हिसाब उपलब्ध है।</span>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCommissionSubTab('ledger')}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer"
                      >
                        सदस्य लेजर देखें ➔
                      </button>
                    </div>
                  </div>

                </div>
              )}

              {/* ============================================================== */}
              {/* SUB-TAB 4: ACTIVATION-WISE DISTRIBUTION RECORDS LOG */}
              {/* ============================================================== */}
              {commissionSubTab === 'records' && (
                <div className="bg-white rounded-3xl p-6 border border-pink-200/80 shadow-sm text-slate-900 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-700">
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <FileText className="w-5 h-5 text-purple-400" />
                        <span>सदस्यता सक्रियण अनुसार कमीशन एवं ट्रस्ट शेयर लॉग (Audit Log)</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        प्रत्येक सदस्य के शामिल होने पर डायरेक्ट, डाउनलाइन एवं ट्रस्ट शेयर का वास्तविक ऐतिहासिक रिकॉर्ड
                      </p>
                    </div>

                    <div className="relative w-full sm:w-72">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={payoutSearch}
                        onChange={(e) => setPayoutSearch(e.target.value)}
                        placeholder="सदस्य नाम, आईडी या ट्रांस आईडी..."
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                      {payoutSearch && (
                        <button
                          type="button"
                          onClick={() => setPayoutSearch('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {payoutRecordsList.length === 0 ? (
                    <div className="py-14 text-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center mx-auto text-slate-500">
                        <IndianRupee className="w-6 h-6" />
                      </div>
                      <div className="text-xs text-slate-400 max-w-md mx-auto">
                        {payoutSearch ? (
                          <span>&quot;{payoutSearch}&quot; से मेल खाता कोई रिकॉर्ड नहीं मिला।</span>
                        ) : (
                          <span>
                            अभी तक कोई पेआउट रिकॉर्ड दर्ज नहीं है। जैसे ही किसी नए सदस्य का फॉर्म सबमिट किया जाएगा या UTR भुगतान स्वीकृत होगा, उसका 12-स्तरीय विभाजन (डायरेक्ट, डाउनलाइन व ट्रस्ट शेयर) रीयलटाइम में यहाँ दर्ज हो जाएगा।
                          </span>
                        )}
                      </div>
                      {!payoutSearch && (
                        <button
                          type="button"
                          onClick={() => setShowAddMemberModal(true)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-900/30 cursor-pointer"
                        >
                          + नया सदस्य जोड़ें एवं कमीशन वितरित करें
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-pink-50/80 text-slate-700 font-bold border-b border-pink-200">
                          <tr>
                            <th className="py-3 px-3">दिनांक व समय</th>
                            <th className="py-3 px-3">सदस्य विवरण</th>
                            <th className="py-3 px-3 text-right">पैकेज राशि</th>
                            <th className="py-3 px-3 text-right bg-blue-950/20 text-blue-300">
                              डायरेक्ट कमीशन (L1)
                            </th>
                            <th className="py-3 px-3 text-right bg-amber-950/20 text-amber-300">
                              डाउनलाइन कमीशन (L2-12)
                            </th>
                            <th className="py-3 px-3 text-right bg-purple-950/20 text-purple-300">
                              ट्रस्ट का हिस्सा
                            </th>
                            <th className="py-3 px-3 text-center">स्थिति</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-pink-100 font-medium">
                          {payoutRecordsList.map((rec) => (
                            <tr key={rec.id} className="hover:bg-pink-50/40 transition-colors">
                              <td className="py-3.5 px-3 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                                {rec.createdAt || (rec.timestamp ? new Date(rec.timestamp).toLocaleString('en-IN') : 'N/A')}
                                <div className="text-[9px] text-slate-500 font-mono">{rec.id}</div>
                              </td>
                              <td className="py-3.5 px-3">
                                <div className="font-bold text-white text-xs">
                                  {rec.sourceMemberName || 'सदस्य'}
                                </div>
                                <div className="text-[11px] font-mono text-emerald-400">
                                  {rec.sourceMemberId || 'N/A'}
                                </div>
                              </td>
                              <td className="py-3.5 px-3 text-right font-mono font-bold text-white">
                                {formatINR(rec.packageAmount || 0)}
                              </td>
                              <td className="py-3.5 px-3 text-right font-mono font-bold text-blue-400 bg-blue-950/10">
                                +{formatINR(rec.directCommission || 0)}
                              </td>
                              <td className="py-3.5 px-3 text-right font-mono font-bold text-amber-400 bg-amber-950/10">
                                +{formatINR(rec.downlineCommission || 0)}
                              </td>
                              <td className="py-3.5 px-3 text-right font-mono font-bold text-purple-400 bg-purple-950/10">
                                +{formatINR(rec.trustShare || 0)}
                              </td>
                              <td className="py-3.5 px-3 text-center whitespace-nowrap">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>वितरित / सक्रिय</span>
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

            </div>
          );
        })()}

        {/* TAB 3: WITHDRAWAL REQUESTS */}
        {activeTab === 'withdrawals' && (
          <div className="bg-white rounded-3xl p-6 border border-pink-200/80 shadow-sm text-slate-900 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <IndianRupee className="w-5 h-5 text-emerald-400" />
                <span>मानदेय निकासी अनुरोध (Withdrawal Requests)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                सदस्यों द्वारा किए गए बैंक व UPI निकासी अनुरोधों का सत्यापन एवं भुगतान
              </p>
            </div>

            {withdrawalsList.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-400">
                कोई निकासी अनुरोध दर्ज नहीं है।
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-pink-50/80 text-slate-700 font-bold border-b border-pink-200">
                    <tr>
                      <th className="py-3 px-3">तारीख</th>
                      <th className="py-3 px-3">सदस्य</th>
                      <th className="py-3 px-3">राशि</th>
                      <th className="py-3 px-3">UPI ID</th>
                      <th className="py-3 px-3">बैंक खाता विवरण</th>
                      <th className="py-3 px-3 text-center">स्थिति</th>
                      <th className="py-3 px-3 text-right">कार्य</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-pink-100">
                    {withdrawalsList.map((w) => (
                      <tr key={w.id} className="hover:bg-pink-50/40">
                        <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                          {w.createdAt ? new Date(w.createdAt).toLocaleDateString('hi-IN') : '-'}
                        </td>
                        <td className="py-3 px-3">
                          <p className="font-bold text-white">{safeText(w.userName)}</p>
                          <p className="text-[10px] font-mono text-emerald-400">{safeText(w.memberId)}</p>
                          {w.phone && <p className="text-[10px] text-slate-400 font-mono">फोन: {w.phone}</p>}
                        </td>
                        <td className="py-3 px-3 font-bold text-white font-mono text-sm">
                          {formatINR(w.amount || 0)}
                        </td>
                        <td className="py-3 px-3">
                          {w.payoutMode === 'cash' || w.bankName?.includes('नकद') ? (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-black inline-flex items-center gap-1">
                              <span>💵 नकद / कार्यालय भुगतान</span>
                            </span>
                          ) : (
                            <span className="font-mono text-amber-300 text-xs">
                              {safeText(w.upiId || '-')}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-300 text-xs">
                          {w.payoutMode === 'cash' || w.bankName?.includes('नकद') ? (
                            <p className="text-[11px] text-emerald-300/90 font-medium">
                              ट्रस्ट कार्यालय से नकद मानदेय (बैंक खाता आवश्यक नहीं)
                            </p>
                          ) : (
                            <>
                              <p className="font-bold">{safeText(w.bankName || '-')}</p>
                              <p className="font-mono text-[10px] text-slate-400">A/c: {safeText(w.accountNo || '-')}</p>
                              <p className="font-mono text-[10px] text-slate-400">IFSC: {safeText(w.ifsc || '-')}</p>
                            </>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {w.status === 'approved' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>{w.paidMode ? `पूर्ण (${w.paidMode})` : 'भुगतान पूर्ण'}</span>
                            </span>
                          ) : w.status === 'rejected' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500/20 text-red-300 text-[10px] font-bold">
                              <XCircle className="w-3 h-3 text-red-400" />
                              <span>अस्वीकृत</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                              <Clock className="w-3 h-3 text-amber-400" />
                              <span>लंबित (Pending)</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          {w.status === 'pending' ? (
                            <div className="flex flex-col sm:flex-row items-end sm:items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleApproveWithdrawal(w, 'cash')}
                                className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[11px] transition whitespace-nowrap shadow cursor-pointer"
                                title="कार्यालय से नकद भुगतान स्वीकृत करें"
                              >
                                💵 नकद भुगतान
                              </button>
                              <button
                                type="button"
                                onClick={() => handleApproveWithdrawal(w, 'bank')}
                                className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] transition whitespace-nowrap cursor-pointer"
                                title="बैंक या UPI से भुगतान स्वीकृत करें"
                              >
                                🏦 बैंक पेड
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRejectWithdrawal(w)}
                                className="px-2 py-1.5 rounded-xl bg-red-900/60 hover:bg-red-800 text-red-300 text-[11px] transition cursor-pointer"
                                title="अस्वीकार एवं वॉलेट रिफंड"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-500 font-mono">
                              {w.paidAt ? new Date(w.paidAt).toLocaleDateString('hi-IN') : 'निस्तारित'}
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
        )}

        {/* TAB: DAILY CLOSINGS REPORTS (12:00 AM ENGINE) */}
        {activeTab === 'closings' && (
          <div className="space-y-6">
            
            {/* Closings Top Banner */}
            <div className="bg-white rounded-3xl p-6 border border-pink-200/80 shadow-sm text-slate-900 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold mb-2">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>12:00 AM मध्यरात्रि क्लोजिंग इंजन</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  दैनिक क्लोजिंग रिपोर्ट (Daily Closing Statements)
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  प्रतिदिन रात्रि 12:00 बजे (00:00 IST) ऑटोमैटिक रूप से समस्त सदस्यों का सेल्फ, डायरेक्ट, डाउनलाइन एवं टीम बिज़नेस का क्लोजिंग स्टेटमेंट।
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <MidnightCountdownBadge />
                <button
                  type="button"
                  onClick={handleRunManualClosing}
                  disabled={isRunningClosing}
                  className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-600 text-white font-extrabold text-xs shadow-lg shadow-emerald-900/30 border border-white/20 transition flex items-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isRunningClosing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>क्लोजिंग तैयार हो रही है...</span>
                    </>
                  ) : (
                    <>
                      <Clock className="w-4 h-4 text-emerald-200" />
                      <span>अभी डेली क्लोजिंग जनरेट करें (Run Now)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Closing Dates List / Selector */}
            {Object.keys(dailyClosings).length === 0 ? (
              <div className="bg-slate-800/80 rounded-3xl p-12 text-center border border-slate-700 space-y-3">
                <Clock className="w-10 h-10 text-slate-500 mx-auto" />
                <h3 className="text-sm font-bold text-white">अभी तक कोई दैनिक क्लोजिंग दर्ज नहीं है</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  मध्यरात्रि 12:00 बजे क्लोजिंग अपने आप बन जाएगी, अथवा आप टेस्टिंग हेतु ऊपर दिए गए &quot;अभी डेली क्लोजिंग जनरेट करें&quot; बटन पर क्लिक करके तुरंत क्लोजिंग बना सकते हैं।
                </p>
              </div>
            ) : (
              (() => {
                const dates = Object.keys(dailyClosings).sort().reverse();
                const activeDate = selectedClosingDate && dailyClosings[selectedClosingDate]
                  ? selectedClosingDate
                  : dates[0];
                const activeClosing = dailyClosings[activeDate] || {};
                const summary = activeClosing.summary || {};
                const statementsMap = activeClosing.statements || {};
                const statementsList = Object.values(statementsMap);

                return (
                  <div className="space-y-6">
                    {/* Date Selector Pills */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                      <span className="text-xs text-slate-400 font-bold flex items-center gap-1 pl-1">
                        <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                        <span>क्लोजिंग तारीख:</span>
                      </span>
                      {dates.map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setSelectedClosingDate(d)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                            d === activeDate
                              ? 'bg-emerald-600 text-white shadow-md'
                              : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                          }`}
                        >
                          <span>{d}</span>
                          {d === getISTDateString() && (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-400 text-slate-950 text-[9px] font-black">
                              TODAY
                            </span>
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Summary 4-Cards Grid for Active Date */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      
                      <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-900/60 to-slate-900 border border-blue-500/30 text-white shadow">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-blue-300">कुल सक्रिय सदस्य</p>
                        <h3 className="text-2xl font-black mt-1">{summary.totalActiveMembers ?? statementsList.length}</h3>
                        <p className="text-[10px] text-blue-200/80 mt-1 font-mono">12:00 AM स्टेटमेंट शामिल</p>
                      </div>

                      <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-900/60 to-slate-900 border border-emerald-500/30 text-white shadow">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">कुल बिज़नेस वॉल्यूम (₹)</p>
                        <h3 className="text-2xl font-black mt-1">
                          {formatINR((summary.totalSelfBusiness || 0) + (summary.totalTeamBusiness || 0))}
                        </h3>
                        <p className="text-[10px] text-emerald-200/80 mt-1 font-mono">सेल्फ + टीम जन सहयोग</p>
                      </div>

                      <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-900/60 to-slate-900 border border-amber-500/30 text-white shadow">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-amber-300">कुल वितरित मानदेय (₹)</p>
                        <h3 className="text-2xl font-black mt-1">
                          {formatINR(summary.totalCommission || 0)}
                        </h3>
                        <p className="text-[10px] text-amber-200/80 mt-1 font-mono">सेल्फ + डायरेक्ट + डाउनलाइन</p>
                      </div>

                      <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-900/60 to-slate-900 border border-purple-500/30 text-white shadow">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-purple-300">फाउंडेशन / ट्रस्ट शेयर (₹)</p>
                        <h3 className="text-2xl font-black mt-1">
                          {formatINR(summary.totalTrustShare || 0)}
                        </h3>
                        <p className="text-[10px] text-purple-200/80 mt-1 font-mono">सेवा व कल्याण प्रकल्प कोष</p>
                      </div>

                    </div>

                    {/* Member Statement Table */}
                    <div className="bg-white rounded-3xl p-6 border border-pink-200/80 shadow-sm text-slate-900 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-700 gap-2">
                        <div>
                          <h3 className="text-base font-bold text-white flex items-center gap-2">
                            <FileText className="w-5 h-5 text-emerald-400" />
                            <span>सदस्यवार दैनिक क्लोजिंग स्टेटमेंट ({activeDate})</span>
                          </h3>
                          <p className="text-xs text-slate-400 mt-0.5">
                            सभी सदस्यों का 12:00 AM क्लोजिंग स्नैपशॉट (सेल्फ, डायरेक्ट, डाउनलाइन, टीम व पेआउट स्थिति)
                          </p>
                        </div>
                        <span className="text-xs font-mono text-emerald-400 font-bold">
                          कुल रिकॉर्ड्स: {statementsList.length}
                        </span>
                      </div>

                      {statementsList.length === 0 ? (
                        <div className="py-12 text-center text-xs text-slate-400">
                          इस तारीख के लिए कोई सदस्य स्टेटमेंट उपलब्ध नहीं है।
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs text-left">
                            <thead className="bg-pink-50/80 text-slate-700 font-bold border-b border-pink-200">
                              <tr>
                                <th className="py-3 px-3">सदस्य विवरण</th>
                                <th className="py-3 px-3 text-right">सेल्फ बिज़नेस</th>
                                <th className="py-3 px-3 text-right">डायरेक्ट बिज़नेस</th>
                                <th className="py-3 px-3 text-right">डाउनलाइन बिज़नेस</th>
                                <th className="py-3 px-3 text-right">टीम बिज़नेस</th>
                                <th className="py-3 px-3 text-right text-blue-300">डायरेक्ट कमीशन</th>
                                <th className="py-3 px-3 text-right text-amber-300">डाउनलाइन कमीशन</th>
                                <th className="py-3 px-3 text-right text-emerald-400 font-bold">कुल कमीशन</th>
                                <th className="py-3 px-3 text-right text-slate-300">ट्रस्ट शेयर</th>
                                <th className="py-3 px-3 text-center">पेआउट स्थिति</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-pink-100 font-mono">
                              {statementsList.map((st) => (
                                <tr key={st.uid || st.memberId} className="hover:bg-pink-50/40">
                                  <td className="py-3 px-3 font-sans">
                                    <p className="font-bold text-white text-xs">{safeText(st.name)}</p>
                                    <p className="text-[10px] text-emerald-400 font-mono">{safeText(st.memberId)}</p>
                                    <p className="text-[10px] text-slate-400 font-mono">{safeText(st.phone)}</p>
                                  </td>
                                  <td className="py-3 px-3 text-right text-slate-200">
                                    {formatINR(st.selfBusiness || 0)}
                                  </td>
                                  <td className="py-3 px-3 text-right text-slate-200">
                                    {formatINR(st.directTeamBusiness || 0)}
                                  </td>
                                  <td className="py-3 px-3 text-right text-slate-200">
                                    {formatINR(st.downlineBusiness || 0)}
                                  </td>
                                  <td className="py-3 px-3 text-right font-bold text-white">
                                    {formatINR(st.teamBusiness || 0)}
                                  </td>
                                  <td className="py-3 px-3 text-right text-blue-300">
                                    +{formatINR(st.directTeamCommission || 0)}
                                  </td>
                                  <td className="py-3 px-3 text-right text-amber-300">
                                    +{formatINR(st.downlineCommission || 0)}
                                  </td>
                                  <td className="py-3 px-3 text-right font-black text-emerald-400 bg-emerald-950/20">
                                    {formatINR(st.totalCommission || 0)}
                                  </td>
                                  <td className="py-3 px-3 text-right text-slate-300">
                                    {formatINR(st.trustShare || 0)}
                                  </td>
                                  <td className="py-3 px-3 text-center font-sans">
                                    {st.payoutStatus === 'Pending' ? (
                                      <div className="flex flex-col items-center gap-1.5">
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                                          <Clock className="w-3 h-3 text-amber-400" />
                                          Pending ({formatINR(st.walletBalance || 0)})
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => handleMarkCashPayoutPaid(st, activeDate)}
                                          className="px-2 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[10px] shadow transition active:scale-95 cursor-pointer whitespace-nowrap"
                                          title="बिना बैंक खाते के नकद भुगतान संपन्न मार्क करें"
                                        >
                                          💵 नकद पेड मार्क करें
                                        </button>
                                      </div>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                        Paid / Settled
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
                );
              })()
            )}

          </div>
        )}

        {/* TAB 8: VIDEO & POSTER MANAGER (Requirement 2 & 3) */}
        {(activeTab === 'media' || activeTab === 'video-posters') && (
          <div className="bg-white rounded-3xl p-6 border border-pink-200/80 shadow-sm text-slate-900 space-y-6">
            
            {/* Header & Description */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-100 text-amber-800 rounded-2xl border border-amber-200">
                  <Film className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <span>🎬 Video & Poster Manager (वीडियो एवं बैनर प्रबंधन)</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    वेबसाइट पर लगातार चलने वाले वीडियो (Continuous Autoplay & Loop) एवं सभी 4 स्लॉट के पोस्टर यहाँ से प्रबंधित करें।
                  </p>
                </div>
              </div>

              {/* Sub-Tabs Switcher */}
              <div className="flex items-center p-1 rounded-2xl bg-slate-100 border border-slate-200 gap-1">
                <button
                  type="button"
                  onClick={() => setVideoPosterSubTab('videos')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    videoPosterSubTab === 'videos'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>वीडियो प्रबंधन ({videosList.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setVideoPosterSubTab('posters')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    videoPosterSubTab === 'posters'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>बैनर एवं पोस्टर ({postersList.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setVideoPosterSubTab('submissions')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    videoPosterSubTab === 'submissions'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>सदस्य सबमिशन ({mediaSubmissionsList.length})</span>
                </button>
              </div>
            </div>

            {/* =========================================================================
                SUB-TAB 1: VIDEOS & CONTINUOUS AUTOPLAY MANAGER (Requirement 2)
               ========================================================================= */}
            {videoPosterSubTab === 'videos' && (
              <div className="space-y-6">
                
                {/* Upload Form Card */}
                <div className="bg-amber-50/60 rounded-3xl p-5 sm:p-6 border border-amber-200/90 space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-amber-200">
                    <Sparkles className="w-4 h-4 text-amber-700" />
                    <h3 className="font-black text-slate-900 text-sm">
                      नया वीडियो जोड़ें / अपलोड करें (Upload / Add Continuous Autoplay Video)
                    </h3>
                  </div>

                  {videoSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>{videoSuccess}</span>
                    </div>
                  )}

                  {videoError && (
                    <div className="p-3 rounded-xl bg-rose-100 border border-rose-300 text-rose-800 text-xs font-bold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                      <span>{videoError}</span>
                    </div>
                  )}

                  <form onSubmit={handleAddVideo} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Video Title */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          वीडियो शीर्षक / विवरण (Video Title / Caption) *
                        </label>
                        <input
                          type="text"
                          placeholder="उदा. संस्था परिचय, दीपावली उत्सव संदेश, रक्तदान शिविर..."
                          value={videoTitle}
                          onChange={(e) => setVideoTitle(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-900 outline-none focus:border-amber-500"
                        />
                      </div>

                      {/* Video Category */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          श्रेणी (Category)
                        </label>
                        <select
                          value={videoCategory}
                          onChange={(e) => setVideoCategory(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-900 outline-none focus:border-amber-500 cursor-pointer"
                        >
                          <option value="संस्था गतिविधियाँ">संस्था गतिविधियाँ (Foundation Activities)</option>
                          <option value="दीपावली संदेश">दीपावली संदेश (Diwali Festive Greeting)</option>
                          <option value="चिकित्सा एवं स्वास्थ्य शिविर">चिकित्सा एवं स्वास्थ्य शिविर (Medical Camps)</option>
                          <option value="बाल शिक्षा प्रोत्साहन">बाल शिक्षा प्रोत्साहन (Education Drive)</option>
                          <option value="गौ सेवा एवं संरक्षण">गौ सेवा एवं संरक्षण (Gau Seva)</option>
                          <option value="वार्षिक उत्सव">वार्षिक उत्सव (Annual Celebration)</option>
                        </select>
                      </div>

                      {/* Video File Upload */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          विकल्प 1: वीडियो फ़ाइल अपलोड करें (MP4 / WebM File)
                        </label>
                        <input
                          type="file"
                          accept="video/mp4,video/webm,video/ogg"
                          onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                          className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-700 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-amber-100 file:text-amber-800 hover:file:bg-amber-200 cursor-pointer"
                        />
                        {videoFile && (
                          <p className="text-[10px] text-emerald-700 font-bold mt-1">
                            चयनित फ़ाइल: {videoFile.name} ({(videoFile.size / (1024 * 1024)).toFixed(1)} MB)
                          </p>
                        )}
                      </div>

                      {/* Direct Video or YouTube URL */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          विकल्प 2: अथवा डायरेक्ट वीडियो या YouTube लिंक दर्ज करें
                        </label>
                        <input
                          type="url"
                          placeholder="https://www.youtube.com/watch?v=... अथवा .mp4 URL"
                          value={videoUrl}
                          onChange={(e) => setVideoUrl(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-mono text-slate-900 outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    {/* Featured Checkbox & Submit */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-amber-200">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={videoFeatured}
                          onChange={(e) => setVideoFeatured(e.target.checked)}
                          className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-gray-300"
                        />
                        <span className="text-xs font-bold text-slate-900">
                          🌟 इस वीडियो को मुख्य वेबसाइट के होमपेज पर प्राथमिक (Featured Autoplay) वीडियो बनाएं
                        </span>
                      </label>

                      <button
                        type="submit"
                        disabled={videoUploading}
                        className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shrink-0"
                      >
                        {videoUploading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>अपलोड एवं पब्लिश हो रहा है...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4" />
                            <span>वीडियो पब्लिश करें (Publish Video)</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Live Videos Grid */}
                <div>
                  <h3 className="font-black text-slate-900 text-sm mb-3 flex items-center gap-2">
                    <Video className="w-4 h-4 text-amber-600" />
                    <span>सक्रिय वीडियो सूची (Active Showcase Videos — {videosList.length})</span>
                  </h3>

                  {videosList.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                      कोई कस्टम वीडियो दर्ज नहीं है। ऊपर दिए गए फॉर्म से वीडियो अपलोड करें।
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {videosList.map((video) => (
                        <div
                          key={video.id}
                          className="rounded-2xl overflow-hidden bg-slate-900 text-white border border-slate-700 shadow-md flex flex-col justify-between"
                        >
                          <div>
                            {/* Preview Player */}
                            <div className="relative aspect-video bg-black flex items-center justify-center">
                              {video.url.includes('youtube.com') || video.url.includes('youtu.be') ? (
                                <div className="text-center p-4">
                                  <Film className="w-8 h-8 text-amber-400 mx-auto mb-1" />
                                  <span className="text-xs text-slate-300 font-mono">YouTube Video</span>
                                </div>
                              ) : (
                                <video src={video.url} controls className="w-full h-full object-cover" />
                              )}

                              {video.featured && (
                                <span className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] shadow-sm flex items-center gap-1">
                                  <Star className="w-3 h-3 fill-slate-950" />
                                  <span>FEATURED</span>
                                </span>
                              )}

                              <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                video.active ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'
                              }`}>
                                {video.active ? '🟢 एक्टिव' : '⚪ बंद'}
                              </span>
                            </div>

                            <div className="p-3.5 space-y-1.5">
                              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                                {safeText(video.category)}
                              </span>
                              <h4 className="font-bold text-white text-xs line-clamp-1">
                                {safeText(video.title)}
                              </h4>
                              <p className="text-[10px] text-slate-400 font-mono truncate">
                                URL: {video.url}
                              </p>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="p-3 bg-slate-950/70 border-t border-slate-800 flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => handleSetFeaturedVideo(video)}
                              className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition flex items-center gap-1 cursor-pointer ${
                                video.featured
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                  : 'bg-slate-800 hover:bg-amber-900/40 text-slate-300 hover:text-amber-200'
                              }`}
                              title="Make this the Primary Featured Video on Homepage"
                            >
                              <Star className="w-3 h-3" />
                              <span>{video.featured ? 'मुख्य वीडियो है' : 'मुख्य बनाएं'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleVideoActive(video)}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold transition cursor-pointer"
                            >
                              {video.active ? 'छुपाएं' : 'सक्रिय करें'}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteVideo(video.id)}
                              className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition cursor-pointer"
                              title="Delete Video"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* =========================================================================
                SUB-TAB 2: MULTI-SLOT BANNERS & POSTERS MANAGER (Requirement 3)
               ========================================================================= */}
            {videoPosterSubTab === 'posters' && (
              <div className="space-y-6">
                
                {/* Upload Poster Form */}
                <div className="bg-rose-50/60 rounded-3xl p-5 sm:p-6 border border-rose-200/90 space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-rose-200">
                    <ImageIcon className="w-4 h-4 text-rose-700" />
                    <h3 className="font-black text-slate-900 text-sm">
                      नया बैनर या पोस्टर अपलोड करें (Upload Multi-Slot Banner / Poster)
                    </h3>
                  </div>

                  {posterSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>{posterSuccess}</span>
                    </div>
                  )}

                  {posterError && (
                    <div className="p-3 rounded-xl bg-rose-100 border border-rose-300 text-rose-800 text-xs font-bold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                      <span>{posterError}</span>
                    </div>
                  )}

                  <form onSubmit={handleAddPoster} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Title */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          पोस्टर शीर्षक / संदेश (Poster Title / Headline) *
                        </label>
                        <input
                          type="text"
                          placeholder="उदा. शुभ दीपावली महापर्व, वार्षिक बैठक, विशेष सहायता शिविर..."
                          value={posterTitle}
                          onChange={(e) => setPosterTitle(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-900 outline-none focus:border-rose-500"
                        />
                      </div>

                      {/* Slot Selector */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          डिस्प्ले स्लॉट चुनें (Display Location Slot) *
                        </label>
                        <select
                          value={posterSlot}
                          onChange={(e) => setPosterSlot(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-900 outline-none focus:border-rose-500 cursor-pointer"
                        >
                          <option value="hero">🔹 Slot 1 — Top Hero Festive Banner / Slider (होमपेज शीर्ष स्लाइडर)</option>
                          <option value="events">🔹 Slot 2 — Middle Event & Campaign Poster Grid (होमपेज मध्य ग्रिड)</option>
                          <option value="dashboard">🔹 Slot 3 — Staff / Member Dashboard Notice Banner (सदस्य पैनल)</option>
                          <option value="popup">🔹 Slot 4 — Special Festive Popup Poster (वेबसाइट ओपन पॉपअप)</option>
                          <option value="all">🔹 All Locations — सभी स्थानों पर प्रदर्शित करें</option>
                        </select>
                      </div>

                      {/* Poster Image File */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          विकल्प 1: इमेज फ़ाइल अपलोड करें (JPG, PNG, WebP)
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setPosterFile(e.target.files?.[0] || null)}
                          className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-700 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-rose-100 file:text-rose-800 hover:file:bg-rose-200 cursor-pointer"
                        />
                        {posterFile && (
                          <p className="text-[10px] text-emerald-700 font-bold mt-1">
                            चयनित इमेज: {posterFile.name} ({(posterFile.size / 1024).toFixed(0)} KB)
                          </p>
                        )}
                      </div>

                      {/* Image URL fallback */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          विकल्प 2: अथवा डायरेक्ट इमेज URL दर्ज करें
                        </label>
                        <input
                          type="url"
                          placeholder="https://example.com/poster.jpg"
                          value={posterUrl}
                          onChange={(e) => setPosterUrl(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-mono text-slate-900 outline-none focus:border-rose-500"
                        />
                      </div>

                      {/* Sub-Message */}
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          विस्तृत संदेश / विवरण (Detailed Message - Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="अतिरिक्त विवरण या आमंत्रण संदेश दर्ज करें..."
                          value={posterMessage}
                          onChange={(e) => setPosterMessage(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 outline-none focus:border-rose-500"
                        />
                      </div>

                      {/* Link URL */}
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          क्लिक लिंक URL (Destination Link - Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="/register अथवा https://..."
                          value={posterLink}
                          onChange={(e) => setPosterLink(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-mono text-slate-900 outline-none focus:border-rose-500"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-2 border-t border-rose-200">
                      <button
                        type="submit"
                        disabled={posterUploading}
                        className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white font-bold text-xs shadow-md transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                      >
                        {posterUploading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>पोस्टर अपलोड हो रहा है...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4" />
                            <span>पोस्टर पब्लिश करें (Publish Poster)</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Posters Grid */}
                <div>
                  <h3 className="font-black text-slate-900 text-sm mb-3 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-rose-600" />
                    <span>सक्रिय पोस्टर एवं बैनर (Active Posters — {postersList.length})</span>
                  </h3>

                  {postersList.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                      कोई पोस्टर दर्ज नहीं है। ऊपर दिए गए फॉर्म से इमेज अपलोड करें।
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                      {postersList.map((poster) => (
                        <div
                          key={poster.id}
                          className="rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-md flex flex-col justify-between"
                        >
                          <div>
                            <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden flex items-center justify-center">
                              <img
                                src={poster.imageUrl}
                                alt={poster.title || 'Poster'}
                                className="w-full h-full object-cover"
                              />
                              <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/75 text-amber-300 font-mono text-[9px] font-bold uppercase backdrop-blur-md">
                                {poster.slot === 'hero' ? 'Slot 1: Hero' : poster.slot === 'events' ? 'Slot 2: Events' : poster.slot === 'dashboard' ? 'Slot 3: Dash' : poster.slot === 'popup' ? 'Slot 4: Popup' : 'All Slots'}
                              </span>
                            </div>

                            <div className="p-3 space-y-1">
                              <h4 className="font-bold text-slate-900 text-xs line-clamp-1">
                                {safeText(poster.title || 'शीर्षक रहित')}
                              </h4>
                              {poster.message && (
                                <p className="text-[10px] text-slate-500 line-clamp-2">{safeText(poster.message)}</p>
                              )}
                              {poster.link && (
                                <p className="text-[9px] text-emerald-700 font-mono truncate">
                                  Link: {poster.link}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleTogglePosterActive(poster)}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                                poster.active
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {poster.active ? '🟢 लाइव है' : '⚪ बंद है'}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeletePoster(poster.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                              title="Delete Poster"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* =========================================================================
                SUB-TAB 3: USER MEDIA SUBMISSIONS APPROVALS (100% PRESERVED)
               ========================================================================= */}
            {videoPosterSubTab === 'submissions' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Award className="w-4 h-4 text-emerald-600" />
                    <span>सदस्य सेवा कार्य सबमिशन (Member Service Submissions)</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    यहाँ स्वीकृत किए गए फ़ोटो व वीडियो मुख्य वेबसाइट की सार्वजनिक गैलरी में प्रदर्शित होंगे।
                  </p>
                </div>

                {mediaSubmissionsList.length === 0 ? (
                  <div className="py-16 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                    कोई मीडिया सबमिशन दर्ज नहीं है।
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {mediaSubmissionsList.map((m) => (
                      <div key={m.id} className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 flex flex-col justify-between">
                        <div>
                          <div className="relative aspect-video bg-black flex items-center justify-center">
                            {m.resourceType === 'video' ? (
                              <video src={m.url} controls className="w-full h-full object-cover" />
                            ) : (
                              <img src={m.url} alt={safeText(m.title)} className="w-full h-full object-cover" />
                            )}
                            <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              m.status === 'approved' ? 'bg-emerald-600 text-white' : m.status === 'rejected' ? 'bg-red-600 text-white' : 'bg-amber-500 text-slate-950'
                            }`}>
                              {m.status === 'approved' ? 'स्वीकृत' : m.status === 'rejected' ? 'अस्वीकृत' : 'लंबित'}
                            </span>
                          </div>

                          <div className="p-4 space-y-2">
                            <span className="text-[10px] font-semibold text-emerald-400 block">{safeText(m.category)}</span>
                            <h4 className="font-bold text-white text-sm line-clamp-1">{safeText(m.title)}</h4>
                            <p className="text-xs text-slate-400 line-clamp-2">{safeText(m.caption)}</p>
                            <div className="pt-2 text-[10px] text-slate-500 flex justify-between border-t border-slate-800">
                              <span>प्रस्तुतकर्ता: {safeText(m.submittedByName)}</span>
                              <span>ID: {safeText(m.submittedByMemberId)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="p-3 bg-slate-950/50 border-t border-slate-800 flex items-center justify-between gap-2">
                          {m.status === 'pending' ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleApproveMedia(m)}
                                className="flex-1 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>स्वीकृत करें</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRejectMedia(m)}
                                className="flex-1 py-1.5 rounded-xl bg-slate-800 hover:bg-red-900/50 text-red-300 text-xs font-semibold transition cursor-pointer"
                              >
                                अस्वीकार
                              </button>
                            </>
                          ) : (
                            <div className="w-full flex items-center justify-between text-xs text-slate-400">
                              <span>स्थिति: {m.status === 'approved' ? 'लाइव प्रदर्शित' : 'अस्वीकृत'}</span>
                              <button
                                type="button"
                                onClick={() => handleDeleteMedia(m.id)}
                                className="p-1 text-slate-500 hover:text-red-400 cursor-pointer"
                                title="Delete Media"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        )}

        {/* TAB 5: CHARITY SPENDS & SETTINGS */}
        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* DIWALI FESTIVAL THEME SETTINGS CARD (Requirement 1) */}
            <div className="lg:col-span-2 bg-gradient-to-r from-amber-50 to-orange-50 rounded-3xl p-6 border-2 border-amber-300 shadow-sm text-slate-900 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-amber-200 gap-3">
                <div className="flex items-center gap-3">
                  <GlowingDiya size="sm" />
                  <div>
                    <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                      <span>🪔 शुभ दीपावली उत्सव थीम सेटिंग्स (Diwali Festival Theme Settings)</span>
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      वेबसाइट, सदस्य डैशबोर्ड एवं एडमिन पैनल पर फूलों की तोरण, जलते हुए दीये एवं सुनहरी रोशनी चालू/बंद करें
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={toggleDiwaliTheme}
                  className={`px-4 py-2 rounded-2xl font-black text-xs shadow-md transition cursor-pointer flex items-center gap-2 shrink-0 ${
                    isDiwaliActive
                      ? 'bg-amber-600 hover:bg-amber-700 text-white ring-2 ring-amber-400'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  <GlowingDiya size="xs" />
                  <span>{isDiwaliActive ? '🪔 थीम सक्रिय है (ON)' : '⚪ थीम बंद है (OFF)'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-white/80 rounded-2xl border border-amber-200">
                  <span className="font-bold text-amber-900 block mb-1">🌸 फूलों की तोरण (Toran)</span>
                  <p className="text-[11px] text-slate-600">गेंदे के फूलों और आम के पत्तों की माला शीर्ष पर प्रदर्शित होती है।</p>
                </div>
                <div className="p-3 bg-white/80 rounded-2xl border border-amber-200">
                  <span className="font-bold text-amber-900 block mb-1">🪔 जलते हुए दीये (Diyas)</span>
                  <p className="text-[11px] text-slate-600">हेडर, बैनर और कार्ड्स पर सजीव झिलमिलाती लौ के साथ दीये।</p>
                </div>
                <div className="p-3 bg-white/80 rounded-2xl border border-amber-200">
                  <span className="font-bold text-amber-900 block mb-1">✨ सुनहरी रोशनी (Sparkles)</span>
                  <p className="text-[11px] text-slate-600">बैकग्राउंड में हल्की आतिशबाजी व सितारे (क्लिक को कभी नहीं रोकते)।</p>
                </div>
                <div className="p-3 bg-white/80 rounded-2xl border border-amber-200">
                  <span className="font-bold text-amber-900 block mb-1">📊 100% स्पष्ट पठनीयता</span>
                  <p className="text-[11px] text-slate-600">सभी रिपोर्ट टेबल हाई-कंट्रास्ट वाइट/पिंक व बोल्ड ब्लैक में सुरक्षित।</p>
                </div>
              </div>
            </div>
            
            {/* 100% MANUAL LEVEL 1 TO 12 PERCENTAGE CONFIGURATION CARD */}
            <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-pink-200/80 shadow-sm text-slate-900 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-700 gap-2">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Percent className="w-5 h-5 text-emerald-400" />
                    <span>100% मैनुअल 12-स्तरीय मानदेय प्रतिशत दरें (Level 1 to 12 Rates Setting)</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    यहाँ व्यवस्थापक (Admin) स्तर 1 से स्तर 12 तक का कोई भी कस्टम प्रतिशत (उदा. 10%, 12%, 5%, 1%, 0.5% या 0%) मैन्युअली टाइप करके सुरक्षित कर सकते हैं।
                  </p>
                </div>
                {saveRatesSuccess && (
                  <div className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5 animate-pulse">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>दरें सफलतापूर्वक सुरक्षित हुईं!</span>
                  </div>
                )}
              </div>

              <form onSubmit={handleSaveLevelRates} className="space-y-4">
                
                {/* Self Business Commission Rate Box */}
                <div className="p-4 bg-gradient-to-r from-purple-950/40 via-slate-900 to-indigo-950/40 rounded-2xl border border-purple-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-purple-400" />
                      <span>सेल्फ बिज़नेस मानदेय दर (%) (Self Business Commission Rate %)</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      सदस्य द्वारा स्वयं की ID सक्रिय करने पर मानदेय प्रतिशत (डिफ़ॉल्ट 0% - नियमानुसार स्वयं के दान पर कमीशन शून्य)
                    </p>
                  </div>
                  <div className="relative w-36 shrink-0">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={selfBusinessRate !== undefined ? selfBusinessRate : 0}
                      onChange={(e) => setSelfBusinessRate(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 pr-7 rounded-xl bg-slate-800 border border-purple-400/40 text-white font-mono font-bold text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-purple-300 font-bold text-xs">%</span>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-2">
                    <Percent className="w-3.5 h-3.5 text-emerald-400" />
                    <span>स्तर 1 से 12 तक की दरें (Level 1 to Level 12 Rates):</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((lvl) => (
                      <div key={lvl} className="p-3 bg-slate-900 rounded-2xl border border-slate-700/80 space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-slate-300">स्तर {lvl} (L{lvl})</span>
                          <span className="text-emerald-400 font-mono text-[11px]">%</span>
                        </div>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={levelRates[lvl] !== undefined ? levelRates[lvl] : ''}
                            onChange={(e) => setLevelRates(prev => ({ ...prev, [lvl]: e.target.value }))}
                            placeholder="0"
                            className="w-full px-3 py-2 pr-7 rounded-xl bg-slate-800 border border-slate-600 text-white font-mono font-bold text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={isSavingRates}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-900/30 transition active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {isSavingRates ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>दरें सुरक्षित हो रही हैं...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>12-स्तरीय एवं सेल्फ मानदेय दरें सुरक्षित करें (Save Rates)</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* ADD CHARITY SPEND FORM */}
            <div className="bg-white rounded-3xl p-6 border border-pink-200/80 shadow-sm text-slate-900 space-y-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-700">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                <span>सेवा कार्य व्यय प्रविष्टि (Add Verified Charity Spend)</span>
              </h2>
              <p className="text-xs text-slate-400">
                यहाँ जोड़ा गया प्रत्येक व्यय होमपेज पर &quot;सेवा कार्य व्यय&quot; रीयलटाइम स्टेटिस्टिक में तुरंत जुड़ जाता है।
              </p>

              <form onSubmit={handleAddCharitySpend} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    सेवा कार्य का शीर्षक *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="उदा. काशीपुर मलिन बस्ती में 150 कम्बल वितरण"
                    value={spendTitle}
                    onChange={(e) => setSpendTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      व्यय राशि (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      placeholder="उदा. 25000"
                      value={spendAmount}
                      onChange={(e) => setSpendAmount(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      लाभार्थियों की संख्या
                    </label>
                    <input
                      type="text"
                      placeholder="उदा. 150 परिवार"
                      value={spendBeneficiaries}
                      onChange={(e) => setSpendBeneficiaries(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    व्यय श्रेणी (Category)
                  </label>
                  <select
                    value={spendCategory}
                    onChange={(e) => setSpendCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="कंबल व राहत सामग्री वितरण">कंबल व राहत सामग्री वितरण</option>
                    <option value="बाल शिक्षा व छात्रवृत्ति">बाल शिक्षा व छात्रवृत्ति सहायता</option>
                    <option value="चिकित्सा जांच व निःशुल्क दवा">चिकित्सा जांच व निःशुल्क दवा</option>
                    <option value="पर्यावरण व वृक्षारोपण">पर्यावरण व वृक्षारोपण अभियान</option>
                    <option value="महिला स्वावलंबन किट">महिला स्वावलंबन किट वितरण</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-xs text-white transition flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>व्यय सुरक्षित करें (Save Spend)</span>
                </button>
              </form>

              {/* Spends List */}
              <div className="pt-4 border-t border-slate-700 space-y-2">
                <h4 className="font-bold text-xs text-slate-300">हालिया व्यय रिकॉर्ड्स:</h4>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {Object.values(spends).length === 0 ? (
                    <p className="text-xs text-slate-500">अभी तक कोई व्यय दर्ज नहीं हुआ है।</p>
                  ) : (
                    Object.values(spends).map((s) => (
                      <div key={s.id} className="p-2.5 rounded-xl bg-slate-900 border border-slate-700/60 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-white">{safeText(s.title)}</p>
                          <p className="text-[10px] text-slate-400">{safeText(s.category)} • {safeText(s.beneficiaries)}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <strong className="text-emerald-400 font-mono">{formatINR(s.amount || 0)}</strong>
                          <button
                            type="button"
                            onClick={() => handleDeleteSpend(s.id)}
                            className="text-slate-500 hover:text-red-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* FOUNDATION STATUTORY INFO & BANK SETTINGS */}
            <div className="bg-white rounded-3xl p-6 border border-pink-200/80 shadow-sm text-slate-900 space-y-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-700">
                <Settings className="w-5 h-5 text-emerald-400" />
                <span>फाउंडेशन वैधानिक विवरण एवं संपर्क</span>
              </h2>

              <div className="space-y-3 text-xs text-slate-300">
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-700 space-y-1">
                  <p className="text-slate-400 font-medium">संस्था का नाम (हिंदी/English):</p>
                  <p className="font-bold text-white">{safeText(FOUNDATION_DETAILS.nameHindi)}</p>
                  <p className="text-emerald-400 font-medium">{safeText(FOUNDATION_DETAILS.nameEnglish)}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-700">
                    <p className="text-slate-400">कॉर्पोरेट CIN:</p>
                    <p className="font-mono font-bold text-white mt-1">{safeText(FOUNDATION_DETAILS.cin)}</p>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-700">
                    <p className="text-slate-400">स्थायी खाता (PAN):</p>
                    <p className="font-mono font-bold text-white mt-1">{safeText(FOUNDATION_DETAILS.pan)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-700">
                    <p className="text-slate-400">टैक्स खाता (TAN):</p>
                    <p className="font-mono font-bold text-white mt-1">{safeText(FOUNDATION_DETAILS.tan)}</p>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-700">
                    <p className="text-slate-400">आधिकारिक UPI ID:</p>
                    <p className="font-mono font-bold text-emerald-400 mt-1">{safeText(FOUNDATION_DETAILS.upiId)}</p>
                  </div>
                </div>

                <div className="p-3 bg-slate-900 rounded-xl border border-slate-700 space-y-1">
                  <p className="text-slate-400 font-medium">पंजीकृत मुख्यालय पता:</p>
                  <p className="text-slate-200">{safeText(FOUNDATION_DETAILS.address)}</p>
                </div>

                <div className="p-3 bg-slate-900 rounded-xl border border-slate-700 space-y-1">
                  <p className="text-slate-400 font-medium">फाउंडेशन बैंक खाता:</p>
                  <p className="text-white font-medium">{safeText(FOUNDATION_DETAILS.bankDetails.bankName)}</p>
                  <p className="font-mono text-slate-300">A/c: {safeText(FOUNDATION_DETAILS.bankDetails.accountNo)} | IFSC: {safeText(FOUNDATION_DETAILS.bankDetails.ifsc)}</p>
                </div>
              </div>
            </div>

            {/* 1-CLICK CLEAN / RESET SOFTWARE TEST DATA CARD */}
            <div className="lg:col-span-2 bg-gradient-to-r from-rose-950/40 via-slate-900 to-red-950/40 rounded-3xl p-6 border border-rose-500/40 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-rose-900/60 gap-3">
                <div className="space-y-1">
                  <h3 className="text-base font-black text-rose-300 flex items-center gap-2">
                    <Trash2 className="w-5 h-5 text-rose-400" />
                    <span>1-क्लिक सॉफ्टवेयर टेस्ट डेटा क्लीन व रीसेट (Clean & Reset All Test Data)</span>
                  </h3>
                  <p className="text-xs text-rose-200/80">
                    परीक्षण पूर्ण होने के उपरांत सभी परीक्षण सदस्यों (Test Users), UTR पेमेंट्स, निकासियों, दैनिक क्लोजिंग्स और ट्रांजैक्शन रिकॉर्ड्स को क्लीन करें।
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowResetConfirmModal(true)}
                  className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-black text-xs shadow-lg shadow-red-900/40 border border-white/20 transition active:scale-95 cursor-pointer shrink-0"
                >
                  🧹 क्लीन व रीसेट करें (Reset Test Data)
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-rose-900/50">
                  <p className="font-bold text-rose-400 mb-1">🗑️ क्या डिलीट होगा:</p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    /users (सभी टेस्ट सदस्य), /payment_requests, /withdrawals, /daily_closings, /closings, /transactions, /payout_records
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-emerald-900/50">
                  <p className="font-bold text-emerald-400 mb-1">🔒 क्या सुरक्षित रहेगा:</p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    कमीशन प्रतिशत दरें (Level 1-12 Rates), सेल्फ बिज़नेस दर, फाउंडेशन आधिकारिक UPI ID, ट्रस्ट वैधानिक दस्तावेज, एवं नया रूट स्पॉन्सर (UCWF-0001)।
                  </p>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* EDIT MEMBER DETAILS MODAL */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-xl bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden my-8">
            <div className="px-6 py-4 bg-slate-800 text-white flex items-center justify-between border-b border-slate-700">
              <h3 className="font-bold text-sm">
                सदस्य विवरण संपादन: {safeText(editingMember.name)} ({safeText(editingMember.memberId)})
              </h3>
              <button 
                type="button" 
                onClick={() => setEditingMember(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMemberEdit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">उपाधि</label>
                  <select
                    value={editingMember.salutation || 'श्री'}
                    onChange={(e) => setEditingMember({ ...editingMember, salutation: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  >
                    <option value="श्री">श्री (Mr.)</option>
                    <option value="श्रीमती">श्रीमती (Mrs.)</option>
                    <option value="सुश्री">सुश्री (Ms.)</option>
                    <option value="Mr.">Mr.</option>
                    <option value="Mrs.">Mrs.</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-slate-400 mb-1">पूरा नाम</label>
                  <input
                    type="text"
                    required
                    value={editingMember.name || editName || ''}
                    onChange={(e) => {
                      setEditName(e.target.value);
                      setEditingMember({ ...editingMember, name: e.target.value });
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  />
                </div>
              </div>

              {/* Father Name & Mother Name (Requirement 3) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">पिता का नाम (Father's Name)</label>
                  <input
                    type="text"
                    value={editingMember.fatherName || editingMember.fatherOrSpouseName || editFather || ''}
                    onChange={(e) => {
                      setEditFather(e.target.value);
                      setEditingMember({ ...editingMember, fatherName: e.target.value, fatherOrSpouseName: e.target.value });
                    }}
                    placeholder="पिता का नाम दर्ज करें"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">माता का नाम (Mother's Name)</label>
                  <input
                    type="text"
                    value={editingMember.motherName || editMother || ''}
                    onChange={(e) => {
                      setEditMother(e.target.value);
                      setEditingMember({ ...editingMember, motherName: e.target.value });
                    }}
                    placeholder="माता का नाम दर्ज करें"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  />
                </div>
              </div>

              {/* Designation / Padnaam & City */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">पद का नाम (Designation / Padnaam)</label>
                  <input
                    type="text"
                    value={editingMember.padNaam || editingMember.designation || editDesignation || ''}
                    onChange={(e) => {
                      setEditDesignation(e.target.value);
                      setEditingMember({ ...editingMember, padNaam: e.target.value, designation: e.target.value });
                    }}
                    placeholder="e.g. कार्यकारिणी सदस्य / जिला अध्यक्ष"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">शहर / जिला (City / District)</label>
                  <input
                    type="text"
                    value={editingMember.city || editCity || ''}
                    onChange={(e) => {
                      setEditCity(e.target.value);
                      setEditingMember({ ...editingMember, city: e.target.value });
                    }}
                    placeholder="e.g. काशीपुर (उत्तराखंड)"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  />
                </div>
              </div>

              {/* Full Address */}
              <div>
                <label className="block text-slate-400 mb-1">पूरा पता / निवास स्थान (Full Address)</label>
                <input
                  type="text"
                  value={editingMember.address || editAddress || ''}
                  onChange={(e) => {
                    setEditAddress(e.target.value);
                    setEditingMember({ ...editingMember, address: e.target.value });
                  }}
                  placeholder="निवास / पूरा पता"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">ईमेल पता</label>
                  <input
                    type="email"
                    required
                    value={editingMember.email || editEmail || ''}
                    onChange={(e) => {
                      setEditEmail(e.target.value);
                      setEditingMember({ ...editingMember, email: e.target.value });
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">मोबाइल नंबर</label>
                  <input
                    type="tel"
                    required
                    value={editingMember.phone || editPhone || ''}
                    onChange={(e) => {
                      setEditPhone(e.target.value);
                      setEditingMember({ ...editingMember, phone: e.target.value });
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">गोपनीय पासवर्ड</label>
                  <input
                    type="text"
                    required
                    value={editingMember.password || ''}
                    onChange={(e) => setEditingMember({ ...editingMember, password: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">स्पॉन्सर ID</label>
                  <input
                    type="text"
                    value={editingMember.sponsorId || 'DIRECT'}
                    onChange={(e) => setEditingMember({ ...editingMember, sponsorId: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">सदस्य स्थिति</label>
                  <select
                    value={editingMember.status || 'pending'}
                    onChange={(e) => setEditingMember({ ...editingMember, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  >
                    <option value="active">सक्रिय (Active)</option>
                    <option value="pending">लंबित (Pending)</option>
                    <option value="blocked">अवरुद्ध (Blocked)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">वॉलेट बैलेंस (₹)</label>
                  <input
                    type="number"
                    value={editingMember.walletBalance || 0}
                    onChange={(e) => setEditingMember({ ...editingMember, walletBalance: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold"
                  />
                </div>
              </div>

              {/* Business Volumes Configuration */}
              <div className="pt-2 border-t border-slate-700/80">
                <p className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                  <span>बिज़नेस वॉल्यूम प्रबंधन (Business Volumes in ₹)</span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1 text-[11px]">सेल्फ बिज़नेस (₹)</label>
                    <input
                      type="number"
                      value={editingMember.selfBusiness !== undefined ? editingMember.selfBusiness : (editingMember.packageAmount || 0)}
                      onChange={(e) => setEditingMember({ ...editingMember, selfBusiness: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 text-[11px]">टीम बिज़नेस (₹)</label>
                    <input
                      type="number"
                      value={editingMember.teamBusiness !== undefined ? editingMember.teamBusiness : 0}
                      onChange={(e) => setEditingMember({ ...editingMember, teamBusiness: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 text-[11px]">डाउनलाइन बिज़नेस (₹)</label>
                    <input
                      type="number"
                      value={editingMember.downlineBusiness !== undefined ? editingMember.downlineBusiness : 0}
                      onChange={(e) => setEditingMember({ ...editingMember, downlineBusiness: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Commission Breakdown Configuration */}
              <div className="pt-2 border-t border-slate-700/80">
                <p className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <IndianRupee className="w-3.5 h-3.5 text-emerald-400" />
                  <span>कमीशन ब्रेकडाउन प्रबंधन (Commission Breakdown in ₹)</span>
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1 text-[11px]">डायरेक्ट कमीशन</label>
                    <input
                      type="number"
                      value={editingMember.directTeamCommission !== undefined ? editingMember.directTeamCommission : 0}
                      onChange={(e) => setEditingMember({ ...editingMember, directTeamCommission: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 text-[11px]">सेल्फ कमीशन</label>
                    <input
                      type="number"
                      value={editingMember.selfBusinessCommission !== undefined ? editingMember.selfBusinessCommission : 0}
                      onChange={(e) => setEditingMember({ ...editingMember, selfBusinessCommission: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 text-[11px]">डाउनलाइन कमीशन</label>
                    <input
                      type="number"
                      value={editingMember.downlineCommission !== undefined ? editingMember.downlineCommission : 0}
                      onChange={(e) => setEditingMember({ ...editingMember, downlineCommission: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 text-[11px]">कुल कमीशन</label>
                    <input
                      type="number"
                      value={editingMember.totalCommission !== undefined ? editingMember.totalCommission : 0}
                      onChange={(e) => setEditingMember({ ...editingMember, totalCommission: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-emerald-500/50 text-emerald-300 font-mono font-bold text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-white shadow"
                >
                  परिवर्तन सुरक्षित करें
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD MEMBER PAPER FORM MODAL */}
      {showAddMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-700 overflow-hidden my-4 max-h-[94vh] flex flex-col">
            {/* Modal Top Bar */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-400" />
                <h3 className="font-black text-sm">
                  आधिकारिक A4 कागजी सदस्यता प्रपत्र (Official Membership Paper Form)
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setShowAddMemberModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Scroll Area */}
            <div className="p-3 sm:p-6 overflow-y-auto bg-slate-100 flex-1">
              <PaperRegistrationForm 
                isAdminMode={true} 
                onSuccessCallback={() => {
                  // Keep open so admin can review or print form
                }} 
              />
            </div>
          </div>
        </div>
      )}

      {/* 100% MANUAL COMMISSION ENTRY MODAL (LEVEL 1 TO 12) */}
      {manualCommissionModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-slate-900 rounded-3xl shadow-2xl border border-slate-700 overflow-hidden my-4 max-h-[94vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-800 text-white flex items-center justify-between border-b border-slate-700 shrink-0">
              <div>
                <h3 className="font-black text-sm flex items-center gap-2">
                  <IndianRupee className="w-4 h-4 text-emerald-400" />
                  <span>100% मैनुअल 12-स्तरीय मानदेय वितरण तालिका</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  सदस्य: <strong className="text-white">{safeText(manualCommissionModal.memberName)}</strong> ({safeText(manualCommissionModal.memberId)}) | सहयोग राशि: <strong className="text-emerald-400">₹{manualCommissionModal.amount}</strong> | स्पॉन्सर ID: <strong className="text-amber-300">{safeText(manualCommissionModal.sponsorId)}</strong>
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setManualCommissionModal(prev => ({ ...prev, isOpen: false }))}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Table */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 text-xs">
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-200 text-[11px] leading-relaxed">
                <strong>सूचना:</strong> कोई भी कमीशन बैकग्राउंड में अपने-आप क्रेडिट नहीं होगा। आप प्रत्येक स्तर (स्तर 1 से 12) के लिए इच्छित प्रतिशत (%) अथवा सटीक रुपया राशि (₹) टाइप कर सकते हैं। केवल वही राशि अपलाइन के वॉलेट में जाएगी जिसकी आप पुष्टि करेंगे।
              </div>

              {manualCommissionModal.loadingChain ? (
                <div className="py-12 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-400 mx-auto mb-2" />
                  अपलाइन श्रृंखला लोड हो रही है...
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-700/80 bg-slate-950">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-800 text-slate-300 border-b border-slate-700 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3 text-center">वितरण</th>
                        <th className="py-2.5 px-3">स्तर (Level)</th>
                        <th className="py-2.5 px-3">लाभार्थी अपलाइन सदस्य (Upline Beneficiary)</th>
                        <th className="py-2.5 px-3 text-center w-28">प्रतिशत (%)</th>
                        <th className="py-2.5 px-3 text-right w-36">मानदेय राशि (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {manualCommissionModal.distributionRows.map((row) => (
                        <tr key={row.level} className={`hover:bg-slate-800/40 ${!row.enabled ? 'opacity-40' : ''}`}>
                          {/* Checkbox */}
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={row.enabled}
                              disabled={!row.uid}
                              onChange={(e) => handleCommissionRowChange(row.level, 'enabled', e.target.checked)}
                              className="rounded accent-emerald-500 cursor-pointer disabled:cursor-not-allowed"
                            />
                          </td>

                          {/* Level */}
                          <td className="py-2.5 px-3 font-mono font-bold text-amber-400">
                            स्तर {row.level}
                          </td>

                          {/* Beneficiary */}
                          <td className="py-2.5 px-3">
                            {row.uid ? (
                              <div>
                                <p className="font-bold text-white">{row.name}</p>
                                <p className="text-[10px] text-slate-400 font-mono">{row.memberId} {row.phone ? `• ${row.phone}` : ''}</p>
                              </div>
                            ) : (
                              <span className="text-slate-500 italic text-[11px]">
                                (श्रृंखला समाप्त / कोई अपलाइन नहीं)
                              </span>
                            )}
                          </td>

                          {/* Percentage input */}
                          <td className="py-2.5 px-3 text-center">
                            <div className="inline-flex items-center gap-1">
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="100"
                                disabled={!row.enabled || !row.uid}
                                value={row.percentage}
                                onChange={(e) => handleCommissionRowChange(row.level, 'percentage', e.target.value)}
                                className="w-16 px-2 py-1 text-center rounded-lg bg-slate-900 border border-slate-700 text-white font-mono font-bold text-xs outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-40"
                              />
                              <span className="text-slate-400 text-xs">%</span>
                            </div>
                          </td>

                          {/* Rupee Amount input */}
                          <td className="py-2.5 px-3 text-right">
                            <div className="inline-flex items-center justify-end gap-1">
                              <span className="text-emerald-400 font-bold text-xs">₹</span>
                              <input
                                type="number"
                                step="1"
                                min="0"
                                disabled={!row.enabled || !row.uid}
                                value={row.amount}
                                onChange={(e) => handleCommissionRowChange(row.level, 'amount', e.target.value)}
                                className="w-24 px-2 py-1 text-right rounded-lg bg-slate-900 border border-slate-700 text-emerald-400 font-mono font-bold text-xs outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-40"
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Summary Row */}
              <div className="flex flex-col sm:flex-row items-center justify-between p-3.5 bg-slate-950 rounded-2xl border border-slate-800 gap-3">
                <div className="text-xs text-slate-300">
                  कुल चयनित स्तर:{' '}
                  <strong className="text-white">
                    {manualCommissionModal.distributionRows.filter(r => r.enabled && r.uid && Number(r.amount) > 0).length} / 12
                  </strong>
                </div>
                <div className="text-xs text-slate-300">
                  कुल मैनुअल मानदेय वितरण:{' '}
                  <strong className="text-emerald-400 text-base font-black">
                    ₹{manualCommissionModal.distributionRows.reduce((acc, r) => acc + (r.enabled && r.uid ? Number(r.amount || 0) : 0), 0)}
                  </strong>
                </div>
              </div>

            </div>

            {/* Modal Footer / Actions */}
            <div className="px-6 py-4 bg-slate-800 text-white flex items-center justify-end gap-3 border-t border-slate-700 shrink-0">
              <button
                type="button"
                onClick={() => setManualCommissionModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-bold"
              >
                रद्द करें
              </button>

              <button
                type="button"
                onClick={handleExecuteManualCommission}
                disabled={isDistributingManual || manualCommissionModal.loadingChain}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-extrabold text-xs shadow-lg shadow-emerald-900/30 flex items-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isDistributingManual ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>क्रेडिट हो रहा है...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    <span>Confirm & Credit Manual Commission (पुष्टि करें एवं मानदेय क्रेडिट करें)</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* CLEAN & RESET TEST DATA CONFIRMATION MODAL */}
      {showResetConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-lg bg-slate-900 rounded-3xl shadow-2xl border-2 border-rose-500 overflow-hidden my-8 p-6 space-y-5 text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-rose-400">
                <AlertTriangle className="w-6 h-6" />
                <h3 className="font-black text-base">सॉफ्टवेयर टेस्ट डेटा रीसेट पुष्टि</h3>
              </div>
              <button
                type="button"
                onClick={() => { setShowResetConfirmModal(false); setResetInputText(''); }}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <p className="font-bold text-rose-300">
                चेतावनी: यह क्रिया अपरिवर्तनीय (Irreversible) है!
              </p>
              <p>
                यह सॉफ्टवेयर का समस्त परीक्षण डेटा (Test Members, Payments, Withdrawals, Daily Closings, Transactions) हमेशा के लिए हटा देगा ताकि ग्राहक (डॉ. राजेन्द्र सिंह सैनी जी) नए सिरे से फ्रेश आईडी रजिस्टर करके टेस्टिंग कर सकें।
              </p>
              <p className="text-emerald-300">
                फाउंडेशन का आधिकारिक रूट खाता <strong>UCWF-0001 (मो. 9540648402)</strong> तथा कमीशन सेटिंग्स सुरक्षित रहेंगी।
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-400">
                  पुष्टि हेतु <strong className="text-white font-mono">RESET</strong> लिखें अथवा सीधे नीचे दिए बटन पर क्लिक करें:
                </label>
                <button
                  type="button"
                  onClick={() => setResetInputText('RESET')}
                  className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-300 font-mono text-[10px] font-bold border border-rose-500/30 cursor-pointer"
                >
                  ⚡ ऑटो-टाइप RESET
                </button>
              </div>
              <input
                type="text"
                placeholder="यहाँ RESET टाइप करें (वैकल्पिक)"
                value={resetInputText}
                onChange={(e) => setResetInputText(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-rose-500/50 text-white font-mono font-bold text-sm tracking-widest outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                disabled={isResettingData}
                onClick={() => { setShowResetConfirmModal(false); setResetInputText(''); }}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
              >
                रद्द करें (Cancel)
              </button>
              <button
                type="button"
                disabled={isResettingData}
                onClick={handleExecuteCleanReset}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 disabled:opacity-40 text-white font-extrabold text-xs shadow-lg shadow-rose-900/50 transition flex items-center gap-2 cursor-pointer active:scale-95"
              >
                {isResettingData ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>डेटा क्लीन हो रहा है...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>हाँ, समस्त टेस्ट डेटा रीसेट करें (Confirm Reset)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIGITAL ID CARD PREVIEW / PRINT MODAL */}
      {/* KYC Documents Preview Modal */}
      {selectedDocMember && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-pink-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-pink-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-pink-600" />
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    KYC Documents — {getMemberFullName(selectedDocMember)}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    ID: {safeText(selectedDocMember.memberId)} • Mobile: {safeText(selectedDocMember.phone)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDocMember(null)}
                className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Photo */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-2">
                <span className="text-xs font-bold text-slate-700 block">Member Photo</span>
                {selectedDocMember.photo || selectedDocMember.photoUrl ? (
                  <div>
                    <img 
                      src={selectedDocMember.photo || selectedDocMember.photoUrl} 
                      alt="Member" 
                      className="w-24 h-24 object-cover rounded-xl mx-auto border border-slate-300 shadow-sm"
                    />
                    <a
                      href={selectedDocMember.photo || selectedDocMember.photoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-pink-600 hover:underline"
                    >
                      <Eye className="w-3 h-3" /> View Full Image
                    </a>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic py-6">Not Uploaded</p>
                )}
              </div>

              {/* Signature */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-2">
                <span className="text-xs font-bold text-slate-700 block">Member Signature</span>
                {selectedDocMember.signatureUrl ? (
                  <div>
                    <img 
                      src={selectedDocMember.signatureUrl} 
                      alt="Signature" 
                      className="h-20 max-w-full object-contain mx-auto bg-white p-1 rounded-xl border border-slate-200"
                    />
                    <a
                      href={selectedDocMember.signatureUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-pink-600 hover:underline"
                    >
                      <Eye className="w-3 h-3" /> View Full Signature
                    </a>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic py-6">Not Uploaded</p>
                )}
              </div>

              {/* Aadhaar Front */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-2">
                <span className="text-xs font-bold text-slate-700 block">Aadhaar Front / Document</span>
                {selectedDocMember.aadhaarDocUrl || selectedDocMember.aadhaarUrl ? (
                  <div>
                    <a
                      href={selectedDocMember.aadhaarDocUrl || selectedDocMember.aadhaarUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-200"
                    >
                      <Eye className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Open Aadhaar Front</span>
                    </a>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic py-4">Not Uploaded</p>
                )}
              </div>

              {/* Aadhaar Back */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-2">
                <span className="text-xs font-bold text-slate-700 block">Aadhaar Back</span>
                {selectedDocMember.aadhaarBackDocUrl ? (
                  <div>
                    <a
                      href={selectedDocMember.aadhaarBackDocUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold text-xs border border-indigo-200"
                    >
                      <Eye className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Open Aadhaar Back</span>
                    </a>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic py-4">Not Uploaded</p>
                )}
              </div>
            </div>

            {/* Verification Toggle Action */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const isV = !!selectedDocMember.documentsVerified;
                  handleToggleDocVerification(selectedDocMember.uid, isV);
                  setSelectedDocMember(prev => ({ ...prev, documentsVerified: !isV }));
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                  selectedDocMember.documentsVerified
                    ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300'
                    : 'bg-pink-600 hover:bg-pink-700 text-white'
                }`}
              >
                {selectedDocMember.documentsVerified ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Status: Verified & Approved (Click to Revoke)</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-4 h-4" />
                    <span>Click to Verify & Approve Documents</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setPreviewIdCardMember(selectedDocMember);
                  setSelectedDocMember(null);
                }}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <CreditCard className="w-4 h-4 text-pink-600" />
                <span>View ID Card</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {previewIdCardMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-pink-200 overflow-hidden my-6 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-pink-100">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-pink-600" />
                <h3 className="font-black text-sm text-slate-900">
                  Official Digital ID Card — {safeText(previewIdCardMember.name)} ({safeText(previewIdCardMember.memberId)})
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Card</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewIdCardMember(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* ID Card Front Card View */}
            <div className="max-w-sm mx-auto bg-white rounded-2xl border-2 border-emerald-800 shadow-lg overflow-hidden text-center p-4 space-y-3">
              <div className="flex items-center justify-center gap-3 pb-2 border-b border-slate-100">
                <div className="w-14 h-14 rounded-full p-1 bg-white border-2 border-blue-900 shadow-md shrink-0 flex items-center justify-center">
                  <img
                    src="/logo.png"
                    alt="Logo"
                    className="w-full h-full object-contain rounded-full"
                    style={{
                      imageRendering: '-webkit-optimize-contrast',
                      filter: 'contrast(1.08)'
                    }}
                    onError={(e) => { e.currentTarget.src = '/logo.png'; }}
                  />
                </div>
                <div className="text-left">
                  <p className="text-xs font-black text-emerald-900 leading-tight">
                    {safeText(FOUNDATION_DETAILS.nameHindi)}
                  </p>
                  <p className="text-[9px] font-bold text-amber-700 uppercase">
                    {safeText(FOUNDATION_DETAILS.nameEnglish)}
                  </p>
                  <span className="text-[8px] text-slate-500 font-mono">CIN: {safeText(FOUNDATION_DETAILS.cin)}</span>
                </div>
              </div>

              {/* Photo Frame & Universal Photo Resolver */}
              {(() => {
                const memberPhoto = resolveUserPhoto(previewIdCardMember);
                return (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-24 h-28 rounded-xl border-2 border-amber-400 overflow-hidden bg-slate-100 shadow-inner flex items-center justify-center relative group">
                      {memberPhoto ? (
                        <img
                          src={memberPhoto}
                          alt={previewIdCardMember.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-12 h-12 text-slate-400" />
                      )}
                    </div>
                    {/* Direct Upload Photo Button */}
                    <label className="cursor-pointer px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-bold text-[10px] flex items-center gap-1 transition shadow-2xs print:hidden">
                      <Upload className="w-3 h-3 text-emerald-700" />
                      <span>फोटो बदलें (Upload Photo)</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file || !previewIdCardMember?.uid) return;
                          // Immediate Base64 reader for guaranteed zero-failure
                          const reader = new FileReader();
                          reader.onload = async (ev) => {
                            const b64 = ev.target?.result;
                            if (b64) {
                              setPreviewIdCardMember(prev => ({ ...prev, photo: b64, photoUrl: b64 }));
                              try {
                                await update(ref(rtdb, `users/${previewIdCardMember.uid}`), {
                                  photo: b64,
                                  photoUrl: b64
                                });
                              } catch (err) {
                                console.error('Error saving photo:', err);
                              }
                            }
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                  </div>
                );
              })()}

              {/* Member Details */}
              <div>
                <h4 className="text-sm font-black text-slate-900">
                  {safeText(previewIdCardMember.salutation || 'श्री')} {safeText(previewIdCardMember.name)}
                </h4>
                <p className="text-xs font-bold text-emerald-700 mt-0.5">
                  {safeText(previewIdCardMember.padNaam || 'कार्यकारिणी सदस्य (Executive Member)')}
                </p>
                <span className="inline-block mt-1 px-3 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-slate-800 font-mono text-[11px] font-bold">
                  ID: {safeText(previewIdCardMember.memberId || 'N/A')}
                </span>
              </div>

              <div className="text-[11px] text-left space-y-1 pt-2 border-t border-slate-100">
                {(previewIdCardMember.fatherName || previewIdCardMember.fatherOrSpouseName) && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Father:</span>
                    <strong className="text-slate-800">{safeText(previewIdCardMember.fatherName || previewIdCardMember.fatherOrSpouseName)}</strong>
                  </div>
                )}
                {previewIdCardMember.motherName && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Mother:</span>
                    <strong className="text-slate-800">{safeText(previewIdCardMember.motherName)}</strong>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Mobile:</span>
                  <strong className="text-slate-800 font-mono">{safeText(previewIdCardMember.phone || '-')}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">City / State:</span>
                  <strong className="text-slate-800">{safeText(previewIdCardMember.city || '')}, {safeText(previewIdCardMember.state || '')}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Sponsor:</span>
                  <strong className="text-slate-800 font-mono">{safeText(previewIdCardMember.sponsorId || 'DIRECT')}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Admin Toast */}
      {adminToast && (
        <div
          className={`fixed bottom-5 right-5 z-[9999] max-w-md px-4 py-3 rounded-2xl shadow-2xl border text-xs font-bold flex items-center gap-2.5 print:hidden ${
            adminToast.type === 'error'
              ? 'bg-rose-600 text-white border-rose-500'
              : 'bg-emerald-700 text-white border-emerald-600'
          }`}
        >
          {adminToast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          )}
          <span className="whitespace-pre-line">{adminToast.message}</span>
          <button
            type="button"
            onClick={() => setAdminToast(null)}
            className="ml-2 p-1 rounded-lg hover:bg-white/20 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* In-App Confirm / Prompt Modal */}
      {dialogState && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm print:hidden">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-pink-200 space-y-4">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div className={`flex items-center gap-2 ${dialogState.danger ? 'text-rose-600' : 'text-slate-900'}`}>
                <AlertCircle className="w-5 h-5 shrink-0" />
                <h3 className="text-sm font-black">{dialogState.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setDialogState(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">{dialogState.message}</p>
            {dialogState.mode === 'prompt' && (
              <input
                type="text"
                value={dialogState.inputValue}
                onChange={(e) => setDialogState(prev => ({ ...prev, inputValue: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-pink-500"
                autoFocus
              />
            )}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDialogState(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const current = dialogState;
                  setDialogState(null);
                  if (current.onConfirm) {
                    await current.onConfirm(current.mode === 'prompt' ? current.inputValue : true);
                  }
                }}
                className={`px-4 py-2 rounded-xl text-white text-xs font-bold shadow-sm cursor-pointer ${
                  dialogState.danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
