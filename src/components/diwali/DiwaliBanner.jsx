import React from 'react';
import GlowingDiya from './GlowingDiya';
import { Sparkles } from 'lucide-react';

/**
 * Royal Diwali Festive Greeting Ribbon
 * Displays on Homepage, Member Dashboard, and Admin Panel
 */
export default function DiwaliBanner({ className = '', compact = false }) {
  if (compact) {
    return (
      <div
        className={`w-full py-1.5 px-3 rounded-2xl bg-gradient-to-r from-amber-950 via-rose-950 to-amber-950 border border-amber-500/50 shadow-md text-center text-white flex items-center justify-between gap-2 overflow-hidden ${className}`}
      >
        <GlowingDiya size="xs" />
        <div className="flex-1 text-center">
          <p className="text-[11px] sm:text-xs font-black tracking-wide text-amber-200">
            🪔 शुभ दीपावली की हार्दिक शुभकामनाएँ — उत्तम चैरिटेबल वेलफेयर फाउंडेशन परिवार 🪔
          </p>
        </div>
        <GlowingDiya size="xs" />
      </div>
    );
  }

  return (
    <div
      className={`w-full relative overflow-hidden rounded-3xl p-3 sm:p-4 text-center select-none shadow-xl border-2 border-amber-400/80 bg-gradient-to-r from-[#3b0d11] via-[#5c1319] to-[#3b0d11] text-white ${className}`}
      style={{
        boxShadow: '0 10px 30px -5px rgba(245, 158, 11, 0.25), inset 0 0 20px rgba(251, 191, 36, 0.15)',
      }}
    >
      {/* Decorative Golden Inset Border */}
      <div className="absolute inset-1 border border-dashed border-amber-300/40 rounded-2xl pointer-events-none" />

      {/* Radiant Glow Behind Diyas */}
      <div className="relative z-10 flex flex-row items-center justify-between sm:justify-center gap-3 sm:gap-6">
        {/* Left Diya */}
        <div className="shrink-0 flex items-center">
          <GlowingDiya size="sm" />
        </div>

        {/* Center Royal Greeting */}
        <div className="space-y-0.5 text-center flex-1 sm:flex-initial">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-400/20 border border-amber-300/50 text-amber-200 text-[10px] sm:text-xs font-black tracking-wider uppercase">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" style={{ animationDuration: '6s' }} />
            <span>दीपावली महापर्व विशेषांक • 2026</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" style={{ animationDuration: '6s' }} />
          </div>

          <h2 className="text-base sm:text-xl lg:text-2xl font-black text-amber-100 tracking-tight font-serif drop-shadow-md">
            🪔 शुभ दीपावली की हार्दिक शुभकामनाएँ 🪔
          </h2>

          <p className="text-xs sm:text-sm font-bold text-amber-300 font-sans tracking-wide">
            उत्तम चैरिटेबल वेलफेयर फाउंडेशन परिवार की ओर से समस्त देशवासियों को सुख, शांति एवं समृद्धि की मंगलकामनाएँ।
          </p>
        </div>

        {/* Right Diya */}
        <div className="shrink-0 flex items-center">
          <GlowingDiya size="sm" />
        </div>
      </div>
    </div>
  );
}
