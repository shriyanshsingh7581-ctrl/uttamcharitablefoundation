import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_LEVEL_RATES,
  parseAmount,
  isDirectChild,
  buildMember12LevelReport,
  calculateJoinCommission,
  normalizeSponsorId,
} from './mlmUtils.js';
import { formatCurrency, safeText } from '../lib/constants.js';

test('12-level commission rates sum to exactly 50%', () => {
  const totalPct = Object.values(DEFAULT_LEVEL_RATES).reduce((a, b) => a + b, 0);
  assert.equal(totalPct, 50);
});

test('parseAmount handles numbers, formatted currency strings, and user objects', () => {
  assert.equal(parseAmount(5100), 5100);
  assert.equal(parseAmount('₹2,100'), 2100);
  assert.equal(parseAmount({ packageTier: 500, selfBusiness: 5100 }), 5100);
  assert.equal(parseAmount(null), 0);
});

test('isDirectChild matches full ID, 4-digit suffix, and phone, and prevents self-loops', () => {
  const parent = { uid: 'u1', memberId: 'UCWF-2026-8647', phone: '9876543210', name: 'Raja' };
  const childByFullId = { uid: 'u2', memberId: 'UCWF-2026-0835', sponsorId: 'UCWF-2026-8647' };
  const childBySuffix = { uid: 'u3', memberId: 'UCWF-2026-1001', sponsorId: '8647' };
  const childByPhone = { uid: 'u4', memberId: 'UCWF-2026-1002', sponsorId: '9876543210' };

  assert.equal(isDirectChild(childByFullId, parent), true);
  assert.equal(isDirectChild(childBySuffix, parent), true);
  assert.equal(isDirectChild(childByPhone, parent), true);
  assert.equal(isDirectChild(parent, parent), false);
});

test('buildMember12LevelReport calculates zero self-commission and exact L1/L2 commission', () => {
  const users = {
    u1: { uid: 'u1', memberId: 'UCWF-2026-0001', name: 'Root', packageTier: 5000, sponsorId: 'DIRECT' },
    u2: { uid: 'u2', memberId: 'UCWF-2026-0002', name: 'Direct', packageTier: 1000, sponsorId: 'UCWF-2026-0001' },
    u3: { uid: 'u3', memberId: 'UCWF-2026-0003', name: 'Level2', packageTier: 2000, sponsorId: 'UCWF-2026-0002' },
  };

  const report = buildMember12LevelReport(users.u1, users);
  assert.equal(report.selfBusiness, 5000);
  assert.equal(report.selfBusinessCommission, 0);
  assert.equal(report.directMembersCount, 1);
  assert.equal(report.directBusiness, 1000);
  assert.equal(report.directCommission, 200); // 20% of 1000
  assert.equal(report.downlineMembersCount, 1);
  assert.equal(report.downlineBusiness, 2000);
  assert.equal(report.downlineCommission, 160); // 8% of 2000
  assert.equal(report.totalCommission, 360);
});

test('calculateJoinCommission computes upline payouts and trust share', () => {
  const users = {
    u1: { uid: 'u1', memberId: 'UCWF-0001', name: 'Root', packageTier: 5000, sponsorId: 'DIRECT' },
    u2: { uid: 'u2', memberId: 'UCWF-2026-0002', name: 'NewMember', packageTier: 1000, sponsorId: 'UCWF-0001' },
  };
  const result = calculateJoinCommission(users.u2, users);
  assert.equal(result.packageAmount, 1000);
  assert.equal(result.commissionGenerated, 200);
  assert.equal(result.netTrustShare, 800);
});

test('normalizeSponsorId and formatting helpers work safely', () => {
  const users = {
    u1: { uid: 'u1', memberId: 'UCWF-2026-6401', name: 'Raam' },
    u2: { uid: 'u2', memberId: 'UCWF-2026-9999', sponsorId: '6401' },
  };
  assert.equal(normalizeSponsorId(users.u2, users), 'UCWF-2026-6401');
  assert.equal(formatCurrency('₹ 1,100'), '₹1,100');
  assert.equal(safeText({ seconds: 1700000000 }).length > 0, true);
});

test('handles 12 direct members under 1 sponsor with zero truncation', () => {
  const users = {
    root: { uid: 'root', memberId: 'UCWF-2026-1927', name: 'Sponsor', packageTier: 11000, sponsorId: 'DIRECT' },
  };
  for (let i = 1; i <= 12; i++) {
    users[`d${i}`] = {
      uid: `d${i}`,
      memberId: `UCWF-2026-${2000 + i}`,
      name: `Direct ${i}`,
      packageTier: 1000,
      sponsorId: i % 2 === 0 ? 'ucwf-2026-1927' : '1927',
    };
  }
  const report = buildMember12LevelReport(users.root, users);
  assert.equal(report.selfBusinessCommission, 0);
  assert.equal(report.directMembersCount, 12);
  assert.equal(report.directBusiness, 12000);
  assert.equal(report.directCommission, 2400);
  assert.equal(report.totalCommission, 2400);
});

test('traverses full 12-level vertical chain (L1 to L12) and distributes exact 50% pool', () => {
  const users = {
    n0: { uid: 'n0', memberId: 'UCWF-2026-0835', name: 'Shri Ram', packageTier: 500, selfBusiness: 5100, sponsorId: 'DIRECT' },
  };
  for (let lvl = 1; lvl <= 12; lvl++) {
    const prevId = lvl === 1 ? 'UCWF-2026-0835' : `UCWF-2026-62${String(lvl - 1).padStart(2, '0')}`;
    users[`n${lvl}`] = {
      uid: `n${lvl}`,
      memberId: `UCWF-2026-62${String(lvl).padStart(2, '0')}`,
      name: `Chain L${lvl}`,
      packageTier: 1000,
      sponsorId: prevId,
    };
  }
  const report = buildMember12LevelReport(users.n0, users);
  assert.equal(report.selfBusiness, 5100);
  assert.equal(report.selfBusinessCommission, 0);
  assert.equal(report.directMembersCount, 1);
  assert.equal(report.downlineMembersCount, 11);
  assert.equal(report.totalTeamMembers, 12);
  assert.equal(report.totalTeamBusiness, 12000);
  // 1000 * (20+8+5+4+3+2.5+2+1.5+1+1+1+1)% = 1000 * 50% = 500
  assert.equal(report.totalCommission, 500);
});
