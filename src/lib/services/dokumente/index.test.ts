/**
 * Unit-Tests fuer DokumentenService (PROJ-5)
 *
 * Mock-Pattern: Supabase Fluent-API-Chain wird als verschachteltes Objekt gemockt.
 * writeAuditLog wird als no-op gemockt.
 * createServiceRoleClient wird fuer Storage-Operationen gemockt.
 */

// -- Mocks muessen VOR den Imports stehen (jest.mock hoisting) --

jest.mock("@/lib/services/audit", () => ({
  writeAuditLog: jest.fn().mockResolvedValue(undefined),
}));

const mockStorageFrom = jest.fn();
const mockCreateSignedUploadUrl = jest.fn();
const mockCreateSignedUrl = jest.fn();

jest.mock("@/lib/supabase-server", () => ({
  createServiceRoleClient: jest.fn(() => ({
    storage: {
      from: mockStorageFrom.mockReturnValue({
        createSignedUploadUrl: mockCreateSignedUploadUrl,
        createSignedUrl: mockCreateSignedUrl,
      }),
    },
  })),
}));

import {
  erstelleDokument,
  bestaetigeUpload,
  holeDokumente,
  holeDokumentMitVersionen,
  aktualisiereMetadaten,
  erzeugeDownloadUrl,
  erstelleVersion,
  berechneStoragePfad,
} from "./index";
import { writeAuditLog } from "@/lib/services/audit";
import type { CreateDokumentInput, CreateVersionInput, UpdateDokumentInput } from "./types";

// -- Hilfsfunktionen fuer Supabase-Mock --

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
  const callCountMap = new Map<string, number>();

  const mockFrom = jest.fn((table: string) => {
    const count = callCountMap.get(table) ?? 0;
    const key = `${table}__${count}`;
    callCountMap.set(table, count + 1);
    if (!fromMap.has(key)) {
      fromMap.set(key, createChainMock());
    }
    return fromMap.get(key)!.proxy;
  });

  return {
    from: mockFrom,
    setResult(table: string, callIndex: number, result: Record<string, any>) {
      const key = `${table}__${callIndex}`;
      fromMap.set(key, createChainMock(result));
    },
    getChain(table: string, callIndex: number) {
      const key = `${table}__${callIndex}`;
      return fromMap.get(key)?.chain ?? {};
    },
  };
}

// -- Testdaten --

const TENANT_ID = "a1111111-1111-4111-a111-111111111111";
const USER_ID = "a2222222-2222-4222-a222-222222222222";
const VORGANG_ID = "a3333333-3333-4333-a333-333333333333";
const DOKUMENT_ID = "a4444444-4444-4444-a444-444444444444";
const VERSION_ID = "a5555555-5555-4555-a555-555555555555";

const MOCK_DOKUMENT = {
  id: DOKUMENT_ID,
  tenant_id: TENANT_ID,
  vorgang_id: VORGANG_ID,
  dateiname: "bauplan.pdf",
  kategorie: "plaene",
  beschreibung: "Erdgeschoss Grundriss",
  schlagwoerter: ["EG", "Grundriss"],
  aktuelle_version: 1,
  status: "active",
  uploaded_by: USER_ID,
  uploaded_at: "2026-03-29T10:00:00Z",
  created_at: "2026-03-29T10:00:00Z",
  updated_at: "2026-03-29T10:00:00Z",
};

const MOCK_DOKUMENT_UPLOADING = {
  ...MOCK_DOKUMENT,
  status: "uploading",
};

const MOCK_VERSION = {
  id: VERSION_ID,
  tenant_id: TENANT_ID,
  dokument_id: DOKUMENT_ID,
  version: 1,
  dateiname: "bauplan.pdf",
  mime_type: "application/pdf",
  dateigroesse: 1024000,
  storage_pfad: `${TENANT_ID}/${VORGANG_ID}/${DOKUMENT_ID}/v1/original.pdf`,
  uploaded_by: USER_ID,
  uploaded_at: "2026-03-29T10:00:00Z",
  ocr_text: null,
  created_at: "2026-03-29T10:00:00Z",
};

// -- Tests --

