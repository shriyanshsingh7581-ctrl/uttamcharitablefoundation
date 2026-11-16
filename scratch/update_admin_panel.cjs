const fs = require('fs');

const path = 'src/pages/AdminPanel.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Update imports
const oldCommissionImport = `import { 
  getSavedLevelRates, 
  saveLevelRates, 
  getSavedSelfBusinessRate,
  saveSelfBusinessRate,
  getUplineChain, 
  distributeManualCommission, 
  distribute12LevelCommission 
} from '../utils/commission';`;

const newCommissionImport = `import { 
  getSavedLevelRates, 
  saveLevelRates, 
  getSavedSelfBusinessRate,
  saveSelfBusinessRate,
  getUplineChain, 
  distributeManualCommission, 
  distribute12LevelCommission,
  calculateMemberTreeMetrics,
  syncAndFixAllMemberBalances
} from '../utils/commission';
import MemberReportLookup from '../components/MemberReportLookup';`;

if (content.includes(oldCommissionImport)) {
  content = content.replace(oldCommissionImport, newCommissionImport);
  console.log('1. Updated commission imports');
} else {
  console.warn('Could not find oldCommissionImport');
}

const oldConstantsImport = `import { FOUNDATION_DETAILS, PACKAGES, formatINR, safeText } from '../lib/constants';`;
const newConstantsImport = `import { FOUNDATION_DETAILS, PACKAGES, formatCurrency, formatINR, safeText } from '../lib/constants';`;
if (content.includes(oldConstantsImport)) {
  content = content.replace(oldConstantsImport, newConstantsImport);
  console.log('2. Updated constants import');
}

// 2. Add tree metrics and sync balances logic
const oldTotalsHook = `  // Total Members Business & Commission (Requirement 3 & 5)
  const totalMembersBusiness = useMemo(() => {
    return sortedMembers.reduce((sum, m) => sum + Number(m.packageAmount || m.packageTier || 500), 0);
  }, [sortedMembers]);

  const totalMembersCommission = useMemo(() => {
    return sortedMembers.reduce((sum, m) => sum + Number(m.totalEarned || m.totalCommission || Math.round((m.packageAmount || 500) * 0.05)), 0);
  }, [sortedMembers]);`;

const newTotalsHook = `  // Live Tree Metrics calculation for all members
  const memberTreeMetricsMap = useMemo(() => {
    const map = {};
    if (!users || Object.keys(users).length === 0) return map;
    Object.entries(users).forEach(([uid, u]) => {
      if (u) {
        map[uid] = calculateMemberTreeMetrics(u, users, levelRates, selfBusinessRate);
      }
    });
    return map;
  }, [users, levelRates, selfBusinessRate]);

  // Aggregate Totals across sorted members
  const memberTotals = useMemo(() => {
    let selfBiz = 0;
    let directBiz = 0;
    let downBiz = 0;
    let totalComm = 0;

    sortedMembers.forEach((m) => {
      const met = memberTreeMetricsMap[m.uid] || {
        selfBusiness: Number(m.packageAmount || m.packageTier || 0),
        directBusiness: 0,
        downlineBusiness: 0,
        totalCommission: Number(m.totalCommission || 0)
      };
      selfBiz += met.selfBusiness;
      directBiz += met.directBusiness;
      downBiz += met.downlineBusiness;
      totalComm += met.totalCommission;
    });

    return {
      totalSelfBusiness: selfBiz,
      totalDirectBusiness: directBiz,
      totalDownlineBusiness: downBiz,
      totalCommission: totalComm
    };
  }, [sortedMembers, memberTreeMetricsMap]);

  const totalMembersBusiness = memberTotals.totalSelfBusiness;
  const totalMembersCommission = memberTotals.totalCommission;

  // 1-Click Recalculate & Fix All Member Balances
  const [isSyncingBalances, setIsSyncingBalances] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState('');
  const [showMemberLookupInAdmin, setShowMemberLookupInAdmin] = useState(false);

  const handleSyncAndFixBalances = async () => {
    if (!window.confirm('Are you sure you want to recalculate and fix all member commission balances in Firebase? This will overwrite any stale values with live mathematically verified downline tree totals.')) {
      return;
    }
    setIsSyncingBalances(true);
    setSyncStatusMsg('');
    try {
      const res = await syncAndFixAllMemberBalances();
      setSyncStatusMsg(res.message);
      setTimeout(() => setSyncStatusMsg(''), 6000);
    } catch (err) {
      console.error('Error syncing balances:', err);
      setSyncStatusMsg('Recalculation error: ' + err.message);
    } finally {
      setIsSyncingBalances(false);
    }
  };`;

