import React, { useState, useRef } from 'react';
import { 
  UserPlus, 
  CheckCircle2, 
  IndianRupee, 
  Copy, 
  Check, 
  Printer, 
  ArrowRight, 
  Loader2,
  ShieldCheck,
  User,
  Phone,
  Lock,
  MapPin,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { formatINR, safeText } from '../lib/constants';
import { distribute12LevelCommission } from '../utils/commission';

const PRESET_AMOUNTS = [500, 1100, 2100, 5100, 11000];

export default function NewJoiningSection({ defaultSponsorId = '', onRegistered = null }) {
  const fileRef = useRef(null);
  const photoRef = useRef(null);
  const inputRef = useRef(null);

  const { registerUser, member, userProfile } = useAuth();
  const currentMemId = userProfile?.memberId || member?.memberId || '';

  const [sponsorId, setSponsorId] = useState(defaultSponsorId || currentMemId || 'UCWF-0001');
  const [salutation, setSalutation] = useState('श्री');
  const [name, setName] = useState('');
  const [fatherOrSpouseName, setFatherOrSpouseName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('UCWF@1234');
  const [donationAmount, setDonationAmount] = useState(1100);
  const [customAmount, setCustomAmount] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('काशीपुर');
  const [state, setState] = useState('उत्तराखण्ड');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successData, setSuccessData] = useState(null);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);

  const activeAmount = customAmount ? Number(customAmount) : donationAmount;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('कृपया सदस्य का नाम दर्ज करें (Please enter member name)');
      return;
    }
    const cleanPhone = phone.trim().replace(/\D/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length !== 10) {
      setErrorMsg('कृपया 10 अंकों का वैध मोबाइल नंबर दर्ज करें (Please enter 10-digit mobile)');
      return;
    }
    if (!activeAmount || activeAmount <= 0) {
      setErrorMsg('कृपया वैध डोनेशन राशि चुनें या दर्ज करें (Please choose donation amount)');
      return;
    }

    setSubmitting(true);
    try {
      const cleanPass = password.trim() || cleanPhone || 'UCWF@1234';
      const cleanSponsor = sponsorId.trim().toUpperCase() || 'UCWF-0001';

      const memberPayload = {
        salutation,
        name: name.trim(),
        displayName: `${salutation} ${name.trim()}`.trim(),
        fatherOrSpouseName: fatherOrSpouseName.trim(),
        fatherName: fatherOrSpouseName.trim(),
        phone: cleanPhone,
        password: cleanPass,
        plainPassword: cleanPass,
        sponsorId: cleanSponsor,
        packageAmount: activeAmount,
        packageTier: activeAmount,
        selfBusiness: activeAmount,
        amount: activeAmount,
        donationAmount: activeAmount,
        currentAddress: address.trim(),
        permanentAddress: address.trim(),
        city: city.trim(),
        state: state.trim(),
        status: 'active',
        isApproved: true,
        paymentVerified: true,
        kycVerified: true,
        joiningDate: new Date().toISOString()
      };

      const newMember = await registerUser(memberPayload);

      // Auto-trigger 12-level upline commission calculation
      try {
        await distribute12LevelCommission(newMember.uid, activeAmount);
      } catch (err) {
        console.warn('Upline commission distribution notice:', err);
      }

      setSuccessData(newMember);
      if (onRegistered) onRegistered(newMember);
    } catch (err) {
      console.error('Registration error:', err);
      setErrorMsg(err.message || 'पंजीकरण विफल रहा। कृपया पुनः प्रयास करें।');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setName('');
    setFatherOrSpouseName('');
    setPhone('');
    setPassword('UCWF@1234');
    setCustomAmount('');
    setDonationAmount(1100);
    setAddress('');
    setSuccessData(null);
    setErrorMsg('');
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-200 shadow-sm max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 pb-6 border-b border-emerald-100">
        <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/30">
          <UserPlus className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <span>New Joining / डोनेशन</span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold font-mono">
              Instant Auto-Activation
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            किसी भी स्पॉन्सर आईडी के तहत नए सदस्य का त्वरित पंजीकरण करें। खाता तुरंत सक्रिय होगा और 12-लेवल में मानदेय क्रेडिट होगा।
          </p>
        </div>
      </div>

      {successData ? (
        /* Success Screen */
        <div className="mt-6 p-6 sm:p-8 rounded-3xl bg-emerald-50 border-2 border-emerald-400 text-center space-y-6 animate-fadeIn">
          <div className="w-16 h-16 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-600/30">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <span className="px-3 py-1 rounded-full bg-emerald-200 text-emerald-900 text-xs font-black uppercase tracking-wider">
              सफलतापूर्वक पंजीकृत एवं सक्रिय (Activated)
            </span>
            <h3 className="text-2xl font-black text-slate-900 mt-3 font-serif">
              {safeText(successData.salutation)} {safeText(successData.name)}
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              डोनेशन संकल्प राशि: <strong className="text-emerald-800 font-mono text-sm">{formatINR(successData.packageAmount || activeAmount)}</strong>
            </p>
          </div>

          {/* Credentials Card */}
          <div className="max-w-md mx-auto bg-white p-5 rounded-2xl border border-emerald-300 shadow-sm space-y-3 text-left">
            <div className="flex items-center justify-between py-1 border-b border-slate-100">
              <span className="text-xs text-slate-500 font-bold">सदस्य आईडी (Member ID):</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-black text-emerald-900 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                  {successData.memberId}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(successData.memberId);
                    setCopiedId(true);
                    setTimeout(() => setCopiedId(false), 2000);
                  }}
                  className="text-slate-400 hover:text-emerald-700 p-1"
                  title="Copy ID"
                >
                  {copiedId ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-100">
              <span className="text-xs text-slate-500 font-bold">लॉगिन पासवर्ड (Password):</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-slate-900 bg-slate-50 px-2.5 py-0.5 rounded border border-slate-200">
                  {successData.plainPassword || successData.password}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(successData.plainPassword || successData.password);
                    setCopiedPass(true);
                    setTimeout(() => setCopiedPass(false), 2000);
                  }}
                  className="text-slate-400 hover:text-emerald-700 p-1"
                  title="Copy Password"
                >
                  {copiedPass ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-100">
              <span className="text-xs text-slate-500 font-bold">मोबाइल नंबर:</span>
              <span className="font-mono text-xs font-bold text-slate-800">{successData.phone}</span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-xs text-slate-500 font-bold">स्पॉन्सर आईडी:</span>
              <span className="font-mono text-xs font-black text-amber-900">{successData.sponsorId}</span>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleResetForm}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition active:scale-95 cursor-pointer"
            >
              + अन्य नया सदस्य जोड़ें
            </button>
          </div>
        </div>
      ) : (
        /* Registration Form */
        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-800 text-xs font-bold">
              {errorMsg}
            </div>
          )}

          {/* 1. Sponsor ID */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              स्पॉन्सर आईडी (Sponsor ID) *
            </label>
            <input
              type="text"
              value={sponsorId}
              onChange={(e) => setSponsorId(e.target.value.toUpperCase())}
              placeholder="UCWF-2026-XXXX या मोबाइल नंबर"
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-[11px] text-slate-500">
              जिस सदस्य के डायरेक्ट (Level 1) में यह नया सदस्य जुड़ेगा। (डिफ़ॉल्ट: आपकी आईडी)
            </p>
          </div>

          {/* 2. Donation Amount Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              सहयोग संकल्प / डोनेशन राशि (Donation Amount) *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {PRESET_AMOUNTS.map((amt) => {
                const isSelected = !customAmount && donationAmount === amt;
                return (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      setDonationAmount(amt);
                      setCustomAmount('');
                    }}
                    className={`py-3 px-3 rounded-2xl text-xs font-black border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/30'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50'
                    }`}
                  >
                    <span className="block text-sm">₹{amt.toLocaleString('en-IN')}</span>
                    <span className="text-[10px] font-medium opacity-80">
                      {amt === 500 ? 'प्राथमिक' : amt === 1100 ? 'सक्रिय' : amt === 2100 ? 'विशिष्ट' : amt === 5100 ? 'संरक्षक' : 'भामाशाह'}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="pt-1">
              <input
                type="number"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="अथवा अन्य इच्छित डोनेशन राशि दर्ज करें (₹)"
                className="w-full sm:w-72 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* 3. Member Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Salutation + Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                पूरा नाम (Full Name) *
              </label>
              <div className="flex gap-2">
                <select
                  value={salutation}
                  onChange={(e) => setSalutation(e.target.value)}
                  className="w-24 px-2 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-800"
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
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="सदस्य का नाम दर्ज करें"
                  required
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Father / Spouse Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                पिता / पति का नाम (Father / Spouse Name)
              </label>
              <input
                type="text"
                value={fatherOrSpouseName}
                onChange={(e) => setFatherOrSpouseName(e.target.value)}
                placeholder="पिता अथवा पति का नाम"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Mobile Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                मोबाइल नंबर (10 Digits Mobile) *
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10 अंकों का मोबाइल नंबर"
                maxLength={10}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Login Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                लॉगिन पासवर्ड (Default: UCWF@1234)
              </label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="पासवर्ड दर्ज करें"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Address */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                पता (Address)
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="ग्राम / मोहल्ला, पोस्ट, तहसील..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* City */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                शहर / जिला (City)
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* State */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                राज्य (State)
              </label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">
              संकल्प राशि: <strong className="font-mono text-emerald-800 text-sm">₹{activeAmount.toLocaleString('en-IN')}</strong> (तुरंत एक्टिवेट होगा)
            </span>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm shadow-md shadow-emerald-600/30 flex items-center gap-2 transition active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>पंजीकृत हो रहा है...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>पंजीकरण एवं एक्टिवेट करें (Register Now)</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
