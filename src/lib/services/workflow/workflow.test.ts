/**
 * Unit-Tests fuer WorkflowService (PROJ-3, ADR-011)
 *
 * Bestehende Tests: getSchritt, getVerfuegbareAktionen (synchron)
 * Neue Tests: getWorkflowDefinition, executeWorkflowAktion, getWorkflowHistorie (async, Supabase-Mocks)
 */

// -- Mocks --

jest.mock("@/lib/services/audit", () => ({
  writeAuditLog: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/lib/supabase-server", () => ({
  createServiceRoleClient: jest.fn(),
}));

import {
  getSchritt,
  getVerfuegbareAktionen,
  getWorkflowDefinition,
  executeWorkflowAktion,
  getWorkflowHistorie,
  isZurueckweisungsAktion,
} from "./index";
import { writeAuditLog } from "@/lib/services/audit";
import type { WorkflowDefinition, WorkflowSchrittHistorie } from "./types";

// -- Supabase Chain-Mock (gleiche Helfer wie verfahren.test.ts) --

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
    setResult(table: string, result: Record<string, any>) {
      fromMap.set(table, createChainMock(result));
    },
  };
}

// -- Testdaten --

const testWorkflow: WorkflowDefinition = {
  name: "Test-Workflow",
  version: 1,
  initialStatus: "eingegangen",
  schritte: [
    {
      id: "eingegangen",
      label: "Antrag eingegangen",
      typ: "automatisch",
      naechsteSchritte: ["pruefung"],
      aktionen: [
        { id: "weiter", label: "Weiter", ziel: "pruefung" },
      ],
      hinweis: "Vorgang wurde angelegt.",
    },
    {
      id: "pruefung",
      label: "Fachliche Prüfung",
      typ: "manuell",
      naechsteSchritte: ["bescheid", "ablehnung"],
      aktionen: [
        { id: "genehmigen", label: "Genehmigung empfehlen", ziel: "bescheid" },
        { id: "ablehnen", label: "Ablehnung empfehlen", ziel: "ablehnung" },
      ],
    },
    {
      id: "bescheid",
      label: "Bescheid erstellen",
      typ: "manuell",
      naechsteSchritte: ["freizeichnung"],
      aktionen: [
        { id: "fertig", label: "Fertig", ziel: "freizeichnung" },
      ],
    },
    {
      id: "freizeichnung",
      label: "Freizeichnung",
      typ: "freigabe",
      minRolle: "referatsleiter",
      naechsteSchritte: ["abgeschlossen", "bescheid"],
      aktionen: [
        { id: "freigeben", label: "Freizeichnen", ziel: "abgeschlossen" },
        { id: "zurueckweisen", label: "Zur Überarbeitung", ziel: "bescheid" },
      ],
    },
    {
      id: "abgeschlossen",
      label: "Abgeschlossen",
      typ: "endstatus",
      naechsteSchritte: [],
      aktionen: [],
    },
    {
      id: "ablehnung",
      label: "Abgelehnt",
      typ: "endstatus",
      naechsteSchritte: [],
      aktionen: [],
    },
  ],
};

const TENANT_ID = "t-001";
const USER_ID = "u-001";
const VORGANG_ID = "v-001";

// =====================================================================
// Bestehende Tests (synchron)
// =====================================================================

describe("getSchritt", () => {
  it("findet vorhandenen Schritt", () => {
    const schritt = getSchritt(testWorkflow, "pruefung");
    expect(schritt).toBeDefined();
    expect(schritt?.label).toBe("Fachliche Prüfung");
  });

  it("gibt undefined bei unbekanntem Schritt", () => {
    expect(getSchritt(testWorkflow, "unbekannt")).toBeUndefined();
  });
});

describe("getVerfuegbareAktionen", () => {
  it("liefert Aktionen fuer manuellen Schritt", () => {
    const result = getVerfuegbareAktionen(testWorkflow, "pruefung", "sachbearbeiter");
    expect(result.aktionen).toHaveLength(2);
    expect(result.aktionen[0].id).toBe("genehmigen");
    expect(result.aktionen[1].id).toBe("ablehnen");
  });

  it("verweigert Freigabe-Aktionen fuer Sachbearbeiter", () => {
    const result = getVerfuegbareAktionen(testWorkflow, "freizeichnung", "sachbearbeiter");
    expect(result.aktionen).toHaveLength(0);
    expect(result.schritt?.typ).toBe("freigabe");
  });

  it("erlaubt Freigabe-Aktionen fuer Referatsleiter", () => {
    const result = getVerfuegbareAktionen(testWorkflow, "freizeichnung", "referatsleiter");
    expect(result.aktionen).toHaveLength(2);
    expect(result.aktionen[0].id).toBe("freigeben");
    expect(result.aktionen[1].id).toBe("zurueckweisen");
  });

  it("erlaubt Freigabe-Aktionen fuer Tenant-Admin (hoehere Rolle)", () => {
    const result = getVerfuegbareAktionen(testWorkflow, "freizeichnung", "tenant_admin");
    expect(result.aktionen).toHaveLength(2);
  });

  it("gibt leere Aktionen fuer Endstatus", () => {
    const result = getVerfuegbareAktionen(testWorkflow, "abgeschlossen", "sachbearbeiter");
    expect(result.aktionen).toHaveLength(0);
  });

  it("gibt leere Aktionen fuer unbekannten Schritt", () => {
    const result = getVerfuegbareAktionen(testWorkflow, "unbekannt", "sachbearbeiter");
    expect(result.aktionen).toHaveLength(0);
    expect(result.schritt).toBeNull();
  });
});

