/**
 * ImgBB Image Upload Service
 * Allows uploading images directly to ImgBB via API or falling back to local base64 if needed.
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
 * Uploads an image file or blob to ImgBB using the provided API Key.
 */
export async function uploadToImgBB(
  file: File | Blob,
  customApiKey?: string,
  onProgress?: (percent: number) => void
): Promise<ImgBBUploadResponse> {
  const apiKey = (customApiKey && customApiKey.trim()) || DEFAULT_IMGBB_KEY;

  try {
    if (onProgress) onProgress(20);

    const formData = new FormData();
    formData.append('image', file);

    if (onProgress) onProgress(40);

    const endpoint = `https://api.imgbb.com/1/upload?key=${encodeURIComponent(apiKey)}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
    });

    if (onProgress) onProgress(80);

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
      // Fallback to local DataURL so user never loses their chosen picture
      const fallbackUrl = await fileToDataUrl(file);
      return {
        success: true,
        url: fallbackUrl,
        error: `ImgBB সতর্কতা: ${errorMsg} (ছবিটি লোকাল মেমরিতে সুরক্ষিত রাখা হয়েছে)`,
      };
    }
  } catch (err: unknown) {
    console.error('ImgBB Network/Upload Error:', err);
    // Network fallback
    try {
      const fallbackUrl = await fileToDataUrl(file);
      return {
        success: true,
        url: fallbackUrl,
        error: 'ইন্টারনেট সমস্যা বা API লিমিটের কারণে ছবিটি লোকাল মেমরিতে সংরক্ষিত হয়েছে।',
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
 * Converts a file/blob to a compressed Base64 Data URL
 */
export function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
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
