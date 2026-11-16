import { db, ref, get, update, set } from '../lib/firebase';
import { 
  isDirectChild,
  isSponsoredBy, 
  findParentMember, 
  getMemberFullName, 
  computeUnlimitedGenerationTree,
  buildMember12LevelReport,
  DEFAULT_LEVEL_RATES,
  CANONICAL_LEVEL_RATES,
  normalizeSponsorId,
  parseAmount,
  normId,
  lastDigits
} from './mlmUtils';

export {
  isDirectChild,
  isSponsoredBy,
  findParentMember,
  getMemberFullName,
  computeUnlimitedGenerationTree,
  buildMember12LevelReport,
  DEFAULT_LEVEL_RATES,
  CANONICAL_LEVEL_RATES,
  normalizeSponsorId,
  parseAmount,
  normId,
  lastDigits
};

/**
 * Canonical 12-Level Rates (Total 50% Distribution)
 */
export const LOCKED_12_LEVEL_RATES = DEFAULT_LEVEL_RATES;

/**
 * Fetch saved Level 1 to 12 Commission Rates from Firebase RTDB (/settings/levelRates)
 * Returns canonical { 1: 20, 2: 8, 3: 5, 4: 4, 5: 3, 6: 2.5, 7: 2, 8: 1.5, 9: 1, 10: 1, 11: 1, 12: 1 }
 */
export async function getSavedLevelRates() {
  try {
    const snap = await get(ref(db, 'settings/levelRates'));
    if (snap.exists()) {
      return snap.val();
    }
  } catch (err) {
    console.warn('Could not fetch saved levelRates:', err);
  }
  return { ...DEFAULT_LEVEL_RATES };
}

/**
 * Fetch saved Self Business Commission Rate (% on member's own contribution)
 * Stored at /settings/selfBusinessRate -> STRICTLY 0%
 */
export async function getSavedSelfBusinessRate() {
  return 0;
}

/**
 * Save manual Self Business Commission Rate in Firebase RTDB (/settings/selfBusinessRate)
 */
export async function saveSelfBusinessRate(rate) {
  await set(ref(db, 'settings/selfBusinessRate'), 0);
  return 0;
}

/**
 * Save manual Level 1 to 12 Commission Rates in Firebase RTDB (/settings/levelRates)
 */
export async function saveLevelRates(ratesMap) {
  const cleanRates = {};
  for (let i = 1; i <= 12; i++) {
    cleanRates[i] = Number(ratesMap[i] ?? DEFAULT_LEVEL_RATES[i]);
  }
  await set(ref(db, 'settings/levelRates'), cleanRates);
  return cleanRates;
}

/**
 * Traverse the 12-level upline chain for any given member by UID, Member ID, or Mobile Number
 */
export async function getUplineChain(memberUidOrId) {
  if (!memberUidOrId) return [];

  const usersSnap = await get(ref(db, 'users'));
  if (!usersSnap.exists()) return [];

  const allUsers = usersSnap.val();
  const allList = Object.values(allUsers).filter(Boolean);

  const cleanSearch = normId(memberUidOrId);
  const cleanPhone = lastDigits(memberUidOrId).slice(-10);

  let sourceUser = allUsers[memberUidOrId];
  if (!sourceUser) {
    sourceUser = allList.find(u => 
      normId(u.memberId) === cleanSearch ||
      (cleanPhone.length === 10 && lastDigits(u.phone).slice(-10) === cleanPhone) ||
      u.uid === memberUidOrId
    );
  }

  if (!sourceUser) return [];

  const chain = [];
  const visited = new Set();
  const rootUid = sourceUser.uid || sourceUser.id;
  if (rootUid) visited.add(rootUid);
  if (sourceUser.memberId) visited.add(normId(sourceUser.memberId));

  let current = sourceUser;

  for (let lvl = 1; lvl <= 12; lvl++) {
    const parent = findParentMember(current, allUsers);
    if (!parent) break;

    const parentUid = parent.uid || parent.id;
    const parentMem = normId(parent.memberId);
    if ((parentUid && visited.has(parentUid)) || (parentMem && visited.has(parentMem))) break;
    if (parentUid) visited.add(parentUid);
    if (parentMem) visited.add(parentMem);

    chain.push({
      level: lvl,
      user: parent,
      uid: parentUid,
      memberId: parent.memberId || 'N/A',
      name: getMemberFullName(parent),
      phone: parent.phone || '',
      walletBalance: Number(parent.walletBalance || 0),
      totalEarned: Number(parent.totalEarned || 0)
    });

    current = parent;
  }

  return chain;
}

