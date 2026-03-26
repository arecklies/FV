import { getSchritt, getVerfuegbareAktionen } from "./index";
import type { WorkflowDefinition } from "./types";

const testWorkflow: WorkflowDefinition = {
  name: "Test-Workflow",
  version: 1,
  initialStatus: "eingegangen",
  schritte: [
    {
      id: "eingegangen",
      label: "Antrag eingegangen",
      typ: "automatisch",
      naechsteSchritte: ["pruefung"],
      aktionen: [
        { id: "weiter", label: "Weiter", ziel: "pruefung" },
      ],
      hinweis: "Vorgang wurde angelegt.",
    },
    {
      id: "pruefung",
      label: "Fachliche Prüfung",
      typ: "manuell",
      naechsteSchritte: ["bescheid", "ablehnung"],
      aktionen: [
        { id: "genehmigen", label: "Genehmigung empfehlen", ziel: "bescheid" },
        { id: "ablehnen", label: "Ablehnung empfehlen", ziel: "ablehnung" },
      ],
    },
    {
      id: "bescheid",
      label: "Bescheid erstellen",
      typ: "manuell",
      naechsteSchritte: ["freizeichnung"],
      aktionen: [
        { id: "fertig", label: "Fertig", ziel: "freizeichnung" },
      ],
    },
    {
      id: "freizeichnung",
      label: "Freizeichnung",
      typ: "freigabe",
      minRolle: "referatsleiter",
      naechsteSchritte: ["abgeschlossen"],
      aktionen: [
        { id: "freigeben", label: "Freizeichnen", ziel: "abgeschlossen" },
      ],
    },
    {
      id: "abgeschlossen",
      label: "Abgeschlossen",
      typ: "endstatus",
      naechsteSchritte: [],
      aktionen: [],
    },
  ],
};

describe("getSchritt", () => {
  it("findet vorhandenen Schritt", () => {
    const schritt = getSchritt(testWorkflow, "pruefung");
    expect(schritt).toBeDefined();
    expect(schritt?.label).toBe("Fachliche Prüfung");
  });

  it("gibt undefined bei unbekanntem Schritt", () => {
    expect(getSchritt(testWorkflow, "unbekannt")).toBeUndefined();
  });
});

describe("getVerfuegbareAktionen", () => {
  it("liefert Aktionen fuer manuellen Schritt", () => {
    const result = getVerfuegbareAktionen(testWorkflow, "pruefung", "sachbearbeiter");
    expect(result.aktionen).toHaveLength(2);
    expect(result.aktionen[0].id).toBe("genehmigen");
    expect(result.aktionen[1].id).toBe("ablehnen");
  });

  it("verweigert Freigabe-Aktionen fuer Sachbearbeiter", () => {
    const result = getVerfuegbareAktionen(testWorkflow, "freizeichnung", "sachbearbeiter");
    expect(result.aktionen).toHaveLength(0);
    expect(result.schritt?.typ).toBe("freigabe");
  });

  it("erlaubt Freigabe-Aktionen fuer Referatsleiter", () => {
    const result = getVerfuegbareAktionen(testWorkflow, "freizeichnung", "referatsleiter");
    expect(result.aktionen).toHaveLength(1);
    expect(result.aktionen[0].id).toBe("freigeben");
  });

  it("erlaubt Freigabe-Aktionen fuer Tenant-Admin (hoehere Rolle)", () => {
    const result = getVerfuegbareAktionen(testWorkflow, "freizeichnung", "tenant_admin");
    expect(result.aktionen).toHaveLength(1);
  });

  it("gibt leere Aktionen fuer Endstatus", () => {
    const result = getVerfuegbareAktionen(testWorkflow, "abgeschlossen", "sachbearbeiter");
    expect(result.aktionen).toHaveLength(0);
  });

  it("gibt leere Aktionen fuer unbekannten Schritt", () => {
    const result = getVerfuegbareAktionen(testWorkflow, "unbekannt", "sachbearbeiter");
    expect(result.aktionen).toHaveLength(0);
    expect(result.schritt).toBeNull();
  });
});
