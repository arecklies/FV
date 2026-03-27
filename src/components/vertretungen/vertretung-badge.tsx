"use client";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Users } from "lucide-react";

/**
 * VertretungBadge (PROJ-35 AC-2.2)
 *
 * Zeigt in der Freigabeliste an, dass ein Eintrag über Stellvertretung sichtbar ist.
 * WCAG 2.2 AA: Farbe + Icon + Text für dreifache Redundanz.
 */

interface VertretungBadgeProps {
  /** Name/E-Mail des vertretenen Referatsleiters */
  vertretungFuerName: string;
}

export function VertretungBadge({ vertretungFuerName }: VertretungBadgeProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className="gap-1 text-xs border-blue-300 text-blue-700 bg-blue-50 dark:border-blue-600 dark:text-blue-300 dark:bg-blue-950"
            aria-label={`Vertretung für ${vertretungFuerName}`}
          >
            <Users className="h-3 w-3" aria-hidden="true" />
            Vertretung
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Vertretung für {vertretungFuerName}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
