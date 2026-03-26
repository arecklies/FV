"use client";

import * as React from "react";
import type { VorgangFrist } from "@/lib/services/fristen/types";

/**
 * Hook: Fristen eines Vorgangs laden und verwalten (PROJ-4).
 *
 * Kapselt alle Fristen-API-Aufrufe. Gibt Loading/Error/Data zurück.
 */

interface UseFristenReturn {
  fristen: VorgangFrist[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  createFrist: (params: {
    typ: string;
    bezeichnung: string;
    werktage: number;
    start_datum: string;
  }) => Promise<VorgangFrist | null>;
  verlaengereFrist: (
    fristId: string,
    params: { zusaetzliche_werktage: number; begruendung: string }
  ) => Promise<VorgangFrist | null>;
  hemmeFrist: (
    fristId: string,
    params: { grund: string; ende?: string }
  ) => Promise<VorgangFrist | null>;
  hebeHemmungAuf: (fristId: string) => Promise<VorgangFrist | null>;
  actionLoading: boolean;
  actionError: string | null;
}

export function useFristen(vorgangId: string): UseFristenReturn {
  const [fristen, setFristen] = React.useState<VorgangFrist[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [actionLoading, setActionLoading] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);

  const basePath = `/api/vorgaenge/${vorgangId}/fristen`;

  const reload = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(basePath, { credentials: "include" });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) {
        setError("Fristen konnten nicht geladen werden.");
        return;
      }
      const data = await res.json();
      setFristen(data.fristen ?? []);
    } catch {
      setError("Verbindungsfehler.");
    } finally {
      setLoading(false);
    }
  }, [basePath]);

  React.useEffect(() => {
    reload();
  }, [reload]);

  async function apiAction<T>(
    url: string,
    method: string,
    body?: unknown
  ): Promise<T | null> {
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        credentials: "include",
        body: body ? JSON.stringify(body) : undefined,
      });
      if (res.status === 401) {
        window.location.href = "/login";
        return null;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setActionError(
          data.error ?? "Aktion konnte nicht ausgeführt werden."
        );
        return null;
      }
      const data = await res.json();
      await reload();
      return data.frist as T;
    } catch {
      setActionError("Verbindungsfehler.");
      return null;
    } finally {
      setActionLoading(false);
    }
  }

  const createFrist = React.useCallback(
    (params: {
      typ: string;
      bezeichnung: string;
      werktage: number;
      start_datum: string;
    }) => apiAction<VorgangFrist>(basePath, "POST", params),
    [basePath]
  );

  const verlaengereFrist = React.useCallback(
    (
      fristId: string,
      params: { zusaetzliche_werktage: number; begruendung: string }
    ) =>
      apiAction<VorgangFrist>(
        `${basePath}/${fristId}/verlaengerung`,
        "PATCH",
        params
      ),
    [basePath]
  );

  const hemmeFrist = React.useCallback(
    (fristId: string, params: { grund: string; ende?: string }) =>
      apiAction<VorgangFrist>(
        `${basePath}/${fristId}/hemmung`,
        "POST",
        params
      ),
    [basePath]
  );

  const hebeHemmungAuf = React.useCallback(
    (fristId: string) =>
      apiAction<VorgangFrist>(
        `${basePath}/${fristId}/hemmung`,
        "DELETE"
      ),
    [basePath]
  );

  return {
    fristen,
    loading,
    error,
    reload,
    createFrist,
    verlaengereFrist,
    hemmeFrist,
    hebeHemmungAuf,
    actionLoading,
    actionError,
  };
}
