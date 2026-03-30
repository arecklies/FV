"use client";

import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { MeineAufgabe } from "@/lib/services/tagesansicht/types";
import { getSchrittLabel } from "@/lib/utils/workflow-labels";
import { gruppiereAufgabenNachSchritt } from "@/lib/utils/aufgaben-gruppierung";

/**
 * Aufgaben-Abschnitt fuer "Mein Tag" (PROJ-29 US-1 AC-3).
 *
 * Zeigt zugewiesene Vorgaenge, gruppiert nach Workflow-Schritt.
 * Jeder Eintrag verlinkt auf /vorgaenge/[id].
 */

interface AufgabenAbschnittProps {
  aufgaben: MeineAufgabe[];
}

export function AufgabenAbschnitt({ aufgaben }: AufgabenAbschnittProps) {
  if (aufgaben.length === 0) return null;

  const gruppen = gruppiereAufgabenNachSchritt(aufgaben);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList
            className="h-5 w-5 text-muted-foreground"
            aria-hidden="true"
          />
          Meine Aufgaben
          <span className="ml-auto text-sm font-normal text-muted-foreground">
            {aufgaben.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-4" role="list" aria-label="Meine Aufgaben">
          {Array.from(gruppen.entries()).map(([schrittId, items]) => {
            const schrittInfo = getSchrittLabel(schrittId);
            return (
              <div key={schrittId} role="listitem">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={schrittInfo.variant}>{schrittInfo.label}</Badge>
                  <span className="text-xs text-muted-foreground">
                    ({items.length})
                  </span>
                </div>
                <ul className="divide-y ml-1" role="list">
                  {items.map((aufgabe) => (
                    <li key={aufgabe.id}>
                      <Link
                        href={`/vorgaenge/${aufgabe.id}`}
                        className="flex flex-col sm:flex-row sm:items-center gap-1 py-2 px-1 -mx-1 rounded-md hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        aria-label={`Vorgang ${aufgabe.aktenzeichen} öffnen`}
                      >
                        <span className="font-medium text-sm text-primary truncate">
                          {aufgabe.aktenzeichen}
                        </span>
                        <span className="text-sm text-muted-foreground truncate sm:ml-2">
                          {aufgabe.bauherr_name}
                        </span>
                        {aufgabe.bezeichnung && (
                          <span className="text-xs text-muted-foreground truncate sm:ml-auto max-w-[200px]">
                            {aufgabe.bezeichnung}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
