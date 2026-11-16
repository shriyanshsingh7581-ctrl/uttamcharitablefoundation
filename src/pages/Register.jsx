import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { 
  UserPlus, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  QrCode, 
  Copy, 
  Check, 
  IndianRupee, 
  CreditCard,
  Building2,
  Lock,
  Phone,
  Mail,
  User,
  MapPin,
  Loader2,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { rtdb } from '../lib/firebase';
import { ref, push, set } from 'firebase/database';
import { 
  FOUNDATION_DETAILS, 
  PACKAGES, 
  SALUTATIONS, 
  formatINR, 
  safeText 
} from '../lib/constants';
import PaperRegistrationForm from '../components/PaperRegistrationForm';
import SafeQRCode from '../components/ui/SafeQRCode';

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { registerUser } = useAuth();
  const { bi } = useLanguage();

  // Query parameters prefill
  const refParam = searchParams.get('ref') || 'DIRECT';
  const pkgParam = searchParams.get('package') || 'tier_500';

  // Preserved State for Hidden Payment section
  const [copiedUpi, setCopiedUpi] = useState(false);
  const selectedPkg = PACKAGES.find(p => p.id === pkgParam) || PACKAGES[0];
  const dynamicUpiUrl = `upi://pay?pa=${encodeURIComponent(FOUNDATION_DETAILS.upiId)}&pn=${encodeURIComponent(FOUNDATION_DETAILS.nameEnglish)}&am=${selectedPkg.amount}&cu=INR`;

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(FOUNDATION_DETAILS.upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  return (
    <div className="min-h-screen py-6 sm:py-8 px-2 sm:px-6 lg:px-8 w-full max-w-full overflow-x-hidden">
      
      {/* Official A4 Paper-Style Application Form Container */}
      <PaperRegistrationForm
        isAdminMode={false}
        initialSponsorId={refParam}
        initialPackageId={pkgParam}
        onSuccessCallback={(newMember) => {
          console.log('Member registration recorded:', newMember);
        }}
      />

      {/* Member Login Redirection Link */}
      <div className="max-w-4xl mx-auto text-center text-xs text-slate-500 font-medium py-6 print:hidden">
        {bi('पहले से पंजीकृत हैं?', 'Already registered?')}{' '}
        <Link to="/login" className="font-extrabold text-emerald-700 hover:text-emerald-800 underline">
          {bi('यहाँ से लॉगिन करें', 'Login to Member Portal')}
        </Link>
      </div>

      {/* =========================================================================
          PRESERVED HIDDEN PAYMENT OPTION (Strictly hidden for client review as requested)
         ========================================================================= */}
      <div className="hidden" style={{ display: 'none' }} aria-hidden="true">
        <div className="glass-card-premium rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2 pb-3.5 border-b border-slate-200/60">
            <CreditCard className="w-5 h-5 text-emerald-600" />
            <span>3. ऑनलाइन भुगतान एवं यूटीआर (UTR) प्रविष्टि</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Dynamic QR Presentation */}
            <div className="p-6 rounded-3xl glass-pill text-center flex flex-col items-center">
              <p className="text-xs font-bold text-slate-700 mb-3">
                सहयोग राशि: <strong className="text-emerald-700 text-base font-black">{formatINR(selectedPkg.amount)}</strong> का आधिकारिक QR कोड
              </p>
              <div className="p-4 bg-white rounded-2xl shadow-xl ring-2 ring-slate-100 inline-block">
                <SafeQRCode value={dynamicUpiUrl} size={192} fgColor="#064e3b" bgColor="#ffffff" />
              </div>
              <div className="mt-3 text-xs text-slate-500 space-y-1.5">
                <p className="font-medium">Google Pay • PhonePe • Paytm • BHIM</p>
                <div className="inline-flex items-center gap-2 font-mono text-emerald-900 font-bold bg-white/80 px-3 py-1.5 rounded-xl border border-slate-200 text-xs shadow-2xs">
                  <span>{safeText(FOUNDATION_DETAILS.upiId)}</span>
                  <button
                    type="button"
                    onClick={handleCopyUpi}
                    className="text-slate-500 hover:text-emerald-700 transition"
                  >
                    {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* UTR Input details */}
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-950 space-y-1.5 backdrop-blur-md">
                <p className="font-extrabold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>भुगतान के बाद UTR अवश्य दर्ज करें</span>
                </p>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  QR कोड स्कैन करके भुगतान पूरा होने पर आपको 12 अंकों का UTR / UPI Ref / Transaction ID प्राप्त होगा।
                </p>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-1.5">
                  12 अंकों का UTR / Transaction No. *
                </label>
                <input
                  type="text"
                  placeholder="उदा. 4289XXXXXXXX अथवा बैंक रेफरेंस नंबर"
                  defaultValue=""
                  className="w-full px-4 py-3 rounded-2xl glass-input text-xs font-mono font-bold text-slate-900 outline-none"
                />
              </div>

              <div className="pt-2 text-xs text-slate-500 space-y-1">
                <p className="font-bold text-slate-700">फाउंडेशन बैंक खाता विवरण:</p>
                <p>बैंक: {safeText(FOUNDATION_DETAILS.bankDetails.bankName)}</p>
                <p className="font-mono">खाता: {safeText(FOUNDATION_DETAILS.bankDetails.accountNo)} | IFSC: {safeText(FOUNDATION_DETAILS.bankDetails.ifsc)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
