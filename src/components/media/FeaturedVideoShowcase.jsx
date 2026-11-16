import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Video, 
  Sparkles, 
  Film, 
  ChevronLeft, 
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { rtdb } from '../../lib/firebase';
import { ref, onValue } from 'firebase/database';
import GlowingDiya from '../diwali/GlowingDiya';
import { safeText } from '../../lib/constants';

/**
 * Extracts YouTube video ID from various YouTube URL formats
 * Supports standard, embed, shorts, live, mobile, and youtu.be links
 */
function getYouTubeId(url) {
  if (!url) return null;
  const str = String(url).trim();
  const match = str.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([\w-]{11})/i);
  if (match && match[1]) return match[1];
  if (/^[\w-]{11}$/.test(str)) return str;
  return null;
}

/**
 * Continuous Autoplay & Loop Video Showcase
 * Royal-framed showcase section on Website Homepage & Dashboard
 */
export default function FeaturedVideoShowcase({ className = '', compact = false }) {
  const [videos, setVideos] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoRef = useRef(null);
  const iframeRef = useRef(null);
  const containerRef = useRef(null);

  // 1. Listen to Firebase RTDB for active videos
  useEffect(() => {
    const videosRef = ref(rtdb, 'media_gallery/videos');
    const unsubscribe = onValue(videosRef, (snapshot) => {
      if (snapshot.exists()) {
        const raw = snapshot.val();
        const list = Object.entries(raw).map(([id, data]) => ({
          id,
          ...data,
        })).filter(v => v.active !== false);

        // Sort: featured first, then newest
        list.sort((a, b) => {
          if (a.featured && !b.featured) return -1;
          if (!a.featured && b.featured) return 1;
          return (b.createdAt || 0) - (a.createdAt || 0);
        });

        setVideos(list);
      } else {
        setVideos([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const currentVideo = videos[currentIndex] || null;

  // 2. Continuous Autoplay on Mount & Video Change
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.warn('Autoplay waiting for user gesture or muted policy:', err);
            // Ensure muted for strict browser policies
            if (videoRef.current) {
              videoRef.current.muted = true;
              setIsMuted(true);
              videoRef.current.play().catch(() => {});
            }
          });
      }
    }
  }, [currentIndex, isMuted, currentVideo?.url]);

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (videoRef.current) {
      videoRef.current.muted = nextMuted;
    }
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({
            event: 'command',
            func: nextMuted ? 'mute' : 'unMute',
            args: []
          }),
          '*'
        );
      } catch (err) {
        console.warn('YouTube postMessage error:', err);
      }
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleNextVideo = () => {
    if (videos.length > 1) {
      setCurrentIndex((prev) => (prev + 1) % videos.length);
    }
  };

  const handlePrevVideo = () => {
    if (videos.length > 1) {
      setCurrentIndex((prev) => (prev - 1 + videos.length) % videos.length);
    }
  };

  const ytId = currentVideo?.url ? getYouTubeId(currentVideo.url) : null;
  const isDirectVideo = currentVideo?.url && !ytId;

  // Fallback demo video if no video uploaded yet
  const fallbackVideoUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

  return (
    <div
      ref={containerRef}
      className={`w-full rounded-3xl overflow-hidden border-2 border-amber-400/80 bg-gradient-to-b from-slate-950 via-slate-900 to-emerald-950 text-white shadow-2xl relative ${className}`}
      style={{
        boxShadow: '0 20px 50px -10px rgba(6, 78, 59, 0.45), 0 0 25px rgba(245, 158, 11, 0.2)',
      }}
    >
      {/* Top Header Strip with Decorative Gold Trimming */}
      <div className="bg-gradient-to-r from-amber-900 via-emerald-900 to-amber-900 px-3 sm:px-6 py-2.5 sm:py-3 border-b-2 border-amber-400/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
        <div className="flex items-start sm:items-center gap-2 min-w-0 flex-1">
          <GlowingDiya size="xs" className="shrink-0 mt-0.5 sm:mt-0" />
          <div className="min-w-0 flex-1">
            <h3 className="text-xs sm:text-base font-black text-amber-200 tracking-tight font-serif flex items-center gap-1.5 flex-wrap">
              <Film className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300 shrink-0" />
              <span>संस्था की गतिविधियाँ एवं विशेष वीडियो (Featured Video)</span>
            </h3>
            <p className="text-[9px] sm:text-xs text-emerald-200 font-medium truncate">
              उत्तम चैरिटेबल वेलफेयर फाउंडेशन — समाज सेवा, स्वास्थ्य शिविर एवं विशेष संदेश
            </p>
          </div>
        </div>

        {/* Video counter badge */}
        {videos.length > 0 && (
          <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 border border-amber-400/50 text-[11px] font-bold text-amber-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>लाइव वीडियो ({currentIndex + 1}/{videos.length})</span>
          </div>
        )}
      </div>

      {/* Main Video Display Area (16:9 Aspect Ratio) */}
      <div className="relative aspect-video w-full bg-black overflow-hidden flex items-center justify-center group">
        {currentVideo ? (
          ytId ? (
            // YouTube Autoplay Embed
            <iframe
              ref={iframeRef}
              src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=${isMuted ? 1 : 0}&loop=1&playlist=${ytId}&controls=1&modestbranding=1&rel=0&enablejsapi=1`}
              title={currentVideo.title || "Featured Video"}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            // HTML5 Video Player with continuous loop & autoplay
            <video
              ref={videoRef}
              src={currentVideo.url}
              autoPlay
              loop
              muted={isMuted}
              playsInline
              className="w-full h-full object-contain"
              onEnded={handleNextVideo}
              onError={(e) => {
                console.warn('Video failed to play:', currentVideo?.url);
              }}
            />
          )
        ) : (
          // Default Foundation Video Placeholder with Elegant Atmospheric Glow
          <div className="relative w-full h-full bg-gradient-to-br from-emerald-950 via-slate-950 to-amber-950 flex flex-col items-center justify-center text-center p-6 select-none overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full p-1 bg-white border-2 border-amber-400 shadow-xl mb-3 flex items-center justify-center shrink-0">
              <img 
                src="/logo.png" 
                alt="Foundation Logo" 
                className="w-full h-full object-contain rounded-full"
                onError={(e) => { e.currentTarget.src = '/logo.png'; }}
              />
            </div>
            <div className="flex items-center gap-2 mb-1.5">
              <GlowingDiya size="xs" />
              <h4 className="text-base sm:text-2xl font-black text-amber-200 font-serif drop-shadow-md">
                उत्तम चैरिटेबल वेलफेयर फाउंडेशन
              </h4>
              <GlowingDiya size="xs" />
            </div>
            <p className="text-xs sm:text-sm text-emerald-200 font-medium max-w-md px-4">
              व्यवस्थापक (Admin) द्वारा नया वीडियो अपलोड करने पर यहाँ स्वचालित रूप से वीडियो लगातार चलता रहेगा।
            </p>
          </div>
        )}

        {/* FLOATING PROMINENT UNMUTE BUTTON (Only shown when a video exists) */}
        {currentVideo && (
          <button
            type="button"
            onClick={toggleMute}
            className={`absolute bottom-2 left-2 sm:bottom-4 sm:left-4 z-20 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-2xl font-bold text-[10px] sm:text-xs flex items-center gap-1.5 sm:gap-2 shadow-2xl backdrop-blur-md transition-all active:scale-95 cursor-pointer border max-w-[calc(100%-1rem)] ${
              isMuted
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 border-amber-300 animate-bounce'
                : 'bg-black/70 hover:bg-black/90 text-white border-white/30'
            }`}
            title={isMuted ? "Unmute Audio" : "Mute Audio"}
          >
            {isMuted ? (
              <>
                <VolumeX className="w-4 h-4 text-slate-950" />
                <span>🔊 आवाज चालू करें (Unmute Sound)</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 text-emerald-400" />
                <span>🔇 म्यूट करें (Mute)</span>
              </>
            )}
          </button>
        )}

        {/* Control Overlay Buttons (Right - Only shown when a video exists) */}
        {currentVideo && (
          <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2">
            {isDirectVideo && (
              <button
                type="button"
                onClick={togglePlay}
                className="p-2 rounded-xl bg-black/60 hover:bg-black/80 text-white border border-white/20 backdrop-blur-md transition active:scale-95 cursor-pointer"
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
            )}

            {videos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrevVideo}
                  className="p-2 rounded-xl bg-black/60 hover:bg-black/80 text-white border border-white/20 backdrop-blur-md transition active:scale-95 cursor-pointer"
                  title="Previous Video"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextVideo}
                  className="p-2 rounded-xl bg-black/60 hover:bg-black/80 text-white border border-white/20 backdrop-blur-md transition active:scale-95 cursor-pointer"
                  title="Next Video"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}

            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-2 rounded-xl bg-black/60 hover:bg-black/80 text-white border border-white/20 backdrop-blur-md transition active:scale-95 cursor-pointer"
              title="Fullscreen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Video Caption & Title Overlay (Top Left) */}
        {currentVideo?.title && (
          <div className="absolute top-4 left-4 z-10 max-w-md bg-black/65 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/20 text-white">
            <p className="text-xs font-bold leading-tight line-clamp-1">{safeText(currentVideo.title)}</p>
            {currentVideo.caption && (
              <p className="text-[10px] text-amber-200 line-clamp-1">{safeText(currentVideo.caption)}</p>
            )}
          </div>
        )}
      </div>

      {/* Playlist Selector Bar if multiple videos exist */}
      {videos.length > 1 && (
        <div className="p-3 bg-slate-950/90 border-t border-amber-400/40 flex items-center gap-2 overflow-x-auto scrollbar-none">
          <span className="text-[11px] font-bold text-amber-300 shrink-0 px-1">अन्य वीडियो:</span>
          {videos.map((v, idx) => (
            <button
              key={v.id || idx}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                idx === currentIndex
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md font-black ring-2 ring-amber-300'
                  : 'bg-white/10 hover:bg-white/20 text-white/90 border border-white/10'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span className="truncate max-w-[140px]">{v.title || `वीडियो ${idx + 1}`}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
