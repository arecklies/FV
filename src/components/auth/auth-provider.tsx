"use client";

import * as React from "react";

/**
 * Auth-Kontext fuer die gesamte Anwendung (PROJ-1).
 *
 * - Laedt Session via GET /api/auth/session beim Mount
 * - Bei 401: Redirect auf /login
 * - Bei Netzwerkfehler: error-State + Retry nach 3s (F-03)
 * - Stellt user, role, tenantId, loading, error, logout bereit
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
  error: string | null;
  logout: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
  logout: async () => {},
});

// F-04: Context hat Default-Wert, daher kann useContext nie null sein.
// Kein Guard noetig — direkt zurueckgeben.
export function useAuth() {
  return React.useContext(AuthContext);
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Session laden beim Mount
  React.useEffect(() => {
    let cancelled = false;
    let retryTimeout: ReturnType<typeof setTimeout>;

    async function loadSession() {
      try {
        setError(null);
        const response = await fetch("/api/auth/session", {
          credentials: "include",
        });

        if (!response.ok) {
          // 401 = nicht authentifiziert -> Redirect auf Login
          if (response.status === 401) {
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
        // F-03: Netzwerkfehler — error-State setzen + Retry nach 3s
        if (!cancelled) {
          setUser(null);
          setError("Verbindungsfehler. Erneuter Versuch...");
          retryTimeout = setTimeout(() => {
            if (!cancelled) loadSession();
          }, 3000);
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
      clearTimeout(retryTimeout);
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
      window.location.href = "/login";
    }
  }, []);

  const value = React.useMemo(
    () => ({ user, loading, error, logout }),
    [user, loading, error, logout]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
