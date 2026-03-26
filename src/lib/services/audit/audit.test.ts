jest.mock("@/lib/supabase-server", () => ({
  createServiceRoleClient: jest.fn(),
}));

import { writeAuditLog } from "./index";
import { createServiceRoleClient } from "@/lib/supabase-server";

const mockInsert = jest.fn();
const mockFrom = jest.fn().mockReturnValue({ insert: mockInsert });

describe("writeAuditLog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createServiceRoleClient as jest.Mock).mockReturnValue({ from: mockFrom });
    mockInsert.mockResolvedValue({ error: null });
  });

  it("sollte Audit-Eintrag mit allen Feldern schreiben", async () => {
    await writeAuditLog({
      tenantId: "tenant-1",
      userId: "user-1",
      action: "test.action",
      resourceType: "test",
      resourceId: "res-1",
      payload: { key: "value" },
      ipAddress: "127.0.0.1",
    });

    expect(mockFrom).toHaveBeenCalledWith("audit_log");
    expect(mockInsert).toHaveBeenCalledWith({
      tenant_id: "tenant-1",
      user_id: "user-1",
      action: "test.action",
      resource_type: "test",
      resource_id: "res-1",
      payload: { key: "value" },
      ip_address: "127.0.0.1",
    });
  });

  it("sollte optionale Felder mit null fuellen", async () => {
    await writeAuditLog({
      tenantId: null,
      userId: null,
      action: "auth.login_failed",
      resourceType: "auth",
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        resource_id: null,
        payload: {},
        ip_address: null,
      })
    );
  });

  it("sollte bei DB-Fehler loggen aber nicht werfen", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    mockInsert.mockResolvedValue({ error: { message: "DB down" } });

    // Sollte NICHT werfen (ADR-005: Audit-Fehler blockieren nicht den Request)
    await expect(
      writeAuditLog({
        tenantId: "t-1",
        userId: "u-1",
        action: "test",
        resourceType: "test",
      })
    ).resolves.toBeUndefined();

    expect(consoleSpy).toHaveBeenCalledWith(
      "[AUDIT_LOG_ERROR]",
      "DB down",
      expect.any(Object)
    );

    consoleSpy.mockRestore();
  });
});
