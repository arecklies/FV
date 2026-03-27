/**
 * Unit-Tests fuer VerfahrenService (PROJ-3)
 *
 * Mock-Pattern: Supabase Fluent-API-Chain wird als verschachteltes Objekt gemockt.
 * writeAuditLog wird als no-op gemockt.
 */

// -- Mocks muessen VOR den Imports stehen (jest.mock hoisting) --

jest.mock("@/lib/services/audit", () => ({
  writeAuditLog: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/lib/supabase-server", () => ({
  createServiceRoleClient: jest.fn(),
}));

jest.mock("@/lib/services/user-resolver", () => ({
  resolveUserEmails: jest.fn().mockResolvedValue(new Map([["u-001", "mueller@freiburg.de"]])),
}));

import {
  listVerfahrensarten,
  getVerfahrensart,
  createVorgang,
  listVorgaenge,
  getVorgaengeStatistik,
  getVorgang,
  updateVorgang,
  softDeleteVorgang,
  zuweiseVorgang,
  listKommentare,
  createKommentar,
} from "./index";
import { writeAuditLog } from "@/lib/services/audit";
import { resolveUserEmails } from "@/lib/services/user-resolver";
import type { Verfahrensart, Vorgang, VorgangListItem, VorgangKommentar } from "./types";

// -- Hilfsfunktionen fuer Supabase-Mock --

/**
 * Erzeugt ein chainbares Mock-Objekt das die Supabase Fluent-API simuliert.
 * Jede Methode gibt dasselbe Objekt zurueck, bis resolveValue das Ergebnis setzt.
 */
