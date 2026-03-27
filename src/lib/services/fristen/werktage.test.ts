/**
 * Unit-Tests für Werktage-Berechnung (PROJ-4 FA-3, NFR-1)
 *
 * Reine Logik-Tests ohne DB-Abhängigkeiten.
 * Testet: Wochenende-Erkennung, Feiertags-Berücksichtigung, Ampellogik.
 */

import {
  istWochenende,
  toIsoDate,
  addiereWerktage,
  berechneWerktageDazwischen,
  berechneAmpelStatus,
  berechneProzentVerbraucht,
  AMPEL_STANDARD_GELB,
  AMPEL_STANDARD_ROT,
} from "./werktage";

describe("istWochenende", () => {
  it("sollte Samstag als Wochenende erkennen", () => {
    // 2026-03-28 ist ein Samstag
    expect(istWochenende(new Date(2026, 2, 28))).toBe(true);
  });

  it("sollte Sonntag als Wochenende erkennen", () => {
    // 2026-03-29 ist ein Sonntag
    expect(istWochenende(new Date(2026, 2, 29))).toBe(true);
  });

  it("sollte Montag nicht als Wochenende erkennen", () => {
    // 2026-03-30 ist ein Montag
    expect(istWochenende(new Date(2026, 2, 30))).toBe(false);
  });

  it("sollte Freitag nicht als Wochenende erkennen", () => {
    // 2026-03-27 ist ein Freitag
    expect(istWochenende(new Date(2026, 2, 27))).toBe(false);
  });
});

