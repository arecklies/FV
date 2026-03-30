import { useState, useCallback, useMemo } from "react";

/**
 * useSelection (PROJ-17: Massenoperationen)
 *
 * Reiner Logik-Hook fuer Mehrfachauswahl in Listen.
 * Verwaltet ein Set<string> von ausgewaehlten IDs.
 */

export interface UseSelectionReturn {
  /** Menge der ausgewaehlten IDs */
  selectedIds: Set<string>;
  /** Anzahl der ausgewaehlten Eintraege */
  selectedCount: number;
  /** Alle uebergebenen IDs auswaehlen */
  selectAll: (ids: string[]) => void;
  /** Einzelne ID umschalten (an/aus) */
  toggle: (id: string) => void;
  /** Alle abwaehlen */
  clear: () => void;
  /** Pruefen ob eine ID ausgewaehlt ist */
  isSelected: (id: string) => boolean;
}

export function useSelection(): UseSelectionReturn {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds]
  );

  const selectedCount = useMemo(() => selectedIds.size, [selectedIds]);

  return {
    selectedIds,
    selectedCount,
    selectAll,
    toggle,
    clear,
    isSelected,
  };
}
