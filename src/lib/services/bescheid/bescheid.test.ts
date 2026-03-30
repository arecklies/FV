/**
 * Unit-Tests fuer BescheidService (PROJ-6)
 *
 * Mock-Pattern: Supabase Fluent-API-Chain wird als Proxy gemockt.
 * writeAuditLog, getVorgang, getVerfahrensart werden als no-op gemockt.
 */

// -- Mocks muessen VOR den Imports stehen (jest.mock hoisting) --

jest.mock("@/lib/services/audit", () => ({
  writeAuditLog: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/lib/services/verfahren", () => ({
  getVorgang: jest.fn(),
  getVerfahrensart: jest.fn(),
}));

import {
  createBescheidEntwurf,
  getBescheidEntwurf,
  updateBausteine,
  updateNebenbestimmungen,
  berechnePlatzhalterWerte,
  renderVorschau,
} from "./index";
import { getVorgang, getVerfahrensart } from "@/lib/services/verfahren";
import { writeAuditLog } from "@/lib/services/audit";
import type { Bescheid, BausteinSnapshot, Nebenbestimmung } from "./types";
import type { Vorgang, Verfahrensart } from "@/lib/services/verfahren/types";

// -- Hilfsfunktionen fuer Supabase-Mock --

function createChainMock(resolveValue: Record<string, unknown> = { data: null, error: null }) {
  const chain: Record<string, jest.Mock> = {};
  const self = new Proxy(chain, {
    get(_target, prop: string) {
      if (prop === "then" || prop === "catch" || prop === "finally") {
        const promise = Promise.resolve(resolveValue);
        return promise[prop as keyof Promise<unknown>].bind(promise);
      }
      if (!chain[prop]) {
        chain[prop] = jest.fn().mockReturnValue(self);
      }
      return chain[prop];
    },
  });
  return { proxy: self, chain };
}

function createMockClient() {
  const fromMap = new Map<string, { proxy: unknown; chain: Record<string, jest.Mock> }>();

  const mockFrom = jest.fn((table: string) => {
    if (!fromMap.has(table)) {
      fromMap.set(table, createChainMock());
    }
    return fromMap.get(table)!.proxy;
  });

  return {
    from: mockFrom,
    setResult(table: string, result: Record<string, unknown>) {
      fromMap.set(table, createChainMock(result));
    },
    getChain(table: string) {
      return fromMap.get(table)?.chain ?? {};
    },
  };
}

// -- Testdaten --

const TENANT_ID = "t-001";
const USER_ID = "u-001";
const VORGANG_ID = "v-001";
const BESCHEID_ID = "b-001";

const MOCK_VORGANG: Vorgang = {
  id: VORGANG_ID,
  tenant_id: TENANT_ID,
  aktenzeichen: "2026/BG-0142",
  verfahrensart_id: "va-001",
  bundesland: "NW",
  bauherr_name: "Max Mustermann",
  bauherr_anschrift: "Musterstraße 1",
  bauherr_telefon: null,
  bauherr_email: null,
  grundstueck_adresse: "Baustraße 5, 50667 Köln",
  grundstueck_flurstueck: "1234/5",
  grundstueck_gemarkung: "Koeln",
  bezeichnung: "Neubau Einfamilienhaus",
  workflow_schritt_id: "bescheid_entwurf",
  zustaendiger_user_id: null,
  eingangsdatum: "2026-03-15T00:00:00Z",
  created_by: null,
  created_at: "2026-03-15T00:00:00Z",
  updated_at: "2026-03-15T00:00:00Z",
  deleted_at: null,
  version: 1,
  extra_felder: {},
  geltungsdauer_bis: null,
};

const MOCK_VERFAHRENSART: Verfahrensart = {
  id: "va-001",
  bundesland: "NW",
  kuerzel: "BG",
  bezeichnung: "Baugenehmigung",
  kategorie: "genehmigungsverfahren",
  sortierung: 1,
  rechtsgrundlage: "§ 64 BauO NRW",
};

const MOCK_BESCHEID_DB: Record<string, unknown> = {
  id: BESCHEID_ID,
  tenant_id: TENANT_ID,
  vorgang_id: VORGANG_ID,
  bescheidtyp: "genehmigung",
  status: "entwurf",
  bausteine: [],
  nebenbestimmungen: [],
  platzhalter_werte: { aktenzeichen: "2026/BG-0142", antragsteller: "Max Mustermann" },
  pdf_storage_path: null,
  pdf_dokument_id: null,
  erstellt_von: USER_ID,
  freigegeben_von: null,
  freigegeben_am: null,
  created_at: "2026-03-29T10:00:00Z",
  updated_at: "2026-03-29T10:00:00Z",
  version: 1,
};

