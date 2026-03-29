import { success, failure, mapServiceError } from "./result";
import type { ServiceResult, ErrorCode } from "./result";

/**
 * Tests fuer ServiceResult (PROJ-24)
 */

describe("ServiceResult", () => {
  describe("success()", () => {
    it("sollte ok: true mit data liefern", () => {
      const result = success({ id: "abc", name: "Test" });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual({ id: "abc", name: "Test" });
      }
    });

    it("sollte mit primitiven Werten funktionieren", () => {
      const result = success(42);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toBe(42);
      }
    });

    it("sollte mit null als data funktionieren", () => {
      const result = success(null);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toBeNull();
      }
    });

    it("sollte mit Arrays funktionieren", () => {
      const result = success([1, 2, 3]);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual([1, 2, 3]);
      }
    });
  });

  describe("failure()", () => {
    it("sollte ok: false mit code und message liefern", () => {
      const result = failure("NOT_FOUND", "Frist nicht gefunden");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("NOT_FOUND");
        expect(result.message).toBe("Frist nicht gefunden");
      }
    });

    it("sollte alle ErrorCodes akzeptieren", () => {
      const codes: ErrorCode[] = [
        "NOT_FOUND",
        "CONFLICT",
        "VALIDATION_ERROR",
        "FORBIDDEN",
        "DB_ERROR",
      ];

      for (const code of codes) {
        const result = failure(code, `Fehler: ${code}`);
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.code).toBe(code);
        }
      }
    });
  });

  describe("TypeScript Narrowing", () => {
    it("sollte nach ok-Check data verfuegbar machen", () => {
      const result: ServiceResult<{ id: string }> = success({ id: "123" });

      if (result.ok) {
        // TypeScript weiss hier: result.data ist { id: string }
        const id: string = result.data.id;
        expect(id).toBe("123");
      }
    });

    it("sollte nach !ok-Check code und message verfuegbar machen", () => {
      const result: ServiceResult<{ id: string }> = failure("CONFLICT", "Duplikat");

      if (!result.ok) {
        // TypeScript weiss hier: result.code und result.message existieren
        const code: ErrorCode = result.code;
        const message: string = result.message;
        expect(code).toBe("CONFLICT");
        expect(message).toBe("Duplikat");
      }
    });
  });

  describe("mapServiceError()", () => {
    it("sollte NOT_FOUND auf 404 mappen", async () => {
      const result = failure("NOT_FOUND", "Frist nicht gefunden");
      if (!result.ok) {
        const response = mapServiceError(result);
        expect(response.status).toBe(404);
        const body = await response.json();
        expect(body.error).toBe("Frist nicht gefunden");
      }
    });

    it("sollte CONFLICT auf 409 mappen", async () => {
      const result = failure("CONFLICT", "Frist ist bereits gehemmt");
      if (!result.ok) {
        const response = mapServiceError(result);
        expect(response.status).toBe(409);
        const body = await response.json();
        expect(body.error).toBe("Frist ist bereits gehemmt");
      }
    });

    it("sollte VALIDATION_ERROR auf 400 mappen", async () => {
      const result = failure("VALIDATION_ERROR", "Werktage muessen positiv sein");
      if (!result.ok) {
        const response = mapServiceError(result);
        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.error).toBe("Ungültige Eingabe");
        expect(body.fields._error).toBe("Werktage muessen positiv sein");
      }
    });

    it("sollte FORBIDDEN auf 403 mappen", async () => {
      const result = failure("FORBIDDEN", "Kein Zugriff auf diesen Vorgang");
      if (!result.ok) {
        const response = mapServiceError(result);
        expect(response.status).toBe(403);
        const body = await response.json();
        expect(body.error).toBe("Kein Zugriff auf diesen Vorgang");
      }
    });

    it("sollte DB_ERROR auf 500 mappen ohne interne Details im Body", async () => {
      // console.error wird von serverError() aufgerufen - unterdruecken im Test
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      const result = failure("DB_ERROR", "connection refused to db host");
      if (!result.ok) {
        const response = mapServiceError(result);
        expect(response.status).toBe(500);
        const body = await response.json();
        // Interne Fehlermeldung darf NICHT im Body stehen (Error-Leakage-Verbot)
        expect(body.error).not.toContain("connection refused");
        expect(body.error).toBe(
          "Ein interner Fehler ist aufgetreten. Bitte versuchen Sie es später erneut."
        );
      }

      consoleSpy.mockRestore();
    });

    it("sollte alle ErrorCodes exhaustiv behandeln", () => {
      // Dieser Test stellt sicher, dass mapServiceError alle Codes abdeckt
      const codeStatusMap: Record<ErrorCode, number> = {
        NOT_FOUND: 404,
        CONFLICT: 409,
        VALIDATION_ERROR: 400,
        FORBIDDEN: 403,
        DB_ERROR: 500,
      };

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      for (const [code, expectedStatus] of Object.entries(codeStatusMap)) {
        const result = failure(code as ErrorCode, "test");
        if (!result.ok) {
          const response = mapServiceError(result);
          expect(response.status).toBe(expectedStatus);
        }
      }

      consoleSpy.mockRestore();
    });
  });
});
