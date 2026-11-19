/**
 * 100% Unified 12-Level Generation Commission Engine
 * Uttam Charitable Welfare Foundation (Regd. Section 8 Act 2013)
 *
 * Uses the unified MLM engine in `./mlmUtils.js` for:
 * - Unlimited width (infinite direct referrals per member)
 * - 12-level depth (Level 1 to Level 12)
 * - Strictly 0% self-commission on own package
 * - Universal sponsor resolution (Member ID, last 4+ digits, 10-digit phone, UID)
 */

import { db, ref, get, update, push, set } from '../lib/firebase';
import { whenAdapterReady } from '../lib/rtdbFirestoreAdapter';
import {
  DEFAULT_LEVEL_RATES,
  round2,
  normalizeLevelRates,
  buildMember12LevelReport,
  computeUnlimitedGenerationTree,
  getUplineChainFromMap,
  getMemberFullName,
  normalizeSponsorId,
  parseAmount,
  normId,
  lastDigits
} from './mlmUtils';

export { DEFAULT_LEVEL_RATES, normalizeLevelRates };

/**
 * Fetch saved Level 1 to 12 Commission Rates from Firebase RTDB (/settings/levelRates)
 * Always normalizes and heals stale/legacy rates to the canonical 50% structure.
 */
export async function getSavedLevelRates() {
  try {
    const snap = await get(ref(db, 'settings/levelRates'));
    if (snap.exists() && snap.val()) {
      return normalizeLevelRates(snap.val());
    }
  } catch (err) {
    console.warn('Could not fetch saved levelRates:', err);
  }
  return { ...DEFAULT_LEVEL_RATES };
}

/**
 * Self Business Commission Rate is strictly 0%
 */
export async function getSavedSelfBusinessRate() {
  return 0;
}

/**
 * Save manual Self Business Commission Rate in Firebase RTDB
 */
export async function saveSelfBusinessRate(rate) {
  const num = Math.max(0, Number(rate) || 0);
  await set(ref(db, 'settings/selfBusinessRate'), num);
  return num;
}

/**
 * Save manual Level 1 to 12 Commission Rates in Firebase RTDB (/settings/levelRates)
 */
export async function saveLevelRates(ratesMap) {
  const cleanRates = normalizeLevelRates(ratesMap);
  await set(ref(db, 'settings/levelRates'), cleanRates);
  return cleanRates;
}

/**
 * Trace up to 12 Upline Ancestors for a given Member ID or User UID
 */
export async function getUplineChain(startSponsorIdOrUid) {
  if (!startSponsorIdOrUid || startSponsorIdOrUid === 'DIRECT') return [];

  try {
    const usersSnap = await get(ref(db, 'users'));
    if (!usersSnap.exists()) return [];
    const allUsers = usersSnap.val();
    const rates = await getSavedLevelRates();

    const usersList = Object.entries(allUsers).map(([uid, data]) => ({
      uid,
      ...data
    }));

    const cleanQ = normId(startSponsorIdOrUid);
    const cleanPhone = lastDigits(startSponsorIdOrUid).slice(-10);

    // Check if startSponsorIdOrUid is a member whose upline we want
    const matchedMember = usersList.find(u => 
      normId(u.memberId) === cleanQ ||
      u.uid === startSponsorIdOrUid ||
      (cleanPhone.length === 10 && lastDigits(u.phone).slice(-10) === cleanPhone)
    );

    if (matchedMember) {
      // Build chain starting from matchedMember's sponsor (Level 1 .. 12)
      return getUplineChainFromMap(matchedMember, allUsers, rates);
    }

    // Or if startSponsorIdOrUid is the immediate sponsor itself, create a virtual child to trace up from sponsor as Level 1
    const virtualChild = {
      uid: '__virtual_child__',
      memberId: '__VIRTUAL__',
      sponsorId: startSponsorIdOrUid
    };
    return getUplineChainFromMap(virtualChild, allUsers, rates);
  } catch (err) {
    console.error('Error tracing upline chain:', err);
    return [];
  }
}

