const fs = require('fs');

let content = fs.readFileSync('src/utils/closingEngine.js', 'utf8');

// Replace CRLF to LF
content = content.replace(/\r\n/g, '\n');

const startMarker = "    const selfBiz = Number(user.selfBusiness ?? user.packageAmount ?? 500);";
const endMarker = "    updates[`/users/${uid}/daily_closings/${closingDate}`] = statement;";

const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker, startIdx);

if (startIdx === -1 || endIdx === -1) {
  console.error('Markers not found: startIdx=' + startIdx + ' endIdx=' + endIdx);
  process.exit(1);
}

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

content = content.substring(0, startIdx) + replacement + content.substring(endIdx + endMarker.length);

fs.writeFileSync('src/utils/closingEngine.js', content, 'utf8');
console.log('Successfully updated closingEngine.js with deterministic live tree recalculation!');
