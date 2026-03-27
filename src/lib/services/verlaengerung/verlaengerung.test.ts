/**
 * Unit-Tests für VerlaengerungService (PROJ-48)
 *
 * Mock-Pattern: Supabase Fluent-API-Chain gemäß fristen.test.ts.
 */

// -- Mocks muessen VOR den Imports stehen (jest.mock hoisting) --

jest.mock("@/lib/services/audit", () => ({
  writeAuditLog: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/lib/services/user-resolver", () => ({
  resolveUserEmails: jest.fn().mockResolvedValue(new Map([
    ["user-1", "sb@behoerde.de"],
  ])),
}));

jest.mock("@/lib/supabase-server", () => ({
  createServiceRoleClient: jest.fn(),
}));

import { createVerlaengerung, getVerlaengerungen, setGeltungsdauerBeiZustellung } from "./index";
import { writeAuditLog } from "@/lib/services/audit";

// -- Hilfsfunktionen für Supabase-Mock --

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

describe("VerlaengerungService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createVerlaengerung", () => {
    it("sollte Verlängerung erstellen wenn alle Bedingungen erfüllt sind", async () => {
      const geltungsdauerBis = new Date();
      geltungsdauerBis.setFullYear(geltungsdauerBis.getFullYear() + 1);

      // Mock: Vorgang laden
      const vorgangChain = createChainMock({
        data: {
          id: "vorgang-1",
          tenant_id: "tenant-1",
          workflow_schritt_id: "abgeschlossen",
          geltungsdauer_bis: geltungsdauerBis.toISOString(),
          verfahrensart_id: "va-1",
        },
        error: null,
      });

      // Mock: Verfahrensart laden
      const vaChain = createChainMock({
        data: { kategorie: "genehmigung" },
        error: null,
      });

      // Mock: Insert Verlängerung
      const insertChain = createChainMock({
        data: { id: "verl-1" },
        error: null,
      });

      // Mock: Update Vorgang
      const updateChain = createChainMock({ data: null, error: null });

      let fromCallCount = 0;
      const mockClient = {
        from: jest.fn().mockImplementation((table: string) => {
          if (table === "vorgaenge") {
            fromCallCount++;
            if (fromCallCount === 1) return vorgangChain.proxy;
            return updateChain.proxy;
          }
          if (table === "config_verfahrensarten") return vaChain.proxy;
          if (table === "vorgang_verlaengerungen") return insertChain.proxy;
          return createChainMock().proxy;
        }),
      };

      const result = await createVerlaengerung(mockClient as never, {
        tenantId: "tenant-1",
        userId: "user-1",
        vorgangId: "vorgang-1",
        antragsdatum: "2026-03-27",
        begruendung: "Bauherr benötigt mehr Planungszeit",
        verlaengerungTage: 365,
      });

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data!.id).toBe("verl-1");
      expect(writeAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: "geltungsdauer.verlaengert" })
      );
    });

    it("sollte ablehnen wenn Vorgang nicht abgeschlossen ist", async () => {
      const vorgangChain = createChainMock({
        data: {
          id: "vorgang-1",
          tenant_id: "tenant-1",
          workflow_schritt_id: "pruefung",
          geltungsdauer_bis: null,
          verfahrensart_id: "va-1",
        },
        error: null,
      });

      const mockClient = {
        from: jest.fn().mockReturnValue(vorgangChain.proxy),
      };

      const result = await createVerlaengerung(mockClient as never, {
        tenantId: "tenant-1",
        userId: "user-1",
        vorgangId: "vorgang-1",
        antragsdatum: "2026-03-27",
        begruendung: "Bauherr benötigt mehr Planungszeit",
        verlaengerungTage: 365,
      });

      expect(result.error).toBe("Verlängerung nur für abgeschlossene Vorgänge möglich");
      expect(result.data).toBeNull();
    });

    it("sollte ablehnen wenn Geltungsdauer bereits abgelaufen", async () => {
      const abgelaufen = new Date();
      abgelaufen.setDate(abgelaufen.getDate() - 1);

      const vorgangChain = createChainMock({
        data: {
          id: "vorgang-1",
          tenant_id: "tenant-1",
          workflow_schritt_id: "abgeschlossen",
          geltungsdauer_bis: abgelaufen.toISOString(),
          verfahrensart_id: "va-1",
        },
        error: null,
      });

      const vaChain = createChainMock({
        data: { kategorie: "genehmigung" },
        error: null,
      });

      const mockClient = {
        from: jest.fn().mockImplementation((table: string) => {
          if (table === "vorgaenge") return vorgangChain.proxy;
          if (table === "config_verfahrensarten") return vaChain.proxy;
          return createChainMock().proxy;
        }),
      };

      const result = await createVerlaengerung(mockClient as never, {
        tenantId: "tenant-1",
        userId: "user-1",
        vorgangId: "vorgang-1",
        antragsdatum: "2026-03-27",
        begruendung: "Bauherr benötigt mehr Planungszeit",
        verlaengerungTage: 365,
      });

      expect(result.error).toBe("Genehmigung ist bereits erloschen — Verlängerung nicht mehr möglich");
    });

    it("sollte ablehnen bei Kenntnisgabeverfahren", async () => {
      const geltungsdauerBis = new Date();
      geltungsdauerBis.setFullYear(geltungsdauerBis.getFullYear() + 1);

      const vorgangChain = createChainMock({
        data: {
          id: "vorgang-1",
          tenant_id: "tenant-1",
          workflow_schritt_id: "abgeschlossen",
          geltungsdauer_bis: geltungsdauerBis.toISOString(),
          verfahrensart_id: "va-kg",
        },
        error: null,
      });

      const vaChain = createChainMock({
        data: { kategorie: "kenntnisgabe" },
        error: null,
      });

      const mockClient = {
        from: jest.fn().mockImplementation((table: string) => {
          if (table === "vorgaenge") return vorgangChain.proxy;
          if (table === "config_verfahrensarten") return vaChain.proxy;
          return createChainMock().proxy;
        }),
      };

      const result = await createVerlaengerung(mockClient as never, {
        tenantId: "tenant-1",
        userId: "user-1",
        vorgangId: "vorgang-1",
        antragsdatum: "2026-03-27",
        begruendung: "Bauherr benötigt mehr Planungszeit",
        verlaengerungTage: 365,
      });

      expect(result.error).toBe("Kenntnisgabeverfahren haben keine verlängerbare Geltungsdauer");
    });
  });

  describe("getVerlaengerungen", () => {
    it("sollte Verlängerungshistorie mit E-Mails zurückgeben", async () => {
      const listChain = createChainMock({
        data: [{
          id: "verl-1",
          tenant_id: "tenant-1",
          vorgang_id: "vorgang-1",
          altes_datum: "2029-03-27T00:00:00.000Z",
          neues_datum: "2030-03-27T00:00:00.000Z",
          antragsdatum: "2026-03-27",
          begruendung: "Planungszeit",
          verlaengerung_tage: 365,
          sachbearbeiter_id: "user-1",
          created_at: "2026-03-27T10:00:00.000Z",
        }],
        error: null,
      });

      const mockClient = {
        from: jest.fn().mockReturnValue(listChain.proxy),
      };

      const result = await getVerlaengerungen(mockClient as never, "tenant-1", "vorgang-1");

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(1);
      expect(result.data[0].sachbearbeiter_email).toBe("sb@behoerde.de");
    });
  });

  describe("setGeltungsdauerBeiZustellung", () => {
    it("sollte Geltungsdauer setzen bei Genehmigungsverfahren", async () => {
      const vaChain = createChainMock({
        data: { kategorie: "genehmigung" },
        error: null,
      });

      const configChain = createChainMock({
        data: { kalendertage: 1095 },
        error: null,
      });

      const updateChain = createChainMock({ data: null, error: null });

      let fromCallCount = 0;
      const mockClient = {
        from: jest.fn().mockImplementation((table: string) => {
          if (table === "config_verfahrensarten") return vaChain.proxy;
          if (table === "config_fristen") return configChain.proxy;
          if (table === "vorgaenge") return updateChain.proxy;
          return createChainMock().proxy;
        }),
      };

      await setGeltungsdauerBeiZustellung(
        mockClient as never,
        "tenant-1",
        "user-1",
        "vorgang-1",
        "va-1",
        "NW"
      );

      expect(writeAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: "geltungsdauer.gesetzt" })
      );
    });

    it("sollte bei Kenntnisgabe keine Geltungsdauer setzen", async () => {
      const vaChain = createChainMock({
        data: { kategorie: "kenntnisgabe" },
        error: null,
      });

      const mockClient = {
        from: jest.fn().mockReturnValue(vaChain.proxy),
      };

      await setGeltungsdauerBeiZustellung(
        mockClient as never,
        "tenant-1",
        "user-1",
        "vorgang-1",
        "va-kg",
        "BW"
      );

      // Audit-Log sollte NICHT aufgerufen worden sein
      expect(writeAuditLog).not.toHaveBeenCalled();
    });
  });
});
