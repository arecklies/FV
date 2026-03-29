"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Loader2, Send, Pause, Play, ArrowDown, ArrowUp, Mail } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import {
  WorkflowStepper,
  type WorkflowSchrittInfo,
} from "@/components/vorgaenge/workflow-stepper";
import { FristenPanel } from "@/components/fristen/fristen-panel";
import { AmpelBadge, type AmpelStatus } from "@/components/fristen/ampel-badge";
import { useFristen } from "@/hooks/use-fristen";
import { GeltungsdauerBadge } from "@/components/geltungsdauer/geltungsdauer-badge";
import { VerlaengerungDialog } from "@/components/geltungsdauer/verlaengerung-dialog";
import { VerlaengerungHistorie } from "@/components/geltungsdauer/verlaengerung-historie";
import { GeltungsdauerNachpflegeDialog } from "@/components/geltungsdauer/nachpflege-dialog";

import type {
  Vorgang,
  VorgangKommentarMitEmail,
} from "@/lib/services/verfahren/types";
import type {
  WorkflowSchritt,
  WorkflowSchrittHistorieMitEmail,
} from "@/lib/services/workflow/types";

/**
 * Vorgang-Detail (PROJ-3 US-1/US-4/US-7)
 *
 * Kopfbereich mit Aktenzeichen + Status, Tabs fuer Uebersicht / Kommentare / Workflow.
 */

import { getSchrittLabel } from "@/lib/utils/workflow-labels";

interface WorkflowAktionInfo {
  id: string;
  label: string;
  ziel: string;
}

