import { sendEmail, isEmailConfigured } from "./index";
import type { EmailPayload } from "./types";

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

const testPayload: EmailPayload = {
  to: "test@example.com",
  subject: "Test Subject",
  html: "<p>Test</p>",
  text: "Test",
};

describe("EmailProviderService", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("isEmailConfigured", () => {
    it("sollte false zurueckgeben wenn RESEND_API_KEY fehlt", () => {
      delete process.env.RESEND_API_KEY;
      expect(isEmailConfigured()).toBe(false);
    });

    it("sollte false zurueckgeben wenn RESEND_API_KEY leer ist", () => {
      process.env.RESEND_API_KEY = "";
      expect(isEmailConfigured()).toBe(false);
    });

    it("sollte true zurueckgeben wenn RESEND_API_KEY gesetzt ist", () => {
      process.env.RESEND_API_KEY = "re_test_123";
      expect(isEmailConfigured()).toBe(true);
    });
  });

  describe("sendEmail", () => {
    it("sollte { success: false } zurueckgeben wenn API-Key fehlt", async () => {
      delete process.env.RESEND_API_KEY;
      const warnSpy = jest.spyOn(console, "warn").mockImplementation();

      const result = await sendEmail(testPayload);

      expect(result.success).toBe(false);
      expect(result.messageId).toBeUndefined();
      expect(mockFetch).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("RESEND_API_KEY nicht konfiguriert")
      );
      warnSpy.mockRestore();
    });

    it("sollte E-Mail erfolgreich versenden (Resend gemockt)", async () => {
      process.env.RESEND_API_KEY = "re_test_123";
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "msg_abc123" }),
      });

      const result = await sendEmail(testPayload);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe("msg_abc123");
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.resend.com/emails",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Authorization: "Bearer re_test_123",
          }),
        })
      );
    });

    it("sollte { success: false } bei HTTP-Fehler zurueckgeben", async () => {
      process.env.RESEND_API_KEY = "re_test_123";
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
      });
      const errorSpy = jest.spyOn(console, "error").mockImplementation();

      const result = await sendEmail(testPayload);

      expect(result.success).toBe(false);
      expect(result.messageId).toBeUndefined();
      expect(errorSpy).toHaveBeenCalledWith(
        "[PROJ-38] E-Mail-Versand fehlgeschlagen",
        expect.objectContaining({ status: 429 })
      );
      errorSpy.mockRestore();
    });

    it("sollte { success: false } bei Netzwerkfehler zurueckgeben", async () => {
      process.env.RESEND_API_KEY = "re_test_123";
      mockFetch.mockRejectedValueOnce(new Error("Network error"));
      const errorSpy = jest.spyOn(console, "error").mockImplementation();

      const result = await sendEmail(testPayload);

      expect(result.success).toBe(false);
      expect(errorSpy).toHaveBeenCalledWith("[PROJ-38] E-Mail-Versand Netzwerkfehler");
      errorSpy.mockRestore();
    });

    it("sollte keine PII im Error-Log enthalten", async () => {
      process.env.RESEND_API_KEY = "re_test_123";
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });
      const errorSpy = jest.spyOn(console, "error").mockImplementation();

      await sendEmail(testPayload);

      // Pruefe dass keine E-Mail-Adresse oder Inhalte geloggt werden
      const logCalls = errorSpy.mock.calls.flat().map(String);
      const logOutput = logCalls.join(" ");
      expect(logOutput).not.toContain("test@example.com");
      expect(logOutput).not.toContain("Test Subject");
      errorSpy.mockRestore();
    });

    it("sollte RESEND_FROM_ADDRESS aus Env verwenden wenn gesetzt", async () => {
      process.env.RESEND_API_KEY = "re_test_123";
      process.env.RESEND_FROM_ADDRESS = "Custom <custom@example.com>";
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "msg_456" }),
      });

      await sendEmail(testPayload);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.from).toBe("Custom <custom@example.com>");
    });
  });
});
