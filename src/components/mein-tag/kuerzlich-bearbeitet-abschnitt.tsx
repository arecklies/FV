"use client";

import Link from "next/link";
import { History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { KuerzlichBearbeitet } from "@/lib/services/tagesansicht/types";
import { getSchrittLabel } from "@/lib/utils/workflow-labels";
import { formatRelativeZeit } from "@/lib/utils/frist-labels";

/**
 * Kuerzlich-bearbeitet-Abschnitt fuer "Mein Tag" (PROJ-29 US-1 FA-4).
 *
 * Zeigt die letzten 5 bearbeiteten Vorgaenge mit Aktenzeichen,
 * Bezeichnung, Zeitstempel und Workflow-Schritt.
 */

interface KuerzlichBearbeitetAbschnittProps {
  eintraege: KuerzlichBearbeitet[];
}

export function KuerzlichBearbeitetAbschnitt({
  eintraege,
}: KuerzlichBearbeitetAbschnittProps) {
  if (eintraege.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <History
            className="h-5 w-5 text-muted-foreground"
            aria-hidden="true"
          />
          Kürzlich bearbeitet
          <span className="ml-auto text-sm font-normal text-muted-foreground">
            {eintraege.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ul
          className="divide-y"
          role="list"
          aria-label="Kürzlich bearbeitete Vorgänge"
        >
          {eintraege.map((eintrag) => {
            const schrittInfo = getSchrittLabel(eintrag.schritt_id);
            return (
              <li key={`${eintrag.vorgang_id}-${eintrag.ausgefuehrt_am}`}>
                <Link
                  href={`/vorgaenge/${eintrag.vorgang_id}`}
                  className="flex flex-col sm:flex-row sm:items-center gap-1 py-3 px-1 -mx-1 rounded-md hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  aria-label={`Vorgang ${eintrag.aktenzeichen} öffnen, zuletzt bearbeitet ${formatRelativeZeit(eintrag.ausgefuehrt_am)}`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="font-medium text-sm text-primary truncate">
                      {eintrag.aktenzeichen}
                    </span>
                    {eintrag.bezeichnung && (
                      <span className="text-sm text-muted-foreground truncate hidden sm:inline max-w-[200px]">
                        - {eintrag.bezeichnung}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 sm:ml-auto">
                    <Badge variant={schrittInfo.variant} className="text-xs">
                      {schrittInfo.label}
                    </Badge>
                    <time
                      dateTime={eintrag.ausgefuehrt_am}
                      className="text-xs text-muted-foreground whitespace-nowrap tabular-nums"
                    >
                      {formatRelativeZeit(eintrag.ausgefuehrt_am)}
                    </time>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
