import { createClient } from '@supabase/supabase-js';

export const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://duioltyrenrplqzijdsi.supabase.co';
export const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_ydJxJYWjuDnlkb6ek026gw_K9uI4Bhu';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 20,
    },
  },
});

// ============================================================================
// 1. SUPABASE STORAGE HELPER ('uploads' bucket with safe DataURL fallback)
// ============================================================================

export function compressFileToDataUrl(file, maxWidth = 700, quality = 0.65, maxChars = 175000) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('No file provided'));

    if (!file.type || !file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        const res = String(reader.result || '');
        resolve(res.length > maxChars * 1.6 ? '' : res);
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          let targetMaxW = maxWidth;
          let targetQ = quality;
          let outDataUrl = '';

          for (let attempt = 0; attempt < 5; attempt++) {
            let width = img.width;
            let height = img.height;
            if (width > targetMaxW) {
              height = Math.round((height * targetMaxW) / width);
              width = targetMaxW;
            }
            canvas.width = Math.max(1, width);
            canvas.height = Math.max(1, height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            outDataUrl = canvas.toDataURL('image/jpeg', targetQ);
            if (outDataUrl.length <= maxChars) break;
            targetQ = Math.max(0.28, targetQ - 0.12);
            targetMaxW = Math.max(240, Math.round(targetMaxW * 0.72));
          }
          resolve(outDataUrl);
        } catch {
          resolve(event.target.result);
        }
      };
      img.onerror = () => resolve(event.target.result);
      img.src = event.target.result;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export async function uploadToSupabaseStorage(file, folderOrProgress = 'general') {
  if (!file) throw new Error('कोई फ़ाइल चयनित नहीं है (No file selected)');

  const progressCb = typeof folderOrProgress === 'function' ? folderOrProgress : null;
  const folder =
    typeof folderOrProgress === 'string' && folderOrProgress.trim()
      ? folderOrProgress.trim().replace(/^\/+|\/+$/g, '')
      : 'general';

  const isVideo = Boolean(file.type && file.type.startsWith('video/'));
  const resourceType = isVideo ? 'video' : 'image';
  const rawExt = (file.name && file.name.includes('.') ? file.name.split('.').pop() : '') || (isVideo ? 'mp4' : 'jpg');
  const cleanExt = rawExt.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const filePath = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 9)}.${cleanExt}`;

  if (progressCb) progressCb(25);

  try {
    const { error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type || (isVideo ? 'video/mp4' : 'image/jpeg'),
      });

    if (uploadError) throw uploadError;

    const { data: pubData } = supabase.storage.from('uploads').getPublicUrl(filePath);
    const publicUrl = pubData?.publicUrl;
    if (!publicUrl) throw new Error('Unable to generate Supabase Storage public URL');

    if (progressCb) progressCb(100);
    return {
      url: publicUrl,
      path: filePath,
      publicId: filePath,
      resourceType,
      format: cleanExt,
    };
  } catch (err) {
    console.warn('Supabase Storage upload fallback to compressed Data URL:', err?.message || err);
    if (progressCb) progressCb(60);
    const dataUrl = await compressFileToDataUrl(file);
    if (progressCb) progressCb(100);
    return {
      url: dataUrl,
      path: filePath,
      publicId: `local_${Date.now()}`,
      resourceType,
      format: cleanExt,
    };
  }
}

// ============================================================================
// 2. IN-MEMORY + INDEXEDDB + SUPABASE POSTGRESQL REALTIME ENGINE
// ============================================================================

const LOCAL_STORAGE_KEY = 'ucwf_supabase_cache_v3';
const IDB_NAME = 'ucwf_supabase_idb_v3';
const IDB_STORE = 'tree_store';
const IDB_KEY = 'root_tree';
const BCAST_CHANNEL_NAME = 'ucwf_supabase_sync_channel_v3';

const ROOT_COLLECTIONS = [
  'users',
  'members',
  'wallets',
  'admins',
  'payment_requests',
  'withdrawals',
  'transactions',
  'payout_records',
  'payout_logs',
  'payouts',
  'daily_closings',
  'spends',
  'expenses',
  'events',
  'media_submissions',
  'media_approvals',
  'media_gallery',
  'certificates',
  'settings',
];

const DEFAULT_ROOT_SPONSOR = {
  uid: 'ucwf_root_0001',
  id: 'ucwf_root_0001',
  memberId: 'UCWF-0001',
  member_id: 'UCWF-0001',
  username: 'UCWF-0001',
  codeNo: 'UCWF-0001',
  salutation: 'Dr.',
  fullName: 'Dr. Rajendra Singh Saini',
  full_name: 'Dr. Rajendra Singh Saini',
  name: 'Dr. Rajendra Singh Saini',
  padNaam: 'National President / Founder',
  phone: '9540648402',
  mobile: '9540648402',
  email: 'uttamcharitable@gmail.com',
  sponsorId: 'ROOT',
  sponsor_id: 'ROOT',
  sponsorCode: 'ROOT',
  sponsorName: 'UCWF Trust Root',
  status: 'active',
  isApproved: true,
  idActivationStatus: 'active',
  role: 'member',
  is_admin: false,
  packageAmount: 11000,
  package_amount: 11000,
  donationAmount: 11000,
  selfBusiness: 11000,
  tierName: 'Founder Patron',
  tier_name: 'Founder Patron',
  joiningDate: '2025-01-01',
  createdAt: '2025-01-01T00:00:00.000Z',
  created_at: '2025-01-01T00:00:00.000Z',
};

function createEmptyTree() {
  return {
    users: {
      [DEFAULT_ROOT_SPONSOR.uid]: { ...DEFAULT_ROOT_SPONSOR },
    },
    members: {
      [DEFAULT_ROOT_SPONSOR.uid]: { ...DEFAULT_ROOT_SPONSOR },
    },
    wallets: {},
    admins: {},
    payment_requests: {},
    withdrawals: {},
    transactions: {},
    payout_records: {},
    payout_logs: {},
    payouts: {},
    daily_closings: {},
    spends: {},
    expenses: {},
    events: {},
    media_submissions: {},
    media_approvals: {},
    media_gallery: {
      videos: {},
      posters: {},
    },
    certificates: {},
    settings: {
      diwaliTheme: false,
      selfBusinessRate: 0,
      levelRates: {
        1: 20,
        2: 8,
        3: 5,
        4: 4,
        5: 3,
        6: 2.5,
        7: 2,
        8: 1.5,
        9: 1,
        10: 1,
        11: 1,
        12: 1,
      },
    },
  };
}

let dbTree = createEmptyTree();

function ensureRootCollections() {
  if (!dbTree || typeof dbTree !== 'object') {
    dbTree = createEmptyTree();
    return;
  }
  for (const col of ROOT_COLLECTIONS) {
    if (!dbTree[col] || typeof dbTree[col] !== 'object') {
      dbTree[col] = col === 'media_gallery' ? { videos: {}, posters: {} } : {};
    }
  }
  if (!dbTree.media_gallery.videos) dbTree.media_gallery.videos = {};
  if (!dbTree.media_gallery.posters) dbTree.media_gallery.posters = {};
  // Keep users and members mirrored
  const combinedMembers = {
    [DEFAULT_ROOT_SPONSOR.uid]: { ...DEFAULT_ROOT_SPONSOR },
    ...(dbTree.members || {}),
    ...(dbTree.users || {}),
  };
  dbTree.users = { ...combinedMembers };
  dbTree.members = { ...combinedMembers };
}

function hydrateFromLocalStorageSync() {
  if (typeof window === 'undefined') return;
  try {
    // Also migrate any previous cached tree so existing members are never lost
    const raw =
      window.localStorage.getItem(LOCAL_STORAGE_KEY) ||
      window.localStorage.getItem('ucwf_rtdb_local_mirror_v2');
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      for (const [k, v] of Object.entries(parsed)) {
        if (v && typeof v === 'object') {
          dbTree[k] = { ...(dbTree[k] || {}), ...v };
        }
      }
      ensureRootCollections();
    }
  } catch (e) {
    console.warn('Local cache hydration warning:', e);
  }
}

hydrateFromLocalStorageSync();

function openIndexedDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB unavailable'));
    }
    const req = window.indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const idb = req.result;
      if (!idb.objectStoreNames.contains(IDB_STORE)) {
        idb.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function readTreeFromIndexedDB() {
  try {
    const idb = await openIndexedDB();
    return await new Promise((resolve, reject) => {
      const tx = idb.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const getReq = store.get(IDB_KEY);
      getReq.onsuccess = () => resolve(getReq.result || null);
      getReq.onerror = () => reject(getReq.error);
    });
  } catch {
    return null;
  }
}

async function writeTreeToIndexedDB(treeData) {
  try {
    const idb = await openIndexedDB();
    await new Promise((resolve, reject) => {
      const tx = idb.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      const putReq = store.put(treeData, IDB_KEY);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    });
  } catch {
    // Non-fatal
  }
}

let bcastChannel = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    bcastChannel = new BroadcastChannel(BCAST_CHANNEL_NAME);
    bcastChannel.onmessage = (ev) => {
      if (ev.data && ev.data.type === 'TREE_UPDATED' && ev.data.tree) {
        dbTree = ev.data.tree;
        ensureRootCollections();
        notifyAllListeners();
      }
    };
  } catch {
    // Ignore
  }
}

let saveTimer = null;
function saveToLocalCache(broadcast = true) {
  if (typeof window === 'undefined') return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    ensureRootCollections();
    writeTreeToIndexedDB(dbTree);
    try {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dbTree));
    } catch {
      // If images exceed localStorage 5MB quota, IndexedDB still holds the full tree
    }
    if (broadcast && bcastChannel) {
      try {
        bcastChannel.postMessage({ type: 'TREE_UPDATED', tree: dbTree });
      } catch {
        // Ignore
      }
    }
  }, 50);
}

// ============================================================================
// 3. SUPABASE TABLE <-> TREE MAPPING & SERIALIZATION
// ============================================================================

const COLLECTION_TO_TABLE = {
  users: 'members',
  members: 'members',
  wallets: 'wallets',
  admins: 'admins',
  payment_requests: 'payment_requests',
  withdrawals: 'withdrawals',
  transactions: 'transactions',
  payout_records: 'payouts',
  payout_logs: 'payouts',
  payouts: 'payouts',
  daily_closings: 'daily_closings',
  spends: 'spends',
  expenses: 'spends',
  events: 'events',
  media_submissions: 'media_approvals',
  media_approvals: 'media_approvals',
  media_gallery: 'media_gallery',
  certificates: 'certificates',
  settings: 'settings',
};

function toIsoDate(val) {
  if (!val) return new Date().toISOString();
  if (typeof val === 'number') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }
  if (typeof val === 'string') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }
  return new Date().toISOString();
}

function serializeToSupabaseRow(table, docId, rawObj) {
  const obj = rawObj && typeof rawObj === 'object' ? { ...rawObj } : { value: rawObj };
  const id = String(docId || obj.uid || obj.id || `doc_${Date.now()}`);

  if (table === 'members') {
    const memberId = String(
      obj.memberId || obj.member_id || obj.codeNo || obj.username || id
    ).trim();
    const fullName = String(obj.fullName || obj.full_name || obj.name || 'Member').trim();
    const phone = String(obj.phone || obj.mobile || '').trim();
    const sponsorId = String(
      obj.sponsorId || obj.sponsor_id || obj.sponsorCode || obj.referrer_id || ''
    ).trim();
    const pkgAmount = Number(
      obj.packageAmount ?? obj.package_amount ?? obj.donationAmount ?? obj.selfBusiness ?? 0
    ) || 0;
    const status = String(
      obj.status || (obj.isApproved ? 'active' : 'pending')
    ).toLowerCase();

    return {
      id,
      uid: id,
      member_id: memberId,
      full_name: fullName,
      name: fullName,
      email: obj.email || `${memberId.toLowerCase().replace(/[^a-z0-9]/g, '')}@ucwf.org`,
      phone,
      mobile: phone,
      password: String(obj.password || ''),
      sponsor_id: sponsorId || null,
      referrer_id: obj.referrer_id || null,
      package_amount: pkgAmount,
      tier_name: obj.tierName || obj.tier_name || 'Supporter',
      status,
      photo_url: obj.photoUrl || obj.photo_url || obj.passportPhotoUrl || obj.avatar || '',
      payment_utr: obj.paymentUtr || obj.payment_utr || obj.utrNumber || '',
      payment_screenshot_url:
        obj.paymentScreenshotUrl || obj.payment_screenshot_url || obj.paymentProofUrl || '',
      is_admin: Boolean(obj.is_admin || obj.isAdmin || obj.role === 'admin'),
      data: {
        ...obj,
        uid: id,
        id,
        memberId,
        member_id: memberId,
        fullName,
        full_name: fullName,
        name: fullName,
        phone,
        mobile: phone,
        sponsorId,
        sponsor_id: sponsorId,
        packageAmount: pkgAmount,
        package_amount: pkgAmount,
        status,
      },
      updated_at: new Date().toISOString(),
    };
  }

  if (table === 'admins') {
    return {
      id,
      username: String(obj.username || obj.adminId || 'admin'),
      email: String(obj.email || 'admin@ucwf.org'),
      phone: String(obj.phone || obj.mobile || '9540648402'),
      password: String(obj.password || 'Admin@2026'),
      full_name: String(obj.full_name || obj.fullName || obj.name || 'UCWF Master Admin'),
      role: String(obj.role || 'super_admin'),
      data: { ...obj, id },
      updated_at: new Date().toISOString(),
    };
  }

  if (table === 'wallets') {
    return {
      id,
      user_id: String(obj.user_id || obj.userId || obj.uid || id),
      balance: Number(obj.balance ?? obj.currentBalance ?? obj.walletBalance ?? 0) || 0,
      total_earned: Number(obj.total_earned ?? obj.totalEarned ?? obj.totalCommission ?? 0) || 0,
      total_withdrawn: Number(obj.total_withdrawn ?? obj.totalWithdrawn ?? obj.paidPayout ?? 0) || 0,
      data: { ...obj, id },
      updated_at: new Date().toISOString(),
    };
  }

  if (table === 'payment_requests') {
    return {
      id,
      user_id: String(obj.userId || obj.user_id || obj.uid || ''),
      member_id: String(obj.memberId || obj.member_id || ''),
      member_name: String(obj.memberName || obj.member_name || obj.fullName || obj.name || ''),
      amount: Number(obj.amount ?? obj.packageAmount ?? obj.donationAmount ?? 0) || 0,
      utr_number: String(obj.utrNumber || obj.utr_number || obj.paymentUtr || ''),
      screenshot_url: String(obj.screenshotUrl || obj.screenshot_url || obj.paymentProofUrl || ''),
      status: String(obj.status || 'pending'),
      data: { ...obj, id },
      created_at: toIsoDate(obj.createdAt || obj.created_at),
    };
  }

  if (table === 'withdrawals') {
    return {
      id,
      user_id: String(obj.user_id || obj.userId || obj.uid || ''),
      member_id: String(obj.memberId || obj.member_id || ''),
      amount: Number(obj.amount ?? obj.netPayable ?? 0) || 0,
      bank_details:
        obj.bank_details && typeof obj.bank_details === 'object'
          ? obj.bank_details
          : obj.bankDetails && typeof obj.bankDetails === 'object'
          ? obj.bankDetails
          : { info: String(obj.bank_details || obj.bankDetails || '') },
      status: String(obj.status || 'pending'),
      admin_notes: String(obj.admin_notes || obj.adminNotes || obj.remarks || ''),
      processed_at: obj.processed_at || obj.processedAt ? toIsoDate(obj.processed_at || obj.processedAt) : null,
      data: { ...obj, id },
      created_at: toIsoDate(obj.createdAt || obj.created_at),
    };
  }

  if (table === 'transactions') {
    return {
      id,
      user_id: String(obj.user_id || obj.userId || obj.uid || ''),
      from_user_id: String(obj.from_user_id || obj.fromUserId || obj.sourceUid || ''),
      amount: Number(obj.amount ?? 0) || 0,
      type: String(obj.type || 'level_income'),
      level: Number(obj.level ?? 0) || null,
      description: String(obj.description || obj.remarks || ''),
      status: String(obj.status || 'completed'),
      data: { ...obj, id },
      created_at: toIsoDate(obj.createdAt || obj.created_at),
    };
  }

  if (table === 'payouts') {
    return {
      id,
      user_id: String(obj.userId || obj.user_id || obj.uid || ''),
      member_id: String(obj.memberId || obj.member_id || obj.codeNo || ''),
      member_name: String(obj.memberName || obj.member_name || obj.fullName || obj.name || ''),
      amount: Number(obj.amount ?? obj.netPayable ?? obj.totalAmount ?? 0) || 0,
      tds: Number(obj.tds ?? obj.tdsAmount ?? 0) || 0,
      trust_charge: Number(obj.trustCharge ?? obj.trust_charge ?? obj.adminCharge ?? 0) || 0,
      net_payable: Number(obj.netPayable ?? obj.net_payable ?? obj.amount ?? 0) || 0,
      payment_mode: String(obj.paymentMode || obj.payment_mode || obj.mode || 'Bank Transfer'),
      reference_no: String(obj.referenceNo || obj.reference_no || obj.utr || obj.transactionId || ''),
      status: String(obj.status || 'paid'),
      closing_date: String(obj.closingDate || obj.closing_date || obj.date || ''),
      data: { ...obj, id },
      created_at: toIsoDate(obj.createdAt || obj.created_at || obj.paidAt),
    };
  }

  if (table === 'daily_closings') {
    return {
      id,
      closing_no: Number(obj.closingNo ?? obj.closing_no ?? 1) || 1,
      closing_date: String(obj.closingDate || obj.closing_date || obj.date || ''),
      total_turnover: Number(obj.totalTurnover ?? obj.total_turnover ?? obj.totalBusiness ?? 0) || 0,
      total_distributed: Number(obj.totalDistributed ?? obj.total_distributed ?? obj.totalCommission ?? 0) || 0,
      trust_fund: Number(obj.trustFund ?? obj.trust_fund ?? 0) || 0,
      members_count: Number(obj.membersCount ?? obj.members_count ?? 0) || 0,
      data: { ...obj, id },
      created_at: toIsoDate(obj.createdAt || obj.created_at || obj.timestamp),
    };
  }

  if (table === 'spends') {
    return {
      id,
      title: String(obj.title || obj.purpose || obj.category || 'Trust Expense'),
      category: String(obj.category || 'Welfare'),
      amount: Number(obj.amount ?? 0) || 0,
      spend_date: String(obj.spendDate || obj.spend_date || obj.date || ''),
      beneficiary: String(obj.beneficiary || obj.paidTo || obj.vendor || ''),
      receipt_url: String(obj.receiptUrl || obj.receipt_url || obj.imageUrl || obj.proofUrl || ''),
      description: String(obj.description || obj.notes || obj.remarks || ''),
      data: { ...obj, id },
      created_at: toIsoDate(obj.createdAt || obj.created_at),
    };
  }

  if (table === 'events') {
    return {
      id,
      title: String(obj.title || 'UCWF Event'),
      description: String(obj.description || ''),
      date: String(obj.date || obj.eventDate || ''),
      time: String(obj.time || ''),
      location: String(obj.location || obj.venue || ''),
      category: String(obj.category || 'Social Welfare'),
      image_url: String(obj.image_url || obj.imageUrl || obj.image || ''),
      status: String(obj.status || 'upcoming'),
      attendees_count: Number(obj.attendees_count ?? obj.attendeesCount ?? 0) || 0,
      funds_spent: Number(obj.funds_spent ?? obj.fundsSpent ?? obj.amountSpent ?? 0) || 0,
      data: { ...obj, id },
      created_at: toIsoDate(obj.createdAt || obj.created_at),
    };
  }

  if (table === 'media_approvals') {
    return {
      id,
      user_id: String(obj.userId || obj.user_id || obj.uid || ''),
      member_id: String(obj.memberId || obj.member_id || ''),
      member_name: String(obj.memberName || obj.member_name || obj.uploaderName || ''),
      title: String(obj.title || obj.caption || 'Media Upload'),
      description: String(obj.description || obj.caption || ''),
      media_url: String(obj.mediaUrl || obj.media_url || obj.url || obj.imageUrl || obj.videoUrl || ''),
      media_type: String(obj.mediaType || obj.media_type || obj.type || 'image'),
      category: String(obj.category || 'Event'),
      status: String(obj.status || 'pending'),
      data: { ...obj, id },
      created_at: toIsoDate(obj.createdAt || obj.created_at),
    };
  }

  if (table === 'media_gallery') {
    return {
      id,
      media_type: String(obj.media_type || obj.mediaType || obj.type || 'posters'),
      title: String(obj.title || obj.caption || ''),
      url: String(obj.url || obj.mediaUrl || obj.imageUrl || obj.videoUrl || ''),
      thumbnail_url: String(obj.thumbnailUrl || obj.thumbnail_url || obj.url || ''),
      data: { ...obj, id },
      created_at: toIsoDate(obj.createdAt || obj.created_at),
    };
  }

  if (table === 'certificates') {
    return {
      id,
      certificate_no: String(obj.certificate_no || obj.certificateNo || id),
      recipient_name: String(obj.recipient_name || obj.recipientName || obj.fullName || obj.name || ''),
      father_name: String(obj.father_name || obj.fatherName || obj.fatherOrSpouseName || ''),
      certificate_type: String(obj.certificate_type || obj.certificateType || 'Appreciation'),
      description: String(obj.description || ''),
      issue_date: String(obj.issue_date || obj.issueDate || new Date().toISOString().slice(0, 10)),
      issued_by: String(obj.issued_by || obj.issuedBy || 'Dr. Rajendra Singh Saini'),
      status: String(obj.status || 'active'),
      user_id: obj.user_id || obj.userId || obj.uid || null,
      data: { ...obj, id },
      created_at: toIsoDate(obj.createdAt || obj.created_at),
    };
  }

  if (table === 'settings') {
    return {
      id,
      key: id,
      value: obj,
      data: obj,
      updated_at: new Date().toISOString(),
    };
  }

  return {
    id,
    data: { ...obj, id },
    updated_at: new Date().toISOString(),
  };
}

function deserializeSupabaseRow(table, row) {
  if (!row || typeof row !== 'object') return null;
  const baseData = row.data && typeof row.data === 'object' ? { ...row.data } : {};
  const id = String(row.id || row.uid || baseData.uid || baseData.id || '');

  if (table === 'members') {
    const memberId = row.member_id || baseData.memberId || baseData.member_id || id;
    const fullName = row.full_name || row.name || baseData.fullName || baseData.name || 'Member';
    const phone = row.phone || row.mobile || baseData.phone || baseData.mobile || '';
    const sponsorId = row.sponsor_id || baseData.sponsorId || baseData.sponsor_id || '';
    const pkgAmount =
      Number(row.package_amount ?? baseData.packageAmount ?? baseData.donationAmount ?? 0) || 0;
    const status = row.status || baseData.status || 'active';

    return {
      ...baseData,
      ...row,
      id,
      uid: id,
      memberId,
      member_id: memberId,
      codeNo: baseData.codeNo || memberId,
      username: baseData.username || memberId,
      fullName,
      full_name: fullName,
      name: fullName,
      phone,
      mobile: phone,
      sponsorId,
      sponsor_id: sponsorId,
      sponsorCode: baseData.sponsorCode || sponsorId,
      packageAmount: pkgAmount,
      package_amount: pkgAmount,
      donationAmount: Number(baseData.donationAmount ?? pkgAmount) || pkgAmount,
      selfBusiness: Number(baseData.selfBusiness ?? pkgAmount) || pkgAmount,
      tierName: row.tier_name || baseData.tierName || 'Supporter',
      tier_name: row.tier_name || baseData.tier_name || 'Supporter',
      status,
      isApproved: status === 'active' || status === 'approved' || Boolean(baseData.isApproved),
      photoUrl: row.photo_url || baseData.photoUrl || baseData.passportPhotoUrl || '',
      photo_url: row.photo_url || baseData.photo_url || baseData.photoUrl || '',
      passportPhotoUrl: baseData.passportPhotoUrl || row.photo_url || baseData.photoUrl || '',
      paymentUtr: row.payment_utr || baseData.paymentUtr || '',
      payment_utr: row.payment_utr || baseData.payment_utr || '',
      paymentScreenshotUrl: row.payment_screenshot_url || baseData.paymentScreenshotUrl || '',
      payment_screenshot_url: row.payment_screenshot_url || baseData.payment_screenshot_url || '',
      is_admin: Boolean(row.is_admin ?? baseData.is_admin),
    };
  }

  if (table === 'settings') {
    if (row.value !== undefined && typeof row.value === 'object' && row.value !== null && 'val' in row.value && Object.keys(row.value).length === 1) {
      return row.value.val;
    }
    return row.data !== undefined ? row.data : row.value;
  }

  return {
    ...baseData,
    ...row,
    id,
  };
}

function applyRowToMemoryTree(table, row, eventType = 'UPSERT') {
  if (!row) return;
  const id = String(row.id || row.uid || '');
  if (!id) return;

  if (eventType === 'DELETE') {
    if (table === 'members') {
      if (dbTree.users) delete dbTree.users[id];
      if (dbTree.members) delete dbTree.members[id];
    } else if (table === 'payouts') {
      if (dbTree.payouts) delete dbTree.payouts[id];
      if (dbTree.payout_records) delete dbTree.payout_records[id];
      if (dbTree.payout_logs) delete dbTree.payout_logs[id];
    } else if (table === 'spends') {
      if (dbTree.spends) delete dbTree.spends[id];
      if (dbTree.expenses) delete dbTree.expenses[id];
    } else if (table === 'media_approvals') {
      if (dbTree.media_approvals) delete dbTree.media_approvals[id];
      if (dbTree.media_submissions) delete dbTree.media_submissions[id];
    } else if (table === 'media_gallery') {
      if (dbTree.media_gallery?.videos) delete dbTree.media_gallery.videos[id];
      if (dbTree.media_gallery?.posters) delete dbTree.media_gallery.posters[id];
    } else if (dbTree[table]) {
      delete dbTree[table][id];
    }
    return;
  }

  const item = deserializeSupabaseRow(table, row);
  if (table === 'members') {
    dbTree.users[id] = item;
    dbTree.members[id] = item;
  } else if (table === 'payouts') {
    dbTree.payouts[id] = item;
    dbTree.payout_records[id] = item;
    dbTree.payout_logs[id] = item;
  } else if (table === 'spends') {
    dbTree.spends[id] = item;
    dbTree.expenses[id] = item;
  } else if (table === 'media_approvals') {
    dbTree.media_approvals[id] = item;
    dbTree.media_submissions[id] = item;
  } else if (table === 'media_gallery') {
    const subType = item.media_type === 'videos' || item.type === 'video' ? 'videos' : 'posters';
    if (!dbTree.media_gallery[subType]) dbTree.media_gallery[subType] = {};
    dbTree.media_gallery[subType][id] = item;
  } else if (table === 'settings') {
    dbTree.settings[id] = item;
  } else {
    if (!dbTree[table]) dbTree[table] = {};
    dbTree[table][id] = item;
  }
}

// ============================================================================
// 4. CLOUD SYNC STATUS & INITIAL HYDRATION + REALTIME CHANNEL
// ============================================================================

let cloudSyncStatus = {
  state: 'connecting',
  mode: 'supabase_cloud',
  errorCode: null,
  errorMessage: null,
  projectId: 'duioltyrenrplqzijdsi',
  lastSyncedAt: null,
};

const syncStatusListeners = new Set();

function updateCloudSyncStatus(patch) {
  cloudSyncStatus = { ...cloudSyncStatus, ...patch };
  for (const cb of syncStatusListeners) {
    try {
      cb(cloudSyncStatus);
    } catch {
      // Ignore
    }
  }
}

export function getCloudSyncStatus() {
  return cloudSyncStatus;
}

export function onCloudSyncStatusChange(callback) {
  if (typeof callback !== 'function') return () => {};
  syncStatusListeners.add(callback);
  try {
    callback(cloudSyncStatus);
  } catch {
    // Ignore
  }
  return () => syncStatusListeners.delete(callback);
}

const SUPABASE_TABLES = [
  'members',
  'admins',
  'wallets',
  'payment_requests',
  'withdrawals',
  'transactions',
  'payouts',
  'daily_closings',
  'spends',
  'events',
  'media_approvals',
  'media_gallery',
  'certificates',
  'settings',
];

let missingTablesWarned = false;

async function pushRowToSupabase(collection, docId, data) {
  const table = COLLECTION_TO_TABLE[collection];
  if (!table || !docId) return;

  try {
    if (data === null || data === undefined) {
      const { error } = await supabase.from(table).delete().eq('id', String(docId));
      if (error && !String(error.message || '').includes('schema cache')) {
        console.warn(`Supabase delete on ${table}/${docId} warning:`, error.message);
      }
      return;
    }

    if (collection === 'settings') {
      const payload = {
        id: String(docId),
        key: String(docId),
        value: typeof data === 'object' && data !== null ? data : { val: data },
        data: typeof data === 'object' && data !== null ? data : { val: data },
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from('settings').upsert(payload, { onConflict: 'id' });
      if (error && !String(error.message || '').includes('schema cache')) {
        console.warn('Supabase settings upsert warning:', error.message);
      }
      return;
    }

    const row = serializeToSupabaseRow(table, docId, data);
    const { error } = await supabase.from(table).upsert(row, { onConflict: 'id' });
    if (error) {
      if (String(error.message || '').includes('schema cache')) {
        if (!missingTablesWarned) {
          missingTablesWarned = true;
          console.warn(
            'Supabase tables not created yet. Run supabase/schema.sql in Supabase SQL Editor to enable full PostgreSQL storage.'
          );
        }
      } else {
        console.warn(`Supabase upsert (${table}/${docId}) note:`, error.message);
      }
    } else {
      updateCloudSyncStatus({
        state: 'connected',
        mode: 'supabase_cloud',
        lastSyncedAt: Date.now(),
        errorMessage: null,
      });
    }
  } catch (err) {
    console.warn(`Supabase network write fallback (${table}/${docId}):`, err?.message || err);
  }
}

async function hydrateFromSupabaseCloud() {
  let tablesAvailable = 0;

  await Promise.all(
    SUPABASE_TABLES.map(async (table) => {
      try {
        const { data, error } = await supabase.from(table).select('*');
        if (error) {
          if (String(error.message || '').includes('schema cache')) {
            if (!missingTablesWarned) {
              missingTablesWarned = true;
              console.warn(
                'Supabase schema cache empty: Run supabase/schema.sql in Supabase SQL Editor.'
              );
            }
          }
          return;
        }
        tablesAvailable++;
        if (Array.isArray(data)) {
          for (const row of data) {
            applyRowToMemoryTree(table, row, 'UPSERT');
          }
        }
      } catch {
        // Ignore individual table network error
      }
    })
  );

  ensureRootCollections();

  // If members table exists in Supabase, push any locally cached members that aren't in Supabase yet
  if (tablesAvailable > 0) {
    updateCloudSyncStatus({
      state: 'connected',
      mode: 'supabase_cloud',
      lastSyncedAt: Date.now(),
      errorMessage: null,
    });
    const localMembers = Object.entries(dbTree.users || {});
    for (const [uid, memberObj] of localMembers) {
      if (uid && memberObj && typeof memberObj === 'object') {
        pushRowToSupabase('members', uid, memberObj);
      }
    }
  } else {
    updateCloudSyncStatus({
      state: 'local_fallback',
      mode: 'local_cache',
      errorMessage: 'Run supabase/schema.sql in Supabase SQL Editor to initialize tables',
    });
  }

  saveToLocalCache(false);
  notifyAllListeners();
}

let realtimeChannel = null;
function setupSupabaseRealtimeSubscription() {
  if (realtimeChannel) return;
  try {
    realtimeChannel = supabase
      .channel('ucwf-postgres-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public' },
        (payload) => {
          const table = payload?.table;
          const eventType = payload?.eventType;
          if (!table) return;

          if (eventType === 'DELETE') {
            applyRowToMemoryTree(table, payload.old, 'DELETE');
          } else if (payload.new) {
            applyRowToMemoryTree(table, payload.new, 'UPSERT');
          }

          ensureRootCollections();
          saveToLocalCache(false);
          notifyAllListeners();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          updateCloudSyncStatus({
            state: 'connected',
            mode: 'supabase_cloud',
            lastSyncedAt: Date.now(),
          });
        }
      });
  } catch (err) {
    console.warn('Supabase Realtime subscription warning:', err?.message || err);
  }
}

let adapterReadyResolved = false;
const adapterReadyPromise = (async () => {
  try {
    const idbTree = await readTreeFromIndexedDB();
    if (idbTree && typeof idbTree === 'object') {
      for (const [k, v] of Object.entries(idbTree)) {
        if (v && typeof v === 'object') {
          dbTree[k] = { ...(dbTree[k] || {}), ...v };
        }
      }
      ensureRootCollections();
      notifyAllListeners();
    }
  } catch {
    // Ignore IDB read error
  }

  // Trigger non-blocking Supabase Cloud hydration & Realtime channel
  hydrateFromSupabaseCloud();
  setupSupabaseRealtimeSubscription();
  adapterReadyResolved = true;
})();

export function whenAdapterReady() {
  if (adapterReadyResolved) return Promise.resolve();
  return adapterReadyPromise;
}

export async function retryCloudFirestoreSync() {
  await hydrateFromSupabaseCloud();
  return getCloudSyncStatus();
}

// ============================================================================
// 5. REACTIVE PATH HELPERS (ref, get, set, update, push, remove, onValue, etc.)
// ============================================================================

function normalizePath(pathStr) {
  if (!pathStr || typeof pathStr !== 'string') return '';
  return pathStr
    .trim()
    .replace(/^\/+|\/+$/g, '')
    .replace(/\/+/g, '/');
}

function getValueAtPath(pathStr) {
  const clean = normalizePath(pathStr);
  if (!clean) return dbTree;
  const parts = clean.split('/');
  // Map root 'members' and 'users' interchangeably
  let curr = dbTree;
  for (let i = 0; i < parts.length; i++) {
    if (curr === null || curr === undefined || typeof curr !== 'object') return null;
    curr = curr[parts[i]];
  }
  return curr === undefined ? null : curr;
}

function setValueAtPath(pathStr, value, syncToCloud = true) {
  const clean = normalizePath(pathStr);
  if (!clean) {
    if (value && typeof value === 'object') {
      dbTree = value;
      ensureRootCollections();
    }
    return;
  }

  const parts = clean.split('/');
  const rootCol = parts[0];

  if (parts.length === 1) {
    dbTree[rootCol] = value === null ? {} : value;
    if (rootCol === 'users' || rootCol === 'members') {
      const mirrored = value === null ? {} : { ...value };
      dbTree.users = mirrored;
      dbTree.members = { ...mirrored };
    }
    if (syncToCloud && value && typeof value === 'object') {
      for (const [docId, docVal] of Object.entries(value)) {
        pushRowToSupabase(rootCol, docId, docVal);
      }
    }
    return;
  }

  let curr = dbTree;
  for (let i = 0; i < parts.length - 1; i++) {
    const seg = parts[i];
    if (!curr[seg] || typeof curr[seg] !== 'object') {
      curr[seg] = {};
    }
    curr = curr[seg];
  }

  const lastKey = parts[parts.length - 1];
  if (value === null || value === undefined) {
    delete curr[lastKey];
  } else {
    curr[lastKey] = value;
  }

  // Keep 'users' and 'members' in 100% sync
  const docId = parts[1];
  if (rootCol === 'users' && docId) {
    if (dbTree.users[docId] === undefined) {
      delete dbTree.members[docId];
    } else {
      dbTree.members[docId] = JSON.parse(JSON.stringify(dbTree.users[docId]));
    }
  } else if (rootCol === 'members' && docId) {
    if (dbTree.members[docId] === undefined) {
      delete dbTree.users[docId];
    } else {
      dbTree.users[docId] = JSON.parse(JSON.stringify(dbTree.members[docId]));
    }
  }

  if (syncToCloud && docId) {
    if (rootCol === 'media_gallery' && parts[2]) {
      const subType = parts[1]; // 'videos' or 'posters'
      const mediaId = parts[2];
      const mediaObj = dbTree.media_gallery?.[subType]?.[mediaId];
      pushRowToSupabase('media_gallery', mediaId, mediaObj ? { ...mediaObj, media_type: subType } : null);
    } else {
      const topDoc = dbTree[rootCol]?.[docId];
      pushRowToSupabase(rootCol, docId, topDoc ?? null);
    }
  }
}

class DataSnapshot {
  constructor(pathStr, val, keyOverride = null) {
    this._path = normalizePath(pathStr);
    this._val = val === undefined ? null : JSON.parse(JSON.stringify(val));
    const parts = this._path ? this._path.split('/') : [];
    this.key = keyOverride || (parts.length > 0 ? parts[parts.length - 1] : null);
  }

  exists() {
    return this._val !== null && this._val !== undefined;
  }

  val() {
    return this._val;
  }

  forEach(cb) {
    if (!this._val || typeof this._val !== 'object') return false;
    for (const [k, v] of Object.entries(this._val)) {
      const childPath = this._path ? `${this._path}/${k}` : k;
      const stop = cb(new DataSnapshot(childPath, v, k));
      if (stop === true) return true;
    }
    return false;
  }
}

const activeListeners = new Set();

function evaluateQuerySnapshot(refOrQuery) {
  const pathStr = refOrQuery?._path || '';
  const rawVal = getValueAtPath(pathStr);

  if (refOrQuery?._isQuery && rawVal && typeof rawVal === 'object') {
    const filtered = {};
    for (const [k, v] of Object.entries(rawVal)) {
      if (!v || typeof v !== 'object') continue;
      let match = true;
      for (const c of refOrQuery._constraints || []) {
        if (c.type === 'equalTo' && refOrQuery._orderByField) {
          const fieldVal = v[refOrQuery._orderByField];
          if (String(fieldVal ?? '').toLowerCase() !== String(c.value ?? '').toLowerCase()) {
            match = false;
          }
        }
      }
      if (match) filtered[k] = v;
    }
    return new DataSnapshot(pathStr, Object.keys(filtered).length > 0 ? filtered : null);
  }

  return new DataSnapshot(pathStr, rawVal);
}

function notifyAllListeners() {
  for (const entry of activeListeners) {
    try {
      const snap = evaluateQuerySnapshot(entry.refOrQuery);
      entry.callback(snap);
    } catch (err) {
      console.warn('Realtime listener callback error:', err);
    }
  }
}

export const db = { _type: 'supabase_realtime_db', projectId: 'duioltyrenrplqzijdsi' };
export const rtdb = db;

export function getDatabase() {
  return db;
}

export function ref(dbInstanceOrPath, optionalPath) {
  const pathStr =
    typeof dbInstanceOrPath === 'string' ? dbInstanceOrPath : optionalPath || '';
  const clean = normalizePath(pathStr);
  const parts = clean ? clean.split('/') : [];
  return {
    _type: 'db_ref',
    _path: clean,
    key: parts.length > 0 ? parts[parts.length - 1] : null,
    toString: () => `${supabaseUrl}/${clean}`,
  };
}

export function child(parentRef, childPath) {
  const base = parentRef?._path || '';
  const combined = base ? `${base}/${normalizePath(childPath)}` : normalizePath(childPath);
  return ref(db, combined);
}

export async function get(refOrQuery) {
  await whenAdapterReady();
  return evaluateQuerySnapshot(refOrQuery);
}

export async function set(targetRef, value) {
  const pathStr = typeof targetRef === 'string' ? targetRef : targetRef?._path || '';
  setValueAtPath(pathStr, value, true);
  saveToLocalCache(true);
  notifyAllListeners();
}

export async function update(targetRef, updatesObj) {
  if (!updatesObj || typeof updatesObj !== 'object') return;
  const basePath = typeof targetRef === 'string' ? targetRef : targetRef?._path || '';
  const cleanBase = normalizePath(basePath);

  for (const [relKey, val] of Object.entries(updatesObj)) {
    const cleanRel = normalizePath(relKey);
    const fullPath = cleanBase ? (cleanRel ? `${cleanBase}/${cleanRel}` : cleanBase) : cleanRel;
    setValueAtPath(fullPath, val, true);
  }

  saveToLocalCache(true);
  notifyAllListeners();
}

export function push(targetRef, optionalValue) {
  const basePath = typeof targetRef === 'string' ? targetRef : targetRef?._path || '';
  const cleanBase = normalizePath(basePath);
  const newKey = `id_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const fullPath = cleanBase ? `${cleanBase}/${newKey}` : newKey;
  const pushedRef = ref(db, fullPath);

  if (optionalValue !== undefined) {
    setValueAtPath(fullPath, optionalValue, true);
    saveToLocalCache(true);
    notifyAllListeners();
    const p = Promise.resolve(pushedRef);
    p.key = newKey;
    p._path = fullPath;
    return p;
  }

  return pushedRef;
}

