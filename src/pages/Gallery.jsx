import React, { useState, useEffect } from 'react';
import { 
  Award, 
  Upload, 
  Filter, 
  Image as ImageIcon, 
  Video, 
  X, 
  CheckCircle2, 
  Calendar, 
  User, 
  Share2, 
  Sparkles,
  Loader2
} from 'lucide-react';
import { rtdb } from '../lib/firebase';
import { ref, onValue } from 'firebase/database';
import { safeText } from '../lib/constants';
import MediaUploadModal from '../components/MediaUploadModal';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

export default function Gallery() {
  const { currentUser } = useAuth();
  const { bi } = useLanguage();
  const [mediaList, setMediaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [lightboxItem, setLightboxItem] = useState(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Fetch all approved media from Firebase RTDB with 8s timeout guard & error callback
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 8000);
    const mediaRef = ref(rtdb, 'media_submissions');
    const unsubscribe = onValue(
      mediaRef,
      (snapshot) => {
        clearTimeout(timer);
        if (snapshot.exists()) {
          const data = snapshot.val();
          const approved = Object.values(data)
            .filter(item => item && item.status === 'approved')
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
          setMediaList(approved);
        } else {
          setMediaList([]);
        }
        setLoading(false);
      },
      (err) => {
        clearTimeout(timer);
        console.warn('Gallery RTDB listener error:', err);
        setLoading(false);
      }
    );

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  const categories = [
    { id: 'ALL', label: 'सभी सेवा कार्य (All)' },
    { id: 'शिक्षा सहायता (Child Education)', label: 'शिक्षा सहायता (Education)' },
    { id: 'चिकित्सा सहायता (Health & Medical)', label: 'चिकित्सा शिविर (Medical)' },
    { id: 'कंबल व वस्त्र वितरण (Blanket & Clothes Distribution)', label: 'कंबल व वस्त्र वितरण (Relief)' },
    { id: 'वृक्षारोपण एवं पर्यावरण (Environment & Plantation)', label: 'वृक्षारोपण (Environment)' },
    { id: 'महिला सशक्तिकरण (Women Empowerment)', label: 'महिला सशक्तिकरण' }
  ];

  const filteredMedia = mediaList.filter(item => {
    if (selectedCategory === 'ALL') return true;
    return item.category === selectedCategory;
  });

  return (
    <div className="min-h-screen py-8 sm:py-12 px-3 sm:px-6 lg:px-8 w-full max-w-full overflow-x-hidden">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 w-full max-w-full">
        
        {/* Gallery Header - Frosted Glass Container */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-200/60">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full glass-pill text-emerald-800 text-xs font-bold mb-3">
              <Award className="w-3.5 h-3.5 text-emerald-600" />
              <span>{bi('सेवा कार्य दीर्घा', 'Social Impact Media Gallery')}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              {bi('जमीनी सेवा कार्य एवं सामाजिक गतिविधियाँ', 'Ground Seva Drives & Social Activities')}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1.5 max-w-2xl leading-relaxed font-normal">
              {bi(
                'उत्तम चैरिटेबल वेलफेयर फाउंडेशन के समर्पित सदस्यों द्वारा पूरे देश में संचालित शिक्षा, स्वास्थ्य, राहत एवं वृक्षारोपण अभियानों के सचित्र एवं वीडियो प्रमाण।',
                'Verified photos and videos of education, healthcare, relief, and plantation drives led by dedicated members of Uttam Charitable Welfare Foundation.'
              )}
            </p>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setIsUploadModalOpen(true)}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 active:scale-95 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-emerald-700/20 border border-white/20 flex items-center gap-2 transition cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>{bi('सेवा कार्य फोटो/वीडियो अपलोड करें', 'Upload Seva Photo / Video')}</span>
            </button>
          </div>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-2.5 overflow-x-auto pb-2 no-scrollbar">
          <Filter className="w-4 h-4 text-slate-400 shrink-0 mr-1" />
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md shadow-emerald-700/20 border border-white/20'
                    : 'glass-pill text-slate-700 hover:text-emerald-800 hover:border-emerald-500/30'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Gallery Grid */}
        {loading ? (
          <div className="py-24 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto" />
            <p className="text-xs text-slate-500 font-medium">गैलरी डेटा लोड हो रहा है...</p>
          </div>
        ) : filteredMedia.length === 0 ? (
          <div className="glass-card-premium rounded-3xl p-16 text-center max-w-md mx-auto space-y-4 shadow-xl">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 text-emerald-700 mx-auto flex items-center justify-center border border-emerald-500/20">
              <ImageIcon className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="font-extrabold text-slate-900 text-base">इस श्रेणी में कोई मीडिया नहीं मिला</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-normal">
                क्या आपने हाल ही में कोई सामाजिक कार्य किया है? अपनी गतिविधि की फ़ोटो अथवा वीडियो अपलोड करें!
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsUploadModalOpen(true)}
              className="px-5 py-2.5 text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-md transition"
            >
              फ़ोटो/वीडियो अपलोड करें
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMedia.map((item) => (
              <div 
                key={item.id}
                className="glass-card-premium glass-card-interactive rounded-3xl overflow-hidden flex flex-col justify-between group shadow-xl"
              >
                {/* Media Container */}
                <div className="relative overflow-hidden bg-black/5 aspect-video flex items-center justify-center">
                  {item.resourceType === 'video' ? (
                    <video 
                      src={item.url} 
                      controls 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img 
                      src={item.url} 
                      alt={safeText(item.title)} 
                      onClick={() => setLightboxItem(item)}
                      className="w-full h-full object-cover cursor-pointer group-hover:scale-105 transition-transform duration-500"
                    />
                  )}
                  <span className="absolute top-3 left-3 px-3 py-1 rounded-full glass-pill-dark text-emerald-300 text-[10px] font-bold">
                    {safeText(item.category)}
                  </span>
                </div>

                {/* Card Info */}
                <div className="p-5 space-y-2 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm leading-snug">
                      {safeText(item.title)}
                    </h3>
                    {item.caption && (
                      <p className="text-xs text-slate-600 mt-1 line-clamp-3 leading-relaxed font-normal">
                        {safeText(item.caption)}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
                      <User className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{safeText(item.submittedByName)}</span>
                    </span>
                    <span>
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString('hi-IN') : '-'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* LIGHTBOX MODAL FOR FULL-SIZE IMAGE PREVIEW - Frosted Dark Glass */}
      {lightboxItem && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setLightboxItem(null)}
        >
          <div 
            className="relative max-w-4xl max-h-[90vh] glass-card-dark rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-white/20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-slate-900/80 backdrop-blur-md text-white flex items-center justify-between border-b border-white/10">
              <div>
                <h4 className="font-extrabold text-sm">{safeText(lightboxItem.title)}</h4>
                <p className="text-xs text-emerald-400 font-medium">{safeText(lightboxItem.category)} • प्रस्तुतकर्ता: {safeText(lightboxItem.submittedByName)}</p>
              </div>
              <button 
                type="button"
                onClick={() => setLightboxItem(null)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 flex-1 flex items-center justify-center overflow-auto max-h-[75vh]">
              {lightboxItem.resourceType === 'video' ? (
                <video src={lightboxItem.url} controls autoPlay className="max-h-[70vh] rounded-2xl" />
              ) : (
                <img src={lightboxItem.url} alt={safeText(lightboxItem.title)} className="max-h-[70vh] rounded-2xl object-contain" />
              )}
            </div>

            {lightboxItem.caption && (
              <div className="p-4 bg-slate-900/80 backdrop-blur-md text-xs text-slate-300 border-t border-white/10">
                {safeText(lightboxItem.caption)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upload Modal */}
      <MediaUploadModal 
        isOpen={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)} 
      />
    </div>
  );
}
