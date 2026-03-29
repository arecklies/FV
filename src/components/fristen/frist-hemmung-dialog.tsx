"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { VorgangFrist } from "@/lib/services/fristen/types";
import { PAUSE_GRUENDE, SONSTIGES_VALUE } from "@/lib/utils/pause-gruende";

/**
 * Dialog: Frist hemmen (PROJ-4 US-5, PROJ-43: Auswahlliste)
 *
 * Pflichtfeld: Grund der Hemmung (Select + Freitext bei "Sonstiges").
 */

interface FristHemmungDialogProps {
  frist: VorgangFrist;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (params: { grund: string; ende?: string }) => Promise<void>;
  loading: boolean;
}

export function FristHemmungDialog({
  frist,
  open,
  onOpenChange,
  onSubmit,
  loading,
}: FristHemmungDialogProps) {
  const [ausgewaehlt, setAusgewaehlt] = React.useState("");
  const [freitext, setFreitext] = React.useState("");
  const [validationError, setValidationError] = React.useState<string | null>(
    null
  );

  const istSonstiges = ausgewaehlt === SONSTIGES_VALUE;

  // PROJ-26: State zuruecksetzen bei erneutem Oeffnen
  React.useEffect(() => {
    if (open) {
      setAusgewaehlt("");
      setFreitext("");
      setValidationError(null);
    }
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(null);

    if (!ausgewaehlt) {
      setValidationError("Bitte wählen Sie einen Hemmungsgrund.");
      return;
    }

    if (istSonstiges && freitext.trim().length < 3) {
      setValidationError("Bitte geben Sie einen Grund ein (mindestens 3 Zeichen).");
      return;
    }

    // Grund: Label des gewaehlten Eintrags oder Freitext bei "Sonstiges"
    const grund = istSonstiges
      ? freitext.trim()
      : PAUSE_GRUENDE.find((g) => g.value === ausgewaehlt)?.label ?? ausgewaehlt;

    onSubmit({ grund });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Frist hemmen</DialogTitle>
          <DialogDescription>
            {frist.bezeichnung} — die Frist wird pausiert und zählt nicht
            weiter, bis die Hemmung aufgehoben wird.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pause-grund">Hemmungsgrund (Pflichtfeld)</Label>
            <Select
              value={ausgewaehlt}
              onValueChange={setAusgewaehlt}
              disabled={loading}
            >
              <SelectTrigger id="pause-grund" aria-required="true">
                <SelectValue placeholder="Grund wählen..." />
              </SelectTrigger>
              <SelectContent>
                {PAUSE_GRUENDE.map((g) => (
                  <SelectItem key={g.value} value={g.value}>
                    {g.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* PROJ-43 AC-2: Freitext nur bei "Sonstiges" */}
          {istSonstiges && (
            <div className="space-y-2">
              <Label htmlFor="freitext-grund">Begründung (Pflichtfeld)</Label>
              <Textarea
                id="freitext-grund"
                value={freitext}
                onChange={(e) => setFreitext(e.target.value)}
                placeholder="Bitte Grund eingeben..."
                rows={3}
                disabled={loading}
                aria-required="true"
              />
            </div>
          )}

          {validationError && (
            <p className="text-sm text-destructive" role="alert">
              {validationError}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && (
                <Loader2
                  className="mr-2 h-4 w-4 animate-spin"
                  aria-hidden="true"
                />
              )}
              Frist hemmen
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
