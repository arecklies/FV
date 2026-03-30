/**
 * Tests fuer WiedervorlageDialog Kontrakte (PROJ-53 US-1)
 *
 * Testumgebung ist node (kein jsdom) -- wir testen Validierungslogik
 * und Interface-Kontrakte.
 */

import { CreateWiedervorlageSchema } from "@/lib/services/wiedervorlagen/types";

describe("WiedervorlageDialog - Validierung", () => {
  describe("CreateWiedervorlageSchema", () => {
    it("sollte gueltige Eingaben akzeptieren", () => {
      const result = CreateWiedervorlageSchema.safeParse({
        faellig_am: "2026-06-15",
        betreff: "Stellungnahme Brandschutz nachfragen",
      });
      expect(result.success).toBe(true);
    });

    it("sollte gueltige Eingaben mit Notiz akzeptieren", () => {
      const result = CreateWiedervorlageSchema.safeParse({
        faellig_am: "2026-06-15",
        betreff: "Unterlagen prüfen",
        notiz: "Weitere Details zur Erinnerung",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.notiz).toBe("Weitere Details zur Erinnerung");
      }
    });

    it("sollte leeren Betreff ablehnen", () => {
      const result = CreateWiedervorlageSchema.safeParse({
        faellig_am: "2026-06-15",
        betreff: "",
      });
      expect(result.success).toBe(false);
    });

    it("sollte Betreff ueber 200 Zeichen ablehnen", () => {
      const result = CreateWiedervorlageSchema.safeParse({
        faellig_am: "2026-06-15",
        betreff: "A".repeat(201),
      });
      expect(result.success).toBe(false);
    });

    it("sollte Betreff mit exakt 200 Zeichen akzeptieren", () => {
      const result = CreateWiedervorlageSchema.safeParse({
        faellig_am: "2026-06-15",
        betreff: "A".repeat(200),
      });
      expect(result.success).toBe(true);
    });

    it("sollte fehlendes Datum ablehnen", () => {
      const result = CreateWiedervorlageSchema.safeParse({
        betreff: "Test",
      });
      expect(result.success).toBe(false);
    });

    it("sollte ungueltiges Datumsformat ablehnen", () => {
      const result = CreateWiedervorlageSchema.safeParse({
        faellig_am: "15.06.2026",
        betreff: "Test",
      });
      expect(result.success).toBe(false);
    });

    it("sollte ISO-Datumsformat YYYY-MM-DD akzeptieren", () => {
      const result = CreateWiedervorlageSchema.safeParse({
        faellig_am: "2026-12-31",
        betreff: "Jahresende prüfen",
      });
      expect(result.success).toBe(true);
    });

    it("sollte Notiz als optional behandeln", () => {
      const result = CreateWiedervorlageSchema.safeParse({
        faellig_am: "2026-06-15",
        betreff: "Test ohne Notiz",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.notiz).toBeUndefined();
      }
    });
  });
});
