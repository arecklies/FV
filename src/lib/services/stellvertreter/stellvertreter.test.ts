/**
 * Unit-Tests fuer StellvertreterService (PROJ-35, ADR-013)
 */

jest.mock("@/lib/services/audit", () => ({
  writeAuditLog: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/lib/supabase-server", () => ({
  createServiceRoleClient: jest.fn(),
}));

import {
  getStellvertreterFuer,
  getVertretungenVon,
  getAlleVertretungen,
  getVertreteneReferatsleiterIds,
  createVertretung,
  deleteVertretung,
} from "./index";
import { writeAuditLog } from "@/lib/services/audit";

// -- Supabase Chain-Mock --

function createChainMock(resolveValue: Record<string, unknown> = { data: null, error: null }) {
  const chain: Record<string, jest.Mock> = {};
  const self = new Proxy(chain, {
    get(_target, prop: string) {
      if (prop === "then" || prop === "catch" || prop === "finally") {
        const promise = Promise.resolve(resolveValue);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  const fromMap = new Map<string, { proxy: unknown; chain: Record<string, jest.Mock> }>();

  function getFrom(table: string, resolveValue?: Record<string, unknown>) {
    if (!fromMap.has(table)) {
      fromMap.set(table, createChainMock(resolveValue));
    }
    return fromMap.get(table)!;
  }

  const client = {
    from: jest.fn((table: string) => getFrom(table).proxy),
    _getFrom: getFrom,
    _setFromResult: (table: string, result: Record<string, unknown>) => {
      fromMap.set(table, createChainMock(result));
    },
  };

  return client;
}

const TENANT_ID = "tenant-001";
const USER_RL = "user-referatsleiter";
const USER_STV = "user-stellvertreter";
const VERTRETUNG_ID = "vertretung-001";

describe("StellvertreterService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getStellvertreterFuer", () => {
    it("gibt Stellvertreter eines Referatsleiters zurueck", async () => {
      const mockData = [
        { id: VERTRETUNG_ID, tenant_id: TENANT_ID, vertretener_id: USER_RL, stellvertreter_id: USER_STV, created_at: "2026-03-27T10:00:00Z" },
      ];
      const client = createMockClient();
      client._setFromResult("freigabe_stellvertreter", { data: mockData, error: null });

      const result = await getStellvertreterFuer(client as any, TENANT_ID, USER_RL);

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(1);
      expect(result.data[0].stellvertreter_id).toBe(USER_STV);
    });

    it("gibt leere Liste bei DB-Fehler zurueck", async () => {
      const client = createMockClient();
      client._setFromResult("freigabe_stellvertreter", { data: null, error: { message: "DB error" } });

      const result = await getStellvertreterFuer(client as any, TENANT_ID, USER_RL);

      expect(result.error).toBe("DB error");
      expect(result.data).toHaveLength(0);
    });
  });

  describe("getVertretungenVon", () => {
    it("gibt Vertretungen eines Stellvertreters zurueck", async () => {
      const mockData = [
        { id: VERTRETUNG_ID, tenant_id: TENANT_ID, vertretener_id: USER_RL, stellvertreter_id: USER_STV, created_at: "2026-03-27T10:00:00Z" },
      ];
      const client = createMockClient();
      client._setFromResult("freigabe_stellvertreter", { data: mockData, error: null });

      const result = await getVertretungenVon(client as any, TENANT_ID, USER_STV);

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(1);
      expect(result.data[0].vertretener_id).toBe(USER_RL);
    });

    it("gibt Fehler bei DB-Problem zurueck", async () => {
      const client = createMockClient();
      client._setFromResult("freigabe_stellvertreter", { data: null, error: { message: "connection failed" } });

      const result = await getVertretungenVon(client as any, TENANT_ID, USER_STV);

      expect(result.error).toBe("connection failed");
      expect(result.data).toHaveLength(0);
    });
  });

  describe("getAlleVertretungen", () => {
    it("gibt alle Vertretungen im Mandanten zurueck", async () => {
      const mockData = [
        { id: VERTRETUNG_ID, tenant_id: TENANT_ID, vertretener_id: USER_RL, stellvertreter_id: USER_STV, created_at: "2026-03-27T10:00:00Z" },
        { id: "vertretung-002", tenant_id: TENANT_ID, vertretener_id: "user-rl-2", stellvertreter_id: USER_STV, created_at: "2026-03-27T11:00:00Z" },
      ];
      const client = createMockClient();
      client._setFromResult("freigabe_stellvertreter", { data: mockData, error: null });

      const result = await getAlleVertretungen(client as any, TENANT_ID);

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(2);
    });

    it("gibt Fehler bei DB-Problem zurueck", async () => {
      const client = createMockClient();
      client._setFromResult("freigabe_stellvertreter", { data: null, error: { message: "timeout" } });

      const result = await getAlleVertretungen(client as any, TENANT_ID);

      expect(result.error).toBe("timeout");
    });
  });

  describe("getVertreteneReferatsleiterIds", () => {
    it("gibt IDs der vertretenen Referatsleiter zurueck", async () => {
      const client = createMockClient();
      client._setFromResult("freigabe_stellvertreter", {
        data: [{ vertretener_id: USER_RL }, { vertretener_id: "user-rl-2" }],
        error: null,
      });

      const ids = await getVertreteneReferatsleiterIds(client as any, TENANT_ID, USER_STV);

      expect(ids).toEqual([USER_RL, "user-rl-2"]);
    });

    it("gibt leere Liste wenn keine Vertretungen existieren", async () => {
      const client = createMockClient();
      client._setFromResult("freigabe_stellvertreter", { data: [], error: null });

      const ids = await getVertreteneReferatsleiterIds(client as any, TENANT_ID, USER_STV);

      expect(ids).toEqual([]);
    });
  });

  describe("createVertretung", () => {
    it("verhindert Selbstzuordnung (AC-1.6)", async () => {
      const client = createMockClient();

      const result = await createVertretung(client as any, {
        tenantId: TENANT_ID,
        vertretenerId: USER_RL,
        stellvertreterId: USER_RL,
        auditUserId: USER_RL,
      });

      expect(result.error).toBe("Selbstzuordnung ist nicht möglich");
      expect(result.data).toBeNull();
    });

    it("verhindert Stellvertreter mit zu niedriger Rolle (AC-1.2)", async () => {
      const client = createMockClient();
      client._setFromResult("tenant_members", {
        data: { role: "sachbearbeiter" },
        error: null,
      });

      const result = await createVertretung(client as any, {
        tenantId: TENANT_ID,
        vertretenerId: USER_RL,
        stellvertreterId: USER_STV,
        auditUserId: USER_RL,
      });

      expect(result.error).toBe("Stellvertreter muss mindestens Referatsleiter sein");
    });

    it("gibt Fehler wenn Stellvertreter nicht im Mandanten (AC-1.2)", async () => {
      const client = createMockClient();
      client._setFromResult("tenant_members", {
        data: null,
        error: null,
      });

      const result = await createVertretung(client as any, {
        tenantId: TENANT_ID,
        vertretenerId: USER_RL,
        stellvertreterId: "user-unbekannt",
        auditUserId: USER_RL,
      });

      expect(result.error).toBe("Stellvertreter nicht im Mandanten gefunden");
    });

    it("erstellt Vertretung erfolgreich und schreibt Audit-Log (AC-1.7)", async () => {
      const client = createMockClient();
      // tenant_members: Rollencheck
      client._setFromResult("tenant_members", {
        data: { role: "referatsleiter" },
        error: null,
      });
      // freigabe_stellvertreter: INSERT
      client._setFromResult("freigabe_stellvertreter", {
        data: {
          id: VERTRETUNG_ID,
          tenant_id: TENANT_ID,
          vertretener_id: USER_RL,
          stellvertreter_id: USER_STV,
          created_at: "2026-03-27T10:00:00Z",
        },
        error: null,
      });

      const result = await createVertretung(client as any, {
        tenantId: TENANT_ID,
        vertretenerId: USER_RL,
        stellvertreterId: USER_STV,
        auditUserId: USER_RL,
      });

      expect(result.error).toBeNull();
      expect(result.data?.id).toBe(VERTRETUNG_ID);
      expect(writeAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "vertretung.erstellt",
          resourceId: VERTRETUNG_ID,
        })
      );
    });

    it("erkennt Duplikatzuordnung (AC-1.5)", async () => {
      const client = createMockClient();
      client._setFromResult("tenant_members", {
        data: { role: "referatsleiter" },
        error: null,
      });
      client._setFromResult("freigabe_stellvertreter", {
        data: null,
        error: { code: "23505", message: "duplicate" },
      });

      const result = await createVertretung(client as any, {
        tenantId: TENANT_ID,
        vertretenerId: USER_RL,
        stellvertreterId: USER_STV,
        auditUserId: USER_RL,
      });

      expect(result.error).toBe("Diese Vertretungszuordnung existiert bereits");
    });
  });

  describe("deleteVertretung", () => {
    it("loescht Vertretung und schreibt Audit-Log", async () => {
      const client = createMockClient();
      // Bestehende Vertretung laden
      client._setFromResult("freigabe_stellvertreter", {
        data: { id: VERTRETUNG_ID, vertretener_id: USER_RL, stellvertreter_id: USER_STV },
        error: null,
      });

      const result = await deleteVertretung(client as any, {
        tenantId: TENANT_ID,
        vertretungId: VERTRETUNG_ID,
        auditUserId: USER_RL,
        auditAction: "vertretung.entfernt",
      });

      expect(result.error).toBeNull();
      expect(writeAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "vertretung.entfernt",
          resourceId: VERTRETUNG_ID,
        })
      );
    });

    it("gibt Fehler wenn Vertretung nicht existiert", async () => {
      const client = createMockClient();
      client._setFromResult("freigabe_stellvertreter", { data: null, error: null });

      const result = await deleteVertretung(client as any, {
        tenantId: TENANT_ID,
        vertretungId: "nicht-existent",
        auditUserId: USER_RL,
        auditAction: "vertretung.entfernt",
      });

      expect(result.error).toBe("Vertretung nicht gefunden");
    });
  });
});
