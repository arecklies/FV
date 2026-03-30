"use client";

import * as React from "react";
import { Download, Upload, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Dokument, DokumentVersion } from "@/lib/services/dokumente/types";
import { formatiereGroesse, formatiereDatum } from "@/lib/utils/dokument-format";
import { DokumentUploadZone } from "./dokument-upload-zone";

// -- Types --

export interface DokumentVersionHistorieProps {
  vorgangId: string;
  dokument: Dokument | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDownloadVersion: (dokument: Dokument, version: number) => void;
}

// -- Component --

export function DokumentVersionHistorie({
  vorgangId,
  dokument,
  open,
  onOpenChange,
  onDownloadVersion,
}: DokumentVersionHistorieProps) {
  const [versionen, setVersionen] = React.useState<DokumentVersion[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showUpload, setShowUpload] = React.useState(false);

  // Versionen laden, wenn Dialog geoeffnet wird
  React.useEffect(() => {
    if (!open || !dokument) {
      setVersionen([]);
      setError(null);
      setShowUpload(false);
      return;
    }

    let cancelled = false;

    async function ladeVersionen() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/vorgaenge/${vorgangId}/dokumente/${dokument!.id}/versionen`
        );
        if (!response.ok) {
          throw new Error(`Server-Fehler (${response.status})`);
        }
        const data = await response.json();
        if (!cancelled) {
          setVersionen(data.versionen ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Fehler beim Laden der Versionen");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    ladeVersionen();
    return () => { cancelled = true; };
  }, [open, dokument, vorgangId]);

  const handleUploadComplete = React.useCallback(() => {
    setShowUpload(false);
    // Versionen neu laden
    if (!dokument) return;
    setIsLoading(true);
    fetch(`/api/vorgaenge/${vorgangId}/dokumente/${dokument.id}/versionen`)
      .then((r) => r.json())
      .then((data) => setVersionen(data.versionen ?? []))
      .catch(() => setError("Versionen konnten nicht aktualisiert werden"))
      .finally(() => setIsLoading(false));
  }, [vorgangId, dokument]);

  if (!dokument) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Versionshistorie</DialogTitle>
          <DialogDescription>
            {dokument.dateiname} - {dokument.aktuelle_version} Version{dokument.aktuelle_version > 1 ? "en" : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Neue Version hochladen */}
          {showUpload ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Neue Version hochladen</p>
              <DokumentUploadZone
                vorgangId={vorgangId}
                dokumentId={dokument.id}
                onUploadComplete={handleUploadComplete}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUpload(false)}
              >
                Abbrechen
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowUpload(true)}
            >
              <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
              Neue Version hochladen
            </Button>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-6" role="status" aria-label="Versionen werden geladen">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden="true" />
              <span className="ml-2 text-sm text-muted-foreground">Versionen werden geladen...</span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3" role="alert">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Versionstabelle */}
          {!isLoading && !error && versionen.length > 0 && (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Version</TableHead>
                    <TableHead>Dateiname</TableHead>
                    <TableHead className="hidden sm:table-cell">Größe</TableHead>
                    <TableHead className="hidden sm:table-cell">Hochgeladen am</TableHead>
                    <TableHead className="text-right">Aktion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {versionen.map((version) => (
                    <TableRow key={version.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">v{version.version}</span>
                          {version.version === dokument.aktuelle_version && (
                            <Badge variant="default" className="text-[10px]">Aktuell</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm truncate max-w-[150px]">
                        {version.dateiname}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                        {formatiereGroesse(version.dateigroesse)}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                        {formatiereDatum(version.uploaded_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onDownloadVersion(dokument, version.version)}
                          aria-label={`Version ${version.version} herunterladen`}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && versionen.length === 0 && (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <FileText className="h-8 w-8 text-muted-foreground/50 mb-2" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">Keine Versionen vorhanden</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
