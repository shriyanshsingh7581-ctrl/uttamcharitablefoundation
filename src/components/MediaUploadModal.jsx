import React, { useState } from 'react';
import { 
  X, 
  Upload, 
  Image as ImageIcon, 
  Video, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  FileCheck
} from 'lucide-react';
import { uploadToCloudinary } from '../lib/cloudinary';
import { rtdb } from '../lib/firebase';
import { ref, push, set } from 'firebase/database';
import { useAuth } from '../contexts/AuthContext';
import { safeText } from '../lib/constants';

export default function MediaUploadModal({ isOpen, onClose, onSuccess }) {
  const { currentUser, userProfile } = useAuth();
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [resourceType, setResourceType] = useState('image'); // 'image' | 'video'
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [category, setCategory] = useState('समाज सेवा (Social Work)');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Check size limit: 50MB for video, 15MB for image
    const isVideo = selectedFile.type.startsWith('video');
    const maxSize = isVideo ? 50 * 1024 * 1024 : 15 * 1024 * 1024;

    if (selectedFile.size > maxSize) {
      setErrorMsg(`फ़ाइल का आकार अधिकतम ${isVideo ? '50MB' : '15MB'} होना चाहिए।`);
      return;
    }

    setErrorMsg('');
    setFile(selectedFile);
    setResourceType(isVideo ? 'video' : 'image');
    setFilePreview(URL.createObjectURL(selectedFile));
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setErrorMsg('कृपया एक फ़ोटो या वीडियो फ़ाइल चुनें।');
      return;
    }
    if (!title.trim()) {
      setErrorMsg('कृपया सेवा कार्य का शीर्षक दर्ज करें।');
      return;
    }

    setIsUploading(true);
    setErrorMsg('');
    setSuccessMsg('');
    setUploadProgress(0);

    try {
      // 1. Upload to Cloudinary
      const uploadResult = await uploadToCloudinary(file, 'media_submissions', (progress) => {
        setUploadProgress(progress);
      });

      // 2. Save submission reference to Firebase RTDB
      const submissionsRef = ref(rtdb, 'media_submissions');
      const newSubRef = push(submissionsRef);
      const submissionId = newSubRef.key;

      const submissionData = {
        id: submissionId,
        url: uploadResult.url,
        publicId: uploadResult.publicId,
        resourceType: uploadResult.resourceType || resourceType,
        format: uploadResult.format || 'jpg',
        title: title.trim(),
        caption: caption.trim(),
        category: category,
        status: 'pending', // Pending approval by Admin
        submittedByUid: currentUser?.uid || 'anonymous',
        submittedByName: userProfile?.name || currentUser?.displayName || 'सम्मानित सदस्य',
        submittedByMemberId: userProfile?.memberId || 'UCWF-MEMBER',
        submittedByPhone: userProfile?.phone || '',
        createdAt: new Date().toISOString(),
        timestamp: Date.now()
      };

      await set(newSubRef, submissionData);

      setSuccessMsg('आपका मीडिया सफलतापूर्वक सबमिट हो गया है! व्यवस्थापक (Admin) की स्वीकृति के बाद यह मुख्य गैलरी में दिखाई देगा।');
      setIsUploading(false);

      if (onSuccess) {
        onSuccess(submissionData);
      }

      setTimeout(() => {
        setFile(null);
        setFilePreview(null);
        setTitle('');
        setCaption('');
        setSuccessMsg('');
        onClose();
      }, 2500);

    } catch (err) {
      console.error('Upload failed:', err);
      setErrorMsg('मीडिया अपलोड करने में विफल: ' + (err.message || 'नेटवर्क समस्या'));
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden my-8">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-emerald-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-emerald-700 rounded-lg">
              <Upload className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">सेवा कार्य फ़ोटो/वीडियो अपलोड</h3>
              <p className="text-xs text-emerald-200">फाउंडेशन गैलरी हेतु सामाजिक गतिविधियों का प्रमाण</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-emerald-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleUploadSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{safeText(errorMsg)}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{safeText(successMsg)}</span>
            </div>
          )}

          {/* File Picker / Drag & Drop Preview */}
          <div className="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-2xl p-4 text-center bg-slate-50 transition cursor-pointer relative group">
            <input 
              type="file" 
              accept="image/*,video/*"
              onChange={handleFileChange}
              disabled={isUploading}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            
            {filePreview ? (
              <div className="space-y-3">
                {resourceType === 'video' ? (
                  <video 
                    src={filePreview} 
                    controls 
                    className="max-h-48 mx-auto rounded-xl object-contain bg-black"
                  />
                ) : (
                  <img 
                    src={filePreview} 
                    alt="Preview" 
                    className="max-h-48 mx-auto rounded-xl object-contain"
                  />
                )}
                <p className="text-xs font-semibold text-emerald-700">
                  फ़ाइल चुनी गई: {safeText(file?.name)} ({Math.round((file?.size || 0) / 1024)} KB)
                </p>
                <p className="text-[11px] text-slate-500">दूसरी फ़ाइल चुनने के लिए यहाँ क्लिक करें</p>
              </div>
            ) : (
              <div className="py-6 flex flex-col items-center justify-center space-y-2">
                <div className="p-3 bg-emerald-100 text-emerald-700 rounded-full group-hover:scale-110 transition">
                  <ImageIcon className="w-8 h-8" />
                </div>
                <div className="text-sm font-semibold text-slate-700">
                  फ़ोटो या वीडियो चुनने हेतु क्लिक करें
                </div>
                <p className="text-xs text-slate-400">
                  PNG, JPG, MP4, MOV (अधिकतम 50MB)
                </p>
              </div>
            )}
          </div>

          {/* Activity Category */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              गतिविधि श्रेणी (Activity Category) *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={isUploading}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              <option value="समाज सेवा (Social Work)">समाज सेवा (General Social Work)</option>
              <option value="शिक्षा सहायता (Child Education)">शिक्षा सहायता (Child Education)</option>
              <option value="चिकित्सा सहायता (Health & Medical)">चिकित्सा सहायता (Health & Medical Camp)</option>
              <option value="कंबल व वस्त्र वितरण (Blanket & Clothes Distribution)">कंबल व वस्त्र वितरण (Distribution)</option>
              <option value="अन्नदान एवं भोजन सेवा (Food Relief)">अन्नदान एवं भोजन सेवा (Food Relief)</option>
              <option value="वृक्षारोपण एवं पर्यावरण (Environment & Plantation)">वृक्षारोपण एवं पर्यावरण (Environment)</option>
              <option value="महिला सशक्तिकरण (Women Empowerment)">महिला सशक्तिकरण (Women Empowerment)</option>
            </select>
          </div>

          {/* Activity Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              गतिविधि का शीर्षक (Title) *
            </label>
            <input 
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="उदा. काशीपुर में 100 जरूरतमंदों को कंबल वितरण"
              required
              disabled={isUploading}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Activity Caption / Story */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              विवरण / संक्षिप्त कहानी (Description / Story)
            </label>
            <textarea 
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="इस सेवा कार्य का संक्षिप्त विवरण लिखें (स्थान, लाभार्थी, सदस्यों का योगदान)..."
              rows={3}
              disabled={isUploading}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Progress Bar when Uploading */}
          {isUploading && (
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-xs text-slate-600 font-medium">
                <span>अपलोड हो रहा है...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-600 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Footer Submit Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition"
            >
              रद्द करें (Cancel)
            </button>
            <button
              type="submit"
              disabled={isUploading || !file}
              className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-2 transition disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>अपलोड जारी है...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>अपलोड व सबमिट करें</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
