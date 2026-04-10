import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { lightColors, darkColors, ColorScheme } from './index';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  colors: ColorScheme;
  isDark: boolean;
  mode: ThemeMode;
}

const ThemeContext = createContext<ThemeContextType>({
  colors: lightColors,
  isDark: false,
  mode: 'system',
});

interface ThemeProviderProps {
  children: React.ReactNode;
  mode?: ThemeMode;
}

export function ThemeProvider({ children, mode = 'system' }: ThemeProviderProps) {
  const systemScheme = useColorScheme();

  const value = useMemo(() => {
    const isDark =
      mode === 'dark' || (mode === 'system' && systemScheme === 'dark');
    return {
      colors: isDark ? darkColors : lightColors,
      isDark,
      mode,
    };
  }, [mode, systemScheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to access the current theme colors.
 * Returns the same color object shape as the static `colors` export,
 * but switches between light/dark based on system preference.
 */
export function useTheme(): ThemeContextType {
  return useContext(ThemeContext);
}