// =====================================================================
// Neue Tests (async, Supabase-Mocks)
// =====================================================================

describe("getWorkflowDefinition", () => {
  beforeEach(() => jest.clearAllMocks());

  it("gibt WorkflowDefinition zurueck wenn gefunden", async () => {
    const client = createMockClient();
    client.setResult("config_workflows", { data: { definition: testWorkflow } });

    const result = await getWorkflowDefinition(client as any, "va-001", "NW");

    expect(result).not.toBeNull();
    expect(result!.name).toBe("Test-Workflow");
    expect(result!.schritte).toHaveLength(6);
    expect(client.from).toHaveBeenCalledWith("config_workflows");
  });

  it("gibt null zurueck wenn keine Definition existiert", async () => {
    const client = createMockClient();
    client.setResult("config_workflows", { data: null });

    const result = await getWorkflowDefinition(client as any, "va-999", "XX");

    expect(result).toBeNull();
  });
});

describe("executeWorkflowAktion", () => {
  beforeEach(() => jest.clearAllMocks());

  const baseParams = {
    tenantId: TENANT_ID,
    userId: USER_ID,
    userRole: "sachbearbeiter" as const,
    vorgangId: VORGANG_ID,
    aktuellerSchrittId: "eingegangen",
    aktionId: "weiter",
    verfahrensartId: "va-001",
    bundesland: "NW",
  };

  it("fuehrt Workflow-Aktion aus (Happy Path)", async () => {
    const callCounts: Record<string, number> = {};
    const resolveQueue: Record<string, any[]> = {
      config_workflows: [{ data: { definition: testWorkflow } }],
      vorgaenge: [{ error: null }],
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

    const result = await executeWorkflowAktion({ from: mockFrom } as any, baseParams);

    expect(result.neuerSchrittId).toBe("pruefung");
    expect(result.error).toBeNull();
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "vorgang.workflow_schritt",
        payload: expect.objectContaining({ von: "eingegangen", nach: "pruefung" }),
      })
    );
  });

  it("gibt Fehler wenn keine Workflow-Definition gefunden", async () => {
    const client = createMockClient();
    client.setResult("config_workflows", { data: null });

    const result = await executeWorkflowAktion(client as any, baseParams);

    expect(result.neuerSchrittId).toBeNull();
    expect(result.error).toBe("Keine Workflow-Definition gefunden");
  });

  it("gibt Fehler wenn Aktion nicht verfuegbar", async () => {
    const client = createMockClient();
    client.setResult("config_workflows", { data: { definition: testWorkflow } });

    const result = await executeWorkflowAktion(client as any, {
      ...baseParams,
      aktionId: "nicht-vorhanden",
    });

    expect(result.neuerSchrittId).toBeNull();
    expect(result.error).toBe("Diese Aktion ist nicht verfügbar");
  });

  it("gibt Fehler wenn aktueller Schritt nicht existiert", async () => {
    const client = createMockClient();
    client.setResult("config_workflows", { data: { definition: testWorkflow } });

    const result = await executeWorkflowAktion(client as any, {
      ...baseParams,
      aktuellerSchrittId: "unbekannt",
    });

    expect(result.neuerSchrittId).toBeNull();
    expect(result.error).toBe("Aktueller Workflow-Schritt nicht gefunden");
  });

  it("verweigert Freigabe-Aktion fuer Sachbearbeiter", async () => {
    const client = createMockClient();
    client.setResult("config_workflows", { data: { definition: testWorkflow } });

    const result = await executeWorkflowAktion(client as any, {
      ...baseParams,
      aktuellerSchrittId: "freizeichnung",
      aktionId: "freigeben",
      userRole: "sachbearbeiter",
    });

    // Sachbearbeiter hat keine Aktionen im Freigabe-Schritt
    expect(result.neuerSchrittId).toBeNull();
    expect(result.error).toBe("Diese Aktion ist nicht verfügbar");
  });

  it("erlaubt Freigabe-Aktion fuer Referatsleiter", async () => {
    const callCounts: Record<string, number> = {};
    const resolveQueue: Record<string, any[]> = {
      config_workflows: [{ data: { definition: testWorkflow } }],
      vorgaenge: [{ error: null }],
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

    const result = await executeWorkflowAktion({ from: mockFrom } as any, {
      ...baseParams,
      aktuellerSchrittId: "freizeichnung",
      aktionId: "freigeben",
      userRole: "referatsleiter",
    });

    expect(result.neuerSchrittId).toBe("abgeschlossen");
    expect(result.error).toBeNull();
  });

  it("gibt Fehler bei DB-Update-Fehler zurueck", async () => {
    const callCounts: Record<string, number> = {};
    const resolveQueue: Record<string, any[]> = {
      config_workflows: [{ data: { definition: testWorkflow } }],
      vorgaenge: [{ error: { message: "permission denied" } }],
    };

    const mockFrom = jest.fn((table: string) => {
      if (!callCounts[table]) callCounts[table] = 0;
      const idx = callCounts[table];
      callCounts[table]++;
      const results = resolveQueue[table];
      const result = results ? results[Math.min(idx, results.length - 1)] : { data: null, error: null };
      return createChainMock(result).proxy;
    });

    const result = await executeWorkflowAktion({ from: mockFrom } as any, baseParams);

    expect(result.neuerSchrittId).toBeNull();
    expect(result.error).toBe("permission denied");
  });

  it("loggt Workflow-Schritt-Insert-Fehler ohne abzubrechen", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    const callCounts: Record<string, number> = {};
    const resolveQueue: Record<string, any[]> = {
      config_workflows: [{ data: { definition: testWorkflow } }],
      vorgaenge: [{ error: null }],
      vorgang_workflow_schritte: [{ error: { message: "FK violation" } }],
    };

    const mockFrom = jest.fn((table: string) => {
      if (!callCounts[table]) callCounts[table] = 0;
      const idx = callCounts[table];
      callCounts[table]++;
      const results = resolveQueue[table];
      const result = results ? results[Math.min(idx, results.length - 1)] : { data: null, error: null };
      return createChainMock(result).proxy;
    });

    const result = await executeWorkflowAktion({ from: mockFrom } as any, baseParams);

    // Aktion soll trotzdem erfolgreich sein
    expect(result.neuerSchrittId).toBe("pruefung");
    expect(result.error).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith(
      "[PROJ-3] Workflow-Schritt-Insert fehlgeschlagen",
      "FK violation"
    );

    consoleSpy.mockRestore();
  });
});

