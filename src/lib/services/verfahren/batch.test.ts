import { executeBatchAktion } from "./batch";
import { BatchAktionSchema } from "./types";
import type { BatchAktion } from "./types";

// Mock bestehende Services
jest.mock("@/lib/services/verfahren", () => ({
  zuweiseVorgang: jest.fn(),
  getVorgang: jest.fn(),
}));

jest.mock("@/lib/services/workflow", () => ({
  executeWorkflowAktion: jest.fn(),
}));

jest.mock("@/lib/services/fristen", () => ({
  verlaengereFrist: jest.fn(),
  getFristen: jest.fn(),
}));

jest.mock("@/lib/services/audit", () => ({
  writeAuditLog: jest.fn().mockResolvedValue(undefined),
}));

import { zuweiseVorgang, getVorgang } from "@/lib/services/verfahren";
import { executeWorkflowAktion } from "@/lib/services/workflow";
import { verlaengereFrist, getFristen } from "@/lib/services/fristen";

const mockZuweiseVorgang = zuweiseVorgang as jest.MockedFunction<typeof zuweiseVorgang>;
const mockGetVorgang = getVorgang as jest.MockedFunction<typeof getVorgang>;
const mockExecuteWorkflowAktion = executeWorkflowAktion as jest.MockedFunction<typeof executeWorkflowAktion>;
const mockVerlaengereFrist = verlaengereFrist as jest.MockedFunction<typeof verlaengereFrist>;
const mockGetFristen = getFristen as jest.MockedFunction<typeof getFristen>;

const MOCK_SERVICE_CLIENT = {} as Parameters<typeof executeBatchAktion>[0];
const MOCK_CONTEXT = {
  tenantId: "a0000000-0000-4000-a000-000000000001",
  userId: "a0000000-0000-4000-a000-000000000002",
  userRole: "sachbearbeiter" as const,
};

const VORGANG_IDS = [
  "b0000000-0000-4000-a000-000000000001",
  "b0000000-0000-4000-a000-000000000002",
  "b0000000-0000-4000-a000-000000000003",
];

const ZIEL_USER_ID = "c0000000-0000-4000-a000-000000000099";

