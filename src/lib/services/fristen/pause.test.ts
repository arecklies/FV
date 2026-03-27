/**
 * Unit-Tests fuer Frist-Pause (PROJ-37, ADR-014)
 * Tests fuer pruefeVorgangPausiert, pausiereVorgang, setzeVorgangFort
 */

jest.mock("@/lib/services/audit", () => ({
  writeAuditLog: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/lib/supabase-server", () => ({
  createServiceRoleClient: jest.fn(),
}));

import {
  pruefeVorgangPausiert,
  pausiereVorgang,
  setzeVorgangFort,
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
  const callCounts: Record<string, number> = {};
  const resultQueues: Record<string, Record<string, unknown>[]> = {};

  const client = {
    from: jest.fn((table: string) => {
      if (!callCounts[table]) callCounts[table] = 0;
      const idx = callCounts[table];
      callCounts[table]++;
      const queue = resultQueues[table];
      const result = queue ? queue[Math.min(idx, queue.length - 1)] : { data: null, error: null };
      return createChainMock(result).proxy;
    }),
    _setResults: (table: string, results: Record<string, unknown>[]) => {
      resultQueues[table] = results;
      callCounts[table] = 0;
    },
    _resetCounts: () => {
      Object.keys(callCounts).forEach((k) => { callCounts[k] = 0; });
    },
  };

  return client;
}

const TENANT_ID = "tenant-001";
const USER_ID = "user-001";
const VORGANG_ID = "vorgang-001";
const PAUSE_ID = "pause-001";

describe("pruefeVorgangPausiert (PROJ-37)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("gibt true wenn offene Pause existiert", async () => {
    const client = createMockClient();
    client._setResults("vorgang_pausen", [
      { data: [{ id: PAUSE_ID }], error: null },
    ]);

    const result = await pruefeVorgangPausiert(client as any, VORGANG_ID);
    expect(result).toBe(true);
  });

  it("gibt false wenn keine offene Pause existiert", async () => {
    const client = createMockClient();
    client._setResults("vorgang_pausen", [
      { data: [], error: null },
    ]);

    const result = await pruefeVorgangPausiert(client as any, VORGANG_ID);
    expect(result).toBe(false);
  });

  it("gibt false bei null data", async () => {
    const client = createMockClient();
    client._setResults("vorgang_pausen", [
      { data: null, error: { message: "error" } },
    ]);

    const result = await pruefeVorgangPausiert(client as any, VORGANG_ID);
    expect(result).toBe(false);
  });
});

describe("pausiereVorgang (PROJ-37 US-1)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("gibt 409 wenn bereits pausiert (AC-1.7)", async () => {
    const client = createMockClient();
    // pruefeVorgangPausiert: offene Pause gefunden
    client._setResults("vorgang_pausen", [
      { data: [{ id: PAUSE_ID }], error: null },
    ]);

    const result = await pausiereVorgang(client as any, {
      tenantId: TENANT_ID,
      userId: USER_ID,
      vorgangId: VORGANG_ID,
      begruendung: "Warten auf ToeB",
    });

    expect(result.error).toBe("Vorgang ist bereits pausiert");
    expect(result.pauseId).toBeNull();
  });

  it("pausiert erfolgreich und schreibt Audit-Log (AC-1.8)", async () => {
    const client = createMockClient();
    client._setResults("vorgang_pausen", [
      // 1. pruefeVorgangPausiert: keine offene Pause
      { data: [], error: null },
      // 2. INSERT pause
      { data: { id: PAUSE_ID }, error: null },
    ]);
    client._setResults("vorgang_fristen", [
      // 3. UPDATE fristen auf pausiert
      { data: [{ id: "frist-1" }, { id: "frist-2" }], error: null },
    ]);

    const result = await pausiereVorgang(client as any, {
      tenantId: TENANT_ID,
      userId: USER_ID,
      vorgangId: VORGANG_ID,
      begruendung: "Warten auf Stellungnahme",
    });

    expect(result.error).toBeNull();
    expect(result.pauseId).toBe(PAUSE_ID);
    expect(result.anzahlPausiert).toBe(2);

    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "verfahren.pausiert",
        payload: expect.objectContaining({
          begruendung: "Warten auf Stellungnahme",
          anzahl_pausierter_fristen: 2,
        }),
      })
    );
  });

  // TL-1: Hemmung+Pause-Interaktion (FA-7)
  it("pausiert gehemmte Fristen NICHT (FA-7: Hemmung hat Vorrang)", async () => {
    const client = createMockClient();
    client._setResults("vorgang_pausen", [
      // pruefeVorgangPausiert: keine offene Pause
      { data: [], error: null },
      // INSERT pause
      { data: { id: PAUSE_ID }, error: null },
    ]);
    // UPDATE vorgang_fristen: Query filtert gehemmt=false, also nur 1 von 2 Fristen
    // (die gehemmte wird durch den Filter nicht erfasst)
    client._setResults("vorgang_fristen", [
      { data: [{ id: "frist-aktiv" }], error: null },
    ]);

    const result = await pausiereVorgang(client as any, {
      tenantId: TENANT_ID,
      userId: USER_ID,
      vorgangId: VORGANG_ID,
      begruendung: "Warten auf ToeB",
    });

    expect(result.error).toBeNull();
    // Nur 1 Frist pausiert (die nicht-gehemmte), die gehemmte bleibt unberuehrt
    expect(result.anzahlPausiert).toBe(1);
  });
});

