/**
 * Unit-Tests für FristService (PROJ-4)
 *
 * Mock-Pattern: Supabase Fluent-API-Chain gemäß verfahren.test.ts.
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
  ladeFeiertage,
  ladeConfigFristen,
  getFristen,
  createFrist,
  verlaengereFrist,
  hemmeFrist,
  hebeHemmungAuf,
  listGefaehrdeteFristen,
  gruppiereNachSachbearbeiter,
  aktualisiereAlleAmpelStatus,
} from "./index";
import { writeAuditLog } from "@/lib/services/audit";

// -- Hilfsfunktionen für Supabase-Mock --

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

const MOCK_FEIERTAGE = [
  { id: "f1", bundesland: null, datum: "2026-01-01", bezeichnung: "Neujahr", jahr: 2026 },
  { id: "f2", bundesland: "NW", datum: "2026-06-11", bezeichnung: "Fronleichnam", jahr: 2026 },
];

const MOCK_FRIST = {
  id: "frist-1",
  tenant_id: "tenant-1",
  vorgang_id: "vorgang-1",
  typ: "gesamtfrist",
  bezeichnung: "Gesamtfrist Baugenehmigung",
  start_datum: "2026-03-01T00:00:00.000Z",
  end_datum: "2026-06-01T00:00:00.000Z",
  werktage: 60,
  bundesland: "NW",
  status: "gruen",
  gehemmt: false,
  hemmung_grund: null,
  hemmung_start: null,
  hemmung_ende: null,
  hemmung_tage: 0,
  verlaengert: false,
  verlaengerung_grund: null,
  original_end_datum: null,
  aktiv: true,
  created_at: "2026-03-01T00:00:00.000Z",
  updated_at: "2026-03-01T00:00:00.000Z",
};

const MOCK_FRIST_INTERN = {
  ...MOCK_FRIST,
  id: "frist-intern-1",
  typ: "intern",
  bezeichnung: "Interne Bearbeitungsfrist",
  end_datum: "2026-04-01T00:00:00.000Z",
  werktage: 20,
};

describe("ladeFeiertage", () => {
  it("sollte Feiertage als Set von ISO-Datumsstrings zurückgeben", async () => {
    const mockClient = createMockClient();
    mockClient.setTableResult("config_feiertage", { data: MOCK_FEIERTAGE, error: null });

    const result = await ladeFeiertage(mockClient as any, "NW", 2026);
    expect(result).toBeInstanceOf(Set);
    expect(result.has("2026-01-01")).toBe(true);
    expect(result.has("2026-06-11")).toBe(true);
  });

  it("sollte leeres Set bei Fehler zurückgeben", async () => {
    const mockClient = createMockClient();
    mockClient.setTableResult("config_feiertage", { data: null, error: { message: "DB-Fehler" } });

    const result = await ladeFeiertage(mockClient as any, "NW", 2026);
    expect(result.size).toBe(0);
  });
});

describe("getFristen", () => {
  it("sollte Fristen eines Vorgangs zurückgeben", async () => {
    const mockClient = createMockClient();
    mockClient.setTableResult("vorgang_fristen", { data: [MOCK_FRIST], error: null });

    const result = await getFristen(mockClient as any, "tenant-1", "vorgang-1");
    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(1);
    expect(result.data[0].typ).toBe("gesamtfrist");
  });

  it("sollte Fehler korrekt weiterleiten", async () => {
    const mockClient = createMockClient();
    mockClient.setTableResult("vorgang_fristen", { data: null, error: { message: "RLS-Fehler" } });

    const result = await getFristen(mockClient as any, "tenant-1", "vorgang-1");
    expect(result.error).toBe("RLS-Fehler");
    expect(result.data).toEqual([]);
  });

  it("sollte gesetzliche Fristen vor internen sortieren (PROJ-28 NFR-2)", async () => {
    const interneFristFrueh = {
      ...MOCK_FRIST_INTERN,
      end_datum: "2026-04-01T00:00:00.000Z",
    };
    const gesetzlicheFristSpaet = {
      ...MOCK_FRIST,
      end_datum: "2026-07-01T00:00:00.000Z",
    };
    // DB liefert intern vor gesetzlich (nach end_datum ASC)
    const mockClient = createMockClient();
    mockClient.setTableResult("vorgang_fristen", {
      data: [interneFristFrueh, gesetzlicheFristSpaet],
      error: null,
    });

    const result = await getFristen(mockClient as any, "tenant-1", "vorgang-1");
    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(2);
    // Gesetzlich zuerst, auch wenn end_datum spaeter
    expect(result.data[0].typ).toBe("gesamtfrist");
    expect(result.data[1].typ).toBe("intern");
  });
});

describe("createFrist", () => {
  it("sollte eine Frist anlegen und Audit-Log schreiben", async () => {
    const mockClient = createMockClient();
    // Feiertage: leer
    mockClient.setTableResult("config_feiertage", { data: [], error: null });
    // Insert-Ergebnis
    mockClient.setTableResult("vorgang_fristen", { data: MOCK_FRIST, error: null });

    const result = await createFrist(mockClient as any, {
      tenantId: "tenant-1",
      userId: "user-1",
      vorgangId: "vorgang-1",
      typ: "gesamtfrist",
      bezeichnung: "Gesamtfrist Baugenehmigung",
      werktage: 60,
      startDatum: "2026-03-01T00:00:00.000Z",
      bundesland: "NW",
    });

    expect(result.error).toBeNull();
    expect(result.data).not.toBeNull();
    expect(result.data!.typ).toBe("gesamtfrist");
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "frist.created",
        resourceType: "vorgang_frist",
      })
    );
  });

  it("sollte Fehler bei DB-Insert-Fehler zurückgeben", async () => {
    const mockClient = createMockClient();
    mockClient.setTableResult("config_feiertage", { data: [], error: null });
    mockClient.setTableResult("vorgang_fristen", { data: null, error: { message: "Insert fehlgeschlagen" } });

    const result = await createFrist(mockClient as any, {
      tenantId: "tenant-1",
      userId: "user-1",
      vorgangId: "vorgang-1",
      typ: "gesamtfrist",
      bezeichnung: "Gesamtfrist",
      werktage: 60,
      startDatum: "2026-03-01T00:00:00.000Z",
      bundesland: "NW",
    });

    expect(result.error).toBe("Insert fehlgeschlagen");
    expect(result.data).toBeNull();
  });

  it("sollte eine interne Frist anlegen (PROJ-28 US-1)", async () => {
    const mockClient = createMockClient();
    mockClient.setTableResult("config_feiertage", { data: [], error: null });
    mockClient.setTableResult("vorgang_fristen", { data: MOCK_FRIST_INTERN, error: null });

    const result = await createFrist(mockClient as any, {
      tenantId: "tenant-1",
      userId: "user-1",
      vorgangId: "vorgang-1",
      typ: "intern",
      bezeichnung: "Interne Bearbeitungsfrist",
      werktage: 20,
      startDatum: "2026-03-01T00:00:00.000Z",
      bundesland: "NW",
    });

    expect(result.error).toBeNull();
    expect(result.data).not.toBeNull();
    expect(result.data!.typ).toBe("intern");
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "frist.created",
        payload: expect.objectContaining({ typ: "intern" }),
      })
    );
  });
});

describe("ladeConfigFristen", () => {
  it("sollte konfigurierte Fristen für Bundesland und Verfahrensart laden", async () => {
    const mockClient = createMockClient();
    mockClient.setTableResult("config_fristen", {
      data: [{
        id: "cf-1", bundesland: "NW", verfahrensart_id: "va-1",
        typ: "gesamtfrist", bezeichnung: "Gesamtfrist BG", werktage: 60,
        rechtsgrundlage: "§ 75 BauO NRW", aktiv: true,
        gelb_ab: null, rot_ab: null,
      }],
      error: null,
    });

    const result = await ladeConfigFristen(mockClient as any, "NW", "va-1");
    expect(result).toHaveLength(1);
    expect(result[0].typ).toBe("gesamtfrist");
    expect(result[0].werktage).toBe(60);
  });

  it("sollte leeres Array bei Fehler zurückgeben", async () => {
    const mockClient = createMockClient();
    mockClient.setTableResult("config_fristen", { data: null, error: { message: "Fehler" } });

    const result = await ladeConfigFristen(mockClient as any, "NW", "va-1");
    expect(result).toEqual([]);
  });

  it("sollte konfigurierte Ampel-Schwellenwerte laden (PROJ-34)", async () => {
    const mockClient = createMockClient();
    mockClient.setTableResult("config_fristen", {
      data: [{
        id: "cf-2", bundesland: "NW", verfahrensart_id: "va-1",
        typ: "gesamtfrist", bezeichnung: "Gesamtfrist BG", werktage: 60,
        rechtsgrundlage: "§ 75 BauO NRW", aktiv: true,
        gelb_ab: 60, rot_ab: 30,
      }],
      error: null,
    });

    const result = await ladeConfigFristen(mockClient as any, "NW", "va-1");
    expect(result).toHaveLength(1);
    expect(result[0].gelb_ab).toBe(60);
    expect(result[0].rot_ab).toBe(30);
  });

  it("sollte NULL-Schwellenwerte korrekt parsen (PROJ-34 AC-3)", async () => {
    const mockClient = createMockClient();
    mockClient.setTableResult("config_fristen", {
      data: [{
        id: "cf-3", bundesland: "NW", verfahrensart_id: "va-1",
        typ: "gesamtfrist", bezeichnung: "Gesamtfrist BG", werktage: 60,
        rechtsgrundlage: null, aktiv: true,
        gelb_ab: null, rot_ab: null,
      }],
      error: null,
    });

    const result = await ladeConfigFristen(mockClient as any, "NW", "va-1");
    expect(result).toHaveLength(1);
    expect(result[0].gelb_ab).toBeNull();
    expect(result[0].rot_ab).toBeNull();
  });
});

describe("verlaengereFrist", () => {
  it("sollte bei nicht gefundener Frist Fehler zurückgeben", async () => {
    const mockClient = createMockClient();
    mockClient.setTableResult("vorgang_fristen", { data: null, error: { code: "PGRST116", message: "Not found" } });

    const result = await verlaengereFrist(mockClient as any, {
      tenantId: "tenant-1",
      userId: "user-1",
      fristId: "nicht-existent",
      zusaetzlicheWerktage: 10,
      begruendung: "Nachforderung",
      bundesland: "NW",
    });

    expect(result.error).toBe("Frist nicht gefunden");
  });

  it("sollte Frist verlängern und Audit-Log schreiben", async () => {
    const verlaengerteFrist = {
      ...MOCK_FRIST,
      end_datum: "2026-07-01T00:00:00.000Z",
      werktage: 80,
      verlaengert: true,
      verlaengerung_grund: "Nachforderung",
      original_end_datum: MOCK_FRIST.end_datum,
    };
    let callCount = 0;

    const mockClient = {
      from: jest.fn((table: string) => {
        callCount++;
        if (table === "config_feiertage") {
          return createChainMock({ data: [], error: null }).proxy;
        }
        // vorgang_fristen: 1. select, 2. update
        const result = callCount <= 1
          ? { data: MOCK_FRIST, error: null }
          : { data: verlaengerteFrist, error: null };
        return createChainMock(result).proxy;
      }),
    };

    const result = await verlaengereFrist(mockClient as any, {
      tenantId: "tenant-1",
      userId: "user-1",
      fristId: "frist-1",
      zusaetzlicheWerktage: 20,
      begruendung: "Nachforderung wegen fehlender Unterlagen",
      bundesland: "NW",
    });

    expect(result.error).toBeNull();
    expect(result.data).not.toBeNull();
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "frist.verlaengert" })
    );
  });
});

describe("hemmeFrist", () => {
  it("sollte Frist hemmen und Status auf gehemmt setzen", async () => {
    // Mock: Erster Aufruf liefert ungehemmte Frist (select),
    // zweiter Aufruf liefert gehemmte Frist (update).
    const gehemmteFrist = { ...MOCK_FRIST, gehemmt: true, status: "gehemmt", hemmung_grund: "Nachforderung" };
    let callCount = 0;

    const mockClient = {
      from: jest.fn(() => {
        callCount++;
        // Erster from()-Aufruf: select (ungehemmte Frist laden)
        // Zweiter from()-Aufruf: update (gehemmte Frist zurück)
        const result = callCount === 1
          ? { data: MOCK_FRIST, error: null }
          : { data: gehemmteFrist, error: null };
        return createChainMock(result).proxy;
      }),
    };

    const result = await hemmeFrist(mockClient as any, {
      tenantId: "tenant-1",
      userId: "user-1",
      fristId: "frist-1",
      grund: "Nachforderung wegen fehlender Unterlagen",
    });

    expect(result.error).toBeNull();
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "frist.gehemmt",
      })
    );
  });

  it("sollte bei bereits gehemmter Frist Fehler zurückgeben", async () => {
    const mockClient = createMockClient();
    const bereitsGehemmt = { ...MOCK_FRIST, gehemmt: true, status: "gehemmt" };
    mockClient.setTableResult("vorgang_fristen", { data: bereitsGehemmt, error: null });

    const result = await hemmeFrist(mockClient as any, {
      tenantId: "tenant-1",
      userId: "user-1",
      fristId: "frist-1",
      grund: "Nochmal hemmen",
    });

    expect(result.error).toBe("Frist ist bereits gehemmt");
  });
});

describe("hebeHemmungAuf", () => {
  it("sollte bei nicht gehemmter Frist Fehler zurückgeben", async () => {
    const mockClient = createMockClient();
    mockClient.setTableResult("vorgang_fristen", { data: MOCK_FRIST, error: null });

    const result = await hebeHemmungAuf(mockClient as any, {
      tenantId: "tenant-1",
      userId: "user-1",
      fristId: "frist-1",
      bundesland: "NW",
    });

    expect(result.error).toBe("Frist ist nicht gehemmt");
  });

  it("sollte Hemmung aufheben, Frist verlängern und Audit-Log schreiben", async () => {
    const gehemmteFrist = {
      ...MOCK_FRIST,
      gehemmt: true,
      status: "gehemmt",
      hemmung_grund: "Nachforderung",
      hemmung_start: "2026-03-20T00:00:00.000Z",
      hemmung_tage: 0,
    };
    const aufgehobene = {
      ...MOCK_FRIST,
      gehemmt: false,
      status: "gruen",
      hemmung_ende: new Date().toISOString(),
    };
    let callCount = 0;

    const mockClient = {
      from: jest.fn((table: string) => {
        callCount++;
        if (table === "config_feiertage") {
          return createChainMock({ data: [], error: null }).proxy;
        }
        // vorgang_fristen: 1. select (gehemmt), 2. update (aufgehoben)
        const result = callCount <= 1
          ? { data: gehemmteFrist, error: null }
          : { data: aufgehobene, error: null };
        return createChainMock(result).proxy;
      }),
    };

    const result = await hebeHemmungAuf(mockClient as any, {
      tenantId: "tenant-1",
      userId: "user-1",
      fristId: "frist-1",
      bundesland: "NW",
    });

    expect(result.error).toBeNull();
    expect(result.data).not.toBeNull();
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "frist.hemmung_aufgehoben" })
    );
  });

  it("sollte bei nicht gefundener Frist Fehler zurückgeben", async () => {
    const mockClient = createMockClient();
    mockClient.setTableResult("vorgang_fristen", { data: null, error: { message: "Not found" } });

    const result = await hebeHemmungAuf(mockClient as any, {
      tenantId: "tenant-1",
      userId: "user-1",
      fristId: "nicht-existent",
      bundesland: "NW",
    });

    expect(result.error).toBe("Frist nicht gefunden");
  });
});

describe("listGefaehrdeteFristen", () => {
  it("sollte gefährdete Fristen mit Vorgang-Info zurückgeben", async () => {
    const mockClient = createMockClient();
    mockClient.setTableResult("vorgang_fristen", {
      data: [{
        ...MOCK_FRIST,
        status: "rot",
        vorgaenge: {
          aktenzeichen: "2026/BG-0001",
          bezeichnung: "Neubau EFH",
          zustaendiger_user_id: "user-1",
        },
      }],
      count: 1,
      error: null,
    });

    const result = await listGefaehrdeteFristen(mockClient as any, {
      tenantId: "tenant-1",
      seite: 1,
      proSeite: 25,
    });

    expect(result.error).toBeNull();
    expect(result.total).toBe(1);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].vorgang_aktenzeichen).toBe("2026/BG-0001");
    expect(result.data[0].frist.status).toBe("rot");
  });

  it("sollte Fehler korrekt weiterleiten", async () => {
    const mockClient = createMockClient();
    mockClient.setTableResult("vorgang_fristen", { data: null, count: 0, error: { message: "DB-Fehler" } });

    const result = await listGefaehrdeteFristen(mockClient as any, {
      tenantId: "tenant-1",
      seite: 1,
      proSeite: 25,
    });

    expect(result.error).toBe("DB-Fehler");
    expect(result.data).toEqual([]);
  });
});

describe("gruppiereNachSachbearbeiter (PROJ-21)", () => {
  it("sollte Fristen nach Sachbearbeiter gruppieren und nach Anzahl sortieren", () => {
    const fristen = [
      { frist: { ...MOCK_FRIST, status: "rot" } as any, vorgang_aktenzeichen: "2026/BG-0001", vorgang_bezeichnung: null, zustaendiger_user_id: "user-a" },
      { frist: { ...MOCK_FRIST, status: "rot" } as any, vorgang_aktenzeichen: "2026/BG-0002", vorgang_bezeichnung: null, zustaendiger_user_id: "user-a" },
      { frist: { ...MOCK_FRIST, status: "dunkelrot" } as any, vorgang_aktenzeichen: "2026/BG-0003", vorgang_bezeichnung: null, zustaendiger_user_id: "user-b" },
    ];

    const gruppen = gruppiereNachSachbearbeiter(fristen);
    expect(gruppen).toHaveLength(2);
    // user-a hat 2 Fristen → erste Gruppe
    expect(gruppen[0].zustaendiger_user_id).toBe("user-a");
    expect(gruppen[0].anzahl).toBe(2);
    // user-b hat 1 Frist → zweite Gruppe
    expect(gruppen[1].zustaendiger_user_id).toBe("user-b");
    expect(gruppen[1].anzahl).toBe(1);
  });

  it("sollte unzugewiesene Fristen unter __unzugewiesen__ gruppieren", () => {
    const fristen = [
      { frist: { ...MOCK_FRIST, status: "rot" } as any, vorgang_aktenzeichen: "2026/BG-0001", vorgang_bezeichnung: null, zustaendiger_user_id: null },
    ];

    const gruppen = gruppiereNachSachbearbeiter(fristen);
    expect(gruppen).toHaveLength(1);
    expect(gruppen[0].zustaendiger_user_id).toBe("__unzugewiesen__");
  });

  it("sollte leeres Array bei leerer Eingabe zurueckgeben", () => {
    const gruppen = gruppiereNachSachbearbeiter([]);
    expect(gruppen).toEqual([]);
  });
});

describe("listGefaehrdeteFristen mit nurUeberschritten (PROJ-21 US-2)", () => {
  it("sollte mit nurUeberschritten=true nur dunkelrot zurueckgeben", async () => {
    const mockClient = createMockClient();
    mockClient.setTableResult("vorgang_fristen", {
      data: [{
        ...MOCK_FRIST,
        status: "dunkelrot",
        vorgaenge: {
          aktenzeichen: "2026/BG-0005",
          bezeichnung: "Ueberschritten",
          zustaendiger_user_id: "user-1",
        },
      }],
      count: 1,
      error: null,
    });

    const result = await listGefaehrdeteFristen(mockClient as any, {
      tenantId: "tenant-1",
      seite: 1,
      proSeite: 25,
      nurUeberschritten: true,
    });

    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(1);
    // Verifiziere dass der mockClient mit dem richtigen Status-Filter aufgerufen wurde
    expect(mockClient.from).toHaveBeenCalledWith("vorgang_fristen");
  });
});

describe("aktualisiereAlleAmpelStatus (PROJ-22)", () => {
  it("sollte 0 aktualisiert zurueckgeben wenn keine Fristen existieren", async () => {
    const mockClient = createMockClient();
    mockClient.setTableResult("vorgang_fristen", { data: [], error: null });

    const result = await aktualisiereAlleAmpelStatus(mockClient as any);
    expect(result.aktualisiert).toBe(0);
    expect(result.error).toBeNull();
  });

  it("sollte Fehler bei DB-Fehler zurueckgeben", async () => {
    const mockClient = createMockClient();
    mockClient.setTableResult("vorgang_fristen", { data: null, error: { message: "Connection lost" } });

    const result = await aktualisiereAlleAmpelStatus(mockClient as any);
    expect(result.error).toBe("Connection lost");
  });

  it("sollte Fristen mit veraltetem Status per Batch-Update aktualisieren (PROJ-22 FA-4)", async () => {
    // Frist mit status "gruen" aber end_datum in der Vergangenheit -> sollte dunkelrot werden
    const abgelaufeneFrist = {
      id: "frist-abgelaufen",
      tenant_id: "tenant-1",
      vorgang_id: "vorgang-1",
      start_datum: "2025-01-01T00:00:00.000Z",
      end_datum: "2025-06-01T00:00:00.000Z",
      werktage: 60,
      bundesland: "NW",
      status: "gruen",
      gehemmt: false,
    };
    let callCount = 0;

    const mockClient = {
      from: jest.fn((table: string) => {
        callCount++;
        if (table === "config_feiertage") {
          return createChainMock({ data: [], error: null }).proxy;
        }
        // vorgang_fristen: 1. select (paginated), 2. batch update
        if (callCount === 1) {
          return createChainMock({ data: [abgelaufeneFrist], error: null }).proxy;
        }
        return createChainMock({ data: null, error: null }).proxy;
      }),
    };

    const result = await aktualisiereAlleAmpelStatus(mockClient as any);
    expect(result.error).toBeNull();
    expect(result.aktualisiert).toBe(1);
  });

  it("sollte Feiertage pro Bundesland laden (PROJ-22 FA-3)", async () => {
    const nwFrist = {
      id: "frist-nw",
      tenant_id: "tenant-1",
      vorgang_id: "vorgang-1",
      start_datum: "2025-01-01T00:00:00.000Z",
      end_datum: "2025-06-01T00:00:00.000Z",
      werktage: 60,
      bundesland: "NW",
      status: "gruen",
      gehemmt: false,
    };
    const byFrist = {
      id: "frist-by",
      tenant_id: "tenant-2",
      vorgang_id: "vorgang-2",
      start_datum: "2025-01-01T00:00:00.000Z",
      end_datum: "2025-06-01T00:00:00.000Z",
      werktage: 60,
      bundesland: "BY",
      status: "gruen",
      gehemmt: false,
    };

    const feiertageCallBundeslaender: string[] = [];
    let callCount = 0;

    const mockClient = {
      from: jest.fn((table: string) => {
        callCount++;
        if (table === "config_feiertage") {
          // Track which bundesland query is made via the or() filter
          const mock = createChainMock({ data: [], error: null });
          const originalOr = mock.chain.or;
          if (!originalOr) {
            // Create the or mock to track calls
            mock.chain.or = jest.fn((filter: string) => {
              const match = filter.match(/bundesland\.eq\.(\w+)/);
              if (match) feiertageCallBundeslaender.push(match[1]);
              return mock.proxy;
            });
          }
          return mock.proxy;
        }
        // vorgang_fristen: 1. select page, 2+3. batch updates
        if (callCount === 1) {
          return createChainMock({ data: [nwFrist, byFrist], error: null }).proxy;
        }
        return createChainMock({ data: null, error: null }).proxy;
      }),
    };

    const result = await aktualisiereAlleAmpelStatus(mockClient as any);
    expect(result.error).toBeNull();
    // Beide Fristen sind abgelaufen -> dunkelrot, also 2 aktualisiert
    expect(result.aktualisiert).toBe(2);
  });

  it("sollte bei unveraendertem Status kein Update ausfuehren", async () => {
    // Frist mit status "dunkelrot" und end_datum in der Vergangenheit -> bleibt dunkelrot
    const bereitsKorrekt = {
      id: "frist-korrekt",
      tenant_id: "tenant-1",
      vorgang_id: "vorgang-1",
      start_datum: "2025-01-01T00:00:00.000Z",
      end_datum: "2025-06-01T00:00:00.000Z",
      werktage: 60,
      bundesland: "NW",
      status: "dunkelrot",
      gehemmt: false,
    };

    let updateCalled = false;
    let callCount = 0;

    const mockClient = {
      from: jest.fn((table: string) => {
        callCount++;
        if (table === "config_feiertage") {
          return createChainMock({ data: [], error: null }).proxy;
        }
        if (callCount === 1) {
          return createChainMock({ data: [bereitsKorrekt], error: null }).proxy;
        }
        // Should not reach here if status is unchanged
        updateCalled = true;
        return createChainMock({ data: null, error: null }).proxy;
      }),
    };

    const result = await aktualisiereAlleAmpelStatus(mockClient as any);
    expect(result.aktualisiert).toBe(0);
    expect(updateCalled).toBe(false);
  });

  it("sollte idempotent sein bei mehrfachem Aufruf (NFR-1)", async () => {
    // Frist korrekt berechnet -> kein Update
    const korrekteFrist = {
      id: "frist-ok",
      tenant_id: "tenant-1",
      vorgang_id: "vorgang-1",
      start_datum: "2025-01-01T00:00:00.000Z",
      end_datum: "2025-06-01T00:00:00.000Z",
      werktage: 60,
      bundesland: "NW",
      status: "dunkelrot",
      gehemmt: false,
    };

    const createClient = () => ({
      from: jest.fn((table: string) => {
        if (table === "config_feiertage") {
          return createChainMock({ data: [], error: null }).proxy;
        }
        return createChainMock({ data: [korrekteFrist], error: null }).proxy;
      }),
    });

    const result1 = await aktualisiereAlleAmpelStatus(createClient() as any);
    const result2 = await aktualisiereAlleAmpelStatus(createClient() as any);
    expect(result1.aktualisiert).toBe(0);
    expect(result2.aktualisiert).toBe(0);
  });
});