describe("executeBatchAktion", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("zuweisen", () => {
    it("sollte 3 Vorgaenge erfolgreich zuweisen", async () => {
      mockZuweiseVorgang.mockResolvedValue({ error: null });

      const params: BatchAktion = {
        aktion: "zuweisen",
        vorgang_ids: VORGANG_IDS,
        zustaendiger_user_id: ZIEL_USER_ID,
      };

      const result = await executeBatchAktion(MOCK_SERVICE_CLIENT, MOCK_CONTEXT, params);

      expect(result.gesamt).toBe(3);
      expect(result.erfolgreich).toBe(3);
      expect(result.fehlgeschlagen).toBe(0);
      expect(result.ergebnisse).toHaveLength(3);
      result.ergebnisse.forEach((e) => {
        expect(e.erfolg).toBe(true);
        expect(e.meldung).toBe("Zugewiesen");
      });
      expect(mockZuweiseVorgang).toHaveBeenCalledTimes(3);
    });

    it("sollte Teilfehler korrekt zurueckgeben (1 von 3 schlaegt fehl)", async () => {
      mockZuweiseVorgang
        .mockResolvedValueOnce({ error: null })
        .mockResolvedValueOnce({ error: "Zielbenutzer gehört nicht zum selben Mandanten" })
        .mockResolvedValueOnce({ error: null });

      const params: BatchAktion = {
        aktion: "zuweisen",
        vorgang_ids: VORGANG_IDS,
        zustaendiger_user_id: ZIEL_USER_ID,
      };

      const result = await executeBatchAktion(MOCK_SERVICE_CLIENT, MOCK_CONTEXT, params);

      expect(result.gesamt).toBe(3);
      expect(result.erfolgreich).toBe(2);
      expect(result.fehlgeschlagen).toBe(1);
      expect(result.ergebnisse[0].erfolg).toBe(true);
      expect(result.ergebnisse[1].erfolg).toBe(false);
      expect(result.ergebnisse[1].meldung).toBe("Zielbenutzer gehört nicht zum selben Mandanten");
      expect(result.ergebnisse[2].erfolg).toBe(true);
    });

    it("sollte bei Exception 'Interner Fehler' melden und weitermachen", async () => {
      mockZuweiseVorgang
        .mockResolvedValueOnce({ error: null })
        .mockRejectedValueOnce(new Error("DB connection lost"))
        .mockResolvedValueOnce({ error: null });

      const params: BatchAktion = {
        aktion: "zuweisen",
        vorgang_ids: VORGANG_IDS,
        zustaendiger_user_id: ZIEL_USER_ID,
      };

      const result = await executeBatchAktion(MOCK_SERVICE_CLIENT, MOCK_CONTEXT, params);

      expect(result.erfolgreich).toBe(2);
      expect(result.fehlgeschlagen).toBe(1);
      expect(result.ergebnisse[1].meldung).toBe("Interner Fehler bei der Verarbeitung");
    });
  });

  describe("status_aendern", () => {
    it("sollte Workflow-Aktion fuer mehrere Vorgaenge ausfuehren", async () => {
      mockGetVorgang.mockResolvedValue({
        data: {
          id: "mock",
          tenant_id: MOCK_CONTEXT.tenantId,
          aktenzeichen: "2026/001",
          verfahrensart_id: "va-1",
          bundesland: "NW",
          bauherr_name: "Test",
          bauherr_anschrift: null,
          bauherr_telefon: null,
          bauherr_email: null,
          grundstueck_adresse: "Teststr. 1",
          grundstueck_flurstueck: null,
          grundstueck_gemarkung: null,
          bezeichnung: null,
          workflow_schritt_id: "eingegangen",
          zustaendiger_user_id: MOCK_CONTEXT.userId,
          eingangsdatum: "2026-01-01T00:00:00Z",
          created_by: MOCK_CONTEXT.userId,
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
          deleted_at: null,
          version: 1,
          extra_felder: {},
        },
        error: null,
      });
      mockExecuteWorkflowAktion.mockResolvedValue({
        neuerSchrittId: "pruefung",
        fristErstellt: null,
        error: null,
      });

      const params: BatchAktion = {
        aktion: "status_aendern",
        vorgang_ids: VORGANG_IDS,
        aktion_id: "annehmen",
      };

      const result = await executeBatchAktion(MOCK_SERVICE_CLIENT, MOCK_CONTEXT, params);

      expect(result.erfolgreich).toBe(3);
      expect(result.fehlgeschlagen).toBe(0);
      expect(mockGetVorgang).toHaveBeenCalledTimes(3);
      expect(mockExecuteWorkflowAktion).toHaveBeenCalledTimes(3);
    });
  });

  describe("frist_verschieben", () => {
    it("sollte Fristen fuer mehrere Vorgaenge verlaengern", async () => {
      mockGetVorgang.mockResolvedValue({
        data: {
          id: "mock",
          tenant_id: MOCK_CONTEXT.tenantId,
          aktenzeichen: "2026/001",
          verfahrensart_id: "va-1",
          bundesland: "NW",
          bauherr_name: "Test",
          bauherr_anschrift: null,
          bauherr_telefon: null,
          bauherr_email: null,
          grundstueck_adresse: "Teststr. 1",
          grundstueck_flurstueck: null,
          grundstueck_gemarkung: null,
          bezeichnung: null,
          workflow_schritt_id: "eingegangen",
          zustaendiger_user_id: MOCK_CONTEXT.userId,
          eingangsdatum: "2026-01-01T00:00:00Z",
          created_by: MOCK_CONTEXT.userId,
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
          deleted_at: null,
          version: 1,
          extra_felder: {},
        },
        error: null,
      });
      mockGetFristen.mockResolvedValue({
        data: [{
          id: "frist-1",
          tenant_id: MOCK_CONTEXT.tenantId,
          vorgang_id: "mock",
          typ: "bearbeitungsfrist",
          bezeichnung: "Bearbeitungsfrist",
          start_datum: "2026-01-01T00:00:00Z",
          end_datum: "2026-02-01T00:00:00Z",
          werktage: 20,
          bundesland: "NW",
          status: "gruen",
          aktiv: true,
          gehemmt: false,
          hemmung_grund: null,
          hemmung_start: null,
          hemmung_ende: null,
          hemmung_tage: null,
          verlaengert: false,
          verlaengerung_grund: null,
          original_end_datum: null,
          gelb_ab: null,
          rot_ab: null,
          pause_tage_gesamt: null,
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        }],
        error: null,
      });
      mockVerlaengereFrist.mockResolvedValue({ data: null, error: null });

      const params: BatchAktion = {
        aktion: "frist_verschieben",
        vorgang_ids: VORGANG_IDS,
        frist_typ: "bearbeitungsfrist",
        zusaetzliche_werktage: 5,
        begruendung: "Nachreichung abwarten",
      };

      const result = await executeBatchAktion(MOCK_SERVICE_CLIENT, MOCK_CONTEXT, params);

      expect(result.erfolgreich).toBe(3);
      expect(mockVerlaengereFrist).toHaveBeenCalledTimes(3);
    });

    it("sollte Fehler melden wenn keine passende Frist vorhanden", async () => {
      mockGetVorgang.mockResolvedValue({
        data: {
          id: "mock",
          tenant_id: MOCK_CONTEXT.tenantId,
          aktenzeichen: "2026/001",
          verfahrensart_id: "va-1",
          bundesland: "NW",
          bauherr_name: "Test",
          bauherr_anschrift: null,
          bauherr_telefon: null,
          bauherr_email: null,
          grundstueck_adresse: "Teststr. 1",
          grundstueck_flurstueck: null,
          grundstueck_gemarkung: null,
          bezeichnung: null,
          workflow_schritt_id: "eingegangen",
          zustaendiger_user_id: MOCK_CONTEXT.userId,
          eingangsdatum: "2026-01-01T00:00:00Z",
          created_by: MOCK_CONTEXT.userId,
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
          deleted_at: null,
          version: 1,
          extra_felder: {},
        },
        error: null,
      });
      mockGetFristen.mockResolvedValue({ data: [], error: null });

      const params: BatchAktion = {
        aktion: "frist_verschieben",
        vorgang_ids: [VORGANG_IDS[0]],
        frist_typ: "nicht_existent",
        zusaetzliche_werktage: 5,
        begruendung: "Test",
      };

      const result = await executeBatchAktion(MOCK_SERVICE_CLIENT, MOCK_CONTEXT, params);

      expect(result.fehlgeschlagen).toBe(1);
      expect(result.ergebnisse[0].meldung).toContain("Keine aktive Frist vom Typ");
    });
  });
});

