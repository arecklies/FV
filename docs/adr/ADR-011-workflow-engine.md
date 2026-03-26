# ADR-011: Workflow Engine fuer prozessgesteuerte Vorgangsbearbeitung

**Status:** Accepted
**Datum:** 2026-03-26
**Autor:** Senior Software Architect
**Ausloeser:** Stakeholder-Feedback (P2 Berufseinsteiger), Umfrage-Auswertung, Kick-off-Protokoll

## Kontext

### Das Problem

Die Bauaufsicht arbeitet in definierten Verfahrensschritten: Antragseingang -> Vollstaendigkeitspruefung -> ToEB-Beteiligung -> Pruefung -> Bescheiderstellung -> Zustellung. Erfahrene Sachbearbeiter (P1) kennen die Reihenfolge aus 15 Jahren Praxis. Berufseinsteiger (P2) nicht -- sie wollen "wissen, was ich als Naechstes tun soll, ohne jedes Mal die Kollegin fragen zu muessen" (Einsteiger-Anforderungen).

Die Research-Synthese identifiziert den Widerspruch "Fachtiefe vs. Einfachheit" als kritischsten UX-Konflikt. Eine Workflow Engine loest diesen Widerspruch architektonisch: Sie definiert den korrekten Prozess, zeigt Einsteigern den naechsten Schritt an, laesst Experten aber flexibel arbeiten.

### Anforderungen aus den Stakeholder-Interviews

| Persona | Anforderung |
|---|---|
| P1 (Erfahrener SB) | "Workflow-Engine: konfigurierbare Bearbeitungsschritte je Verfahrensart, Status-Tracking" |
| P2 (Einsteiger) | "Klare Statusanzeigen: Wo steckt ein Vorgang? Was fehlt noch? Was muss ich heute erledigen?" |
| P3 (Referatsleiter) | "Vier-Augen-Prinzip konfigurierbar: bestimmte Bescheide muessen freigezeichnet werden" |
| P3 (Referatsleiter) | "Konfigurierbar durch die Behoerde, nicht durch den Anbieter" |

### Technischer Kontext

PROJ-3 definiert FA-3: "Status-Workflow mit definierten Uebergaengen". ADR-006 definiert die Verfahrens-Engine als Code (Kern), waehrend Workflow-Schritte als konfigurierbare Daten (Schale) modelliert werden. Die Frage ist: Wie wird die Workflow Engine implementiert?

## Entscheidung

**Datengetriebene State Machine mit konfigurierbaren Workflow-Definitionen pro Verfahrensart und Bundesland.**

### Architektur-Modell: Konfigurierbare State Machine

Kein BPMN-Engine (zu komplex), kein Hardcoding (zu starr), sondern eine **JSON-basierte Workflow-Definition**, die in der Datenbank liegt und zur Laufzeit interpretiert wird.

### Workflow-Definition (Datenmodell)

```sql
-- Workflow-Definitionen pro Verfahrensart + Bundesland
CREATE TABLE config_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  verfahrensart_id uuid NOT NULL REFERENCES config_verfahrensarten(id),
  bundesland text NOT NULL,
  version int NOT NULL DEFAULT 1,
  definition jsonb NOT NULL,  -- Die Workflow-Schritte als JSON
  aktiv boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(verfahrensart_id, bundesland, version)
);

-- RLS: Service-Only (deny-all fuer Client, Zugriff ueber Backend)
ALTER TABLE config_workflows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_all" ON config_workflows FOR ALL USING (false);
```

### Workflow-Definition (JSON-Schema)

