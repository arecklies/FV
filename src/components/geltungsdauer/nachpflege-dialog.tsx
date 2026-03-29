"use client";

import * as React from "react";
import { CalendarClock, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
 * GeltungsdauerNachpflegeDialog (PROJ-56 US-1)
 *
 * Ermoeglicht das manuelle Setzen von geltungsdauer_bis auf
 * abgeschlossenen Bestandsvorgaengen ohne Geltungsdauer.
 */

interface NachpflegeDialogProps {
  vorgangId: string;
  version: number;
  onSuccess: () => void;
}

export function GeltungsdauerNachpflegeDialog({
  vorgangId,
  version,
  onSuccess,
}: NachpflegeDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [datum, setDatum] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const handleSave = async () => {
    if (!datum) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/vorgaenge/${vorgangId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          geltungsdauer_bis: new Date(datum).toISOString(),
          version,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error ?? "Geltungsdauer konnte nicht gesetzt werden.");
        return;
      }

      toast.success("Geltungsdauer erfolgreich nachgepflegt.");
      setOpen(false);
      setDatum("");
      onSuccess();
    } catch {
      toast.error("Verbindungsfehler. Bitte versuchen Sie es erneut.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setDatum(""); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <CalendarClock className="h-4 w-4" aria-hidden="true" />
          Geltungsdauer nachpflegen
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Geltungsdauer nachpflegen</DialogTitle>
          <DialogDescription>
            Setzen Sie das Ablaufdatum der Baugenehmigung für diesen Bestandsvorgang.
            Die Geltungsdauer beträgt in der Regel 3 Jahre ab Erteilung.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="geltungsdauer-datum">Geltungsdauer bis</Label>
          <Input
            id="geltungsdauer-datum"
            type="date"
            value={datum}
            onChange={(e) => setDatum(e.target.value)}
            className="mt-1.5"
            aria-label="Ablaufdatum der Baugenehmigung"
          />
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={saving}
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleSave}
            disabled={!datum || saving}
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
