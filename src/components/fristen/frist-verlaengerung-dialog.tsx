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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import type { VorgangFrist } from "@/lib/services/fristen/types";

/**
 * Dialog: Frist verlängern (PROJ-4 US-4)
 *
 * Pflichtfelder: zusätzliche Werktage, Begründung.
 */

interface FristVerlaengerungDialogProps {
  frist: VorgangFrist;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (params: {
    zusaetzliche_werktage: number;
    begruendung: string;
  }) => Promise<void>;
  loading: boolean;
}

export function FristVerlaengerungDialog({
  frist,
  open,
  onOpenChange,
  onSubmit,
  loading,
}: FristVerlaengerungDialogProps) {
  const [werktage, setWerktage] = React.useState("");
  const [begruendung, setBegruendung] = React.useState("");
  const [validationError, setValidationError] = React.useState<string | null>(
    null
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(null);

    const wt = parseInt(werktage, 10);
    if (!wt || wt <= 0) {
      setValidationError("Bitte geben Sie eine positive Anzahl Werktage ein.");
      return;
    }
    if (!begruendung.trim()) {
      setValidationError("Begründung ist ein Pflichtfeld.");
      return;
    }

    onSubmit({ zusaetzliche_werktage: wt, begruendung: begruendung.trim() });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Frist verlängern</DialogTitle>
          <DialogDescription>
            {frist.bezeichnung} — aktuelles Ende:{" "}
            {new Date(frist.end_datum).toLocaleDateString("de-DE")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="werktage">Zusätzliche Werktage</Label>
            <Input
              id="werktage"
              type="number"
              min="1"
              value={werktage}
              onChange={(e) => setWerktage(e.target.value)}
              placeholder="z.B. 10"
              disabled={loading}
              aria-required="true"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="begruendung">Begründung (Pflichtfeld)</Label>
            <Textarea
              id="begruendung"
              value={begruendung}
              onChange={(e) => setBegruendung(e.target.value)}
              placeholder="z.B. Nachforderung wegen fehlender Unterlagen"
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
              Verlängern
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
