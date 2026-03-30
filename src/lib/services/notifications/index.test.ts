import { verarbeiteAmpelWechsel } from "./index";
import type { AmpelWechsel } from "./types";

// -- Mocks --

jest.mock("@/lib/services/audit", () => ({
  writeAuditLog: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/lib/services/user-resolver", () => ({
  resolveUserEmails: jest.fn(),
}));

jest.mock("@/lib/services/email", () => ({
  sendEmail: jest.fn(),
}));

jest.mock("@/lib/services/email/templates/frist-eskalation", () => ({
  renderFristEskalation: jest.fn().mockReturnValue({
    subject: "Test Subject",
    html: "<p>Test</p>",
    text: "Test",
  }),
}));

import { resolveUserEmails } from "@/lib/services/user-resolver";
import { sendEmail } from "@/lib/services/email";
import { writeAuditLog } from "@/lib/services/audit";

const mockResolveUserEmails = resolveUserEmails as jest.MockedFunction<typeof resolveUserEmails>;
const mockSendEmail = sendEmail as jest.MockedFunction<typeof sendEmail>;

// -- Supabase-Mock --

function createMockSupabaseClient(overrides?: {
  upsertData?: Record<string, unknown>[] | null;
  upsertError?: { message: string } | null;
  selectData?: Record<string, unknown>[] | null;
  selectError?: { message: string } | null;
  deleteError?: { message: string } | null;
}) {
  const deleteResult = Promise.resolve({ error: overrides?.deleteError ?? null });
  const deleteChain = {
    eq: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue(deleteResult),
      }),
    }),
  };

  const selectChain = {
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue({
      data: overrides?.selectData ?? [],
      error: overrides?.selectError ?? null,
    }),
  };

  const upsertChain = {
    select: jest.fn().mockResolvedValue({
      data: overrides?.upsertData ?? [{ id: "new-id" }],
      error: overrides?.upsertError ?? null,
    }),
  };

  return {
    from: jest.fn().mockImplementation((table: string) => {
      if (table === "frist_benachrichtigungen") {
        return {
          upsert: jest.fn().mockReturnValue(upsertChain),
          delete: jest.fn().mockReturnValue(deleteChain),
        };
      }
      if (table === "config_user_benachrichtigungen") {
        return {
          select: jest.fn().mockReturnValue(selectChain),
        };
      }
      return {
        upsert: jest.fn().mockReturnValue(upsertChain),
        select: jest.fn().mockReturnValue(selectChain),
        delete: jest.fn().mockReturnValue(deleteChain),
      };
    }),
  } as unknown as jest.Mocked<import("@supabase/supabase-js").SupabaseClient>;
}

// -- Testdaten --

const TENANT_ID = "11111111-1111-1111-1111-111111111111";
const USER_SB = "22222222-2222-2222-2222-222222222222";
const USER_RL = "33333333-3333-3333-3333-333333333333";
const FRIST_ID = "44444444-4444-4444-4444-444444444444";
const VORGANG_ID = "55555555-5555-5555-5555-555555555555";

function makeWechsel(overrides?: Partial<AmpelWechsel>): AmpelWechsel {
  return {
    fristId: FRIST_ID,
    vorgangId: VORGANG_ID,
    tenantId: TENANT_ID,
    neuerStatus: "gelb",
    aktenzeichen: "BV-2026-001",
    fristTyp: "Gesamtfrist",
    restzeit: "5 Werktage",
    zustaendigerUserId: USER_SB,
    referatsleiterIds: [],
    ...overrides,
  };
}

