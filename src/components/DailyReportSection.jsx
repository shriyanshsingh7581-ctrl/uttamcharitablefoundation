import React, { useState, useMemo, useRef } from 'react';
import { 
  Calendar, 
  Users, 
  IndianRupee, 
  Printer, 
  Download, 
  Search, 
  Eye, 
  CheckCircle2, 
  Clock, 
  ArrowLeftRight, 
  Layers, 
  ShieldCheck, 
  FileText, 
  Sparkles, 
  TrendingUp, 
  Check, 
  X, 
  ChevronRight,
  EyeOff,
  UserCheck
} from 'lucide-react';
import { VoucherPrintButton } from './CommissionVoucher';
import TableSlideScroller from './ui/TableSlideScroller';
import { 
  FOUNDATION_DETAILS, 
  formatCurrency, 
  formatINR, 
  safeText 
} from '../lib/constants';
import { getISTDateString } from '../utils/closingEngine';
import { 
  findParentMember, 
  getMemberFullName, 
  calculateJoinCommission,
  computeUnlimitedGenerationTree,
  buildMember12LevelReport,
  parseAmount,
  parseAnyDateToEpochMs,
  epochMsToISTDateString,
  extractMemberJoinDateIST
} from '../utils/mlmUtils';

/**
 * Universal Daily Report Section Component (हर दिन की रिपोर्ट)
 * Standalone, date-wise business and joining report with summary ledger,
 * detailed member table, slide scrollers, and 1-click printable day slips.
 */