/**
 * Distribute 100% Manual Commission to Selected Upline Levels (Level 1 to 12)
 */
export async function distributeManualCommission({
  sourceMember,
  packageAmount,
  manualDistributions = [],
  isAuto = false
}) {
  const pkgAmount = round2(parseAmount(packageAmount));
  if (!pkgAmount || pkgAmount <= 0) {
    return { distributed: [], totalDistributed: 0, count: 0 };
  }

  try {
    const usersSnap = await get(ref(db, 'users'));
    const allUsers = usersSnap.exists() ? usersSnap.val() : {};

    const batchUpdates = {};
    const distributedRecords = [];
    let totalDistributed = 0;
    let directCommissionPaid = 0;
    let downlineCommissionPaid = 0;
    const nowIso = new Date().toISOString();
    const nowMs = Date.now();

    for (const item of manualDistributions) {
      const level = Number(item.level);
      const targetUid = item.uid;
      const ratePercentage = Number(item.percentage || 0);
      const rawAmount = item.amount !== undefined && item.amount !== ''
        ? round2(item.amount)
        : round2((pkgAmount * ratePercentage) / 100);

      if (!targetUid || !allUsers[targetUid] || isNaN(rawAmount) || rawAmount <= 0) {
        continue;
      }

      const uplineUser = allUsers[targetUid];
      const currentWallet = round2(uplineUser.walletBalance || 0);
      const currentTotalEarned = round2(uplineUser.totalEarned || 0);
      const currentTotalComm = round2(uplineUser.totalCommission || currentTotalEarned || 0);
      const currentTeamBiz = round2(uplineUser.teamBusiness || 0);
      const currentDownlineBiz = round2(uplineUser.downlineBusiness || 0);
      const currentDirectBiz = round2(uplineUser.directBusiness || uplineUser.directTeamBusiness || 0);
      const currentDirectComm = round2(uplineUser.directCommission || uplineUser.directTeamCommission || 0);
      const currentDownlineComm = round2(uplineUser.downlineCommission || 0);
      const currentPaid = round2(uplineUser.commissionPaid || uplineUser.paidPayout || uplineUser.totalWithdrawn || 0);

      const newTotalComm = round2(currentTotalComm + rawAmount);
      const newUnpaid = round2(Math.max(0, newTotalComm - currentPaid));

      // 1. Update upline wallet & lifetime earnings
      batchUpdates[`/users/${targetUid}/walletBalance`] = round2(currentWallet + rawAmount);
      batchUpdates[`/users/${targetUid}/totalEarned`] = round2(currentTotalEarned + rawAmount);
      batchUpdates[`/users/${targetUid}/totalCommission`] = newTotalComm;
      batchUpdates[`/users/${targetUid}/commissionUnpaid`] = newUnpaid;
      batchUpdates[`/users/${targetUid}/teamBusiness`] = round2(currentTeamBiz + pkgAmount);

      if (level === 1) {
        batchUpdates[`/users/${targetUid}/directBusiness`] = round2(currentDirectBiz + pkgAmount);
        batchUpdates[`/users/${targetUid}/directTeamBusiness`] = round2(currentDirectBiz + pkgAmount);
        batchUpdates[`/users/${targetUid}/directCommission`] = round2(currentDirectComm + rawAmount);
        batchUpdates[`/users/${targetUid}/directTeamCommission`] = round2(currentDirectComm + rawAmount);
        directCommissionPaid = round2(directCommissionPaid + rawAmount);
      } else {
        batchUpdates[`/users/${targetUid}/downlineBusiness`] = round2(currentDownlineBiz + pkgAmount);
        batchUpdates[`/users/${targetUid}/downlineCommission`] = round2(currentDownlineComm + rawAmount);
        downlineCommissionPaid = round2(downlineCommissionPaid + rawAmount);
      }

      // 2. Log transaction
      const txRef = push(ref(db, 'transactions'));
      const txId = txRef.key;
      const sourceName = getMemberFullName(sourceMember, 'नव सदस्य');

      const txRecord = {
        id: txId,
        userId: targetUid,
        memberId: uplineUser.memberId || 'UCWF-MEMBER',
        userName: getMemberFullName(uplineUser),
        sourceUserId: sourceMember?.uid || '',
        sourceMemberId: sourceMember?.memberId || '',
        sourceMemberName: sourceName,
        type: 'level_commission',
        mode: 'manual_admin',
        level,
        ratePercentage,
        packageAmount: pkgAmount,
        amount: rawAmount,
        note: `स्तर ${level} मानदेय (${ratePercentage}%): ${sourceName} (${sourceMember?.memberId || 'ID'}) के ₹${pkgAmount} सहयोग संकल्प से प्राप्त`,
        status: 'credited',
        createdAt: nowIso,
        timestamp: nowMs
      };

      batchUpdates[`/transactions/${txId}`] = txRecord;
      distributedRecords.push(txRecord);
      totalDistributed = round2(totalDistributed + rawAmount);
    }

    // 3. Ensure sourceMember selfBusiness is recorded with 0% self commission
    if (sourceMember?.uid && allUsers[sourceMember.uid]) {
      const srcUser = allUsers[sourceMember.uid];
      const srcPaid = round2(srcUser.commissionPaid || srcUser.paidPayout || srcUser.totalWithdrawn || 0);
      const srcTotalComm = round2(srcUser.totalCommission || 0);
      batchUpdates[`/users/${sourceMember.uid}/selfBusiness`] = pkgAmount;
      batchUpdates[`/users/${sourceMember.uid}/packageAmount`] = pkgAmount;
      batchUpdates[`/users/${sourceMember.uid}/packageTier`] = pkgAmount;
      batchUpdates[`/users/${sourceMember.uid}/selfBusinessCommission`] = 0;
      batchUpdates[`/users/${sourceMember.uid}/commissionUnpaid`] = round2(Math.max(0, srcTotalComm - srcPaid));
      batchUpdates[`/users/${sourceMember.uid}/status`] = 'active';
      batchUpdates[`/users/${sourceMember.uid}/isApproved`] = true;
    }

    // 4. Record master payout ledger entry
    const trustShare = round2(Math.max(0, pkgAmount - totalDistributed));
    const payoutRef = push(ref(db, 'payout_records'));
    const payoutId = payoutRef.key;

    batchUpdates[`/payout_records/${payoutId}`] = {
      id: payoutId,
      sourceUserId: sourceMember?.uid || '',
      sourceMemberId: sourceMember?.memberId || 'N/A',
      sourceMemberName: getMemberFullName(sourceMember, 'सदस्य'),
      amount: pkgAmount,
      packageAmount: pkgAmount,
      directCommission: directCommissionPaid,
      downlineCommission: downlineCommissionPaid,
      totalDistributed,
      trustShare,
      levelsCount: distributedRecords.length,
      distributions: distributedRecords,
      autoDistributed: Boolean(isAuto),
      createdAt: nowIso,
      timestamp: nowMs
    };

    if (Object.keys(batchUpdates).length > 0) {
      await update(ref(db), batchUpdates);
    }

    return {
      distributed: distributedRecords,
      totalDistributed,
      directCommissionPaid,
      downlineCommissionPaid,
      trustShare,
      count: distributedRecords.length
    };
  } catch (err) {
    console.error('Manual commission distribution failed:', err);
    throw err;
  }
}