describe("NotificationService — verarbeiteAmpelWechsel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = "https://app.test.de";
  });

  it("sollte leeres Ergebnis bei leerer Wechsel-Liste zurueckgeben", async () => {
    const client = createMockSupabaseClient();
    const result = await verarbeiteAmpelWechsel(client, TENANT_ID, []);

    expect(result).toEqual({ versendet: 0, uebersprungen: 0, fehler: 0 });
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("sollte E-Mail an Sachbearbeiter bei Gelb-Wechsel senden", async () => {
    mockResolveUserEmails.mockResolvedValue(new Map([[USER_SB, "sb@example.com"]]));
    mockSendEmail.mockResolvedValue({ success: true, messageId: "msg_1" });
    const client = createMockSupabaseClient();

    const result = await verarbeiteAmpelWechsel(client, TENANT_ID, [makeWechsel()]);

    expect(result.versendet).toBe(1);
    expect(result.uebersprungen).toBe(0);
    expect(result.fehler).toBe(0);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "sb@example.com" })
    );
  });

  it("sollte E-Mail an Sachbearbeiter UND Referatsleiter bei Rot-Wechsel senden", async () => {
    mockResolveUserEmails.mockResolvedValue(
      new Map([
        [USER_SB, "sb@example.com"],
        [USER_RL, "rl@example.com"],
      ])
    );
    mockSendEmail.mockResolvedValue({ success: true, messageId: "msg_1" });
    const client = createMockSupabaseClient();

    const wechsel = makeWechsel({
      neuerStatus: "rot",
      referatsleiterIds: [USER_RL],
    });

    const result = await verarbeiteAmpelWechsel(client, TENANT_ID, [wechsel]);

    expect(result.versendet).toBe(2);
    expect(mockSendEmail).toHaveBeenCalledTimes(2);
  });

  it("sollte Referatsleiter bei Gelb NICHT benachrichtigen", async () => {
    mockResolveUserEmails.mockResolvedValue(
      new Map([
        [USER_SB, "sb@example.com"],
        [USER_RL, "rl@example.com"],
      ])
    );
    mockSendEmail.mockResolvedValue({ success: true, messageId: "msg_1" });
    const client = createMockSupabaseClient();

    const wechsel = makeWechsel({
      neuerStatus: "gelb",
      referatsleiterIds: [USER_RL],
    });

    const result = await verarbeiteAmpelWechsel(client, TENANT_ID, [wechsel]);

    // Nur Sachbearbeiter, kein Referatsleiter bei Gelb
    expect(result.versendet).toBe(1);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
  });

  it("sollte Duplikat-Schutz: uebersprungen wenn Insert kein Ergebnis liefert", async () => {
    mockResolveUserEmails.mockResolvedValue(new Map([[USER_SB, "sb@example.com"]]));
    // upsertData = [] simuliert ein Duplikat (ON CONFLICT DO NOTHING, kein neuer Eintrag)
    const client = createMockSupabaseClient({ upsertData: [] });

    const result = await verarbeiteAmpelWechsel(client, TENANT_ID, [makeWechsel()]);

    expect(result.versendet).toBe(0);
    expect(result.uebersprungen).toBe(1);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("sollte Opt-out respektieren bei Gelb", async () => {
    mockResolveUserEmails.mockResolvedValue(new Map([[USER_SB, "sb@example.com"]]));
    const client = createMockSupabaseClient({
      selectData: [
        {
          id: "cfg-1",
          tenant_id: TENANT_ID,
          user_id: USER_SB,
          email_frist_gelb: false,
          email_frist_rot: true,
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
      ],
    });

    const result = await verarbeiteAmpelWechsel(client, TENANT_ID, [makeWechsel()]);

    expect(result.versendet).toBe(0);
    expect(result.uebersprungen).toBe(1);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("sollte Referatsleiter-Rot Opt-out ignorieren (AC-3)", async () => {
    mockResolveUserEmails.mockResolvedValue(new Map([[USER_RL, "rl@example.com"]]));
    mockSendEmail.mockResolvedValue({ success: true, messageId: "msg_1" });
    const client = createMockSupabaseClient({
      selectData: [
        {
          id: "cfg-2",
          tenant_id: TENANT_ID,
          user_id: USER_RL,
          email_frist_gelb: false,
          email_frist_rot: false, // Opt-out, aber Referatsleiter bei Rot → ignoriert
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
      ],
    });

    const wechsel = makeWechsel({
      neuerStatus: "rot",
      zustaendigerUserId: null,
      referatsleiterIds: [USER_RL],
    });

    const result = await verarbeiteAmpelWechsel(client, TENANT_ID, [wechsel]);

    expect(result.versendet).toBe(1);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
  });

  it("sollte Rate-Limit einhalten: max 50 pro Aufruf", async () => {
    // 60 Wechsel erstellen → nur 50 sollen versendet werden
    const wechselListe: AmpelWechsel[] = [];
    const emailMap = new Map<string, string>();

    for (let i = 0; i < 60; i++) {
      const userId = `${i.toString().padStart(8, "0")}-0000-0000-0000-000000000000`;
      emailMap.set(userId, `user${i}@example.com`);
      wechselListe.push(
        makeWechsel({
          fristId: `${i.toString().padStart(8, "0")}-1111-1111-1111-111111111111`,
          zustaendigerUserId: userId,
        })
      );
    }

    mockResolveUserEmails.mockResolvedValue(emailMap);
    mockSendEmail.mockResolvedValue({ success: true, messageId: "msg" });
    const client = createMockSupabaseClient();

    const result = await verarbeiteAmpelWechsel(client, TENANT_ID, wechselListe);

    expect(result.versendet).toBe(50);
    expect(result.uebersprungen).toBe(10);
    expect(mockSendEmail).toHaveBeenCalledTimes(50);
  });

  it("sollte uebersprungen zaehlen bei fehlender E-Mail-Adresse", async () => {
    mockResolveUserEmails.mockResolvedValue(new Map()); // keine Aufloesung
    const client = createMockSupabaseClient();

    const result = await verarbeiteAmpelWechsel(client, TENANT_ID, [makeWechsel()]);

    expect(result.versendet).toBe(0);
    expect(result.uebersprungen).toBe(1);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("sollte fehler zaehlen bei fehlgeschlagenem E-Mail-Versand", async () => {
    mockResolveUserEmails.mockResolvedValue(new Map([[USER_SB, "sb@example.com"]]));
    mockSendEmail.mockResolvedValue({ success: false });
    const client = createMockSupabaseClient();

    const result = await verarbeiteAmpelWechsel(client, TENANT_ID, [makeWechsel()]);

    expect(result.versendet).toBe(0);
    expect(result.fehler).toBe(1);
  });

  it("sollte Audit-Log schreiben bei erfolgreichem Versand", async () => {
    mockResolveUserEmails.mockResolvedValue(new Map([[USER_SB, "sb@example.com"]]));
    mockSendEmail.mockResolvedValue({ success: true, messageId: "msg_1" });
    const client = createMockSupabaseClient();

    await verarbeiteAmpelWechsel(client, TENANT_ID, [makeWechsel()]);

    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: TENANT_ID,
        action: "benachrichtigung.batch_versendet",
        resourceType: "frist_benachrichtigung",
        payload: expect.objectContaining({
          versendet: 1,
        }),
      })
    );
  });

  it("sollte kein Audit-Log schreiben wenn nichts versendet und kein Fehler", async () => {
    mockResolveUserEmails.mockResolvedValue(new Map());
    const client = createMockSupabaseClient();

    await verarbeiteAmpelWechsel(client, TENANT_ID, [makeWechsel()]);

    expect(writeAuditLog).not.toHaveBeenCalled();
  });
});
