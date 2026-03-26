import { generateAktenzeichen } from "./aktenzeichen";

describe("generateAktenzeichen", () => {
  it("generiert Aktenzeichen mit Default-Schema", () => {
    expect(generateAktenzeichen(undefined, 2026, 42, "BG")).toBe("2026/0042/BG");
  });

  it("generiert Aktenzeichen mit Custom-Schema", () => {
    expect(
      generateAktenzeichen("{kuerzel}-{jahr}/{laufnummer}", 2026, 1, "FR")
    ).toBe("FR-2026/0001");
  });

  it("padded Laufnummer auf 4 Stellen", () => {
    expect(generateAktenzeichen(undefined, 2026, 1, "BG")).toBe("2026/0001/BG");
    expect(generateAktenzeichen(undefined, 2026, 9999, "BG")).toBe("2026/9999/BG");
    expect(generateAktenzeichen(undefined, 2026, 10000, "BG")).toBe("2026/10000/BG");
  });

  it("verwendet verschiedene Verfahrenskuerzel", () => {
    expect(generateAktenzeichen(undefined, 2026, 1, "BG-V")).toBe("2026/0001/BG-V");
    expect(generateAktenzeichen(undefined, 2026, 1, "AB")).toBe("2026/0001/AB");
    expect(generateAktenzeichen(undefined, 2026, 1, "VB")).toBe("2026/0001/VB");
  });
});
