import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Users, 
  Layers, 
  Search, 
  Filter, 
  Printer, 
  Download, 
  Eye, 
  EyeOff, 
  Copy, 
  Check, 
  Calendar,
  IndianRupee,
  Phone,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { rtdb } from '../lib/firebase';
import { ref, get } from 'firebase/database';
import { formatINR, safeText } from '../lib/constants';
import { 
  buildMember12LevelReport, 
  getMemberFullName, 
  normId, 
  parseAmount,
  findParentMember 
} from '../utils/mlmUtils';
import TableSlideScroller from './ui/TableSlideScroller';
import { VoucherPrintButton } from './CommissionVoucher';

export default function DownlineReportSection({ initialMemberId = '' }) {
  const fileRef = useRef(null);
  const photoRef = useRef(null);
  const inputRef = useRef(null);

  const { member, userProfile } = useAuth();
  const [allUsers, setAllUsers] = useState({});
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchMemberQuery, setSearchMemberQuery] = useState(initialMemberId || '');
  const [levelFilter, setLevelFilter] = useState('ALL'); // 'ALL' | 1 | 2 ... 12
  const [tableSearch, setTableSearch] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [copiedId, setCopiedId] = useState('');

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
        console.error('Error loading users for Downline Report:', err);
      }
    }
    load();
  }, [initialMemberId, userProfile?.memberId, member?.memberId]);

  const activeUser = selectedUser || userProfile || member;
  const report = useMemo(() => {
    return buildMember12LevelReport(activeUser, allUsers) || {
      fullDownlineList: [],
      levelBreakdown: [],
      totalTeamMembers: 0,
      totalTeamBusiness: 0
    };
  }, [activeUser, allUsers]);

  // Filter members by Level and Search string
  const filteredList = useMemo(() => {
    if (!report?.fullDownlineList) return [];
    let list = report.fullDownlineList;

    if (levelFilter !== 'ALL') {
      const lvlNum = Number(levelFilter);
      list = list.filter(m => Number(m.level) === lvlNum);
    }

    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase();
      list = list.filter(m => 
        (m.name && m.name.toLowerCase().includes(q)) ||
        (m.memberId && m.memberId.toLowerCase().includes(q)) ||
        (m.phone && m.phone.includes(q)) ||
        (m.sponsorIdResolved && m.sponsorIdResolved.toLowerCase().includes(q))
      );
    }

    return list;
  }, [report?.fullDownlineList, levelFilter, tableSearch]);

  const togglePasswordVisibility = (uid) => {
    setVisiblePasswords(prev => ({ ...prev, [uid]: !prev[uid] }));
  };

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedId(key);
    setTimeout(() => setCopiedId(''), 2000);
  };

  const handleExportCSV = () => {
    if (!filteredList.length) return;
    const rows = [
      ['S.No.', 'Level', 'Member Name', 'User ID No.', 'Password', 'Mobile No.', 'Joined Under (Sponsor)', 'Joining Date', 'Business Amount (INR)'],
      ...filteredList.map((m, idx) => [
        idx + 1,
        `Level ${m.level}`,
        getMemberFullName(m),
        m.memberId || 'N/A',
        m.plainPassword || m.password || 'UCWF@1234',
        m.phone || '—',
        `${m.sponsorIdResolved || m.sponsorId || 'DIRECT'} (${m.sponsorNameResolved || ''})`,
        m.joiningDate || m.applicationDate || m.createdAt || '17/10/2026',
        m.packageAmount || 500
      ])
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Downline_Report_${activeUser?.memberId || 'Team'}_Level_${levelFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const searchedMembersDropdown = searchMemberQuery.trim() ? Object.values(allUsers).filter(u => {
    const q = searchMemberQuery.toLowerCase();
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.memberId && u.memberId.toLowerCase().includes(q)) ||
      (u.phone && u.phone.includes(q))
    );
  }).slice(0, 10) : [];

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-purple-200 shadow-sm max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-purple-100">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/30">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <span>Downline Report / 12-लेवल डाउनलाइन रिपोर्ट</span>
              <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 text-xs font-bold font-mono">
                Levels 1 to 12 Hierarchy
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              चयनित सदस्य के अंतर्गत लेवल 1 से लेकर लेवल 12 तक का क्रमिक डाउनलाइन विवरण, आईडी, पासवर्ड एवं पैकेज बिजनेस।
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <VoucherPrintButton member={activeUser} allUsers={allUsers} size="normal" />
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-300 flex items-center gap-1.5 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV Export</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-300 flex items-center gap-1.5 transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>प्रिंट</span>
          </button>
        </div>
      </div>

      {/* Target Member Selector Strip */}
      <div className="p-3 bg-purple-50/70 rounded-2xl border border-purple-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
          <span>डाउनलाइन देखने हेतु सदस्य: <strong className="text-purple-950 font-black">{getMemberFullName(activeUser)} ({activeUser?.memberId})</strong></span>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchMemberQuery}
            onChange={(e) => setSearchMemberQuery(e.target.value)}
            placeholder="सदस्य आईडी (e.g. 8647) या नाम..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white border border-purple-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 font-bold"
          />
          {searchedMembersDropdown.length > 0 && searchMemberQuery.trim() && (
            <div className="absolute top-full left-0 right-0 z-30 mt-1 max-h-48 overflow-y-auto bg-white rounded-xl shadow-lg border border-purple-200 divide-y divide-slate-100">
              {searchedMembersDropdown.map(u => (
                <button
                  key={u.uid || u.memberId}
                  type="button"
                  onClick={() => {
                    setSelectedUser(u);
                    setSearchMemberQuery('');
                  }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-purple-50 flex items-center justify-between cursor-pointer"
                >
                  <strong className="text-slate-900">{getMemberFullName(u)}</strong>
                  <span className="font-mono text-purple-900 font-bold">{u.memberId}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Level Filter Tabs (All Levels + L1 to L12) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-purple-600" />
            <span>लेवल फ़िल्टर (Select Generation Level):</span>
          </span>
          <span className="text-xs font-bold text-purple-900 font-mono">
            चयनित परिणाम: {filteredList.length} सदस्य • बिजनेस: {formatINR(filteredList.reduce((sum, m) => sum + parseAmount(m), 0))}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setLevelFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              levelFilter === 'ALL'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-purple-50 hover:text-purple-900 border border-slate-200'
            }`}
          >
            All Levels (L1–L12) ({report.totalTeamMembers})
          </button>

          {Array.from({ length: 12 }, (_, i) => i + 1).map((lvl) => {
            const count = report.levelBreakdown?.[lvl - 1]?.count || 0;
            const isSelected = levelFilter === lvl;
            return (
              <button
                key={lvl}
                type="button"
                onClick={() => setLevelFilter(lvl)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                  isSelected
                    ? 'bg-purple-700 text-white shadow-xs'
                    : count > 0
                    ? 'bg-purple-50 text-purple-900 border border-purple-200 hover:bg-purple-100'
                    : 'bg-slate-50 text-slate-400 border border-slate-200 opacity-60'
                }`}
              >
                <span>L{lvl}</span>
                <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px] font-mono">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Downline Table Search Input */}
      <div className="relative w-full sm:w-72">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={tableSearch}
          onChange={(e) => setTableSearch(e.target.value)}
          placeholder="तालिका में नाम, आईडी, मोबाइल खोजें..."
          className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-bold"
        />
      </div>

      {/* Complete Downline Table */}
      <TableSlideScroller title="Downline Level 1 to 12 Hierarchy Ledger">
        <table className="w-full text-xs text-left border-collapse table-auto">
          <thead className="bg-purple-50 text-slate-800 font-bold border-b border-purple-200">
            <tr>
              <th className="py-2.5 px-3 text-center border-r border-purple-100">S.No.</th>
              <th className="py-2.5 px-3 border-r border-purple-100 whitespace-nowrap">Level (L1–L12)</th>
              <th className="py-2.5 px-3 border-r border-purple-100 whitespace-nowrap">Member Name</th>
              <th className="py-2.5 px-3 border-r border-purple-100 whitespace-nowrap">User ID No.</th>
              <th className="py-2.5 px-3 border-r border-purple-100 whitespace-nowrap">Password</th>
              <th className="py-2.5 px-3 border-r border-purple-100 whitespace-nowrap">Mobile No.</th>
              <th className="py-2.5 px-3 border-r border-purple-100 whitespace-nowrap">Joined Under (Sponsor ID & Name)</th>
              <th className="py-2.5 px-3 text-center border-r border-purple-100 whitespace-nowrap">Joining Date</th>
              <th className="py-2.5 px-3 text-right whitespace-nowrap">Business Amount (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filteredList.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-xs text-slate-400 font-medium">
                  {tableSearch.trim() || levelFilter !== 'ALL'
                    ? 'खोज एवं फ़िल्टर के अनुरूप कोई डाउनलाइन सदस्य नहीं मिला।'
                    : 'इस सदस्य के अंतर्गत अभी कोई डाउनलाइन सदस्य उपलब्ध नहीं है।'}
                </td>
              </tr>
            ) : (
              filteredList.map((m, index) => {
                const isPassVisible = !!visiblePasswords[m.uid || index];
                const rawDate = m.joiningDate || m.applicationDate || m.createdAt || m.timestamp || '17/10/2026';
                let displayDate = '17/10/2026';
                try {
                  const d = new Date(rawDate);
                  if (!isNaN(d.getTime())) {
                    displayDate = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                  }
                } catch (_) {}

                return (
                  <tr key={m.uid || index} className="hover:bg-purple-50/40 transition-colors">
                    {/* 1. S.No. */}
                    <td className="py-2 px-3 text-center font-mono text-slate-500 font-medium border-r border-purple-50">
                      {index + 1}
                    </td>

                    {/* 2. Level (L1-L12) */}
                    <td className="py-2 px-3 border-r border-purple-50 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black font-mono border ${
                        m.level === 1 
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          : m.level === 2
                          ? 'bg-blue-100 text-blue-900 border-blue-300'
                          : 'bg-purple-100 text-purple-900 border-purple-200'
                      }`}>
                        Level {m.level} ({m.rate}%)
                      </span>
                    </td>

                    {/* 3. Member Name */}
                    <td className="py-2 px-3 border-r border-purple-50 whitespace-nowrap">
                      <div className="font-bold text-slate-900">{getMemberFullName(m)}</div>
                      {m.padNaam && <div className="text-[10px] text-slate-500">{m.padNaam}</div>}
                    </td>

                    {/* 4. User ID No. */}
                    <td className="py-2 px-3 border-r border-purple-50 whitespace-nowrap">
                      <span className="font-mono text-purple-900 font-bold bg-purple-50 px-2 py-0.5 rounded border border-purple-200 inline-block">
                        {safeText(m.memberId || 'N/A')}
                      </span>
                    </td>

                    {/* 5. Password */}
                    <td className="py-2 px-3 border-r border-purple-50 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200 font-mono text-xs">
                        <span className="text-slate-800 font-bold">
                          {isPassVisible ? safeText(m.password || m.plainPassword || 'UCWF@1234') : '••••••••'}
                        </span>
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility(m.uid || index)}
                          className="text-slate-400 hover:text-slate-700 p-0.5"
                          title="Toggle password"
                        >
                          {isPassVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopy(m.password || m.plainPassword || 'UCWF@1234', `pass_${index}`)}
                          className="text-slate-400 hover:text-purple-600 p-0.5"
                          title="Copy password"
                        >
                          {copiedId === `pass_${index}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>

                    {/* 6. Mobile No. */}
                    <td className="py-2 px-3 border-r border-purple-50 whitespace-nowrap font-mono">
                      <a href={`tel:${m.phone}`} className="text-slate-700 hover:text-purple-700 hover:underline">
                        {m.phone || '—'}
                      </a>
                    </td>

                    {/* 7. Joined Under (Sponsor ID & Name) */}
                    <td className="py-2 px-3 border-r border-purple-50 whitespace-nowrap">
                      <div className="font-mono text-slate-800 font-bold">{m.sponsorIdResolved || m.sponsorId || 'DIRECT'}</div>
                      <div className="text-[10px] text-slate-500">{m.sponsorNameResolved || 'Foundation'}</div>
                    </td>

                    {/* 8. Joining Date */}
                    <td className="py-2 px-3 text-center border-r border-purple-50 whitespace-nowrap font-mono text-slate-700">
                      {displayDate}
                    </td>

                    {/* 9. Business Amount (₹) */}
                    <td className="py-2 px-3 text-right font-mono font-black text-slate-900 whitespace-nowrap">
                      {formatINR(m.packageAmount || 500)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </TableSlideScroller>

      {/* Bottom Print Voucher Button */}
      <div className="flex justify-center pt-2 print:hidden">
        <VoucherPrintButton member={activeUser} allUsers={allUsers} size="large" label="🖨️ वाउचर प्रिंट करें / Print Commission Voucher" />
      </div>
    </div>
  );
}
