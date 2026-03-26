"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

import {
  WorkflowStepper,
  type WorkflowSchrittInfo,
} from "@/components/vorgaenge/workflow-stepper";
import { FristenPanel } from "@/components/fristen/fristen-panel";
import { AmpelBadge, type AmpelStatus } from "@/components/fristen/ampel-badge";
import { useFristen } from "@/hooks/use-fristen";

import type {
  Vorgang,
  VorgangKommentar,
} from "@/lib/services/verfahren/types";
import type {
  WorkflowSchritt,
  WorkflowSchrittHistorie,
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
  const [kommentare, setKommentare] = React.useState<VorgangKommentar[]>([]);
  const [kommentareLoading, setKommentareLoading] = React.useState(false);
  const [neuerKommentar, setNeuerKommentar] = React.useState("");
  const [kommentarSubmitting, setKommentarSubmitting] = React.useState(false);
  const [kommentarError, setKommentarError] = React.useState<string | null>(null);

  // Workflow-Historie
  const [workflowHistorie, setWorkflowHistorie] = React.useState<
    WorkflowSchrittHistorie[]
  >([]);

  // Workflow-Aktion
  const [aktionLoading, setAktionLoading] = React.useState<string | null>(null);
  const [aktionError, setAktionError] = React.useState<string | null>(null);

  // Fristen (PROJ-4)
  const fristenHook = useFristen(vorgangId);

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

  // Kommentar absenden
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
    } catch {
      setKommentarError("Verbindungsfehler.");
    } finally {
      setKommentarSubmitting(false);
    }
  }

  // Workflow-Aktion ausfuehren
  async function handleWorkflowAktion(aktionId: string) {
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
        return;
      }
      // Vorgang und Historie neu laden
      await loadVorgang();
      await loadWorkflowHistorie();
    } catch {
      setAktionError("Verbindungsfehler.");
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
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/vorgaenge">
            <ArrowLeft className="mr-1 h-4 w-4" aria-hidden="true" />
            Zurück zur Liste
          </Link>
        </Button>
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
      {/* Navigation */}
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link href="/vorgaenge">
          <ArrowLeft className="mr-1 h-4 w-4" aria-hidden="true" />
          Zurück zur Liste
        </Link>
      </Button>

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

      {/* Tabs */}
      <Tabs
        defaultValue="uebersicht"
        onValueChange={(tab) => {
          if (tab === "kommentare") loadKommentare();
          if (tab === "workflow") loadWorkflowHistorie();
        }}
      >
        <TabsList className="mb-4">
          <TabsTrigger value="uebersicht">Übersicht</TabsTrigger>
          <TabsTrigger value="fristen">Fristen</TabsTrigger>
          <TabsTrigger value="kommentare">Kommentare</TabsTrigger>
          <TabsTrigger value="workflow">Workflow</TabsTrigger>
        </TabsList>

        {/* Übersicht */}
        <TabsContent value="uebersicht">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bauherr */}
            <Card>
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
            <Card>
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
            <Card className="md:col-span-2">
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
              </CardContent>
            </Card>
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

        {/* Kommentare */}
        <TabsContent value="kommentare">
          <Card>
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
                          {k.autor_user_id.slice(0, 8)}...
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
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Verfügbare Aktionen
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {aktionError && (
                      <p
                        className="text-sm text-destructive mb-3"
                        role="alert"
                      >
                        {aktionError}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {workflow.verfuegbare_aktionen.map((a) => (
                        <Button
                          key={a.id}
                          variant="outline"
                          size="sm"
                          disabled={aktionLoading !== null}
                          onClick={() => handleWorkflowAktion(a.id)}
                          aria-label={`Aktion: ${a.label}`}
                        >
                          {aktionLoading === a.id && (
                            <Loader2
                              className="mr-2 h-4 w-4 animate-spin"
                              aria-hidden="true"
                            />
                          )}
                          {a.label}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

            {/* Workflow-Historie */}
            {workflowHistorie.length > 0 && (
              <Card>
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
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {new Date(h.ausgefuehrt_am).toLocaleString(
                            "de-DE"
                          )}
                        </span>
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