describe("toIsoDate", () => {
  it("sollte Datum als YYYY-MM-DD formatieren", () => {
    expect(toIsoDate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("sollte einstellige Monate/Tage mit führender Null formatieren", () => {
    expect(toIsoDate(new Date(2026, 2, 3))).toBe("2026-03-03");
  });
});

describe("addiereWerktage", () => {
  const keineFeiertage = new Set<string>();

  it("sollte Werktage ohne Feiertage korrekt addieren", () => {
    // Montag 2026-03-23 + 5 Werktage = Montag 2026-03-30
    const start = new Date(2026, 2, 23);
    const ergebnis = addiereWerktage(start, 5, keineFeiertage);
    expect(toIsoDate(ergebnis)).toBe("2026-03-30");
  });

  it("sollte Wochenenden überspringen", () => {
    // Freitag 2026-03-27 + 1 Werktag = Montag 2026-03-30
    const start = new Date(2026, 2, 27);
    const ergebnis = addiereWerktage(start, 1, keineFeiertage);
    expect(toIsoDate(ergebnis)).toBe("2026-03-30");
  });

  it("sollte Feiertage überspringen", () => {
    // Montag 2026-03-23 + 5 Werktage, aber Mittwoch 2026-03-25 ist Feiertag
    // → Mo 24, Di 25 (Feiertag → skip), Mi 26, Do 27, Fr 28 (WE → skip → skip), Mo 30, Di 31
    // Ergebnis: 23 + 5 WT (mit Feiertag) = 31.03.
    const feiertage = new Set(["2026-03-25"]);
    const start = new Date(2026, 2, 23);
    const ergebnis = addiereWerktage(start, 5, feiertage);
    expect(toIsoDate(ergebnis)).toBe("2026-03-31");
  });

  it("sollte bei 0 Werktagen das Startdatum zurückgeben", () => {
    const start = new Date(2026, 2, 23);
    const ergebnis = addiereWerktage(start, 0, keineFeiertage);
    expect(toIsoDate(ergebnis)).toBe("2026-03-23");
  });

  it("sollte bei 10 Werktagen über 2 Wochen korrekt berechnen", () => {
    // Montag 2026-03-23 + 10 WT = Donnerstag 2026-04-06 (ohne Feiertage)
    const start = new Date(2026, 2, 23);
    const ergebnis = addiereWerktage(start, 10, keineFeiertage);
    expect(toIsoDate(ergebnis)).toBe("2026-04-06");
  });
});

describe("berechneWerktageDazwischen", () => {
  const keineFeiertage = new Set<string>();

  it("sollte Werktage zwischen Mo und Fr korrekt zählen", () => {
    // Mo 2026-03-23 bis Fr 2026-03-27 = 4 Werktage (Di, Mi, Do, Fr)
    const start = new Date(2026, 2, 23);
    const end = new Date(2026, 2, 27);
    expect(berechneWerktageDazwischen(start, end, keineFeiertage)).toBe(4);
  });

  it("sollte Wochenenden nicht mitzählen", () => {
    // Mo 2026-03-23 bis Mo 2026-03-30 = 5 Werktage
    const start = new Date(2026, 2, 23);
    const end = new Date(2026, 2, 30);
    expect(berechneWerktageDazwischen(start, end, keineFeiertage)).toBe(5);
  });

  it("sollte Feiertage abziehen", () => {
    const feiertage = new Set(["2026-03-25"]);
    const start = new Date(2026, 2, 23);
    const end = new Date(2026, 2, 27);
    expect(berechneWerktageDazwischen(start, end, feiertage)).toBe(3);
  });

  it("sollte 0 bei gleichem Datum zurückgeben", () => {
    const datum = new Date(2026, 2, 23);
    expect(berechneWerktageDazwischen(datum, datum, keineFeiertage)).toBe(0);
  });

  it("sollte 0 bei End < Start zurückgeben", () => {
    const start = new Date(2026, 2, 27);
    const end = new Date(2026, 2, 23);
    expect(berechneWerktageDazwischen(start, end, keineFeiertage)).toBe(0);
  });
});

describe("berechneAmpelStatus (FA-4)", () => {
  it("sollte gruen bei > 50% verbleibend zurückgeben", () => {
    expect(berechneAmpelStatus(60, 40)).toBe("gruen");
  });

  it("sollte gelb bei 25-50% verbleibend zurückgeben", () => {
    expect(berechneAmpelStatus(60, 20)).toBe("gelb");
  });

  it("sollte gelb bei exakt 50% zurückgeben", () => {
    expect(berechneAmpelStatus(60, 30)).toBe("gelb");
  });

  it("sollte rot bei < 25% verbleibend zurückgeben", () => {
    expect(berechneAmpelStatus(60, 10)).toBe("rot");
  });

  it("sollte rot bei < 5 Werktagen zurückgeben (auch wenn > 25%)", () => {
    // 4 von 10 = 40% — normalerweise gelb, aber < 5 WT → rot
    expect(berechneAmpelStatus(10, 4)).toBe("rot");
  });

  it("sollte dunkelrot bei 0 Werktagen zurückgeben", () => {
    expect(berechneAmpelStatus(60, 0)).toBe("dunkelrot");
  });

  it("sollte dunkelrot bei negativen Werktagen zurückgeben", () => {
    expect(berechneAmpelStatus(60, -5)).toBe("dunkelrot");
  });
});

describe("berechneAmpelStatus mit konfigurierbaren Schwellenwerten (PROJ-34)", () => {
  it("sollte Standard-Schwellenwerte exportieren", () => {
    expect(AMPEL_STANDARD_GELB).toBe(50);
    expect(AMPEL_STANDARD_ROT).toBe(25);
  });

  it("sollte bei NULL-Schwellenwerten auf Standard 50/25 fallen", () => {
    // 40 von 60 = 66.7% -> gruen bei Standard
    expect(berechneAmpelStatus(60, 40, { gelb_ab: null, rot_ab: null })).toBe("gruen");
    // 20 von 60 = 33.3% -> gelb bei Standard
    expect(berechneAmpelStatus(60, 20, { gelb_ab: null, rot_ab: null })).toBe("gelb");
  });

  it("sollte bei undefined-Schwellenwerten auf Standard fallen", () => {
    expect(berechneAmpelStatus(60, 40, undefined)).toBe("gruen");
    expect(berechneAmpelStatus(60, 40, {})).toBe("gruen");
  });

  it("sollte konfigurierte Schwellenwerte verwenden (Dortmund: 60/30)", () => {
    const dortmund = { gelb_ab: 60, rot_ab: 30 };

    // 40 von 60 = 66.7% -> gruen (> 60%)
    expect(berechneAmpelStatus(60, 40, dortmund)).toBe("gruen");

    // 36 von 60 = 60% -> gelb (= 60%, also <= gelb_ab)
    expect(berechneAmpelStatus(60, 36, dortmund)).toBe("gelb");

    // 20 von 60 = 33.3% -> gelb (> 30%, <= 60%)
    expect(berechneAmpelStatus(60, 20, dortmund)).toBe("gelb");

    // 15 von 60 = 25% -> rot (< 30%)
    expect(berechneAmpelStatus(60, 15, dortmund)).toBe("rot");
  });

  it("sollte sehr hohe Schwellenwerte unterstuetzen (90/70)", () => {
    const streng = { gelb_ab: 90, rot_ab: 70 };

    // 55 von 60 = 91.7% -> gruen
    expect(berechneAmpelStatus(60, 55, streng)).toBe("gruen");

    // 50 von 60 = 83.3% -> gelb (< 90%, > 70%)
    expect(berechneAmpelStatus(60, 50, streng)).toBe("gelb");

    // 40 von 60 = 66.7% -> rot (< 70%)
    expect(berechneAmpelStatus(60, 40, streng)).toBe("rot");
  });

  it("sollte dunkelrot unabhaengig von Schwellenwerten bei 0 Werktagen zurueckgeben", () => {
    expect(berechneAmpelStatus(60, 0, { gelb_ab: 90, rot_ab: 70 })).toBe("dunkelrot");
    expect(berechneAmpelStatus(60, -5, { gelb_ab: 90, rot_ab: 70 })).toBe("dunkelrot");
  });

  it("sollte rot bei < 5 Werktagen zurueckgeben unabhaengig von Schwellenwerten", () => {
    // 4 von 100 = 4% -> < 5 WT -> rot, egal ob prozentual gruen waere
    expect(berechneAmpelStatus(100, 4, { gelb_ab: 1, rot_ab: 1 })).toBe("rot");
  });

  it("sollte nur gelb_ab konfiguriert und rot_ab Standard verwenden", () => {
    // Nur gelb_ab=70 konfiguriert, rot_ab bleibt 25 (Standard)
    const teilKonfig = { gelb_ab: 70, rot_ab: null };

    // 45 von 60 = 75% -> gruen (> 70%)
    expect(berechneAmpelStatus(60, 45, teilKonfig)).toBe("gruen");

    // 40 von 60 = 66.7% -> gelb (<= 70%, > 25%)
    expect(berechneAmpelStatus(60, 40, teilKonfig)).toBe("gelb");

    // 10 von 60 = 16.7% -> rot (< 25%)
    expect(berechneAmpelStatus(60, 10, teilKonfig)).toBe("rot");
  });

  it("sollte nur rot_ab konfiguriert und gelb_ab Standard verwenden", () => {
    // gelb_ab bleibt 50 (Standard), rot_ab=10
    const teilKonfig = { gelb_ab: null, rot_ab: 10 };

    // 20 von 60 = 33.3% -> gelb (<= 50%, > 10%)
    expect(berechneAmpelStatus(60, 20, teilKonfig)).toBe("gelb");

    // 5 von 60 = 8.3% -> rot (< 10%)
    expect(berechneAmpelStatus(60, 5, teilKonfig)).toBe("rot");
  });
});

describe("berechneProzentVerbraucht", () => {
  it("sollte 0% bei vollständig verbleibender Frist zurückgeben", () => {
    expect(berechneProzentVerbraucht(60, 60)).toBe(0);
  });

  it("sollte 50% bei halb verbrauchter Frist zurückgeben", () => {
    expect(berechneProzentVerbraucht(60, 30)).toBe(50);
  });

  it("sollte 100% bei abgelaufener Frist zurückgeben", () => {
    expect(berechneProzentVerbraucht(60, 0)).toBe(100);
  });

  it("sollte 100% bei überszogener Frist zurückgeben (nicht > 100)", () => {
    expect(berechneProzentVerbraucht(60, -10)).toBe(100);
  });

  it("sollte 100% bei 0 Gesamtwerktagen zurückgeben", () => {
    expect(berechneProzentVerbraucht(0, 0)).toBe(100);
  });
});

describe("NFR-1: Performance", () => {
  it("sollte Fristberechnung in < 100ms abschließen", () => {
    const feiertage = new Set<string>();
    // Simuliere 50 Feiertage
    for (let i = 1; i <= 50; i++) {
      feiertage.add(`2026-${String(Math.ceil(i / 4)).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`);
    }

    const start = performance.now();
    // Berechne 250 Werktage (ca. 1 Jahr)
    addiereWerktage(new Date(2026, 0, 1), 250, feiertage);
    const dauer = performance.now() - start;

    expect(dauer).toBeLessThan(100);
  });
});
