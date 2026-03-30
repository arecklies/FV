"use client";

import { CheckCircle2, XCircle } from "lucide-react";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

import type { BatchAktionResponse } from "@/lib/services/verfahren/types";

/**
 * MassenaktionenErgebnis (PROJ-17 FA-4)
 *
 * Ergebnis-Dialog nach Batch-Ausfuehrung.
 * Zeigt Erfolgs- und Fehleranzahl, bei Fehlern die Einzelergebnisse.
 */

export interface MassenaktionenErgebnisProps {
  /** Dialog offen? */
  open: boolean;
  /** Dialog schliessen */
  onOpenChange: (open: boolean) => void;
  /** Batch-Ergebnis vom Server */
  ergebnis: BatchAktionResponse | null;
}

export function MassenaktionenErgebnis({
  open,
  onOpenChange,
  ergebnis,
}: MassenaktionenErgebnisProps) {
  if (!ergebnis) return null;

  const hatFehler = ergebnis.fehlgeschlagen > 0;
  const fehlgeschlagene = ergebnis.ergebnisse.filter((e) => !e.erfolg);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Ergebnis der Sammelaktion</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              {/* Erfolgreiche */}
              {ergebnis.erfolgreich > 0 && (
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
                  <span>
                    {ergebnis.erfolgreich}{" "}
                    {ergebnis.erfolgreich === 1 ? "Vorgang" : "Vorgänge"} erfolgreich
                    verarbeitet
                  </span>
                </div>
              )}

              {/* Fehlgeschlagene */}
              {hatFehler && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-destructive">
                    <XCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
                    <span>
                      {ergebnis.fehlgeschlagen}{" "}
                      {ergebnis.fehlgeschlagen === 1 ? "Vorgang" : "Vorgänge"}{" "}
                      fehlgeschlagen
                    </span>
                  </div>

                  {/* Fehlerliste */}
                  <ul
                    className="ml-7 space-y-1 text-sm text-muted-foreground max-h-48 overflow-y-auto"
                    aria-label="Fehlgeschlagene Vorgänge"
                  >
                    {fehlgeschlagene.map((e) => (
                      <li key={e.vorgang_id} className="flex items-start gap-1.5">
                        <span className="font-mono text-xs text-destructive/80">
                          {e.vorgang_id.slice(0, 8)}...
                        </span>
                        <span>{e.meldung}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>Schließen</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
