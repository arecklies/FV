"use client";

import * as React from "react";
import { Clock, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AmpelBadge, type AmpelStatus } from "./ampel-badge";
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
}: FristenPanelProps) {
  const [verlaengerungFrist, setVerlaengerungFrist] =
    React.useState<VorgangFrist | null>(null);
  const [hemmungFrist, setHemmungFrist] =
    React.useState<VorgangFrist | null>(null);

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
        <Card key={frist.id}>
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">
                    {frist.bezeichnung}
                  </span>
                  <AmpelBadge status={frist.status as AmpelStatus} compact />
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
              <div className="flex flex-wrap gap-2 shrink-0">
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
    </div>
  );
}