/**
 * Automatically Distribute 12-Level Generation Commission on Registration / Activation
 */
export async function distribute12LevelCommission(memberUidOrId, packageAmount, options = {}) {
  try {
    const usersSnap = await get(ref(db, 'users'));
    if (!usersSnap.exists()) return { totalDistributed: 0, count: 0 };

    const allUsers = usersSnap.val();
    const rates = await getSavedLevelRates();

    let sourceMember = allUsers[memberUidOrId];
    if (!sourceMember) {
      const foundEntry = Object.entries(allUsers).find(
        ([, u]) => u && normId(u.memberId) === normId(memberUidOrId)
      );
      if (foundEntry) {
        sourceMember = { uid: foundEntry[0], ...foundEntry[1] };
      }
    } else {
      sourceMember = { uid: memberUidOrId, ...sourceMember };
    }

    if (!sourceMember) return { totalDistributed: 0, count: 0 };

    const pkg = round2(parseAmount(packageAmount || sourceMember));

    if (!options.force) {
      const payoutsSnap = await get(ref(db, 'payout_records'));
      if (payoutsSnap.exists()) {
        const existingPayouts = Object.values(payoutsSnap.val() || {});
        const alreadyDistributed = existingPayouts.some(
          (rec) =>
            rec &&
            (rec.sourceUserId === sourceMember.uid ||
              (sourceMember.memberId && normId(rec.sourceMemberId) === normId(sourceMember.memberId))) &&
            round2(rec.packageAmount || rec.amount) === pkg &&
            rec.autoDistributed === true
        );
        if (alreadyDistributed) {
          await syncAndFixAllMemberBalances();
          return { totalDistributed: 0, count: 0, skippedDuplicate: true };
        }
      }
    }

    const chain = getUplineChainFromMap(sourceMember, allUsers, rates);

    const distributions = chain.map(node => ({
      level: node.level,
      uid: node.uid,
      percentage: node.rate,
      amount: round2((pkg * node.rate) / 100)
    }));

    const result = await distributeManualCommission({
      sourceMember,
      packageAmount: pkg,
      manualDistributions: distributions,
      isAuto: true
    });

    await syncAndFixAllMemberBalances();
    return result;
  } catch (err) {
    console.error('distribute12LevelCommission error:', err);
    return { totalDistributed: 0, count: 0 };
  }
}

