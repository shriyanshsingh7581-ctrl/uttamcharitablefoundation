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
  onAuthStateChanged,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  getDocFromServer,
  setDoc,
  deleteDoc,
  onSnapshot,
  query as fsQuery,
  where as fsWhere,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// ---------------------------------------------------------------------------
// 1. Firebase Core Initialization (Uses provisioned firebase-applet-config.json)
// ---------------------------------------------------------------------------
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const firestoreDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);
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

export async function testConnection() {
  if (typeof window === 'undefined') return true;
  try {
    await getDocFromServer(doc(firestoreDb, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration (client is offline).');
    }
    return false;
  }
}

// ---------------------------------------------------------------------------
// 3. Schema Allowlists & Defensive Sanitization (Matches firestore.rules)
// ---------------------------------------------------------------------------
const COLLECTION_ALLOWED_KEYS = {
  users: new Set([
    'uid', 'memberId', 'name', 'displayName', 'salutation', 'padNaam',
    'phone', 'email', 'sponsorId', 'sponsorName', 'sponsorPhone',
    'packageTier', 'packageAmount', 'packageName', 'selfBusiness',
    'selfBusinessCommission', 'walletBalance', 'totalEarned', 'totalWithdrawn',
    'directBusiness', 'directTeamBusiness', 'teamBusiness', 'downlineBusiness',
    'directCommission', 'directTeamCommission', 'downlineCommission', 'totalCommission',
    'status', 'isApproved', 'paymentVerified', 'kycVerified', 'documentsVerified',
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
    'createdAt', 'timestamp', 'updatedAt', 'approvedAt',
  ]),
  withdrawals: new Set([
    'id', 'userId', 'memberId', 'userName', 'phone', 'amount', 'status',
    'bankDetails', 'upiId', 'transactionRef', 'remarks', 'createdAt',
    'updatedAt', 'paidAt', 'timestamp',
  ]),
  transactions: new Set([
    'id', 'userId', 'memberId', 'type', 'amount', 'description',
    'fromMemberId', 'fromName', 'level', 'status', 'createdAt', 'timestamp',
  ]),
  payout_records: new Set([
    'id', 'userId', 'memberId', 'memberName', 'amount', 'totalDistributed',
    'trustShare', 'payouts', 'status', 'paymentMode', 'referenceNo',
    'remarks', 'date', 'createdAt', 'timestamp',
  ]),
  payout_logs: null,
  spends: new Set([
    'id', 'title', 'category', 'amount', 'date', 'description',
    'location', 'beneficiaryCount', 'receiptUrl', 'createdAt', 'timestamp',
  ]),
  expenses: null,
  media_submissions: new Set([
    'id', 'userId', 'memberId', 'userName', 'title', 'description',
    'category', 'location', 'mediaUrl', 'mediaType', 'status',
    'createdAt', 'timestamp', 'updatedAt',
  ]),
  media_gallery: new Set([
    'id', 'kind', 'title', 'subtitle', 'url', 'thumbnailUrl',
    'slot', 'active', 'featured', 'createdAt', 'timestamp',
  ]),
  daily_closings: new Set([
    'date', 'totalJoining', 'totalCommission', 'trustShare',
    'newMembersCount', 'memberReports', 'createdAt', 'timestamp', 'status',
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

const PUBLIC_COLLECTIONS = ['settings', 'events', 'spends', 'daily_closings', 'media_gallery'];
const AUTH_COLLECTIONS = [
  'users',
  'members',
  'wallets',
  'payment_requests',
  'withdrawals',
  'transactions',
  'payout_records',
  'payout_logs',
  'expenses',
  'media_submissions',
];
const SYNCED_COLLECTION_SET = new Set([...PUBLIC_COLLECTIONS, ...AUTH_COLLECTIONS]);
const BOOTSTRAPPED_ADMIN_EMAIL = 'singhshriyansh51@gmail.com';

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
      if (allowed.has(k)) {
        out[k] = v;
      }
    }
  } else {
    Object.assign(out, base);
  }

  if (colName === 'users' || colName === 'members' || colName === 'wallets') {
    out.uid = cleanId;
    out.memberId = clampString(out.memberId || 'UCWF-MEMBER', 64);
    if (out.memberId.length < 2) out.memberId = 'UCWF-MEMBER';
    out.name = clampString(out.name || out.displayName || 'Foundation Member', 120) || 'Foundation Member';
    out.status = ['active', 'pending', 'inactive', 'suspended'].includes(out.status)
      ? out.status
      : 'active';
    if (out.displayName !== undefined) out.displayName = clampString(String(out.displayName), 140);
    if (out.photoUrl !== undefined) out.photoUrl = clampString(String(out.photoUrl), 300000);
    if (out.signatureUrl !== undefined) out.signatureUrl = clampString(String(out.signatureUrl), 200000);
    if (out.aadhaarDocUrl !== undefined) out.aadhaarDocUrl = clampString(String(out.aadhaarDocUrl), 300000);
    if (out.aadhaarBackDocUrl !== undefined) out.aadhaarBackDocUrl = clampString(String(out.aadhaarBackDocUrl), 300000);
    if (out.panDocUrl !== undefined) out.panDocUrl = clampString(String(out.panDocUrl), 300000);
    if (out.paymentReceiptUrl !== undefined) out.paymentReceiptUrl = clampString(String(out.paymentReceiptUrl), 300000);
  } else if (colName === 'payment_requests') {
    out.id = cleanId;
    out.userId = clampString(String(out.userId || out.uid || 'portal_member'), 128) || 'portal_member';
    out.amount = Math.max(0, Number(out.amount || 0));
    out.status = ['pending', 'approved', 'rejected'].includes(out.status) ? out.status : 'approved';
  } else if (colName === 'withdrawals') {
    out.id = cleanId;
    out.userId = clampString(String(out.userId || out.uid || 'portal_member'), 128) || 'portal_member';
    out.amount = Math.max(1, Number(out.amount || 1));
    out.status = ['pending', 'approved', 'paid', 'rejected'].includes(out.status) ? out.status : 'pending';
  } else if (colName === 'transactions') {
    out.id = cleanId;
    out.userId = clampString(String(out.userId || 'portal_member'), 128) || 'portal_member';
    out.type = clampString(String(out.type || 'credit'), 40) || 'credit';
    out.amount = Number(out.amount || 0);
    if (out.description !== undefined) out.description = clampString(String(out.description), 300);
  } else if (colName === 'payout_records' || colName === 'payout_logs') {
    out.id = cleanId;
    out.amount = Math.max(0, Number(out.amount || 0));
  } else if (colName === 'spends' || colName === 'expenses') {
    out.id = cleanId;
    out.title = clampString(String(out.title || 'Foundation Expense'), 200) || 'Foundation Expense';
    out.amount = Math.max(0, Number(out.amount || 0));
    if (out.description !== undefined) out.description = clampString(String(out.description), 1000);
  } else if (colName === 'media_submissions') {
    out.id = cleanId;
    out.mediaUrl = clampString(String(out.mediaUrl || out.url || 'https://ucwf.online'), 900000) || 'https://ucwf.online';
    out.status = ['pending', 'approved', 'rejected'].includes(out.status) ? out.status : 'pending';
  } else if (colName === 'media_gallery') {
    out.id = cleanId;
    out.kind = out.kind === 'posters' ? 'posters' : 'videos';
  } else if (colName === 'daily_closings') {
    out.date = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(cleanId) ? cleanId : new Date().toISOString().slice(0, 10);
  } else if (colName === 'events') {
    out.id = cleanId;
    out.title = clampString(String(out.title || 'Foundation Event'), 200) || 'Foundation Event';
  }

  return out;
}

// ---------------------------------------------------------------------------
// 4. Local Hydrated Store + IndexedDB + Seed Root Sponsor + Broadcast Sync
// ---------------------------------------------------------------------------
const LOCAL_CACHE_KEY = 'ucwf_rtdb_cache_v2';
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

let dbTree = loadInitialTree();
const listeners = new Map();
let listenerSeq = 1;
let broadcastChannel = null;
const pendingFirestoreSync = new Map();

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

function isBootstrappedAdminSession() {
  const u = auth?.currentUser;
  return Boolean(u && u.emailVerified && u.email === BOOTSTRAPPED_ADMIN_EMAIL);
}

function canWriteCollectionToFirestore(colName) {
  const u = auth?.currentUser;
  if (!u || !u.emailVerified) return false;
  if (u.email === BOOTSTRAPPED_ADMIN_EMAIL) return true;
  return ['users', 'payment_requests', 'withdrawals', 'media_submissions'].includes(colName);
}

export function getCloudSyncStatus() {
  const u = auth?.currentUser || null;
  return {
    isCloudAuthenticated: Boolean(u && u.emailVerified),
    email: u?.email || null,
    isAdminEmail: Boolean(u?.emailVerified && u?.email === BOOTSTRAPPED_ADMIN_EMAIL),
    projectId: firebaseConfig.projectId,
    databaseId: firebaseConfig.firestoreDatabaseId,
    pendingSyncCount: pendingFirestoreSync.size,
  };
}

async function pushTargetToFirestore(target, forceOp = null) {
  if (typeof window === 'undefined' || !target) return;
  const { colName, docId, localSegments, extra } = target;
  const rawVal = getValueAtSegments(localSegments);
  const op = forceOp || (rawVal === null || rawVal === undefined ? 'delete' : 'set');

  if (!canWriteCollectionToFirestore(colName)) {
    pendingFirestoreSync.set(`${colName}/${docId}`, { ...target, op });
    return;
  }

  const docRef = doc(firestoreDb, colName, docId);
  try {
    if (op === 'delete') {
      await deleteDoc(docRef);
    } else {
      const merged = extra ? { ...(typeof rawVal === 'object' ? rawVal : {}), ...extra } : rawVal;
      const sanitized = sanitizeForFirestore(colName, docId, merged);
      await setDoc(docRef, sanitized, { merge: true });
    }
    pendingFirestoreSync.delete(`${colName}/${docId}`);
  } catch (err) {
    if (err?.code === 'permission-denied' || String(err?.message || '').includes('permission')) {
      try {
        handleFirestoreError(err, op === 'delete' ? OperationType.DELETE : OperationType.WRITE, `${colName}/${docId}`);
      } catch (structuredErr) {
        console.warn('Firestore write permission info:', structuredErr.message);
      }
    } else {
      console.warn(`Firestore sync note (${colName}/${docId}):`, err?.message || err);
    }
  }
}

async function flushPendingFirestoreWrites() {
  if (pendingFirestoreSync.size === 0) return;
  const entries = Array.from(pendingFirestoreSync.values());
  for (const entry of entries) {
    if (canWriteCollectionToFirestore(entry.colName)) {
      await pushTargetToFirestore(entry, entry.op);
    }
  }
}

function mergeRemoteCollectionSnapshot(colName, snap) {
  if (!dbTree[colName] || typeof dbTree[colName] !== 'object') {
    dbTree[colName] = {};
  }

  let changed = false;
  snap.docs.forEach((docSnap) => {
    const data = docSnap.data();
    if (colName === 'settings') {
      const key = data?.key || docSnap.id;
      if (data && 'value' in data) {
        dbTree.settings[key] = data.value;
        changed = true;
      }
    } else if (colName === 'media_gallery') {
      const kind = data?.kind === 'posters' ? 'posters' : 'videos';
      const rawId = data?.id || docSnap.id.replace(/^(videos|posters)_/, '');
      if (!dbTree.media_gallery || typeof dbTree.media_gallery !== 'object') {
        dbTree.media_gallery = { videos: {}, posters: {} };
      }
      if (!dbTree.media_gallery[kind]) dbTree.media_gallery[kind] = {};
      dbTree.media_gallery[kind][rawId] = data;
      changed = true;
    } else {
      dbTree[colName][docSnap.id] = { ...(dbTree[colName][docSnap.id] || {}), ...data };
      changed = true;
    }
  });

  if (changed) {
    persistLocalTree();
    notifyListenersForPaths([[colName]]);
  }
}

function attachCollectionListener(colName, fsSource, label) {
  try {
    const unsub = onSnapshot(
      fsSource,
      (snap) => {
        mergeRemoteCollectionSnapshot(colName, snap);
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

function clearAuthListeners() {
  while (activeFsUnsubs.length > 0) {
    const unsub = activeFsUnsubs.pop();
    try {
      unsub();
    } catch {}
  }
}

function attachPublicFirestoreListeners() {
  for (const colName of PUBLIC_COLLECTIONS) {
    attachCollectionListener(colName, collection(firestoreDb, colName), colName);
  }
  attachCollectionListener(
    'media_submissions',
    fsQuery(collection(firestoreDb, 'media_submissions'), fsWhere('status', '==', 'approved')),
    'media_submissions'
  );
}

function attachAuthenticatedFirestoreListeners(user) {
  if (!user || !user.emailVerified) return;
  const admin = isBootstrappedAdminSession();

  if (admin) {
    for (const colName of AUTH_COLLECTIONS) {
      attachCollectionListener(colName, collection(firestoreDb, colName), colName);
    }
  } else {
    attachCollectionListener(
      'users',
      fsQuery(collection(firestoreDb, 'users'), fsWhere('uid', '==', user.uid)),
      'users'
    );
    attachCollectionListener(
      'payment_requests',
      fsQuery(collection(firestoreDb, 'payment_requests'), fsWhere('userId', '==', user.uid)),
      'payment_requests'
    );
    attachCollectionListener(
      'withdrawals',
      fsQuery(collection(firestoreDb, 'withdrawals'), fsWhere('userId', '==', user.uid)),
      'withdrawals'
    );
    attachCollectionListener(
      'transactions',
      fsQuery(collection(firestoreDb, 'transactions'), fsWhere('userId', '==', user.uid)),
      'transactions'
    );
  }
}

function ensureFirestoreBootstrapped() {
  if (fsBootstrapped || typeof window === 'undefined') return;
  fsBootstrapped = true;

  // Hydrate full high-res assets & extra records from IndexedDB cleanly
  loadTreeFromIdb().then((idbTree) => {
    if (idbTree && typeof idbTree === 'object') {
      dbTree = mergeTreeCollections(idbTree, dbTree);
      notifyAllListeners();
    }
  });

  testConnection();
  attachPublicFirestoreListeners();

  onAuthStateChanged(auth, (firebaseUser) => {
    clearAuthListeners();
    attachPublicFirestoreListeners();
    if (firebaseUser) {
      attachAuthenticatedFirestoreListeners(firebaseUser);
      flushPendingFirestoreWrites();
    }
  });
}

if (typeof window !== 'undefined') {
  ensureFirestoreBootstrapped();
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
  const segments = targetRef?._segments || [];
  const val = getValueAtSegments(segments);
  return buildSnapshot(segments, val, targetRef?._filterOpts);
}

export async function set(targetRef, value) {
  ensureFirestoreBootstrapped();
  const segments = targetRef?._segments || [];
  setValueAtSegments(segments, value, false);
  persistLocalTree();
  notifyListenersForPaths([segments]);

  const fsTarget = resolveFirestoreTarget(segments);
  if (fsTarget) {
    pushTargetToFirestore(fsTarget, value === null || value === undefined ? 'delete' : 'set');
  } else if (segments.length === 1 && SYNCED_COLLECTION_SET.has(segments[0]) && value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      const childTarget = resolveFirestoreTarget([segments[0], key]);
      if (childTarget) pushTargetToFirestore(childTarget, 'set');
    }
  }
}

export async function update(targetRef, updatesObj) {
  ensureFirestoreBootstrapped();
  const baseSegs = targetRef?._segments || [];
  if (!updatesObj || typeof updatesObj !== 'object') return;

  const changedPaths = [];
  const fsTargets = new Map();

  if (baseSegs.length === 0) {
    for (const [relPath, val] of Object.entries(updatesObj)) {
      const fullSegs = splitPath(relPath);
      setValueAtSegments(fullSegs, val, false);
      changedPaths.push(fullSegs);

      const fsTarget = resolveFirestoreTarget(fullSegs);
      if (fsTarget) {
        fsTargets.set(`${fsTarget.colName}/${fsTarget.docId}`, {
          target: fsTarget,
          op: val === null || val === undefined ? 'delete' : 'set',
        });
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

  for (const { target, op } of fsTargets.values()) {
    pushTargetToFirestore(target, op);
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
  OperationType,
  handleFirestoreError,
};
