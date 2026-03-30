/**
 * Unit-Tests fuer Dokumente-Validierung (PROJ-5)
 */

import {
  istErlaubterMimeType,
  extrahiereDateiendung,
  istKonsistenterMimeType,
  endungFuerMimeType,
} from "./validation";

describe("Dokumente-Validierung", () => {
  describe("istErlaubterMimeType", () => {
    it("sollte PDF erlauben", () => {
      expect(istErlaubterMimeType("application/pdf")).toBe(true);
    });

    it("sollte TIFF erlauben", () => {
      expect(istErlaubterMimeType("image/tiff")).toBe(true);
    });

    it("sollte JPEG erlauben", () => {
      expect(istErlaubterMimeType("image/jpeg")).toBe(true);
    });

    it("sollte XLSX erlauben", () => {
      expect(istErlaubterMimeType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")).toBe(true);
    });

    it("sollte XLS erlauben", () => {
      expect(istErlaubterMimeType("application/vnd.ms-excel")).toBe(true);
    });

    it("sollte DOCX erlauben", () => {
      expect(istErlaubterMimeType("application/vnd.openxmlformats-officedocument.wordprocessingml.document")).toBe(true);
    });

    it("sollte DWG erlauben", () => {
      expect(istErlaubterMimeType("application/acad")).toBe(true);
    });

    it("sollte DXF erlauben", () => {
      expect(istErlaubterMimeType("application/dxf")).toBe(true);
    });

    it("sollte EXE ablehnen", () => {
      expect(istErlaubterMimeType("application/x-msdownload")).toBe(false);
    });

    it("sollte HTML ablehnen", () => {
      expect(istErlaubterMimeType("text/html")).toBe(false);
    });

    it("sollte leeren String ablehnen", () => {
      expect(istErlaubterMimeType("")).toBe(false);
    });
  });

  describe("extrahiereDateiendung", () => {
    it("sollte pdf extrahieren", () => {
      expect(extrahiereDateiendung("bauplan.pdf")).toBe("pdf");
    });

    it("sollte bei mehreren Punkten die letzte Endung nehmen", () => {
      expect(extrahiereDateiendung("bauplan.v2.pdf")).toBe("pdf");
    });

    it("sollte Grossbuchstaben in Kleinbuchstaben wandeln", () => {
      expect(extrahiereDateiendung("bauplan.PDF")).toBe("pdf");
    });

    it("sollte null bei fehlendem Punkt zurueckgeben", () => {
      expect(extrahiereDateiendung("bauplan")).toBeNull();
    });
  });

  describe("istKonsistenterMimeType", () => {
    it("sollte pdf + application/pdf als konsistent erkennen", () => {
      expect(istKonsistenterMimeType("bauplan.pdf", "application/pdf")).toBe(true);
    });

    it("sollte jpg + image/jpeg als konsistent erkennen", () => {
      expect(istKonsistenterMimeType("bild.jpg", "image/jpeg")).toBe(true);
    });

    it("sollte jpeg + image/jpeg als konsistent erkennen", () => {
      expect(istKonsistenterMimeType("bild.jpeg", "image/jpeg")).toBe(true);
    });

    it("sollte pdf + image/jpeg als inkonsistent erkennen", () => {
      expect(istKonsistenterMimeType("bauplan.pdf", "image/jpeg")).toBe(false);
    });

    it("sollte unbekannte Endung als inkonsistent erkennen", () => {
      expect(istKonsistenterMimeType("script.exe", "application/x-msdownload")).toBe(false);
    });
  });

  describe("endungFuerMimeType", () => {
    it("sollte pdf fuer application/pdf zurueckgeben", () => {
      expect(endungFuerMimeType("application/pdf")).toBe("pdf");
    });

    it("sollte jpg fuer image/jpeg zurueckgeben", () => {
      expect(endungFuerMimeType("image/jpeg")).toBe("jpg");
    });

    it("sollte null fuer unbekannten MIME-Type zurueckgeben", () => {
      expect(endungFuerMimeType("application/unknown")).toBeNull();
    });
  });
});
