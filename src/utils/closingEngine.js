import { rtdb, ref, get, update } from '../lib/firebase';
import {
  DEFAULT_LEVEL_RATES,
  round2,
  normalizeLevelRates,
  buildMember12LevelReport,
  getMemberFullName,
  parseAmount,
  parseAnyDateToEpochMs,
  epochMsToISTDateString,
  extractMemberJoinDateIST,
  formatMemberJoiningDate
} from './mlmUtils';

export {
  parseAnyDateToEpochMs,
  epochMsToISTDateString,
  extractMemberJoinDateIST,
  formatMemberJoiningDate
};

/**
 * Returns YYYY-MM-DD formatted date string in Indian Standard Time (IST, UTC+5:30).
 * Uses exact epoch math (+19,800,000 ms) so it is 100% deterministic across all browsers/timezones.
 */
export function getISTDateString(dateInput = null) {
  if (!dateInput) {
    return epochMsToISTDateString(Date.now());
  }
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
    return dateInput.trim();
  }
  const ms = parseAnyDateToEpochMs(dateInput);
  return epochMsToISTDateString(ms > 0 ? ms : Date.now());
}

/**
 * Calculates exact hours, minutes, seconds remaining until the next 12:00:00 AM (00:00 IST) midnight closing.
 * Uses pure UTC+5:30 epoch arithmetic so it never drifts or fails on non-US browser locales.
 */
export function getTimeUntilMidnightIST() {
  const nowUtcMs = Date.now();
  // IST is strictly UTC + 5 hours 30 minutes (+19,800,000 ms)
  const istEpochMs = nowUtcMs + 19800000;
  const dayMs = 86400000; // 24 * 60 * 60 * 1000
  const msIntoCurrentISTDay = ((istEpochMs % dayMs) + dayMs) % dayMs;
  const diffMs = Math.max(0, dayMs - msIntoCurrentISTDay);

  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  // Also compute current IST clock time for display if needed
  const currentISTTotalSec = Math.floor(msIntoCurrentISTDay / 1000);
  const curH24 = Math.floor(currentISTTotalSec / 3600);
  const curM = Math.floor((currentISTTotalSec % 3600) / 60);
  const curS = currentISTTotalSec % 60;
  const ampm = curH24 >= 12 ? 'PM' : 'AM';
  const curH12 = curH24 % 12 || 12;

  return {
    hours,
    minutes,
    seconds,
    diffMs,
    totalMs: diffMs,
    closingTimeLabel: '12:00 AM IST',
    currentISTDate: epochMsToISTDateString(nowUtcMs),
    currentISTTimeFormatted: `${String(curH12).padStart(2, '0')}:${String(curM).padStart(2, '0')}:${String(curS).padStart(2, '0')} ${ampm} IST`,
    clockFormatted: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
    formatted: `${String(hours).padStart(2, '0')}h : ${String(minutes).padStart(2, '0')}m : ${String(seconds).padStart(2, '0')}s`
  };
}

/**
 * Core 12:00 AM Daily Closing Engine
 * Uses the unified buildMember12LevelReport engine from mlmUtils.js so that:
 * 1. Every member's Self Business (0% self commission), Direct (L1 @ 20%), Downline (L2–L12 @ 30%),
 *    and Total Team Business / Commission match the rest of the portal 100%.
 * 2. Generates a complete daily closing statement for every active member under `/daily_closings/YYYY-MM-DD`.
 * 3. Updates global closing summary and lastClosingDate in `/settings/lastClosingDate`.
 */