// -- Tests --

describe("BescheidService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getVorgang as jest.Mock).mockResolvedValue({ data: MOCK_VORGANG, error: null });
    (getVerfahrensart as jest.Mock).mockResolvedValue(MOCK_VERFAHRENSART);
  });

  // -- createBescheidEntwurf --

  describe("createBescheidEntwurf", () => {
    it("sollte einen neuen Entwurf erstellen", async () => {
      const mockClient = createMockClient();
      mockClient.setResult("vorgang_bescheide", { data: MOCK_BESCHEID_DB, error: null });

      const result = await createBescheidEntwurf(
        mockClient as unknown as Parameters<typeof createBescheidEntwurf>[0],
        TENANT_ID,
        USER_ID,
        VORGANG_ID,
        "genehmigung"
      );

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      expect(result.data!.bescheidtyp).toBe("genehmigung");
      expect(result.data!.status).toBe("entwurf");
      expect(writeAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "bescheid.erstellt",
          resourceType: "vorgang_bescheide",
        })
      );
    });

    it("sollte Fehler zurueckgeben wenn Vorgang nicht gefunden", async () => {
      (getVorgang as jest.Mock).mockResolvedValue({ data: null, error: "not found" });
      const mockClient = createMockClient();

      const result = await createBescheidEntwurf(
        mockClient as unknown as Parameters<typeof createBescheidEntwurf>[0],
        TENANT_ID,
        USER_ID,
        "nonexistent",
        "genehmigung"
      );

      expect(result.error).toBe("Vorgang nicht gefunden");
      expect(result.data).toBeNull();
    });
  });

  // -- getBescheidEntwurf --

  describe("getBescheidEntwurf", () => {
    it("sollte den Bescheid-Entwurf laden", async () => {
      const mockClient = createMockClient();
      mockClient.setResult("vorgang_bescheide", { data: MOCK_BESCHEID_DB, error: null });

      const result = await getBescheidEntwurf(
        mockClient as unknown as Parameters<typeof getBescheidEntwurf>[0],
        TENANT_ID,
        VORGANG_ID
      );

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      expect(result.data!.id).toBe(BESCHEID_ID);
    });

    it("sollte null zurueckgeben wenn kein Entwurf existiert", async () => {
      const mockClient = createMockClient();
      mockClient.setResult("vorgang_bescheide", { data: null, error: { code: "PGRST116", message: "not found" } });

      const result = await getBescheidEntwurf(
        mockClient as unknown as Parameters<typeof getBescheidEntwurf>[0],
        TENANT_ID,
        VORGANG_ID
      );

      expect(result.error).toBeNull();
      expect(result.data).toBeNull();
    });
  });

  // -- updateBausteine --

  describe("updateBausteine", () => {
    const bausteine: BausteinSnapshot[] = [
      {
        baustein_id: "a0000000-0000-4000-a000-000000000001",
        kategorie: "einleitung",
        titel: "Einleitung",
        inhalt: "Text hier",
      },
    ];

    it("sollte Bausteine mit Optimistic Locking aktualisieren", async () => {
      const updatedBescheid = { ...MOCK_BESCHEID_DB, bausteine, version: 2 };
      const mockClient = createMockClient();
      mockClient.setResult("vorgang_bescheide", { data: updatedBescheid, error: null });

      const result = await updateBausteine(
        mockClient as unknown as Parameters<typeof updateBausteine>[0],
        TENANT_ID,
        BESCHEID_ID,
        bausteine,
        1
      );

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      expect(result.data!.version).toBe(2);
    });

    it("sollte CONFLICT bei Version-Mismatch zurueckgeben", async () => {
      const mockClient = createMockClient();
      mockClient.setResult("vorgang_bescheide", {
        data: null,
        error: { code: "PGRST116", message: "no rows returned" },
      });

      const result = await updateBausteine(
        mockClient as unknown as Parameters<typeof updateBausteine>[0],
        TENANT_ID,
        BESCHEID_ID,
        bausteine,
        99
      );

      expect(result.error).toBe("CONFLICT");
      expect(result.data).toBeNull();
    });
  });

  // -- updateNebenbestimmungen --

  describe("updateNebenbestimmungen", () => {
    const nebenbestimmungen: Nebenbestimmung[] = [
      { text: "Baubeginn anzeigen.", sortierung: 1 },
      { text: "Bauleiter bestellen.", sortierung: 2 },
    ];

    it("sollte Nebenbestimmungen aktualisieren", async () => {
      const updatedBescheid = { ...MOCK_BESCHEID_DB, nebenbestimmungen, version: 2 };
      const mockClient = createMockClient();
      mockClient.setResult("vorgang_bescheide", { data: updatedBescheid, error: null });

      const result = await updateNebenbestimmungen(
        mockClient as unknown as Parameters<typeof updateNebenbestimmungen>[0],
        TENANT_ID,
        BESCHEID_ID,
        nebenbestimmungen,
        1
      );

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
    });

    it("sollte CONFLICT bei Version-Mismatch zurueckgeben", async () => {
      const mockClient = createMockClient();
      mockClient.setResult("vorgang_bescheide", {
        data: null,
        error: { code: "PGRST116", message: "no rows returned" },
      });

      const result = await updateNebenbestimmungen(
        mockClient as unknown as Parameters<typeof updateNebenbestimmungen>[0],
        TENANT_ID,
        BESCHEID_ID,
        nebenbestimmungen,
        99
      );

      expect(result.error).toBe("CONFLICT");
    });
  });

  // -- berechnePlatzhalterWerte --

  describe("berechnePlatzhalterWerte", () => {
    it("sollte Platzhalter-Werte aus Vorgang berechnen", async () => {
      const mockClient = createMockClient();

      const result = await berechnePlatzhalterWerte(
        mockClient as unknown as Parameters<typeof berechnePlatzhalterWerte>[0],
        TENANT_ID,
        VORGANG_ID
      );

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      expect(result.data!.aktenzeichen).toBe("2026/BG-0142");
      expect(result.data!.antragsteller).toBe("Max Mustermann");
    });

    it("sollte Fehler bei unbekanntem Vorgang zurueckgeben", async () => {
      (getVorgang as jest.Mock).mockResolvedValue({ data: null, error: "not found" });
      const mockClient = createMockClient();

      const result = await berechnePlatzhalterWerte(
        mockClient as unknown as Parameters<typeof berechnePlatzhalterWerte>[0],
        TENANT_ID,
        "nonexistent"
      );

      expect(result.error).toBe("Vorgang nicht gefunden");
    });
  });

  // -- renderVorschau --

  describe("renderVorschau", () => {
    it("sollte HTML-Vorschau rendern mit aufgeloesten Platzhaltern", async () => {
      const bescheidMitBausteinen = {
        ...MOCK_BESCHEID_DB,
        bausteine: [
          {
            baustein_id: "a0000000-0000-4000-a000-000000000001",
            kategorie: "einleitung",
            titel: "Einleitung",
            inhalt: "Sehr geehrte(r) {{antragsteller}}, Az: {{aktenzeichen}}",
          },
        ],
        nebenbestimmungen: [
          { text: "Baubeginn anzeigen.", sortierung: 1 },
        ],
      };

      const mockClient = createMockClient();
      mockClient.setResult("vorgang_bescheide", { data: bescheidMitBausteinen, error: null });

      const result = await renderVorschau(
        mockClient as unknown as Parameters<typeof renderVorschau>[0],
        TENANT_ID,
        BESCHEID_ID
      );

      expect(result.error).toBeNull();
      expect(result.html).toContain("Max Mustermann");
      expect(result.html).toContain("2026/BG-0142");
      expect(result.html).toContain("Baugenehmigung"); // Bescheidtyp-Label
      expect(result.html).toContain("Baubeginn anzeigen.");
    });

    it("sollte fehlende Platzhalter als missing zurueckgeben", async () => {
      const bescheidMitFehlendem = {
        ...MOCK_BESCHEID_DB,
        platzhalter_werte: {},
        bausteine: [
          {
            baustein_id: "a0000000-0000-4000-a000-000000000001",
            kategorie: "einleitung",
            titel: "Test",
            inhalt: "{{unbekannt_feld}} Text",
          },
        ],
      };

      const mockClient = createMockClient();
      mockClient.setResult("vorgang_bescheide", { data: bescheidMitFehlendem, error: null });

      const result = await renderVorschau(
        mockClient as unknown as Parameters<typeof renderVorschau>[0],
        TENANT_ID,
        BESCHEID_ID
      );

      expect(result.error).toBeNull();
      expect(result.missing).toContain("unbekannt_feld");
      expect(result.html).toContain("missing-placeholder");
    });

    it("sollte Fehler bei unbekanntem Bescheid zurueckgeben", async () => {
      const mockClient = createMockClient();
      mockClient.setResult("vorgang_bescheide", {
        data: null,
        error: { code: "PGRST116", message: "not found" },
      });

      const result = await renderVorschau(
        mockClient as unknown as Parameters<typeof renderVorschau>[0],
        TENANT_ID,
        "nonexistent"
      );

      expect(result.error).toBe("Bescheid nicht gefunden");
    });
  });
});