if (content.includes(oldTotalsHook)) {
  content = content.replace(oldTotalsHook, newTotalsHook);
  console.log('3. Updated member totals hook and added sync balance handler');
} else {
  console.warn('Could not find oldTotalsHook');
}

// 3. Update CSV export
const oldExport = `    const data = sortedMembers.map((m, idx) => ({
      'S.No.': idx + 1,
      'Member Name': \`\${m.salutation || ''} \${m.name || ''}\`.trim(),
      'User ID No.': m.memberId || 'N/A',
      'Password': m.plainPassword || m.password || 'UCWF@1234',
      'Mobile No.': m.phone || 'N/A',
      'Referral / Sponsor ID': getSponsorDisplayName(m.sponsorId),
      'Business (INR)': Number(m.packageAmount || m.packageTier || 500),
      'Commission (INR)': Number(m.totalEarned || m.totalCommission || Math.round((m.packageAmount || 500) * 0.05)),
    }));`;

const newExport = `    const data = sortedMembers.map((m, idx) => {
      const met = memberTreeMetricsMap[m.uid] || {
        selfBusiness: Number(m.packageAmount || m.packageTier || 0),
        directMembersCount: 0,
        directBusiness: 0,
        downlineMembersCount: 0,
        downlineBusiness: 0,
        totalCommission: Number(m.totalCommission || 0)
      };
      return {
        'S.No.': idx + 1,
        'Member Name': \`\${m.salutation || ''} \${m.name || ''}\`.trim(),
        'User ID No.': m.memberId || 'N/A',
        'Password': m.plainPassword || m.password || 'UCWF@1234',
        'Mobile Number': m.phone || 'N/A',
        'Referral / Sponsor ID': getSponsorDisplayName(m.sponsorId),
        'Self Business (INR)': met.selfBusiness,
        'Direct Members Count': met.directMembersCount,
        'Direct Business Collection (INR)': met.directBusiness,
        'Downline Team Members Count': met.downlineMembersCount,
        'Downline Team Business (INR)': met.downlineBusiness,
        'Total Commission (INR)': met.totalCommission,
      };
    });`;

if (content.includes(oldExport)) {
  content = content.replace(oldExport, newExport);
  console.log('4. Updated CSV export');
}

// 4. Update Tab 1 Toolbar to add Recalculate and Member Lookup buttons
const oldToolbarSearch = `                {/* Search */}
                <div className="relative w-full sm:w-64">`;

const newToolbarSearch = `                {/* 1-Click Recalculate & Fix All Balances */}
                <button
                  type="button"
                  disabled={isSyncingBalances}
                  onClick={handleSyncAndFixBalances}
                  className="px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold text-xs border border-purple-200 flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                  title="Recalculate all member balances mathematically from live tree hierarchy"
                >
                  <RefreshCw className={\`w-3.5 h-3.5 text-purple-700 \${isSyncingBalances ? 'animate-spin' : ''}\`} />
                  <span>{isSyncingBalances ? 'Recalculating...' : 'Recalculate & Fix Balances'}</span>
                </button>

                {/* Universal Member Report Lookup Toggle */}
                <button
                  type="button"
                  onClick={() => setShowMemberLookupInAdmin(!showMemberLookupInAdmin)}
                  className={\`px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition cursor-pointer \${
                    showMemberLookupInAdmin
                      ? 'bg-pink-600 text-white border-pink-600 shadow-sm'
                      : 'bg-pink-50 hover:bg-pink-100 text-pink-800 border-pink-200'
                  }\`}
                  title="Open Check Member Business & Team Report Tool"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>{showMemberLookupInAdmin ? 'Close Lookup' : 'Check Member Report'}</span>
                </button>

                {/* Search */}
                <div className="relative w-full sm:w-64">`;

if (content.includes(oldToolbarSearch)) {
  content = content.replace(oldToolbarSearch, newToolbarSearch);
  console.log('5. Added toolbar buttons');
}

