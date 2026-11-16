import React from 'react';
import SafeQRCode from './ui/SafeQRCode';
import {
  FOUNDATION_NAME,
  FOUNDATION_NAME_HINDI,
  FOUNDATION_LOGO,
  FOUNDATION_TAGLINE,
  FOUNDATION_TAGLINE_HINDI,
  CONTACT_INFO,
} from '../lib/constants';
import {
  PRESIDENT_STAMP_SIGNATURE_BASE64,
  PRESIDENT_STAMP_SIGNATURE_URL,
} from '../lib/signature-asset';

/**
 * Royal Print-Ready A4 Landscape Certificate Component (प्रशस्ति पत्र)
 * Designed for authentic, high-resolution rendering and export via html2canvas (Scale: 3) + jsPDF.
 * Uses exact inline CSS and RGB hex colors for 100% fidelity without backdrop blur or canvas taint.
 * Incorporates the official extracted blue ink circular stamp and President signature.
 */
export const RoyalCertificate = React.forwardRef(
  (
    {
      certificate = {},
      showPhoto = true,
      languageMode = 'bilingual', // 'bilingual' | 'hindi' | 'english'
      className = '',
    },
    ref
  ) => {
    // Dynamic values with clean fallbacks
    const certNumber = certificate.certificate_number || certificate.certNumber || 'UCWF-CERT-VERIFIED';
    const rawRecipientName = certificate.member_name || certificate.recipientName || 'सम्मानित सदस्य (Honored Member)';
    const fatherSpouseName = certificate.father_name || certificate.fatherName || certificate.father_spouse_name || certificate.fatherSpouse || '';
    const motherName = certificate.mother_name || certificate.motherName || '';
    const mobileNo = certificate.phone || certificate.mobile || certificate.mobileNo || '';
    const padnaam = certificate.designation || certificate.padNaam || certificate.padnaam || '';
    const memberId = certificate.member_id || certificate.memberId || 'UCWF-MEMBER';
    const city = certificate.city || certificate.district || 'Kashipur, Uttarakhand';
    const category = certificate.category || certificate.title || 'उत्कृष्ट समाज सेवा एवं फाउंडेशन सहयोग सम्मान';
    const issueDate = certificate.issue_date || certificate.issueDate || new Date().toISOString().split('T')[0];
    const photoUrl = certificate.photo_url || certificate.photoUrl || '';
    const presidentSignature = certificate.president_signature || certificate.signatureUrl || '';

    // Smart, clean salutation (No clumsy slashes "श्री / श्रीमती" or "Mr / Mrs")
    let salutationHi = certificate.salutation || '';
    if (!salutationHi) {
      if (/^(श्रीमती|smt|mrs|miss|ms)\b/i.test(rawRecipientName)) {
        salutationHi = 'श्रीमती';
      } else if (certificate.gender === 'female') {
        salutationHi = 'श्रीमती';
      } else {
        salutationHi = 'श्री';
      }
    }

    // Strip redundant leading salutations from recipient name to avoid duplication
    const cleanRecipientName = rawRecipientName
      .replace(/^(श्री\s*\/?\s*श्रीमती|श्री\/श्रीमती|श्री|श्रीमती|Shri\s*\/?\s*Smt\.?|Shri|Smt\.?|Mr\.?|Mrs\.?|Ms\.?)\s+/i, '')
      .trim() || rawRecipientName;

    const displaySalutation = salutationHi;

    // Standard Bilingual Appreciation Text
    const defaultHindiCitation =
      certificate.citation_hi ||
      `यह प्रमाणित किया जाता है कि ${displaySalutation} ${cleanRecipientName} ने उत्तम चैरिटेबल वेलफेयर फाउंडेशन के सामाजिक कल्याण, जन-सेवा एवं राष्ट्र निर्माण के कार्यों में अपना अमूल्य योगदान दिया है। फाउंडेशन आपके उज्ज्वल भविष्य की कामना करता है।`;

    const defaultEnglishCitation =
      certificate.citation_en ||
      `This is to certify that ${displaySalutation === 'श्रीमती' ? 'Smt.' : 'Shri'} ${cleanRecipientName} has made an invaluable contribution to the social welfare, community service, and nation-building initiatives of Uttam Charitable Welfare Foundation. The Foundation wishes them a bright and prosperous future.`;

    // Verification URL pointing to live domain
    const verificationUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/verify/cert/${certNumber}`
        : `https://www.ucwf.online/verify/cert/${certNumber}`;

    // Format date in Indian readable format
    const formattedDate = (() => {
      try {
        const d = new Date(issueDate);
        return d.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        });
      } catch {
        return issueDate;
      }
    })();

    // Choose signature source: custom if provided, otherwise the authentic extracted blue ink stamp & signature
    const signatureSrc =
      presidentSignature && presidentSignature.length > 50
        ? presidentSignature
        : PRESIDENT_STAMP_SIGNATURE_BASE64 || PRESIDENT_STAMP_SIGNATURE_URL;

    return (
      <div
        ref={ref}
        id="royal-certificate-element"
        style={{
          width: '980px',
          minHeight: '690px',
          backgroundColor: '#fefdf9', // Rich parchment cream
          color: '#1a202c',
          position: 'relative',
          boxSizing: 'border-box',
          padding: '20px',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.12)',
          fontFamily: "'Georgia', 'Cambria', 'Times New Roman', serif",
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
        className={`select-none ${className}`}
      >
        {/* =========================================================================
            BACKGROUND SUBTLE WATERMARK EMBLEM (Center)
           ========================================================================= */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '380px',
            height: '380px',
            opacity: 0.04,
            pointerEvents: 'none',
            zIndex: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img
            src={FOUNDATION_LOGO}
            alt="Watermark"
            crossOrigin="anonymous"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </div>

        {/* =========================================================================
            OUTER ORNATE ROYAL GOLD BORDER (Layer 1)
           ========================================================================= */}
        <div
          style={{
            width: '100%',
            height: '100%',
            border: '4px solid #b45309', // Deep golden bronze
            padding: '6px',
            boxSizing: 'border-box',
            position: 'relative',
            backgroundColor: 'transparent',
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* =======================================================================
              MIDDLE ROYAL EMERALD BORDER (Layer 2)
             ======================================================================= */}
          <div
            style={{
              width: '100%',
              height: '100%',
              border: '2px solid #064e3b', // Deep Royal Emerald
              padding: '8px',
              boxSizing: 'border-box',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* =====================================================================
                INNER FILIGREE BORDER (Layer 3)
               ===================================================================== */}
            <div
              style={{
                width: '100%',
                height: '100%',
                border: '1.5px dashed #d97706', // Saffron gold dashed filigree
                padding: '16px 24px',
                boxSizing: 'border-box',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                textAlign: 'center',
              }}
            >
              {/* 4 ORNATE CORNER BRACKETS */}
              <div
                style={{
                  position: 'absolute',
                  top: '4px',
                  left: '4px',
                  width: '30px',
                  height: '30px',
                  borderTop: '4px double #b45309',
                  borderLeft: '4px double #b45309',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  width: '30px',
                  height: '30px',
                  borderTop: '4px double #b45309',
                  borderRight: '4px double #b45309',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: '4px',
                  left: '4px',
                  width: '30px',
                  height: '30px',
                  borderBottom: '4px double #b45309',
                  borderLeft: '4px double #b45309',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: '4px',
                  right: '4px',
                  width: '30px',
                  height: '30px',
                  borderBottom: '4px double #b45309',
                  borderRight: '4px double #b45309',
                }}
              />

              {/* ===================================================================
                  1. TOP HEADER SECTION (Prominent Left Logo & Balanced Center Titles)
                 =================================================================== */}
              <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '0 8px' }}>
                  {/* Official Circular Rising Sun Logo - Left Side & Prominently Larger */}
                  <div
                    style={{
                      width: '100px',
                      height: '100px',
                      borderRadius: '50%',
                      backgroundColor: '#ffffff',
                      border: '3px solid #d97706',
                      padding: '3px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      flexShrink: 0,
                    }}
                  >
                    <img
                      src={FOUNDATION_LOGO}
                      alt="Foundation Logo"
                      crossOrigin="anonymous"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        borderRadius: '50%',
                        imageRendering: '-webkit-optimize-contrast',
                        filter: 'contrast(1.1) brightness(1.02)'
                      }}
                      onError={(e) => { e.currentTarget.src = '/logo.png'; }}
                    />
                  </div>

                  {/* Foundation Titles - Centered */}
                  <div style={{ textAlign: 'center', flex: 1, padding: '0 16px' }}>
                    <h1
                      style={{
                        fontSize: '26px',
                        fontWeight: '900',
                        color: '#064e3b',
                        margin: 0,
                        lineHeight: '1.2',
                        letterSpacing: '0.5px',
                      }}
                    >
                      {FOUNDATION_NAME_HINDI}
                    </h1>
                    <h2
                      style={{
                        fontSize: '15px',
                        fontWeight: '800',
                        color: '#b45309',
                        margin: '2px 0 0 0',
                        textTransform: 'uppercase',
                        letterSpacing: '1.5px',
                        fontFamily: "'Inter', sans-serif",
                      }}
                    >
                      {FOUNDATION_NAME}
                    </h2>
                    <p
                      style={{
                        fontSize: '12px',
                        fontWeight: '700',
                        color: '#047857',
                        margin: '3px 0 0 0',
                        letterSpacing: '0.5px',
                      }}
                    >
                      {FOUNDATION_TAGLINE_HINDI}
                    </p>
                    {/* Statutory Registration Metadata Strip */}
                    <div
                      style={{
                        fontSize: '9.5px',
                        color: '#4b5563',
                        marginTop: '4px',
                        fontFamily: "'Inter', sans-serif",
                        letterSpacing: '0.6px',
                        fontWeight: '600',
                      }}
                    >
                      Regd. No.: <strong style={{ color: '#064e3b' }}>{CONTACT_INFO.regNumber}</strong> (Section 8 Act 2013) &nbsp;|&nbsp;
                      PAN: <strong style={{ color: '#064e3b' }}>{CONTACT_INFO.panNumber}</strong> &nbsp;|&nbsp;
                      TAN: <strong style={{ color: '#064e3b' }}>{CONTACT_INFO.tanNumber}</strong>
                    </div>
                  </div>

                  {/* Right Symmetry Balance Box: Smart Verification QR */}
                  <div
                    style={{
                      width: '100px',
                      height: '100px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        padding: '4px',
                        backgroundColor: '#ffffff',
                        border: '2px solid #d97706',
                        borderRadius: '10px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      }}
                    >
                      <SafeQRCode value={verificationUrl} size={70} />
                    </div>
                    <span style={{ fontSize: '8px', fontWeight: '800', color: '#064e3b', marginTop: '3px', fontFamily: "'Inter', sans-serif" }}>
                      VERIFIED QR
                    </span>
                  </div>
                </div>

                {/* Decorative Filigree Divider */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    margin: '8px 0 6px 0',
                    width: '100%',
                  }}
                >
                  <div style={{ height: '1.5px', flex: 1, maxWidth: '220px', background: 'linear-gradient(90deg, transparent, #d97706)' }} />
                  <span style={{ color: '#b45309', fontSize: '13px' }}>⚜ ♦ ❖ ♦ ⚜</span>
                  <div style={{ height: '1.5px', flex: 1, maxWidth: '220px', background: 'linear-gradient(90deg, #d97706, transparent)' }} />
                </div>
              </div>

              {/* ===================================================================
                  2. TITLE BADGE (प्रशस्ति एवं सम्मान पत्र)
                 =================================================================== */}
              <div style={{ margin: '2px 0 6px 0' }}>
                <div
                  style={{
                    display: 'inline-block',
                    padding: '5px 24px',
                    borderRadius: '30px',
                    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #fef3c7 100%)',
                    border: '1.5px solid #d97706',
                    boxShadow: '0 2px 6px rgba(180, 83, 9, 0.15)',
                  }}
                >
                  <span
                    style={{
                      fontSize: '18px',
                      fontWeight: '900',
                      color: '#92400e',
                      letterSpacing: '1px',
                    }}
                  >
                    प्रशस्ति एवं सम्मान पत्र
                  </span>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: '800',
                      color: '#064e3b',
                      marginLeft: '8px',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                    }}
                  >
                    / CERTIFICATE OF APPRECIATION
                  </span>
                </div>

                {/* Award Category Sub-badge */}
                <div style={{ marginTop: '4px' }}>
                  <span
                    style={{
                      fontSize: '12.5px',
                      fontWeight: '800',
                      color: '#065f46',
                      letterSpacing: '0.5px',
                    }}
                  >
                    ★ {category} ★
                  </span>
                </div>
              </div>

              {/* ===================================================================
                  3. DYNAMIC RECIPIENT & CITATION SECTION
                 =================================================================== */}
              <div style={{ margin: '4px 0', padding: '0 10px' }}>
                <p
                  style={{
                    fontSize: '12.5px',
                    fontStyle: 'italic',
                    color: '#4b5563',
                    margin: '0 0 4px 0',
                  }}
                >
                  यह बड़े गर्व एवं आदर के साथ प्रमाणित किया जाता है कि / Proudly presented to:
                </p>

                {/* Recipient Details Row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '18px',
                    margin: '6px 0',
                  }}
                >
                  {/* Real Member Photo ONLY if valid photoUrl exists - No dummy initial placeholder */}
                  {showPhoto && photoUrl && (
                    <div
                      style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        border: '2.5px solid #d97706',
                        backgroundColor: '#f3f4f6',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                        flexShrink: 0,
                      }}
                    >
                      <img
                        src={photoUrl}
                        alt={cleanRecipientName}
                        crossOrigin="anonymous"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                  )}

                  {/* Recipient Name in Royal Golden Bold with clean single salutation */}
                  <div style={{ textAlign: showPhoto && photoUrl ? 'left' : 'center' }}>
                    <div
                      style={{
                        fontSize: '26px',
                        fontWeight: '900',
                        color: '#92400e',
                        letterSpacing: '0.5px',
                        borderBottom: '2px solid #d97706',
                        paddingBottom: '2px',
                        display: 'inline-block',
                      }}
                    >
                      {displaySalutation} {cleanRecipientName}
                    </div>

                    {(fatherSpouseName || motherName || mobileNo) && (
                      <div
                        style={{
                          fontSize: '11px',
                          color: '#374151',
                          marginTop: '3px',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: showPhoto && photoUrl ? 'flex-start' : 'center',
                          gap: '10px',
                          flexWrap: 'wrap',
                        }}
                      >
                        {fatherSpouseName && <span>पिता: <strong style={{ color: '#111827' }}>{fatherSpouseName}</strong></span>}
                        {fatherSpouseName && (motherName || mobileNo) && <span style={{ color: '#9ca3af' }}>|</span>}
                        {motherName && <span>माता: <strong style={{ color: '#111827' }}>{motherName}</strong></span>}
                        {motherName && mobileNo && <span style={{ color: '#9ca3af' }}>|</span>}
                        {mobileNo && <span>मो०: <strong style={{ color: '#111827' }}>{mobileNo}</strong></span>}
                      </div>
                    )}

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: showPhoto && photoUrl ? 'flex-start' : 'center',
                        gap: '12px',
                        marginTop: '3px',
                        fontSize: '10.5px',
                        fontFamily: "'Inter', sans-serif",
                        color: '#047857',
                        fontWeight: '700',
                      }}
                    >
                      <span>Member ID: {memberId}</span>
                      {padnaam && <span>•</span>}
                      {padnaam && <span>पदनाम: {padnaam}</span>}
                      <span>•</span>
                      <span>स्थान / City: {city}</span>
                    </div>
                  </div>
                </div>

                {/* Appreciation Citation Text */}
                <div
                  style={{
                    maxWidth: '820px',
                    margin: '8px auto 0 auto',
                    lineHeight: '1.5',
                  }}
                >
                  {(languageMode === 'bilingual' || languageMode === 'hindi') && (
                    <p
                      style={{
                        fontSize: '13px',
                        color: '#1f2937',
                        margin: '0 auto 4px auto',
                        fontWeight: '600',
                        lineHeight: '1.45',
                      }}
                    >
                      "{defaultHindiCitation}"
                    </p>
                  )}

                  {(languageMode === 'bilingual' || languageMode === 'english') && (
                    <p
                      style={{
                        fontSize: '11.5px',
                        color: '#4b5563',
                        fontStyle: 'italic',
                        margin: '0 auto',
                        lineHeight: '1.4',
                      }}
                    >
                      "{defaultEnglishCitation}"
                    </p>
                  )}
                </div>
              </div>

              {/* ===================================================================
                  4. FOOTER: SERIAL NO, CLEAN SCANNABLE QR CODE & BLUE STAMP/SIGNATURE
                 =================================================================== */}
              <div
                style={{
                  borderTop: '1.5px solid #e5e7eb',
                  paddingTop: '8px',
                  marginTop: '8px',
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  paddingLeft: '12px',
                  paddingRight: '12px',
                }}
              >
                {/* Left: Certificate Number & Registered Office Address */}
                <div style={{ textAlign: 'left', maxWidth: '280px' }}>
                  <div style={{ fontSize: '10.5px', fontWeight: '800', color: '#064e3b', fontFamily: "'Inter', sans-serif" }}>
                    क्रमांक / Serial No: <span style={{ color: '#b45309' }}>{certNumber}</span>
                  </div>
                  <div style={{ fontSize: '10px', color: '#4b5563', marginTop: '1px', fontWeight: '600' }}>
                    दिनांक / Issue Date: {formattedDate}
                  </div>
                  <div
                    style={{
                      fontSize: '8px',
                      color: '#6b7280',
                      marginTop: '4px',
                      lineHeight: '1.25',
                    }}
                  >
                    कार्यालय: {CONTACT_INFO.address}
                  </div>
                </div>

                {/* Center: Clean Scannable QR Code (No generic overlapping unofficial seal badge) */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div
                    style={{
                      padding: '5px',
                      backgroundColor: '#ffffff',
                      border: '1.5px solid #d97706',
                      borderRadius: '8px',
                      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.06)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                    }}
                  >
                    <SafeQRCode
                      value={verificationUrl}
                      size={58}
                      fgColor="#064e3b"
                    />
                  </div>
                  <span
                    style={{
                      fontSize: '7.5px',
                      color: '#065f46',
                      fontWeight: '800',
                      marginTop: '3px',
                      fontFamily: "'Inter', sans-serif",
                      letterSpacing: '0.3px',
                    }}
                  >
                    स्कैन कर सत्यापन करें / Scan to Verify
                  </span>
                </div>

                {/* Right: President / Authorized Signatory Block with Blue Ink Stamp & Signature */}
                <div style={{ textAlign: 'center', width: '220px', position: 'relative' }}>
                  <div
                    style={{
                      height: '76px',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent: 'center',
                      borderBottom: '1.5px solid #374151',
                      paddingBottom: '2px',
                      marginBottom: '4px',
                    }}
                  >
                    {/* Official Blue Ink Circular Stamp & President Signature */}
                    <img
                      src={signatureSrc}
                      alt="अध्यक्ष / संस्थापक हस्ताक्षर एवं मुहर"
                      crossOrigin="anonymous"
                      style={{
                        height: '88px',
                        maxWidth: '210px',
                        objectFit: 'contain',
                        position: 'absolute',
                        bottom: '-10px',
                        pointerEvents: 'none',
                        backgroundColor: 'transparent',
                      }}
                    />
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: '900',
                      color: '#111827',
                      lineHeight: '1.2',
                      letterSpacing: '0.3px',
                    }}
                  >
                    डॉ. राजेन्द्र सिंह सैनी
                  </div>
                  <div
                    style={{
                      fontSize: '9.5px',
                      color: '#064e3b',
                      fontWeight: '800',
                      letterSpacing: '0.2px',
                    }}
                  >
                    संस्थापक / राष्ट्रीय अध्यक्ष
                  </div>
                  <div
                    style={{
                      fontSize: '8.5px',
                      color: '#4b5563',
                      fontWeight: '600',
                      letterSpacing: '0.2px',
                    }}
                  >
                    Dr. Rajendra Singh Saini (Founder & President)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

RoyalCertificate.displayName = 'RoyalCertificate';
export default RoyalCertificate;
