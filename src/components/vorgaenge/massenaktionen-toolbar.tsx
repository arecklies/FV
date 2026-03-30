"use client";

import { UserPlus, RefreshCw, CalendarPlus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * MassenaktionenToolbar (PROJ-17 FA-2)
 *
 * Zeigt Sammelaktionen wenn mindestens ein Vorgang ausgewaehlt ist.
 * 3 Aktionen: Zuweisen, Status aendern, Frist verschieben.
 */

export type MassenaktionTyp = "zuweisen" | "status_aendern" | "frist_verschieben";

export interface MassenaktionenToolbarProps {
  /** Anzahl der ausgewaehlten Vorgaenge */
  selectedCount: number;
  /** Callback wenn eine Aktion gewaehlt wird */
  onAktion: (typ: MassenaktionTyp) => void;
  /** Auswahl aufheben */
  onClear: () => void;
}

export function MassenaktionenToolbar({
  selectedCount,
  onAktion,
  onClear,
}: MassenaktionenToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-3 mb-4 rounded-lg border bg-primary/5 border-primary/20 shadow-sm print:hidden"
      role="toolbar"
      aria-label="Massenaktionen"
    >
      <Badge variant="secondary" className="text-sm">
        {selectedCount} ausgewählt
      </Badge>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onAktion("zuweisen")}
          aria-label={`${selectedCount} Vorgänge zuweisen`}
        >
          <UserPlus className="mr-1.5 h-4 w-4" aria-hidden="true" />
          Zuweisen
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onAktion("status_aendern")}
          aria-label={`Status von ${selectedCount} Vorgängen ändern`}
        >
          <RefreshCw className="mr-1.5 h-4 w-4" aria-hidden="true" />
          Status ändern
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onAktion("frist_verschieben")}
          aria-label={`Frist von ${selectedCount} Vorgängen verschieben`}
        >
          <CalendarPlus className="mr-1.5 h-4 w-4" aria-hidden="true" />
          Frist verschieben
        </Button>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={onClear}
        className="ml-auto"
        aria-label="Auswahl aufheben"
      >
        <X className="mr-1.5 h-4 w-4" aria-hidden="true" />
        Auswahl aufheben
      </Button>
    </div>
  );
}