describe("DokumentenService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("berechneStoragePfad", () => {
    it("sollte korrekten Pfad fuer PDF berechnen", () => {
      const pfad = berechneStoragePfad(TENANT_ID, VORGANG_ID, DOKUMENT_ID, 1, "application/pdf");
      expect(pfad).toBe(`${TENANT_ID}/${VORGANG_ID}/${DOKUMENT_ID}/v1/original.pdf`);
    });

    it("sollte korrekten Pfad fuer TIFF Version 3 berechnen", () => {
      const pfad = berechneStoragePfad(TENANT_ID, VORGANG_ID, DOKUMENT_ID, 3, "image/tiff");
      expect(pfad).toBe(`${TENANT_ID}/${VORGANG_ID}/${DOKUMENT_ID}/v3/original.tiff`);
    });

    it("sollte 'bin' als Fallback-Endung verwenden", () => {
      const pfad = berechneStoragePfad(TENANT_ID, VORGANG_ID, DOKUMENT_ID, 1, "application/unknown");
      expect(pfad).toContain("/original.bin");
    });
  });

  describe("erstelleDokument", () => {
    it("sollte Dokument erstellen und Upload-URL zurueckgeben (Happy Path)", async () => {
      const mockClient = createMockClient();
      // 1. Insert: vorgang_dokumente
      mockClient.setResult("vorgang_dokumente", 0, { data: MOCK_DOKUMENT_UPLOADING, error: null });

      // Storage-Mock
      mockCreateSignedUploadUrl.mockResolvedValue({
        data: { signedUrl: "https://storage.example.com/upload?token=abc" },
        error: null,
      });

      const input: CreateDokumentInput = {
        dateiname: "bauplan.pdf",
        mime_type: "application/pdf",
        dateigroesse: 1024000,
        kategorie: "plaene",
        beschreibung: "Erdgeschoss Grundriss",
        schlagwoerter: ["EG", "Grundriss"],
      };

      const result = await erstelleDokument(mockClient as any, TENANT_ID, USER_ID, VORGANG_ID, input);

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data!.dokument.id).toBe(DOKUMENT_ID);
      expect(result.data!.uploadUrl).toBe("https://storage.example.com/upload?token=abc");
      expect(writeAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "dokument.erstellt",
          resourceType: "vorgang_dokumente",
        })
      );
    });

    it("sollte bei ungueltigem MIME-Type ablehnen", async () => {
      const mockClient = createMockClient();

      const input: CreateDokumentInput = {
        dateiname: "virus.exe",
        mime_type: "application/x-msdownload",
        dateigroesse: 5000,
        kategorie: "sonstiges",
      };

      const result = await erstelleDokument(mockClient as any, TENANT_ID, USER_ID, VORGANG_ID, input);

      expect(result.error).toBe("Nicht unterstützter Dateityp");
      expect(result.data).toBeNull();
    });

    it("sollte bei inkonsistentem MIME-Type und Dateiendung ablehnen", async () => {
      const mockClient = createMockClient();

      const input: CreateDokumentInput = {
        dateiname: "bild.jpg",
        mime_type: "application/pdf",
        dateigroesse: 5000,
        kategorie: "sonstiges",
      };

      const result = await erstelleDokument(mockClient as any, TENANT_ID, USER_ID, VORGANG_ID, input);

      expect(result.error).toBe("Dateiendung passt nicht zum angegebenen Dateityp");
      expect(result.data).toBeNull();
    });
  });

  describe("bestaetigeUpload", () => {
    it("sollte Status von uploading auf active setzen und Version 1 erstellen", async () => {
      const mockClient = createMockClient();
      // 1. Select: Dokument mit Status uploading
      mockClient.setResult("vorgang_dokumente", 0, { data: MOCK_DOKUMENT_UPLOADING, error: null });
      // 2. Insert: Version 1
      mockClient.setResult("vorgang_dokument_versionen", 0, { data: MOCK_VERSION, error: null });
      // 3. Update: Status auf active
      mockClient.setResult("vorgang_dokumente", 1, { data: { ...MOCK_DOKUMENT, status: "active" }, error: null });

      const result = await bestaetigeUpload(mockClient as any, TENANT_ID, DOKUMENT_ID);

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data!.status).toBe("active");
    });

    it("sollte fehlschlagen wenn Dokument nicht im uploading-Status ist", async () => {
      const mockClient = createMockClient();
      // Select: Kein Ergebnis (Dokument nicht im uploading-Status)
      mockClient.setResult("vorgang_dokumente", 0, { data: null, error: { message: "not found" } });

      const result = await bestaetigeUpload(mockClient as any, TENANT_ID, DOKUMENT_ID);

      expect(result.error).toBe("Dokument nicht gefunden oder bereits bestätigt");
      expect(result.data).toBeNull();
    });
  });

  describe("holeDokumente", () => {
    it("sollte Dokumente mit Zod-Parsing zurueckgeben", async () => {
      const mockClient = createMockClient();
      mockClient.setResult("vorgang_dokumente", 0, {
        data: [MOCK_DOKUMENT, { ...MOCK_DOKUMENT, id: "a6666666-6666-4666-a666-666666666666", dateiname: "gutachten.pdf" }],
        error: null,
      });

      const result = await holeDokumente(mockClient as any, TENANT_ID, VORGANG_ID);

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(2);
      expect(result.data[0].dateiname).toBe("bauplan.pdf");
      expect(result.data[1].dateiname).toBe("gutachten.pdf");
    });

    it("sollte leere Liste bei keinen Dokumenten zurueckgeben", async () => {
      const mockClient = createMockClient();
      mockClient.setResult("vorgang_dokumente", 0, { data: [], error: null });

      const result = await holeDokumente(mockClient as any, TENANT_ID, VORGANG_ID);

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(0);
    });

    it("sollte Fehler behandeln", async () => {
      const mockClient = createMockClient();
      mockClient.setResult("vorgang_dokumente", 0, { data: null, error: { message: "DB error" } });

      const result = await holeDokumente(mockClient as any, TENANT_ID, VORGANG_ID);

      expect(result.error).toBe("Dokumente konnten nicht geladen werden");
    });
  });

  describe("holeDokumentMitVersionen", () => {
    it("sollte Dokument mit Versionen zurueckgeben", async () => {
      const mockClient = createMockClient();
      mockClient.setResult("vorgang_dokumente", 0, { data: MOCK_DOKUMENT, error: null });
      mockClient.setResult("vorgang_dokument_versionen", 0, { data: [MOCK_VERSION], error: null });

      const result = await holeDokumentMitVersionen(mockClient as any, TENANT_ID, DOKUMENT_ID);

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data!.dokument.id).toBe(DOKUMENT_ID);
      expect(result.data!.versionen).toHaveLength(1);
      expect(result.data!.versionen[0].version).toBe(1);
    });

    it("sollte null zurueckgeben wenn Dokument nicht existiert", async () => {
      const mockClient = createMockClient();
      mockClient.setResult("vorgang_dokumente", 0, { data: null, error: { message: "not found" } });

      const result = await holeDokumentMitVersionen(mockClient as any, TENANT_ID, DOKUMENT_ID);

      expect(result.error).toBe("Dokument nicht gefunden");
    });
  });

  describe("aktualisiereMetadaten", () => {
    it("sollte Kategorie aktualisieren", async () => {
      const mockClient = createMockClient();
      const updatedDok = { ...MOCK_DOKUMENT, kategorie: "gutachten" };
      mockClient.setResult("vorgang_dokumente", 0, { data: updatedDok, error: null });

      const input: UpdateDokumentInput = { kategorie: "gutachten" };
      const result = await aktualisiereMetadaten(mockClient as any, TENANT_ID, DOKUMENT_ID, input);

      expect(result.error).toBeNull();
      expect(result.data!.kategorie).toBe("gutachten");
    });

    it("sollte bei leerer Aenderung einen Fehler zurueckgeben", async () => {
      const mockClient = createMockClient();

      const result = await aktualisiereMetadaten(mockClient as any, TENANT_ID, DOKUMENT_ID, {});

      expect(result.error).toBe("Keine Änderungen angegeben");
    });
  });

  describe("erzeugeDownloadUrl", () => {
    it("sollte signierte Download-URL zurueckgeben", async () => {
      const mockClient = createMockClient();
      mockClient.setResult("vorgang_dokument_versionen", 0, { data: MOCK_VERSION, error: null });

      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: "https://storage.example.com/download?token=xyz" },
        error: null,
      });

      const result = await erzeugeDownloadUrl(mockClient as any, TENANT_ID, DOKUMENT_ID);

      expect(result.error).toBeNull();
      expect(result.data!.url).toBe("https://storage.example.com/download?token=xyz");
      expect(result.data!.dateiname).toBe("bauplan.pdf");
    });

    it("sollte Fehler wenn Version nicht gefunden", async () => {
      const mockClient = createMockClient();
      mockClient.setResult("vorgang_dokument_versionen", 0, { data: null, error: { message: "not found" } });

      const result = await erzeugeDownloadUrl(mockClient as any, TENANT_ID, DOKUMENT_ID, 99);

      expect(result.error).toBe("Version nicht gefunden");
    });
  });

  describe("erstelleVersion", () => {
    it("sollte neue Version erstellen und Upload-URL zurueckgeben", async () => {
      const mockClient = createMockClient();
      // 1. Select: Dokument laden
      mockClient.setResult("vorgang_dokumente", 0, { data: MOCK_DOKUMENT, error: null });
      // 2. Insert: Neue Version
      const newVersion = { ...MOCK_VERSION, id: "a7777777-7777-4777-a777-777777777777", version: 2 };
      mockClient.setResult("vorgang_dokument_versionen", 0, { data: newVersion, error: null });
      // 3. Update: aktuelle_version
      mockClient.setResult("vorgang_dokumente", 1, { data: null, error: null });

      mockCreateSignedUploadUrl.mockResolvedValue({
        data: { signedUrl: "https://storage.example.com/upload?token=v2" },
        error: null,
      });

      const input: CreateVersionInput = {
        dateiname: "bauplan_v2.pdf",
        mime_type: "application/pdf",
        dateigroesse: 2048000,
      };

      const result = await erstelleVersion(mockClient as any, TENANT_ID, USER_ID, DOKUMENT_ID, input);

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data!.version.version).toBe(2);
      expect(result.data!.uploadUrl).toBe("https://storage.example.com/upload?token=v2");
      expect(writeAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "dokument.version_erstellt",
        })
      );
    });

    it("sollte bei ungueltigem MIME-Type ablehnen", async () => {
      const mockClient = createMockClient();

      const input: CreateVersionInput = {
        dateiname: "script.sh",
        mime_type: "application/x-sh",
        dateigroesse: 100,
      };

      const result = await erstelleVersion(mockClient as any, TENANT_ID, USER_ID, DOKUMENT_ID, input);

      expect(result.error).toBe("Nicht unterstützter Dateityp");
    });
  });
});
