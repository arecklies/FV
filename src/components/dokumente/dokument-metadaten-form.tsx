"use client";

import * as React from "react";
import { Loader2, Save, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DOKUMENT_KATEGORIEN, type Dokument, type DokumentKategorie } from "@/lib/services/dokumente/types";
import { KATEGORIE_LABELS } from "@/lib/utils/dokument-format";

// -- Types --

export interface DokumentMetadatenFormProps {
  vorgangId: string;
  dokument: Dokument | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (updated: Dokument) => void;
}

// -- Component --

export function DokumentMetadatenForm({
  vorgangId,
  dokument,
  open,
  onOpenChange,
  onSaved,
}: DokumentMetadatenFormProps) {
  const [kategorie, setKategorie] = React.useState<DokumentKategorie>("sonstiges");
  const [beschreibung, setBeschreibung] = React.useState("");
  const [schlagwoerter, setSchlagwoerter] = React.useState<string[]>([]);
  const [neuesSchlagwort, setNeuesSchlagwort] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Formular initialisieren, wenn Dokument sich aendert
  React.useEffect(() => {
    if (dokument && open) {
      setKategorie(dokument.kategorie);
      setBeschreibung(dokument.beschreibung ?? "");
      setSchlagwoerter([...dokument.schlagwoerter]);
      setError(null);
      setNeuesSchlagwort("");
    }
  }, [dokument, open]);

  // Auto-Save: Werte in sessionStorage sichern
  React.useEffect(() => {
    if (!dokument || !open) return;
    const key = `dokument-meta-${dokument.id}`;
    sessionStorage.setItem(key, JSON.stringify({ kategorie, beschreibung, schlagwoerter }));
  }, [kategorie, beschreibung, schlagwoerter, dokument, open]);

  // Auto-Save: Werte aus sessionStorage wiederherstellen
  React.useEffect(() => {
    if (!dokument || !open) return;
    const key = `dokument-meta-${dokument.id}`;
    const saved = sessionStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.kategorie) setKategorie(parsed.kategorie);
        if (parsed.beschreibung !== undefined) setBeschreibung(parsed.beschreibung);
        if (Array.isArray(parsed.schlagwoerter)) setSchlagwoerter(parsed.schlagwoerter);
      } catch {
        // Gespeicherte Daten fehlerhaft, ignorieren
      }
    }
  }, [dokument, open]);

  const fuegeSchlagwortHinzu = React.useCallback(() => {
    const trimmed = neuesSchlagwort.trim();
    if (trimmed && !schlagwoerter.includes(trimmed)) {
      setSchlagwoerter((prev) => [...prev, trimmed]);
      setNeuesSchlagwort("");
    }
  }, [neuesSchlagwort, schlagwoerter]);

  const entferneSchlagwort = React.useCallback((wort: string) => {
    setSchlagwoerter((prev) => prev.filter((s) => s !== wort));
  }, []);

  const handleSpeichern = React.useCallback(async () => {
    if (!dokument) return;

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/vorgaenge/${vorgangId}/dokumente/${dokument.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kategorie,
            beschreibung: beschreibung || undefined,
            schlagwoerter,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? `Server-Fehler (${response.status})`);
      }

      const data = await response.json();
      const updatedDokument = data.dokument;

      // SessionStorage aufraeumen
      sessionStorage.removeItem(`dokument-meta-${dokument.id}`);

      onSaved?.(updatedDokument);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Speichern");
    } finally {
      setIsSaving(false);
    }
  }, [dokument, vorgangId, kategorie, beschreibung, schlagwoerter, onSaved, onOpenChange]);

  if (!dokument) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Metadaten bearbeiten</DialogTitle>
          <DialogDescription>{dokument.dateiname}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Kategorie */}
          <div className="space-y-2">
            <Label htmlFor="meta-kategorie">Kategorie</Label>
            <Select
              value={kategorie}
              onValueChange={(val) => setKategorie(val as DokumentKategorie)}
            >
              <SelectTrigger id="meta-kategorie">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOKUMENT_KATEGORIEN.map((kat) => (
                  <SelectItem key={kat} value={kat}>
                    {KATEGORIE_LABELS[kat]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Beschreibung */}
          <div className="space-y-2">
            <Label htmlFor="meta-beschreibung">Beschreibung</Label>
            <Textarea
              id="meta-beschreibung"
              value={beschreibung}
              onChange={(e) => setBeschreibung(e.target.value)}
              placeholder="Optionale Beschreibung zum Dokument..."
              rows={3}
            />
          </div>

          {/* Schlagwoerter */}
          <div className="space-y-2">
            <Label>Schlagwörter</Label>
            {schlagwoerter.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {schlagwoerter.map((wort) => (
                  <Badge key={wort} variant="secondary" className="gap-1">
                    {wort}
                    <button
                      type="button"
                      onClick={() => entferneSchlagwort(wort)}
                      className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
                      aria-label={`Schlagwort "${wort}" entfernen`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                value={neuesSchlagwort}
                onChange={(e) => setNeuesSchlagwort(e.target.value)}
                placeholder="Neues Schlagwort..."
                aria-label="Neues Schlagwort eingeben"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    fuegeSchlagwortHinzu();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={fuegeSchlagwortHinzu}
                disabled={!neuesSchlagwort.trim()}
                aria-label="Schlagwort hinzufügen"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Fehlermeldung */}
          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3" role="alert">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Abbrechen
          </Button>
          <Button onClick={handleSpeichern} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Speichern...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" aria-hidden="true" />
                Speichern
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