export async function remove(targetRef) {
  const pathStr = typeof targetRef === 'string' ? targetRef : targetRef?._path || '';
  setValueAtPath(pathStr, null, true);
  saveToLocalCache(true);
  notifyAllListeners();
}

export function onValue(refOrQuery, callback, errorCallback) {
  if (typeof callback !== 'function') return () => {};
  const entry = { refOrQuery, callback, errorCallback };
  activeListeners.add(entry);

  try {
    const initialSnap = evaluateQuerySnapshot(refOrQuery);
    callback(initialSnap);
  } catch (err) {
    if (typeof errorCallback === 'function') errorCallback(err);
  }

  return () => {
    activeListeners.delete(entry);
  };
}

export function off(refOrQuery, eventTypeOrCallback, optionalCallback) {
  const cbToMatch =
    typeof eventTypeOrCallback === 'function' ? eventTypeOrCallback : optionalCallback;
  const targetPath = refOrQuery?._path;

  for (const entry of Array.from(activeListeners)) {
    const pathMatches = !targetPath || entry.refOrQuery?._path === targetPath;
    const cbMatches = !cbToMatch || entry.callback === cbToMatch;
    if (pathMatches && cbMatches) {
      activeListeners.delete(entry);
    }
  }
}

export function orderByChild(field) {
  return { type: 'orderByChild', field };
}

export function equalTo(value) {
  return { type: 'equalTo', value };
}

export function query(baseRef, ...constraints) {
  let orderByField = null;
  for (const c of constraints) {
    if (c && c.type === 'orderByChild') {
      orderByField = c.field;
    }
  }
  return {
    ...baseRef,
    _isQuery: true,
    _orderByField: orderByField,
    _constraints: constraints.filter(Boolean),
  };
}

export function serverTimestamp() {
  return Date.now();
}

export async function resetAllCloudCollections(preserveSettings = {}) {
  for (const table of SUPABASE_TABLES) {
    if (table === 'admins' || table === 'settings') continue;
    try {
      await supabase.from(table).delete().neq('id', '__keep_none__');
    } catch {
      // Ignore if table not created yet
    }
  }
  dbTree = createEmptyTree();
  if (preserveSettings && typeof preserveSettings === 'object') {
    dbTree.settings = { ...dbTree.settings, ...preserveSettings };
  }
  ensureRootCollections();
  await pushRowToSupabase('members', DEFAULT_ROOT_SPONSOR.uid, DEFAULT_ROOT_SPONSOR);
  saveToLocalCache(true);
  notifyAllListeners();
}

export default supabase;
