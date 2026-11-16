/**
 * CommissionVoucher.jsx
 * Full A4 Commission Voucher: Direct (L1@20%) + Indirect (L2-L12) + Grand Total
 * Exports: printCommissionVoucher(member, allUsers) + VoucherPrintButton (default)
 */
import React from 'react';
import {
  buildMember12LevelReport,
  getMemberFullName,
  findParentMember,
  parseAmount
} from '../utils/mlmUtils';
import {
  FOUNDATION_DETAILS,
  formatINR,
  PRESIDENT_NAME_HINDI,
  PRESIDENT_ROLE_HINDI
} from '../lib/constants';

// ─── Formatting helpers ────────────────────────────────────────────────────────
function _fmtINR(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN');
}

function _safe(v) {
  return String(v || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function _today() {
  return new Date().toLocaleDateString('en-IN', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
}

// ─── Build all data needed for the voucher ────────────────────────────────────
function _buildVoucherData(member, allUsers) {
  const report = buildMember12LevelReport(member, allUsers);
  const fullName = getMemberFullName(member);
  const memId = member.memberId || 'N/A';
  const phone = member.phone || member.mobile || '—';
  const selfBiz = report.selfBusiness || parseAmount(member) || 0;

  const sponsorParent = findParentMember(member, allUsers);
  const sponsorId = sponsorParent?.memberId || member.sponsorId || 'UCWF-0001';
  const sponsorName = sponsorParent
    ? getMemberFullName(sponsorParent)
    : (member.sponsorName || (sponsorId === 'DIRECT' || sponsorId === 'UCWF-0001'
        ? 'उत्तम फाउंडेशन'
        : `स्पॉन्सर (${sponsorId})`));

  // Direct members (L1 @ 20%)
  const directBreakdown = report.levelBreakdown?.[0] || {};
  const directList = directBreakdown.members || report.directList || [];
  const directBiz = directBreakdown.business ?? report.directBusiness ?? 0;
  const directComm = directBreakdown.commission ?? report.directCommission ?? 0;

  // Indirect members (L2–L12)
  let indirectBiz = 0;
  let indirectComm = 0;
  const indirectRows = [];
  const INDIRECT_RATES = { 2: 8, 3: 5, 4: 4, 5: 3, 6: 2.5, 7: 2, 8: 1.5, 9: 1, 10: 1, 11: 1, 12: 1 };

  (report.levelBreakdown || [])
    .filter(lvl => lvl.level >= 2)
    .forEach(lvl => {
      const rate = lvl.rate ?? INDIRECT_RATES[lvl.level] ?? 1;
      (lvl.members || []).forEach(m => {
        const pkg = Number(m.packageAmount || m.selfBusiness || parseAmount(m) || 0);
        const comm = Number(m.commissionGenerated ?? (pkg * rate / 100));
        indirectBiz += pkg;
        indirectComm += comm;
        const sponsorEntry = m.sponsorId
          ? (allUsers?.[m.sponsorId] || Object.values(allUsers || {}).find(u => u?.memberId === m.sponsorId))
          : null;
        const sponsorLabel = sponsorEntry
          ? `${m.sponsorId} — ${getMemberFullName(sponsorEntry)}`
          : (m.sponsorId ? m.sponsorId : '—');
        indirectRows.push({
          name: getMemberFullName(m),
          memberId: m.memberId || '—',
          mobile: m.phone || m.mobile || '—',
          sponsorLabel,
          level: lvl.level,
          rate,
          pkg,
          comm
        });
      });
    });

  const totalComm = report.totalCommission ?? (directComm + indirectComm);
  const paid = Number(member.commissionPaid || member.paidPayout || report.paidPayout || 0);
  const unpaid = Math.max(0, totalComm - paid);

  return {
    fullName, memId, phone, selfBiz,
    sponsorId, sponsorName,
    directList, directBiz, directComm,
    indirectRows, indirectBiz, indirectComm,
    grandTotalBiz: directBiz + indirectBiz,
    totalComm, paid, unpaid
  };
}

// ─── Main print function ───────────────────────────────────────────────────────
export function printCommissionVoucher(member, allUsers) {
  if (!member) return;

  const d = _buildVoucherData(member, allUsers || {});

  // Build direct members table rows
  let directRowsHTML = '';
  if (d.directList.length === 0) {
    directRowsHTML = `<tr><td colspan="8" style="text-align:center;color:#888;padding:10px;">कोई प्रत्यक्ष सदस्य नहीं (No direct members)</td></tr>`;
  } else {
    d.directList.forEach((m, i) => {
      const name = _safe(getMemberFullName(m));
      const mid = _safe(m.memberId || '—');
      const mob = _safe(m.phone || m.mobile || '—');
      const spId = _safe(m.sponsorId || d.memId);
      const pkg = Number(m.packageAmount || m.selfBusiness || parseAmount(m) || 0);
      const comm = Number(m.commissionGenerated ?? (pkg * 0.20));
      directRowsHTML += `
        <tr style="background:${i % 2 === 0 ? '#fff' : '#fdf4f8'};">
          <td style="text-align:center;">${i + 1}</td>
          <td>${name}</td>
          <td style="text-align:center;">${mid}</td>
          <td style="text-align:center;">${mob}</td>
          <td style="text-align:center;">${spId}</td>
          <td style="text-align:right;">${_fmtINR(pkg)}</td>
          <td style="text-align:center;">20%</td>
          <td style="text-align:right;font-weight:600;color:#b91c1c;">${_fmtINR(comm)}</td>
        </tr>`;
    });
  }

  // Build indirect members table rows
  let indirectRowsHTML = '';
  if (d.indirectRows.length === 0) {
    indirectRowsHTML = `<tr><td colspan="8" style="text-align:center;color:#888;padding:10px;">कोई अप्रत्यक्ष सदस्य नहीं (No indirect members)</td></tr>`;
  } else {
    d.indirectRows.forEach((m, i) => {
      indirectRowsHTML += `
        <tr style="background:${i % 2 === 0 ? '#fff' : '#f0f9ff'};">
          <td style="text-align:center;">${i + 1}</td>
          <td style="text-align:center;font-weight:700;">L${m.level}</td>
          <td>${_safe(m.name)}</td>
          <td style="text-align:center;">${_safe(m.memberId)}</td>
          <td style="text-align:center;">${_safe(m.sponsorLabel)}</td>
          <td style="text-align:right;">${_fmtINR(m.pkg)}</td>
          <td style="text-align:center;">${m.rate}%</td>
          <td style="text-align:right;font-weight:600;color:#1d4ed8;">${_fmtINR(m.comm)}</td>
        </tr>`;
    });
  }

  const foundationName = FOUNDATION_DETAILS?.name || 'उत्तम चैरिटेबल वेलफेयर फाउंडेशन';
  const presidentName = PRESIDENT_NAME_HINDI || 'डॉ. राजेन्द्र सिंह सैनी';
  const presidentRole = PRESIDENT_ROLE_HINDI || 'संस्थापक / राष्ट्रीय अध्यक्ष';

  const html = `<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Commission Voucher — ${_safe(d.fullName)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;600;700&display=swap');

    @page { size: A4; margin: 10mm; }
    @media print {
      .no-print { display: none !important; }
      body { padding: 0; margin: 0; }
      .page-break { page-break-before: always; }
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Noto Sans Devanagari', 'Arial', sans-serif;
      font-size: 11px;
      color: #1a1a1a;
      background: #fff;
      padding: 8px;
    }

    /* ── Header ── */
    .header {
      display: flex;
      align-items: center;
      gap: 14px;
      border-bottom: 3px solid #9f1239;
      padding-bottom: 10px;
      margin-bottom: 10px;
    }
    .header img { width: 70px; height: 70px; object-fit: contain; flex-shrink: 0; }
    .header-text { flex: 1; }
    .header-org {
      font-size: 15px;
      font-weight: 800;
      color: #9f1239;
      line-height: 1.3;
    }
    .header-title {
      font-size: 12px;
      font-weight: 700;
      color: #374151;
      margin-top: 2px;
    }
    .header-sub { font-size: 10px; color: #6b7280; margin-top: 1px; }

    /* ── Member info row ── */
    .member-info-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 6px 16px;
      background: linear-gradient(90deg, #fff1f2, #fef3c7);
      border: 1.5px solid #fca5a5;
      border-radius: 8px;
      padding: 8px 12px;
      margin-bottom: 12px;
      font-size: 10.5px;
    }
    .info-item { display: flex; align-items: center; gap: 4px; }
    .info-label { font-weight: 700; color: #9f1239; }
    .info-value { color: #111827; }

    /* ── Section headers ── */
    .section-title {
      font-size: 11.5px;
      font-weight: 800;
      padding: 6px 10px;
      border-radius: 6px 6px 0 0;
      margin-bottom: 0;
      border-left: 4px solid;
    }
    .section-title.part-a {
      background: #fce7f3;
      color: #9d174d;
      border-color: #db2777;
    }
    .section-title.part-b {
      background: #dbeafe;
      color: #1e3a8a;
      border-color: #2563eb;
    }

    /* ── Tables ── */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
      margin-bottom: 10px;
    }
    .data-table th {
      padding: 6px 5px;
      text-align: center;
      font-weight: 700;
      font-size: 9.5px;
      white-space: nowrap;
    }
    .data-table.part-a th { background: #9d174d; color: #fff; border: 1px solid #831843; }
    .data-table.part-b th { background: #1e3a8a; color: #fff; border: 1px solid #1e40af; }
    .data-table td {
      padding: 5px 5px;
      border: 1px solid #e5e7eb;
      vertical-align: middle;
    }
    .data-table .subtotal-row td {
      font-weight: 800;
      font-size: 10px;
      border-top: 2px solid #374151;
    }
    .data-table.part-a .subtotal-row td { background: #fce7f3; color: #9d174d; }
    .data-table.part-b .subtotal-row td { background: #dbeafe; color: #1e3a8a; }

    /* ── Grand Total Box ── */
    .grand-total-box {
      background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
      color: #fff;
      border-radius: 10px;
      padding: 14px 18px;
      margin-top: 12px;
      border: 2px solid #374151;
    }
    .grand-total-box .gt-title {
      font-size: 13px;
      font-weight: 900;
      text-align: center;
      letter-spacing: 0.5px;
      border-bottom: 1.5px solid #4b5563;
      padding-bottom: 8px;
      margin-bottom: 10px;
      color: #fbbf24;
    }
    .gt-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 0;
      border-bottom: 1px solid #374151;
      font-size: 10.5px;
    }
    .gt-row:last-child { border-bottom: none; }
    .gt-row .gt-label { color: #d1d5db; }
    .gt-row .gt-val { font-weight: 700; color: #fff; font-size: 11px; }
    .gt-highlight {
      background: linear-gradient(90deg, #7c3aed20, #db277720);
      border-radius: 6px;
      padding: 6px 8px;
      margin-top: 6px;
    }
    .gt-highlight .gt-label { color: #c4b5fd; font-weight: 700; }
    .gt-highlight .gt-val { color: #fbbf24; font-size: 13px; font-weight: 900; }
    .gt-payout-row {
      display: flex;
      gap: 20px;
      justify-content: center;
      margin-top: 6px;
      font-size: 10px;
    }
    .gt-payout-row .paid { color: #86efac; font-weight: 700; }
    .gt-payout-row .unpaid { color: #fca5a5; font-weight: 700; }

    /* ── Signatory ── */
    .signatory-section {
      display: flex;
      justify-content: flex-end;
      margin-top: 20px;
      padding-top: 10px;
      border-top: 1.5px dashed #d1d5db;
    }
    .signatory-box {
      text-align: center;
      border-top: 1.5px solid #374151;
      padding-top: 6px;
      min-width: 200px;
    }
    .signatory-box .sig-name { font-weight: 800; font-size: 11px; color: #111827; }
    .signatory-box .sig-role { font-size: 10px; color: #6b7280; margin-top: 2px; }

    /* ── Print button ── */
    .print-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: linear-gradient(to right, #db2777, #be123c);
      color: white;
      border: none;
      border-radius: 8px;
      padding: 8px 16px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      margin-bottom: 12px;
    }
    .print-btn:hover { background: linear-gradient(to right, #be185d, #9f1239); }

    .voucher-footer {
      text-align: center;
      font-size: 9px;
      color: #9ca3af;
      margin-top: 14px;
      border-top: 1px solid #e5e7eb;
      padding-top: 6px;
    }
  </style>
</head>
<body>

  <!-- Print Button (hidden on print) -->
  <div class="no-print" style="text-align:center; margin-bottom:10px;">
    <button class="print-btn" onclick="window.print()">🖨️ वाउचर प्रिंट करें (Print Voucher)</button>
  </div>

  <!-- ══ HEADER ══ -->
  <div class="header">
    <img src="/logo.png" alt="Logo" onerror="this.style.display='none'" />
    <div class="header-text">
      <div class="header-org">${_safe(foundationName)}</div>
      <div class="header-title">🏅 कमीशन पेआउट वाउचर &nbsp;|&nbsp; Commission Payout Voucher</div>
      <div class="header-sub">दिनांक / Date: ${_today()} &nbsp;|&nbsp; Generated by MLM Management System</div>
    </div>
  </div>

  <!-- ══ MEMBER INFO BAR ══ -->
  <div class="member-info-bar">
    <div class="info-item">
      <span class="info-label">👤 सदस्य / Member:</span>
      <span class="info-value">${_safe(d.fullName)}</span>
    </div>
    <div class="info-item">
      <span class="info-label">🆔 ID:</span>
      <span class="info-value">${_safe(d.memId)}</span>
    </div>
    <div class="info-item">
      <span class="info-label">📱 Mobile:</span>
      <span class="info-value">${_safe(d.phone)}</span>
    </div>
    <div class="info-item">
      <span class="info-label">🔗 Sponsor:</span>
      <span class="info-value">${_safe(d.sponsorId)} — ${_safe(d.sponsorName)}</span>
    </div>
    <div class="info-item">
      <span class="info-label">💼 Self Business:</span>
      <span class="info-value">${_fmtINR(d.selfBiz)}</span>
    </div>
    <div class="info-item">
      <span class="info-label">📅 Date:</span>
      <span class="info-value">${_today()}</span>
    </div>
  </div>

  <!-- ══ PART A — Direct Members (L1 @ 20%) ══ -->
  <div class="section-title part-a">
    🔵 PART A — प्रत्यक्ष सदस्य रिपोर्ट &nbsp;|&nbsp; Direct Members — Level 1 @ 20%
    &nbsp;&nbsp;(कुल / Total: ${d.directList.length} सदस्य)
  </div>
  <table class="data-table part-a">
    <thead>
      <tr>
        <th style="width:30px;">क्रम सं०</th>
        <th>Member Name</th>
        <th>Code / ID</th>
        <th>Mobile</th>
        <th>Sponsor ID</th>
        <th>Business (₹)</th>
        <th>Commission %</th>
        <th>Commission Earned (₹)</th>
      </tr>
    </thead>
    <tbody>
      ${directRowsHTML}
      <tr class="subtotal-row">
        <td colspan="5" style="text-align:right;">📊 Direct Total (L1) —</td>
        <td style="text-align:right;">${_fmtINR(d.directBiz)}</td>
        <td style="text-align:center;">20%</td>
        <td style="text-align:right;">${_fmtINR(d.directComm)}</td>
      </tr>
    </tbody>
  </table>

  <!-- ══ PART B — Indirect Members (L2–L12) ══ -->
  <div class="section-title part-b">
    🟢 PART B — अप्रत्यक्ष सदस्य रिपोर्ट &nbsp;|&nbsp; Indirect Members — Level 2–12
    &nbsp;&nbsp;(L2:8%, L3:5%, L4:4%, L5:3%, L6:2.5%, L7:2%, L8:1.5%, L9–L12:1%)
    &nbsp;&nbsp;(कुल / Total: ${d.indirectRows.length} सदस्य)
  </div>
  <table class="data-table part-b">
    <thead>
      <tr>
        <th style="width:30px;">क्रम सं०</th>
        <th style="width:40px;">Level</th>
        <th>Member Name</th>
        <th>Code / ID</th>
        <th>Joined Under (Sponsor ID &amp; Name)</th>
        <th>Business (₹)</th>
        <th>Rate (%)</th>
        <th>Commission (₹)</th>
      </tr>
    </thead>
    <tbody>
      ${indirectRowsHTML}
      <tr class="subtotal-row">
        <td colspan="5" style="text-align:right;">📊 Indirect Total (L2–L12) —</td>
        <td style="text-align:right;">${_fmtINR(d.indirectBiz)}</td>
        <td style="text-align:center;">Mixed</td>
        <td style="text-align:right;">${_fmtINR(d.indirectComm)}</td>
      </tr>
    </tbody>
  </table>

  <!-- ══ PART C — GRAND TOTAL ══ -->
  <div class="grand-total-box">
    <div class="gt-title">🏆 PART C — कुल सारांश / GRAND TOTAL SUMMARY</div>

    <div class="gt-row">
      <span class="gt-label">🔵 Total Direct Business (L1)</span>
      <span class="gt-val">${_fmtINR(d.directBiz)}</span>
    </div>
    <div class="gt-row">
      <span class="gt-label">&nbsp;&nbsp;&nbsp;↳ Direct Commission @ 20%</span>
      <span class="gt-val" style="color:#f9a8d4;">${_fmtINR(d.directComm)}</span>
    </div>

    <div class="gt-row" style="margin-top:4px;">
      <span class="gt-label">🟢 Total Indirect Business (L2–L12)</span>
      <span class="gt-val">${_fmtINR(d.indirectBiz)}</span>
    </div>
    <div class="gt-row">
      <span class="gt-label">&nbsp;&nbsp;&nbsp;↳ Indirect Commission (mixed rates)</span>
      <span class="gt-val" style="color:#93c5fd;">${_fmtINR(d.indirectComm)}</span>
    </div>

    <div class="gt-row gt-highlight" style="margin-top:8px;">
      <span class="gt-label">💼 कुल योग GRAND TOTAL BUSINESS</span>
      <span class="gt-val">${_fmtINR(d.grandTotalBiz)}</span>
    </div>

    <div class="gt-row gt-highlight" style="margin-top:4px;">
      <span class="gt-label">💰 कुल देय कमीशन GRAND TOTAL COMMISSION EARNED</span>
      <span class="gt-val" style="color:#fbbf24;font-size:14px;">${_fmtINR(d.totalComm)}</span>
    </div>

    <div class="gt-payout-row">
      <span class="paid">✅ Paid: ${_fmtINR(d.paid)}</span>
      <span class="unpaid">⏳ Unpaid / Balance: ${_fmtINR(d.unpaid)}</span>
    </div>
  </div>

  <!-- ══ SIGNATORY ══ -->
  <div class="signatory-section">
    <div class="signatory-box">
      <div style="height:30px;"></div>
      <div class="sig-name">${_safe(presidentName)}</div>
      <div class="sig-role">(${_safe(presidentRole)})</div>
      <div class="sig-role" style="font-size:9px;margin-top:2px;">${_safe(foundationName)}</div>
    </div>
  </div>

  <!-- ══ FOOTER ══ -->
  <div class="voucher-footer">
    यह वाउचर ${_safe(foundationName)} द्वारा जारी किया गया है। &nbsp;|&nbsp;
    This is a computer-generated commission voucher. &nbsp;|&nbsp;
    Generated: ${_today()}
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 400);
    };
  </script>
</body>
</html>`;

  const cleanHtml = html.replace(/<script>[\s\S]*?<\/script>/i, '');
  const oldFrame = document.getElementById('ucwf-print-voucher-frame');
  if (oldFrame) oldFrame.remove();

  const iframe = document.createElement('iframe');
  iframe.id = 'ucwf-print-voucher-frame';
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
    doc.write(cleanHtml);
    doc.close();
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.warn('Iframe print notice, falling back to page print:', e);
        window.print();
      }
      setTimeout(() => {
        iframe.remove();
      }, 60000);
    }, 350);
  }
}

// ─── Reusable Print Button ─────────────────────────────────────────────────────
export function VoucherPrintButton({ member, allUsers = {}, size = 'normal', label = '' }) {
  if (!member) return null;
  const cls = size === 'large'
    ? 'px-6 py-3 text-sm shadow-lg shadow-pink-600/30'
    : size === 'small'
    ? 'px-2.5 py-1 text-[10px] shadow-sm'
    : 'px-4 py-2 text-xs shadow-md shadow-pink-600/20';
  return (
    <button
      type="button"
      onClick={() => printCommissionVoucher(member, allUsers)}
      className={`inline-flex items-center gap-2 font-black rounded-2xl transition active:scale-95 cursor-pointer border-2 border-pink-700 bg-gradient-to-r from-pink-600 to-rose-700 hover:from-pink-700 hover:to-rose-800 text-white print:hidden ${cls}`}
      title="🖨️ कमीशन वाउचर प्रिंट करें (Print Commission Voucher — A4)"
    >
      <span>🖨️</span>
      <span>{label || (size === 'small' ? 'Voucher' : 'वाउचर प्रिंट करें (Print Voucher)')}</span>
    </button>
  );
}

export default VoucherPrintButton;
