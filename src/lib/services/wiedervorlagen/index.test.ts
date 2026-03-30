/**
 * Unit-Tests fuer WiedervorlagenService (PROJ-53)
 *
 * Mock-Pattern: Supabase Fluent-API-Chain gemaess fristen.test.ts.
 * writeAuditLog wird als no-op gemockt.
 */

// -- Mocks muessen VOR den Imports stehen (jest.mock hoisting) --

jest.mock("@/lib/services/audit", () => ({
  writeAuditLog: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/lib/supabase-server", () => ({
  createServiceRoleClient: jest.fn(),
}));

import {
  createWiedervorlage,
  listWiedervorlagen,
  listFaelligeWiedervorlagen,
  erledigeWiedervorlage,
  deleteWiedervorlage,
} from "./index";
import { writeAuditLog } from "@/lib/services/audit";

// -- Hilfsfunktionen fuer Supabase-Mock --

function createChainMock(resolveValue: Record<string, any> = { data: null, error: null }) {
  const chain: Record<string, jest.Mock> = {};
  const self = new Proxy(chain, {
    get(_target, prop: string) {
      if (prop === "then" || prop === "catch" || prop === "finally") {
        const promise = Promise.resolve(resolveValue);
        return (promise as any)[prop].bind(promise);
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
  const fromMap = new Map<string, { proxy: any; chain: Record<string, jest.Mock> }>();

  const mockFrom = jest.fn((table: string) => {
    if (!fromMap.has(table)) {
      fromMap.set(table, createChainMock());
    }
    return fromMap.get(table)!.proxy;
  });

  return {
    from: mockFrom,
    setTableResult: (table: string, result: Record<string, any>) => {
      fromMap.set(table, createChainMock(result));
    },
    getTableChain: (table: string) => fromMap.get(table)?.chain,
  };
}

// -- Test-Fixtures --

const TENANT_ID = "tenant-53-test";
const USER_ID = "user-53-test";
const VORGANG_ID = "vorgang-53-test";

const MOCK_WIEDERVORLAGE = {
  id: "wv-1",
  tenant_id: TENANT_ID,
  vorgang_id: VORGANG_ID,
  user_id: USER_ID,
  faellig_am: "2026-04-15",
  betreff: "Stellungnahme Brandschutz nachfragen",
  notiz: null,
  erledigt_am: null,
  created_at: "2026-03-29T10:00:00Z",
  updated_at: "2026-03-29T10:00:00Z",
};

const MOCK_WIEDERVORLAGE_2 = {
  ...MOCK_WIEDERVORLAGE,
  id: "wv-2",
  faellig_am: "2026-04-20",
  betreff: "Unterlagen pruefen",
};

// -- Tests --

describe("WiedervorlagenService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── createWiedervorlage ────────────────────────────────────────────

  describe("createWiedervorlage", () => {
    it("sollte eine Wiedervorlage anlegen (Happy Path)", async () => {
      const mock = createMockClient();

      // Mock liefert count=0 (unter Limit) UND data fuer insert
      mock.setTableResult("wiedervorlagen", {
        data: MOCK_WIEDERVORLAGE,
        error: null,
        count: 0,
      });

      const result = await createWiedervorlage(
        mock as unknown as Parameters<typeof createWiedervorlage>[0],
        TENANT_ID,
        USER_ID,
        VORGANG_ID,
        { faellig_am: "2026-04-15", betreff: "Stellungnahme Brandschutz nachfragen" }
      );

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data!.id).toBe("wv-1");
      expect(result.data!.betreff).toBe("Stellungnahme Brandschutz nachfragen");
      expect(mock.from).toHaveBeenCalledWith("wiedervorlagen");
    });

    it("sollte bei 20 offenen Wiedervorlagen ablehnen (Limit-Test)", async () => {
      const mock = createMockClient();
      mock.setTableResult("wiedervorlagen", { data: null, error: null, count: 20 });

      const result = await createWiedervorlage(
        mock as unknown as Parameters<typeof createWiedervorlage>[0],
        TENANT_ID,
        USER_ID,
        VORGANG_ID,
        { faellig_am: "2026-04-15", betreff: "Nummer 21" }
      );

      expect(result.error).toContain("Maximal 20");
      expect(result.data).toBeNull();
    });

    it("sollte bei 21 offenen Wiedervorlagen ablehnen", async () => {
      const mock = createMockClient();
      mock.setTableResult("wiedervorlagen", { data: null, error: null, count: 21 });

      const result = await createWiedervorlage(
        mock as unknown as Parameters<typeof createWiedervorlage>[0],
        TENANT_ID,
        USER_ID,
        VORGANG_ID,
        { faellig_am: "2026-04-15", betreff: "Nummer 22" }
      );

      expect(result.error).toContain("Maximal 20");
      expect(result.data).toBeNull();
    });

    it("sollte Audit-Log schreiben bei Erfolg", async () => {
      const mock = createMockClient();
      // Count returns 0, insert returns the inserted row
      mock.setTableResult("wiedervorlagen", {
        data: MOCK_WIEDERVORLAGE,
        error: null,
        count: 0,
      });

      await createWiedervorlage(
        mock as unknown as Parameters<typeof createWiedervorlage>[0],
        TENANT_ID,
        USER_ID,
        VORGANG_ID,
        { faellig_am: "2026-04-15", betreff: "Stellungnahme Brandschutz nachfragen" }
      );

      // writeAuditLog is called after successful insert
      // Since mock returns same result for count and insert, and count=0 passes the limit check,
      // the insert path runs and audit log should be called
      expect(writeAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: TENANT_ID,
          userId: USER_ID,
          action: "wiedervorlage.created",
          resourceType: "wiedervorlage",
        })
      );
    });
  });

  // ── listWiedervorlagen ─────────────────────────────────────────────

  describe("listWiedervorlagen", () => {
    it("sollte alle Wiedervorlagen eines Users fuer einen Vorgang laden", async () => {
      const mock = createMockClient();
      mock.setTableResult("wiedervorlagen", {
        data: [MOCK_WIEDERVORLAGE, MOCK_WIEDERVORLAGE_2],
        error: null,
      });

      const result = await listWiedervorlagen(
        mock as unknown as Parameters<typeof listWiedervorlagen>[0],
        TENANT_ID,
        USER_ID,
        VORGANG_ID
      );

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(2);
      expect(result.data[0].id).toBe("wv-1");
      expect(result.data[1].id).toBe("wv-2");
    });

    it("sollte leere Liste zurueckgeben bei keinen Wiedervorlagen", async () => {
      const mock = createMockClient();
      mock.setTableResult("wiedervorlagen", { data: [], error: null });

      const result = await listWiedervorlagen(
        mock as unknown as Parameters<typeof listWiedervorlagen>[0],
        TENANT_ID,
        USER_ID,
        VORGANG_ID
      );

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(0);
    });

    it("sollte Fehler weiterreichen bei DB-Fehler", async () => {
      const mock = createMockClient();
      mock.setTableResult("wiedervorlagen", {
        data: null,
        error: { message: "DB connection lost" },
      });

      const result = await listWiedervorlagen(
        mock as unknown as Parameters<typeof listWiedervorlagen>[0],
        TENANT_ID,
        USER_ID,
        VORGANG_ID
      );

      expect(result.error).toBe("DB connection lost");
      expect(result.data).toHaveLength(0);
    });
  });

  // ── listFaelligeWiedervorlagen ─────────────────────────────────────

  describe("listFaelligeWiedervorlagen", () => {
    it("sollte faellige Wiedervorlagen mit Vorgang-Aktenzeichen laden", async () => {
      const mock = createMockClient();
      mock.setTableResult("wiedervorlagen", {
        data: [
          {
            ...MOCK_WIEDERVORLAGE,
            vorgaenge: {
              aktenzeichen: "AZ-2026-001",
              bezeichnung: "Neubau Einfamilienhaus",
            },
          },
        ],
        error: null,
      });

      const result = await listFaelligeWiedervorlagen(
        mock as unknown as Parameters<typeof listFaelligeWiedervorlagen>[0],
        TENANT_ID,
        USER_ID,
        5
      );

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(1);
      expect(result.data[0].vorgang_aktenzeichen).toBe("AZ-2026-001");
      expect(result.data[0].vorgang_bezeichnung).toBe("Neubau Einfamilienhaus");
      expect(result.data[0].wiedervorlage.id).toBe("wv-1");
    });

    it("sollte leere Liste bei keinen faelligen Wiedervorlagen zurueckgeben", async () => {
      const mock = createMockClient();
      mock.setTableResult("wiedervorlagen", { data: [], error: null });

      const result = await listFaelligeWiedervorlagen(
        mock as unknown as Parameters<typeof listFaelligeWiedervorlagen>[0],
        TENANT_ID,
        USER_ID,
        5
      );

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(0);
    });
  });

  // ── erledigeWiedervorlage ──────────────────────────────────────────

  describe("erledigeWiedervorlage", () => {
    it("sollte erledigt_am setzen", async () => {
      const mock = createMockClient();
      const erledigteWv = {
        ...MOCK_WIEDERVORLAGE,
        erledigt_am: "2026-03-29T14:00:00Z",
      };
      mock.setTableResult("wiedervorlagen", { data: erledigteWv, error: null });

      const result = await erledigeWiedervorlage(
        mock as unknown as Parameters<typeof erledigeWiedervorlage>[0],
        TENANT_ID,
        USER_ID,
        "wv-1"
      );

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data!.erledigt_am).toBe("2026-03-29T14:00:00Z");
    });

    it("sollte Fehler zurueckgeben wenn Wiedervorlage nicht gefunden", async () => {
      const mock = createMockClient();
      mock.setTableResult("wiedervorlagen", {
        data: null,
        error: { message: "No rows found" },
      });

      const result = await erledigeWiedervorlage(
        mock as unknown as Parameters<typeof erledigeWiedervorlage>[0],
        TENANT_ID,
        USER_ID,
        "wv-nonexistent"
      );

      expect(result.error).toBe("Wiedervorlage nicht gefunden oder bereits erledigt");
      expect(result.data).toBeNull();
    });
  });

  // ── deleteWiedervorlage ────────────────────────────────────────────

  describe("deleteWiedervorlage", () => {
    it("sollte Wiedervorlage loeschen und Audit-Log schreiben", async () => {
      const mock = createMockClient();
      mock.setTableResult("wiedervorlagen", {
        data: { id: "wv-1", vorgang_id: VORGANG_ID, betreff: "Test" },
        error: null,
      });

      const result = await deleteWiedervorlage(
        mock as unknown as Parameters<typeof deleteWiedervorlage>[0],
        TENANT_ID,
        USER_ID,
        "wv-1"
      );

      expect(result.error).toBeNull();
      expect(writeAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: TENANT_ID,
          userId: USER_ID,
          action: "wiedervorlage.deleted",
          resourceType: "wiedervorlage",
          resourceId: "wv-1",
        })
      );
    });

    it("sollte Fehler zurueckgeben wenn Wiedervorlage nicht gefunden", async () => {
      const mock = createMockClient();
      mock.setTableResult("wiedervorlagen", {
        data: null,
        error: { message: "No rows found" },
      });

      const result = await deleteWiedervorlage(
        mock as unknown as Parameters<typeof deleteWiedervorlage>[0],
        TENANT_ID,
        USER_ID,
        "wv-nonexistent"
      );

      expect(result.error).toBe("Wiedervorlage nicht gefunden");
    });
  });
});
