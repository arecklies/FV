/**
 * Unit-Tests fuer TagesansichtService (PROJ-29)
 *
 * Testet: ladeMeineFristen, ladeMeineAufgaben, ladeKuerzlichBearbeitet
 */

// -- Mocks --

jest.mock("@/lib/services/audit", () => ({
  writeAuditLog: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/lib/supabase-server", () => ({
  createServiceRoleClient: jest.fn(),
}));

import {
  ladeMeineFristen,
  ladeMeineAufgaben,
  ladeKuerzlichBearbeitet,
} from "./index";

// -- Supabase Chain-Mock --

function createChainMock(
  resolveValue: Record<string, any> = { data: null, error: null }
) {
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

/**
 * Erstellt einen Mock-Client der mehrere sequenzielle Aufrufe auf dieselbe Tabelle unterstuetzt.
 * setResult() fuegt ein Ergebnis in die Queue ein; jeder from()-Aufruf konsumiert das naechste.
 */
function createMockClient() {
  const resultQueues = new Map<string, Array<{ proxy: any; chain: Record<string, jest.Mock> }>>();

  const mockFrom = jest.fn((table: string) => {
    const queue = resultQueues.get(table) ?? [];
    // Erstes Element konsumieren, oder Fallback auf leere Antwort
    const entry = queue.shift() ?? createChainMock({ data: null, error: null });
    resultQueues.set(table, queue);
    return entry.proxy;
  });

  return {
    from: mockFrom,
    setResult(table: string, result: Record<string, any>) {
      const queue = resultQueues.get(table) ?? [];
      queue.push(createChainMock(result));
      resultQueues.set(table, queue);
    },
  };
}

// -- Testdaten --

const TENANT_ID = "t-001";
const USER_ID = "u-001";

const baseFrist = {
  id: "f-001",
  tenant_id: TENANT_ID,
  vorgang_id: "v-001",
  typ: "gesamtfrist",
  bezeichnung: "Bearbeitungsfrist",
  start_datum: "2026-03-01T00:00:00Z",
  end_datum: "2026-04-01T00:00:00Z",
  werktage: 20,
  bundesland: "BW",
  gelb_ab: null,
  rot_ab: null,
  status: "rot",
  gehemmt: false,
  hemmung_grund: null,
  hemmung_start: null,
  hemmung_ende: null,
  hemmung_tage: null,
  verlaengert: false,
  verlaengerung_grund: null,
  original_end_datum: null,
  pause_tage_gesamt: 0,
  aktiv: true,
  created_at: "2026-03-01T00:00:00Z",
  updated_at: "2026-03-01T00:00:00Z",
  vorgaenge: {
    aktenzeichen: "BW-2026-001",
    bezeichnung: "Neubau EFH",
    zustaendiger_user_id: USER_ID,
  },
};

const baseVorgang = {
  id: "v-001",
  aktenzeichen: "BW-2026-001",
  bauherr_name: "Testbauherr",
  grundstueck_adresse: "Teststr. 1",
  bezeichnung: "Neubau EFH",
  workflow_schritt_id: "pruefung",
  zustaendiger_user_id: USER_ID,
  eingangsdatum: "2026-03-15T00:00:00Z",
  verfahrensart_id: "va-001",
};

const workflowDefinition = {
  name: "Test-Workflow",
  version: 1,
  initialStatus: "eingegangen",
  schritte: [
    {
      id: "eingegangen",
      label: "Eingegangen",
      typ: "automatisch",
      naechsteSchritte: ["pruefung"],
      aktionen: [{ id: "weiter", label: "Weiter", ziel: "pruefung" }],
    },
    {
      id: "pruefung",
      label: "Pruefung",
      typ: "manuell",
      naechsteSchritte: ["abgeschlossen"],
      aktionen: [
        { id: "genehmigen", label: "Genehmigen", ziel: "abgeschlossen" },
      ],
    },
    {
      id: "abgeschlossen",
      label: "Abgeschlossen",
      typ: "endstatus",
      naechsteSchritte: [],
      aktionen: [],
    },
  ],
};

// -- Tests --

describe("TagesansichtService", () => {
  describe("ladeMeineFristen", () => {
    it("sollte gefaehrdete Fristen mit Vorgang-Referenz zurueckgeben", async () => {
      const client = createMockClient();
      client.setResult("vorgang_fristen", { data: [baseFrist], error: null });

      const result = await ladeMeineFristen(
        client as any,
        TENANT_ID,
        USER_ID
      );

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(1);
      expect(result.data[0].frist.id).toBe("f-001");
      expect(result.data[0].frist.status).toBe("rot");
      expect(result.data[0].vorgang_aktenzeichen).toBe("BW-2026-001");
      expect(result.data[0].vorgang_bezeichnung).toBe("Neubau EFH");
    });

    it("sollte leeres Array zurueckgeben wenn keine Fristen vorhanden", async () => {
      const client = createMockClient();
      client.setResult("vorgang_fristen", { data: [], error: null });

      const result = await ladeMeineFristen(
        client as any,
        TENANT_ID,
        USER_ID
      );

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(0);
    });

    it("sollte Fehler zurueckgeben bei DB-Fehler", async () => {
      const client = createMockClient();
      client.setResult("vorgang_fristen", {
        data: null,
        error: { message: "DB connection failed" },
      });

      const result = await ladeMeineFristen(
        client as any,
        TENANT_ID,
        USER_ID
      );

      expect(result.error).toBe("DB connection failed");
      expect(result.data).toHaveLength(0);
    });
  });

  describe("ladeMeineAufgaben", () => {
    it("sollte zugewiesene Vorgaenge zurueckgeben (nicht in Endstatus)", async () => {
      const client = createMockClient();
      // Zuerst: config_workflows fuer Endstatus-Ermittlung
      client.setResult("config_workflows", {
        data: [{ definition: workflowDefinition }],
        error: null,
      });
      // Dann: vorgaenge
      client.setResult("vorgaenge", { data: [baseVorgang], error: null });

      const result = await ladeMeineAufgaben(
        client as any,
        TENANT_ID,
        USER_ID
      );

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe("v-001");
      expect(result.data[0].aktenzeichen).toBe("BW-2026-001");
      expect(result.data[0].workflow_schritt_id).toBe("pruefung");
    });

    it("sollte leeres Array zurueckgeben wenn keine Aufgaben vorhanden", async () => {
      const client = createMockClient();
      client.setResult("config_workflows", {
        data: [{ definition: workflowDefinition }],
        error: null,
      });
      client.setResult("vorgaenge", { data: [], error: null });

      const result = await ladeMeineAufgaben(
        client as any,
        TENANT_ID,
        USER_ID
      );

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(0);
    });

    it("sollte auch ohne Workflow-Definitionen funktionieren", async () => {
      const client = createMockClient();
      // Keine Workflows gefunden
      client.setResult("config_workflows", { data: [], error: null });
      client.setResult("vorgaenge", { data: [baseVorgang], error: null });

      const result = await ladeMeineAufgaben(
        client as any,
        TENANT_ID,
        USER_ID
      );

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(1);
    });
  });

  describe("ladeKuerzlichBearbeitet", () => {
    it("sollte zuletzt bearbeitete Vorgaenge zurueckgeben (dedupliziert)", async () => {
      const client = createMockClient();

      // Historie-Eintraege (2 Eintraege fuer denselben Vorgang)
      client.setResult("workflow_schritt_historie", {
        data: [
          {
            id: "h-002",
            vorgang_id: "v-001",
            schritt_id: "pruefung",
            ausgefuehrt_am: "2026-03-28T10:00:00Z",
          },
          {
            id: "h-001",
            vorgang_id: "v-001",
            schritt_id: "eingegangen",
            ausgefuehrt_am: "2026-03-27T10:00:00Z",
          },
          {
            id: "h-003",
            vorgang_id: "v-002",
            schritt_id: "pruefung",
            ausgefuehrt_am: "2026-03-26T10:00:00Z",
          },
        ],
        error: null,
      });

      // Vorgang-Details
      client.setResult("vorgaenge", {
        data: [
          {
            id: "v-001",
            aktenzeichen: "BW-2026-001",
            bezeichnung: "Neubau EFH",
            workflow_schritt_id: "pruefung",
          },
          {
            id: "v-002",
            aktenzeichen: "BW-2026-002",
            bezeichnung: null,
            workflow_schritt_id: "eingegangen",
          },
        ],
        error: null,
      });

      const result = await ladeKuerzlichBearbeitet(
        client as any,
        TENANT_ID,
        USER_ID
      );

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(2);
      // Erster Eintrag: neuester fuer v-001
      expect(result.data[0].vorgang_id).toBe("v-001");
      expect(result.data[0].aktenzeichen).toBe("BW-2026-001");
      expect(result.data[0].schritt_id).toBe("pruefung");
      // Zweiter Eintrag: v-002
      expect(result.data[1].vorgang_id).toBe("v-002");
      expect(result.data[1].bezeichnung).toBeNull();
    });

    it("sollte leeres Array zurueckgeben wenn keine Historie vorhanden", async () => {
      const client = createMockClient();
      client.setResult("workflow_schritt_historie", {
        data: [],
        error: null,
      });

      const result = await ladeKuerzlichBearbeitet(
        client as any,
        TENANT_ID,
        USER_ID
      );

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(0);
    });

    it("sollte Vorgaenge anderer Tenants ausfiltern", async () => {
      const client = createMockClient();

      client.setResult("workflow_schritt_historie", {
        data: [
          {
            id: "h-001",
            vorgang_id: "v-fremd",
            schritt_id: "pruefung",
            ausgefuehrt_am: "2026-03-28T10:00:00Z",
          },
        ],
        error: null,
      });

      // Vorgang gehoert anderem Tenant — wird vom tenant_id-Filter ausgeschlossen
      client.setResult("vorgaenge", {
        data: [],
        error: null,
      });

      const result = await ladeKuerzlichBearbeitet(
        client as any,
        TENANT_ID,
        USER_ID
      );

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(0);
    });

    it("sollte Fehler zurueckgeben bei DB-Fehler in Historie", async () => {
      const client = createMockClient();
      client.setResult("workflow_schritt_historie", {
        data: null,
        error: { message: "Query timeout" },
      });

      const result = await ladeKuerzlichBearbeitet(
        client as any,
        TENANT_ID,
        USER_ID
      );

      expect(result.error).toBe("Query timeout");
      expect(result.data).toHaveLength(0);
    });
  });
});
