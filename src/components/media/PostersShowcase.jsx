import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Sparkles, 
  ExternalLink,
  Award,
  Calendar,
  Image as ImageIcon
} from 'lucide-react';
import { rtdb } from '../../lib/firebase';
import { ref, onValue } from 'firebase/database';
import GlowingDiya from '../diwali/GlowingDiya';
import { safeText } from '../../lib/constants';

/**
 * Universal Multi-Slot Banner & Poster Component
 * @param {string} slot - 'hero' | 'events' | 'dashboard' | 'popup'
 * @param {string} className - extra CSS classes
 */
export default function PostersShowcase({ slot = 'hero', className = '' }) {
  const [posters, setPosters] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    const postersRef = ref(rtdb, 'media_gallery/posters');
    const unsubscribe = onValue(postersRef, (snapshot) => {
      if (snapshot.exists()) {
        const raw = snapshot.val();
        const list = Object.entries(raw).map(([id, data]) => ({
          id,
          ...data,
        })).filter((p) => {
          if (p.active === false) return false;
          if (slot === 'all') return true;
          return p.slot === slot || p.slot === 'all';
        });

        // Sort newest first
        list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setPosters(list);

        // Check popup session storage
        if (slot === 'popup' && list.length > 0) {
          try {
            const dismissed = sessionStorage.getItem('ucwf_festive_popup_dismissed');
            if (!dismissed) {
              setShowPopup(true);
            }
          } catch {
            setShowPopup(true);
          }
        }
      } else {
        setPosters([]);
      }
    });

    return () => unsubscribe();
  }, [slot]);

  // Auto-advance hero banner slider every 5 seconds
  useEffect(() => {
    if (slot !== 'hero' || posters.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % posters.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slot, posters.length]);

  const handleDismissPopup = () => {
    setShowPopup(false);
    try {
      sessionStorage.setItem('ucwf_festive_popup_dismissed', 'true');
    } catch {}
  };

  // If no posters exist for this slot, don't render empty markup (except for popup)
  if (posters.length === 0) return null;

  // =========================================================================
  // SLOT 1: TOP HERO FESTIVE BANNER / SLIDER
  // =========================================================================
  if (slot === 'hero') {
    const current = posters[currentSlide] || posters[0];
    return (
      <div className={`w-full relative rounded-3xl overflow-hidden shadow-2xl border-2 border-amber-400/80 bg-slate-950 ${className}`}>
        <div className="relative aspect-[21/9] sm:aspect-[24/8] w-full overflow-hidden flex items-center justify-center">
          <img
            src={current.imageUrl}
            alt={current.title || 'Festive Hero Banner'}
            className="w-full h-full object-cover transition-all duration-700"
          />

          {/* Golden Gradient Vignette Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

          {/* Banner Title / Message */}
          {current.title && (
            <div className="absolute bottom-4 left-4 right-4 sm:left-8 sm:bottom-6 z-10 max-w-2xl bg-black/60 backdrop-blur-md p-3 sm:p-4 rounded-2xl border border-amber-400/40 text-white">
              <div className="flex items-center gap-2 mb-1">
                <GlowingDiya size="xs" />
                <span className="text-[10px] sm:text-xs font-bold text-amber-300 uppercase tracking-wider">
                  उत्तम चैरिटेबल वेलफेयर फाउंडेशन विशेषांक
                </span>
              </div>
              <h3 className="text-sm sm:text-xl font-black text-amber-100 font-serif leading-tight">
                {safeText(current.title)}
              </h3>
              {current.message && (
                <p className="text-xs sm:text-sm text-slate-200 mt-1 line-clamp-2">
                  {safeText(current.message)}
                </p>
              )}
            </div>
          )}

          {/* Navigation Arrows for Slider */}
          {posters.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => setCurrentSlide((prev) => (prev - 1 + posters.length) % posters.length)}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/80 text-white border border-white/20 backdrop-blur-md transition cursor-pointer"
                aria-label="Previous Banner"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentSlide((prev) => (prev + 1) % posters.length)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/80 text-white border border-white/20 backdrop-blur-md transition cursor-pointer"
                aria-label="Next Banner"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              {/* Slider Dots */}
              <div className="absolute bottom-2 right-4 z-20 flex items-center gap-1.5">
                {posters.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentSlide(idx)}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      idx === currentSlide
                        ? 'w-6 bg-amber-400 shadow-md'
                        : 'w-2 bg-white/50 hover:bg-white/80'
                    }`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // SLOT 2: MIDDLE EVENT & CAMPAIGN POSTER GRID
  // =========================================================================
  if (slot === 'events') {
    return (
      <div className={`space-y-4 w-full max-w-full overflow-hidden ${className}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-amber-500/30 gap-2">
          <div className="flex items-start sm:items-center gap-2 min-w-0 flex-1">
            <GlowingDiya size="xs" className="shrink-0 mt-0.5 sm:mt-0" />
            <div className="min-w-0 flex-1">
              <h3 className="text-sm sm:text-lg font-black text-slate-900 font-serif flex items-center gap-1.5 flex-wrap">
                <ImageIcon className="w-4 h-4 text-amber-600 shrink-0" />
                <span>विशेष उत्सव, कार्यक्रम एवं सूचना पोस्टर</span>
              </h3>
              <p className="text-xs text-slate-500 truncate">
                संस्था के सेवा अभियानों एवं पर्व-उत्सवों से जुड़े आधिकारिक पोस्टर
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {posters.map((poster) => (
            <div
              key={poster.id}
              className="group rounded-3xl overflow-hidden bg-white border-2 border-amber-300/70 shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
            >
              <div className="relative aspect-[4/3] bg-slate-950 overflow-hidden">
                <img
                  src={poster.imageUrl}
                  alt={poster.title || 'Event Poster'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-amber-500/90 text-slate-950 font-black text-[10px] tracking-wider uppercase backdrop-blur-md shadow-xs">
                  आधिकारिक पोस्टर
                </div>
              </div>

              <div className="p-4 space-y-1.5">
                <h4 className="font-black text-slate-900 text-sm line-clamp-1">
                  {safeText(poster.title || 'उत्तम चैरिटेबल वेलफेयर फाउंडेशन')}
                </h4>
                {poster.message && (
                  <p className="text-xs text-slate-600 line-clamp-2">
                    {safeText(poster.message)}
                  </p>
                )}
                {poster.link && (
                  <div className="pt-2">
                    <a
                      href={poster.link}
                      target={poster.link.startsWith('http') ? '_blank' : '_self'}
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
                    >
                      <span>अधिक जानकारी देखें</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // =========================================================================
  // SLOT 3: STAFF / MEMBER DASHBOARD NOTICE BANNER
  // =========================================================================
  if (slot === 'dashboard') {
    const poster = posters[0];
    if (!poster) return null;

    return (
      <div className={`w-full rounded-3xl overflow-hidden border-2 border-amber-400 bg-gradient-to-r from-amber-950 via-slate-950 to-emerald-950 text-white shadow-xl p-4 sm:p-5 relative ${className}`}>
        <div className="flex flex-col md:flex-row items-center gap-5">
          {/* Poster Thumbnail */}
          <div className="w-full md:w-56 aspect-[16/10] rounded-2xl overflow-hidden border-2 border-amber-400 shadow-md shrink-0 bg-black">
            <img
              src={poster.imageUrl}
              alt={poster.title || "Dashboard Announcement"}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Details */}
          <div className="flex-1 space-y-1 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-400/20 border border-amber-400 text-amber-300 text-[10px] font-black uppercase">
              <Sparkles className="w-3 h-3" />
              <span>महत्वपूर्ण सूचना एवं उत्सव संदेश (Official Notice)</span>
            </div>
            <h3 className="text-base sm:text-xl font-black text-amber-100 font-serif">
              {safeText(poster.title || 'शुभ दीपावली एवं विशेष घोषणा')}
            </h3>
            {poster.message && (
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                {safeText(poster.message)}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // SLOT 4: SPECIAL FESTIVE POPUP POSTER (DISMISSIBLE MODAL)
  // =========================================================================
  if (slot === 'popup' && showPopup) {
    const popupPoster = posters[0];
    if (!popupPoster) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
        <div className="relative max-w-lg w-full bg-gradient-to-b from-amber-950 to-slate-950 rounded-3xl overflow-hidden border-2 border-amber-400 shadow-2xl text-white">
          {/* Close Button */}
          <button
            type="button"
            onClick={handleDismissPopup}
            className="absolute top-3 right-3 z-30 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/30 backdrop-blur-md transition cursor-pointer"
            aria-label="Close Festive Popup"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Top Header */}
          <div className="bg-gradient-to-r from-amber-700 via-yellow-600 to-amber-700 py-2 px-4 text-center border-b border-amber-400">
            <h4 className="font-black text-xs sm:text-sm text-slate-950 uppercase tracking-widest flex items-center justify-center gap-2">
              <GlowingDiya size="xs" />
              <span>शुभ दीपावली महापर्व संदेश • 2026</span>
              <GlowingDiya size="xs" />
            </h4>
          </div>

          {/* Poster Image */}
          <div className="max-h-[380px] overflow-hidden bg-black flex items-center justify-center">
            <img
              src={popupPoster.imageUrl}
              alt={popupPoster.title || "Festive Greeting"}
              className="w-full h-auto object-contain max-h-[380px]"
            />
          </div>

          {/* Caption & Dismiss Button */}
          <div className="p-4 text-center space-y-2 bg-slate-950/90 border-t border-amber-500/30">
            {popupPoster.title && (
              <h3 className="font-black text-base text-amber-200 font-serif">
                {safeText(popupPoster.title)}
              </h3>
            )}
            {popupPoster.message && (
              <p className="text-xs text-slate-300 leading-relaxed">
                {safeText(popupPoster.message)}
              </p>
            )}
            <button
              type="button"
              onClick={handleDismissPopup}
              className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-md transition cursor-pointer"
            >
              धन्यवाद / वेबसाइट पर आगे बढ़ें (Continue)
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
