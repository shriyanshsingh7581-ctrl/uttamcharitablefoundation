const fs = require('fs');

const path = 'src/utils/closingEngine.js';
let content = fs.readFileSync(path, 'utf8');

const target = `    const selfBiz = Number(user.selfBusiness ?? user.packageAmount ?? 500);
    const directBiz = Number(user.directBusiness ?? user.directTeamBusiness ?? 0);
    const downBiz = Number(user.downlineBusiness ?? 0);
    const teamBiz = Number(user.teamBusiness ?? (directBiz + downBiz));

    const selfComm = Number(user.selfBusinessCommission ?? 0);
    const directComm = Number(user.directTeamCommission ?? user.directCommission ?? 0);
    const downComm = Number(user.downlineCommission ?? 0);
    const totalComm = Number(user.totalCommission ?? (selfComm + directComm + downComm));

    const walletBal = Number(user.walletBalance ?? 0);
    // Trust / Foundation retained share on this member's team turnover
    const memberTrustShare = Math.max(0, (teamBiz + selfBiz) - totalComm);

    // Payout status is Pending if wallet balance >= ₹500, otherwise Settled/Paid
    const payoutStatus = walletBal >= 500 ? 'Pending' : 'Paid';

    const statement = {
      uid,
      memberId: user.memberId || 'UCWF-MEMBER',
      name: \`\${user.salutation || ''} \${user.name || ''}\`.trim() || 'सम्मानित सदस्य',
      phone: user.phone || '',
      padNaam: user.padNaam || 'सदस्य',
      closingDate: closingDate,
      selfBusiness: selfBiz,
      directTeamBusiness: directBiz,
      downlineBusiness: downBiz,
      teamBusiness: teamBiz,
      selfBusinessCommission: selfComm,
      directTeamCommission: directComm,
      downlineCommission: downComm,
      totalCommission: totalComm,
      trustShare: memberTrustShare,
      walletBalance: walletBal,
      payoutStatus: payoutStatus,
      timestamp: nowTimestamp,
      generatedAt: nowIso
    };

    statements[uid] = statement;

    // Daily closing statement under member's node
    updates[\`/daily_closings/\${closingDate}/statements/\${uid}\`] = statement;
    updates[\`/users/\${uid}/daily_closings/\${closingDate}\`] = statement;`;

const replacement = `    // Calculate deterministic tree metrics from live RTDB hierarchy
    const metrics = calculateMemberTreeMetrics(user, allUsers, levelRates, selfRate);

    const selfBiz = metrics.selfBusiness;
    const directBiz = metrics.directBusiness;
    const downBiz = metrics.downlineBusiness;
    const teamBiz = metrics.totalTeamBusiness;

    const selfComm = metrics.selfBusinessCommission;
    const directComm = metrics.directCommission;
    const downComm = metrics.downlineCommission;
    const totalComm = metrics.totalCommission;

    const withdrawn = Number(user.totalWithdrawn || 0);
    const walletBal = Math.max(0, totalComm - withdrawn);
    // Trust / Foundation retained share on this member's team turnover
    const memberTrustShare = Math.max(0, (teamBiz + selfBiz) - totalComm);

    // Payout status is Pending if wallet balance >= ₹500, otherwise Settled/Paid
    const payoutStatus = walletBal >= 500 ? 'Pending' : 'Paid';

    const statement = {
      uid,
      memberId: user.memberId || 'UCWF-MEMBER',
      name: \`\${user.salutation || ''} \${user.name || ''}\`.trim() || 'सम्मानित सदस्य',
      phone: user.phone || '',
      padNaam: user.padNaam || 'सदस्य',
      closingDate: closingDate,
      selfBusiness: selfBiz,
      directMembersCount: metrics.directMembersCount,
      directTeamBusiness: directBiz,
      downlineMembersCount: metrics.downlineMembersCount,
      downlineBusiness: downBiz,
      teamBusiness: teamBiz,
      selfBusinessCommission: selfComm,
      directTeamCommission: directComm,
      downlineCommission: downComm,
      totalCommission: totalComm,
      trustShare: memberTrustShare,
      walletBalance: walletBal,
      payoutStatus: payoutStatus,
      timestamp: nowTimestamp,
      generatedAt: nowIso
    };

    statements[uid] = statement;

    // Daily closing statement under member's node and global closing
    updates[\`/daily_closings/\${closingDate}/statements/\${uid}\`] = statement;
    updates[\`/users/\${uid}/daily_closings/\${closingDate}\`] = statement;
    updates[\`/users/\${uid}/walletBalance\`] = walletBal;
    updates[\`/users/\${uid}/totalCommission\`] = totalComm;
    updates[\`/users/\${uid}/totalEarned\`] = totalComm;
    updates[\`/users/\${uid}/selfBusiness\`] = selfBiz;
    updates[\`/users/\${uid}/directBusiness\`] = directBiz;
    updates[\`/users/\${uid}/downlineBusiness\`] = downBiz;
    updates[\`/users/\${uid}/teamBusiness\`] = teamBiz;`;

if (!content.includes(target)) {
  console.error('Target not found in closingEngine.js');
  process.exit(1);
}

content = content.replace(target, replacement);
fs.writeFileSync(path, content, 'utf8');
console.log('Successfully updated closingEngine.js with deterministic live tree metrics');
