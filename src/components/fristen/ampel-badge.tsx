"use client";

import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  XCircle,
  PauseCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Ampel-Badge (PROJ-4 FA-4, NFR-4)
 *
 * Barrierefreie Fristampel: Farbe + Icon + Text (WCAG 2.2 AA).
 * Nie nur Farbe — immer auch Icon und Text.
 */

export type AmpelStatus = "gruen" | "gelb" | "rot" | "dunkelrot" | "gehemmt";

interface AmpelBadgeProps {
  status: AmpelStatus;
  /** Optionaler Kurztext statt Standard-Label */
  label?: string;
  /** Kompakte Darstellung (nur Icon + Kurzlabel) */
  compact?: boolean;
  className?: string;
}

const AMPEL_CONFIG: Record<
  AmpelStatus,
  {
    label: string;
    shortLabel: string;
    icon: React.ElementType;
    className: string;
  }
> = {
  gruen: {
    label: "Im Zeitplan",
    shortLabel: "OK",
    icon: CheckCircle2,
    className: "bg-green-100 text-green-800 border-green-300",
  },
  gelb: {
    label: "Aufmerksamkeit",
    shortLabel: "Achtung",
    icon: AlertTriangle,
    className: "bg-yellow-100 text-yellow-800 border-yellow-400",
  },
  rot: {
    label: "Fristgefährdet",
    shortLabel: "Kritisch",
    icon: AlertCircle,
    className: "bg-red-100 text-red-800 border-red-300",
  },
  dunkelrot: {
    label: "Frist überschritten",
    shortLabel: "Überfällig",
    icon: XCircle,
    className: "bg-red-200 text-red-900 border-red-500",
  },
  gehemmt: {
    label: "Frist gehemmt",
    shortLabel: "Gehemmt",
    icon: PauseCircle,
    className: "bg-slate-100 text-slate-700 border-slate-300",
  },
};

export function AmpelBadge({
  status,
  label,
  compact = false,
  className,
}: AmpelBadgeProps) {
  const config = AMPEL_CONFIG[status];
  const Icon = config.icon;
  const displayLabel = label ?? (compact ? config.shortLabel : config.label);

  return (
    <Badge
      variant="outline"
      className={cn(config.className, "gap-1 font-medium", className)}
      aria-label={`Friststatus: ${config.label}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{displayLabel}</span>
    </Badge>
  );
}
