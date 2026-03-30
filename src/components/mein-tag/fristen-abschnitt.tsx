"use client";

import Link from "next/link";
import { Clock } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AmpelBadge } from "@/components/fristen/ampel-badge";
import type { AmpelStatus } from "@/lib/services/fristen/types";
import type { MeineFrist } from "@/lib/services/tagesansicht/types";
import { getFristTypLabel, formatDatumKurz } from "@/lib/utils/frist-labels";

/**
 * Fristen-Abschnitt fuer "Mein Tag" (PROJ-29 US-1 AC-2).
 *
 * Zeigt ablaufende Fristen mit Ampel-Badge, Aktenzeichen, Fristtyp, Enddatum.
 * Jeder Eintrag verlinkt auf /vorgaenge/[id].
 */

interface FristenAbschnittProps {
  fristen: MeineFrist[];
}

export function FristenAbschnitt({ fristen }: FristenAbschnittProps) {
  if (fristen.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          Ablaufende Fristen
          <span className="ml-auto text-sm font-normal text-muted-foreground">
            {fristen.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ul className="divide-y" role="list" aria-label="Ablaufende Fristen">
          {fristen.map((eintrag) => (
            <li key={eintrag.frist.id}>
              <Link
                href={`/vorgaenge/${eintrag.frist.vorgang_id}`}
                className="flex flex-col sm:flex-row sm:items-center gap-2 py-3 px-1 -mx-1 rounded-md hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label={`Frist ${eintrag.frist.bezeichnung} für ${eintrag.vorgang_aktenzeichen}, ${eintrag.frist.status === "dunkelrot" ? "überfällig" : "gefährdet"}`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <AmpelBadge
                    status={eintrag.frist.status as AmpelStatus}
                    compact
                  />
                  <span className="font-medium text-sm truncate">
                    {eintrag.vorgang_aktenzeichen}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground sm:ml-auto">
                  <span className="truncate max-w-[180px]">
                    {getFristTypLabel(eintrag.frist.typ)}
                  </span>
                  <span className="whitespace-nowrap font-medium tabular-nums">
                    {formatDatumKurz(eintrag.frist.end_datum)}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
