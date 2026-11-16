/**
 * Official Constants for Uttam Charitable Welfare Foundation
 * (उत्तम चैरिटेबल वेलफेयर फाउंडेशन)
 * Section 8 Company Registered under Ministry of Corporate Affairs (MCA), Govt. of India
 */

export const FOUNDATION_NAME = "Uttam Charitable Welfare Foundation";
export const FOUNDATION_NAME_HINDI = "उत्तम चैरिटेबल वेलफेयर फाउंडेशन";
export const FOUNDATION_SHORT = "UCWF";
export const FOUNDATION_TAGLINE = "Sabka Saath • Sabka Vikas • Sabka Kalyan";
export const FOUNDATION_TAGLINE_HINDI = "सबका साथ • सबका विकास • सबका कल्याण";
export const FOUNDATION_ESTD = "2026";

// Official Government Registrations & Tax Compliance Details
export const GOVT_REG_NO = "U88900UT2026NPL022025";
export const GOVT_ACT = "Section 8 Act 2013, Ministry of Corporate Affairs, Govt. of India";
export const PAN_NO = "AAECU2542G";
export const TAN_NO = "MRTU05120D";
export const HEAD_OFFICE = "अहरपुरा रोड, सेठ गार्डन के पास, महुआखेड़ा गंज, काशीपुर (उधम सिंह नगर) उत्तराखण्ड";
export const HEAD_OFFICE_SHORT = "काशीपुर (उधम सिंह नगर) उत्तराखण्ड";

// Contact Details
export const CONTACT_PHONE = "+91 9540648402";
export const CONTACT_PHONE_RAW = "9540648402";
export const CONTACT_WHATSAPP = "919540648402";
export const CONTACT_EMAIL = "uttamcharitablewelfarefoundati@gmail.com";
export const OFFICIAL_WEBSITE = "https://www.ucwf.online";

// Default Banking & UPI Configuration
export const DEFAULT_UPI_ID = "9540648402@okbizaxis";
export const DEFAULT_ACCOUNT_NAME = "Uttam Charitable Welfare Foundation";
export const DEFAULT_ACCOUNT_NO = "924020012345678";
export const DEFAULT_IFSC = "UTIB0000456";
export const DEFAULT_BANK_NAME = "Axis Bank Ltd., Kashipur Branch";

export const FOUNDATION_SHORT_NAME = FOUNDATION_SHORT;

// Official Leadership / Founder & National President
export const PRESIDENT_NAME = "Dr. Rajendra Singh Saini";
export const PRESIDENT_NAME_ENGLISH = PRESIDENT_NAME;
export const PRESIDENT_NAME_HINDI = "डॉ. राजेन्द्र सिंह सैनी";
export const PRESIDENT_ROLE = "Founder / National President";
export const PRESIDENT_ROLE_ENGLISH = PRESIDENT_ROLE;
export const PRESIDENT_ROLE_HINDI = "संस्थापक / राष्ट्रीय अध्यक्ष";

// Official Signature and Stamp Asset Path
export const PRESIDENT_SIGNATURE_STAMP_URL = "/signature.png";
export const FOUNDATION_LOGO = "/logo.png";
export const FOUNDATION_LOGO_URL = "/logo.png";
export const FOUNDATION_LOGO_FALLBACK = "/logo.png";

export const UPI_ID = DEFAULT_UPI_ID;
export const MIN_WITHDRAWAL = 100;

export const HEAD_OFFICE_ENGLISH =
  "Aharpura Road, Near Seth Garden, Mahuakhera Ganj, Kashipur (Udham Singh Nagar), Uttarakhand";

export const CONTACT_INFO = {
  regNumber: GOVT_REG_NO,
  panNumber: PAN_NO,
  tanNumber: TAN_NO,
  actType: GOVT_ACT,
  address: HEAD_OFFICE,
  addressEnglish: HEAD_OFFICE_ENGLISH,
  phone: CONTACT_PHONE,
  whatsapp: CONTACT_WHATSAPP,
  email: CONTACT_EMAIL,
  website: OFFICIAL_WEBSITE,
};

export const LEVEL_NAMES = [
  { name: "Level 1 (Direct Sponsor)", hindi: "स्तर 1 (प्रत्यक्ष रेफरल)" },
  { name: "Level 2 (Associate Team)", hindi: "स्तर 2 (सहयोगी टीम)" },
  { name: "Level 3 (Community Builder)", hindi: "स्तर 3 (समुदाय निर्माता)" },
  { name: "Level 4 (Regional Coordinator)", hindi: "स्तर 4 (क्षेत्रीय समन्वयक)" },
  { name: "Level 5 (District Promoter)", hindi: "स्तर 5 (जिला प्रचारक)" },
  { name: "Level 6 (Division Leader)", hindi: "स्तर 6 (मंडल प्रमुख)" },
  { name: "Level 7 (State Organizer)", hindi: "स्तर 7 (राज्य संगठनकर्ता)" },
  { name: "Level 8 (Senior Mentor)", hindi: "स्तर 8 (वरिष्ठ मार्गदर्शक)" },
  { name: "Level 9 (Executive Advisor)", hindi: "स्तर 9 (कार्यकारी सलाहकार)" },
  { name: "Level 10 (National Patron)", hindi: "स्तर 10 (राष्ट्रीय संरक्षक)" },
  { name: "Level 11 (Honorary Fellow)", hindi: "स्तर 11 (मानद सदस्य)" },
  { name: "Level 12 (Grand Trustee)", hindi: "स्तर 12 (वरिष्ठ न्यासी)" },
];

