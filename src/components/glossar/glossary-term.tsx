"use client";

import * as React from "react";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { GLOSSAR_MAP } from "@/lib/glossar/glossar-data";
import { useGlossar } from "@/lib/glossar/glossar-provider";

interface GlossaryTermProps {
  /** Glossar-ID (z.B. "verfahrensart", "gebaeueklasse") */
  termId: string;
  /** Angezeigter Text (optional, Standard: term aus Glossar) */
  children?: React.ReactNode;
  /** Bundesland-Kontext (optional, fuer BL-spezifische Erklaerungen) */
  bundesland?: string;
}

/**
 * GlossaryTerm (PROJ-54 US-1)
 *
 * Wraps a technical term with a tooltip explanation.
 * Uses shadcn/ui Tooltip internally (AC-1.8).
 * Respects GlossarProvider enabled/disabled state (AC-3.2).
 */
export function GlossaryTerm({ termId, children, bundesland }: GlossaryTermProps) {
  const { enabled } = useGlossar();
  const eintrag = GLOSSAR_MAP.get(termId);

  // Kein Eintrag gefunden oder Glossar deaktiviert: nur Text anzeigen
  if (!eintrag || !enabled) {
    return <>{children ?? eintrag?.term ?? termId}</>;
  }

  // BL-spezifischer Eintrag: nur anzeigen wenn passendes BL oder kein BL-Kontext
  if (eintrag.bundeslaender?.length && bundesland && !eintrag.bundeslaender.includes(bundesland)) {
    return <>{children ?? eintrag.term}</>;
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="inline-flex items-center gap-0.5 border-b border-dashed border-muted-foreground/40 text-muted-foreground cursor-help focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm"
            tabIndex={0}
          >
            {children ?? eintrag.term}
            <Info className="inline h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          </span>
        </TooltipTrigger>
        <TooltipContent
          className="max-w-xs text-sm"
          role="tooltip"
        >
          <p>{eintrag.kurzerklaerung}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
