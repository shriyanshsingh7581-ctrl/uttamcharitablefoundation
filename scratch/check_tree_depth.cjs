const https = require('https');

https.get('https://login-416ce-default-rtdb.firebaseio.com/users.json', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const users = JSON.parse(data);
    
    // Find all users and their sponsors
    const list = Object.values(users).filter(Boolean);
    console.log(`Loaded ${list.length} users`);

    // Let's trace from company ID / roots
    const roots = list.filter(u => !u.sponsorId || u.sponsorId === 'DIRECT' || u.memberId === 'UCWF-0001' || u.memberId === 'UCWF-2026-0001');
    console.log('Roots found:', roots.map(r => `${r.memberId || r.phone} (${r.name})`));

    // Map each sponsor to their directs
    const directsMap = {};
    list.forEach(u => {
      const sp = (u.sponsorId || 'NONE').toUpperCase();
      if (!directsMap[sp]) directsMap[sp] = [];
      directsMap[sp].push(u);
    });

    console.log('\nSponsor keys count:', Object.keys(directsMap).length);
    Object.entries(directsMap).forEach(([sp, arr]) => {
      console.log(`- Sponsor ${sp} has ${arr.length} direct members: ${arr.map(m => m.memberId || m.name).join(', ')}`);
    });
  });
});
