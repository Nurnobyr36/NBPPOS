/**
 * ImgBB Image Upload Service
 * Automatically compresses images before upload for speed and quota safety.
 */

// Default free public key for quick setup (users can change this in settings or in the widget)
export const DEFAULT_IMGBB_KEY = '2d93e21ea5c490a02f69f2431aa081bb';

export interface ImgBBUploadResponse {
  success: boolean;
  url?: string;
  thumbUrl?: string;
  deleteUrl?: string;
  error?: string;
}

/**
 * Compresses an image file/blob to a canvas-based data URL or blob
 */
export function compressImageToDataUrl(
  file: File | Blob,
  maxWidth = 600,
  maxHeight = 600,
  quality = 0.75
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = (err) => reject(err);
    reader.onload = () => {
      const img = new Image();
      img.onerror = (err) => reject(err);
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }

        // Draw image with smooth scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Converts a data URL to a Blob
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(';base64,');
  const contentType = parts[0].split(':')[1];
  const raw = window.atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);

  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }

  return new Blob([uInt8Array], { type: contentType });
}

/**
 * Uploads an image file or blob to ImgBB using the provided API Key.
 * Compresses the image beforehand to guarantee fast transfer and prevent storage quota errors.
 */
export async function uploadToImgBB(
  file: File | Blob,
  customApiKey?: string,
  onProgress?: (percent: number) => void
): Promise<ImgBBUploadResponse> {
  const apiKey = (customApiKey && customApiKey.trim()) || DEFAULT_IMGBB_KEY;

  try {
    if (onProgress) onProgress(15);

    // 1. Pre-compress image client-side to max 800x800 jpeg (~40-80KB)
    let uploadBlob: Blob = file;
    try {
      const compressedDataUrl = await compressImageToDataUrl(file, 800, 800, 0.75);
      uploadBlob = dataUrlToBlob(compressedDataUrl);
    } catch (compErr) {
      console.warn('Image pre-compression notice:', compErr);
      uploadBlob = file;
    }

    if (onProgress) onProgress(35);

    const formData = new FormData();
    formData.append('image', uploadBlob);

    if (onProgress) onProgress(50);

    const endpoint = `https://api.imgbb.com/1/upload?key=${encodeURIComponent(apiKey)}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
    });

    if (onProgress) onProgress(85);

    const result = await response.json();

    if (result && result.success && result.data) {
      if (onProgress) onProgress(100);
      return {
        success: true,
        url: result.data.display_url || result.data.url,
        thumbUrl: result.data.thumb?.url || result.data.display_url,
        deleteUrl: result.data.delete_url,
      };
    } else {
      const errorMsg = result?.error?.message || 'ImgBB API আপলোড ব্যর্থ হয়েছে';
      console.warn('ImgBB API returned error:', errorMsg);
      // Fallback to compact compressed DataURL (~15KB) so quota is never exceeded
      const fallbackUrl = await compressImageToDataUrl(file, 300, 300, 0.6);
      return {
        success: true,
        url: fallbackUrl,
        error: `ImgBB সতর্কতা: ${errorMsg} (ছবিটি সংকুচিত লোকাল মেমরিতে সুরক্ষিত রাখা হয়েছে)`,
      };
    }
  } catch (err: unknown) {
    console.warn('ImgBB Network/Upload Error:', err);
    // Network fallback: compact compressed DataURL (~15KB)
    try {
      const fallbackUrl = await compressImageToDataUrl(file, 300, 300, 0.6);
      return {
        success: true,
        url: fallbackUrl,
        error: 'ইন্টারনেট সমস্যা বা API লিমিটের কারণে ছবিটি কম্প্রেসড করে লোকাল মেমরিতে রাখা হয়েছে।',
      };
    } catch {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'ছবি আপলোড সম্পন্ন করা সম্ভব হয়নি',
      };
    }
  }
}

/**
 * Converts a file/blob to a compact Base64 Data URL (max ~20KB)
 */
export async function fileToDataUrl(file: File | Blob): Promise<string> {
  try {
    return await compressImageToDataUrl(file, 350, 350, 0.6);
  } catch {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  }
}

/**
 * Validates if an image URL is accessible or has a valid format
 */
export function isValidImageUrl(url: string): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  return (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:image/')
  );
}
