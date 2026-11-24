import {
  uploadToSupabaseStorage,
  compressFileToDataUrl,
} from './supabase';

/**
 * Compresses an image file or returns a Data URL as a reliable fallback.
 */
export function fileToCompressedDataUrl(file, maxWidth = 700, quality = 0.65, maxChars = 175000) {
  return compressFileToDataUrl(file, maxWidth, quality, maxChars);
}

export function compressImageToBase64(file, maxWidth = 700, quality = 0.65, maxChars = 175000) {
  return compressFileToDataUrl(file, maxWidth, quality, maxChars);
}

/**
 * Routes all image and video uploads directly to Supabase Storage ('uploads' bucket)
 * with automatic compressed Data URL fallback so form submissions never hang or fail.
 */
export async function uploadToCloudinary(file, onProgress = null) {
  return uploadToSupabaseStorage(file, onProgress);
}
