import { gruppiereAufgabenNachSchritt } from "./aufgaben-gruppierung";
import type { MeineAufgabe } from "@/lib/services/tagesansicht/types";

const mockAufgaben: MeineAufgabe[] = [
  {
    id: "v-1",
    aktenzeichen: "BV-2026-001",
    bauherr_name: "Müller GmbH",
    grundstueck_adresse: "Musterstr. 1",
    bezeichnung: "Bürogebäude",
    workflow_schritt_id: "pruefung",
    zustaendiger_user_id: "u-1",
    eingangsdatum: "2026-03-01",
    verfahrensart_id: "va-1",
  },
  {
    id: "v-2",
    aktenzeichen: "BV-2026-002",
    bauherr_name: "Schmidt AG",
    grundstueck_adresse: "Beispielweg 5",
    bezeichnung: null,
    workflow_schritt_id: "pruefung",
    zustaendiger_user_id: "u-1",
    eingangsdatum: "2026-03-05",
    verfahrensart_id: "va-1",
  },
  {
    id: "v-3",
    aktenzeichen: "BV-2026-003",
    bauherr_name: "Weber KG",
    grundstueck_adresse: null,
    bezeichnung: "Garage",
    workflow_schritt_id: "beteiligung",
    zustaendiger_user_id: "u-1",
    eingangsdatum: "2026-03-10",
    verfahrensart_id: "va-2",
  },
];

describe("gruppiereAufgabenNachSchritt", () => {
  it("sollte leere Map fuer leere Eingabe zurueckgeben", () => {
    const result = gruppiereAufgabenNachSchritt([]);
    expect(result.size).toBe(0);
  });

  it("sollte Aufgaben nach workflow_schritt_id gruppieren", () => {
    const result = gruppiereAufgabenNachSchritt(mockAufgaben);

    expect(result.size).toBe(2);
    expect(result.get("pruefung")?.length).toBe(2);
    expect(result.get("beteiligung")?.length).toBe(1);
  });

  it("sollte Reihenfolge des ersten Vorkommens beibehalten", () => {
    const result = gruppiereAufgabenNachSchritt(mockAufgaben);
    const keys = Array.from(result.keys());

    expect(keys[0]).toBe("pruefung");
    expect(keys[1]).toBe("beteiligung");
  });

  it("sollte alle Aufgaben-Daten in den Gruppen erhalten", () => {
    const result = gruppiereAufgabenNachSchritt(mockAufgaben);
    const pruefung = result.get("pruefung")!;

    expect(pruefung[0].aktenzeichen).toBe("BV-2026-001");
    expect(pruefung[1].aktenzeichen).toBe("BV-2026-002");
  });

  it("sollte einzelne Aufgabe in eigene Gruppe stellen", () => {
    const einzeln: MeineAufgabe[] = [mockAufgaben[0]];
    const result = gruppiereAufgabenNachSchritt(einzeln);

    expect(result.size).toBe(1);
    expect(result.get("pruefung")?.length).toBe(1);
  });
});