function createChainMock(resolveValue: Record<string, any> = { data: null, error: null }) {
  const chain: Record<string, jest.Mock> = {};
  const self = new Proxy(chain, {
    get(_target, prop: string) {
      if (prop === "then" || prop === "catch" || prop === "finally") {
        // Mache das Objekt "thenable", damit await funktioniert
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
    /**
     * Setzt das Ergebnis fuer einen bestimmten Tabellennamen.
     * Muss VOR dem Aufruf der zu testenden Funktion aufgerufen werden.
     */
    setResult(table: string, result: Record<string, any>) {
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

const MOCK_VERFAHRENSART: Verfahrensart = {
  id: "va-001",
  bundesland: "NW",
  kuerzel: "BG",
  bezeichnung: "Baugenehmigung",
  kategorie: "genehmigungsverfahren",
  sortierung: 1,
  rechtsgrundlage: "§ 64 BauO NRW",
};

const MOCK_VORGANG: Vorgang = {
  id: VORGANG_ID,
  tenant_id: TENANT_ID,
  aktenzeichen: "2026/0001/BG",
  verfahrensart_id: "va-001",
  bundesland: "NW",
  bauherr_name: "Max Mustermann",
  bauherr_anschrift: "Musterstr. 1",
  bauherr_telefon: null,
  bauherr_email: null,
  grundstueck_adresse: "Baustr. 5",
  grundstueck_flurstueck: null,
  grundstueck_gemarkung: null,
  bezeichnung: "Neubau EFH",
  workflow_schritt_id: "eingegangen",
  zustaendiger_user_id: USER_ID,
  eingangsdatum: "2026-03-26T00:00:00Z",
  created_by: USER_ID,
  created_at: "2026-03-26T00:00:00Z",
  updated_at: "2026-03-26T00:00:00Z",
  deleted_at: null,
  version: 1,
  extra_felder: {},
};

const MOCK_KOMMENTAR: VorgangKommentar = {
  id: "k-001",
  vorgang_id: VORGANG_ID,
  autor_user_id: USER_ID,
  inhalt: "Unterlagen vollständig.",
  created_at: "2026-03-26T10:00:00Z",
};

// -- Tests --

describe("listVerfahrensarten", () => {
  beforeEach(() => jest.clearAllMocks());

  it("gibt Verfahrensarten zurueck (Happy Path)", async () => {
    const client = createMockClient();
    client.setResult("config_verfahrensarten", { data: [MOCK_VERFAHRENSART], error: null });

    const result = await listVerfahrensarten(client as any, "NW");

    expect(result.data).toHaveLength(1);
    expect(result.data![0].kuerzel).toBe("BG");
    expect(result.error).toBeNull();
    expect(client.from).toHaveBeenCalledWith("config_verfahrensarten");
  });

  it("gibt Fehler bei DB-Fehler zurueck", async () => {
    const client = createMockClient();
    client.setResult("config_verfahrensarten", {
      data: null,
      error: { message: "connection refused" },
    });

    const result = await listVerfahrensarten(client as any, "NW");

    expect(result.data).toBeNull();
    expect(result.error).toBe("connection refused");
  });
});

describe("getVerfahrensart", () => {
  beforeEach(() => jest.clearAllMocks());

  it("gibt Verfahrensart zurueck wenn gefunden", async () => {
    const client = createMockClient();
    client.setResult("config_verfahrensarten", { data: MOCK_VERFAHRENSART });

    const result = await getVerfahrensart(client as any, "va-001");

    expect(result).not.toBeNull();
    expect(result!.kuerzel).toBe("BG");
  });

  it("gibt null zurueck wenn nicht gefunden", async () => {
    const client = createMockClient();
    client.setResult("config_verfahrensarten", { data: null });

    const result = await getVerfahrensart(client as any, "nicht-vorhanden");

    expect(result).toBeNull();
  });
});

describe("createVorgang", () => {
  beforeEach(() => jest.clearAllMocks());

  it("erstellt Vorgang mit generiertem Aktenzeichen (Happy Path)", async () => {
    // Wir brauchen einen Client, der auf verschiedene .from()-Aufrufe
    // unterschiedlich reagiert. Da createVorgang mehrere Tabellen aufruft,
    // verwenden wir einen speziellen Mock.
    const resolveQueue: Record<string, any[]> = {
      config_verfahrensarten: [{ data: MOCK_VERFAHRENSART }],
      tenants: [{ data: { settings: {}, bundesland: "NW" } }],
      vorgaenge: [
        // 1. Aufruf: select max aktenzeichen
        { data: [] },
        // 2. Aufruf: insert
        { data: MOCK_VORGANG, error: null },
      ],
      vorgang_workflow_schritte: [{ error: null }],
    };

    const callCounts: Record<string, number> = {};

    const mockFrom = jest.fn((table: string) => {
      if (!callCounts[table]) callCounts[table] = 0;
      const idx = callCounts[table];
      callCounts[table]++;

      const results = resolveQueue[table];
      const result = results ? results[Math.min(idx, results.length - 1)] : { data: null, error: null };

      return createChainMock(result).proxy;
    });

    const client = { from: mockFrom } as any;

    const result = await createVorgang(client, {
      tenantId: TENANT_ID,
      userId: USER_ID,
      verfahrensart_id: "va-001",
      bauherr_name: "Max Mustermann",
      grundstueck_adresse: "Baustr. 5",
    });

    expect(result.error).toBeNull();
    expect(result.data).not.toBeNull();
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "vorgang.created" })
    );
  });

  it("gibt Fehler zurueck wenn Verfahrensart nicht gefunden", async () => {
    const client = createMockClient();
    client.setResult("config_verfahrensarten", { data: null });

    const result = await createVorgang(client as any, {
      tenantId: TENANT_ID,
      userId: USER_ID,
      verfahrensart_id: "nicht-vorhanden",
      bauherr_name: "Test",
    });

    expect(result.error).toBe("Verfahrensart nicht gefunden");
    expect(result.data).toBeNull();
  });

  it("fuehrt Retry bei UNIQUE Constraint Violation (23505) durch", async () => {
    const callCounts: Record<string, number> = {};

    const resolveQueue: Record<string, any[]> = {
      config_verfahrensarten: [{ data: MOCK_VERFAHRENSART }],
      tenants: [{ data: { settings: {}, bundesland: "NW" } }],
      vorgaenge: [
        // 1. select max - Attempt 1
        { data: [] },
        // 2. insert - UNIQUE violation
        { data: null, error: { code: "23505", message: "unique violation" } },
        // 3. select max - Attempt 2
        { data: [{ aktenzeichen: "2026/0001/BG" }] },
        // 4. insert - Erfolg
        { data: MOCK_VORGANG, error: null },
      ],
      vorgang_workflow_schritte: [{ error: null }],
    };

    const mockFrom = jest.fn((table: string) => {
      if (!callCounts[table]) callCounts[table] = 0;
      const idx = callCounts[table];
      callCounts[table]++;
      const results = resolveQueue[table];
      const result = results ? results[Math.min(idx, results.length - 1)] : { data: null, error: null };
      return createChainMock(result).proxy;
    });

    const client = { from: mockFrom } as any;

    const result = await createVorgang(client, {
      tenantId: TENANT_ID,
      userId: USER_ID,
      verfahrensart_id: "va-001",
      bauherr_name: "Test",
    });

    expect(result.error).toBeNull();
    expect(result.data).not.toBeNull();
    // vorgaenge muss mindestens 3x aufgerufen worden sein (2 selects + 2 inserts = 4)
    expect(callCounts["vorgaenge"]).toBeGreaterThanOrEqual(3);
  });

  it("gibt Fehler nach MAX_RETRIES UNIQUE Violations zurueck", async () => {
    const callCounts: Record<string, number> = {};

    const resolveQueue: Record<string, any[]> = {
      config_verfahrensarten: [{ data: MOCK_VERFAHRENSART }],
      tenants: [{ data: { settings: {}, bundesland: "NW" } }],
      // Alle 3 Attempts schlagen mit UNIQUE violation fehl
      vorgaenge: [
        { data: [] },
        { data: null, error: { code: "23505", message: "unique violation" } },
        { data: [] },
        { data: null, error: { code: "23505", message: "unique violation" } },
        { data: [] },
        { data: null, error: { code: "23505", message: "unique violation" } },
      ],
    };

    const mockFrom = jest.fn((table: string) => {
      if (!callCounts[table]) callCounts[table] = 0;
      const idx = callCounts[table];
      callCounts[table]++;
      const results = resolveQueue[table];
      const result = results ? results[Math.min(idx, results.length - 1)] : { data: null, error: null };
      return createChainMock(result).proxy;
    });

    const client = { from: mockFrom } as any;

    const result = await createVorgang(client, {
      tenantId: TENANT_ID,
      userId: USER_ID,
      verfahrensart_id: "va-001",
      bauherr_name: "Test",
    });

    // Nach 3 Retries: letzter UNIQUE-Fehler wird zurueckgegeben
    expect(result.error).toBe("unique violation");
    expect(result.data).toBeNull();
  });

  it("protokolliert Workflow-Schritt-Fehler ohne abzubrechen", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    const callCounts: Record<string, number> = {};

    const resolveQueue: Record<string, any[]> = {
      config_verfahrensarten: [{ data: MOCK_VERFAHRENSART }],
      tenants: [{ data: { settings: {}, bundesland: "NW" } }],
      vorgaenge: [
        { data: [] },
        { data: MOCK_VORGANG, error: null },
      ],
      vorgang_workflow_schritte: [{ error: { message: "insert failed" } }],
    };

    const mockFrom = jest.fn((table: string) => {
      if (!callCounts[table]) callCounts[table] = 0;
      const idx = callCounts[table];
      callCounts[table]++;
      const results = resolveQueue[table];
      const result = results ? results[Math.min(idx, results.length - 1)] : { data: null, error: null };
      return createChainMock(result).proxy;
    });

    const client = { from: mockFrom } as any;

    const result = await createVorgang(client, {
      tenantId: TENANT_ID,
      userId: USER_ID,
      verfahrensart_id: "va-001",
      bauherr_name: "Test",
    });

    // Vorgang soll trotzdem erstellt worden sein
    expect(result.error).toBeNull();
    expect(result.data).not.toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith(
      "[PROJ-3] Workflow-Schritt-Insert fehlgeschlagen",
      "insert failed"
    );

    consoleSpy.mockRestore();
  });
});

describe("listVorgaenge", () => {
  beforeEach(() => jest.clearAllMocks());

  it("gibt Vorgangsliste mit Paginierung zurueck (Happy Path)", async () => {
    const client = createMockClient();
    const listItems: VorgangListItem[] = [
      {
        id: VORGANG_ID,
        aktenzeichen: "2026/0001/BG",
        bauherr_name: "Max Mustermann",
        grundstueck_adresse: "Baustr. 5",
        bezeichnung: "Neubau EFH",
        workflow_schritt_id: "eingegangen",
        zustaendiger_user_id: USER_ID,
        eingangsdatum: "2026-03-26T00:00:00Z",
        verfahrensart_id: "va-001",
      },
    ];
    client.setResult("vorgaenge", { data: listItems, count: 1, error: null });

    const result = await listVorgaenge(client as any, { tenantId: TENANT_ID });

    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.error).toBeNull();
  });

  it("wendet Filter an (status, verfahrensart_id, zustaendiger_user_id)", async () => {
    const client = createMockClient();
    client.setResult("vorgaenge", { data: [], count: 0, error: null });

    await listVorgaenge(client as any, {
      tenantId: TENANT_ID,
      status: "pruefung",
      verfahrensart_id: "va-001",
      zustaendiger_user_id: USER_ID,
    });

    // Pruefe dass from aufgerufen wurde
    expect(client.from).toHaveBeenCalledWith("vorgaenge");
  });

  it("wendet Volltextsuche an", async () => {
    const client = createMockClient();
    client.setResult("vorgaenge", { data: [], count: 0, error: null });

    await listVorgaenge(client as any, {
      tenantId: TENANT_ID,
      suche: "Mustermann",
    });

    expect(client.from).toHaveBeenCalledWith("vorgaenge");
  });

  it("wendet Sortierung und Paginierung an", async () => {
    const client = createMockClient();
    client.setResult("vorgaenge", { data: [], count: 0, error: null });

    await listVorgaenge(client as any, {
      tenantId: TENANT_ID,
      sortierung: "aktenzeichen",
      richtung: "asc",
      seite: 2,
      pro_seite: 10,
    });

    expect(client.from).toHaveBeenCalledWith("vorgaenge");
  });

  it("gibt leere Liste bei Fehler zurueck", async () => {
    const client = createMockClient();
    client.setResult("vorgaenge", { data: null, count: null, error: { message: "timeout" } });

    const result = await listVorgaenge(client as any, { tenantId: TENANT_ID });

    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.error).toBe("timeout");
  });
});

