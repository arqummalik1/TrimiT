import { createClient } from "@supabase/supabase-js";
import { getEnv } from "../config/env";

let supabaseClient = null;
/** One realtime client per access token — avoids duplicate websocket connections. */
const authenticatedClients = new Map();

function requireSupabaseConfig() {
  const supabaseUrl = getEnv("SUPABASE_URL");
  const supabaseAnonKey = getEnv("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_ANON_KEY must be set (REACT_APP_* or VITE_*). Copy frontend/env.example to .env.local.",
    );
  }
  return { supabaseUrl, supabaseAnonKey };
}

/** Lazy client so marketing routes load even when env is missing until Supabase is used. */
export function getSupabase() {
  if (!supabaseClient) {
    const { supabaseUrl, supabaseAnonKey } = requireSupabaseConfig();
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseClient;
}

/** @deprecated Prefer getSupabase() — kept for existing imports. */
export const supabase = new Proxy(
  {},
  {
    get(_target, prop) {
      const client = getSupabase();
      const value = client[prop];
      return typeof value === "function" ? value.bind(client) : value;
    },
  },
);

// Create authenticated client for realtime subscriptions (reused per token)
export const createAuthenticatedClient = (token) => {
  if (!token) {
    return getSupabase();
  }
  if (authenticatedClients.has(token)) {
    return authenticatedClients.get(token);
  }
  const { supabaseUrl, supabaseAnonKey } = requireSupabaseConfig();
  const client = createClient(supabaseUrl, supabaseAnonKey);
  client.realtime.setAuth(token);
  authenticatedClients.set(token, client);
  return client;
};

/** Tag channel with owning client so cleanup uses the correct instance. */
function tagRealtimeChannel(client, channel) {
  channel._trimitRealtimeClient = client;
  return channel;
}

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
  const client = getSupabase();
  const channel = client
    .channel(`bookings:${salonId}:${date}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "bookings",
        filter: `salon_id=eq.${salonId}`,
      },
      (payload) => {
        if (
          payload.new?.booking_date === date ||
          payload.old?.booking_date === date
        ) {
          onChange(payload);
        }
      },
    )
    .subscribe();

  return tagRealtimeChannel(client, channel);
};

/**
 * Subscribe to all booking changes for a salon (owner dashboard)
 * @param {string} salonId - The salon ID to watch
 * @param {function} onChange - Callback when any booking changes
 * @param {string} token - User's auth token for RLS bypass
 * @returns {object} - Supabase realtime channel
 */
export const subscribeToSalonBookings = (salonId, onChange, token = null) => {
  const client = token ? createAuthenticatedClient(token) : getSupabase();
  const channelName = `salon-${salonId}-${Math.random().toString(36).substring(7)}`;

  const channel = client
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "bookings",
        filter: `salon_id=eq.${salonId}`,
      },
      (payload) => {
        onChange(payload);
      },
    )
    .subscribe();

  return tagRealtimeChannel(client, channel);
};

/**
 * Subscribe to booking changes for a specific user (customer)
 * @param {string} userId - The user ID to watch
 * @param {function} onChange - Callback when user's bookings change
 * @param {string} token - User's auth token for RLS enforcement (P0-4 Security Fix)
 * @returns {object} - Supabase realtime channel
 */
export const subscribeToUserBookings = (userId, onChange, token = null) => {
  const client = token ? createAuthenticatedClient(token) : getSupabase();
  const channelName = `user-bookings:${userId}-${Math.random().toString(36).substring(7)}`;

  const channel = client
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "bookings",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        onChange(payload);
      },
    )
    .subscribe();

  return tagRealtimeChannel(client, channel);
};

/**
 * Unsubscribe and remove a channel on the client that created it.
 * @param {object} channel - The channel to unsubscribe
 */
export const unsubscribeFromChannel = (channel) => {
  if (!channel) return;
  const client = channel._trimitRealtimeClient || getSupabase();
  try {
    channel.unsubscribe();
  } catch {
    // channel may already be torn down
  }
  try {
    client.removeChannel(channel);
  } catch {
    // ignore double-remove
  }
};

/**
 * Upload an image to Supabase Storage
 * @param {File} file - The file to upload
 * @param {string} bucket - The storage bucket name (default: 'salon-images')
 * @returns {Promise<string>} - The public URL of the uploaded image
 */
export const uploadImage = async (file, bucket = "salon-images") => {
  if (!file) throw new Error("No file provided");

  const fileExt = file.name.split(".").pop();
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `${fileName}`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(filePath);

  return publicUrl;
};

/**
 * Delete an image from Supabase Storage
 * @param {string} url - The public URL of the image to delete
 * @param {string} bucket - The storage bucket name (default: 'salon-images')
 */
export const deleteImage = async (url, bucket = "salon-images") => {
  if (!url) return;

  const urlObj = new URL(url);
  const pathParts = urlObj.pathname.split("/");
  const filePath = pathParts[pathParts.length - 1];

  if (!filePath) return;

  await supabase.storage.from(bucket).remove([filePath]);
};
