import {
  validationError,
  unauthorizedError,
  forbiddenError,
  notFoundError,
  conflictError,
  serverError,
} from "./errors";

describe("Error-Helfer", () => {
  it("validationError: Status 400 mit Felddetails", async () => {
    const response = validationError({ email: "Ungültig" });
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toBe("Ungültige Eingabe");
    expect(body.fields.email).toBe("Ungültig");
  });

  it("unauthorizedError: Status 401", async () => {
    const response = unauthorizedError();
    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.error).toBe("Nicht authentifiziert");
  });

  it("unauthorizedError: Custom-Message", async () => {
    const response = unauthorizedError("Token abgelaufen");
    const body = await response.json();
    expect(body.error).toBe("Token abgelaufen");
  });

  it("forbiddenError: Status 403", async () => {
    const response = forbiddenError();
    expect(response.status).toBe(403);

    const body = await response.json();
    expect(body.error).toBe("Nicht autorisiert");
  });

  it("notFoundError: Status 404", async () => {
    const response = notFoundError();
    expect(response.status).toBe(404);
  });

  it("conflictError: Status 409", async () => {
    const response = conflictError("Duplikat");
    expect(response.status).toBe(409);

    const body = await response.json();
    expect(body.error).toBe("Duplikat");
  });

  it("serverError: Status 500, keine internen Details an Client", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    const response = serverError("DB connection failed", { code: "ECONNREFUSED" });
    expect(response.status).toBe(500);

    const body = await response.json();
    // Kein interner Fehlertext an Client (security.md: Error-Leakage-Verbot)
    expect(body.error).not.toContain("DB connection");
    expect(body.error).not.toContain("ECONNREFUSED");
    expect(body.error).toContain("interner Fehler");

    // Aber im Server-Log
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("DB connection failed"),
      expect.objectContaining({ code: "ECONNREFUSED" })
    );

    consoleSpy.mockRestore();
  });

  it("alle Error-Responses enthalten Security Headers", async () => {
    const responses = [
      validationError({ x: "y" }),
      unauthorizedError(),
      forbiddenError(),
      notFoundError(),
      conflictError(),
      serverError("test", undefined),
    ];

    for (const response of responses) {
      expect(response.headers.get("X-Frame-Options")).toBe("DENY");
      expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
      expect(response.headers.get("X-XSS-Protection")).toBe("0");
    }
  });
});
