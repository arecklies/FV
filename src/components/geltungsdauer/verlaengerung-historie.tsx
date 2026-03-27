"use client";

import * as React from "react";
import { Loader2, History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * VerlaengerungHistorie (PROJ-48 US-4)
 *
 * Zeigt die Verlängerungshistorie eines Vorgangs.
 * Nur sichtbar wenn mindestens 1 Verlängerung existiert.
 */

interface VerlaengerungEintrag {
  id: string;
  antragsdatum: string;
  altes_datum: string;
  neues_datum: string;
  begruendung: string;
  verlaengerung_tage: number;
  sachbearbeiter_email: string | null;
  created_at: string;
}

interface VerlaengerungHistorieProps {
  vorgangId: string;
  /** Trigger zum Neuladen (z.B. nach Verlängerung) */
  refreshKey?: number;
}

export function VerlaengerungHistorie({ vorgangId, refreshKey }: VerlaengerungHistorieProps) {
  const [eintraege, setEintraege] = React.useState<VerlaengerungEintrag[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/vorgaenge/${vorgangId}/geltungsdauer-verlaengerung`);
        if (!res.ok) {
          setError("Verlängerungshistorie konnte nicht geladen werden");
          return;
        }
        const json = await res.json();
        if (!cancelled) {
          setEintraege(json.data ?? []);
        }
      } catch {
        if (!cancelled) setError("Netzwerkfehler");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [vorgangId, refreshKey]);

  // US-4 AC-1: Nur anzeigen wenn mindestens 1 Verlängerung existiert
  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Verlängerungshistorie laden...
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-destructive py-2" role="alert">{error}</p>
    );
  }

  if (eintraege.length === 0) return null;

  return (
    <Card className="bg-background shadow-sm">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <History className="h-4 w-4" aria-hidden="true" />
          Verlängerungshistorie
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {eintraege.map((e) => (
            <div
              key={e.id}
              className="border rounded-md p-3 text-sm space-y-1"
            >
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <span className="text-muted-foreground">
                  Antrag: {new Date(e.antragsdatum).toLocaleDateString("de-DE")}
                </span>
                <span className="text-muted-foreground">
                  +{e.verlaengerung_tage} Tage
                </span>
                {e.sachbearbeiter_email && (
                  <span className="text-muted-foreground">
                    von {e.sachbearbeiter_email}
                  </span>
                )}
              </div>
              <div className="flex gap-2 items-center">
                <span className="line-through text-muted-foreground">
                  {new Date(e.altes_datum).toLocaleDateString("de-DE")}
                </span>
                <span aria-hidden="true">→</span>
                <span className="font-medium">
                  {new Date(e.neues_datum).toLocaleDateString("de-DE")}
                </span>
              </div>
              <p className="text-muted-foreground italic">{e.begruendung}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
