import { hasMinRole, isAuthContext, type UserRole, type AuthContext } from "./auth";

// Mock Supabase-Module (werden von requireAuth/requireRole gebraucht)
jest.mock("@/lib/supabase-server", () => ({
  createServerClient: jest.fn(),
  createServiceRoleClient: jest.fn(),
}));

jest.mock("next/headers", () => ({
  cookies: jest.fn().mockResolvedValue({
    get: jest.fn().mockReturnValue({ value: "test-token" }),
  }),
}));

describe("hasMinRole", () => {
  const roles: UserRole[] = [
    "sachbearbeiter",
    "referatsleiter",
    "amtsleiter",
    "tenant_admin",
    "platform_admin",
  ];

  it("sollte gleiche Rolle als ausreichend bewerten", () => {
    for (const role of roles) {
      expect(hasMinRole(role, role)).toBe(true);
    }
  });

  it("sollte hoehere Rolle als ausreichend bewerten", () => {
    expect(hasMinRole("tenant_admin", "sachbearbeiter")).toBe(true);
    expect(hasMinRole("platform_admin", "tenant_admin")).toBe(true);
    expect(hasMinRole("referatsleiter", "sachbearbeiter")).toBe(true);
    expect(hasMinRole("amtsleiter", "referatsleiter")).toBe(true);
  });

  it("sollte niedrigere Rolle als unzureichend bewerten", () => {
    expect(hasMinRole("sachbearbeiter", "referatsleiter")).toBe(false);
    expect(hasMinRole("sachbearbeiter", "tenant_admin")).toBe(false);
    expect(hasMinRole("referatsleiter", "amtsleiter")).toBe(false);
    expect(hasMinRole("tenant_admin", "platform_admin")).toBe(false);
  });

  it("sollte die vollstaendige Hierarchie einhalten", () => {
    // sachbearbeiter < referatsleiter < amtsleiter < tenant_admin < platform_admin
    for (let i = 0; i < roles.length; i++) {
      for (let j = 0; j < roles.length; j++) {
        if (i >= j) {
          expect(hasMinRole(roles[i], roles[j])).toBe(true);
        } else {
          expect(hasMinRole(roles[i], roles[j])).toBe(false);
        }
      }
    }
  });
});

describe("isAuthContext", () => {
  it("sollte AuthContext erkennen", () => {
    const ctx: AuthContext = {
      userId: "test-user",
      email: "test@example.com",
      tenantId: "test-tenant",
      role: "sachbearbeiter",
    };
    expect(isAuthContext(ctx)).toBe(true);
  });

  it("sollte Response erkennen", () => {
    const response = new Response("test", { status: 401 });
    expect(isAuthContext(response)).toBe(false);
  });
});

describe("requireAuth", () => {
  const { createServerClient, createServiceRoleClient } =
    jest.requireMock("@/lib/supabase-server");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("sollte 401 zurueckgeben wenn keine Session existiert", async () => {
    createServerClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: { message: "No session" },
        }),
      },
    });

    const { requireAuth } = await import("./auth");
    const result = await requireAuth();

    expect(result instanceof Response).toBe(true);
    expect((result as Response).status).toBe(401);
  });

  it("sollte 403 zurueckgeben wenn User keinem Tenant zugeordnet ist", async () => {
    createServerClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "user-1", email: "test@test.de" } },
          error: null,
        }),
      },
    });

    createServiceRoleClient.mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: "No rows" },
              }),
            }),
          }),
        }),
      }),
    });

    const { requireAuth } = await import("./auth");
    const result = await requireAuth();

    expect(result instanceof Response).toBe(true);
    expect((result as Response).status).toBe(403);
  });

  it("sollte AuthContext zurueckgeben bei gueltigem User mit Tenant", async () => {
    createServerClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "user-1", email: "test@test.de" } },
          error: null,
        }),
      },
    });

    createServiceRoleClient.mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { tenant_id: "tenant-1", role: "sachbearbeiter" },
                error: null,
              }),
            }),
          }),
        }),
      }),
    });

    const { requireAuth } = await import("./auth");
    const result = await requireAuth();

    expect(isAuthContext(result as AuthContext)).toBe(true);
    const ctx = result as AuthContext;
    expect(ctx.userId).toBe("user-1");
    expect(ctx.tenantId).toBe("tenant-1");
    expect(ctx.role).toBe("sachbearbeiter");
  });
});

describe("requireRole", () => {
  const { createServerClient, createServiceRoleClient } =
    jest.requireMock("@/lib/supabase-server");

  beforeEach(() => {
    jest.clearAllMocks();
    // Setup: Authentifizierter Sachbearbeiter
    createServerClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "user-1", email: "test@test.de" } },
          error: null,
        }),
      },
    });
    createServiceRoleClient.mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { tenant_id: "tenant-1", role: "sachbearbeiter" },
                error: null,
              }),
            }),
          }),
        }),
      }),
    });
  });

  it("sollte 403 zurueckgeben wenn Rolle unzureichend", async () => {
    const { requireRole } = await import("./auth");
    const result = await requireRole("tenant_admin");

    expect(result instanceof Response).toBe(true);
    expect((result as Response).status).toBe(403);
  });

  it("sollte AuthContext zurueckgeben wenn Rolle ausreicht", async () => {
    const { requireRole } = await import("./auth");
    const result = await requireRole("sachbearbeiter");

    expect(isAuthContext(result as AuthContext)).toBe(true);
  });
});