// Fractional decimal rates (e.g., 0.20 = 20%) for Landing.jsx calculator & legacy tables
export const COMMISSION_RATES = [
  0.20, 0.08, 0.05, 0.04, 0.03, 0.025, 0.02, 0.015, 0.01, 0.01, 0.01, 0.01,
];

export const ADMIN_NAV_ITEMS = [
  { path: "/admin", label: "Admin Control Panel", icon: "LayoutDashboard" },
  { path: "/admin/dashboard", label: "Overview & Analytics", icon: "ClipboardCheck" },
  { path: "/admin/members", label: "Members & 12-Level Tree", icon: "Users" },
  { path: "/admin/approvals", label: "Payment Approvals", icon: "CheckCircle" },
  { path: "/admin/payouts", label: "Payouts & Withdrawals", icon: "Banknote" },
  { path: "/admin/certificates", label: "Certificates Manager", icon: "Award" },
  { path: "/admin/events", label: "Events & Seva Camps", icon: "Calendar" },
  { path: "/admin/media", label: "Media Approvals", icon: "Camera" },
];

// Comprehensive Structured Foundation Details
export const FOUNDATION_DETAILS = {
  name: FOUNDATION_NAME_HINDI,
  nameHindi: FOUNDATION_NAME_HINDI,
  nameEnglish: FOUNDATION_NAME,
  shortName: FOUNDATION_SHORT,
  tagline: FOUNDATION_TAGLINE_HINDI,
  taglineEnglish: FOUNDATION_TAGLINE,
  regNumber: GOVT_REG_NO,
  logoUrl: FOUNDATION_LOGO,
  cin: GOVT_REG_NO,
  pan: PAN_NO,
  tan: TAN_NO,
  act: GOVT_ACT,
  address: HEAD_OFFICE,
  addressEnglish: HEAD_OFFICE_ENGLISH,
  phone: CONTACT_PHONE,
  phoneRaw: CONTACT_PHONE_RAW,
  whatsapp: CONTACT_WHATSAPP,
  email: CONTACT_EMAIL,
  website: OFFICIAL_WEBSITE,
  upiId: DEFAULT_UPI_ID,
  presidentName: PRESIDENT_NAME,
  presidentNameEnglish: PRESIDENT_NAME_ENGLISH,
  presidentNameHindi: PRESIDENT_NAME_HINDI,
  presidentRole: PRESIDENT_ROLE,
  presidentRoleEnglish: PRESIDENT_ROLE_ENGLISH,
  presidentRoleHindi: PRESIDENT_ROLE_HINDI,
  bankDetails: {
    bankName: DEFAULT_BANK_NAME,
    accountName: DEFAULT_ACCOUNT_NAME,
    accountNo: DEFAULT_ACCOUNT_NO,
    ifsc: DEFAULT_IFSC,
    branch: "Kashipur (Udham Singh Nagar, Uttarakhand)"
  }
};

