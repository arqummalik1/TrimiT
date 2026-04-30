/**
 * ThemeContext.tsx
 * Central theme provider + useTheme() hook.
 *
 * - Defaults to LIGHT mode
 * - Persists preference via AsyncStorage (key: 'trimit-theme-preference')
 * - toggleTheme() switches instantly across the entire app
 * - useMemo ensures the context value is stable unless theme actually changes
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme } from './lightTheme';
import { darkTheme } from './darkTheme';
import { Theme } from './tokens';
export type { Theme };

// =============================================================================
// TYPES
// =============================================================================

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme:       Theme;
  isDark:      boolean;
  themeMode:   ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const STORAGE_KEY = 'trimit-theme-preference';
const DEFAULT_MODE: ThemeMode = 'light';

// =============================================================================
// CONTEXT
// =============================================================================

const ThemeContext = createContext<ThemeContextValue>({
  theme:       lightTheme,
  isDark:      false,
  themeMode:   'system',
  setThemeMode: () => {},
  toggleTheme: () => {},
});

// =============================================================================
// PROVIDER
// =============================================================================

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(DEFAULT_MODE);
  const systemColorScheme = useColorScheme();

  // Rehydrate persisted preference on mount (non-blocking)
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === 'dark' || stored === 'light' || stored === 'system') {
          setMode(stored as ThemeMode);
        }
      })
      .catch(() => {
        // Graceful failure — keep default mode
      });
  }, []);

  const setThemeMode = useCallback((nextMode: ThemeMode) => {
    setMode(nextMode);
    AsyncStorage.setItem(STORAGE_KEY, nextMode).catch(() => {});
  }, []);

  const toggleTheme = useCallback(() => {
    setMode((prev) => {
      // If toggling, it implies a manual override, so switch between light and dark explicitly
      const next: ThemeMode = prev === 'dark' ? 'light' : 'dark';
      AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo<ThemeContextValue>(() => {
    const isDark = mode === 'system' ? systemColorScheme === 'dark' : mode === 'dark';
    return {
      theme: isDark ? darkTheme : lightTheme,
      isDark,
      themeMode: mode,
      setThemeMode,
      toggleTheme,
    };
  }, [mode, systemColorScheme, setThemeMode, toggleTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * useTheme() — consume inside any component to get the active theme.
 *
 * Usage:
 *   const { theme, isDark, toggleTheme } = useTheme();
 *   const styles = useMemo(() => createStyles(theme), [theme]);
 */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme() must be used inside <ThemeProvider>');
  }
  return ctx;
}

export type { ThemeContextValue, ThemeMode };
export { ThemeContext };
