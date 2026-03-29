"use client";

import * as React from "react";
import { Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/**
 * Workflow-Aktions-Kontext (PROJ-30)
 *
 * Zeigt Hinweistext und Checkliste des aktuellen Workflow-Schritts
 * direkt über den Aktions-Buttons an. Gibt Sachbearbeitern Orientierung,
 * welche Prüfungen vor der nächsten Aktion erledigt sein sollten.
 */

export interface WorkflowAktionsKontextProps {
  /** Hinweistext für den aktuellen Workflow-Schritt */
  hinweis?: string;
  /** Checkliste mit Prüfpunkten für den aktuellen Schritt */
  checkliste?: string[];
  /** Optionaler Titel (Default: "Nächster Schritt") */
  titel?: string;
  /** Zusätzliche CSS-Klassen */
  className?: string;
}

export function WorkflowAktionsKontext({
  hinweis,
  checkliste,
  titel = "Nächster Schritt",
  className,
}: WorkflowAktionsKontextProps) {
  const hatCheckliste = checkliste && checkliste.length > 0;

  // Nichts rendern wenn weder Hinweis noch Checkliste vorhanden
  if (!hinweis && !hatCheckliste) {
    return null;
  }

  return (
    <Alert
      className={className}
      role="note"
      aria-label="Kontextinformation zum aktuellen Workflow-Schritt"
    >
      <Info className="h-4 w-4" aria-hidden="true" />
      <AlertTitle>{titel}</AlertTitle>
      <AlertDescription>
        <div className="space-y-3">
          {hinweis && (
            <p className="text-sm text-muted-foreground">{hinweis}</p>
          )}
          {hatCheckliste && (
            <div>
              <p className="text-sm font-medium text-foreground mb-1.5">
                Checkliste
              </p>
              <ul
                className="space-y-1"
                aria-label="Checkliste für aktuellen Schritt"
              >
                {checkliste!.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <span
                      className="mt-1.5 h-1.5 w-1.5 rounded-full bg-muted-foreground shrink-0"
                      aria-hidden="true"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
