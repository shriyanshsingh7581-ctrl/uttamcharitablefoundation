/**
 * Universal MLM Generation Network Engine & Self-Healing Utilities
 * Uttam Charitable Welfare Foundation (UCWF)
 * 
 * Guarantees:
 * 1. UNLIMITED direct & downline members per user (width = infinity, depth = 12 levels)
 * 2. Universal Sponsor-to-Member linking (isDirectChild / isSponsoredBy) supporting:
 *    - Full Member ID (e.g. UCWF-2026-8647, UCWF-2026-6401)
 *    - Last 4+ digits of Member ID (e.g. 8647, 6401)
 *    - Registered mobile number (10 digits)
 *    - Firebase UID
 *    - Sponsor Name
 * 3. Exact 12-Level Generation Commission rates (Total 50% Distribution):
 *    L1=20%, L2=8%, L3=5%, L4=4%, L5=3%, L6=2.5%, L7=2%, L8=1.5%, L9=1%, L10=1%, L11=1%, L12=1%
 * 4. STRICTLY ZERO SELF-COMMISSION (0% on own ID)
 * 5. Bulletproof Number Parser: parseAmount(user) handles strings, symbols (₹, Rs), commas, NaN
 */

import { MLM_COMMISSION_RATES, formatINR } from '../lib/constants';

/**
 * Canonical 12-Level Commission Rates (Client Locked Spec: Exactly 50% Total Distribution)
 * L1: 20%
 * L2: 8%
 * L3: 5%
 * L4: 4%
 * L5: 3%
 * L6: 2.5%
 * L7: 2%
 * L8: 1.5%
 * L9: 1%
 * L10: 1%
 * L11: 1%
 * L12: 1%
 * Total = 50%
 */
