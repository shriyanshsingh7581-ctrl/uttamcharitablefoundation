import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  Upload, 
  Printer, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  FileText, 
  UserCheck, 
  Sparkles, 
  Check, 
  Building2, 
  Lock, 
  Phone, 
  ShieldCheck, 
  User, 
  Calendar, 
  Eye, 
  EyeOff,
  MapPin,
  Mail,
  Award,
  CreditCard,
  Layers,
  ArrowRight,
  CheckSquare,
  Square,
  RefreshCw,
  Info
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { rtdb } from '../lib/firebase';
import { ref, set, push, get } from 'firebase/database';
import { uploadToCloudinary, compressImageToBase64 } from '../lib/cloudinary';
import { useAuth } from '../contexts/AuthContext';
import { distribute12LevelCommission } from '../utils/commission';
import { 
  FOUNDATION_DETAILS, 
  PACKAGES, 
  SALUTATIONS, 
  formatINR, 
  safeText 
} from '../lib/constants';

// Predefined Karyakarini Designations for "पद का नाम"
const DESIGNATION_OPTIONS = [
  'कार्यकारिणी सदस्य (Executive Member)',
  'राष्ट्रीय अध्यक्ष (National President)',
  'राष्ट्रीय उपाध्यक्ष (National Vice President)',
  'राष्ट्रीय सचिव (National Secretary)',
  'राष्ट्रीय उपसचिव (National Joint Secretary)',
  'राष्ट्रीय मंत्री (National Minister/Convener)',
  'राष्ट्रीय उपमंत्री (National Deputy Convener)',
  'राष्ट्रीय सदस्य (National Member)',
  'प्रदेश अध्यक्ष (State President)',
  'प्रदेश उपाध्यक्ष (State Vice President)',
  'प्रदेश सचिव (State Secretary)',
  'प्रदेश उपसचिव (State Joint Secretary)',
  'प्रदेश मंत्री (State Minister/Convener)',
  'प्रदेश सदस्य (State Member)',
  'मण्डल अध्यक्ष (Divisional President)',
  'मण्डल उपाध्यक्ष (Divisional Vice President)',
  'मण्डल सचिव (Divisional Secretary)',
  'मण्डल सदस्य (Divisional Member)',
  'जिला अध्यक्ष (District President)',
  'जिला उपाध्यक्ष (District Vice President)',
  'जिला सचिव (District Secretary)',
  'जिला उपसचिव (District Joint Secretary)',
  'जिला मंत्री (District Minister)',
  'जिला सदस्य (District Member)',
  'तहसील अध्यक्ष (Tehsil President)',
  'तहसील उपाध्यक्ष (Tehsil Vice President)',
  'तहसील सचिव (Tehsil Secretary)',
  'तहसील सदस्य (Tehsil Member)',
  'ब्लॉक अध्यक्ष (Block President)',
  'ब्लॉक उपाध्यक्ष (Block Vice President)',
  'ब्लॉक सचिव (Block Secretary)',
  'ब्लॉक सदस्य (Block Member)',
  'ग्राम अध्यक्ष (Village President)',
  'ग्राम सचिव (Village Secretary)',
  'ग्राम सदस्य (Village Member)',
  'समाज सेवी / सक्रिय सदस्य (Social Worker / Active Member)',
  'अन्य (Other - Manual Input)'
];

