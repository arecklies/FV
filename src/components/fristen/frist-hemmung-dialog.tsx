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

import type { VorgangFrist } from "@/lib/services/fristen/types";

/**
 * Dialog: Frist hemmen (PROJ-4 US-5)
 *
 * Pflichtfeld: Grund der Hemmung.
 * Optionales Enddatum.
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
  const [grund, setGrund] = React.useState("");
  const [validationError, setValidationError] = React.useState<string | null>(
    null
  );

  // PROJ-26: State zuruecksetzen bei erneutem Oeffnen
  React.useEffect(() => {
    if (open) {
      setGrund("");
      setValidationError(null);
    }
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(null);

    if (!grund.trim()) {
      setValidationError("Hemmungsgrund ist ein Pflichtfeld.");
      return;
    }

    onSubmit({ grund: grund.trim() });
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
            <Label htmlFor="grund">Hemmungsgrund (Pflichtfeld)</Label>
            <Textarea
              id="grund"
              value={grund}
              onChange={(e) => setGrund(e.target.value)}
              placeholder="z.B. Nachforderung wegen Unvollständigkeit der Unterlagen"
              rows={3}
              disabled={loading}
              aria-required="true"
            />
          </div>

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
