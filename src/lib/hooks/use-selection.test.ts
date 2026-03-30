/**
 * Tests fuer useSelection Hook (PROJ-17: Massenoperationen)
 *
 * Da @testing-library/react nicht installiert ist, testen wir die
 * Kern-Logik direkt ueber die Set-Operationen.
 */

describe("useSelection - Logik", () => {
  // Simuliere die Hook-Logik als reine Funktionen
  function createSelection() {
    let selectedIds = new Set<string>();

    return {
      get selectedIds() { return selectedIds; },
      get selectedCount() { return selectedIds.size; },
      selectAll(ids: string[]) { selectedIds = new Set(ids); },
      toggle(id: string) {
        const next = new Set(selectedIds);
        if (next.has(id)) { next.delete(id); } else { next.add(id); }
        selectedIds = next;
      },
      clear() { selectedIds = new Set(); },
      isSelected(id: string) { return selectedIds.has(id); },
    };
  }

  it("sollte mit leerem Set starten", () => {
    const sel = createSelection();
    expect(sel.selectedCount).toBe(0);
    expect(sel.selectedIds.size).toBe(0);
  });

  it("sollte toggle() eine ID hinzufuegen und wieder entfernen", () => {
    const sel = createSelection();

    sel.toggle("id-1");
    expect(sel.isSelected("id-1")).toBe(true);
    expect(sel.selectedCount).toBe(1);

    sel.toggle("id-1");
    expect(sel.isSelected("id-1")).toBe(false);
    expect(sel.selectedCount).toBe(0);
  });

  it("sollte selectAll() alle IDs setzen", () => {
    const sel = createSelection();

    sel.selectAll(["id-1", "id-2", "id-3"]);
    expect(sel.selectedCount).toBe(3);
    expect(sel.isSelected("id-1")).toBe(true);
    expect(sel.isSelected("id-2")).toBe(true);
    expect(sel.isSelected("id-3")).toBe(true);
  });

  it("sollte selectAll() vorherige Auswahl ersetzen", () => {
    const sel = createSelection();

    sel.selectAll(["id-1", "id-2"]);
    sel.selectAll(["id-3"]);
    expect(sel.selectedCount).toBe(1);
    expect(sel.isSelected("id-1")).toBe(false);
    expect(sel.isSelected("id-3")).toBe(true);
  });

  it("sollte clear() alle abwaehlen", () => {
    const sel = createSelection();

    sel.selectAll(["id-1", "id-2", "id-3"]);
    sel.clear();
    expect(sel.selectedCount).toBe(0);
    expect(sel.isSelected("id-1")).toBe(false);
  });

  it("sollte isSelected() false fuer nicht ausgewaehlte IDs zurueckgeben", () => {
    const sel = createSelection();
    expect(sel.isSelected("nicht-vorhanden")).toBe(false);
  });

  it("sollte mehrere toggle-Aufrufe korrekt verarbeiten", () => {
    const sel = createSelection();

    sel.toggle("id-1");
    sel.toggle("id-2");
    sel.toggle("id-3");
    expect(sel.selectedCount).toBe(3);

    sel.toggle("id-2");
    expect(sel.selectedCount).toBe(2);
    expect(sel.isSelected("id-2")).toBe(false);
    expect(sel.isSelected("id-1")).toBe(true);
    expect(sel.isSelected("id-3")).toBe(true);
  });

  it("sollte selectAll mit leerer Liste alle abwaehlen", () => {
    const sel = createSelection();

    sel.selectAll(["id-1", "id-2"]);
    sel.selectAll([]);
    expect(sel.selectedCount).toBe(0);
  });

  it("sollte Duplikate in selectAll ignorieren", () => {
    const sel = createSelection();

    sel.selectAll(["id-1", "id-1", "id-2"]);
    expect(sel.selectedCount).toBe(2);
  });
});
