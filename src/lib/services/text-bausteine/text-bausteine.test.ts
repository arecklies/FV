/**
 * Unit-Tests fuer TextBausteinService (PROJ-6 US-2)
 */

// -- Mocks muessen VOR den Imports stehen (jest.mock hoisting) --

jest.mock("@/lib/services/audit", () => ({
  writeAuditLog: jest.fn().mockResolvedValue(undefined),
}));

import {
  listBausteine,
  getBaustein,
  createBaustein,
  updateBaustein,
  deactivateBaustein,
} from "./index";
import { writeAuditLog } from "@/lib/services/audit";
import type { TextBaustein } from "@/lib/services/bescheid/types";

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
  };
}

// -- Testdaten --

const TENANT_ID = "t-001";
const USER_ID = "u-001";
const BAUSTEIN_ID = "tb-001";

const MOCK_BAUSTEIN_DB: Record<string, unknown> = {
  id: BAUSTEIN_ID,
  tenant_id: TENANT_ID,
  titel: "Einleitung Baugenehmigung",
  kategorie: "einleitung",
  inhalt: "Sehr geehrte(r) {{antragsteller}},",
  verfahrensarten: ["BG", "BG-V"],
  bescheidtypen: ["genehmigung"],
  sortierung: 10,
  aktiv: true,
  created_by: USER_ID,
  created_at: "2026-03-29T10:00:00Z",
  updated_at: "2026-03-29T10:00:00Z",
};

// -- Tests --

describe("TextBausteinService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -- listBausteine --

  describe("listBausteine", () => {
    it("sollte Bausteine eines Tenants auflisten", async () => {
      const mockClient = createMockClient();
      mockClient.setResult("text_bausteine", { data: [MOCK_BAUSTEIN_DB], error: null });

      const result = await listBausteine(
        mockClient as unknown as Parameters<typeof listBausteine>[0],
        TENANT_ID
      );

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(1);
      expect(result.data[0].titel).toBe("Einleitung Baugenehmigung");
    });

    it("sollte leere Liste bei Fehler zurueckgeben", async () => {
      const mockClient = createMockClient();
      mockClient.setResult("text_bausteine", { data: null, error: { message: "DB error" } });

      const result = await listBausteine(
        mockClient as unknown as Parameters<typeof listBausteine>[0],
        TENANT_ID
      );

      expect(result.error).toBeTruthy();
      expect(result.data).toEqual([]);
    });
  });

  // -- getBaustein --

  describe("getBaustein", () => {
    it("sollte einen einzelnen Baustein laden", async () => {
      const mockClient = createMockClient();
      mockClient.setResult("text_bausteine", { data: MOCK_BAUSTEIN_DB, error: null });

      const result = await getBaustein(
        mockClient as unknown as Parameters<typeof getBaustein>[0],
        TENANT_ID,
        BAUSTEIN_ID
      );

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      expect(result.data!.id).toBe(BAUSTEIN_ID);
    });

    it("sollte Fehler bei unbekanntem Baustein zurueckgeben", async () => {
      const mockClient = createMockClient();
      mockClient.setResult("text_bausteine", {
        data: null,
        error: { message: "not found" },
      });

      const result = await getBaustein(
        mockClient as unknown as Parameters<typeof getBaustein>[0],
        TENANT_ID,
        "nonexistent"
      );

      expect(result.error).toBeTruthy();
      expect(result.data).toBeNull();
    });
  });

  // -- createBaustein --

  describe("createBaustein", () => {
    it("sollte einen neuen Baustein erstellen", async () => {
      const mockClient = createMockClient();
      mockClient.setResult("text_bausteine", { data: MOCK_BAUSTEIN_DB, error: null });

      const result = await createBaustein(
        mockClient as unknown as Parameters<typeof createBaustein>[0],
        TENANT_ID,
        USER_ID,
        {
          titel: "Einleitung Baugenehmigung",
          kategorie: "einleitung",
          inhalt: "Sehr geehrte(r) {{antragsteller}},",
          verfahrensarten: ["BG"],
          bescheidtypen: ["genehmigung"],
        }
      );

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      expect(result.data!.titel).toBe("Einleitung Baugenehmigung");
      expect(writeAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "textbaustein.erstellt",
          resourceType: "text_bausteine",
        })
      );
    });

    it("sollte Fehler bei DB-Fehler zurueckgeben", async () => {
      const mockClient = createMockClient();
      mockClient.setResult("text_bausteine", {
        data: null,
        error: { message: "insert error" },
      });

      const result = await createBaustein(
        mockClient as unknown as Parameters<typeof createBaustein>[0],
        TENANT_ID,
        USER_ID,
        {
          titel: "Test",
          kategorie: "einleitung",
          inhalt: "Test-Inhalt",
        }
      );

      expect(result.error).toBeTruthy();
      expect(result.data).toBeNull();
    });
  });

  // -- updateBaustein --

  describe("updateBaustein", () => {
    it("sollte einen Baustein aktualisieren", async () => {
      const updated = { ...MOCK_BAUSTEIN_DB, titel: "Neuer Titel" };
      const mockClient = createMockClient();
      mockClient.setResult("text_bausteine", { data: updated, error: null });

      const result = await updateBaustein(
        mockClient as unknown as Parameters<typeof updateBaustein>[0],
        TENANT_ID,
        BAUSTEIN_ID,
        { titel: "Neuer Titel" }
      );

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      expect(result.data!.titel).toBe("Neuer Titel");
      expect(writeAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "textbaustein.aktualisiert",
        })
      );
    });

    it("sollte Fehler bei leeren Updates zurueckgeben", async () => {
      const mockClient = createMockClient();

      const result = await updateBaustein(
        mockClient as unknown as Parameters<typeof updateBaustein>[0],
        TENANT_ID,
        BAUSTEIN_ID,
        {}
      );

      expect(result.error).toBe("Keine Felder zum Aktualisieren");
    });
  });

  // -- deactivateBaustein (Soft-Delete) --

  describe("deactivateBaustein", () => {
    it("sollte einen Baustein deaktivieren", async () => {
      const mockClient = createMockClient();
      mockClient.setResult("text_bausteine", { data: null, error: null });

      const result = await deactivateBaustein(
        mockClient as unknown as Parameters<typeof deactivateBaustein>[0],
        TENANT_ID,
        BAUSTEIN_ID
      );

      expect(result.error).toBeNull();
      expect(writeAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "textbaustein.deaktiviert",
        })
      );
    });

    it("sollte Fehler bei DB-Fehler zurueckgeben", async () => {
      const mockClient = createMockClient();
      mockClient.setResult("text_bausteine", {
        data: null,
        error: { message: "update error" },
      });

      const result = await deactivateBaustein(
        mockClient as unknown as Parameters<typeof deactivateBaustein>[0],
        TENANT_ID,
        BAUSTEIN_ID
      );

      expect(result.error).toBeTruthy();
    });
  });
});
