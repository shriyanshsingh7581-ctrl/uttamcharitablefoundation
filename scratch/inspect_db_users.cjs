const https = require('https');

https.get('https://login-416ce-default-rtdb.firebaseio.com/users.json', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const users = JSON.parse(data);
      console.log('Total users in DB:', Object.keys(users).length);
      const statuses = {};
      const packageAmounts = {};
      Object.entries(users).forEach(([uid, u]) => {
        const s = u.status || 'NO_STATUS';
        statuses[s] = (statuses[s] || 0) + 1;
        const p = u.packageAmount || u.packageTier || 0;
        packageAmounts[p] = (packageAmounts[p] || 0) + 1;
      });
      console.log('User statuses:', statuses);
      console.log('Package amounts:', packageAmounts);

      // Check users who are NOT active
      console.log('\nUsers not active:');
      Object.entries(users).forEach(([uid, u]) => {
        if (u.status !== 'active') {
          console.log(`- ${u.memberId || uid}: name=${u.name}, status=${u.status}, sponsor=${u.sponsorId}, pkg=${u.packageAmount || u.packageTier}`);
        }
      });
    } catch (e) {
      console.error(e);
    }
  });
}).on('error', err => console.error(err));
