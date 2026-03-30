"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarDays, RefreshCw } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

import { FristenAbschnitt } from "@/components/mein-tag/fristen-abschnitt";
import { AufgabenAbschnitt } from "@/components/mein-tag/aufgaben-abschnitt";
import { KuerzlichBearbeitetAbschnitt } from "@/components/mein-tag/kuerzlich-bearbeitet-abschnitt";
import { MeinTagEmptyState } from "@/components/mein-tag/empty-state";
import type { MeinTagResponse } from "@/lib/services/tagesansicht/types";

/**
 * Mein Tag - Persoenliche Tagesansicht (PROJ-29 US-1).
 *
 * Zeigt 3 Abschnitte: Fristen, Aufgaben, kuerzlich bearbeitet.
 * AuthGuard via useAuth (Redirect ueber AuthProvider bei 401).
 */

export default function MeinTagPage() {
  const { user, loading: authLoading } = useAuth();

  const [data, setData] = React.useState<MeinTagResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/mein-tag", { credentials: "include" });

      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (!res.ok) {
        setError("Tagesansicht konnte nicht geladen werden.");
        return;
      }

      const json: MeinTagResponse = await res.json();
      setData(json);
    } catch {
      setError("Verbindungsfehler. Bitte versuchen Sie es erneut.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!authLoading && user) {
      loadData();
    }
  }, [authLoading, user, loadData]);

  // AuthGuard: Zeige nichts waehrend Auth-Loading oder ohne User
  if (authLoading || !user) return null;

  const alleAbschnitteLeer =
    data !== null &&
    data.fristen.length === 0 &&
    data.aufgaben.length === 0 &&
    data.kuerzlich_bearbeitet.length === 0;

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <CalendarDays
              className="h-6 w-6 text-muted-foreground"
              aria-hidden="true"
            />
            Mein Tag
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {new Date().toLocaleDateString("de-DE", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            aria-label="Tagesansicht aktualisieren"
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            Aktualisieren
          </Button>
          <Button asChild size="sm">
            <Link href="/vorgaenge">Alle Vorgänge</Link>
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div
          className="rounded-md border border-destructive/50 bg-destructive/10 p-4 mb-6"
          role="alert"
        >
          <p className="text-sm text-destructive">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={loadData}
          >
            Erneut versuchen
          </Button>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && !data && (
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          aria-label="Tagesansicht wird geladen"
        >
          {[0, 1, 2].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <Skeleton className="h-5 w-40" />
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && alleAbschnitteLeer && <MeinTagEmptyState />}

      {/* Content: 3 Abschnitte */}
      {!loading && !error && data && !alleAbschnitteLeer && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="md:col-span-2 lg:col-span-1">
            <FristenAbschnitt fristen={data.fristen} />
          </div>
          <div className="md:col-span-1 lg:col-span-1">
            <AufgabenAbschnitt aufgaben={data.aufgaben} />
          </div>
          <div className="md:col-span-1 lg:col-span-1">
            <KuerzlichBearbeitetAbschnitt
              eintraege={data.kuerzlich_bearbeitet}
            />
          </div>
        </div>
      )}
    </div>
  );
}
