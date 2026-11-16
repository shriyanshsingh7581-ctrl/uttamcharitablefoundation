import React from 'react';

/**
 * Ornamental Marigold & Mango Leaf Toran (गेंदे के फूलों और आम के पत्तों की माला)
 * Elegant festive garland strip along the top of Website, Admin Panel & Dashboard
 */
export default function DiwaliToran({ className = '' }) {
  // A repeating scallop unit with mango leaves and marigolds
  const scallops = Array.from({ length: 18 });

  return (
    <div
      className={`w-full max-w-full overflow-hidden pointer-events-none select-none z-30 relative ${className}`}
      style={{ height: '38px', maxWidth: '100%' }}
      aria-hidden="true"
    >
      <style>{`
        @keyframes toranSway {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(1.5px) rotate(0.4deg); }
        }
      `}</style>

      {/* Top Thread Line (डोरी) */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 shadow-xs" />

      {/* Repeating Garland of Mango Leaves & Marigold Medallions */}
      <div
        className="flex items-start justify-around w-full max-w-full overflow-hidden"
        style={{
          animation: 'toranSway 4s ease-in-out infinite',
          transformOrigin: 'top center',
        }}
      >
        {scallops.map((_, i) => (
          <div key={i} className={`flex flex-col items-center shrink-0 -mx-1 relative ${i >= 6 ? 'hidden sm:flex' : ''} ${i >= 12 ? 'sm:hidden md:flex' : ''}`}>
            {/* Scalloped Arch */}
            <svg width="74" height="36" viewBox="0 0 74 36" fill="none">
              <defs>
                {/* Mango Leaf Green Gradient */}
                <linearGradient id={`leafGrad_${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#15803d" />
                  <stop offset="60%" stopColor="#166534" />
                  <stop offset="100%" stopColor="#052e16" />
                </linearGradient>
                {/* Saffron / Orange Marigold Gradient */}
                <radialGradient id={`marigoldOrange_${i}`} cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#fed7aa" />
                  <stop offset="30%" stopColor="#f97316" />
                  <stop offset="85%" stopColor="#c2410c" />
                  <stop offset="100%" stopColor="#7c2d12" />
                </radialGradient>
                {/* Yellow Marigold Gradient */}
                <radialGradient id={`marigoldYellow_${i}`} cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#fef08a" />
                  <stop offset="40%" stopColor="#eab308" />
                  <stop offset="85%" stopColor="#ca8a04" />
                  <stop offset="100%" stopColor="#854d0e" />
                </radialGradient>
              </defs>

              {/* Draped golden bead string */}
              <path
                d="M 2,2 Q 37,16 72,2"
                stroke="#f59e0b"
                strokeWidth="1.5"
                strokeDasharray="2.5 2"
                fill="none"
              />

              {/* Left Mango Leaf (आम का पत्ता) */}
              <path
                d="M 18,2 C 18,12 12,24 16,30 C 17,24 23,12 21,2 Z"
                fill={`url(#leafGrad_${i})`}
                stroke="#14532d"
                strokeWidth="0.5"
              />
              {/* Center Hanging Mango Leaf */}
              <path
                d="M 37,2 C 34,14 29,28 37,36 C 45,28 40,14 37,2 Z"
                fill={`url(#leafGrad_${i})`}
                stroke="#14532d"
                strokeWidth="0.5"
              />
              {/* Right Mango Leaf */}
              <path
                d="M 56,2 C 54,12 60,24 56,30 C 52,24 53,12 53,2 Z"
                fill={`url(#leafGrad_${i})`}
                stroke="#14532d"
                strokeWidth="0.5"
              />

              {/* Left Orange Marigold Flower (गेंदे का फूल) */}
              <circle cx="10" cy="5" r="5" fill={`url(#marigoldOrange_${i})`} />
              <circle cx="10" cy="5" r="2.2" fill="#fef08a" opacity="0.9" />

              {/* Center Golden-Yellow Marigold Flower */}
              <circle cx="37" cy="8" r="6" fill={`url(#marigoldYellow_${i})`} />
              <circle cx="37" cy="8" r="2.8" fill="#ffffff" opacity="0.9" />

              {/* Right Orange Marigold Flower */}
              <circle cx="64" cy="5" r="5" fill={`url(#marigoldOrange_${i})`} />
              <circle cx="64" cy="5" r="2.2" fill="#fef08a" opacity="0.9" />

              {/* Hanging Golden Bead Drop */}
              <circle cx="37" cy="22" r="1.5" fill="#f59e0b" />
              <circle cx="37" cy="27" r="1.2" fill="#fef08a" />
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
}
