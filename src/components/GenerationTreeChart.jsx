import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Users, 
  ChevronDown, 
  ChevronRight, 
  Search, 
  User, 
  Phone, 
  CheckCircle2, 
  IndianRupee, 
  Layers, 
  Sparkles, 
  Award, 
  RefreshCw,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Building2,
  ArrowDown,
  ArrowRight
} from 'lucide-react';
import { rtdb } from '../lib/firebase';
import { ref, get, onValue } from 'firebase/database';
import { MLM_COMMISSION_RATES, formatCurrency, safeText } from '../lib/constants';
import { 
  computeUnlimitedGenerationTree, 
  isSponsoredBy, 
  getMemberFullName 
} from '../utils/mlmUtils';

/**
 * Visual Generation Network Tree Chart
 * Matches the client's hand-drawn generation diagram:
 * - Top horizontal bar representing Root / Company / Viewing Sponsor ID
 * - Level 1 (Direct) Members (L-1) lined up horizontally side-by-side
 * - Under each L-1 member, their downline chain drops vertically downward step-by-step (L-2 -> L-3 -> L-4 -> ... -> L-12)
 * - Click to expand / collapse any node's vertical chain
 * - Strictly Generation-based (0 binary Left/Right matching)
 */
export default function GenerationTreeChart({ 
  initialRootId = '', 
  customAllUsers = null,
  title = ''
}) {
  const fileRef = useRef(null);
  const photoRef = useRef(null);
  const inputRef = useRef(null);
  const [usersMap, setUsersMap] = useState(customAllUsers || {});
  const [loading, setLoading] = useState(!customAllUsers);
  const [activeRootId, setActiveRootId] = useState(initialRootId || '');
  const [expandedNodes, setExpandedNodes] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchError, setSearchError] = useState('');
  const [selectedNodeDetails, setSelectedNodeDetails] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(100);

  // Load users from Firebase RTDB if not provided
  useEffect(() => {
    if (customAllUsers && Object.keys(customAllUsers).length > 0) {
      setUsersMap(customAllUsers);
      setLoading(false);
      return;
    }

    const usersRef = ref(rtdb, 'users');
    const unsub = onValue(usersRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        setUsersMap(data);
      } else {
        setUsersMap({});
      }
      setLoading(false);
    });

    return () => unsub();
  }, [customAllUsers]);

  // Identify root member: default to activeRootId, or Company Root (UCWF-0001 / 9540648402), or first user
  const rootMember = useMemo(() => {
    if (Object.keys(usersMap).length === 0) return null;
    const all = Object.values(usersMap).filter(Boolean);

    if (activeRootId) {
      const q = activeRootId.trim().toUpperCase();
      const qDigits = q.replace(/\D/g, '');
      const qPhone = qDigits.slice(-10);
      const found = all.find(u => 
        (u.memberId && u.memberId.toUpperCase() === q) ||
        (u.memberId && qDigits.length >= 4 && u.memberId.toUpperCase().endsWith(qDigits)) ||
        (u.phone && qPhone && u.phone.replace(/\D/g, '').slice(-10) === qPhone) ||
        u.uid === activeRootId ||
        (u.name && u.name.trim().toLowerCase() === activeRootId.trim().toLowerCase())
      );
      if (found) return found;
    }

    // Default to Company Root
    const company = all.find(u => 
      u.phone === '9540648402' || 
      (u.memberId && (u.memberId.toUpperCase() === 'UCWF-0001' || u.memberId.toUpperCase() === 'UCWF-2026-0001')) ||
      u.sponsorId === 'DIRECT'
    );
    if (company) return company;

    // Fallback to top user with most directs
    return all[0] || null;
  }, [usersMap, activeRootId]);

  // Helper to fetch direct children of any member using universal isSponsoredBy
  const getDirectChildren = (member) => {
    if (!member) return [];
    const allUsersList = Object.values(usersMap).filter(Boolean);
    return allUsersList.filter(u => {
      if (!u || u.uid === member.uid) return false;
      return isSponsoredBy(u, member);
    }).sort((a, b) => (b.timestamp || b.createdAt || 0) - (a.timestamp || a.createdAt || 0));
  };

  // Compute 12-Level Counters & Totals for current root
  const generationStats = useMemo(() => {
    if (!rootMember || Object.keys(usersMap).length === 0) {
      return {
        levels: Array.from({ length: 12 }, (_, i) => ({
          level: i + 1,
          rate: MLM_COMMISSION_RATES[i] || 1,
          count: 0,
          business: 0,
          commission: 0
        })),
        totalMembers: 0,
        totalBusiness: 0,
        totalCommission: 0
      };
    }
    const tree = computeUnlimitedGenerationTree(rootMember, usersMap);
    return {
      levels: tree.levelBreakdown,
      totalMembers: tree.totalTeamMembers,
      totalBusiness: tree.totalTeamBusiness,
      totalCommission: tree.totalCommission
    };
  }, [rootMember, usersMap]);

  // Level 1 Directs of Root
  const level1Members = useMemo(() => {
    return getDirectChildren(rootMember);
  }, [rootMember, usersMap]);

  // Auto-expand all Level 1 nodes initially
  useEffect(() => {
    if (level1Members.length > 0) {
      const initial = {};
      level1Members.forEach(m => {
        const key = m.uid || m.memberId;
        initial[key] = true;
      });
      setExpandedNodes(prev => ({ ...initial, ...prev }));
    }
  }, [level1Members]);

  // Toggle node expansion
  const toggleExpand = (nodeKey) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeKey]: !prev[nodeKey]
    }));
  };

  // Recursive Vertical Downline Chain Renderer
  const renderVerticalDownline = (parentMember, currentLevel = 2) => {
    if (currentLevel > 12) return null;
    const parentKey = parentMember.uid || parentMember.memberId;
    const isExpanded = !!expandedNodes[parentKey];
    const children = getDirectChildren(parentMember);

    if (children.length === 0) return null;

    const rate = MLM_COMMISSION_RATES[currentLevel - 1] || 1;

    return (
      <div className="flex flex-col items-center mt-2 w-full">
        {/* Vertical Guide Line */}
        <div className="w-0.5 h-6 bg-slate-300 relative">
          <div className="w-2 h-2 rounded-full bg-slate-400 absolute -bottom-1 -left-[3px]" />
        </div>

        {/* Expand / Collapse Control */}
        <button
          type="button"
          onClick={() => toggleExpand(parentKey)}
          className="my-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black border transition cursor-pointer flex items-center gap-1 shadow-xs bg-white text-slate-700 hover:bg-slate-50 border-slate-300"
        >
          {isExpanded ? <ChevronDown className="w-3 h-3 text-slate-600" /> : <ChevronRight className="w-3 h-3 text-slate-600" />}
          <span>Level {currentLevel} ({children.length} {children.length === 1 ? 'member' : 'members'})</span>
        </button>

        {/* Downline Children Dropping Vertically */}
        {isExpanded && (
          <div className="flex flex-col items-center gap-3 w-full pt-1">
            {children.map((child, idx) => {
              const childKey = child.uid || child.memberId;
              const childDirects = getDirectChildren(child);
              const pkgAmt = Number(child.packageAmount || child.packageTier || 0);
              const isActive = (pkgAmt > 0) || (child.status === 'active');

              return (
                <div key={childKey || idx} className="flex flex-col items-center w-full">
                  {/* Member Node Card */}
                  <div 
                    onClick={() => setSelectedNodeDetails(child)}
                    className="w-56 p-3 rounded-2xl bg-white border-2 border-slate-200 hover:border-pink-400 shadow-sm hover:shadow-md transition text-left cursor-pointer relative group"
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="px-2 py-0.2 rounded-md bg-blue-50 text-blue-800 font-mono text-[9px] font-black border border-blue-200">
                        L-{currentLevel} ({rate}%)
                      </span>
                      <span className={`px-2 py-0.2 rounded-full text-[9px] font-black uppercase ${
                        isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {isActive ? 'Active' : 'Pending'}
                      </span>
                    </div>

                    <p className="text-xs font-black text-slate-900 truncate">
                      {safeText(child.salutation)} {safeText(child.name || 'Member')}
                    </p>
                    <p className="font-mono text-[10px] text-pink-700 font-bold truncate">
                      {safeText(child.memberId || 'N/A')}
                    </p>
                    <p className="font-mono text-[10px] text-slate-500">
                      Mob: {safeText(child.phone || '-')}
                    </p>

                    <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px]">
                      <span className="text-slate-500">Package:</span>
                      <strong className="font-mono text-slate-900">{formatCurrency(pkgAmt)}</strong>
                    </div>

                    {childDirects.length > 0 && (
                      <div className="mt-1 flex items-center justify-between text-[10px]">
                        <span className="text-purple-700 font-bold">Downline:</span>
                        <span className="px-1.5 py-0.2 rounded bg-purple-50 text-purple-800 font-mono font-bold text-[9px]">
                          {childDirects.length} Directs
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Recursively Drop Next Level */}
                  {renderVerticalDownline(child, currentLevel + 1)}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Search Jump Handler
  const handleSearchJump = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const q = searchQuery.trim().toUpperCase();
    const qDigits = q.replace(/\D/g, '');
    const qPhone = qDigits.slice(-10);

    const match = Object.values(usersMap).find(u => {
      if (!u) return false;
      const uMem = (u.memberId || '').toUpperCase();
      const uPhone = (u.phone || '').replace(/\D/g, '').slice(-10);
      const uName = (u.name || u.displayName || '').toUpperCase();
      return (
        uMem === q ||
        (qDigits.length >= 4 && uMem.endsWith(qDigits)) ||
        (qPhone && uPhone === qPhone) ||
        uName.includes(q)
      );
    });

    if (match) {
      setSearchError('');
      setActiveRootId(match.memberId || match.uid);
      setSelectedNodeDetails(match);
      setSearchQuery('');
    } else {
      setSearchError(`No member found matching: "${searchQuery}"`);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 bg-white rounded-3xl border border-pink-200">
        <RefreshCw className="w-8 h-8 animate-spin text-pink-600 mx-auto mb-3" />
        <p className="text-xs font-bold">Loading Generation Network Tree...</p>
      </div>
    );
  }

  if (!rootMember) {
    return (
      <div className="p-12 text-center text-slate-400 bg-white rounded-3xl border border-pink-200">
        <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-xs font-bold">No member found to generate network tree.</p>
      </div>
    );
  }

  const rootPkg = Number(rootMember.packageAmount || rootMember.packageTier || 0);

  return (
    <div className="space-y-6">
      {/* HEADER BAR & CONTROLS */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-pink-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-100 text-pink-800 text-xs font-black uppercase tracking-wider mb-1">
            <Layers className="w-3.5 h-3.5 text-pink-600" />
            <span>12-Level Generation Network Tree (Hand-Drawn Spec)</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
            {title || 'जेनरेशन नेटवर्क चार्ट (Visual Generation Tree)'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            L-1 प्रत्यक्ष सदस्य क्षैतिज रूप से (Horizontally) प्रदर्शित हैं, और प्रत्येक के नीचे L-2 से L-12 डाउनलाइन लंबवत (Vertically) गिरती है।
          </p>
        </div>

        {/* Search & Actions Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <form onSubmit={handleSearchJump} className="relative w-full sm:w-60">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search ID, phone, name..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (searchError) setSearchError('');
              }}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-pink-500 uppercase font-bold"
            />
            {searchError && (
              <p className="mt-1 text-[11px] font-bold text-rose-600">{searchError}</p>
            )}
          </form>

          {activeRootId && (
            <button
              type="button"
              onClick={() => setActiveRootId('')}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
              title="Reset View to Company Root"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Root</span>
            </button>
          )}

          {/* Zoom Controls */}
          <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setZoomLevel(prev => Math.max(60, prev - 10))}
              className="p-1 rounded-lg text-slate-600 hover:text-slate-900 cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-mono text-[11px] font-bold text-slate-700 min-w-10 text-center">
              {zoomLevel}%
            </span>
            <button
              type="button"
              onClick={() => setZoomLevel(prev => Math.min(130, prev + 10))}
              className="p-1 rounded-lg text-slate-600 hover:text-slate-900 cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 12-LEVEL GENERATION COUNTERS STRIP (REPLACES BINARY LEFT/RIGHT) */}
      <div className="bg-white rounded-3xl p-5 border-2 border-pink-200/80 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Award className="w-4 h-4 text-emerald-600" />
            <span>Generation Level Member Counters (Zero Binary • 100% Generation Plan)</span>
          </span>
          <span className="text-xs font-mono font-bold text-slate-500">
            Total Team: <strong className="text-slate-900">{generationStats.totalMembers} Members</strong> | Total Biz: <strong className="text-emerald-700">{formatCurrency(generationStats.totalBusiness)}</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {generationStats.levels.map((lvl) => (
            <div
              key={lvl.level}
              className={`p-3 rounded-2xl border transition ${
                lvl.count > 0 
                  ? 'bg-pink-50/70 border-pink-300 shadow-xs' 
                  : 'bg-slate-50/60 border-slate-200 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-mono font-black text-pink-700">Level {lvl.level}</span>
                <span className="font-mono font-bold text-slate-500">{lvl.rate}%</span>
              </div>
              <p className="text-lg font-black font-mono text-slate-900 mt-1">
                {lvl.count} <span className="text-[10px] font-normal text-slate-500">members</span>
              </p>
              <div className="mt-1 pt-1 border-t border-slate-200/60 flex items-center justify-between text-[10px] font-mono">
                <span className="text-slate-500">{formatCurrency(lvl.business)}</span>
                <span className="font-bold text-emerald-700">{formatCurrency(lvl.commission)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* VISUAL GENERATION CHART CANVAS (MATCHES CLIENT'S NOTEBOOK SKETCH) */}
      <div className="bg-stone-50/80 rounded-3xl border-2 border-pink-300 p-6 sm:p-10 overflow-x-auto shadow-inner relative min-h-[500px]">
        <div 
          className="flex flex-col items-center mx-auto transition-transform origin-top"
          style={{ transform: `scale(${zoomLevel / 100})` }}
        >
          {/* 1. TOP HORIZONTAL HEADER BAR (ROOT / COMPANY / VIEWING SPONSOR ID) */}
          <div 
            onClick={() => setSelectedNodeDetails(rootMember)}
            className="w-80 p-5 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-2xl border-2 border-amber-400 text-center relative cursor-pointer group hover:scale-[1.02] transition"
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-black uppercase tracking-wider mb-2">
              <Building2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Viewing Root / Sponsor</span>
            </div>

            <h3 className="text-base font-black text-white truncate">
              {safeText(rootMember.salutation)} {safeText(rootMember.name || 'Company Root')}
            </h3>
            <p className="font-mono text-xs font-black text-amber-300 mt-0.5">
              {safeText(rootMember.memberId || 'UCWF-0001')}
            </p>
            <p className="font-mono text-[11px] text-slate-300 mt-0.5">
              Mobile: {safeText(rootMember.phone || '-')}
            </p>

            <div className="mt-3 pt-2.5 border-t border-white/10 grid grid-cols-2 gap-2 text-left text-xs font-mono">
              <div className="bg-white/5 p-2 rounded-xl">
                <span className="text-[10px] text-slate-400 block">Direct (L1)</span>
                <strong className="text-emerald-400 text-sm font-black">{level1Members.length} Members</strong>
              </div>
              <div className="bg-white/5 p-2 rounded-xl">
                <span className="text-[10px] text-slate-400 block">Team (L2-L12)</span>
                <strong className="text-purple-300 text-sm font-black">{generationStats.totalMembers - level1Members.length} Members</strong>
              </div>
            </div>
          </div>

          {/* VERTICAL STEM BELOW ROOT */}
          <div className="w-0.5 h-8 bg-pink-500" />

          {/* HORIZONTAL CONNECTOR BAR ACROSS ALL DIRECT MEMBERS */}
          {level1Members.length > 0 && (
            <div className="relative w-full flex flex-col items-center">
              {/* Horizontal Connecting Crossbar */}
              <div 
                className="h-1 bg-pink-500 rounded-full"
                style={{ 
                  width: `${Math.max(100, Math.min(level1Members.length * 280 - 80, 2400))}px` 
                }} 
              />

              {/* 2. HORIZONTAL ROW OF LEVEL 1 (DIRECT) MEMBERS */}
              <div className="flex items-start justify-center gap-6 pt-0 overflow-x-auto w-full pb-8">
                {level1Members.map((l1Member, index) => {
                  const l1Key = l1Member.uid || l1Member.memberId;
                  const l1Pkg = Number(l1Member.packageAmount || l1Member.packageTier || 0);
                  const isActive = (l1Pkg > 0) || (l1Member.status === 'active');
                  const directChildren = getDirectChildren(l1Member);

                  return (
                    <div key={l1Key || index} className="flex flex-col items-center shrink-0">
                      {/* Vertical Drop from Crossbar to L1 Card */}
                      <div className="w-0.5 h-6 bg-pink-500" />

                      {/* L-1 Member Card */}
                      <div 
                        onClick={() => setSelectedNodeDetails(l1Member)}
                        className="w-64 p-4 rounded-3xl bg-white border-2 border-pink-400 shadow-md hover:shadow-xl hover:border-pink-600 transition text-left cursor-pointer relative group"
                      >
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span className="px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-800 font-mono text-[10px] font-black border border-pink-200">
                            L-1 Direct (20%)
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                            isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {isActive ? 'Active' : 'Pending'}
                          </span>
                        </div>

                        <h4 className="text-xs font-black text-slate-900 truncate">
                          {safeText(l1Member.salutation)} {safeText(l1Member.name || 'Direct Member')}
                        </h4>
                        <p className="font-mono text-xs font-black text-pink-700 truncate mt-0.5">
                          {safeText(l1Member.memberId || 'N/A')}
                        </p>
                        <p className="font-mono text-[11px] text-slate-500">
                          Mob: {safeText(l1Member.phone || '-')}
                        </p>

                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                          <span className="text-slate-500 font-medium">Self Donation:</span>
                          <strong className="font-mono text-slate-900 font-bold">{formatCurrency(l1Pkg)}</strong>
                        </div>

                        {/* Action buttons inside card */}
                        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveRootId(l1Member.memberId || l1Member.uid);
                            }}
                            className="text-[10px] text-pink-700 hover:text-pink-900 font-bold hover:underline"
                            title="Focus this member as tree root"
                          >
                            Focus Tree →
                          </button>

                          <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 font-mono text-[10px] font-bold">
                            {directChildren.length} Directs
                          </span>
                        </div>
                      </div>

                      {/* 3. VERTICAL DOWNLINE CHAIN (L-2 -> L-3 -> L-4 -> ... -> L-12) UNDER THIS L-1 MEMBER */}
                      {renderVerticalDownline(l1Member, 2)}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {level1Members.length === 0 && (
            <div className="py-16 text-center text-slate-400">
              <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-bold">This member currently has 0 direct Level-1 referrals.</p>
            </div>
          )}
        </div>
      </div>

      {/* NODE DETAILS MODAL / INSPECTOR */}
      {selectedNodeDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full border-2 border-pink-300 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-pink-100">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-pink-100 text-pink-700 flex items-center justify-center font-black">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    {safeText(selectedNodeDetails.salutation)} {safeText(selectedNodeDetails.name)}
                  </h3>
                  <p className="font-mono text-xs text-pink-700 font-bold">
                    {safeText(selectedNodeDetails.memberId || 'N/A')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNodeDetails(null)}
                className="p-1 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">Mobile:</span>
                  <strong className="text-slate-900">{safeText(selectedNodeDetails.phone || '-')}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Sponsor ID:</span>
                  <strong className="text-pink-700">{safeText(selectedNodeDetails.sponsorId || 'DIRECT')}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Package / Donation:</span>
                  <strong className="text-emerald-700">{formatCurrency(selectedNodeDetails.packageAmount || selectedNodeDetails.packageTier || 0)}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status:</span>
                  <strong className="text-emerald-700 uppercase">{selectedNodeDetails.status || 'Active'}</strong>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setActiveRootId(selectedNodeDetails.memberId || selectedNodeDetails.uid);
                  setSelectedNodeDetails(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-black transition cursor-pointer"
              >
                View Network Tree Under This Member →
              </button>
              <button
                type="button"
                onClick={() => setSelectedNodeDetails(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
