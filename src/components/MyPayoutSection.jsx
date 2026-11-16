import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  IndianRupee, 
  Percent, 
  Printer, 
  Download, 
  Search, 
  Layers, 
  CheckCircle2, 
  TrendingUp, 
  ShieldCheck, 
  Building2, 
  Award, 
  User,
  Users
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { rtdb } from '../lib/firebase';
import { ref, get } from 'firebase/database';
import { formatINR, safeText } from '../lib/constants';
import { 
  buildMember12LevelReport, 
  getMemberFullName, 
  normId, 
  DEFAULT_LEVEL_RATES 
} from '../utils/mlmUtils';
import TableSlideScroller from './ui/TableSlideScroller';
import { VoucherPrintButton } from './CommissionVoucher';

export default function MyPayoutSection({ initialMemberId = '' }) {
  const fileRef = useRef(null);
  const photoRef = useRef(null);
  const inputRef = useRef(null);
  const printRef = useRef(null);

  const { member, userProfile } = useAuth();
  const [allUsers, setAllUsers] = useState({});
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState(initialMemberId || '');

  // Load all users from RTDB
  useEffect(() => {
    async function load() {
      try {
        const snap = await get(ref(rtdb, 'users'));
        if (snap.exists()) {
          const val = snap.val();
          setAllUsers(val);

          const list = Object.values(val);
          const defaultTarget = list.find(u => 
            (initialMemberId && normId(u.memberId) === normId(initialMemberId)) ||
            (userProfile?.memberId && normId(u.memberId) === normId(userProfile.memberId)) ||
            (member?.memberId && normId(u.memberId) === normId(member.memberId))
          ) || userProfile || member || list[0];

          setSelectedUser(defaultTarget);
        }
      } catch (err) {
        console.error('Error loading users for My Payout:', err);
      }
    }
    load();
  }, [initialMemberId, userProfile?.memberId, member?.memberId]);

  const activeUser = selectedUser || userProfile || member;
  const report = useMemo(() => {
    return buildMember12LevelReport(activeUser, allUsers) || {
      levelBreakdown: [],
      selfBusiness: 0,
      totalTeamBusiness: 0,
      totalCommission: 0,
      totalDistributedChain: 0,
      paidPayout: 0,
      unpaidPayout: 0
    };
  }, [activeUser, allUsers]);

  const paid = Number(activeUser?.commissionPaid || activeUser?.paidPayout || report.paidPayout || 0);
  const unpaid = Math.max(0, report.totalCommission - paid);
  const trust50Share = report.totalTeamBusiness * 0.50; // 50% retained by Trust

  const handlePrint = () => {
    window.print();
  };

  const searchedMembersDropdown = searchQuery.trim() ? Object.values(allUsers).filter(u => {
    const q = searchQuery.toLowerCase();
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.memberId && u.memberId.toLowerCase().includes(q)) ||
      (u.phone && u.phone.includes(q))
    );
  }).slice(0, 10) : [];

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-200 shadow-sm max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-emerald-100">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/30">
            <IndianRupee className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <span>My Payout / 12-लेवल मानदेय पेआउट विवरण तालिका</span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold font-mono">
                Locked 50% Distribution
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              लेवल 1 (20%) से लेवल 12 (1%) तक कुल 50% मानदेय वितरण तालिका। प्रत्येक लेवल के सदस्य, व्यापार एवं सटीक कमीशन गणना।
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Member Search */}
          <div className="relative w-48 sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="सदस्य आईडी (e.g. 8647)..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
            />
            {searchedMembersDropdown.length > 0 && searchQuery.trim() && (
              <div className="absolute top-full left-0 right-0 z-30 mt-1 max-h-48 overflow-y-auto bg-white rounded-xl shadow-lg border border-slate-200 divide-y divide-slate-100">
                {searchedMembersDropdown.map(u => (
                  <button
                    key={u.uid || u.memberId}
                    type="button"
                    onClick={() => {
                      setSelectedUser(u);
                      setSearchQuery('');
                    }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-emerald-50 flex items-center justify-between cursor-pointer"
                  >
                    <strong className="text-slate-900">{getMemberFullName(u)}</strong>
                    <span className="font-mono text-emerald-900 font-bold">{u.memberId}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <VoucherPrintButton member={activeUser} allUsers={allUsers} size="normal" />
          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-300 flex items-center gap-1.5 transition cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>प्रिंट</span>
          </button>
        </div>
      </div>

      <div ref={printRef} className="space-y-6">
        {/* Selected Member Info Strip */}
        <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-300 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-slate-600">पेआउट विवरण ID: </span>
            <strong className="text-emerald-950 font-black text-sm">{getMemberFullName(activeUser)} ({activeUser?.memberId})</strong>
            <span className="text-slate-500 ml-2">| मो: {activeUser?.phone || '—'}</span>
          </div>
          <div className="flex items-center gap-3 font-mono font-bold">
            <span className="text-slate-700">Self Biz: <strong>{formatINR(report.selfBusiness)}</strong></span>
            <span>•</span>
            <span className="text-emerald-800">Total Downline Biz: <strong>{formatINR(report.totalTeamBusiness)}</strong></span>
            <span>•</span>
            <span className="text-emerald-950 font-black text-sm">Total Commission: <strong className="text-emerald-900 bg-white px-2 py-0.5 rounded border border-emerald-300">{formatINR(report.totalCommission)}</strong></span>
          </div>
        </div>

        {/* 12-Level Payout Table (Matching Handwritten Sheet for UCWF-2026-8647) */}
        <TableSlideScroller title="All 12 Level Commission Breakdown Table (100% Client Spec)">
          <table className="w-full text-xs text-left border-collapse table-auto">
            <thead className="bg-emerald-900 text-white font-bold border-b border-emerald-950">
              <tr>
                <th className="py-3 px-3 border-r border-emerald-800 whitespace-nowrap text-center">Level No. (L1–L12)</th>
                <th className="py-3 px-3 border-r border-emerald-800 whitespace-nowrap text-center">Commission Rate (%)</th>
                <th className="py-3 px-3 border-r border-emerald-800 whitespace-nowrap">Members in This Level (Names & IDs)</th>
                <th className="py-3 px-3 border-r border-emerald-800 whitespace-nowrap text-right">Level Business (₹)</th>
                <th className="py-3 px-3 border-r border-emerald-800 whitespace-nowrap text-right">Upline Commission Earned (₹)</th>
                <th className="py-3 px-3 whitespace-nowrap text-center">50% Pool Share Breakdown</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((lvl) => {
                const row = report.levelBreakdown?.[lvl - 1] || {
                  level: lvl,
                  rate: DEFAULT_LEVEL_RATES[lvl],
                  count: 0,
                  business: 0,
                  commission: 0,
                  members: []
                };

                const membersDisplay = row.members && row.members.length > 0
                  ? row.members.map(m => `${m.name || 'Member'} (${m.memberId})`).join(', ')
                  : '0 members';

                return (
                  <tr key={lvl} className="hover:bg-emerald-50/40 transition-colors">
                    {/* 1. Level No. */}
                    <td className="py-2.5 px-3 border-r border-slate-200 text-center font-black font-mono whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-xs ${
                        lvl === 1 
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 font-black'
                          : lvl <= 3
                          ? 'bg-blue-50 text-blue-900 border border-blue-200 font-bold'
                          : 'bg-slate-100 text-slate-800 font-bold'
                      }`}>
                        Level {lvl}
                      </span>
                    </td>

                    {/* 2. Commission Rate (%) */}
                    <td className="py-2.5 px-3 border-r border-slate-200 text-center font-black font-mono text-emerald-800 text-sm whitespace-nowrap">
                      {row.rate}%
                    </td>

                    {/* 3. Members in This Level (Names & IDs) */}
                    <td className="py-2.5 px-3 border-r border-slate-200">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-slate-900 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[11px]">
                          {row.count} {row.count === 1 ? 'सदस्य' : 'सदस्य'}
                        </span>
                        {row.members && row.members.length > 0 && (
                          <span className="text-slate-700 font-medium">
                            {membersDisplay}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 4. Level Business (₹) */}
                    <td className="py-2.5 px-3 border-r border-slate-200 text-right font-mono font-bold text-slate-900 text-sm whitespace-nowrap">
                      {formatINR(row.business)}
                    </td>

                    {/* 5. Upline Commission Earned (₹) */}
                    <td className="py-2.5 px-3 border-r border-slate-200 text-right font-mono font-black text-emerald-900 text-sm whitespace-nowrap bg-emerald-50/30">
                      {formatINR(row.commission)}
                    </td>

                    {/* 6. 50% Pool Share Breakdown */}
                    <td className="py-2.5 px-3 text-center font-mono text-slate-600 text-xs whitespace-nowrap">
                      {row.business > 0 ? (
                        <span>
                          {row.rate}% of {formatINR(row.business)} = <strong className="text-emerald-900 font-bold">{formatINR(row.commission)}</strong>
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Total Footer Row */}
            <tfoot className="bg-emerald-950 text-white font-mono text-xs font-black border-t-2 border-emerald-900">
              <tr>
                <td className="py-3 px-3 text-center">GRAND TOTAL</td>
                <td className="py-3 px-3 text-center text-amber-300">50% Locked</td>
                <td className="py-3 px-3 font-sans">
                  Total Team: {report.totalTeamMembers} Members (L1 to L12)
                </td>
                <td className="py-3 px-3 text-right text-emerald-200 text-sm">
                  {formatINR(report.totalTeamBusiness)}
                </td>
                <td className="py-3 px-3 text-right text-amber-300 text-base">
                  {formatINR(report.totalCommission)}
                </td>
                <td className="py-3 px-3 text-center text-slate-300 text-[11px]">
                  50% Commission Pool: {formatINR(trust50Share)}
                </td>
              </tr>
            </tfoot>
          </table>
        </TableSlideScroller>

        {/* 4 Bottom Grand Total Cards (Matching Exact Client Breakdown) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {/* Card 1: Grand Total Downline Business */}
          <div className="p-4 rounded-2xl bg-slate-900 text-white border-2 border-slate-800 shadow-md">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Grand Total Downline Biz
            </span>
            <p className="text-2xl font-black font-mono text-white mt-1">
              {formatINR(report.totalTeamBusiness)}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              सभी 12 लेवल्स का कुल टर्नओवर
            </p>
          </div>

          {/* Card 2: Total Commission Earned by this ID */}
          <div className="p-4 rounded-2xl bg-emerald-600 text-white border-2 border-emerald-500 shadow-md">
            <span className="text-[11px] font-bold text-emerald-100 uppercase tracking-wider block">
              This ID Earned Commission
            </span>
            <p className="text-2xl font-black font-mono text-white mt-1">
              {formatINR(report.totalCommission)}
            </p>
            <p className="text-[10px] text-emerald-100 mt-0.5">
              इस आईडी द्वारा अर्जित कुल मानदेय
            </p>
          </div>

          {/* Card 3: 50% Commission Distributed Across Entire Chain */}
          <div className="p-4 rounded-2xl bg-amber-500 text-slate-950 border-2 border-amber-400 shadow-md">
            <span className="text-[11px] font-bold text-slate-900 uppercase tracking-wider block">
              50% Total Chain Pool
            </span>
            <p className="text-2xl font-black font-mono text-slate-950 mt-1">
              {formatINR(report.totalDistributedChain)}
            </p>
            <p className="text-[10px] text-slate-800 mt-0.5 font-bold">
              12-लेवल में कुल वितरित मानदेय पूल
            </p>
          </div>

          {/* Card 4: Trust 50% Retained Share */}
          <div className="p-4 rounded-2xl bg-teal-800 text-white border-2 border-teal-700 shadow-md">
            <span className="text-[11px] font-bold text-teal-200 uppercase tracking-wider block">
              Trust 50% Retained Share
            </span>
            <p className="text-2xl font-black font-mono text-white mt-1">
              {formatINR(trust50Share)}
            </p>
            <p className="text-[10px] text-teal-200 mt-0.5">
              फाउंडेशन सामाजिक सेवा हेतु आरक्षित
            </p>
          </div>
        </div>

        {/* Payout Status & Payment Tracking */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs font-bold text-slate-700">
          <div>
            <span>कुल अर्जित मानदेय: <strong className="font-mono text-slate-900 text-sm">{formatINR(report.totalCommission)}</strong></span>
            <span className="mx-2">•</span>
            <span>भुगतान प्राप्त: <strong className="font-mono text-emerald-700 text-sm">{formatINR(paid)}</strong></span>
            <span className="mx-2">•</span>
            <span>बकाया मानदेय: <strong className="font-mono text-rose-700 text-sm">{formatINR(unpaid)}</strong></span>
          </div>

          <div>
            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
              unpaid <= 0 && report.totalCommission > 0
                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                : paid > 0
                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                : 'bg-rose-100 text-rose-900 border border-rose-300'
            }`}>
              {unpaid <= 0 && report.totalCommission > 0 ? '✅ पूर्ण भुगतान (Fully Paid)' : paid > 0 ? '⏳ आंशिक भुगतान (Partial)' : '⏳ भुगतान लंबित (Pending)'}
            </span>
          </div>
        </div>

        {/* Bottom Print Voucher Button */}
        <div className="flex justify-center pt-2 print:hidden">
          <VoucherPrintButton member={activeUser} allUsers={allUsers} size="large" label="🖨️ वाउचर प्रिंट करें / Print Commission Voucher" />
        </div>
      </div>
    </div>
  );
}
