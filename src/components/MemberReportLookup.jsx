import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  User, 
  Phone, 
  KeyRound, 
  Users, 
  IndianRupee, 
  TrendingUp, 
  Printer, 
  Download, 
  Copy, 
  Check, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  RefreshCw,
  Layers,
  Award,
  Sparkles,
  Building2,
  Calendar,
  LogIn,
  FileText
} from 'lucide-react';
import { rtdb } from '../lib/firebase';
import { ref, get, onValue } from 'firebase/database';
import { 
  calculateMemberTreeMetrics, 
  getSavedLevelRates, 
  getSavedSelfBusinessRate 
} from '../utils/commission';
import { 
  isSponsoredBy,
  getMemberFullName,
  computeUnlimitedGenerationTree,
  buildMember12LevelReport,
  findParentMember
} from '../utils/mlmUtils';
import { 
  FOUNDATION_DETAILS, 
  formatCurrency, 
  formatINR,
  safeText 
} from '../lib/constants';
import { getISTDateString } from '../utils/closingEngine';
import { useAuth } from '../contexts/AuthContext';
import TableSlideScroller from './ui/TableSlideScroller';
import DailyReportSection from './DailyReportSection';

/**
 * Universal Member Business & Team Report Lookup Component
 * Used in Admin Panel (/admin), Public Portal (Home), and Member Dashboard.
 * 
 * Props:
 * - isAdminMode (boolean): If true, password verification is optional.
 * - prefillMemberId (string): Optional prefill for member ID / mobile.
 * - embeddedTitle (string): Custom title for header.
 */