// Insert Sync message and Lookup component right after header strip
const oldAfterHeader = `              </div>
            </div>

            {/* Simplified 7-Column Master Report Table */}`;

const newAfterHeader = `              </div>
            </div>

            {syncStatusMsg && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-bold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{syncStatusMsg}</span>
              </div>
            )}

            {showMemberLookupInAdmin && (
              <div className="p-6 rounded-3xl bg-pink-50/50 border-2 border-pink-200 shadow-sm">
                <MemberReportLookup isAdminMode={true} embeddedTitle="Universal Member Business & Team Report Lookup" />
              </div>
            )}

            {/* 10-Column Members Master Report Table */}`;

if (content.includes(oldAfterHeader)) {
  content = content.replace(oldAfterHeader, newAfterHeader);
  console.log('6. Added sync message and lookup panel in Tab 1');
}

// 5. Update Tab 1 Table Headers & Rows to exact 10 columns
const oldTableHeaderAndBody = `                  <thead className="bg-pink-50/80 text-slate-700 font-bold border-b border-pink-200">
                    <tr>
                      <th className="py-3 px-3 text-center w-12">S.No.</th>
                      <th className="py-3 px-3">Member Name</th>
                      <th className="py-3 px-3">User ID No.</th>
                      <th className="py-3 px-3">Password</th>
                      <th className="py-3 px-3">Mobile No.</th>
                      <th className="py-3 px-3">Referral / Sponsor ID</th>
                      <th className="py-3 px-3 text-right">Business (₹)</th>
                      <th className="py-3 px-3 text-right">Commission (₹)</th>
                      <th className="py-3 px-3 text-center w-20">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {sortedMembers.map((member, index) => {
                      const isPassVisible = !!visiblePasswords[member.uid];
                      const memberBiz = Number(member.packageAmount || member.packageTier || 500);
                      const memberComm = Number(member.totalEarned || member.totalCommission || Math.round(memberBiz * 0.05));
                      const cleanFullName = \`\${member.salutation || ''} \${member.name || ''}\`.trim() || 'Member';

                      return (
                        <tr key={member.uid || index} className="hover:bg-pink-50/40 transition-colors">
                          {/* 1. S.No. */}
                          <td className="py-3 px-3 text-center font-mono text-slate-500 font-medium">
                            {index + 1}
                          </td>

                          {/* 2. Member Name */}
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900 text-xs">
                              {cleanFullName}
                            </div>
                          </td>

                          {/* 3. User ID No. */}
                          <td className="py-3 px-3">
                            <span className="font-mono text-pink-700 font-bold bg-pink-50 px-2 py-0.5 rounded border border-pink-200 inline-block">
                              {safeText(member.memberId || 'N/A')}
                            </span>
                          </td>

                          {/* 4. Password */}
                          <td className="py-3 px-3">
                            <div className="inline-flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200 font-mono text-xs">
                              <span className="text-slate-800 font-bold">
                                {isPassVisible ? safeText(member.password || member.plainPassword || 'UCWF@1234') : '••••••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() => togglePasswordVisibility(member.uid)}
                                className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                                title="Toggle password visibility"
                              >
                                {isPassVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCopy(member.password || member.plainPassword || 'UCWF@1234', \`pass_\${member.uid}\`)}
                                className="text-slate-400 hover:text-pink-600 p-0.5 cursor-pointer"
                                title="Copy password"
                              >
                                {copiedKey === \`pass_\${member.uid}\` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>

                          {/* 5. Mobile No. */}
                          <td className="py-3 px-3 font-mono font-medium text-slate-700">
                            {safeText(member.phone || '-')}
                          </td>

                          {/* 6. Referral / Sponsor ID */}
                          <td className="py-3 px-3 font-mono text-xs text-slate-600">
                            {getSponsorDisplayName(member.sponsorId)}
                          </td>

                          {/* 7. Business (₹) */}
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                            ₹{formatINR(memberBiz)}
                          </td>

                          {/* 7. Commission (₹) */}
                          <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                            ₹{formatINR(memberComm)}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenManualCommissionModal(member, 'member')}
                                className="p-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition cursor-pointer"
                                title="Manual 12-Level Commission Distribution"
                              >
                                <IndianRupee className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingMember(member)}
                                className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition cursor-pointer"
                                title="Edit Member Profile"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {/* Summary Row */}
                  <tfoot className="bg-pink-100/70 border-t-2 border-pink-300 font-bold text-slate-900">
                    <tr>
                      <td colSpan={6} className="py-3 px-4 text-slate-800 text-xs font-black">
                        Total Company Members: <span className="font-mono text-pink-700 font-extrabold">{sortedMembers.length}</span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-black text-slate-950 text-xs">
                        ₹{formatINR(totalMembersBusiness)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-black text-emerald-800 text-xs">
                        ₹{formatINR(totalMembersCommission)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>`;

