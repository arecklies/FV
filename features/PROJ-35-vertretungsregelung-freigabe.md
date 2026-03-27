# PROJ-35: Vertretungsregelung Vier-Augen-Freigabe

**Status:** Deployed | **Phase:** 1 (Kern-MVP Erweiterung) | **Erstellt:** 2026-03-27
**Herkunft:** Kunden-Session 27.03.2026, F-01 (Frau Kemper, Soest, P3)
**Prioritaet:** Pilotblocker Soest
**Letzte Verfeinerung:** 2026-03-27 (req-stories: 3 User Stories, Cross-Spec-Analyse, DB-Empfehlung)

---

## 1. Ziel / Problem

Die Vier-Augen-Freigabe (PROJ-33) ist an eine einzelne Person (Referatsleiter) gebunden. Bei Urlaub oder Krankheit kann niemand freigeben — Bescheide stauen sich auf. Soest meldet das als Pilotblocker: ohne Vertretungsregelung kein Produktivstart.

## 2. Fachlicher Kontext & Stakeholder

- **P3 (Referatsleiter, Soest):** Muss Stellvertreter benennen koennen
- **P1 (Sachbearbeiter):** Bescheide duerfen nicht wegen Abwesenheit blockiert werden
- **P4 (Tenant-Admin):** Muss verwaiste Vertretungen aufloesen koennen (Personalwechsel)
- **PROJ-33:** Vier-Augen-Lite als Basis — Vertretung erweitert die bestehende Freigabelogik
- **PROJ-9:** Vollstaendiger Vier-Augen-Workflow (Phase 2) — PROJ-35 muss kompatibel bleiben

## 3. Funktionale Anforderungen

- FA-1: Referatsleiter kann einen oder mehrere Stellvertreter fuer die Freigabe benennen
- FA-2: Stellvertreter sehen zur Freigabe eingereichte Bescheide des vertretenen Referatsleiters in ihrer Freigabeliste
- FA-3: Stellvertreter-Freigabe wird im Audit-Trail als Vertretung gekennzeichnet
- FA-4: Vertretung ist zeitlich unbegrenzt (kein Start-/Enddatum im MVP)
- FA-5: Nur Nutzer mit Rolle "referatsleiter" oder hoeher koennen als Stellvertreter benannt werden
- FA-6: Tenant-Admin kann alle Vertretungsbeziehungen im Mandanten einsehen und aufloesen
- FA-7: Referatsleiter kann eigene Stellvertreter-Zuordnungen einsehen und entfernen
- FA-8: Ein Nutzer kann Stellvertreter fuer mehrere Referatsleiter sein (n:m-Beziehung)

## 4. User Stories & Akzeptanzkriterien

### US-1: Stellvertreter benennen
Als Referatsleiter moechte ich einen oder mehrere Stellvertreter fuer die Freigabe benennen, damit Bescheide bei meiner Abwesenheit nicht blockiert werden.

**Akzeptanzkriterien:**
- AC-1.1: Im Admin-Bereich (Benutzerverwaltung) gibt es einen Abschnitt "Freigabe-Stellvertreter" pro Referatsleiter
- AC-1.2: Die Auswahlliste zeigt nur Nutzer mit Rolle "referatsleiter", "amtsleiter" oder "tenant_admin" desselben Mandanten
- AC-1.3: Mehrfachauswahl ist moeglich (Multi-Select)
- AC-1.4: Die Zuordnung wird sofort wirksam (kein separater Aktivierungsschritt)
- AC-1.5: Doppelzuordnung wird verhindert (DB-Constraint UNIQUE auf vertretener_id + stellvertreter_id)
- AC-1.6: Selbstzuordnung ist nicht moeglich (vertretener_id != stellvertreter_id)
- AC-1.7: Zuordnung wird im Audit-Trail protokolliert (Aktion: "vertretung.erstellt", Payload: vertretener_id, stellvertreter_id)
- AC-1.8: Referatsleiter kann eigene Stellvertreter entfernen (Aktion: "vertretung.entfernt")

### US-2: Als Stellvertreter freigeben
Als Stellvertreter moechte ich zur Freigabe eingereichte Bescheide des vertretenen Referatsleiters sehen und freigeben oder zurueckweisen.