describe("getVorgang", () => {
  beforeEach(() => jest.clearAllMocks());

  it("gibt Vorgang zurueck wenn gefunden", async () => {
    const client = createMockClient();
    client.setResult("vorgaenge", { data: MOCK_VORGANG, error: null });

    const result = await getVorgang(client as any, TENANT_ID, VORGANG_ID);

    expect(result.data).not.toBeNull();
    expect(result.data!.aktenzeichen).toBe("2026/0001/BG");
    expect(result.error).toBeNull();
  });

  it("gibt Fehler zurueck wenn nicht gefunden", async () => {
    const client = createMockClient();
    client.setResult("vorgaenge", {
      data: null,
      error: { message: "Row not found" },
    });

    const result = await getVorgang(client as any, TENANT_ID, "nicht-vorhanden");

    expect(result.data).toBeNull();
    expect(result.error).toBe("Row not found");
  });
});

describe("updateVorgang", () => {
  beforeEach(() => jest.clearAllMocks());

  it("aktualisiert Vorgang (Happy Path)", async () => {
    const updatedVorgang = { ...MOCK_VORGANG, bauherr_name: "Erika Mustermann", version: 2 };
    const client = createMockClient();
    client.setResult("vorgaenge", { data: updatedVorgang, error: null });

    const result = await updateVorgang(client as any, {
      tenantId: TENANT_ID,
      userId: USER_ID,
      vorgangId: VORGANG_ID,
      version: 1,
      updates: { bauherr_name: "Erika Mustermann" },
    });

    expect(result.data).not.toBeNull();
    expect(result.data!.bauherr_name).toBe("Erika Mustermann");
    expect(result.conflict).toBe(false);
    expect(result.error).toBeNull();
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "vorgang.updated" })
    );
  });

  it("erkennt Optimistic Locking Conflict (PGRST116)", async () => {
    const client = createMockClient();
    client.setResult("vorgaenge", {
      data: null,
      error: { code: "PGRST116", message: "no rows returned" },
    });

    const result = await updateVorgang(client as any, {
      tenantId: TENANT_ID,
      userId: USER_ID,
      vorgangId: VORGANG_ID,
      version: 1,
      updates: { bauherr_name: "Erika" },
    });

    expect(result.data).toBeNull();
    expect(result.conflict).toBe(true);
    expect(result.error).toContain("zwischenzeitlich");
    expect(writeAuditLog).not.toHaveBeenCalled();
  });

  it("gibt generischen Fehler bei sonstigen DB-Fehlern zurueck", async () => {
    const client = createMockClient();
    client.setResult("vorgaenge", {
      data: null,
      error: { code: "42P01", message: "relation does not exist" },
    });

    const result = await updateVorgang(client as any, {
      tenantId: TENANT_ID,
      userId: USER_ID,
      vorgangId: VORGANG_ID,
      version: 1,
      updates: { bauherr_name: "Test" },
    });

    expect(result.conflict).toBe(false);
    expect(result.error).toBe("relation does not exist");
  });
});

