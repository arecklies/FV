"use client";

import * as React from "react";

interface GlossarContextType {
  /** Ob Glossar-Markierungen sichtbar sind */
  enabled: boolean;
  /** Toggle-Funktion */
  setEnabled: (value: boolean) => void;
}

const GlossarContext = React.createContext<GlossarContextType>({
  enabled: true,
  setEnabled: () => {},
});

const STORAGE_KEY = "glossary-enabled";

export function GlossarProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabledState] = React.useState(true);

  // localStorage beim Mount lesen
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "false") setEnabledState(false);
    } catch {
      // SSR oder localStorage nicht verfuegbar
    }
  }, []);

  const setEnabled = React.useCallback((value: boolean) => {
    setEnabledState(value);
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      // localStorage nicht verfuegbar
    }
  }, []);

  return (
    <GlossarContext.Provider value={{ enabled, setEnabled }}>
      {children}
    </GlossarContext.Provider>
  );
}

export function useGlossar() {
  return React.useContext(GlossarContext);
}