export async function runDailyClosing(targetDateStr = null) {
  const closingDate = targetDateStr || getISTDateString();

  try {
    const [usersSnap, ratesSnap] = await Promise.all([
      get(ref(rtdb, 'users')),
      get(ref(rtdb, 'settings/levelRates'))
    ]);

    if (!usersSnap.exists()) {
      return { success: false, message: 'कोई सदस्य उपलब्ध नहीं है।', closingDate, count: 0 };
    }

    const users = usersSnap.val();
    const rates = normalizeLevelRates(ratesSnap.exists() ? ratesSnap.val() : DEFAULT_LEVEL_RATES);
    const totalRatePool = round2(
      Object.values(rates).reduce((acc, r) => acc + Number(r || 0), 0)
    );

    const updates = {};
    const memberStatements = {};

    let globalSelfBusiness = 0;
    let globalDirectBusiness = 0;
    let globalDownlineBusiness = 0;
    let globalTeamBusiness = 0;
    let globalSelfCommission = 0;
    let globalDirectCommission = 0;
    let globalDownlineCommission = 0;
    let globalTotalCommission = 0;
    let globalTrustShare = 0;
    let activeMembersCount = 0;

    Object.entries(users).forEach(([uid, u]) => {
      if (!u || u.status === 'blocked') return;

      const report = buildMember12LevelReport({ uid, ...u }, users, rates);
      const selfBiz = report.selfBusiness;
      const isActive = u.status === 'active' || selfBiz > 0;
      if (!isActive) return;

      activeMembersCount++;

      const directCount = report.directMembersCount;
      const directBiz = report.directBusiness;
      const directComm = report.directCommission;
      const downlineBiz = report.downlineBusiness;
      const downlineComm = report.downlineCommission;
      const teamCount = report.totalTeamMembers;
      const teamBiz = report.totalTeamBusiness;
      const selfComm = 0; // Strictly 0% self commission
      const totalComm = report.totalCommission;
      const paidPayout = report.paidPayout;
      const unpaidPayout = report.unpaidPayout;

      // Trust share on this member's personal package (50% retained for social welfare)
      const memberPackageDistributed = round2((selfBiz * totalRatePool) / 100);
      const trustShareFromSelfPkg = round2(Math.max(0, selfBiz - memberPackageDistributed));

      const payoutStatus =
        unpaidPayout <= 0 && paidPayout > 0 && totalComm > 0
          ? 'Paid'
          : unpaidPayout > 0
          ? 'Pending'
          : 'Settled';

      // Sync member's live fields in /users/{uid}
      updates[`/users/${uid}/selfBusiness`] = selfBiz;
      updates[`/users/${uid}/directCount`] = directCount;
      updates[`/users/${uid}/directMembersCount`] = directCount;
      updates[`/users/${uid}/directBusiness`] = directBiz;
      updates[`/users/${uid}/directTeamBusiness`] = directBiz;
      updates[`/users/${uid}/downlineMembersCount`] = report.downlineMembersCount;
      updates[`/users/${uid}/downlineBusiness`] = downlineBiz;
      updates[`/users/${uid}/teamCount`] = teamCount;
      updates[`/users/${uid}/teamBusiness`] = teamBiz;

      updates[`/users/${uid}/selfBusinessCommission`] = 0;
      updates[`/users/${uid}/directCommission`] = directComm;
      updates[`/users/${uid}/directTeamCommission`] = directComm;
      updates[`/users/${uid}/downlineCommission`] = downlineComm;
      updates[`/users/${uid}/totalCommission`] = totalComm;
      updates[`/users/${uid}/totalEarned`] = totalComm;
      updates[`/users/${uid}/commissionPaid`] = paidPayout;
      updates[`/users/${uid}/commissionUnpaid`] = unpaidPayout;
      updates[`/users/${uid}/lastClosingDate`] = closingDate;

      const statement = {
        uid,
        memberId: u.memberId || 'UCWF-MEMBER',
        name: getMemberFullName(u, 'सदस्य'),
        phone: u.phone || '',
        sponsorId: u.sponsorId || 'DIRECT',
        packageAmount: selfBiz,
        selfBusiness: selfBiz,
        directCount,
        directTeamBusiness: directBiz,
        downlineBusiness: downlineBiz,
        teamCount,
        teamBusiness: teamBiz,
        selfBusinessCommission: selfComm,
        directTeamCommission: directComm,
        downlineCommission: downlineComm,
        totalCommission: totalComm,
        paidPayout,
        unpaidPayout,
        walletBalance: unpaidPayout,
        totalWithdrawn: paidPayout,
        trustShare: trustShareFromSelfPkg,
        payoutStatus,
        closingDate,
        closedAt: new Date().toISOString(),
        timestamp: Date.now()
      };

      memberStatements[uid] = statement;
      updates[`/users/${uid}/closingHistory/${closingDate}`] = statement;

      globalSelfBusiness = round2(globalSelfBusiness + selfBiz);
      globalDirectBusiness = round2(globalDirectBusiness + directBiz);
      globalDownlineBusiness = round2(globalDownlineBusiness + downlineBiz);
      globalTeamBusiness = round2(globalTeamBusiness + teamBiz);
      globalSelfCommission = 0;
      globalDirectCommission = round2(globalDirectCommission + directComm);
      globalDownlineCommission = round2(globalDownlineCommission + downlineComm);
      globalTotalCommission = round2(globalTotalCommission + totalComm);
      globalTrustShare = round2(globalTrustShare + trustShareFromSelfPkg);
    });

    const dailyClosingSummary = {
      closingDate,
      closedAt: new Date().toISOString(),
      closingTimeLabel: '12:00 AM IST',
      timestamp: Date.now(),
      totalActiveMembers: activeMembersCount,
      totalSelfBusiness: globalSelfBusiness,
      totalDirectBusiness: globalDirectBusiness,
      totalDownlineBusiness: globalDownlineBusiness,
      totalTeamBusiness: globalTeamBusiness,
      totalSelfCommission: globalSelfCommission,
      totalDirectCommission: globalDirectCommission,
      totalDownlineCommission: globalDownlineCommission,
      totalCommission: globalTotalCommission,
      totalTrustShare: globalTrustShare,
      status: 'completed'
    };

    updates[`/daily_closings/${closingDate}/summary`] = dailyClosingSummary;
    updates[`/daily_closings/${closingDate}/statements`] = memberStatements;
    updates['/settings/lastClosingDate'] = closingDate;
    updates['/settings/lastClosingTimestamp'] = Date.now();

    await update(ref(rtdb), updates);

    return {
      success: true,
      closingDate,
      summary: dailyClosingSummary,
      count: activeMembersCount
    };
  } catch (err) {
    console.error('Daily closing error:', err);
    throw err;
  }
}

