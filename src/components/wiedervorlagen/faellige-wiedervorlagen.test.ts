/**
 * Tests fuer FaelligeWiedervorlagen Logik (PROJ-53 US-2)
 *
 * Testumgebung ist node (kein jsdom) -- wir testen Ueberfaelligkeits-Logik
 * und Interface-Kontrakte.
 */

import type {
  FaelligeWiedervorlage,
  Wiedervorlage,
} from "@/lib/services/wiedervorlagen/types";
import { FaelligeQuerySchema } from "@/lib/services/wiedervorlagen/types";

/** Repliziert die Prüflogik aus der Komponente */
function istUeberfaelligOderHeute(faelligAm: string): boolean {
  const heute = new Date();
  heute.setHours(0, 0, 0, 0);
  const faellig = new Date(faelligAm);
  faellig.setHours(0, 0, 0, 0);
  return faellig <= heute;
}

function makeWv(overrides: Partial<Wiedervorlage> = {}): Wiedervorlage {
  return {
    id: "wv-1",
    tenant_id: "t-1",
    vorgang_id: "v-1",
    user_id: "u-1",
    faellig_am: "2026-04-01",
    betreff: "Test Wiedervorlage",
    notiz: null,
    erledigt_am: null,
    created_at: "2026-03-28T10:00:00Z",
    updated_at: "2026-03-28T10:00:00Z",
    ...overrides,
  };
}

function makeFaellige(
  overrides: Partial<Wiedervorlage> = {},
  aktenzeichen = "BV-2026-001"
): FaelligeWiedervorlage {
  return {
    wiedervorlage: makeWv(overrides),
    vorgang_aktenzeichen: aktenzeichen,
    vorgang_bezeichnung: null,
  };
}

describe("FaelligeWiedervorlagen - Überfällig-Logik", () => {
  it("sollte vergangenes Datum als überfällig erkennen", () => {
    expect(istUeberfaelligOderHeute("2020-01-01")).toBe(true);
  });

  it("sollte heutiges Datum als fällig erkennen", () => {
    const heute = new Date().toISOString().split("T")[0];
    expect(istUeberfaelligOderHeute(heute)).toBe(true);
  });

  it("sollte zukünftiges Datum als nicht überfällig erkennen", () => {
    expect(istUeberfaelligOderHeute("2099-12-31")).toBe(false);
  });
});

describe("FaelligeWiedervorlagen - FaelligeQuerySchema", () => {
  it("sollte Default-Wert 5 fuer tage_voraus setzen", () => {
    const result = FaelligeQuerySchema.parse({});
    expect(result.tage_voraus).toBe(5);
  });

  it("sollte gueltige Werte akzeptieren", () => {
    const result = FaelligeQuerySchema.parse({ tage_voraus: 10 });
    expect(result.tage_voraus).toBe(10);
  });

  it("sollte String-Werte zu Zahlen coercen", () => {
    const result = FaelligeQuerySchema.parse({ tage_voraus: "7" });
    expect(result.tage_voraus).toBe(7);
  });

  it("sollte Wert < 1 ablehnen", () => {
    const result = FaelligeQuerySchema.safeParse({ tage_voraus: 0 });
    expect(result.success).toBe(false);
  });

  it("sollte Wert > 30 ablehnen", () => {
    const result = FaelligeQuerySchema.safeParse({ tage_voraus: 31 });
    expect(result.success).toBe(false);
  });
});

describe("FaelligeWiedervorlagen - Interface-Kontrakte", () => {
  it("sollte FaelligeWiedervorlage korrekt aufgebaut sein", () => {
    const fw = makeFaellige({ betreff: "Prüfung anfordern" }, "BV-2026-042");
    expect(fw.wiedervorlage.betreff).toBe("Prüfung anfordern");
    expect(fw.vorgang_aktenzeichen).toBe("BV-2026-042");
    expect(fw.vorgang_bezeichnung).toBeNull();
  });

  it("sollte vorgang_bezeichnung optional sein", () => {
    const fw: FaelligeWiedervorlage = {
      wiedervorlage: makeWv(),
      vorgang_aktenzeichen: "BV-2026-001",
      vorgang_bezeichnung: "Neubau Einfamilienhaus",
    };
    expect(fw.vorgang_bezeichnung).toBe("Neubau Einfamilienhaus");
  });
});