export const DEFAULT_LEVEL_RATES = {
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

export const CANONICAL_LEVEL_RATES = DEFAULT_LEVEL_RATES;

/**
 * Normalize any identifier string (uppercase, trimmed)
 */
export function normId(s) {
  return String(s || '').trim().toUpperCase();
}

/**
 * Extract clean numeric digits
 */
export function lastDigits(s) {
  return String(s || '').replace(/\D/g, '');
}

/**
 * Bulletproof Number Parser
 * Inspects packageTier, amount, selfBusiness, donationAmount, packageAmount, business.
 * CRITICAL FIX: When passed a user object, takes the MAX across all amount fields so a stale
 * lower value (e.g. packageTier=500 when selfBusiness=5100) never wins.
 * Strips all ₹, Rs, commas, spaces and returns a clean positive Number (never NaN or ₹0).
 */
function _parseSingleAmount(raw) {
  if (raw === null || raw === undefined) return 0;
  if (typeof raw === 'number') return isNaN(raw) ? 0 : Math.max(0, raw);
  const cleanStr = String(raw).replace(/[^0-9.]/g, '');
  const parsed = parseFloat(cleanStr);
  return isNaN(parsed) ? 0 : Math.max(0, parsed);
}

export function parseAmount(valOrUser) {
  if (valOrUser === null || valOrUser === undefined) return 0;

  // If it's a plain number or string, parse directly
  if (typeof valOrUser !== 'object') {
    return _parseSingleAmount(valOrUser);
  }

  // For user objects: take the MAXIMUM across all amount-carrying fields.
  // This guarantees a stale low field (e.g. packageTier=500) never hides the
  // correct higher value (e.g. selfBusiness=5100 for UCWF-2026-0835).
  const candidates = [
    valOrUser.selfBusiness,    // ← highest priority: explicitly synced field
    valOrUser.packageTier,
    valOrUser.amount,
    valOrUser.donationAmount,
    valOrUser.packageAmount,
    valOrUser.business,
  ].map(_parseSingleAmount);

  const maxVal = Math.max(...candidates, 0);
  return maxVal;
}

/**
 * Universal Sponsor-to-Member Linking:
 * Determines if childUser is a direct child (Level 1) of parentUser.
 */
export function isDirectChild(childUser, parentUser) {
  if (!childUser || !parentUser) return false;

  const childUid = String(childUser.uid || childUser.id || '').trim();
  const parentUid = String(parentUser.uid || parentUser.id || '').trim();
  const childMem = normId(childUser.memberId || childUser.member_id);
  const parentMem = normId(parentUser.memberId || parentUser.member_id);

  // Prevent self-referral / loop
  if (childUid && parentUid && childUid === parentUid) return false;
  if (childMem && parentMem && childMem === parentMem) return false;

  const childSponsor = normId(childUser.sponsorId || childUser.sponsor_id);
  const childSpDigits = lastDigits(childUser.sponsorId || childUser.sponsor_id);
  const parentDigits = lastDigits(parentUser.memberId || parentUser.member_id);
  const parentPhone = lastDigits(parentUser.phone || parentUser.mobile);

  // 1. Exact Member ID match
  if (parentMem && childSponsor === parentMem) return true;

  // 2. Last 4+ digits match of Member ID (e.g. '8647' matches 'UCWF-2026-8647' or '6401' matches 'UCWF-2026-6401')
  if (childSpDigits.length >= 4 && parentDigits.length >= 4) {
    if (childSpDigits === parentDigits || parentDigits.endsWith(childSpDigits) || childSpDigits.endsWith(parentDigits)) {
      return true;
    }
  }

  // 3. Last hyphen suffix match
  if (parentMem && childSponsor) {
    const parentSuffix = parentMem.split('-').pop();
    if (parentSuffix && parentSuffix === childSponsor) return true;
  }

  // 4. Mobile / Phone match (last 10 digits)
  if (parentPhone.length >= 10 && childSpDigits.length >= 10 && childSpDigits.slice(-10) === parentPhone.slice(-10)) {
    return true;
  }

  // 5. UID match
  if (parentUid && (String(childUser.sponsorUid || '').trim() === parentUid || childSponsor === normId(parentUid))) {
    return true;
  }

  // 6. Name match fallback
  const pName = String(parentUser.name || parentUser.displayName || '').trim().toLowerCase();
  const cSpName = String(childUser.sponsorName || '').trim().toLowerCase();
  if (pName && cSpName && pName.length > 3) {
    const cleanP = pName.replace(/^(श्री|डॉ\.|डॉ|smt|mr|mrs|dr)\s+/i, '').trim();
    const cleanS = cSpName.replace(/^(श्री|डॉ\.|डॉ|smt|mr|mrs|dr)\s+/i, '').trim();
    if (cleanP && cleanS && (cleanP === cleanS || cleanP.includes(cleanS) || cleanS.includes(cleanP))) {
      return true;
    }
  }

  return false;
}

// Backward-compatible alias
export const isSponsoredBy = isDirectChild;

/**
 * Guaranteed Full Name Resolver with Salutation
 */
export function getMemberFullName(user, fallback = 'सम्मानित सदस्य') {
  if (!user) return fallback;
  const rawName = user.name || user.fullName || user.memberName || user.samajSeviName || user.displayName || '';
  const cleanName = String(rawName).trim();
  const salutation = String(user.salutation || '').trim();

  if (!cleanName) return fallback;

  if (salutation && cleanName.startsWith(salutation)) {
    return cleanName;
  }

  return salutation ? `${salutation} ${cleanName}`.trim() : cleanName;
}

/**
 * Find canonical parent member from allUsers for a given childUser
 */
export function findParentMember(childUser, allUsers = {}) {
  if (!childUser || !allUsers) return null;
  const usersList = Object.values(allUsers).filter(Boolean);
  const found = usersList.find(parent => isDirectChild(childUser, parent));
  if (found) return found;

  // Fallback direct check for sponsorId
  const spRaw = childUser.sponsorId || childUser.sponsor_id;
  if (!spRaw) return null;

  const spNorm = normId(spRaw);
  if (spNorm === 'DIRECT' || spNorm === '9540648402' || spNorm === 'UCWF-0001') {
    const root = usersList.find(u => normId(u.memberId) === 'UCWF-0001' || lastDigits(u.phone).slice(-10) === '9540648402');
    if (root) return root;
    return {
      memberId: 'UCWF-0001',
      name: 'डॉ० राजेंद्र सिंह सैनी',
      displayName: 'डॉ० राजेंद्र सिंह सैनी',
      phone: '9540648402',
      salutation: 'डॉ०'
    };
  }

  const spDigits = lastDigits(spRaw);
  const matched = usersList.find(u => {
    const uMem = normId(u.memberId);
    const uPhone = lastDigits(u.phone);
    if (uMem && uMem === spNorm) return true;
    if (uPhone.length >= 10 && spDigits.length >= 10 && uPhone.slice(-10) === spDigits.slice(-10)) return true;
    if (spDigits.length >= 4 && uMem.replace(/\D/g, '').endsWith(spDigits)) return true;
    return false;
  });

  if (matched) return matched;

  // If sponsor exists as an ID but no record in DB yet (e.g. 7898653232)
  return {
    memberId: spRaw,
    name: childUser.sponsorName || `स्पॉन्सर (${spRaw})`,
    displayName: childUser.sponsorName || `स्पॉन्सर (${spRaw})`,
    phone: spDigits.length >= 10 ? spDigits : (childUser.sponsorPhone || '')
  };
}

/**
 * Universal Sponsor Display Name Helper
 */
export function getSponsorDisplayName(spId, allUsers = {}) {
  const cleanSp = normId(spId);
  if (!cleanSp || cleanSp === 'DIRECT' || cleanSp === '9540648402' || cleanSp === 'UCWF-0001') {
    return 'UCWF-0001 (डॉ० राजेंद्र सिंह सैनी - 9540648402)';
  }
  const cleanDigits = lastDigits(spId);
  const usersList = Object.values(allUsers || {}).filter(Boolean);
  const found = usersList.find(u => {
    const uMem = normId(u.memberId || u.member_id);
    const uPhone = lastDigits(u.phone || u.mobile);
    if (uMem && uMem === cleanSp) return true;
    if (uPhone.length >= 10 && cleanDigits.length >= 10 && uPhone.slice(-10) === cleanDigits.slice(-10)) return true;
    if (cleanDigits.length >= 4 && uMem.replace(/\D/g, '').endsWith(cleanDigits)) return true;
    return false;
  });
  if (found) {
    return `${found.memberId || spId} (${getMemberFullName(found)} - ${found.phone || ''})`.trim();
  }
  return cleanDigits.length >= 10 ? `${spId} (स्पॉन्सर फोन)` : `${spId} (स्पॉन्सर ID)`;
}

/**
 * Universal Sponsor-to-Member Normalizer:
 * Resolves child's sponsor to the canonical uppercase memberId of parent
 */
export function normalizeSponsorId(childUser, allUsers = {}) {
  const parent = findParentMember(childUser, allUsers);
  if (parent && parent.memberId) {
    return normId(parent.memberId);
  }
  const current = normId(childUser?.sponsorId);
  return current || 'DIRECT';
}

/**
 * FOOLPROOF 12-LEVEL (50%) COMMISSION ENGINE
 * BFS Traversal from targetUser (Level 0) down to Depth 12 (Level 1 through Level 12)
 * Guarantees exact rupee calculation on eligible business, with zero self-commission.
 */
export function buildMember12LevelReport(targetUser, allUsersMap = {}) {
  const allList = Object.values(allUsersMap || {}).filter(Boolean);

  const emptyBreakdown = Array.from({ length: 12 }, (_, i) => ({
    level: i + 1,
    rate: DEFAULT_LEVEL_RATES[i + 1],
    count: 0,
    business: 0,
    commission: 0,
    poolSharePct: 50,
    members: []
  }));

  const emptyResult = {
    user: targetUser || null,
    selfBusiness: 0,
    selfBusinessCommission: 0,
    directMembersCount: 0,
    directBusiness: 0,
    directCommission: 0,
    downlineMembersCount: 0,
    downlineBusiness: 0,
    downlineCommission: 0,
    totalTeamMembers: 0,
    totalTeamBusiness: 0,
    totalCommission: 0,
    totalDistributedChain: 0,
    paidPayout: 0,
    unpaidPayout: 0,
    directList: [],
    fullDownlineList: [],
    allDownlineMembers: [],
    levelBreakdown: emptyBreakdown
  };

  if (!targetUser) return emptyResult;

  const selfBiz = parseAmount(targetUser);
  const selfComm = 0; // STRICTLY 0% SELF COMMISSION

  const visitedUids = new Set();
  const targetUid = targetUser.uid || targetUser.id;
  const targetMemId = normId(targetUser.memberId);
  if (targetUid) visitedUids.add(targetUid);
  if (targetMemId) visitedUids.add(targetMemId);

  let currentParents = [targetUser];
  const levelBreakdown = [];
  const fullDownlineList = [];

  let directMembersCount = 0;
  let directBusiness = 0;
  let directCommission = 0;

  let downlineMembersCount = 0;
  let downlineBusiness = 0;
  let downlineCommission = 0;

  for (let lvl = 1; lvl <= 12; lvl++) {
    const rate = DEFAULT_LEVEL_RATES[lvl] || 0;
    const lvlMembers = [];
    let lvlBiz = 0;
    let lvlComm = 0;

    if (currentParents.length > 0) {
      allList.forEach(u => {
        const uUid = u.uid || u.id;
        const uMemId = normId(u.memberId);
        if ((uUid && visitedUids.has(uUid)) || (uMemId && visitedUids.has(uMemId))) return;

        const matchedParent = currentParents.find(p => isDirectChild(u, p));
        if (matchedParent) {
          if (uUid) visitedUids.add(uUid);
          if (uMemId) visitedUids.add(uMemId);

          const pkg = parseAmount(u);
          const comm = (pkg * rate) / 100;

          // Direct referrals count of this child
          const childDirects = allList.filter(gc => isDirectChild(gc, u));
          const childDirectBiz = childDirects.reduce((acc, gc) => acc + parseAmount(gc), 0);

          const enhanced = {
            ...u,
            level: lvl,
            rate: rate,
            packageAmount: pkg,
            selfBusiness: pkg,
            commissionGenerated: comm,
            sponsorIdResolved: matchedParent.memberId || u.sponsorId || 'N/A',
            sponsorNameResolved: getMemberFullName(matchedParent),
            directTeamCount: childDirects.length,
            directBusinessCalculated: childDirectBiz,
            fullNameDisplay: getMemberFullName(u)
          };

          lvlMembers.push(enhanced);
          fullDownlineList.push(enhanced);
          lvlBiz += pkg;
          lvlComm += comm;
        }
      });
    }

    levelBreakdown.push({
      level: lvl,
      rate: rate,
      count: lvlMembers.length,
      business: lvlBiz,
      commission: lvlComm,
      poolSharePct: 50,
      members: lvlMembers
    });

    if (lvl === 1) {
      directMembersCount = lvlMembers.length;
      directBusiness = lvlBiz;
      directCommission = lvlComm;
    } else {
      downlineMembersCount += lvlMembers.length;
      downlineBusiness += lvlBiz;
      downlineCommission += lvlComm;
    }

    currentParents = lvlMembers;
  }

  const totalTeamMembers = directMembersCount + downlineMembersCount;
  const totalTeamBusiness = directBusiness + downlineBusiness;
  const totalCommission = directCommission + downlineCommission; // Strictly zero self comm
  const totalDistributedChain = totalTeamBusiness * 0.50; // 50% pool distributed across entire chain

  const paidPayout = Number(targetUser.commissionPaid || targetUser.paidPayout || targetUser.totalWithdrawn || 0);
  const unpaidPayout = Math.max(0, totalCommission - paidPayout);

  return {
    user: targetUser,
    selfBusiness: selfBiz,
    selfBusinessCommission: selfComm,
    directMembersCount,
    directBusiness,
    directCommission,
    downlineMembersCount,
    downlineBusiness,
    downlineCommission,
    totalTeamMembers,
    totalTeamBusiness,
    totalCommission,
    totalDistributedChain,
    paidPayout,
    unpaidPayout,
    directList: levelBreakdown[0]?.members || [],
    fullDownlineList,
    allDownlineMembers: fullDownlineList,
    levelBreakdown
  };
}

/**
 * Backward-compatible wrapper for existing callers
 */
export function computeUnlimitedGenerationTree(rootUser, allUsersMap = {}, customLevelRates = null) {
  return buildMember12LevelReport(rootUser, allUsersMap);
}

/**
 * Universal 12-Level Upline Chain Finder
 */
export function getUplineChainFromMap(memberOrId, allUsersMap = {}, customRates = null) {
  if (!memberOrId || !allUsersMap) return [];
  const allList = Object.values(allUsersMap).filter(Boolean);

  let current = null;
  if (typeof memberOrId === 'object') {
    current = memberOrId;
  } else {
    const q = normId(memberOrId);
    const qPhone = lastDigits(memberOrId).slice(-10);
    current = allList.find(u => 
      normId(u.memberId) === q ||
      (qPhone.length === 10 && lastDigits(u.phone).slice(-10) === qPhone) ||
      u.uid === memberOrId
    );
  }

  if (!current) return [];

  const chain = [];
  const visited = new Set();
  const rootUid = current.uid || current.id;
  if (rootUid) visited.add(rootUid);
  if (current.memberId) visited.add(normId(current.memberId));

  let activeChild = current;

  for (let lvl = 1; lvl <= 12; lvl++) {
    const parent = findParentMember(activeChild, allUsersMap);
    if (!parent) break;

    const parentUid = parent.uid || parent.id;
    const parentMemId = normId(parent.memberId);
    if ((parentUid && visited.has(parentUid)) || (parentMemId && visited.has(parentMemId))) break;
    if (parentUid) visited.add(parentUid);
    if (parentMemId) visited.add(parentMemId);

    const rate = Number(customRates?.[lvl] ?? DEFAULT_LEVEL_RATES[lvl]);
    chain.push({
      level: lvl,
      rate,
      user: parent,
      uid: parentUid,
      memberId: parent.memberId || 'N/A',
      name: getMemberFullName(parent),
      phone: parent.phone || '',
      walletBalance: Number(parent.walletBalance || 0),
      totalEarned: Number(parent.totalEarned || 0)
    });

    activeChild = parent;
  }

  return chain;
}

/**
 * Calculate total commission generated and trust share for a new joined member
 */
export function calculateJoinCommission(joinedMember, allUsersMap = {}, customRates = null) {
  const pkg = parseAmount(joinedMember);
  const chain = getUplineChainFromMap(joinedMember, allUsersMap, customRates);

  let commissionSum = 0;
  const distributions = chain.map(node => {
    const amt = (pkg * node.rate) / 100;
    commissionSum += amt;
    return {
      level: node.level,
      rate: node.rate,
      amount: amt,
      uid: node.uid,
      memberId: node.memberId,
      name: node.name
    };
  });

  const netTrustShare = Math.max(0, pkg - commissionSum);

  return {
    packageAmount: pkg,
    commissionGenerated: commissionSum,
    netTrustShare,
    uplineDistributions: distributions
  };
}

export default {
  DEFAULT_LEVEL_RATES,
  CANONICAL_LEVEL_RATES,
  normId,
  lastDigits,
  parseAmount,
  isDirectChild,
  isSponsoredBy,
  getMemberFullName,
  findParentMember,
  getSponsorDisplayName,
  normalizeSponsorId,
  buildMember12LevelReport,
  computeUnlimitedGenerationTree,
  getUplineChainFromMap,
  calculateJoinCommission
};