/**
 * Auto-check and trigger 12:00 AM IST midnight closing if today's date hasn't been closed yet
 */
export async function checkAndTriggerMidnightClosing() {
  try {
    const todayIST = getISTDateString();
    const lastClosingSnap = await get(ref(rtdb, 'settings/lastClosingDate'));
    const lastClosedDate = lastClosingSnap.exists() ? lastClosingSnap.val() : null;

    if (lastClosedDate !== todayIST) {
      return await runDailyClosing(todayIST);
    }
    return { success: true, alreadyClosed: true, closingDate: todayIST };
  } catch (err) {
    console.warn('Auto midnight closing check warning:', err);
    return { success: false, error: err.message };
  }
}

/**
 * One-Time Auto-Migration: Ensure all registered members with packageAmount > 0 are marked 'active'
 * and run daily closing calculation so all Self, Direct, Downline, Team & Commission figures are synced.
 */
export async function autoMigrateAndRecalculateUsers() {
  try {
    const snap = await get(ref(rtdb, 'users'));
    if (!snap.exists()) return;
    const users = snap.val();
    const updates = {};
    let needsUpdate = false;

    Object.entries(users).forEach(([uid, u]) => {
      if (!u) return;
      const pkg = parseAmount(u);
      if (pkg > 0 && u.status !== 'active' && u.status !== 'blocked') {
        updates[`/users/${uid}/status`] = 'active';
        updates[`/users/${uid}/isApproved`] = true;
        needsUpdate = true;
      }
      if (pkg > 0 && !u.selfBusiness) {
        updates[`/users/${uid}/selfBusiness`] = pkg;
        needsUpdate = true;
      }
    });

    if (needsUpdate) {
      await update(ref(rtdb), updates);
    }

    await runDailyClosing();
  } catch (err) {
    console.warn('Auto migration warning:', err);
  }
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

  await update(ref(rtdb), updates);
  return true;
}