const newTableHeaderAndBody = `                  <thead className="bg-pink-50/80 text-slate-700 font-bold border-b border-pink-200">
                    <tr>
                      <th className="py-3 px-3 text-center w-12">S.No.</th>
                      <th className="py-3 px-3">Member Name</th>
                      <th className="py-3 px-3">User ID No.</th>
                      <th className="py-3 px-3">Password</th>
                      <th className="py-3 px-3">Mobile Number</th>
                      <th className="py-3 px-3">Referral / Sponsor ID</th>
                      <th className="py-3 px-3 text-right">Self Business (₹)</th>
                      <th className="py-3 px-3 text-right">Direct Members & Business (₹)</th>
                      <th className="py-3 px-3 text-right">Total Downline Team & Business (₹)</th>
                      <th className="py-3 px-3 text-right">Total Commission (₹)</th>
                      <th className="py-3 px-3 text-center w-20">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {sortedMembers.map((member, index) => {
                      const isPassVisible = !!visiblePasswords[member.uid];
                      const met = memberTreeMetricsMap[member.uid] || {
                        selfBusiness: Number(member.packageAmount || member.packageTier || 0),
                        directMembersCount: 0,
                        directBusiness: 0,
                        downlineMembersCount: 0,
                        downlineBusiness: 0,
                        totalCommission: Number(member.totalCommission || 0)
                      };
                      const cleanFullName = \`\${member.salutation || ''} \${member.name || ''}\`.trim() || 'Member';

                      return (
                        <tr key={member.uid || index} className="hover:bg-pink-50/40 transition-colors">
                          {/* 1. S.No. */}
                          <td className="py-3 px-3 text-center font-mono text-slate-500 font-medium">
                            {index + 1}
                          </td>

                          {/* 2. Member Name */}
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900 text-xs">
                              {cleanFullName}
                            </div>
                          </td>

                          {/* 3. User ID No. */}
                          <td className="py-3 px-3">
                            <span className="font-mono text-pink-700 font-bold bg-pink-50 px-2 py-0.5 rounded border border-pink-200 inline-block">
                              {safeText(member.memberId || 'N/A')}
                            </span>
                          </td>

                          {/* 4. Password */}
                          <td className="py-3 px-3">
                            <div className="inline-flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200 font-mono text-xs">
                              <span className="text-slate-800 font-bold">
                                {isPassVisible ? safeText(member.password || member.plainPassword || 'UCWF@1234') : '••••••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() => togglePasswordVisibility(member.uid)}
                                className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                                title="Toggle password visibility"
                              >
                                {isPassVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCopy(member.password || member.plainPassword || 'UCWF@1234', \`pass_\${member.uid}\`)}
                                className="text-slate-400 hover:text-pink-600 p-0.5 cursor-pointer"
                                title="Copy password"
                              >
                                {copiedKey === \`pass_\${member.uid}\` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>

                          {/* 5. Mobile Number */}
                          <td className="py-3 px-3 font-mono font-medium text-slate-700">
                            {safeText(member.phone || '-')}
                          </td>

                          {/* 6. Referral / Sponsor ID */}
                          <td className="py-3 px-3 font-mono text-xs text-slate-600">
                            {getSponsorDisplayName(member.sponsorId)}
                          </td>

                          {/* 7. Self Business (₹) */}
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                            {formatCurrency(met.selfBusiness)}
                          </td>

                          {/* 8. Direct Members & Direct Business (₹) */}
                          <td className="py-3 px-3 text-right">
                            <div className="font-mono text-xs font-bold text-pink-700">
                              {met.directMembersCount} {met.directMembersCount === 1 ? 'Member' : 'Members'}
                            </div>
                            <div className="font-mono text-[11px] text-slate-700 font-bold">
                              {formatCurrency(met.directBusiness)}
                            </div>
                          </td>

                          {/* 9. Total Downline Team & Total Business (₹) */}
                          <td className="py-3 px-3 text-right">
                            <div className="font-mono text-xs font-bold text-purple-700">
                              {met.downlineMembersCount} {met.downlineMembersCount === 1 ? 'Member' : 'Members'}
                            </div>
                            <div className="font-mono text-[11px] text-slate-700 font-bold">
                              {formatCurrency(met.downlineBusiness)}
                            </div>
                          </td>

                          {/* 10. Total Commission (₹) */}
                          <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                            {formatCurrency(met.totalCommission)}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenManualCommissionModal(member, 'member')}
                                className="p-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition cursor-pointer"
                                title="Manual 12-Level Commission Distribution"
                              >
                                <IndianRupee className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingMember(member)}
                                className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition cursor-pointer"
                                title="Edit Member Profile"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {/* Summary Row */}
                  <tfoot className="bg-pink-100/70 border-t-2 border-pink-300 font-bold text-slate-900">
                    <tr>
                      <td colSpan={6} className="py-3 px-4 text-slate-800 text-xs font-black">
                        Total Company Members: <span className="font-mono text-pink-700 font-extrabold">{sortedMembers.length}</span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-black text-slate-950 text-xs">
                        {formatCurrency(memberTotals.totalSelfBusiness)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-black text-pink-800 text-xs">
                        {formatCurrency(memberTotals.totalDirectBusiness)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-black text-purple-900 text-xs">
                        {formatCurrency(memberTotals.totalDownlineBusiness)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-black text-emerald-800 text-xs">
                        {formatCurrency(memberTotals.totalCommission)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>`;

