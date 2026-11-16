import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';

// Central Translations Dictionary (हिन्दी ⇄ English)
export const TRANSLATIONS = {
  hi: {
    langName: 'हिन्दी',
    langCode: 'hi',
    // Header & Navigation
    nav: {
      home: 'मुख्य पृष्ठ',
      plans: 'योजनाएं / पैकेज',
      gallery: 'सेवा गैलरी',
      team: '12-स्तरीय टीम',
      spendTracker: 'खर्च विवरण',
      events: 'सेवा कार्यक्रम',
      idCard: 'डिजिटल आईडी कार्ड',
      certificate: 'सम्मान पत्र',
      dashboard: 'डैशबोर्ड',
      wallet: 'सेवा वॉलेट',
      profile: 'प्रोफ़ाइल एवं केवाईसी',
      adminLogin: 'एडमिन लॉगिन',
      adminPanel: 'प्रशासनिक पैनल',
      login: 'लॉगिन',
      joinNow: 'अभी जुड़ें',
      signOut: 'लॉग आउट',
      switchMemberView: 'सदस्य डैशबोर्ड पर जाएं',
      notifications: 'सूचनाएं',
      govtRegd: 'मान्यता प्राप्त एनजीओ',
    },
    // Diwali Festive Banner & Hero
    diwali: {
      bannerText: 'शुभ दीपावली! उत्तम चैरिटेबल वेलफेयर फाउंडेशन में आपका स्वागत है',
      subText: 'दीपावली सेवा महोत्सव • शुभ दीपावली एवं मंगलमय सेवा पर्व • 100% पारदर्शी समाज कल्याण',
      close: 'बंद करें',
    },
    hero: {
      badge: 'उत्तम चैरिटेबल वेलफेयर फाउंडेशन • राष्ट्रीय सेवा ट्रस्ट',
      titleLine1: 'सबका साथ • सबका विकास',
      titleLine2: 'सबका कल्याण',
      subtitle: 'भारत का अग्रणी सामाजिक कल्याण फाउंडेशन। स्वास्थ्य शिविर, निःशुल्क शिक्षा, आपातकालीन रक्तदान एवं 12-स्तरीय आत्मनिर्भर सेवा समृद्धि योजना।',
      joinPlanBtn: 'अभी योजना से जुड़ें',
      donateBtn: 'दान / सहयोग करें',
      explorePlanBtn: 'योजनाएं देखें',
      stats: {
        members: 'सक्रिय सेवा मित्र',
        distributed: 'कुल वितरित सहायता',
        districts: 'कवर किए गए जिले',
        transparency: 'वित्तीय पारदर्शिता',
      },
    },
    // Membership Packages
    packages: {
      sectionTitle: 'सदस्यता एवं सहयोग योजनाएं',
      sectionSubtitle: 'फाउंडेशन के साथ जुड़कर समाज सेवा में योगदान दें और 12-स्तरीय प्रत्यक्ष सहयोग प्राप्त करें',
      amountPrefix: '₹',
      joinBtn: 'अभी जुड़ें',
      featuresTitle: 'सदस्यता लाभ:',
      popularBadge: 'सबसे लोकप्रिय',
      upiPayTitle: 'UPI QR द्वारा भुगतान करें',
      upiPaySub: 'नीचे दिए गए क्यूआर कोड को किसी भी यूपीआई ऐप (GPay, PhonePe, Paytm, BHIM) से स्कैन करें',
      officialUpi: 'फाउंडेशन आधिकारिक UPI ID',
      copyUpi: 'कॉपी करें',
      copied: 'कॉपी हो गया!',
      enterUtrLabel: '12-अंकों का UPI UTR / Transaction Ref दर्ज करें *',
      utrPlaceholder: 'उदा. 428901234567 (ठीक 12 अंक)',
      utrValid: '12 अंक सत्यापित (Valid UTR)',
      utrRemaining: 'अंक शेष हैं',
      uploadReceipt: 'भुगतान रसीद / स्क्रीनशॉट (वैकल्पिक)',
      submitApplication: 'आवेदन जमा करें (Submit Verification)',
    },
    // 12-Level Income & Team
    income: {
      sectionTitle: '12-स्तरीय सेवा सहयोग योजना',
      sectionSubtitle: 'पारदर्शी स्तर-वार सहयोग वितरण चार्ट (Direct 20% से Level 12 तक)',
      level: 'स्तर (Level)',
      commission: 'सहयोग दर',
      estEarnings: 'अनुमानित आय',
      directLevel: 'स्तर 1 (प्रत्यक्ष)',
      tierLevels: 'स्तर',
      calculatorTitle: 'सहयोग आय कैलकुलेटर',
      calcInstruction: 'पैकेज राशि का चयन करें और प्रत्येक स्तर का प्रत्यक्ष लाभ देखें',
      totalPotential: 'कुल संभावित सेवा आय',
    },
    // Team Page
    team: {
      title: 'मेरी 12-स्तरीय टीम नेटवर्क',
      subtitle: 'आपके द्वारा एवं आपकी टीम द्वारा जोड़े गए सक्रिय सेवा मित्रों का संपूर्ण विवरण',
      totalMembers: 'कुल टीम सदस्य',
      directReferrals: 'प्रत्यक्ष सदस्य (Level 1)',
      activeGeneration: 'सक्रिय स्तर',
      totalEarned: 'कुल अर्जित सहयोग',
      searchMember: 'नाम या सदस्य आईडी से खोजें...',
      filterAll: 'सभी स्तर',
      noMembers: 'इस स्तर पर अभी कोई सदस्य नहीं है। अपना रेफरल लिंक साझा करें!',
      memberId: 'सदस्य आईडी',
      joinedDate: 'जुड़ने की तिथि',
      package: 'योजना',
      status: 'स्थिति',
      active: 'सक्रिय (Active)',
      pending: 'प्रतीक्षारत (Pending)',
    },
    // ID Card & Certificate
    idCard: {
      title: 'आधिकारिक डिजिटल पहचान पत्र',
      subtitle: 'यह पहचान पत्र सभी फाउंडेशन कार्यक्रमों, चिकित्सा शिविरों एवं सेवा कार्यों हेतु आपकी वैध मान्यता है।',
      badge: 'आधिकारिक पहचान पत्र',
      downloadPdf: 'आईडी कार्ड PDF डाउनलोड करें',
      downloadPng: 'आईडी कार्ड PNG डाउनलोड करें',
      shareCard: 'आईडी कार्ड साझा करें',
      validity: 'वैधता',
      bloodGroup: 'रक्त समूह',
      mobile: 'मोबाइल नंबर',
      address: 'पता',
      memberIdLabel: 'सदस्यता क्र.',
      govtNotice: 'भारत सरकार द्वारा मान्यता प्राप्त गैर-सरकारी संगठन',
    },
    puraskar: {
      title: 'सम्मान एवं सेवा प्रमाण-पत्र',
      subtitle: 'मानवता एवं राष्ट्र कल्याण में आपके अतुलनीय योगदान हेतु समर्पित प्रशस्ति पत्र',
      downloadPdf: 'प्रमाण-पत्र PDF डाउनलोड करें',
      downloadPng: 'प्रमाण-पत्र PNG डाउनलोड करें',
      presentedTo: 'सादर समर्पित',
      inRecognition: 'उत्कृष्ट समाज सेवा एवं समर्पण के सम्मान में',
      authorizedSign: 'अधिकृत हस्ताक्षर',
      foundationSeal: 'आधिकारिक मुहर',
    },
    // Wallet & Payouts
    wallet: {
      title: 'सेवा वॉलेट एवं पेआउट',
      subtitle: 'पारदर्शी आय, लेनदेन इतिहास एवं बैंक/UPI निकासी प्रबंधन',
      balance: 'उपलब्ध वॉलेट शेष',
      totalEarned: 'कुल अर्जित राशि',
      pendingPayouts: 'प्रतीक्षारत पेआउट',
      requestWithdrawal: 'निकासी का अनुरोध करें',
      minWithdrawal: 'न्यूनतम निकासी सीमा: ₹500',
      historyTitle: 'लेनदेन इतिहास',
      payoutsTitle: 'निकासी अनुरोध',
      amount: 'राशि',
      method: 'माध्यम',
      utrLabel: 'बैंक UTR / Ref नं.',
      date: 'दिनांक',
      statusApproved: 'स्वीकृत (भुगतान पूर्ण)',
      statusPending: 'प्रतीक्षारत (Pending)',
      statusRejected: 'अस्वीकृत',
      enterAmount: 'निकासी राशि दर्ज करें',
      selectMethod: 'भुगतान माध्यम चुनें',
      upiOption: 'UPI आईडी',
      bankOption: 'बैंक खाता (NEFT/IMPS)',
      accHolder: 'खाताधारक का नाम',
      accNumber: 'खाता संख्या',
      ifsc: 'IFSC कोड',
    },
    // Wallet & Business module (Handwritten Spec Match)
    business: {
      title: 'वॉलेट एवं बिज़नेस',
      subtitle: 'रीयलटाइम 4-कार्ड बिज़नेस व पेआउट अवलोकन',
      mainWallet: 'वॉलेट (Main Wallet)',
      mainWalletDesc: 'वर्तमान में उपलब्ध निकासी वॉलेट बैलेंस',
      teamBusiness: 'टीम बिज़नेस (Team Business)',
      teamBusinessDesc: 'संपूर्ण टीम (डायरेक्ट + डाउनलाइन) द्वारा संकलित कुल बिज़नेस',
      downlineBusiness: 'डाउनलाइन बिज़नेस (Downline Business)',
      downlineBusinessDesc: 'लेवल 2 से 12 तक के डाउनलाइन स्तरों द्वारा अर्जित बिज़नेस',
      selfBusiness: 'सेल्फ बिज़नेस (Self Business)',
      selfBusinessDesc: 'स्वयं की सदस्य आईडी पर संपन्न पैकेज व सहयोग राशि',
      withdrawBtn: 'पेआउट लें (Withdraw)',
      creditDebitHistory: 'क्रेडिट एवं डेबिट इतिहास',
      totalTeamMembers: 'कुल टीम सदस्य',
      directCount: 'डायरेक्ट सदस्य',
      downlineCount: 'डाउनलाइन सदस्य',
    },
    // Dedicated Payout Module (Handwritten Spec Match)
    payoutModule: {
      title: 'पेआउट एवं कमीशन विवरण',
      subtitle: '3-स्तरीय पारदर्शी कमीशन: डायरेक्ट, सेल्फ बिज़नेस एवं कुल कमीशन',
      directTeamCommission: 'डायरेक्ट टीम कमीशन (Direct Team Commission)',
      directTeamCommissionDesc: 'लेवल 1 के डायरेक्ट सदस्यों से अर्जित कुल कमीशन',
      selfBusinessCommission: 'सेल्फ बिज़नेस कमीशन (Self Business Commission)',
      selfBusinessCommissionDesc: 'स्वयं के बिज़नेस पर निर्धारित प्रतिशत अनुसार प्राप्त प्रोत्साहन राशि',
      downlineCommission: 'डाउनलाइन कमीशन (Downline Commission)',
      downlineCommissionDesc: 'लेवल 2 से 12 तक के डाउनलाइन नेटवर्क से अर्जित कमीशन',
      totalCommission: 'टोटल कमीशन (Total Commission)',
      totalCommissionDesc: 'सेल्फ + डायरेक्ट + डाउनलाइन का कुल कमीशन योग',
      totalPaid: 'कुल प्राप्त पेआउट (Total Paid)',
      netPayable: 'शुद्ध उपलब्ध शेष (Net Payable Balance)',
      directMembersTableTitle: 'डायरेक्ट टीम सदस्य कमीशन विवरण',
      directMembersTableSub: 'प्रत्येक डायरेक्ट सदस्य का नाम, सेल्फ बिज़नेस, दर एवं अर्जित मानदेय',
      memberId: 'सदस्य आईडी',
      memberName: 'सदस्य का नाम',
      memberSelfBusiness: 'सेल्फ बिज़नेस (₹)',
      commissionRate: 'कमीशन दर (%)',
      commissionEarned: 'अर्जित कमीशन (₹)',
      status: 'स्थिति',
      active: 'सक्रिय',
      pending: 'लंबित',
      noDirectMembers: 'अभी तक कोई डायरेक्ट सदस्य नहीं जुड़ा है। अपना रेफरल लिंक साझा करें!',
      searchPlaceholder: 'सदस्य आईडी या नाम से पेआउट खोजें...',
      searchBtn: 'खोजें',
    },
    // Spend Tracker
    spend: {
      title: 'फाउंडेशन खर्च विवरण एवं वित्तीय पारदर्शिता',
      subtitle: 'जनहित में खर्च किए गए प्रत्येक रुपये का 100% सत्यापित ब्यौरा एवं बैंक UTR रिकॉर्ड',
      totalSpent: 'कुल समाज सेवा खर्च',
      beneficiariesHelped: 'लाभान्वित नागरिक',
      verifiedAudits: '100% बैंक UTR ऑडिटेड',
      filterAll: 'सभी खर्च',
      education: 'बाल शिक्षा छात्रवृत्ति',
      healthcare: 'स्वास्थ्य एवं नेत्र शिविर',
      ration: 'राशन एवं पोषण सामग्री',
      festive: 'दीपावली सेवा व वस्त्र वितरण',
      verifiedUtrBadge: 'सत्यापित बैंक UTR',
      viewReceipt: 'रसीद देखें',
    },
    // Admin Panel
    admin: {
      title: 'प्रशासनिक नियंत्रण कक्ष',
      subtitle: 'सदस्य सत्यापन, पेआउट वितरण, खर्च प्रबंधन एवं रिपोर्ट',
      approvals: 'सदस्य सत्यापन (Approvals)',
      members: 'सक्रिय सदस्य सूची',
      payouts: 'पेआउट स्वीकृति एवं वितरण',
      spends: 'खर्च ट्रैकर प्रबंधक',
      events: 'कार्यक्रम प्रबंधन',
      certificates: 'प्रमाण-पत्र प्रबंधक',
      approveBtn: 'स्वीकृत करें (Approve)',
      rejectBtn: 'अस्वीकृत करें (Reject)',
      markPaidBtn: 'भुगतान पूर्ण दर्ज करें (Mark Paid)',
      enterBankUtr: '12-अंकों का बैंक UTR दर्ज करें',
      recordSpend: 'नया खर्च दर्ज करें',
    },
    // Common / UI
    common: {
      loading: 'लोड हो रहा है...',
      success: 'सफलतापूर्वक संपन्न',
      error: 'त्रुटि हुई, पुनः प्रयास करें',
      save: 'सुरक्षित करें',
      cancel: 'रद्द करें',
      close: 'बंद करें',
      back: 'वापस जाएं',
      next: 'अगला',
      search: 'खोजें...',
      copy: 'कॉपी करें',
      copied: 'कॉपी हो गया!',
      filter: 'फ़िल्टर',
      viewAll: 'सभी देखें',
      verified: 'सत्यापित',
    },
  },
  en: {
    langName: 'English',
    langCode: 'en',
    // Header & Navigation
    nav: {
      home: 'Home',
      plans: 'Membership Plans',
      gallery: 'Seva Gallery',
      team: '12-Level Team',
      spendTracker: 'Spend Tracker',
      events: 'Welfare Events',
      idCard: 'Digital ID Card',
      certificate: 'Certificate',
      dashboard: 'Dashboard',
      wallet: 'Seva Wallet',
      profile: 'Profile & KYC',
      adminLogin: 'Admin Login',
      adminPanel: 'Admin Panel',
      login: 'Login',
      joinNow: 'Join Now',
      signOut: 'Sign Out',
      switchMemberView: 'Switch to Member View',
      notifications: 'Notifications',
      govtRegd: 'Govt Regd. NGO',
    },
    // Diwali Festive Banner & Hero
    diwali: {
      bannerText: 'Happy Diwali! Welcome to Uttam Charitable Welfare Foundation',
      subText: 'Diwali Seva Mahotsav • Festive Charity Drive • 100% Financial Transparency',
      close: 'Close',
    },
    hero: {
      badge: 'Uttam Charitable Welfare Foundation • National Service Trust',
      titleLine1: 'Together With All • Progress For All',
      titleLine2: 'Welfare For All',
      subtitle: "India's premier charitable welfare foundation. Free healthcare camps, education subsidies, emergency blood bank, and 12-level self-reliance seva plan.",
      joinPlanBtn: 'Join Membership Plan',
      donateBtn: 'Donate / Support',
      explorePlanBtn: 'Explore Plans',
      stats: {
        members: 'Active Seva Mitras',
        distributed: 'Total Welfare Disbursed',
        districts: 'Districts Reached',
        transparency: 'Financial Transparency',
      },
    },
    // Membership Packages
    packages: {
      sectionTitle: 'Membership & Welfare Contribution Plans',
      sectionSubtitle: 'Join hands with our foundation to uplift underprivileged communities and receive 12-level mutual support',
      amountPrefix: '₹',
      joinBtn: 'Join Now',
      featuresTitle: 'Membership Benefits:',
      popularBadge: 'Most Popular',
      upiPayTitle: 'Pay via UPI QR Code',
      upiPaySub: 'Scan the official QR code using any UPI app (Google Pay, PhonePe, Paytm, BHIM)',
      officialUpi: 'Official Foundation UPI ID',
      copyUpi: 'Copy UPI',
      copied: 'Copied!',
      enterUtrLabel: 'Enter 12-Digit UPI UTR / Transaction Ref *',
      utrPlaceholder: 'e.g. 428901234567 (Exact 12 digits)',
      utrValid: 'Valid 12-Digit UTR Verified',
      utrRemaining: 'digits remaining',
      uploadReceipt: 'Payment Screenshot / Receipt (Optional)',
      submitApplication: 'Submit for Verification',
    },
    // 12-Level Income & Team
    income: {
      sectionTitle: '12-Level Mutual Support System',
      sectionSubtitle: 'Transparent level-wise welfare distribution chart (Direct 20% down to Level 12)',
      level: 'Level',
      commission: 'Support Rate',
      estEarnings: 'Potential Support',
      directLevel: 'Level 1 (Direct)',
      tierLevels: 'Tier',
      calculatorTitle: 'Seva Support Calculator',
      calcInstruction: 'Select a membership package to preview direct commission and multi-tier rewards',
      totalPotential: 'Total Welfare Earnings Potential',
    },
    // Team Page
    team: {
      title: 'My 12-Level Team Network',
      subtitle: 'Complete directory and genealogy breakdown of active members enrolled in your network',
      totalMembers: 'Total Team Members',
      directReferrals: 'Direct Referrals (Level 1)',
      activeGeneration: 'Active Generations',
      totalEarned: 'Total Commission Earned',
      searchMember: 'Search by member name or ID...',
      filterAll: 'All Levels',
      noMembers: 'No members in this level yet. Share your referral link to build your team!',
      memberId: 'Member ID',
      joinedDate: 'Joined Date',
      package: 'Package',
      status: 'Status',
      active: 'Active',
      pending: 'Pending',
    },
    // ID Card & Certificate
    idCard: {
      title: 'Official Digital Identity Card',
      subtitle: 'Your authorized foundation credential for social service activities, health camps, and assemblies.',
      badge: 'Official Identity Document',
      downloadPdf: 'Download ID Card PDF',
      downloadPng: 'Download ID Card PNG',
      shareCard: 'Share Digital ID Card',
      validity: 'Validity',
      bloodGroup: 'Blood Group',
      mobile: 'Mobile Number',
      address: 'Address',
      memberIdLabel: 'Membership No.',
      govtNotice: 'Government Recognized Non-Governmental Organization',
    },
    puraskar: {
      title: 'Puraskar & Letter of Appreciation',
      subtitle: 'Presented in deep honor and recognition of your selfless service and contribution to humanity.',
      downloadPdf: 'Download Certificate PDF',
      downloadPng: 'Download Certificate PNG',
      presentedTo: 'Presented With Honor To',
      inRecognition: 'In Recognition of Outstanding Social Dedication & Commitment',
      authorizedSign: 'Authorized Signature',
      foundationSeal: 'Official Seal',
    },
    // Wallet & Payouts
    wallet: {
      title: 'Seva Wallet & Payout Management',
      subtitle: 'Transparent earnings, transaction ledger, and instant bank / UPI payout requests',
      balance: 'Available Wallet Balance',
      totalEarned: 'Total Earnings',
      pendingPayouts: 'Pending Disbursals',
      requestWithdrawal: 'Request Payout Disbursal',
      minWithdrawal: 'Minimum Withdrawal Limit: ₹500',
      historyTitle: 'Transaction Ledger',
      payoutsTitle: 'Payout Requests',
      amount: 'Amount',
      method: 'Method',
      utrLabel: 'Bank UTR / Ref No.',
      date: 'Date',
      statusApproved: 'Paid / Approved',
      statusPending: 'Pending',
      statusRejected: 'Rejected',
      enterAmount: 'Enter Withdrawal Amount',
      selectMethod: 'Select Payment Method',
      upiOption: 'UPI ID',
      bankOption: 'Bank Account (NEFT/IMPS)',
      accHolder: 'Account Holder Name',
      accNumber: 'Account Number',
      ifsc: 'IFSC Code',
    },
    // Wallet & Business module (Handwritten Spec Match)
    business: {
      title: 'Wallet & Business',
      subtitle: 'Real-time 4-Card Business & Payout Overview',
      mainWallet: 'Main Wallet (Wallet Balance)',
      mainWalletDesc: 'Current available balance for withdrawal',
      teamBusiness: 'Team Business',
      teamBusinessDesc: 'Total volume generated by entire team (Direct + Downline)',
      downlineBusiness: 'Downline Business',
      downlineBusinessDesc: 'Total volume generated by Levels 2 to 12',
      selfBusiness: 'Self Business',
      selfBusinessDesc: 'Total business / contribution completed on own ID',
      withdrawBtn: 'Withdraw Payout',
      creditDebitHistory: 'Credit & Debit History',
      totalTeamMembers: 'Total Team Members',
      directCount: 'Direct Members',
      downlineCount: 'Downline Members',
    },
    // Dedicated Payout Module (Handwritten Spec Match)
    payoutModule: {
      title: 'Payout & Commission Module',
      subtitle: '3-Tier Transparent Commission: Direct Team, Self Business, and Total Commission',
      directTeamCommission: 'Direct Team Commission',
      directTeamCommissionDesc: 'Total commission earned from Level 1 direct team',
      selfBusinessCommission: 'Self Business Commission',
      selfBusinessCommissionDesc: 'Commission earned on own Self Business contribution',
      downlineCommission: 'Downline Commission',
      downlineCommissionDesc: 'Commission earned from Level 2 to 12 network',
      totalCommission: 'Total Commission',
      totalCommissionDesc: 'Sum of Self Business + Direct Team + Downline Commission',
      totalPaid: 'Total Paid Out',
      netPayable: 'Net Payable Balance',
      directMembersTableTitle: 'Direct Team Members Commission Ledger',
      directMembersTableSub: 'Individual member name, self business, commission rate, and earnings',
      memberId: 'Member ID',
      memberName: 'Member Name',
      memberSelfBusiness: 'Self Business (₹)',
      commissionRate: 'Rate (%)',
      commissionEarned: 'Earned Commission (₹)',
      status: 'Status',
      active: 'Active',
      pending: 'Pending',
      noDirectMembers: 'No direct members joined yet. Share your referral link to build your team!',
      searchPlaceholder: 'Search payout by Member ID or Name...',
      searchBtn: 'Search',
    },
    // Spend Tracker
    spend: {
      title: 'Foundation Spend Tracker & Financial Transparency',
      subtitle: '100% verified ledger of public welfare funds utilized with audited bank UTR references',
      totalSpent: 'Total Welfare Spent',
      beneficiariesHelped: 'Beneficiaries Uplifted',
      verifiedAudits: '100% Bank UTR Audited',
      filterAll: 'All Expenditures',
      education: 'Child Education Scholarships',
      healthcare: 'Health & Eye Care Camps',
      ration: 'Ration & Nutrition Distribution',
      festive: 'Diwali Gifts & Blanket Drives',
      verifiedUtrBadge: 'Verified Bank UTR',
      viewReceipt: 'View Receipt',
    },
    // Admin Panel
    admin: {
      title: 'Executive Admin Control Center',
      subtitle: 'Member verification, payout approvals, spend logging, and system operations',
      approvals: 'Member Approvals',
      members: 'Active Members Directory',
      payouts: 'Commission Disbursals',
      spends: 'Spend Ledger Manager',
      events: 'Events Manager',
      certificates: 'Certificate Registry',
      approveBtn: 'Approve Member',
      rejectBtn: 'Reject Application',
      markPaidBtn: 'Mark Disbursed (Paid)',
      enterBankUtr: 'Enter 12-Digit Bank UTR',
      recordSpend: 'Record New Expenditure',
    },
    // Common / UI
    common: {
      loading: 'Loading portal...',
      success: 'Completed successfully',
      error: 'An error occurred. Please try again',
      save: 'Save',
      cancel: 'Cancel',
      close: 'Close',
      back: 'Back',
      next: 'Next',
      search: 'Search...',
      copy: 'Copy',
      copied: 'Copied!',
      filter: 'Filter',
      viewAll: 'View All',
      verified: 'Verified',
    },
  },
};