**Akzeptanzkriterien:**
- AC-2.1: Stellvertreter sieht Freigabe-Eintraege des vertretenen Referatsleiters in der Freigabeliste (zusaetzlich zu eigenen, falls vorhanden)
- AC-2.2: Die Freigabeliste kennzeichnet visuell, ob ein Eintrag als Vertretung angezeigt wird (z.B. Badge "Vertretung fuer [Name]")
- AC-2.3: Freigabe/Zurueckweisung funktioniert identisch zu PROJ-33 (gleiche Validierung, gleiche Begruendungspflicht bei Zurueckweisung)
- AC-2.4: Audit-Trail-Eintrag bei Vertretungs-Freigabe enthaelt: `action: "vorgang.workflow_schritt"`, Payload erweitert um `vertretung_fuer: "<user_id des vertretenen>"`, `vertretung_fuer_name: "<Anzeigename>"`
- AC-2.5: In der Workflow-Historie des Vorgangs wird angezeigt: "Freigegeben durch [Name Stellvertreter] (Vertretung fuer [Name Referatsleiter])"
- AC-2.6: Stellvertreter sieht nur Freigabe-Eintraege der ihm zugeordneten Referatsleiter, NICHT aller Referatsleiter des Mandanten
- AC-2.7: Transitive Vertretung (A vertritt B, B vertritt C → A vertritt NICHT C) ist im MVP ausgeschlossen

### US-3: Vertretungen verwalten (Admin)
Als Tenant-Admin moechte ich alle Vertretungsbeziehungen im Mandanten einsehen und bei Bedarf aufloesen, damit keine verwaisten Vertretungen entstehen.

**Akzeptanzkriterien:**
- AC-3.1: Tenant-Admin sieht eine Uebersicht aller Vertretungsbeziehungen im Mandanten (Tabelle: Vertretener | Stellvertreter | Erstellt am)
- AC-3.2: Tenant-Admin kann jede Vertretungsbeziehung loeschen (mit Audit-Trail: "vertretung.admin_entfernt")
- AC-3.3: Wenn ein Nutzer aus dem Mandanten entfernt wird (tenant_members DELETE CASCADE), werden dessen Vertretungsbeziehungen automatisch entfernt (FK mit ON DELETE CASCADE)
- AC-3.4: Ein Referatsleiter sieht nur seine eigenen Vertretungsbeziehungen, nicht die anderer Referatsleiter

## 5. Nicht-funktionale Anforderungen

- NFR-1: Keine messbare Performance-Verschlechterung der Freigabeliste (Ziel: < 500ms). Der zusaetzliche JOIN auf die Vertretungstabelle darf max. 50ms hinzufuegen.
- NFR-2: Autorisierung in WorkflowService (Applikationsebene), da tenant_members und Vertretungstabelle Service-Only sind.
- NFR-3: WCAG 2.2 AA fuer alle neuen UI-Elemente (Stellvertreter-Auswahl, Vertretungs-Badge, Admin-Uebersicht)
- NFR-4: Daten-Integritaet: Vertretungsbeziehungen sind mandantenisoliert (tenant_id-FK). Kein Cross-Tenant-Zugriff.
- NFR-5: Audit-Vollstaendigkeit: Jede Erstellung und Loeschung einer Vertretungsbeziehung wird protokolliert.

## 6. Spezialisten-Trigger

- **Database Architect:** Neue Tabelle `freigabe_stellvertreter` (Service-Only, deny-all RLS). Schema: vertretener_id (FK tenant_members.user_id), stellvertreter_id (FK tenant_members.user_id), tenant_id (FK tenants.id), created_at. UNIQUE(tenant_id, vertretener_id, stellvertreter_id). CHECK(vertretener_id != stellvertreter_id). ON DELETE CASCADE auf beide FK. Index auf (tenant_id, stellvertreter_id).
- **Senior Backend Developer:** (1) `getVerfuegbareAktionen()` erweitern: Stellvertreter-Lookup bei Freigabe-Schritten. (2) `executeWorkflowAktion()` erweitern: Vertretungs-Kontext in Audit-Payload. (3) Neue API-Endpunkte: `GET/POST/DELETE /api/admin/vertretungen`, `GET/POST/DELETE /api/vertretungen/meine`.
- **Senior Frontend Developer:** (1) Stellvertreter-Verwaltung in Benutzerverwaltung. (2) Freigabeliste: Vertretungs-Badge. (3) Workflow-Historie: Vertretungs-Information.
- **Senior UI/UX Designer:** Konzept fuer Vertretungs-Badge, Multi-Select mit Rollenfilter.
- **Senior Security Engineer:** Service-Only-Tabelle, Autorisierung in API-Schicht, Cross-Tenant-Pruefung.