// =====================================================================
// PROJ-33: Vier-Augen-Lite Tests
// =====================================================================

describe("isZurueckweisungsAktion", () => {
  it("erkennt Zurueckweisungs-Aktion anhand der ID", () => {
    expect(isZurueckweisungsAktion({ id: "zurueckweisen", label: "Zurück", ziel: "bescheid" })).toBe(true);
    expect(isZurueckweisungsAktion({ id: "zur_zurueckweisung", label: "Zurück", ziel: "bescheid" })).toBe(true);
  });

  it("erkennt Nicht-Zurueckweisungs-Aktionen", () => {
    expect(isZurueckweisungsAktion({ id: "freigeben", label: "Freigeben", ziel: "zustellung" })).toBe(false);
    expect(isZurueckweisungsAktion({ id: "weiter", label: "Weiter", ziel: "pruefung" })).toBe(false);
  });
});

describe("executeWorkflowAktion — PROJ-33 Begruendungspflicht", () => {
  beforeEach(() => jest.clearAllMocks());

  const freigabeParams = {
    tenantId: TENANT_ID,
    userId: USER_ID,
    userRole: "referatsleiter" as const,
    vorgangId: VORGANG_ID,
    aktuellerSchrittId: "freizeichnung",
    aktionId: "zurueckweisen",
    verfahrensartId: "va-001",
    bundesland: "NW",
  };

  function createFreigabeMockFrom() {
    const callCounts: Record<string, number> = {};
    const resolveQueue: Record<string, any[]> = {
      config_workflows: [{ data: { definition: testWorkflow } }],
      vorgaenge: [{ error: null }],
      vorgang_workflow_schritte: [{ error: null }],
    };

    return jest.fn((table: string) => {
      if (!callCounts[table]) callCounts[table] = 0;
      const idx = callCounts[table];
      callCounts[table]++;
      const results = resolveQueue[table];
      const result = results ? results[Math.min(idx, results.length - 1)] : { data: null, error: null };
      return createChainMock(result).proxy;
    });
  }

  it("verweigert Zurueckweisung ohne Begruendung", async () => {
    const mockFrom = createFreigabeMockFrom();

    const result = await executeWorkflowAktion({ from: mockFrom } as any, {
      ...freigabeParams,
      begruendung: undefined,
    });

    expect(result.neuerSchrittId).toBeNull();
    expect(result.error).toBe("Begründung ist Pflicht bei Zurückweisung (mindestens 10 Zeichen)");
  });

  it("verweigert Zurueckweisung mit zu kurzer Begruendung", async () => {
    const mockFrom = createFreigabeMockFrom();

    const result = await executeWorkflowAktion({ from: mockFrom } as any, {
      ...freigabeParams,
      begruendung: "Kurz",
    });

    expect(result.neuerSchrittId).toBeNull();
    expect(result.error).toBe("Begründung ist Pflicht bei Zurückweisung (mindestens 10 Zeichen)");
  });

  it("verweigert Zurueckweisung mit Leerzeichern unter 10 Zeichen", async () => {
    const mockFrom = createFreigabeMockFrom();

    const result = await executeWorkflowAktion({ from: mockFrom } as any, {
      ...freigabeParams,
      begruendung: "   ab   ", // trim() = "ab" = 2 Zeichen
    });

    expect(result.neuerSchrittId).toBeNull();
    expect(result.error).toBe("Begründung ist Pflicht bei Zurückweisung (mindestens 10 Zeichen)");
  });

  it("erlaubt Zurueckweisung mit ausreichender Begruendung", async () => {
    const mockFrom = createFreigabeMockFrom();

    const result = await executeWorkflowAktion({ from: mockFrom } as any, {
      ...freigabeParams,
      begruendung: "Bescheid muss überarbeitet werden, Absatz 3 fehlt.",
    });

    expect(result.neuerSchrittId).toBe("bescheid");
    expect(result.error).toBeNull();
  });

  it("erfordert keine Begruendung bei Freigabe (nicht-zurueckweisend)", async () => {
    const mockFrom = createFreigabeMockFrom();

    const result = await executeWorkflowAktion({ from: mockFrom } as any, {
      ...freigabeParams,
      aktionId: "freigeben",
      begruendung: undefined,
    });

    expect(result.neuerSchrittId).toBe("abgeschlossen");
    expect(result.error).toBeNull();
  });

  it("schreibt Begruendung in Audit-Log bei Zurueckweisung (AC-3)", async () => {
    const mockFrom = createFreigabeMockFrom();
    const begruendung = "Formfehler in Absatz 2, bitte korrigieren";

    await executeWorkflowAktion({ from: mockFrom } as any, {
      ...freigabeParams,
      begruendung,
    });

    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "vorgang.workflow_schritt",
        payload: expect.objectContaining({
          aktion: "zurueckweisen",
          begruendung,
        }),
      })
    );
  });

  it("schreibt begruendung=null in Audit-Log bei Freigabe ohne Begruendung", async () => {
    const mockFrom = createFreigabeMockFrom();

    await executeWorkflowAktion({ from: mockFrom } as any, {
      ...freigabeParams,
      aktionId: "freigeben",
      begruendung: undefined,
    });

    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          aktion: "freigeben",
          begruendung: null,
        }),
      })
    );
  });
});

