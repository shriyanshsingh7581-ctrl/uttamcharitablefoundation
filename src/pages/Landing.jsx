import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HeartHandshake,
  Users,
  Award,
  Crown,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Calendar,
  MapPin,
  TrendingUp,
  ShieldCheck,
  Building2,
  ChevronDown,
  Phone,
  Mail,
  Heart,
  Droplets,
  Glasses,
  BookOpen,
  Gift,
  Sun,
  Layers,
  Check,
  Star,
  CreditCard,
  QrCode,
  ArrowLeftRight,
  Calculator,
  IndianRupee,
  FileCheck2,
  ExternalLink,
  HelpCircle,
  Clock,
  ChevronRight,
  Shield,
  GraduationCap,
  Network,
  Trees,
  Flame,
  Activity,
  HandHeart,
  Landmark,
  BadgePercent,
  CheckCheck,
  Camera,
  Play,
} from 'lucide-react';
import Layout from '../components/layout/Layout';
import SpendTracker from '../components/SpendTracker';
import SafeIcon from '../components/ui/SafeIcon';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { db, ref, onValue } from '../lib/firebase';
import {
  PACKAGES,
  COMMISSION_RATES,
  LEVEL_NAMES,
  FOUNDATION_NAME,
  FOUNDATION_NAME_HINDI,
  FOUNDATION_SHORT,
  FOUNDATION_TAGLINE,
  FOUNDATION_TAGLINE_HINDI,
  FOUNDATION_LOGO,
  CONTACT_INFO,
  UPI_ID,
} from '../lib/constants';

// Animated Counter for Live Stats
const AnimatedCounter = ({ target, suffix = '', duration = 1.5 }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = parseInt(target, 10);
    if (isNaN(end) || end <= 0) {
      setCount(0);
      return;
    }

    const totalSteps = 35;
    const increment = Math.ceil(end / totalSteps);
    const stepTime = (duration * 1000) / totalSteps;

    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [target, duration]);

  return (
    <span>
      {count.toLocaleString('en-IN')}
      {suffix}
    </span>
  );
};

