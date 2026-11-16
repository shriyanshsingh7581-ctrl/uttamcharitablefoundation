const fs = require('fs');

const path = 'src/utils/commission.js';
let content = fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n');

// 1. Update default rates in getSavedLevelRates
const oldRates = `  // Default rates if none saved yet
  return {
    1: 20,
    2: 10,
    3: 8,
    4: 6,
    5: 5,
    6: 4,
    7: 3,
    8: 2,
    9: 2,
    10: 2,
    11: 1,
    12: 1
  };`;

const newRates = `  // Exact 12-Level Generation Commission Rates (Client Confirmed Spec)
  return {
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
    12: 1
  };`;

if (content.includes(oldRates)) {
  content = content.replace(oldRates, newRates);
  console.log('1. Updated getSavedLevelRates default rates');
}

// 2. getSavedSelfBusinessRate -> returns 0
const oldSelfRate = `export async function getSavedSelfBusinessRate() {
  try {
    const snap = await get(ref(db, 'settings/selfBusinessRate'));
    if (snap.exists()) {
      return Number(snap.val() || 0);
    }
  } catch (err) {
    console.warn('Could not fetch saved selfBusinessRate:', err);
  }
  return 5; // Default 5% Self Business incentive
}`;

const newSelfRate = `export async function getSavedSelfBusinessRate() {
  // STRICTLY ZERO COMMISSION ON OWN DONATION / FORM
  return 0;
}`;

if (content.includes(oldSelfRate)) {
  content = content.replace(oldSelfRate, newSelfRate);
  console.log('2. Updated getSavedSelfBusinessRate to 0');
}

// 3. In distribute12LevelCommission, do NOT give self commission
const oldDistributeSelf = `  // Sync source member's Self Business and calculate Self Business Commission
  if (sourceMember.uid && allUsers[sourceMember.uid]) {
    const srcUser = allUsers[sourceMember.uid];
    const srcSelfBiz = Number(srcUser.selfBusiness || packageAmount);
    updates[\`/users/\${sourceMember.uid}/selfBusiness\`] = srcSelfBiz;

    const selfRate = await getSavedSelfBusinessRate();
    const selfComm = Number(srcUser.selfBusinessCommission || Math.round((srcSelfBiz * selfRate) / 100));
    updates[\`/users/\${sourceMember.uid}/selfBusinessCommission\`] = selfComm;

    const srcDirectComm = Number(srcUser.directTeamCommission || srcUser.directCommission || 0);
    const srcDownComm = Number(srcUser.downlineCommission || 0);
    updates[\`/users/\${sourceMember.uid}/totalCommission\`] = selfComm + srcDirectComm + srcDownComm;
  }`;

const newDistributeSelf = `  // Sync source member's Self Business (Strictly 0 commission on own donation)
  if (sourceMember.uid && allUsers[sourceMember.uid]) {
    const srcUser = allUsers[sourceMember.uid];
    const srcSelfBiz = Number(srcUser.selfBusiness || packageAmount);
    updates[\`/users/\${sourceMember.uid}/selfBusiness\`] = srcSelfBiz;
    updates[\`/users/\${sourceMember.uid}/selfBusinessCommission\`] = 0; // ZERO SELF COMMISSION ALWAYS

    const srcDirectComm = Number(srcUser.directTeamCommission || srcUser.directCommission || 0);
    const srcDownComm = Number(srcUser.downlineCommission || 0);
    updates[\`/users/\${sourceMember.uid}/totalCommission\`] = srcDirectComm + srcDownComm;
  }`;

if (content.includes(oldDistributeSelf)) {
  content = content.replace(oldDistributeSelf, newDistributeSelf);
  console.log('3. Updated distribute12LevelCommission self-commission to 0');
}

// 4. Update calculateMemberTreeMetrics
const oldTreeRecalc = `  const defaultRates = [20, 10, 8, 6, 5, 4, 3, 2, 2, 2, 1, 1];
  const rates = levelRates || defaultRates;

  const mId = (member.memberId || '').toUpperCase();
  const mPhone = (member.phone || '').replace(/\\D/g, '').slice(-10);
  const mUid = member.uid;

  const selfBiz = Number(member.packageAmount || member.packageTier || 0);
  const selfComm = Number(selfRate) > 0 ? Math.round((selfBiz * Number(selfRate)) / 100) : 0;`;

const newTreeRecalc = `  const defaultRates = [20, 8, 5, 4, 3, 2.5, 2, 1.5, 1, 1, 1, 1];
  const rates = levelRates || defaultRates;

  const mId = (member.memberId || '').toUpperCase();
  const mPhone = (member.phone || '').replace(/\\D/g, '').slice(-10);
  const mUid = member.uid;

  const selfBiz = Number(member.packageAmount || member.packageTier || 0);
  const selfComm = 0; // STRICTLY ZERO COMMISSION ON OWN DONATION / FORM`;

if (content.includes(oldTreeRecalc)) {
  content = content.replace(oldTreeRecalc, newTreeRecalc);
  console.log('4. Updated calculateMemberTreeMetrics selfComm to 0 and default rates');
}

