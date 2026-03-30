"use client";

import * as React from "react";
import Link from "next/link";
import { AlertCircle, Bell, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import type { FaelligeWiedervorlage } from "@/lib/services/wiedervorlagen/types";

/**
 * Fällige Wiedervorlagen - Card-Komponente fuer Startseite/Dashboard (PROJ-53 US-2).
 *
 * GET /api/wiedervorlagen/faellig?tage_voraus=5
 * Zeigt faellige + bald faellige Wiedervorlagen.
 * Klick fuehrt zum zugehoerigen Vorgang.
 * Empty State: "Keine fälligen Wiedervorlagen"
 */

export interface FaelligeWiedervorlagenProps {
  /** Anzahl Tage im Voraus (Default: 5) */
  tageVoraus?: number;
}

/** Prüft ob eine Wiedervorlage heute oder in der Vergangenheit faellig ist */
function istUeberfaelligOderHeute(faelligAm: string): boolean {
  const heute = new Date();
  heute.setHours(0, 0, 0, 0);
  const faellig = new Date(faelligAm);
  faellig.setHours(0, 0, 0, 0);
  return faellig <= heute;
}

/** Formatiert ein Datum im deutschen Format */
function formatDatum(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function FaelligeWiedervorlagen({
  tageVoraus = 5,
}: FaelligeWiedervorlagenProps) {
  const [daten, setDaten] = React.useState<FaelligeWiedervorlage[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let abgebrochen = false;

    async function laden() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/wiedervorlagen/faellig?tage_voraus=${tageVoraus}`
        );
        if (!res.ok) {
          throw new Error("Fällige Wiedervorlagen konnten nicht geladen werden.");
        }
        const body = await res.json();
        if (!abgebrochen) {
          setDaten(body.data ?? []);
        }
      } catch (err) {
        if (!abgebrochen) {
          setError(
            err instanceof Error
              ? err.message
              : "Fällige Wiedervorlagen konnten nicht geladen werden."
          );
        }
      } finally {
        if (!abgebrochen) {
          setLoading(false);
        }
      }
    }

    laden();
    return () => {
      abgebrochen = true;
    };
  }, [tageVoraus]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-4 w-4" aria-hidden="true" />
          Wiedervorlagen
          {!loading && daten.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {daten.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading && (
          <div
            className="space-y-2"
            aria-label="Wiedervorlagen werden geladen"
          >
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        )}

        {!loading && error && (
          <div
            className="rounded-md border border-destructive/50 bg-destructive/10 p-3"
            role="alert"
          >
            <p className="text-sm text-destructive">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => {
                setLoading(true);
                setError(null);
                fetch(`/api/wiedervorlagen/faellig?tage_voraus=${tageVoraus}`)
                  .then((res) => {
                    if (!res.ok) throw new Error();
                    return res.json();
                  })
                  .then((body) => setDaten(body.data ?? []))
                  .catch(() =>
                    setError(
                      "Fällige Wiedervorlagen konnten nicht geladen werden."
                    )
                  )
                  .finally(() => setLoading(false));
              }}
            >
              <Loader2
                className={loading ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"}
                aria-hidden="true"
              />
              Erneut laden
            </Button>
          </div>
        )}

        {!loading && !error && daten.length === 0 && (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Bell
              className="h-8 w-8 text-muted-foreground/40 mb-2"
              aria-hidden="true"
            />
            <p className="text-sm text-muted-foreground">
              Keine fälligen Wiedervorlagen
            </p>
          </div>
        )}

        {!loading && !error && daten.length > 0 && (
          <ul className="space-y-2" aria-label="Fällige Wiedervorlagen">
            {daten.map(({ wiedervorlage: wv, vorgang_aktenzeichen }) => {
              const ueberfaellig = istUeberfaelligOderHeute(wv.faellig_am);
              return (
                <li key={wv.id}>
                  <Link
                    href={`/vorgaenge/${wv.vorgang_id}`}
                    className="flex items-start gap-3 rounded-md border p-3 transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium truncate">
                          {wv.betreff}
                        </span>
                        {ueberfaellig && (
                          <Badge
                            variant="destructive"
                            className="text-xs shrink-0"
                          >
                            <AlertCircle
                              className="mr-1 h-3 w-3"
                              aria-hidden="true"
                            />
                            Überfällig
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {vorgang_aktenzeichen} - Fällig:{" "}
                        {formatDatum(wv.faellig_am)}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
