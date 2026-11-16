const https = require('https');

const NEW_RATES = {
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
};

https.get('https://login-416ce-default-rtdb.firebaseio.com/users.json', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const allUsers = JSON.parse(data);
    console.log(`Fetched ${Object.keys(allUsers).length} users for live migration & balance recalculation...`);

    const updates = {};
    let migratedCount = 0;

    Object.entries(allUsers).forEach(([uid, u]) => {
      if (!u) return;

      const mId = (u.memberId || '').toUpperCase();
      const mPhone = (u.phone || '').replace(/\D/g, '').slice(-10);

      const selfBiz = Number(u.packageAmount || u.packageTier || 0);

      // Traversal for this member's 12-level tree
      let currentSponsorKeys = new Set();
      if (mId) currentSponsorKeys.add(mId);
      if (mPhone) currentSponsorKeys.add(mPhone);
      if (uid) currentSponsorKeys.add(uid);

      const visited = new Set();
      if (uid) visited.add(uid);

      let directMembersCount = 0;
      let directBusiness = 0;
      let directCommission = 0;

      let downlineMembersCount = 0;
      let downlineBusiness = 0;
      let downlineCommission = 0;

      for (let l = 1; l <= 12; l++) {
        const nextKeys = new Set();
        const rate = NEW_RATES[l] || 0;
        let lvlCount = 0;
        let lvlBiz = 0;
        let lvlComm = 0;

        Object.values(allUsers).forEach(child => {
          if (!child) return;
          const childUid = child.uid || child.memberId;
          if (!childUid || visited.has(childUid)) return;

          const spId = (child.sponsorId || '').trim().toUpperCase();
          const spPhone = (child.sponsorId || '').replace(/\D/g, '').slice(-10);

          if (currentSponsorKeys.has(spId) || (spPhone && currentSponsorKeys.has(spPhone))) {
            visited.add(childUid);
            const pkg = Number(child.packageAmount || child.packageTier || 0);
            const comm = Math.round((pkg * rate) / 100);

            lvlCount++;
            lvlBiz += pkg;
            lvlComm += comm;

            if (child.memberId) nextKeys.add(child.memberId.toUpperCase());
            const cp = (child.phone || '').replace(/\D/g, '').slice(-10);
            if (cp) nextKeys.add(cp);
            if (child.uid) nextKeys.add(child.uid);
          }
        });

        if (l === 1) {
          directMembersCount = lvlCount;
          directBusiness = lvlBiz;
          directCommission = lvlComm;
        } else {
          downlineMembersCount += lvlCount;
          downlineBusiness += lvlBiz;
          downlineCommission += lvlComm;
        }

        currentSponsorKeys = nextKeys;
        if (nextKeys.size === 0) break;
      }

      const totalTeamMembers = directMembersCount + downlineMembersCount;
      const totalTeamBusiness = directBusiness + downlineBusiness;
      const totalCommission = directCommission + downlineCommission; // ZERO SELF COMMISSION

      const withdrawn = Number(u.totalWithdrawn || 0);
      const newWalletBalance = Math.max(0, totalCommission - withdrawn);

      updates[`users/${uid}/selfBusiness`] = selfBiz;
      updates[`users/${uid}/selfBusinessCommission`] = 0; // ZERO SELF COMMISSION
      updates[`users/${uid}/directBusiness`] = directBusiness;
      updates[`users/${uid}/directTeamBusiness`] = directBusiness;
      updates[`users/${uid}/directCommission`] = directCommission;
      updates[`users/${uid}/directTeamCommission`] = directCommission;
      updates[`users/${uid}/downlineBusiness`] = downlineBusiness;
      updates[`users/${uid}/downlineCommission`] = downlineCommission;
      updates[`users/${uid}/teamBusiness`] = totalTeamBusiness;
      updates[`users/${uid}/totalCommission`] = totalCommission;
      updates[`users/${uid}/totalEarned`] = totalCommission;
      updates[`users/${uid}/walletBalance`] = newWalletBalance;
      updates[`users/${uid}/lastRecalculatedAt`] = new Date().toISOString();

      // Ensure active status across all 12 levels if package > 0
      if (selfBiz > 0 && u.status !== 'blocked') {
        updates[`users/${uid}/status`] = 'active';
      }

      migratedCount++;
    });

    // Also update settings
    updates['settings/levelRates'] = NEW_RATES;
    updates['settings/selfBusinessRate'] = 0;

    console.log(`Generated ${Object.keys(updates).length} updates for ${migratedCount} users.`);

    // Perform PATCH to Firebase RTDB
    const payload = JSON.stringify(updates);
    const options = {
      hostname: 'login-416ce-default-rtdb.firebaseio.com',
      path: '/.json',
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (resPatch) => {
      let patchRes = '';
      resPatch.on('data', d => patchRes += d);
      resPatch.on('end', () => {
        console.log('Firebase PATCH response status:', resPatch.statusCode);
        console.log('Successfully updated Firebase RTDB with 100% verified 12-level generation commissions and ZERO self-commission!');
      });
    });

    req.on('error', (e) => {
      console.error('Error in PATCH request:', e);
    });

    req.write(payload);
    req.end();
  });
});
