const https = require('https');

const NEW_LEVEL_RATES = {
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
    console.log('Calculating for all users with new 12-level rates & ZERO self-commission...');

    function calculateMetrics(member, users) {
      const mId = (member.memberId || '').toUpperCase();
      const mPhone = (member.phone || '').replace(/\D/g, '').slice(-10);
      const mUid = member.uid;

      const selfBiz = Number(member.packageAmount || member.packageTier || 0);
      const selfComm = 0; // STRICTLY ZERO SELF COMMISSION!

      let currentSponsorKeys = new Set();
      if (mId) currentSponsorKeys.add(mId);
      if (mPhone) currentSponsorKeys.add(mPhone);
      if (mUid) currentSponsorKeys.add(mUid);

      const visited = new Set();
      if (mUid) visited.add(mUid);

      const breakdown = [];
      let directCount = 0;
      let directBiz = 0;
      let directComm = 0;

      let downlineCount = 0;
      let downlineBiz = 0;
      let downlineComm = 0;

      for (let l = 1; l <= 12; l++) {
        const nextKeys = new Set();
        const rate = NEW_LEVEL_RATES[l] || 0;
        let lvlCount = 0;
        let lvlBiz = 0;
        let lvlComm = 0;

        Object.values(users).forEach(u => {
          if (!u) return;
          const uUid = u.uid || u.memberId;
          if (!uUid || visited.has(uUid)) return;

          const spId = (u.sponsorId || '').trim().toUpperCase();
          const spPhone = (u.sponsorId || '').replace(/\D/g, '').slice(-10);

          const isChild = currentSponsorKeys.has(spId) || (spPhone && currentSponsorKeys.has(spPhone));
          if (isChild) {
            visited.add(uUid);
            const pkg = Number(u.packageAmount || u.packageTier || 0);
            const comm = Math.round((pkg * rate) / 100);

            lvlCount++;
            lvlBiz += pkg;
            lvlComm += comm;

            if (u.memberId) nextKeys.add(u.memberId.toUpperCase());
            if (u.phone) {
              const cp = u.phone.replace(/\D/g, '').slice(-10);
              if (cp) nextKeys.add(cp);
            }
            if (u.uid) nextKeys.add(u.uid);
          }
        });

        breakdown.push({ level: l, rate, count: lvlCount, business: lvlBiz, commission: lvlComm });

        if (l === 1) {
          directCount = lvlCount;
          directBiz = lvlBiz;
          directComm = lvlComm;
        } else {
          downlineCount += lvlCount;
          downlineBiz += lvlBiz;
          downlineComm += lvlComm;
        }

        currentSponsorKeys = nextKeys;
        if (nextKeys.size === 0) {
          for (let rem = l + 1; rem <= 12; rem++) {
            breakdown.push({ level: rem, rate: NEW_LEVEL_RATES[rem] || 0, count: 0, business: 0, commission: 0 });
          }
          break;
        }
      }

      const totalTeamMembers = directCount + downlineCount;
      const totalTeamBiz = directBiz + downlineBiz;
      const totalComm = directComm + downlineComm; // ZERO self comm!

      return {
        selfBiz,
        selfComm,
        directCount,
        directBiz,
        directComm,
        downlineCount,
        downlineBiz,
        downlineComm,
        totalTeamMembers,
        totalTeamBiz,
        totalComm,
        breakdown
      };
    }

    // Test on Company Root (9540648402)
    const company = Object.values(allUsers).find(u => u.phone === '9540648402' || u.memberId === 'UCWF-0001');
    if (company) {
      const res = calculateMetrics(company, allUsers);
      console.log('\n=== COMPANY ROOT (UCWF-0001 / 9540648402) ===');
      console.log(`Direct Members: ${res.directCount}, Direct Biz: ₹${res.directBiz}, Direct Comm (20%): ₹${res.directComm}`);
      console.log(`Downline Members: ${res.downlineCount}, Downline Biz: ₹${res.downlineBiz}, Downline Comm: ₹${res.downlineComm}`);
      console.log(`Total Commission: ₹${res.totalComm}`);
      console.log('Breakdown:');
      res.breakdown.filter(b => b.count > 0).forEach(b => {
        console.log(`  L${b.level} (${b.rate}%): ${b.count} members, Biz: ₹${b.business}, Comm: ₹${b.commission}`);
      });
    }

    // Test on Shivam Kumar (UCWF-2026-7485)
    const shivam = Object.values(allUsers).find(u => u.memberId === 'UCWF-2026-7485');
    if (shivam) {
      const res = calculateMetrics(shivam, allUsers);
      console.log('\n=== SHIVAM KUMAR (UCWF-2026-7485) ===');
      console.log(`Self Business: ₹${res.selfBiz}, Self Comm: ₹${res.selfComm} (Must be 0!)`);
      console.log(`Direct Members: ${res.directCount}, Direct Biz: ₹${res.directBiz}, Direct Comm (20%): ₹${res.directComm}`);
      console.log(`Downline Members: ${res.downlineCount}, Downline Biz: ₹${res.downlineBiz}, Downline Comm: ₹${res.downlineComm}`);
      console.log(`Total Commission: ₹${res.totalComm}`);
      console.log('Breakdown:');
      res.breakdown.filter(b => b.count > 0).forEach(b => {
        console.log(`  L${b.level} (${b.rate}%): ${b.count} members, Biz: ₹${b.business}, Comm: ₹${b.commission}`);
      });
    }

    // Test on a member with 0 team
    const leaf = Object.values(allUsers).find(u => u.memberId === 'UCWF-2026-3620');
    if (leaf) {
      const res = calculateMetrics(leaf, allUsers);
      console.log(`\n=== LEAF MEMBER (UCWF-2026-3620) ===`);
      console.log(`Self Business: ₹${res.selfBiz}, Self Comm: ₹${res.selfComm}`);
      console.log(`Direct Members: ${res.directCount}, Direct Biz: ₹${res.directBiz}, Direct Comm: ₹${res.directComm}`);
      console.log(`Total Commission: ₹${res.totalComm} (Must be 0!)`);
    }
  });
});
