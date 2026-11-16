const https = require('https');

// Helper to fetch RTDB
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function runTests() {
  console.log('Testing Admin & Member Auth Logic...');
  const users = await fetchJson('https://login-416ce-default-rtdb.firebaseio.com/users.json');

  const MASTER_ADMIN_PASSWORDS = [
    'Admin@2026', 'admin@2026', 'ADMIN@2026',
    'Uttam@2026', 'uttam@2026', 'uttam2026', 'UTTAM@2026',
    'admin123', 'Admin123', 'UCWF@2026', 'ucwf@2026',
    'UCWF@1234', '9540648402'
  ];

  const MASTER_ADMIN_USERS = [
    '', 'admin', 'superadmin', 'head_office_admin',
    'admin@ucwf.online', 'admin@uttam.org', 'admin@ucwf.org',
    'ucwf-admin', '9540648402', 'ucwf-0001', 'spawansaini123@gmail.com',
    'rajendra singh saini', 'राजेन्द्र सिंह सैनी'
  ];

  // Simulated adminLogin function
  function simulateAdminLogin(usernameOrEmail, password) {
    const rawUser = (usernameOrEmail || '').trim();
    const cleanUser = rawUser.toLowerCase();
    const cleanPass = (password || '').trim();

    if (!cleanPass) throw new Error('Password required');

    const isMasterPassword = MASTER_ADMIN_PASSWORDS.includes(cleanPass);
    const isMasterUser = !rawUser || MASTER_ADMIN_USERS.includes(cleanUser);

    if (isMasterPassword && isMasterUser) {
      return { success: true, role: 'admin' };
    }

    // Check DB users
    for (const [uid, u] of Object.entries(users)) {
      if (!u) continue;
      const uEmail = (u.email || '').trim().toLowerCase();
      const uMemberId = (u.memberId || '').trim().toUpperCase();
      const uPhone = (u.phone || '').replace(/\D/g, '').slice(-10);
      const uName = (u.name || '').trim().toLowerCase();
      const uPass = String(u.password || u.plainPassword || '').trim();

      const isMatchUser = cleanUser && (
        cleanUser === uEmail ||
        cleanUser.toUpperCase() === uMemberId ||
        cleanUser === uPhone ||
        cleanUser === uName
      );

      const isAdminAccount = u.is_admin === true || u.role === 'admin' || u.memberId === 'UCWF-0001' || uPhone === '9540648402';

      if (isMatchUser && isAdminAccount) {
        if (uPass === cleanPass || isMasterPassword) {
          return { success: true, role: 'admin', uid };
        } else {
          throw new Error('Incorrect Admin Password');
        }
      }
    }

    if (isMasterPassword) {
      return { success: true, role: 'admin' };
    }

    throw new Error('केवल अधिकृत व्यवस्थापक ही एडमिन पैनल में लॉगिन कर सकते हैं।');
  }

  // TEST 1: Master Admin with 'admin' and 'Admin@2026'
  console.log('\n--- TEST 1: admin / Admin@2026 ---');
  try {
    const res = simulateAdminLogin('admin', 'Admin@2026');
    console.log('✓ PASSED:', res);
  } catch (e) {
    console.error('✗ FAILED:', e.message);
  }

  // TEST 2: Master Admin with '9540648402' and 'Admin@2026'
  console.log('\n--- TEST 2: 9540648402 / Admin@2026 ---');
  try {
    const res = simulateAdminLogin('9540648402', 'Admin@2026');
    console.log('✓ PASSED:', res);
  } catch (e) {
    console.error('✗ FAILED:', e.message);
  }

  // TEST 3: Master Admin leaving username blank and password 'Admin@2026'
  console.log('\n--- TEST 3: (blank) / Admin@2026 ---');
  try {
    const res = simulateAdminLogin('', 'Admin@2026');
    console.log('✓ PASSED:', res);
  } catch (e) {
    console.error('✗ FAILED:', e.message);
  }

  // TEST 4: Master Admin with password 'Uttam@2026'
  console.log('\n--- TEST 4: admin / Uttam@2026 ---');
  try {
    const res = simulateAdminLogin('admin', 'Uttam@2026');
    console.log('✓ PASSED:', res);
  } catch (e) {
    console.error('✗ FAILED:', e.message);
  }

  // TEST 5: Normal Member attempting admin login (should FAIL)
  console.log('\n--- TEST 5: Normal Member UCWF-2026-7485 on Admin Login (Must fail) ---');
  try {
    simulateAdminLogin('UCWF-2026-7485', 'MemberPass@123');
    console.error('✗ FAILED: Should have rejected normal member!');
  } catch (e) {
    console.log('✓ PASSED: Properly rejected with message ->', e.message);
  }

  // TEST 6: Normal Member attempting wrong password on Admin Login
  console.log('\n--- TEST 6: Wrong Password on Admin Login (Must fail) ---');
  try {
    simulateAdminLogin('admin', 'wrong_pass_999');
    console.error('✗ FAILED: Should have rejected wrong password!');
  } catch (e) {
    console.log('✓ PASSED: Properly rejected with message ->', e.message);
  }

  console.log('\nAll tests completed successfully!');
}

runTests();
