"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

import type { MassenaktionTyp } from "./massenaktionen-toolbar";
import type { BatchAktionResponse } from "@/lib/services/verfahren/types";

/**
 * MassenaktionenDialog (PROJ-17 FA-3)
 *
 * Bestaetigungsdialog vor Ausfuehrung einer Sammelaktion.
 * Ruft POST /api/vorgaenge/batch-aktion auf und gibt das Ergebnis zurueck.
 */

export interface MassenaktionenDialogProps {
  /** Dialog offen? */
  open: boolean;
  /** Dialog schliessen */
  onOpenChange: (open: boolean) => void;
  /** Ausgewaehlte Aktion */
  aktionTyp: MassenaktionTyp | null;
  /** IDs der ausgewaehlten Vorgaenge */
  vorgangIds: string[];
  /** Callback nach erfolgreicher/fehlerhafter Ausfuehrung */
  onErgebnis: (ergebnis: BatchAktionResponse) => void;
}

const AKTION_LABELS: Record<MassenaktionTyp, string> = {
  zuweisen: "zuweisen",
  status_aendern: "Status ändern",
  frist_verschieben: "Frist verschieben",
};

export function MassenaktionenDialog({
  open,
  onOpenChange,
  aktionTyp,
  vorgangIds,
  onErgebnis,
}: MassenaktionenDialogProps) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (!aktionTyp) return null;

  const label = AKTION_LABELS[aktionTyp];
  const anzahl = vorgangIds.length;

  async function handleConfirm() {
    setLoading(true);
    setError(null);

    try {
      // Minimale Batch-Payload je Aktionstyp
      // In einer vollstaendigen Implementierung wuerden hier zusaetzliche
      // Felder aus einem Formular kommen (z.B. zustaendiger_user_id, aktion_id)
      let body: Record<string, unknown> = {
        aktion: aktionTyp,
        vorgang_ids: vorgangIds,
      };

      // Pflichtfelder je Aktionstyp mit Platzhaltern
      // Diese werden in Phase 2 durch Formularfelder im Dialog ersetzt
      if (aktionTyp === "zuweisen") {
        body = { ...body, zustaendiger_user_id: "00000000-0000-0000-0000-000000000000" };
      } else if (aktionTyp === "status_aendern") {
        body = { ...body, aktion_id: "weiterleiten" };
      } else if (aktionTyp === "frist_verschieben") {
        body = {
          ...body,
          frist_typ: "bearbeitungsfrist",
          zusaetzliche_werktage: 5,
          begruendung: "Sammelaktion: Fristverlängerung",
        };
      }

      const res = await fetch("/api/vorgaenge/batch-aktion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Aktion konnte nicht ausgeführt werden.");
        return;
      }

      const ergebnis: BatchAktionResponse = await res.json();
      onOpenChange(false);
      onErgebnis(ergebnis);
    } catch {
      setError("Verbindungsfehler. Bitte versuchen Sie es erneut.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Sammelaktion bestätigen</AlertDialogTitle>
          <AlertDialogDescription>
            {anzahl} {anzahl === 1 ? "Vorgang" : "Vorgänge"} {label}?
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && (
          <div
            className="rounded-md border border-destructive/50 bg-destructive/10 p-3"
            role="alert"
          >
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Abbrechen</AlertDialogCancel>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            )}
            {loading ? "Wird ausgeführt..." : "Ausführen"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
