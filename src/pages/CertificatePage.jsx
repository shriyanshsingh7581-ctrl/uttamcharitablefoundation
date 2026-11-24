import React, { useRef, useState, useEffect, useMemo } from 'react';
import { 
  Download, 
  FileDown, 
  Printer, 
  Award, 
  ShieldCheck, 
  CheckCircle2, 
  Building2, 
  QrCode, 
  Calendar, 
  MapPin, 
  Loader2,
  Search,
  User,
  Phone,
  Sparkles,
  Save,
  Check,
  Edit3
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { rtdb, ref, get, update } from '../lib/supabase';
import { 
  FOUNDATION_DETAILS, 
  PRESIDENT_NAME_HINDI, 
  PRESIDENT_ROLE_HINDI, 
  safeText 
} from '../lib/constants';
import { getMemberFullName } from '../utils/mlmUtils';
import SafeQRCode from '../components/ui/SafeQRCode';

export default function CertificatePage() {
  const { userProfile, currentUser } = useAuth();
  const { bi } = useLanguage();
  const certRef = useRef(null);

  const [downloading, setDownloading] = useState(false);
  const [allUsersList, setAllUsersList] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Search & Selected Member for live certificate generation
  const [searchMemberTerm, setSearchMemberTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);

  // Editable Form Inputs for customization
  const [salutation, setSalutation] = useState('श्री');
  const [memberName, setMemberName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [motherName, setMotherName] = useState('');
  const [mobileNo, setMobileNo] = useState('');
  const [memberId, setMemberId] = useState('');
  const [padNaam, setPadNaam] = useState('कार्यकारिणी सदस्य');
  const [city, setCity] = useState('काशीपुर (उत्तराखंड)');
  const [issueDate, setIssueDate] = useState(
    new Date().toLocaleDateString('hi-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  );

  const [savingDb, setSavingDb] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // 1. Load all members on mount (with 8s timeout guard)
  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(() => {
      if (isMounted) setUsersLoading(false);
    }, 8000);

    async function loadMembers() {
      try {
        const snap = await get(ref(rtdb, 'users'));
        if (snap.exists() && isMounted) {
          const raw = snap.val();
          const list = Object.entries(raw).map(([uid, u]) => ({
            uid,
            ...u,
            memberId: u.memberId || 'N/A',
            name: u.name || u.displayName || 'सदस्य'
          }));
          setAllUsersList(list);
        }
      } catch (err) {
        console.error('Failed to load users for certificate:', err);
      } finally {
        clearTimeout(timer);
        if (isMounted) setUsersLoading(false);
      }
    }
    loadMembers();
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, []);

  // 2. Default to logged-in user profile
  useEffect(() => {
    const active = selectedUser || userProfile;
    if (active) {
      setSalutation(active.salutation || 'श्री');
      const cleanName = (active.name || active.displayName || '').replace(/^(श्री|श्रीमती|सुश्री|डॉ\.)\s+/i, '').trim();
      setMemberName(cleanName || 'सम्मानित सदस्य');
      setFatherName(active.fatherName || active.fatherOrSpouseName || '');
      setMotherName(active.motherName || '');
      setMobileNo(active.phone || '');
      setMemberId(active.memberId || 'UCWF-2026-MEMBER');
      setPadNaam(active.padNaam || active.designation || 'कार्यकारिणी सदस्य');
      setCity(active.city || active.address || 'काशीपुर (उत्तराखंड)');
      if (active.createdAt) {
        setIssueDate(
          new Date(active.createdAt).toLocaleDateString('hi-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
        );
      }
    }
  }, [userProfile, selectedUser]);

  // Filtered members for dropdown selector
  const searchedMembers = useMemo(() => {
    if (!searchMemberTerm.trim()) return allUsersList.slice(0, 15);
    const q = searchMemberTerm.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, '');
    return allUsersList.filter(u => {
      const uMem = (u.memberId || '').toLowerCase();
      const uPhone = (u.phone || '').replace(/\D/g, '');
      const uName = (u.name || '').toLowerCase();
      return (
        uMem.includes(q) ||
        (qDigits.length >= 4 && uMem.endsWith(qDigits)) ||
        (qDigits && uPhone.includes(qDigits)) ||
        uName.includes(q)
      );
    }).slice(0, 20);
  }, [allUsersList, searchMemberTerm]);

  // Select a member from dropdown
  const handleSelectMember = (u) => {
    setSelectedUser(u);
    setSearchMemberTerm('');
  };

  // Save current customized fields to Supabase for selected member
  const handleSaveToDatabase = async () => {
    const targetUid = selectedUser?.uid || currentUser?.uid;
    if (!targetUid) {
      showToast(bi('अपडेट करने हेतु कोई वैध सदस्य आईडी नहीं मिली।', 'No valid member ID found to update.'), 'error');
      return;
    }

    setSavingDb(true);
    setSaveSuccess(false);
    try {
      await update(ref(rtdb, `users/${targetUid}`), {
        salutation: salutation.trim(),
        name: memberName.trim(),
        displayName: `${salutation.trim()} ${memberName.trim()}`,
        fatherName: fatherName.trim(),
        fatherOrSpouseName: fatherName.trim(),
        motherName: motherName.trim(),
        phone: mobileNo.trim(),
        padNaam: padNaam.trim(),
        designation: padNaam.trim(),
        city: city.trim(),
        address: city.trim()
      });
      setSaveSuccess(true);
      showToast(bi('प्रशस्ति पत्र विवरण सफलतापूर्वक सुरक्षित हो गया!', 'Certificate details saved successfully!'), 'success');
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save certificate updates to Supabase:', err);
      showToast(bi('डाटा सुरक्षित करने में त्रुटि: ', 'Error saving data: ') + err.message, 'error');
    } finally {
      setSavingDb(false);
    }
  };

  // Full Name with Salutation (guaranteed clean, no duplicate salutation)
  const fullDisplayName = useMemo(() => {
    const clean = String(memberName || '').trim();
    if (!clean) return 'सम्मानित सदस्य';
    if (salutation && clean.startsWith(salutation)) return clean;
    return `${salutation} ${clean}`.trim();
  }, [salutation, memberName]);

  const verificationUrl = `${window.location.origin}/dashboard?verify=${encodeURIComponent(memberId)}`;

  // Download HD PNG (Scale: 3 for crystal-clear 300+ DPI print quality, CORS-safe with local SVG QR)
  const handleDownloadPNG = async () => {
    if (!certRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(certRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: false,
        logging: false,
        backgroundColor: '#ffffff'
      });
      const link = document.createElement('a');
      link.download = `UCWF_Prashasti_Patra_${memberId || 'MEMBER'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      showToast(bi('HD PNG सम्मान पत्र डाउनलोड शुरू हो गया।', 'HD PNG Certificate download started.'), 'success');
    } catch (err) {
      console.error('Failed to export certificate PNG:', err);
      showToast(bi('PNG डाउनलोड करने में विफल: ', 'PNG download failed: ') + (err.message || ''), 'error');
    } finally {
      setDownloading(false);
    }
  };

  // Download A4 Landscape PDF
  const handleDownloadPDF = async () => {
    if (!certRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(certRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: false,
        logging: false,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      // A4 Landscape: 297mm x 210mm
      pdf.addImage(imgData, 'PNG', 0, 0, 297, 210);
      pdf.save(`UCWF_Prashasti_Patra_${memberId || 'MEMBER'}.pdf`);
      showToast(bi('A4 PDF सम्मान पत्र डाउनलोड हो गया।', 'A4 PDF Certificate downloaded.'), 'success');
    } catch (err) {
      console.error('Failed to export certificate PDF:', err);
      showToast(bi('PDF डाउनलोड करने में विफल: ', 'PDF download failed: ') + (err.message || ''), 'error');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 py-8 px-3 sm:px-6">
      {toast && (
        <div
          className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold flex items-center gap-2 print:hidden ${
            toast.type === 'error'
              ? 'bg-rose-950 text-rose-100 border-rose-500/40'
              : 'bg-emerald-950 text-emerald-100 border-emerald-500/40'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toast.message}</span>
        </div>
      )}
      {/* Zero-Cut A4 Landscape Print Styling */}
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 0;
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
          #royal-prashasti-patra {
            width: 100vw !important;
            height: 100vh !important;
            max-width: none !important;
            max-height: none !important;
            margin: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
        }
      `}</style>
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* =========================================================================
            1. TOP TOOLBAR & CONTROLS (SEARCH, LIVE CUSTOMIZE & DOWNLOAD)
           ========================================================================= */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-md space-y-4 print:hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold mb-1.5">
                <Award className="w-4 h-4 text-amber-700" />
                <span>प्रशस्ति एवं सम्मान पत्र (Certificate of Appreciation)</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                आधिकारिक डिजिटल सम्मान पत्र (A4 Landscape HD)
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                चयनित सदस्य: <strong className="text-slate-900 font-bold">{fullDisplayName}</strong> • ID: <strong className="font-mono text-emerald-800 font-black">{memberId}</strong>
              </p>
            </div>

            {/* Actions: PNG & PDF Downloads */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleDownloadPNG}
                disabled={downloading}
                className="px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 shadow-md transition disabled:opacity-50 cursor-pointer"
              >
                {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                <span>HD PNG डाउनलोड</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadPDF}
                disabled={downloading}
                className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-700 to-teal-800 hover:from-emerald-800 hover:to-teal-900 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-700/20 transition disabled:opacity-50 cursor-pointer"
              >
                {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                <span>A4 PDF प्रिंट डाउनलोड</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="px-3.5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-300 flex items-center gap-1.5 transition cursor-pointer"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                <span>प्रिंट</span>
              </button>
            </div>
          </div>

          {/* Member Search Selector & Live Customization Accordion */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            
            {/* Column 1: Member Search & Dropdown */}
            <div className="space-y-1.5 relative">
              <label className="block text-xs font-bold text-slate-700">
                1. सदस्य खोजें या चुनें (Search / Select Member)
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="ID (e.g. 6401 या UCWF-2026-6401), नाम या मोबाइल..."
                  value={searchMemberTerm}
                  onChange={(e) => setSearchMemberTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-2xl bg-[#FFF5F7] border border-gray-300 focus:bg-white focus:border-pink-500 text-xs font-bold text-black outline-none"
                />
              </div>

              {/* Autocomplete Dropdown */}
              {searchMemberTerm.trim() && (
                <div className="absolute top-full left-0 right-0 z-30 mt-1 max-h-56 overflow-y-auto bg-white rounded-2xl shadow-xl border border-gray-300 divide-y divide-gray-100">
                  {searchedMembers.length === 0 ? (
                    <div className="p-3 text-xs text-slate-500 text-center">कोई सदस्य नहीं मिला</div>
                  ) : (
                    searchedMembers.map((m) => (
                      <button
                        key={m.uid}
                        type="button"
                        onClick={() => handleSelectMember(m)}
                        className="w-full text-left p-2.5 hover:bg-pink-50 flex items-center justify-between text-xs transition cursor-pointer"
                      >
                        <div>
                          <strong className="text-black font-bold block">{getMemberFullName(m)}</strong>
                          <span className="font-mono text-[11px] text-pink-700 font-semibold">{m.memberId}</span>
                        </div>
                        <span className="font-mono text-[11px] text-slate-500">{m.phone}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Column 2: Quick Dropdown of All Members */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                2. सूची से त्वरित चयन (Quick Select from List)
              </label>
              <select
                value={selectedUser ? (selectedUser.uid || selectedUser.memberId) : ''}
                onChange={(e) => {
                  const found = allUsersList.find(u => u.uid === e.target.value || u.memberId === e.target.value);
                  if (found) handleSelectMember(found);
                }}
                className="w-full px-3 py-2.5 rounded-2xl bg-white border border-gray-300 text-xs font-bold text-black outline-none focus:border-pink-500 cursor-pointer"
              >
                <option value="">-- सदस्य चुनें ({allUsersList.length} कुल सदस्य) --</option>
                {allUsersList.map((m) => (
                  <option key={m.uid} value={m.uid}>
                    {m.memberId} — {getMemberFullName(m)} ({m.phone})
                  </option>
                ))}
              </select>
            </div>

            {/* Column 3: Save Changes to Database Button */}
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleSaveToDatabase}
                disabled={savingDb}
                className="w-full py-2.5 px-4 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-50 cursor-pointer"
              >
                {savingDb ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : saveSuccess ? (
                  <Check className="w-4 h-4 text-emerald-200" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{saveSuccess ? 'डाटा सुरक्षित हो गया!' : 'परिवर्तन प्रोफाइल में सेव करें'}</span>
              </button>
            </div>

          </div>

          {/* EDITABLE FIELDS BAR (Requirement 2.1 & 3) */}
          <div className="pt-2 border-t border-slate-200">
            <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider block mb-2">
              ✏️ प्रशस्ति पत्र लाइव संपादन (Live Customization Inputs):
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
              
              {/* Salutation + Full Name */}
              <div className="col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">पूरा नाम (Member Name)</label>
                <div className="flex gap-1.5">
                  <select
                    value={salutation}
                    onChange={(e) => setSalutation(e.target.value)}
                    className="w-24 px-2 py-1.5 rounded-xl bg-slate-50 border border-gray-300 font-bold text-black text-xs"
                  >
                    <option value="श्री">श्री</option>
                    <option value="श्रीमती">श्रीमती</option>
                    <option value="सुश्री">सुश्री</option>
                    <option value="डॉ.">डॉ.</option>
                    <option value="Mr.">Mr.</option>
                    <option value="Mrs.">Mrs.</option>
                  </select>
                  <input
                    type="text"
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                    placeholder="नाम दर्ज करें"
                    className="flex-1 px-3 py-1.5 rounded-xl bg-slate-50 border border-gray-300 font-bold text-black text-xs focus:bg-white"
                  />
                </div>
              </div>

              {/* Father Name */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">पिता का नाम (Father)</label>
                <input
                  type="text"
                  value={fatherName}
                  onChange={(e) => setFatherName(e.target.value)}
                  placeholder="पिता का नाम"
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-gray-300 font-bold text-black text-xs focus:bg-white"
                />
              </div>

              {/* Mother Name */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">माता का नाम (Mother)</label>
                <input
                  type="text"
                  value={motherName}
                  onChange={(e) => setMotherName(e.target.value)}
                  placeholder="माता का नाम"
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-gray-300 font-bold text-black text-xs focus:bg-white"
                />
              </div>

              {/* Mobile Number */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">मोबाइल नं० (Mobile)</label>
                <input
                  type="tel"
                  value={mobileNo}
                  onChange={(e) => setMobileNo(e.target.value)}
                  placeholder="मोबाइल नंबर"
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-gray-300 font-mono font-bold text-black text-xs focus:bg-white"
                />
              </div>

              {/* Member ID */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">सदस्य ID (Member ID)</label>
                <input
                  type="text"
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                  placeholder="UCWF-2026-XXXX"
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-gray-300 font-mono font-bold text-pink-700 text-xs focus:bg-white"
                />
              </div>

            </div>
          </div>
        </div>

        {/* =========================================================================
            2. ULTRA-PREMIUM ROYAL CERTIFICATE CONTAINER (A4 LANDSCAPE: 297mm x 210mm)
           ========================================================================= */}
        <div className="w-full max-w-full overflow-x-auto touch-pan-x pb-6 flex flex-col items-start sm:items-center">
          <p className="text-[10px] text-amber-800 font-bold sm:hidden mb-2 px-1">
            ⟷ सम्मान पत्र पूरा देखने हेतु स्क्रीन को दाएं-बाएं स्लाइड करें (Swipe to view full certificate)
          </p>
          <div 
            ref={certRef}
            id="royal-prashasti-patra"
            className="w-[840px] h-[594px] relative shadow-2xl rounded-none text-slate-900 select-none flex flex-col justify-between p-6 shrink-0"
            style={{
              boxSizing: 'border-box',
              background: 'radial-gradient(ellipse at center, #ffffff 40%, #fffdf8 70%, #fbf6ea 100%)',
              border: '3px solid #064e3b',
              boxShadow: '0 20px 45px -10px rgba(6, 78, 59, 0.25), inset 0 0 15px rgba(217, 119, 6, 0.1)'
            }}
          >
            {/* INSET ROYAL GOLD FILIGREE BORDER */}
            <div className="absolute inset-2 border-2 border-amber-600/70 pointer-events-none rounded-none" />
            <div className="absolute inset-3 border border-dashed border-amber-500/50 pointer-events-none rounded-none" />
            <div className="absolute inset-4 border border-amber-400/30 pointer-events-none rounded-none" />

            {/* CORNER ORNAMENTAL ACCENTS */}
            <div className="absolute top-4 left-4 w-10 h-10 border-t-2 border-l-2 border-amber-700 pointer-events-none flex items-start justify-start">
              <span className="text-amber-600 text-xs leading-none m-0.5">❖</span>
            </div>
            <div className="absolute top-4 right-4 w-10 h-10 border-t-2 border-r-2 border-amber-700 pointer-events-none flex items-start justify-end">
              <span className="text-amber-600 text-xs leading-none m-0.5">❖</span>
            </div>
            <div className="absolute bottom-4 left-4 w-10 h-10 border-b-2 border-l-2 border-amber-700 pointer-events-none flex items-end justify-start">
              <span className="text-amber-600 text-xs leading-none m-0.5">❖</span>
            </div>
            <div className="absolute bottom-4 right-4 w-10 h-10 border-b-2 border-r-2 border-amber-700 pointer-events-none flex items-end justify-end">
              <span className="text-amber-600 text-xs leading-none m-0.5">❖</span>
            </div>

            {/* WATERMARK BACKGROUND EMBLEM (SUBTLE & BALANCED) */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.035] pointer-events-none">
              <img 
                src="/logo.png" 
                alt="Watermark" 
                crossOrigin="anonymous"
                className="w-56 h-56 object-contain rounded-full"
                onError={(e) => { e.currentTarget.src = '/logo.png'; }}
              />
            </div>

            {/* -------------------------------------------------------------
                SECTION 1: BALANCED ROYAL HEADER WITH LARGE PROMINENT LEFT LOGO
               ------------------------------------------------------------- */}
            <div className="relative z-10 pt-1 px-4">
              <div className="flex items-center justify-between">
                {/* Official Circular Foundation Logo - Prominently on the Left Side */}
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full p-1 bg-white border-3 border-amber-600 shadow-xl flex items-center justify-center shrink-0">
                  <img 
                    src="/logo.png" 
                    alt="Uttam Charitable Welfare Foundation Logo" 
                    crossOrigin="anonymous"
                    className="w-full h-full object-contain rounded-full"
                    style={{
                      imageRendering: '-webkit-optimize-contrast',
                      filter: 'contrast(1.1) brightness(1.02)'
                    }}
                    onError={(e) => { e.currentTarget.src = '/logo.png'; }}
                  />
                </div>

                {/* Centered Foundation Titles & Compliance */}
                <div className="flex-1 text-center px-4 space-y-1">
                  <h2 className="text-2xl sm:text-3xl font-black text-emerald-950 tracking-tight font-serif leading-none">
                    {safeText(FOUNDATION_DETAILS.nameHindi)}
                  </h2>
                  <p className="text-[11px] sm:text-xs font-bold text-amber-900 tracking-wider font-serif uppercase">
                    {safeText(FOUNDATION_DETAILS.nameEnglish)}
                  </p>
                  <p className="text-[10px] sm:text-[11px] font-semibold text-emerald-800 tracking-wider font-serif">
                    &quot;{safeText(FOUNDATION_DETAILS.tagline)}&quot;
                  </p>
                  {/* Govt Registration & Compliance Strip */}
                  <div className="flex items-center justify-center gap-2.5 text-[9px] sm:text-[10px] text-slate-700 font-semibold pt-0.5">
                    <span>पंजीकरण सं० (CIN): <strong className="font-mono text-emerald-950 font-bold">{safeText(FOUNDATION_DETAILS.cin)}</strong> (सेक्शन 8 एक्ट 2013)</span>
                    <span className="text-amber-600 font-bold">•</span>
                    <span>PAN: <strong className="font-mono text-emerald-950 font-bold">{safeText(FOUNDATION_DETAILS.pan)}</strong></span>
                    <span className="text-amber-600 font-bold">•</span>
                    <span>TAN: <strong className="font-mono text-emerald-950 font-bold">{safeText(FOUNDATION_DETAILS.tan)}</strong></span>
                  </div>
                </div>

                {/* Right Placeholder / Medallion for Optical Symmetry */}
                <div className="w-24 h-24 sm:w-28 sm:h-28 flex flex-col items-center justify-center shrink-0 opacity-90">
                  <div className="w-20 h-20 rounded-full border-2 border-amber-600/50 bg-amber-50/40 p-1 flex flex-col items-center justify-center text-center shadow-xs">
                    <Award className="w-7 h-7 text-amber-700 mb-0.5" />
                    <span className="text-[7.5px] font-black text-emerald-950 uppercase tracking-tighter leading-tight font-serif">
                      GOVT REGD<br/>SECTION 8
                    </span>
                  </div>
                </div>
              </div>

              {/* TITLE BANNER */}
              <div className="text-center pt-2">
                <div className="inline-block px-8 py-1 rounded-full bg-gradient-to-r from-amber-700 via-amber-600 to-amber-700 text-white shadow-sm border border-amber-300">
                  <h3 className="text-xs font-black tracking-widest font-serif uppercase">
                    ★ प्रशस्ति एवं सम्मान पत्र • CERTIFICATE OF APPRECIATION ★
                  </h3>
                </div>
              </div>
            </div>

            {/* -------------------------------------------------------------
                SECTION 2: CERTIFICATE BODY WITH NAME, PARENTS & COMPACT CITATION
               ------------------------------------------------------------- */}
            <div className="relative z-10 text-center px-6 space-y-2.5 my-auto">
              
              <p className="text-xs font-serif italic text-slate-700 font-medium">
                यह सम्मान पत्र अत्यंत आदर, गौरव एवं निष्ठापूर्वक प्रदान किया जाता है:
              </p>

              {/* MEMBER FULL NAME */}
              <div className="max-w-lg mx-auto">
                <h1 className="text-3xl font-black text-emerald-950 tracking-wide font-serif leading-none">
                  {safeText(fullDisplayName)}
                </h1>
                <div className="w-48 h-0.5 bg-gradient-to-r from-transparent via-amber-500 to-transparent mx-auto mt-1.5" />
              </div>

              {/* COMPACT DEDICATED MEMBER & FAMILY DETAILS CARD */}
              <div className="py-1.5 px-4 bg-[#fff9ed]/90 rounded-xl border border-amber-300/80 max-w-xl mx-auto shadow-xs text-[10.5px]">
                <div className="grid grid-cols-3 gap-2 text-slate-800 font-sans leading-tight">
                  <div className="text-left">
                    <span className="text-slate-500 font-medium block text-[9.5px]">पिता का नाम:</span>
                    <strong className="text-emerald-950 font-black truncate block">{fatherName ? safeText(fatherName) : '....................'}</strong>
                  </div>
                  <div className="text-center">
                    <span className="text-slate-500 font-medium block text-[9.5px]">माता का नाम:</span>
                    <strong className="text-emerald-950 font-black truncate block">{motherName ? safeText(motherName) : '....................'}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 font-medium block text-[9.5px]">मोबाइल नंबर:</span>
                    <strong className="font-mono text-emerald-950 font-black block">{mobileNo ? safeText(mobileNo) : '....................'}</strong>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-slate-800 font-sans leading-tight pt-1 mt-1 border-t border-amber-200/70">
                  <div className="text-left">
                    <span className="text-slate-500 font-medium text-[9.5px]">सदस्य ID: </span>
                    <strong className="font-mono text-emerald-900 font-black">{safeText(memberId)}</strong>
                  </div>
                  <div className="text-center">
                    <span className="text-slate-500 font-medium text-[9.5px]">पदनाम: </span>
                    <strong className="text-slate-950 font-bold">{safeText(padNaam)}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 font-medium text-[9.5px]">निवास: </span>
                    <strong className="text-slate-950 font-bold truncate inline-block max-w-[120px] align-bottom">{safeText(city)}</strong>
                  </div>
                </div>
              </div>

              {/* PROPORTIONAL CITATION TEXT */}
              <p className="text-[10.5px] text-slate-800 leading-relaxed max-w-xl mx-auto font-serif font-medium text-center">
                संस्था के सामाजिक कल्याण, बाल शिक्षा प्रोत्साहन, निःशुल्क स्वास्थ्य शिविर, महिला सशक्तिकरण एवं राष्ट्र सेवा के पावन संकल्प में आपके अमूल्य सहयोग, सक्रिय सहभागिता एवं उत्कृष्ट समर्पण हेतु। समाज के वंचित एवं जरूरतमंद वर्गों के उत्थान में आपकी यह सेवा भावना अत्यंत वंदनीय एवं प्रेरणादायक है। हम आपके सुखी, समृद्ध एवं उज्ज्वल भविष्य की मंगलकामना करते हैं।
              </p>
            </div>

            {/* -------------------------------------------------------------
                SECTION 3: FOOTER WITH QR CODE, SEAL, AND PRESIDENT SIGNATURE
               ------------------------------------------------------------- */}
            <div className="relative z-10 grid grid-cols-3 items-end px-4 pb-1 pt-2 border-t border-amber-400/80">
              
              {/* Left: Local Vector QR Code & Verification */}
              <div className="flex items-center gap-2.5">
                <div className="p-1 bg-white border border-amber-400 rounded-lg shadow-sm">
                  <SafeQRCode value={verificationUrl} size={52} fgColor="#064e3b" bgColor="#ffffff" />
                </div>
                <div className="text-[9px] text-slate-700 space-y-0.5 text-left">
                  <p className="font-black text-slate-900 leading-tight">डिजिटल सत्यापन</p>
                  <p className="text-[8.5px] text-slate-600">प्रमाणिकता हेतु स्कैन करें</p>
                  <p className="font-mono text-[8.5px] text-emerald-900 font-black">{safeText(memberId)}</p>
                </div>
              </div>

              {/* Center: Issue Date & Medallion */}
              <div className="text-center text-[9.5px] text-slate-700 space-y-0.5">
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100/80 border border-amber-300 text-amber-900 font-bold text-[9px] mb-0.5">
                  <span>★ राष्ट्रीय उत्कृष्ट सेवा सम्मान ★</span>
                </div>
                <p className="font-bold text-slate-900 text-[9.5px]">
                  जारी तिथि: <span className="font-black text-emerald-950">{safeText(issueDate)}</span>
                </p>
                <p className="font-medium text-slate-700 text-[8.5px]">मुख्यालय: {safeText(FOUNDATION_DETAILS.address)}</p>
              </div>

              {/* Right: Authentic Stamp & President Signature */}
              <div className="text-right flex flex-col items-end">
                <div className="relative w-44 h-14 mb-0.5 flex items-center justify-center">
                  <img 
                    src="/signature.png" 
                    alt="Official Signature & Stamp" 
                    crossOrigin="anonymous"
                    className="h-14 object-contain filter contrast-125"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                </div>
                <div className="text-[10px] text-slate-900 border-t border-slate-700 pt-0.5 w-44 text-center leading-tight">
                  <p className="font-black text-slate-950 font-serif text-[11px]">
                    {PRESIDENT_NAME_HINDI}
                  </p>
                  <p className="text-[9px] font-bold text-emerald-950">
                    {PRESIDENT_ROLE_HINDI}
                  </p>
                  <p className="text-[8px] text-slate-600 font-semibold">
                    उत्तम चैरिटेबल वेलफेयर फाउंडेशन
                  </p>
                </div>
              </div>

            </div>

          </div>
        </div>

      </div>
    </div>
  );
}