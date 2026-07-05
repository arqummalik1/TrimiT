import apiClient from './apiClient';
import { ImageTooLargeError, prepareImageForUpload } from '../lib/imageUploadPrep';
import { isAppError } from '../types/error';
import { handleApiError } from '../lib/errorHandler';

export type UploadProgressHandler = (percent: number) => void;

export { ImageTooLargeError };

/**
 * Upload a local image URI via backend (compress → JPEG → Supabase Storage).
 */
async function uploadOwnerImage(
  endpoint: '/uploads/service-image' | '/uploads/staff-image',
  localUri: string,
  onProgress?: UploadProgressHandler
): Promise<string> {
  onProgress?.(2);

  let preparedUri: string;
  try {
    const prepared = await prepareImageForUpload(localUri);
    preparedUri = prepared.uri;
  } catch (err) {
    if (err instanceof ImageTooLargeError) {
      throw err;
    }
    throw new Error('Could not prepare image. Try another photo.');
  }

  onProgress?.(12);

  const form = new FormData();
  form.append('file', {
    uri: preparedUri,
    name: 'upload.jpg',
    type: 'image/jpeg',
  } as unknown as Blob);

  try {
    const response = await apiClient.post(endpoint, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 90000,
      onUploadProgress: (event) => {
        if (!onProgress) return;
        if (event.total && event.total > 0) {
          onProgress(Math.min(99, 12 + Math.round((event.loaded * 87) / event.total)));
        } else if (event.loaded > 0) {
          onProgress(Math.min(90, 12 + Math.round(event.loaded / 4096)));
        }
      },
    });

    const url = response.data?.public_url as string | undefined;
    if (!url) {
      throw new Error('Upload completed but no image URL was returned.');
    }

    onProgress?.(100);
    return url;
  } catch (error) {
    const appErr = isAppError(error) ? error : handleApiError(error);
    if (appErr.code === 'FILE_TOO_LARGE') {
      throw new ImageTooLargeError();
    }
    throw error;
  }
}

export async function uploadServiceImage(
  localUri: string,
  onProgress?: UploadProgressHandler
): Promise<string> {
  return uploadOwnerImage('/uploads/service-image', localUri, onProgress);
}

/** Staff (stylist) profile photo → public URL for staff.image_url. */
export async function uploadStaffImage(
  localUri: string,
  onProgress?: UploadProgressHandler
): Promise<string> {
  return uploadOwnerImage('/uploads/staff-image', localUri, onProgress);
}
