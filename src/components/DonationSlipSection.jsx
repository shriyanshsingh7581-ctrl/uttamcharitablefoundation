import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, 
  Printer, 
  Download, 
  Search, 
  CreditCard, 
  Award, 
  CheckCircle2, 
  Building2, 
  Shield, 
  Phone, 
  Calendar,
  Sparkles,
  User,
  QrCode
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { rtdb } from '../lib/firebase';
import { ref, get } from 'firebase/database';
import { FOUNDATION_DETAILS, formatINR, safeText } from '../lib/constants';
import { getMemberFullName, parseAmount, normId } from '../utils/mlmUtils';
import { PRESIDENT_STAMP_SIGNATURE_BASE64 } from '../lib/signature-asset';
import SafeQRCode from './ui/SafeQRCode';

// Helper to convert number to Indian English words
function numberToWordsINR(num) {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return '';
  let str = '';
  str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
  str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
  str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
  str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
  str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) + 'Rupees Only' : 'Rupees Only';
  return str.trim();
}

export default function DonationSlipSection({ initialMemberId = '' }) {
  const fileRef = useRef(null);
  const photoRef = useRef(null);
  const inputRef = useRef(null);
  const receiptPrintRef = useRef(null);

  const { member, userProfile } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState('receipt'); // 'receipt' | 'idcard' | 'certificate'
  const [allUsers, setAllUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState(initialMemberId || '');
  const [selectedUser, setSelectedUser] = useState(null);

  // Load all users from RTDB
  useEffect(() => {
    async function load() {
      try {
        const snap = await get(ref(rtdb, 'users'));
        if (snap.exists()) {
          const list = Object.values(snap.val());
          setAllUsers(list);

          const defaultTarget = list.find(u => 
            (initialMemberId && normId(u.memberId) === normId(initialMemberId)) ||
            (userProfile?.memberId && normId(u.memberId) === normId(userProfile.memberId)) ||
            (member?.memberId && normId(u.memberId) === normId(member.memberId))
          ) || userProfile || member || list[0];

          setSelectedUser(defaultTarget);
        }
      } catch (err) {
        console.error('Error loading users for donation slip:', err);
      }
    }
    load();
  }, [initialMemberId, userProfile?.memberId, member?.memberId]);

  const targetUser = selectedUser || userProfile || member;
  const fullName = getMemberFullName(targetUser, 'सम्मानित सदस्य');
  const fatherName = targetUser?.fatherOrSpouseName || targetUser?.fatherName || '—';
  const memId = targetUser?.memberId || 'UCWF-2026-0001';
  const phone = targetUser?.phone || '—';
  const address = targetUser?.permanentAddress || targetUser?.currentAddress || targetUser?.address || 'काशीपुर (उत्तराखण्ड)';
  const amount = parseAmount(targetUser) || 1100;
  const amountWords = numberToWordsINR(amount);
  const receiptNo = `UCWF-REC-${String(memId).replace(/\D/g, '').slice(-4) || '1001'}-${new Date().getFullYear()}`;
  const receiptDate = new Date().toLocaleDateString('hi-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const handlePrint = () => {
    window.print();
  };

  const filteredUsers = searchQuery.trim() ? allUsers.filter(u => {
    const q = searchQuery.toLowerCase();
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.memberId && u.memberId.toLowerCase().includes(q)) ||
      (u.phone && u.phone.includes(q))
    );
  }).slice(0, 10) : [];

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-amber-200 shadow-sm max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-amber-100">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-600/30">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <span>डोनेशन की स्लिप (Donation Slip)</span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-bold font-mono">
                Official Receipt & Docs
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              डोनेशन की आधिकारिक रसीद (Donation Slip), डिजिटल आई-कार्ड (Smart ID Card), एवं सम्मान पत्र (Certificate)।
            </p>
          </div>
        </div>

        {/* 3 Sub-Option Pills */}
        <div className="inline-flex rounded-2xl bg-slate-100 p-1 border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveSubTab('receipt')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeSubTab === 'receipt'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            1. डोनेशन रसीद (Slip)
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('idcard')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeSubTab === 'idcard'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            2. डिजिटल आई-कार्ड
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('certificate')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeSubTab === 'certificate'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            3. सम्मान पत्र (Certificate)
          </button>
        </div>
      </div>

      {/* Member Selector Search Strip */}
      <div className="p-3 bg-amber-50/60 rounded-2xl border border-amber-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
          <User className="w-4 h-4 text-amber-700" />
          <span>चयनित सदस्य: <strong className="text-slate-900">{fullName} ({memId})</strong></span>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="सदस्य खोजें (ID / Name)..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white border border-amber-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
          />
          {filteredUsers.length > 0 && searchQuery.trim() && (
            <div className="absolute top-full left-0 right-0 z-30 mt-1 max-h-48 overflow-y-auto bg-white rounded-xl shadow-lg border border-amber-200 divide-y divide-slate-100">
              {filteredUsers.map(u => (
                <button
                  key={u.uid || u.memberId}
                  type="button"
                  onClick={() => {
                    setSelectedUser(u);
                    setSearchQuery('');
                  }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-amber-50 flex items-center justify-between cursor-pointer"
                >
                  <strong className="text-slate-900">{getMemberFullName(u)}</strong>
                  <span className="font-mono text-amber-900 font-bold">{u.memberId}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handlePrint}
          className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer ml-auto"
        >
          <Printer className="w-4 h-4" />
          <span>प्रिंट करें (Print)</span>
        </button>
      </div>

      {/* VIEW 1: DONATION RECEIPT (रसीद) */}
      {activeSubTab === 'receipt' && (
        <div className="w-full max-w-full overflow-x-auto touch-pan-x py-3 flex flex-col items-start sm:items-center">
          <p className="text-[10px] text-amber-800 font-bold sm:hidden mb-2 px-1">
            ⟷ पूरी रसीद देखने हेतु स्क्रीन को दाएं-बाएं स्लाइड करें (Swipe to view full slip)
          </p>
          <div
            ref={receiptPrintRef}
            id="donation-receipt-slip"
            className="w-[720px] bg-white border-3 border-amber-700/80 p-6 sm:p-8 shadow-xl relative text-slate-900 shrink-0 font-serif"
            style={{ minHeight: '480px' }}
          >
            {/* Watermark Logo */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] pointer-events-none">
              <img src="/logo.png" alt="Watermark" className="w-72 h-72 object-contain" />
            </div>

            {/* Inset Border */}
            <div className="border border-amber-500/40 p-6 relative">
              {/* Receipt Header with Left Logo */}
              <div className="flex items-center justify-between pb-4 border-b-2 border-amber-800">
                <div className="w-20 h-20 rounded-full border-2 border-amber-600 bg-white p-1 flex items-center justify-center shrink-0 shadow-md">
                  <img src="/logo.png" alt="Foundation Logo" className="w-full h-full object-contain rounded-full" />
                </div>

                <div className="text-center flex-1 px-4">
                  <h1 className="text-2xl font-black text-emerald-950 font-serif leading-tight">
                    {FOUNDATION_DETAILS.nameHindi}
                  </h1>
                  <h2 className="text-xs font-black text-amber-900 uppercase tracking-widest font-sans mt-0.5">
                    {FOUNDATION_DETAILS.nameEnglish}
                  </h2>
                  <p className="text-[10px] text-emerald-800 font-bold font-sans mt-0.5">
                    &quot;{FOUNDATION_DETAILS.tagline}&quot;
                  </p>
                  <p className="text-[9px] text-slate-600 font-sans mt-1">
                    Regd. No.: <strong className="text-emerald-900">{FOUNDATION_DETAILS.cin}</strong> (Section 8 Act 2013) &nbsp;|&nbsp;
                    PAN: <strong className="text-emerald-900">{FOUNDATION_DETAILS.pan}</strong> &nbsp;|&nbsp;
                    TAN: <strong className="text-emerald-900">{FOUNDATION_DETAILS.tan}</strong>
                  </p>
                  <p className="text-[9px] text-slate-500 font-sans mt-0.5">
                    मुख्यालय: {FOUNDATION_DETAILS.address} • फोन: {FOUNDATION_DETAILS.phone}
                  </p>
                </div>

                <div className="w-20 h-20 flex flex-col items-center justify-center shrink-0">
                  <SafeQRCode value={`https://www.ucwf.online/receipt/${memId}`} size={64} />
                  <span className="text-[8px] font-mono font-bold text-amber-900 mt-1">RECEIPT QR</span>
                </div>
              </div>

              {/* Receipt Title Strip */}
              <div className="flex items-center justify-between py-3 border-b border-dashed border-amber-400 font-sans text-xs">
                <div>
                  <span className="text-slate-500">रसीद सं० (Receipt No.): </span>
                  <strong className="font-mono text-emerald-950 font-black">{receiptNo}</strong>
                </div>
                <div className="px-4 py-1 rounded-full bg-amber-100 text-amber-950 font-black text-xs font-serif uppercase tracking-wider border border-amber-300">
                  ★ डोनेशन प्राप्ति रसीद (DONATION RECEIPT) ★
                </div>
                <div>
                  <span className="text-slate-500">दिनांक (Date): </span>
                  <strong className="text-slate-900 font-bold">{receiptDate}</strong>
                </div>
              </div>

              {/* Receipt Body */}
              <div className="py-5 space-y-3.5 text-xs text-slate-800 leading-relaxed font-sans">
                <div className="flex items-baseline gap-2">
                  <span className="text-slate-500 whitespace-nowrap">सहयोगकर्ता का नाम (Received with thanks from):</span>
                  <span className="flex-1 font-bold text-slate-950 text-sm border-b border-dotted border-slate-400 pb-0.5">
                    {fullName}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-slate-500 whitespace-nowrap">पिता/पति का नाम:</span>
                    <span className="flex-1 font-bold text-slate-900 border-b border-dotted border-slate-400 pb-0.5">
                      {fatherName}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-slate-500 whitespace-nowrap">सदस्य आईडी (Member ID):</span>
                    <span className="flex-1 font-mono font-black text-emerald-900 border-b border-dotted border-slate-400 pb-0.5">
                      {memId}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-slate-500 whitespace-nowrap">मोबाइल नंबर (Mobile No.):</span>
                    <span className="flex-1 font-mono font-bold text-slate-900 border-b border-dotted border-slate-400 pb-0.5">
                      {phone}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-slate-500 whitespace-nowrap">भुगतान माध्यम (Payment Mode):</span>
                    <span className="flex-1 font-bold text-slate-900 border-b border-dotted border-slate-400 pb-0.5">
                      Digital UPI / Netbanking / Direct
                    </span>
                  </div>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-slate-500 whitespace-nowrap">पता (Address):</span>
                  <span className="flex-1 font-medium text-slate-900 border-b border-dotted border-slate-400 pb-0.5">
                    {address}
                  </span>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-slate-500 whitespace-nowrap">सहयोग राशि शब्दों में (Amount in Words):</span>
                  <span className="flex-1 font-bold text-amber-950 italic border-b border-dotted border-slate-400 pb-0.5">
                    {amountWords}
                  </span>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-slate-500 whitespace-nowrap">उद्देश्य (Purpose):</span>
                  <span className="flex-1 font-medium text-slate-800 border-b border-dotted border-slate-400 pb-0.5">
                    उत्तम चैरिटेबल वेलफेयर फाउंडेशन सामाजिक जनकल्याण, शिक्षा, स्वास्थ्य एवं असहाय सेवा संकल्प
                  </span>
                </div>
              </div>

              {/* Receipt Footer with Stamp & Amount Box */}
              <div className="pt-4 border-t-2 border-amber-800 flex items-end justify-between font-sans">
                {/* Big Amount Box */}
                <div className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-800 to-teal-900 text-white shadow-md border-2 border-amber-400">
                  <span className="text-[10px] font-bold uppercase tracking-wider block opacity-90">डोनेशन प्राप्त राशि</span>
                  <span className="font-mono text-2xl font-black">{formatINR(amount)}</span>
                </div>

                {/* President Seal & Signature */}
                <div className="text-center space-y-1">
                  <div className="w-36 h-16 mx-auto flex items-center justify-center">
                    <img
                      src={PRESIDENT_STAMP_SIGNATURE_BASE64}
                      alt="President Signature & Stamp"
                      className="max-h-full object-contain"
                    />
                  </div>
                  <div className="text-[10px] font-bold text-slate-900 border-t border-slate-300 pt-0.5">
                    <p className="font-bold">{FOUNDATION_DETAILS.presidentNameHindi}</p>
                    <p className="text-[9px] text-slate-600 font-medium">{FOUNDATION_DETAILS.presidentRoleHindi}</p>
                    <p className="text-[8px] text-emerald-900 font-bold uppercase">Uttam Charitable Welfare Foundation</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: DIGITAL ID CARD */}
      {activeSubTab === 'idcard' && (
        <div className="py-6 text-center space-y-4">
          <div className="max-w-md mx-auto p-6 bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-950 text-white rounded-3xl shadow-2xl border-2 border-amber-400 relative overflow-hidden text-left">
            {/* ID Card Header */}
            <div className="flex items-center gap-3 pb-3 border-b border-amber-400/40">
              <div className="w-12 h-12 rounded-full bg-white p-0.5 border border-amber-400 shrink-0">
                <img src="/logo.png" alt="Logo" className="w-full h-full object-contain rounded-full" />
              </div>
              <div>
                <h3 className="text-sm font-black text-amber-300 leading-tight">{FOUNDATION_DETAILS.nameHindi}</h3>
                <p className="text-[9px] font-bold text-emerald-200 uppercase">{FOUNDATION_DETAILS.nameEnglish}</p>
                <p className="text-[8px] text-slate-300 font-mono">Regd: {FOUNDATION_DETAILS.cin}</p>
              </div>
            </div>

            {/* Photo & Details */}
            <div className="flex items-center gap-4 py-4">
              <div className="w-20 h-24 rounded-xl bg-slate-800 border-2 border-amber-400/60 overflow-hidden flex items-center justify-center shrink-0">
                {targetUser?.photoUrl ? (
                  <img src={targetUser.photoUrl} alt="Photo" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-slate-400" />
                )}
              </div>

              <div className="space-y-1 text-xs">
                <h4 className="font-black text-base text-white">{fullName}</h4>
                <p className="text-[11px] font-bold text-amber-300 font-mono">ID: {memId}</p>
                <p className="text-[11px] text-emerald-200">पद: <strong>{targetUser?.padNaam || 'कार्यकारिणी सदस्य'}</strong></p>
                <p className="text-[11px] text-slate-300">मो: <strong className="font-mono">{phone}</strong></p>
                <p className="text-[10px] text-slate-400">रक्त समूह: {targetUser?.bloodGroup || 'O+'}</p>
              </div>
            </div>

            {/* ID Card Footer */}
            <div className="pt-2 border-t border-amber-400/40 flex items-center justify-between text-[9px] text-slate-300">
              <div>
                <p>वैधता: <strong className="text-amber-300 font-bold">आजीवन (Lifetime)</strong></p>
                <p className="text-[8px]">स्थान: काशीपुर (उत्तराखण्ड)</p>
              </div>
              <div className="p-1 bg-white rounded-lg">
                <SafeQRCode value={`https://www.ucwf.online/id-card/${memId}`} size={42} />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <a
              href="/id-card"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition"
            >
              <span>पूर्ण आई-कार्ड पृष्ठ खोलें (Open Full ID Card Page)</span>
            </a>
          </div>
        </div>
      )}

      {/* VIEW 3: CERTIFICATE OF APPRECIATION (सम्मान पत्र) */}
      {activeSubTab === 'certificate' && (
        <div className="py-6 text-center space-y-4">
          <p className="text-xs text-slate-600">
            बाईं तरफ बड़े आधिकारिक लोगो (Left-Side Prominent Logo) एवं सत्यापनीय क्यूआर सहित उच्च-गुणवत्ता प्रशस्ति पत्र।
          </p>

          <div className="pt-2">
            <a
              href="/certificates"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs sm:text-sm shadow-md transition"
            >
              <Award className="w-5 h-5 text-amber-200" />
              <span>प्रशस्ति पत्र पृष्ठ खोलें (Open Certificate of Appreciation)</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
