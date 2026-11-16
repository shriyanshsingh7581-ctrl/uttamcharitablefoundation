import { db, ref, get, set, update, remove, auth, signInWithEmailAndPassword } from '../lib/firebase';
import { 
  getSavedSelfBusinessRate, 
  getSavedLevelRates, 
  buildMember12LevelReport,
  calculateMemberTreeMetrics 
} from './commission';
import { DEFAULT_LEVEL_RATES } from './mlmUtils';

/**
 * Returns YYYY-MM-DD formatted string in Indian Standard Time (IST - Asia/Kolkata)
 */
export function getISTDateString(d = new Date()) {
  try {
    const options = { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' };
    const formatter = new Intl.DateTimeFormat('en-CA', options); // en-CA produces YYYY-MM-DD
    return formatter.format(d);
  } catch {
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(d.getTime() + (d.getTimezoneOffset() * 60000) + istOffset);
    const yyyy = istDate.getFullYear();
    const mm = String(istDate.getMonth() + 1).padStart(2, '0');
    const dd = String(istDate.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
}

/**
 * Calculate exact time remaining until next 12:00:00 AM (Midnight IST)
 */
export function getTimeUntilMidnightIST() {
  const now = new Date();
  const istString = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  const istDate = new Date(istString);

  // Target next midnight (00:00:00)
  const nextMidnight = new Date(istDate);
  nextMidnight.setHours(24, 0, 0, 0);

  const diffMs = Math.max(0, nextMidnight.getTime() - istDate.getTime());
  const totalSec = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  return {
    diffMs,
    hours: String(hours).padStart(2, '0'),
    minutes: String(minutes).padStart(2, '0'),
    seconds: String(seconds).padStart(2, '0'),
    formatted: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  };
}

/**
 * Generate 12:00 AM Midnight Daily Closing Statement for all active members
 * Uses the exact buildMember12LevelReport traversal with locked 12-level rates (Total 50%).
 * @param {string|null} customDate - Optional YYYY-MM-DD, defaults to current IST date
 */
export async function runDailyClosing(customDate = null) {
  const closingDate = customDate || getISTDateString();
  const nowTimestamp = Date.now();
  const nowIso = new Date().toISOString();

  const usersSnap = await get(ref(db, 'users'));
  if (!usersSnap.exists()) {
    return {
      success: false,
      closingDate,
      message: 'No members found in database.',
      count: 0
    };
  }

  const allUsers = usersSnap.val();
  const statements = {};
  const updates = {};

  let totalActiveMembers = 0;
  let totalSelfBusiness = 0;
  let totalTeamBusiness = 0;
  let totalDownlineBusiness = 0;
  let totalDirectCommission = 0;
  let totalSelfCommission = 0;
  let totalDownlineCommission = 0;
  let totalCommissionDistributed = 0;
  let totalTrustShare = 0;
  let totalPendingPayouts = 0;

  for (const [uid, user] of Object.entries(allUsers)) {
    if (!user || user.status === 'blocked') continue;

    totalActiveMembers++;

    // Calculate deterministic 12-level report from live RTDB hierarchy
    const report = buildMember12LevelReport(user, allUsers);

    const selfBiz = report.selfBusiness;
    const directBiz = report.directBusiness;
    const downBiz = report.downlineBusiness;
    const teamBiz = report.totalTeamBusiness;

    const selfComm = 0; // STRICTLY 0% SELF COMMISSION
    const directComm = report.directCommission;
    const downComm = report.downlineCommission;
    const totalComm = report.totalCommission;

    const paidPayout = Number(user.commissionPaid || user.paidPayout || user.totalWithdrawn || 0);
    const unpaidPayout = Math.max(0, totalComm - paidPayout);
    const walletBal = unpaidPayout;

    // Trust / Foundation retained share on this member's team turnover (50%)
    const memberTrustShare = Math.max(0, (teamBiz + selfBiz) - totalComm);

    const payoutStatus = unpaidPayout > 0 ? 'Pending' : 'Paid';

    // Simplified level summary for storage
    const levelSummary = (report.levelBreakdown || []).map(lvl => ({
      level: lvl.level,
      rate: lvl.rate,
      count: lvl.count,
      business: lvl.business,
      commission: lvl.commission
    }));

    const statement = {
      uid,
      memberId: user.memberId || 'UCWF-MEMBER',
      name: `${user.salutation || ''} ${user.name || ''}`.trim() || 'सम्मानित सदस्य',
      phone: user.phone || '',
      padNaam: user.padNaam || 'सदस्य',
      closingDate: closingDate,
      selfBusiness: selfBiz,
      directMembersCount: report.directMembersCount,
      directTeamBusiness: directBiz,
      downlineMembersCount: report.downlineMembersCount,
      downlineBusiness: downBiz,
      teamBusiness: teamBiz,
      selfBusinessCommission: 0,
      directTeamCommission: directComm,
      downlineCommission: downComm,
      totalCommission: totalComm,
      paidPayout: paidPayout,
      unpaidPayout: unpaidPayout,
      levelBreakdown: levelSummary,
      trustShare: memberTrustShare,
      walletBalance: walletBal,
      payoutStatus: payoutStatus,
      timestamp: nowTimestamp,
      generatedAt: nowIso
    };

    statements[uid] = statement;

    // Daily closing statement under member's node and global closing
    updates[`/daily_closings/${closingDate}/statements/${uid}`] = statement;
    updates[`/users/${uid}/daily_closings/${closingDate}`] = statement;
    updates[`/users/${uid}/walletBalance`] = walletBal;
    updates[`/users/${uid}/totalCommission`] = totalComm;
    updates[`/users/${uid}/totalEarned`] = totalComm;
    updates[`/users/${uid}/selfBusiness`] = selfBiz;
    updates[`/users/${uid}/totalBusiness`] = selfBiz; // Keep totalBusiness synced with selfBusiness
    updates[`/users/${uid}/directBusiness`] = directBiz;
    updates[`/users/${uid}/directTeamBusiness`] = directBiz;
    updates[`/users/${uid}/directCommission`] = directComm;
    updates[`/users/${uid}/directTeamCommission`] = directComm;
    updates[`/users/${uid}/downlineBusiness`] = downBiz;
    updates[`/users/${uid}/downlineCommission`] = downComm;
    updates[`/users/${uid}/teamBusiness`] = teamBiz;
    updates[`/users/${uid}/commissionPaid`] = paidPayout;
    updates[`/users/${uid}/paidPayout`] = paidPayout;
    updates[`/users/${uid}/commissionUnpaid`] = unpaidPayout;
    updates[`/users/${uid}/unpaidPayout`] = unpaidPayout;
    updates[`/users/${uid}/commissionStatus`] = payoutStatus === 'Pending' ? (paidPayout > 0 ? 'Partial' : 'Unpaid') : 'Paid';

    // Totals accumulation
    totalSelfBusiness += selfBiz;
    totalTeamBusiness += teamBiz;
    totalDownlineBusiness += downBiz;
    totalDirectCommission += directComm;
    totalSelfCommission += selfComm;
    totalDownlineCommission += downComm;
    totalCommissionDistributed += totalComm;
    totalTrustShare += memberTrustShare;
    if (unpaidPayout > 0) {
      totalPendingPayouts += unpaidPayout;
    }
  }

  const summary = {
    closingDate,
    timestamp: nowTimestamp,
    generatedAt: nowIso,
    totalActiveMembers,
    totalSelfBusiness,
    totalTeamBusiness,
    totalDownlineBusiness,
    totalDirectCommission,
    totalSelfCommission,
    totalDownlineCommission,
    totalCommission: totalCommissionDistributed,
    totalTrustShare,
    totalPendingPayouts,
    status: 'completed'
  };

  updates[`/daily_closings/${closingDate}/summary`] = summary;
  updates[`/closings/${closingDate}`] = summary;
  updates['/settings/levelRates'] = { ...DEFAULT_LEVEL_RATES };
  updates['/settings/selfBusinessRate'] = 0;

  if (Object.keys(updates).length > 0) {
    await update(ref(db), updates);
  }

  return {
    success: true,
    closingDate,
    count: totalActiveMembers,
    summary,
    message: `Midnight daily closing for ${closingDate} executed successfully for ${totalActiveMembers} active members!`
  };
}

/**
 * Check if closing for today has already run, if not, execute automatically
 */
export async function checkAndTriggerMidnightClosing() {
  try {
    const today = getISTDateString();
    const snap = await get(ref(db, `daily_closings/${today}/summary`));
    if (!snap.exists()) {
      return await runDailyClosing(today);
    }
    return { success: true, alreadyRun: true, closingDate: today };
  } catch (err) {
    console.warn('Midnight closing check notice:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Fetch historical midnight closing statements for a specific member
 */
export async function getMemberDailyClosings(uid) {
  if (!uid) return [];
  try {
    const snap = await get(ref(db, `users/${uid}/daily_closings`));
    if (snap.exists()) {
      const data = snap.val();
      return Object.values(data).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    }
  } catch (err) {
    console.error('getMemberDailyClosings error:', err);
  }
  return [];
}

/**
 * Fetch global midnight closing summary for a specific date
 */
export async function getDailyClosingSummary(dateString) {
  try {
    const snap = await get(ref(db, `daily_closings/${dateString}/summary`));
    if (snap.exists()) {
      return snap.val();
    }
  } catch (err) {
    console.error('getDailyClosingSummary error:', err);
  }
  return null;
}

/**
 * Fetch all statements for a given date
 */
export async function getDailyClosingStatements(dateString) {
  try {
    const snap = await get(ref(db, `daily_closings/${dateString}/statements`));
    if (snap.exists()) {
      return Object.values(snap.val());
    }
  } catch (err) {
    console.error('getDailyClosingStatements error:', err);
  }
  return [];
}

/**
 * Delete a specific closing date statement from RTDB
 */
export async function deleteDailyClosing(dateString) {
  if (!dateString) return { success: false };
  try {
    await Promise.all([
      remove(ref(db, `daily_closings/${dateString}`)),
      remove(ref(db, `closings/${dateString}`))
    ]);

    // Also remove from members
    const usersSnap = await get(ref(db, 'users'));
    if (usersSnap.exists()) {
      const users = usersSnap.val();
      const updates = {};
      Object.keys(users).forEach(uid => {
        updates[`/users/${uid}/daily_closings/${dateString}`] = null;
      });
      if (Object.keys(updates).length > 0) {
        await update(ref(db), updates);
      }
    }

    return { success: true, message: `Closing data for ${dateString} deleted successfully.` };
  } catch (err) {
    console.error('deleteDailyClosing error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Clean & Reset Software Test Data while preserving canonical settings and root founder
 */
export async function cleanAndResetTestData() {
  try {
    const usersSnap = await get(ref(db, 'users'));
    if (usersSnap.exists()) {
      const users = usersSnap.val();
      const updates = {};
      Object.entries(users).forEach(([uid, u]) => {
        if (u.memberId === 'UCWF-0001' || u.phone === '9540648402' || u.role === 'admin' || u.is_admin) {
          // retain root sponsor / admin
        } else {
          updates[`/users/${uid}`] = null;
        }
      });
      updates['/payments'] = null;
      updates['/payment_requests'] = null;
      updates['/withdrawals'] = null;
      updates['/daily_closings'] = null;
      updates['/payout_logs'] = null;
      if (Object.keys(updates).length > 0) {
        await update(ref(db), updates);
      }
    }
    return { success: true };
  } catch (err) {
    console.error('cleanAndResetTestData error:', err);
    throw err;
  }
}

export default {
  getISTDateString,
  getTimeUntilMidnightIST,
  runDailyClosing,
  checkAndTriggerMidnightClosing,
  getMemberDailyClosings,
  getDailyClosingSummary,
  getDailyClosingStatements,
  deleteDailyClosing,
  cleanAndResetTestData
};
