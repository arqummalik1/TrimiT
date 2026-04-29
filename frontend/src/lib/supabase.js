import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY must be set. Check your .env file.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Create authenticated client for realtime subscriptions
export const createAuthenticatedClient = (token) => {
  const client = createClient(supabaseUrl, supabaseAnonKey);
  if (token) {
    client.realtime.setAuth(token);
  }
  return client;
};

// ==========================================
// REALTIME SUBSCRIPTIONS
// ==========================================

/**
 * Subscribe to booking changes for a specific salon and date
 * @param {string} salonId - The salon ID to watch
 * @param {string} date - The booking date (YYYY-MM-DD) to filter
 * @param {function} onChange - Callback when booking changes
 * @returns {object} - Supabase realtime channel
 */
export const subscribeToBookings = (salonId, date, onChange) => {
  const channel = supabase
    .channel(`bookings:${salonId}:${date}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'bookings',
        filter: `salon_id=eq.${salonId}`,
      },
      (payload) => {
        if (payload.new?.booking_date === date || payload.old?.booking_date === date) {
          onChange(payload);
        }
      }
    )
    .subscribe();

  return channel;
};

/**
 * Subscribe to all booking changes for a salon (owner dashboard)
 * @param {string} salonId - The salon ID to watch
 * @param {function} onChange - Callback when any booking changes
 * @param {string} token - User's auth token for RLS bypass
 * @returns {object} - Supabase realtime channel
 */
export const subscribeToSalonBookings = (salonId, onChange, token = null) => {
  const client = token ? createAuthenticatedClient(token) : supabase;
  const channelName = `salon-${salonId}-${Math.random().toString(36).substring(7)}`;

  const channel = client
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'bookings',
        filter: `salon_id=eq.${salonId}`,
      },
      (payload) => {
        onChange(payload);
      }
    )
    .subscribe();

  return channel;
};

/**
 * Subscribe to booking changes for a specific user (customer)
 * @param {string} userId - The user ID to watch
 * @param {function} onChange - Callback when user's bookings change
 * @returns {object} - Supabase realtime channel
 */
export const subscribeToUserBookings = (userId, onChange) => {
  const channel = supabase
    .channel(`user-bookings:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'bookings',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        onChange(payload);
      }
    )
    .subscribe();

  return channel;
};

/**
 * Unsubscribe from a channel
 * @param {object} channel - The channel to unsubscribe
 */
export const unsubscribeFromChannel = (channel) => {
  if (channel) {
    supabase.removeChannel(channel);
  }
};

/**
 * Upload an image to Supabase Storage
 * @param {File} file - The file to upload
 * @param {string} bucket - The storage bucket name (default: 'salon-images')
 * @returns {Promise<string>} - The public URL of the uploaded image
 */
export const uploadImage = async (file, bucket = 'salon-images') => {
  if (!file) throw new Error('No file provided');

  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `${fileName}`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);

  return publicUrl;
};

/**
 * Delete an image from Supabase Storage
 * @param {string} url - The public URL of the image to delete
 * @param {string} bucket - The storage bucket name (default: 'salon-images')
 */
export const deleteImage = async (url, bucket = 'salon-images') => {
  if (!url) return;

  const urlObj = new URL(url);
  const pathParts = urlObj.pathname.split('/');
  const filePath = pathParts[pathParts.length - 1];

  if (!filePath) return;

  await supabase.storage
    .from(bucket)
    .remove([filePath]);
};