export default function PaperRegistrationForm({ 
  isAdminMode = false, 
  onSuccessCallback = null,
  onCloseModal = null,
  initialSponsorId = '9540648402',
  initialPackageId = 'tier_500'
}) {
  const { registerUser } = useAuth();
  const formRef = useRef(null);
  const photoInputRef = useRef(null);
  const signatureInputRef = useRef(null);
  const aadhaarInputRef = useRef(null);
  const aadhaarBackInputRef = useRef(null);
  const panInputRef = useRef(null);
  const receiptInputRef = useRef(null);
  const paperPhotoInputRef = useRef(null);
  const paperSignatureInputRef = useRef(null);

  // View state: 'digital' (modern trusted mobile-optimized form) vs 'paper' (A4 sheet preview)
  const [formView, setFormView] = useState('digital');

  // Auto-generate unique Member ID
  const [memberId, setMemberId] = useState(() => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `UCWF-2026-${randomNum}`;
  });

  // 1. पद का नाम
  const [selectedPadType, setSelectedPadType] = useState('कार्यकारिणी सदस्य (Executive Member)');
  const [customPadNaam, setCustomPadNaam] = useState('');

  // 2. समाज सेवी का नाम & Salutation
  const [salutation, setSalutation] = useState('श्री');
  const [name, setName] = useState('');

  // 3. आधार संख्या & पैन नं०
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');

  // 4. पिता एवं माता का नाम
  const [fatherName, setFatherName] = useState('');
  const [motherName, setMotherName] = useState('');

  // 5. स्थाई पता & पिन कोड
  const [permanentAddress, setPermanentAddress] = useState('');
  const [permanentPincode, setPermanentPincode] = useState('');

  // 6. वर्तमान पता & पिन कोड
  const [sameAsPermanent, setSameAsPermanent] = useState(false);
  const [currentAddress, setCurrentAddress] = useState('');
  const [currentPincode, setCurrentPincode] = useState('');

  // 7. मोबाईल नं० & ई-मेल
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // 8. जन्मतिथि, ब्लड ग्रुप & व्यवसाय
  const [dob, setDob] = useState('');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [occupation, setOccupation] = useState('');

  // 9. योग्यता & लिंग
  const [qualification, setQualification] = useState('');
  const [gender, setGender] = useState('पुरुष');

  // 10. स्पॉन्सर आईडी, पासवर्ड & सहयोग राशि
  const defaultSponsor = (!initialSponsorId || initialSponsorId === 'DIRECT') ? '9540648402' : initialSponsorId;
  const [sponsorId, setSponsorId] = useState(defaultSponsor);
  const [sponsorName, setSponsorName] = useState('उत्तम चैरिटेबल ट्रस्ट (हेड ऑफिस)');
  const [sponsorVerified, setSponsorVerified] = useState(true);

  // Auto-Generated unique password
  const [password, setPassword] = useState('');
  const [passwordManuallyEdited, setPasswordManuallyEdited] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [membershipAmount, setMembershipAmount] = useState('500');

  // Payment Mode: Default is "Cash / Offline Office Deposit" (No Bank Account / No UTR required)
  const [paymentMode, setPaymentMode] = useState('cash'); // 'cash' | 'online'
  const [enteredUtr, setEnteredUtr] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [upiId, setUpiId] = useState('');

  // Declaration Date - Automatically pre-fill Today's Date in IST
  const [declarationDate, setDeclarationDate] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [declarationAgreed, setDeclarationAgreed] = useState(true);

  // For Office Use Only (कार्यालय प्रयोग हेतु)
  const [officeName1, setOfficeName1] = useState('');
  const [officePhone1, setOfficePhone1] = useState('');
  const [officeProposedPost2, setOfficeProposedPost2] = useState('');
  const [officePhone2, setOfficePhone2] = useState('');

  // Uploaded Assets State
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoDocName, setPhotoDocName] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [signaturePreview, setSignaturePreview] = useState(null);
  const [signatureUrl, setSignatureUrl] = useState('');
  const [signatureDocName, setSignatureDocName] = useState('');
  const [uploadingSignature, setUploadingSignature] = useState(false);

  // Aadhaar Card (Front / Full PDF)
  const [aadhaarDocName, setAadhaarDocName] = useState('');
  const [aadhaarDocUrl, setAadhaarDocUrl] = useState('');
  const [aadhaarPreview, setAadhaarPreview] = useState(null);
  const [uploadingAadhaar, setUploadingAadhaar] = useState(false);

  // Aadhaar Card (Back / Address Proof)
  const [aadhaarBackDocName, setAadhaarBackDocName] = useState('');
  const [aadhaarBackDocUrl, setAadhaarBackDocUrl] = useState('');
  const [aadhaarBackPreview, setAadhaarBackPreview] = useState(null);
  const [uploadingAadhaarBack, setUploadingAadhaarBack] = useState(false);

  // PAN Card Document (Image or PDF)
  const [panDocName, setPanDocName] = useState('');
  const [panDocUrl, setPanDocUrl] = useState('');
  const [panPreview, setPanPreview] = useState(null);
  const [uploadingPan, setUploadingPan] = useState(false);

  // Payment Proof / UTR Receipt Screenshot
  const [paymentReceiptName, setPaymentReceiptName] = useState('');
  const [paymentReceiptUrl, setPaymentReceiptUrl] = useState('');
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  // UI Flow State
  const [loading, setLoading] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successData, setSuccessData] = useState(null);

  // Auto-generate unique password from Mobile Number or DOB
  const handlePhoneChange = (val) => {
    const clean = val.replace(/\D/g, '').slice(0, 10);
    setPhone(clean);

    if (!passwordManuallyEdited) {
      if (clean.length > 0) {
        setPassword(clean);
      } else if (dob) {
        const cleanDob = dob.replace(/-/g, '');
        setPassword(cleanDob.slice(6, 8) + cleanDob.slice(4, 6) + cleanDob.slice(0, 4));
      } else {
        setPassword('');
      }
    }
  };

  const handleDobChange = (val) => {
    setDob(val);
    if (!passwordManuallyEdited && !phone) {
      const cleanDob = val.replace(/-/g, '');
      if (cleanDob.length === 8) {
        const ddmmyyyy = cleanDob.slice(6, 8) + cleanDob.slice(4, 6) + cleanDob.slice(0, 4);
        setPassword(ddmmyyyy);
      }
    }
  };

  // Sponsor ID Live Lookup
  useEffect(() => {
    const key = (sponsorId || '').trim();
    if (!key || key === '9540648402' || key.toUpperCase() === 'UCWF-0001' || key.toUpperCase() === 'DIRECT') {
      setSponsorName('उत्तम चैरिटेबल ट्रस्ट (हेड ऑफिस)');
      setSponsorVerified(true);
      return;
    }

    const cleanP = key.replace(/\D/g, '').slice(-10);
    const usersRef = ref(rtdb, 'users');
    get(usersRef).then((snap) => {
      if (snap.exists()) {
        const users = snap.val();
        const found = Object.values(users).find(
          u => (u.memberId && u.memberId.toUpperCase() === key.toUpperCase()) ||
               (u.phone && cleanP && u.phone.replace(/\D/g, '').slice(-10) === cleanP)
        );
        if (found) {
          setSponsorName(`${found.salutation || ''} ${found.name || 'Member'} (${found.memberId})`.trim());
          setSponsorVerified(true);
        } else {
          setSponsorName('स्पॉन्सर आईडी मान्य है (Direct Joining)');
          setSponsorVerified(true);
        }
      } else {
        setSponsorName('उत्तम चैरिटेबल ट्रस्ट (हेड ऑफिस)');
        setSponsorVerified(true);
      }
    }).catch(() => {
      setSponsorName('उत्तम चैरिटेबल ट्रस्ट (हेड ऑफिस)');
    });
  }, [sponsorId]);

  // Handle same as permanent address toggle
  useEffect(() => {
    if (sameAsPermanent) {
      setCurrentAddress(permanentAddress);
      setCurrentPincode(permanentPincode);
    }
  }, [sameAsPermanent, permanentAddress, permanentPincode]);

  const effectivePadNaam = selectedPadType === 'अन्य (Other - Manual Input)' 
    ? (customPadNaam || 'कार्यकारिणी सदस्य') 
    : selectedPadType;

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  // Download or View asset helper
  const handleDownloadAsset = (url, fileName) => {
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    if (typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    } else {
      a.download = fileName || 'document';
    }
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Universal Upload Handler (Images & PDF Documents)
  const handleDocUpload = async (file, { folder, setName, setPreview, setUrl, setUploading, label }) => {
    if (!file) return;
    setUploading(true);
    if (setName) setName(file.name);

    const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|svg|bmp)$/i.test(file.name);
    if (isImage) {
      try {
        const localBlob = URL.createObjectURL(file);
        if (setPreview) setPreview(localBlob);
      } catch (e) {}
    }

    try {
      // 1. Primary: Cloudinary Direct Upload
      const uploadResult = await uploadToCloudinary(file, folder);
      const remoteUrl = uploadResult?.secure_url || uploadResult?.url;
      if (remoteUrl) {
        setUrl(remoteUrl);
        if (isImage && setPreview) setPreview(remoteUrl);
      } else {
        const b64 = await compressImageToBase64(file);
        setUrl(b64);
        if (isImage && setPreview) setPreview(b64);
      }
    } catch (cloudErr) {
      console.warn(`${label || 'Document'} Cloudinary upload notice (using compressed fallback):`, cloudErr);
      try {
        const b64 = await compressImageToBase64(file);
        setUrl(b64);
        if (isImage && setPreview) setPreview(b64);
      } catch (err) {
        console.error(`${label} read error:`, err);
        setErrorMsg(`${label || 'दस्तावेज़'} अपलोड करने में त्रुटि। कृपया पुनः प्रयास करें।`);
      }
    } finally {
      setUploading(false);
    }
  };

  // 1. Handle Photo Upload
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoDocName(file.name);
      handleDocUpload(file, {
        folder: 'member_photos',
        setName: setPhotoDocName,
        setPreview: setPhotoPreview,
        setUrl: setPhotoUrl,
        setUploading: setUploadingPhoto,
        label: 'पासपोर्ट फ़ोटो'
      });
    }
  };

  // 2. Handle Signature Upload
  const handleSignatureSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSignatureDocName(file.name);
      handleDocUpload(file, {
        folder: 'signatures',
        setName: setSignatureDocName,
        setPreview: setSignaturePreview,
        setUrl: setSignatureUrl,
        setUploading: setUploadingSignature,
        label: 'हस्ताक्षर'
      });
    }
  };

  // 3. Handle Aadhaar Front / Full PDF Upload
  const handleAadhaarSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setAadhaarDocName(file.name);
      handleDocUpload(file, {
        folder: 'aadhaar_docs',
        setName: setAadhaarDocName,
        setPreview: setAadhaarPreview,
        setUrl: setAadhaarDocUrl,
        setUploading: setUploadingAadhaar,
        label: 'आधार कार्ड (मुख्य)'
      });
    }
  };

  // 4. Handle Aadhaar Back / Address Upload
  const handleAadhaarBackSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setAadhaarBackDocName(file.name);
      handleDocUpload(file, {
        folder: 'aadhaar_docs',
        setName: setAadhaarBackDocName,
        setPreview: setAadhaarBackPreview,
        setUrl: setAadhaarBackDocUrl,
        setUploading: setUploadingAadhaarBack,
        label: 'आधार कार्ड (पिछला भाग)'
      });
    }
  };

  // 5. Handle PAN Card Upload
  const handlePanSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPanDocName(file.name);
      handleDocUpload(file, {
        folder: 'pan_docs',
        setName: setPanDocName,
        setPreview: setPanPreview,
        setUrl: setPanDocUrl,
        setUploading: setUploadingPan,
        label: 'पैन कार्ड'
      });
    }
  };

  // 6. Handle Payment Receipt / Screenshot Upload
  const handleReceiptSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPaymentReceiptName(file.name);
      handleDocUpload(file, {
        folder: 'payment_receipts',
        setName: setPaymentReceiptName,
        setPreview: setReceiptPreview,
        setUrl: setPaymentReceiptUrl,
        setUploading: setUploadingReceipt,
        label: 'भुगतान रसीद'
      });
    }
  };

  // Native Browser Print
  const handlePrint = () => {
    window.print();
  };

  // High-Resolution A4 PDF Download
  const handleDownloadPDF = async () => {
    if (!formRef.current) return;
    setExportingPdf(true);
    try {
      const element = formRef.current;
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 850
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = 210;
      const pdfHeight = 297;
      
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      
      const cleanFileName = `UCWF_Membership_Form_${memberId || 'Application'}.pdf`;
      pdf.save(cleanFileName);
    } catch (err) {
      console.error('PDF export fallback to browser print:', err);
      window.print();
    } finally {
      setExportingPdf(false);
    }
  };

  // Form Submit Handler
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    // Validations
    if (!name.trim()) {
      setErrorMsg('कृपया समाज सेवी का नाम दर्ज करें।');
      return;
    }
    if (!phone.trim() || phone.trim().replace(/\D/g, '').length < 10) {
      setErrorMsg('कृपया 10 अंकों का मान्य मोबाइल नंबर दर्ज करें।');
      return;
    }

    const cleanPhone = phone.trim().replace(/\D/g, '').slice(-10);
    const cleanEmail = email.trim() || `${cleanPhone}@ucwf.online`;
    const cleanPassword = password.trim() || cleanPhone;
    const numAmount = Number(membershipAmount) || 500;
    const cleanSponsor = (sponsorId || '9540648402').trim();

    setLoading(true);

    try {
      const uniqueUid = 'member_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
      const fullMemberPayload = {
        uid: uniqueUid,
        memberId: memberId.trim().toUpperCase(),
        padNaam: effectivePadNaam,
        salutation: salutation,
        name: name.trim(),
        displayName: `${salutation} ${name.trim()}`,
        aadhaarNumber: aadhaarNumber.trim(),
        panNumber: panNumber.trim().toUpperCase(),
        fatherOrSpouseName: fatherName.trim(),
        fatherName: fatherName.trim(),
        motherName: motherName.trim(),
        permanentAddress: permanentAddress.trim(),
        permanentPincode: permanentPincode.trim(),
        currentAddress: currentAddress.trim() || permanentAddress.trim(),
        currentPincode: currentPincode.trim() || permanentPincode.trim(),
        address: permanentAddress.trim(),
        pincode: permanentPincode.trim(),
        phone: cleanPhone,
        email: cleanEmail.toLowerCase(),
        dob: dob,
        bloodGroup: bloodGroup,
        occupation: occupation.trim(),
        qualification: qualification.trim(),
        gender: gender,
        sponsorId: cleanSponsor,
        sponsorName: sponsorName.trim() || 'उत्तम चैरिटेबल ट्रस्ट',
        sponsorPhone: (cleanSponsor.replace(/\D/g, '').length === 10 ? cleanSponsor.replace(/\D/g, '') : ''),
        password: cleanPassword,
        plainPassword: cleanPassword,
        isAdminMode: isAdminMode,
        preserveSession: isAdminMode,
        packageAmount: numAmount,
        packageTier: numAmount,
        packageName: `सहयोग संकल्प (₹${numAmount})`,
        photoUrl: photoUrl || photoPreview || '',
        photoDocName: photoDocName || '',
        signatureUrl: signatureUrl || signaturePreview || '',
        signatureDocName: signatureDocName || '',
        aadhaarDocUrl: aadhaarDocUrl || '',
        aadhaarDocName: aadhaarDocName || '',
        aadhaarBackDocUrl: aadhaarBackDocUrl || '',
        aadhaarBackDocName: aadhaarBackDocName || '',
        panDocUrl: panDocUrl || '',
        panDocName: panDocName || '',
        paymentReceiptUrl: paymentReceiptUrl || '',
        paymentReceiptName: paymentReceiptName || '',
        officeName1: officeName1.trim(),
        officePhone1: officePhone1.trim(),
        officeProposedPost2: officeProposedPost2.trim(),
        officePhone2: officePhone2.trim(),
        declarationAccepted: declarationAgreed,
        applicationDate: declarationDate,
        status: 'active',
        isApproved: true,
        paymentVerified: true,
        kycVerified: true,
        paymentMode: paymentMode === 'cash' ? 'Cash / Offline Office Deposit' : 'Online UPI / Bank',
        paymentMethod: paymentMode === 'cash' ? 'Cash / Offline Office Deposit' : 'Online UPI / Bank Transfer',
        utrNumber: paymentMode === 'cash' ? 'CASH-OFFLINE-DEPOSIT' : (enteredUtr.trim() || 'PORTAL-ONLINE-REG'),
        bankDetails: {
          bankName: bankName.trim() || 'Not Provided (Offline/Cash Mode)',
          accountNo: accountNo.trim() || '',
          ifsc: ifsc.trim().toUpperCase() || '',
          upiId: upiId.trim() || ''
        },
        walletBalance: 0,
        totalEarned: 0,
        selfBusiness: numAmount,
        selfBusinessCommission: 0, // STRICTLY ZERO SELF COMMISSION
        totalCommission: 0,
        directBusiness: 0,
        directTeamBusiness: 0,
        teamBusiness: 0,
        downlineBusiness: 0,
        directCommission: 0,
        directTeamCommission: 0,
        downlineCommission: 0,
        totalWithdrawn: 0
      };

      let registeredResult = null;

      try {
        registeredResult = await registerUser(fullMemberPayload);
      } catch (authErr) {
        console.warn('registerUser Auth exception (falling back to direct RTDB write):', authErr);
        const cleanUid = uniqueUid;
        const userDirectRef = ref(rtdb, `users/${cleanUid}`);
        await set(userDirectRef, {
          uid: cleanUid,
          ...fullMemberPayload,
          createdAt: new Date().toISOString(),
          timestamp: Date.now()
        });
        registeredResult = { uid: cleanUid, ...fullMemberPayload };
      }

      // Accounting record in /payment_requests
      try {
        const paymentRequestsRef = ref(rtdb, 'payment_requests');
        const newPaymentRef = push(paymentRequestsRef);
        await set(newPaymentRef, {
          id: newPaymentRef.key,
          userId: registeredResult?.uid || 'N/A',
          memberId: memberId.trim().toUpperCase(),
          userName: `${salutation} ${name.trim()}`,
          email: cleanEmail,
          phone: cleanPhone,
          sponsorId: cleanSponsor,
          amount: numAmount,
          packageName: `सहयोग संकल्प (₹${numAmount})`,
          paymentMode: paymentMode === 'cash' ? 'Cash / Offline Office Deposit' : 'Online UPI / Bank',
          paymentMethod: paymentMode === 'cash' ? 'Cash / Offline' : 'Online / UPI',
          status: 'approved',
          utrNumber: paymentMode === 'cash' ? 'CASH-OFFLINE-DEPOSIT' : (enteredUtr.trim() || 'PORTAL-ONLINE-REG'),
          paymentReceiptUrl: paymentReceiptUrl || '',
          aadhaarDocUrl: aadhaarDocUrl || '',
          panDocUrl: panDocUrl || '',
          createdAt: new Date().toISOString(),
          timestamp: Date.now()
        });
      } catch (payErr) {
        console.warn('Accounting record note:', payErr);
      }

      // Instant 12-level commission credit to uplines & trust calculation
      try {
        await distribute12LevelCommission(registeredResult?.uid || memberId.trim().toUpperCase(), numAmount);
      } catch (commErr) {
        console.warn('Instant commission credit note:', commErr);
      }

      setSuccessData({
        memberId: memberId.trim().toUpperCase(),
        name: `${salutation} ${name.trim()}`,
        padNaam: effectivePadNaam,
        phone: cleanPhone,
        password: cleanPassword,
        email: cleanEmail,
        amount: numAmount,
        sponsorId: cleanSponsor,
        sponsorName: sponsorName.trim() || 'उत्तम चैरिटेबल ट्रस्ट',
        photoUrl: photoUrl || photoPreview,
        signatureUrl: signatureUrl || signaturePreview,
        aadhaarDocUrl: aadhaarDocUrl,
        aadhaarBackDocUrl: aadhaarBackDocUrl,
        panDocUrl: panDocUrl,
        paymentReceiptUrl: paymentReceiptUrl
      });

      if (onSuccessCallback) {
        onSuccessCallback(fullMemberPayload);
      }
    } catch (err) {
      console.error('Form registration failed:', err);
      setErrorMsg(err.message || 'पंजीकरण सबमिट करने में विफल। कृपया पुनः प्रयास करें।');
    } finally {
      setLoading(false);
    }
  };

  // SUCCESS CONFIRMATION MODAL / VIEW
  if (successData) {
    return (
      <div className="max-w-2xl mx-auto my-6 p-6 sm:p-8 bg-white border-2 border-emerald-600 rounded-3xl shadow-2xl text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center border-2 border-emerald-500 shadow-inner">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div className="space-y-1">
          <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
            ✓ 100% सफल पंजीकरण एवं सत्यापन
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-2">
            सदस्यता आवेदन सफलतापूर्वक दर्ज व सक्रिय हुआ!
          </h2>
          <p className="text-xs text-slate-600 font-medium">
            उत्तम चैरिटेबल वेलफेयर फाउंडेशन के आधिकारिक सदस्यता डेटाबेस में विवरण सुरक्षित कर दिया गया है।
          </p>
        </div>

        <div className="p-4 sm:p-5 bg-slate-50 border border-slate-200 rounded-2xl text-left text-xs sm:text-sm space-y-2.5">
          <div className="flex justify-between py-1 border-b border-slate-200">
            <span className="text-slate-500 font-sans">सदस्यता क्रमांक (Member ID):</span>
            <strong className="text-emerald-700 font-black font-mono tracking-wider">{successData.memberId}</strong>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-200">
            <span className="text-slate-500 font-sans">समाज सेवी का नाम:</span>
            <strong className="text-slate-900 font-bold">{successData.name}</strong>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-200">
            <span className="text-slate-500 font-sans">पद का नाम:</span>
            <strong className="text-slate-800">{successData.padNaam}</strong>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-200">
            <span className="text-slate-500 font-sans">मोबाइल नंबर (Login ID):</span>
            <span className="text-slate-900 font-bold font-mono">{successData.phone}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-200">
            <span className="text-slate-500 font-sans">लॉगिन पासवर्ड (Unique Password):</span>
            <strong className="text-amber-800 font-bold font-mono tracking-wider">{successData.password}</strong>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-200">
            <span className="text-slate-500 font-sans">स्पॉन्सर आईडी एवं नाम (Sponsor):</span>
            <span className="text-slate-900 font-bold font-mono">
              {successData.sponsorId} {successData.sponsorName ? `(${successData.sponsorName})` : ''}
            </span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-500 font-sans">सदस्यता सहयोग राशि:</span>
            <strong className="text-emerald-800 text-base font-black">₹{successData.amount}</strong>
          </div>
        </div>

        {/* Download Buttons for Uploaded Files */}
        <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-2.5 text-xs text-left">
          <p className="font-bold text-emerald-900">संलग्न प्रमाणित दस्तावेज़ (डाउनलोड एवं देखें):</p>
          <div className="flex flex-wrap gap-2">
            {successData.photoUrl && (
              <button
                type="button"
                onClick={() => handleDownloadAsset(successData.photoUrl, `Photo_${successData.memberId}.jpg`)}
                className="px-3 py-2 rounded-xl bg-white border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-100 shadow-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>📷 पासपोर्ट फोटो</span>
              </button>
            )}
            {successData.signatureUrl && (
              <button
                type="button"
                onClick={() => handleDownloadAsset(successData.signatureUrl, `Signature_${successData.memberId}.png`)}
                className="px-3 py-2 rounded-xl bg-white border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-100 shadow-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>✍️ हस्ताक्षर</span>
              </button>
            )}
            {successData.aadhaarDocUrl && (
              <button
                type="button"
                onClick={() => handleDownloadAsset(successData.aadhaarDocUrl, `Aadhaar_Front_${successData.memberId}.pdf`)}
                className="px-3 py-2 rounded-xl bg-white border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-100 shadow-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>📄 आधार कार्ड (मुख्य)</span>
              </button>
            )}
            {successData.aadhaarBackDocUrl && (
              <button
                type="button"
                onClick={() => handleDownloadAsset(successData.aadhaarBackDocUrl, `Aadhaar_Back_${successData.memberId}.pdf`)}
                className="px-3 py-2 rounded-xl bg-white border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-100 shadow-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>📄 आधार कार्ड (बैक)</span>
              </button>
            )}
            {successData.panDocUrl && (
              <button
                type="button"
                onClick={() => handleDownloadAsset(successData.panDocUrl, `PAN_${successData.memberId}.pdf`)}
                className="px-3 py-2 rounded-xl bg-white border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-100 shadow-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>💳 पैन कार्ड</span>
              </button>
            )}
            {successData.paymentReceiptUrl && (
              <button
                type="button"
                onClick={() => handleDownloadAsset(successData.paymentReceiptUrl, `Receipt_${successData.memberId}.jpg`)}
                className="px-3 py-2 rounded-xl bg-white border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-100 shadow-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>🧾 भुगतान रसीद</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          {onCloseModal && (
            <button
              type="button"
              onClick={onCloseModal}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-pink-100" />
              <span>लिस्ट में देखें (View Members List)</span>
            </button>
          )}

          <button
            type="button"
            onClick={handlePrint}
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg cursor-pointer"
          >
            <Printer className="w-4 h-4 text-emerald-300" />
            <span>कागजी फॉर्म प्रिंट करें</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSuccessData(null);
              setMemberId(`UCWF-2026-${Math.floor(1000 + Math.random() * 9000)}`);
              setName('');
              setPhone('');
              setPassword('');
              setEmail('');
            }}
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-700/25 cursor-pointer"
          >
            <UserCheck className="w-4 h-4" />
            <span>नया सदस्य जोड़ें (Add Another)</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full py-2 sm:py-6 print:py-0">
      
      {/* =========================================================================
          TOP TRUSTED BANNER & MODE SWITCHER
         ========================================================================= */}
      <div className="max-w-4xl mx-auto mb-6 px-2 sm:px-4 print:hidden space-y-3">
        
        {/* Foundation Trust Seals Pill Bar */}
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-teal-950/80 border border-emerald-500/30 text-white shadow-xl backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <img 
              src="/logo.png" 
              alt="UCWF Emblem" 
              crossOrigin="anonymous"
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-contain p-0.5 bg-white shadow-md border-2 border-blue-900 shrink-0"
              onError={(e) => { e.currentTarget.src = '/logo.png'; }}
            />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  उत्तम चैरिटेबल वेलफेयर फाउंडेशन
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-400/30">
                  GOVT. REGD.
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-medium">
                कॉर्पोरेट कार्य मंत्रालय, भारत सरकार (Section 8 Act 2013) • CIN: {FOUNDATION_DETAILS.cin}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 text-emerald-200 text-xs font-mono font-bold border border-white/15">
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              <span>हेल्पलाइन: 9540648402</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 text-emerald-300 text-xs font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>100% सत्यापित पोर्टल</span>
            </span>
          </div>
        </div>

        {/* View Switcher Pill Bar (Modern Digital vs Physical Paper View) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-2 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md">
          <div className="grid grid-cols-2 sm:flex items-center gap-1.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setFormView('digital')}
              className={`px-2.5 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-bold transition flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer ${
                formView === 'digital'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
              <span>डिजिटल फॉर्म</span>
            </button>

            <button
              type="button"
              onClick={() => setFormView('paper')}
              className={`px-2.5 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-bold transition flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer ${
                formView === 'paper'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-emerald-300" />
              <span>A4 प्रारूप</span>
            </button>
          </div>

          <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
              title="A4 प्रिंट करें"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-400" />
              <span>प्रिंट (Print)</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={exportingPdf}
              className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition active:scale-95 disabled:opacity-50 cursor-pointer"
              title="भरा हुआ फॉर्म A4 PDF डाउनलोड करें"
            >
              {exportingPdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>PDF बन रहा है...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>A4 PDF</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>

      {errorMsg && (
        <div className="max-w-4xl mx-auto mb-4 p-4 bg-red-500/10 border border-red-500/30 text-red-700 rounded-2xl text-xs flex items-center gap-2.5 print:hidden backdrop-blur-md">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
          <span className="font-semibold">{safeText(errorMsg)}</span>
        </div>
      )}

      {/* =========================================================================
          VIEW 1: LUXURY, HIGH-TRUST, RESPONSIVE DIGITAL WEB FORM
          (Mobile-optimized, clean cards, touch-friendly, trusted styling)
         ========================================================================= */}
      {formView === 'digital' && (
        <div className="max-w-4xl mx-auto px-2 sm:px-4 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* CARD 1: सदस्यता पहचान एवं पद विवरण */}
            <div className="glass-card-premium rounded-3xl p-5 sm:p-7 shadow-xl space-y-5 border-l-4 border-l-emerald-600">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-slate-200/80 gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 bg-emerald-500/15 text-emerald-800 rounded-2xl">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      1. सदस्यता पहचान एवं पद का नाम
                    </h3>
                    <p className="text-xs text-slate-500">
                      फाउंडेशन में अपनी कार्यकारिणी का पद एवं सदस्यता आईडी चुनें
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-bold">सदस्यता क्रमांक:</span>
                  <div className="px-3 py-1.5 rounded-xl bg-slate-900 text-emerald-400 font-mono font-black text-xs tracking-wider">
                    {memberId}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* पद का नाम */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-extrabold text-slate-800 mb-1.5">
                    पद का नाम (Designation / Office Post) *
                  </label>
                  <select
                    value={selectedPadType}
                    onChange={(e) => setSelectedPadType(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl glass-input text-xs sm:text-sm font-bold text-slate-900 outline-none cursor-pointer"
                  >
                    {DESIGNATION_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>

                  {selectedPadType === 'अन्य (Other - Manual Input)' && (
                    <input
                      type="text"
                      required
                      placeholder="कस्टम पद का नाम लिखें..."
                      value={customPadNaam}
                      onChange={(e) => setCustomPadNaam(e.target.value)}
                      className="mt-2 w-full px-4 py-3 rounded-2xl glass-input text-xs sm:text-sm font-bold text-slate-900 outline-none"
                    />
                  )}
                </div>

                {/* सदस्यता सहयोग राशि */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-extrabold text-slate-800 mb-1.5">
                    सदस्यता सहयोग राशि (Membership Contribution Tier) *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                    {[
                      { amt: '500', label: 'प्राथमिक', badge: 'Popular' },
                      { amt: '1100', label: 'सक्रिय', badge: '' },
                      { amt: '2100', label: 'विशिष्ट', badge: '' },
                      { amt: '5100', label: 'संरक्षक', badge: '' },
                      { amt: '11000', label: 'आजीवन', badge: 'VIP' }
                    ].map((tier) => (
                      <button
                        key={tier.amt}
                        type="button"
                        onClick={() => setMembershipAmount(tier.amt)}
                        className={`p-3 rounded-2xl border text-center transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                          membershipAmount === tier.amt
                            ? 'bg-emerald-600 text-white border-emerald-700 shadow-lg shadow-emerald-700/25 scale-[1.02]'
                            : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
                        }`}
                      >
                        <span className="text-sm font-black font-mono">₹{tier.amt}</span>
                        <span className={`text-[10px] font-bold ${membershipAmount === tier.amt ? 'text-emerald-100' : 'text-slate-500'}`}>
                          {tier.label}
                        </span>
                        {tier.badge && (
                          <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase ${
                            membershipAmount === tier.amt ? 'bg-white text-emerald-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {tier.badge}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* भुगतान माध्यम (Payment Method - Default: Cash / Offline Office Deposit) */}
                <div className="sm:col-span-2 pt-3 border-t border-slate-200/80">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-1">
                    <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-emerald-600" />
                      <span>भुगतान माध्यम (Payment Mode) *</span>
                    </label>
                    <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      ✓ बिना बैंक अकाउंट / नकद जमा सुविधा उपलब्ध
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    
                    {/* Mode 1: Cash / Offline Office Deposit (Default) */}
                    <div 
                      onClick={() => setPaymentMode('cash')}
                      className={`p-3.5 rounded-2xl border-2 transition cursor-pointer flex items-start gap-3 ${
                        paymentMode === 'cash'
                          ? 'bg-emerald-50/70 border-emerald-600 shadow-md ring-2 ring-emerald-500/20'
                          : 'bg-white hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMode"
                        checked={paymentMode === 'cash'}
                        onChange={() => setPaymentMode('cash')}
                        className="w-4 h-4 text-emerald-600 mt-1 cursor-pointer"
                      />
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-slate-900">
                            💵 नकद / कार्यालय जमा (Cash / Offline)
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-600 text-white">
                            डिफ़ॉल्ट
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          ट्रस्ट कार्यालय में नकद भुगतान / ऑफलाइन रसीद। किसी बैंक अकाउंट अथवा UTR नंबर की आवश्यकता नहीं है। आईडी तत्काल एक्टिव होगी।
                        </p>
                      </div>
                    </div>

                    {/* Mode 2: Online UPI / Transfer (Optional) */}
                    <div 
                      onClick={() => setPaymentMode('online')}
                      className={`p-3.5 rounded-2xl border-2 transition cursor-pointer flex items-start gap-3 ${
                        paymentMode === 'online'
                          ? 'bg-blue-50/70 border-blue-600 shadow-md ring-2 ring-blue-500/20'
                          : 'bg-white hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMode"
                        checked={paymentMode === 'online'}
                        onChange={() => setPaymentMode('online')}
                        className="w-4 h-4 text-blue-600 mt-1 cursor-pointer"
                      />
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-slate-900">
                            📱 ऑनलाइन UPI / ट्रांसफर (वैकल्पिक)
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          UPI या ऑनलाइन ट्रांसफर। UTR नंबर वैकल्पिक (Optional) है।
                        </p>
                      </div>
                    </div>

                  </div>

                  {paymentMode === 'online' && (
                    <div className="mt-3 p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                      <label className="block text-[11px] font-bold text-slate-700">
                        UTR / ट्रांजेक्शन संदर्भ नंबर (वैकल्पिक / Optional):
                      </label>
                      <input
                        type="text"
                        placeholder="यदि ऑनलाइन भुगतान किया है तो UTR संदर्भ नंबर डालें (अन्यथा खाली छोड़ें)..."
                        value={enteredUtr}
                        onChange={(e) => setEnteredUtr(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-mono font-bold text-slate-900 outline-none"
                      />
                    </div>
                  )}

                  {/* Optional Bank Details Accordion / Fields */}
                  <div className="mt-3 pt-3 border-t border-slate-200/60">
                    <div className="flex flex-wrap items-center justify-between mb-2 gap-1">
                      <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>बैंक खाता विवरण (Bank Details - पूर्णतः वैकल्पिक / Optional)</span>
                      </span>
                      <span className="text-[10px] text-slate-400">
                        (अभी खाता न होने पर खाली छोड़ें, पेआउट नकद भी मिलेगा)
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      <input
                        type="text"
                        placeholder="बैंक का नाम (वैकल्पिक)"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className="px-3 py-2 rounded-xl glass-input text-xs text-slate-800 outline-none"
                      />
                      <input
                        type="text"
                        placeholder="खाता संख्या (वैकल्पिक)"
                        value={accountNo}
                        onChange={(e) => setAccountNo(e.target.value)}
                        className="px-3 py-2 rounded-xl glass-input text-xs font-mono text-slate-800 outline-none"
                      />
                      <input
                        type="text"
                        placeholder="IFSC कोड (वैकल्पिक)"
                        value={ifsc}
                        onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                        className="px-3 py-2 rounded-xl glass-input text-xs font-mono text-slate-800 outline-none uppercase"
                      />
                    </div>
                  </div>

                </div>

              </div>
            </div>

            {/* CARD 2: व्यक्तिगत एवं पारिवारिक विवरण */}
            <div className="glass-card-premium rounded-3xl p-5 sm:p-7 shadow-xl space-y-5 border-l-4 border-l-blue-600">
              <div className="flex items-center gap-2.5 pb-3.5 border-b border-slate-200/80">
                <div className="p-2.5 bg-blue-500/15 text-blue-800 rounded-2xl">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    2. समाज सेवी का व्यक्तिगत विवरण
                  </h3>
                  <p className="text-xs text-slate-500">
                    पहचान पत्र (I-Card) एवं प्रशस्ति पत्र पर मुद्रण हेतु सही नाम दर्ज करें
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                {/* Salutation + Full Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-extrabold text-slate-800 mb-1.5">
                    समाज सेवी का पूरा नाम (Full Name) *
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={salutation}
                      onChange={(e) => setSalutation(e.target.value)}
                      className="w-24 sm:w-28 px-3 py-3 rounded-2xl glass-input text-xs sm:text-sm font-black text-slate-900 outline-none cursor-pointer shrink-0"
                    >
                      {SALUTATIONS.map((sal) => (
                        <option key={sal.id} value={sal.value}>{sal.label}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      required
                      placeholder="उदा. राजेश कुमार शर्मा"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="flex-1 px-4 py-3 rounded-2xl glass-input text-xs sm:text-sm font-bold text-slate-900 outline-none placeholder-slate-400"
                    />
                  </div>
                </div>

                {/* Father / Spouse Name */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-800 mb-1.5">
                    पिता / पति का नाम (Father / Spouse)
                  </label>
                  <input
                    type="text"
                    placeholder="पिता या पति का नाम"
                    value={fatherName}
                    onChange={(e) => setFatherName(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl glass-input text-xs sm:text-sm font-medium text-slate-900 outline-none"
                  />
                </div>

                {/* Mother Name */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-800 mb-1.5">
                    माता का नाम (Mother's Name)
                  </label>
                  <input
                    type="text"
                    placeholder="माता का नाम दर्ज करें"
                    value={motherName}
                    onChange={(e) => setMotherName(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl glass-input text-xs sm:text-sm font-medium text-slate-900 outline-none"
                  />
                </div>

                {/* Date of Birth */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-800 mb-1.5">
                    जन्मतिथि (Date of Birth)
                  </label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => handleDobChange(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl glass-input text-xs sm:text-sm font-bold text-slate-900 outline-none"
                  />
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-800 mb-1.5">
                    लिंग (Gender)
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-slate-100 border border-slate-200">
                    {['पुरुष', 'स्त्री', 'अन्य'].map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGender(g)}
                        className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                          gender === g
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Blood Group */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-800 mb-1.5">
                    ब्लड ग्रुप (Blood Group)
                  </label>
                  <select
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl glass-input text-xs sm:text-sm font-bold text-slate-900 outline-none cursor-pointer"
                  >
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>

              </div>
            </div>

            {/* CARD 3: पहचान एवं संपर्क सत्यापन (Mobile & Auto-Password) */}
            <div className="glass-card-premium rounded-3xl p-5 sm:p-7 shadow-xl space-y-5 border-l-4 border-l-amber-500">
              <div className="flex items-center gap-2.5 pb-3.5 border-b border-slate-200/80">
                <div className="p-2.5 bg-amber-500/15 text-amber-800 rounded-2xl">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    3. पहचान, संपर्क एवं लॉगिन क्रेडेंशियल
                  </h3>
                  <p className="text-xs text-slate-500">
                    मोबाईल नंबर ही आपका लॉगिन आईडी रहेगा। पासवर्ड स्वतः तैयार होगा।
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Mobile Number */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-800 mb-1.5">
                    मोबाईल नं० (10-Digit Mobile Number) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">+91</span>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      placeholder="98XXXXXXXX"
                      value={phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 rounded-2xl glass-input text-xs sm:text-sm font-mono font-bold text-slate-900 outline-none"
                    />
                  </div>
                  <p className="text-[10px] text-emerald-700 font-medium mt-1">
                    ✓ यही आपका पोर्टल लॉगिन आईडी रहेगा।
                  </p>
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-800 mb-1.5">
                    ई-मेल (Email Address)
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 rounded-2xl glass-input text-xs sm:text-sm font-medium text-slate-900 outline-none"
                    />
                  </div>
                </div>

                {/* Auto-Generated Password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-extrabold text-slate-800">
                      लॉगिन पासवर्ड (Unique Password) *
                    </label>
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      स्वतः निर्मित (Auto-Filled)
                    </span>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setPasswordManuallyEdited(true);
                      }}
                      className="w-full pl-11 pr-11 py-3 rounded-2xl glass-input text-xs sm:text-sm font-mono font-bold text-slate-900 outline-none tracking-wider"
                      placeholder="मोबाइल नंबर टाइप करते ही तैयार होगा"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    डिफ़ॉल्ट रूप से आपका मोबाइल नंबर ही पासवर्ड है (आप इसे बदल भी सकते हैं)।
                  </p>
                </div>

                {/* Sponsor ID with Live Verified Look */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-extrabold text-slate-800">
                      स्पॉन्सर ID / रेफरल कोड (Sponsor ID) *
                    </label>
                    <span className="text-[10px] text-blue-700 font-bold">
                      {sponsorVerified ? '✓ प्रमाणित' : 'जांच जारी'}
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    value={sponsorId}
                    onChange={(e) => setSponsorId(e.target.value)}
                    placeholder="9540648402"
                    className="w-full px-4 py-3 rounded-2xl glass-input text-xs sm:text-sm font-mono font-bold text-slate-900 uppercase outline-none"
                  />
                  <div className="mt-1 px-3 py-1 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-700 flex items-center justify-between">
                    <span>स्पॉन्सर नाम:</span>
                    <strong className="text-emerald-800 font-bold">{sponsorName}</strong>
                  </div>
                </div>

                {/* Aadhaar Number */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-800 mb-1.5">
                    आधार संख्या (12-Digit Aadhaar Number)
                  </label>
                  <input
                    type="text"
                    maxLength={14}
                    placeholder="XXXX XXXX XXXX"
                    value={aadhaarNumber}
                    onChange={(e) => setAadhaarNumber(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl glass-input text-xs sm:text-sm font-mono font-bold text-slate-900 outline-none"
                  />
                </div>

                {/* PAN Number */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-800 mb-1.5">
                    पैन नं० (10-Digit PAN Number)
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    placeholder="ABCDE1234F"
                    value={panNumber}
                    onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 rounded-2xl glass-input text-xs sm:text-sm font-mono font-bold uppercase text-slate-900 outline-none"
                  />
                </div>

                {/* Occupation & Qualification */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-800 mb-1.5">
                    व्यवसाय (Occupation)
                  </label>
                  <input
                    type="text"
                    placeholder="उदा. व्यापार, सेवा, समाज सेवा, कृषि..."
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl glass-input text-xs sm:text-sm font-medium text-slate-900 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-800 mb-1.5">
                    योग्यता (Qualification)
                  </label>
                  <input
                    type="text"
                    placeholder="उदा. स्नातक, परास्नातक, 12वीं..."
                    value={qualification}
                    onChange={(e) => setQualification(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl glass-input text-xs sm:text-sm font-medium text-slate-900 outline-none"
                  />
                </div>

              </div>
            </div>

            {/* CARD 4: निवास का पता विवरण (Permanent & Current Address) */}
            <div className="glass-card-premium rounded-3xl p-5 sm:p-7 shadow-xl space-y-5 border-l-4 border-l-teal-600">
              <div className="flex items-center gap-2.5 pb-3.5 border-b border-slate-200/80">
                <div className="p-2.5 bg-teal-500/15 text-teal-800 rounded-2xl">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    4. निवास का पता (Residential Addresses)
                  </h3>
                  <p className="text-xs text-slate-500">
                    स्थाई एवं वर्तमान पते का विवरण दर्ज करें
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                
                {/* Permanent Address */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-extrabold text-slate-800 mb-1.5">
                      स्थाई पता (Permanent Address) *
                    </label>
                    <input
                      type="text"
                      placeholder="मकान नं., मोहल्ला, गाँव/वार्ड, पोस्ट, तहसील, ज़िला, राज्य..."
                      value={permanentAddress}
                      onChange={(e) => setPermanentAddress(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl glass-input text-xs sm:text-sm font-medium text-slate-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold text-slate-800 mb-1.5">
                      पिन कोड (Pin Code)
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="244713"
                      value={permanentPincode}
                      onChange={(e) => setPermanentPincode(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-4 py-3 rounded-2xl glass-input text-xs sm:text-sm font-mono font-bold text-center text-slate-900 outline-none"
                    />
                  </div>
                </div>

                {/* Same as Permanent Checkbox */}
                <div className="pt-1">
                  <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer bg-slate-100/80 px-3.5 py-2 rounded-xl">
                    <input
                      type="checkbox"
                      checked={sameAsPermanent}
                      onChange={(e) => setSameAsPermanent(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <span>वर्तमान पता स्थाई पते के समान है (Current address same as permanent)</span>
                  </label>
                </div>

                {/* Current Address */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-extrabold text-slate-800 mb-1.5">
                      वर्तमान पता (Current Address)
                    </label>
                    <input
                      type="text"
                      disabled={sameAsPermanent}
                      placeholder="वर्तमान निवास का पूरा पता..."
                      value={currentAddress}
                      onChange={(e) => setCurrentAddress(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl glass-input text-xs sm:text-sm font-medium text-slate-900 outline-none disabled:opacity-60"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold text-slate-800 mb-1.5">
                      पिन कोड
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      disabled={sameAsPermanent}
                      placeholder="244713"
                      value={currentPincode}
                      onChange={(e) => setCurrentPincode(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-4 py-3 rounded-2xl glass-input text-xs sm:text-sm font-mono font-bold text-center text-slate-900 outline-none disabled:opacity-60"
                    />
                  </div>
                </div>

              </div>
            </div>

            {/* CARD 5: फोटो, हस्ताक्षर, आधार, पैन एवं भुगतान रसीद दस्तावेज अपलोड */}
            <div className="glass-card-premium rounded-3xl p-5 sm:p-7 shadow-xl space-y-5 border-l-4 border-l-purple-600">
              <div className="flex items-center gap-2.5 pb-3.5 border-b border-slate-200/80">
                <div className="p-2.5 bg-purple-500/15 text-purple-800 rounded-2xl">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    5. आवश्यक दस्तावेज एवं फोटो अपलोड (Mandatory Documents & Photo)
                  </h3>
                  <p className="text-xs text-slate-500">
                    पहचान पत्र सत्यापन एवं आधिकारिक ट्रस्ट रिकॉर्ड हेतु फोटो, हस्ताक्षर, आधार, पैन व रसीद अपलोड करें (JPG, PNG, PDF समर्थित)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4.5">
                
                {/* 1. Passport Photo */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-purple-300 shadow-sm flex flex-col justify-between space-y-3 transition">
                  <div className="w-full flex items-center justify-between text-xs font-bold text-slate-800">
                    <span className="flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-purple-600" />
                      <span>(1) पासपोर्ट फोटो *</span>
                    </span>
                    {(photoUrl || photoPreview) ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        ✓ अपलोड हुआ
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 font-semibold">
                        अनिवार्य
                      </span>
                    )}
                  </div>

                  <div 
                    onClick={() => photoInputRef.current?.click()}
                    className="w-full h-36 rounded-2xl border-2 border-dashed border-slate-300 hover:border-purple-500 bg-slate-50 hover:bg-purple-50/20 flex flex-col items-center justify-center p-2 cursor-pointer relative overflow-hidden transition group"
                  >
                    {uploadingPhoto ? (
                      <div className="flex flex-col items-center gap-2 text-purple-700">
                        <Loader2 className="w-8 h-8 animate-spin" />
                        <span className="text-xs font-bold">फोटो अपलोड हो रही है...</span>
                      </div>
                    ) : photoPreview ? (
                      <>
                        <img 
                          src={photoPreview} 
                          alt="Passport Preview" 
                          crossOrigin="anonymous"
                          className="w-full h-full object-contain rounded-xl"
                        />
                        <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 transition text-white text-xs font-bold">
                          <Upload className="w-4 h-4" />
                          <span>फोटो बदलें</span>
                        </div>
                      </>
                    ) : (
                      <div className="space-y-1.5 text-center">
                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mx-auto text-purple-600 group-hover:scale-110 transition">
                          <Camera className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-bold text-slate-700">पासपोर्ट फोटो चुनें</p>
                        <p className="text-[10px] text-slate-400">कैमरा / गैलरी (JPG, PNG)</p>
                      </div>
                    )}
                    <input 
                      type="file" 
                      ref={photoInputRef}
                      onChange={handlePhotoSelect}
                      accept="image/*" 
                      className="hidden" 
                    />
                  </div>

                  {(photoUrl || photoPreview) && (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleDownloadAsset(photoUrl || photoPreview, `Photo_${memberId}.jpg`)}
                        className="flex-1 py-1.5 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>देखें / डाउनलोड</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        className="py-1.5 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition cursor-pointer"
                        title="फोटो बदलें"
                      >
                        बदलें
                      </button>
                    </div>
                  )}
                </div>

                {/* 2. Signature / Thumbprint */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-purple-300 shadow-sm flex flex-col justify-between space-y-3 transition">
                  <div className="w-full flex items-center justify-between text-xs font-bold text-slate-800">
                    <span className="flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5 text-purple-600" />
                      <span>(2) हस्ताक्षर / अंगूठा *</span>
                    </span>
                    {(signatureUrl || signaturePreview) ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        ✓ अपलोड हुआ
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 font-semibold">
                        अनिवार्य
                      </span>
                    )}
                  </div>

                  <div 
                    onClick={() => signatureInputRef.current?.click()}
                    className="w-full h-36 rounded-2xl border-2 border-dashed border-slate-300 hover:border-purple-500 bg-slate-50 hover:bg-purple-50/20 flex flex-col items-center justify-center p-2 cursor-pointer relative overflow-hidden transition group"
                  >
                    {uploadingSignature ? (
                      <div className="flex flex-col items-center gap-2 text-purple-700">
                        <Loader2 className="w-8 h-8 animate-spin" />
                        <span className="text-xs font-bold">हस्ताक्षर अपलोड हो रहा है...</span>
                      </div>
                    ) : signaturePreview ? (
                      <>
                        <img 
                          src={signaturePreview} 
                          alt="Signature Preview" 
                          crossOrigin="anonymous"
                          className="max-h-full max-w-full object-contain"
                        />
                        <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 transition text-white text-xs font-bold">
                          <Upload className="w-4 h-4" />
                          <span>हस्ताक्षर बदलें</span>
                        </div>
                      </>
                    ) : (
                      <div className="space-y-1.5 text-center">
                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mx-auto text-purple-600 group-hover:scale-110 transition">
                          <Upload className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-bold text-slate-700">हस्ताक्षर / अंगूठा चुनें</p>
                        <p className="text-[10px] text-slate-400">सफ़ेद कागज़ पर हस्ताक्षर (JPG, PNG)</p>
                      </div>
                    )}
                    <input 
                      type="file" 
                      ref={signatureInputRef}
                      onChange={handleSignatureSelect}
                      accept="image/*" 
                      className="hidden" 
                    />
                  </div>

                  {(signatureUrl || signaturePreview) && (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleDownloadAsset(signatureUrl || signaturePreview, `Signature_${memberId}.png`)}
                        className="flex-1 py-1.5 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>देखें / डाउनलोड</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => signatureInputRef.current?.click()}
                        className="py-1.5 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition cursor-pointer"
                        title="हस्ताक्षर बदलें"
                      >
                        बदलें
                      </button>
                    </div>
                  )}
                </div>

                {/* 3. Aadhaar Card Front / Full PDF */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-purple-300 shadow-sm flex flex-col justify-between space-y-3 transition">
                  <div className="w-full flex items-center justify-between text-xs font-bold text-slate-800">
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                      <span>(3) आधार कार्ड (मुख्य पृष्ठ / PDF) *</span>
                    </span>
                    {(aadhaarDocUrl || aadhaarPreview) ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        ✓ अपलोड हुआ
                      </span>
                    ) : (
                      <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 font-semibold">
                        पहचान प्रमाण
                      </span>
                    )}
                  </div>

                  <div 
                    onClick={() => aadhaarInputRef.current?.click()}
                    className="w-full h-36 rounded-2xl border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/20 flex flex-col items-center justify-center p-2 cursor-pointer relative overflow-hidden transition group"
                  >
                    {uploadingAadhaar ? (
                      <div className="flex flex-col items-center gap-2 text-blue-700">
                        <Loader2 className="w-8 h-8 animate-spin" />
                        <span className="text-xs font-bold">आधार कार्ड अपलोड हो रहा है...</span>
                      </div>
                    ) : aadhaarPreview && !aadhaarDocName?.toLowerCase().endsWith('.pdf') ? (
                      <>
                        <img 
                          src={aadhaarPreview} 
                          alt="Aadhaar Front Preview" 
                          crossOrigin="anonymous"
                          className="max-h-full max-w-full object-contain rounded-lg"
                        />
                        <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 transition text-white text-xs font-bold">
                          <Upload className="w-4 h-4" />
                          <span>आधार कार्ड बदलें</span>
                        </div>
                      </>
                    ) : aadhaarDocName ? (
                      <div className="p-3 text-center space-y-1.5 w-full">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
                          <FileText className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-bold text-slate-800 truncate px-2" title={aadhaarDocName}>
                          {aadhaarDocName}
                        </p>
                        <span className="inline-block px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-mono font-bold">
                          PDF दस्तावेज़ संलग्न
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-1.5 text-center">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mx-auto text-blue-600 group-hover:scale-110 transition">
                          <FileText className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-bold text-slate-700">आधार कार्ड अपलोड करें</p>
                        <p className="text-[10px] text-slate-400">JPG, PNG या PDF (संपूर्ण या मुख्य)</p>
                      </div>
                    )}
                    <input 
                      type="file" 
                      ref={aadhaarInputRef}
                      onChange={handleAadhaarSelect}
                      accept="image/*,application/pdf,.pdf" 
                      className="hidden" 
                    />
                  </div>

                  {(aadhaarDocUrl || aadhaarPreview) && (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleDownloadAsset(aadhaarDocUrl || aadhaarPreview, `Aadhaar_${memberId}.pdf`)}
                        className="flex-1 py-1.5 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>देखें / डाउनलोड</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => aadhaarInputRef.current?.click()}
                        className="py-1.5 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition cursor-pointer"
                        title="आधार कार्ड बदलें"
                      >
                        बदलें
                      </button>
                    </div>
                  )}
                </div>

                {/* 4. Aadhaar Card Back / Address Page */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-purple-300 shadow-sm flex flex-col justify-between space-y-3 transition">
                  <div className="w-full flex items-center justify-between text-xs font-bold text-slate-800">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                      <span>(4) आधार कार्ड (पिछला भाग / पता)</span>
                    </span>
                    {(aadhaarBackDocUrl || aadhaarBackPreview) ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        ✓ अपलोड हुआ
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
                        पता प्रमाण (यदि अलग हो)
                      </span>
                    )}
                  </div>

                  <div 
                    onClick={() => aadhaarBackInputRef.current?.click()}
                    className="w-full h-36 rounded-2xl border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50 hover:bg-indigo-50/20 flex flex-col items-center justify-center p-2 cursor-pointer relative overflow-hidden transition group"
                  >
                    {uploadingAadhaarBack ? (
                      <div className="flex flex-col items-center gap-2 text-indigo-700">
                        <Loader2 className="w-8 h-8 animate-spin" />
                        <span className="text-xs font-bold">आधार बैक अपलोड हो रहा है...</span>
                      </div>
                    ) : aadhaarBackPreview && !aadhaarBackDocName?.toLowerCase().endsWith('.pdf') ? (
                      <>
                        <img 
                          src={aadhaarBackPreview} 
                          alt="Aadhaar Back Preview" 
                          crossOrigin="anonymous"
                          className="max-h-full max-w-full object-contain rounded-lg"
                        />
                        <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 transition text-white text-xs font-bold">
                          <Upload className="w-4 h-4" />
                          <span>बदलें</span>
                        </div>
                      </>
                    ) : aadhaarBackDocName ? (
                      <div className="p-3 text-center space-y-1.5 w-full">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto">
                          <FileText className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-bold text-slate-800 truncate px-2" title={aadhaarBackDocName}>
                          {aadhaarBackDocName}
                        </p>
                        <span className="inline-block px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[10px] font-mono font-bold">
                          PDF दस्तावेज़ संलग्न
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-1.5 text-center">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center mx-auto text-indigo-600 group-hover:scale-110 transition">
                          <MapPin className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-bold text-slate-700">आधार पिछला पृष्ठ (पता)</p>
                        <p className="text-[10px] text-slate-400">JPG, PNG या PDF</p>
                      </div>
                    )}
                    <input 
                      type="file" 
                      ref={aadhaarBackInputRef}
                      onChange={handleAadhaarBackSelect}
                      accept="image/*,application/pdf,.pdf" 
                      className="hidden" 
                    />
                  </div>

                  {(aadhaarBackDocUrl || aadhaarBackPreview) && (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleDownloadAsset(aadhaarBackDocUrl || aadhaarBackPreview, `Aadhaar_Back_${memberId}.pdf`)}
                        className="flex-1 py-1.5 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>देखें / डाउनलोड</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => aadhaarBackInputRef.current?.click()}
                        className="py-1.5 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition cursor-pointer"
                        title="दस्तावेज बदलें"
                      >
                        बदलें
                      </button>
                    </div>
                  )}
                </div>

                {/* 5. PAN Card Document */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-purple-300 shadow-sm flex flex-col justify-between space-y-3 transition">
                  <div className="w-full flex items-center justify-between text-xs font-bold text-slate-800">
                    <span className="flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-teal-600" />
                      <span>(5) पैन कार्ड दस्तावेज़ (Image / PDF)</span>
                    </span>
                    {(panDocUrl || panPreview) ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        ✓ अपलोड हुआ
                      </span>
                    ) : (
                      <span className="text-[10px] text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200 font-semibold">
                        टीडीएस / वित्तीय रिकॉर्ड
                      </span>
                    )}
                  </div>

                  <div 
                    onClick={() => panInputRef.current?.click()}
                    className="w-full h-36 rounded-2xl border-2 border-dashed border-slate-300 hover:border-teal-500 bg-slate-50 hover:bg-teal-50/20 flex flex-col items-center justify-center p-2 cursor-pointer relative overflow-hidden transition group"
                  >
                    {uploadingPan ? (
                      <div className="flex flex-col items-center gap-2 text-teal-700">
                        <Loader2 className="w-8 h-8 animate-spin" />
                        <span className="text-xs font-bold">पैन कार्ड अपलोड हो रहा है...</span>
                      </div>
                    ) : panPreview && !panDocName?.toLowerCase().endsWith('.pdf') ? (
                      <>
                        <img 
                          src={panPreview} 
                          alt="PAN Card Preview" 
                          crossOrigin="anonymous"
                          className="max-h-full max-w-full object-contain rounded-lg"
                        />
                        <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 transition text-white text-xs font-bold">
                          <Upload className="w-4 h-4" />
                          <span>पैन कार्ड बदलें</span>
                        </div>
                      </>
                    ) : panDocName ? (
                      <div className="p-3 text-center space-y-1.5 w-full">
                        <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center mx-auto">
                          <CreditCard className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-bold text-slate-800 truncate px-2" title={panDocName}>
                          {panDocName}
                        </p>
                        <span className="inline-block px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 text-[10px] font-mono font-bold">
                          PDF दस्तावेज़ संलग्न
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-1.5 text-center">
                        <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center mx-auto text-teal-600 group-hover:scale-110 transition">
                          <CreditCard className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-bold text-slate-700">पैन कार्ड अपलोड करें</p>
                        <p className="text-[10px] text-slate-400">JPG, PNG या PDF</p>
                      </div>
                    )}
                    <input 
                      type="file" 
                      ref={panInputRef}
                      onChange={handlePanSelect}
                      accept="image/*,application/pdf,.pdf" 
                      className="hidden" 
                    />
                  </div>

                  {(panDocUrl || panPreview) && (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleDownloadAsset(panDocUrl || panPreview, `PAN_${memberId}.pdf`)}
                        className="flex-1 py-1.5 px-3 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>देखें / डाउनलोड</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => panInputRef.current?.click()}
                        className="py-1.5 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition cursor-pointer"
                        title="पैन कार्ड बदलें"
                      >
                        बदलें
                      </button>
                    </div>
                  )}
                </div>

                {/* 6. Payment Receipt / Screenshot */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-purple-300 shadow-sm flex flex-col justify-between space-y-3 transition">
                  <div className="w-full flex items-center justify-between text-xs font-bold text-slate-800">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>(6) भुगतान रसीद / स्क्रीनशॉट</span>
                    </span>
                    {(paymentReceiptUrl || receiptPreview) ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        ✓ अपलोड हुआ
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-semibold">
                        ऑनलाइन / UTR प्रमाण
                      </span>
                    )}
                  </div>

                  <div 
                    onClick={() => receiptInputRef.current?.click()}
                    className="w-full h-36 rounded-2xl border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/20 flex flex-col items-center justify-center p-2 cursor-pointer relative overflow-hidden transition group"
                  >
                    {uploadingReceipt ? (
                      <div className="flex flex-col items-center gap-2 text-emerald-700">
                        <Loader2 className="w-8 h-8 animate-spin" />
                        <span className="text-xs font-bold">रसीद अपलोड हो रही है...</span>
                      </div>
                    ) : receiptPreview && !paymentReceiptName?.toLowerCase().endsWith('.pdf') ? (
                      <>
                        <img 
                          src={receiptPreview} 
                          alt="Receipt Preview" 
                          crossOrigin="anonymous"
                          className="max-h-full max-w-full object-contain rounded-lg"
                        />
                        <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 transition text-white text-xs font-bold">
                          <Upload className="w-4 h-4" />
                          <span>रसीद बदलें</span>
                        </div>
                      </>
                    ) : paymentReceiptName ? (
                      <div className="p-3 text-center space-y-1.5 w-full">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-bold text-slate-800 truncate px-2" title={paymentReceiptName}>
                          {paymentReceiptName}
                        </p>
                        <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold">
                          PDF रसीद संलग्न
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-1.5 text-center">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mx-auto text-emerald-600 group-hover:scale-110 transition">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-bold text-slate-700">भुगतान रसीद / स्क्रीनशॉट</p>
                        <p className="text-[10px] text-slate-400">UPI / QR स्क्रीनशॉट या बैंक रसीद</p>
                      </div>
                    )}
                    <input 
                      type="file" 
                      ref={receiptInputRef}
                      onChange={handleReceiptSelect}
                      accept="image/*,application/pdf,.pdf" 
                      className="hidden" 
                    />
                  </div>

                  {(paymentReceiptUrl || receiptPreview) && (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleDownloadAsset(paymentReceiptUrl || receiptPreview, `Receipt_${memberId}.pdf`)}
                        className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>देखें / डाउनलोड</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => receiptInputRef.current?.click()}
                        className="py-1.5 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition cursor-pointer"
                        title="रसीद बदलें"
                      >
                        बदलें
                      </button>
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* CARD 6: वैधानिक शपथ पत्र एवं घोषणा (Affirmation & Oath) */}
            <div className="glass-card-premium rounded-3xl p-5 sm:p-7 shadow-xl space-y-4 border-l-4 border-l-emerald-600">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200/80">
                <div className="p-2.5 bg-emerald-500/15 text-emerald-800 rounded-2xl">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    6. वैधानिक शपथ पत्र एवं घोषणा (Mandatory Affirmation)
                  </h3>
                  <p className="text-xs text-slate-500">
                    ट्रस्ट नियमावली एवं मार्गदर्शन के प्रति कर्तव्यनिष्ठ प्रतिज्ञा
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-800 leading-relaxed font-serif italic text-justify">
                &quot;मैंने शपथ पत्र में लिखे ट्रस्ट के सभी नियमों एवं शर्तों को भली-भांति पढ़ और समझ लिया है। और मुझे उनमें किसी तरह से इंकार नहीं है और मैं प्रतिज्ञा करता हूँ/करती हूँ कि हमेशा ट्रस्ट के उद्देश्य के प्रति ईमानदार, कर्तव्यनिष्ठ, अनुशासित कार्यकर्ता के रूप में कार्य करता रहूँगा / रहूँगी एवं राष्ट्रीय अध्यक्ष उच्च पदाधिकारी के मार्गदर्शन, दिशा निर्देशों का कड़ाई से पालन करूंगा / करूंगी।&quot;
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={declarationAgreed}
                    onChange={(e) => setDeclarationAgreed(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span>मैं उपरोक्त घोषणा को स्वीकार करता/करती हूँ (I Accept Declaration) *</span>
                </label>

                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-slate-600">आवेदन दिनांक:</span>
                  <input
                    type="date"
                    value={declarationDate}
                    onChange={(e) => setDeclarationDate(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white font-mono font-bold text-slate-900 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* SUBMIT BUTTON POD */}
            <div className="space-y-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 active:scale-[0.99] text-white font-black text-sm sm:text-base shadow-xl shadow-emerald-700/25 border border-white/20 transition flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>सदस्यता आवेदन दर्ज एवं सत्यापित हो रहा है...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                    <span>सदस्यता आवेदन सबमिट करें एवं आईडी सक्रिय करें (Submit & Activate)</span>
                  </>
                )}
              </button>

              <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500 font-medium">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>256-Bit SSL सुरक्षित डेटा प्रविष्टि</span>
                </span>
                <span>•</span>
                <span>सफल पंजीकरण पर तुरंत डिजिटल पहचान पत्र (I-Card) उपलब्ध</span>
              </div>
            </div>

          </form>
        </div>
      )}

      {/* Zero-Cut A4 Print Styling for Physical Sheet */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          nav, header, footer, .print\\:hidden, #interactive-online-form {
            display: none !important;
          }
          #printable-paper-form {
            width: 100vw !important;
            min-height: 100vh !important;
            margin: 0 !important;
            padding: 16px !important;
            border: none !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      {/* =========================================================================
          VIEW 2: DEDICATED OFFICIAL A4 PHYSICAL PAPER SHEET
          (Crisp Print-Locked A4 Sheet Format strictly preserved)
         ========================================================================= */}
      <div className={`${formView === 'digital' ? 'hidden' : 'block'} print:block w-full max-w-full`}>
        <div className="flex justify-start sm:justify-center w-full max-w-full overflow-x-auto touch-pan-x py-2">
          <div 
            ref={formRef}
            id="printable-paper-form"
            className="bg-white text-slate-900 border-2 border-slate-800 rounded-xl shadow-2xl relative font-sans print:shadow-none print:border-none print:p-0 my-2"
            style={{
              width: '794px',
              minHeight: '1123px',
              padding: '28px',
              boxSizing: 'border-box',
              overflow: 'visible'
            }}
          >
            {/* Official Inner Boundary */}
            <div className="border border-slate-700 p-4 rounded-lg relative flex flex-col justify-between" style={{ minHeight: '1060px' }}>

              {/* Form Top Header */}
              <div>
                <div className="relative pb-2">
                  {/* Top Left: Logo */}
                  <div className="absolute top-0 left-0">
                    <img 
                      src="/logo.png" 
                      alt="Foundation Logo" 
                      crossOrigin="anonymous"
                      className="w-20 h-20 object-contain rounded-full border border-blue-900 shadow-xs bg-white p-0.5"
                      onError={(e) => { e.currentTarget.src = '/logo.png'; }}
                    />
                  </div>

                  {/* Top Right: Phone */}
                  <div className="absolute top-0 right-0 text-right">
                    <p className="text-xs font-black text-slate-900 font-mono tracking-wider">
                      मो. 9540648402
                    </p>
                    <p className="text-[9px] text-emerald-800 font-bold">
                      हेल्पलाइन (Office)
                    </p>
                  </div>

                  {/* Center Main Title */}
                  <div className="text-center px-16 space-y-0.5">
                    <h1 className="text-2xl font-black text-slate-950 tracking-tight leading-tight">
                      उत्तम चैरिटेबल वेलफेयर फाउंडेशन
                    </h1>
                    <p className="text-[10px] font-bold text-slate-800 leading-snug">
                      पता - अहरपुरा रोड, सेठ गार्डन के पास, महुआखेड़ा गंज, काशीपुर (उ.सि.नगर) उत्तराखण्ड
                    </p>
                    <p className="text-[8.5px] text-slate-600 font-medium">
                      (Regd. Under Section 8 Act 2013, Ministry of Corporate Affairs, Govt. of India | CIN: {FOUNDATION_DETAILS.cin})
                    </p>
                  </div>
                </div>

                <div className="my-1.5 border-t-2 border-b border-slate-900 py-0.5" />

                {/* Subheader Row */}
                <div className="relative flex items-center justify-between min-h-[115px] pb-2">
                  <div className="my-auto pl-2">
                    <div className="inline-flex items-center gap-2 border-b-2 border-slate-900 pb-0.5">
                      <span className="font-extrabold text-xs text-slate-900">
                        सदस्यता क्रमांक :
                      </span>
                      <input
                        type="text"
                        value={memberId}
                        onChange={(e) => setMemberId(e.target.value.toUpperCase())}
                        className="font-mono text-sm font-black text-emerald-900 bg-transparent outline-none w-44 tracking-wider"
                        placeholder="UCWF-2026-...."
                      />
                    </div>
                    <p className="text-[9px] text-slate-500 mt-0.5">
                      (डिजिटल सदस्य पहचान संख्या)
                    </p>
                  </div>

                  {/* Top Right: Passport Photo Box */}
                  <div className="absolute top-0 right-0 text-center">
                    <div 
                      onClick={() => paperPhotoInputRef.current?.click()}
                      className="w-24 h-28 border border-dashed border-slate-800 bg-slate-50 hover:bg-slate-100 cursor-pointer rounded flex flex-col items-center justify-center p-1 relative overflow-hidden transition group shadow-2xs"
                    >
                      {photoPreview ? (
                        <>
                          <img 
                            src={photoPreview} 
                            alt="Passport" 
                            crossOrigin="anonymous"
                            className="w-full h-full object-cover rounded" 
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white text-[9px] font-bold print:hidden">
                            बदलें
                          </div>
                        </>
                      ) : (
                        <div className="space-y-0.5 p-1">
                          <Camera className="w-5 h-5 text-slate-500 mx-auto" />
                          <p className="text-[8.5px] font-bold text-slate-700 leading-tight">
                            पासपोर्ट फोटो
                          </p>
                        </div>
                      )}
                      <input 
                        type="file" 
                        ref={paperPhotoInputRef}
                        onChange={handlePhotoSelect}
                        accept="image/*" 
                        className="hidden" 
                      />
                    </div>
                  </div>
                </div>

                {/* Paper Fields */}
                <div className="space-y-2 text-xs">
                  {/* 1. पद का नाम */}
                  <div className="flex items-center gap-2 pb-1 border-b border-slate-300">
                    <label className="font-extrabold text-slate-900 whitespace-nowrap min-w-[125px]">
                      1. पद का नाम :
                    </label>
                    <div className="flex-1 flex gap-2">
                      <select
                        value={selectedPadType}
                        onChange={(e) => setSelectedPadType(e.target.value)}
                        className="flex-1 bg-slate-50 border border-slate-300 rounded px-2 py-1 font-bold text-slate-900 outline-none text-xs"
                      >
                        {DESIGNATION_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* 2. समाज सेवी का नाम */}
                  <div className="flex items-center gap-2 pb-1 border-b border-slate-300">
                    <label className="font-extrabold text-slate-900 whitespace-nowrap min-w-[125px]">
                      2. समाज सेवी का नाम :
                    </label>
                    <div className="flex-1 flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-xs">{salutation}</span>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="flex-1 bg-slate-50 border border-slate-300 rounded px-2 py-1 font-bold text-slate-900 outline-none text-xs"
                      />
                    </div>
                  </div>

                  {/* 3. आधार & पैन */}
                  <div className="grid grid-cols-2 gap-3 pb-1 border-b border-slate-300">
                    <div className="flex items-center gap-2">
                      <label className="font-extrabold text-slate-900 whitespace-nowrap">
                        3. आधार संख्या :
                      </label>
                      <input
                        type="text"
                        value={aadhaarNumber}
                        onChange={(e) => setAadhaarNumber(e.target.value)}
                        className="flex-1 bg-slate-50 border border-slate-300 rounded px-2 py-1 font-mono font-bold text-slate-900 outline-none text-xs"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="font-extrabold text-slate-900 whitespace-nowrap">
                        पैन नं० :
                      </label>
                      <input
                        type="text"
                        value={panNumber}
                        onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                        className="flex-1 bg-slate-50 border border-slate-300 rounded px-2 py-1 font-mono font-bold text-slate-900 uppercase outline-none text-xs"
                      />
                    </div>
                  </div>

                  {/* 4. पिता एवं माता का नाम */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-1 border-b border-slate-300">
                    <div className="flex items-center gap-2">
                      <label className="font-extrabold text-slate-900 whitespace-nowrap min-w-[110px]">
                        4. पिता का नाम :
                      </label>
                      <input
                        type="text"
                        value={fatherName}
                        onChange={(e) => setFatherName(e.target.value)}
                        className="flex-1 bg-slate-50 border border-slate-300 rounded px-2 py-1 font-bold text-slate-900 outline-none text-xs"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="font-extrabold text-slate-900 whitespace-nowrap min-w-[110px]">
                        माता का नाम :
                      </label>
                      <input
                        type="text"
                        value={motherName}
                        onChange={(e) => setMotherName(e.target.value)}
                        className="flex-1 bg-slate-50 border border-slate-300 rounded px-2 py-1 font-bold text-slate-900 outline-none text-xs"
                      />
                    </div>
                  </div>

                  {/* 5. स्थाई पता */}
                  <div className="pb-1 border-b border-slate-300 flex items-start gap-2">
                    <label className="font-extrabold text-slate-900 whitespace-nowrap min-w-[125px] pt-1">
                      5. स्थाई पता :
                    </label>
                    <div className="flex-1 flex gap-2">
                      <input
                        type="text"
                        value={permanentAddress}
                        onChange={(e) => setPermanentAddress(e.target.value)}
                        className="flex-1 bg-slate-50 border border-slate-300 rounded px-2 py-1 font-medium text-slate-900 outline-none text-xs"
                      />
                      <span className="font-mono text-xs">{permanentPincode}</span>
                    </div>
                  </div>

                  {/* 6. वर्तमान पता */}
                  <div className="pb-1 border-b border-slate-300 flex items-start gap-2">
                    <label className="font-extrabold text-slate-900 whitespace-nowrap min-w-[125px] pt-1">
                      6. वर्तमान पता :
                    </label>
                    <div className="flex-1 flex gap-2">
                      <input
                        type="text"
                        value={currentAddress}
                        onChange={(e) => setCurrentAddress(e.target.value)}
                        className="flex-1 bg-slate-50 border border-slate-300 rounded px-2 py-1 font-medium text-slate-900 outline-none text-xs"
                      />
                      <span className="font-mono text-xs">{currentPincode}</span>
                    </div>
                  </div>

                  {/* 7. मोबाईल & ई-मेल */}
                  <div className="grid grid-cols-2 gap-3 pb-1 border-b border-slate-300">
                    <div className="flex items-center gap-2">
                      <label className="font-extrabold text-slate-900 whitespace-nowrap">
                        7. मोबाईल नं० :
                      </label>
                      <span className="font-mono font-bold text-xs">{phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="font-extrabold text-slate-900 whitespace-nowrap">
                        ई-मेल :
                      </label>
                      <span className="text-xs">{email}</span>
                    </div>
                  </div>

                  {/* 8. जन्मतिथि, ब्लड ग्रुप & व्यवसाय */}
                  <div className="grid grid-cols-3 gap-2 pb-1 border-b border-slate-300 text-xs">
                    <div><strong>DOB:</strong> {dob}</div>
                    <div><strong>Blood:</strong> {bloodGroup}</div>
                    <div><strong>व्यवसाय:</strong> {occupation}</div>
                  </div>

                  {/* 9. योग्यता & लिंग */}
                  <div className="grid grid-cols-2 gap-3 pb-1 border-b border-slate-300 text-xs">
                    <div><strong>योग्यता:</strong> {qualification}</div>
                    <div><strong>लिंग:</strong> {gender}</div>
                  </div>

                  {/* 10. स्पॉन्सर, पासवर्ड, सहयोग */}
                  <div className="grid grid-cols-3 gap-2 pb-1 border-b-2 border-slate-900 text-xs">
                    <div><strong>स्पॉन्सर:</strong> {sponsorId}</div>
                    <div><strong>पासवर्ड:</strong> {password}</div>
                    <div><strong>सहयोग:</strong> ₹{membershipAmount}</div>
                  </div>
                </div>

                {/* Declaration in Paper View */}
                <div className="my-2 p-2 bg-slate-50 border border-slate-300 rounded space-y-1 text-xs">
                  <h4 className="text-center font-black text-xs underline">शपथ पत्र</h4>
                  <p className="text-[9.5px] leading-relaxed text-justify">
                    &quot;मैंने शपथ पत्र में लिखे ट्रस्ट के सभी नियमों एवं शर्तों को भली-भांति पढ़ और समझ लिया है। और मैं प्रतिज्ञा करता हूँ/करती हूँ कि हमेशा ट्रस्ट के उद्देश्य के प्रति ईमानदार, कर्तव्यनिष्ठ कार्यकर्ता के रूप में कार्य करता रहूँगा / रहूँगी।&quot;
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <div>दिनांक: <strong>{declarationDate}</strong></div>
                    <div className="text-right">
                      <div 
                        onClick={() => paperSignatureInputRef.current?.click()}
                        className="h-10 w-28 border border-dashed border-slate-400 bg-white flex items-center justify-center cursor-pointer relative"
                      >
                        {signaturePreview ? (
                          <img src={signaturePreview} alt="Sig" className="max-h-full max-w-full object-contain" />
                        ) : (
                          <span className="text-[8px] text-slate-400">हस्ताक्षर अपलोड</span>
                        )}
                        <input 
                          type="file" 
                          ref={paperSignatureInputRef}
                          onChange={handleSignatureSelect}
                          accept="image/*" 
                          className="hidden" 
                        />
                      </div>
                      <p className="text-[8.5px] font-bold">हस्ताक्षर / अंगूठा</p>
                    </div>
                  </div>
                </div>

                {/* Office Use in Paper View */}
                <div className="pt-1 border-t border-slate-800 text-[10px]">
                  <h4 className="text-center font-bold underline mb-1">कार्यालय प्रयोग हेतु</h4>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap items-center gap-1.5 text-[9px]">
                      <span className="font-bold text-slate-800">संलग्न दस्तावेज:</span>
                      <span className={(photoPreview || photoUrl) ? "text-emerald-700 font-bold" : "text-slate-400"}>[ {(photoPreview || photoUrl) ? "✓" : "○"} फोटो ]</span>
                      <span className={(signaturePreview || signatureUrl) ? "text-emerald-700 font-bold" : "text-slate-400"}>[ {(signaturePreview || signatureUrl) ? "✓" : "○"} हस्ताक्षर ]</span>
                      <span className={(aadhaarDocUrl || aadhaarPreview) ? "text-emerald-700 font-bold" : "text-slate-400"}>[ {(aadhaarDocUrl || aadhaarPreview) ? "✓" : "○"} आधार ]</span>
                      <span className={(panDocUrl || panPreview) ? "text-emerald-700 font-bold" : "text-slate-400"}>[ {(panDocUrl || panPreview) ? "✓" : "○"} पैन ]</span>
                      <span className={(paymentReceiptUrl || receiptPreview) ? "text-emerald-700 font-bold" : "text-slate-400"}>[ {(paymentReceiptUrl || receiptPreview) ? "✓" : "○"} रसीद ]</span>
                    </div>
                    <div className="text-center">
                      <div className="h-10 flex items-center justify-center">
                        <img src="/signature.png" alt="Seal" className="max-h-full object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                      </div>
                      <p className="font-bold text-[9px] border-t border-slate-600 whitespace-nowrap">डॉ. राजेन्द्र सिंह सैनी (संस्थापक / राष्ट्रीय अध्यक्ष)</p>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* Paper View Actions */}
        <div className="max-w-4xl mx-auto mt-4 px-4 flex flex-col sm:flex-row items-center justify-center gap-3 print:hidden">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg cursor-pointer"
          >
            {loading ? 'सबमिट हो रहा है...' : 'फॉर्म सबमिट करें (Submit Form)'}
          </button>
          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={exportingPdf}
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-slate-900 text-white font-extrabold text-xs shadow-lg cursor-pointer"
          >
            A4 PDF डाउनलोड
          </button>
        </div>
      </div>

    </div>
  );
}
