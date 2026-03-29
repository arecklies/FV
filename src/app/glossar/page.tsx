"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { GLOSSAR_EINTRAEGE, type GlossarEintrag } from "@/lib/glossar/glossar-data";
import { useGlossar } from "@/lib/glossar/glossar-provider";

/**
 * Glossar-Nachschlageseite (PROJ-54 US-2)
 *
 * Alphabetische Liste aller Fachbegriffe mit Suchfunktion.
 * Druckbar via @media print (AC-2.5).
 */
export default function GlossarPage() {
  const { enabled, setEnabled } = useGlossar();
  const [suche, setSuche] = React.useState("");
  const suchTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [suchFilter, setSuchFilter] = React.useState("");

  const handleSuche = React.useCallback((value: string) => {
    setSuche(value);
    if (suchTimerRef.current) clearTimeout(suchTimerRef.current);
    suchTimerRef.current = setTimeout(() => {
      setSuchFilter(value);
    }, 200);
  }, []);

  const gefiltert = React.useMemo(() => {
    if (!suchFilter) return GLOSSAR_EINTRAEGE;
    const lower = suchFilter.toLowerCase();
    return GLOSSAR_EINTRAEGE.filter(
      (e) =>
        e.term.toLowerCase().includes(lower) ||
        e.kurzerklaerung.toLowerCase().includes(lower) ||
        (e.langerklaerung?.toLowerCase().includes(lower) ?? false)
    );
  }, [suchFilter]);

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      {/* Drucktitel */}
      <div className="hidden print-header mb-4">
        <h1 className="text-xl font-bold">Glossar Bauordnungsrecht</h1>
        <p className="text-sm text-muted-foreground">
          {GLOSSAR_EINTRAEGE.length} Fachbegriffe – Gedruckt am{" "}
          {new Date().toLocaleDateString("de-DE")}
        </p>
      </div>

      {/* Header + Suche + Toggle */}
      <div className="mb-6 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Glossar</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {gefiltert.length} von {GLOSSAR_EINTRAEGE.length} Fachbegriffen
            </p>
          </div>

          {/* US-3: Experten-Toggle */}
          <div className="flex items-center gap-2">
            <Switch
              id="glossar-toggle"
              checked={enabled}
              onCheckedChange={setEnabled}
              aria-label="Fachbegriff-Erklärungen in der Anwendung anzeigen"
            />
            <Label htmlFor="glossar-toggle" className="text-sm cursor-pointer">
              Erklärungen im UI
            </Label>
          </div>
        </div>

        {/* Suchfeld */}
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            placeholder="Begriff oder Erklärung suchen..."
            value={suche}
            onChange={(e) => handleSuche(e.target.value)}
            className="pl-9"
            aria-label="Glossar durchsuchen"
          />
        </div>
      </div>

      {/* Empty State */}
      {gefiltert.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            Kein Begriff gefunden für „{suchFilter}".
          </p>
        </div>
      )}

      {/* Begriffsliste */}
      <div className="space-y-3" role="list" aria-label="Fachbegriffe">
        {gefiltert.map((eintrag) => (
          <GlossarKarte key={eintrag.id} eintrag={eintrag} />
        ))}
      </div>
    </div>
  );
}

function GlossarKarte({ eintrag }: { eintrag: GlossarEintrag }) {
  const hatDetails = eintrag.langerklaerung || eintrag.beispiel;

  if (!hatDetails) {
    return (
      <Card role="listitem">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-base flex items-center gap-2">
            {eintrag.term}
            <BundeslandBadges bundeslaender={eintrag.bundeslaender} />
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          <p className="text-sm text-muted-foreground">
            {eintrag.kurzerklaerung}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Collapsible>
      <Card role="listitem">
        <CardHeader className="pb-2 pt-4 px-4">
          <CollapsibleTrigger className="flex items-center gap-2 text-left w-full group">
            <CardTitle className="text-base flex items-center gap-2 flex-1">
              {eintrag.term}
              <BundeslandBadges bundeslaender={eintrag.bundeslaender} />
            </CardTitle>
            <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
              Details ▾
            </span>
          </CollapsibleTrigger>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          <p className="text-sm text-muted-foreground">
            {eintrag.kurzerklaerung}
          </p>
          <CollapsibleContent>
            {eintrag.langerklaerung && (
              <p className="text-sm mt-2 border-l-2 border-primary/20 pl-3">
                {eintrag.langerklaerung}
              </p>
            )}
            {eintrag.beispiel && (
              <p className="text-sm mt-2 italic text-muted-foreground">
                Beispiel: {eintrag.beispiel}
              </p>
            )}
          </CollapsibleContent>
        </CardContent>
      </Card>
    </Collapsible>
  );
}

function BundeslandBadges({ bundeslaender }: { bundeslaender?: string[] }) {
  if (!bundeslaender?.length) return null;
  return (
    <>
      {bundeslaender.map((bl) => (
        <Badge key={bl} variant="outline" className="text-xs font-normal">
          {bl}
        </Badge>
      ))}
    </>
  );
}
