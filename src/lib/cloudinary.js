/**
 * Cloudinary Direct Upload Utility for Uttam Charitable Welfare Foundation
 * Cloud Name: dxeuzdwkz
 * Upload Preset: Uttam Charitable
 */

export const CLOUDINARY_CLOUD_NAME = 'dxeuzdwkz';
export const CLOUDINARY_UPLOAD_PRESET = 'Uttam Charitable';
export const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`;

/**
 * Uploads an image, PDF document, or video file directly to Cloudinary.
 * Supports:
 *   - uploadToCloudinary(file, onProgress)
 *   - uploadToCloudinary(file, folderName, onProgress)
 * 
 * @param {File} file - The file object from input (JPG, PNG, PDF, etc.)
 * @param {string|Function} [folderOrProgress] - Optional folder name string OR progress callback
 * @param {Function} [onProgress] - Optional progress callback receiving (percent: number)
 * @returns {Promise<{ url: string, secure_url: string, resource_type: string, public_id: string }>}
 */
export async function uploadToCloudinary(file, folderOrProgress, onProgress) {
  if (!file) {
    throw new Error('अपलोड करने के लिए फ़ाइल उपलब्ध नहीं है।');
  }

  // Handle flexible arguments
  let folder = '';
  let progressCb = null;

  if (typeof folderOrProgress === 'function') {
    progressCb = folderOrProgress;
  } else if (typeof folderOrProgress === 'string') {
    folder = folderOrProgress;
    if (typeof onProgress === 'function') {
      progressCb = onProgress;
    }
  } else if (typeof onProgress === 'function') {
    progressCb = onProgress;
  }

  const fileName = (file.name || '').toLowerCase();
  const fileType = (file.type || '').toLowerCase();

  const isImage = fileType.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|svg|bmp|heic|tiff)$/i.test(fileName);
  const isVideo = fileType.startsWith('video/') || /\.(mp4|mov|webm|mkv|avi)$/i.test(fileName);
  const isPdf = fileType === 'application/pdf' || /\.pdf$/i.test(fileName);
  const isDoc = isPdf || fileType.includes('document') || fileType.includes('word') || /\.(pdf|doc|docx|txt|odt)$/i.test(fileName);

  if (!isImage && !isVideo && !isDoc) {
    throw new Error('अमान्य फ़ाइल प्रारूप। कृपया JPG, PNG, WEBP, अथवा PDF फ़ाइल अपलोड करें।');
  }

  // Size limit validation (Images/Docs max 25MB, Videos max 60MB)
  if ((isImage || isDoc) && file.size > 25 * 1024 * 1024) {
    throw new Error('फ़ाइल का आकार 25MB से कम होना चाहिए। कृपया छोटी फ़ाइल चुनें।');
  }

  if (isVideo && file.size > 60 * 1024 * 1024) {
    throw new Error('वीडियो का आकार 60MB से कम होना चाहिए।');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  if (folder) {
    formData.append('folder', folder);
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', CLOUDINARY_UPLOAD_URL);

    if (xhr.upload && typeof progressCb === 'function') {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          try {
            progressCb(percent);
          } catch (e) {
            console.warn('Progress callback error:', e);
          }
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          const finalUrl = res.secure_url || res.url;
          resolve({
            url: finalUrl,
            secure_url: finalUrl,
            resource_type: res.resource_type || (isVideo ? 'video' : isDoc ? 'raw' : 'image'),
            public_id: res.public_id,
            format: res.format,
            width: res.width,
            height: res.height,
            duration: res.duration,
          });
        } catch (parseErr) {
          reject(new Error('Cloudinary रिस्पॉन्स पार्स करने में त्रुटि: ' + parseErr.message));
        }
      } else {
        try {
          const errData = JSON.parse(xhr.responseText);
          reject(new Error(errData?.error?.message || `Cloudinary अपलोड विफल (HTTP ${xhr.status})`));
        } catch {
          reject(new Error(`अपलोड विफल रहा (HTTP ${xhr.status})`));
        }
      }
    };

    xhr.onerror = () => {
      reject(new Error('नेटवर्क त्रुटि: कृपया अपना इंटरनेट कनेक्शन जांचें।'));
    };

    xhr.ontimeout = () => {
      reject(new Error('अपलोड का समय समाप्त हो गया। कृपया पुनः प्रयास करें।'));
    };

    xhr.send(formData);
  });
}

/**
 * Client-Side Image Compression Helper (Compresses images to < 300KB)
 * Used as an ultra-fast offline fallback so base64 strings don't bloat Firebase RTDB.
 * @param {File} file 
 * @param {number} [maxWidth=1200] 
 * @param {number} [quality=0.8] 
 * @returns {Promise<string>} Data URL
 */
export function compressImageToBase64(file, maxWidth = 1200, quality = 0.8) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('No file provided'));
    
    // If not an image (e.g. PDF), read directly as Base64 Data URL
    if (!file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => {
        // Fallback to raw data url if canvas fails
        resolve(event.target.result);
      };
      img.src = event.target.result;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}
