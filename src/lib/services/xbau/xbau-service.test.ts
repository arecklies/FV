/**
 * Unit-Tests für XBau-Service (PROJ-7)
 * Tests für empfangeNachricht(), Korrelation und Store.
 */

jest.mock("@/lib/services/audit", () => ({
  writeAuditLog: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/lib/supabase-server", () => ({
  createServiceRoleClient: jest.fn(),
}));

jest.mock("@/lib/services/verfahren", () => ({
  createVorgang: jest.fn().mockResolvedValue({
    data: {
      id: "vorgang-001",
      aktenzeichen: "2026/0001/BG",
      tenant_id: "t-001",
      verfahrensart_id: "va-001",
      bundesland: "NW",
      bauherr_name: "Max Mustermann",
      bauherr_anschrift: null,
      bauherr_telefon: null,
      bauherr_email: null,
      grundstueck_adresse: "Baustraße 5",
      grundstueck_flurstueck: null,
      grundstueck_gemarkung: null,
      bezeichnung: "Neubau EFH",
      workflow_schritt_id: "eingegangen",
      zustaendiger_user_id: "u-001",
      eingangsdatum: "2026-03-28",
      created_by: "u-001",
      created_at: "2026-03-28T10:00:00Z",
      updated_at: "2026-03-28T10:00:00Z",
      deleted_at: null,
      version: 1,
      extra_felder: {},
    },
    error: null,
  }),
}));

import { korreliereNachricht } from "./correlator";
import { empfangeNachricht } from "./index";

// Supabase Chain-Mock
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

const SAMPLE_0200 = `<?xml version="1.0" encoding="UTF-8"?>
<xbau:baugenehmigung.antrag.0200 xmlns:xbau="urn:xoev-de:xbau:standard:xbau">
  <nachrichtenkopf>
    <identifikation.nachricht>
      <nachrichtenUUID>a1b2c3d4-e5f6-7890-abcd-ef1234567890</nachrichtenUUID>
      <nachrichtentyp>0200</nachrichtentyp>
      <erstellungszeitpunkt>2026-03-28T10:00:00Z</erstellungszeitpunkt>
    </identifikation.nachricht>
    <autor>Bauportal Dortmund</autor>
  </nachrichtenkopf>
  <bezug><referenz>portal-ref-1234</referenz></bezug>
  <bauherr><name>Max Mustermann</name></bauherr>
  <grundstueck><strasse>Baustraße 5</strasse></grundstueck>
  <verfahrensart>BG</verfahrensart>
</xbau:baugenehmigung.antrag.0200>`;

const TENANT_ID = "t-001";
const USER_ID = "u-001";

describe("korreliereNachricht", () => {
  beforeEach(() => jest.clearAllMocks());

  it("findet Vorgang über Aktenzeichen (Stufe 1)", async () => {
    const callCounts: Record<string, number> = {};
    const resolveQueue: Record<string, any[]> = {
      vorgaenge: [{ data: [{ id: "v-001" }] }],
    };
    const mockFrom = jest.fn((table: string) => {
      if (!callCounts[table]) callCounts[table] = 0;
      const idx = callCounts[table]++;
      const results = resolveQueue[table];
      const result = results ? results[Math.min(idx, results.length - 1)] : { data: null };
      return createChainMock(result).proxy;
    });

    const result = await korreliereNachricht(
      { from: mockFrom } as any,
      TENANT_ID,
      { vorgang: "2026/0001/BG" }
    );

    expect(result.vorgangId).toBe("v-001");
    expect(result.matchTyp).toBe("aktenzeichen");
  });

  it("findet Vorgang über Referenz-UUID (Stufe 2)", async () => {
    const callCounts: Record<string, number> = {};
    const resolveQueue: Record<string, any[]> = {
      vorgaenge: [{ data: [] }], // Stufe 1: kein Match
      xbau_nachrichten: [{ data: [{ vorgang_id: "v-002" }] }],
    };
    const mockFrom = jest.fn((table: string) => {
      if (!callCounts[table]) callCounts[table] = 0;
      const idx = callCounts[table]++;
      const results = resolveQueue[table];
      const result = results ? results[Math.min(idx, results.length - 1)] : { data: null };
      return createChainMock(result).proxy;
    });

    const result = await korreliereNachricht(
      { from: mockFrom } as any,
      TENANT_ID,
      { vorgang: "UNBEKANNT", referenz: "portal-ref-1234" }
    );

    expect(result.vorgangId).toBe("v-002");
    expect(result.matchTyp).toBe("referenz");
  });

  it("meldet kein_match wenn keine Stufe greift", async () => {
    const mockFrom = jest.fn(() => createChainMock({ data: [] }).proxy);

    const result = await korreliereNachricht(
      { from: mockFrom } as any,
      TENANT_ID,
      {}
    );

    expect(result.vorgangId).toBeNull();
    expect(result.matchTyp).toBe("kein_match");
  });
});

describe("empfangeNachricht (0200)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("parst 0200 und legt Vorgang an (Happy Path)", async () => {
    const callCounts: Record<string, number> = {};
    const nachrichtRow = {
      id: "n-001",
      tenant_id: TENANT_ID,
      nachrichten_uuid: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      nachrichtentyp: "0200",
      richtung: "eingang",
      status: "empfangen",
      vorgang_id: null,
      referenz_uuid: "portal-ref-1234",
      bezug_nachrichten_uuid: null,
      bezug_aktenzeichen: null,
      absender_behoerde: "Bauportal Dortmund",
      empfaenger_behoerde: null,
      kerndaten: {},
      fehler_details: null,
      created_at: "2026-03-28T10:00:00Z",
      updated_at: "2026-03-28T10:00:00Z",
    };

    const resolveQueue: Record<string, any[]> = {
      // istDuplikat
      xbau_nachrichten: [
        { data: [] },      // Duplikat-Check: kein Duplikat
        { data: nachrichtRow, error: null }, // speichereNachricht: insert
        { error: null },    // updateNachrichtStatus
      ],
      config_verfahrensarten: [{ data: [{ id: "va-001" }] }],
      tenants: [{ data: { bundesland: "NW" } }],
    };

    const mockFrom = jest.fn((table: string) => {
      if (!callCounts[table]) callCounts[table] = 0;
      const idx = callCounts[table]++;
      const results = resolveQueue[table];
      const result = results ? results[Math.min(idx, results.length - 1)] : { data: null, error: null };
      return createChainMock(result).proxy;
    });

    const client = { from: mockFrom, auth: { admin: { getUserById: jest.fn() } } } as any;

    const result = await empfangeNachricht(client, TENANT_ID, USER_ID, SAMPLE_0200);

    expect(result.error).toBeNull();
    expect(result.data).not.toBeNull();
    expect(result.data!.nachrichtentyp).toBe("0200");
    expect(result.data!.vorgangId).toBe("vorgang-001");
    expect(result.data!.aktenzeichen).toBe("2026/0001/BG");
  });

  it("weist ungültiges XML ab", async () => {
    const mockFrom = jest.fn(() => createChainMock().proxy);
    const client = { from: mockFrom } as any;

    const result = await empfangeNachricht(client, TENANT_ID, USER_ID, "kein xml");

    expect(result.error).toContain("Ungültiges XML");
  });
});