// 5 Official Membership Packages
export const PACKAGES = [
  {
    id: "tier_500",
    tier: 500,
    amount: 500,
    name: "Seva Mitra",
    nameHindi: "प्राथमिक सेवा संकल्प",
    nameEnglish: "Bronze Partner",
    badge: "🌱",
    color: "emerald",
    benefits: [
      "आधिकारिक डिजिटल आई-कार्ड (Smart QR सहित)",
      "प्रशस्ति पत्र (Certificate of Appreciation)",
      "12-स्तरीय मानदेय वितरण नेटवर्क पात्रता",
      "गैलरी में सेवा कार्य फोटो/वीडियो अपलोड"
    ]
  },
  {
    id: "tier_1100",
    tier: 1100,
    amount: 1100,
    name: "Seva Bandhu",
    nameHindi: "सक्रिय समाज सेवी",
    nameEnglish: "Silver Partner",
    badge: "🌿",
    color: "teal",
    popular: false,
    benefits: [
      "सभी प्राथमिक सेवा संकल्प लाभ सम्मिलित",
      "फाउंडेशन के राज्यस्तरीय कार्यक्रमों में आमंत्रण",
      "जरूरतमंद बच्चों हेतु शिक्षा किट सहयोग",
      "उच्चतर 12-लेवल मानदेय नेटवर्क"
    ]
  },
  {
    id: "tier_2100",
    tier: 2100,
    amount: 2100,
    name: "Seva Ratna",
    nameHindi: "विशिष्ट सेवा सारथी",
    nameEnglish: "Gold Partner",
    badge: "💎",
    color: "blue",
    popular: true,
    benefits: [
      "सभी सक्रिय समाज सेवी लाभ सम्मिलित",
      "वार्षिक स्मारिका में विशेष सम्मान एवं उल्लेख",
      "आपातकालीन चिकित्सा सहायता में प्राथमिकता",
      "विशेष प्रशस्ति पत्र एवं स्मृति चिन्ह"
    ]
  },
  {
    id: "tier_5100",
    tier: 5100,
    amount: 5100,
    name: "Seva Shree",
    nameHindi: "समाज गौरव संरक्षक",
    nameEnglish: "Diamond Partner",
    badge: "👑",
    color: "amber",
    popular: false,
    benefits: [
      "सभी विशिष्ट सेवा सारथी लाभ सम्मिलित",
      "संस्था की संचालन समिति बैठकों में सहभागिता",
      "क्षेत्रीय सेवा अभियानों का नेतृत्व",
      "विशेष स्वर्ण बॉर्डर प्रशस्ति पत्र"
    ]
  },
  {
    id: "tier_11000",
    tier: 11000,
    amount: 11000,
    name: "Seva Samrat",
    nameHindi: "राष्ट्रीय कल्याण भामाशाह",
    nameEnglish: "Crown Trustee",
    badge: "🌟",
    color: "purple",
    popular: false,
    benefits: [
      "सर्वोच्च संरक्षक सदस्यता एवं स्थायी आमंत्रण",
      "अध्यक्ष एवं संस्थापक न्यासियों के साथ सीधा संपर्क",
      "राष्ट्रीय वार्षिक सम्मेलन में वीआईपी सम्मान",
      "फाउंडेशन के नीति निर्माण में परामर्शदाता"
    ]
  }
];

export const SEVA_PACKAGES = PACKAGES;

// Master Feature Flag: Instant Auto-Activation without Admin Approval Gate
// When false: Submitting any package form immediately activates account & credits 12-level generation commissions
// Set to true later from Admin Settings if manual approval workflow is re-enabled
export const ENABLE_MANUAL_APPROVAL = false;
export const REQUIRE_ADMIN_APPROVAL = false;

// Official Company Root Member IDs & Numbers
export const COMPANY_ROOT_IDS = [
  'UCWF-0001',
  'UCWF-2026-0001',
  '9540648402',
  '9411516035'
];

// Exact 12-Level Generation Commission Distribution Percentages (Client Confirmed Spec)
export const MLM_COMMISSION_RATES = [
  20,  // Level 1: 20% (Direct Sponsor)
  8,   // Level 2: 8%
  5,   // Level 3: 5%
  4,   // Level 4: 4%
  3,   // Level 5: 3%
  2.5, // Level 6: 2.5%
  2,   // Level 7: 2%
  1.5, // Level 8: 1.5%
  1,   // Level 9: 1%
  1,   // Level 10: 1%
  1,   // Level 11: 1%
  1    // Level 12: 1%
];

export const LEVEL_COMMISSION_PERCENTAGES = MLM_COMMISSION_RATES;

// Salutations (Single Choice Only - NO slashes)
export const SALUTATIONS = [
  { id: "shri", value: "श्री", label: "श्री (Mr.)" },
  { id: "shrimati", value: "श्रीमती", label: "श्रीमती (Mrs.)" },
  { id: "sushri", value: "सुश्री", label: "सुश्री (Ms.)" },
  { id: "mr", value: "Mr.", label: "Mr." },
  { id: "mrs", value: "Mrs.", label: "Mrs." }
];

export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

/**
 * Universal Safe Text Helper:
 * Ensures no JavaScript object or Firebase timestamp ever collapses into JSX child
 * Prevents React Error #31 and Error #130 permanently
 */
export const safeText = (val, fallback = "") => {
  if (val === null || val === undefined) return fallback;
  if (typeof val === "object") {
    if (val.seconds) {
      return new Date(val.seconds * 1000).toLocaleDateString("hi-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
    }
    if (val instanceof Date) {
      return val.toLocaleDateString("hi-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
    }
    return fallback;
  }
  return String(val);
};

/**
 * Global Currency Formatting Helper:
 * Strips any existing '₹', 'Rs', 'रुपये', 'INR' and extra whitespace.
 * Returns a single, clean formatted currency string like "₹1,100" (or "₹0" if invalid/empty).
 * Guarantees NO duplicate '₹₹', '₹ ₹', or 'रुपये रुपये'.
 */
export const formatCurrency = (val) => {
  if (val === null || val === undefined || val === '') return '₹0';
  const cleanStr = String(val).replace(/[₹\sRs\.रुपयेINR,]/gi, '').trim();
  const num = Number(cleanStr);
  if (isNaN(num)) return '₹0';
  return '₹' + num.toLocaleString('en-IN');
};

/**
 * Safe Indian Rupee formatting (e.g., ₹2,100)
 * Uses formatCurrency to ensure duplicate symbols are always cleaned
 */
export const formatINR = formatCurrency;