export default function Landing() {
  const fileRef = useRef(null);
  const photoRef = useRef(null);
  const inputRef = useRef(null);
  const { t, isHindi } = useLanguage();
  const { member } = useAuth();

  // Calculator State
  const [selectedCalcAmount, setSelectedCalcAmount] = useState(5100);
  const [directReferrals, setDirectReferrals] = useState(5);

  // FAQ Accordion State
  const [activeFaq, setActiveFaq] = useState(null);

  // Showcase Tabs: 'idCard' | 'certificate'
  const [showcaseTab, setShowcaseTab] = useState('certificate');

  // Real-time Database stats from Firebase RTDB
  const [realStats, setRealStats] = useState({
    totalSpent: 0,
    totalBeneficiaries: 0,
    totalMembers: 0,
  });

  // Listen to Firebase RTDB for genuine public stats
  useEffect(() => {
    let unsubSpends = null;
    let unsubMembers = null;

    try {
      const spendsRef = ref(db, 'spends');
      unsubSpends = onValue(spendsRef, (snap) => {
        if (snap.exists()) {
          const val = snap.val();
          let sSum = 0;
          let bSum = 0;
          Object.values(val).forEach((item) => {
            sSum += Number(item.amount) || 0;
            bSum += Number(item.beneficiaries) || 0;
          });
          setRealStats((prev) => ({ ...prev, totalSpent: sSum, totalBeneficiaries: bSum }));
        } else {
          setRealStats((prev) => ({ ...prev, totalSpent: 0, totalBeneficiaries: 0 }));
        }
      });

      const membersRef = ref(db, 'users');
      unsubMembers = onValue(membersRef, (snap) => {
        if (snap.exists()) {
          const val = snap.val();
          const mCount = Object.keys(val).length;
          setRealStats((prev) => ({ ...prev, totalMembers: mCount }));
        } else {
          setRealStats((prev) => ({ ...prev, totalMembers: 0 }));
        }
      });
    } catch (err) {
      console.warn('Realtime stats fetch note:', err);
    }

    return () => {
      if (unsubSpends) unsubSpends();
      if (unsubMembers) unsubMembers();
    };
  }, []);

  // 4 Core Welfare Pillars (Tata Trusts / Smile Foundation Ethos)
  const welfarePillars = [
    {
      id: 'education',
      title: 'शिक्षा उत्थान व छात्रवृत्ति',
      titleEnglish: 'Child Education & Student Welfare',
      icon: GraduationCap,
      color: 'emerald',
      tag: 'Education',
      descriptionHindi:
        'आर्थिक रूप से कमजोर परिवारों के मेधावी छात्र-छात्राओं को निःशुल्क पाठ्य सामग्री, स्कूल बैग, ड्रेस एवं नियमित छात्रवृत्ति सहायता।',
      descriptionEnglish:
        'Sponsoring school kits, uniforms, textbooks, and merit-cum-need scholarships for underprivileged children to prevent school dropouts.',
      metrics: 'सैकड़ों विद्यार्थियों को नियमित सहायता',
    },
    {
      id: 'healthcare',
      title: 'स्वास्थ्य व चिकित्सा राहत',
      titleEnglish: 'Healthcare & Medical Relief',
      icon: Activity,
      color: 'teal',
      tag: 'Healthcare',
      descriptionHindi:
        'ग्रामीण एवं मलिन बस्तियों में निःशुल्क नेत्र जांच, मोतियाबिंद ऑपरेशन, दवा वितरण शिविर एवं 24x7 आपातकालीन रक्तदाता नेटवर्क।',
      descriptionEnglish:
        'Organizing mega free health camps, cataract surgeries, free medicine distribution, and emergency blood donor networks.',
      metrics: 'निःशुल्क परामर्श एवं दवा वितरण',
    },
    {
      id: 'cowcare',
      title: 'गौ सेवा एवं पर्यावरण संरक्षण',
      titleEnglish: 'Cow Care & Green Environment',
      icon: Trees,
      color: 'amber',
      tag: 'Environment & Gau Seva',
      descriptionHindi:
        'बेसहारा गौवंश हेतु सुरक्षित गौशालाओं का संचालन, नियमित हरा चारा, चिकित्सा व्यवस्था एवं व्यापक वृक्षारोपण अभियान।',
      descriptionEnglish:
        'Dedicated care for stray indigenous cows, daily green fodder, veterinary treatments, and massive tree plantation missions.',
      metrics: 'दैनिक चारा एवं गौशाला सेवा',
    },
    {
      id: 'empowerment',
      title: 'सत्संग, नारी सशक्तिकरण व समरसता',
      titleEnglish: 'Spiritual Seva & Women Self-Reliance',
      icon: HandHeart,
      color: 'blue',
      tag: 'Social Harmony',
      descriptionHindi:
        'सामूहिक सत्संग, नैतिक शिक्षा, ग्रामीण महिलाओं हेतु सिलाई-कढ़ाई स्वरोजगार प्रशिक्षण एवं असहाय परिवारों को सूखा राशन सहायता।',
      descriptionEnglish:
        'Spiritual congregations, vocational stitching training for rural women, communal harmony, and monthly dry ration kits for poor families.',
      metrics: 'आत्मनिर्भर महिला स्वरोजगार',
    },
  ];

  // Frequently Asked Questions
  const faqs = [
    {
      q: isHindi
        ? 'उत्तम चैरिटेबल वेलफेयर फाउंडेशन की कानूनी मान्यता क्या है?'
        : 'What is the official legal status and registration of UCWF?',
      a: isHindi
        ? 'उत्तम चैरिटेबल वेलफेयर फाउंडेशन भारत सरकार के कंपनी अधिनियम 2013 की धारा 8 (Section 8 Act 2013) के अंतर्गत पंजीकृत राष्ट्रीय स्तर का गैर-लाभकारी (Non-Profit) ट्रस्ट है। रजिस्ट्रेशन संख्या: U88900UT2026NPL022025, PAN: AAECU2542G, TAN: MRTU05120D है। इसका मुख्यालय काशीपुर (उधम सिंह नगर, उत्तराखण्ड) में स्थित है।'
        : 'Uttam Charitable Welfare Foundation is an officially incorporated Section 8 Non-Profit Organization under the Ministry of Corporate Affairs, Govt. of India. Registration Number: U88900UT2026NPL022025, PAN: AAECU2542G, TAN: MRTU05120D with head office in Kashipur (U.S. Nagar), Uttarakhand.',
    },
    {
      q: isHindi
        ? '12-स्तरीय सेवा सहयोग प्रोत्साहन (Community Commission) कैसे काम करता है?'
        : 'How does the transparent 12-Level Community Incentive work?',
      a: isHindi
        ? 'जब भी कोई नया सदस्य आपके माध्यम से या आपकी 12-स्तरीय टीम में किसी भी सेवा योजना (₹500 से ₹11,000) से जुड़ता है, तो कुल 50% राशि पारदर्शी रूप से 12 स्तरों में तुरंत वितरित की जाती है (स्तर 1: 20%, स्तर 2: 8%, स्तर 3: 5%, स्तर 4: 4%, स्तर 5: 3%, स्तर 6: 2.5%, स्तर 7: 2%, स्तर 8: 1.5%, स्तर 9-12: 1-1%)। यह राशि तुरंत आपके वॉलेट में जुड़ती है।'
        : 'Whenever a new member joins through your link or anywhere within your 12-level genealogy tree across any package (₹500 to ₹11,000), a total of 50% referral incentive is credited transparently across the 12 upline levels (Level 1: 20%, Level 2: 8%, Level 3: 5%, Level 4: 4%, Level 5: 3%, Level 6: 2.5%, Level 7: 2%, Level 8: 1.5%, Levels 9–12: 1% each) directly to your Seva wallet.',
    },
    {
      q: isHindi
        ? 'सदस्यता शुल्क का भुगतान कैसे करें और UTR नंबर क्या होता है?'
        : 'How do I complete the membership contribution and submit UTR?',
      a: isHindi
        ? 'पंजीकरण फॉर्म में योजना चुनने के बाद आधिकारिक UPI QR कोड प्रदर्शित होता है। PhonePe, Google Pay, Paytm या BHIM से भुगतान करें। भुगतान के बाद मिलने वाला 12-अंकों का UPI UTR (Transaction ID) फॉर्म में दर्ज करें। सत्यापन होते ही आपका डिजिटल आईडी कार्ड और प्रशस्ति पत्र तुरंत सक्रिय हो जाता है।'
        : 'After selecting your membership tier, the official Foundation QR code is generated. Scan and pay via PhonePe, GPay, Paytm, or BHIM. Enter the 12-digit numeric UPI UTR reference number from your receipt. Your digital ID card and appreciation certificate are activated upon verification.',
    },
    {
      q: isHindi
        ? 'वॉलेट से बैंक खाते में निकासी (Withdrawal) की क्या प्रक्रिया है?'
        : 'What is the procedure for withdrawing funds to bank / UPI?',
      a: isHindi
        ? 'न्यूनतम निकासी सीमा ₹500 है। आप अपने वॉलेट सेक्शन में जाकर सीधे अपने बैंक खाते या UPI आईडी में निकासी अनुरोध दर्ज कर सकते हैं। 24-48 घंटों के भीतर बैंक द्वारा सीधे आपके खाते में भुगतान प्रेषित किया जाता है।'
        : 'The minimum withdrawal threshold is ₹500. Submit a payout request to your bank account or UPI ID from your Seva Wallet. Withdrawals are processed within 24 to 48 business hours.',
    },
  ];

  return (
    <Layout>
      {/* =========================================================================
          SECTION 1: HERO SECTION (AUTHENTIC HIGH-TRUST NATIONAL NGO PORTAL)
         ========================================================================= */}
      <section className="relative overflow-hidden pt-8 pb-16 sm:pt-12 sm:pb-20 bg-[#FBFBFA] border-b border-emerald-950/5">
        {/* Subtle Ambient Decorative Circles */}
        <div className="absolute top-0 right-10 w-96 h-96 bg-emerald-700/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto space-y-5">
            {/* National Compliance Pill */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-900 text-xs sm:text-sm font-bold shadow-xs"
            >
              <Landmark className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>
                {isHindi
                  ? 'भारत सरकार कंपनी अधिनियम 2013 (धारा 8) पंजीकृत राष्ट्रीय सेवा न्यास'
                  : 'Incorporated under Section 8 Act 2013, Ministry of Corporate Affairs (Govt. of India)'}
              </span>
            </motion.div>

            {/* Inspiring Humanitarian Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight leading-[1.15]"
            >
              <span className="block text-emerald-950 font-serif">मानव सेवा ही माधव सेवा</span>
              <span className="text-2xl sm:text-4xl lg:text-5xl font-black bg-gradient-to-r from-emerald-800 via-teal-700 to-amber-700 bg-clip-text text-transparent">
                Empowering Lives Through Selfless Service
              </span>
            </motion.h1>

            {/* Credible Mission Description */}
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-sm sm:text-base lg:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed font-medium"
            >
              {isHindi
                ? 'उत्तम चैरिटेबल वेलफेयर फाउंडेशन गरीब परिवारों की शिक्षा, निःशुल्क स्वास्थ्य शिविर, गौ सेवा एवं 12-स्तरीय आत्मनिर्भर सामुदायिक समृद्धि हेतु समर्पित 100% पारदर्शी राष्ट्रीय सामाजिक संगठन है।'
                : 'Uttam Charitable Welfare Foundation is a prestigious Section 8 NGO dedicated to rural child education, free healthcare relief, cow care, and transparent 12-level community self-reliance.'}
            </motion.p>

            {/* Hero CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4"
            >
              <Link
                to="/register"
                className="w-full sm:w-auto min-h-[48px] px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 hover:from-emerald-900 hover:to-teal-900 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-emerald-900/20 hover:shadow-xl transition-all flex items-center justify-center gap-2 group cursor-pointer"
              >
                <span>{isHindi ? 'सदस्यता लें (Join as Member)' : 'Join as Active Member'}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                to="/register?tier=seva_mitra"
                className="w-full sm:w-auto min-h-[48px] px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-sm sm:text-base shadow-md shadow-amber-500/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <HeartHandshake className="w-5 h-5 text-slate-950" />
                <span>{isHindi ? 'सहयोग व दान करें (Donate & Support)' : 'Donate & Support'}</span>
              </Link>

              <a
                href="#causes"
                className="w-full sm:w-auto min-h-[48px] px-6 py-3.5 rounded-2xl bg-white hover:bg-stone-100 text-gray-700 font-bold text-sm border border-gray-200 shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>{isHindi ? 'सेवा क्षेत्र देखें' : 'Explore Welfare Pillars'}</span>
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </a>
            </motion.div>

            {/* Official Trust Highlights Under CTA */}
            <div className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
              {[
                { title: 'Section 8 Regd.', sub: 'MCA Govt. of India', icon: Landmark },
                { title: '100% Tax Compliant', sub: 'PAN & TAN Certified', icon: ShieldCheck },
                { title: 'Live Spend Tracker', sub: 'Public Audit Ledger', icon: FileCheck2 },
                { title: 'Direct UPI & Bank', sub: 'Real-time Verification', icon: QrCode },
              ].map((item, idx) => {
                return (
                  <div
                    key={idx}
                    className="p-3 bg-white rounded-2xl border border-gray-200/80 shadow-xs flex items-center gap-2.5"
                  >
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0">
                      <SafeIcon icon={item.icon} fallback={ShieldCheck} className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-gray-900 leading-tight">
                        {item.title}
                      </span>
                      <span className="block text-[10px] text-gray-500 leading-tight">
                        {item.sub}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 2: 4 CORE WELFARE PILLARS / MISSION CARDS (Tata Trusts Ethos)
         ========================================================================= */}
      <section id="causes" className="py-16 sm:py-20 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase tracking-wider mb-2">
              <HandHeart className="w-3.5 h-3.5 text-emerald-600" />
              <span>सेवा एवं जनकल्याण के चार प्रमुख स्तंभ</span>
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
              Our Core Welfare Missions & Social Pillars
            </h2>
            <p className="text-sm text-gray-500 mt-2 font-medium">
              हम समाज के अंतिम छोर पर खड़े हर नागरिक तक शिक्षा, स्वास्थ्य, स्वावलंबन एवं पर्यावरण संरक्षण की रोशनी पहुंचा रहे हैं।
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {welfarePillars.map((pillar) => {
              return (
                <div
                  key={pillar.id}
                  className="bg-[#FBFBFA] rounded-3xl p-6 border border-emerald-900/10 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-lg hover:border-emerald-700/30 transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-800 to-teal-800 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                      <SafeIcon icon={pillar.icon} fallback={HandHeart} className="w-6 h-6" />
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block mb-1">
                        {pillar.tag}
                      </span>
                      <h3 className="text-lg font-bold text-gray-900 leading-snug">
                        {isHindi ? pillar.title : pillar.titleEnglish}
                      </h3>
                      <p className="text-xs text-gray-500 font-medium mt-1">
                        {isHindi ? pillar.titleEnglish : pillar.title}
                      </p>
                    </div>

                    <p className="text-xs text-gray-600 leading-relaxed font-medium">
                      {isHindi ? pillar.descriptionHindi : pillar.descriptionEnglish}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-gray-200/60 flex items-center justify-between text-xs">
                    <span className="text-[11px] font-bold text-emerald-800">
                      {pillar.metrics}
                    </span>
                    <Link
                      to="/register"
                      className="text-amber-800 hover:text-amber-900 font-extrabold flex items-center gap-0.5"
                    >
                      <span>सहयोग दें</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 3: TRANSPARENT PUBLIC EXPENDITURE TRACKER (Zero Fake Data)
         ========================================================================= */}
      <section className="py-16 sm:py-20 bg-stone-50/60 border-b border-gray-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 uppercase tracking-wider mb-2">
              <FileCheck2 className="w-3.5 h-3.5 text-amber-700" />
              <span>100% सार्वजनिक एवं पारदर्शी वित्तीय विवरण</span>
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
              Live Foundation Expenditure & Seva Tracker
            </h2>
            <p className="text-sm text-gray-500 mt-2 font-medium">
              उत्तम फाउंडेशन द्वारा समाज कल्याण में खर्च की गई प्रत्येक धनराशि का वास्तविक विवरण, वाउचर एवं बैंक UTR संदर्भ सार्वजनिक रूप से उपलब्ध है।
            </p>
          </div>

          {/* Real-time Spend Component */}
          <SpendTracker />
        </div>
      </section>

      {/* =========================================================================
          SECTION 4: COMMUNITY WELFARE MEMBERSHIP TIERS (₹500 to ₹11,000)
         ========================================================================= */}
      <section id="packages" className="py-16 sm:py-20 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>आजीवन सेवा सदस्यता योजनाएं (Lifetime Membership Tiers)</span>
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
              Choose Your Welfare Membership Plan
            </h2>
            <p className="text-sm text-gray-500 mt-2 font-medium">
              अपनी श्रद्धा एवं सामर्थ्यानुसार सेवा योजना से जुड़ें। सभी सदस्यों को आधिकारिक डिजिटल आईडी कार्ड, सम्मान पत्र एवं 12-स्तरीय सेवा प्रोत्साहन प्राप्त होता है।
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-5">
            {PACKAGES.map((pkg) => {
              const isPopular = pkg.amount === 5100;
              return (
                <div
                  key={pkg.id}
                  className={`relative rounded-3xl p-5 border flex flex-col justify-between transition-all bg-white ${
                    isPopular
                      ? 'border-amber-400 ring-2 ring-amber-400/30 shadow-xl'
                      : 'border-gray-200 shadow-sm hover:shadow-md'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-[10px] uppercase tracking-wider shadow-sm">
                      Most Popular Plan
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl">{pkg.badge}</span>
                      <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        Section 8
                      </span>
                    </div>

                    <h3 className="text-base font-extrabold text-gray-900">
                      {isHindi ? pkg.nameHindi : pkg.name}
                    </h3>
                    <p className="text-xs text-gray-500 font-medium">
                      {isHindi ? pkg.name : pkg.nameHindi}
                    </p>

                    <div className="my-3">
                      <span className="text-2xl sm:text-3xl font-black text-emerald-950">
                        ₹{pkg.amount.toLocaleString('en-IN')}
                      </span>
                      <span className="text-xs text-gray-400 block font-medium">
                        आजीवन सदस्यता (One-time)
                      </span>
                    </div>

                    <p className="text-[11px] text-gray-600 leading-relaxed font-medium mb-3">
                      {pkg.description}
                    </p>

                    <ul className="space-y-1.5 text-xs text-gray-700 border-t border-gray-100 pt-3">
                      {pkg.benefits.slice(0, 4).map((b, bIdx) => (
                        <li key={bIdx} className="flex items-start gap-1.5 text-[11px]">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Link
                    to={`/register?tier=${pkg.id}`}
                    className={`mt-5 w-full py-2.5 px-4 rounded-xl font-bold text-xs text-center transition-all flex items-center justify-center gap-1.5 ${
                      isPopular
                        ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md font-extrabold'
                        : 'bg-emerald-800 hover:bg-emerald-900 text-white shadow-xs'
                    }`}
                  >
                    <span>{isHindi ? 'योजना चुनें' : 'Select Plan'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 5: 12-LEVEL COMMUNITY COMMISSION PLAN & INTERACTIVE CALCULATOR
         ========================================================================= */}
      <section id="income-plan" className="py-16 sm:py-20 bg-[#FBFBFA] border-b border-gray-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-900 border border-blue-300 uppercase tracking-wider mb-2">
              <Network className="w-3.5 h-3.5 text-blue-700" />
              <span>पारदर्शी 12-स्तरीय सेवा सहयोग चार्ट</span>
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
              12-Level Community Incentive Plan
            </h2>
            <p className="text-sm text-gray-500 mt-2 font-medium">
              फाउंडेशन के माध्यम से जरूरतमंदों की सेवा करने वाले प्रत्येक सेवा मित्र को 12 स्तरों में कुल 50% प्रत्यक्ष सेवा प्रोत्साहन प्रदान किया जाता है।
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Table of 12 Levels */}
            <div className="lg:col-span-7 bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-stone-50 px-5 py-3.5 border-b border-gray-200 flex items-center justify-between">
                <span className="text-xs font-black text-gray-700 uppercase tracking-wider">
                  Level Breakdown (स्तर वार विवरण)
                </span>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                  Total Distributed: 50.0%
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50/50 text-gray-500 uppercase font-bold text-[10px] border-b border-gray-100">
                    <tr>
                      <th className="py-2.5 px-4">Level</th>
                      <th className="py-2.5 px-4">Designation</th>
                      <th className="py-2.5 px-4 text-center">Incentive %</th>
                      <th className="py-2.5 px-4 text-right">Income on ₹5,100</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700 font-medium">
                    {COMMISSION_RATES.map((rate, idx) => {
                      const lvl = idx + 1;
                      const lvlInfo = LEVEL_NAMES[idx] || { name: `Level ${lvl}`, hindi: `स्तर ${lvl}` };
                      const incomeOn5100 = 5100 * rate;

                      return (
                        <tr key={lvl} className="hover:bg-emerald-50/30 transition-colors">
                          <td className="py-2.5 px-4 font-mono font-bold text-emerald-900">
                            Level {lvl}
                          </td>
                          <td className="py-2.5 px-4">
                            <span className="font-bold text-gray-900 block">{lvlInfo.name}</span>
                            <span className="text-[10px] text-gray-400 block">{lvlInfo.hindi}</span>
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-black text-xs border border-emerald-200">
                              {(rate * 100).toFixed(rate % 0.01 === 0 ? 0 : 1)}%
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-right font-black text-gray-900">
                            ₹{incomeOn5100.toFixed(0)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Interactive Calculator */}
            <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-emerald-900/10 shadow-lg space-y-5">
              <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
                <Calculator className="w-5 h-5 text-emerald-700" />
                <div>
                  <h3 className="text-base font-extrabold text-gray-900">
                    Interactive Earnings Calculator
                  </h3>
                  <p className="text-xs text-gray-500">
                    Calculate your community referral incentive dynamically
                  </p>
                </div>
              </div>

              {/* Select Package Tier */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  1. Select Membership Package / योजना:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[500, 1100, 2100, 5100, 11000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setSelectedCalcAmount(amt)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border ${
                        selectedCalcAmount === amt
                          ? 'bg-emerald-800 text-white border-emerald-800 shadow-sm'
                          : 'bg-stone-50 text-gray-700 border-gray-200 hover:bg-stone-100'
                      }`}
                    >
                      ₹{amt.toLocaleString('en-IN')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Direct Referrals Slider */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  <span>2. Direct Level 1 Members:</span>
                  <span className="text-emerald-800 font-mono text-sm bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    {directReferrals} Members
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={directReferrals}
                  onChange={(e) => setDirectReferrals(Number(e.target.value))}
                  className="w-full accent-emerald-700 cursor-pointer"
                />
              </div>

              {/* Calculator Results */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-900 to-teal-900 text-white space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="text-xs text-emerald-200 font-medium">Direct Level 1 Income (20%):</span>
                  <span className="text-lg font-black text-amber-400">
                    ₹{(selectedCalcAmount * 0.20 * directReferrals).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="text-xs text-emerald-200 font-medium">Level 2 Team Potential (8%):</span>
                  <span className="text-sm font-bold text-white">
                    ₹{(selectedCalcAmount * 0.08 * directReferrals * 3).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-[10px] uppercase text-emerald-300 font-bold block">
                      Total 12-Level Team Potential
                    </span>
                    <span className="text-2xl font-black text-white">
                      ₹{(selectedCalcAmount * 0.50 * directReferrals * 8).toLocaleString('en-IN')}+
                    </span>
                  </div>
                  <Link
                    to="/register"
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-md"
                  >
                    Start Now
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 6: OFFICIAL I-CARD & PURASKAR LETTER SHOWCASE
         ========================================================================= */}
      <section className="py-16 sm:py-20 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 uppercase tracking-wider mb-2">
              <Award className="w-3.5 h-3.5 text-amber-700" />
              <span>आधिकारिक पहचान पत्र एवं सम्मान पत्र</span>
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
              Official Digital I-Card & Puraskar Letter
            </h2>
            <p className="text-sm text-gray-500 mt-2 font-medium">
              फाउंडेशन के प्रत्येक सक्रिय सदस्य को सत्यापन उपरांत आधिकारिक स्मार्ट क्यूआर डिजिटल आई-कार्ड एवं ए4 लैंडस्केप प्रशस्ति पत्र जारी किया जाता है।
            </p>
          </div>

          {/* Toggle Tabs */}
          <div className="flex justify-center mb-8">
            <div className="p-1 bg-stone-100 rounded-2xl flex items-center gap-1 border border-gray-200">
              <button
                type="button"
                onClick={() => setShowcaseTab('certificate')}
                className={`px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  showcaseTab === 'certificate'
                    ? 'bg-emerald-800 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                📜 Puraskar Letter (प्रशस्ति पत्र)
              </button>
              <button
                type="button"
                onClick={() => setShowcaseTab('idCard')}
                className={`px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  showcaseTab === 'idCard'
                    ? 'bg-emerald-800 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                🪪 Digital I-Card (स्मार्ट पहचान पत्र)
              </button>
            </div>
          </div>

          {/* Showcase Display Container */}
          <div className="max-w-4xl mx-auto">
            {showcaseTab === 'certificate' ? (
              <div className="bg-amber-50/40 p-6 sm:p-10 rounded-3xl border-4 border-amber-500/40 shadow-2xl relative overflow-hidden text-center space-y-4">
                <div className="flex items-center justify-between border-b border-amber-300 pb-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={FOUNDATION_LOGO}
                      alt="Logo"
                      className="w-12 h-12 rounded-full bg-white p-0.5 object-contain shadow-xs border border-amber-400"
                    />
                    <div className="text-left">
                      <h4 className="text-sm sm:text-base font-extrabold text-emerald-950">
                        {FOUNDATION_NAME_HINDI}
                      </h4>
                      <p className="text-[10px] text-amber-800 font-bold">
                        {FOUNDATION_TAGLINE_HINDI}
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-[10px] text-gray-500 font-mono">
                    <div>Regd: {CONTACT_INFO.regNumber}</div>
                    <div>PAN: {CONTACT_INFO.panNumber}</div>
                  </div>
                </div>

                <div className="py-4 space-y-2">
                  <span className="inline-block px-4 py-1 rounded-full bg-amber-500 text-slate-950 font-black text-xs sm:text-sm tracking-wider uppercase shadow-xs">
                    प्रशस्ति एवं सम्मान पत्र / Certificate of Appreciation
                  </span>
                  <p className="text-xs text-gray-500 pt-2 font-medium">यह प्रमाणित किया जाता है कि</p>
                  <h3 className="text-xl sm:text-3xl font-serif font-black text-emerald-950">
                    {member?.full_name || 'सम्मानित सेवा सदस्य (Foundation Member)'}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-700 max-w-2xl mx-auto leading-relaxed font-medium">
                    ने उत्तम चैरिटेबल वेलफेयर फाउंडेशन के सामाजिक कल्याण, जन-सेवा एवं राष्ट्र निर्माण के कार्यों में अपना अमूल्य योगदान देकर मानवता की सेवा का उत्कृष्ट उदाहरण प्रस्तुत किया है।
                  </p>
                </div>

                <div className="pt-4 border-t border-amber-300 flex items-center justify-between text-xs text-gray-600">
                  <span className="font-mono">Date: {new Date().toLocaleDateString('en-IN')}</span>
                  <Link
                    to="/certificates"
                    className="px-4 py-2 rounded-xl bg-emerald-800 text-white font-bold text-xs hover:bg-emerald-900"
                  >
                    View & Download Your Certificate
                  </Link>
                </div>
              </div>
            ) : (
              <div className="max-w-md mx-auto bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 text-white rounded-3xl p-6 shadow-2xl border border-emerald-500/40 space-y-4">
                <div className="flex items-center justify-between border-b border-white/20 pb-3">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={FOUNDATION_LOGO}
                      alt="Logo"
                      className="w-10 h-10 rounded-full bg-white p-0.5 object-contain"
                    />
                    <div>
                      <h4 className="text-xs font-black text-white">{FOUNDATION_SHORT}</h4>
                      <p className="text-[10px] text-amber-300 font-semibold">{FOUNDATION_NAME_HINDI}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                    OFFICIAL ID
                  </span>
                </div>

                <div className="flex items-center gap-4 py-2">
                  <div className="w-16 h-16 rounded-2xl bg-amber-500 text-slate-950 font-black text-xl flex items-center justify-center shrink-0 shadow-md">
                    {(member?.full_name || 'M').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-white truncate">
                      {member?.full_name || 'Foundation Member'}
                    </h3>
                    <p className="text-xs font-mono text-emerald-300">
                      ID: {member?.member_id || 'UCWF-2026-XXXX'}
                    </p>
                    <p className="text-xs font-semibold text-amber-300 mt-0.5">
                      {member?.package_name || 'Seva Mitra'} Tier
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] bg-black/20 p-2.5 rounded-xl border border-white/10 font-mono">
                  <div>Blood: <strong className="text-white">{member?.blood_group || 'O+'}</strong></div>
                  <div>Valid: <strong className="text-emerald-300">Lifetime</strong></div>
                </div>

                <Link
                  to="/id-card"
                  className="block text-center w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md"
                >
                  Download Official I-Card
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 6.5: LIVE SEVA MEDIA GALLERY PREVIEW
         ========================================================================= */}
      <section className="py-16 sm:py-20 bg-gradient-to-b from-[#FBFBFA] to-stone-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 uppercase tracking-wider mb-2">
                <Camera className="w-3.5 h-3.5 text-amber-700" />
                <span>सजीव सेवा गैलरी • Real Seva Ground Impact</span>
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
                {isHindi ? 'सेवा गतिविधियों की सजीव झलकियां' : 'Live Seva Activity & Welfare Gallery'}
              </h2>
              <p className="text-sm text-gray-500 mt-1 max-w-xl">
                {isHindi
                  ? 'हमारे सेवा मित्रों द्वारा आयोजित निःशुल्क चिकित्सा शिविर, अन्नदान, एवं गौ-सेवा की तस्वीरें व वीडियो।'
                  : 'Live photos and videos of food drives, medical relief camps, and cow sanctuaries across India.'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/gallery"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md shadow-emerald-700/20 active:scale-95 transition-all"
              >
                <span>{isHindi ? 'पूरी गैलरी देखें (Explore All)' : 'Explore Full Gallery'}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="rounded-3xl bg-white border border-gray-100 shadow-sm overflow-hidden group hover:border-emerald-200 hover:shadow-md transition-all">
              <div className="relative aspect-video bg-emerald-950 flex items-center justify-center overflow-hidden">
                <img
                  src="/logo.png"
                  onError={(e) => { e.currentTarget.src = '/logo.png'; }}
                  alt="Medical Camp"
                  className="w-20 h-20 object-contain p-1 bg-white rounded-full shadow-lg group-hover:scale-110 transition-transform duration-300 border-2 border-blue-900"
                />
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/60 text-white text-[10px] font-bold uppercase backdrop-blur-md">
                  चिकित्सा शिविर
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-bold text-gray-900 text-sm">निःशुल्क स्वास्थ्य एवं नेत्र जांच शिविर</h3>
                <p className="text-xs text-gray-500 mt-1">
                  ग्रामीण क्षेत्रों में वरिष्ठ नागरिकों व बच्चों हेतु निःशुल्क दवा वितरण एवं नेत्र परीक्षण कार्यक्रम।
                </p>
              </div>
            </div>

            <div className="rounded-3xl bg-white border border-gray-100 shadow-sm overflow-hidden group hover:border-emerald-200 hover:shadow-md transition-all">
              <div className="relative aspect-video bg-amber-950 flex items-center justify-center overflow-hidden">
                <img
                  src="/logo.png"
                  onError={(e) => { e.currentTarget.src = '/logo.png'; }}
                  alt="Gau Seva"
                  className="w-20 h-20 object-contain p-1 bg-white rounded-full shadow-lg group-hover:scale-110 transition-transform duration-300 border-2 border-blue-900"
                />
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/60 text-white text-[10px] font-bold uppercase backdrop-blur-md">
                  गौ सेवा एवं संरक्षण
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-bold text-gray-900 text-sm">गौशालाओं में पौष्टिक आहार व चिकित्सा सेवा</h3>
                <p className="text-xs text-gray-500 mt-1">
                  बेसहारा व अस्वस्थ गौ-वंश के उपचार हेतु समर्पित एम्बुलेंस व निरंतर पौष्टिक चारे की व्यवस्था।
                </p>
              </div>
            </div>

            <div className="rounded-3xl bg-white border border-gray-100 shadow-sm overflow-hidden group hover:border-emerald-200 hover:shadow-md transition-all">
              <div className="relative aspect-video bg-teal-950 flex items-center justify-center overflow-hidden">
                <img
                  src="/logo.png"
                  onError={(e) => { e.currentTarget.src = '/logo.png'; }}
                  alt="Child Education"
                  className="w-20 h-20 object-contain p-1 bg-white rounded-full shadow-lg group-hover:scale-110 transition-transform duration-300 border-2 border-blue-900"
                />
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/60 text-white text-[10px] font-bold uppercase backdrop-blur-md">
                  शिक्षा उत्थान
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-bold text-gray-900 text-sm">निःशुल्क पाठ्य सामग्री एवं स्कूल किट वितरण</h3>
                <p className="text-xs text-gray-500 mt-1">
                  आर्थिक रूप से वंचित मेधावी बालिकाओं एवं बालकों को छात्रवृत्ति व पठन सामग्री सहायता।
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 7: LEGAL COMPLIANCE & DIRECT BANK/UPI TRUST DETAILS
         ========================================================================= */}
      <section className="py-16 sm:py-20 bg-stone-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl p-6 sm:p-10 border border-gray-200 shadow-md">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase tracking-wider mb-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>वैधानिक प्रमाण एवं शासकीय मान्यता</span>
                </span>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                  Official Statutory & Legal Compliance
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 mt-2 leading-relaxed font-medium">
                  उत्तम चैरिटेबल वेलफेयर फाउंडेशन भारत सरकार के कॉर्पोरेट कार्य मंत्रालय (Ministry of Corporate Affairs) से अधिकृत एवं आयकर विभाग से पूर्ण मान्यता प्राप्त है।
                </p>

                <div className="mt-5 space-y-2.5 text-xs text-gray-700">
                  <div className="p-3 bg-stone-50 rounded-xl border border-gray-200 flex items-center justify-between">
                    <span className="font-bold">CIN / Registration No.:</span>
                    <span className="font-mono font-bold text-emerald-900">{CONTACT_INFO.regNumber}</span>
                  </div>
                  <div className="p-3 bg-stone-50 rounded-xl border border-gray-200 flex items-center justify-between">
                    <span className="font-bold">Permanent Account Number (PAN):</span>
                    <span className="font-mono font-bold text-emerald-900">{CONTACT_INFO.panNumber}</span>
                  </div>
                  <div className="p-3 bg-stone-50 rounded-xl border border-gray-200 flex items-center justify-between">
                    <span className="font-bold">Tax Deduction Account Number (TAN):</span>
                    <span className="font-mono font-bold text-emerald-900">{CONTACT_INFO.tanNumber}</span>
                  </div>
                  <div className="p-3 bg-stone-50 rounded-xl border border-gray-200 flex items-center justify-between">
                    <span className="font-bold">Head Office:</span>
                    <span className="text-gray-900 font-semibold">{CONTACT_INFO.addressEnglish}</span>
                  </div>
                </div>
              </div>

              {/* Direct UPI Box */}
              <div className="p-6 bg-gradient-to-br from-emerald-950 via-teal-950 to-slate-950 text-white rounded-3xl shadow-xl border border-emerald-800/60 text-center space-y-4">
                <span className="text-xs uppercase tracking-wider text-amber-300 font-bold block">
                  Official Trust UPI Gateway
                </span>
                <p className="text-xs text-emerald-200">
                  Direct contributions are strictly routed to the official trust account
                </p>

                <div className="bg-white p-3.5 rounded-2xl inline-block shadow-md">
                  <div className="w-36 h-36 bg-stone-100 rounded-xl flex items-center justify-center p-2">
                    <QrCode className="w-32 h-32 text-slate-900" />
                  </div>
                </div>

                <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/20 inline-block font-mono text-sm font-bold text-amber-300">
                  {UPI_ID}
                </div>

                <p className="text-[11px] text-gray-400">
                  Accepted via GPay, PhonePe, Paytm, BHIM & CRED
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 8: BILINGUAL FREQUENTLY ASKED QUESTIONS (FAQS)
         ========================================================================= */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-800 uppercase tracking-wider mb-2">
              <HelpCircle className="w-3.5 h-3.5 text-gray-600" />
              <span>अक्सर पूछे जाने वाले प्रश्न (FAQ)</span>
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-gray-200 overflow-hidden bg-[#FBFBFA]"
                >
                  <button
                    type="button"
                    onClick={() => setActiveFaq(isOpen ? null : idx)}
                    className="w-full p-4 text-left font-bold text-sm text-gray-900 flex items-center justify-between gap-3"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-gray-500 transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 text-xs text-gray-600 leading-relaxed font-medium border-t border-gray-100 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </Layout>
  );
}

export { Landing };

