/**
 * Unit-Tests für UserResolverService (PROJ-47 US-1)
 */

import { resolveUserEmails } from "./index";

describe("resolveUserEmails", () => {
  function createMockClient(users: Array<{ id: string; email: string }>, shouldFail = false) {
    return {
      auth: {
        admin: {
          getUserById: jest.fn(async (id: string) => {
            if (shouldFail) {
              return { data: null, error: { message: "Not found" } };
            }
            const user = users.find((u) => u.id === id);
            if (user) {
              return { data: { user: { email: user.email } }, error: null };
            }
            return { data: null, error: { message: "User not found" } };
          }),
        },
      },
    } as any;
  }

  it("sollte User-IDs zu E-Mails auflösen", async () => {
    const client = createMockClient([
      { id: "user-1", email: "mueller@freiburg.de" },
      { id: "user-2", email: "schmidt@dortmund.de" },
    ]);

    const result = await resolveUserEmails(client, ["user-1", "user-2"]);

    expect(result.size).toBe(2);
    expect(result.get("user-1")).toBe("mueller@freiburg.de");
    expect(result.get("user-2")).toBe("schmidt@dortmund.de");
  });

  it("sollte doppelte IDs deduplizieren", async () => {
    const client = createMockClient([
      { id: "user-1", email: "mueller@freiburg.de" },
    ]);

    await resolveUserEmails(client, ["user-1", "user-1", "user-1"]);

    expect(client.auth.admin.getUserById).toHaveBeenCalledTimes(1);
  });

  it("sollte leere Liste zurückgeben bei leerer Eingabe", async () => {
    const client = createMockClient([]);

    const result = await resolveUserEmails(client, []);

    expect(result.size).toBe(0);
  });

  it("sollte leere/falsy IDs herausfiltern", async () => {
    const client = createMockClient([]);

    const result = await resolveUserEmails(client, ["", null as unknown as string, undefined as unknown as string]);

    expect(result.size).toBe(0);
    expect(client.auth.admin.getUserById).not.toHaveBeenCalled();
  });

  it("sollte bei Fehler leere Map zurückgeben (Fallback AC-3)", async () => {
    const client = createMockClient([], true);

    const result = await resolveUserEmails(client, ["user-1"]);

    expect(result.size).toBe(0);
  });

  it("sollte fehlende User ignorieren statt zu crashen", async () => {
    const client = createMockClient([
      { id: "user-1", email: "mueller@freiburg.de" },
    ]);

    const result = await resolveUserEmails(client, ["user-1", "user-unknown"]);

    expect(result.size).toBe(1);
    expect(result.get("user-1")).toBe("mueller@freiburg.de");
    expect(result.has("user-unknown")).toBe(false);
  });
});
