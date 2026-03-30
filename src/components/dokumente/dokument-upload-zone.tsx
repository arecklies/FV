"use client";

import * as React from "react";
import { Upload, FileWarning, CheckCircle2, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DOKUMENT_KATEGORIEN, type DokumentKategorie } from "@/lib/services/dokumente/types";
import {
  KATEGORIE_LABELS,
  istMimeTypeErlaubt,
  mimeTypeAusDateiname,
  erlaubteEndungenAlsAccept,
  formatiereGroesse,
} from "@/lib/utils/dokument-format";

// -- Types --

interface UploadDatei {
  file: File;
  id: string;
  status: "pending" | "uploading" | "confirming" | "done" | "error";
  progress: number;
  errorMessage?: string;
  kategorie: DokumentKategorie;
  beschreibung: string;
  schlagwoerter: string[];
}

export interface DokumentUploadZoneProps {
  vorgangId: string;
  /** Callback nach erfolgreichem Upload (zum Neuladen der Dokumentenliste). */
  onUploadComplete?: () => void;
  /** Optional: Kategorie vorbelegen. */
  defaultKategorie?: DokumentKategorie;
  /** Optional: Upload fuer neue Version eines bestehenden Dokuments. */
  dokumentId?: string;
}

// -- Helpers --

function erzeugeId(): string {
  return `upload-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// -- Component --

export function DokumentUploadZone({
  vorgangId,
  onUploadComplete,
  defaultKategorie = "sonstiges",
  dokumentId,
}: DokumentUploadZoneProps) {
  const [dateien, setDateien] = React.useState<UploadDatei[]>([]);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // -- Dateien hinzufuegen --

  const fuegeDateienHinzu = React.useCallback(
    (files: FileList | File[]) => {
      const neue: UploadDatei[] = Array.from(files).map((file) => {
        const mimeType = mimeTypeAusDateiname(file.name);
        const erlaubt = mimeType ? istMimeTypeErlaubt(mimeType) : false;

        return {
          file,
          id: erzeugeId(),
          status: erlaubt ? "pending" : "error",
          progress: 0,
          errorMessage: erlaubt
            ? undefined
            : `Dateityp nicht unterstützt: ${file.name.split(".").pop()?.toUpperCase() ?? "unbekannt"}`,
          kategorie: defaultKategorie,
          beschreibung: "",
          schlagwoerter: [],
        };
      });

      setDateien((prev) => [...prev, ...neue]);
    },
    [defaultKategorie]
  );

  // -- Drag & Drop Handler --

  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        fuegeDateienHinzu(e.dataTransfer.files);
      }
    },
    [fuegeDateienHinzu]
  );

  // -- Datei entfernen --

  const entferneDatei = React.useCallback((id: string) => {
    setDateien((prev) => prev.filter((d) => d.id !== id));
  }, []);

  // -- Kategorie aendern --

  const aendereKategorie = React.useCallback((id: string, kategorie: DokumentKategorie) => {
    setDateien((prev) =>
      prev.map((d) => (d.id === id ? { ...d, kategorie } : d))
    );
  }, []);

  // -- Upload starten --

  const starteUpload = React.useCallback(async () => {
    const pendingDateien = dateien.filter((d) => d.status === "pending");
    if (pendingDateien.length === 0) return;

    setIsUploading(true);

    for (const datei of pendingDateien) {
      try {
        // Status: uploading
        setDateien((prev) =>
          prev.map((d) => (d.id === datei.id ? { ...d, status: "uploading", progress: 0 } : d))
        );

        const mimeType = mimeTypeAusDateiname(datei.file.name);
        if (!mimeType) throw new Error("MIME-Type konnte nicht ermittelt werden");

        // Schritt 1: POST Metadaten -> Signed URL erhalten
        const metaBody = dokumentId
          ? { dateiname: datei.file.name, mime_type: mimeType, dateigroesse: datei.file.size }
          : {
              dateiname: datei.file.name,
              mime_type: mimeType,
              dateigroesse: datei.file.size,
              kategorie: datei.kategorie,
              beschreibung: datei.beschreibung || undefined,
              schlagwoerter: datei.schlagwoerter.length > 0 ? datei.schlagwoerter : undefined,
            };

        const metaUrl = dokumentId
          ? `/api/vorgaenge/${vorgangId}/dokumente/${dokumentId}/versionen`
          : `/api/vorgaenge/${vorgangId}/dokumente`;

        const metaResponse = await fetch(metaUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(metaBody),
        });

        if (!metaResponse.ok) {
          const errorData = await metaResponse.json().catch(() => ({}));
          throw new Error(errorData.error ?? `Server-Fehler (${metaResponse.status})`);
        }

        const metaResult = await metaResponse.json();
        const uploadUrl: string = metaResult.uploadUrl ?? metaResult.data?.uploadUrl;
        const dokId: string = metaResult.dokument?.id ?? metaResult.data?.dokument?.id ?? dokumentId;

        if (!uploadUrl) throw new Error("Keine Upload-URL vom Server erhalten");

        // Schritt 2: PUT Datei an signierte URL
        setDateien((prev) =>
          prev.map((d) => (d.id === datei.id ? { ...d, progress: 10 } : d))
        );

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", uploadUrl, true);
          xhr.setRequestHeader("Content-Type", mimeType);

          xhr.upload.addEventListener("progress", (event) => {
            if (event.lengthComputable) {
              const percent = Math.round((event.loaded / event.total) * 80) + 10; // 10-90%
              setDateien((prev) =>
                prev.map((d) => (d.id === datei.id ? { ...d, progress: percent } : d))
              );
            }
          });

          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error(`Upload fehlgeschlagen (${xhr.status})`));
            }
          });

          xhr.addEventListener("error", () => reject(new Error("Netzwerkfehler beim Upload")));
          xhr.addEventListener("abort", () => reject(new Error("Upload abgebrochen")));

          xhr.send(datei.file);
        });

        // Schritt 3: POST confirm (nur fuer Neuanlage, nicht fuer Versionen)
        if (!dokumentId && dokId) {
          setDateien((prev) =>
            prev.map((d) => (d.id === datei.id ? { ...d, status: "confirming", progress: 95 } : d))
          );

          const confirmResponse = await fetch(
            `/api/vorgaenge/${vorgangId}/dokumente/${dokId}/confirm`,
            { method: "POST" }
          );

          if (!confirmResponse.ok) {
            throw new Error("Upload-Bestätigung fehlgeschlagen");
          }
        }

        // Fertig
        setDateien((prev) =>
          prev.map((d) => (d.id === datei.id ? { ...d, status: "done", progress: 100 } : d))
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unbekannter Fehler";
        setDateien((prev) =>
          prev.map((d) =>
            d.id === datei.id ? { ...d, status: "error", errorMessage: message, progress: 0 } : d
          )
        );
      }
    }

    setIsUploading(false);
    onUploadComplete?.();
  }, [dateien, vorgangId, dokumentId, onUploadComplete]);

  // -- Render --

  const pendingCount = dateien.filter((d) => d.status === "pending").length;
  const alleDone = dateien.length > 0 && dateien.every((d) => d.status === "done" || d.status === "error");

  return (
    <div className="space-y-4">
      {/* Drop-Zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Dateien hier ablegen oder klicken zum Auswählen"
        className={`
          flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8
          transition-colors cursor-pointer min-h-[120px]
          ${isDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
      >
        <Upload className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
        <div className="text-center">
          <p className="text-sm font-medium">
            Dateien hier ablegen oder{" "}
            <span className="text-primary underline">durchsuchen</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            PDF, DWG, DXF, TIFF, JPEG, XLS/XLSX, DOCX - max. 500 MB
          </p>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        multiple
        accept={erlaubteEndungenAlsAccept()}
        aria-label="Dateiauswahl"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            fuegeDateienHinzu(e.target.files);
            e.target.value = "";
          }
        }}
      />

      {/* Dateiliste mit Fortschritt */}
      {dateien.length > 0 && (
        <div className="space-y-3">
          {dateien.map((datei) => (
            <div
              key={datei.id}
              className="flex flex-col gap-2 rounded-md border p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {datei.status === "done" && (
                    <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" aria-hidden="true" />
                  )}
                  {datei.status === "error" && (
                    <FileWarning className="h-4 w-4 text-destructive shrink-0" aria-hidden="true" />
                  )}
                  {(datei.status === "uploading" || datei.status === "confirming") && (
                    <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" aria-hidden="true" />
                  )}
                  <span className="text-sm truncate">{datei.file.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatiereGroesse(datei.file.size)}
                  </span>
                </div>
                {(datei.status === "pending" || datei.status === "error") && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => entferneDatei(datei.id)}
                    aria-label={`${datei.file.name} entfernen`}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>

              {/* Kategorie-Auswahl (nur im pending-Status und Neuanlage) */}
              {datei.status === "pending" && !dokumentId && (
                <div className="flex items-center gap-2">
                  <Label htmlFor={`kat-${datei.id}`} className="text-xs shrink-0">
                    Kategorie:
                  </Label>
                  <Select
                    value={datei.kategorie}
                    onValueChange={(val) => aendereKategorie(datei.id, val as DokumentKategorie)}
                  >
                    <SelectTrigger id={`kat-${datei.id}`} className="h-7 text-xs w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DOKUMENT_KATEGORIEN.map((kat) => (
                        <SelectItem key={kat} value={kat} className="text-xs">
                          {KATEGORIE_LABELS[kat]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Fortschrittsbalken */}
              {(datei.status === "uploading" || datei.status === "confirming") && (
                <div className="flex items-center gap-2">
                  <Progress value={datei.progress} className="h-2 flex-1" aria-label="Upload-Fortschritt" />
                  <span className="text-xs text-muted-foreground w-10 text-right">
                    {datei.progress}%
                  </span>
                </div>
              )}

              {/* Fehlermeldung */}
              {datei.status === "error" && datei.errorMessage && (
                <p className="text-xs text-destructive">{datei.errorMessage}</p>
              )}
            </div>
          ))}

          {/* Upload-Button */}
          {pendingCount > 0 && (
            <Button
              onClick={starteUpload}
              disabled={isUploading}
              className="w-full sm:w-auto"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Wird hochgeladen...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
                  {pendingCount === 1 ? "Datei hochladen" : `${pendingCount} Dateien hochladen`}
                </>
              )}
            </Button>
          )}

          {/* Alle fertig: Aufräumen */}
          {alleDone && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDateien([])}
            >
              Liste leeren
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