## 7. Offene Fragen

- ~~Q-1: Soll ein Stellvertreter die Freigabe-Eintraege ALLER Referatsleiter sehen oder nur des zugeordneten?~~ → Nur zugeordnete (AC-2.6)
- ~~Q-2: Brauchen wir eine Benachrichtigung wenn Vertretung aktiviert wird?~~ → Nein im MVP (Nicht-Scope)
- Q-3: Soll der Referatsleiter selbst Stellvertreter benennen duerfen, oder nur der Tenant-Admin? → Annahme: Referatsleiter fuer eigene, Admin fuer alle. Abklaerung mit P3 empfohlen.

## 8. Annahmen

- A-1: PROJ-33 (Vier-Augen-Lite) ist deployed und funktioniert
- A-2: Rollenkonzept mit "referatsleiter" existiert (PROJ-1, ADR-002)
- A-3: Kein zeitliches Vertretungsfenster noetig (MVP)
- A-4: Stellvertreter sieht nur Freigabe-Eintraege der zugeordneten Referatsleiter
- A-5: Referatsleiter darf eigene Stellvertreter verwalten. Bestaetigung durch P3 ausstehend.
- A-6: Keine Benachrichtigung bei Vertretungs-Erstellung (MVP)
- A-7: Vertretungstabelle ist Service-Only (deny-all RLS) analog zu tenant_members

## 9. Abhaengigkeiten

| Abhaengigkeit | Typ | Status |
|---|---|---|
| PROJ-33 (Vier-Augen-Lite) | Voraussetzung | Deployed |
| PROJ-9 (Vier-Augen-Workflow Phase 2) | Vorwaertskompatibilitaet | Planned |
| PROJ-1 (Auth, Benutzerverwaltung) | Voraussetzung | Deployed |
| ADR-002 (RBAC) | Rollenmodell | Accepted |
| ADR-011 (Workflow Engine) | Freigabe-Schritt-Typ | Accepted |

## 10. Fachliche Risiken

| Risiko | Auswirkung | Gegenmassnahme |
|---|---|---|
| Stellvertreter-Kette (A vertritt B vertritt C) | Unklare Verantwortlichkeit | MVP: nur direkte Vertretung (AC-2.7) |
| Verwaiste Vertretungen (Person verlaesst Behoerde) | Freigabe an Nicht-Mitarbeiter | FK mit ON DELETE CASCADE (AC-3.3), Admin-Uebersicht (US-3) |
| Performance bei vielen Vertretungen | Freigabeliste langsam | Index auf (tenant_id, stellvertreter_id), .limit() |
| Gleichzeitige Freigabe durch RL und Stellvertreter | Doppel-Freigabe | Workflow-Schritt-Wechsel ist atomar |

## 11. Scope / Nicht-Scope

**Scope:**
- Stellvertreter-Zuordnung (n:m)
- Freigabe durch Stellvertreter mit Audit-Trail-Kennzeichnung
- Verwaltungsoberflaeche: Referatsleiter eigene, Admin alle
- Vertretungs-Badge in Freigabeliste
- Vertretungs-Information in Workflow-Historie
- Neue DB-Tabelle `freigabe_stellvertreter` (Service-Only)
- Erweiterung WorkflowService
- API-Endpunkte fuer CRUD Vertretungsbeziehungen

**Nicht-Scope:**
- Zeitliche Begrenzung der Vertretung (Start-/Enddatum)
- Automatische Benachrichtigung bei Vertretungs-Erstellung
- Mehrstufige Freigabe-Ketten (PROJ-9, Phase 2)
- Vertretung fuer andere Funktionen als Vier-Augen-Freigabe
- Transitive Vertretung (A→B→C)
- Eskalation bei Nicht-Freigabe (Timeout)
