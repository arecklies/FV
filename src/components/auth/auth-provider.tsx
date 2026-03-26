"use client";

import * as React from "react";

/**
 * Auth-Kontext fuer die gesamte Anwendung (PROJ-1).
 *
 * - Laedt Session via GET /api/auth/session beim Mount
 * - Bei 401: Redirect auf /login
 * - Cookie-Synchronisation: sb-access-token bei Session-Aenderung setzen
 * - Stellt user, role, tenantId, loading, logout bereit
 */

export interface AuthUser {
  id: string;
  email: string;
  tenantId: string;
  role: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: async () => {},
});

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth muss innerhalb eines AuthProviders verwendet werden.");
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [loading, setLoading] = React.useState(true);

  // Session laden beim Mount
  React.useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const response = await fetch("/api/auth/session", {
          credentials: "include",
        });

        if (!response.ok) {
          // 401 = nicht authentifiziert → Redirect auf Login
          if (response.status === 401) {
            // Nur redirecten wenn nicht bereits auf /login
            if (!window.location.pathname.startsWith("/login")) {
              window.location.href = "/login";
              return;
            }
          }
          if (!cancelled) {
            setUser(null);
          }
          return;
        }

        const data = await response.json();

        if (!cancelled && data.user) {
          setUser({
            id: data.user.id,
            email: data.user.email,
            tenantId: data.user.tenantId,
            role: data.user.role,
          });
        }
      } catch {
        // Netzwerkfehler: User bleibt null, kein Redirect
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSession();

    return () => {
      cancelled = true;
    };
  }, []);

  // Logout-Funktion
  const logout = React.useCallback(async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Logout-Fehler ignorieren, Cookie wird serverseitig geloescht
    } finally {
      // window.location.href fuer Post-Logout-Redirect (frontend.md Auth Best Practices)
      window.location.href = "/login";
    }
  }, []);

  const value = React.useMemo(
    () => ({ user, loading, logout }),
    [user, loading, logout]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
