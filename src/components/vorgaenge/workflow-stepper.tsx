"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Workflow-Stepper (PROJ-3 US-7, ADR-011)
 *
 * Horizontaler Stepper zur Visualisierung des Prozessfortschritts.
 * Zeigt abgeschlossene, aktuelle und zukünftige Schritte.
 */

export interface WorkflowSchrittInfo {
  id: string;
  label: string;
  typ: string;
}

export interface WorkflowStepperProps {
  /** Alle Schritte des Workflows in Reihenfolge */
  schritte: WorkflowSchrittInfo[];
  /** ID des aktuellen Schritts */
  aktuellerSchrittId: string;
  /** IDs der abgeschlossenen Schritte (aus Historie) */
  abgeschlosseneSchritte?: string[];
  /** Hinweistext für den aktuellen Schritt */
  hinweis?: string;
  /** Checkliste für den aktuellen Schritt */
  checkliste?: string[];
}

export function WorkflowStepper({
  schritte,
  aktuellerSchrittId,
  abgeschlosseneSchritte = [],
  hinweis,
  checkliste,
}: WorkflowStepperProps) {
  const aktuellerIndex = schritte.findIndex(
    (s) => s.id === aktuellerSchrittId
  );

  if (schritte.length === 0) {
    return (
      <div
        className="text-sm text-muted-foreground py-4"
        role="status"
        aria-label="Keine Workflow-Schritte vorhanden"
      >
        Keine Workflow-Schritte vorhanden.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stepper */}
      <nav aria-label="Prozessfortschritt">
        <ol className="flex flex-wrap items-center gap-2 md:gap-0">
          {schritte.map((schritt, index) => {
            const istAbgeschlossen =
              abgeschlosseneSchritte.includes(schritt.id) ||
              index < aktuellerIndex;
            const istAktuell = schritt.id === aktuellerSchrittId;

            return (
              <li
                key={schritt.id}
                className="flex items-center"
                aria-current={istAktuell ? "step" : undefined}
              >
                {/* Verbindungslinie */}
                {index > 0 && (
                  <div
                    className={cn(
                      "hidden md:block h-0.5 w-6 lg:w-10",
                      istAbgeschlossen || istAktuell
                        ? "bg-primary"
                        : "bg-muted"
                    )}
                    aria-hidden="true"
                  />
                )}
                {/* Schritt */}
                <div className="flex flex-col items-center gap-1 min-w-[60px] md:min-w-[80px]">
                  <div
                    className={cn(
                      "flex items-center justify-center rounded-full w-8 h-8 text-xs font-semibold transition-colors",
                      istAbgeschlossen &&
                        "bg-primary text-primary-foreground",
                      istAktuell &&
                        "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2",
                      !istAbgeschlossen &&
                        !istAktuell &&
                        "bg-muted text-muted-foreground"
                    )}
                    aria-hidden="true"
                  >
                    {istAbgeschlossen ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-xs text-center leading-tight max-w-[80px] md:max-w-[100px]",
                      istAktuell
                        ? "font-semibold text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {schritt.label}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Hinweistext und Checkliste */}
      {(hinweis || (checkliste && checkliste.length > 0)) && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            {hinweis && (
              <div
                className="text-sm text-muted-foreground"
                role="note"
                aria-label="Hinweis zum aktuellen Schritt"
              >
                <p className="font-medium text-foreground mb-1">
                  Hinweis
                </p>
                <p>{hinweis}</p>
              </div>
            )}
            {checkliste && checkliste.length > 0 && (
              <div>
                <p className="text-sm font-medium text-foreground mb-2">
                  Checkliste
                </p>
                <ul
                  className="space-y-1"
                  aria-label="Checkliste für aktuellen Schritt"
                >
                  {checkliste.map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <span
                        className="mt-1 h-1.5 w-1.5 rounded-full bg-muted-foreground shrink-0"
                        aria-hidden="true"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
