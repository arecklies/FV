import { NextRequest } from "next/server";
import { z } from "zod";
import { parseJsonBody, validateUuidParam, validateVorgangAccess } from "./route-helpers";

// ─── Mocks ───────────────────────────────────────────────────────────

// Mock getVorgang (muss vor import stehen)
const mockGetVorgang = jest.fn();
jest.mock("@/lib/services/verfahren", () => ({
  getVorgang: (...args: unknown[]) => mockGetVorgang(...args),
}));

// ─── Test-Schemas ────────────────────────────────────────────────────

const TestSchema = z.object({
  name: z.string().min(1, "Name ist Pflichtfeld"),
  count: z.number().int().positive("Muss positiv sein"),
});

// ─── Helpers ─────────────────────────────────────────────────────────

function jsonRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function invalidJsonRequest(): NextRequest {
  return new NextRequest("http://localhost/api/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "not-json{{{",
  });
}

// ─── parseJsonBody ───────────────────────────────────────────────────

describe("parseJsonBody", () => {
  it("gibt validierte Daten bei gueltigem Body zurueck", async () => {
    const request = jsonRequest({ name: "Test", count: 5 });
    const result = await parseJsonBody(request, TestSchema, "[TEST]");

    expect(result.error).toBeNull();
    expect(result.data).toEqual({ name: "Test", count: 5 });
  });

  it("gibt 400-Response bei Zod-Validierungsfehler zurueck", async () => {
    const request = jsonRequest({ name: "", count: -1 });
    const result = await parseJsonBody(request, TestSchema, "[TEST]");

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Response);
    expect(result.error!.status).toBe(400);

    const body = await result.error!.json();
    expect(body.error).toBe("Ungültige Eingabe");
    expect(body.fields).toBeDefined();
    expect(body.fields.name).toBe("Name ist Pflichtfeld");
    expect(body.fields.count).toBe("Muss positiv sein");
  });

  it("gibt 400-Response bei fehlenden Pflichtfeldern zurueck", async () => {
    const request = jsonRequest({});
    const result = await parseJsonBody(request, TestSchema, "[TEST]");

    expect(result.data).toBeNull();
    expect(result.error!.status).toBe(400);

    const body = await result.error!.json();
    expect(body.fields.name).toBeDefined();
    expect(body.fields.count).toBeDefined();
  });

  it("gibt 500-Response bei ungueltigem JSON zurueck", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    const request = invalidJsonRequest();
    const result = await parseJsonBody(request, TestSchema, "[PROJ-99] POST /api/test");

    expect(result.data).toBeNull();
    expect(result.error!.status).toBe(500);

    const body = await result.error!.json();
    // Error-Leakage-Verbot: keine internen Details
    expect(body.error).toContain("interner Fehler");

    // Server-Log muss Prefix enthalten
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("[PROJ-99] POST /api/test: parse error"),
      expect.anything()
    );

    consoleSpy.mockRestore();
  });

  it("Security Headers sind gesetzt", async () => {
    const request = jsonRequest({ name: "", count: -1 });
    const result = await parseJsonBody(request, TestSchema, "[TEST]");

    expect(result.error!.headers.get("X-Frame-Options")).toBe("DENY");
    expect(result.error!.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("unterstuetzt verschachtelte Zod-Pfade", async () => {
    const NestedSchema = z.object({
      address: z.object({
        city: z.string().min(1, "Stadt ist Pflichtfeld"),
      }),
    });

    const request = jsonRequest({ address: { city: "" } });
    const result = await parseJsonBody(request, NestedSchema, "[TEST]");

    expect(result.error!.status).toBe(400);
    const body = await result.error!.json();
    expect(body.fields["address.city"]).toBe("Stadt ist Pflichtfeld");
  });
});

// ─── validateUuidParam ───────────────────────────────────────────────

describe("validateUuidParam", () => {
  const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

  it("gibt validierte UUID bei gueltigem Format zurueck", () => {
    const result = validateUuidParam(VALID_UUID, "Vorgang-ID");

    expect(result.error).toBeNull();
    expect(result.id).toBe(VALID_UUID);
  });

  it("gibt 400-Response bei ungueltigem UUID-Format zurueck", () => {
    const result = validateUuidParam("nicht-eine-uuid", "Vorgang-ID");

    expect(result.id).toBeNull();
    expect(result.error).toBeInstanceOf(Response);
    expect(result.error!.status).toBe(400);
  });

  it("enthaelt den Feldnamen in der Fehlermeldung", async () => {
    const result = validateUuidParam("xxx", "Nachrichten-ID");

    const body = await result.error!.json();
    expect(body.fields.id).toBe("Ungültige Nachrichten-ID");
  });

  it("verwendet Standard-Feldnamen wenn keiner angegeben", async () => {
    const result = validateUuidParam("xxx");

    const body = await result.error!.json();
    expect(body.fields.id).toBe("Ungültige ID");
  });

  it("gibt 400 bei leerem String zurueck", () => {
    const result = validateUuidParam("");
    expect(result.id).toBeNull();
    expect(result.error!.status).toBe(400);
  });

  it("Security Headers sind gesetzt", () => {
    const result = validateUuidParam("invalid");
    expect(result.error!.headers.get("X-Frame-Options")).toBe("DENY");
  });
});

// ─── validateVorgangAccess ───────────────────────────────────────────

describe("validateVorgangAccess", () => {
  const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";
  const TENANT_ID = "660e8400-e29b-41d4-a716-446655440000";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockClient = {} as any;

  beforeEach(() => {
    mockGetVorgang.mockReset();
  });

  it("gibt Vorgang zurueck wenn UUID gueltig und Vorgang existiert", async () => {
    const mockVorgang = {
      id: VALID_UUID,
      tenant_id: TENANT_ID,
      aktenzeichen: "AZ-001",
      bundesland: "NW",
    };
    mockGetVorgang.mockResolvedValue({ data: mockVorgang, error: null });

    const result = await validateVorgangAccess(mockClient, TENANT_ID, VALID_UUID);

    expect(result.error).toBeNull();
    expect(result.vorgang).toEqual(mockVorgang);
    expect(mockGetVorgang).toHaveBeenCalledWith(mockClient, TENANT_ID, VALID_UUID);
  });

  it("gibt 400-Response bei ungueltiger UUID zurueck ohne getVorgang aufzurufen", async () => {
    const result = await validateVorgangAccess(mockClient, TENANT_ID, "nicht-uuid");

    expect(result.vorgang).toBeNull();
    expect(result.error!.status).toBe(400);
    expect(mockGetVorgang).not.toHaveBeenCalled();
  });

  it("gibt 404-Response wenn Vorgang nicht gefunden", async () => {
    mockGetVorgang.mockResolvedValue({ data: null, error: "Not found" });

    const result = await validateVorgangAccess(mockClient, TENANT_ID, VALID_UUID);

    expect(result.vorgang).toBeNull();
    expect(result.error!.status).toBe(404);

    const body = await result.error!.json();
    expect(body.error).toBe("Vorgang nicht gefunden");
  });

  it("gibt 404-Response bei DB-Fehler (kein Error-Leakage)", async () => {
    mockGetVorgang.mockResolvedValue({ data: null, error: "connection refused" });

    const result = await validateVorgangAccess(mockClient, TENANT_ID, VALID_UUID);

    expect(result.vorgang).toBeNull();
    expect(result.error!.status).toBe(404);

    // Fehlermeldung verraet nicht den internen Fehler
    const body = await result.error!.json();
    expect(body.error).toBe("Vorgang nicht gefunden");
    expect(body.error).not.toContain("connection");
  });
});