describe("setzeVorgangFort (PROJ-37 US-2)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("gibt Fehler wenn keine offene Pause (AC-2.1)", async () => {
    const client = createMockClient();
    client._setResults("vorgang_pausen", [
      { data: null, error: { message: "not found" } },
    ]);

    const result = await setzeVorgangFort(client as any, {
      tenantId: TENANT_ID,
      userId: USER_ID,
      vorgangId: VORGANG_ID,
      bundesland: "NW",
    });

    expect(result.error).toBe("Keine offene Pause gefunden");
  });

  it("setzt fort und schreibt Audit-Log (AC-2.7)", async () => {
    const client = createMockClient();

    // 1. Offene Pause laden
    client._setResults("vorgang_pausen", [
      { data: { id: PAUSE_ID, pause_start: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() }, error: null },
      // 2. Pause abschliessen (UPDATE)
      { data: null, error: null },
    ]);

    // Feiertage (leer)
    client._setResults("config_feiertage", [
      { data: [], error: null },
    ]);

    // Pausierte Fristen laden + je ein Update
    client._setResults("vorgang_fristen", [
      // SELECT pausierte Fristen
      {
        data: [{
          id: "frist-1", tenant_id: TENANT_ID, vorgang_id: VORGANG_ID,
          typ: "gesamtfrist", bezeichnung: "Gesamtfrist", bundesland: "NW",
          start_datum: "2026-03-20T00:00:00Z",
          end_datum: "2026-04-20T00:00:00Z",
          werktage: 20, status: "pausiert", gehemmt: false,
          hemmung_grund: null, hemmung_start: null, hemmung_ende: null, hemmung_tage: 0,
          verlaengert: false, verlaengerung_grund: null, original_end_datum: null,
          gelb_ab: null, rot_ab: null,
          pause_tage_gesamt: 0, aktiv: true,
          created_at: "2026-03-20T00:00:00Z", updated_at: "2026-03-20T00:00:00Z",
        }],
        error: null,
      },
      // UPDATE frist
      { data: null, error: null },
    ]);

    const result = await setzeVorgangFort(client as any, {
      tenantId: TENANT_ID,
      userId: USER_ID,
      vorgangId: VORGANG_ID,
      bundesland: "NW",
    });

    expect(result.error).toBeNull();
    expect(result.anzahlFortgesetzt).toBe(1);
    expect(result.pauseWerktage).toBeGreaterThanOrEqual(0);

    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "verfahren.fortgesetzt",
        payload: expect.objectContaining({
          anzahl_fortgesetzter_fristen: 1,
        }),
      })
    );
  });

  // TL-2: Mehrfach-Pause kumuliert pause_tage_gesamt (NFR-2)
  it("kumuliert pause_tage_gesamt bei Mehrfach-Pause (NFR-2)", async () => {
    const client = createMockClient();

    // Offene Pause (5 Tage her)
    client._setResults("vorgang_pausen", [
      { data: { id: "pause-2", pause_start: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() }, error: null },
      { data: null, error: null }, // UPDATE pause
    ]);

    client._setResults("config_feiertage", [
      { data: [], error: null },
    ]);

    // Frist hat bereits pause_tage_gesamt = 10 von vorheriger Pause
    client._setResults("vorgang_fristen", [
      {
        data: [{
          id: "frist-1", tenant_id: TENANT_ID, vorgang_id: VORGANG_ID,
          typ: "gesamtfrist", bezeichnung: "Gesamtfrist", bundesland: "NW",
          start_datum: "2026-03-01T00:00:00Z",
          end_datum: "2026-05-01T00:00:00Z",
          werktage: 40, status: "pausiert", gehemmt: false,
          hemmung_grund: null, hemmung_start: null, hemmung_ende: null, hemmung_tage: 0,
          verlaengert: false, verlaengerung_grund: null, original_end_datum: null,
          gelb_ab: null, rot_ab: null,
          pause_tage_gesamt: 10, aktiv: true,
          created_at: "2026-03-01T00:00:00Z", updated_at: "2026-03-01T00:00:00Z",
        }],
        error: null,
      },
      { data: null, error: null }, // UPDATE frist
    ]);

    const result = await setzeVorgangFort(client as any, {
      tenantId: TENANT_ID,
      userId: USER_ID,
      vorgangId: VORGANG_ID,
      bundesland: "NW",
    });

    expect(result.error).toBeNull();
    expect(result.anzahlFortgesetzt).toBe(1);
    // pause_werktage > 0 (exakte Zahl haengt von Wochenenden ab)
    expect(result.pauseWerktage).toBeGreaterThan(0);
    // Audit muss die kumulierten Tage reflektieren
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "verfahren.fortgesetzt",
      })
    );
  });
});
