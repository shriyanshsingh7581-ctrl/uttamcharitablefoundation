import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ArrowLeft, ArrowRight } from 'lucide-react';

/**
 * Universal Table Slide Scroller Wrapper
 * Displays top horizontal slide buttons, top scrollbar track, and floating side navigation
 * so tables never cut off and users can effortlessly slide left & right from the top of the table.
 */
export default function TableSlideScroller({ children, className = '', title = '' }) {
  const scrollContainerRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);

  const checkScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 5);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5);
    const maxScroll = scrollWidth - clientWidth;
    setScrollProgress(maxScroll > 0 ? (scrollLeft / maxScroll) * 100 : 0);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollContainerRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, []);

  const slideLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -340, behavior: 'smooth' });
    }
  };

  const slideRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 340, behavior: 'smooth' });
    }
  };

  const handleTrackClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const el = scrollContainerRef.current;
    if (el) {
      const maxScroll = el.scrollWidth - el.clientWidth;
      el.scrollTo({ left: maxScroll * percentage, behavior: 'smooth' });
    }
  };

  return (
    <div className={`w-full space-y-2 select-none ${className}`}>
      {/* 1. TOP PROMINENT SLIDE CONTROLLER BAR */}
      <div className="flex items-center justify-between gap-1.5 sm:gap-2.5 bg-gradient-to-r from-pink-50 via-white to-pink-50 p-2 sm:p-2.5 rounded-2xl border-2 border-pink-300 shadow-xs">
        
        {/* Left Slide Button */}
        <button
          type="button"
          onClick={slideLeft}
          className={`px-2 sm:px-3 py-1.5 rounded-xl font-black text-xs transition-all flex items-center gap-1 sm:gap-1.5 shadow-xs cursor-pointer shrink-0 ${
            canScrollLeft
              ? 'bg-slate-900 hover:bg-slate-800 text-white active:scale-95'
              : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
          }`}
          title="Slide Table Left (बाएं स्लाइड करें)"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">बाएं स्लाइड करें</span>
          <span className="hidden xs:inline">Left</span>
        </button>

        {/* Center: Interactive Top Scroll Track & Indicator */}
        <div className="flex-1 min-w-0 max-w-md mx-1 sm:mx-2 flex flex-col items-center">
          <div className="w-full flex items-center justify-between text-[10px] font-bold text-slate-600 mb-0.5">
            <span className="truncate">{title || '⟷ रिपोर्ट स्लाइड करें (Slide Left/Right)'}</span>
            <span className="font-mono text-pink-700 font-extrabold ml-1">{Math.round(scrollProgress)}%</span>
          </div>
          {/* Clickable Scroll Bar Track */}
          <div
            onClick={handleTrackClick}
            className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden cursor-pointer border border-pink-200 relative"
            title="Click or drag to slide report"
          >
            <div
              className="h-full bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 rounded-full transition-all duration-150"
              style={{ width: `${Math.max(12, scrollProgress)}%` }}
            />
          </div>
        </div>

        {/* Right Slide Button */}
        <button
          type="button"
          onClick={slideRight}
          className={`px-2 sm:px-3 py-1.5 rounded-xl font-black text-xs transition-all flex items-center gap-1 sm:gap-1.5 shadow-xs cursor-pointer shrink-0 ${
            canScrollRight
              ? 'bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white active:scale-95 animate-pulse'
              : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
          }`}
          title="Slide Table Right (दाएं स्लाइड करें)"
        >
          <span className="hidden xs:inline">Right</span>
          <span className="hidden sm:inline">दाएं स्लाइड करें</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 2. TABLE WRAPPER WITH FLOATING SIDE BUTTONS */}
      <div className="relative group rounded-2xl overflow-hidden w-full max-w-full">
        {/* Floating Left Button (Desktop/Tablet only so it never blocks mobile touch/text) */}
        {canScrollLeft && (
          <button
            type="button"
            onClick={slideLeft}
            className="hidden sm:flex absolute left-1 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-slate-900/85 hover:bg-slate-900 text-white shadow-xl backdrop-blur-md border border-white/40 transition active:scale-95 cursor-pointer"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* Floating Right Button (Desktop/Tablet only) */}
        {canScrollRight && (
          <button
            type="button"
            onClick={slideRight}
            className="hidden sm:flex absolute right-1 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-pink-600/90 hover:bg-pink-700 text-white shadow-xl backdrop-blur-md border border-white/40 transition active:scale-95 cursor-pointer animate-pulse"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        {/* Scroll Container */}
        <div
          ref={scrollContainerRef}
          className="overflow-x-auto touch-pan-x scrollbar-thin scrollbar-thumb-pink-300 scrollbar-track-slate-100 rounded-2xl border border-pink-200 bg-white w-full max-w-full"
        >
          {children}
        </div>
      </div>
    </div>
  );
}