/** PROJ-46: Bestätigungsdialog vor jeder Workflow-Aktion */
function WorkflowAktionMitBestaetigung({
  aktion,
  istFreigabe,
  zielLabel,
  disabled,
  aktionLoading,
  aktionError,
  onExecute,
}: {
  aktion: WorkflowAktionInfo;
  istFreigabe: boolean;
  zielLabel: string;
  disabled: boolean;
  aktionLoading: string | null;
  aktionError: string | null;
  onExecute: (aktionId: string) => Promise<boolean>;
}) {
  const [open, setOpen] = React.useState(false);

  async function handleConfirm(e: React.MouseEvent) {
    e.preventDefault();
    const success = await onExecute(aktion.id);
    if (success) {
      setOpen(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          aria-label={`Aktion: ${aktion.label}`}
        >
          {aktion.label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Workflow-Aktion ausführen?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>
              <p>
                Der Vorgang wechselt zu: <strong>{zielLabel}</strong>.
                Möchten Sie fortfahren?
              </p>
              {istFreigabe && (
                <p className="mt-2 text-destructive font-medium">
                  Hinweis: Freigabe-Aktionen haben rechtliche Relevanz und
                  können nicht ohne weiteres rückgängig gemacht werden.
                </p>
              )}
              {aktionError && (
                <p className="mt-2 text-destructive text-sm" role="alert">
                  {aktionError}
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={aktionLoading !== null}>
            Abbrechen
          </AlertDialogCancel>
          <Button
            onClick={handleConfirm}
            disabled={aktionLoading !== null}
            variant={istFreigabe ? "destructive" : "default"}
          >
            {aktionLoading === aktion.id && (
              <Loader2
                className="mr-2 h-4 w-4 animate-spin"
                aria-hidden="true"
              />
            )}
            Ausführen
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// PROJ-7: Nachrichten-Typen (lokal, kein Backend-Service-Import)
const NACHRICHTENTYP_LABELS: Record<string, string> = {
  "0200": "Bauantrag",
  "0201": "Formelle Prüfung",
  "0202": "Antragsänderung",
  "0210": "Baugenehmigung (Bescheid)",
  "0420": "Statistik: Daten Bauvorhaben",
  "0421": "Statistik: Baugenehmigung",
  "0422": "Statistik: Abbruchgenehmigung",
  "0423": "Statistik: Bautätigkeit Hochbau",
  "0424": "Statistik: Bautätigkeit Tiefbau",
  "0425": "Statistik: Baufertigstellung",
  "0426": "Statistik: Bauüberhang",
  "0427": "Statistik: Wohnungsbestand",
  "1100": "Rückweisung",
  "1180": "Eingangsquittung",
};

interface XBauNachrichtListeItem {
  id: string;
  nachrichten_uuid: string;
  nachrichtentyp: string;
  richtung: "eingang" | "ausgang";
  status: string;
  absender_behoerde: string | null;
  empfaenger_behoerde: string | null;
  created_at: string;
}

interface WorkflowInfo {
  schritt: WorkflowSchritt | null;
  verfuegbare_aktionen: WorkflowAktionInfo[];
  alle_schritte: WorkflowSchrittInfo[];
}

interface VorgangDetailResponse {
  vorgang: Vorgang;
  workflow: WorkflowInfo | null;
}

export default function VorgangDetailPage() {
  const params = useParams<{ id: string }>();
  const vorgangId = params.id;

  // Vorgang
  const [vorgang, setVorgang] = React.useState<Vorgang | null>(null);
  const [workflow, setWorkflow] = React.useState<WorkflowInfo | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Kommentare
  const [kommentare, setKommentare] = React.useState<VorgangKommentarMitEmail[]>([]);
  const [kommentareLoading, setKommentareLoading] = React.useState(false);
  const [neuerKommentar, setNeuerKommentar] = React.useState("");
  const [kommentarSubmitting, setKommentarSubmitting] = React.useState(false);
  const [kommentarError, setKommentarError] = React.useState<string | null>(null);

  // Workflow-Historie
  const [workflowHistorie, setWorkflowHistorie] = React.useState<
    WorkflowSchrittHistorieMitEmail[]
  >([]);

  // Workflow-Aktion
  const [aktionLoading, setAktionLoading] = React.useState<string | null>(null);
  const [aktionError, setAktionError] = React.useState<string | null>(null);

  // PROJ-37: Pause-State
  const [pauseDialogOpen, setPauseDialogOpen] = React.useState(false);
  const [pauseBegruendung, setPauseBegruendung] = React.useState("");
  const [pauseLoading, setPauseLoading] = React.useState(false);
  const [pauseError, setPauseError] = React.useState<string | null>(null);
  const [resumeLoading, setResumeLoading] = React.useState(false);

  // Fristen (PROJ-4)
  const fristenHook = useFristen(vorgangId);

  // PROJ-7: XBau-Nachrichten (Transportprotokoll)
  const [nachrichten, setNachrichten] = React.useState<XBauNachrichtListeItem[]>([]);
  const [nachrichtenLoading, setNachrichtenLoading] = React.useState(false);
  const [nachrichtenError, setNachrichtenError] = React.useState<string | null>(null);

  // Vorgang laden
  const loadVorgang = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/vorgaenge/${vorgangId}`, {
        credentials: "include",
      });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (res.status === 404) {
        setError("Vorgang nicht gefunden.");
        return;
      }
      if (!res.ok) {
        setError("Vorgang konnte nicht geladen werden.");
        return;
      }
      const data: VorgangDetailResponse = await res.json();
      setVorgang(data.vorgang);
      setWorkflow(data.workflow);
    } catch {
      setError("Verbindungsfehler. Bitte versuchen Sie es erneut.");
    } finally {
      setLoading(false);
    }
  }, [vorgangId]);

  React.useEffect(() => {
    loadVorgang();
  }, [loadVorgang]);

  // Kommentare laden
  const loadKommentare = React.useCallback(async () => {
    setKommentareLoading(true);
    try {
      const res = await fetch(`/api/vorgaenge/${vorgangId}/kommentare`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setKommentare(data.kommentare ?? []);
      }
    } catch {
      // Nicht-kritisch
    } finally {
      setKommentareLoading(false);
    }
  }, [vorgangId]);

  // Workflow-Historie laden
  const loadWorkflowHistorie = React.useCallback(async () => {
    try {
      const res = await fetch(
        `/api/vorgaenge/${vorgangId}/workflow-historie`,
        { credentials: "include" }
      );
      if (res.ok) {
        const data = await res.json();
        setWorkflowHistorie(data.schritte ?? []);
      }
    } catch {
      // Nicht-kritisch
    }
  }, [vorgangId]);

  // PROJ-7: Nachrichten laden
  const loadNachrichten = React.useCallback(async () => {
    setNachrichtenLoading(true);
    setNachrichtenError(null);
    try {
      const res = await fetch(`/api/vorgaenge/${vorgangId}/nachrichten`, {
        credentials: "include",
      });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setNachrichten(data.nachrichten ?? []);
      } else {
        setNachrichtenError("Nachrichten konnten nicht geladen werden.");
      }
    } catch {
      setNachrichtenError("Verbindungsfehler.");
    } finally {
      setNachrichtenLoading(false);
    }
  }, [vorgangId]);

  // Kommentar absenden
  // PROJ-37: Verfahren pausieren
  async function handlePause() {
    if (pauseBegruendung.trim().length < 3) return;
    setPauseLoading(true);
    setPauseError(null);
    try {
      const res = await fetch(`/api/vorgaenge/${vorgangId}/pause`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ begruendung: pauseBegruendung }),
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        setPauseError(data.error ?? "Pausieren fehlgeschlagen.");
        return;
      }
      setPauseDialogOpen(false);
      setPauseBegruendung("");
      await loadVorgang();
      fristenHook.reload();
      toast.success("Verfahren pausiert");
    } catch {
      setPauseError("Verbindungsfehler.");
    } finally {
      setPauseLoading(false);
    }
  }

  // PROJ-37: Verfahren fortsetzen
  async function handleResume() {
    setResumeLoading(true);
    try {
      const res = await fetch(`/api/vorgaenge/${vorgangId}/fortsetzen`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        setAktionError(data.error ?? "Fortsetzen fehlgeschlagen.");
        return;
      }
      await loadVorgang();
      fristenHook.reload();
      toast.success("Verfahren fortgesetzt");
    } catch {
      setAktionError("Verbindungsfehler.");
    } finally {
      setResumeLoading(false);
    }
  }

  // PROJ-37: Prüfe ob Vorgang pausiert ist (mindestens eine Frist mit status='pausiert')
  const istVorgangPausiert = fristenHook.fristen.some((f) => f.status === "pausiert");

  async function handleKommentarSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!neuerKommentar.trim()) return;

    setKommentarSubmitting(true);
    setKommentarError(null);
    try {
      const res = await fetch(`/api/vorgaenge/${vorgangId}/kommentare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ inhalt: neuerKommentar.trim() }),
      });
      if (!res.ok) {
        setKommentarError("Kommentar konnte nicht gespeichert werden.");
        return;
      }
      const data = await res.json();
      setKommentare((prev) => [...prev, data.kommentar]);
      setNeuerKommentar("");
      toast.success("Kommentar gespeichert");
    } catch {
      setKommentarError("Verbindungsfehler.");
    } finally {
      setKommentarSubmitting(false);
    }
  }

  // Workflow-Aktion ausfuehren (PROJ-46: gibt true bei Erfolg zurueck)
  async function handleWorkflowAktion(aktionId: string): Promise<boolean> {
    setAktionLoading(aktionId);
    setAktionError(null);
    try {
      const res = await fetch(
        `/api/vorgaenge/${vorgangId}/workflow-aktion`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ aktion_id: aktionId }),
        }
      );
      if (!res.ok) {
        const data = await res.json();
        setAktionError(
          data.error ?? "Aktion konnte nicht ausgeführt werden."
        );
        return false;
      }
      // Vorgang und Historie neu laden
      await loadVorgang();
      await loadWorkflowHistorie();
      // PROJ-47 US-5 AC-3: Toast nach erfolgreicher Workflow-Aktion
      const zielAktion = workflow?.verfuegbare_aktionen.find((a) => a.id === aktionId);
      const zielLabel = workflow?.alle_schritte?.find((s) => s.id === zielAktion?.ziel)?.label ?? zielAktion?.ziel;
      toast.success(`Vorgang wechselt zu: ${zielLabel ?? "nächster Schritt"}`);
      return true;
    } catch {
      setAktionError("Verbindungsfehler.");
      return false;
    } finally {
      setAktionLoading(null);
    }
  }

  function getSchrittBadge(schrittId: string) {
    // API-Labels aus Workflow-Definition bevorzugen (B-007)
    const apiLabels: Record<string, string> = {};
    if (workflow?.alle_schritte) {
      workflow.alle_schritte.forEach((s) => { apiLabels[s.id] = s.label; });
    }
    const info = getSchrittLabel(schrittId, apiLabels);
    return <Badge variant={info.variant}>{info.label}</Badge>;
  }

  // Loading State
  if (loading) {
    return (
      <div
        className="container mx-auto px-4 py-6 max-w-4xl space-y-4"
        aria-label="Vorgang wird geladen"
      >
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Error State
  if (error || !vorgang) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <Breadcrumb className="mb-4">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/vorgaenge">Vorgänge</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div
          className="rounded-md border border-destructive/50 bg-destructive/10 p-6 text-center"
          role="alert"
        >
          <p className="text-sm text-destructive">
            {error ?? "Vorgang nicht gefunden."}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={loadVorgang}
          >
            Erneut versuchen
          </Button>
        </div>
      </div>
    );
  }

  const abgeschlosseneSchrittIds = workflowHistorie.map((h) => h.schritt_id);

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* PROJ-47 US-2: Breadcrumb-Navigation */}
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/vorgaenge">Vorgänge</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{vorgang.aktenzeichen}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Kopfbereich */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {vorgang.aktenzeichen}
          </h1>
          {vorgang.bezeichnung && (
            <p className="text-sm text-muted-foreground mt-1">
              {vorgang.bezeichnung}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {getSchrittBadge(vorgang.workflow_schritt_id)}
          {fristenHook.fristen.length > 0 && (() => {
            const dringendste = fristenHook.fristen.reduce((a, b) =>
              new Date(a.end_datum) < new Date(b.end_datum) ? a : b
            );
            return (
              <AmpelBadge
                status={dringendste.status as AmpelStatus}
                compact
              />
            );
          })()}
        </div>
      </div>

      {/* PROJ-37: Pause-Banner und Aktionen */}
      {istVorgangPausiert && (
        <Alert className="mb-4 border-gray-300 bg-gray-50 dark:bg-gray-900" role="status">
          <Pause className="h-4 w-4 text-gray-600" aria-hidden="true" />
          <AlertDescription className="flex items-center justify-between">
            <span className="text-gray-700 dark:text-gray-300">
              Verfahren ruht seit {(() => {
                const pausierteFrist = fristenHook.fristen.find((f) => f.status === "pausiert");
                return pausierteFrist
                  ? new Date(pausierteFrist.updated_at).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })
                  : "unbekannt";
              })()} — Fristen sind pausiert.
            </span>
            <Button
              size="sm"
              variant="outline"
              className="gap-1 min-h-[36px]"
              onClick={handleResume}
              disabled={resumeLoading}
              aria-label="Verfahren fortsetzen"
            >
              {resumeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Fortsetzen
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {!istVorgangPausiert && (
        <div className="mb-4 flex justify-end">
          <Dialog open={pauseDialogOpen} onOpenChange={setPauseDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1 min-h-[36px]" aria-label="Verfahren pausieren">
                <Pause className="h-4 w-4" />
                Verfahren pausieren
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Verfahren pausieren</DialogTitle>
                <DialogDescription>
                  Alle laufenden Fristen werden pausiert. Gehemmte Fristen bleiben unverändert.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {pauseError && (
                  <Alert variant="destructive" role="alert" aria-live="assertive">
                    <AlertDescription>{pauseError}</AlertDescription>
                  </Alert>
                )}
                <Textarea
                  placeholder="Begründung (z.B. Warten auf Stellungnahme TöB)..."
                  value={pauseBegruendung}
                  onChange={(e) => setPauseBegruendung(e.target.value)}
                  disabled={pauseLoading}
                  aria-label="Begründung für die Verfahrensruhe"
                  className="min-h-[80px]"
                />
                <p className="text-xs text-muted-foreground">Mindestens 3 Zeichen</p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setPauseDialogOpen(false); setPauseError(null); }} disabled={pauseLoading}>
                  Abbrechen
                </Button>
                <Button
                  onClick={handlePause}
                  disabled={pauseLoading || pauseBegruendung.trim().length < 3}
                  className="gap-1 min-h-[44px]"
                  aria-label="Pause bestätigen"
                >
                  {pauseLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  <Pause className="h-4 w-4" />
                  Pausieren
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Tabs */}
      <Tabs
        defaultValue="uebersicht"
        onValueChange={(tab) => {
          if (tab === "kommentare") loadKommentare();
          if (tab === "workflow") loadWorkflowHistorie();
          if (tab === "nachrichten") loadNachrichten();
        }}
      >
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="uebersicht">Übersicht</TabsTrigger>
          <TabsTrigger value="fristen">Fristen</TabsTrigger>
          <TabsTrigger value="nachrichten">
            <Mail className="h-4 w-4 mr-1" aria-hidden="true" />
            Nachrichten
          </TabsTrigger>
          <TabsTrigger value="kommentare">Kommentare</TabsTrigger>
          <TabsTrigger value="workflow">Workflow</TabsTrigger>
        </TabsList>

        {/* Übersicht */}
        <TabsContent value="uebersicht">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bauherr */}
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-base">Bauherr</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <InfoRow label="Name" value={vorgang.bauherr_name} />
                <InfoRow
                  label="Anschrift"
                  value={vorgang.bauherr_anschrift}
                />
                <InfoRow
                  label="Telefon"
                  value={vorgang.bauherr_telefon}
                />
                <InfoRow
                  label="E-Mail"
                  value={vorgang.bauherr_email}
                />
              </CardContent>
            </Card>

            {/* Grundstück */}
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-base">Grundstück</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <InfoRow
                  label="Adresse"
                  value={vorgang.grundstueck_adresse}
                />
                <InfoRow
                  label="Flurstück"
                  value={vorgang.grundstueck_flurstueck}
                />
                <InfoRow
                  label="Gemarkung"
                  value={vorgang.grundstueck_gemarkung}
                />
              </CardContent>
            </Card>

            {/* Verfahren */}
            <Card className="md:col-span-2 bg-background shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Verfahren</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <InfoRow
                  label="Eingangsdatum"
                  value={new Date(vorgang.eingangsdatum).toLocaleDateString(
                    "de-DE"
                  )}
                />
                <InfoRow
                  label="Bundesland"
                  value={vorgang.bundesland}
                />
                <InfoRow
                  label="Version"
                  value={String(vorgang.version)}
                />
                {/* PROJ-48: Geltungsdauer */}
                {vorgang.geltungsdauer_bis && (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-muted-foreground">Geltungsdauer</span>
                    <GeltungsdauerBadge geltungsdauerBis={vorgang.geltungsdauer_bis} />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* PROJ-56: Nachpflege-Hinweis bei abgeschlossenen Vorgängen ohne Geltungsdauer */}
            {!vorgang.geltungsdauer_bis && vorgang.workflow_schritt_id === "abgeschlossen" && (
              <Card className="md:col-span-2 bg-amber-50 border-amber-200 shadow-sm dark:bg-amber-950/20 dark:border-amber-800">
                <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-4 pb-4">
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                      Geltungsdauer nicht gesetzt
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                      Für Verlängerungen muss die Geltungsdauer manuell nachgepflegt werden.
                    </p>
                  </div>
                  <GeltungsdauerNachpflegeDialog
                    vorgangId={vorgang.id}
                    version={vorgang.version}
                    onSuccess={() => window.location.reload()}
                  />
                </CardContent>
              </Card>
            )}

            {/* PROJ-48: Verlängerung + Historie */}
            {vorgang.geltungsdauer_bis && vorgang.workflow_schritt_id === "abgeschlossen" && (
              <Card className="md:col-span-2 bg-background shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-base">Geltungsdauer</CardTitle>
                  {new Date(vorgang.geltungsdauer_bis) > new Date() && (
                    <VerlaengerungDialog
                      vorgangId={vorgang.id}
                      geltungsdauerBis={vorgang.geltungsdauer_bis}
                      onSuccess={() => window.location.reload()}
                    />
                  )}
                </CardHeader>
                <CardContent>
                  {new Date(vorgang.geltungsdauer_bis) <= new Date() && (
                    <p className="text-sm text-destructive font-medium mb-3" role="alert">
                      Genehmigung erloschen — keine Verlängerung mehr möglich
                    </p>
                  )}
                  <VerlaengerungHistorie vorgangId={vorgang.id} />
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Fristen (PROJ-4) */}
        <TabsContent value="fristen">
          <FristenPanel
            fristen={fristenHook.fristen}
            loading={fristenHook.loading}
            error={fristenHook.error}
            actionLoading={fristenHook.actionLoading}
            actionError={fristenHook.actionError}
            onVerlaengerung={fristenHook.verlaengereFrist}
            onHemmung={fristenHook.hemmeFrist}
            onHemmungAufheben={fristenHook.hebeHemmungAuf}
          />
        </TabsContent>

        {/* PROJ-7: Nachrichten (Transportprotokoll) */}
        <TabsContent value="nachrichten">
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-base">Transportprotokoll</CardTitle>
            </CardHeader>
            <CardContent>
              {nachrichtenLoading ? (
                <div className="space-y-3" aria-label="Nachrichten werden geladen">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : nachrichtenError ? (
                <Alert variant="destructive" role="alert">
                  <AlertDescription>{nachrichtenError}</AlertDescription>
                </Alert>
              ) : nachrichten.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">
                  Keine XBau-Nachrichten vorhanden.
                </p>
              ) : (
                <div className="space-y-2">
                  {nachrichten.map((n) => (
                    <div
                      key={n.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-md border p-3"
                    >
                      {/* Richtung */}
                      <div className="shrink-0">
                        {n.richtung === "eingang" ? (
                          <Badge
                            variant="secondary"
                            className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                            aria-label="Eingang"
                          >
                            <ArrowDown className="h-3 w-3 mr-1" aria-hidden="true" />
                            Eingang
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            aria-label="Ausgang"
                          >
                            <ArrowUp className="h-3 w-3 mr-1" aria-hidden="true" />
                            Ausgang
                          </Badge>
                        )}
                      </div>

                      {/* Typ und Details */}
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium">
                          {n.nachrichtentyp}{" "}
                          {NACHRICHTENTYP_LABELS[n.nachrichtentyp]
                            ? NACHRICHTENTYP_LABELS[n.nachrichtentyp]
                            : `Nachricht ${n.nachrichtentyp}`}
                        </span>
                        {n.richtung === "eingang" && n.absender_behoerde && (
                          <p className="text-xs text-muted-foreground truncate">
                            Absender: {n.absender_behoerde}
                          </p>
                        )}
                        {n.richtung === "ausgang" && n.empfaenger_behoerde && (
                          <p className="text-xs text-muted-foreground truncate">
                            Empfänger: {n.empfaenger_behoerde}
                          </p>
                        )}
                      </div>

                      {/* Status */}
                      <Badge variant="outline" className="shrink-0 text-xs">
                        {n.status}
                      </Badge>

                      {/* Zeitstempel */}
                      <span className="text-xs text-muted-foreground shrink-0">
                        {new Date(n.created_at).toLocaleString("de-DE")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Kommentare */}
        <TabsContent value="kommentare">
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-base">
                Interne Kommentare
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Kommentar-Liste */}
              {kommentareLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : kommentare.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">
                  Noch keine Kommentare vorhanden.
                </p>
              ) : (
                <div className="space-y-3 mb-4">
                  {kommentare.map((k) => (
                    <div
                      key={k.id}
                      className="rounded-md border p-3"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-muted-foreground">
                          {k.autor_email ?? `${k.autor_user_id.slice(0, 8)}...`}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(k.created_at).toLocaleString(
                            "de-DE"
                          )}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">
                        {k.inhalt}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <Separator className="my-4" />

              {/* Kommentar-Eingabe */}
              <form
                onSubmit={handleKommentarSubmit}
                className="space-y-3"
              >
                <Textarea
                  value={neuerKommentar}
                  onChange={(e) => setNeuerKommentar(e.target.value)}
                  placeholder="Kommentar hinzufügen..."
                  rows={3}
                  aria-label="Neuer Kommentar"
                  disabled={kommentarSubmitting}
                />
                {kommentarError && (
                  <p className="text-sm text-destructive" role="alert">
                    {kommentarError}
                  </p>
                )}
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={
                      kommentarSubmitting || !neuerKommentar.trim()
                    }
                  >
                    {kommentarSubmitting ? (
                      <Loader2
                        className="mr-2 h-4 w-4 animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <Send
                        className="mr-2 h-4 w-4"
                        aria-hidden="true"
                      />
                    )}
                    Senden
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Workflow */}
        <TabsContent value="workflow">
          <div className="space-y-6">
            {/* Stepper */}
            {workflow && workflow.alle_schritte.length > 0 ? (
              <WorkflowStepper
                schritte={workflow.alle_schritte}
                aktuellerSchrittId={vorgang.workflow_schritt_id}
                abgeschlosseneSchritte={abgeschlosseneSchrittIds}
                hinweis={workflow.schritt?.hinweis}
                checkliste={workflow.schritt?.checkliste}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Kein Workflow für diesen Vorgang definiert.
              </p>
            )}

            {/* Verfuegbare Aktionen */}
            {workflow &&
              workflow.verfuegbare_aktionen.length > 0 && (
                <Card className="shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-base">
                      Verfügbare Aktionen
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* PROJ-30: Hinweistext und Checkliste direkt bei den Aktionen */}
                    {workflow.schritt?.hinweis && (
                      <div
                        className="rounded-md border bg-muted/50 p-3 text-sm"
                        role="note"
                        aria-label="Hinweis zum aktuellen Schritt"
                      >
                        <p className="font-medium text-foreground mb-1">
                          Nächster Schritt
                        </p>
                        <p className="text-muted-foreground">
                          {workflow.schritt.hinweis}
                        </p>
                      </div>
                    )}
                    {workflow.schritt?.checkliste &&
                      workflow.schritt.checkliste.length > 0 && (
                        <ul
                          className="space-y-1 text-sm"
                          aria-label="Checkliste für aktuellen Schritt"
                        >
                          {workflow.schritt.checkliste.map((item, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-2 text-muted-foreground"
                            >
                              <span
                                className="mt-1.5 h-1.5 w-1.5 rounded-full bg-muted-foreground shrink-0"
                                aria-hidden="true"
                              />
                              {item}
                            </li>
                          ))}
                        </ul>
                      )}
                    {aktionError && (
                      <p
                        className="text-sm text-destructive"
                        role="alert"
                      >
                        {aktionError}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {workflow.verfuegbare_aktionen.map((a) => {
                        const istFreigabe = workflow.schritt?.typ === "freigabe";
                        const zielLabel = workflow.alle_schritte.find(
                          (s) => s.id === a.ziel
                        )?.label ?? a.ziel;
                        return (
                          <WorkflowAktionMitBestaetigung
                            key={a.id}
                            aktion={a}
                            istFreigabe={istFreigabe}
                            zielLabel={zielLabel}
                            disabled={aktionLoading !== null}
                            aktionLoading={aktionLoading}
                            aktionError={aktionError}
                            onExecute={handleWorkflowAktion}
                          />
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

            {/* Workflow-Historie */}
            {workflowHistorie.length > 0 && (
              <Card className="shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-base">
                    Verlauf
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {workflowHistorie.map((h) => (
                      <div
                        key={h.id}
                        className="flex items-start gap-3 text-sm py-2 border-b last:border-b-0"
                      >
                        <div className="flex-1">
                          <span className="font-medium">
                            {getSchrittLabel(h.schritt_id,
                              workflow?.alle_schritte?.reduce((acc, s) => ({ ...acc, [s.id]: s.label }), {} as Record<string, string>)
                            ).label}
                          </span>
                          {h.aktion_id && (
                            <span className="text-muted-foreground ml-2">
                              (Aktion: {h.aktion_id})
                            </span>
                          )}
                          {h.begruendung && (
                            <p className="text-muted-foreground mt-0.5">
                              {h.begruendung}
                            </p>
                          )}
                          {/* PROJ-35 AC-2.5: Vertretungs-Information */}
                          {h.vertretung_fuer && (
                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                              Freigabe in Vertretung
                            </p>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground shrink-0 text-right">
                          <div>{new Date(h.ausgefuehrt_am).toLocaleString("de-DE")}</div>
                          {h.ausgefuehrt_von_email && (
                            <div>{h.ausgefuehrt_von_email}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** Hilfskomponente fuer Label/Value-Paare */
function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-2">
      <span className="text-muted-foreground min-w-[100px]">{label}:</span>
      <span>{value || "-"}</span>
    </div>
  );
}
