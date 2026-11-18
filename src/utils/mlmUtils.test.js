import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_LEVEL_RATES,
  normalizeLevelRates,
  generateUniqueMemberId,
  parseAmount,
  round2,
  isDirectChild,
  buildMember12LevelReport,
  getUplineChainFromMap,
  calculateJoinCommission
} from './mlmUtils.js';

test('Canonical 12-level commission rates sum strictly to 50%', () => {
  const expected = {
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
  assert.deepEqual(DEFAULT_LEVEL_RATES, expected);

  const totalPct = round2(
    Object.values(DEFAULT_LEVEL_RATES).reduce((sum, r) => sum + Number(r), 0)
  );
  assert.equal(totalPct, 50);
});

test('normalizeLevelRates heals legacy corrupted rates back to canonical 50% structure', () => {
  const legacyRates = { 1: 20, 2: 10, 3: 8, 4: 5, 5: 3 };
  assert.deepEqual(normalizeLevelRates(legacyRates), DEFAULT_LEVEL_RATES);
  assert.deepEqual(normalizeLevelRates(null), DEFAULT_LEVEL_RATES);
});

test('generateUniqueMemberId never collides with existing members', () => {
  const existingUsers = {};
  for (let i = 1000; i <= 1050; i++) {
    existingUsers[`u_${i}`] = { uid: `u_${i}`, memberId: `UCWF-2026-${i}` };
  }

  const seen = new Set(Object.values(existingUsers).map((u) => u.memberId));
  for (let k = 0; k < 25; k++) {
    const id = generateUniqueMemberId(existingUsers, 'UCWF-2026');
    assert.match(id, /^UCWF-2026-\d{4,6}$/);
    assert.equal(seen.has(id), false, `Generated duplicate ID: ${id}`);
    seen.add(id);
    existingUsers[`new_${k}`] = { uid: `new_${k}`, memberId: id };
  }
});

test('parseAmount extracts amounts cleanly across formats', () => {
  assert.equal(parseAmount('Rs. 2,100'), 2100);
  assert.equal(parseAmount('₹5,100'), 5100);
  assert.equal(parseAmount({ packageTier: 500, selfBusiness: 2100 }), 2100);
  assert.equal(parseAmount({ amount: 11000 }), 11000);
});

test('12-level team-by-team join commission math on ₹2,100 yields exact L1..L12 payouts, 0% self, and 50% trust share', () => {
  // Build a 13-member chain: m0 (root) -> m1 -> m2 -> ... -> m12
  // When m12 joins with ₹2,100, m11 is L1 (20%), m10 is L2 (8%), ..., m0 is L12 (1%).
  const usersMap = {};
  for (let i = 0; i <= 12; i++) {
    const uid = `uid_${i}`;
    usersMap[uid] = {
      uid,
      memberId: `UCWF-2026-${1000 + i}`,
      name: `Member ${i}`,
      phone: `98000000${String(i).padStart(2, '0')}`,
      sponsorId: i === 0 ? 'DIRECT' : `UCWF-2026-${1000 + i - 1}`,
      packageAmount: 2100,
      selfBusiness: 2100,
      status: 'active'
    };
  }

  const chain = getUplineChainFromMap(usersMap.uid_12, usersMap);
  assert.equal(chain.length, 12);
  assert.equal(chain[0].uid, 'uid_11'); // Level 1
  assert.equal(chain[11].uid, 'uid_0'); // Level 12

  const joinResult = calculateJoinCommission(usersMap.uid_12, usersMap);
  assert.equal(joinResult.packageAmount, 2100);
  assert.equal(joinResult.commissionGenerated, 1050); // 50% of 2100
  assert.equal(joinResult.netTrustShare, 1050); // 50% of 2100

  const expectedAmountsByLevel = {
    1: 420,   // 20%
    2: 168,   // 8%
    3: 105,   // 5%
    4: 84,    // 4%
    5: 63,    // 3%
    6: 52.5,  // 2.5%
    7: 42,    // 2%
    8: 31.5,  // 1.5%
    9: 21,    // 1%
    10: 21,   // 1%
    11: 21,   // 1%
    12: 21    // 1%
  };

  for (const dist of joinResult.uplineDistributions) {
    assert.equal(
      dist.amount,
      expectedAmountsByLevel[dist.level],
      `Mismatch at Level ${dist.level}`
    );
  }
});

test('buildMember12LevelReport computes multi-level team hierarchy with 0% self commission and no circular loops', () => {
  const usersMap = {
    root: {
      uid: 'root',
      memberId: 'UCWF-0001',
      name: 'Root Sponsor',
      phone: '9540648402',
      sponsorId: 'DIRECT',
      packageAmount: 11000,
      commissionPaid: 100
    },
    l1_a: {
      uid: 'l1_a',
      memberId: 'UCWF-2026-2001',
      name: 'Direct A',
      phone: '9111111111',
      sponsorId: 'UCWF-0001',
      packageAmount: 2100
    },
    l1_b: {
      uid: 'l1_b',
      memberId: 'UCWF-2026-2002',
      name: 'Direct B',
      phone: '9222222222',
      sponsorId: '9540648402', // phone-based sponsor linking
      packageAmount: 1100
    },
    l2_a1: {
      uid: 'l2_a1',
      memberId: 'UCWF-2026-3001',
      name: 'Downline A1',
      phone: '9333333333',
      sponsorId: '2001', // last-4-digit sponsor linking
      packageAmount: 500
    }
  };

  assert.equal(isDirectChild(usersMap.l1_b, usersMap.root), true);
  assert.equal(isDirectChild(usersMap.l2_a1, usersMap.l1_a), true);

  const report = buildMember12LevelReport(usersMap.root, usersMap);
  assert.equal(report.selfBusiness, 11000);
  assert.equal(report.selfBusinessCommission, 0);
  assert.equal(report.directMembersCount, 2);
  assert.equal(report.directBusiness, 3200); // 2100 + 1100
  assert.equal(report.directCommission, 640); // 20% of 3200
  assert.equal(report.downlineMembersCount, 1);
  assert.equal(report.downlineBusiness, 500);
  assert.equal(report.downlineCommission, 40); // 8% of 500
  assert.equal(report.totalTeamMembers, 3);
  assert.equal(report.totalTeamBusiness, 3700);
  assert.equal(report.totalCommission, 680);
  assert.equal(report.paidPayout, 100);
  assert.equal(report.unpaidPayout, 580);
});
