import React, { useState, useRef, useEffect } from 'react';
import { 
  User, 
  KeyRound, 
  Phone, 
  Users, 
  IndianRupee, 
  TrendingUp, 
  Copy, 
  Check, 
  Eye, 
  EyeOff, 
  Printer, 
  Download, 
  ShieldCheck, 
  Building2, 
  Layers, 
  Award,
  Search,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { rtdb } from '../lib/firebase';
import { ref, get } from 'firebase/database';
import { FOUNDATION_DETAILS, formatINR, safeText } from '../lib/constants';
import { 
  buildMember12LevelReport, 
  getMemberFullName, 
  parseAmount, 
  normId, 
  findParentMember 
} from '../utils/mlmUtils';
import { VoucherPrintButton } from './CommissionVoucher';

export default function MyReportSection({ targetMember = null }) {
  const fileRef = useRef(null);
  const photoRef = useRef(null);
  const inputRef = useRef(null);
  const printRef = useRef(null);

  const { member, userProfile } = useAuth();
  const [allUsers, setAllUsers] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(targetMember || null);

  // Load all users from RTDB
  useEffect(() => {
    async function load() {
      try {
        const snap = await get(ref(rtdb, 'users'));
        if (snap.exists()) {
          const val = snap.val();
          setAllUsers(val);
          if (!selectedUser) {
            const current = Object.values(val).find(u => 
              (userProfile?.memberId && normId(u.memberId) === normId(userProfile.memberId)) ||
              (member?.memberId && normId(u.memberId) === normId(member.memberId))
            ) || userProfile || member || Object.values(val).find(u => u && (u.memberId === 'UCWF-0001' || u.memberId === 'UCWF-2026-6401')) || Object.values(val)[0];
            setSelectedUser(current);
          }
        }
      } catch (err) {
        console.error('Error loading users for My Report:', err);
      }
    }
    load();
  }, [userProfile?.memberId, member?.memberId]);

  const activeUser = selectedUser || targetMember || userProfile || member;
  const report = buildMember12LevelReport(activeUser, allUsers) || {
    selfBusiness: 0,
    directMembersCount: 0,
    directBusiness: 0,
    directCommission: 0,
    downlineMembersCount: 0,
    downlineBusiness: 0,
    downlineCommission: 0,
    totalTeamMembers: 0,
    totalTeamBusiness: 0,
    totalCommission: 0,
    paidPayout: 0,
    unpaidPayout: 0,
    directList: []
  };

  const fullName = getMemberFullName(activeUser, 'सम्मानित सदस्य');
  const memId = activeUser?.memberId || 'UCWF-2026-XXXX';
  const plainPass = activeUser?.plainPassword || activeUser?.password || activeUser?.phone || 'UCWF@1234';
  const phone = activeUser?.phone || '—';
  const sponsorParent = findParentMember(activeUser, allUsers);
  const sponsorId = activeUser?.sponsorId || sponsorParent?.memberId || 'UCWF-0001';
  const sponsorName = sponsorParent 
    ? getMemberFullName(sponsorParent) 
    : (activeUser?.sponsorName || (sponsorId === 'DIRECT' || sponsorId === 'UCWF-0001' || sponsorId === '9540648402' ? 'उत्तम चैरिटेबल ट्रस्ट (हेड ऑफिस)' : `स्पॉन्सर (${sponsorId})`));

  const paid = Number(activeUser?.commissionPaid || activeUser?.paidPayout || report.paidPayout || 0);
  const unpaid = Math.max(0, report.totalCommission - paid);

  const handlePrint = () => {
    window.print();
  };

  const filteredUsersList = searchQuery.trim() ? Object.values(allUsers).filter(u => {
    const q = searchQuery.toLowerCase();
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.memberId && u.memberId.toLowerCase().includes(q)) ||
      (u.phone && u.phone.includes(q))
    );
  }).slice(0, 10) : [];

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-blue-200 shadow-sm max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-blue-100">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/30">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <span>My Report / सदस्य प्रोफाइल एवं व्यापार रिपोर्ट</span>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 text-xs font-bold font-mono">
                Member Profile & Business
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              सदस्य का संपूर्ण प्रोफाइल विवरण, लॉगिन क्रेडेंशियल, 12-स्तरीय टीम संख्या, कुल टर्नओवर एवं मानदेय आय।
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
              placeholder="अन्य सदस्य खोजें..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
            />
            {filteredUsersList.length > 0 && searchQuery.trim() && (
              <div className="absolute top-full left-0 right-0 z-30 mt-1 max-h-48 overflow-y-auto bg-white rounded-xl shadow-lg border border-slate-200 divide-y divide-slate-100">
                {filteredUsersList.map(u => (
                  <button
                    key={u.uid || u.memberId}
                    type="button"
                    onClick={() => {
                      setSelectedUser(u);
                      setSearchQuery('');
                    }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 flex items-center justify-between cursor-pointer"
                  >
                    <strong className="text-slate-900">{getMemberFullName(u)}</strong>
                    <span className="font-mono text-blue-900 font-bold">{u.memberId}</span>
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
            <span>प्रिंट (Print)</span>
          </button>
        </div>
      </div>

      <div ref={printRef} className="space-y-6">
        {/* Profile Card & Credentials */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white shadow-xl border border-blue-400/40 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-white/10 border-2 border-amber-400/60 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-lg">
                {activeUser?.photoUrl ? (
                  <img src={activeUser.photoUrl} alt="Photo" className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <User className="w-10 h-10 text-slate-300" />
                )}
              </div>

              <div className="space-y-1">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 uppercase tracking-wider">
                  {safeText(activeUser?.padNaam || 'कार्यकारिणी सदस्य')}
                </span>
                <h3 className="text-2xl font-black text-white font-serif">{fullName}</h3>
                <p className="text-xs text-slate-300">
                  पिता/पति: <strong className="text-white">{activeUser?.fatherOrSpouseName || activeUser?.fatherName || '—'}</strong>
                </p>
                <p className="text-xs text-slate-300">
                  स्थान: {activeUser?.city || 'काशीपुर'}, {activeUser?.state || 'उत्तराखण्ड'}
                </p>
              </div>
            </div>

            {/* Credentials Badges */}
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 space-y-2.5 text-xs">
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-300 font-bold">User ID No.:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-black text-amber-300 bg-black/40 px-2 py-0.5 rounded border border-amber-400/40">
                    {memId}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(memId);
                      setCopiedId(true);
                      setTimeout(() => setCopiedId(false), 2000);
                    }}
                    className="text-slate-300 hover:text-white p-0.5"
                    title="Copy ID"
                  >
                    {copiedId ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-300 font-bold">Password:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-white bg-black/40 px-2 py-0.5 rounded border border-white/20">
                    {showPassword ? plainPass : '••••••••'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-300 hover:text-white p-0.5"
                    title="Toggle password"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(plainPass);
                      setCopiedPass(true);
                      setTimeout(() => setCopiedPass(false), 2000);
                    }}
                    className="text-slate-300 hover:text-white p-0.5"
                    title="Copy password"
                  >
                    {copiedPass ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 pt-1 border-t border-white/10">
                <span className="text-slate-300 font-bold">Mobile No.:</span>
                <a href={`tel:${phone}`} className="font-mono text-xs font-bold text-emerald-300 hover:underline">
                  {phone}
                </a>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-300 font-bold">Joined Under (Sponsor):</span>
                <span className="font-mono text-xs font-bold text-amber-300">
                  {sponsorId} ({sponsorName})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 8 Business Metric Pods */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Pod 1: Self Donation / Business */}
          <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-slate-800">
            <span className="text-[11px] font-bold text-blue-700 uppercase block">1. Self Donation / Biz</span>
            <p className="text-2xl font-black font-mono text-blue-950 mt-1">{formatINR(report.selfBusiness)}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">स्वयं का दान (0% Commission)</p>
          </div>

          {/* Pod 2: Direct Team Count (Level 1) */}
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-slate-800">
            <span className="text-[11px] font-bold text-emerald-700 uppercase block">2. Direct Team (L1)</span>
            <p className="text-2xl font-black font-mono text-emerald-950 mt-1">{report.directMembersCount}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">सीधे जुड़े सदस्य (20% Rate)</p>
          </div>

          {/* Pod 3: Total 12-Level Team Count */}
          <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 text-slate-800">
            <span className="text-[11px] font-bold text-purple-700 uppercase block">3. Total 12-Lvl Team</span>
            <p className="text-2xl font-black font-mono text-purple-950 mt-1">{report.totalTeamMembers}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">सम्पूर्ण नेटवर्क (L1–L12)</p>
          </div>

          {/* Pod 4: Total Team Business */}
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-slate-800">
            <span className="text-[11px] font-bold text-amber-700 uppercase block">4. Total Team Business</span>
            <p className="text-2xl font-black font-mono text-amber-950 mt-1">{formatINR(report.totalTeamBusiness)}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">नेटवर्क कुल टर्नओवर</p>
          </div>

          {/* Pod 5: Total Commission Earned */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-50 border-2 border-emerald-400 text-slate-900">
            <span className="text-[11px] font-black text-emerald-900 uppercase block">5. Total Commission</span>
            <p className="text-2xl font-black font-mono text-emerald-900 mt-1">{formatINR(report.totalCommission)}</p>
            <p className="text-[10px] text-emerald-800 mt-0.5 font-bold">कुल 12-लेवल मानदेय आय</p>
          </div>

          {/* Pod 6: Paid Payout */}
          <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 text-slate-800">
            <span className="text-[11px] font-bold text-teal-800 uppercase block">6. Paid Commission</span>
            <p className="text-2xl font-black font-mono text-teal-950 mt-1">{formatINR(paid)}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">खाते में प्राप्त भुगतान</p>
          </div>

          {/* Pod 7: Balance / Unpaid Payout */}
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 text-slate-800">
            <span className="text-[11px] font-bold text-rose-700 uppercase block">7. Balance / Unpaid</span>
            <p className="text-2xl font-black font-mono text-rose-700 mt-1">{formatINR(unpaid)}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">बकाया देय मानदेय</p>
          </div>

          {/* Pod 8: Direct Business */}
          <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-slate-800">
            <span className="text-[11px] font-bold text-indigo-700 uppercase block">8. Direct Biz (L1)</span>
            <p className="text-2xl font-black font-mono text-indigo-950 mt-1">{formatINR(report.directBusiness)}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">प्रत्यक्ष सहयोग राशि</p>
          </div>
        </div>

        {/* Direct Referrals (L1) Table */}
        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              <span>प्रत्यक्ष सदस्य सूची (Direct Level 1 Referrals - {report.directMembersCount})</span>
            </h4>
            <span className="text-xs font-bold text-emerald-700 font-mono">
              Direct Biz: {formatINR(report.directBusiness)} • Direct Comm: {formatINR(report.directCommission)}
            </span>
          </div>

          {report.directList.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
              अभी तक कोई प्रत्यक्ष सदस्य (Level 1) नहीं जुड़ा है।
            </div>
          ) : (
            <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-2xs">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">S.No.</th>
                    <th className="py-2.5 px-3">Member Name</th>
                    <th className="py-2.5 px-3">Member ID</th>
                    <th className="py-2.5 px-3">Mobile No.</th>
                    <th className="py-2.5 px-3 text-right">Package / Donation</th>
                    <th className="py-2.5 px-3 text-right">L1 Commission (20%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.directList.map((m, idx) => (
                    <tr key={m.uid || idx} className="hover:bg-slate-50">
                      <td className="py-2 px-3 text-slate-500 font-mono">{idx + 1}</td>
                      <td className="py-2 px-3 font-bold text-slate-900">{getMemberFullName(m)}</td>
                      <td className="py-2 px-3 font-mono font-bold text-blue-900">{m.memberId}</td>
                      <td className="py-2 px-3 font-mono text-slate-700">{m.phone}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{formatINR(m.packageAmount || 500)}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">{formatINR(m.commissionGenerated || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Print Voucher Button */}
      <div className="flex justify-center pt-2 print:hidden">
        <VoucherPrintButton member={activeUser} allUsers={allUsers} size="large" label="🖨️ वाउचर प्रिंट करें / Print Commission Voucher" />
      </div>
    </div>
  );
}