describe("softDeleteVorgang", () => {
  beforeEach(() => jest.clearAllMocks());

  it("setzt deleted_at (Happy Path)", async () => {
    const client = createMockClient();
    client.setResult("vorgaenge", { error: null });

    const result = await softDeleteVorgang(client as any, TENANT_ID, USER_ID, VORGANG_ID);

    expect(result.error).toBeNull();
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "vorgang.deleted", resourceId: VORGANG_ID })
    );
  });

  it("gibt Fehler bei DB-Fehler zurueck", async () => {
    const client = createMockClient();
    client.setResult("vorgaenge", { error: { message: "permission denied" } });

    const result = await softDeleteVorgang(client as any, TENANT_ID, USER_ID, VORGANG_ID);

    expect(result.error).toBe("permission denied");
    expect(writeAuditLog).not.toHaveBeenCalled();
  });
});

describe("zuweiseVorgang", () => {
  beforeEach(() => jest.clearAllMocks());

  it("weist Vorgang neuem Benutzer zu (Happy Path)", async () => {
    const callCounts: Record<string, number> = {};
    const resolveQueue: Record<string, any[]> = {
      tenant_members: [{ data: { user_id: "u-002" } }],
      vorgaenge: [{ error: null }],
    };

    const mockFrom = jest.fn((table: string) => {
      if (!callCounts[table]) callCounts[table] = 0;
      const idx = callCounts[table];
      callCounts[table]++;
      const results = resolveQueue[table];
      const result = results ? results[Math.min(idx, results.length - 1)] : { data: null, error: null };
      return createChainMock(result).proxy;
    });

    const result = await zuweiseVorgang(
      { from: mockFrom } as any,
      TENANT_ID,
      USER_ID,
      VORGANG_ID,
      "u-002"
    );

    expect(result.error).toBeNull();
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "vorgang.zugewiesen",
        payload: { neuer_zustaendiger: "u-002" },
      })
    );
  });

  it("verweigert Zuweisung wenn Zielbenutzer nicht im Tenant", async () => {
    const client = createMockClient();
    client.setResult("tenant_members", { data: null });

    const result = await zuweiseVorgang(
      client as any,
      TENANT_ID,
      USER_ID,
      VORGANG_ID,
      "u-fremd"
    );

    expect(result.error).toBe("Zielbenutzer gehört nicht zum selben Mandanten");
    expect(writeAuditLog).not.toHaveBeenCalled();
  });
});

