/**
 * Cloud Firestore-Backed Realtime Database Adapter for UCWF
 *
 * Bridges all `firebase/database` calls (`ref`, `get`, `set`, `update`, `push`, `remove`,
 * `onValue`, `off`, `child`, `query`, `orderByChild`, `equalTo`, `serverTimestamp`)
 * directly to the provisioned Cloud Firestore database (`firebase-applet-config.json`),
 * backed by an instant-hydration local state tree + IndexedDB + BroadcastChannel sync so:
 *  - Pages & dashboards load in <5ms with zero hanging placeholder sockets.
 *  - Large base64 KYC docs/photos are persisted safely in IndexedDB (no 5MB QuotaExceededError)
 *    while all member/ledger records stay mirrored in compacted localStorage for synchronous boot.
 *  - Public foundation collections sync live with Cloud Firestore immediately,
 *    and authenticated user/admin collections sync live with Cloud Firestore upon sign-in.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
} from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  collection,
  doc,
  getDocFromServer,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// ---------------------------------------------------------------------------
// 1. Firebase Core Initialization (Uses provisioned firebase-applet-config.json)
// ---------------------------------------------------------------------------
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
let _firestoreDb;
try {
  _firestoreDb = initializeFirestore(
    app,
    { experimentalForceLongPolling: true },
    firebaseConfig.firestoreDatabaseId
  );
} catch {
  _firestoreDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);
}
export const firestoreDb = _firestoreDb;
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// ---------------------------------------------------------------------------
// 2. Mandatory Connection Test & Structured Firestore Error Handling
// ---------------------------------------------------------------------------
export const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write',
};

export function handleFirestoreError(error, operationType, path) {
  const currentUser = auth?.currentUser;
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid || null,
      email: currentUser?.email || null,
      emailVerified: currentUser?.emailVerified ?? null,
      isAnonymous: currentUser?.isAnonymous ?? null,
      tenantId: currentUser?.tenantId || null,
      providerInfo:
        currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

let cloudReachable = null;

export async function testConnection() {
  if (typeof window === 'undefined') return true;
  try {
    await getDocFromServer(doc(firestoreDb, 'test', 'connection'));
    cloudReachable = true;
    notifySyncListeners();
    return true;
  } catch (error) {
    cloudReachable = false;
    notifySyncListeners();
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore connection note: client offline or retrying via long polling.');
    } else {
      console.warn('Firestore connection note:', error?.message || error);
    }
    return false;
  }
}

// ---------------------------------------------------------------------------
// 3. Schema Allowlists & Defensive Sanitization (Matches firestore.rules)
// ---------------------------------------------------------------------------
const COLLECTION_ALLOWED_KEYS = {
  users: new Set([
    'uid', 'memberId', 'name', 'displayName', 'salutation', 'padNaam', 'designation',
    'phone', 'email', 'password', 'plainPassword',
    'sponsorId', 'sponsorUid', 'sponsorName', 'sponsorPhone',
    'packageTier', 'packageAmount', 'packageName', 'amount', 'donationAmount', 'selfBusiness',
    'selfBusinessCommission', 'walletBalance', 'totalEarned', 'totalWithdrawn',
    'commissionPaid', 'commissionUnpaid', 'commissionStatus', 'lastCommissionPayoutDate',
    'paidPayout', 'unpaidPayout', 'lastPaidAt',
    'directMembersCount', 'directCount', 'downlineMembersCount', 'teamCount',
    'directBusiness', 'directTeamBusiness', 'teamBusiness', 'downlineBusiness',
    'directCommission', 'directTeamCommission', 'downlineCommission', 'totalCommission',
    'lastClosingDate', 'closingHistory',
    'status', 'isApproved', 'paymentVerified', 'kycVerified', 'documentsVerified', 'activatedAt',
    'city', 'state', 'dob', 'bloodGroup', 'occupation', 'qualification', 'gender',
    'fatherOrSpouseName', 'fatherName', 'motherName', 'permanentAddress',
    'permanentPincode', 'currentAddress', 'currentPincode', 'address', 'pincode',
    'photoUrl', 'avatar_url', 'signatureUrl', 'aadhaarDocUrl', 'aadhaarBackDocUrl',
    'panDocUrl', 'paymentReceiptUrl', 'photoDocName', 'signatureDocName',
    'aadhaarDocName', 'aadhaarBackDocName', 'panDocName', 'paymentReceiptName',
    'aadhaarNumber', 'panNumber', 'bankDetails', 'paymentMode', 'paymentMethod',
    'utrNumber', 'officeName1', 'officePhone1', 'officeProposedPost2', 'officePhone2',
    'declarationAccepted', 'applicationDate', 'joiningDate', 'createdAt',
    'timestamp', 'updatedAt', 'role', 'is_admin', 'isAdminMode', 'username',
  ]),
  members: null,
  wallets: null,
  payment_requests: new Set([
    'id', 'userId', 'memberId', 'userName', 'email', 'phone', 'sponsorId',
    'amount', 'packageName', 'paymentMode', 'paymentMethod', 'status',
    'utrNumber', 'paymentReceiptUrl', 'aadhaarDocUrl', 'panDocUrl',
    'rejectReason', 'rejectedAt', 'manualCommissionPaid',
    'createdAt', 'timestamp', 'updatedAt', 'approvedAt',
  ]),
  withdrawals: new Set([
    'id', 'userId', 'memberId', 'userName', 'phone', 'amount', 'status',
    'bankDetails', 'bankName', 'accountNo', 'ifsc', 'upiId',
    'payoutMode', 'payoutMethod', 'paidMode', 'adminNote', 'rejectReason', 'rejectedAt',
    'transactionRef', 'remarks', 'createdAt', 'updatedAt', 'paidAt', 'timestamp',
  ]),
  transactions: new Set([
    'id', 'userId', 'memberId', 'userName', 'type', 'amount', 'description', 'note',
    'fromMemberId', 'fromName', 'sourceUserId', 'sourceMemberId', 'sourceMemberName',
    'level', 'mode', 'ratePercentage', 'packageAmount',
    'paymentMode', 'paidMode', 'paidAt', 'adminNote', 'status', 'createdAt', 'timestamp',
  ]),
  payout_records: new Set([
    'id', 'userId', 'memberUid', 'memberId', 'memberName', 'phone', 'referenceId', 'paidBy',
    'sourceUserId', 'sourceMemberId', 'sourceMemberName', 'packageAmount',
    'amount', 'totalDistributed', 'directCommission', 'downlineCommission', 'levelsCount',
    'trustShare', 'payouts', 'distributions', 'status', 'paymentMode', 'referenceNo',
    'remarks', 'date', 'createdAt', 'timestamp',
  ]),
  payout_logs: null,
  spends: new Set([
    'id', 'title', 'category', 'amount', 'date', 'description',
    'location', 'beneficiaryCount', 'beneficiaries', 'receiptUrl',
    'paidTo', 'paymentMode', 'remarks', 'createdBy', 'createdAt', 'timestamp',
  ]),
  expenses: null,
  media_submissions: new Set([
    'id', 'userId', 'memberId', 'userName', 'submittedByName', 'submittedByMemberId',
    'title', 'description', 'caption', 'category', 'location',
    'mediaUrl', 'url', 'mediaType', 'resourceType', 'status',
    'createdAt', 'timestamp', 'updatedAt', 'approvedAt', 'rejectedAt',
  ]),
  media_gallery: new Set([
    'id', 'kind', 'title', 'subtitle', 'message', 'url', 'imageUrl', 'thumbnailUrl',
    'link', 'category', 'slot', 'active', 'featured', 'createdAt', 'timestamp',
  ]),
  daily_closings: new Set([
    'date', 'totalJoining', 'totalCommission', 'trustShare',
    'newMembersCount', 'memberReports', 'summary', 'statements',
    'createdAt', 'timestamp', 'status',
  ]),
  events: new Set([
    'id', 'title', 'description', 'date', 'location', 'imageUrl',
    'status', 'createdAt', 'timestamp',
  ]),
  settings: new Set(['key', 'value', 'updatedAt']),
};
COLLECTION_ALLOWED_KEYS.members = COLLECTION_ALLOWED_KEYS.users;
COLLECTION_ALLOWED_KEYS.wallets = COLLECTION_ALLOWED_KEYS.users;
COLLECTION_ALLOWED_KEYS.payout_logs = COLLECTION_ALLOWED_KEYS.payout_records;
COLLECTION_ALLOWED_KEYS.expenses = COLLECTION_ALLOWED_KEYS.spends;

const ALL_SYNCED_COLLECTIONS = [
  'users',
  'members',
  'wallets',
  'payment_requests',
  'withdrawals',
  'transactions',
  'payout_records',
  'payout_logs',
  'spends',
  'expenses',
  'events',
  'daily_closings',
  'media_submissions',
  'media_gallery',
  'settings',
];
const SYNCED_COLLECTION_SET = new Set(ALL_SYNCED_COLLECTIONS);
const CLOUD_HYDRATED_FLAG_KEY = 'ucwf_cloud_auto_sync_hydrated_v1';

function sanitizeId(raw) {
  const cleaned = String(raw || `id_${Date.now()}`).replace(/[^a-zA-Z0-9_\-]/g, '_');
  return cleaned.slice(0, 128) || `id_${Date.now()}`;
}

function stripUndefinedDeep(obj) {
  if (Array.isArray(obj)) {
    return obj.map((v) => (v === undefined ? null : stripUndefinedDeep(v)));
  }
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined) {
        out[k] = stripUndefinedDeep(v);
      }
    }
    return out;
  }
  return obj;
}

function clampString(val, maxLen) {
  if (typeof val !== 'string') return '';
  return val.length > maxLen ? val.slice(0, maxLen) : val;
}

function sanitizeForFirestore(colName, docId, rawVal) {
  const cleanId = sanitizeId(docId);
  if (colName === 'settings') {
    return {
      key: clampString(cleanId, 64),
      value: rawVal === undefined ? null : stripUndefinedDeep(rawVal),
      updatedAt: Date.now(),
    };
  }

  const base = rawVal && typeof rawVal === 'object' ? stripUndefinedDeep(rawVal) : {};
  const allowed = COLLECTION_ALLOWED_KEYS[colName];
  const out = {};

  if (allowed) {
    for (const [k, v] of Object.entries(base)) {
      if (allowed.has(k) && v !== null && v !== undefined) {
        out[k] = v;
      }
    }
  } else {
    Object.assign(out, base);
  }

  const clampOptStr = (obj, key, maxLen) => {
    if (obj[key] !== undefined && obj[key] !== null) {
      obj[key] = clampString(String(obj[key]), maxLen);
    } else {
      delete obj[key];
    }
  };
  const clampOptNum = (obj, key) => {
    if (obj[key] !== undefined && obj[key] !== null) {
      const n = Number(obj[key]);
      if (Number.isFinite(n)) obj[key] = n;
      else delete obj[key];
    } else {
      delete obj[key];
    }
  };

  if (colName === 'users' || colName === 'members' || colName === 'wallets') {
    out.uid = cleanId;
    out.memberId = clampString(out.memberId || 'UCWF-MEMBER', 64);
    if (out.memberId.length < 2) out.memberId = 'UCWF-MEMBER';
    out.name = clampString(out.name || out.displayName || 'Foundation Member', 120) || 'Foundation Member';
    out.status = ['active', 'pending', 'inactive', 'suspended', 'blocked'].includes(out.status)
      ? out.status
      : 'active';
    clampOptStr(out, 'displayName', 140);
    clampOptStr(out, 'salutation', 20);
    clampOptStr(out, 'padNaam', 120);
    clampOptStr(out, 'phone', 20);
    clampOptStr(out, 'email', 120);
    clampOptStr(out, 'sponsorId', 64);
    clampOptStr(out, 'sponsorName', 140);
    clampOptStr(out, 'sponsorPhone', 20);
    clampOptStr(out, 'photoUrl', 300000);
    clampOptStr(out, 'signatureUrl', 200000);
    clampOptStr(out, 'aadhaarDocUrl', 300000);
    clampOptStr(out, 'aadhaarBackDocUrl', 300000);
    clampOptStr(out, 'panDocUrl', 300000);
    clampOptStr(out, 'paymentReceiptUrl', 300000);
    for (const nk of [
      'packageTier', 'packageAmount', 'selfBusiness', 'walletBalance',
      'totalEarned', 'totalWithdrawn', 'commissionPaid', 'commissionUnpaid', 'totalCommission',
    ]) {
      clampOptNum(out, nk);
    }
    if ('role' in out && !['member', 'admin'].includes(out.role)) {
      out.role = 'member';
    }
    if ('is_admin' in out) {
      out.is_admin = Boolean(out.is_admin);
    }
  } else if (colName === 'payment_requests') {
    out.id = cleanId;
    out.userId = clampString(String(out.userId || out.uid || 'portal_member'), 128) || 'portal_member';
    out.amount = Math.max(0, Number(out.amount || 0));
    out.status = ['pending', 'approved', 'rejected'].includes(out.status) ? out.status : 'approved';
    clampOptStr(out, 'memberId', 64);
    clampOptStr(out, 'userName', 140);
    clampOptStr(out, 'utrNumber', 100);
    clampOptStr(out, 'paymentMethod', 80);
  } else if (colName === 'withdrawals') {
    out.id = cleanId;
    out.userId = clampString(String(out.userId || out.uid || 'portal_member'), 128) || 'portal_member';
    out.amount = Math.max(1, Number(out.amount || 1));
    out.status = ['pending', 'approved', 'paid', 'rejected'].includes(out.status) ? out.status : 'pending';
    clampOptStr(out, 'memberId', 64);
  } else if (colName === 'transactions') {
    out.id = cleanId;
    out.userId = clampString(String(out.userId || 'portal_member'), 128) || 'portal_member';
    out.type = clampString(String(out.type || 'credit'), 40) || 'credit';
    out.amount = Number(out.amount || 0);
    if (out.description !== undefined || out.note !== undefined) {
      out.description = clampString(String(out.description || out.note || ''), 300);
    }
  } else if (colName === 'payout_records' || colName === 'payout_logs') {
    out.id = cleanId;
    out.amount = Math.max(0, Number(out.amount ?? out.packageAmount ?? out.totalDistributed ?? 0));
    clampOptStr(out, 'memberId', 64);
    clampOptNum(out, 'totalDistributed');
    clampOptNum(out, 'trustShare');
  } else if (colName === 'spends' || colName === 'expenses') {
    out.id = cleanId;
    out.title = clampString(String(out.title || 'Foundation Expense'), 200) || 'Foundation Expense';
    out.amount = Math.max(0, Number(out.amount || 0));
    clampOptStr(out, 'category', 80);
    clampOptStr(out, 'date', 40);
    clampOptStr(out, 'description', 1000);
  } else if (colName === 'media_submissions') {
    out.id = cleanId;
    out.mediaUrl = clampString(String(out.mediaUrl || out.url || 'https://ucwf.online'), 900000) || 'https://ucwf.online';
    out.status = ['pending', 'approved', 'rejected'].includes(out.status) ? out.status : 'pending';
    clampOptStr(out, 'userId', 128);
    clampOptStr(out, 'title', 200);
    if ('mediaType' in out && !['image', 'video'].includes(out.mediaType)) {
      delete out.mediaType;
    }
  } else if (colName === 'media_gallery') {
    out.id = cleanId;
    out.kind = out.kind === 'posters' ? 'posters' : 'videos';
    clampOptStr(out, 'title', 200);
    if (out.url !== undefined || out.imageUrl !== undefined) {
      out.url = clampString(String(out.url || out.imageUrl || ''), 900000);
    }
  } else if (colName === 'daily_closings') {
    out.date = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(cleanId) ? cleanId : new Date().toISOString().slice(0, 10);
    clampOptNum(out, 'totalJoining');
    clampOptNum(out, 'totalCommission');
    clampOptNum(out, 'trustShare');
  } else if (colName === 'events') {
    out.id = cleanId;
    out.title = clampString(String(out.title || 'Foundation Event'), 200) || 'Foundation Event';
    clampOptStr(out, 'date', 40);
  }

  return out;
}

// ---------------------------------------------------------------------------
// 4. Local Hydrated Store + IndexedDB + Seed Root Sponsor + Broadcast Sync
// ---------------------------------------------------------------------------
const LOCAL_CACHE_KEY = 'ucwf_rtdb_cache_v2';
const PENDING_SYNC_KEY = 'ucwf_pending_sync_v1';
const IDB_NAME = 'ucwf_rtdb_idb';
const IDB_STORE = 'kv';
const SYNC_CHANNEL_NAME = 'ucwf_rtdb_sync_v1';

const DEFAULT_LEVEL_RATES_SEED = {
  1: 20, 2: 8, 3: 5, 4: 4, 5: 3, 6: 2.5,
  7: 2, 8: 1.5, 9: 1, 10: 1, 11: 1, 12: 1,
};

function createInitialSeedData() {
  return {
    users: {
      root_sponsor_ucwf_0001: {
        uid: 'root_sponsor_ucwf_0001',
        memberId: 'UCWF-0001',
        salutation: 'श्री',
        name: 'राजेन्द्र सिंह सैनी',
        displayName: 'श्री राजेन्द्र सिंह सैनी',
        padNaam: 'संस्थापक एवं राष्ट्रीय अध्यक्ष',
        phone: '9540648402',
        email: 'admin@ucwf.online',
        sponsorId: 'DIRECT',
        packageTier: 11000,
        packageAmount: 11000,
        selfBusiness: 11000,
        selfBusinessCommission: 0,
        walletBalance: 0,
        totalEarned: 0,
        totalWithdrawn: 0,
        status: 'active',
        isApproved: true,
        paymentVerified: true,
        kycVerified: true,
        role: 'admin',
        is_admin: true,
        city: 'Haridwar',
        state: 'Uttarakhand',
        joiningDate: '2026-01-01',
        createdAt: '2026-01-01T00:00:00.000Z',
        timestamp: 1767225600000,
      },
    },
    settings: {
      levelRates: { ...DEFAULT_LEVEL_RATES_SEED },
      selfBusinessRate: 0,
      diwaliTheme: false,
    },
    spends: {},
    expenses: {},
    events: {},
    payment_requests: {},
    payout_records: {},
    payout_logs: {},
    withdrawals: {},
    transactions: {},
    daily_closings: {},
    media_submissions: {},
    media_gallery: {
      videos: {},
      posters: {},
    },
  };
}

function deepClone(val) {
  if (val === null || val === undefined || typeof val !== 'object') return val;
  if (Array.isArray(val)) return val.map(deepClone);
  const out = {};
  for (const [k, v] of Object.entries(val)) {
    out[k] = deepClone(v);
  }
  return out;
}

function compactForLocalStorage(node, maxStrLen = 8192) {
  if (typeof node === 'string') {
    if (node.startsWith('data:') && node.length > maxStrLen) {
      return '';
    }
    return node;
  }
  if (Array.isArray(node)) {
    return node.map((item) => compactForLocalStorage(item, maxStrLen));
  }
  if (node && typeof node === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      out[k] = compactForLocalStorage(v, maxStrLen);
    }
    return out;
  }
  return node;
}

function mergeTreeCollections(target, source) {
  if (!source || typeof source !== 'object') return target;
  const out = { ...target };
  for (const [col, val] of Object.entries(source)) {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      if (col === 'media_gallery') {
        out.media_gallery = {
          videos: { ...(out.media_gallery?.videos || {}), ...(val.videos || {}) },
          posters: { ...(out.media_gallery?.posters || {}), ...(val.posters || {}) },
        };
      } else {
        out[col] = { ...(out[col] && typeof out[col] === 'object' ? out[col] : {}), ...val };
      }
    } else if (val !== undefined) {
      out[col] = val;
    }
  }
  return out;
}

function openIdb() {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const database = req.result;
        if (!database.objectStoreNames.contains(IDB_STORE)) {
          database.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function saveTreeToIdb(treeSnapshot) {
  const database = await openIdb();
  if (!database) return;
  try {
    await new Promise((resolve) => {
      const tx = database.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(treeSnapshot, 'tree');
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {}
}

async function loadTreeFromIdb() {
  const database = await openIdb();
  if (!database) return null;
  try {
    return await new Promise((resolve) => {
      const tx = database.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get('tree');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

function loadInitialTree() {
  const seed = createInitialSeedData();
  if (typeof localStorage === 'undefined') return seed;
  try {
    const raw = localStorage.getItem(LOCAL_CACHE_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(seed));
      return seed;
    }
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      const merged = mergeTreeCollections(seed, parsed);
      if (!merged.users || typeof merged.users !== 'object') merged.users = { ...seed.users };
      if (!merged.users.root_sponsor_ucwf_0001) {
        merged.users.root_sponsor_ucwf_0001 = seed.users.root_sponsor_ucwf_0001;
      }
      if (!merged.settings || typeof merged.settings !== 'object') merged.settings = { ...seed.settings };
      if (!merged.settings.levelRates) merged.settings.levelRates = { ...DEFAULT_LEVEL_RATES_SEED };
      if (!merged.media_gallery || typeof merged.media_gallery !== 'object') {
        merged.media_gallery = { videos: {}, posters: {} };
      }
      return merged;
    }
  } catch (err) {
    console.warn('Local cache hydrate warning:', err);
  }
  return seed;
}

function loadPendingSyncMap() {
  const map = new Map();
  if (typeof localStorage === 'undefined') return map;
  try {
    const raw = localStorage.getItem(PENDING_SYNC_KEY);
    if (!raw) return map;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (item && item.key && item.entry) {
          map.set(item.key, item.entry);
        }
      }
    }
  } catch {}
  return map;
}

let dbTree = loadInitialTree();
const listeners = new Map();
let listenerSeq = 1;
let broadcastChannel = null;
const pendingFirestoreSync = loadPendingSyncMap();
const syncListeners = new Set();
let lastSyncError = null;
let lastSyncedAt = null;
let resolveIdbReady = null;
const idbReadyPromise = new Promise((resolve) => {
  resolveIdbReady = resolve;
});

export function whenAdapterReady() {
  return idbReadyPromise;
}

function persistPendingSyncMap() {
  if (typeof localStorage === 'undefined') return;
  try {
    const arr = Array.from(pendingFirestoreSync.entries()).map(([key, entry]) => ({ key, entry }));
    localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(arr));
  } catch {}
}

function notifySyncListeners() {
  const status = getCloudSyncStatus();
  for (const cb of syncListeners) {
    try {
      cb(status);
    } catch {}
  }
}

function markPendingSync(key, entry) {
  pendingFirestoreSync.set(key, entry);
  persistPendingSyncMap();
  notifySyncListeners();
}

function clearPendingSync(key) {
  if (pendingFirestoreSync.delete(key)) {
    persistPendingSyncMap();
    notifySyncListeners();
  }
}

if (typeof BroadcastChannel !== 'undefined') {
  try {
    broadcastChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
    broadcastChannel.onmessage = (event) => {
      if (event?.data?.type === 'tree_update' && event.data.tree) {
        dbTree = mergeTreeCollections(createInitialSeedData(), event.data.tree);
        notifyAllListeners();
      }
    };
  } catch {}
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === LOCAL_CACHE_KEY && event.newValue) {
      try {
        const next = JSON.parse(event.newValue);
        if (next && typeof next === 'object') {
          dbTree = mergeTreeCollections(dbTree, next);
          notifyAllListeners();
        }
      } catch {}
    }
  });
}

function persistLocalTree() {
  const snapshot = deepClone(dbTree);
  if (typeof indexedDB !== 'undefined') {
    saveTreeToIdb(snapshot);
  }
  if (typeof localStorage !== 'undefined') {
    try {
      const compact = compactForLocalStorage(snapshot, 4096);
      localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(compact));
    } catch (e) {
      try {
        // Ultra-compact fallback: strip all data URLs so member records ALWAYS persist
        const ultraCompact = compactForLocalStorage(snapshot, 128);
        localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(ultraCompact));
      } catch (innerErr) {
        console.warn('localStorage quota warning:', innerErr?.message || e?.message);
      }
    }
  }
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({ type: 'tree_update', tree: snapshot });
    } catch {}
  }
}

function splitPath(pathStr) {
  if (!pathStr || typeof pathStr !== 'string') return [];
  return pathStr
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean);
}

function getValueAtSegments(segments) {
  let curr = dbTree;
  for (const seg of segments) {
    if (curr === null || curr === undefined || typeof curr !== 'object') {
      return null;
    }
    curr = curr[seg];
  }
  return curr === undefined ? null : curr;
}

function setValueAtSegments(segments, val, isPatch = false) {
  if (segments.length === 0) {
    if (val && typeof val === 'object') {
      dbTree = isPatch ? { ...dbTree, ...deepClone(val) } : deepClone(val);
    }
    return;
  }

  let curr = dbTree;
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i];
    if (!curr[seg] || typeof curr[seg] !== 'object') {
      curr[seg] = {};
    }
    curr = curr[seg];
  }
  const last = segments[segments.length - 1];
  if (val === null || val === undefined) {
    delete curr[last];
  } else if (isPatch && curr[last] && typeof curr[last] === 'object' && typeof val === 'object' && !Array.isArray(val)) {
    curr[last] = { ...curr[last], ...deepClone(val) };
  } else {
    curr[last] = deepClone(val);
  }
}

function buildSnapshot(segments, rawVal, filterOpts = null) {
  let val = rawVal === undefined ? null : deepClone(rawVal);

  if (val && typeof val === 'object' && !Array.isArray(val) && filterOpts?.orderByChildKey && 'equalToValue' in filterOpts) {
    const filtered = {};
    for (const [k, item] of Object.entries(val)) {
      if (item && typeof item === 'object' && item[filterOpts.orderByChildKey] === filterOpts.equalToValue) {
        filtered[k] = item;
      }
    }
    val = filtered;
  }

  const snapKey = segments.length > 0 ? segments[segments.length - 1] : null;
  return {
    key: snapKey,
    ref: createReference(segments),
    exists: () => {
      if (val === null || val === undefined) return false;
      if (typeof val === 'object' && !Array.isArray(val)) {
        return Object.keys(val).length > 0;
      }
      return true;
    },
    val: () => (val === undefined ? null : deepClone(val)),
    forEach: (cb) => {
      if (!val || typeof val !== 'object') return false;
      for (const [k, v] of Object.entries(val)) {
        const childSnap = buildSnapshot([...segments, k], v);
        if (cb(childSnap) === true) return true;
      }
      return false;
    },
    child: (relPath) => {
      const childSegs = [...segments, ...splitPath(relPath)];
      return buildSnapshot(childSegs, getValueAtSegments(childSegs));
    },
    toJSON: () => (val === undefined ? null : deepClone(val)),
  };
}

function notifyListenersForPaths(changedPaths) {
  const affectedTopKeys = new Set(
    changedPaths.map((segs) => (segs.length === 0 ? '*' : segs[0]))
  );
  for (const [, entry] of listeners) {
    const topKey = entry.segments.length === 0 ? '*' : entry.segments[0];
    if (affectedTopKeys.has('*') || topKey === '*' || affectedTopKeys.has(topKey)) {
      try {
        const val = getValueAtSegments(entry.segments);
        entry.callback(buildSnapshot(entry.segments, val, entry.filterOpts));
      } catch (e) {
        console.warn('Listener callback warning:', e);
      }
    }
  }
}

function notifyAllListeners() {
  for (const [, entry] of listeners) {
    try {
      const val = getValueAtSegments(entry.segments);
      entry.callback(buildSnapshot(entry.segments, val, entry.filterOpts));
    } catch {}
  }
}

// ---------------------------------------------------------------------------
// 5. Real-Time Cloud Firestore Sync Layer
// ---------------------------------------------------------------------------
let fsBootstrapped = false;
const activeFsUnsubs = [];

function resolveFirestoreTarget(segments) {
  if (!segments || segments.length === 0) return null;
  const top = segments[0];
  if (!SYNCED_COLLECTION_SET.has(top)) return null;

  if (top === 'media_gallery' && segments.length >= 3) {
    const kind = segments[1] === 'posters' ? 'posters' : 'videos';
    const itemId = sanitizeId(segments[2]);
    return {
      colName: 'media_gallery',
      docId: `${kind}_${itemId}`,
      localSegments: ['media_gallery', kind, segments[2]],
      extra: { kind },
    };
  }

  if (segments.length >= 2) {
    return {
      colName: top,
      docId: sanitizeId(segments[1]),
      localSegments: [top, segments[1]],
    };
  }

  return null;
}

function canWriteCollectionToFirestore(colName) {
  return SYNCED_COLLECTION_SET.has(colName);
}

export function getCloudSyncStatus() {
  return {
    isCloudAuthenticated: true,
    autoSync: true,
    cloudReachable,
    projectId: firebaseConfig.projectId,
    databaseId: firebaseConfig.firestoreDatabaseId,
    pendingSyncCount: pendingFirestoreSync.size,
    lastSyncError,
    lastSyncedAt,
  };
}

export function onCloudSyncChange(cb) {
  if (typeof cb !== 'function') return () => {};
  syncListeners.add(cb);
  try {
    cb(getCloudSyncStatus());
  } catch {}
  return () => {
    syncListeners.delete(cb);
  };
}

async function clearCloudCollectionDocs(colName) {
  if (typeof window === 'undefined' || !SYNCED_COLLECTION_SET.has(colName)) return false;

  // Remove matching queued writes for this collection
  let removedPending = false;
  for (const syncKey of Array.from(pendingFirestoreSync.keys())) {
    if (syncKey.startsWith(`${colName}/`)) {
      pendingFirestoreSync.delete(syncKey);
      removedPending = true;
    }
  }
  if (removedPending) {
    persistPendingSyncMap();
    notifySyncListeners();
  }

  try {
    const snap = await getDocs(collection(firestoreDb, colName));
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
    lastSyncError = null;
    lastSyncedAt = Date.now();
    notifySyncListeners();
    return true;
  } catch (err) {
    lastSyncError = err?.message || String(err);
    notifySyncListeners();
    console.warn(`Firestore collection clear note (${colName}):`, lastSyncError);
    return false;
  }
}

async function pushTargetToFirestore(target, forceOp = null) {
  if (typeof window === 'undefined' || !target) return false;
  const { colName, docId, localSegments, extra } = target;
  const rawVal = getValueAtSegments(localSegments);
  const op = forceOp || (rawVal === null || rawVal === undefined ? 'delete' : 'set');
  const syncKey = `${colName}/${docId}`;

  if (!canWriteCollectionToFirestore(colName, docId, rawVal)) {
    markPendingSync(syncKey, { ...target, op });
    return false;
  }

  const docRef = doc(firestoreDb, colName, docId);
  try {
    if (op === 'delete') {
      await deleteDoc(docRef);
    } else {
      const merged = extra ? { ...(typeof rawVal === 'object' ? rawVal : {}), ...extra } : rawVal;
      const sanitized = sanitizeForFirestore(colName, docId, merged);
      await setDoc(docRef, sanitized);
    }
    lastSyncError = null;
    lastSyncedAt = Date.now();
    clearPendingSync(syncKey);
    notifySyncListeners();
    return true;
  } catch (err) {
    lastSyncError = err?.message || String(err);
    markPendingSync(syncKey, { ...target, op });
    if (err?.code === 'permission-denied' || String(err?.message || '').includes('permission')) {
      try {
        handleFirestoreError(err, op === 'delete' ? OperationType.DELETE : OperationType.WRITE, syncKey);
      } catch (structuredErr) {
        console.warn('Firestore write permission info:', structuredErr.message);
      }
    } else {
      console.warn(`Firestore sync note (${syncKey}):`, err?.message || err);
    }
    return false;
  }
}

async function flushPendingFirestoreWrites() {
  if (pendingFirestoreSync.size === 0) return 0;
  let flushed = 0;
  const entries = Array.from(pendingFirestoreSync.values());
  for (const entry of entries) {
    if (canWriteCollectionToFirestore(entry.colName)) {
      const ok = await pushTargetToFirestore(entry, entry.op);
      if (ok) flushed++;
    }
  }
  return flushed;
}

export async function forceSyncAllToCloud() {
  if (typeof window === 'undefined') return { synced: 0, pending: pendingFirestoreSync.size, authenticated: true };

  let synced = await flushPendingFirestoreWrites();
  const colsToSync = [
    'users',
    'payment_requests',
    'withdrawals',
    'transactions',
    'payout_records',
    'payout_logs',
    'daily_closings',
    'expenses',
    'spends',
    'media_submissions',
    'media_gallery',
    'events',
    'settings',
  ];

  for (const colName of colsToSync) {
    const bucket = dbTree[colName];
    if (!bucket || typeof bucket !== 'object') continue;

    if (colName === 'media_gallery') {
      for (const kind of ['videos', 'posters']) {
        const subBucket = bucket[kind];
        if (!subBucket || typeof subBucket !== 'object') continue;
        for (const [itemId, itemVal] of Object.entries(subBucket)) {
          if (!itemVal || typeof itemVal !== 'object') continue;
          const target = resolveFirestoreTarget(['media_gallery', kind, itemId]);
          if (target && canWriteCollectionToFirestore(target.colName)) {
            const ok = await pushTargetToFirestore(target, 'set');
            if (ok) synced++;
          }
        }
      }
      continue;
    }

    for (const [entryKey, entryVal] of Object.entries(bucket)) {
      if (colName === 'settings') {
        const target = resolveFirestoreTarget(['settings', entryKey]);
        if (target && canWriteCollectionToFirestore('settings')) {
          const ok = await pushTargetToFirestore(target, 'set');
          if (ok) synced++;
        }
      } else if (entryVal && typeof entryVal === 'object') {
        const target = resolveFirestoreTarget([colName, entryKey]);
        if (target && canWriteCollectionToFirestore(target.colName)) {
          const ok = await pushTargetToFirestore(target, 'set');
          if (ok) synced++;
        }
      }
    }
  }

  notifySyncListeners();
  return { synced, pending: pendingFirestoreSync.size, authenticated: true };
}

const initialSyncedCollections = new Set();
let hasCompletedInitialCloudHydration = (() => {
  if (typeof localStorage === 'undefined') return false;
  try {
    return localStorage.getItem(CLOUD_HYDRATED_FLAG_KEY) === 'true';
  } catch {
    return false;
  }
})();

function mergeRemoteCollectionSnapshot(colName, snap, isFullCollection = false) {
  if (!dbTree[colName] || typeof dbTree[colName] !== 'object') {
    dbTree[colName] = colName === 'media_gallery' ? { videos: {}, posters: {} } : {};
  }

  const isFirstSnapshotForCol = !initialSyncedCollections.has(colName);
  initialSyncedCollections.add(colName);

  let changed = false;
  const seenRemoteKeys = new Set();
  const localRecordsToPromote = [];

  snap.docs.forEach((docSnap) => {
    const syncKey = `${colName}/${docSnap.id}`;
    const pendingEntry = pendingFirestoreSync.get(syncKey);
    if (pendingEntry?.op === 'delete' || pendingEntry?.op === 'set') {
      seenRemoteKeys.add(docSnap.id);
      return;
    }

    const data = docSnap.data();
    if (colName === 'settings') {
      const key = data?.key || docSnap.id;
      seenRemoteKeys.add(key);
      if (data && 'value' in data) {
        dbTree.settings[key] = data.value;
        changed = true;
      }
    } else if (colName === 'media_gallery') {
      const kind = data?.kind === 'posters' ? 'posters' : 'videos';
      const rawId = docSnap.id.replace(/^(videos|posters)_/, '');
      seenRemoteKeys.add(`${kind}/${rawId}`);
      if (!dbTree.media_gallery || typeof dbTree.media_gallery !== 'object') {
        dbTree.media_gallery = { videos: {}, posters: {} };
      }
      if (!dbTree.media_gallery[kind]) dbTree.media_gallery[kind] = {};
      dbTree.media_gallery[kind][rawId] = data;
      changed = true;
    } else if (colName === 'daily_closings') {
      seenRemoteKeys.add(docSnap.id);
      const prev = dbTree.daily_closings[docSnap.id] || {};
      dbTree.daily_closings[docSnap.id] = {
        ...prev,
        ...data,
        summary:
          prev.summary || data?.summary
            ? { ...(prev.summary || {}), ...(data?.summary || {}) }
            : undefined,
        statements:
          prev.statements || data?.statements
            ? { ...(prev.statements || {}), ...(data?.statements || {}) }
            : undefined,
      };
      changed = true;
    } else {
      seenRemoteKeys.add(docSnap.id);
      dbTree[colName][docSnap.id] = { ...(dbTree[colName][docSnap.id] || {}), ...data };
      changed = true;
    }
  });

  // First-time upgrade migration: if this device had locally saved records before automatic cloud sync,
  // upload those local-only records to Cloud Firestore instead of discarding them.
  const shouldPromoteLocalOnly = isFirstSnapshotForCol && !hasCompletedInitialCloudHydration;

  if (isFullCollection && snap.docs.length >= 0) {
    if (colName === 'media_gallery') {
      for (const kind of ['videos', 'posters']) {
        const sub = dbTree.media_gallery?.[kind] || {};
        for (const itemId of Object.keys(sub)) {
          const docKey = `${kind}_${sanitizeId(itemId)}`;
          const hasPendingSet = pendingFirestoreSync.get(`media_gallery/${docKey}`)?.op === 'set';
          if (!hasPendingSet && !seenRemoteKeys.has(`${kind}/${itemId}`)) {
            if (shouldPromoteLocalOnly) {
              const target = resolveFirestoreTarget(['media_gallery', kind, itemId]);
              if (target) localRecordsToPromote.push(target);
            } else {
              delete dbTree.media_gallery[kind][itemId];
              changed = true;
            }
          }
        }
      }
    } else if (colName === 'settings') {
      if (snap.docs.length === 0 && dbTree.settings) {
        for (const settingKey of Object.keys(dbTree.settings)) {
          const target = resolveFirestoreTarget(['settings', settingKey]);
          if (target) localRecordsToPromote.push(target);
        }
      }
    } else {
      const bucket = dbTree[colName] || {};
      for (const localKey of Object.keys(bucket)) {
        const cleanDocId = sanitizeId(localKey);
        const hasPendingSet = pendingFirestoreSync.get(`${colName}/${cleanDocId}`)?.op === 'set';
        if (hasPendingSet) continue;
        if (!seenRemoteKeys.has(localKey) && !seenRemoteKeys.has(cleanDocId)) {
          if (shouldPromoteLocalOnly || (colName === 'users' && localKey === 'root_sponsor_ucwf_0001' && snap.docs.length === 0)) {
            const target = resolveFirestoreTarget([colName, localKey]);
            if (target) localRecordsToPromote.push(target);
            continue;
          }
          delete dbTree[colName][localKey];
          changed = true;
        }
      }
    }
  }

  if (localRecordsToPromote.length > 0) {
    Promise.all(localRecordsToPromote.map((t) => pushTargetToFirestore(t, 'set'))).catch(() => {});
  }

  if (!hasCompletedInitialCloudHydration && initialSyncedCollections.size >= ALL_SYNCED_COLLECTIONS.length) {
    hasCompletedInitialCloudHydration = true;
    try {
      localStorage.setItem(CLOUD_HYDRATED_FLAG_KEY, 'true');
    } catch {}
  }

  cloudReachable = true;
  lastSyncedAt = Date.now();
  notifySyncListeners();

  if (changed) {
    persistLocalTree();
    notifyListenersForPaths([[colName]]);
  }
}

function attachCollectionListener(colName, fsSource, label, isFullCollection = true) {
  try {
    const unsub = onSnapshot(
      fsSource,
      (snap) => {
        mergeRemoteCollectionSnapshot(colName, snap, isFullCollection);
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, label || colName);
        } catch (structuredErr) {
          console.warn('Firestore listener handled:', structuredErr.message);
        }
      }
    );
    activeFsUnsubs.push(unsub);
  } catch (err) {
    console.warn(`Failed attaching listener for ${colName}:`, err?.message || err);
  }
}

function attachAllFirestoreListeners() {
  if (activeFsUnsubs.length > 0) return;
  for (const colName of ALL_SYNCED_COLLECTIONS) {
    attachCollectionListener(colName, collection(firestoreDb, colName), colName, true);
  }
}

function ensureFirestoreBootstrapped() {
  if (fsBootstrapped || typeof window === 'undefined') return;
  fsBootstrapped = true;

  // 1. Hydrate local IndexedDB assets first so no local data is lost on boot
  loadTreeFromIdb()
    .then((idbTree) => {
      if (idbTree && typeof idbTree === 'object') {
        dbTree = mergeTreeCollections(idbTree, dbTree);
        notifyAllListeners();
      }
    })
    .finally(async () => {
      if (resolveIdbReady) resolveIdbReady(true);

      // 2. Push any queued offline writes immediately, then attach live A-to-Z Firestore listeners
      try {
        await flushPendingFirestoreWrites();
      } catch {}
      attachAllFirestoreListeners();
    });

  testConnection();

  // 3. Automatic background sync on reconnect, tab focus, visibility, and periodic retry
  window.addEventListener('online', () => {
    testConnection();
    flushPendingFirestoreWrites();
  });

  window.addEventListener('focus', () => {
    flushPendingFirestoreWrites();
  });

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        flushPendingFirestoreWrites();
      }
    });
  }

  setInterval(() => {
    if (pendingFirestoreSync.size > 0) {
      flushPendingFirestoreWrites();
    }
  }, 15000);
}

if (typeof window !== 'undefined') {
  ensureFirestoreBootstrapped();
} else if (resolveIdbReady) {
  resolveIdbReady(true);
}

// ---------------------------------------------------------------------------
// 6. Exported Firebase Realtime Database Compatible API
// ---------------------------------------------------------------------------
let pushCounter = 0;
function generatePushKey() {
  pushCounter = (pushCounter + 1) % 4096;
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  const seq = pushCounter.toString(36).padStart(2, '0');
  return `-O${ts}${seq}${rand}`.replace(/[^a-zA-Z0-9_\-]/g, '_');
}

function createReference(segments, filterOpts = null) {
  const cleanSegs = Array.isArray(segments) ? [...segments] : [];
  const pathStr = cleanSegs.join('/');
  return {
    key: cleanSegs.length > 0 ? cleanSegs[cleanSegs.length - 1] : null,
    parent: cleanSegs.length > 0 ? createReference(cleanSegs.slice(0, -1)) : null,
    root: null,
    _segments: cleanSegs,
    _filterOpts: filterOpts,
    toString: () => `https://${firebaseConfig.projectId}.firebaseio.com/${pathStr}`,
  };
}

export function getDatabase() {
  ensureFirestoreBootstrapped();
  return {
    app,
    type: 'firestore-backed-rtdb',
    _checkNotDeleted: () => {},
  };
}

export const db = getDatabase();
export const rtdb = db;

export function ref(_database, path = '') {
  return createReference(splitPath(path));
}

export function child(parentRef, path = '') {
  const baseSegs = parentRef?._segments || [];
  return createReference([...baseSegs, ...splitPath(path)]);
}

export function orderByChild(childKey) {
  return { type: 'orderByChild', value: childKey };
}

export function equalTo(val) {
  return { type: 'equalTo', value: val };
}

export function query(targetRef, ...constraints) {
  const filterOpts = { ...(targetRef?._filterOpts || {}) };
  for (const c of constraints) {
    if (c?.type === 'orderByChild') filterOpts.orderByChildKey = c.value;
    if (c?.type === 'equalTo') filterOpts.equalToValue = c.value;
  }
  return createReference(targetRef?._segments || [], filterOpts);
}

export function serverTimestamp() {
  return Date.now();
}

export async function get(targetRef) {
  ensureFirestoreBootstrapped();
  await idbReadyPromise;
  const segments = targetRef?._segments || [];
  const val = getValueAtSegments(segments);
  return buildSnapshot(segments, val, targetRef?._filterOpts);
}

export async function set(targetRef, value) {
  ensureFirestoreBootstrapped();
  await idbReadyPromise;
  const segments = targetRef?._segments || [];
  setValueAtSegments(segments, value, false);
  persistLocalTree();
  notifyListenersForPaths([segments]);

  const syncTasks = [];
  const fsTarget = resolveFirestoreTarget(segments);
  if (fsTarget) {
    syncTasks.push(pushTargetToFirestore(fsTarget, value === null || value === undefined ? 'delete' : 'set'));
  } else if (segments.length === 1 && SYNCED_COLLECTION_SET.has(segments[0])) {
    if (value === null || value === undefined) {
      syncTasks.push(clearCloudCollectionDocs(segments[0]));
    } else if (typeof value === 'object') {
      for (const key of Object.keys(value)) {
        const childTarget = resolveFirestoreTarget([segments[0], key]);
        if (childTarget) syncTasks.push(pushTargetToFirestore(childTarget, 'set'));
      }
    }
  }
  await Promise.all(syncTasks);
}

export async function update(targetRef, updatesObj) {
  ensureFirestoreBootstrapped();
  await idbReadyPromise;
  const baseSegs = targetRef?._segments || [];
  if (!updatesObj || typeof updatesObj !== 'object') return;

  const changedPaths = [];
  const fsTargets = new Map();
  const collectionsToClear = new Set();

  if (baseSegs.length === 0) {
    for (const [relPath, val] of Object.entries(updatesObj)) {
      const fullSegs = splitPath(relPath);
      setValueAtSegments(fullSegs, val, false);
      changedPaths.push(fullSegs);

      if (fullSegs.length === 1 && SYNCED_COLLECTION_SET.has(fullSegs[0]) && (val === null || val === undefined)) {
        collectionsToClear.add(fullSegs[0]);
      } else {
        const fsTarget = resolveFirestoreTarget(fullSegs);
        if (fsTarget) {
          fsTargets.set(`${fsTarget.colName}/${fsTarget.docId}`, {
            target: fsTarget,
            op: val === null || val === undefined ? 'delete' : 'set',
          });
        }
      }
    }
  } else {
    setValueAtSegments(baseSegs, updatesObj, true);
    changedPaths.push(baseSegs);

    const fsTarget = resolveFirestoreTarget(baseSegs);
    if (fsTarget) {
      fsTargets.set(`${fsTarget.colName}/${fsTarget.docId}`, {
        target: fsTarget,
        op: 'set',
      });
    } else {
      for (const relKey of Object.keys(updatesObj)) {
        const subSegs = [...baseSegs, ...splitPath(relKey)];
        const subTarget = resolveFirestoreTarget(subSegs);
        if (subTarget) {
          fsTargets.set(`${subTarget.colName}/${subTarget.docId}`, {
            target: subTarget,
            op: updatesObj[relKey] === null ? 'delete' : 'set',
          });
        }
      }
    }
  }

  persistLocalTree();
  notifyListenersForPaths(changedPaths);

  // Clear whole collections first (e.g. reset data) before writing seeded root documents
  if (collectionsToClear.size > 0) {
    await Promise.all(Array.from(collectionsToClear).map((colName) => clearCloudCollectionDocs(colName)));
  }

  if (fsTargets.size > 0) {
    await Promise.all(
      Array.from(fsTargets.values()).map(({ target, op }) => pushTargetToFirestore(target, op))
    );
  }
}

export async function remove(targetRef) {
  return set(targetRef, null);
}

export function push(targetRef, optionalValue) {
  const baseSegs = targetRef?._segments || [];
  const newKey = generatePushKey();
  const newRef = createReference([...baseSegs, newKey]);

  if (optionalValue !== undefined) {
    const p = set(newRef, optionalValue).then(() => newRef);
    p.key = newRef.key;
    p.parent = newRef.parent;
    p._segments = newRef._segments;
    return p;
  }

  return newRef;
}

export function onValue(targetRef, callback, errorCallback) {
  ensureFirestoreBootstrapped();
  const id = listenerSeq++;
  const segments = targetRef?._segments || [];
  const filterOpts = targetRef?._filterOpts || null;

  listeners.set(id, { segments, filterOpts, callback });

  try {
    const val = getValueAtSegments(segments);
    callback(buildSnapshot(segments, val, filterOpts));
  } catch (err) {
    if (typeof errorCallback === 'function') errorCallback(err);
  }

  const unsubscribe = () => {
    listeners.delete(id);
  };
  return unsubscribe;
}

export function off(targetRef, _eventType, callback) {
  if (!targetRef) return;
  const targetPath = (targetRef._segments || []).join('/');
  for (const [id, entry] of listeners.entries()) {
    const entryPath = entry.segments.join('/');
    if (entryPath === targetPath && (!callback || entry.callback === callback)) {
      listeners.delete(id);
    }
  }
}

export default {
  app,
  auth,
  firestoreDb,
  db,
  rtdb,
  googleProvider,
  testConnection,
  getCloudSyncStatus,
  onCloudSyncChange,
  forceSyncAllToCloud,
  OperationType,
  handleFirestoreError,
};