const oldTotalCalc = `  const totalTeamMembers = directMembersCount + downlineMembersCount;
  const totalTeamBusiness = directBusiness + downlineBusiness;
  const totalCommission = selfComm + directCommission + downlineCommission;`;

const newTotalCalc = `  const totalTeamMembers = directMembersCount + downlineMembersCount;
  const totalTeamBusiness = directBusiness + downlineBusiness;
  const totalCommission = directCommission + downlineCommission; // ZERO SELF COMMISSION`;

if (content.includes(oldTotalCalc)) {
  content = content.replace(oldTotalCalc, newTotalCalc);
  console.log('5. Updated totalCommission formula in calculateMemberTreeMetrics');
}

// 5. Update syncAndFixAllMemberBalances to also set status: 'active' for members with package
const oldSyncUpdates = `    updates[\`/users/\${uid}/selfBusiness\`] = metrics.selfBusiness;
    updates[\`/users/\${uid}/selfBusinessCommission\`] = metrics.selfBusinessCommission;
    updates[\`/users/\${uid}/directBusiness\`] = metrics.directBusiness;
    updates[\`/users/\${uid}/directTeamBusiness\`] = metrics.directBusiness;
    updates[\`/users/\${uid}/directCommission\`] = metrics.directCommission;
    updates[\`/users/\${uid}/directTeamCommission\`] = metrics.directCommission;
    updates[\`/users/\${uid}/downlineBusiness\`] = metrics.downlineBusiness;
    updates[\`/users/\${uid}/downlineCommission\`] = metrics.downlineCommission;
    updates[\`/users/\${uid}/teamBusiness\`] = metrics.totalTeamBusiness;
    updates[\`/users/\${uid}/totalCommission\`] = metrics.totalCommission;
    updates[\`/users/\${uid}/totalEarned\`] = metrics.totalCommission;
    updates[\`/users/\${uid}/walletBalance\`] = newWalletBalance;
    updates[\`/users/\${uid}/lastRecalculatedAt\`] = new Date().toISOString();`;

const newSyncUpdates = `    updates[\`/users/\${uid}/selfBusiness\`] = metrics.selfBusiness;
    updates[\`/users/\${uid}/selfBusinessCommission\`] = 0; // ZERO SELF COMMISSION
    updates[\`/users/\${uid}/directBusiness\`] = metrics.directBusiness;
    updates[\`/users/\${uid}/directTeamBusiness\`] = metrics.directBusiness;
    updates[\`/users/\${uid}/directCommission\`] = metrics.directCommission;
    updates[\`/users/\${uid}/directTeamCommission\`] = metrics.directCommission;
    updates[\`/users/\${uid}/downlineBusiness\`] = metrics.downlineBusiness;
    updates[\`/users/\${uid}/downlineCommission\`] = metrics.downlineCommission;
    updates[\`/users/\${uid}/teamBusiness\`] = metrics.totalTeamBusiness;
    updates[\`/users/\${uid}/totalCommission\`] = metrics.totalCommission;
    updates[\`/users/\${uid}/totalEarned\`] = metrics.totalCommission;
    updates[\`/users/\${uid}/walletBalance\`] = newWalletBalance;
    updates[\`/users/\${uid}/lastRecalculatedAt\`] = new Date().toISOString();

    // Auto-activate all members with active package across all 12 levels
    if (Number(user.packageAmount || user.packageTier || 0) > 0 && user.status !== 'blocked') {
      updates[\`/users/\${uid}/status\`] = 'active';
    }`;

if (content.includes(oldSyncUpdates)) {
  content = content.replace(oldSyncUpdates, newSyncUpdates);
  console.log('6. Updated syncAndFixAllMemberBalances updates');
}

// Ensure settings/levelRates is updated in syncAndFixAllMemberBalances
const oldBeforeWrite = `  if (Object.keys(updates).length > 0) {
    await update(ref(db), updates);
  }`;

const newBeforeWrite = `  // Enforce locked 12-level rates & 0 self-rate in settings
  updates['/settings/levelRates'] = {
    1: 20, 2: 8, 3: 5, 4: 4, 5: 3, 6: 2.5, 7: 2, 8: 1.5, 9: 1, 10: 1, 11: 1, 12: 1
  };
  updates['/settings/selfBusinessRate'] = 0;

  if (Object.keys(updates).length > 0) {
    await update(ref(db), updates);
  }`;

if (content.includes(oldBeforeWrite)) {
  content = content.replace(oldBeforeWrite, newBeforeWrite);
  console.log('7. Added settings/levelRates update in sync');
}

// Add autoMigrateAndRecalculateUsers export
if (!content.includes('autoMigrateAndRecalculateUsers')) {
  content += `\nexport async function autoMigrateAndRecalculateUsers() {\n  return await syncAndFixAllMemberBalances();\n}\n`;
  console.log('8. Added autoMigrateAndRecalculateUsers export');
}

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully updated commission.js!');
