import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Flame, Heart, X } from 'lucide-react';

/**
 * Animated Traditional Indian Diya (दीपक) Component with realistic flickering golden flame
 */
export const Diya = ({ size = 28, className = '', glow = true, flameOnly = false }) => {
  return (
    <div className={`relative inline-flex flex-col items-center justify-center select-none ${className}`}>
      {/* Flickering Flame */}
      <motion.div
        animate={{
          scaleY: [1, 1.25, 0.95, 1.2, 1],
          scaleX: [1, 0.9, 1.1, 0.92, 1],
          rotate: [-2, 2, -1, 3, 0],
          opacity: [0.95, 1, 0.9, 1, 0.95],
        }}
        transition={{
          repeat: Infinity,
          duration: 1.4,
          ease: 'easeInOut',
        }}
        className="relative z-10 flex flex-col items-center"
      >
        {/* Flame core */}
        <div
          style={{
            width: size * 0.38,
            height: size * 0.65,
            borderRadius: '50% 50% 35% 35% / 60% 60% 40% 40%',
            background: 'radial-gradient(ellipse at bottom, #ffffff 0%, #fef08a 25%, #f59e0b 60%, #ea580c 100%)',
            boxShadow: glow ? '0 0 14px 4px rgba(245, 158, 11, 0.7), 0 0 28px 8px rgba(234, 88, 12, 0.4)' : 'none',
          }}
        />
        {/* Blue inner flame base */}
        <div
          style={{
            width: size * 0.16,
            height: size * 0.18,
            borderRadius: '50%',
            background: '#60a5fa',
            marginTop: -size * 0.12,
            opacity: 0.85,
          }}
        />
      </motion.div>

      {/* Clay / Terracotta Diya Base */}
      {!flameOnly && (
        <div className="relative -mt-1 flex items-center justify-center">
          <svg
            width={size}
            height={size * 0.55}
            viewBox="0 0 64 36"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="filter drop-shadow-md"
          >
            {/* Diya Body */}
            <path
              d="M2 14C2 26 14 34 32 34C50 34 62 26 62 14C62 10 54 8 46 8C38 8 36 12 32 12C28 12 26 8 18 8C10 8 2 10 2 14Z"
              fill="url(#diyaClayGradient)"
              stroke="#b45309"
              strokeWidth="1.5"
            />
            {/* Diya Rim Highlight */}
            <ellipse cx="32" cy="11" rx="28" ry="4" fill="url(#diyaGoldRim)" />
            {/* Traditional Decorative Mark */}
            <circle cx="32" cy="22" r="3" fill="#fef08a" opacity="0.9" />
            <circle cx="22" cy="20" r="2" fill="#fef08a" opacity="0.8" />
            <circle cx="42" cy="20" r="2" fill="#fef08a" opacity="0.8" />

            <defs>
              <linearGradient id="diyaClayGradient" x1="2" y1="8" x2="62" y2="34" gradientUnits="userSpaceOnUse">
                <stop stopColor="#9a3412" />
                <stop offset="0.4" stopColor="#c2410c" />
                <stop offset="0.7" stopColor="#ea580c" />
                <stop offset="1" stopColor="#7c2d12" />
              </linearGradient>
              <linearGradient id="diyaGoldRim" x1="4" y1="11" x2="60" y2="11" gradientUnits="userSpaceOnUse">
                <stop stopColor="#f59e0b" />
                <stop offset="0.5" stopColor="#fef08a" />
                <stop offset="1" stopColor="#d97706" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      )}
    </div>
  );
};

import { useLanguage } from '../../contexts/LanguageContext';

/**
 * Royal Diwali Festive Banner with dismiss option & bilingual toggle
 */
export const DiwaliFestiveBanner = () => {
  const { t, isHindi } = useLanguage();
  const [visible, setVisible] = useState(() => {
    return localStorage.getItem('ucwf_diwali_banner') !== 'closed';
  });

  const handleClose = () => {
    setVisible(false);
    localStorage.setItem('ucwf_diwali_banner', 'closed');
  };

  if (!visible) return null;

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-amber-600 via-rose-600 to-amber-700 text-white border-b border-amber-400/40 shadow-lg select-none">
      {/* Background Decorative Sparkles */}
      <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-between text-xs sm:text-sm font-semibold gap-2">
        <div className="flex items-center gap-3 overflow-hidden">
          <Diya size={26} className="shrink-0" />
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 leading-tight">
            <span className="bg-amber-300 text-slate-950 text-[10px] sm:text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-700" />
              {isHindi ? 'दीपावली सेवा महोत्सव' : 'Diwali Seva Mahotsav'}
            </span>
            <span className="font-bold text-amber-100 hidden sm:inline">
              {isHindi
                ? '🪔 शुभ दीपावली! उत्तम चैरिटेबल वेलफेयर फाउंडेशन में आपका स्वागत है'
                : '🪔 Happy Diwali! Welcome to Uttam Charitable Welfare Foundation'}
            </span>
            <span className="text-amber-200/90 text-xs">
              {isHindi
                ? 'उत्तम फाउंडेशन के साथ इस दीपोत्सव जरूरतमंदों के जीवन में उजाला फैलाएं।'
                : 'Spread light and joy to vulnerable families with Uttam Foundation.'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Diya size={26} className="hidden md:inline-flex" />
          <button
            onClick={handleClose}
            className="p-1 rounded-lg hover:bg-black/20 text-amber-100 hover:text-white transition-colors"
            title="Dismiss festive banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Festive Diwali Corner Embellishments for Cards
 */
export const DiwaliCornerRangoli = ({ position = 'top-right' }) => {
  const isTopRight = position === 'top-right';
  return (
    <div
      className={`absolute ${
        isTopRight ? 'top-0 right-0' : 'bottom-0 left-0'
      } pointer-events-none opacity-25 hover:opacity-40 transition-opacity`}
    >
      <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx={isTopRight ? "60" : "0"} cy={isTopRight ? "0" : "60"} r="50" stroke="#f59e0b" strokeWidth="1" strokeDasharray="3 3" />
        <circle cx={isTopRight ? "60" : "0"} cy={isTopRight ? "0" : "60"} r="35" stroke="#ea580c" strokeWidth="1.5" />
        <circle cx={isTopRight ? "60" : "0"} cy={isTopRight ? "0" : "60"} r="20" fill="#fef08a" fillOpacity="0.3" />
      </svg>
    </div>
  );
};

export default Diya;