```json
{
  "name": "Baugenehmigung regulaer (NRW)",
  "version": 1,
  "initialStatus": "eingegangen",
  "schritte": [
    {
      "id": "eingegangen",
      "label": "Antrag eingegangen",
      "typ": "automatisch",
      "naechsteSchritte": ["vollstaendigkeitspruefung"],
      "aktionen": [],
      "hinweis": "Vorgang wurde angelegt. Naechster Schritt: Vollstaendigkeitspruefung."
    },
    {
      "id": "vollstaendigkeitspruefung",
      "label": "Vollstaendigkeitspruefung",
      "typ": "manuell",
      "naechsteSchritte": ["nachforderung", "beteiligung"],
      "aktionen": [
        {"id": "vollstaendig", "label": "Vollstaendig", "ziel": "beteiligung"},
        {"id": "unvollstaendig", "label": "Unvollstaendig -> Nachforderung", "ziel": "nachforderung"}
      ],
      "frist": "10_werktage",
      "hinweis": "Pruefen Sie ob alle Bauvorlagen gemaess BauVorlV eingereicht wurden.",
      "checkliste": ["Lageplan", "Bauzeichnungen", "Baubeschreibung", "Standsicherheitsnachweis"]
    },
    {
      "id": "nachforderung",
      "label": "Nachforderung",
      "typ": "manuell",
      "naechsteSchritte": ["vollstaendigkeitspruefung"],
      "aktionen": [
        {"id": "eingegangen", "label": "Unterlagen eingegangen", "ziel": "vollstaendigkeitspruefung"}
      ],
      "hinweis": "Nachforderungsschreiben versenden und auf Eingang der Unterlagen warten."
    },
    {
      "id": "beteiligung",
      "label": "ToEB-Beteiligung",
      "typ": "manuell",
      "naechsteSchritte": ["pruefung"],
      "aktionen": [
        {"id": "abgeschlossen", "label": "Alle Stellungnahmen eingegangen", "ziel": "pruefung"}
      ],
      "frist": "4_wochen",
      "hinweis": "Traeger oeffentlicher Belange beteiligen: Feuerwehr, Tiefbauamt, Denkmalschutz etc."
    },
    {
      "id": "pruefung",
      "label": "Fachliche Pruefung",
      "typ": "manuell",
      "naechsteSchritte": ["bescheid_entwurf", "ablehnung_entwurf"],
      "aktionen": [
        {"id": "genehmigen", "label": "Genehmigung empfehlen", "ziel": "bescheid_entwurf"},
        {"id": "ablehnen", "label": "Ablehnung empfehlen", "ziel": "ablehnung_entwurf"}
      ],
      "hinweis": "Bauvorhaben anhand der LBO und des Bebauungsplans pruefen."
    },
    {
      "id": "bescheid_entwurf",
      "label": "Bescheid erstellen",
      "typ": "manuell",
      "naechsteSchritte": ["freizeichnung"],
      "aktionen": [
        {"id": "fertig", "label": "Bescheid erstellt -> Freigabe anfordern", "ziel": "freizeichnung"}
      ],
      "hinweis": "Bescheid aus Textbausteinen zusammenstellen. Nebenbestimmungen pruefen."
    },
    {
      "id": "freizeichnung",
      "label": "Freizeichnung (Vier-Augen)",
      "typ": "freigabe",
      "minRolle": "referatsleiter",
      "naechsteSchritte": ["zustellung", "bescheid_entwurf"],
      "aktionen": [
        {"id": "freigeben", "label": "Freizeichnen", "ziel": "zustellung"},
        {"id": "zurueckweisen", "label": "Zur Ueberarbeitung", "ziel": "bescheid_entwurf"}
      ],
      "hinweis": "Referatsleiter prueft und zeichnet den Bescheid frei."
    },
    {
      "id": "zustellung",
      "label": "Bescheid zustellen",
      "typ": "manuell",
      "naechsteSchritte": ["abgeschlossen"],
      "aktionen": [
        {"id": "zugestellt", "label": "Bescheid zugestellt", "ziel": "abgeschlossen"}
      ],
      "hinweis": "Bescheid versenden (Post, De-Mail, EGVP). Zustellnachweis dokumentieren."
    },
    {
      "id": "abgeschlossen",
      "label": "Vorgang abgeschlossen",
      "typ": "endstatus",
      "naechsteSchritte": [],
      "aktionen": [],
      "hinweis": "Vorgang ist abgeschlossen und wird archiviert."
    }
  ]
}
```

### Workflow-Service (Code)

```typescript
// src/lib/services/workflow/index.ts

export interface WorkflowService {
  // Workflow-Definition fuer einen Vorgang laden
  getWorkflow(verfahrensartId: string, bundesland: string): Promise<WorkflowDefinition>;

  // Aktuellen Schritt mit Hinweisen und Aktionen holen
  getCurrentStep(vorgangId: string): Promise<WorkflowStep>;

  // Naechste erlaubte Aktionen fuer den aktuellen Nutzer
  getAvailableActions(vorgangId: string, userRole: UserRole): Promise<WorkflowAction[]>;

  // Aktion ausfuehren (Status-Uebergang)
  executeAction(vorgangId: string, actionId: string, userId: string): Promise<void>;

  // Validierung: Ist dieser Uebergang erlaubt?
  validateTransition(vorgangId: string, zielStatus: string): Promise<boolean>;
}
```

### UX-Integration: Zwei Modi

#### Einsteiger-Modus (P2): Gefuehrter Prozess

