"use client";

import * as React from "react";
import { Loader2, CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/**
 * VerlaengerungDialog (PROJ-48 US-3)
 *
 * Dialog zum Erfassen einer Geltungsdauer-Verlängerung.
 * Felder: Antragsdatum, Begründung, Verlängerungsdauer (Tage).
 */

interface VerlaengerungDialogProps {
  vorgangId: string;
  /** Aktuelles Ablaufdatum (ISO) */
  geltungsdauerBis: string;
  onSuccess?: () => void;
}

export function VerlaengerungDialog({
  vorgangId,
  geltungsdauerBis,
  onSuccess,
}: VerlaengerungDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [antragsdatum, setAntragsdatum] = React.useState(
    new Date().toISOString().split("T")[0]
  );
  const [begruendung, setBegruendung] = React.useState("");
  const [tage, setTage] = React.useState(365);

  // Neues Ablaufdatum vorberechnen
  const neuesDatum = React.useMemo(() => {
    const d = new Date(geltungsdauerBis);
    d.setDate(d.getDate() + tage);
    return d.toLocaleDateString("de-DE");
  }, [geltungsdauerBis, tage]);

  function resetForm() {
    setAntragsdatum(new Date().toISOString().split("T")[0]);
    setBegruendung("");
    setTage(365);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/vorgaenge/${vorgangId}/geltungsdauer-verlaengerung`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          antragsdatum,
          begruendung,
          verlaengerung_tage: tage,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Verlängerung fehlgeschlagen");
        return;
      }

      setOpen(false);
      resetForm();
      onSuccess?.();
    } catch {
      setError("Netzwerkfehler — bitte versuchen Sie es erneut");
    } finally {
      setLoading(false);
    }
  }

  const istGueltig = begruendung.trim().length >= 10 && tage > 0 && tage <= 1095;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1 min-h-[44px]">
          <CalendarPlus className="h-4 w-4" aria-hidden="true" />
          Verlängerung erfassen
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Geltungsdauer verlängern</DialogTitle>
            <DialogDescription>
              Erfassen Sie den Verlängerungsantrag. Das neue Ablaufdatum wird automatisch berechnet.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Antragsdatum */}
            <div className="grid gap-1.5">
              <Label htmlFor="antragsdatum">Antragsdatum</Label>
              <Input
                id="antragsdatum"
                type="date"
                value={antragsdatum}
                onChange={(e) => setAntragsdatum(e.target.value)}
                required
                className="min-h-[44px]"
              />
            </div>

            {/* Verlängerungsdauer */}
            <div className="grid gap-1.5">
              <Label htmlFor="verlaengerung-tage">Verlängerung (Tage)</Label>
              <Input
                id="verlaengerung-tage"
                type="number"
                min={1}
                max={1095}
                value={tage}
                onChange={(e) => setTage(parseInt(e.target.value, 10) || 0)}
                required
                className="min-h-[44px]"
              />
              <p className="text-xs text-muted-foreground">
                Standard: 365 Tage (1 Jahr). Maximal 1095 Tage (3 Jahre).
              </p>
              <p className="text-sm font-medium">
                Neues Ablaufdatum: {neuesDatum}
              </p>
            </div>

            {/* Begründung */}
            <div className="grid gap-1.5">
              <Label htmlFor="begruendung">Begründung</Label>
              <Textarea
                id="begruendung"
                value={begruendung}
                onChange={(e) => setBegruendung(e.target.value)}
                placeholder="Grund für die Verlängerung (min. 10 Zeichen)"
                required
                minLength={10}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                {begruendung.length}/10 Zeichen (Minimum)
              </p>
            </div>

            {/* Fehlermeldung */}
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
                resetForm();
              }}
              disabled={loading}
            >
              Abbrechen
            </Button>
            <Button
              type="submit"
              disabled={loading || !istGueltig}
              className="gap-1 min-h-[44px]"
              aria-label="Verlängerung speichern"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Verlängerung speichern
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