/**
 * Distribute manual or direct commission across upline chain
 */
export async function distributeManualCommission({
  sourceMember,
  packageAmount = 500,
  manualDistributions = []
}) {
  const cleanPkg = parseAmount(packageAmount) || 500;
  if (!manualDistributions || manualDistributions.length === 0) {
    return { 
      success: false, 
      count: 0, 
      totalDistributed: 0, 
      directCommissionPaid: 0, 
      downlineCommissionPaid: 0, 
      trustShareAmount: cleanPkg, 
      message: 'No distribution provided' 
    };
  }

  const usersSnap = await get(ref(db, 'users'));
  if (!usersSnap.exists()) {
    throw new Error('Users database is empty');
  }

  const allUsers = usersSnap.val();
  const updates = {};
  const nowTimestamp = Date.now();
  const nowReadable = new Date().toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  let distributedCount = 0;
  let totalPaid = 0;
  let directCommissionPaid = 0;
  let downlineCommissionPaid = 0;

  for (const item of manualDistributions) {
    if (!item.enabled && item.enabled !== undefined) continue;

    const creditAmount = parseAmount(item.amount);
    if (creditAmount <= 0) continue;

    const targetUid = item.uid;
    const targetUser = allUsers[targetUid];
    if (!targetUser) continue;

    const currentBal = Number(targetUser.walletBalance || 0);
    const currentEarned = Number(targetUser.totalEarned || 0);
    const currentDirect = Number(targetUser.directCommission || 0);
    const currentDownline = Number(targetUser.downlineCommission || 0);

    const newBal = currentBal + creditAmount;
    const newEarned = currentEarned + creditAmount;

    updates[`/users/${targetUid}/walletBalance`] = newBal;
    updates[`/users/${targetUid}/totalEarned`] = newEarned;

    const currentDirectBiz = Number(targetUser.directBusiness || 0);
    const currentDownlineBiz = Number(targetUser.downlineBusiness || 0);
    const currentTeamBiz = Number(targetUser.teamBusiness || 0);

    if (Number(item.level) === 1) {
      const newDirect = currentDirect + creditAmount;
      const newDirectBiz = currentDirectBiz + cleanPkg;
      const newTeamBiz = currentTeamBiz + cleanPkg;

      updates[`/users/${targetUid}/directCommission`] = newDirect;
      updates[`/users/${targetUid}/directTeamCommission`] = newDirect;
      updates[`/users/${targetUid}/directBusiness`] = newDirectBiz;
      updates[`/users/${targetUid}/directTeamBusiness`] = newDirectBiz;
      updates[`/users/${targetUid}/teamBusiness`] = newTeamBiz;
      updates[`/users/${targetUid}/totalCommission`] = newDirect + currentDownline;

      directCommissionPaid += creditAmount;
    } else {
      const newDownline = currentDownline + creditAmount;
      const newDownlineBiz = currentDownlineBiz + cleanPkg;
      const newTeamBiz = currentTeamBiz + cleanPkg;

      updates[`/users/${targetUid}/downlineCommission`] = newDownline;
      updates[`/users/${targetUid}/downlineBusiness`] = newDownlineBiz;
      updates[`/users/${targetUid}/teamBusiness`] = newTeamBiz;
      updates[`/users/${targetUid}/totalCommission`] = currentDirect + newDownline;

      downlineCommissionPaid += creditAmount;
    }

    const txId = `TXN-COMM-${nowTimestamp}-L${item.level}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    updates[`/transactions/${txId}`] = {
      id: txId,
      userId: targetUid,
      memberId: item.memberId || targetUser.memberId || 'N/A',
      amount: creditAmount,
      type: Number(item.level) === 1 ? 'direct_commission' : 'downline_commission',
      commissionCategory: Number(item.level) === 1 ? 'direct' : 'downline',
      level: Number(item.level),
      percentage: Number(item.percentage || 0),
      fromUid: sourceMember.uid || 'N/A',
      fromMemberId: sourceMember.memberId || 'N/A',
      fromName: `${sourceMember.salutation || ''} ${sourceMember.name || 'Member'}`.trim(),
      fromPhone: sourceMember.phone || '',
      packageAmount: cleanPkg,
      status: 'credited',
      note: Number(item.level) === 1 
        ? `प्रत्यक्ष (Direct Level 1) मानदेय: ${item.percentage}% (₹${creditAmount})`
        : `डाउनलाइन (Downline Level ${item.level}) मानदेय: ${item.percentage}% (₹${creditAmount})`,
      createdAt: nowReadable,
      timestamp: nowTimestamp
    };

    targetUser.walletBalance = newBal;
    targetUser.totalEarned = newEarned;
    distributedCount++;
    totalPaid += creditAmount;
  }

  const trustShareAmount = Math.max(0, cleanPkg - totalPaid);

  if (sourceMember.uid && allUsers[sourceMember.uid]) {
    updates[`/users/${sourceMember.uid}/selfBusiness`] = cleanPkg;
    updates[`/users/${sourceMember.uid}/selfBusinessCommission`] = 0; // STRICTLY 0%
  }

  // Ensure canonical locked rates in settings
  updates['/settings/levelRates'] = { ...DEFAULT_LEVEL_RATES };
  updates['/settings/selfBusinessRate'] = 0;

  if (Object.keys(updates).length > 0) {
    await update(ref(db), updates);
  }

  return {
    success: true,
    count: distributedCount,
    totalDistributed: totalPaid,
    directCommissionPaid,
    downlineCommissionPaid,
    trustShareAmount
  };
}

/**
 * Distribute canonical 12-level commission
 */
export async function distribute12LevelCommission(memberUidOrId, packageAmount) {
  try {
    const cleanPkg = parseAmount(packageAmount) || 500;
    const chain = await getUplineChain(memberUidOrId);
    const savedRates = await getSavedLevelRates();

    const usersSnap = await get(ref(db, 'users'));
    let sourceMember = { uid: memberUidOrId };
    if (usersSnap.exists()) {
      const allUsers = usersSnap.val();
      sourceMember = allUsers[memberUidOrId] || Object.values(allUsers).find(
        (u) => u.memberId === memberUidOrId || u.uid === memberUidOrId
      ) || { uid: memberUidOrId };
    }

    const manualList = chain.map((node) => {
      const pct = Number(savedRates[node.level] || DEFAULT_LEVEL_RATES[node.level] || 0);
      const amt = (cleanPkg * pct) / 100;
      return {
        level: node.level,
        uid: node.uid,
        memberId: node.memberId,
        name: node.name,
        percentage: pct,
        amount: amt,
        enabled: amt > 0
      };
    });

    return await distributeManualCommission({
      sourceMember,
      packageAmount: cleanPkg,
      manualDistributions: manualList
    });
  } catch (err) {
    console.error('distribute12LevelCommission error:', err);
    return { success: false, error: err.message, levelsDistributed: 0, totalDistributed: 0 };
  }
}

/**
 * Deterministic Live Tree Recalculation Engine
 */
export function calculateMemberTreeMetrics(member, allUsers = {}, levelRates = null, selfRate = 0) {
  return buildMember12LevelReport(member, allUsers);
}

/**
 * 1-Click Recalculate & Fix All Member Balances in Firebase Realtime Database
 * Fixes any ₹0, NaN, or mismatch across all members in /users
 */
export async function syncAndFixAllMemberBalances() {
  const usersSnap = await get(ref(db, 'users'));
  if (!usersSnap.exists()) return { success: false, message: 'No users found', updatedCount: 0 };

  const allUsers = usersSnap.val();
  const updates = {};
  let count = 0;

  Object.entries(allUsers).forEach(([uid, user]) => {
    if (!user) return;
    const report = buildMember12LevelReport(user, allUsers);

    const paid = Number(user.commissionPaid || user.paidPayout || user.totalWithdrawn || 0);
    const unpaid = Math.max(0, report.totalCommission - paid);
    const newWalletBalance = unpaid;

    updates[`/users/${uid}/selfBusiness`] = report.selfBusiness;
    updates[`/users/${uid}/totalBusiness`] = report.selfBusiness; // Sync totalBusiness = selfBusiness (never stale)
    updates[`/users/${uid}/selfBusinessCommission`] = 0; // STRICTLY 0%
    updates[`/users/${uid}/directBusiness`] = report.directBusiness;
    updates[`/users/${uid}/directTeamBusiness`] = report.directBusiness;
    updates[`/users/${uid}/directCommission`] = report.directCommission;
    updates[`/users/${uid}/directTeamCommission`] = report.directCommission;
    updates[`/users/${uid}/downlineBusiness`] = report.downlineBusiness;
    updates[`/users/${uid}/downlineCommission`] = report.downlineCommission;
    updates[`/users/${uid}/teamBusiness`] = report.totalTeamBusiness;
    updates[`/users/${uid}/totalCommission`] = report.totalCommission;
    updates[`/users/${uid}/totalEarned`] = report.totalCommission;
    updates[`/users/${uid}/commissionPaid`] = paid;
    updates[`/users/${uid}/paidPayout`] = paid;
    updates[`/users/${uid}/commissionUnpaid`] = unpaid;
    updates[`/users/${uid}/unpaidPayout`] = unpaid;
    updates[`/users/${uid}/commissionStatus`] = unpaid <= 0 && report.totalCommission > 0 ? 'Paid' : (paid > 0 ? 'Partial' : 'Unpaid');
    updates[`/users/${uid}/walletBalance`] = newWalletBalance;
    updates[`/users/${uid}/lastRecalculatedAt`] = new Date().toISOString();

    if (user.status !== 'blocked') {
      updates[`/users/${uid}/status`] = 'active';
      updates[`/users/${uid}/isApproved`] = true;
      updates[`/users/${uid}/paymentVerified`] = true;
      updates[`/users/${uid}/kycVerified`] = true;
    }

    const normalizedSp = normalizeSponsorId(user, allUsers);
    if (normalizedSp && normalizedSp !== user.sponsorId && normalizedSp !== 'DIRECT') {
      updates[`/users/${uid}/sponsorId`] = normalizedSp;
    }

    const tierVal = parseAmount(user) || 500;
    updates[`/users/${uid}/packageTier`] = tierVal;
    updates[`/users/${uid}/packageAmount`] = tierVal;

    count++;
  });

  // Ensure canonical rates are persisted in settings
  updates['/settings/levelRates'] = { ...DEFAULT_LEVEL_RATES };
  updates['/settings/selfBusinessRate'] = 0;

  if (Object.keys(updates).length > 0) {
    await update(ref(db), updates);
  }

  return {
    success: true,
    updatedCount: count,
    message: `Successfully recalculated and synchronized balances for ${count} members!`
  };
}

export const autoMigrateAndRecalculateUsers = syncAndFixAllMemberBalances;

export default {
  LOCKED_12_LEVEL_RATES,
  getSavedLevelRates,
  saveLevelRates,
  getSavedSelfBusinessRate,
  saveSelfBusinessRate,
  getUplineChain,
  distributeManualCommission,
  distribute12LevelCommission,
  calculateMemberTreeMetrics,
  buildMember12LevelReport,
  syncAndFixAllMemberBalances,
  autoMigrateAndRecalculateUsers
};