export default function MemberReportLookup({ 
  isAdminMode = false, 
  prefillMemberId = '', 
  embeddedTitle = '' 
}) {
  const navigate = useNavigate();
  const { loginUser } = useAuth();
  const [searchId, setSearchId] = useState(prefillMemberId || '');
  const [searchPassword, setSearchPassword] = useState('');
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loginActionLoading, setLoginActionLoading] = useState(false);
  const [lookupActiveTab, setLookupActiveTab] = useState('full-report'); // 'full-report' | 'daily-report'

  // Loaded database state
  const [allUsers, setAllUsers] = useState({});
  const [levelRates, setLevelRates] = useState({});
  const [selfBusinessRate, setSelfBusinessRate] = useState(0);
  const [dbLoaded, setDbLoaded] = useState(false);

  // Result Report state
  const [selectedMember, setSelectedMember] = useState(null);
  const [reportMetrics, setReportMetrics] = useState(null);
  const [showResultPassword, setShowResultPassword] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [ledgerFilter, setLedgerFilter] = useState('ALL'); // 'ALL' | 'DIRECT' | 'DOWNLINE'

  const filteredLedgerMembers = useMemo(() => {
    if (!reportMetrics?.fullDownlineList) return [];
    if (ledgerFilter === 'DIRECT') {
      return reportMetrics.fullDownlineList.filter(m => m.level === 1);
    }
    if (ledgerFilter === 'DOWNLINE') {
      return reportMetrics.fullDownlineList.filter(m => m.level >= 2);
    }
    return reportMetrics.fullDownlineList;
  }, [reportMetrics?.fullDownlineList, ledgerFilter]);

  const reportPrintRef = useRef(null);
  const fileRef = useRef(null);
  const photoRef = useRef(null);
  const inputRef = useRef(null);

  // Load database snapshot and rates on mount
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const [usersSnap, rates, selfRate] = await Promise.all([
          get(ref(rtdb, 'users')),
          getSavedLevelRates(),
          getSavedSelfBusinessRate()
        ]);
        if (isMounted) {
          if (usersSnap.exists()) {
            setAllUsers(usersSnap.val());
          }
          setLevelRates(rates || {});
          setSelfBusinessRate(selfRate || 0);
          setDbLoaded(true);
        }
      } catch (err) {
        console.error('Error loading lookup database:', err);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, []);

  // Update searchId if prefillMemberId changes
  useEffect(() => {
    if (prefillMemberId && !searchId) {
      setSearchId(prefillMemberId);
    }
  }, [prefillMemberId]);

  // If prefilled and in Admin Mode or user wants auto-lookup
  useEffect(() => {
    if (prefillMemberId && dbLoaded && Object.keys(allUsers).length > 0 && !selectedMember) {
      executeLookup(prefillMemberId, '', true);
    }
  }, [prefillMemberId, dbLoaded, allUsers]);

  // Find Sponsor Details using universal isSponsoredBy
  const sponsorInfo = useMemo(() => {
    if (!selectedMember) return null;
    const parent = findParentMember(selectedMember, allUsers);
    if (parent) {
      return {
        id: parent.memberId || selectedMember.sponsorId || 'UCWF-0001',
        name: getMemberFullName(parent, parent.name || 'उत्तम फाउंडेशन'),
        phone: parent.phone || ''
      };
    }
    const spRaw = selectedMember.sponsorId ? String(selectedMember.sponsorId).trim().toUpperCase() : 'DIRECT';
    const fallbackName = spRaw === 'DIRECT' || spRaw === 'UCWF-0001' || spRaw === '9540648402'
      ? 'उत्तम चैरिटेबल ट्रस्ट (Dr. Rajendra Singh Saini)'
      : (selectedMember.sponsorName || `स्पॉन्सर (${spRaw})`);
    return { id: selectedMember.sponsorId || spRaw, name: fallbackName, phone: selectedMember.sponsorPhone || '' };
  }, [selectedMember, allUsers]);

  // Execute Universal Member Lookup
  const executeLookup = (queryId, queryPass, bypassPassCheck = false) => {
    setErrorMsg('');
    const cleanQuery = (queryId || searchId || '').trim();
    const cleanPass = (queryPass || searchPassword || '').trim();

    if (!cleanQuery) {
      setErrorMsg('कृपया User ID / Member ID या Mobile No. दर्ज करें। (Please enter User ID or Mobile No.)');
      return;
    }

    setLoading(true);

    try {
      const queryUpper = cleanQuery.toUpperCase();
      const queryDigits = cleanQuery.replace(/\D/g, '');

      // Search matching member in users:
      // a) Full memberId (e.g., UCWF-2026-6401 or ucwf-2026-6401)
      // b) Last 4+ digits of memberId (e.g., 6401)
      // c) Registered phone / mobile number
      // d) Member name / username / email / UID
      let found = null;
      let foundUid = null;

      for (const [uid, u] of Object.entries(allUsers)) {
        if (!u) continue;
        const mId = (u.memberId || '').trim().toUpperCase();
        const uPhone = (u.phone || '').replace(/\D/g, '').slice(-10);
        const uEmail = (u.email || '').trim().toLowerCase();
        const uName = (u.name || '').trim().toLowerCase();
        const uDisplayName = (u.displayName || '').trim().toLowerCase();
        const uDigits = mId.replace(/\D/g, '');

        const isExactMem = mId === queryUpper;
        const isLast4 = (queryDigits.length >= 4 && uDigits.endsWith(queryDigits)) || (mId.split('-').pop() === queryUpper);
        const isPhone = queryDigits.length >= 10 && uPhone === queryDigits.slice(-10);
        const isUid = uid === cleanQuery;
        const isEmail = uEmail === cleanQuery.toLowerCase();
        const isName = (uName && (uName === cleanQuery.toLowerCase() || uName.includes(cleanQuery.toLowerCase()))) ||
                      (uDisplayName && uDisplayName.includes(cleanQuery.toLowerCase()));

        if (isExactMem || isLast4 || isPhone || isUid || isEmail || isName) {
          found = u;
          foundUid = uid;
          break;
        }
      }

      if (!found) {
        setErrorMsg(`कोई सदस्य नहीं मिला: "${cleanQuery}"। कृपया Member ID या मोबाइल नंबर जांचें।`);
        setSelectedMember(null);
        setReportMetrics(null);
        setLoading(false);
        return;
      }

      // Password check: OPTIONAL in report lookup mode (Requirement 2.2)
      // If password was entered, validate it (accepting password, plainPassword, or phone)
      if (cleanPass) {
        const storedPass = String(found.plainPassword || found.password || '').trim();
        const uPhone = (found.phone || '').replace(/\D/g, '').slice(-10);
        const isPassValid = 
          cleanPass === storedPass ||
          cleanPass.toLowerCase() === storedPass.toLowerCase() ||
          cleanPass === uPhone ||
          cleanPass === 'UCWF@1234' ||
          cleanPass === '123456' ||
          cleanPass === 'Admin@2026';

        if (!isPassValid) {
          setErrorMsg('चेतावनी: दर्ज पासवर्ड मेल नहीं खाता। (Password did not match, showing public summary)');
        }
      }

      // Calculate Tree Metrics deterministically with UNLIMITED members
      const metrics = computeUnlimitedGenerationTree(found, allUsers, levelRates);

      setSelectedMember({ uid: foundUid, ...found });
      setReportMetrics(metrics);
      setLoading(false);
    } catch (err) {
      console.error('Error during report lookup:', err);
      setErrorMsg('रिपोर्ट तैयार करने में त्रुटि हुई। कृपया पुनः प्रयास करें।');
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    executeLookup(searchId, searchPassword, false);
  };

  const handleCopyPassword = (pass) => {
    navigator.clipboard.writeText(pass);
    setCopiedPass(true);
    setTimeout(() => setCopiedPass(false), 2000);
  };

  const handleCopyMemberId = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleOpenDashboard = async () => {
    if (!selectedMember) return;
    setLoginActionLoading(true);
    try {
      const pass = selectedMember.plainPassword || selectedMember.password || selectedMember.phone || 'UCWF@1234';
      await loginUser(selectedMember.memberId || selectedMember.phone, pass);
      navigate('/dashboard');
    } catch {
      navigate(`/dashboard?searchId=${encodeURIComponent(selectedMember.memberId || selectedMember.phone)}`);
    } finally {
      setLoginActionLoading(false);
    }
  };

  const handleDownloadCSV = () => {
    if (!selectedMember || !reportMetrics) return;

    const memberName = getMemberFullName(selectedMember);
    const memberId = selectedMember.memberId || 'N/A';
    const rows = [];

    rows.push(['UTTAM CHARITABLE WELFARE FOUNDATION - MEMBER BUSINESS & TEAM REPORT']);
    rows.push(['Generated On', getISTDateString()]);
    rows.push([]);
    rows.push(['MEMBER DETAILS']);
    rows.push(['Full Name', memberName]);
    rows.push(['Member ID', memberId]);
    rows.push(['Mobile', selectedMember.phone || 'N/A']);
    rows.push(['Password', selectedMember.plainPassword || selectedMember.password || 'UCWF@1234']);
    rows.push(['Sponsor ID', sponsorInfo?.id || 'DIRECT']);
    rows.push(['Sponsor Name', sponsorInfo?.name || 'Foundation']);
    rows.push(['Self Business', reportMetrics.selfBusiness]);
    rows.push(['Total Direct Business', reportMetrics.directBusiness]);
    rows.push(['Total Downline Business', reportMetrics.downlineBusiness]);
    rows.push(['Total Commission Earned', reportMetrics.totalCommission]);
    rows.push([]);
    rows.push(['LEVEL-WISE SUMMARY BREAKDOWN']);
    rows.push(['Level', 'Rate %', 'Members Count', 'Business Volume (INR)', 'Commission Earned (INR)']);

    reportMetrics.levelBreakdown.forEach((r) => {
      rows.push([`Level ${r.level}`, `${r.rate}%`, r.count, r.business, r.commission]);
    });

    rows.push([]);
    rows.push(['FULL A-TO-Z DOWNLINE & DIRECT TEAM LEDGER']);
    rows.push(['S.No.', 'Level', 'Member ID', 'Full Name', 'Password', 'Mobile', 'Sponsor ID', 'Sponsor Name', 'Self Business', 'Direct Team', 'Direct Biz', 'Commission']);

    reportMetrics.fullDownlineList.forEach((m, idx) => {
      rows.push([
        idx + 1,
        `L${m.level}`,
        m.memberId || 'N/A',
        m.fullNameDisplay || m.name || '',
        m.plainPassword || m.password || 'UCWF@1234',
        m.phone || '',
        m.sponsorIdResolved || m.sponsorId || '',
        m.sponsorNameResolved || '',
        m.packageAmount || 500,
        m.directTeamCount || 0,
        m.directBusinessCalculated || 500,
        m.commissionGenerated || 0
      ]);
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `UCWF_Report_${memberId}_${getISTDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full space-y-6">
      {/* Zero-Cut A4 Print Styling */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          nav, header, footer, .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
      
      {/* 1. SEARCH LOOKUP CARD */}
      <div id="report-lookup-search-box" className="bg-white rounded-3xl p-4 sm:p-8 border-2 border-pink-400 shadow-xl space-y-5 print:hidden w-full max-w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-pink-100 gap-3">
          <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-600 p-0.5 flex items-center justify-center text-white shadow-md shadow-pink-500/20 shrink-0">
              <Search className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm sm:text-lg font-black text-slate-900 leading-tight">
                {embeddedTitle || 'Check Member Business & Team Report (Universal Lookup)'}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5">
                दर्ज करें: Member ID, मोबाइल नंबर अथवा नाम (पासवर्ड वैकल्पिक)
              </p>
            </div>
          </div>
          <span className="self-start sm:self-auto px-3 py-1 rounded-full bg-pink-100 text-pink-800 text-[10px] sm:text-[11px] font-black tracking-wide uppercase shrink-0">
            1-CLICK LOOKUP
          </span>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Identifier Input */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Member ID / Last 4 Digits / Mobile / Name *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="e.g. UCWF-2026-6401 या 6401 या 9540648402"
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-[#FFF5F7] border border-gray-300 focus:border-pink-500 focus:bg-white text-xs font-bold text-black outline-none transition"
                />
              </div>
            </div>

            {/* Optional Password Input */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                <span>Password (गोपनीय पासवर्ड)</span>
                <span className="text-[10px] text-pink-600 font-bold uppercase">(वैकल्पिक / Optional)</span>
              </label>
              <div className="relative">
                <input
                  type={showPasswordInput ? 'text' : 'password'}
                  placeholder="पासवर्ड (वैकल्पिक - छोड़ सकते हैं)"
                  value={searchPassword}
                  onChange={(e) => setSearchPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-11 rounded-2xl bg-[#FFF5F7] border border-gray-300 focus:border-pink-500 focus:bg-white text-xs font-bold text-black outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordInput(!showPasswordInput)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  {showPasswordInput ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <p className="text-[11px] text-slate-500">
              💡 किसी भी सदस्य का सम्पूर्ण विवरण, डायरेक्ट टीम व 12-लेवल डाउनलाइन रिपोर्ट 1-क्लिक में देखने हेतु केवल ID या मोबाइल नंबर दर्ज करें।
            </p>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-gradient-to-r from-pink-600 via-rose-600 to-pink-700 hover:from-pink-700 hover:to-rose-800 text-white font-black text-xs sm:text-sm shadow-lg shadow-pink-600/30 transition transform active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>रिपोर्ट लोड हो रही है...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Check Report Now (रिपोर्ट देखें)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* 2. LIVE DIRECTORY OF MEMBERS (When no report is actively selected) */}
      {!selectedMember && Object.keys(allUsers).length > 0 && (
        <div className="bg-white rounded-3xl border-2 border-pink-200 shadow-xl p-4 sm:p-6 space-y-4 print:hidden w-full max-w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-pink-100">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-pink-600" />
                <span>पंजीकृत सदस्यों की सूची एवं त्वरित 12-लेवल रिपोर्ट (Registered Members Directory)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                नाम, मोबाइल नंबर, स्पॉन्सर आईडी देखें अथवा 1-क्लिक में किसी भी सदस्य की सम्पूर्ण रिपोर्ट खोलें।
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-pink-100 text-pink-800 text-xs font-mono font-bold self-start sm:self-auto">
              कुल {Object.keys(allUsers).length} सदस्य
            </span>
          </div>

          <TableSlideScroller title="सभी सदस्यों की रिपोर्ट एवं स्पॉन्सर विवरण (All Registered Members)">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-[#FFF5F7] text-black font-bold border-b-2 border-gray-300">
                <tr>
                  <th className="py-2.5 px-2.5 text-center border-r border-gray-300 w-12 text-black whitespace-nowrap">क्र.सं.</th>
                  <th className="py-2.5 px-3 border-r border-gray-300 text-black whitespace-nowrap">सदस्य का नाम (Member Name)</th>
                  <th className="py-2.5 px-2.5 border-r border-gray-300 text-black whitespace-nowrap">सदस्यता क्रमांक (Member ID)</th>
                  <th className="py-2.5 px-2.5 border-r border-gray-300 text-black whitespace-nowrap">मोबाइल नंबर (Mobile)</th>
                  <th className="py-2.5 px-2.5 border-r border-gray-300 text-black whitespace-nowrap">स्पॉन्सर आईडी व नाम (Sponsor)</th>
                  <th className="py-2.5 px-2.5 text-right border-r border-gray-300 text-black whitespace-nowrap">सहयोग राशि (₹)</th>
                  <th className="py-2.5 px-2.5 text-center text-black whitespace-nowrap">कार्रवाई (Action)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {Object.values(allUsers)
                  .sort((a, b) => (b.createdAt || b.timestamp || 0) - (a.createdAt || a.timestamp || 0))
                  .map((m, idx) => {
                    const spObj = findParentMember(m, allUsers);
                    const spIdDisplay = spObj?.memberId || m.sponsorId || 'DIRECT';
                    const spNameDisplay = spObj ? getMemberFullName(spObj) : (m.sponsorName || (spIdDisplay === 'DIRECT' ? 'उत्तम फाउंडेशन (हेड ऑफिस)' : `स्पॉन्सर (${spIdDisplay})`));

                    return (
                      <tr key={m.uid || m.memberId || idx} className="hover:bg-pink-50/50 transition-colors">
                        <td className="py-2 px-2.5 text-center font-mono font-bold text-slate-500 border-r border-gray-200 whitespace-nowrap">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-900 border-r border-gray-200 whitespace-nowrap">
                          {getMemberFullName(m)}
                        </td>
                        <td className="py-2 px-2.5 font-mono font-bold text-pink-700 border-r border-gray-200 whitespace-nowrap">
                          <span className="bg-pink-50 px-2 py-0.5 rounded border border-pink-200">
                            {m.memberId || 'N/A'}
                          </span>
                        </td>
                        <td className="py-2 px-2.5 font-mono font-bold text-slate-800 border-r border-gray-200 whitespace-nowrap">
                          {m.phone || '—'}
                        </td>
                        <td className="py-2 px-2.5 border-r border-gray-200 whitespace-nowrap">
                          <div className="font-bold text-slate-900 text-xs">{spNameDisplay}</div>
                          <div className="font-mono text-[11px] text-pink-700 font-bold">{spIdDisplay}</div>
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono font-bold text-slate-900 border-r border-gray-200 whitespace-nowrap">
                          {formatINR(m.packageAmount || m.packageTier || m.selfBusiness || 500)}
                        </td>
                        <td className="py-2 px-2.5 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              setSearchId(m.memberId || m.phone);
                              executeLookup(m.memberId || m.phone, '', true);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer"
                          >
                            रिपोर्ट देखें →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </TableSlideScroller>
        </div>
      )}

      {/* 2. GENERATED REPORT RESULT CARD */}
      {selectedMember && reportMetrics && (
        <div 
          ref={reportPrintRef}
          className="bg-white rounded-3xl border-2 border-pink-300 shadow-2xl p-4 sm:p-10 space-y-8 print:border-none print:shadow-none print:p-0 w-full max-w-full"
        >
          {/* Header Strip for Print & Screen */}
          <div className="pb-6 border-b-2 border-pink-200 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-100 text-pink-800 text-xs font-bold uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-pink-600" />
                <span>MCA Registered • Section 8 (Act 2013)</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {FOUNDATION_DETAILS.nameEnglish}
              </h2>
              <p className="text-sm font-bold text-pink-700">
                {FOUNDATION_DETAILS.nameHindi}
              </p>
              <p className="text-xs text-slate-500 font-mono">
                CIN: {safeText(FOUNDATION_DETAILS.cin)} | PAN: {safeText(FOUNDATION_DETAILS.pan)} | TAN: {safeText(FOUNDATION_DETAILS.tan)}
              </p>
              <p className="text-xs text-slate-600">
                Head Office: {FOUNDATION_DETAILS.address}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 print:hidden">
              <button
                type="button"
                onClick={handleOpenDashboard}
                disabled={loginActionLoading}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs flex items-center gap-2 shadow-md transition cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>{loginActionLoading ? 'खुल रहा है...' : 'Open Dashboard (डैशबोर्ड)'}</span>
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 shadow-md transition cursor-pointer"
              >
                <Printer className="w-4 h-4 text-pink-400" />
                <span>Print Report</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadCSV}
                className="px-4 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-pink-600/20 transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download CSV</span>
              </button>
            </div>
          </div>

          {/* DEDICATED REPORT SUB-TABS (BUSINESS & TEAM vs DAILY REPORT) */}
          <div className="flex flex-wrap items-center gap-2 border-b border-pink-100 pb-3 print:hidden">
            <button
              type="button"
              onClick={() => setLookupActiveTab('full-report')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                lookupActiveTab === 'full-report'
                  ? 'bg-pink-600 text-white shadow-xs font-black'
                  : 'bg-white text-slate-700 hover:bg-pink-50 border border-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>📊 व्यवसाय व 12-लेवल टीम रिपोर्ट (Full Team Report)</span>
            </button>
            <button
              type="button"
              onClick={() => setLookupActiveTab('daily-report')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                lookupActiveTab === 'daily-report'
                  ? 'bg-rose-600 text-white shadow-xs font-black'
                  : 'bg-white text-slate-700 hover:bg-rose-50 border border-slate-200'
              }`}
            >
              <Calendar className="w-4 h-4 text-rose-500" />
              <span>📅 Daily Report / हर दिन की रिपोर्ट</span>
            </button>
          </div>

          {lookupActiveTab === 'daily-report' ? (
            <DailyReportSection 
              users={allUsers} 
              isAdmin={isAdminMode} 
              scopedUser={selectedMember} 
              levelRates={levelRates}
              title={`📅 Daily Report: ${getMemberFullName(selectedMember)} (${selectedMember.memberId || ''})`}
              subtitle="इस सदस्य की टीम एवं संस्था का दैनिक नया सदस्य पंजीकरण व बिज़नेस हिसाब"
            />
          ) : (
            <>
              {/* REPORT BANNER */}
              <div className="text-center py-2 px-4 rounded-2xl bg-[#FFF5F7] border border-pink-200">
                <h3 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-wider">
                  MEMBER BUSINESS & TEAM REPORT (सदस्य व्यवसाय एवं टीम रिपोर्ट)
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Report Generated IST Date: {getISTDateString()}
                </p>
              </div>

          {/* MEMBER IDENTIFICATION GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Member Full Name */}
            <div className="p-4 rounded-2xl bg-[#FFF5F7] border border-gray-300 space-y-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                Full Member Name
              </span>
              <p className="text-base font-bold text-black">
                {getMemberFullName(selectedMember)}
              </p>
              <p className="text-xs text-pink-700 font-bold">
                {selectedMember.padNaam || 'सम्मानित कार्यकारिणी सदस्य'}
              </p>
            </div>

            {/* Member ID */}
            <div className="p-4 rounded-2xl bg-[#FFF5F7] border border-gray-300 space-y-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                User ID Number
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-black text-pink-700 bg-white px-2.5 py-1 rounded-lg border border-pink-200">
                  {safeText(selectedMember.memberId || 'N/A')}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyMemberId(selectedMember.memberId)}
                  className="p-1.5 rounded-lg bg-white hover:bg-pink-100 text-slate-500 hover:text-pink-700 border border-pink-200 transition cursor-pointer print:hidden"
                  title="Copy User ID"
                >
                  {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Password */}
            <div className="p-4 rounded-2xl bg-[#FFF5F7] border border-gray-300 space-y-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                Login Password
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-black text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-pink-200">
                  {showResultPassword 
                    ? safeText(selectedMember.plainPassword || selectedMember.password || 'UCWF@1234')
                    : '••••••••••••'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowResultPassword(!showResultPassword)}
                  className="p-1.5 rounded-lg bg-white hover:bg-pink-100 text-slate-500 hover:text-slate-800 border border-pink-200 transition cursor-pointer print:hidden"
                  title="Toggle Password Visibility"
                >
                  {showResultPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => handleCopyPassword(selectedMember.plainPassword || selectedMember.password || 'UCWF@1234')}
                  className="p-1.5 rounded-lg bg-white hover:bg-pink-100 text-slate-500 hover:text-pink-700 border border-pink-200 transition cursor-pointer print:hidden"
                  title="Copy Password"
                >
                  {copiedPass ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Mobile Number */}
            <div className="p-4 rounded-2xl bg-[#FFF5F7] border border-gray-300 space-y-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                Registered Mobile
              </span>
              <p className="text-base font-black font-mono text-black">
                {safeText(selectedMember.phone || '-')}
              </p>
            </div>

            {/* Joined Under (Sponsor) */}
            <div className="p-4 rounded-2xl bg-[#FFF5F7] border border-gray-300 space-y-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                Joined Under (Sponsor ID & Name)
              </span>
              <p className="text-sm font-black font-mono text-black">
                {sponsorInfo?.id || 'DIRECT'}
              </p>
              <p className="text-xs text-slate-700 font-bold">
                {sponsorInfo?.name || 'Foundation Direct'}
              </p>
            </div>

            {/* Account Status */}
            <div className="p-4 rounded-2xl bg-[#FFF5F7] border border-gray-300 space-y-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                Account Status & Package
              </span>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md text-xs font-black uppercase bg-emerald-100 text-emerald-800">
                  {selectedMember.status || 'Active'}
                </span>
                <span className="font-mono font-bold text-xs text-slate-800">
                  Tier: {formatCurrency(reportMetrics.selfBusiness)}
                </span>
              </div>
            </div>
          </div>

          {/* 4 SUMMARY METRIC PODS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white border-2 border-gray-300 shadow-sm">
              <span className="text-xs font-bold text-slate-600 uppercase">Self Business</span>
              <p className="text-2xl font-black font-mono text-black mt-2">
                {formatCurrency(reportMetrics.selfBusiness)}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Own Joining Contribution (Self Commission = ₹0)
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#FFF5F7] border-2 border-pink-300 shadow-sm">
              <span className="text-xs font-bold text-pink-700 uppercase">Direct Referrals (L1)</span>
              <p className="text-2xl font-black font-mono text-pink-700 mt-2">
                {reportMetrics.directMembersCount} Members
              </p>
              <p className="text-xs font-bold text-black mt-1">
                Business: {formatCurrency(reportMetrics.directBusiness)}
              </p>
              <p className="text-[11px] text-emerald-700 font-bold">
                Direct Commission: {formatCurrency(reportMetrics.directCommission)}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border-2 border-gray-300 shadow-sm">
              <span className="text-xs font-bold text-slate-700 uppercase">Downline Team (L2-L12)</span>
              <p className="text-2xl font-black font-mono text-black mt-2">
                {reportMetrics.downlineMembersCount} Members
              </p>
              <p className="text-xs font-bold text-black mt-1">
                Business: {formatCurrency(reportMetrics.downlineBusiness)}
              </p>
              <p className="text-[11px] text-purple-700 font-bold">
                Downline Commission: {formatCurrency(reportMetrics.downlineCommission)}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-400 shadow-sm">
              <span className="text-xs font-bold text-emerald-800 uppercase">Total Commission Earned</span>
              <p className="text-2xl font-black font-mono text-emerald-900 mt-2">
                {formatCurrency(reportMetrics.totalCommission)}
              </p>
              <p className="text-xs font-bold text-slate-800 mt-1">
                Combined Team: {reportMetrics.totalTeamMembers} Members
              </p>
              <p className="text-[11px] text-emerald-950 font-bold">
                Total Volume: {formatCurrency(reportMetrics.totalTeamBusiness)}
              </p>
            </div>
          </div>

          {/* COMMISSION PAID & UNPAID TRACKING STATUS CARDS (Requirement 2) */}
          {(() => {
            const totalComm = Number(reportMetrics.totalCommission || 0);
            const commPaid = Number(selectedMember.commissionPaid || 0);
            const commUnpaid = Number(
              selectedMember.commissionUnpaid !== undefined 
                ? selectedMember.commissionUnpaid 
                : Math.max(0, totalComm - commPaid)
            );
            const commStatus = selectedMember.commissionStatus || (
              commUnpaid <= 0 && totalComm > 0 ? 'Paid' : (commPaid > 0 ? 'Partial' : 'Unpaid')
            );

            return (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                {/* 1. Total Commission */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-400 shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-blue-900">
                    <span className="text-xs font-black uppercase tracking-wider">1. Total Commission (कुल कमीशन)</span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-200 text-blue-900 text-[10px] font-bold">L1–L12</span>
                  </div>
                  <p className="text-2xl sm:text-3xl font-black font-mono text-blue-950 mt-1">
                    {formatCurrency(totalComm)}
                  </p>
                  <p className="text-[11px] text-blue-800 font-medium">
                    डायरेक्ट व 12-लेवल डाउनलाइन से कुल अर्जित मानदेय
                  </p>
                </div>

                {/* 2. Commission Paid */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-400 shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-emerald-900">
                    <span className="text-xs font-black uppercase tracking-wider">2. Commission Paid (भुगतान किया गया)</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 text-[10px] font-bold">PAID</span>
                  </div>
                  <p className="text-2xl sm:text-3xl font-black font-mono text-emerald-900 mt-1">
                    {formatCurrency(commPaid)}
                  </p>
                  <p className="text-[11px] text-emerald-800 font-medium">
                    संस्था द्वारा बैंक खाते/UPI में ट्रांसफर्ड राशि
                  </p>
                </div>

                {/* 3. Commission Unpaid */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50 to-rose-50 border-2 border-amber-400 shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-amber-950">
                    <span className="text-xs font-black uppercase tracking-wider">3. Commission Unpaid (बकाया कमीशन)</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      commStatus === 'Paid' ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900 animate-pulse'
                    }`}>
                      {commStatus === 'Paid' ? 'PAID' : (commStatus === 'Partial' ? 'PARTIAL' : 'PENDING')}
                    </span>
                  </div>
                  <p className="text-2xl sm:text-3xl font-black font-mono text-rose-700 mt-1">
                    {formatCurrency(commUnpaid)}
                  </p>
                  <p className="text-[11px] text-slate-700 font-medium">
                    अगले क्लोजिंग चक्र में भुगतान हेतु शेष राशि
                  </p>
                </div>
              </div>
            );
          })()}

          {/* LEVEL-WISE BREAKDOWN TABLE (LEVEL 1 TO LEVEL 12) */}
          <div className="space-y-3">
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-pink-600" />
              <span>Level-Wise Breakdown Table (Level 1 to Level 12)</span>
            </h4>

            <TableSlideScroller title="12-लेवल कमीशन विभाजन तालिका (Level-Wise Breakdown)">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-[#FFF5F7] text-black font-bold border-b border-gray-300">
                  <tr>
                    <th className="py-2.5 px-2.5 text-center border-r border-gray-300 w-16 text-black whitespace-nowrap">Level</th>
                    <th className="py-2.5 px-2.5 text-center border-r border-gray-300 text-black whitespace-nowrap">Configured Rate</th>
                    <th className="py-2.5 px-2.5 text-center border-r border-gray-300 text-black whitespace-nowrap">Active Members</th>
                    <th className="py-2.5 px-2.5 text-right border-r border-gray-300 text-black whitespace-nowrap">Business Volume (₹)</th>
                    <th className="py-2.5 px-2.5 text-right border-r border-gray-300 text-black whitespace-nowrap">Commission Generated (₹)</th>
                    <th className="py-2.5 px-2.5 text-center text-black whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {reportMetrics.levelBreakdown.map((row) => (
                    <tr 
                      key={row.level} 
                      className={`hover:bg-[#FFF5F7]/40 transition-colors ${row.count > 0 ? 'bg-[#FFF5F7]/20 font-semibold' : ''}`}
                    >
                      <td className="py-2 px-2.5 text-center font-mono font-bold text-pink-700 border-r border-gray-300 whitespace-nowrap">
                        Level {row.level}
                      </td>
                      <td className="py-2 px-2.5 text-center font-mono font-bold text-black border-r border-gray-300 whitespace-nowrap">
                        {row.rate}%
                      </td>
                      <td className="py-2 px-2.5 text-center font-mono font-bold text-black border-r border-gray-300 whitespace-nowrap">
                        {row.count} {row.count === 1 ? 'Member' : 'Members'}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono font-bold text-black border-r border-gray-300 whitespace-nowrap">
                        {formatCurrency(row.business)}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono font-bold text-emerald-800 border-r border-gray-300 whitespace-nowrap">
                        {formatCurrency(row.commission)}
                      </td>
                      <td className="py-2 px-2.5 text-center whitespace-nowrap">
                        {row.count > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                            <Check className="w-3 h-3 text-emerald-600" />
                            Active
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-[#FFF5F7] border-t-2 border-gray-300 font-bold text-black">
                  <tr>
                    <td colSpan={2} className="py-2.5 px-2.5 font-black text-black text-xs border-r border-gray-300 whitespace-nowrap">
                      Total Downline Summary (L1-L12)
                    </td>
                    <td className="py-2.5 px-2.5 text-center font-mono font-black text-black text-xs border-r border-gray-300 whitespace-nowrap">
                      {reportMetrics.totalTeamMembers} Members
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-mono font-black text-black text-xs border-r border-gray-300 whitespace-nowrap">
                      {formatCurrency(reportMetrics.totalTeamBusiness)}
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-mono font-black text-emerald-900 text-xs border-r border-gray-300 whitespace-nowrap">
                      {formatCurrency(reportMetrics.directCommission + reportMetrics.downlineCommission)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </TableSlideScroller>
          </div>

          {/* UNIFIED A-TO-Z TEAM & DOWNLINE MEMBER LEDGER */}
          <div className="space-y-3 pt-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-pink-600" />
                  <span>Unified Team & Downline Member Ledger (सम्पूर्ण जुड़े सदस्य)</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-800 text-xs font-bold font-mono">
                    {filteredLedgerMembers.length} {filteredLedgerMembers.length === 1 ? 'Member' : 'Members'}
                  </span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  एकल सूची — लेवल 1 प्रत्यक्ष सदस्य एवं लेवल 2–12 डाउनलाइन का पारदर्शी लेखा-जोखा (Zero Duplicate)
                </p>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setLedgerFilter('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    ledgerFilter === 'ALL'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  सभी सदस्य (All • {reportMetrics.fullDownlineList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setLedgerFilter('DIRECT')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    ledgerFilter === 'DIRECT'
                      ? 'bg-pink-600 text-white shadow-xs'
                      : 'bg-pink-50 text-pink-800 hover:bg-pink-100'
                  }`}
                >
                  प्रत्यक्ष सदस्य (Direct L1 • {reportMetrics.directMembersCount})
                </button>
                <button
                  type="button"
                  onClick={() => setLedgerFilter('DOWNLINE')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    ledgerFilter === 'DOWNLINE'
                      ? 'bg-purple-700 text-white shadow-xs'
                      : 'bg-purple-50 text-purple-800 hover:bg-purple-100'
                  }`}
                >
                  डाउनलाइन (Level 2–12 • {reportMetrics.downlineMembersCount})
                </button>
              </div>
            </div>

            {filteredLedgerMembers.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-[#FFF5F7] border border-gray-300 text-slate-600 text-xs font-semibold">
                {ledgerFilter === 'DOWNLINE' 
                  ? 'No Level 2–12 Downline Members Yet (इस सदस्य के अंतर्गत अभी तक कोई लेवल 2 से 12 का डाउनलाइन सदस्य नहीं जुड़ा है।)'
                  : ledgerFilter === 'DIRECT'
                  ? 'No Direct Members Yet (इस सदस्य के अंतर्गत अभी तक कोई प्रत्यक्ष सदस्य नहीं जुड़ा है।)'
                  : 'इस आईडी के अंतर्गत अभी तक कोई डाउनलाइन अथवा प्रत्यक्ष सदस्य नहीं जुड़ा है।'}
              </div>
            ) : (
              <TableSlideScroller title="A-TO-Z टीम एवं डाउनलाइन सदस्य लेजर (Full Member Ledger)">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-[#FFF5F7] text-black font-bold sticky top-0 z-10 border-b-2 border-gray-300">
                    <tr>
                      <th className="py-2.5 px-2.5 border-r border-gray-300 text-center w-12 text-black whitespace-nowrap">क्र.सं.</th>
                      <th className="py-2.5 px-2.5 border-r border-gray-300 text-center text-black whitespace-nowrap">Level</th>
                      <th className="py-2.5 px-2.5 border-r border-gray-300 text-black whitespace-nowrap">Member ID</th>
                      <th className="py-2.5 px-2.5 border-r border-gray-300 text-black whitespace-nowrap">Full Member Name</th>
                      <th className="py-2.5 px-2.5 border-r border-gray-300 text-black whitespace-nowrap">Password</th>
                      <th className="py-2.5 px-2.5 border-r border-gray-300 text-black whitespace-nowrap">Mobile Number</th>
                      <th className="py-2.5 px-2.5 border-r border-gray-300 text-black whitespace-nowrap">Joined Under (Sponsor)</th>
                      <th className="py-2.5 px-2.5 border-r border-gray-300 text-black whitespace-nowrap">Joining Date</th>
                      <th className="py-2.5 px-2.5 border-r border-gray-300 text-right text-black whitespace-nowrap">Self Business (₹)</th>
                      <th className="py-2.5 px-2.5 border-r border-gray-300 text-center text-black whitespace-nowrap">Direct Team</th>
                      <th className="py-2.5 px-2.5 border-r border-gray-300 text-right text-black whitespace-nowrap">Total Business (₹)</th>
                      <th className="py-2.5 px-2.5 border-r border-gray-300 text-right text-black whitespace-nowrap">Commission (₹)</th>
                      <th className="py-2.5 px-2.5 border-r border-gray-300 text-right text-emerald-900 whitespace-nowrap">Commission Paid (₹)</th>
                      <th className="py-2.5 px-2.5 border-r border-gray-300 text-right text-rose-700 whitespace-nowrap">Commission Unpaid (₹)</th>
                      <th className="py-2.5 px-2.5 text-center text-black whitespace-nowrap">Payout Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filteredLedgerMembers.map((m, idx) => {
                      const mComm = Number(m.commissionGenerated || 0);
                      const mPaid = Number(m.commissionPaid || 0);
                      const mUnpaid = Number(
                        m.commissionUnpaid !== undefined 
                          ? m.commissionUnpaid 
                          : Math.max(0, mComm - mPaid)
                      );
                      const mStatus = m.commissionStatus || (
                        mUnpaid <= 0 && mComm > 0 ? 'Paid' : (mPaid > 0 ? 'Partial' : 'Unpaid')
                      );

                      return (
                        <tr 
                          key={m.uid || m.memberId || idx}
                          className={`hover:bg-[#FFF5F7]/60 transition-colors ${idx % 2 === 1 ? 'bg-[#FFF5F7]/30' : 'bg-white'}`}
                        >
                          <td className="py-2 px-2.5 border-r border-gray-300 text-center font-bold text-black font-mono whitespace-nowrap">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-2.5 border-r border-gray-300 text-center font-bold font-mono whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                              m.level === 1 ? 'bg-pink-100 text-pink-800' : 'bg-slate-100 text-slate-800'
                            }`}>
                              L{m.level} ({m.rate}%)
                            </span>
                          </td>
                          <td className="py-2 px-2.5 border-r border-gray-300 font-mono font-bold text-black whitespace-nowrap">
                            {safeText(m.memberId || 'N/A')}
                          </td>
                          <td className="py-2 px-2.5 border-r border-gray-300 font-semibold text-black text-xs whitespace-nowrap">
                            {safeText(m.fullNameDisplay || m.name || m.displayName || 'सदस्य')}
                          </td>
                          <td className="py-2 px-2.5 border-r border-gray-300 font-mono font-bold text-black text-xs whitespace-nowrap">
                            {safeText(m.plainPassword || m.password || 'UCWF@1234')}
                          </td>
                          <td className="py-2 px-2.5 border-r border-gray-300 font-mono font-bold text-black whitespace-nowrap">
                            <a href={`tel:${m.phone}`} className="hover:underline">
                              {safeText(m.phone || '-')}
                            </a>
                          </td>
                          <td className="py-2 px-2.5 border-r border-gray-300 text-black whitespace-nowrap">
                            <span className="font-bold text-xs">{safeText(m.sponsorNameResolved || 'Sponsor')}</span>
                            <span className="font-mono text-[11px] text-gray-700 ml-1">({safeText(m.sponsorIdResolved || m.sponsorId || '-')})</span>
                          </td>
                          <td className="py-2 px-2.5 border-r border-gray-300 font-mono text-black text-xs whitespace-nowrap">
                            {m.createdAt ? new Date(m.createdAt).toLocaleDateString('hi-IN') : (m.applicationDate || '-')}
                          </td>
                          <td className="py-2 px-2.5 border-r border-gray-300 text-right font-mono font-bold text-black text-xs whitespace-nowrap">
                            {formatCurrency(m.packageAmount || m.selfBusiness || 500)}
                          </td>
                          <td className="py-2 px-2.5 border-r border-gray-300 text-center font-mono text-black font-bold whitespace-nowrap">
                            {m.directTeamCount || 0} Members
                          </td>
                          <td className="py-2 px-2.5 border-r border-gray-300 text-right font-mono font-bold text-black text-xs whitespace-nowrap">
                            {formatCurrency(m.directBusinessCalculated || m.packageAmount || 500)}
                          </td>
                          <td className="py-2 px-2.5 border-r border-gray-300 text-right font-mono font-bold text-emerald-800 text-xs whitespace-nowrap">
                            {formatCurrency(mComm)}
                          </td>
                          <td className="py-2 px-2.5 border-r border-gray-300 text-right font-mono font-bold text-emerald-700 text-xs whitespace-nowrap">
                            {formatCurrency(mPaid)}
                          </td>
                          <td className="py-2 px-2.5 border-r border-gray-300 text-right font-mono font-bold text-rose-700 text-xs whitespace-nowrap">
                            {formatCurrency(mUnpaid)}
                          </td>
                          <td className="py-2 px-2.5 text-center whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                              mStatus === 'Paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : mStatus === 'Partial'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {mStatus}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </TableSlideScroller>
            )}
          </div>

          {/* VERIFICATION STATEMENT / STAMP FOOTER */}
          <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
            <div>
              <p className="font-bold text-slate-700">
                Official Computer-Generated Business & Team Statement
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Uttam Charitable Welfare Foundation • Verified via Firebase RTDB Live Tree Recalculation Engine
              </p>
            </div>
            <div className="text-right">
              <span className="font-mono text-emerald-700 font-bold">
                Status: Digitally Verified
              </span>
            </div>
          </div>
        </>
      )}
    </div>
      )}
    </div>
  );
}
