"use client";

import * as React from "react";
import { ArrowUpDown, Download, History, Search, Loader2, FileText, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DOKUMENT_KATEGORIEN, type Dokument, type DokumentKategorie } from "@/lib/services/dokumente/types";
import {
  KATEGORIE_LABELS,
  formatiereGroesse,
  formatiereDatum,
} from "@/lib/utils/dokument-format";

// -- Types --

export interface DokumentListeProps {
  vorgangId: string;
  dokumente: Dokument[];
  isLoading: boolean;
  error: string | null;
  onDownload: (dokument: Dokument) => void;
  onVersionHistorie: (dokument: Dokument) => void;
  onMetadatenBearbeiten: (dokument: Dokument) => void;
}

type SortSpalte = "dateiname" | "uploaded_at";
type SortRichtung = "asc" | "desc";

// -- Hilfsfunktionen (pure) --

function filtereDokumente(
  dokumente: Dokument[],
  suchbegriff: string,
  kategorieFilter: DokumentKategorie | "alle"
): Dokument[] {
  let result = dokumente;

  if (kategorieFilter !== "alle") {
    result = result.filter((d) => d.kategorie === kategorieFilter);
  }

  if (suchbegriff.trim()) {
    const lower = suchbegriff.toLowerCase();
    result = result.filter(
      (d) =>
        d.dateiname.toLowerCase().includes(lower) ||
        (d.beschreibung && d.beschreibung.toLowerCase().includes(lower)) ||
        d.schlagwoerter.some((s) => s.toLowerCase().includes(lower))
    );
  }

  return result;
}

function sortiereDokumente(
  dokumente: Dokument[],
  spalte: SortSpalte,
  richtung: SortRichtung
): Dokument[] {
  return [...dokumente].sort((a, b) => {
    let vergleich = 0;
    if (spalte === "dateiname") {
      vergleich = a.dateiname.localeCompare(b.dateiname, "de");
    } else if (spalte === "uploaded_at") {
      vergleich = new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime();
    }
    return richtung === "asc" ? vergleich : -vergleich;
  });
}

// -- Kategorie Badge Varianten --

function kategorieBadgeVariant(kat: DokumentKategorie): "default" | "secondary" | "outline" {
  switch (kat) {
    case "bescheide":
      return "default";
    case "plaene":
    case "gutachten":
      return "secondary";
    default:
      return "outline";
  }
}

// -- Component --

