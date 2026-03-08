import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { detectLocationTheme, Theme, AuthMethod } from '../utils/locationTheme';

interface ThemeContextValue {
  theme:        Theme;
  authMethod:   AuthMethod;
  isSouthIndia: boolean;
  themeReady:   boolean;
  setTheme:     (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme:        'dark',
  authMethod:   'phone-otp',
  isSouthIndia: false,
  themeReady:   false,
  setTheme:     () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme,        setThemeState]  = useState<Theme>('dark');
  const [authMethod,   setAuthMethod]  = useState<AuthMethod>('phone-otp');
  const [isSouthIndia, setIsSouth]     = useState(false);
  const [themeReady,   setThemeReady]  = useState(false);

  useEffect(() => {
    detectLocationTheme().then(result => {
      setThemeState(result.theme);
      setAuthMethod(result.authMethod);
      setIsSouth(result.isSouthIndia);
      setThemeReady(true);
      applyTheme(result.theme);
    });
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    applyTheme(t);
  };

  return (
    <ThemeContext.Provider value={{ theme, authMethod, isSouthIndia, themeReady, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.remove('dark');
    root.classList.add('light');
  }
}

export const useTheme = () => useContext(ThemeContext);