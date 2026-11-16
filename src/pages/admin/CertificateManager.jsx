import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Award,
  Plus,
  Search,
  Eye,
  Trash2,
  CheckCircle,
  XCircle,
  RefreshCw,
  Sparkles,
  Download,
  Calendar,
  User,
  Shield,
  Printer,
  ChevronRight,
  Check,
  X,
  Upload,
  Settings,
  Image,
  FileText,
  MapPin,
  PenTool,
} from 'lucide-react';
import AdminLayout from './AdminLayout';
import RoyalCertificate from '../../components/RoyalCertificate';
import { supabase } from '../../lib/supabase';
import { db, ref, onValue, set, remove, get } from '../../lib/firebase';
import {
  FOUNDATION_NAME,
  FOUNDATION_NAME_HINDI,
  CONTACT_INFO,
  PRESIDENT_NAME,
  PRESIDENT_NAME_HINDI,
  PRESIDENT_ROLE,
  PRESIDENT_ROLE_HINDI,
} from '../../lib/constants';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { generateCertificatePNG, generateCertificatePDF, downloadBlob } from '../../utils/certificate-generator';
import {
  PRESIDENT_STAMP_SIGNATURE_BASE64,
  PRESIDENT_STAMP_SIGNATURE_URL,
} from '../../lib/signature-asset';