```
┌──────────────────────────────────────────────────┐
│ Vorgang 2026/BG-0142                             │
│ Status: Vollstaendigkeitspruefung                │
│──────────────────────────────────────────────────│
│                                                  │
│ 📋 Naechster Schritt:                            │
│ Pruefen Sie ob alle Bauvorlagen gemaess          │
│ BauVorlV eingereicht wurden.                     │
│                                                  │
│ ☐ Lageplan                                       │
│ ☐ Bauzeichnungen                                 │
│ ☐ Baubeschreibung                                │
│ ☐ Standsicherheitsnachweis                       │
│                                                  │
│ [Vollstaendig ✓]    [Unvollstaendig → Nachf.]   │
│                                                  │
│ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
│ Prozessfortschritt:                              │
│ ● Eingang → ● Vollst. → ○ ToEB → ○ Pruef.      │
│ → ○ Bescheid → ○ Freigabe → ○ Zustellung        │
└──────────────────────────────────────────────────┘
```

- **Hinweistext** erklaert was zu tun ist
- **Checkliste** zeigt Pflichtunterlagen
- **Aktionsbuttons** sind die einzigen erlaubten naechsten Schritte
- **Prozessfortschritt** als Stepper-Visualisierung

#### Experten-Modus (P1): Flexibel mit Ueberspringen

- Experten sehen denselben Prozessfortschritt, aber mit zusaetzlicher Option: "Schritt ueberspringen" (mit Begruendungspflicht, wird im Audit-Log protokolliert)
- Hinweistexte sind ausblendbar (Collapsible, standardmaessig eingeklappt)
- Checklisten sind optional, nicht erzwungen
- Status-Uebergang auch ueber Dropdown moeglich (nicht nur ueber Aktionsbuttons)

### Vier-Augen-Prinzip (PROJ-9)

Der Workflow-Schritt `typ: "freigabe"` mit `minRolle: "referatsleiter"` implementiert das Vier-Augen-Prinzip:
- Nur Nutzer mit Rolle >= `referatsleiter` koennen die Aktion "Freizeichnen" ausfuehren
- `requireRole()` aus ADR-002 wird im WorkflowService geprueft
- Ohne Freizeichnung ist kein Uebergang zu "Zustellung" moeglich
- Freizeichnung wird im Audit-Log protokolliert (ADR-005)

### Konfigurierbarkeit (ADR-006)

- Workflow-Definitionen liegen in der DB (`config_workflows`), nicht im Code
- Pro Verfahrensart + Bundesland eine eigene Definition
- **Behoerden-Admins** koennen (in spaeteren Phasen) ueber ein Admin-UI:
  - Hinweistexte anpassen
  - Checklisten ergaenzen
  - Optionale Schritte aktivieren/deaktivieren
- **Nicht konfigurierbar** durch Admins: Reihenfolge der Pflichtschritte (das ist Landesrecht)
- **Neues Bundesland** = neue Workflow-Definition als JSON in DB einspielen

### Datenmodell-Erweiterung (PROJ-3)

```sql
-- Erweiterung der vorgaenge-Tabelle
ALTER TABLE vorgaenge ADD COLUMN
  workflow_schritt_id text;  -- Aktueller Schritt im Workflow (z.B. "vollstaendigkeitspruefung")

-- Workflow-Historie (ergaenzt vorgang_status_historie)
CREATE TABLE vorgang_workflow_schritte (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  vorgang_id uuid NOT NULL REFERENCES vorgaenge(id) ON DELETE CASCADE,
  schritt_id text NOT NULL,           -- z.B. "vollstaendigkeitspruefung"
  aktion_id text,                     -- z.B. "vollstaendig"
  begruendung text,                   -- Bei Ueberspringen: Pflichtfeld
  uebersprungen boolean DEFAULT false,
  ausgefuehrt_von uuid REFERENCES auth.users(id),
  ausgefuehrt_am timestamptz DEFAULT now()
);

-- RLS: Mandantenfaehig
ALTER TABLE vorgang_workflow_schritte ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select" ON vorgang_workflow_schritte
  FOR SELECT USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
-- INSERT/UPDATE/DELETE nur ueber Service-Layer
```

## Alternativen verworfen

### 1. BPMN-Engine (z.B. Camunda, Flowable)

- **Pro:** Industriestandard, visueller Workflow-Editor, vollstaendige Prozesssteuerung
- **Contra:** Java-basiert, eigener Service-Stack, massive Ueberarchitektur fuer 8-10 lineare Workflow-Schritte. Camunda Cloud ist ein US-Dienst (Datenresidenz). Lernkurve fuer das Team. Overkill fuer Baugenehmigungs-Workflows, die im Wesentlichen lineare Ablaeufe mit wenigen Verzweigungen sind.
- **Fazit:** Fuer groessere BPM-Szenarien (100+ Prozessvarianten) sinnvoll. Bauaufsichts-Workflows sind zu einfach dafuer.

