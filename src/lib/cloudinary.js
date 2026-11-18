export const CLOUDINARY_CLOUD_NAME = "dc62s8c6w";
export const CLOUDINARY_UPLOAD_PRESET = "uttam_preset";
export const CLOUDINARY_API_KEY = "229382297476775";

/**
 * Compresses an image file or returns a Data URL as a reliable fallback
 * when Cloudinary upload fails or is unavailable.
 * Compact compression (<60KB) ensures instant form submission and stays well below Firestore's 1MB document limit.
 */
export function fileToCompressedDataUrl(file, maxWidth = 700, quality = 0.65) {
  return compressImageToBase64(file, maxWidth, quality);
}

export function compressImageToBase64(file, maxWidth = 700, quality = 0.65) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error("No file provided"));

    // If it's not an image (e.g., short video), read directly as Data URL
    if (!file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
          resolve(compressedDataUrl);
        } catch (err) {
          resolve(event.target.result);
        }
      };
      img.onerror = () => resolve(event.target.result);
      img.src = event.target.result;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads an image or video file to Cloudinary using Unsigned Upload Preset.
 * Includes a 6-second timeout and automatic fallback to compressed Base64 Data URL so form submissions never hang!
 */
export async function uploadToCloudinary(file, onProgress = null) {
  if (!file) throw new Error("कोई फ़ाइल चयनित नहीं है (No file selected)");

  const isVideo = file.type.startsWith("video/");
  const resourceType = isVideo ? "video" : "image";
  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;

  try {
    return await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();

      formData.append("file", file);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      formData.append("folder", "uttam_trust");

      xhr.open("POST", url, true);
      xhr.timeout = 6000; // 6 seconds max so slow network never blocks form submission

      if (onProgress && xhr.upload) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve({
              url: response.secure_url,
              publicId: response.public_id,
              resourceType: response.resource_type,
              format: response.format,
              width: response.width,
              height: response.height,
            });
          } catch (err) {
            reject(new Error("Invalid response from Cloudinary"));
          }
        } else {
          let errMsg = "Upload failed";
          try {
            const errData = JSON.parse(xhr.responseText);
            errMsg = errData.error?.message || errMsg;
          } catch {}
          reject(new Error(errMsg));
        }
      };

      xhr.ontimeout = () => reject(new Error("Cloudinary upload timed out"));
      xhr.onerror = () => reject(new Error("Network error during upload to Cloudinary"));
      xhr.send(formData);
    });
  } catch (cloudErr) {
    console.warn("Cloudinary upload fallback activated:", cloudErr.message);
    if (onProgress) onProgress(50);
    const dataUrl = await fileToCompressedDataUrl(file);
    if (onProgress) onProgress(100);
    return {
      url: dataUrl,
      publicId: `local_${Date.now()}`,
      resourceType,
      format: isVideo ? "mp4" : "jpg",
    };
  }
}
