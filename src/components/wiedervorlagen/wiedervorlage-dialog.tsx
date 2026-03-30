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

/**
 * Dialog: Wiedervorlage anlegen (PROJ-53 US-1)
 *
 * Pflichtfelder: Datum (faellig_am), Betreff (max 200 Zeichen).
 * Optional: Notiz (laengere Beschreibung).
 * POST an /api/vorgaenge/[id]/wiedervorlagen.
 */

export interface WiedervorlageDialogProps {
  /** Vorgang-ID fuer den API-Aufruf */
  vorgangId: string;
  /** Dialog offen/geschlossen */
  open: boolean;
  /** Callback bei Aenderung des offenen Zustands */
  onOpenChange: (open: boolean) => void;
  /** Callback nach erfolgreichem Anlegen */
  onCreated?: () => void;
}

export function WiedervorlageDialog({
  vorgangId,
  open,
  onOpenChange,
  onCreated,
}: WiedervorlageDialogProps) {
  const [faelligAm, setFaelligAm] = React.useState("");
  const [betreff, setBetreff] = React.useState("");
  const [notiz, setNotiz] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // State zuruecksetzen bei erneutem Oeffnen
  React.useEffect(() => {
    if (open) {
      setFaelligAm("");
      setBetreff("");
      setNotiz("");
      setError(null);
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Clientseitige Validierung
    if (!faelligAm) {
      setError("Bitte wählen Sie ein Datum.");
      return;
    }
    if (!betreff.trim()) {
      setError("Betreff ist ein Pflichtfeld.");
      return;
    }
    if (betreff.trim().length > 200) {
      setError("Betreff darf maximal 200 Zeichen lang sein.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/vorgaenge/${vorgangId}/wiedervorlagen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          faellig_am: faelligAm,
          betreff: betreff.trim(),
          notiz: notiz.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.error ?? "Wiedervorlage konnte nicht angelegt werden."
        );
      }

      onOpenChange(false);
      onCreated?.();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Wiedervorlage konnte nicht angelegt werden."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Wiedervorlage anlegen</DialogTitle>
          <DialogDescription>
            Legen Sie eine persönliche Erinnerung zu diesem Vorgang an. Die
            Wiedervorlage erscheint am gewählten Datum in Ihrer Übersicht.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="wv-faellig-am">Fällig am (Pflichtfeld)</Label>
            <Input
              id="wv-faellig-am"
              type="date"
              value={faelligAm}
              onChange={(e) => setFaelligAm(e.target.value)}
              disabled={loading}
              aria-required="true"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="wv-betreff">Betreff (Pflichtfeld)</Label>
            <Input
              id="wv-betreff"
              type="text"
              value={betreff}
              onChange={(e) => setBetreff(e.target.value)}
              placeholder="z.B. Stellungnahme Brandschutz nachfragen"
              maxLength={200}
              disabled={loading}
              aria-required="true"
            />
            <p className="text-xs text-muted-foreground">
              {betreff.length}/200 Zeichen
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="wv-notiz">Notiz (optional)</Label>
            <Textarea
              id="wv-notiz"
              value={notiz}
              onChange={(e) => setNotiz(e.target.value)}
              placeholder="Weitere Details zur Erinnerung..."
              rows={3}
              disabled={loading}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
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
              Wiedervorlage anlegen
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