/**
 * Pure Synchronous Helper for Live 12-Level Tree Metrics
 * Delegates directly to buildMember12LevelReport in mlmUtils.js
 */
export function calculateMemberTreeMetrics(member, allUsers = {}, levelRates = null, selfRate = 0) {
  return buildMember12LevelReport(member, allUsers, levelRates);
}

/**
 * 1-Click Recalculate & Fix All Member Commission Balances in Firebase RTDB
 */
export async function syncAndFixAllMemberBalances() {
  await whenAdapterReady();
  const usersSnap = await get(ref(db, 'users'));
  if (!usersSnap.exists()) {
    return { updatedCount: 0, message: 'No users found in database.' };
  }

  const allUsers = usersSnap.val();
  const rates = await getSavedLevelRates();
  const updates = {};
  let updatedCount = 0;

  const setIfChanged = (path, val, prev) => {
    if (prev !== val) {
      updates[path] = val;
      return true;
    }
    return false;
  };

  Object.entries(allUsers).forEach(([uid, u]) => {
    if (!u) return;
    const report = buildMember12LevelReport({ uid, ...u }, allUsers, rates);
    let userModified = false;

    const canonicalSponsor = normalizeSponsorId(u, allUsers);
    if (canonicalSponsor && canonicalSponsor !== 'DIRECT' && canonicalSponsor !== u.sponsorId) {
      updates[`/users/${uid}/sponsorId`] = canonicalSponsor;
      userModified = true;
    }

    if (u.status !== 'blocked') {
      if (setIfChanged(`/users/${uid}/status`, 'active', u.status)) userModified = true;
      if (setIfChanged(`/users/${uid}/isApproved`, true, u.isApproved)) userModified = true;
    }

    const expectedStatus =
      report.unpaidPayout <= 0 && report.paidPayout > 0 && report.totalCommission > 0
        ? 'Paid'
        : report.paidPayout > 0
        ? 'Partial'
        : 'Unpaid';

    const pairs = [
      ['selfBusiness', report.selfBusiness],
      ['packageAmount', report.selfBusiness],
      ['packageTier', report.selfBusiness],
      ['selfBusinessCommission', 0],
      ['directMembersCount', report.directMembersCount],
      ['directCount', report.directMembersCount],
      ['directBusiness', report.directBusiness],
      ['directTeamBusiness', report.directBusiness],
      ['directCommission', report.directCommission],
      ['directTeamCommission', report.directCommission],
      ['downlineMembersCount', report.downlineMembersCount],
      ['downlineBusiness', report.downlineBusiness],
      ['downlineCommission', report.downlineCommission],
      ['teamCount', report.totalTeamMembers],
      ['teamBusiness', report.totalTeamBusiness],
      ['totalCommission', report.totalCommission],
      ['totalEarned', report.totalCommission],
      ['commissionPaid', report.paidPayout],
      ['commissionUnpaid', report.unpaidPayout],
      ['walletBalance', report.unpaidPayout],
      ['commissionStatus', expectedStatus],
    ];

    for (const [k, v] of pairs) {
      if (setIfChanged(`/users/${uid}/${k}`, v, u[k])) {
        userModified = true;
      }
    }

    if (userModified) updatedCount++;
  });

  if (Object.keys(updates).length > 0) {
    await update(ref(db), updates);
  }

  return {
    updatedCount,
    message: `Successfully recalculated & synced ${updatedCount} member balances (12-Level 50% Pool, 0% Self Commission).`
  };
}

