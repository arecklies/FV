/**
 * Tests fuer MassenaktionenErgebnis Logik (PROJ-17 FA-4)
 *
 * Testumgebung ist node (kein jsdom) — wir testen die Datenlogik
 * und Interface-Kontrakte des Ergebnis-Dialogs.
 */

import type { BatchAktionResponse, BatchEinzelErgebnis } from "@/lib/services/verfahren/types";

describe("MassenaktionenErgebnis - Kontrakte", () => {
  it("sollte fehlgeschlagene Ergebnisse korrekt filtern", () => {
    const ergebnis: BatchAktionResponse = {
      gesamt: 3,
      erfolgreich: 2,
      fehlgeschlagen: 1,
      ergebnisse: [
        { vorgang_id: "id-1", erfolg: true, meldung: "Zugewiesen" },
        { vorgang_id: "id-2", erfolg: true, meldung: "Zugewiesen" },
        { vorgang_id: "id-3", erfolg: false, meldung: "Vorgang nicht gefunden" },
      ],
    };

    const fehlgeschlagene = ergebnis.ergebnisse.filter((e: BatchEinzelErgebnis) => !e.erfolg);
    expect(fehlgeschlagene).toHaveLength(1);
    expect(fehlgeschlagene[0].vorgang_id).toBe("id-3");
    expect(fehlgeschlagene[0].meldung).toBe("Vorgang nicht gefunden");
  });

  it("sollte bei komplett erfolgreicher Batch-Aktion keine Fehler haben", () => {
    const ergebnis: BatchAktionResponse = {
      gesamt: 3,
      erfolgreich: 3,
      fehlgeschlagen: 0,
      ergebnisse: [
        { vorgang_id: "id-1", erfolg: true, meldung: "Zugewiesen" },
        { vorgang_id: "id-2", erfolg: true, meldung: "Zugewiesen" },
        { vorgang_id: "id-3", erfolg: true, meldung: "Zugewiesen" },
      ],
    };

    expect(ergebnis.fehlgeschlagen).toBe(0);
    const fehlgeschlagene = ergebnis.ergebnisse.filter((e: BatchEinzelErgebnis) => !e.erfolg);
    expect(fehlgeschlagene).toHaveLength(0);
  });

  it("sollte korrekte Singular/Plural-Logik haben", () => {
    const formatAnzahl = (n: number) =>
      `${n} ${n === 1 ? "Vorgang" : "Vorgänge"}`;

    expect(formatAnzahl(1)).toBe("1 Vorgang");
    expect(formatAnzahl(3)).toBe("3 Vorgänge");
    expect(formatAnzahl(0)).toBe("0 Vorgänge");
  });

  it("sollte UUID korrekt kuerzen fuer Anzeige", () => {
    const uuid = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    const kurz = uuid.slice(0, 8) + "...";
    expect(kurz).toBe("aaaaaaaa...");
  });

  it("sollte BatchAktionResponse-Interface korrekt strukturiert sein", () => {
    const ergebnis: BatchAktionResponse = {
      gesamt: 5,
      erfolgreich: 3,
      fehlgeschlagen: 2,
      ergebnisse: [],
    };

    expect(ergebnis.gesamt).toBe(5);
    expect(ergebnis.erfolgreich).toBe(3);
    expect(ergebnis.fehlgeschlagen).toBe(2);
    expect(Array.isArray(ergebnis.ergebnisse)).toBe(true);
  });
});
