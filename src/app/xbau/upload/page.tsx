"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, CheckCircle2, Upload, FileX2 } from "lucide-react";
import { toast } from "sonner";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * XBau-Upload (PROJ-7 US-1 AC-1/8)
 *
 * Manueller XML-Upload als MVP-Transportweg.
 * Akzeptiert .xml-Dateien bis 10 MB.
 */

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

interface UploadErfolg {
  vorgang_id: string;
  aktenzeichen: string;
  nachrichtentyp: string;
}

interface UploadFehler {
  error: string;
  details?: string;
}

type UploadState = "idle" | "uploading" | "erfolg" | "fehler";

export default function XBauUploadPage() {
  const [uploadState, setUploadState] = React.useState<UploadState>("idle");
  const [erfolg, setErfolg] = React.useState<UploadErfolg | null>(null);
  const [fehler, setFehler] = React.useState<UploadFehler | null>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  async function uploadFile(file: File) {
    // Client-seitige Vorprüfung
    if (!file.name.toLowerCase().endsWith(".xml")) {
      setFehler({ error: "Nur XML-Dateien (.xml) werden akzeptiert." });
      setUploadState("fehler");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setFehler({ error: "Die Datei überschreitet die maximale Größe von 10 MB." });
      setUploadState("fehler");
      return;
    }

    setUploadState("uploading");
    setFehler(null);
    setErfolg(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/xbau/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        setFehler({
          error: data.error ?? "Upload fehlgeschlagen.",
          details: data.details,
        });
        setUploadState("fehler");
        return;
      }

      setErfolg({
        vorgang_id: data.vorgang_id,
        aktenzeichen: data.aktenzeichen,
        nachrichtentyp: data.nachrichtentyp,
      });
      setUploadState("erfolg");
      toast.success(`Vorgang ${data.aktenzeichen} angelegt`);
    } catch {
      setFehler({ error: "Verbindungsfehler. Bitte versuchen Sie es erneut." });
      setUploadState("fehler");
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
    // Reset input so same file can be re-selected
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      uploadFile(file);
    }
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
  }

  function handleReset() {
    setUploadState("idle");
    setErfolg(null);
    setFehler(null);
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      {/* Breadcrumb */}
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/vorgaenge">Vorgänge</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>XBau-Import</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <h1 className="text-2xl font-bold tracking-tight mb-6">XBau-Import</h1>

      <Card className="bg-background shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">XML-Datei hochladen</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Upload-Bereich */}
          {uploadState === "idle" || uploadState === "fehler" ? (
            <div className="space-y-4">
              <div
                role="button"
                tabIndex={0}
                aria-label="XML-Datei zum Hochladen auswählen oder hierher ziehen"
                className={`
                  flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8
                  transition-colors cursor-pointer
                  ${dragOver
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-primary/50"
                  }
                `}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
              >
                <Upload
                  className="h-10 w-10 text-muted-foreground mb-3"
                  aria-hidden="true"
                />
                <p className="text-sm font-medium">
                  Datei hierher ziehen oder klicken zum Auswählen
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  XML-Dateien, max. 10 MB
                </p>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".xml"
                  className="hidden"
                  onChange={handleFileChange}
                  aria-label="XML-Datei auswählen"
                />
              </div>

              {/* Fehler-Anzeige */}
              {uploadState === "fehler" && fehler && (
                <Alert variant="destructive" role="alert" aria-live="assertive">
                  <FileX2 className="h-4 w-4" aria-hidden="true" />
                  <AlertTitle>Import fehlgeschlagen</AlertTitle>
                  <AlertDescription>
                    <p>{fehler.error}</p>
                    {fehler.details && (
                      <p className="mt-1 text-xs opacity-80">{fehler.details}</p>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ) : null}

          {/* Uploading State */}
          {uploadState === "uploading" && (
            <div
              className="flex flex-col items-center py-8 space-y-3"
              role="status"
              aria-label="Datei wird hochgeladen und validiert"
            >
              <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">
                Datei wird hochgeladen und validiert...
              </p>
              <Skeleton className="h-2 w-48" />
            </div>
          )}

          {/* Erfolg State */}
          {uploadState === "erfolg" && erfolg && (
            <div className="space-y-4">
              <div
                className="flex flex-col items-center py-6 space-y-3"
                role="status"
                aria-live="polite"
              >
                <CheckCircle2
                  className="h-10 w-10 text-green-600"
                  aria-hidden="true"
                />
                <p className="text-sm font-medium">
                  Nachricht erfolgreich importiert
                </p>
                <p className="text-xs text-muted-foreground">
                  Aktenzeichen: {erfolg.aktenzeichen}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button asChild>
                  <Link
                    href={`/vorgaenge/${erfolg.vorgang_id}`}
                    aria-label={`Vorgang ${erfolg.aktenzeichen} öffnen`}
                  >
                    Vorgang öffnen
                  </Link>
                </Button>
                <Button variant="outline" onClick={handleReset}>
                  Weitere Datei importieren
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