export default function CertificateManager() {
  const [activeTab, setActiveTab] = useState('certificates'); // 'certificates' | 'issue' | 'signature'
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // President Signature in Firebase RTDB
  const [presidentSignature, setPresidentSignature] = useState(PRESIDENT_STAMP_SIGNATURE_BASE64);
  const [presidentName, setPresidentName] = useState(PRESIDENT_NAME || 'Dr. Rajendra Singh Saini');
  const [savingSignature, setSavingSignature] = useState(false);

  // Issue Certificate Modal / Form state
  const [mode, setMode] = useState('existing'); // 'existing' | 'custom'
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  const [searchedMembers, setSearchedMembers] = useState([]);
  const [searchingMembers, setSearchingMembers] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  // Form Fields
  const [formData, setFormData] = useState({
    salutation: 'श्री',
    member_name: '',
    father_spouse_name: '',
    mother_name: '',
    phone: '',
    designation: '',
    member_id: '',
    city: 'Kashipur, Uttarakhand',
    category: 'उत्कृष्ट समाज सेवा एवं फाउंडेशन सहयोग सम्मान',
    title: 'Certificate of Appreciation',
    title_hindi: 'प्रशस्ति एवं सम्मान पत्र',
    issue_date: new Date().toISOString().split('T')[0],
    certificate_number: '',
    citation_hi:
      'यह प्रमाणित किया जाता है कि आपने उत्तम चैरिटेबल वेलफेयर फाउंडेशन के सामाजिक कल्याण, जन-सेवा एवं राष्ट्र निर्माण के कार्यों में अपना अमूल्य योगदान दिया है। फाउंडेशन आपके उज्ज्वल भविष्य की कामना करता है।',
    citation_en:
      'This is to certify that you have made an invaluable contribution to the social welfare, community service, and nation-building initiatives of Uttam Charitable Welfare Foundation. The Foundation wishes you a bright and prosperous future.',
    photo_url: '',
  });

  const [showPhotoInPreview, setShowPhotoInPreview] = useState(true);
  const [previewLanguage, setPreviewLanguage] = useState('bilingual');

  // Preview & Download Modal
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewCertData, setPreviewCertData] = useState(null);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [downloadingPNG, setDownloadingPNG] = useState(false);

  // Delete modal
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    cert: null,
    deleting: false,
  });

  const [feedbackToast, setFeedbackToast] = useState(null);

  // Refs for capturing
  const previewRef = useRef(null);
  const livePreviewRef = useRef(null);
  const signatureInputRef = useRef(null);

  const showToast = (message, type = 'success') => {
    setFeedbackToast({ message, type });
    setTimeout(() => setFeedbackToast(null), 4000);
  };

  // Generate sequence number: UCWF-CERT-2026-XXXX
  const generateCertNumber = () => {
    const year = new Date().getFullYear();
    const randomSeq = Math.floor(1000 + Math.random() * 9000);
    return `UCWF-CERT-${year}-${randomSeq}`;
  };

  // Listen to President Signature from Firebase RTDB
  useEffect(() => {
    try {
      const sigRef = ref(db, 'settings/president_signature');
      const nameRef = ref(db, 'settings/president_name');

      const unsubSig = onValue(sigRef, (snapshot) => {
        if (snapshot.exists() && snapshot.val()) {
          setPresidentSignature(snapshot.val());
        }
      });

      const unsubName = onValue(nameRef, (snapshot) => {
        if (snapshot.exists() && snapshot.val()) {
          setPresidentName(snapshot.val());
        }
      });

      return () => {
        unsubSig();
        unsubName();
      };
    } catch (e) {
      console.warn('Firebase signature listener note:', e);
    }
  }, []);

  // Fetch all certificates from Firebase RTDB and Supabase
  const fetchAllCertificates = useCallback(async () => {
    setLoading(true);
    const certList = [];

    // 1. Fetch from Firebase Realtime Database /certificates
    try {
      const fbRef = ref(db, 'certificates');
      const snapshot = await get(fbRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        Object.keys(data).forEach((key) => {
          certList.push({
            id: key,
            ...data[key],
            source: 'firebase',
          });
        });
      }
    } catch (fbErr) {
      console.warn('Firebase certificates fetch error:', fbErr);
    }

    // 2. Fetch from Supabase certificates
    try {
      const { data: supaCerts, error: supaErr } = await supabase
        .from('certificates')
        .select('*')
        .order('created_at', { ascending: false });

      if (!supaErr && supaCerts) {
        supaCerts.forEach((sc) => {
          if (!certList.some((c) => c.id === sc.id || c.certificate_number === sc.certificate_number)) {
            certList.push({
              id: sc.id,
              ...sc,
              source: 'supabase',
            });
          }
        });
      }
    } catch (supaErr) {
      console.warn('Supabase certificates fetch error:', supaErr);
    }

    setCertificates(certList);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchAllCertificates();
  }, [fetchAllCertificates]);

  // Search members autocomplete (searches Firebase RTDB /users first + Supabase)
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!memberSearchTerm.trim() || selectedMember) {
        setSearchedMembers([]);
        return;
      }

      setSearchingMembers(true);
      try {
        const term = memberSearchTerm.trim().toLowerCase();
        const results = [];

        // 1. Search live Firebase RTDB /users
        try {
          const snap = await get(ref(db, 'users'));
          if (snap.exists()) {
            const users = snap.val();
            Object.entries(users).forEach(([uid, u]) => {
              if (!u) return;
              const name = String(u.name || u.fullName || '').toLowerCase();
              const memId = String(u.memberId || '').toLowerCase();
              const phone = String(u.phone || '').toLowerCase();
              if (name.includes(term) || memId.includes(term) || phone.includes(term)) {
                results.push({
                  id: uid,
                  full_name: u.name || u.fullName || 'Member',
                  member_id: u.memberId || '',
                  phone: u.phone || '',
                  father_name: u.fatherName || u.fatherOrSpouseName || '',
                  mother_name: u.motherName || '',
                  designation: u.padNaam || u.designation || '',
                  address: u.city || u.address || 'Kashipur, Uttarakhand',
                  photo_url: u.photoUrl || '',
                  gender: u.gender || '',
                });
              }
            });
          }
        } catch (fbErr) {
          console.warn('Firebase RTDB user search:', fbErr);
        }

        // 2. Also search Supabase if needed
        if (results.length < 5) {
          try {
            const { data } = await supabase
              .from('members')
              .select('id, full_name, member_id, phone, email, address, photo_url, avatar_url, package_name, gender')
              .or(`full_name.ilike.%${term}%,member_id.ilike.%${term}%,phone.ilike.%${term}%`)
              .limit(8);
            if (data && data.length > 0) {
              data.forEach((mem) => {
                if (!results.some((r) => r.member_id === mem.member_id)) {
                  results.push({
                    id: mem.id,
                    full_name: mem.full_name,
                    member_id: mem.member_id,
                    phone: mem.phone,
                    father_name: '',
                    mother_name: '',
                    designation: '',
                    address: mem.address,
                    photo_url: mem.photo_url || mem.avatar_url,
                    gender: mem.gender,
                  });
                }
              });
            }
          } catch (_) {}
        }

        setSearchedMembers(results.slice(0, 8));
      } catch (err) {
        console.error('Member search error:', err);
      } finally {
        setSearchingMembers(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [memberSearchTerm, selectedMember]);

  // Select Member from Search
  const handleSelectMember = (mem) => {
    setSelectedMember(mem);
    const cleanName = (mem.full_name || '')
      .replace(/^(श्री\s*\/?\s*श्रीमती|श्री\/श्रीमती|श्री|श्रीमती|Shri\s*\/?\s*Smt\.?|Shri|Smt\.?|Mr\.?|Mrs\.?|Ms\.?)\s+/i, '')
      .trim();
    const detectedSalutation = mem.gender === 'female' ? 'श्रीमती' : 'श्री';

    setMemberSearchTerm(`${cleanName} (${mem.member_id || mem.id?.substring(0, 8)})`);
    setSearchedMembers([]);

    setFormData((prev) => ({
      ...prev,
      salutation: detectedSalutation,
      member_name: cleanName,
      father_spouse_name: mem.father_name || prev.father_spouse_name || '',
      mother_name: mem.mother_name || prev.mother_name || '',
      phone: mem.phone || prev.phone || '',
      designation: mem.designation || prev.designation || '',
      member_id: mem.member_id || (mem.id ? `UCWF-2026-${mem.id.substring(0, 4)}` : prev.member_id),
      city: mem.address || 'Kashipur, Uttarakhand',
      photo_url: mem.photo_url || mem.avatar_url || '',
      certificate_number: generateCertNumber(),
    }));
  };

  // Open Issue Tab / Reset Form
  const handleOpenIssue = () => {
    setActiveTab('issue');
    setSelectedMember(null);
    setMemberSearchTerm('');
    setFormData({
      salutation: 'श्री',
      member_name: '',
      father_spouse_name: '',
      mother_name: '',
      phone: '',
      designation: '',
      member_id: `UCWF-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      city: 'Kashipur, Uttarakhand',
      category: 'उत्कृष्ट समाज सेवा एवं फाउंडेशन सहयोग सम्मान',
      title: 'Certificate of Appreciation',
      title_hindi: 'प्रशस्ति एवं सम्मान पत्र',
      issue_date: new Date().toISOString().split('T')[0],
      certificate_number: generateCertNumber(),
      citation_hi:
        'यह प्रमाणित किया जाता है कि आपने उत्तम चैरिटेबल वेलफेयर फाउंडेशन के सामाजिक कल्याण, जन-सेवा एवं राष्ट्र निर्माण के कार्यों में अपना अमूल्य योगदान दिया है। फाउंडेशन आपके उज्ज्वल भविष्य की कामना करता है।',
      citation_en:
        'This is to certify that you have made an invaluable contribution to the social welfare, community service, and nation-building initiatives of Uttam Charitable Welfare Foundation. The Foundation wishes you a bright and prosperous future.',
      photo_url: '',
    });
  };

  // Issue Certificate & Save to Firebase RTDB + Supabase
  const handleIssueCertificate = async (e) => {
    if (e) e.preventDefault();

    if (!formData.member_name.trim()) {
      showToast('Recipient Full Name is required', 'error');
      return;
    }

    const certId = `cert_${Date.now()}`;
    const certNum = formData.certificate_number.trim() || generateCertNumber();

    const certPayload = {
      id: certId,
      certificate_number: certNum,
      salutation: formData.salutation || 'श्री',
      member_name: formData.member_name.trim(),
      father_spouse_name: formData.father_spouse_name.trim(),
      father_name: formData.father_spouse_name.trim(),
      mother_name: (formData.mother_name || '').trim(),
      phone: (formData.phone || '').trim(),
      designation: (formData.designation || '').trim(),
      member_id: formData.member_id.trim() || 'UCWF-HONORARY',
      city: formData.city.trim() || 'Kashipur, Uttarakhand',
      category: formData.category.trim(),
      title: formData.title.trim() || 'Certificate of Appreciation',
      title_hindi: formData.title_hindi.trim() || 'प्रशस्ति एवं सम्मान पत्र',
      citation_hi: formData.citation_hi.trim(),
      citation_en: formData.citation_en.trim(),
      issue_date: formData.issue_date,
      photo_url: formData.photo_url || null,
      created_at: new Date().toISOString(),
      created_by: 'Super Admin',
    };

    try {
      // 1. Save to Firebase Realtime Database path: /certificates/{certId}
      await set(ref(db, `certificates/${certId}`), certPayload);

      // 2. Also save to Supabase
      try {
        await supabase.from('certificates').insert([
          {
            member_id: selectedMember?.id || certId,
            certificate_number: certNum,
            title: certPayload.title,
            title_hindi: certPayload.title_hindi,
            description: certPayload.citation_en,
            description_hindi: certPayload.citation_hi,
            awarded_by: 'Uttam Charitable Welfare Foundation Board of Trustees',
            created_at: new Date().toISOString(),
          },
        ]);
      } catch (supaErr) {
        console.warn('Supabase cert mirror note:', supaErr);
      }

      showToast(`Puraskar Certificate issued to ${certPayload.salutation} ${certPayload.member_name} successfully!`, 'success');
      fetchAllCertificates();

      // Open preview modal so admin can immediately download or inspect
      setPreviewCertData({
        ...certPayload,
        president_signature: presidentSignature,
      });
      setPreviewModalOpen(true);
      setActiveTab('certificates');
    } catch (err) {
      console.error('Error issuing certificate:', err);
      showToast(err.message || 'Error saving certificate', 'error');
    }
  };

  // Upload President Signature
  const handleSignatureUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast('Signature file size should be less than 2MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (uploadEvent) => {
      const base64Data = uploadEvent.target.result;
      setSavingSignature(true);
      try {
        await set(ref(db, 'settings/president_signature'), base64Data);
        await set(ref(db, 'settings/president_name'), presidentName);
        setPresidentSignature(base64Data);
        showToast('President signature uploaded and updated across all certificates & ID cards!', 'success');
      } catch (err) {
        console.error('Failed to save signature:', err);
        showToast('Failed to save signature to database', 'error');
      } finally {
        setSavingSignature(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Clear / Reset Signature
  const handleClearSignature = async () => {
    try {
      await remove(ref(db, 'settings/president_signature'));
      setPresidentSignature(PRESIDENT_STAMP_SIGNATURE_BASE64);
      showToast('President signature reset to official transparent blue stamp & signature.');
    } catch (err) {
      showToast('Error resetting signature', 'error');
    }
  };

  // Delete / Revoke Certificate
  const handleDeleteCertificate = async () => {
    const certToDelete = deleteModal.cert;
    if (!certToDelete) return;

    setDeleteModal((prev) => ({ ...prev, deleting: true }));

    try {
      // 1. Delete from Firebase RTDB
      await remove(ref(db, `certificates/${certToDelete.id}`));

      // 2. Delete from Supabase
      try {
        await supabase.from('certificates').delete().eq('id', certToDelete.id);
      } catch (e) {
        console.log('Supabase delete mirror note:', e);
      }

      showToast('Certificate revoked and deleted permanently.');
      setDeleteModal({ isOpen: false, cert: null, deleting: false });
      fetchAllCertificates();
    } catch (err) {
      console.error('Failed to delete certificate:', err);
      showToast('Error deleting certificate', 'error');
      setDeleteModal((prev) => ({ ...prev, deleting: false }));
    }
  };

  // Filtered Certificates
  const filteredCertificates = certificates.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (c.member_name && c.member_name.toLowerCase().includes(q)) ||
      (c.certificate_number && c.certificate_number.toLowerCase().includes(q)) ||
      (c.category && c.category.toLowerCase().includes(q)) ||
      (c.city && c.city.toLowerCase().includes(q))
    );
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Toast Feedback */}
        <AnimatePresence>
          {feedbackToast && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`fixed top-4 right-4 z-[9999] p-4 rounded-2xl shadow-xl flex items-center gap-3 text-sm font-semibold max-w-md ${
                feedbackToast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
              }`}
            >
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span>{feedbackToast.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Award className="w-6 h-6 text-amber-500" />
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Puraskar Certificate Generator & Ledger
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              प्रशस्ति एवं सम्मान पत्र मॉड्यूल • Issue, customize, and export royal print-ready certificates
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchAllCertificates}
              className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors shadow-2xs"
              title="Refresh list"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              onClick={handleOpenIssue}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-sm flex items-center gap-2 transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Issue New Certificate</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 space-x-6 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('certificates')}
            className={`pb-3 relative transition-colors ${
              activeTab === 'certificates' ? 'text-emerald-700' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <span>Issued Certificates ({certificates.length})</span>
            {activeTab === 'certificates' && (
              <motion.div layoutId="certTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />
            )}
          </button>

          <button
            type="button"
            onClick={handleOpenIssue}
            className={`pb-3 relative transition-colors ${
              activeTab === 'issue' ? 'text-emerald-700' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <span>Custom Generator & Preview</span>
            {activeTab === 'issue' && (
              <motion.div layoutId="certTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('signature')}
            className={`pb-3 relative transition-colors ${
              activeTab === 'signature' ? 'text-emerald-700' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <span>President Signature & Stamp</span>
            {activeTab === 'signature' && (
              <motion.div layoutId="certTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />
            )}
          </button>
        </div>

        {/* =====================================================================
            TAB 1: ISSUED CERTIFICATES LIST
           ===================================================================== */}
        {activeTab === 'certificates' && (
          <div className="space-y-4">
            {/* Search Box */}
            <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-2xs flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400 ml-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by recipient name, serial number, city or award category..."
                className="w-full text-xs bg-transparent outline-none text-slate-800 placeholder-slate-400"
              />
            </div>

            {loading ? (
              <div className="py-20 text-center bg-white rounded-3xl border border-slate-200">
                <LoadingSpinner size="lg" />
                <p className="text-xs text-slate-500 mt-2">Loading certificates...</p>
              </div>
            ) : filteredCertificates.length === 0 ? (
              <div className="py-16 text-center bg-white rounded-3xl border border-slate-200 p-6">
                <Award className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <h3 className="text-base font-bold text-slate-900">No Certificates Found</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  No issued certificates match your filter. Click "Issue New Certificate" to award a Puraskar letter.
                </p>
                <button
                  onClick={handleOpenIssue}
                  className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Generate First Certificate
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCertificates.map((cert) => (
                  <div
                    key={cert.id}
                    className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {cert.certificate_number}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {cert.issue_date || cert.created_at?.split('T')[0]}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 leading-snug">
                        {cert.salutation ? `${cert.salutation} ` : ''}{cert.member_name}
                      </h4>
                      <p className="text-xs text-amber-700 font-semibold mt-0.5">
                        {cert.category || cert.title}
                      </p>

                      <div className="mt-2 text-[11px] text-slate-500 space-y-0.5">
                        {cert.member_id && <div>ID: {cert.member_id}</div>}
                        {cert.city && <div>City: {cert.city}</div>}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewCertData({
                            ...cert,
                            president_signature: presidentSignature,
                          });
                          setPreviewModalOpen(true);
                        }}
                        className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View / Download</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteModal({ isOpen: true, cert, deleting: false })}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Revoke Certificate"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            TAB 2: CUSTOM GENERATOR & LIVE PREVIEW
           ===================================================================== */}
        {activeTab === 'issue' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 5 Columns: Generation Form */}
            <div className="lg:col-span-5 bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-bold text-slate-900">Certificate Details</h3>
                </div>

                {/* Mode Switcher: Existing Member vs Custom Recipient */}
                <div className="flex bg-slate-100 p-0.5 rounded-xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setMode('existing')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      mode === 'existing' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    Member
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('custom');
                      setSelectedMember(null);
                    }}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      mode === 'custom' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    Custom Recipient
                  </button>
                </div>
              </div>

              {/* Member Search if Existing Member mode */}
              {mode === 'existing' && (
                <div className="relative">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Search Registered Member
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={memberSearchTerm}
                      onChange={(e) => {
                        setMemberSearchTerm(e.target.value);
                        setSelectedMember(null);
                      }}
                      placeholder="Type name, phone or member ID..."
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-600 text-slate-800"
                    />
                  </div>

                  {/* Autocomplete Dropdown */}
                  {searchedMembers.length > 0 && !selectedMember && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto divide-y divide-slate-100">
                      {searchedMembers.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => handleSelectMember(m)}
                          className="w-full p-2.5 text-left hover:bg-emerald-50 flex items-center justify-between text-xs"
                        >
                          <div>
                            <p className="font-bold text-slate-900">{m.full_name}</p>
                            <p className="text-[10px] text-slate-500">{m.phone} • {m.member_id || 'ID Pending'}</p>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                            {m.package_name || 'Member'}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Form Input Fields */}
              <form onSubmit={handleIssueCertificate} className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Salutation *
                    </label>
                    <select
                      value={formData.salutation || 'श्री'}
                      onChange={(e) => setFormData({ ...formData, salutation: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-600 text-slate-800 font-bold"
                    >
                      <option value="श्री">श्री (Shri)</option>
                      <option value="श्रीमती">श्रीमती (Smt)</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Recipient Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.member_name}
                      onChange={(e) => setFormData({ ...formData, member_name: e.target.value })}
                      placeholder="e.g. Ramesh Chandra Sharma"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-600 text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Father / Spouse Name (पिता / पति का नाम)
                    </label>
                    <input
                      type="text"
                      value={formData.father_spouse_name}
                      onChange={(e) => setFormData({ ...formData, father_spouse_name: e.target.value })}
                      placeholder="e.g. Shri Om Prakash"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-600 text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Mother's Name (माता का नाम)
                    </label>
                    <input
                      type="text"
                      value={formData.mother_name || ''}
                      onChange={(e) => setFormData({ ...formData, mother_name: e.target.value })}
                      placeholder="e.g. Smt. Maya Devi"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-600 text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Member / Recipient ID
                    </label>
                    <input
                      type="text"
                      value={formData.member_id}
                      onChange={(e) => setFormData({ ...formData, member_id: e.target.value })}
                      placeholder="e.g. UCWF-2026-8910"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-600 text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Mobile Number (मोबाइल नं०)
                    </label>
                    <input
                      type="text"
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="e.g. 9540648402"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-600 text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Designation (पद का नाम)
                    </label>
                    <input
                      type="text"
                      value={formData.designation || ''}
                      onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                      placeholder="e.g. समाज सेवी"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-600 text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      City / District *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="e.g. Kashipur, Uttarakhand"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-600 text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Issue Date
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.issue_date}
                      onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-600 text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Award Category / Title *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-600 text-slate-800 font-semibold"
                  >
                    <option value="उत्कृष्ट समाज सेवा एवं फाउंडेशन सहयोग सम्मान">उत्कृष्ट समाज सेवा एवं फाउंडेशन सहयोग सम्मान</option>
                    <option value="समाज सेवा रत्न सम्मान (Samaj Seva Ratna)">समाज सेवा रत्न सम्मान (Samaj Seva Ratna)</option>
                    <option value="आजीवन प्रेरणा एवं जन-कल्याण सम्मान">आजीवन प्रेरणा एवं जन-कल्याण सम्मान</option>
                    <option value="विशेष स्वास्थ्य एवं रक्तदान सेवा सम्मान">विशेष स्वास्थ्य एवं रक्तदान सेवा सम्मान</option>
                    <option value="बाल शिक्षा प्रोत्साहन एवं नारी सशक्तिकरण सम्मान">बाल शिक्षा प्रोत्साहन एवं नारी सशक्तिकरण सम्मान</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Appreciation Citation (Hindi)
                  </label>
                  <textarea
                    rows={2}
                    value={formData.citation_hi}
                    onChange={(e) => setFormData({ ...formData, citation_hi: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-600 text-slate-800 leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Appreciation Citation (English)
                  </label>
                  <textarea
                    rows={2}
                    value={formData.citation_en}
                    onChange={(e) => setFormData({ ...formData, citation_en: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-600 text-slate-800 leading-relaxed"
                  />
                </div>

                <div className="pt-2 flex items-center justify-between gap-3">
                  <button
                    type="submit"
                    className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs uppercase tracking-wider shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>Save & Issue Certificate</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Right 7 Columns: Real-Time Live Preview */}
            <div className="lg:col-span-7 bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-900">Real-Time A4 Landscape Preview</h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPhotoInPreview(!showPhotoInPreview)}
                    className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                  >
                    {showPhotoInPreview ? 'Photo: ON' : 'Photo: OFF'}
                  </button>

                  <select
                    value={previewLanguage}
                    onChange={(e) => setPreviewLanguage(e.target.value)}
                    className="text-[11px] font-bold px-2 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 outline-none"
                  >
                    <option value="bilingual">Bilingual (द्विभाषी)</option>
                    <option value="hindi">Hindi Only</option>
                    <option value="english">English Only</option>
                  </select>
                </div>
              </div>

              {/* Scrollable Container for Preview */}
              <div className="w-full overflow-x-auto pb-4 flex justify-center bg-slate-100/70 p-3 rounded-2xl border border-slate-200">
                <RoyalCertificate
                  ref={livePreviewRef}
                  certificate={{
                    ...formData,
                    certificate_number: formData.certificate_number || 'UCWF-CERT-2026-LIVE',
                    president_signature: presidentSignature,
                  }}
                  showPhoto={showPhotoInPreview}
                  languageMode={previewLanguage}
                />
              </div>

              <p className="text-[11px] text-slate-400 text-center">
                This preview updates in real-time. Upon clicking "Save & Issue Certificate", it will be written to Firebase Realtime Database and available for instant download.
              </p>
            </div>
          </div>
        )}

        {/* =====================================================================
            TAB 3: PRESIDENT SIGNATURE & STAMP SETTINGS
           ===================================================================== */}
        {activeTab === 'signature' && (
          <div className="max-w-3xl mx-auto bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <PenTool className="w-5 h-5 text-amber-500" />
                <span>Authorized Signatory (अध्यक्ष / संस्थापक) Configuration</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Official transparent blue ink seal stamp & President signature. Automatically applied on all Certificates of Appreciation and Digital I-Cards across the entire platform.
              </p>
            </div>

            {/* Signature Preview Card */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center text-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Current Signature & Stamp Display
              </span>
              <div className="h-28 w-80 border-b-2 border-slate-700 flex items-center justify-center p-2 mb-2 bg-white rounded-lg shadow-2xs relative">
                <img
                  src={presidentSignature || PRESIDENT_STAMP_SIGNATURE_BASE64}
                  alt="President Signature & Stamp"
                  className="max-h-24 max-w-full object-contain"
                />
              </div>
              <p className="text-xs font-bold text-slate-900">
                {presidentName || PRESIDENT_NAME || 'Dr. Rajendra Singh Saini'} (अध्यक्ष / संस्थापक)
              </p>
              <p className="text-[11px] text-slate-500">
                {FOUNDATION_NAME}
              </p>
            </div>

            {/* Upload Controls */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  President / Signatory Name
                </label>
                <input
                  type="text"
                  value={presidentName}
                  onChange={(e) => setPresidentName(e.target.value)}
                  placeholder="e.g. Dr. Rajendra Singh Saini"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-600 text-slate-800 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Upload Official Signature PNG (Transparent Background Preferred)
                </label>
                <input
                  type="file"
                  ref={signatureInputRef}
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleSignatureUpload}
                  className="hidden"
                />
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => signatureInputRef.current?.click()}
                    disabled={savingSignature}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-60"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{savingSignature ? 'Saving to Firebase...' : 'Upload New Signature PNG'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleClearSignature}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 font-bold text-xs transition-colors"
                  >
                    Reset to Extracted Blue Stamp
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            INSPECT & DOWNLOAD MODAL
           ===================================================================== */}
        {previewModalOpen && previewCertData && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-3xl max-w-5xl w-full max-h-[92vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200"
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Puraskar Certificate: {previewCertData.certificate_number}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Awarded to: <strong>{previewCertData.salutation ? `${previewCertData.salutation} ` : ''}{previewCertData.member_name}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body / Captured Certificate */}
              <div className="flex-1 overflow-y-auto p-4 bg-slate-100 flex justify-center">
                <RoyalCertificate
                  ref={previewRef}
                  certificate={previewCertData}
                  showPhoto={true}
                  languageMode="bilingual"
                />
              </div>

              {/* Modal Footer Actions */}
              <div className="p-4 border-t border-slate-100 bg-white flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-slate-400">
                  Ready for print (A4 Landscape 300 DPI)
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!previewRef.current) return;
                      setDownloadingPDF(true);
                      try {
                        const safeNumber = (previewCertData.certificate_number || 'cert').replace(/[^a-zA-Z0-9_-]/g, '_');
                        await generateCertificatePDF(previewRef, `${safeNumber}-Puraskar-Certificate`);
                      } finally {
                        setDownloadingPDF(false);
                      }
                    }}
                    disabled={downloadingPDF}
                    className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>{downloadingPDF ? 'Generating PDF...' : 'Download HD PDF'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      if (!previewRef.current) return;
                      setDownloadingPNG(true);
                      try {
                        const blob = await generateCertificatePNG(previewRef);
                        const safeNumber = (previewCertData.certificate_number || 'cert').replace(/[^a-zA-Z0-9_-]/g, '_');
                        downloadBlob(blob, `${safeNumber}-Puraskar-Certificate.png`);
                      } finally {
                        setDownloadingPNG(false);
                      }
                    }}
                    disabled={downloadingPNG}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>{downloadingPNG ? 'Rendering PNG...' : 'Download PNG'}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteModal.isOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center shadow-xl space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">Revoke Certificate?</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Are you sure you want to revoke and delete certificate <strong>{deleteModal.cert?.certificate_number}</strong>? This action cannot be undone.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteModal({ isOpen: false, cert: null, deleting: false })}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleteModal.deleting}
                  onClick={handleDeleteCertificate}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold"
                >
                  {deleteModal.deleting ? 'Deleting...' : 'Revoke & Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export { CertificateManager };