describe("listKommentare", () => {
  beforeEach(() => jest.clearAllMocks());

  it("gibt Kommentarliste mit autor_email zurueck (PROJ-47 US-1)", async () => {
    const client = createMockClient();
    client.setResult("vorgang_kommentare", {
      data: [MOCK_KOMMENTAR],
      error: null,
    });

    const result = await listKommentare(client as any, TENANT_ID, VORGANG_ID);

    expect(result.data).toHaveLength(1);
    expect(result.data[0].inhalt).toBe("Unterlagen vollständig.");
    expect(result.data[0].autor_email).toBe("mueller@freiburg.de");
    expect(result.error).toBeNull();
    expect(resolveUserEmails).toHaveBeenCalledWith(
      expect.anything(),
      [USER_ID]
    );
  });

  it("setzt autor_email auf null wenn E-Mail nicht auflösbar (AC-3)", async () => {
    (resolveUserEmails as jest.Mock).mockResolvedValueOnce(new Map());
    const client = createMockClient();
    client.setResult("vorgang_kommentare", {
      data: [MOCK_KOMMENTAR],
      error: null,
    });

    const result = await listKommentare(client as any, TENANT_ID, VORGANG_ID);

    expect(result.data[0].autor_email).toBeNull();
  });

  it("gibt leere Liste bei Fehler zurueck", async () => {
    const client = createMockClient();
    client.setResult("vorgang_kommentare", {
      data: null,
      error: { message: "timeout" },
    });

    const result = await listKommentare(client as any, TENANT_ID, VORGANG_ID);

    expect(result.data).toEqual([]);
    expect(result.error).toBe("timeout");
  });
});

