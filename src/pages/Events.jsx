import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  MapPin,
  Clock,
  Search,
  Filter,
  Users,
  HeartHandshake,
  Droplets,
  Glasses,
  BookOpen,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Info,
  Phone,
  Share2,
  CheckCircle2,
  X,
  Layers,
} from 'lucide-react';
import Layout from '../components/layout/Layout';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { supabase, db, ref, onValue } from '../lib/supabase';
import {
  FOUNDATION_NAME,
  FOUNDATION_NAME_HINDI,
  FOUNDATION_SHORT,
  CONTACT_INFO,
} from '../lib/constants';

export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' | 'past'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedEventModal, setSelectedEventModal] = useState(null);
  const [volunteerSuccess, setVolunteerSuccess] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // Fetch from Supabase Realtime & PostgreSQL
  useEffect(() => {
    let isMounted = true;

    // 1. Listen to Supabase Realtime /events
    let unsubRtdb = null;
    try {
      const eventsRef = ref(db, 'events');
      unsubRtdb = onValue(eventsRef, (snapshot) => {
        if (!isMounted) return;
        if (snapshot.exists()) {
          const val = snapshot.val();
          const list = Object.keys(val).map((k, idx) => ({
            id: k,
            ...val[k],
            gradient:
              idx % 3 === 0
                ? 'from-blue-600 via-indigo-700 to-teal-800'
                : idx % 3 === 1
                ? 'from-emerald-600 via-teal-700 to-cyan-800'
                : 'from-amber-600 via-orange-700 to-red-800',
          }));
          setEvents(list);
          setLoading(false);
          return;
        }
      });
    } catch (e) {
      console.warn('Supabase Realtime events note:', e);
    }

    // 2. Fallback / Supabase fetch if RTDB had no records
    const fetchSupabaseEvents = async () => {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .order('date', { ascending: true });

        if (!error && data && data.length > 0 && isMounted) {
          const formatted = data.map((item, idx) => ({
            ...item,
            id: item.id || `evt-${idx}`,
            title: item.title || 'Community Welfare Event',
            titleHindi: item.title_hindi || item.titleHindi || 'सामुदायिक सेवा कार्यक्रम',
            category: item.category || 'Welfare',
            date: item.date || item.event_date || new Date().toISOString().split('T')[0],
            time: item.time || '10:00 AM - 04:00 PM',
            venue: item.venue || 'Foundation Welfare Grounds',
            location: item.location || 'Uttar Pradesh, India',
            description: item.description || 'Community service and health assistance camp.',
            status: item.status || (new Date(item.date || item.event_date) < new Date() ? 'past' : 'upcoming'),
            gradient:
              idx % 3 === 0
                ? 'from-blue-600 via-indigo-700 to-teal-800'
                : idx % 3 === 1
                ? 'from-emerald-600 via-teal-700 to-cyan-800'
                : 'from-amber-600 via-orange-700 to-red-800',
          }));
          setEvents(formatted);
        } else if (isMounted) {
          setEvents((prev) => (prev.length > 0 ? prev : []));
        }
      } catch (err) {
        console.error('Events load error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchSupabaseEvents();

    return () => {
      isMounted = false;
      if (unsubRtdb) unsubRtdb();
    };
  }, []);

  // Filter categories
  const categories = ['All', 'Healthcare', 'Blood Support', 'Education', 'Relief', 'Empowerment'];

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      // Tab filter
      const isPast = evt.status === 'past' || new Date(evt.date) < new Date('2026-10-21');
      if (activeTab === 'upcoming' && isPast) return false;
      if (activeTab === 'past' && !isPast) return false;

      // Category filter
      if (selectedCategory !== 'All' && evt.category !== selectedCategory) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = evt.title?.toLowerCase().includes(q);
        const matchHindi = evt.titleHindi?.toLowerCase().includes(q);
        const matchLoc = evt.location?.toLowerCase().includes(q);
        const matchVenue = evt.venue?.toLowerCase().includes(q);
        return matchTitle || matchHindi || matchLoc || matchVenue;
      }

      return true;
    });
  }, [events, activeTab, selectedCategory, searchQuery]);

  // Format date helper
  const formatDate = (dateStr) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <Layout>
      {/* Hero Banner Header */}
      <section className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-950 text-white py-14 sm:py-20 relative overflow-hidden">
        {/* Ambient Glows */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-800/80 border border-emerald-600/50 text-emerald-200 text-xs font-bold uppercase tracking-wider mb-4 shadow-md">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>Ground Action & Relief Drives • सेवा कार्य</span>
            </span>

            <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white">
              Foundation Events & Camps
            </h1>
            <p className="text-xl sm:text-2xl font-bold text-amber-300 mt-2 font-sans">
              {FOUNDATION_NAME_HINDI} कार्यक्रम
            </p>
            <p className="mt-4 text-emerald-100/90 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
              Join our free eye diagnostics, emergency blood drives, rural child education distributions,
              and community welfare conventions held across districts.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Content Area */}
      <section className="py-10 sm:py-16 bg-stone-50 flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Controls: Tabs & Search Bar */}
          <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-xl border border-gray-100 mb-10 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            {/* Tabs: Upcoming vs Past */}
            <div className="flex bg-stone-100 p-1.5 rounded-2xl border border-gray-200/80 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setActiveTab('upcoming')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  activeTab === 'upcoming'
                    ? 'bg-emerald-700 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Upcoming Events (आगामी)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('past')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  activeTab === 'past'
                    ? 'bg-emerald-700 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>Past Events (संपन्न)</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by event, location, city..."
                className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 no-scrollbar">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider shrink-0 flex items-center gap-1 mr-2">
              <Filter className="w-3.5 h-3.5" />
              <span>Category:</span>
            </span>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-emerald-800 text-white shadow-sm'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center">
              <LoadingSpinner size="lg" text="Loading foundation events and social drives..." />
            </div>
          ) : filteredEvents.length === 0 ? (
            /* Empty State */
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-3xl p-12 text-center max-w-lg mx-auto border border-gray-200 shadow-xl"
            >
              <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center mb-4">
                <Calendar className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                अभी कोई कार्यक्रम उपलब्ध नहीं है (No events found)
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                {searchQuery || selectedCategory !== 'All'
                  ? 'No events match your current filter criteria. Try resetting the filters.'
                  : activeTab === 'upcoming'
                  ? 'No upcoming events currently scheduled. Stay tuned for new health camp announcements!'
                  : 'No past events found in this category.'}
              </p>
              {(searchQuery || selectedCategory !== 'All') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('All');
                  }}
                  className="mt-6 px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-700 text-white shadow-md hover:bg-emerald-800 transition-colors"
                >
                  Clear All Filters
                </button>
              )}
            </motion.div>
          ) : (
            /* Grid Layout: 1 col mobile, 2 cols tablet, 3 cols desktop */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredEvents.map((evt, idx) => (
                <motion.div
                  key={evt.id}
                  initial={{ opacity: 0, y: 25 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: idx * 0.08 }}
                  whileHover={{ y: -6 }}
                  className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-xl shadow-gray-200/50 hover:shadow-2xl transition-all duration-300 flex flex-col justify-between group"
                >
                  {/* Top Placeholder Header Image / Gradient */}
                  <div
                    className={`relative h-52 bg-gradient-to-br ${
                      evt.gradient || 'from-emerald-700 to-teal-900'
                    } p-5 flex flex-col justify-between text-white overflow-hidden`}
                  >
                    {/* Pattern Overlay */}
                    <div
                      className="absolute inset-0 opacity-15"
                      style={{
                        backgroundImage:
                          'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                        backgroundSize: '18px 18px',
                      }}
                    />

                    {/* Top Badges */}
                    <div className="relative z-10 flex items-center justify-between">
                      <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-white/20 backdrop-blur-md border border-white/30 text-white">
                        {evt.category}
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                          evt.status === 'upcoming'
                            ? 'bg-amber-400 text-slate-950 shadow-md'
                            : 'bg-emerald-950/80 text-emerald-200 border border-emerald-700'
                        }`}
                      >
                        {evt.status === 'upcoming' ? 'Upcoming' : 'Completed'}
                      </span>
                    </div>

                    {/* Bottom Info on Header Image */}
                    <div className="relative z-10">
                      <div className="flex items-center gap-1.5 text-xs text-amber-300 font-semibold mb-0.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{formatDate(evt.date)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-white/90 font-medium">
                        <Clock className="w-3.5 h-3.5 text-emerald-300" />
                        <span>{evt.time}</span>
                      </div>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 leading-snug group-hover:text-emerald-700 transition-colors">
                        {evt.title}
                      </h3>
                      <p className="text-xs font-semibold text-emerald-800 mt-1 font-sans">
                        {evt.titleHindi}
                      </p>

                      {/* Venue with MapPin */}
                      <div className="mt-3 flex items-start gap-2 text-xs text-gray-600 bg-stone-50 p-2.5 rounded-xl border border-gray-100">
                        <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-gray-800">{evt.venue}</p>
                          <p className="text-gray-500">{evt.location}</p>
                        </div>
                      </div>

                      {/* Description snippet */}
                      <p className="mt-3 text-xs sm:text-sm text-gray-600 line-clamp-2 leading-relaxed">
                        {evt.description}
                      </p>
                    </div>

                    {/* Footer Row */}
                    <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-[11px] text-gray-400 font-medium">
                        {evt.attendees || 'Public Welfare'}
                      </span>

                      <button
                        type="button"
                        onClick={() => {
                          setVolunteerSuccess(false);
                          setSelectedEventModal(evt);
                        }}
                        className="min-h-[44px] flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-bold text-xs shadow-md shadow-emerald-700/20 transition-transform"
                      >
                        <span>View Details</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Details & Volunteer Modal */}
      <AnimatePresence>
        {selectedEventModal && (
          <Modal
            isOpen={Boolean(selectedEventModal)}
            onClose={() => setSelectedEventModal(null)}
            title={selectedEventModal.title}
            subtitle={selectedEventModal.titleHindi}
            size="lg"
          >
            <div className="space-y-6">
              {/* Event Header Banner */}
              <div
                className={`p-6 rounded-2xl bg-gradient-to-br ${
                  selectedEventModal.gradient || 'from-emerald-700 to-teal-900'
                } text-white relative overflow-hidden`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/20 backdrop-blur-md">
                    {selectedEventModal.category}
                  </span>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-400 text-slate-950">
                    {selectedEventModal.status === 'upcoming' ? 'Scheduled Camp' : 'Conducted'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2 border-t border-white/20">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-300 shrink-0" />
                    <span>{formatDate(selectedEventModal.date)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-300 shrink-0" />
                    <span>{selectedEventModal.time}</span>
                  </div>
                </div>
              </div>

              {/* Exact Location & Venue */}
              <div className="p-4 rounded-2xl bg-stone-50 border border-gray-200 text-xs text-gray-700 space-y-1">
                <div className="flex items-center gap-2 font-bold text-gray-900">
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Venue Address:</span>
                </div>
                <p className="pl-6 font-semibold text-gray-800">{selectedEventModal.venue}</p>
                <p className="pl-6 text-gray-500">{selectedEventModal.location}</p>
              </div>

              {/* Full Description */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-800 mb-2">
                  About This Initiative / कार्यक्रम विवरण:
                </h4>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  {selectedEventModal.description}
                </p>
              </div>

              {/* Highlights Gallery */}
              {selectedEventModal.gallery && selectedEventModal.gallery.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-800 mb-2.5">
                    Camp Modules & Focus Areas:
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {selectedEventModal.gallery.map((g, gIdx) => (
                      <div
                        key={gIdx}
                        className="p-3 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-900 text-xs font-semibold flex items-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{g}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Coordinator Contact */}
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <p className="font-bold text-amber-900">
                    Coordinator: {selectedEventModal.contactPerson || 'Foundation Team'}
                  </p>
                  <p className="text-amber-800">For enquiries, volunteer queries, or special assistance</p>
                </div>
                <a
                  href={`tel:${selectedEventModal.contactPhone || CONTACT_INFO.phone}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold self-start sm:self-auto transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call Coordinator</span>
                </a>
              </div>

              {/* Volunteer action */}
              <div className="pt-2 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                {volunteerSuccess ? (
                  <div className="w-full p-3 rounded-xl bg-emerald-50 text-emerald-800 font-bold text-xs flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>You are registered as a volunteer! We will reach out to you.</span>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        if (navigator.share) {
                          navigator.share({
                            title: selectedEventModal.title,
                            text: `${selectedEventModal.title} organized by ${FOUNDATION_NAME}`,
                            url: window.location.href,
                          }).catch(() => {});
                        } else if (navigator.clipboard) {
                          navigator.clipboard.writeText(window.location.href).catch(() => {});
                          setLinkCopied(true);
                          setTimeout(() => setLinkCopied(false), 3000);
                        }
                      }}
                      className="w-full sm:w-auto min-h-[48px] px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 active:scale-95 font-semibold text-xs flex items-center justify-center gap-2 transition-transform"
                    >
                      <Share2 className="w-4 h-4 text-gray-600" />
                      <span>{linkCopied ? 'Link Copied!' : 'Share Event'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setVolunteerSuccess(true)}
                      className="w-full sm:w-auto min-h-[48px] px-7 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-bold text-xs shadow-md transition-transform flex items-center justify-center gap-2"
                    >
                      <HeartHandshake className="w-4 h-4 text-amber-300" />
                      <span>Volunteer for this Event (सेवा सहयोग)</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </Layout>
  );
}

export { Events };
