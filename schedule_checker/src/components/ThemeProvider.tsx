'use client';

import { createContext, useContext, useEffect, useState } from 'react';

const THEME_KEY = 'autoflow_theme';
type Theme = 'light' | 'dark';

const ThemeContext = createContext<{ theme: Theme; setTheme: (t: Theme) => void } | null>(null);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  return ctx ?? { theme: 'light' as Theme, setTheme: () => {} };
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(THEME_KEY) as Theme | null;
    const prefersDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
    setThemeState(saved ?? (prefersDark ? 'dark' : 'light'));
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem(THEME_KEY, theme);
  }, [theme, mounted]);

  const setTheme = (t: Theme) => setThemeState(t);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
