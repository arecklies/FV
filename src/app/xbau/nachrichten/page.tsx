"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, AlertTriangle, Link2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * XBau-Nachrichten Queues (PROJ-7 US-1 AC-8, US-1b AC-5/6)
 *
 * Fehler-Queue: Nachrichten die bei der Validierung fehlgeschlagen sind.
 * Zuordnungs-Queue: Nachrichten die keinem Vorgang zugeordnet werden konnten.
 */

// Labels lokal definieren (Frontend darf nicht Backend-Service importieren)
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

function getNachrichtLabel(typ: string): string {
  return NACHRICHTENTYP_LABELS[typ] ?? `Nachricht ${typ}`;
}

interface QueueNachricht {
  id: string;
  nachrichten_uuid: string;
  nachrichtentyp: string;
  absender_behoerde: string | null;
  fehler_details: { fehlertext?: string; fehlerkennzahl?: string } | null;
  created_at: string;
}

export default function XBauNachrichtenPage() {
  const [activeTab, setActiveTab] = React.useState<"fehler" | "zuordnung">("fehler");

  // Fehler-Queue
  const [fehlerListe, setFehlerListe] = React.useState<QueueNachricht[]>([]);
  const [fehlerLoading, setFehlerLoading] = React.useState(false);
  const [fehlerError, setFehlerError] = React.useState<string | null>(null);

  // Zuordnungs-Queue
  const [zuordnungListe, setZuordnungListe] = React.useState<QueueNachricht[]>([]);
  const [zuordnungLoading, setZuordnungLoading] = React.useState(false);
  const [zuordnungError, setZuordnungError] = React.useState<string | null>(null);

  // Zuordnungs-Dialog
  const [zuordnungDialogOpen, setZuordnungDialogOpen] = React.useState(false);
  const [zuordnungNachrichtId, setZuordnungNachrichtId] = React.useState<string | null>(null);
  const [aktenzeichen, setAktenzeichen] = React.useState("");
  const [zuordnungSubmitting, setZuordnungSubmitting] = React.useState(false);
  const [zuordnungSubmitError, setZuordnungSubmitError] = React.useState<string | null>(null);

  const loadFehlerQueue = React.useCallback(async () => {
    setFehlerLoading(true);
    setFehlerError(null);
    try {
      const res = await fetch("/api/xbau/nachrichten?queue=fehler", {
        credentials: "include",
      });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) {
        setFehlerError("Fehler-Queue konnte nicht geladen werden.");
        return;
      }
      const data = await res.json();
      setFehlerListe(data.nachrichten ?? []);
    } catch {
      setFehlerError("Verbindungsfehler.");
    } finally {
      setFehlerLoading(false);
    }
  }, []);

  const loadZuordnungQueue = React.useCallback(async () => {
    setZuordnungLoading(true);
    setZuordnungError(null);
    try {
      const res = await fetch("/api/xbau/nachrichten?queue=zuordnung", {
        credentials: "include",
      });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) {
        setZuordnungError("Zuordnungs-Queue konnte nicht geladen werden.");
        return;
      }
      const data = await res.json();
      setZuordnungListe(data.nachrichten ?? []);
    } catch {
      setZuordnungError("Verbindungsfehler.");
    } finally {
      setZuordnungLoading(false);
    }
  }, []);

  // Initial load
  React.useEffect(() => {
    if (activeTab === "fehler") {
      loadFehlerQueue();
    } else {
      loadZuordnungQueue();
    }
  }, [activeTab, loadFehlerQueue, loadZuordnungQueue]);

  function openZuordnungDialog(nachrichtId: string) {
    setZuordnungNachrichtId(nachrichtId);
    setAktenzeichen("");
    setZuordnungSubmitError(null);
    setZuordnungDialogOpen(true);
  }

  async function handleZuordnung() {
    if (!zuordnungNachrichtId || !aktenzeichen.trim()) return;

    setZuordnungSubmitting(true);
    setZuordnungSubmitError(null);
    try {
      const res = await fetch(`/api/xbau/nachrichten/${zuordnungNachrichtId}/zuordnen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aktenzeichen: aktenzeichen.trim() }),
        credentials: "include",
      });

      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        setZuordnungSubmitError(data.error ?? "Zuordnung fehlgeschlagen.");
        return;
      }

      setZuordnungDialogOpen(false);
      toast.success("Nachricht zugeordnet");
      loadZuordnungQueue();
    } catch {
      setZuordnungSubmitError("Verbindungsfehler.");
    } finally {
      setZuordnungSubmitting(false);
    }
  }

  function renderSkeleton() {
    return (
      <div className="space-y-3" aria-label="Wird geladen">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
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
            <BreadcrumbPage>XBau-Nachrichten</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <h1 className="text-2xl font-bold tracking-tight mb-6">XBau-Nachrichten</h1>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "fehler" | "zuordnung")}
      >
        <TabsList className="mb-4">
          <TabsTrigger value="fehler">
            Fehler
            {fehlerListe.length > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">
                {fehlerListe.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="zuordnung">
            Zuordnung
            {zuordnungListe.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {zuordnungListe.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Fehler-Queue */}
        <TabsContent value="fehler">
          {fehlerLoading ? (
            renderSkeleton()
          ) : fehlerError ? (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{fehlerError}</AlertDescription>
            </Alert>
          ) : fehlerListe.length === 0 ? (
            <Card className="bg-background shadow-sm">
              <CardContent className="py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Keine fehlerhaften Nachrichten vorhanden.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {fehlerListe.map((n) => (
                <Card key={n.id} className="bg-background shadow-sm">
                  <CardContent className="py-4">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <AlertTriangle
                            className="h-4 w-4 text-destructive shrink-0"
                            aria-hidden="true"
                          />
                          <span className="text-sm font-medium">
                            {getNachrichtLabel(n.nachrichtentyp)}
                          </span>
                          <Badge variant="destructive" className="text-xs">
                            {n.fehler_details?.fehlerkennzahl ?? "Fehler"}
                          </Badge>
                        </div>
                        {n.absender_behoerde && (
                          <p className="text-xs text-muted-foreground">
                            Absender: {n.absender_behoerde}
                          </p>
                        )}
                        {n.fehler_details?.fehlertext && (
                          <p className="text-sm text-destructive/90">
                            {n.fehler_details.fehlertext}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {new Date(n.created_at).toLocaleString("de-DE")}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Zuordnungs-Queue */}
        <TabsContent value="zuordnung">
          {zuordnungLoading ? (
            renderSkeleton()
          ) : zuordnungError ? (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{zuordnungError}</AlertDescription>
            </Alert>
          ) : zuordnungListe.length === 0 ? (
            <Card className="bg-background shadow-sm">
              <CardContent className="py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Keine Nachrichten zur manuellen Zuordnung vorhanden.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {zuordnungListe.map((n) => (
                <Card key={n.id} className="bg-background shadow-sm">
                  <CardContent className="py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Link2
                            className="h-4 w-4 text-muted-foreground shrink-0"
                            aria-hidden="true"
                          />
                          <span className="text-sm font-medium">
                            {getNachrichtLabel(n.nachrichtentyp)}
                          </span>
                        </div>
                        {n.absender_behoerde && (
                          <p className="text-xs text-muted-foreground">
                            Absender: {n.absender_behoerde}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground shrink-0">
                          {new Date(n.created_at).toLocaleString("de-DE")}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="min-h-[36px]"
                          onClick={() => openZuordnungDialog(n.id)}
                          aria-label={`Nachricht ${getNachrichtLabel(n.nachrichtentyp)} einem Vorgang zuordnen`}
                        >
                          Zuordnen
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Zuordnungs-Dialog */}
      <Dialog open={zuordnungDialogOpen} onOpenChange={setZuordnungDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nachricht zuordnen</DialogTitle>
            <DialogDescription>
              Geben Sie das Aktenzeichen des Vorgangs ein, dem diese Nachricht zugeordnet werden soll.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {zuordnungSubmitError && (
              <Alert variant="destructive" role="alert" aria-live="assertive">
                <AlertDescription>{zuordnungSubmitError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="aktenzeichen-input">Aktenzeichen</Label>
              <Input
                id="aktenzeichen-input"
                value={aktenzeichen}
                onChange={(e) => setAktenzeichen(e.target.value)}
                placeholder="z.B. BV-2026-001"
                disabled={zuordnungSubmitting}
                aria-label="Aktenzeichen des Ziel-Vorgangs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setZuordnungDialogOpen(false)}
              disabled={zuordnungSubmitting}
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleZuordnung}
              disabled={zuordnungSubmitting || !aktenzeichen.trim()}
              className="min-h-[44px]"
              aria-label="Zuordnung bestätigen"
            >
              {zuordnungSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              Zuordnen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