export default function DailyReportSection({
  users = {},
  isAdmin = false,
  scopedUser = null,
  levelRates = null,
  title = "📅 Daily Report / हर दिन की रिपोर्ट (Day-by-Day Business & Joining Report)",
  subtitle = "दैनिक नया सदस्य पंजीकरण, कुल व्यवसाय (Package Business), 12-स्तरीय कमीशन एवं पेआउट हिसाब"
}) {
  const fileRef = useRef(null);
  const photoRef = useRef(null);
  const inputRef = useRef(null);
  // Modes: 'today' | 'yesterday' | 'summary' | 'specific' | 'range'
  const [filterMode, setFilterMode] = useState('summary');
  const [specificDate, setSpecificDate] = useState(() => getISTDateString());
  const [rangeStart, setRangeStart] = useState(() => getISTDateString());
  const [rangeEnd, setRangeEnd] = useState(() => getISTDateString());
  const [searchQuery, setSearchQuery] = useState('');
  const [showPasswordMap, setShowPasswordMap] = useState({});
  const [teamScope, setTeamScope] = useState(scopedUser ? 'team' : 'all'); // 'team' | 'all'

  // Canonical active member for voucher generation
  const activeVoucherMember = scopedUser || Object.values(users).find(u => u && (u.memberId === 'UCWF-0001' || u.memberId === 'UCWF-2026-6401' || u.memberId === 'UCWF-2026-8647' || u.memberId === 'UCWF-2026-0835')) || Object.values(users)[0] || null;

  // Helper to extract YYYY-MM-DD (IST) from any member join timestamp (handles DD/MM/YYYY, ISO, epoch)
  const extractJoinDateIST = (m) => extractMemberJoinDateIST(m);

  // Format YYYY-MM-DD to DD/MM/YYYY with weekday
  const formatDisplayDate = (dateStr) => {
    if (!dateStr || dateStr === 'Earlier Records') return dateStr || '-';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        const dayNames = ['रवि', 'सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि'];
        const day = dayNames[d.getDay()] || '';
        return `${parts[2]}/${parts[1]}/${parts[0]} (${day})`;
      }
    } catch {}
    return dateStr;
  };

  // Format timestamp to DD/MM/YYYY hh:mm A (never returns Invalid Date)
  const formatDateTime = (raw, fallbackDateStr = '') => {
    if (!raw) return fallbackDateStr ? formatDisplayDate(fallbackDateStr) : '-';
    const ms = parseAnyDateToEpochMs(raw);
    if (ms > 0) {
      try {
        return new Date(ms).toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
      } catch {}
    }
    return fallbackDateStr ? formatDisplayDate(fallbackDateStr) : String(raw);
  };

  // Build tree metrics map for all users to get accurate directBusiness and totalCommission
  const userMetricsMap = useMemo(() => {
    const map = {};
    Object.entries(users).forEach(([uid, u]) => {
      try {
        const met = computeUnlimitedGenerationTree(u, users, levelRates);
        map[uid] = met;
      } catch {
        map[uid] = { directBusiness: 0, totalCommission: Number(u.totalCommission || 0) };
      }
    });
    return map;
  }, [users, levelRates]);

  // Downline member IDs of scoped user (if scopedUser provided)
  const scopedDownlineIds = useMemo(() => {
    if (!scopedUser) return new Set();
    const sId = scopedUser.uid || scopedUser.id || '';
    const downline = new Set();
    const met = userMetricsMap[sId] || computeUnlimitedGenerationTree(scopedUser, users, levelRates);
    (met.allDownlineMembers || met.fullDownlineList || []).forEach(m => {
      if (m.uid) downline.add(m.uid);
      if (m.id) downline.add(m.id);
      if (m.memberId) downline.add(m.memberId);
    });
    return downline;
  }, [scopedUser, users, userMetricsMap, levelRates]);

  // Build comprehensive day-by-day member objects
  const allDayMembersList = useMemo(() => {
    const rawList = Object.entries(users).map(([uid, u]) => ({ uid, ...u }));
    
    // Filter by scoped team if selected
    const filteredByScope = rawList.filter(m => {
      if (!scopedUser || teamScope === 'all') return true;
      const mUid = m.uid || m.id || '';
      const mId = m.memberId || '';
      return scopedDownlineIds.has(mUid) || scopedDownlineIds.has(mId);
    });

    return filteredByScope.map(m => {
      const joinDateStr = extractJoinDateIST(m);
      const report = userMetricsMap[m.uid] || buildMember12LevelReport(m, users, levelRates);
      const pkg = Math.max(
        report.selfBusiness || 0,
        parseAmount(m)
      ) || 500;
      const sponsor = findParentMember(m, users);
      const sponsorIdResolved = sponsor?.memberId || m.sponsorId || 'DIRECT';
      const sponsorNameResolved = sponsor ? getMemberFullName(sponsor) : (m.sponsorName || 'Foundation Direct');
      const fullNameDisplay = getMemberFullName(m);
      const directBiz = Number(report.directBusiness || 0);

      const commGenerated = Number(report.totalCommission || 0);
      const commPaid = Number(report.paidPayout || m.commissionPaid || 0);
      const commUnpaid = Math.max(0, commGenerated - commPaid);

      let payoutStatus = 'Unpaid';
      if (m.commissionStatus === 'Paid' || (commUnpaid <= 0 && commPaid > 0 && commGenerated > 0)) {
        payoutStatus = 'Paid';
      } else if (commPaid > 0 && commUnpaid > 0) {
        payoutStatus = 'Partial';
      }

      // Net trust share = selfBusiness - commission earned by upline from this member's package
      const joinComm = calculateJoinCommission(m, users, levelRates);
      const netTrustShare = joinComm.netTrustShare || 0;

      return {
        ...m,
        joinDateStr,
        packageAmountCalculated: pkg,
        directBusinessCalculated: directBiz,
        directMembersCount: report.directMembersCount || 0,
        totalTeamBusiness: report.totalTeamBusiness || 0,
        commissionGenerated: commGenerated,
        commissionPaid: commPaid,
        commissionUnpaid: commUnpaid,
        payoutStatus,
        netTrustShare,
        sponsorIdResolved,
        sponsorNameResolved,
        fullNameDisplay
      };
    });
  }, [users, levelRates, scopedUser, teamScope, scopedDownlineIds, userMetricsMap]);

  // Filtered members by active date mode and search query
  const filteredDayMembers = useMemo(() => {
    const todayStr = getISTDateString();
    const yesterdayStr = epochMsToISTDateString(Date.now() - 86400000);

    let list = allDayMembersList;

    if (filterMode === 'today') {
      list = list.filter(m => m.joinDateStr === todayStr);
    } else if (filterMode === 'yesterday') {
      list = list.filter(m => m.joinDateStr === yesterdayStr);
    } else if (filterMode === 'specific') {
      list = list.filter(m => m.joinDateStr === specificDate);
    } else if (filterMode === 'range') {
      list = list.filter(m => m.joinDateStr >= rangeStart && m.joinDateStr <= rangeEnd);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(m => 
        (m.fullNameDisplay && m.fullNameDisplay.toLowerCase().includes(q)) ||
        (m.name && m.name.toLowerCase().includes(q)) ||
        (m.memberId && m.memberId.toLowerCase().includes(q)) ||
        (m.phone && m.phone.includes(q)) ||
        (m.sponsorIdResolved && m.sponsorIdResolved.toLowerCase().includes(q)) ||
        (m.sponsorNameResolved && m.sponsorNameResolved.toLowerCase().includes(q))
      );
    }

    return list.sort((a, b) => {
      const timeA = parseAnyDateToEpochMs(a.timestamp || a.createdAt || a.applicationDate || a.joiningDate);
      const timeB = parseAnyDateToEpochMs(b.timestamp || b.createdAt || b.applicationDate || b.joiningDate);
      return timeB - timeA;
    });
  }, [allDayMembersList, filterMode, specificDate, rangeStart, rangeEnd, searchQuery]);

  // Date-wise Aggregated Groups (Summary Ledger)
  const dateWiseSummaryGroups = useMemo(() => {
    const groups = {};
    allDayMembersList.forEach(m => {
      const d = m.joinDateStr || 'Earlier Records';
      if (!groups[d]) {
        groups[d] = {
          date: d,
          displayDate: formatDisplayDate(d),
          totalMembers: 0,
          totalPackageBusiness: 0,
          totalDirectBusiness: 0,
          totalCommissionGenerated: 0,
          totalCommissionPaid: 0,
          totalCommissionUnpaid: 0,
          totalNetTrustShare: 0,
          members: []
        };
      }
      groups[d].totalMembers++;
      groups[d].totalPackageBusiness += m.packageAmountCalculated;
      groups[d].totalDirectBusiness += m.directBusinessCalculated;
      groups[d].totalCommissionGenerated += m.commissionGenerated;
      groups[d].totalCommissionPaid += m.commissionPaid;
      groups[d].totalCommissionUnpaid += m.commissionUnpaid;
      groups[d].totalNetTrustShare += m.netTrustShare;
      groups[d].members.push(m);
    });

    return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date));
  }, [allDayMembersList]);

  // Active view totals
  const currentViewMembers = filterMode === 'summary' ? allDayMembersList : filteredDayMembers;
  const metricsTotals = useMemo(() => {
    let biz = 0;
    let dirBiz = 0;
    let comm = 0;
    let paid = 0;
    let unpaid = 0;
    let trust = 0;

    currentViewMembers.forEach(m => {
      biz += m.packageAmountCalculated || 500;
      dirBiz += m.directBusinessCalculated || 0;
      comm += m.commissionGenerated || 0;
      paid += m.commissionPaid || 0;
      unpaid += m.commissionUnpaid || 0;
      trust += m.netTrustShare || 0;
    });

    return {
      count: currentViewMembers.length,
      totalBusiness: biz,
      totalDirectBusiness: dirBiz,
      totalCommission: comm,
      totalPaid: paid,
      totalUnpaid: unpaid,
      totalTrust: trust
    };
  }, [currentViewMembers]);

  // Toggle Password Visibility
  const togglePasswordVisibility = (uid) => {
    setShowPasswordMap(prev => ({
      ...prev,
      [uid]: !prev[uid]
    }));
  };

  // Print Official Day Slip
  const handlePrintDaySlip = (targetDate, membersToPrint) => {
    const list = membersToPrint && membersToPrint.length > 0 ? membersToPrint : filteredDayMembers;
    const formattedDate = formatDisplayDate(targetDate || specificDate || getISTDateString());
    
    const totBiz = list.reduce((acc, m) => acc + (m.packageAmountCalculated || 500), 0);
    const totComm = list.reduce((acc, m) => acc + (m.commissionGenerated || 0), 0);
    const totPaid = list.reduce((acc, m) => acc + (m.commissionPaid || 0), 0);
    const totUnpaid = list.reduce((acc, m) => acc + (m.commissionUnpaid || 0), 0);
    const totTrust = list.reduce((acc, m) => acc + (m.netTrustShare || 0), 0);

    const rowsHtml = list.map((m, idx) => `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
        <td style="padding: 6px 8px; text-align: center; font-weight: bold;">${idx + 1}</td>
        <td style="padding: 6px 8px; white-space: nowrap;">${m.createdAt ? new Date(m.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '-'}</td>
        <td style="padding: 6px 8px; font-family: monospace; font-weight: bold; color: #b91c1c;">${m.memberId || 'N/A'}</td>
        <td style="padding: 6px 8px; font-weight: bold;">
          ${m.fullNameDisplay || m.name || ''}
          ${m.fatherName ? `<br/><span style="font-size: 9px; color: #475569; font-weight: normal;">पिता: श्री ${m.fatherName}</span>` : ''}
        </td>
        <td style="padding: 6px 8px; font-family: monospace;">${m.phone || '-'}</td>
        <td style="padding: 6px 8px;">
          <span style="font-weight: bold;">${m.sponsorNameResolved || 'Sponsor'}</span><br/>
          <span style="font-size: 9px; font-family: monospace; color: #64748b;">(${m.sponsorIdResolved || '-'})</span>
        </td>
        <td style="padding: 6px 8px; text-align: right; font-family: monospace; font-weight: bold;">₹${(m.packageAmountCalculated || 500).toLocaleString('en-IN')}</td>
        <td style="padding: 6px 8px; text-align: right; font-family: monospace; font-weight: bold; color: #047857;">₹${(m.commissionGenerated || 0).toLocaleString('en-IN')}</td>
        <td style="padding: 6px 8px; text-align: center;">
          <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: bold; ${m.payoutStatus === 'Paid' ? 'background: #dcfce7; color: #166534;' : 'background: #fee2e2; color: #991b1b;'}">
            ${m.payoutStatus}
          </span>
        </td>
      </tr>
    `).join('');

    const slipHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>UCWF Day Report Slip - ${formattedDate}</title>
        <meta charset="utf-8" />
        <style>
          @page { size: A4; margin: 10mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; margin: 0; padding: 10px; }
          .header { text-align: center; border-bottom: 2px solid #db2777; padding-bottom: 12px; margin-bottom: 12px; position: relative; }
          .logo { width: 68px; height: 68px; object-fit: contain; vertical-align: middle; }
          .title { font-size: 18px; font-weight: 900; color: #831843; margin: 4px 0 2px 0; }
          .tagline { font-size: 11px; font-weight: bold; color: #475569; letter-spacing: 0.5px; }
          .reg-info { font-size: 9px; color: #64748b; margin-top: 3px; }
          .slip-badge { display: inline-block; background: #be185d; color: #fff; padding: 3px 12px; border-radius: 9999px; font-size: 11px; font-weight: 800; margin-top: 6px; }
          .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; background: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px; padding: 8px; margin-bottom: 12px; }
          .meta-item { text-align: center; }
          .meta-label { font-size: 9px; font-weight: bold; color: #9f1239; text-transform: uppercase; }
          .meta-value { font-size: 14px; font-weight: 900; font-family: monospace; color: #0f172a; margin-top: 2px; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th { background: #fdf2f8; color: #831843; font-size: 10px; font-weight: 800; padding: 6px 8px; text-transform: uppercase; border-bottom: 2px solid #fbcfe8; }
          .footer { margin-top: 24px; padding-top: 12px; border-top: 1px dashed #cbd5e1; display: flex; justify-content: space-between; font-size: 10px; color: #475569; }
          .sig-box { text-align: center; border-top: 1px solid #94a3b8; width: 180px; padding-top: 4px; font-weight: bold; }
          @media print {
            .no-print { display: none !important; }
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="${FOUNDATION_DETAILS.logoUrl}" class="logo" alt="UCWF Logo" />
          <div class="title">${FOUNDATION_DETAILS.name}</div>
          <div class="tagline">सबका साथ • सबका विकास • सबका कल्याण</div>
          <div class="reg-info">
            पंजीकरण संख्या: <strong>${FOUNDATION_DETAILS.regNumber}</strong> | 
            PAN: <strong>${FOUNDATION_DETAILS.pan}</strong> | 
            12A / 80G Certified Foundation
          </div>
          <div class="slip-badge">
            📅 दैनिक व्यवसाय व सदस्य रिपोर्ट पर्ची (DAILY JOINING & BUSINESS SLIP)
          </div>
        </div>

        <div class="meta-grid">
          <div class="meta-item">
            <div class="meta-label">तारीख (Date)</div>
            <div class="meta-value" style="font-size: 12px;">${formattedDate}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">कुल सदस्य (Total Joins)</div>
            <div class="meta-value">${list.length} Members</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">कुल पैकेज बिज़नेस (Business)</div>
            <div class="meta-value">₹${totBiz.toLocaleString('en-IN')}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">कमीशन जनरेट (Commission)</div>
            <div class="meta-value" style="color: #047857;">₹${totComm.toLocaleString('en-IN')}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 30px; text-align: center;">क्र.सं.</th>
              <th style="text-align: left;">समय</th>
              <th style="text-align: left;">सदस्य ID</th>
              <th style="text-align: left;">सदस्य का नाम</th>
              <th style="text-align: left;">मोबाइल नं.</th>
              <th style="text-align: left;">स्पॉन्सर (ID & नाम)</th>
              <th style="text-align: right;">पैकेज (₹)</th>
              <th style="text-align: right;">कमीशन (₹)</th>
              <th style="text-align: center;">पेआउट स्थिति</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
          <tfoot>
            <tr style="background: #fdf2f8; font-weight: bold; border-top: 2px solid #fbcfe8;">
              <td colspan="6" style="padding: 8px; font-weight: 900; text-align: right;">
                कुल योग (Grand Total — ${list.length} Members):
              </td>
              <td style="padding: 8px; text-align: right; font-family: monospace; font-size: 12px; font-weight: 900;">
                ₹${totBiz.toLocaleString('en-IN')}
              </td>
              <td style="padding: 8px; text-align: right; font-family: monospace; font-size: 12px; font-weight: 900; color: #047857;">
                ₹${totComm.toLocaleString('en-IN')}
              </td>
              <td style="padding: 8px; text-align: center; font-size: 10px;">
                Paid: ₹${totPaid.toLocaleString('en-IN')} | Unpaid: ₹${totUnpaid.toLocaleString('en-IN')}
              </td>
            </tr>
          </tfoot>
        </table>

        <div class="footer">
          <div>
            प्रिंट समय: ${new Date().toLocaleString('en-IN')}<br/>
            पोर्टल: uttamcharitable.org | आधिकारिक रिकॉर्ड
          </div>
          <div class="sig-box">
            तैयारकर्ता / जांचकर्ता<br/>
            (Verified By)
          </div>
          <div class="sig-box" style="border-color: #be185d;">
            डॉ. राजेन्द्र सिंह सैनी<br/>
            (संस्थापक / Authorized Signatory)
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `;

    const cleanSlipHtml = slipHtml.replace(/<script>[\s\S]*?<\/script>/i, '');
    const oldFrame = document.getElementById('ucwf-print-daily-frame');
    if (oldFrame) oldFrame.remove();

    const iframe = document.createElement('iframe');
    iframe.id = 'ucwf-print-daily-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(cleanSlipHtml);
      doc.close();
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          console.warn('Daily slip iframe print fallback:', e);
          window.print();
        }
        setTimeout(() => {
          iframe.remove();
        }, 60000);
      }, 300);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const rows = [];
    rows.push(['UTTAM CHARITABLE WELFARE FOUNDATION - DAY-BY-DAY BUSINESS & JOINING REPORT']);
    rows.push(['Generated On (IST)', getISTDateString()]);
    rows.push(['Filter Mode', filterMode.toUpperCase()]);
    rows.push(['Scope', teamScope.toUpperCase()]);
    rows.push([]);
    rows.push([
      'S.No.',
      'Joining Date & Time',
      'Member ID',
      'Full Name',
      'Father Name',
      'Password',
      'Mobile No.',
      'Sponsor ID',
      'Sponsor Name',
      'Self Business / Package (INR)',
      'Direct Business (INR)',
      'Commission Generated (INR)',
      'Commission Paid (INR)',
      'Commission Unpaid (INR)',
      'Commission Status',
      'Net Trust Share (INR)'
    ]);

    filteredDayMembers.forEach((m, idx) => {
      rows.push([
        idx + 1,
        m.createdAt || m.applicationDate || m.joinDateStr || 'N/A',
        m.memberId || 'N/A',
        m.fullNameDisplay || m.name || '',
        m.fatherName || '',
        m.plainPassword || m.password || 'UCWF@1234',
        m.phone || '',
        m.sponsorIdResolved || m.sponsorId || '',
        m.sponsorNameResolved || '',
        m.packageAmountCalculated || 500,
        m.directBusinessCalculated || 0,
        m.commissionGenerated || 0,
        m.commissionPaid || 0,
        m.commissionUnpaid || 0,
        m.payoutStatus || 'Unpaid',
        m.netTrustShare || 0
      ]);
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `UCWF_Daily_Report_${filterMode}_${getISTDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-white border-2 border-pink-200 shadow-md">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-md shadow-pink-500/30">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-pink-100 text-pink-900 text-[11px] font-black uppercase tracking-wider mb-1">
              <Sparkles className="w-3 h-3 text-pink-600" />
              <span>Dedicated Daily Business Ledger (हर दिन का हिसाब)</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              {title}
            </h2>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {scopedUser && (
            <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setTeamScope('team')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${teamScope === 'team' ? 'bg-pink-600 text-white shadow-xs font-black' : 'text-slate-700 hover:text-pink-600'}`}
              >
                मेरी टीम (My Team)
              </button>
              <button
                type="button"
                onClick={() => setTeamScope('all')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${teamScope === 'all' ? 'bg-pink-600 text-white shadow-xs font-black' : 'text-slate-700 hover:text-pink-600'}`}
              >
                संस्था के सभी सदस्य (All)
              </button>
            </div>
          )}

          <VoucherPrintButton member={activeVoucherMember} allUsers={users} size="normal" />
          <button
            type="button"
            onClick={() => handlePrintDaySlip(filterMode === 'specific' ? specificDate : getISTDateString(), filteredDayMembers)}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-pink-400" />
            <span>🖨️ प्रिंट पर्ची (Print Slip)</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-300" />
            <span>एक्सेल / CSV</span>
          </button>
        </div>
      </div>

      {/* Quick Date Filters & Search Control Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Quick Date Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterMode('today')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                filterMode === 'today'
                  ? 'bg-pink-600 text-white shadow-sm shadow-pink-600/30 font-black'
                  : 'bg-slate-100 hover:bg-pink-50 text-slate-700 hover:text-pink-700 border border-slate-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>आज की रिपोर्ट (Today)</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterMode('yesterday')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                filterMode === 'yesterday'
                  ? 'bg-pink-600 text-white shadow-sm shadow-pink-600/30 font-black'
                  : 'bg-slate-100 hover:bg-pink-50 text-slate-700 hover:text-pink-700 border border-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>कल की रिपोर्ट (Yesterday)</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterMode('summary')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                filterMode === 'summary'
                  ? 'bg-pink-600 text-white shadow-sm shadow-pink-600/30 font-black'
                  : 'bg-slate-100 hover:bg-pink-50 text-slate-700 hover:text-pink-700 border border-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>सभी दिनों की लिस्ट (All Days Ledger)</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterMode('specific')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                filterMode === 'specific'
                  ? 'bg-pink-600 text-white shadow-sm shadow-pink-600/30 font-black'
                  : 'bg-slate-100 hover:bg-pink-50 text-slate-700 hover:text-pink-700 border border-slate-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>तारीख चुनें (Pick Date)</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterMode('range')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                filterMode === 'range'
                  ? 'bg-pink-600 text-white shadow-sm shadow-pink-600/30 font-black'
                  : 'bg-slate-100 hover:bg-pink-50 text-slate-700 hover:text-pink-700 border border-slate-200'
              }`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>तारीख सीमा (Range)</span>
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="नाम, ID, मोबाइल या स्पॉन्सर खोजें..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-white border border-slate-300 text-slate-900 font-semibold focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none"
            />
            {searchQuery && (
              <button 
                type="button" 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Date Pickers for Specific & Range modes */}
        {filterMode === 'specific' && (
          <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-pink-50/70 border border-pink-200">
            <span className="text-xs font-bold text-slate-800">विशिष्ट तारीख चुनें (Select Date):</span>
            <input
              type="date"
              value={specificDate}
              onChange={(e) => setSpecificDate(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-pink-300 text-xs font-bold text-slate-900 bg-white"
            />
            <span className="text-xs font-mono font-bold text-pink-700">
              चयनित: {formatDisplayDate(specificDate)}
            </span>
          </div>
        )}

        {filterMode === 'range' && (
          <div className="flex flex-wrap items-center gap-4 p-3 rounded-xl bg-pink-50/70 border border-pink-200">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800">तारीख से (From):</span>
              <input
                type="date"
                value={rangeStart}
                onChange={(e) => setRangeStart(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-pink-300 text-xs font-bold text-slate-900 bg-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800">तारीख तक (To):</span>
              <input
                type="date"
                value={rangeEnd}
                onChange={(e) => setRangeEnd(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-pink-300 text-xs font-bold text-slate-900 bg-white"
              />
            </div>
            <span className="text-xs font-mono font-bold text-pink-700">
              अवधि: {formatDisplayDate(rangeStart)} से {formatDisplayDate(rangeEnd)}
            </span>
          </div>
        )}
      </div>

      {/* 6 High-Contrast Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Card 1: Total IDs Joined */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white border-2 border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-600 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">कुल सदस्य (Joins)</span>
            <Users className="w-4 h-4 text-pink-600" />
          </div>
          <p className="text-xl sm:text-2xl font-black font-mono text-slate-950">
            {metricsTotals.count}
          </p>
          <p className="text-[10px] text-slate-500 font-semibold mt-0.5 truncate">
            {filterMode.toUpperCase()} ({metricsTotals.count} जुड़े)
          </p>
        </div>

        {/* Card 2: Total Package Business */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white border-2 border-pink-200 shadow-sm">
          <div className="flex items-center justify-between text-pink-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">पैकेज बिज़नेस</span>
            <IndianRupee className="w-4 h-4 text-pink-600" />
          </div>
          <p className="text-xl sm:text-2xl font-black font-mono text-pink-950">
            {formatINR(metricsTotals.totalBusiness)}
          </p>
          <p className="text-[10px] text-pink-700 font-semibold mt-0.5">
            100% Verified Collections
          </p>
        </div>

        {/* Card 3: Direct Business */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white border-2 border-blue-200 shadow-sm">
          <div className="flex items-center justify-between text-blue-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">डायरेक्ट बिज़नेस</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-xl sm:text-2xl font-black font-mono text-blue-950">
            {formatINR(metricsTotals.totalDirectBusiness)}
          </p>
          <p className="text-[10px] text-blue-700 font-semibold mt-0.5">
            Level-1 Direct Referrals
          </p>
        </div>

        {/* Card 4: Total Commission Generated */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white border-2 border-emerald-200 shadow-sm">
          <div className="flex items-center justify-between text-emerald-800 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">कमीशन जनरेट</span>
            <Sparkles className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl sm:text-2xl font-black font-mono text-emerald-900">
            {formatINR(metricsTotals.totalCommission)}
          </p>
          <p className="text-[10px] text-emerald-700 font-semibold mt-0.5">
            12-Level Distributed
          </p>
        </div>

        {/* Card 5: Commission Paid */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white border-2 border-green-200 shadow-sm">
          <div className="flex items-center justify-between text-green-800 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">कमीशन पेड (Paid)</span>
            <CheckCircle2 className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-xl sm:text-2xl font-black font-mono text-green-900">
            {formatINR(metricsTotals.totalPaid)}
          </p>
          <p className="text-[10px] text-green-700 font-semibold mt-0.5">
            भुगतान हो चुका
          </p>
        </div>

        {/* Card 6: Commission Unpaid / Pending */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white border-2 border-amber-200 shadow-sm">
          <div className="flex items-center justify-between text-amber-800 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">कमीशन बकाया (Pending)</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xl sm:text-2xl font-black font-mono text-amber-900">
            {formatINR(metricsTotals.totalUnpaid)}
          </p>
          <p className="text-[10px] text-amber-700 font-semibold mt-0.5">
            भुगतान हेतु शेष
          </p>
        </div>
      </div>

      {/* VIEW 1: MASTER DATE-WISE SUMMARY LEDGER TABLE */}
      {filterMode === 'summary' ? (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <span>📅 Date-Wise Master Ledger (हर तारीख का पूरा हिसाब)</span>
                <span className="px-2 py-0.5 rounded-full bg-pink-100 text-pink-800 text-[10px] font-mono">
                  {dateWiseSummaryGroups.length} Days Recorded
                </span>
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                प्रत्येक तारीख का कुल व्यवसाय, नए सदस्य, कमीशन वितरण एवं पेआउट स्थिति
              </p>
            </div>
          </div>

          <TableSlideScroller title="Date-Wise Master Summary Ledger (हर तारीख का पूरा हिसाब)">
            <table className="w-full text-xs text-left border-collapse bg-white">
              <thead className="bg-[#FFF5F7] text-slate-900 font-bold sticky top-0 z-10 border-b-2 border-slate-300">
                <tr>
                  <th className="py-3 px-3 border-r border-slate-200 text-center w-12 whitespace-nowrap">क्र.सं.</th>
                  <th className="py-3 px-3.5 border-r border-slate-200 whitespace-nowrap">तारीख (Date)</th>
                  <th className="py-3 px-3 border-r border-slate-200 text-center whitespace-nowrap">New IDs Joined (नए सदस्य)</th>
                  <th className="py-3 px-3.5 border-r border-slate-200 text-right whitespace-nowrap">Total Business (₹)</th>
                  <th className="py-3 px-3.5 border-r border-slate-200 text-right whitespace-nowrap">Commission Generated (₹)</th>
                  <th className="py-3 px-3 border-r border-slate-200 text-right whitespace-nowrap">Commission Paid (₹)</th>
                  <th className="py-3 px-3 border-r border-slate-200 text-right whitespace-nowrap">Commission Unpaid (₹)</th>
                  <th className="py-3 px-3.5 border-r border-slate-200 text-right whitespace-nowrap">Net Trust Share (₹)</th>
                  <th className="py-3 px-3.5 text-center whitespace-nowrap">कार्रवाई (Actions)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {dateWiseSummaryGroups.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-500 font-medium">
                      अभी तक कोई दैनिक रिकॉर्ड उपलब्ध नहीं है।
                    </td>
                  </tr>
                ) : (
                  dateWiseSummaryGroups.map((grp, idx) => (
                    <tr 
                      key={grp.date || idx}
                      className={`hover:bg-pink-50/70 transition-colors ${idx % 2 === 1 ? 'bg-pink-50/20' : 'bg-white'}`}
                    >
                      <td className="py-2.5 px-3 border-r border-slate-200 text-center font-bold text-slate-900 font-mono whitespace-nowrap">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3.5 border-r border-slate-200 font-mono font-bold text-slate-900 whitespace-nowrap">
                        <span className="text-slate-900">{grp.displayDate}</span>
                        {grp.date === getISTDateString() && (
                          <span className="ml-2 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase">
                            आज (Today)
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-200 text-center font-mono font-bold whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-full bg-pink-100 text-pink-900 text-xs font-black">
                          {grp.totalMembers} Members
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 border-r border-slate-200 text-right font-mono font-black text-slate-950 whitespace-nowrap">
                        {formatINR(grp.totalPackageBusiness)}
                      </td>
                      <td className="py-2.5 px-3.5 border-r border-slate-200 text-right font-mono font-black text-emerald-800 whitespace-nowrap">
                        {formatINR(grp.totalCommissionGenerated)}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-200 text-right font-mono font-bold text-green-700 whitespace-nowrap">
                        {formatINR(grp.totalCommissionPaid)}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-200 text-right font-mono font-bold text-amber-700 whitespace-nowrap">
                        {formatINR(grp.totalCommissionUnpaid)}
                      </td>
                      <td className="py-2.5 px-3.5 border-r border-slate-200 text-right font-mono font-bold text-purple-900 whitespace-nowrap">
                        {formatINR(grp.totalNetTrustShare)}
                      </td>
                      <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSpecificDate(grp.date);
                              setFilterMode('specific');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs shadow-xs transition active:scale-95 flex items-center gap-1 cursor-pointer"
                            title="इस दिन के सभी सदस्य देखें"
                          >
                            <Eye className="w-3 h-3" />
                            <span>सदस्य देखें</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handlePrintDaySlip(grp.date, grp.members)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-xs transition active:scale-95 flex items-center gap-1 cursor-pointer"
                            title="इस दिन की रिपोर्ट पर्ची प्रिंट करें"
                          >
                            <Printer className="w-3 h-3 text-pink-400" />
                            <span>प्रिंट पर्ची</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-[#FFF5F7] border-t-2 border-slate-300 font-bold text-slate-900">
                <tr>
                  <td colSpan={2} className="py-3 px-3.5 font-black text-slate-950 text-xs border-r border-slate-200 whitespace-nowrap">
                    कुल योग (All Days Master Total)
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-black text-slate-950 text-xs border-r border-slate-200 whitespace-nowrap">
                    {allDayMembersList.length} Members
                  </td>
                  <td className="py-3 px-3.5 text-right font-mono font-black text-slate-950 text-xs border-r border-slate-200 whitespace-nowrap">
                    {formatINR(dateWiseSummaryGroups.reduce((acc, g) => acc + g.totalPackageBusiness, 0))}
                  </td>
                  <td className="py-3 px-3.5 text-right font-mono font-black text-emerald-950 text-xs border-r border-slate-200 whitespace-nowrap">
                    {formatINR(dateWiseSummaryGroups.reduce((acc, g) => acc + g.totalCommissionGenerated, 0))}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-black text-green-950 text-xs border-r border-slate-200 whitespace-nowrap">
                    {formatINR(dateWiseSummaryGroups.reduce((acc, g) => acc + g.totalCommissionPaid, 0))}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-black text-amber-950 text-xs border-r border-slate-200 whitespace-nowrap">
                    {formatINR(dateWiseSummaryGroups.reduce((acc, g) => acc + g.totalCommissionUnpaid, 0))}
                  </td>
                  <td className="py-3 px-3.5 text-right font-mono font-black text-purple-950 text-xs border-r border-slate-200 whitespace-nowrap">
                    {formatINR(dateWiseSummaryGroups.reduce((acc, g) => acc + g.totalNetTrustShare, 0))}
                  </td>
                  <td className="text-center py-3 px-2 text-slate-500 font-normal text-[10px]">
                    100% Synced
                  </td>
                </tr>
              </tfoot>
            </table>
          </TableSlideScroller>
        </div>
      ) : (
        /* VIEW 2: DETAILED MEMBER-BY-MEMBER REPORT FOR SELECTED DAY */
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <span>सदस्य विवरण सूची (Member Joining Details)</span>
                  <span className="px-2 py-0.5 rounded-full bg-pink-100 text-pink-800 text-[10px] font-mono">
                    {filteredDayMembers.length} Members
                  </span>
                </h3>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                अवधि: <span className="font-bold text-pink-700">
                  {filterMode === 'today' ? `आज (${formatDisplayDate(getISTDateString())})` :
                   filterMode === 'yesterday' ? 'कल (Yesterday)' :
                   filterMode === 'specific' ? formatDisplayDate(specificDate) :
                   `${formatDisplayDate(rangeStart)} से ${formatDisplayDate(rangeEnd)}`}
                </span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFilterMode('summary')}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                ← सभी दिनों की लिस्ट (All Days)
              </button>
              <button
                type="button"
                onClick={() => handlePrintDaySlip(filterMode === 'specific' ? specificDate : getISTDateString(), filteredDayMembers)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1 shadow-sm cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-pink-400" />
                <span>प्रिंट पर्ची</span>
              </button>
            </div>
          </div>

          {filteredDayMembers.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#FFF5F7] border border-pink-200 text-slate-600 text-xs space-y-2">
              <Calendar className="w-8 h-8 text-pink-400 mx-auto" />
              <p className="font-bold text-slate-800 text-sm">
                चयनित अवधि में कोई नया सदस्य नहीं जुड़ा है।
              </p>
              <p className="text-slate-500">
                कृपया अन्य तारीख चुनें या 'सभी दिनों की लिस्ट' पर क्लिक करें।
              </p>
              <button
                type="button"
                onClick={() => setFilterMode('summary')}
                className="mt-2 px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs transition cursor-pointer"
              >
                सभी दिनों की लिस्ट देखें
              </button>
            </div>
          ) : (
            <TableSlideScroller title="Detailed Member-by-Member Report (दैनिक सदस्य विवरण)">
              <table className="w-full text-xs text-left border-collapse bg-white">
                <thead className="bg-[#FFF5F7] text-slate-900 font-bold sticky top-0 z-10 border-b-2 border-slate-300">
                  <tr>
                    <th className="py-3 px-2.5 border-r border-slate-200 text-center w-12 whitespace-nowrap">क्र.सं. (S.No.)</th>
                    <th className="py-3 px-3 border-r border-slate-200 whitespace-nowrap">Joining Date & Time</th>
                    <th className="py-3 px-3 border-r border-slate-200 whitespace-nowrap">Member Name</th>
                    <th className="py-3 px-3 border-r border-slate-200 whitespace-nowrap">User ID No.</th>
                    <th className="py-3 px-3 border-r border-slate-200 whitespace-nowrap">Password</th>
                    <th className="py-3 px-3 border-r border-slate-200 whitespace-nowrap">Mobile No.</th>
                    <th className="py-3 px-3.5 border-r border-slate-200 whitespace-nowrap">Referral / Sponsor ID & Name</th>
                    <th className="py-3 px-3 border-r border-slate-200 text-right whitespace-nowrap">Self Business (₹)</th>
                    <th className="py-3 px-3 border-r border-slate-200 text-right whitespace-nowrap">Direct Team & Biz (₹)</th>
                    <th className="py-3 px-3 border-r border-slate-200 text-right whitespace-nowrap">Total Business (₹)</th>
                    <th className="py-3 px-3 border-r border-slate-200 text-right whitespace-nowrap">Commission (₹)</th>
                    <th className="py-3 px-3 border-r border-slate-200 text-right whitespace-nowrap">Comm. Paid (₹)</th>
                    <th className="py-3 px-3 border-r border-slate-200 text-right whitespace-nowrap">Comm. Unpaid (₹)</th>
                    <th className="py-3 px-3 text-center whitespace-nowrap">Commission Status</th>
                    <th className="py-3 px-3 text-center whitespace-nowrap print:hidden">Voucher</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredDayMembers.map((m, idx) => (
                    <tr 
                      key={m.uid || m.memberId || idx}
                      className={`hover:bg-pink-50/70 transition-colors ${idx % 2 === 1 ? 'bg-pink-50/20' : 'bg-white'}`}
                    >
                      <td className="py-2.5 px-2.5 border-r border-slate-200 text-center font-bold text-slate-900 font-mono whitespace-nowrap">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-200 font-mono text-slate-800 text-[11px] whitespace-nowrap">
                        {formatDateTime(m.createdAt || m.applicationDate || m.timestamp, m.joinDateStr)}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-200 font-bold text-slate-900 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-slate-950 font-black">{m.fullNameDisplay || m.name || 'सदस्य'}</span>
                          {m.fatherName && (
                            <span className="text-[10px] text-slate-500 font-normal">
                              पिता: श्री {m.fatherName}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-200 font-mono font-black text-rose-700 whitespace-nowrap">
                        {safeText(m.memberId || 'N/A')}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-200 font-mono font-bold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>
                            {isAdmin || showPasswordMap[m.uid]
                              ? safeText(m.plainPassword || m.password || 'UCWF@1234')
                              : '••••••••'}
                          </span>
                          {!isAdmin && (
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility(m.uid)}
                              className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                              title="पासवर्ड देखें/छिपाएं"
                            >
                              {showPasswordMap[m.uid] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-200 font-mono font-bold text-slate-900 whitespace-nowrap">
                        <a href={`tel:${m.phone}`} className="hover:text-pink-600 hover:underline">
                          {safeText(m.phone || '-')}
                        </a>
                      </td>
                      <td className="py-2.5 px-3.5 border-r border-slate-200 text-slate-900 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-black text-xs text-slate-900">{safeText(m.sponsorNameResolved || 'Sponsor')}</span>
                          <span className="font-mono text-[11px] text-slate-500 font-bold">({safeText(m.sponsorIdResolved || m.sponsorId || '-')})</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-200 text-right font-mono font-black text-slate-950 whitespace-nowrap">
                        {formatINR(m.packageAmountCalculated || 500)}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-200 text-right whitespace-nowrap">
                        <span className="font-mono text-xs font-bold text-pink-700">{m.directMembersCount || 0} M</span>
                        <span className="font-mono text-[11px] text-slate-600 ml-1">({formatINR(m.directBusinessCalculated || 0)})</span>
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-200 text-right font-mono font-bold text-purple-900 whitespace-nowrap">
                        {formatINR(m.totalTeamBusiness || m.packageAmountCalculated || 0)}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-200 text-right font-mono font-black text-emerald-800 whitespace-nowrap">
                        {formatINR(m.commissionGenerated || 0)}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-200 text-right font-mono font-bold text-green-700 whitespace-nowrap">
                        {formatINR(m.commissionPaid || 0)}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-200 text-right font-mono font-bold text-rose-700 whitespace-nowrap">
                        {formatINR(m.commissionUnpaid || 0)}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black ${
                          m.payoutStatus === 'Paid'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : m.payoutStatus === 'Partial'
                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}>
                          {m.payoutStatus === 'Paid' ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Paid ({formatINR(m.commissionPaid)})</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>Unpaid ({formatINR(m.commissionUnpaid)})</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap print:hidden">
                        <VoucherPrintButton member={m} allUsers={users} size="small" label="Voucher" />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-[#FFF5F7] border-t-2 border-slate-300 font-bold text-slate-900">
                  <tr>
                    <td colSpan={7} className="py-3 px-3 font-black text-slate-950 text-xs border-r border-slate-200 whitespace-nowrap">
                      कुल योग (Total Summary for Selected Period — {filteredDayMembers.length} Members)
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-black text-slate-950 text-xs border-r border-slate-200 whitespace-nowrap">
                      {formatINR(metricsTotals.totalBusiness)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-black text-pink-800 text-xs border-r border-slate-200 whitespace-nowrap">
                      {formatINR(metricsTotals.totalDirectBusiness)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-black text-purple-950 text-xs border-r border-slate-200 whitespace-nowrap">
                      {formatINR(currentViewMembers.reduce((acc, m) => acc + (m.totalTeamBusiness || m.packageAmountCalculated || 0), 0))}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-black text-emerald-950 text-xs border-r border-slate-200 whitespace-nowrap">
                      {formatINR(metricsTotals.totalCommission)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-black text-green-950 text-xs border-r border-slate-200 whitespace-nowrap">
                      {formatINR(metricsTotals.totalPaid)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-black text-rose-700 text-xs border-r border-slate-200 whitespace-nowrap">
                      {formatINR(metricsTotals.totalUnpaid)}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-black text-xs whitespace-nowrap">
                      100% Synced
                    </td>
                    <td className="py-3 px-3 text-center print:hidden"></td>
                  </tr>
                </tfoot>
              </table>
            </TableSlideScroller>
          )}
        </div>
      )}

      {/* Bottom Print Voucher Button */}
      <div className="flex justify-center pt-2 print:hidden">
        <VoucherPrintButton
          member={activeVoucherMember}
          allUsers={users}
          size="large"
          label="🖨️ वाउचर प्रिंट करें / Print Commission Voucher"
        />
      </div>
    </div>
  );
}