const LanguageContext = createContext({
  language: 'hi',
  setLanguage: () => {},
  toggleLanguage: () => {},
  isHindi: true,
  isEnglish: false,
  t: (key, fallback) => fallback || key,
  bi: (hi, en) => hi ?? en ?? '',
  dict: TRANSLATIONS.hi,
});

export const LanguageProvider = ({ children }) => {
  // Initialize from localStorage, default to 'hi' (Hindi) for national NGO identity
  const [language, setLanguageState] = useState(() => {
    try {
      const saved = localStorage.getItem('ucwf_language');
      return saved === 'en' ? 'en' : 'hi';
    } catch {
      return 'hi';
    }
  });

  const setLanguage = useCallback((lang) => {
    const validLang = lang === 'en' ? 'en' : 'hi';
    setLanguageState(validLang);
    try {
      localStorage.setItem('ucwf_language', validLang);
      document.documentElement.lang = validLang;
    } catch (e) {
      console.warn('Could not save language to localStorage:', e);
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === 'hi' ? 'en' : 'hi');
  }, [language, setLanguage]);

  useEffect(() => {
    try {
      document.documentElement.lang = language;
    } catch {}
  }, [language]);

  // Nested property lookup helper: t('hero.titleLine1')
  const t = useCallback(
    (keyPath, fallback = '') => {
      if (!keyPath) return fallback;
      const keys = keyPath.split('.');
      let current = TRANSLATIONS[language];

      for (const k of keys) {
        if (current && typeof current === 'object' && k in current) {
          current = current[k];
        } else {
          // Fallback to Hindi if English key missing or vice-versa
          const otherLang = language === 'hi' ? 'en' : 'hi';
          let otherCurrent = TRANSLATIONS[otherLang];
          for (const ok of keys) {
            if (otherCurrent && typeof otherCurrent === 'object' && ok in otherCurrent) {
              otherCurrent = otherCurrent[ok];
            } else {
              otherCurrent = null;
              break;
            }
          }
          return typeof otherCurrent === 'string' ? otherCurrent : (fallback || keyPath);
        }
      }

      return typeof current === 'string' ? current : (fallback || keyPath);
    },
    [language]
  );

  const bi = useCallback(
    (hi, en) => (language === 'en' ? (en ?? hi ?? '') : (hi ?? en ?? '')),
    [language]
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      toggleLanguage,
      isHindi: language === 'hi',
      isEnglish: language === 'en',
      t,
      bi,
      dict: TRANSLATIONS[language] || TRANSLATIONS.hi,
    }),
    [language, setLanguage, toggleLanguage, t, bi]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);

export default LanguageContext;
