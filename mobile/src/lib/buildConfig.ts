import Constants from 'expo-constants';

type Extra = {
  apiUrl?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  googleMapsApiKey?: string;
  publicSiteUrl?: string;
  sentryDsn?: string | null;
  enableOnlinePay?: string;
  resetPasswordDeepLink?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

function pick(name: keyof Extra, envName: string, fallback = ''): string {
  const fromExtra = extra[name];
  if (typeof fromExtra === 'string' && fromExtra.trim() && !fromExtra.startsWith('$')) {
    return fromExtra.trim();
  }
  const fromEnv = process.env[envName];
  if (typeof fromEnv === 'string' && fromEnv.trim() && !fromEnv.startsWith('$')) {
    return fromEnv.trim();
  }
  return fallback;
}

export const buildConfig = {
  apiUrl: pick('apiUrl', 'EXPO_PUBLIC_API_URL', 'https://trimit-az5h.onrender.com'),
  supabaseUrl: pick('supabaseUrl', 'EXPO_PUBLIC_SUPABASE_URL', ''),
  supabaseAnonKey: pick('supabaseAnonKey', 'EXPO_PUBLIC_SUPABASE_ANON_KEY', ''),
  googleMapsApiKey: pick('googleMapsApiKey', 'EXPO_PUBLIC_GOOGLE_MAPS_API_KEY', ''),
  publicSiteUrl: pick('publicSiteUrl', 'EXPO_PUBLIC_PUBLIC_SITE_URL', 'https://trimit.online'),
  sentryDsn: pick('sentryDsn', 'EXPO_PUBLIC_SENTRY_DSN', ''),
  enableOnlinePay:
    pick('enableOnlinePay', 'EXPO_PUBLIC_ENABLE_ONLINE_PAY', 'false') === 'true' ||
    pick('enableOnlinePay', 'EXPO_PUBLIC_ENABLE_ONLINE_PAY', 'false') === '1',
  resetPasswordDeepLink: pick('resetPasswordDeepLink', 'EXPO_PUBLIC_RESET_PASSWORD_DEEP_LINK', 'trimit://reset-password'),
};

export type BuildConfigIssue = {
  key: string;
  message: string;
};

/** Missing config that breaks login/maps in release — show UI instead of native crash. */
export function getReleaseConfigIssues(): BuildConfigIssue[] {
  if (__DEV__) {
    return [];
  }
  const issues: BuildConfigIssue[] = [];
  if (!buildConfig.supabaseUrl) {
    issues.push({
      key: 'supabaseUrl',
      message: 'Supabase URL was not embedded in this build (EXPO_PUBLIC_SUPABASE_URL).',
    });
  }
  if (!buildConfig.supabaseAnonKey) {
    issues.push({
      key: 'supabaseAnon',
      message: 'Supabase anon key was not embedded in this build (EXPO_PUBLIC_SUPABASE_ANON_KEY).',
    });
  }
  if (!buildConfig.googleMapsApiKey) {
    issues.push({
      key: 'maps',
      message: 'Google Maps key was not embedded (EXPO_PUBLIC_GOOGLE_MAPS_API_KEY).',
    });
  }
  return issues;
}