### 2. Hardcoded State Machine im Code

- **Pro:** Einfach, schnell, kein DB-Overhead
- **Contra:** Nicht konfigurierbar pro Bundesland. Code-Deployment fuer jede Workflow-Aenderung. Widerspricht ADR-006 (Rechtskonfiguration als Daten). Skaliert nicht auf 16 LBOs x 11 Verfahrensarten.
- **Fazit:** Nicht tragfaehig fuer Multi-BL-Betrieb.

### 3. No-Code-Workflow-Builder (Nutzer baut eigene Workflows)

- **Pro:** Maximale Flexibilitaet, Behoerden-Autonomie
- **Contra:** Zu komplex fuer Behoerden-Admins. Risiko inkonsistenter Workflows. Landesrecht schreibt Verfahrensschritte vor -- sie sind nicht frei waehlbar. Qualitaetssicherung unmoeglich.
- **Fazit:** Die Pflichtschritte sind durch Landesrecht vorgegeben. Konfigurierbar sind nur Hinweistexte, Checklisten und optionale Zusatzschritte.

## Konsequenzen

### Positiv
- Berufseinsteiger werden durch den Prozess gefuehrt -- sie sehen immer den naechsten Schritt
- Erfahrene SB koennen flexibel arbeiten (Ueberspringen mit Begruendung)
- Vier-Augen-Prinzip (PROJ-9) ist natuerlicher Teil des Workflows
- Workflow-Definitionen sind pro BL und Verfahrensart konfigurierbar (ADR-006)
- Workflow-Historie ist auditierbar (ADR-005)
- Kein externer Service noetig -- alles in PostgreSQL + Next.js

### Negativ
- JSON-Workflow-Definitionen muessen fuer alle 16 BL x relevante Verfahrensarten erstellt werden (initialer Aufwand)
- Kein visueller Workflow-Editor im MVP (Admin-UI kommt spaeter)
- Parallele Pfade (z.B. gleichzeitige ToEB-Beteiligung + Statik-Pruefung) erfordern zusaetzliche Modellierung

### Neutral
- Die Stepper-Visualisierung im UI nutzt vorhandene shadcn/ui-Komponenten (Progress, Badge, Button)
- WorkflowService ist Teil der Service-Architektur (ADR-003)
- `config_workflows` ist eine Service-Only-Tabelle (ADR-007)

## Implementierungsreihenfolge

| Phase | Umfang |
|---|---|
| **Phase 1 (MVP)** | Linearer Workflow fuer Baugenehmigung (regulaer, vereinfacht, Freistellung). Einsteiger-Hinweise. Prozessfortschritt-Stepper. Kein Admin-UI, Workflow-Definition per DB-Seed. |
| **Phase 2** | Vier-Augen-Freigabe als Workflow-Schritt (PROJ-9). Weitere Verfahrensarten. Ueberspringen mit Begruendung. |
| **Phase 3** | Admin-UI fuer Checklisten und Hinweistexte. Parallele Pfade. Workflow-Statistiken (Durchlaufzeiten pro Schritt). |

## Beteiligte Rollen

| Rolle | Verantwortung |
|---|---|
| Software Architect | Workflow-Architektur, JSON-Schema-Design |
| Database Architect | `config_workflows`, `vorgang_workflow_schritte`, RLS |
| Backend Developer | WorkflowService, Validierung, Status-Uebergaenge |
| Frontend Developer | Stepper-Visualisierung, Aktionsbuttons, Einsteiger-Hinweise |
| UX Designer | Zwei-Modi-Design (Einsteiger vs. Experte), Prozessfortschritt-UX |
| Requirements Engineer | Workflow-Definitionen fuer alle Verfahrensarten aus LBO-Quelldokumenten |

## Referenzen
- PROJ-3 FA-3: Status-Workflow mit definierten Uebergaengen
- PROJ-9: Vier-Augen-Freigabeworkflow
- ADR-002: RBAC (`requireRole()` fuer Freigabe-Schritte)
- ADR-005: Audit-Trail (Workflow-Schritte werden protokolliert)
- ADR-006: Rechtskonfiguration als Daten (Workflow-Definitionen in DB)
- Research-Synthese: Widerspruch 1 (Fachtiefe vs. Einfachheit)
- Einsteiger-Anforderungen: "Was muss ich als Naechstes tun?"
- Anforderungskatalog 2.2: "Workflow-Engine: konfigurierbare Bearbeitungsschritte"
