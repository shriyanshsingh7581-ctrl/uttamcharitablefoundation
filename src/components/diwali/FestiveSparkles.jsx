import React, { useMemo } from 'react';

/**
 * Subtle Non-Intrusive Golden Sparkles & Gentle Fireworks Aura
 * Guaranteed pointer-events: none — 0% interference with clicks, forms or tables.
 */
export default function FestiveSparkles() {
  // Generate random sparkles once
  const sparkles = useMemo(() => {
    return Array.from({ length: 24 }).map((_, i) => ({
      id: i,
      left: `${(i * 4.2 + (i % 5) * 3) % 96}%`,
      top: `${(i * 7.5 + (i % 7) * 4) % 92}%`,
      size: 4 + (i % 4) * 3,
      delay: (i * 0.35) % 4,
      duration: 2.5 + (i % 3) * 1.2,
      color: i % 3 === 0 ? '#fbbf24' : i % 3 === 1 ? '#f59e0b' : '#fef08a',
    }));
  }, []);

  return (
    <div
      className="fixed inset-0 pointer-events-none z-10 overflow-hidden select-none"
      aria-hidden="true"
    >
      <style>{`
        @keyframes sparkleTwinkle {
          0%, 100% {
            opacity: 0.15;
            transform: scale(0.6) rotate(0deg);
          }
          50% {
            opacity: 0.85;
            transform: scale(1.3) rotate(45deg);
            filter: drop-shadow(0 0 6px rgba(251, 191, 36, 0.9));
          }
        }
        @keyframes fireworkBurstSoft {
          0% {
            opacity: 0;
            transform: scale(0.2);
          }
          40% {
            opacity: 0.45;
            transform: scale(1);
          }
          80%, 100% {
            opacity: 0;
            transform: scale(1.6);
          }
        }
      `}</style>

      {/* Gentle Ambient Warm Golden Aura in Corners */}
      <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />

      {/* Subtle Distant Fireworks Aura (Soft Ring Bursts) */}
      <div
        className="absolute top-20 left-[15%] w-32 h-32 rounded-full border border-amber-400/30"
        style={{
          animation: 'fireworkBurstSoft 6s ease-out infinite',
          animationDelay: '1s',
          background: 'radial-gradient(circle, rgba(251,191,36,0.15) 0%, transparent 70%)',
        }}
      />
      <div
        className="absolute top-36 right-[18%] w-40 h-40 rounded-full border border-orange-400/25"
        style={{
          animation: 'fireworkBurstSoft 7s ease-out infinite',
          animationDelay: '3.5s',
          background: 'radial-gradient(circle, rgba(249,115,22,0.15) 0%, transparent 70%)',
        }}
      />

      {/* Twinkling Golden Star Sparkles */}
      {sparkles.map((s) => (
        <div
          key={s.id}
          className="absolute"
          style={{
            left: s.left,
            top: s.top,
            width: s.size,
            height: s.size,
            animation: `sparkleTwinkle ${s.duration}s ease-in-out infinite`,
            animationDelay: `${s.delay}s`,
          }}
        >
          <svg viewBox="0 0 24 24" className="w-full h-full">
            <path
              d="M12 0 L14.5 9.5 L24 12 L14.5 14.5 L12 24 L9.5 14.5 L0 12 L9.5 9.5 Z"
              fill={s.color}
            />
          </svg>
        </div>
      ))}
    </div>
  );
}