describe("getWorkflowHistorie", () => {
  beforeEach(() => jest.clearAllMocks());

  it("gibt Workflow-Historie zurueck (Happy Path)", async () => {
    const mockHistorie: WorkflowSchrittHistorie[] = [
      {
        id: "wh-001",
        vorgang_id: VORGANG_ID,
        schritt_id: "eingegangen",
        aktion_id: null,
        begruendung: null,
        uebersprungen: false,
        ausgefuehrt_von: USER_ID,
        ausgefuehrt_am: "2026-03-26T10:00:00Z",
      },
      {
        id: "wh-002",
        vorgang_id: VORGANG_ID,
        schritt_id: "pruefung",
        aktion_id: "weiter",
        begruendung: null,
        uebersprungen: false,
        ausgefuehrt_von: USER_ID,
        ausgefuehrt_am: "2026-03-26T11:00:00Z",
      },
    ];

    const client = createMockClient();
    client.setResult("vorgang_workflow_schritte", { data: mockHistorie, error: null });

    const result = await getWorkflowHistorie(client as any, TENANT_ID, VORGANG_ID);

    expect(result.data).toHaveLength(2);
    expect(result.data[0].schritt_id).toBe("eingegangen");
    expect(result.data[1].aktion_id).toBe("weiter");
    expect(result.error).toBeNull();
  });

  it("gibt leere Liste bei Fehler zurueck", async () => {
    const client = createMockClient();
    client.setResult("vorgang_workflow_schritte", {
      data: null,
      error: { message: "connection timeout" },
    });

    const result = await getWorkflowHistorie(client as any, TENANT_ID, VORGANG_ID);

    expect(result.data).toEqual([]);
    expect(result.error).toBe("connection timeout");
  });
});
