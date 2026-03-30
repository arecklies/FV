"use client";

import Link from "next/link";
import { CalendarCheck, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Empty State fuer "Mein Tag" (PROJ-29 US-2).
 *
 * Wird angezeigt wenn alle 3 Abschnitte leer sind.
 * AC-1: Hilfreiche Meldung
 * AC-2: Link zur Vorgangsliste + "Neuer Vorgang"
 */

export function MeinTagEmptyState() {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <CalendarCheck
          className="h-12 w-12 text-muted-foreground/50 mb-4"
          aria-hidden="true"
        />
        <h2 className="text-lg font-semibold mb-2">
          Keine dringenden Fristen. Alle Vorgänge im Zeitplan.
        </h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-md">
          Es stehen aktuell keine dringenden Aufgaben an. Sie können einen neuen
          Vorgang anlegen oder Ihre bestehenden Vorgänge einsehen.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button asChild>
            <Link href="/vorgaenge/neu">
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Neuer Vorgang
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/vorgaenge">Alle Vorgänge anzeigen</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
