import React from 'react';

/**
 * Animated Glowing Diya (दीया) with warm flickering flame and golden glow
 * @param {string} size - 'xs' | 'sm' | 'md' | 'lg'
 * @param {string} className - extra CSS classes
 */
export default function GlowingDiya({ size = 'md', className = '' }) {
  const sizeMap = {
    xs: { width: 22, height: 20, flameW: 6, flameH: 10 },
    sm: { width: 32, height: 28, flameW: 8, flameH: 14 },
    md: { width: 44, height: 38, flameW: 11, flameH: 19 },
    lg: { width: 60, height: 52, flameW: 15, flameH: 26 },
  };

  const { width, height, flameW, flameH } = sizeMap[size] || sizeMap.md;

  return (
    <div
      className={`inline-flex flex-col items-center justify-end select-none shrink-0 relative ${className}`}
      style={{ width, height }}
      aria-label="दीया (Glowing Diya)"
    >
      <style>{`
        @keyframes flameWiggle {
          0%, 100% {
            transform: scale(1) rotate(-1deg);
            filter: drop-shadow(0 0 8px #f59e0b) drop-shadow(0 0 16px #f97316);
          }
          25% {
            transform: scale(1.08, 0.94) rotate(2deg);
            filter: drop-shadow(0 0 12px #fbbf24) drop-shadow(0 0 20px #ea580c);
          }
          50% {
            transform: scale(0.96, 1.06) rotate(-2deg);
            filter: drop-shadow(0 0 9px #f59e0b) drop-shadow(0 0 18px #f97316);
          }
          75% {
            transform: scale(1.04, 0.98) rotate(1deg);
            filter: drop-shadow(0 0 14px #fbbf24) drop-shadow(0 0 22px #ea580c);
          }
        }
        @keyframes diyaAura {
          0%, 100% { opacity: 0.75; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.15); }
        }
      `}</style>

      {/* Radiant Ambient Aura */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: width * 1.4,
          height: height * 1.4,
          background: 'radial-gradient(circle, rgba(251,191,36,0.45) 0%, rgba(249,115,22,0.18) 50%, transparent 70%)',
          bottom: 2,
          animation: 'diyaAura 2s ease-in-out infinite',
        }}
      />

      {/* Flame (लौ) */}
      <div
        className="relative z-10"
        style={{
          width: flameW,
          height: flameH,
          marginBottom: -2,
          transformOrigin: 'bottom center',
          animation: 'flameWiggle 1.4s ease-in-out infinite',
        }}
      >
        <svg viewBox="0 0 20 32" className="w-full h-full">
          <defs>
            <linearGradient id="flameGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="25%" stopColor="#f97316" />
              <stop offset="65%" stopColor="#fbbf24" />
              <stop offset="95%" stopColor="#ffffff" />
            </linearGradient>
            <radialGradient id="innerFlame" cx="50%" cy="70%" r="50%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="60%" stopColor="#fef08a" />
              <stop offset="100%" stopColor="#f59e0b" />
            </radialGradient>
          </defs>
          {/* Outer Tear Shape Flame */}
          <path
            d="M 10,0 C 13,10 20,18 20,24 C 20,28.4 15.5,32 10,32 C 4.5,32 0,28.4 0,24 C 0,18 7,10 10,0 Z"
            fill="url(#flameGrad)"
          />
          {/* Inner Bright Core */}
          <ellipse cx="10" cy="23" rx="4" ry="7" fill="url(#innerFlame)" />
        </svg>
      </div>

      {/* Clay Diya Body (मिट्टी का दीपक) */}
      <div className="relative z-10 w-full" style={{ height: height * 0.52 }}>
        <svg viewBox="0 0 60 30" className="w-full h-full drop-shadow-md">
          <defs>
            <linearGradient id="clayGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#d97706" />
              <stop offset="40%" stopColor="#b45309" />
              <stop offset="100%" stopColor="#78350f" />
            </linearGradient>
            <linearGradient id="goldRim" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#fef08a" />
            </linearGradient>
          </defs>
          {/* Bowl */}
          <path
            d="M 3,6 Q 30,34 57,6 Q 48,2 30,2 Q 12,2 3,6 Z"
            fill="url(#clayGrad)"
            stroke="#92400e"
            strokeWidth="0.8"
          />
          {/* Gold Decorative Rim */}
          <ellipse cx="30" cy="6" rx="27" ry="4" fill="#92400e" />
          <ellipse cx="30" cy="5.2" rx="25.5" ry="3.2" fill="url(#goldRim)" />
          <ellipse cx="30" cy="5.8" rx="20" ry="2" fill="#78350f" />
          {/* Traditional motif dots */}
          <circle cx="15" cy="14" r="1.3" fill="#fef08a" opacity="0.85" />
          <circle cx="22" cy="18" r="1.3" fill="#fef08a" opacity="0.85" />
          <circle cx="30" cy="20" r="1.5" fill="#fef08a" opacity="0.95" />
          <circle cx="38" cy="18" r="1.3" fill="#fef08a" opacity="0.85" />
          <circle cx="45" cy="14" r="1.3" fill="#fef08a" opacity="0.85" />
        </svg>
      </div>
    </div>
  );
}
