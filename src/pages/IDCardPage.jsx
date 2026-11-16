import React, { useRef, useState, useEffect, useMemo } from 'react';
import { 
  Download, 
  FileDown, 
  CreditCard, 
  ShieldCheck, 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Loader2,
  Camera,
  CheckCircle2,
  User,
  Search,
  Save,
  Check,
  Edit3,
  Printer
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  FOUNDATION_DETAILS, 
  PRESIDENT_NAME_HINDI, 
  PRESIDENT_ROLE_HINDI, 
  safeText 
} from '../lib/constants';
import { uploadToCloudinary } from '../lib/cloudinary';
import { rtdb } from '../lib/firebase';
import { ref, get, update } from 'firebase/database';
import { getMemberFullName } from '../utils/mlmUtils';
import SafeQRCode from '../components/ui/SafeQRCode';

export default function IDCardPage() {
  const { userProfile, currentUser } = useAuth();
  const { bi } = useLanguage();
  const idCardRef = useRef(null);
  
  const [downloading, setDownloading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [allUsersList, setAllUsersList] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Search & Member Selection State
  const [searchMemberTerm, setSearchMemberTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);

  // Customizable Card Fields
  const [salutation, setSalutation] = useState('श्री');
  const [memberName, setMemberName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [motherName, setMotherName] = useState('');
  const [phone, setPhone] = useState('9540648402');
  const [memberId, setMemberId] = useState('UCWF-2026-MEMBER');
  const [padNaam, setPadNaam] = useState('कार्यकारिणी सदस्य');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [city, setCity] = useState('काशीपुर');
  const [address, setAddress] = useState('काशीपुर (उत्तराखंड)');
  const [userPhoto, setUserPhoto] = useState('');
  const [signatureUrl, setSignatureUrl] = useState('');
  const [issueDate, setIssueDate] = useState(
    new Date().toLocaleDateString('hi-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  );

  const [savingDb, setSavingDb] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // 1. Load users list from RTDB for quick selector (with 8s timeout guard)
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
        console.error('Failed to load users for ID Card:', err);
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

  // 2. Default to active user profile
  useEffect(() => {
    const active = selectedUser || userProfile;
    if (active) {
      setSalutation(active.salutation || 'श्री');
      const cleanName = (active.name || active.displayName || '').replace(/^(श्री|श्रीमती|सुश्री|डॉ\.)\s+/i, '').trim();
      setMemberName(cleanName || 'सम्मानित सदस्य');
      setFatherName(active.fatherName || active.fatherOrSpouseName || '');
      setMotherName(active.motherName || '');
      setPhone(active.phone || '9540648402');
      setMemberId(active.memberId || 'UCWF-2026-MEMBER');
      setPadNaam(active.padNaam || active.designation || 'कार्यकारिणी सदस्य');
      setBloodGroup(active.bloodGroup || 'O+');
      setCity(active.city || 'काशीपुर');
      setAddress(active.address || active.city || 'काशीपुर, उत्तराखंड');
      // Universal photo resolver across all possible RTDB keys
      const resolvedPhoto = 
        active.photoUrl || 
        active.photo || 
        active.profilePhoto || 
        active.photoBase64 || 
        active.avatar || 
        active.image || 
        active.documents?.photo || 
        '';
      setUserPhoto(resolvedPhoto);
      setSignatureUrl(active.signatureUrl || '');
      if (active.createdAt) {
        setIssueDate(
          new Date(active.createdAt).toLocaleDateString('hi-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })
        );
      }
    }
  }, [userProfile, selectedUser]);

  // Autocomplete search filter
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

  const handleSelectMember = (u) => {
    setSelectedUser(u);
    setSearchMemberTerm('');
  };

  // Full Name with clean Salutation
  const fullDisplayName = useMemo(() => {
    const clean = String(memberName || '').trim();
    if (!clean) return 'सम्मानित सदस्य';
    if (salutation && clean.startsWith(salutation)) return clean;
    return `${salutation} ${clean}`.trim();
  }, [salutation, memberName]);

  const verificationUrl = `${window.location.origin}/dashboard?verify=${encodeURIComponent(memberId)}`;

  // Handle Photo Upload (Immediate Base64 + Cloudinary dual save for guaranteed success)
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    const targetUid = selectedUser?.uid || currentUser?.uid;
    if (!file || !targetUid) return;

    setPhotoUploading(true);

    // 1. Instant local preview and guaranteed direct Base64 write to RTDB
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const b64 = ev.target?.result;
      if (b64) {
        setUserPhoto(b64);
        try {
          await update(ref(rtdb, `users/${targetUid}`), {
            photo: b64,
            photoUrl: b64
          });
        } catch (dbErr) {
          console.warn('Direct RTDB photo write error:', dbErr);
        }
      }
    };
    reader.readAsDataURL(file);

    // 2. Cloudinary upload if available
    try {
      const result = await uploadToCloudinary(file, 'member_photos');
      const finalUrl = result.secure_url || result.url;
      if (finalUrl) {
        setUserPhoto(finalUrl);
        await update(ref(rtdb, `users/${targetUid}`), {
          photoUrl: finalUrl,
          photo: finalUrl
        });
      }
    } catch (err) {
      console.warn('Cloudinary upload note (local Base64 already saved):', err);
    } finally {
      setPhotoUploading(false);
    }
  };

  // Save fields directly to Firebase RTDB
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
        phone: phone.trim(),
        padNaam: padNaam.trim(),
        designation: padNaam.trim(),
        bloodGroup: bloodGroup.trim(),
        city: city.trim(),
        address: address.trim()
      });
      setSaveSuccess(true);
      showToast(bi('आई-कार्ड विवरण प्रोफाइल में सुरक्षित हो गया!', 'ID Card details saved to profile!'), 'success');
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save ID Card updates:', err);
      showToast(bi('डाटा सुरक्षित करने में त्रुटि: ', 'Error saving data: ') + err.message, 'error');
    } finally {
      setSavingDb(false);
    }
  };

  // Download HD PNG
  const handleDownloadPNG = async () => {
    if (!idCardRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(idCardRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: false,
        logging: false,
        backgroundColor: '#ffffff'
      });
      const link = document.createElement('a');
      link.download = `UCWF_ID_Card_${memberId || 'MEMBER'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      showToast(bi('HD PNG आई-कार्ड डाउनलोड शुरू हो गया।', 'HD PNG ID Card download started.'), 'success');
    } catch (err) {
      console.error('Failed to export ID Card PNG:', err);
      showToast(bi('PNG डाउनलोड विफल: ', 'PNG download failed: ') + err.message, 'error');
    } finally {
      setDownloading(false);
    }
  };

  // Download Printable PDF
  const handleDownloadPDF = async () => {
    if (!idCardRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(idCardRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: false,
        logging: false,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('portrait', 'mm', 'a4');
      // Place centered on A4: 180mm x 140mm
      pdf.addImage(imgData, 'PNG', 15, 20, 180, 140);
      pdf.save(`UCWF_ID_Card_${memberId || 'MEMBER'}.pdf`);
      showToast(bi('A4 PDF आई-कार्ड डाउनलोड हो गया।', 'A4 PDF ID Card downloaded.'), 'success');
    } catch (err) {
      console.error('Failed to export ID Card PDF:', err);
      showToast(bi('PDF डाउनलोड विफल: ', 'PDF download failed: ') + err.message, 'error');
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
      {/* Zero-Cut A4 Portrait Print Styling */}
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
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* =========================================================================
            1. TOP TOOLBAR & CONTROLS (SEARCH, PHOTO, CUSTOMIZE & DOWNLOAD)
           ========================================================================= */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-md space-y-4 print:hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold mb-1.5">
                <CreditCard className="w-4 h-4 text-emerald-700" />
                <span>डिजिटल राष्ट्रीय पहचान पत्र (Official Digital Identity Card)</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                आधिकारिक आई-कार्ड (Front & Back Printable)
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                धारक: <strong className="text-slate-900 font-bold">{fullDisplayName}</strong> • ID: <strong className="font-mono text-emerald-800 font-black">{memberId}</strong>
              </p>
            </div>

            {/* Actions: Photo, PNG & PDF */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Upload Photo Button */}
              <label className="cursor-pointer px-4 py-2.5 rounded-2xl border border-slate-300 hover:bg-slate-50 text-slate-800 font-bold text-xs flex items-center gap-2 transition shadow-xs">
                {photoUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4 text-emerald-700" />}
                <span>{photoUploading ? 'अपलोड जारी...' : 'फोटो बदलें'}</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handlePhotoUpload} 
                  disabled={photoUploading}
                  className="hidden" 
                />
              </label>

              <button
                type="button"
                onClick={handleDownloadPNG}
                disabled={downloading}
                className="px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 shadow-md transition disabled:opacity-50 cursor-pointer"
              >
                {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                <span>HD PNG</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadPDF}
                disabled={downloading}
                className="px-4 py-2.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-700/20 transition disabled:opacity-50 cursor-pointer"
              >
                {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                <span>{bi('PDF डाउनलोड', 'Download PDF')}</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="px-3.5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-300 flex items-center gap-1.5 transition cursor-pointer"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                <span>{bi('प्रिंट', 'Print')}</span>
              </button>
            </div>
          </div>

          {/* Member Search & Quick Select */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            
            {/* Search Input */}
            <div className="space-y-1.5 relative">
              <label className="block text-xs font-bold text-slate-700">
                1. सदस्य खोजें (Search Member by ID/Name)
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

            {/* Quick Dropdown */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                2. सूची से त्वरित चयन (Quick Select)
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

            {/* Save to Profile Button */}
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

          {/* EDITABLE CARD FIELDS (Requirements 2.1 & 3) */}
          <div className="pt-2 border-t border-slate-200">
            <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider block mb-2">
              ✏️ आई-कार्ड लाइव संपादन (Live Card Fields):
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 text-xs">
              
              {/* Name */}
              <div className="col-span-2">
                <label className="block text-[10.5px] font-bold text-slate-600 mb-1">पूरा नाम (Name)</label>
                <div className="flex gap-1">
                  <select
                    value={salutation}
                    onChange={(e) => setSalutation(e.target.value)}
                    className="w-20 px-1.5 py-1.5 rounded-xl bg-slate-50 border border-gray-300 font-bold text-black text-xs"
                  >
                    <option value="श्री">श्री</option>
                    <option value="श्रीमती">श्रीमती</option>
                    <option value="सुश्री">सुश्री</option>
                    <option value="डॉ.">डॉ.</option>
                  </select>
                  <input
                    type="text"
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                    placeholder="नाम"
                    className="flex-1 px-2.5 py-1.5 rounded-xl bg-slate-50 border border-gray-300 font-bold text-black text-xs focus:bg-white"
                  />
                </div>
              </div>

              {/* Father Name */}
              <div>
                <label className="block text-[10.5px] font-bold text-slate-600 mb-1">पिता का नाम (Father)</label>
                <input
                  type="text"
                  value={fatherName}
                  onChange={(e) => setFatherName(e.target.value)}
                  placeholder="पिता का नाम"
                  className="w-full px-2.5 py-1.5 rounded-xl bg-slate-50 border border-gray-300 font-bold text-black text-xs focus:bg-white"
                />
              </div>

              {/* Mother Name */}
              <div>
                <label className="block text-[10.5px] font-bold text-slate-600 mb-1">माता का नाम (Mother)</label>
                <input
                  type="text"
                  value={motherName}
                  onChange={(e) => setMotherName(e.target.value)}
                  placeholder="माता का नाम"
                  className="w-full px-2.5 py-1.5 rounded-xl bg-slate-50 border border-gray-300 font-bold text-black text-xs focus:bg-white"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-[10.5px] font-bold text-slate-600 mb-1">मोबाइल नं० (Mobile)</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="मोबाइल नंबर"
                  className="w-full px-2.5 py-1.5 rounded-xl bg-slate-50 border border-gray-300 font-mono font-bold text-black text-xs focus:bg-white"
                />
              </div>

              {/* Padnaam */}
              <div>
                <label className="block text-[10.5px] font-bold text-slate-600 mb-1">पदनाम (Designation)</label>
                <input
                  type="text"
                  value={padNaam}
                  onChange={(e) => setPadNaam(e.target.value)}
                  placeholder="कार्यकारिणी सदस्य"
                  className="w-full px-2.5 py-1.5 rounded-xl bg-slate-50 border border-gray-300 font-bold text-black text-xs focus:bg-white"
                />
              </div>

              {/* Blood Group */}
              <div>
                <label className="block text-[10.5px] font-bold text-slate-600 mb-1">रक्त समूह (Blood)</label>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-xl bg-slate-50 border border-gray-300 font-bold text-black text-xs"
                >
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>

              {/* City / Address */}
              <div>
                <label className="block text-[10.5px] font-bold text-slate-600 mb-1">निवास (Address)</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => {
                    setCity(e.target.value);
                    setAddress(e.target.value);
                  }}
                  placeholder="काशीपुर, उत्तराखंड"
                  className="w-full px-2.5 py-1.5 rounded-xl bg-slate-50 border border-gray-300 font-bold text-black text-xs focus:bg-white"
                />
              </div>

            </div>
          </div>
        </div>

        {/* =========================================================================
            2. PRINTABLE CONTAINER: BOTH FRONT AND BACK CARDS (330px x 520px)
           ========================================================================= */}
        <div className="w-full max-w-full overflow-x-auto touch-pan-x pb-6 flex flex-col items-start sm:items-center">
          <p className="text-[10px] text-emerald-800 font-bold sm:hidden mb-2 px-1">
            ⟷ आई-कार्ड (आगे व पीछे) देखने हेतु स्क्रीन को दाएं-बाएं स्लाइड करें (Swipe to view both sides)
          </p>
          <div 
            ref={idCardRef}
            id="official-id-card-element"
            className="w-[780px] bg-stone-100/90 p-5 rounded-3xl flex flex-row items-center justify-center gap-6 shadow-xl shrink-0"
            style={{ boxSizing: 'border-box' }}
          >
            {/* ===================== FRONT SIDE (330px x 520px) ===================== */}
            <div className="w-[330px] h-[520px] bg-white rounded-2xl overflow-hidden border-2 border-emerald-900 shadow-lg flex flex-col justify-between relative select-none shrink-0">
              
              {/* LANYARD HOLE PUNCH SIMULATION */}
              <div className="pt-1.5 pb-0.5 bg-emerald-950 flex justify-center">
                <div className="w-12 h-2.5 rounded-full bg-slate-900/90 border border-emerald-800/80 shadow-inner" />
              </div>

              {/* TOP HEADER */}
              <div className="bg-gradient-to-r from-emerald-950 via-[#0a3828] to-teal-950 text-white px-3 py-2 text-center relative border-b border-amber-400">
                <div className="flex items-center justify-center gap-2.5 mb-1">
                  <div className="w-14 h-14 rounded-full p-1 bg-white border-2 border-amber-400 shadow-md shrink-0 flex items-center justify-center">
                    <img 
                      src="/logo.png" 
                      alt="Logo" 
                      crossOrigin="anonymous"
                      className="w-full h-full object-contain rounded-full"
                      style={{
                        imageRendering: '-webkit-optimize-contrast',
                        filter: 'contrast(1.1)'
                      }}
                      onError={(e) => { e.currentTarget.src = '/logo.png'; }}
                    />
                  </div>
                  <div className="text-left">
                    <h3 className="font-black text-[13px] leading-tight text-white font-serif">
                      उत्तम चैरिटेबल वेलफेयर फाउंडेशन
                    </h3>
                    <p className="text-[8px] text-amber-300 font-bold uppercase tracking-wider font-sans">
                      UTTAM CHARITABLE WELFARE FOUNDATION
                    </p>
                  </div>
                </div>

                <div className="text-[7.5px] text-emerald-200 flex items-center justify-center gap-2 font-mono">
                  <span>CIN: {safeText(FOUNDATION_DETAILS.cin)}</span>
                  <span>•</span>
                  <span>Regd. Sec-8 Act 2013</span>
                </div>
              </div>

              {/* CARD TITLE STRIP */}
              <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 py-0.5 text-center font-black text-[9.5px] tracking-wider uppercase border-y border-amber-600 shadow-xs">
                ★ राष्ट्रीय पहचान पत्र • OFFICIAL IDENTITY CARD ★
              </div>

              {/* PHOTO, SMART CHIP & DETAILS BODY */}
              <div className="px-3 py-2 flex flex-col items-center flex-1 justify-between text-center relative">
                
                {/* WATERMARK EMBLEM */}
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.035] pointer-events-none">
                  <img 
                    src="/logo.png" 
                    alt="Watermark" 
                    crossOrigin="anonymous"
                    className="w-40 h-40 object-contain rounded-full"
                    onError={(e) => { e.currentTarget.src = '/logo.png'; }}
                  />
                </div>

                {/* Photo Row with Smart Chip Simulation */}
                <div className="w-full flex items-center justify-between px-2 pt-0.5 relative z-10">
                  {/* Simulated Gold Smart-Chip */}
                  <div className="w-8 h-6 rounded bg-gradient-to-br from-amber-300 via-yellow-200 to-amber-400 border border-amber-600 shadow-xs flex flex-col justify-around p-0.5">
                    <div className="w-full h-px bg-amber-700/60" />
                    <div className="w-full h-px bg-amber-700/60" />
                  </div>

                  {/* Member Photo Frame */}
                  <div className="w-20 h-24 rounded-xl border-2 border-emerald-700 overflow-hidden shadow-md bg-slate-50 flex items-center justify-center relative">
                    {userPhoto ? (
                      <img 
                        src={userPhoto} 
                        alt={safeText(fullDisplayName)} 
                        crossOrigin="anonymous"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-10 h-10 text-slate-400" />
                    )}
                  </div>

                  {/* ID Tag Pill */}
                  <div className="text-right">
                    <span className="text-[7.5px] font-mono text-slate-500 block">CARD NO:</span>
                    <strong className="text-[9px] font-mono text-emerald-950 font-black block">{safeText(memberId).slice(-6)}</strong>
                  </div>
                </div>

                {/* Member Name & ID */}
                <div className="space-y-0.5 relative z-10 pt-1">
                  <h2 className="text-[14px] font-black text-slate-950 leading-tight">
                    {safeText(fullDisplayName)}
                  </h2>
                  <div className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-900 text-amber-200 text-[9px] font-extrabold shadow-xs">
                    {safeText(padNaam)}
                  </div>
                  <div>
                    <span className="text-[9.5px] font-mono font-black text-emerald-950 bg-emerald-50 px-2 py-0.2 rounded border border-emerald-300 inline-block">
                      ID: {safeText(memberId)}
                    </span>
                  </div>
                </div>

                {/* Personal Information Micro-Table (All Critical Fields) */}
                <div className="w-full text-[8.5px] text-left bg-slate-50/90 rounded-lg p-1.5 border border-slate-200/90 space-y-0.5 relative z-10">
                  
                  {/* Father's Name */}
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-semibold">पिता का नाम:</span>
                    <strong className="text-slate-950 font-bold truncate max-w-[170px] text-right">
                      {fatherName ? safeText(fatherName) : '-'}
                    </strong>
                  </div>

                  {/* Mother's Name */}
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-semibold">माता का नाम:</span>
                    <strong className="text-slate-950 font-bold truncate max-w-[170px] text-right">
                      {motherName ? safeText(motherName) : '-'}
                    </strong>
                  </div>

                  {/* Mobile No. */}
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-semibold">मोबाइल:</span>
                    <strong className="text-slate-950 font-mono font-bold">{safeText(phone)}</strong>
                  </div>

                  {/* Blood Group */}
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-semibold">रक्त समूह (Blood):</span>
                    <span className="text-rose-700 font-black px-1 rounded bg-rose-50 border border-rose-200">{safeText(bloodGroup)}</span>
                  </div>

                  {/* Address / City */}
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-semibold">निवास (City):</span>
                    <strong className="text-slate-950 font-bold truncate max-w-[160px] text-right">
                      {safeText(city || address)}
                    </strong>
                  </div>

                  {/* Valid From */}
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-semibold">जारी तिथि:</span>
                    <strong className="text-slate-950 font-bold">{safeText(issueDate)}</strong>
                  </div>

                </div>

                {/* Rainbow Metallic Hologram Shimmer Ribbon */}
                <div className="w-full h-1 rounded-full bg-gradient-to-r from-teal-400 via-amber-300 via-pink-400 to-blue-400 opacity-70 my-0.5" />

              </div>

              {/* FOOTER WITH MEMBER SIGNATURE & OFFICIAL PRESIDENT STAMP */}
              <div className="bg-slate-100 border-t border-slate-300 px-3 py-1 flex items-center justify-between">
                {/* Member's Signature */}
                <div className="flex flex-col items-center">
                  <div className="h-6 w-16 flex items-center justify-center overflow-hidden">
                    {signatureUrl ? (
                      <img 
                        src={signatureUrl} 
                        alt="Member Signature" 
                        crossOrigin="anonymous"
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <span className="text-[7px] text-slate-400 italic">हस्ताक्षर धारक</span>
                    )}
                  </div>
                  <p className="text-[7px] font-bold text-slate-700 border-t border-slate-300 pt-0.2 text-center w-16">
                    धारक हस्ताक्षर
                  </p>
                </div>

                {/* President Stamp & Signature */}
                <div className="flex flex-col items-center">
                  <div className="h-6 flex items-center justify-center">
                    <img 
                      src="/signature.png" 
                      alt="President Seal" 
                      crossOrigin="anonymous"
                      className="h-6 object-contain filter contrast-125"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  </div>
                  <p className="text-[6.5px] font-black text-slate-950 border-t border-slate-300 pt-0.2 text-center whitespace-nowrap">
                    {PRESIDENT_NAME_HINDI} ({PRESIDENT_ROLE_HINDI})
                  </p>
                </div>
              </div>

            </div>

            {/* ===================== BACK SIDE (330px x 520px) ===================== */}
            <div className="w-[330px] h-[520px] bg-white rounded-2xl overflow-hidden border-2 border-emerald-900 shadow-lg flex flex-col justify-between relative select-none shrink-0">
              
              {/* LANYARD HOLE PUNCH SIMULATION */}
              <div className="pt-1.5 pb-0.5 bg-emerald-950 flex justify-center">
                <div className="w-12 h-2.5 rounded-full bg-slate-900/90 border border-emerald-800/80 shadow-inner" />
              </div>

              {/* TOP STRIP */}
              <div className="bg-gradient-to-r from-emerald-950 to-teal-950 text-white py-1.5 text-center text-[9px] font-bold uppercase tracking-wider border-b border-amber-400">
                नियम, शर्तें एवं निर्देश (Terms & Instructions)
              </div>

              {/* CONTENT BODY */}
              <div className="p-3 flex-1 flex flex-col justify-between text-[8px] text-slate-700 space-y-1.5">
                
                {/* Guidelines */}
                <div className="space-y-1 leading-tight bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <p className="flex items-start gap-1">
                    <span className="text-emerald-700 font-bold">•</span>
                    <span>यह पहचान पत्र उत्तम चैरिटेबल वेलफेयर फाउंडेशन की वैधानिक संपत्ति है।</span>
                  </p>
                  <p className="flex items-start gap-1">
                    <span className="text-emerald-700 font-bold">•</span>
                    <span>यह कार्ड धारक को समाज सेवा, बाल शिक्षा व राहत कार्यों में सहयोग का अधिकार देता है।</span>
                  </p>
                  <p className="flex items-start gap-1">
                    <span className="text-emerald-700 font-bold">•</span>
                    <span>खो जाने की स्थिति में तत्काल फाउंडेशन मुख्यालय अथवा नजदीकी पुलिस स्टेशन में सूचित करें।</span>
                  </p>
                  <p className="flex items-start gap-1">
                    <span className="text-emerald-700 font-bold">•</span>
                    <span>इस कार्ड का किसी भी प्रकार का अनधिकृत या गलत उपयोग कानूनी अपराध माना जाएगा।</span>
                  </p>
                </div>

                {/* QR Code Verification Section (Local SVG Vector QR) */}
                <div className="p-2 bg-emerald-50/50 rounded-xl border border-emerald-200 flex items-center justify-center gap-3">
                  <div className="bg-white p-1 rounded-lg border border-slate-200 shadow-xs shrink-0">
                    <SafeQRCode value={verificationUrl} size={56} fgColor="#064e3b" bgColor="#ffffff" />
                  </div>
                  <div className="text-[8px] text-slate-700 text-left space-y-0.5">
                    <p className="font-bold text-slate-900 leading-tight">डिजिटल ऑनलाइन सत्यापन</p>
                    <p className="text-slate-500">स्कैन कर कार्ड की वैधता जांचें</p>
                    <p className="font-mono text-emerald-900 font-black">{safeText(memberId)}</p>
                  </div>
                </div>

                {/* Foundation Headquarters Contact */}
                <div className="border-t border-slate-200 pt-1.5 space-y-0.5 text-[8px]">
                  <p className="font-bold text-slate-900">मुख्यालय पता (Headquarters):</p>
                  <p className="text-slate-800 leading-tight">
                    {safeText(FOUNDATION_DETAILS.address)}
                  </p>
                  <p className="text-slate-800">
                    हेल्पलाइन: <strong className="font-mono">{safeText(FOUNDATION_DETAILS.phone)}</strong>
                  </p>
                  <p className="text-slate-800">
                    ईमेल: <span className="font-mono">{safeText(FOUNDATION_DETAILS.email)}</span>
                  </p>
                  <div className="pt-0.5 text-[7px] text-slate-500 flex justify-between font-mono font-bold">
                    <span>PAN: {safeText(FOUNDATION_DETAILS.pan)}</span>
                    <span>TAN: {safeText(FOUNDATION_DETAILS.tan)}</span>
                  </div>
                </div>

              </div>

              {/* BOTTOM RETURN NOTICE */}
              <div className="bg-emerald-900 text-white py-1 text-center text-[7.5px] font-semibold">
                यदि यह कार्ड मिले तो कृपया फाउंडेशन मुख्यालय को वापस लौटाएं।
              </div>

            </div>

          </div>
        </div>

      </div>
    </div>
  );
}