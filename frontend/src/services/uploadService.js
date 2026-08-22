import api from '../lib/api';

/**
 * Owner image upload. Goes through the backend (`POST /uploads/service-image`)
 * so the owner's JWT is verified server-side and the write to Supabase Storage
 * uses the service role — never the browser's anon client.
 *
 * Same endpoint the mobile app uses for salon photos
 * (mobile/src/screens/owner/ManageSalonScreen.tsx → uploadServiceImage).
 *
 * @param {File} file - Image file from the picker.
 * @returns {Promise<string>} Public URL of the stored image.
 */
export async function uploadSalonImage(file) {
  if (!file) throw new Error('No file provided');

  const form = new FormData();
  form.append('file', file);

  const response = await api.post('/uploads/service-image', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 90000,
  });

  const url = response.data?.public_url;
  if (!url) {
    throw new Error('Upload completed but no image URL was returned.');
  }
  return url;
}
