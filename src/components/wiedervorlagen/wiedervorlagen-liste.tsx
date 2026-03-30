"use client";

import * as React from "react";
import { Loader2, Trash2, AlertCircle, ClipboardList } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";

import type { Wiedervorlage } from "@/lib/services/wiedervorlagen/types";
import { cn } from "@/lib/utils";

/**
 * Wiedervorlagen-Liste fuer die Vorgang-Detailseite (PROJ-53 US-3).
 *
 * Zeigt alle Wiedervorlagen eines Vorgangs chronologisch.
 * - Checkbox "Erledigt" (PATCH /api/wiedervorlagen/[id])
 * - Delete-Button (DELETE /api/wiedervorlagen/[id])
 * - Erledigte ausgegraut mit Durchstreichung
 * - Ueberfaellige: rotes "Überfällig"-Badge
 */

export interface WiedervorlagenListeProps {
  /** Liste der Wiedervorlagen */
  wiedervorlagen: Wiedervorlage[];
  /** Daten werden geladen */
  loading: boolean;
  /** Fehlermeldung beim Laden */
  error: string | null;
  /** Callback: Wiedervorlage als erledigt markieren / Erledigung aufheben */
  onToggleErledigt: (id: string, erledigt: boolean) => Promise<void>;
  /** Callback: Wiedervorlage loeschen */
  onDelete: (id: string) => Promise<void>;
}

/** Prüft ob eine Wiedervorlage ueberfaellig ist (faellig_am < heute UND nicht erledigt) */
function istUeberfaellig(wv: Wiedervorlage): boolean {
  if (wv.erledigt_am) return false;
  const heute = new Date();
  heute.setHours(0, 0, 0, 0);
  const faellig = new Date(wv.faellig_am);
  faellig.setHours(0, 0, 0, 0);
  return faellig < heute;
}

/** Formatiert ein Datum im deutschen Format */
function formatDatum(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function WiedervorlagenListe({
  wiedervorlagen,
  loading,
  error,
  onToggleErledigt,
  onDelete,
}: WiedervorlagenListeProps) {
  const [actionLoadingId, setActionLoadingId] = React.useState<string | null>(
    null
  );

  async function handleToggle(wv: Wiedervorlage) {
    setActionLoadingId(wv.id);
    try {
      await onToggleErledigt(wv.id, !wv.erledigt_am);
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleDelete(id: string) {
    setActionLoadingId(id);
    try {
      await onDelete(id);
    } finally {
      setActionLoadingId(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3" aria-label="Wiedervorlagen werden geladen">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="rounded-md border border-destructive/50 bg-destructive/10 p-4"
        role="alert"
      >
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  if (wiedervorlagen.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <ClipboardList
          className="h-10 w-10 text-muted-foreground/50 mb-3"
          aria-hidden="true"
        />
        <p className="text-sm text-muted-foreground">
          Keine Wiedervorlagen für diesen Vorgang.
        </p>
      </div>
    );
  }

  // Chronologisch sortiert: naechste zuerst, erledigte am Ende
  const sortiert = [...wiedervorlagen].sort((a, b) => {
    // Erledigte ans Ende
    if (a.erledigt_am && !b.erledigt_am) return 1;
    if (!a.erledigt_am && b.erledigt_am) return -1;
    // Nach faellig_am aufsteigend (naechste zuerst)
    return new Date(a.faellig_am).getTime() - new Date(b.faellig_am).getTime();
  });

  return (
    <ul className="space-y-2" aria-label="Wiedervorlagen">
      {sortiert.map((wv) => {
        const erledigt = !!wv.erledigt_am;
        const ueberfaellig = istUeberfaellig(wv);
        const isLoading = actionLoadingId === wv.id;

        return (
          <li
            key={wv.id}
            className={cn(
              "flex items-start gap-3 rounded-md border p-3 transition-colors",
              erledigt && "bg-muted/50 opacity-60",
              ueberfaellig && "border-destructive/30 bg-destructive/5"
            )}
          >
            {/* Checkbox Erledigt */}
            <div className="pt-0.5">
              <Checkbox
                checked={erledigt}
                onCheckedChange={() => handleToggle(wv)}
                disabled={isLoading}
                aria-label={`Wiedervorlage "${wv.betreff}" als ${erledigt ? "offen" : "erledigt"} markieren`}
              />
            </div>

            {/* Inhalt */}
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={cn(
                    "text-sm font-medium",
                    erledigt && "line-through text-muted-foreground"
                  )}
                >
                  {wv.betreff}
                </span>
                {ueberfaellig && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertCircle
                      className="mr-1 h-3 w-3"
                      aria-hidden="true"
                    />
                    Überfällig
                  </Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                Fällig: {formatDatum(wv.faellig_am)}
                {wv.erledigt_am && (
                  <> | Erledigt: {formatDatum(wv.erledigt_am)}</>
                )}
              </div>
              {wv.notiz && (
                <p
                  className={cn(
                    "text-xs text-muted-foreground mt-1",
                    erledigt && "line-through"
                  )}
                >
                  {wv.notiz}
                </p>
              )}
            </div>

            {/* Löschen */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(wv.id)}
              disabled={isLoading}
              aria-label={`Wiedervorlage "${wv.betreff}" löschen`}
              className="shrink-0 text-muted-foreground hover:text-destructive"
            >
              {isLoading ? (
                <Loader2
                  className="h-4 w-4 animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
