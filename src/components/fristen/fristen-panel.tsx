"use client";

import * as React from "react";
import { Clock, Loader2, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { AmpelBadge } from "./ampel-badge";
import { FristVerlaengerungDialog } from "./frist-verlaengerung-dialog";
import { FristHemmungDialog } from "./frist-hemmung-dialog";

import type { VorgangFrist } from "@/lib/services/fristen/types";

/**
 * Fristen-Panel (PROJ-4 US-1, US-2)
 *
 * Zeigt alle aktiven Fristen eines Vorgangs mit Ampel-Badge.
 * Aktionen: Verlängerung, Hemmung starten/aufheben.
 */

interface FristenPanelProps {
  fristen: VorgangFrist[];
  loading: boolean;
  error: string | null;
  actionLoading: boolean;
  actionError: string | null;
  onVerlaengerung: (
    fristId: string,
    params: { zusaetzliche_werktage: number; begruendung: string }
  ) => Promise<unknown>;
  onHemmung: (
    fristId: string,
    params: { grund: string; ende?: string }
  ) => Promise<unknown>;
  onHemmungAufheben: (fristId: string) => Promise<unknown>;
  /** PROJ-28: Callback zum Anlegen einer internen Frist */
  onCreateFrist?: (params: {
    typ: string;
    bezeichnung: string;
    werktage: number;
    start_datum: string;
  }) => Promise<unknown>;
}

export function FristenPanel({
  fristen,
  loading,
  error,
  actionLoading,
  actionError,
  onVerlaengerung,
  onHemmung,
  onHemmungAufheben,
  onCreateFrist,
}: FristenPanelProps) {
  const [verlaengerungFrist, setVerlaengerungFrist] =
    React.useState<VorgangFrist | null>(null);
  const [hemmungFrist, setHemmungFrist] =
    React.useState<VorgangFrist | null>(null);

  // PROJ-28: State für "Interne Frist anlegen"-Dialog
  const [internDialogOpen, setInternDialogOpen] = React.useState(false);
  const [internBezeichnung, setInternBezeichnung] = React.useState("");
  const [internWerktage, setInternWerktage] = React.useState("");
  const [internStartDatum, setInternStartDatum] = React.useState("");
  const [internValidationError, setInternValidationError] = React.useState<string | null>(null);
  const [internSubmitting, setInternSubmitting] = React.useState(false);

  // State zurücksetzen bei erneutem Öffnen
  React.useEffect(() => {
    if (internDialogOpen) {
      setInternBezeichnung("");
      setInternWerktage("");
      setInternStartDatum(new Date().toISOString().split("T")[0]);
      setInternValidationError(null);
    }
  }, [internDialogOpen]);

  async function handleInternSubmit(e: React.FormEvent) {
    e.preventDefault();
    setInternValidationError(null);

    if (!internBezeichnung.trim()) {
      setInternValidationError("Bezeichnung ist ein Pflichtfeld.");
      return;
    }
    const wt = parseInt(internWerktage, 10);
    if (!wt || wt <= 0) {
      setInternValidationError("Bitte geben Sie eine positive Anzahl Werktage ein.");
      return;
    }
    if (!internStartDatum) {
      setInternValidationError("Startdatum ist ein Pflichtfeld.");
      return;
    }

    if (!onCreateFrist) return;

    setInternSubmitting(true);
    try {
      await onCreateFrist({
        typ: "intern",
        bezeichnung: internBezeichnung.trim(),
        werktage: wt,
        start_datum: new Date(internStartDatum).toISOString(),
      });
      setInternDialogOpen(false);
    } catch {
      setInternValidationError("Frist konnte nicht angelegt werden.");
    } finally {
      setInternSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3" aria-label="Fristen werden geladen">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="rounded-md border border-destructive/50 bg-destructive/10 p-4"
        role="alert"
      >
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  if (fristen.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Clock
          className="h-10 w-10 text-muted-foreground mb-3"
          aria-hidden="true"
        />
        <p className="text-sm text-muted-foreground">
          Keine aktiven Fristen für diesen Vorgang.
        </p>
        {onCreateFrist && (
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => setInternDialogOpen(true)}
            aria-label="Interne Frist anlegen"
          >
            <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
            Interne Frist anlegen
          </Button>
        )}
        {/* PROJ-28: Dialog auch im Empty State rendern */}
        {renderInternDialog()}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {actionError && (
        <div
          className="rounded-md border border-destructive/50 bg-destructive/10 p-3"
          role="alert"
        >
          <p className="text-sm text-destructive">{actionError}</p>
        </div>
      )}

      {fristen.map((frist) => (
        <Card
          key={frist.id}
          className={frist.typ === "intern" ? "bg-muted/50" : undefined}
        >
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">
                    {frist.bezeichnung}
                  </span>
                  <AmpelBadge status={frist.status} compact />
                  {frist.typ === "intern" && (
                    <Badge variant="outline" aria-label="Interne Frist">
                      Intern
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <p>
                    Typ: {frist.typ} | {frist.werktage} Werktage
                  </p>
                  <p>
                    Start:{" "}
                    {new Date(frist.start_datum).toLocaleDateString("de-DE")} |
                    Ende:{" "}
                    {new Date(frist.end_datum).toLocaleDateString("de-DE")}
                  </p>
                  {frist.verlaengert && frist.original_end_datum && (
                    <p className="text-amber-600">
                      Verlängert (urspr.{" "}
                      {new Date(
                        frist.original_end_datum
                      ).toLocaleDateString("de-DE")}
                      ){frist.verlaengerung_grund && (
                        <> — {frist.verlaengerung_grund}</>
                      )}
                    </p>
                  )}
                  {frist.gehemmt && (
                    <p className="text-slate-600">
                      Gehemmt seit{" "}
                      {frist.hemmung_start
                        ? new Date(frist.hemmung_start).toLocaleDateString(
                            "de-DE"
                          )
                        : "-"}
                      {frist.hemmung_grund && <> — {frist.hemmung_grund}</>}
                    </p>
                  )}
                </div>
              </div>

              {/* Aktionen */}
              <div className="flex flex-wrap gap-2 shrink-0 print:hidden">
                {!frist.gehemmt && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={actionLoading}
                      onClick={() => setVerlaengerungFrist(frist)}
                      aria-label={`Frist "${frist.bezeichnung}" verlängern`}
                    >
                      Verlängern
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={actionLoading}
                      onClick={() => setHemmungFrist(frist)}
                      aria-label={`Frist "${frist.bezeichnung}" hemmen`}
                    >
                      Hemmen
                    </Button>
                  </>
                )}
                {frist.gehemmt && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={actionLoading}
                    onClick={() => onHemmungAufheben(frist.id)}
                    aria-label={`Hemmung für "${frist.bezeichnung}" aufheben`}
                  >
                    {actionLoading ? (
                      <Loader2
                        className="mr-1 h-3 w-3 animate-spin"
                        aria-hidden="true"
                      />
                    ) : null}
                    Hemmung aufheben
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Verlängerung Dialog */}
      {verlaengerungFrist && (
        <FristVerlaengerungDialog
          frist={verlaengerungFrist}
          open={!!verlaengerungFrist}
          onOpenChange={(open) => {
            if (!open) setVerlaengerungFrist(null);
          }}
          onSubmit={async (params) => {
            await onVerlaengerung(verlaengerungFrist.id, params);
            setVerlaengerungFrist(null);
          }}
          loading={actionLoading}
        />
      )}

      {/* Hemmung Dialog */}
      {hemmungFrist && (
        <FristHemmungDialog
          frist={hemmungFrist}
          open={!!hemmungFrist}
          onOpenChange={(open) => {
            if (!open) setHemmungFrist(null);
          }}
          onSubmit={async (params) => {
            await onHemmung(hemmungFrist.id, params);
            setHemmungFrist(null);
          }}
          loading={actionLoading}
        />
      )}

      {/* PROJ-28: Interne Frist anlegen */}
      {onCreateFrist && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setInternDialogOpen(true)}
          aria-label="Interne Frist anlegen"
          className="print:hidden"
        >
          <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
          Interne Frist anlegen
        </Button>
      )}
      {renderInternDialog()}
    </div>
  );

  /** PROJ-28: Dialog zum Anlegen einer internen Frist */
  function renderInternDialog() {
    if (!onCreateFrist) return null;
    return (
      <Dialog open={internDialogOpen} onOpenChange={setInternDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Interne Frist anlegen</DialogTitle>
            <DialogDescription>
              Legen Sie eine eigene Bearbeitungsfrist für diesen Vorgang fest.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleInternSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="intern-bezeichnung">Bezeichnung</Label>
              <Input
                id="intern-bezeichnung"
                type="text"
                value={internBezeichnung}
                onChange={(e) => setInternBezeichnung(e.target.value)}
                placeholder="z.B. Interne Bearbeitungsfrist"
                disabled={internSubmitting}
                aria-required="true"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="intern-werktage">Werktage</Label>
              <Input
                id="intern-werktage"
                type="number"
                min="1"
                value={internWerktage}
                onChange={(e) => setInternWerktage(e.target.value)}
                placeholder="z.B. 10"
                disabled={internSubmitting}
                aria-required="true"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="intern-start-datum">Startdatum</Label>
              <Input
                id="intern-start-datum"
                type="date"
                value={internStartDatum}
                onChange={(e) => setInternStartDatum(e.target.value)}
                disabled={internSubmitting}
                aria-required="true"
              />
            </div>

            {internValidationError && (
              <p className="text-sm text-destructive" role="alert">
                {internValidationError}
              </p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setInternDialogOpen(false)}
                disabled={internSubmitting}
              >
                Abbrechen
              </Button>
              <Button type="submit" disabled={internSubmitting}>
                {internSubmitting && (
                  <Loader2
                    className="mr-2 h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                )}
                Frist anlegen
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
  }
}