export function DokumentListe({
  vorgangId,
  dokumente,
  isLoading,
  error,
  onDownload,
  onVersionHistorie,
  onMetadatenBearbeiten,
}: DokumentListeProps) {
  const [suchbegriff, setSuchbegriff] = React.useState("");
  const [kategorieFilter, setKategorieFilter] = React.useState<DokumentKategorie | "alle">("alle");
  const [sortSpalte, setSortSpalte] = React.useState<SortSpalte>("uploaded_at");
  const [sortRichtung, setSortRichtung] = React.useState<SortRichtung>("desc");

  // Sortierung umschalten
  const toggleSort = React.useCallback((spalte: SortSpalte) => {
    setSortSpalte((prev) => {
      if (prev === spalte) {
        setSortRichtung((r) => (r === "asc" ? "desc" : "asc"));
        return spalte;
      }
      setSortRichtung("asc");
      return spalte;
    });
  }, []);

  // Gefilterte und sortierte Dokumente
  const gefilterteDokumente = React.useMemo(
    () => sortiereDokumente(filtereDokumente(dokumente, suchbegriff, kategorieFilter), sortSpalte, sortRichtung),
    [dokumente, suchbegriff, kategorieFilter, sortSpalte, sortRichtung]
  );

  // -- Loading State --
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12" role="status" aria-label="Dokumente werden geladen">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
        <span className="ml-2 text-sm text-muted-foreground">Dokumente werden geladen...</span>
      </div>
    );
  }

  // -- Error State --
  if (error) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/5 p-4" role="alert">
        <p className="text-sm text-destructive">Fehler beim Laden der Dokumente: {error}</p>
      </div>
    );
  }

  // -- Empty State (keine Dokumente vorhanden) --
  if (dokumente.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" aria-hidden="true" />
        <p className="text-sm font-medium text-muted-foreground">Keine Dokumente vorhanden</p>
        <p className="text-xs text-muted-foreground mt-1">
          Laden Sie Dokumente über die Upload-Zone hoch.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter-Zeile */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <Input
            placeholder="Dateiname, Beschreibung oder Schlagwort suchen..."
            value={suchbegriff}
            onChange={(e) => setSuchbegriff(e.target.value)}
            className="pl-9"
            aria-label="Dokumente durchsuchen"
          />
        </div>
        <Select
          value={kategorieFilter}
          onValueChange={(val) => setKategorieFilter(val as DokumentKategorie | "alle")}
        >
          <SelectTrigger className="w-full sm:w-[200px]" aria-label="Nach Kategorie filtern">
            <SelectValue placeholder="Alle Kategorien" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle Kategorien</SelectItem>
            {DOKUMENT_KATEGORIEN.map((kat) => (
              <SelectItem key={kat} value={kat}>
                {KATEGORIE_LABELS[kat]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Ergebnis-Info */}
      {(suchbegriff || kategorieFilter !== "alle") && (
        <p className="text-xs text-muted-foreground">
          {gefilterteDokumente.length} von {dokumente.length} Dokumenten
        </p>
      )}

      {/* Empty-State bei leerem Suchergebnis */}
      {gefilterteDokumente.length === 0 && dokumente.length > 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Search className="h-8 w-8 text-muted-foreground/50 mb-3" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">
            Keine Dokumente gefunden für "{suchbegriff}"
          </p>
          <Button
            variant="link"
            size="sm"
            className="mt-1"
            onClick={() => {
              setSuchbegriff("");
              setKategorieFilter("alle");
            }}
          >
            Filter zurücksetzen
          </Button>
        </div>
      )}

      {/* Tabelle */}
      {gefilterteDokumente.length > 0 && (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-3 h-8"
                    onClick={() => toggleSort("dateiname")}
                    aria-label="Nach Dateiname sortieren"
                  >
                    Dateiname
                    <ArrowUpDown className="ml-1 h-3 w-3" aria-hidden="true" />
                  </Button>
                </TableHead>
                <TableHead className="hidden sm:table-cell">Kategorie</TableHead>
                <TableHead className="hidden md:table-cell">Version</TableHead>
                <TableHead className="hidden md:table-cell">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-3 h-8"
                    onClick={() => toggleSort("uploaded_at")}
                    aria-label="Nach Datum sortieren"
                  >
                    Hochgeladen am
                    <ArrowUpDown className="ml-1 h-3 w-3" aria-hidden="true" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gefilterteDokumente.map((dok) => (
                <TableRow key={dok.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium truncate max-w-[200px] md:max-w-[300px]">
                        {dok.dateiname}
                      </span>
                      {/* Kategorie und Datum auf Mobile inline */}
                      <div className="flex gap-2 mt-1 sm:hidden">
                        <Badge variant={kategorieBadgeVariant(dok.kategorie)} className="text-[10px]">
                          {KATEGORIE_LABELS[dok.kategorie]}
                        </Badge>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant={kategorieBadgeVariant(dok.kategorie)}>
                      {KATEGORIE_LABELS[dok.kategorie]}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm">
                    v{dok.aktuelle_version}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {formatiereDatum(dok.uploaded_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onDownload(dok)}
                        aria-label={`${dok.dateiname} herunterladen`}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onVersionHistorie(dok)}
                        aria-label={`Versionshistorie von ${dok.dateiname}`}
                      >
                        <History className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onMetadatenBearbeiten(dok)}
                        aria-label={`Metadaten von ${dok.dateiname} bearbeiten`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
