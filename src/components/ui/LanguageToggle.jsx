import React from 'react';
import { motion } from 'framer-motion';
import { Globe } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export const LanguageToggle = ({ variant = 'header', className = '' }) => {
  const { language, setLanguage, toggleLanguage, isHindi } = useLanguage();

  if (variant === 'floating') {
    return (
      <motion.button
        type="button"
        whileTap={{ scale: 0.92 }}
        whileHover={{ scale: 1.05 }}
        onClick={toggleLanguage}
        aria-label="Switch Language (🇮🇳 हिंदी | EN English)"
        className={`fixed bottom-20 right-4 z-40 md:bottom-6 md:right-6 flex items-center gap-2 px-3.5 py-2 rounded-full bg-slate-900/95 text-white backdrop-blur-xl border border-amber-400/50 shadow-2xl shadow-amber-500/20 active:scale-95 transition-all cursor-pointer group ${className}`}
      >
        <span className="text-sm">🇮🇳</span>
        <div className="flex items-center gap-1.5 text-xs font-bold font-mono">
          <span className={isHindi ? 'text-amber-400 font-extrabold' : 'text-slate-400'}>
            हिंदी
          </span>
          <span className="text-amber-500/60">|</span>
          <span className={!isHindi ? 'text-amber-400 font-extrabold' : 'text-slate-400'}>
            EN
          </span>
        </div>
      </motion.button>
    );
  }

  // Header / Navbar Segmented Pill Style [🇮🇳 हिंदी | EN English]
  return (
    <div
      className={`inline-flex items-center p-0.5 sm:p-1 rounded-full bg-slate-900/90 hover:bg-slate-900 text-white border border-amber-400/40 shadow-md backdrop-blur-xl transition-all cursor-pointer select-none shrink-0 ${className}`}
      role="group"
      aria-label="Language selector (🇮🇳 हिंदी | EN English)"
    >
      <button
        type="button"
        onClick={() => setLanguage('hi')}
        className={`flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-black transition-all cursor-pointer ${
          isHindi
            ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-sm'
            : 'text-slate-300 hover:text-white hover:bg-white/10'
        }`}
        title="हिंदी भाषा चुनें"
      >
        <span>🇮🇳</span>
        <span className="hidden xs:inline">हिंदी</span>
      </button>

      <span className="text-slate-500 px-0.5 text-[9px] sm:text-[10px]">|</span>

      <button
        type="button"
        onClick={() => setLanguage('en')}
        className={`flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-black transition-all cursor-pointer ${
          !isHindi
            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm'
            : 'text-slate-300 hover:text-white hover:bg-white/10'
        }`}
        title="Select English Language"
      >
        <span className="text-[10px] font-mono font-bold text-amber-300">EN</span>
        <span className="hidden xs:inline">English</span>
      </button>
    </div>
  );
};

export default LanguageToggle;