describe("BatchAktionSchema (Zod-Validierung)", () => {
  it("sollte leere vorgang_ids ablehnen (min 1)", () => {
    const result = BatchAktionSchema.safeParse({
      aktion: "zuweisen",
      vorgang_ids: [],
      zustaendiger_user_id: ZIEL_USER_ID,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes("Mindestens ein Vorgang"))).toBe(true);
    }
  });

  it("sollte ueber 100 vorgang_ids ablehnen (max 100)", () => {
    const ids = Array.from({ length: 101 }, (_, i) =>
      `${String(i).padStart(8, "0")}-0000-4000-a000-000000000001`
    );

    const result = BatchAktionSchema.safeParse({
      aktion: "zuweisen",
      vorgang_ids: ids,
      zustaendiger_user_id: ZIEL_USER_ID,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes("Maximal 100"))).toBe(true);
    }
  });

  it("sollte ungueltige UUIDs in vorgang_ids ablehnen", () => {
    const result = BatchAktionSchema.safeParse({
      aktion: "zuweisen",
      vorgang_ids: ["nicht-eine-uuid"],
      zustaendiger_user_id: ZIEL_USER_ID,
    });

    expect(result.success).toBe(false);
  });

  it("sollte unbekannte Aktion ablehnen", () => {
    const result = BatchAktionSchema.safeParse({
      aktion: "loeschen",
      vorgang_ids: ["a0000000-0000-4000-a000-000000000001"],
    });

    expect(result.success).toBe(false);
  });

  it("sollte gueltige zuweisen-Aktion akzeptieren", () => {
    const result = BatchAktionSchema.safeParse({
      aktion: "zuweisen",
      vorgang_ids: ["a0000000-0000-4000-a000-000000000001"],
      zustaendiger_user_id: ZIEL_USER_ID,
    });

    expect(result.success).toBe(true);
  });

  it("sollte gueltige status_aendern-Aktion akzeptieren", () => {
    const result = BatchAktionSchema.safeParse({
      aktion: "status_aendern",
      vorgang_ids: ["a0000000-0000-4000-a000-000000000001"],
      aktion_id: "annehmen",
    });

    expect(result.success).toBe(true);
  });

  it("sollte gueltige frist_verschieben-Aktion akzeptieren", () => {
    const result = BatchAktionSchema.safeParse({
      aktion: "frist_verschieben",
      vorgang_ids: ["a0000000-0000-4000-a000-000000000001"],
      frist_typ: "bearbeitungsfrist",
      zusaetzliche_werktage: 5,
      begruendung: "Test",
    });

    expect(result.success).toBe(true);
  });
});
