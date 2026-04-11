import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://etpoecagsfhodtfuhblk.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Create authenticated client for realtime subscriptions
export const createAuthenticatedClient = (token) => {
  const client = createClient(supabaseUrl, supabaseAnonKey);
  
  // Set auth token for realtime subscriptions
  if (token) {
    client.realtime.setAuth(token);
    console.log('[Realtime] Auth token set on realtime client');
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
        // Filter by date in the callback since we can't filter by both in the subscription
        if (payload.new?.booking_date === date || payload.old?.booking_date === date) {
          onChange(payload);
        }
      }
    )
    .subscribe((status) => {
      console.log('Realtime subscription status:', status);
    });

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
  // Use authenticated client if token provided, otherwise use anon client
  const client = token ? createAuthenticatedClient(token) : supabase;
  
  console.log('[Realtime] Creating subscription with', token ? 'authenticated' : 'anon', 'client');
  console.log('[Realtime] Watching salon_id:', salonId);
  
  // Use a unique channel name to avoid conflicts
  const channelName = `salon-${salonId}-${Math.random().toString(36).substring(7)}`;
  console.log('[Realtime] Channel name:', channelName);
  
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
        console.log('[Realtime] Salon booking event received:', payload.eventType, payload);
        console.log('[Realtime] New booking data:', payload.new);
        onChange(payload);
      }
    )
    .subscribe((status, err) => {
      console.log('[Realtime] Salon bookings subscription status:', status);
      if (err) {
        console.error('[Realtime] Subscription error:', err);
      }
      if (status === 'SUBSCRIBED') {
        console.log('[Realtime] Successfully subscribed to bookings for salon:', salonId);
      }
    });

  // Add system event listener for connection issues
  channel.on('system', {}, (payload) => {
    console.log('[Realtime] System event:', payload);
  });

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
        console.log('[Realtime] User booking event:', payload.eventType, payload);
        onChange(payload);
      }
    )
    .subscribe((status, err) => {
      console.log('[Realtime] User bookings subscription status:', status);
      if (err) {
        console.error('[Realtime] Subscription error:', err);
      }
    });

  // Add system event listener for connection issues
  channel.on('system', {}, (payload) => {
    console.log('[Realtime] System event:', payload);
  });

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
  
  // Generate unique filename
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `${fileName}`;
  
  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });
  
  if (error) {
    console.error('Upload error:', error);
    throw error;
  }
  
  // Get public URL
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
  
  // Extract file path from URL
  const urlObj = new URL(url);
  const pathParts = urlObj.pathname.split('/');
  const filePath = pathParts[pathParts.length - 1];
  
  if (!filePath) return;
  
  const { error } = await supabase.storage
    .from(bucket)
    .remove([filePath]);
  
  if (error) {
    console.error('Delete error:', error);
  }
};

// ==========================================
// END REALTIME SUBSCRIPTIONS
// ==========================================
