import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  MapPin,
  Clock,
  Upload,
  Image as ImageIcon,
  CheckCircle,
  XCircle,
  RefreshCw,
  Sparkles,
  X,
  AlertTriangle,
} from 'lucide-react';
import AdminLayout from './AdminLayout';
import { supabase } from '../../lib/supabase';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

export default function EventManager() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Form & Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({
    isOpen: false,
    event: null,
    deleting: false,
  });

  // Form Fields
  const [formData, setFormData] = useState({
    title: '',
    title_hindi: '',
    description: '',
    event_date: '',
    venue: '',
    image_url: '',
    gallery: [],
    is_published: true,
  });

  const [uploadingImage, setUploadingImage] = useState(false);
  const [savingEvent, setSavingEvent] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setFeedbackToast({ message, type });
    setTimeout(() => setFeedbackToast(null), 4000);
  };

  // Fetch events
  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: false });

      if (error) {
        console.error('Error fetching events:', error);
        showToast('Failed to load events', 'error');
      } else {
        setEvents(data || []);
      }
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchEvents();
  };

  // Open modal for Create
  const handleAddNew = () => {
    setEditingEvent(null);
    setFormData({
      title: '',
      title_hindi: '',
      description: '',
      event_date: new Date().toISOString().slice(0, 16),
      venue: '',
      image_url: '',
      gallery: [],
      is_published: true,
    });
    setModalOpen(true);
  };

  // Open modal for Edit
  const handleEdit = (event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title || '',
      title_hindi: event.title_hindi || '',
      description: event.description || '',
      event_date: event.event_date ? new Date(event.event_date).toISOString().slice(0, 16) : '',
      venue: event.venue || '',
      image_url: event.image_url || '',
      gallery: Array.isArray(event.gallery) ? event.gallery : [],
      is_published: Boolean(event.is_published),
    });
    setModalOpen(true);
  };

  // Upload image to Supabase Storage 'events' bucket
  const handleFileUpload = async (e, isGallery = false) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);

    try {
      const uploadedUrls = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
        const filePath = `events/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('events')
          .upload(filePath, file, { cacheControl: '3600', upsert: true });

        if (uploadError) {
          console.warn('Supabase storage upload error:', uploadError.message);
          // Fallback to local data URL for preview if bucket is not created
          const reader = new FileReader();
          const dataUrl = await new Promise((resolve) => {
            reader.onload = (re) => resolve(re.target.result);
            reader.readAsDataURL(file);
          });
          uploadedUrls.push(dataUrl);
        } else {
          const { data: publicData } = supabase.storage
            .from('events')
            .getPublicUrl(filePath);

          uploadedUrls.push(publicData.publicUrl);
        }
      }

      if (isGallery) {
        setFormData((prev) => ({
          ...prev,
          gallery: [...prev.gallery, ...uploadedUrls],
        }));
        showToast(`Added ${uploadedUrls.length} image(s) to gallery`);
      } else {
        setFormData((prev) => ({
          ...prev,
          image_url: uploadedUrls[0],
        }));
        showToast('Event banner uploaded successfully');
      }
    } catch (err) {
      console.error('Image upload failed:', err);
      showToast('Image upload failed', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  // Remove single image from gallery
  const handleRemoveGalleryImage = (indexToRemove) => {
    setFormData((prev) => ({
      ...prev,
      gallery: prev.gallery.filter((_, idx) => idx !== indexToRemove),
    }));
  };

  // Save or update event
  const handleSaveEvent = async (e) => {
    if (e) e.preventDefault();

    if (!formData.title.trim()) {
      showToast('Event title is required', 'error');
      return;
    }

    setSavingEvent(true);

    try {
      const payload = {
        title: formData.title.trim(),
        title_hindi: formData.title_hindi.trim(),
        description: formData.description.trim(),
        event_date: formData.event_date ? new Date(formData.event_date).toISOString() : new Date().toISOString(),
        venue: formData.venue.trim(),
        image_url: formData.image_url,
        gallery: formData.gallery,
        is_published: formData.is_published,
        updated_at: new Date().toISOString(),
      };

      if (editingEvent) {
        const { error } = await supabase
          .from('events')
          .update(payload)
          .eq('id', editingEvent.id);

        if (error) throw error;
        showToast('Event updated successfully!');
      } else {
        const { error } = await supabase.from('events').insert([
          {
            ...payload,
            created_at: new Date().toISOString(),
          },
        ]);

        if (error) throw error;
        showToast('New event created successfully!');
      }

      setModalOpen(false);
      fetchEvents();
    } catch (err) {
      console.error('Save event error:', err);
      showToast(err.message || 'Error saving event', 'error');
    } finally {
      setSavingEvent(false);
    }
  };

  // Toggle publish/unpublish directly from card
  const handleTogglePublish = async (event) => {
    const updatedStatus = !event.is_published;

    try {
      const { error } = await supabase
        .from('events')
        .update({
          is_published: updatedStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', event.id);

      if (error) throw error;

      setEvents((prev) =>
        prev.map((ev) => (ev.id === event.id ? { ...ev, is_published: updatedStatus } : ev))
      );
      showToast(`Event ${updatedStatus ? 'published' : 'unpublished'}.`);
    } catch (err) {
      console.error('Toggle publish error:', err);
      showToast('Failed to change publish status', 'error');
    }
  };

  // Delete event
  const handleDeleteEvent = async () => {
    const eventToDelete = deleteConfirmModal.event;
    if (!eventToDelete) return;

    setDeleteConfirmModal((prev) => ({ ...prev, deleting: true }));

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventToDelete.id);

      if (error) throw error;

      showToast('Event removed successfully.');
      setDeleteConfirmModal({ isOpen: false, event: null, deleting: false });
      fetchEvents();
    } catch (err) {
      console.error('Delete event error:', err);
      showToast('Failed to delete event', 'error');
      setDeleteConfirmModal((prev) => ({ ...prev, deleting: false }));
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* TOAST FEEDBACK */}
        <AnimatePresence>
          {feedbackToast && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`fixed top-4 right-4 z-50 p-4 rounded-2xl shadow-xl flex items-center gap-3 text-sm font-semibold max-w-md ${
                feedbackToast.type === 'error'
                  ? 'bg-rose-600 text-white'
                  : 'bg-emerald-600 text-white'
              }`}
            >
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span>{feedbackToast.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                कार्यक्रम व शिविर प्रबंधन
              </span>
              <span className="text-xs text-gray-400">Events & Camps</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mt-1 flex items-center gap-3">
              Manage Events & Camps
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-stone-200 text-gray-800">
                {events.length} Events
              </span>
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Publish medical camps, blood donation drives, distribution ceremonies, and photo galleries for public viewing.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              loading={refreshing}
              onClick={handleRefresh}
              className="bg-white"
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={handleAddNew}
            >
              Add New Event
            </Button>
          </div>
        </div>

        {/* EVENTS LIST */}
        {loading ? (
          <div className="py-20 flex justify-center">
            <LoadingSpinner size="lg" text="Loading events..." />
          </div>
        ) : events.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <Calendar className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <h3 className="text-base font-bold text-gray-800">No events found</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-4">
              Get started by creating your first health camp, charitable food drive, or community meeting.
            </p>
            <Button variant="primary" size="sm" icon={Plus} onClick={handleAddNew}>
              Add First Event
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((ev) => (
              <div
                key={ev.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md hover:border-emerald-200 transition-all"
              >
                <div>
                  {/* Event Thumbnail */}
                  <div className="relative h-48 bg-stone-100 overflow-hidden">
                    {ev.image_url ? (
                      <img
                        src={ev.image_url}
                        alt={ev.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-stone-100">
                        <ImageIcon className="w-10 h-10 stroke-1" />
                        <span className="text-xs mt-1">No banner image</span>
                      </div>
                    )}

                    {/* Publish status badge */}
                    <div className="absolute top-3 right-3">
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full shadow-sm backdrop-blur-md ${
                          ev.is_published
                            ? 'bg-emerald-600/90 text-white'
                            : 'bg-gray-800/80 text-gray-200'
                        }`}
                      >
                        {ev.is_published ? 'Published' : 'Draft'}
                      </span>
                    </div>

                    {/* Gallery photos count pill */}
                    {Array.isArray(ev.gallery) && ev.gallery.length > 0 && (
                      <div className="absolute bottom-3 right-3 bg-black/60 text-white text-[11px] font-semibold px-2 py-0.5 rounded-md backdrop-blur-xs flex items-center gap-1">
                        <ImageIcon className="w-3 h-3" /> {ev.gallery.length} photos
                      </div>
                    )}
                  </div>

                  {/* Event Content */}
                  <div className="p-5 space-y-3">
                    <div>
                      <h3 className="text-base font-bold text-gray-900 leading-tight">
                        {ev.title}
                      </h3>
                      {ev.title_hindi && (
                        <p className="text-xs text-emerald-800 font-semibold mt-0.5">
                          {ev.title_hindi}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5 text-xs text-gray-500">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>
                          {ev.event_date
                            ? new Date(ev.event_date).toLocaleString('en-IN', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })
                            : 'Date not specified'}
                        </span>
                      </div>

                      {ev.venue && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span className="truncate">{ev.venue}</span>
                        </div>
                      )}
                    </div>

                    {ev.description && (
                      <p className="text-xs text-gray-600 line-clamp-3 leading-relaxed">
                        {ev.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="p-4 border-t border-gray-100 bg-stone-50/50 flex items-center justify-between">
                  <button
                    onClick={() => handleTogglePublish(ev)}
                    className={`text-xs font-semibold flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors ${
                      ev.is_published
                        ? 'text-gray-600 hover:bg-gray-200/60'
                        : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                    }`}
                  >
                    {ev.is_published ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" /> Unpublish
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" /> Publish
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={Edit}
                      onClick={() => handleEdit(ev)}
                    >
                      Edit
                    </Button>
                    <button
                      onClick={() =>
                        setDeleteConfirmModal({
                          isOpen: true,
                          event: ev,
                          deleting: false,
                        })
                      }
                      className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                      title="Delete Event"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ADD / EDIT EVENT MODAL */}
        <Modal
          isOpen={modalOpen}
          onClose={() => !savingEvent && setModalOpen(false)}
          title={editingEvent ? 'Edit Event / कार्यक्रम संपादित करें' : 'Add New Event / नया कार्यक्रम जोड़ें'}
          subtitle="Details published here will appear on the public foundation website & member app."
          size="lg"
          footer={
            <div className="flex items-center justify-end gap-2.5 w-full">
              <Button
                variant="outline"
                size="sm"
                disabled={savingEvent}
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={savingEvent}
                onClick={handleSaveEvent}
              >
                {editingEvent ? 'Update Event' : 'Create & Publish'}
              </Button>
            </div>
          }
        >
          <form onSubmit={handleSaveEvent} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Event Title (English) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Free Mega Eye Care & Spectacle Camp"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Event Title (Hindi)
                </label>
                <input
                  type="text"
                  placeholder="e.g., नि:शुल्क विशाल नेत्र जांच एवं चश्मा वितरण शिविर"
                  value={formData.title_hindi}
                  onChange={(e) => setFormData({ ...formData, title_hindi: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Event Date & Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.event_date}
                  onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Venue / Location
                </label>
                <input
                  type="text"
                  placeholder="e.g., Gandhi Community Hall, Civil Lines"
                  value={formData.venue}
                  onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 text-xs"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block font-bold text-gray-700 mb-1">
                Event Description & Schedule
              </label>
              <textarea
                rows={3}
                placeholder="Describe doctors attending, target beneficiaries, registration rules, etc."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 text-xs"
              />
            </div>

            {/* Banner Image Upload & Direct URL */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <label className="block font-bold text-gray-700">
                Primary Banner Image
              </label>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <input
                    type="url"
                    placeholder="Enter image URL or choose file to upload..."
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 text-xs"
                  />
                </div>
                <label className="cursor-pointer shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-gray-700 font-semibold transition-colors">
                  <Upload className="w-3.5 h-3.5 text-gray-500" />
                  <span>Upload File</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, false)}
                    className="hidden"
                    disabled={uploadingImage}
                  />
                </label>
              </div>

              {formData.image_url && (
                <div className="relative w-36 h-20 rounded-xl overflow-hidden border border-gray-200 bg-stone-50">
                  <img
                    src={formData.image_url}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, image_url: '' })}
                    className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full hover:bg-black"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {/* Gallery Upload */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block font-bold text-gray-700">
                    Event Photo Gallery
                  </label>
                  <p className="text-[11px] text-gray-400">
                    Upload multiple event photos for the public gallery.
                  </p>
                </div>
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold transition-colors">
                  <Upload className="w-3 h-3" /> Add Photos
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, true)}
                    className="hidden"
                    disabled={uploadingImage}
                  />
                </label>
              </div>

              {formData.gallery.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1 max-h-36 overflow-y-auto">
                  {formData.gallery.map((img, idx) => (
                    <div
                      key={idx}
                      className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 group bg-stone-50"
                    >
                      <img src={img} alt="Gallery" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveGalleryImage(idx)}
                        className="absolute inset-0 bg-red-600/70 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Publish Toggle */}
            <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
              <div>
                <p className="font-bold text-gray-800">Publish Immediately</p>
                <p className="text-[11px] text-gray-400">
                  Make this event visible to all website visitors.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_published}
                  onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
              </label>
            </div>
          </form>
        </Modal>

        {/* DELETE CONFIRMATION MODAL */}
        <Modal
          isOpen={deleteConfirmModal.isOpen}
          onClose={() =>
            !deleteConfirmModal.deleting &&
            setDeleteConfirmModal({ isOpen: false, event: null, deleting: false })
          }
          title="Delete Event / कार्यक्रम हटाएं"
          subtitle="Are you sure you want to permanently remove this event record?"
          size="sm"
          footer={
            <div className="flex items-center justify-end gap-2.5 w-full">
              <Button
                variant="outline"
                size="sm"
                disabled={deleteConfirmModal.deleting}
                onClick={() =>
                  setDeleteConfirmModal({ isOpen: false, event: null, deleting: false })
                }
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                loading={deleteConfirmModal.deleting}
                onClick={handleDeleteEvent}
                icon={Trash2}
              >
                Delete
              </Button>
            </div>
          }
        >
          {deleteConfirmModal.event && (
            <p className="text-xs text-gray-600">
              This will permanently delete the event{' '}
              <strong className="text-gray-900">{deleteConfirmModal.event.title}</strong> and all associated gallery images from the foundation public database.
            </p>
          )}
        </Modal>
      </div>
    </AdminLayout>
  );
}

export { EventManager };
