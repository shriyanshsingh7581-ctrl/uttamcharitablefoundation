import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Search,
  Filter,
  Eye,
  EyeOff,
  Edit,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Ban,
  CheckCircle,
  XCircle,
  Phone,
  Mail,
  Calendar,
  Wallet,
  TrendingUp,
  ArrowDownToLine,
  RefreshCw,
  Save,
  Clock,
  UserPlus,
  GitBranch,
  History,
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
  Key,
  Sparkles,
  Trash2,
  Building2,
  CreditCard,
  Award,
  ChevronDown,
  X,
  PhoneCall,
} from 'lucide-react';
import AdminLayout from './AdminLayout';
import { db, ref, get, set, update, remove, onValue, off } from '../../lib/supabase';
import { PACKAGES, BLOOD_GROUPS } from '../../lib/constants';
import {
  buildMember12LevelReport,
  normalizeUsersMap,
  parseAmount,
} from '../../utils/mlmUtils';
import { VoucherPrintButton } from '../../components/CommissionVoucher';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

export default function Members() {
  const [usersList, setUsersList] = useState([]);
  const [walletsMap, setWalletsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search, Filters & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest' | 'name' | 'balance_desc' | 'package_desc'
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Password Visibility State (map of userId -> boolean)
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [showAllPasswords, setShowAllPasswords] = useState(false);

  // Copy Feedback State
  const [copiedKey, setCopiedKey] = useState(null);

  // Detail & Edit Modal State
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [savingUser, setSavingUser] = useState(false);

  // Top-level edit hooks (Prevent ReferenceError)
  const [editFather, setEditFather] = useState('');
  const [editMother, setEditMother] = useState('');
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editDesignation, setEditDesignation] = useState('');
  const [editAddress, setEditAddress] = useState('');

  // Feedback Toast & Activation/Confirm States
  const [feedbackToast, setFeedbackToast] = useState(null);
  const [activatingId, setActivatingId] = useState(null);
  const [activatingAll, setActivatingAll] = useState(false);
  const [confirmActionModal, setConfirmActionModal] = useState(null); // { type: 'block'|'delete', user }

  const showToast = (message, type = 'success') => {
    setFeedbackToast({ message, type });
    setTimeout(() => setFeedbackToast(null), 4500);
  };

  // 1-Click Copy Helper
  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(String(text));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Toggle Single Password Visibility
  const togglePasswordVisibility = (userId) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  // Toggle All Passwords Visibility
  const toggleAllPasswords = () => {
    const nextState = !showAllPasswords;
    setShowAllPasswords(nextState);
    if (nextState) {
      const allVis = {};
      usersList.forEach((u) => {
        allVis[u.uid || u.id] = true;
      });
      setVisiblePasswords(allVis);
    } else {
      setVisiblePasswords({});
    }
  };

  // Live Supabase Realtime Listener for /users and /members (with 8s timeout guard)
  useEffect(() => {
    setLoading(true);
    let settled = false;
    const timeoutId = setTimeout(() => {
      if (!settled) {
        setLoading(false);
        setRefreshing(false);
      }
    }, 8000);

    const usersRef = ref(db, 'users');
    const membersRef = ref(db, 'members');
    const walletsRef = ref(db, 'wallets');

    let latestUsersObj = {};
    let latestMembersObj = {};

    const syncCombinedUsers = () => {
      settled = true;
      const mergedMap = {};

      // 1. Ingest /members
      Object.entries(normalizeUsersMap(latestMembersObj)).forEach(([id, m]) => {
        if (!m) return;
        const uid = m.uid || m.id || id;
        const amt = parseAmount(m);
        mergedMap[uid] = {
          ...m,
          uid,
          id: uid,
          memberId: m.memberId || m.member_id || m.referral_code || `UCWF-2026-${uid.slice(0, 4)}`,
          name: m.name || m.full_name || 'Member',
          full_name: m.full_name || m.name || 'Member',
          email: m.email || '',
          password: m.password || 'UCWF@2026',
          phone: m.phone || '',
          sponsorId: m.sponsorId || m.referrer_code || 'DIRECT',
          packageTier: amt || 500,
          package_amount: amt || 500,
          selfBusiness: amt,
          packageName: m.packageName || m.package_name || m.tier_name || 'Seva Mitra',
          status: m.status || (m.is_active || amt > 0 ? 'active' : 'pending'),
          loginMethod: m.loginMethod || 'Direct Member',
          createdAt: m.createdAt || m.created_at || new Date().toISOString(),
          bankDetails: m.bankDetails || {
            upiId: m.upi_id || '',
            accountHolder: m.account_holder || m.full_name || '',
            bankName: m.bank_name || '',
            accountNumber: m.account_number || '',
            ifscCode: m.ifsc_code || '',
          },
        };
      });

      // 2. Ingest /users (takes precedence as primary credentials table)
      Object.entries(normalizeUsersMap(latestUsersObj)).forEach(([id, u]) => {
        if (!u) return;
        const uid = u.uid || u.id || id;
        const existing = mergedMap[uid] || {};
        const amt = Math.max(parseAmount(u), parseAmount(existing));
        mergedMap[uid] = {
          ...existing,
          ...u,
          uid,
          id: uid,
          memberId: u.memberId || u.member_id || existing.memberId || `UCWF-2026-${uid.slice(0, 4)}`,
          name: u.name || u.full_name || existing.name || 'Member',
          full_name: u.name || u.full_name || existing.name || 'Member',
          email: u.email || existing.email || '',
          password: u.password || existing.password || 'UCWF@2026',
          phone: u.phone || existing.phone || '',
          sponsorId: u.sponsorId || u.referrer_code || existing.sponsorId || 'DIRECT',
          packageTier: amt || 500,
          package_amount: amt || 500,
          selfBusiness: amt,
          packageName: u.packageName || u.package_name || existing.packageName || 'Seva Mitra',
          status: u.status || (amt > 0 ? 'active' : (existing.status || 'active')),
          loginMethod: u.loginMethod || existing.loginMethod || 'Email/Password',
          createdAt: u.createdAt || u.created_at || existing.createdAt || new Date().toISOString(),
          bankDetails: u.bankDetails || existing.bankDetails || {
            upiId: '',
            accountHolder: u.name || u.full_name || '',
            bankName: '',
            accountNumber: '',
            ifscCode: '',
          },
        };
      });

      const list = Object.values(mergedMap);
      setUsersList(list);
      setLoading(false);
      setRefreshing(false);
    };

    const unsubUsers = onValue(
      usersRef,
      (snap) => {
        latestUsersObj = snap.exists() ? snap.val() : {};
        syncCombinedUsers();
      },
      (err) => {
        console.warn('Supabase /users live listener error:', err);
        settled = true;
        setLoading(false);
        setRefreshing(false);
      }
    );

    const unsubMembers = onValue(
      membersRef,
      (snap) => {
        latestMembersObj = snap.exists() ? snap.val() : {};
        syncCombinedUsers();
      },
      (err) => {
        console.warn('Supabase /members live listener error:', err);
      }
    );

    const unsubWallets = onValue(
      walletsRef,
      (snap) => {
        if (snap.exists()) {
          setWalletsMap(snap.val());
        } else {
          setWalletsMap({});
        }
      },
      (err) => {
        console.warn('Supabase /wallets live listener error:', err);
      }
    );

    return () => {
      clearTimeout(timeoutId);
      unsubUsers();
      unsubMembers();
      unsubWallets();
    };
  }, []);

  // Compute unified 12-level Sponsor & Team metrics dynamically (Self Commission = 0%)
  const userTeamMetrics = useMemo(() => {
    const metrics = {};

    usersList.forEach((u) => {
      const uid = u.uid || u.id;
      const report = buildMember12LevelReport(u, usersList);
      metrics[uid] = {
        directCount: report.directCount || 0,
        directBusiness: report.directBusiness || 0,
        indirectCount: report.indirectCount || 0,
        indirectBusiness: report.indirectBusiness || 0,
        downlineBusiness: report.downlineBusiness || 0,
        totalCommission: report.totalCommission || 0,
        selfBusiness: report.selfBusiness || parseAmount(u),
      };
    });

    return metrics;
  }, [usersList]);

  // "Recently Joined" Users (Registered in the last 24 Hours or newest 5)
  const recentUsers = useMemo(() => {
    const now = Date.now();
    const sorted = [...usersList].sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );

    const within24h = sorted.filter(
      (u) => now - new Date(u.createdAt || 0).getTime() <= 24 * 60 * 60 * 1000
    );

    return within24h.length > 0 ? within24h : sorted.slice(0, 5);
  }, [usersList]);

  // Filtered & Sorted Users for Master Table
  const filteredUsers = useMemo(() => {
    let result = [...usersList];

    // Status Filter
    if (statusFilter !== 'all') {
      result = result.filter((u) => u.status === statusFilter);
    }

    // Tier Filter
    if (tierFilter !== 'all') {
      result = result.filter(
        (u) =>
          u.packageName === tierFilter ||
          String(u.packageTier) === tierFilter ||
          String(u.package_amount) === tierFilter
      );
    }

    // Search Query (Name, Email, Phone, Member ID, Sponsor ID, Address)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (u) =>
          (u.name && u.name.toLowerCase().includes(q)) ||
          (u.full_name && u.full_name.toLowerCase().includes(q)) ||
          (u.email && u.email.toLowerCase().includes(q)) ||
          (u.phone && u.phone.includes(q)) ||
          (u.memberId && u.memberId.toLowerCase().includes(q)) ||
          (u.sponsorId && u.sponsorId.toLowerCase().includes(q)) ||
          (u.city && u.city.toLowerCase().includes(q)) ||
          (u.address && u.address.toLowerCase().includes(q))
      );
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      }
      if (sortBy === 'name') {
        return (a.name || a.full_name || '').localeCompare(b.name || b.full_name || '');
      }
      if (sortBy === 'package_desc') {
        return (
          Number(b.packageTier || b.package_amount || 0) -
          Number(a.packageTier || a.package_amount || 0)
        );
      }
      if (sortBy === 'balance_desc') {
        const balA = Number(walletsMap[a.uid || a.id]?.balance || a.walletBalance || 0);
        const balB = Number(walletsMap[b.uid || b.id]?.balance || b.walletBalance || 0);
        return balB - balA;
      }
      return 0;
    });

    return result;
  }, [usersList, statusFilter, tierFilter, searchQuery, sortBy, walletsMap]);

  // Pagination Slice
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1;
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(start, start + itemsPerPage);
  }, [filteredUsers, currentPage]);

  // Open User Detail / Edit Modal
  const handleOpenDetailModal = (user, editMode = false) => {
    const uid = user.uid || user.id;
    const userWallet = walletsMap[uid] || {};

    setSelectedUser(user);
    setIsEditing(editMode);
    setEditFormData({
      uid,
      memberId: user.memberId || '',
      name: user.name || user.full_name || '',
      email: user.email || '',
      password: user.password || 'UCWF@2026',
      phone: user.phone || '',
      sponsorId: user.sponsorId || 'DIRECT',
      city: user.city || user.address || '',
      bloodGroup: user.bloodGroup || user.blood_group || 'O+',
      packageTier: user.packageTier || user.package_amount || 500,
      packageName: user.packageName || 'Seva Mitra',
      status: user.status || 'active',
      loginMethod: user.loginMethod || 'Email/Password',
      walletBalance: userWallet.balance !== undefined ? userWallet.balance : user.walletBalance || 0,
      totalEarned: userWallet.total_earned || user.totalEarned || 0,
      totalWithdrawn: userWallet.total_withdrawn || user.totalWithdrawn || 0,
      bankDetails: {
        upiId: user.bankDetails?.upiId || '',
        accountHolder: user.bankDetails?.accountHolder || user.name || '',
        bankName: user.bankDetails?.bankName || '',
        accountNumber: user.bankDetails?.accountNumber || '',
        ifscCode: user.bankDetails?.ifscCode || '',
      },
    });
    setDetailModalOpen(true);
  };

  // Save Member Changes directly to RTDB (/users/{uid}, /members/{uid}, /wallets/{uid})
  const handleSaveChanges = async () => {
    if (!selectedUser) return;
    setSavingUser(true);

    const uid = editFormData.uid || selectedUser.uid || selectedUser.id;

    try {
      const selectedPkg = PACKAGES.find(
        (p) => String(p.amount) === String(editFormData.packageTier) || p.name === editFormData.packageName
      );

      const updatedPayload = {
        ...selectedUser,
        uid,
        id: uid,
        memberId: editFormData.memberId,
        member_id: editFormData.memberId,
        name: editFormData.name.trim(),
        full_name: editFormData.name.trim(),
        email: editFormData.email.trim().toLowerCase(),
        password: editFormData.password.trim(),
        phone: editFormData.phone.trim(),
        sponsorId: editFormData.sponsorId.trim().toUpperCase(),
        referrer_code: editFormData.sponsorId.trim().toUpperCase(),
        city: editFormData.city.trim(),
        address: editFormData.city.trim(),
        bloodGroup: editFormData.bloodGroup,
        blood_group: editFormData.bloodGroup,
        packageTier: selectedPkg ? selectedPkg.amount : Number(editFormData.packageTier),
        package_amount: selectedPkg ? selectedPkg.amount : Number(editFormData.packageTier),
        packageName: selectedPkg ? selectedPkg.name : editFormData.packageName,
        package_name: selectedPkg ? selectedPkg.name : editFormData.packageName,
        tier_name: selectedPkg ? selectedPkg.name : editFormData.packageName,
        status: editFormData.status,
        is_active: editFormData.status === 'active',
        loginMethod: editFormData.loginMethod,
        walletBalance: Number(editFormData.walletBalance) || 0,
        bankDetails: {
          upiId: editFormData.bankDetails.upiId.trim(),
          accountHolder: editFormData.bankDetails.accountHolder.trim(),
          bankName: editFormData.bankDetails.bankName.trim(),
          accountNumber: editFormData.bankDetails.accountNumber.trim(),
          ifscCode: editFormData.bankDetails.ifscCode.trim().toUpperCase(),
        },
        updatedAt: new Date().toISOString(),
      };

      // 1. Update /users/{uid}
      await set(ref(db, `users/${uid}`), updatedPayload);

      // 2. Update /members/{uid}
      await set(ref(db, `members/${uid}`), updatedPayload);

      // 3. Update /wallets/{uid} balance
      await update(ref(db, `wallets/${uid}`), {
        member_id: uid,
        balance: Number(editFormData.walletBalance) || 0,
        updated_at: new Date().toISOString(),
      });

      setSelectedUser(updatedPayload);
      setIsEditing(false);
      showToast('User credentials and details updated successfully in Supabase Realtime Database!', 'success');
    } catch (err) {
      console.error('Error saving user changes:', err);
      showToast(err.message || 'Failed to update user', 'error');
    } finally {
      setSavingUser(false);
    }
  };

  // Quick Toggle Single ID Active / Pending
  const handleToggleActivateId = async (user) => {
    const uid = user.uid || user.id;
    const isCurrentlyActive = user.status === 'active' || user.is_active === true;
    const nextStatus = isCurrentlyActive ? 'pending' : 'active';
    const nextIsActive = !isCurrentlyActive;
    const nowIso = new Date().toISOString();

    setActivatingId(uid);
    try {
      const patch = {
        status: nextStatus,
        is_active: nextIsActive,
        activatedAt: nextIsActive ? nowIso : null,
        updatedAt: nowIso,
      };
      await Promise.all([
        update(ref(db, `users/${uid}`), patch).catch(() => {}),
        update(ref(db, `members/${uid}`), patch).catch(() => {}),
      ]);
      showToast(
        nextIsActive
          ? `✅ ID Activated: ${user.name || user.memberId} अब सक्रिय (Active) है।`
          : `⏳ ID Pending: ${user.name || user.memberId} को निष्क्रिय (Pending) किया गया।`,
        'success'
      );
    } catch (err) {
      console.error('Activate toggle error:', err);
      showToast(err.message || 'Status update failed', 'error');
    } finally {
      setActivatingId(null);
    }
  };

  // Batch Activate All Pending IDs
  const pendingOrInactiveUsers = useMemo(
    () => usersList.filter((u) => u.status !== 'active' && u.status !== 'blocked'),
    [usersList]
  );

  const handleActivateAllPendingIds = async () => {
    if (pendingOrInactiveUsers.length === 0) {
      showToast('सभी IDs पहले से सक्रिय (Active) हैं।', 'success');
      return;
    }
    setActivatingAll(true);
    try {
      const nowIso = new Date().toISOString();
      const rootPatch = {};
      pendingOrInactiveUsers.forEach((u) => {
        const uid = u.uid || u.id;
        rootPatch[`users/${uid}/status`] = 'active';
        rootPatch[`users/${uid}/is_active`] = true;
        rootPatch[`users/${uid}/activatedAt`] = nowIso;
        rootPatch[`users/${uid}/updatedAt`] = nowIso;
        rootPatch[`members/${uid}/status`] = 'active';
        rootPatch[`members/${uid}/is_active`] = true;
        rootPatch[`members/${uid}/activatedAt`] = nowIso;
        rootPatch[`members/${uid}/updatedAt`] = nowIso;
      });
      await update(ref(db), rootPatch);
      showToast(
        `⚡ ${pendingOrInactiveUsers.length} Pending IDs को सफलतापूर्वक Active कर दिया गया!`,
        'success'
      );
    } catch (err) {
      console.error('Batch activate error:', err);
      showToast(err.message || 'Batch activation failed', 'error');
    } finally {
      setActivatingAll(false);
    }
  };

  // Quick Toggle Block / Active via in-app confirm modal
  const handleToggleBlock = (user) => {
    setConfirmActionModal({ type: 'block', user });
  };

  const executeToggleBlock = async (user) => {
    const uid = user.uid || user.id;
    const newStatus = user.status === 'blocked' ? 'active' : 'blocked';

    try {
      await update(ref(db, `users/${uid}`), {
        status: newStatus,
        is_active: newStatus === 'active',
        updatedAt: new Date().toISOString(),
      });
      await update(ref(db, `members/${uid}`), {
        status: newStatus,
        is_active: newStatus === 'active',
        updatedAt: new Date().toISOString(),
      }).catch(() => {});

      showToast(`Member ${user.name || user.memberId} is now marked as ${newStatus}.`, 'success');
      if (selectedUser && (selectedUser.uid === uid || selectedUser.id === uid)) {
        setSelectedUser((prev) => ({ ...prev, status: newStatus }));
        setEditFormData((prev) => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      console.error('Error toggling block status:', err);
      showToast('Failed to update status', 'error');
    } finally {
      setConfirmActionModal(null);
    }
  };

  // Delete User completely from RTDB via in-app confirm modal
  const handleDeleteUser = (user) => {
    setConfirmActionModal({ type: 'delete', user });
  };

  const executeDeleteUser = async (user) => {
    const uid = user.uid || user.id;
    const userName = user.name || user.full_name || user.memberId || 'this user';

    try {
      await Promise.all([
        remove(ref(db, `users/${uid}`)),
        remove(ref(db, `members/${uid}`)),
        remove(ref(db, `wallets/${uid}`)),
      ]);

      showToast(`Member ${userName} deleted permanently.`, 'success');
      if (detailModalOpen && selectedUser && (selectedUser.uid === uid || selectedUser.id === uid)) {
        setDetailModalOpen(false);
      }
    } catch (err) {
      console.error('Error deleting member:', err);
      showToast('Failed to delete member', 'error');
    } finally {
      setConfirmActionModal(null);
    }
  };

  // Send Login Credentials on WhatsApp (No alert / safe anchor click)
  const handleSendWhatsAppCredentials = (user) => {
    const cleanPhone = (user.phone || '').replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      showToast('इस सदस्य का वैध 10-अंकीय मोबाइल नंबर उपलब्ध नहीं है।', 'error');
      return;
    }

    const recipientPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const memberName = user.name || user.full_name || 'सदस्य';
    const memberId = user.memberId || user.member_id || 'N/A';
    const email = user.email || 'N/A';
    const password = user.password || 'UCWF@2026';
    const pkgName = user.packageName || user.package_name || 'Seva Mitra';
    const pkgAmount = parseAmount(user) || 500;

    const message = `🌟 *उत्तम चैरिटेबल वेलफेयर फाउंडेशन (UCWF)* 🌟\n\nनमस्ते *${memberName}* जी,\nउत्तम चैरिटेबल वेलफेयर फाउंडेशन में आपका स्वागत है। आपके सदस्यता लॉगिन विवरण निम्नलिखित हैं:\n\n🆔 *Member ID:* ${memberId}\n📧 *Email:* ${email}\n🔑 *Password:* ${password}\n📦 *Package:* ${pkgName} (₹${Number(pkgAmount).toLocaleString('en-IN')})\n🌐 *Website Login:* https://www.ucwf.online/login\n\nकृपया अपना पासवर्ड सुरक्षित रखें। किसी भी तकनीकी सहायता के लिए हमसे संपर्क करें।\n\nसबका साथ • सबका विकास • सबका कल्याण 🇮🇳`;

    const waUrl = `https://wa.me/${recipientPhone}?text=${encodeURIComponent(message)}`;
    const link = document.createElement('a');
    link.href = waUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // Helper: Status Badge
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle className="w-3 h-3 text-emerald-600" />
            Active
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <Clock className="w-3 h-3 text-amber-600" />
            Pending
          </span>
        );
      case 'blocked':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <Ban className="w-3 h-3 text-rose-600" />
            Blocked
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
            {status || 'Unknown'}
          </span>
        );
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* TOAST FEEDBACK NOTIFICATION */}
        <AnimatePresence>
          {feedbackToast && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`fixed top-4 right-4 z-[9999] p-4 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-semibold max-w-md ${
                feedbackToast.type === 'error'
                  ? 'bg-rose-600 text-white border border-rose-700'
                  : 'bg-emerald-600 text-white border border-emerald-700'
              }`}
            >
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span>{feedbackToast.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* TOP HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                <Users className="w-3.5 h-3.5 text-emerald-700" />
                सदस्य एवं यूज़र्स प्रबंधन (Supabase Realtime)
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Live Sync
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mt-1 flex items-center gap-3">
              Users & Members Directory
              <span className="text-xs sm:text-sm font-black px-3 py-1 rounded-full bg-stone-100 text-gray-800 border border-gray-200">
                {usersList.length} Registered Members
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              Real-time directory powered by Supabase (`members`). View passwords, WhatsApp credentials, sponsor tree, and financial records.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {pendingOrInactiveUsers.length > 0 && (
              <Button
                variant="primary"
                size="sm"
                loading={activatingAll}
                onClick={handleActivateAllPendingIds}
                className="text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              >
                ⚡ Activate All Pending IDs ({pendingOrInactiveUsers.length})
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              icon={Eye}
              onClick={toggleAllPasswords}
              className="text-xs font-bold bg-white text-gray-700 border-gray-200 shadow-sm hover:bg-stone-50"
            >
              {showAllPasswords ? 'Hide All Passwords' : '👁️ Show All Passwords'}
            </Button>

            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              loading={refreshing}
              onClick={() => {
                setRefreshing(true);
                setTimeout(() => setRefreshing(false), 600);
              }}
              className="text-xs font-bold bg-white text-gray-700 border-gray-200 shadow-sm hover:bg-stone-50"
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* =========================================================================
            SECTION 1: RECENTLY JOINED / NEW USERS HIGHLIGHT FEED
           ========================================================================= */}
        <div className="bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 rounded-3xl p-5 sm:p-6 text-white shadow-xl shadow-emerald-950/20 border border-emerald-800/60 relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
                <Sparkles className="w-4 h-4 animate-spin-slow" />
              </span>
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
                  Recently Joined / New Registrations
                  <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10px] font-black uppercase tracking-wider">
                    Live Feed
                  </span>
                </h3>
                <p className="text-xs text-emerald-200/80">
                  New members registered within the last 24 hours with 1-click password and WhatsApp dispatch.
                </p>
              </div>
            </div>

            <span className="text-xs font-semibold text-emerald-300 bg-emerald-800/50 px-3 py-1 rounded-xl border border-emerald-700/60 self-start sm:self-auto">
              {recentUsers.length} New Users
            </span>
          </div>

          {recentUsers.length === 0 ? (
            <div className="p-8 text-center bg-white/5 rounded-2xl border border-white/10">
              <p className="text-xs text-emerald-200/70">
                अभी कोई नया सदस्य पंजीकरण उपलब्ध नहीं है (No new registrations logged yet).
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {recentUsers.slice(0, 6).map((u) => {
                const uid = u.uid || u.id;
                const isWithin24h =
                  Date.now() - new Date(u.createdAt || 0).getTime() <= 24 * 60 * 60 * 1000;
                const isPasswordVisible = visiblePasswords[uid] || showAllPasswords;

                return (
                  <div
                    key={uid}
                    className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 hover:border-emerald-400/50 transition-all hover:bg-white/15 flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black text-sm flex items-center justify-center shadow-md shrink-0">
                            {(u.name || u.full_name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-white truncate flex items-center gap-1.5">
                              {u.name || u.full_name || 'Anonymous'}
                              {isWithin24h && (
                                <span className="px-1.5 py-0.2 rounded-md bg-emerald-500 text-slate-950 font-black text-[9px] uppercase tracking-wider animate-pulse">
                                  NEW
                                </span>
                              )}
                            </h4>
                            <div className="flex items-center gap-1 text-[11px] font-mono text-emerald-300">
                              <span>{u.memberId || 'Pending'}</span>
                              <button
                                type="button"
                                onClick={() => handleCopy(u.memberId, `rec_mem_${uid}`)}
                                className="text-emerald-400 hover:text-white"
                                title="Copy Member ID"
                              >
                                {copiedKey === `rec_mem_${uid}` ? (
                                  <Check className="w-3 h-3 text-amber-300" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>

                        <span className="text-[11px] font-black px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                          ₹{Number(u.packageTier || u.package_amount || 500).toLocaleString('en-IN')}
                        </span>
                      </div>

                      {/* Password & Phone Row */}
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs bg-black/20 p-2.5 rounded-xl border border-white/5">
                        <div>
                          <span className="text-[10px] text-gray-400 uppercase font-bold block">
                            Password / पासवर्ड
                          </span>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="font-mono font-bold text-amber-300 truncate">
                              {isPasswordVisible ? u.password || 'UCWF@2026' : '••••••••'}
                            </span>
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility(uid)}
                              className="text-gray-400 hover:text-white ml-auto"
                            >
                              {isPasswordVisible ? (
                                <EyeOff className="w-3 h-3" />
                              ) : (
                                <Eye className="w-3 h-3" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopy(u.password, `rec_pwd_${uid}`)}
                              className="text-gray-400 hover:text-white"
                              title="Copy Password"
                            >
                              {copiedKey === `rec_pwd_${uid}` ? (
                                <Check className="w-3 h-3 text-emerald-300" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] text-gray-400 uppercase font-bold block">
                            Mobile / फोन
                          </span>
                          <div className="flex items-center justify-between mt-0.5">
                            <span className="font-medium text-white truncate text-[11px]">
                              {u.phone || 'N/A'}
                            </span>
                            {u.phone && (
                              <div className="flex items-center gap-1">
                                <a
                                  href={`tel:${u.phone}`}
                                  className="text-emerald-400 hover:text-emerald-300"
                                  title="Call Member"
                                >
                                  <PhoneCall className="w-3 h-3" />
                                </a>
                                <button
                                  type="button"
                                  onClick={() => handleSendWhatsAppCredentials(u)}
                                  className="text-emerald-400 hover:text-emerald-300"
                                  title="Send Credentials on WhatsApp"
                                >
                                  <MessageSquare className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Quick Action Footer */}
                    <div className="flex items-center justify-between pt-1 border-t border-white/10 text-xs">
                      <span className="text-[10px] text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-gray-500" />
                        {u.createdAt
                          ? new Date(u.createdAt).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Recent'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenDetailModal(u)}
                        className="text-xs font-bold text-amber-300 hover:text-amber-200 flex items-center gap-1 cursor-pointer"
                      >
                        <span>Full Profile</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* =========================================================================
            SECTION 2: SEARCH, FILTER & SORT BAR
           ========================================================================= */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-gray-100 shadow-sm space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search name, phone, email, member ID..."
                className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full py-2.5 px-3.5 bg-stone-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800 font-semibold"
              >
                <option value="all">All Statuses (सभी स्थितियां)</option>
                <option value="active">Active (सक्रिय)</option>
                <option value="pending">Pending (लंबित)</option>
                <option value="blocked">Blocked (अवरुद्ध)</option>
              </select>
            </div>

            {/* Package Tier Filter */}
            <div>
              <select
                value={tierFilter}
                onChange={(e) => {
                  setTierFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full py-2.5 px-3.5 bg-stone-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800 font-semibold"
              >
                <option value="all">All Package Tiers (सभी योजनाएं)</option>
                {PACKAGES.map((pkg) => (
                  <option key={pkg.name} value={pkg.name}>
                    {pkg.name} (₹{pkg.amount})
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Dropdown */}
            <div>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full py-2.5 px-3.5 bg-stone-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800 font-semibold"
              >
                <option value="newest">Sort: Newest Joined First</option>
                <option value="oldest">Sort: Oldest Joined First</option>
                <option value="name">Sort: Name (A to Z)</option>
                <option value="package_desc">Sort: Package (High to Low)</option>
                <option value="balance_desc">Sort: Wallet Balance (High to Low)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500 pt-1 border-t border-gray-100">
            <span>
              Showing <strong>{filteredUsers.length}</strong> of <strong>{usersList.length}</strong> total records
            </span>
            {(searchQuery || statusFilter !== 'all' || tierFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setTierFilter('all');
                }}
                className="text-emerald-700 font-bold hover:underline"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* =========================================================================
            SECTION 3: COMPREHENSIVE MASTER USER TABLE (ALL DETAILS VISIBLE)
           ========================================================================= */}
        {loading ? (
          <div className="py-24 flex justify-center">
            <LoadingSpinner size="lg" text="Connecting to Supabase Realtime Database..." />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center shadow-sm">
            <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <h3 className="text-base font-bold text-gray-800">
              अभी कोई सदस्य रिकॉर्ड उपलब्ध नहीं है (No members found)
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              {searchQuery
                ? 'No matching members found for your search query.'
                : 'New registrations from the website will automatically appear here in real time.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Desktop Full Table */}
            <div className="hidden lg:block bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-stone-50 border-b border-gray-100 text-[11px] font-black text-gray-500 uppercase tracking-wider">
                      <th className="py-4 px-4 whitespace-nowrap">Join Date & Time</th>
                      <th className="py-4 px-4 whitespace-nowrap">Member & ID</th>
                      <th className="py-4 px-4 whitespace-nowrap">Mobile / फोन</th>
                      <th className="py-4 px-4 whitespace-nowrap">Email ID / ईमेल</th>
                      <th className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>Password / पासवर्ड</span>
                          <button
                            type="button"
                            onClick={toggleAllPasswords}
                            className="p-1 rounded hover:bg-gray-200 text-gray-600"
                            title={showAllPasswords ? 'Hide All' : 'Show All'}
                          >
                            {showAllPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </th>
                      <th className="py-4 px-4 whitespace-nowrap">Sponsor & Direct Team</th>
                      <th className="py-4 px-4 whitespace-nowrap">Package & Status</th>
                      <th className="py-4 px-4 whitespace-nowrap">Wallet & Payout</th>
                      <th className="py-4 px-4 text-right whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {paginatedUsers.map((u) => {
                      const uid = u.uid || u.id;
                      const isWithin24h =
                        Date.now() - new Date(u.createdAt || 0).getTime() <= 24 * 60 * 60 * 1000;
                      const isPasswordVisible = visiblePasswords[uid] || showAllPasswords;
                      const userWallet = walletsMap[uid] || {};
                      const walletBal =
                        userWallet.balance !== undefined ? userWallet.balance : u.walletBalance || 0;
                      const totalPayout =
                        userWallet.total_withdrawn !== undefined
                          ? userWallet.total_withdrawn
                          : u.totalWithdrawn || 0;

                      const teamMetrics = userTeamMetrics[uid] || { directCount: 0, directBusiness: 0 };
                      const sponsorDisplay = u.sponsorId || u.referrer_code || 'DIRECT';

                      return (
                        <tr
                          key={uid}
                          className="hover:bg-emerald-50/40 transition-colors group"
                        >
                          {/* 1. Join Date & Time */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              {isWithin24h && (
                                <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-extrabold text-[9px] uppercase tracking-wider border border-emerald-300">
                                  NEW
                                </span>
                              )}
                              <span className="font-semibold text-gray-800 block text-xs">
                                {u.createdAt
                                  ? new Date(u.createdAt).toLocaleDateString('en-IN', {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric',
                                    })
                                  : 'N/A'}
                              </span>
                            </div>
                            <span className="text-[10px] text-gray-400 block font-mono">
                              {u.createdAt
                                ? new Date(u.createdAt).toLocaleTimeString('en-IN', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : ''}
                            </span>
                          </td>

                          {/* 2. Photo, Full Name + Member ID */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              {u.photo_url || u.avatarUrl ? (
                                <img
                                  src={u.photo_url || u.avatarUrl}
                                  alt={u.name}
                                  className="w-9 h-9 rounded-full object-cover border border-emerald-300 shadow-xs shrink-0"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-black flex items-center justify-center text-xs shadow-xs shrink-0">
                                  {(u.name || u.full_name || 'U').charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-gray-900 block truncate text-xs">
                                    {u.name || u.full_name || 'Anonymous'}
                                  </span>
                                  {u.loginMethod === 'Google Sign-In' && (
                                    <span
                                      className="text-[9px] font-bold px-1 rounded bg-blue-50 text-blue-700 border border-blue-200"
                                      title="Signed up via Google"
                                    >
                                      G
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 text-[11px] font-mono text-emerald-800 font-bold">
                                  <span>{u.memberId || 'N/A'}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(u.memberId, `tbl_mem_${uid}`)}
                                    className="text-gray-400 hover:text-emerald-700"
                                    title="Copy Member ID"
                                  >
                                    {copiedKey === `tbl_mem_${uid}` ? (
                                      <Check className="w-3 h-3 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* 3. Mobile Number with WhatsApp & Call Links */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-800 font-mono text-xs">
                                {u.phone || 'N/A'}
                              </span>
                              {u.phone && (
                                <div className="flex items-center gap-1">
                                  <a
                                    href={`tel:${u.phone}`}
                                    className="p-1 rounded-lg text-emerald-600 hover:bg-emerald-50"
                                    title="Call Member"
                                  >
                                    <PhoneCall className="w-3.5 h-3.5" />
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => handleSendWhatsAppCredentials(u)}
                                    className="p-1 rounded-lg text-green-600 hover:bg-green-50"
                                    title="Send Login ID & Password on WhatsApp"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* 4. Email ID */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 max-w-[170px]">
                              <span className="font-medium text-gray-700 truncate text-xs">
                                {u.email || 'No email'}
                              </span>
                              {u.email && (
                                <button
                                  type="button"
                                  onClick={() => handleCopy(u.email, `tbl_em_${uid}`)}
                                  className="text-gray-400 hover:text-gray-700 shrink-0"
                                  title="Copy Email"
                                >
                                  {copiedKey === `tbl_em_${uid}` ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              )}
                            </div>
                          </td>

                          {/* 5. Password with Show/Hide & Copy */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 bg-stone-50 px-2 py-1 rounded-xl border border-gray-200 w-fit">
                              <span className="font-mono font-bold text-gray-900 text-xs">
                                {isPasswordVisible ? u.password || 'UCWF@2026' : '••••••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() => togglePasswordVisibility(uid)}
                                className="text-gray-400 hover:text-gray-700"
                                title={isPasswordVisible ? 'Hide Password' : 'Show Password'}
                              >
                                {isPasswordVisible ? (
                                  <EyeOff className="w-3.5 h-3.5" />
                                ) : (
                                  <Eye className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCopy(u.password, `tbl_pwd_${uid}`)}
                                className="text-gray-400 hover:text-gray-700"
                                title="Copy Password"
                              >
                                {copiedKey === `tbl_pwd_${uid}` ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </td>

                          {/* 6. Sponsor ID & Direct Team Count */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="font-mono font-bold text-gray-800 block text-xs">
                              {sponsorDisplay === 'DIRECT' ? (
                                <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 text-[10px]">
                                  DIRECT
                                </span>
                              ) : (
                                sponsorDisplay
                              )}
                            </span>
                            <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">
                              {teamMetrics.directCount} Directs (₹{Number(teamMetrics.directBusiness).toLocaleString('en-IN')})
                            </span>
                          </td>

                          {/* 7. Package Tier & Status */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-gray-900 text-xs">
                                  {u.packageName || u.package_name || 'Seva Mitra'}
                                </span>
                                <span className="font-black text-emerald-800 text-xs">
                                  ₹{Number(parseAmount(u) || 500).toLocaleString('en-IN')}
                                </span>
                              </div>
                              <div>{renderStatusBadge(u.status)}</div>
                            </div>
                          </td>

                          {/* 8. Wallet Balance & Total Payout */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="font-black text-emerald-800 text-xs">
                                Bal: ₹{Number(walletBal).toLocaleString('en-IN')}
                              </span>
                              <span className="text-[10px] text-gray-500 font-semibold">
                                Comm: ₹{Number(teamMetrics.totalCommission || 0).toLocaleString('en-IN')} • Paid: ₹{Number(totalPayout).toLocaleString('en-IN')}
                              </span>
                            </div>
                          </td>

                          {/* 9. Quick Actions */}
                          <td className="py-3.5 px-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                disabled={activatingId === uid}
                                onClick={() => handleToggleActivateId(u)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-extrabold transition-colors cursor-pointer ${
                                  u.status === 'active'
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                                    : 'bg-amber-500 text-white hover:bg-amber-600 shadow-xs'
                                }`}
                                title={u.status === 'active' ? 'ID Active — Click to mark Pending' : 'Activate Member ID'}
                              >
                                {activatingId === uid
                                  ? '...'
                                  : u.status === 'active'
                                  ? '✅ Active'
                                  : '⚡ Activate'}
                              </button>

                              <VoucherPrintButton user={u} allUsers={usersList} compact />

                              <button
                                type="button"
                                onClick={() => handleOpenDetailModal(u, false)}
                                className="p-1.5 rounded-xl text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                                title="View Full Profile"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenDetailModal(u, true)}
                                className="p-1.5 rounded-xl text-gray-600 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                                title="Edit Details & Password"
                              >
                                <Edit className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleToggleBlock(u)}
                                className={`p-1.5 rounded-xl transition-colors ${
                                  u.status === 'blocked'
                                    ? 'text-emerald-600 hover:bg-emerald-50'
                                    : 'text-amber-600 hover:bg-amber-50'
                                }`}
                                title={u.status === 'blocked' ? 'Unblock Member' : 'Block Member'}
                              >
                                {u.status === 'blocked' ? <ShieldCheck className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteUser(u)}
                                className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                                title="Delete Member"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile / Tablet Cards View (< 1024px) */}
            <div className="lg:hidden space-y-3.5">
              {paginatedUsers.map((u) => {
                const uid = u.uid || u.id;
                const isWithin24h =
                  Date.now() - new Date(u.createdAt || 0).getTime() <= 24 * 60 * 60 * 1000;
                const isPasswordVisible = visiblePasswords[uid] || showAllPasswords;
                const userWallet = walletsMap[uid] || {};
                const walletBal =
                  userWallet.balance !== undefined ? userWallet.balance : u.walletBalance || 0;
                const totalPayout =
                  userWallet.total_withdrawn !== undefined
                    ? userWallet.total_withdrawn
                    : u.totalWithdrawn || 0;

                return (
                  <div
                    key={uid}
                    className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-black flex items-center justify-center text-sm shadow-sm shrink-0">
                          {(u.name || u.full_name || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-sm font-bold text-gray-900">
                              {u.name || u.full_name || 'Anonymous'}
                            </h4>
                            {isWithin24h && (
                              <span className="px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800 font-extrabold text-[9px] uppercase tracking-wider">
                                NEW
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-xs font-mono text-emerald-800 font-bold">
                            <span>{u.memberId || 'N/A'}</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(u.memberId, `mob_mem_${uid}`)}
                              className="text-gray-400 hover:text-emerald-700"
                            >
                              {copiedKey === `mob_mem_${uid}` ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      {renderStatusBadge(u.status)}
                    </div>

                    {/* Details Box */}
                    <div className="grid grid-cols-2 gap-2 text-xs bg-stone-50 p-3 rounded-2xl border border-gray-100">
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase font-bold block">
                          Phone / फोन
                        </span>
                        <span className="font-semibold text-gray-800 font-mono block">
                          {u.phone || 'N/A'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-gray-400 uppercase font-bold block">
                          Package / योजना
                        </span>
                        <span className="font-bold text-emerald-800 block">
                          {u.packageName || 'Seva Mitra'} (₹{Number(u.packageTier || 500).toLocaleString('en-IN')})
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-gray-400 uppercase font-bold block">
                          Password / पासवर्ड
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="font-mono font-bold text-gray-900">
                            {isPasswordVisible ? u.password || 'UCWF@2026' : '••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(uid)}
                            className="text-gray-400 hover:text-gray-700"
                          >
                            {isPasswordVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] text-gray-400 uppercase font-bold block">
                          Wallet / Payout
                        </span>
                        <span className="font-black text-emerald-800 block">
                          ₹{Number(walletBal).toLocaleString('en-IN')}{' '}
                          <span className="text-[10px] text-gray-400 font-normal">
                            (Paid ₹{totalPayout})
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* Mobile Action Buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={activatingId === uid}
                          onClick={() => handleToggleActivateId(u)}
                          className={`px-2.5 py-1.5 rounded-xl text-[11px] font-extrabold transition ${
                            u.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-amber-500 text-white'
                          }`}
                        >
                          {u.status === 'active' ? '✅ ID Active' : '⚡ Activate ID'}
                        </button>
                        <VoucherPrintButton user={u} allUsers={usersList} compact />
                      </div>

                      <div className="flex items-center gap-1.5">
                        {u.phone && (
                          <button
                            type="button"
                            onClick={() => handleSendWhatsAppCredentials(u)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-green-50 text-green-700 border border-green-200 text-xs font-bold"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenDetailModal(u, false)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold hover:bg-emerald-100"
                        >
                          Details
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenDetailModal(u, true)}
                          className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-800 text-xs font-bold hover:bg-blue-100"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleBlock(u)}
                          className={`p-1.5 rounded-xl ${
                            u.status === 'blocked' ? 'text-emerald-700' : 'text-rose-600'
                          }`}
                        >
                          {u.status === 'blocked' ? <ShieldCheck className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between bg-white px-5 py-3.5 rounded-2xl border border-gray-100 text-xs">
                <span className="text-gray-500">
                  Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            SECTION 4: FULL USER PROFILE & CREDENTIAL EDITOR MODAL (FOR ADMIN)
           ========================================================================= */}
        <Modal
          isOpen={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          title={
            isEditing
              ? 'Edit Member Profile & Credentials / सदस्य विवरण व पासवर्ड संपादन'
              : 'Complete Member Profile / सदस्य पूर्ण विवरण व क्रेडेंशियल्स'
          }
          size="xl"
          footer={
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full">
              <div className="flex items-center gap-2">
                {selectedUser && selectedUser.phone && (
                  <Button
                    variant="outline"
                    size="sm"
                    icon={MessageSquare}
                    onClick={() => handleSendWhatsAppCredentials(selectedUser)}
                    className="text-xs font-bold text-green-700 border-green-300 hover:bg-green-50"
                  >
                    Send ID & Password on WhatsApp
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2 justify-end">
                {isEditing ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(false)}
                      disabled={savingUser}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      icon={Save}
                      loading={savingUser}
                      onClick={handleSaveChanges}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      Save Changes (RTDB Update)
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={Edit}
                      onClick={() => setIsEditing(true)}
                      className="text-blue-700 border-blue-200 hover:bg-blue-50"
                    >
                      Edit Details / Password
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setDetailModalOpen(false)}
                      className="bg-emerald-700 text-white hover:bg-emerald-800"
                    >
                      Close
                    </Button>
                  </>
                )}
              </div>
            </div>
          }
        >
          {selectedUser && (
            <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
              {/* TOP HEADER CARD */}
              <div className="p-5 rounded-3xl bg-gradient-to-r from-emerald-50 via-teal-50 to-stone-50 border border-emerald-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-emerald-700/20 shrink-0">
                    {(editFormData.name || selectedUser.name || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black text-gray-900">
                        {editFormData.name || selectedUser.name || 'Member'}
                      </h3>
                      {renderStatusBadge(editFormData.status || selectedUser.status)}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-600 font-mono mt-0.5">
                      <span>ID: {editFormData.memberId || selectedUser.memberId}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(editFormData.memberId, 'mod_mem_id')}
                        className="text-gray-400 hover:text-emerald-700"
                      >
                        {copiedKey === 'mod_mem_id' ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-emerald-800 font-bold mt-1">
                      {editFormData.packageName || selectedUser.packageName} • Package: ₹
                      {Number(editFormData.packageTier || selectedUser.packageTier || 500).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>

                <div className="text-xs text-gray-500 sm:text-right space-y-1">
                  <div>
                    Joined:{' '}
                    <strong className="text-gray-800">
                      {selectedUser.createdAt
                        ? new Date(selectedUser.createdAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })
                        : 'N/A'}
                    </strong>
                  </div>
                  <div>
                    Login Method:{' '}
                    <span className="font-semibold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                      {editFormData.loginMethod || selectedUser.loginMethod || 'Direct'}
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION A: PERSONAL & LOGIN CREDENTIALS */}
              <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                  <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-2">
                    <Key className="w-4 h-4 text-emerald-600" />
                    Personal & Login Credentials / व्यक्तिगत एवं लॉगिन क्रेडेंशियल्स
                  </h4>
                  <span className="text-[11px] text-gray-400">Supabase Record: `members/{selectedUser.uid}`</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                  {/* Full Name */}
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Full Name (पूरा नाम) *</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editFormData.name}
                        onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                        className="w-full p-2.5 bg-stone-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 font-semibold"
                      />
                    ) : (
                      <p className="p-2.5 bg-stone-50 rounded-xl font-bold text-gray-800 border border-gray-100">
                        {selectedUser.name || selectedUser.full_name || 'N/A'}
                      </p>
                    )}
                  </div>

                  {/* Member ID */}
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Member ID (सदस्य आईडी)</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editFormData.memberId}
                        onChange={(e) => setEditFormData({ ...editFormData, memberId: e.target.value.toUpperCase() })}
                        className="w-full p-2.5 bg-stone-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
                      />
                    ) : (
                      <p className="p-2.5 bg-stone-50 rounded-xl font-mono font-bold text-gray-800 border border-gray-100 flex items-center justify-between">
                        <span>{selectedUser.memberId || 'N/A'}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(selectedUser.memberId, 'f_mem_id')}
                          className="text-gray-400 hover:text-gray-700"
                        >
                          {copiedKey === 'f_mem_id' ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </p>
                    )}
                  </div>

                  {/* Password (Editable by Admin) */}
                  <div>
                    <label className="block font-bold text-emerald-800 mb-1 flex items-center justify-between">
                      <span>Account Password (पासवर्ड) *</span>
                      <span className="text-[10px] text-gray-400">Admin Visible</span>
                    </label>
                    {isEditing ? (
                      <div className="relative">
                        <input
                          type="text"
                          value={editFormData.password}
                          onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                          placeholder="Set user password"
                          className="w-full p-2.5 bg-amber-50/50 rounded-xl border border-amber-300 focus:ring-2 focus:ring-amber-500 font-mono font-bold text-gray-900"
                        />
                      </div>
                    ) : (
                      <div className="p-2.5 bg-amber-50/60 rounded-xl border border-amber-200 flex items-center justify-between font-mono font-bold text-amber-950">
                        <span>{selectedUser.password || 'UCWF@2026'}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(selectedUser.password || 'UCWF@2026', 'f_pwd')}
                          className="text-amber-800 hover:text-amber-950"
                          title="Copy Password"
                        >
                          {copiedKey === 'f_pwd' ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Email ID (ईमेल)</label>
                    {isEditing ? (
                      <input
                        type="email"
                        value={editFormData.email}
                        onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                        className="w-full p-2.5 bg-stone-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 font-medium"
                      />
                    ) : (
                      <p className="p-2.5 bg-stone-50 rounded-xl text-gray-800 font-medium border border-gray-100 truncate">
                        {selectedUser.email || 'N/A'}
                      </p>
                    )}
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Mobile Number (मोबाइल नं.)</label>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={editFormData.phone}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            phone: e.target.value.replace(/\D/g, ''),
                          })
                        }
                        className="w-full p-2.5 bg-stone-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
                      />
                    ) : (
                      <p className="p-2.5 bg-stone-50 rounded-xl font-mono font-bold text-gray-800 border border-gray-100 flex items-center justify-between">
                        <span>{selectedUser.phone || 'N/A'}</span>
                        {selectedUser.phone && (
                          <a
                            href={`tel:${selectedUser.phone}`}
                            className="text-emerald-700 hover:text-emerald-800"
                          >
                            <PhoneCall className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </p>
                    )}
                  </div>

                  {/* Blood Group */}
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Blood Group (रक्त समूह)</label>
                    {isEditing ? (
                      <select
                        value={editFormData.bloodGroup}
                        onChange={(e) => setEditFormData({ ...editFormData, bloodGroup: e.target.value })}
                        className="w-full p-2.5 bg-stone-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 font-bold"
                      >
                        {BLOOD_GROUPS.map((bg) => (
                          <option key={bg} value={bg}>
                            {bg} Group
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="p-2.5 bg-stone-50 rounded-xl font-bold text-gray-800 border border-gray-100">
                        {selectedUser.bloodGroup || selectedUser.blood_group || 'O+'} Group
                      </p>
                    )}
                  </div>
                </div>

                {/* Postal Address */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1 text-xs">
                    Postal Address / City / District (डाक पता)
                  </label>
                  {isEditing ? (
                    <textarea
                      rows={2}
                      value={editFormData.city}
                      onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                      className="w-full p-2.5 bg-stone-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 text-xs"
                    />
                  ) : (
                    <p className="p-2.5 bg-stone-50 rounded-xl text-gray-700 text-xs border border-gray-100">
                      {selectedUser.city || selectedUser.address || 'India'}
                    </p>
                  )}
                </div>
              </div>

              {/* SECTION B: BUSINESS & TREE INFO */}
              <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                  <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-emerald-600" />
                    Business & Tree Info / व्यापार एवं नेटवर्क विवरण
                  </h4>
                  <span className="text-[11px] text-gray-400">12-Level Hierarchy</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  {/* Sponsor ID */}
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Sponsor ID (प्रायोजक आईडी)</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editFormData.sponsorId}
                        onChange={(e) => setEditFormData({ ...editFormData, sponsorId: e.target.value.toUpperCase() })}
                        className="w-full p-2.5 bg-stone-50 rounded-xl border border-gray-200 font-mono font-bold"
                      />
                    ) : (
                      <p className="p-2.5 bg-stone-50 rounded-xl font-mono font-bold text-gray-800 border border-gray-100">
                        {selectedUser.sponsorId || selectedUser.referrer_code || 'DIRECT'}
                      </p>
                    )}
                  </div>

                  {/* Package Tier Dropdown (Admin Can Upgrade) */}
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Package Tier (योजना)</label>
                    {isEditing ? (
                      <select
                        value={editFormData.packageTier}
                        onChange={(e) => {
                          const amt = Number(e.target.value);
                          const pkg = PACKAGES.find((p) => p.amount === amt);
                          setEditFormData({
                            ...editFormData,
                            packageTier: amt,
                            packageName: pkg ? pkg.name : editFormData.packageName,
                          });
                        }}
                        className="w-full p-2.5 bg-stone-50 rounded-xl border border-gray-200 font-bold text-emerald-900"
                      >
                        {PACKAGES.map((p) => (
                          <option key={p.amount} value={p.amount}>
                            {p.name} (₹{p.amount.toLocaleString('en-IN')})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="p-2.5 bg-emerald-50/50 rounded-xl font-bold text-emerald-900 border border-emerald-200">
                        {selectedUser.packageName || 'Seva Mitra'} (₹{Number(selectedUser.packageTier || 500).toLocaleString('en-IN')})
                      </p>
                    )}
                  </div>

                  {/* Member Status */}
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Account Status (स्थिति)</label>
                    {isEditing ? (
                      <select
                        value={editFormData.status}
                        onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                        className="w-full p-2.5 bg-stone-50 rounded-xl border border-gray-200 font-bold"
                      >
                        <option value="active">Active (सक्रिय)</option>
                        <option value="pending">Pending (लंबित)</option>
                        <option value="blocked">Blocked (अवरुद्ध)</option>
                      </select>
                    ) : (
                      <div className="p-2.5 bg-stone-50 rounded-xl border border-gray-100">
                        {renderStatusBadge(selectedUser.status)}
                      </div>
                    )}
                  </div>

                  {/* Wallet Balance (Editable) */}
                  <div>
                    <label className="block font-bold text-emerald-800 mb-1">Wallet Balance (वॉलेट राशि)</label>
                    {isEditing ? (
                      <input
                        type="number"
                        value={editFormData.walletBalance}
                        onChange={(e) => setEditFormData({ ...editFormData, walletBalance: e.target.value })}
                        className="w-full p-2.5 bg-emerald-50/50 rounded-xl border border-emerald-300 font-black text-emerald-950"
                      />
                    ) : (
                      <p className="p-2.5 bg-emerald-50 rounded-xl font-black text-emerald-950 border border-emerald-200">
                        ₹{Number(editFormData.walletBalance).toLocaleString('en-IN')}
                      </p>
                    )}
                  </div>
                </div>

                {/* Financial KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                      Direct Team Business
                    </span>
                    <span className="text-xl font-black text-emerald-950 mt-1 block">
                      ₹{Number(userTeamMetrics[selectedUser.uid || selectedUser.id]?.directBusiness || 0).toLocaleString('en-IN')}
                    </span>
                    <span className="text-[11px] text-emerald-700 font-medium">
                      {userTeamMetrics[selectedUser.uid || selectedUser.id]?.directCount || 0} Direct Members
                    </span>
                  </div>

                  <div className="p-3.5 bg-blue-50 rounded-2xl border border-blue-100">
                    <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">
                      Total Commission Earned
                    </span>
                    <span className="text-xl font-black text-blue-950 mt-1 block">
                      ₹{Number(editFormData.totalEarned || 0).toLocaleString('en-IN')}
                    </span>
                    <span className="text-[11px] text-blue-700 font-medium">Via 12-Level Plan</span>
                  </div>

                  <div className="p-3.5 bg-purple-50 rounded-2xl border border-purple-100">
                    <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider block">
                      Total Payout Withdrawn
                    </span>
                    <span className="text-xl font-black text-purple-950 mt-1 block">
                      ₹{Number(editFormData.totalWithdrawn || 0).toLocaleString('en-IN')}
                    </span>
                    <span className="text-[11px] text-purple-700 font-medium">Disbursed to Bank/UPI</span>
                  </div>
                </div>
              </div>

              {/* SECTION C: BANK & UPI PAYOUT DETAILS */}
              <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                  <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-600" />
                    Bank & UPI Payout Details / बैंक एवं यूपीआई विवरण
                  </h4>
                  <span className="text-[11px] text-gray-400">Withdrawal Destination</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
                  {/* UPI ID */}
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">UPI ID (e.g. name@oksbi)</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editFormData.bankDetails?.upiId || ''}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            bankDetails: { ...editFormData.bankDetails, upiId: e.target.value },
                          })
                        }
                        placeholder="e.g. ramesh@okicici"
                        className="w-full p-2.5 bg-stone-50 rounded-xl border border-gray-200 font-mono font-bold"
                      />
                    ) : (
                      <p className="p-2.5 bg-stone-50 rounded-xl font-mono font-bold text-gray-800 border border-gray-100">
                        {editFormData.bankDetails?.upiId || 'Not provided'}
                      </p>
                    )}
                  </div>

                  {/* Account Holder */}
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Account Holder Name</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editFormData.bankDetails?.accountHolder || ''}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            bankDetails: { ...editFormData.bankDetails, accountHolder: e.target.value },
                          })
                        }
                        placeholder="As per bank passbook"
                        className="w-full p-2.5 bg-stone-50 rounded-xl border border-gray-200 font-semibold"
                      />
                    ) : (
                      <p className="p-2.5 bg-stone-50 rounded-xl font-semibold text-gray-800 border border-gray-100">
                        {editFormData.bankDetails?.accountHolder || selectedUser.name || 'Not provided'}
                      </p>
                    )}
                  </div>

                  {/* Bank Name */}
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Bank Name</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editFormData.bankDetails?.bankName || ''}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            bankDetails: { ...editFormData.bankDetails, bankName: e.target.value },
                          })
                        }
                        placeholder="e.g. State Bank of India"
                        className="w-full p-2.5 bg-stone-50 rounded-xl border border-gray-200"
                      />
                    ) : (
                      <p className="p-2.5 bg-stone-50 rounded-xl text-gray-800 border border-gray-100">
                        {editFormData.bankDetails?.bankName || 'Not provided'}
                      </p>
                    )}
                  </div>

                  {/* Account Number */}
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Account Number</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editFormData.bankDetails?.accountNumber || ''}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            bankDetails: { ...editFormData.bankDetails, accountNumber: e.target.value },
                          })
                        }
                        placeholder="Bank account number"
                        className="w-full p-2.5 bg-stone-50 rounded-xl border border-gray-200 font-mono"
                      />
                    ) : (
                      <p className="p-2.5 bg-stone-50 rounded-xl font-mono text-gray-800 border border-gray-100">
                        {editFormData.bankDetails?.accountNumber || 'Not provided'}
                      </p>
                    )}
                  </div>

                  {/* IFSC Code */}
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">IFSC Code</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editFormData.bankDetails?.ifscCode || ''}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            bankDetails: { ...editFormData.bankDetails, ifscCode: e.target.value.toUpperCase() },
                          })
                        }
                        placeholder="e.g. SBIN0001234"
                        className="w-full p-2.5 bg-stone-50 rounded-xl border border-gray-200 font-mono uppercase"
                      />
                    ) : (
                      <p className="p-2.5 bg-stone-50 rounded-xl font-mono text-gray-800 border border-gray-100 uppercase">
                        {editFormData.bankDetails?.ifscCode || 'Not provided'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </Modal>

        {/* IN-APP CONFIRMATION MODAL FOR BLOCK / DELETE */}
        <Modal
          isOpen={Boolean(confirmActionModal)}
          onClose={() => setConfirmActionModal(null)}
          title={
            confirmActionModal?.type === 'delete'
              ? 'Delete Member Permanently? / स्थायी रूप से हटाएं?'
              : 'Change Member Status? / सदस्य स्थिति बदलें?'
          }
          size="sm"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button variant="outline" size="sm" onClick={() => setConfirmActionModal(null)}>
                Cancel / रद्द करें
              </Button>
              <Button
                variant={confirmActionModal?.type === 'delete' ? 'danger' : 'primary'}
                size="sm"
                onClick={() => {
                  if (!confirmActionModal?.user) return;
                  if (confirmActionModal.type === 'delete') {
                    executeDeleteUser(confirmActionModal.user);
                  } else {
                    executeToggleBlock(confirmActionModal.user);
                  }
                }}
              >
                Confirm / पुष्टि करें
              </Button>
            </div>
          }
        >
          {confirmActionModal?.user && (
            <p className="text-xs text-gray-700 leading-relaxed">
              {confirmActionModal.type === 'delete' ? (
                <>
                  क्या आप वाकई <strong>{confirmActionModal.user.name || confirmActionModal.user.full_name}</strong> ({confirmActionModal.user.memberId}) को डेटाबेस से स्थायी रूप से हटाना चाहते हैं?
                </>
              ) : (
                <>
                  <strong>{confirmActionModal.user.name || confirmActionModal.user.full_name}</strong> की स्थिति बदलकर{' '}
                  <strong>{confirmActionModal.user.status === 'blocked' ? 'Active' : 'Blocked'}</strong> करना चाहते हैं?
                </>
              )}
            </p>
          )}
        </Modal>
      </div>
    </AdminLayout>
  );
}

export { Members };
