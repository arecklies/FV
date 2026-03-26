import { SECURITY_HEADERS, jsonResponse } from "./security-headers";

describe("Security Headers", () => {
  it("enthaelt alle Pflicht-Headers aus security.md", () => {
    expect(SECURITY_HEADERS["X-Frame-Options"]).toBe("DENY");
    expect(SECURITY_HEADERS["X-Content-Type-Options"]).toBe("nosniff");
    expect(SECURITY_HEADERS["Referrer-Policy"]).toBe("origin-when-cross-origin");
    expect(SECURITY_HEADERS["Strict-Transport-Security"]).toBe(
      "max-age=31536000; includeSubDomains"
    );
    expect(SECURITY_HEADERS["X-XSS-Protection"]).toBe("0");
    expect(SECURITY_HEADERS["Permissions-Policy"]).toBe(
      "camera=(), microphone=(), geolocation=()"
    );
  });

  it("jsonResponse setzt alle Security Headers", () => {
    const response = jsonResponse({ test: true });

    expect(response.status).toBe(200);
    expect(response.headers.get("X-Frame-Options")).toBe("DENY");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("jsonResponse respektiert Custom-Status", () => {
    const response = jsonResponse({ error: "test" }, 418);
    expect(response.status).toBe(418);
  });

  it("jsonResponse liefert JSON-Body", async () => {
    const response = jsonResponse({ key: "value" });
    const body = await response.json();
    expect(body.key).toBe("value");
  });
});