/**
 * Clean & Reset All Software Test Data in Firebase RTDB
 */
export async function cleanAndResetTestData() {
  const updates = {};
  updates['/users'] = null;
  updates['/payment_requests'] = null;
  updates['/withdrawals'] = null;
  updates['/daily_closings'] = null;
  updates['/closings'] = null;
  updates['/transactions'] = null;
  updates['/payout_records'] = null;

  updates['/settings/levelRates'] = { ...DEFAULT_LEVEL_RATES };
  updates['/settings/selfBusinessRate'] = 0;

  const rootUid = 'root_sponsor_ucwf_0001';
  updates[`/users/${rootUid}`] = {
    uid: rootUid,
    memberId: 'UCWF-0001',
    salutation: 'डॉ.',
    name: 'राजेन्द्र सिंह सैनी',
    displayName: 'डॉ. राजेन्द्र सिंह सैनी',
    email: 'uttamcharitablewelfarefoundati@gmail.com',
    phone: '9540648402',
    sponsorId: 'DIRECT',
    role: 'admin',
    designation: 'संस्थापक / राष्ट्रीय अध्यक्ष',
    padNaam: 'संस्थापक / राष्ट्रीय अध्यक्ष',
    packageAmount: 11000,
    packageTier: 11000,
    selfBusiness: 11000,
    walletBalance: 0,
    totalCommission: 0,
    commissionPaid: 0,
    commissionUnpaid: 0,
    status: 'active',
    isApproved: true,
    createdAt: new Date().toISOString(),
    timestamp: Date.now()
  };

  await update(ref(db), updates);
  return true;
}

/**
 * One-Time Auto-Migration & Recalculation Helper
 */
export async function autoMigrateAndRecalculateUsers() {
  try {
    await syncAndFixAllMemberBalances();
  } catch (err) {
    console.warn('Auto migration note:', err);
  }
}

export default {
  DEFAULT_LEVEL_RATES,
  normalizeLevelRates,
  getSavedLevelRates,
  getSavedSelfBusinessRate,
  saveSelfBusinessRate,
  saveLevelRates,
  getUplineChain,
  distributeManualCommission,
  distribute12LevelCommission,
  calculateMemberTreeMetrics,
  syncAndFixAllMemberBalances,
  autoMigrateAndRecalculateUsers,
  cleanAndResetTestData
};
