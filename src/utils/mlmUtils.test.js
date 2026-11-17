import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_LEVEL_RATES,
  parseAmount,
  isDirectChild,
  buildMember12LevelReport,
  calculateJoinCommission,
  normalizeSponsorId,
  normalizeLevelRates,
  extractMemberJoinDateIST,
  formatMemberJoiningDate,
} from './mlmUtils.js';
import { formatCurrency, safeText } from '../lib/constants.js';
import { getISTDateString, getTimeUntilMidnightIST } from './closingEngine.js';

test('12-level commission rates sum to exactly 50%', () => {
  const totalPct = Object.values(DEFAULT_LEVEL_RATES).reduce((a, b) => a + b, 0);
  assert.equal(totalPct, 50);
});

test('parseAmount handles numbers, formatted currency strings including Rs. prefix, and user objects', () => {
  assert.equal(parseAmount(5100), 5100);
  assert.equal(parseAmount('₹2,100'), 2100);
  assert.equal(parseAmount('Rs. 2,100'), 2100);
  assert.equal(parseAmount('INR 5,100.50'), 5100.5);
  assert.equal(parseAmount({ packageTier: 500, selfBusiness: 5100 }), 5100);
  assert.equal(parseAmount(null), 0);
});

test('formatCurrency preserves decimal points for fractional commissions (12.5 and 7.5 on ₹500)', () => {
  assert.equal(formatCurrency(12.5), '₹12.5');
  assert.equal(formatCurrency(7.5), '₹7.5');
  assert.equal(formatCurrency('12.5'), '₹12.5');
  assert.equal(formatCurrency('₹ 1,100'), '₹1,100');
  assert.equal(formatCurrency('Rs. 2,100'), '₹2,100');
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

test('normalizeSponsorId, normalizeLevelRates, and date/closing helpers work safely', () => {
  const users = {
    u1: { uid: 'u1', memberId: 'UCWF-2026-6401', name: 'Raam' },
    u2: { uid: 'u2', memberId: 'UCWF-2026-9999', sponsorId: '6401' },
  };
  assert.equal(normalizeSponsorId(users.u2, users), 'UCWF-2026-6401');
  assert.equal(safeText({ seconds: 1700000000 }).length > 0, true);

  // Legacy rates L2=10, L3=8 heal automatically to canonical 50% structure
  const healed = normalizeLevelRates({ 1: 20, 2: 10, 3: 8 });
  assert.equal(healed[2], 8);
  assert.equal(healed[3], 5);
  assert.equal(healed[6], 2.5);
  assert.equal(healed[8], 1.5);

  // DD/MM/YYYY and ISO date extraction
  assert.equal(extractMemberJoinDateIST({ applicationDate: '17/10/2026' }), '2026-10-17');
  assert.equal(formatMemberJoiningDate({ joiningDate: '2026-11-16' }), '16/11/2026');

  // Closing countdown returns valid 00:00:00 format and positive remaining ms
  const countdown = getTimeUntilMidnightIST();
  assert.equal(/^\d{2}:\d{2}:\d{2}$/.test(countdown.formatted), true);
  assert.equal(countdown.totalMs > 0 && countdown.totalMs <= 86400000, true);
  assert.equal(/^\d{4}-\d{2}-\d{2}$/.test(getISTDateString()), true);
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

test('traverses full 12-level vertical chain on ₹500 package and preserves exact 12.5 (L6) and 7.5 (L8) totalling ₹250 (50%)', () => {
  const users = {
    n0: { uid: 'n0', memberId: 'UCWF-2026-0835', name: 'Shri Ram', packageTier: 500, selfBusiness: 5100, sponsorId: 'DIRECT' },
  };
  for (let lvl = 1; lvl <= 12; lvl++) {
    const prevId = lvl === 1 ? 'UCWF-2026-0835' : `UCWF-2026-62${String(lvl - 1).padStart(2, '0')}`;
    users[`n${lvl}`] = {
      uid: `n${lvl}`,
      memberId: `UCWF-2026-62${String(lvl).padStart(2, '0')}`,
      name: `Chain L${lvl}`,
      packageTier: 500,
      sponsorId: prevId,
    };
  }
  const report = buildMember12LevelReport(users.n0, users);
  assert.equal(report.selfBusiness, 5100);
  assert.equal(report.selfBusinessCommission, 0);
  assert.equal(report.directMembersCount, 1);
  assert.equal(report.downlineMembersCount, 11);
  assert.equal(report.totalTeamMembers, 12);
  assert.equal(report.totalTeamBusiness, 6000);
  // Check L6 (2.5% of 500 = 12.5) and L8 (1.5% of 500 = 7.5)
  const l6Row = report.levels.find(r => r.level === 6);
  const l8Row = report.levels.find(r => r.level === 8);
  assert.equal(l6Row.commission, 12.5);
  assert.equal(l8Row.commission, 7.5);
  // 500 * 50% = 250 total commission across L1..L12
  assert.equal(report.totalCommission, 250);
});
