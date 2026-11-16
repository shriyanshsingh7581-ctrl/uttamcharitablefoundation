import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  CheckCircle2,
  XCircle,
  Eye,
  Trash2,
  Clock,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  Play,
  Video,
  Image as ImageIcon,
  User,
  Phone,
  Calendar,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  X,
  Maximize2,
} from 'lucide-react';
import AdminLayout from './AdminLayout';
import { db, ref, onValue, update, remove } from '../../lib/firebase';
import { useLanguage } from '../../contexts/LanguageContext';

export default function AdminMediaApprovals() {
  const { isHindi } = useLanguage();

  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'approved' | 'rejected' | 'all'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMediaForModal, setSelectedMediaForModal] = useState(null);
  const [actionInProgressId, setActionInProgressId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [confirmDeleteItem, setConfirmDeleteItem] = useState(null);

  const showToast = (message, type = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Real-time Firebase Listener for /media_submissions
  useEffect(() => {
    setLoading(true);
    const mediaRef = ref(db, 'media_submissions');

    const unsubscribe = onValue(
      mediaRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const list = Object.keys(data).map((key) => ({
            id: key,
            ...data[key],
          }));

          // Sort by creation date (newest first)
          list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
          setSubmissions(list);
        } else {
          setSubmissions([]);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Firebase media_submissions listener error:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Compute metrics
  const pendingCount = submissions.filter((s) => s.status === 'pending').length;
  const approvedCount = submissions.filter((s) => s.status === 'approved').length;
  const rejectedCount = submissions.filter((s) => s.status === 'rejected').length;

  // Filtered submissions
  const filteredSubmissions = submissions.filter((item) => {
    // Status filter
    if (activeTab !== 'all' && item.status !== activeTab) {
      return false;
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.uploaderName?.toLowerCase().includes(q);
      const matchPhone = item.uploaderPhone?.toLowerCase().includes(q);
      const matchMemberId = item.uploaderMemberId?.toLowerCase().includes(q);
      const matchCaption = item.caption?.toLowerCase().includes(q);
      return matchName || matchPhone || matchMemberId || matchCaption;
    }

    return true;
  });

  // Action: Approve Submission
  const handleApprove = async (item) => {
    setActionInProgressId(item.id);
    try {
      const itemRef = ref(db, `media_submissions/${item.id}`);
      await update(itemRef, {
        status: 'approved',
        approvedAt: new Date().toISOString(),
      });
      showToast(
        isHindi
          ? `फोटो/वीडियो स्वीकृत हो गई और लाइव गैलरी में प्रकाशित कर दी गई है!`
          : `Media approved and published to Public Gallery!`,
        'success'
      );
    } catch (err) {
      console.error('Approve media error:', err);
      showToast(err.message || 'Failed to approve media', 'error');
    } finally {
      setActionInProgressId(null);
    }
  };

  // Action: Reject Submission
  const handleReject = async (item) => {
    setActionInProgressId(item.id);
    try {
      const itemRef = ref(db, `media_submissions/${item.id}`);
      await update(itemRef, {
        status: 'rejected',
        rejectedAt: new Date().toISOString(),
      });
      showToast(
        isHindi ? `फोटो/वीडियो को अस्वीकृत कर दिया गया है।` : `Media rejected.`,
        'info'
      );
    } catch (err) {
      console.error('Reject media error:', err);
      showToast(err.message || 'Failed to reject media', 'error');
    } finally {
      setActionInProgressId(null);
    }
  };

  // Action: Permanently Delete Submission
  const handleDelete = (item) => {
    setConfirmDeleteItem(item);
  };

  const confirmDeleteMedia = async () => {
    const item = confirmDeleteItem;
    if (!item) return;
    setConfirmDeleteItem(null);
    setActionInProgressId(item.id);
    try {
      const itemRef = ref(db, `media_submissions/${item.id}`);
      await remove(itemRef);
      showToast(isHindi ? 'फ़ाइल हटा दी गई है।' : 'Submission removed.', 'success');
      if (selectedMediaForModal?.id === item.id) {
        setSelectedMediaForModal(null);
      }
    } catch (err) {
      console.error('Delete media error:', err);
      showToast(err.message || 'Failed to delete media', 'error');
    } finally {
      setActionInProgressId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Toast Feedback */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`fixed top-4 right-4 z-[9999] p-4 rounded-2xl shadow-2xl flex items-center gap-3 text-xs sm:text-sm font-semibold max-w-md ${
                toastMessage.type === 'error'
                  ? 'bg-rose-600 text-white'
                  : toastMessage.type === 'info'
                  ? 'bg-slate-800 text-white'
                  : 'bg-emerald-600 text-white'
              }`}
            >
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>{toastMessage.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                <Camera className="w-3.5 h-3.5 text-emerald-700" />
                {isHindi ? 'मीडिया अनुमोदन केंद्र' : 'Media Verification Center'}
              </span>
              <span className="text-xs text-gray-500 font-medium">Cloudinary & Firebase RTDB</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight mt-1 flex items-center gap-3">
              <span>{isHindi ? 'फोटो व वीडियो अनुमोदन' : 'Media Submissions & Approvals'}</span>
              {pendingCount > 0 && (
                <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-amber-500 text-white shadow-sm animate-pulse">
                  {pendingCount} {isHindi ? 'प्रतीक्षारत' : 'Pending'}
                </span>
              )}
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              {isHindi
                ? 'सदस्यों द्वारा अपलोड की गई सेवा गतिविधियों, शिविरों व राहत कार्यों की तस्वीरें व वीडियो जांचें और सार्वजनिक गैलरी हेतु स्वीकृत करें।'
                : 'Review member-uploaded photos & videos. Approved items are instantly featured in the Public Seva Gallery.'}
            </p>
          </div>
        </div>

        {/* Metric KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm">
            <span className="text-xs text-gray-500 font-semibold block">{isHindi ? 'कुल सबमिशन' : 'Total Uploads'}</span>
            <span className="text-2xl sm:text-3xl font-black text-gray-900">{submissions.length}</span>
          </div>

          <div className="bg-amber-50/70 p-4 sm:p-5 rounded-2xl border border-amber-200/80 shadow-sm">
            <span className="text-xs text-amber-800 font-semibold block">{isHindi ? 'समीक्षा हेतु शेष' : 'Pending Review'}</span>
            <span className="text-2xl sm:text-3xl font-black text-amber-900">{pendingCount}</span>
          </div>

          <div className="bg-emerald-50/70 p-4 sm:p-5 rounded-2xl border border-emerald-200/80 shadow-sm">
            <span className="text-xs text-emerald-800 font-semibold block">{isHindi ? 'स्वीकृत व लाइव' : 'Approved & Live'}</span>
            <span className="text-2xl sm:text-3xl font-black text-emerald-900">{approvedCount}</span>
          </div>

          <div className="bg-rose-50/70 p-4 sm:p-5 rounded-2xl border border-rose-200/80 shadow-sm">
            <span className="text-xs text-rose-800 font-semibold block">{isHindi ? 'अस्वीकृत' : 'Rejected'}</span>
            <span className="text-2xl sm:text-3xl font-black text-rose-900">{rejectedCount}</span>
          </div>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-2.5 sm:p-3 rounded-2xl border border-gray-100 shadow-sm">
          {/* Tabs */}
          <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-xl overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('pending')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'pending'
                  ? 'bg-white text-emerald-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>{isHindi ? 'प्रतीक्षारत' : 'Pending'}</span>
              {pendingCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-extrabold">
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('approved')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'approved'
                  ? 'bg-white text-emerald-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {isHindi ? 'स्वीकृत' : 'Approved'} ({approvedCount})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('rejected')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'rejected'
                  ? 'bg-white text-emerald-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {isHindi ? 'अस्वीकृत' : 'Rejected'} ({rejectedCount})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-white text-emerald-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {isHindi ? 'सभी' : 'All'} ({submissions.length})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={isHindi ? 'नाम, मोबाइल, या विवरण खोजें...' : 'Search by uploader, phone, caption...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-stone-50"
            />
          </div>
        </div>

        {/* Content Grid */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-700 rounded-full animate-spin" />
            <p className="text-xs text-gray-500 font-semibold animate-pulse">
              {isHindi ? 'मीडिया सबमिशन लोड हो रहे हैं...' : 'Loading media submissions...'}
            </p>
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-stone-100 text-gray-400 flex items-center justify-center mx-auto mb-3">
              <Camera className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-gray-800">
              {isHindi ? 'कोई मीडिया सबमिशन नहीं मिला' : 'No submissions found'}
            </h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
              {isHindi
                ? 'सदस्यों द्वारा अपलोड की गई फोटो व वीडियो यहाँ स्वतः दिखाई देंगी।'
                : 'Member uploaded photos and videos will appear here for review.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredSubmissions.map((item) => {
              const isVideo = item.mediaType === 'video';
              const isPending = item.status === 'pending';
              const isApproved = item.status === 'approved';
              const isRejected = item.status === 'rejected';

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col hover:border-emerald-200 hover:shadow-md transition-all group"
                >
                  {/* Media Preview Box */}
                  <div className="relative aspect-video bg-slate-950 overflow-hidden">
                    {isVideo ? (
                      <video
                        src={item.mediaUrl}
                        controls
                        playsInline
                        preload="metadata"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div
                        onClick={() => setSelectedMediaForModal(item)}
                        className="w-full h-full cursor-zoom-in group/img relative"
                      >
                        <img
                          src={item.mediaUrl}
                          alt={item.caption || 'Seva Upload'}
                          className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <Maximize2 className="w-6 h-6" />
                        </div>
                      </div>
                    )}

                    {/* Media Type Badge */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/60 text-white backdrop-blur-md flex items-center gap-1">
                        {isVideo ? <Video className="w-3 h-3 text-red-400" /> : <ImageIcon className="w-3 h-3 text-amber-400" />}
                        <span>{item.mediaType || 'Image'}</span>
                      </span>

                      {/* Status Badge */}
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${
                          isPending
                            ? 'bg-amber-500/90 text-white'
                            : isApproved
                            ? 'bg-emerald-600/90 text-white'
                            : 'bg-rose-600/90 text-white'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    {/* External Cloudinary Link */}
                    <a
                      href={item.mediaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 text-white/80 hover:text-white backdrop-blur-md transition-all"
                      title="Open full file"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {/* Details Section */}
                  <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      {/* Caption */}
                      <p className="text-xs sm:text-sm font-semibold text-gray-900 leading-snug line-clamp-3">
                        {item.caption || 'No caption provided'}
                      </p>

                      {/* Uploader info */}
                      <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5 text-xs text-gray-500">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1 text-gray-700 font-bold">
                            <User className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{item.uploaderName || 'Anonymous Member'}</span>
                          </span>
                          {item.uploaderMemberId && (
                            <span className="font-mono text-[11px] bg-stone-100 px-1.5 py-0.5 rounded text-gray-600">
                              {item.uploaderMemberId}
                            </span>
                          )}
                        </div>

                        {item.uploaderPhone && (
                          <div className="flex items-center gap-1 text-gray-600 text-[11px]">
                            <Phone className="w-3 h-3 text-gray-400" />
                            <span>{item.uploaderPhone}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-1 text-gray-400 text-[11px]">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {item.createdAt
                              ? new Date(item.createdAt).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'Recent'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {item.status !== 'approved' && (
                          <button
                            type="button"
                            disabled={actionInProgressId === item.id}
                            onClick={() => handleApprove(item)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{isHindi ? 'स्वीकृत करें' : 'Approve'}</span>
                          </button>
                        )}

                        {item.status !== 'rejected' && (
                          <button
                            type="button"
                            disabled={actionInProgressId === item.id}
                            onClick={() => handleReject(item)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>{isHindi ? 'अस्वीकृत' : 'Reject'}</span>
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        disabled={actionInProgressId === item.id}
                        onClick={() => handleDelete(item)}
                        className="p-1.5 rounded-xl text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                        title={isHindi ? 'स्थायी रूप से हटाएं' : 'Permanently Delete'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Lightbox Modal for Full Image Zoom */}
        <AnimatePresence>
          {selectedMediaForModal && (
            <div
              onClick={() => setSelectedMediaForModal(null)}
              className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="relative max-w-4xl max-h-[90vh] bg-transparent flex flex-col items-center"
              >
                <button
                  type="button"
                  onClick={() => setSelectedMediaForModal(null)}
                  className="absolute -top-12 right-0 p-2 rounded-full bg-white/20 hover:bg-white text-white hover:text-black transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                <img
                  src={selectedMediaForModal.mediaUrl}
                  alt={selectedMediaForModal.caption}
                  className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl"
                />

                <div className="mt-3 text-center text-white max-w-xl">
                  <p className="font-semibold text-sm">{selectedMediaForModal.caption}</p>
                  <p className="text-xs text-white/70 mt-1">
                    Uploaded by {selectedMediaForModal.uploaderName} •{' '}
                    {new Date(selectedMediaForModal.createdAt).toLocaleDateString('en-IN')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {confirmDeleteItem && (
            <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-gray-200 space-y-4">
                <div className="flex items-center gap-3 text-rose-600">
                  <AlertCircle className="w-6 h-6 shrink-0" />
                  <h3 className="text-base font-extrabold text-gray-900">
                    {isHindi ? 'फ़ाइल हटाएं?' : 'Delete Media Submission?'}
                  </h3>
                </div>
                <p className="text-xs text-gray-600">
                  {isHindi
                    ? 'क्या आप इस फ़ाइल को हमेशा के लिए हटाना चाहते हैं?'
                    : 'Are you sure you want to permanently delete this media submission?'}
                </p>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteItem(null)}
                    className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-100 cursor-pointer"
                  >
                    {isHindi ? 'रद्द करें' : 'Cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={confirmDeleteMedia}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm cursor-pointer"
                  >
                    {isHindi ? 'हटाएं' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  );
}

export { AdminMediaApprovals };
