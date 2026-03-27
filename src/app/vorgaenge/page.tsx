"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

import type { VorgangListItem, Verfahrensart, VorgaengeStatistik } from "@/lib/services/verfahren/types";
import { AmpelBadge, type AmpelStatus } from "@/components/fristen/ampel-badge";

/**
 * Vorgangsliste (PROJ-3 US-2, PROJ-20 Frist-Ampel)
 *
 * Tabelle mit Sortierung, Filterung, Suche, Paginierung.
 * Responsive: 375px (Cards) / 768px+ (Tabelle).
 */

import { getSchrittLabel, getAllSchrittLabels } from "@/lib/utils/workflow-labels";

const SCHRITT_LABELS = getAllSchrittLabels();

type Sortierung = "eingangsdatum" | "aktenzeichen" | "workflow_schritt_id" | "frist_status";
type Richtung = "asc" | "desc";

interface VorgaengeResponse {
  vorgaenge: VorgangListItem[];
  total: number;
  seite: number;
  pro_seite: number;
  statistik?: VorgaengeStatistik;
}

export default function VorgaengeListePage() {
  const router = useRouter();

  // State
  const [vorgaenge, setVorgaenge] = React.useState<VorgangListItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [statistik, setStatistik] = React.useState<VorgaengeStatistik | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Filter / Sort / Paginierung
  const [statusFilter, setStatusFilter] = React.useState<string>("");
  const [verfahrensartFilter, setVerfahrensartFilter] = React.useState<string>("");
  const [suche, setSuche] = React.useState("");
  const [suchInput, setSuchInput] = React.useState("");
  const [sortierung, setSortierung] = React.useState<Sortierung>("eingangsdatum");
  const [richtung, setRichtung] = React.useState<Richtung>("desc");
  const [seite, setSeite] = React.useState(1);
  const proSeite = 25;

  // Verfahrensarten fuer Filter-Dropdown
  const [verfahrensarten, setVerfahrensarten] = React.useState<Verfahrensart[]>([]);

  // Debounced Suche
  const suchTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSuchInput = React.useCallback((value: string) => {
    setSuchInput(value);
    if (suchTimerRef.current) clearTimeout(suchTimerRef.current);
    suchTimerRef.current = setTimeout(() => {
      setSuche(value);
      setSeite(1);
    }, 400);
  }, []);

  // Keyboard shortcut: Ctrl+N -> Neuer Vorgang
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey && e.key === "n") {
        e.preventDefault();
        router.push("/vorgaenge/neu");
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  // Verfahrensarten laden
  React.useEffect(() => {
    async function loadVerfahrensarten() {
      try {
        const res = await fetch("/api/verfahrensarten", {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setVerfahrensarten(data.verfahrensarten ?? []);
        }
      } catch {
        // Non-critical: Filter-Dropdown bleibt leer
      }
    }
    loadVerfahrensarten();
  }, []);

  // Vorgaenge laden
  React.useEffect(() => {
    async function loadVorgaenge() {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (verfahrensartFilter) params.set("verfahrensart_id", verfahrensartFilter);
      if (suche) params.set("suche", suche);
      params.set("sortierung", sortierung);
      params.set("richtung", richtung);
      params.set("seite", String(seite));
      params.set("pro_seite", String(proSeite));

      try {
        const res = await fetch(`/api/vorgaenge?${params.toString()}`, {
          credentials: "include",
        });

        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }

        if (!res.ok) {
          setError("Vorgänge konnten nicht geladen werden.");
          return;
        }

        const data: VorgaengeResponse = await res.json();
        setVorgaenge(data.vorgaenge ?? []);
        setTotal(data.total ?? 0);
        if (data.statistik) setStatistik(data.statistik);
      } catch {
        setError("Verbindungsfehler. Bitte versuchen Sie es erneut.");
      } finally {
        setLoading(false);
      }
    }
    loadVorgaenge();
  }, [statusFilter, verfahrensartFilter, suche, sortierung, richtung, seite]);

  const totalPages = Math.max(1, Math.ceil(total / proSeite));

  function handleSort(spalte: Sortierung) {
    if (sortierung === spalte) {
      setRichtung((r) => (r === "asc" ? "desc" : "asc"));
    } else {
      setSortierung(spalte);
      setRichtung("asc");
    }
    setSeite(1);
  }

  function getSortIcon(spalte: Sortierung) {
    if (sortierung !== spalte) return <ArrowUpDown className="h-4 w-4" />;
    return richtung === "asc" ? (
      <ArrowUp className="h-4 w-4" />
    ) : (
      <ArrowDown className="h-4 w-4" />
    );
  }

  function getSchrittBadge(schrittId: string) {
    const info = SCHRITT_LABELS[schrittId];
    if (info) {
      return <Badge variant={info.variant}>{info.label}</Badge>;
    }
    return <Badge variant="outline">{schrittId}</Badge>;
  }

  // Seiten-Array fuer Pagination
  function getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, seite - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);
    start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* AC-4: Drucktitel mit Datum (nur im Druck sichtbar) */}
      <div className="hidden print-header mb-4">
        <h1 className="text-xl font-bold">Vorgangsliste</h1>
        <p className="text-sm text-muted-foreground">
          Gedruckt am {new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })} - {total} Vorgänge
        </p>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vorgänge</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {loading ? "Lade..." : `${total} Vorgänge gefunden`}
          </p>
        </div>
        <Button asChild>
          <Link href="/vorgaenge/neu">
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Neuer Vorgang
          </Link>
        </Button>
      </div>

      {/* PROJ-47 US-3: Statistik-Karten mit serverseitigen Daten */}
      {!error && (
        <div
          className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6"
          role="region"
          aria-label="Vorgangsstatistik"
        >
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="pt-4 pb-3">
              {statistik ? (
                <p className="text-3xl font-bold tracking-tight">{statistik.gesamt}</p>
              ) : (
                <Skeleton className="h-9 w-12" />
              )}
              <p className="text-sm text-muted-foreground">Vorgänge gesamt</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-yellow-400">
            <CardContent className="pt-4 pb-3">
              {statistik ? (
                <p className="text-3xl font-bold tracking-tight text-yellow-700">
                  {statistik.gefaehrdet}
                </p>
              ) : (
                <Skeleton className="h-9 w-12" />
              )}
              <p className="text-sm text-muted-foreground">Fristgefährdet</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-red-500">
            <CardContent className="pt-4 pb-3">
              {statistik ? (
                <p className="text-3xl font-bold tracking-tight text-red-700">
                  {statistik.ueberfaellig}
                </p>
              ) : (
                <Skeleton className="h-9 w-12" />
              )}
              <p className="text-sm text-muted-foreground">Überfällig</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-primary">
            <CardContent className="pt-4 pb-3">
              {statistik ? (
                <p className="text-3xl font-bold tracking-tight text-primary">
                  {statistik.im_zeitplan}
                </p>
              ) : (
                <Skeleton className="h-9 w-12" />
              )}
              <p className="text-sm text-muted-foreground">Im Zeitplan</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter-Leiste */}
      <div
        className="flex flex-col sm:flex-row gap-3 mb-4 p-3 bg-card rounded-lg border shadow-sm print:hidden"
        role="search"
        aria-label="Vorgänge filtern"
      >
        <div className="relative flex-1 max-w-sm">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            placeholder="Suche (Aktenzeichen, Name, Adresse)..."
            value={suchInput}
            onChange={(e) => handleSuchInput(e.target.value)}
            className="pl-9"
            aria-label="Volltextsuche"
          />
        </div>

        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v === "alle" ? "" : v);
            setSeite(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-[180px]" aria-label="Status filtern">
            <SelectValue placeholder="Alle Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle Status</SelectItem>
            {Object.entries(SCHRITT_LABELS).map(([key, info]) => (
              <SelectItem key={key} value={key}>
                {info.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={verfahrensartFilter}
          onValueChange={(v) => {
            setVerfahrensartFilter(v === "alle" ? "" : v);
            setSeite(1);
          }}
        >
          <SelectTrigger
            className="w-full sm:w-[220px]"
            aria-label="Verfahrensart filtern"
          >
            <SelectValue placeholder="Alle Verfahrensarten" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle Verfahrensarten</SelectItem>
            {verfahrensarten.map((va) => (
              <SelectItem key={va.id} value={va.id}>
                {va.bezeichnung}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Error State */}
      {error && (
        <div
          className="rounded-md border border-destructive/50 bg-destructive/10 p-4 mb-4"
          role="alert"
        >
          <p className="text-sm text-destructive">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2 print:hidden"
            onClick={() => setSeite(seite)}
          >
            Erneut versuchen
          </Button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="space-y-3" aria-label="Vorgänge werden geladen">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-md" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && vorgaenge.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-lg font-medium text-muted-foreground mb-2">
            Keine Vorgänge gefunden
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            {suche || statusFilter || verfahrensartFilter
              ? "Passen Sie die Suchkriterien an oder setzen Sie die Filter zurück."
              : "Legen Sie einen neuen Vorgang an, um zu beginnen."}
          </p>
          {(suche || statusFilter || verfahrensartFilter) && (
            <Button
              variant="outline"
              onClick={() => {
                setSuchInput("");
                setSuche("");
                setStatusFilter("");
                setVerfahrensartFilter("");
                setSeite(1);
              }}
            >
              Filter zurücksetzen
            </Button>
          )}
        </div>
      )}

      {/* Tabelle (Desktop) */}
      {!loading && !error && vorgaenge.length > 0 && (
        <>
          {/* Desktop-Tabelle */}
          <div className="hidden md:block rounded-lg border bg-background shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button
                      type="button"
                      className="flex items-center gap-1 hover:text-foreground transition-colors rounded focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
                      onClick={() => handleSort("aktenzeichen")}
                      aria-label="Nach Aktenzeichen sortieren"
                    >
                      Aktenzeichen
                      {getSortIcon("aktenzeichen")}
                    </button>
                  </TableHead>
                  <TableHead>Bauherr</TableHead>
                  <TableHead>Adresse</TableHead>
                  <TableHead>
                    <button
                      type="button"
                      className="flex items-center gap-1 hover:text-foreground transition-colors rounded focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
                      onClick={() => handleSort("workflow_schritt_id")}
                      aria-label="Nach Status sortieren"
                    >
                      Status
                      {getSortIcon("workflow_schritt_id")}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      type="button"
                      className="flex items-center gap-1 hover:text-foreground transition-colors rounded focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
                      onClick={() => handleSort("frist_status")}
                      aria-label="Nach Fristdringlichkeit sortieren"
                    >
                      Frist
                      {getSortIcon("frist_status")}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      type="button"
                      className="flex items-center gap-1 hover:text-foreground transition-colors rounded focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
                      onClick={() => handleSort("eingangsdatum")}
                      aria-label="Nach Eingangsdatum sortieren"
                    >
                      Eingang
                      {getSortIcon("eingangsdatum")}
                    </button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vorgaenge.map((v) => (
                  <TableRow
                    key={v.id}
                    className="cursor-pointer hover:bg-primary/5 even:bg-muted/30 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none scroll-mt-16"
                    onClick={() => router.push(`/vorgaenge/${v.id}`)}
                    tabIndex={0}
                    role="link"
                    aria-label={`Vorgang ${v.aktenzeichen} öffnen`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        router.push(`/vorgaenge/${v.id}`);
                      }
                    }}
                  >
                    <TableCell className="font-medium text-primary">
                      {v.aktenzeichen}
                    </TableCell>
                    <TableCell>{v.bauherr_name}</TableCell>
                    <TableCell>
                      {v.grundstueck_adresse || "-"}
                    </TableCell>
                    <TableCell>
                      {getSchrittBadge(v.workflow_schritt_id)}
                    </TableCell>
                    <TableCell>
                      {v.frist_status ? (
                        <AmpelBadge
                          status={v.frist_status as AmpelStatus}
                          compact
                        />
                      ) : null}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(v.eingangsdatum).toLocaleDateString(
                        "de-DE"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {vorgaenge.map((v) => (
              <Link
                key={v.id}
                href={`/vorgaenge/${v.id}`}
                className="block rounded-lg border bg-background p-4 hover:bg-primary/5 shadow-sm transition-colors"
                aria-label={`Vorgang ${v.aktenzeichen} öffnen`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="font-medium text-sm">
                    {v.aktenzeichen}
                  </span>
                  <div className="flex items-center gap-1">
                    {v.frist_status && (
                      <AmpelBadge
                        status={v.frist_status as AmpelStatus}
                        compact
                      />
                    )}
                    {getSchrittBadge(v.workflow_schritt_id)}
                  </div>
                </div>
                <p className="text-sm">{v.bauherr_name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {v.grundstueck_adresse || "-"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Eingang:{" "}
                  {new Date(v.eingangsdatum).toLocaleDateString("de-DE")}
                </p>
              </Link>
            ))}
          </div>

          {/* Paginierung */}
          {totalPages > 1 && (
            <div className="mt-4 print:hidden">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (seite > 1) setSeite(seite - 1);
                      }}
                      aria-disabled={seite <= 1}
                      className={
                        seite <= 1
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                      aria-label="Vorherige Seite"
                    />
                  </PaginationItem>

                  {getPageNumbers().map((p) => (
                    <PaginationItem key={p}>
                      <PaginationLink
                        href="#"
                        isActive={p === seite}
                        onClick={(e) => {
                          e.preventDefault();
                          setSeite(p);
                        }}
                        aria-label={`Seite ${p}`}
                      >
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  ))}

                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (seite < totalPages) setSeite(seite + 1);
                      }}
                      aria-disabled={seite >= totalPages}
                      className={
                        seite >= totalPages
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                      aria-label="Nächste Seite"
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </>
      )}
    </div>
  );
}