if (content.includes(oldTableHeaderAndBody)) {
  content = content.replace(oldTableHeaderAndBody, newTableHeaderAndBody);
  console.log('7. Replaced Tab 1 Table with exact 10 columns and live tree metrics');
} else {
  console.warn('Could not find oldTableHeaderAndBody');
}

// 6. Clean duplicate currency in Tab 5 (Reports)
content = content.replace(/₹\{formatINR\(totalMembersBusiness\)\}/g, '{formatCurrency(totalMembersBusiness)}');
content = content.replace(/₹\{formatINR\(totalMembersCommission\)\}/g, '{formatCurrency(totalMembersCommission)}');
content = content.replace(/₹\{formatINR\(mBiz\)\}/g, '{formatCurrency(mBiz)}');
content = content.replace(/₹\{formatINR\(mComm\)\}/g, '{formatCurrency(mComm)}');
content = content.replace(/₹\{formatINR\(workerDownlineResult\.totalBiz\)\}/g, '{formatCurrency(workerDownlineResult.totalBiz)}');
content = content.replace(/₹\{formatINR\(workerDownlineResult\.totalComm\)\}/g, '{formatCurrency(workerDownlineResult.totalComm)}');
content = content.replace(/₹\{formatINR\(row\.business\)\}/g, '{formatCurrency(row.business)}');
content = content.replace(/₹\{formatINR\(row\.commission\)\}/g, '{formatCurrency(row.commission)}');
console.log('8. Cleaned duplicate currency in Tab 5');

// In Sub-Tab 2 (Worker report), also provide MemberReportLookup
const oldWorkerSearchPrompt = `{/* SUB-TAB 2: WORKER-WISE / MEMBER ID-WISE TEAM & BUSINESS REPORT */}
            {reportsSubTab === 'worker' && (
              <div className="space-y-6">`;

const newWorkerSearchPrompt = `{/* SUB-TAB 2: WORKER-WISE / MEMBER ID-WISE TEAM & BUSINESS REPORT */}
            {reportsSubTab === 'worker' && (
              <div className="space-y-6">
                <MemberReportLookup isAdminMode={true} embeddedTitle="Worker / Member 12-Level Business & Team Report" />`;

if (content.includes(oldWorkerSearchPrompt)) {
  content = content.replace(oldWorkerSearchPrompt, newWorkerSearchPrompt);
  console.log('9. Embedded MemberReportLookup in Sub-Tab 2 of Reports');
}

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully updated AdminPanel.jsx!');
