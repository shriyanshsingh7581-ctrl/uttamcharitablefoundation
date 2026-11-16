import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  FileText, 
  ShieldCheck, 
  Heart, 
  ExternalLink,
  Award,
  Users,
  CheckCircle2
} from 'lucide-react';
import { FOUNDATION_DETAILS, safeText } from '../lib/constants';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-950/95 backdrop-blur-2xl text-slate-300 pt-16 pb-12 border-t border-emerald-500/25 relative overflow-hidden w-full max-w-full">
      {/* Background ambient flare */}
      <div className="absolute top-0 left-1/3 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Trust Highlights - Frosted Dark Glass Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-12 border-b border-white/10">
          <div className="flex items-start gap-4 p-5 rounded-3xl glass-card-dark hover:border-emerald-500/40 transition-all">
            <div className="p-3 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-white text-base">मान्यता प्राप्त गैर-सरकारी संगठन</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                भारत सरकार के कॉर्पोरेट कार्य मंत्रालय (MCA) द्वारा सेक्शन 8 एक्ट 2013 के तहत पंजीकृत।
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-5 rounded-3xl glass-card-dark hover:border-emerald-500/40 transition-all">
            <div className="p-3 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-white text-base">100% पारदर्शी लेखा प्रणाली</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                प्रत्येक दान एवं सहयोग का पूर्ण विवरण, पैन एवं टैन कार्ड के साथ कानूनी रूप से सुरक्षित।
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-5 rounded-3xl glass-card-dark hover:border-emerald-500/40 transition-all">
            <div className="p-3 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shrink-0">
              <Heart className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-white text-base">जन कल्याण को समर्पित</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                शिक्षा, स्वास्थ्य, महिला सशक्तिकरण एवं पर्यावरण संरक्षण हेतु जमीनी स्तर पर समर्पित सेवा।
              </p>
            </div>
          </div>
        </div>

        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 py-12">
          {/* Foundation Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full p-0.5 border-2 border-blue-900 bg-white shadow-md shrink-0 overflow-hidden flex items-center justify-center">
                <img 
                  src="/logo.png" 
                  alt="Foundation Logo" 
                  className="w-full h-full object-contain rounded-full"
                  onError={(e) => { e.currentTarget.src = '/logo.png'; }}
                />
              </div>
              <div>
                <h3 className="font-black text-white text-base leading-tight">
                  {safeText(FOUNDATION_DETAILS.nameHindi)}
                </h3>
                <p className="text-xs text-emerald-400 font-semibold mt-0.5">
                  {safeText(FOUNDATION_DETAILS.nameEnglish)}
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-normal">
              &quot;{safeText(FOUNDATION_DETAILS.tagline)}&quot; — एक समर्पित सामाजिक संस्था जो समाज के जरूरतमंद वर्गों की सहायता, बाल शिक्षा एवं सामाजिक विकास हेतु प्रतिबद्ध है।
            </p>
            <div className="pt-2 text-xs text-slate-300 space-y-1.5 font-mono">
              <p className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>CIN: <span className="text-white font-bold">{safeText(FOUNDATION_DETAILS.cin)}</span></span>
              </p>
              <p className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>PAN: <span className="text-white font-bold">{safeText(FOUNDATION_DETAILS.pan)}</span></span>
              </p>
              <p className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>TAN: <span className="text-white font-bold">{safeText(FOUNDATION_DETAILS.tan)}</span></span>
              </p>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-black text-sm uppercase tracking-wider mb-4 border-l-2 border-emerald-500 pl-2">
              त्वरित लिंक (Quick Links)
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link to="/" className="text-slate-400 hover:text-emerald-400 transition-colors flex items-center gap-2">
                  <span>मुख्य पृष्ठ (Home)</span>
                </Link>
              </li>
              <li>
                <Link to="/register" className="text-slate-400 hover:text-emerald-400 transition-colors flex items-center gap-2">
                  <span>सदस्यता लें (Join Foundation)</span>
                </Link>
              </li>
              <li>
                <Link to="/gallery" className="text-slate-400 hover:text-emerald-400 transition-colors flex items-center gap-2">
                  <span>सेवा कार्य गैलरी (Service Gallery)</span>
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-slate-400 hover:text-emerald-400 transition-colors flex items-center gap-2">
                  <span>सदस्य लॉगिन (Member Login)</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Member Services */}
          <div>
            <h4 className="text-white font-black text-sm uppercase tracking-wider mb-4 border-l-2 border-emerald-500 pl-2">
              सदस्य सेवाएँ (Member Portal)
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link to="/dashboard" className="text-slate-400 hover:text-emerald-400 transition-colors">
                  सदस्य डैशबोर्ड (Member Dashboard)
                </Link>
              </li>
              <li>
                <Link to="/id-card" className="text-slate-400 hover:text-emerald-400 transition-colors">
                  डिजिटल आई-कार्ड (Official Digital ID)
                </Link>
              </li>
              <li>
                <Link to="/certificates" className="text-slate-400 hover:text-emerald-400 transition-colors">
                  प्रशस्ति पत्र (Appreciation Certificate)
                </Link>
              </li>
              <li>
                <Link to="/team" className="text-slate-400 hover:text-emerald-400 transition-colors">
                  सहयोगी नेटवर्क (12-Level Team)
                </Link>
              </li>
              <li>
                <Link to="/wallet" className="text-slate-400 hover:text-emerald-400 transition-colors">
                  मानदेय एवं वॉलेट (Honorarium & Wallet)
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Details */}
          <div>
            <h4 className="text-white font-black text-sm uppercase tracking-wider mb-4 border-l-2 border-emerald-500 pl-2">
              संपर्क सूत्र (Headquarters)
            </h4>
            <div className="space-y-3.5 text-xs text-slate-400">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  {safeText(FOUNDATION_DETAILS.address)}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{safeText(FOUNDATION_DETAILS.phone)}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{safeText(FOUNDATION_DETAILS.email)}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>पंजीकृत: उत्तराखंड, भारत (Section 8)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Legal Copyright */}
        <div className="pt-8 border-t border-white/10 text-center sm:flex sm:justify-between sm:items-center text-xs text-slate-500">
          <p>
            © {currentYear} {safeText(FOUNDATION_DETAILS.nameEnglish)}. सर्वाधिकार सुरक्षित।
          </p>
          <p className="mt-2 sm:mt-0 flex items-center justify-center gap-1.5">
            <span>राष्ट्र निर्माण एवं समाज सेवा हेतु समर्पित</span>
            <span className="text-rose-500">♥</span>
            <span>उत्तराखंड, भारत</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
