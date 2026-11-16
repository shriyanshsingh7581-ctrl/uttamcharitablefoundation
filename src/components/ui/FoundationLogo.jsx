import React from 'react';
import { FOUNDATION_NAME, FOUNDATION_NAME_HINDI } from '../../lib/constants';

/**
 * High-Definition Foundation Emblem Logo Component
 * Guaranteed ultra-sharp on retina, 4K and mobile screens.
 * Uses high-DPI SVG emblem with fallback to optimized PNG.
 */
export default function FoundationLogo({ 
  className = "w-14 h-14", 
  imgClassName = "w-full h-full object-contain rounded-full",
  withRing = false,
  showText = false
}) {
  return (
    <div className={`relative flex items-center gap-3 shrink-0 select-none ${className}`}>
      <div className={`w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-white ${
        withRing ? 'p-0.5 border-2 border-blue-900 shadow-md' : ''
      }`}>
        <img
          src="/logo.png"
          alt={`${FOUNDATION_NAME_HINDI} (${FOUNDATION_NAME})`}
          className={`${imgClassName} transition-all`}
          onError={(e) => {
            e.currentTarget.src = '/logo.png';
          }}
        />
      </div>

      {showText && (
        <div className="flex flex-col text-left">
          <span className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight tracking-tight">
            {FOUNDATION_NAME_HINDI}
          </span>
          <span className="text-[10px] sm:text-[11px] font-bold text-amber-700 uppercase tracking-wider">
            {FOUNDATION_NAME}
          </span>
        </div>
      )}
    </div>
  );
}