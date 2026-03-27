"use client";

import { Badge } from "@/components/ui/badge";
import { CalendarClock, AlertTriangle, AlertCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  berechneGeltungsdauerStatus,
  getGeltungsdauerClassName,
  type GeltungsdauerStatus,
} from "@/lib/utils/geltungsdauer";

/**
 * GeltungsdauerBadge (PROJ-48 US-2)
 *
 * Zeigt die Geltungsdauer einer Baugenehmigung als farbigen Badge an.
 * Farbe + Icon + Text (WCAG 2.2 AA: nie nur Farbe).
 */

interface GeltungsdauerBadgeProps {
  geltungsdauerBis: string;
  className?: string;
}

const ICON_MAP: Record<GeltungsdauerStatus, React.ElementType> = {
  gruen: CalendarClock,
  gelb: AlertTriangle,
  rot: AlertCircle,
  erloschen: XCircle,
};

export function GeltungsdauerBadge({ geltungsdauerBis, className }: GeltungsdauerBadgeProps) {
  const info = berechneGeltungsdauerStatus(geltungsdauerBis);
  const Icon = ICON_MAP[info.status];

  return (
    <Badge
      variant="outline"
      className={cn(getGeltungsdauerClassName(info.status), "gap-1 font-medium", className)}
      aria-label={`Geltungsdauer: ${info.label} — bis ${info.ablaufdatum} (${info.tageVerbleibend} Tage)`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>
        {info.status === "erloschen"
          ? "Erloschen"
          : `Gültig bis ${info.ablaufdatum}`}
      </span>
    </Badge>
  );
}