describe("createKommentar", () => {
  beforeEach(() => jest.clearAllMocks());

  it("erstellt Kommentar (Happy Path)", async () => {
    const client = createMockClient();
    client.setResult("vorgang_kommentare", { data: MOCK_KOMMENTAR, error: null });

    const result = await createKommentar(
      client as any,
      TENANT_ID,
      USER_ID,
      VORGANG_ID,
      "Unterlagen vollständig."
    );

    expect(result.data).not.toBeNull();
    expect(result.data!.inhalt).toBe("Unterlagen vollständig.");
    expect(result.error).toBeNull();
  });

  it("gibt Fehler bei DB-Fehler zurueck", async () => {
    const client = createMockClient();
    client.setResult("vorgang_kommentare", {
      data: null,
      error: { message: "violates FK constraint" },
    });

    const result = await createKommentar(
      client as any,
      TENANT_ID,
      USER_ID,
      VORGANG_ID,
      "Test"
    );

    expect(result.data).toBeNull();
    expect(result.error).toBe("violates FK constraint");
  });
});

describe("getVorgaengeStatistik (PROJ-47 US-3)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("berechnet Statistik korrekt (Happy Path)", async () => {
    const callCounts: Record<string, number> = {};
    const resolveQueue: Record<string, any[]> = {
      vorgaenge: [
        // 1. Aufruf: count (head: true)
        { count: 3, error: null },
        // 2. Aufruf: select IDs
        { data: [{ id: "v-1" }, { id: "v-2" }, { id: "v-3" }] },
      ],
      vorgang_fristen: [
        // Frist-Status-Batch
        {
          data: [
            { vorgang_id: "v-1", status: "gruen", end_datum: "2026-06-01T00:00:00.000Z" },
            { vorgang_id: "v-2", status: "gelb", end_datum: "2026-04-15T00:00:00.000Z" },
            { vorgang_id: "v-3", status: "rot", end_datum: "2026-04-01T00:00:00.000Z" },
          ],
        },
      ],
    };

    const mockFrom = jest.fn((table: string) => {
      if (!callCounts[table]) callCounts[table] = 0;
      const idx = callCounts[table];
      callCounts[table]++;
      const results = resolveQueue[table];
      const result = results ? results[Math.min(idx, results.length - 1)] : { data: null, error: null };
      return createChainMock(result).proxy;
    });

    const result = await getVorgaengeStatistik({ from: mockFrom } as any, TENANT_ID);

    expect(result.error).toBeNull();
    expect(result.data).toEqual({
      gesamt: 3,
      gefaehrdet: 2,    // gelb + rot
      ueberfaellig: 1,  // rot
      im_zeitplan: 1,    // gruen
    });
  });

  it("zählt Vorgänge ohne Frist als im_zeitplan", async () => {
    const callCounts: Record<string, number> = {};
    const resolveQueue: Record<string, any[]> = {
      vorgaenge: [
        { count: 2, error: null },
        { data: [{ id: "v-1" }, { id: "v-2" }] },
      ],
      vorgang_fristen: [
        { data: [] },  // keine Fristen
      ],
    };

    const mockFrom = jest.fn((table: string) => {
      if (!callCounts[table]) callCounts[table] = 0;
      const idx = callCounts[table];
      callCounts[table]++;
      const results = resolveQueue[table];
      const result = results ? results[Math.min(idx, results.length - 1)] : { data: null, error: null };
      return createChainMock(result).proxy;
    });

    const result = await getVorgaengeStatistik({ from: mockFrom } as any, TENANT_ID);

    expect(result.data.im_zeitplan).toBe(2);
    expect(result.data.gefaehrdet).toBe(0);
    expect(result.data.ueberfaellig).toBe(0);
  });

  it("gibt Nullen bei DB-Fehler zurueck", async () => {
    const client = createMockClient();
    client.setResult("vorgaenge", { count: null, error: { message: "timeout" } });

    const result = await getVorgaengeStatistik(client as any, TENANT_ID);

    expect(result.error).toBe("timeout");
    expect(result.data).toEqual({
      gesamt: 0,
      gefaehrdet: 0,
      ueberfaellig: 0,
      im_zeitplan: 0,
    });
  });

  it("klassifiziert dunkelrot als gefährdet UND überfällig", async () => {
    const callCounts: Record<string, number> = {};
    const resolveQueue: Record<string, any[]> = {
      vorgaenge: [
        { count: 1, error: null },
        { data: [{ id: "v-1" }] },
      ],
      vorgang_fristen: [
        { data: [{ vorgang_id: "v-1", status: "dunkelrot", end_datum: "2026-03-01T00:00:00.000Z" }] },
      ],
    };

    const mockFrom = jest.fn((table: string) => {
      if (!callCounts[table]) callCounts[table] = 0;
      const idx = callCounts[table];
      callCounts[table]++;
      const results = resolveQueue[table];
      const result = results ? results[Math.min(idx, results.length - 1)] : { data: null, error: null };
      return createChainMock(result).proxy;
    });

    const result = await getVorgaengeStatistik({ from: mockFrom } as any, TENANT_ID);

    expect(result.data.gefaehrdet).toBe(1);
    expect(result.data.ueberfaellig).toBe(1);
    expect(result.data.im_zeitplan).toBe(0);
  });
});
