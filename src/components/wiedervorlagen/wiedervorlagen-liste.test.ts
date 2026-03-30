/**
 * Tests fuer WiedervorlagenListe Logik (PROJ-53 US-3)
 *
 * Testumgebung ist node (kein jsdom) -- wir testen Sortierung,
 * Ueberfaelligkeits-Logik und Interface-Kontrakte.
 */

import type { Wiedervorlage } from "@/lib/services/wiedervorlagen/types";

/** Repliziert die Sortierlogik aus der Komponente */
function sortWiedervorlagen(wvs: Wiedervorlage[]): Wiedervorlage[] {
  return [...wvs].sort((a, b) => {
    if (a.erledigt_am && !b.erledigt_am) return 1;
    if (!a.erledigt_am && b.erledigt_am) return -1;
    return new Date(a.faellig_am).getTime() - new Date(b.faellig_am).getTime();
  });
}

/** Repliziert die Ueberfaelligkeits-Logik aus der Komponente */
function istUeberfaellig(wv: Wiedervorlage): boolean {
  if (wv.erledigt_am) return false;
  const heute = new Date();
  heute.setHours(0, 0, 0, 0);
  const faellig = new Date(wv.faellig_am);
  faellig.setHours(0, 0, 0, 0);
  return faellig < heute;
}

function makeWv(overrides: Partial<Wiedervorlage> = {}): Wiedervorlage {
  return {
    id: "wv-1",
    tenant_id: "t-1",
    vorgang_id: "v-1",
    user_id: "u-1",
    faellig_am: "2026-04-01",
    betreff: "Test Wiedervorlage",
    notiz: null,
    erledigt_am: null,
    created_at: "2026-03-28T10:00:00Z",
    updated_at: "2026-03-28T10:00:00Z",
    ...overrides,
  };
}

describe("WiedervorlagenListe - Sortierung", () => {
  it("sollte offene Wiedervorlagen vor erledigten sortieren", () => {
    const wvs: Wiedervorlage[] = [
      makeWv({ id: "erledigt", erledigt_am: "2026-03-27T10:00:00Z", faellig_am: "2026-03-25" }),
      makeWv({ id: "offen", erledigt_am: null, faellig_am: "2026-04-10" }),
    ];
    const sortiert = sortWiedervorlagen(wvs);
    expect(sortiert[0].id).toBe("offen");
    expect(sortiert[1].id).toBe("erledigt");
  });

  it("sollte offene nach faellig_am aufsteigend sortieren", () => {
    const wvs: Wiedervorlage[] = [
      makeWv({ id: "spaeter", faellig_am: "2026-06-15" }),
      makeWv({ id: "frueher", faellig_am: "2026-04-01" }),
      makeWv({ id: "mitte", faellig_am: "2026-05-10" }),
    ];
    const sortiert = sortWiedervorlagen(wvs);
    expect(sortiert.map((w) => w.id)).toEqual(["frueher", "mitte", "spaeter"]);
  });

  it("sollte erledigte untereinander nach faellig_am sortieren", () => {
    const wvs: Wiedervorlage[] = [
      makeWv({ id: "e2", faellig_am: "2026-05-01", erledigt_am: "2026-05-01T12:00:00Z" }),
      makeWv({ id: "e1", faellig_am: "2026-03-01", erledigt_am: "2026-03-01T12:00:00Z" }),
    ];
    const sortiert = sortWiedervorlagen(wvs);
    expect(sortiert[0].id).toBe("e1");
    expect(sortiert[1].id).toBe("e2");
  });

  it("sollte leere Liste ohne Fehler behandeln", () => {
    expect(sortWiedervorlagen([])).toEqual([]);
  });
});

describe("WiedervorlagenListe - Überfällig-Logik", () => {
  it("sollte überfällige Wiedervorlage erkennen (faellig_am in Vergangenheit)", () => {
    const wv = makeWv({ faellig_am: "2020-01-01" });
    expect(istUeberfaellig(wv)).toBe(true);
  });

  it("sollte zukuenftige Wiedervorlage als nicht ueberfaellig erkennen", () => {
    const wv = makeWv({ faellig_am: "2099-12-31" });
    expect(istUeberfaellig(wv)).toBe(false);
  });

  it("sollte erledigte Wiedervorlage nie als ueberfaellig markieren", () => {
    const wv = makeWv({
      faellig_am: "2020-01-01",
      erledigt_am: "2020-01-02T10:00:00Z",
    });
    expect(istUeberfaellig(wv)).toBe(false);
  });
});

describe("WiedervorlagenListe - Interface-Kontrakte", () => {
  it("sollte alle Pflichtfelder der Wiedervorlage enthalten", () => {
    const wv = makeWv();
    expect(wv.id).toBeDefined();
    expect(wv.tenant_id).toBeDefined();
    expect(wv.vorgang_id).toBeDefined();
    expect(wv.user_id).toBeDefined();
    expect(wv.faellig_am).toBeDefined();
    expect(wv.betreff).toBeDefined();
    expect(wv.created_at).toBeDefined();
    expect(wv.updated_at).toBeDefined();
  });

  it("sollte erledigt_am als nullable behandeln", () => {
    const offen = makeWv({ erledigt_am: null });
    const erledigt = makeWv({ erledigt_am: "2026-03-28T10:00:00Z" });
    expect(offen.erledigt_am).toBeNull();
    expect(erledigt.erledigt_am).toBeTruthy();
  });

  it("sollte notiz als nullable behandeln", () => {
    const ohne = makeWv({ notiz: null });
    const mit = makeWv({ notiz: "Zusatzinfo" });
    expect(ohne.notiz).toBeNull();
    expect(mit.notiz).toBe("Zusatzinfo");
  });
});
