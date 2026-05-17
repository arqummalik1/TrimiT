import apiClient from './apiClient';

export type UploadProgressHandler = (percent: number) => void;

/**
 * Upload a local image URI via backend (service role → Supabase Storage).
 */
export async function uploadServiceImage(
  localUri: string,
  onProgress?: UploadProgressHandler
): Promise<string> {
  const form = new FormData();
  form.append('file', {
    uri: localUri,
    name: 'image.jpg',
    type: 'image/jpeg',
  } as unknown as Blob);

  const response = await apiClient.post('/uploads/service-image', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
    onUploadProgress: (event) => {
      if (!onProgress) return;
      if (event.total && event.total > 0) {
        onProgress(Math.min(99, Math.round((event.loaded * 100) / event.total)));
      } else if (event.loaded > 0) {
        onProgress(Math.min(90, Math.round(event.loaded / 2048)));
      }
    },
  });

  const url = response.data?.public_url as string | undefined;
  if (!url) {
    throw new Error('Upload completed but no image URL was returned.');
  }

  onProgress?.(100);
  return url;
}
