# Stakeholder-Briefing: Entwicklungsstand SaaS-Fachverfahren

**Zielgruppe:** Bestandskunden (Bauaufsichtsbehoerden, Nutzer der aktuellen .NET-On-Premise-Loesung)
**Anlass:** Statusupdate-Termin mit Product Management
**Datum:** 2026-03-26
**Vertraulichkeit:** Intern / Bestandskunden

---

## 1. Wo stehen wir?

### Vision
Wir entwickeln das **erste Cloud-native Fachverfahren fuer deutsche Bauaufsichtsbehoerden**: modern, rechtssicher, konfigurierbar — und so einfach zu bedienen, dass es Fachkraefte anzieht statt sie zu vertreiben. Die neue Loesung ersetzt schrittweise die bestehende On-Premise-Anwendung.

### Aktueller Fortschritt

| Phase | Inhalt | Status |
|---|---|---|
| **Phase 0 — Fundament** | Authentifizierung, SSO-Vorbereitung (OIDC/SAML), Mandantentrennung, Rollenmodell | **Nahezu abgeschlossen** (QA-Review laeuft) |
| **Phase 1 — Kern-MVP** | Vorgangsverwaltung, Fristmanagement, Dokumentenverwaltung, Bescheiderzeugung, XBau, Datenexport | **Erstes Modul fertig**, 5 weitere in Entwicklung |
| **Phase 2 — Compliance** | Vier-Augen-Freigabe, revisionssicherer Audit-Trail, OZG-Portalanbindung | Geplant |
| **Phase 3 — Fuehrung** | Dashboard/Reporting, Gebuehrenberechnung, Offline-Modus, Schulungskonzept | Geplant |

**Konkret erreicht:**
- **32 Commits**, 77 automatisierte Tests, **12 Architekturentscheidungen** dokumentiert
- **Vorgangsverwaltung** (das zentrale Fachmodul) ist als erstes Feature implementiert und QA-abgenommen
- **Workflow Engine** fuer gefuehrte Bearbeitung: Einsteiger sehen Hinweise und Checklisten, Experten arbeiten flexibel
- **Mandantentrennung** auf Datenbankebene (Row Level Security) — Ihre Daten sind strikt von anderen Kommunen getrennt

---

## 2. Was bedeutet das fuer Sie als Bestandskunde?

### Ihre K.O.-Kriterien — Status

| K.O.-Kriterium | Ihr Bedarf | Unser Status |
|---|---|---|
| **SSO ueber Active Directory** | "Einmal einloggen, kein separates Passwort" | Architektur steht (OIDC + SAML), Implementierung in Phase 0 |
| **Vollstaendiger Datenexport** | "Wir koennen jederzeit weg" | Spezifiziert, Implementierung in Phase 1 |
| **XBau-Schnittstelle** | OZG-Konformitaet | Alle 8 Nachrichtentypen im MVP-Scope |
| **Mandantentrennung** | Daten verschiedener Kommunen strikt getrennt | Datenbankschema + RLS implementiert |
| **Konfigurierbarkeit** | Textbausteine, Fristen, Verfahren selbst pflegen | Hybrid-Modell: Behoerden-Admins pflegen Textbausteine, Fristen sind konfigurierbar je Bundesland |
| **EU-Datenresidenz** | Daten ausschliesslich in der EU | Entschieden: Vercel EU + Supabase EU-Region |

### Was sich fuer Ihren Arbeitsalltag aendert

**Fuer Sachbearbeiter:**
- Moderne Weboberflaeche statt Desktop-Client — kein lokaler Installationsaufwand
- Automatische Fristberechnung mit Ampellogik (gruen/gelb/rot) — keine verpassten Fristen
- Gefuehrte Bearbeitung fuer neue Mitarbeiter — das System zeigt den naechsten Schritt

**Fuer Referats-/Amtsleiter:**
- Dashboard mit fristgefaehrdeten Vorgaengen — Eskalation nur bei echten Problemen
- Vier-Augen-Prinzip als konfigurierbarer Workflow-Schritt
- Vollstaendiger Datenexport jederzeit ohne Anbieter-Kontakt

---

## 3. Zeitliche Orientierung

| Meilenstein | Inhalt | Zeithorizont |
|---|---|---|
| **Technischer Prototyp** | Login + Vorgangsverwaltung + Workflow lauffaehig | Erreicht |
| **Kern-MVP komplett** | + Fristen, Dokumente, Bescheide, XBau, Export | Naechste Entwicklungsphase |
| **Pilotbetrieb** | Parallelbetrieb mit 1-2 Pilotkunden, echte Daten | Nach MVP-Abnahme |
| **Rollout** | Schrittweise Migration weiterer Kunden | Nach erfolgreichem Pilot |

**Wichtig:** Der Parallelbetrieb von Alt- und Neusystem ist der Normalzustand waehrend der Transition. Ihre bestehende Loesung laeuft unveraendert weiter, bis Sie aktiv umsteigen.

---

## 4. Ihre Mitwirkung — was wir brauchen

| Thema | Was wir von Ihnen brauchen | Wann |
|---|---|---|
| **SSO-Konfiguration** | Angabe ob Entra ID, ADFS oder lokale Accounts | Vor Pilotbeginn |
| **Textbausteine** | Export Ihrer bestehenden Bescheid-Vorlagen (Word-Dateien) | Vor Pilotbeginn |
| **Pilot-Bereitschaft** | 2-3 Sachbearbeiter fuer begleiteten Testbetrieb | Kern-MVP fertig |
| **Fachliches Feedback** | Bewertung der Workflow-Schritte fuer Ihr Bundesland | Laufend |

---

## 5. Haeufige Fragen

**"Muessen wir sofort umsteigen?"**
Nein. Der Umstieg erfolgt schrittweise und erst nach Ihrer expliziten Freigabe. Kein Cutover ohne getesteten Rollback-Plan.

**"Was passiert mit unseren bestehenden Daten?"**
Wir planen eine strukturierte Datenmigration in 3 Phasen: Analyse → Pilotmigration → Rollout. Ihre Daten werden vollstaendig und verifiziert uebernommen.

**"Koennen wir das System vorher testen?"**
Ja. Sobald der Kern-MVP steht, bieten wir einen begleiteten Pilotbetrieb an.

**"Was kostet das?"**
Die Preisgestaltung wird separat kommuniziert. Die SaaS-Loesung eliminiert lokale Wartungskosten (Server, Updates, Backups).

---

## 6. Naechste Schritte (intern)

**Scope-Entscheidung "Pilot-Readiness Sprint" (bestaetigt 2026-03-26):**

| Prioritaet | Feature | Begruendung |
|---|---|---|
| 1 | PROJ-1 Frontend (Login-UI) | Blocker fuer Demo, Pilot, jede Kundeninteraktion |
| 2 | PROJ-4 Fristmanagement | Hoechstes Kundeninteresse (5/5), Demo-taugliche Ampellogik |
| 3 | Workflow-Definitionen je BL | Kunden sollen je BL Feedback geben |

**Kernbotschaft fuer Kundentermin:** "Die Architektur steht, das erste Fachmodul laeuft, Ihre K.O.-Kriterien sind im Plan. Wir laden Sie ein, am Pilotbetrieb teilzunehmen."

**Risiko bei Inaktivitaet:** Ohne fruehzeitige Kundeneinbindung fehlt fachliches Feedback fuer bundeslandspezifische Workflow-Definitionen. Das verzoegert den Pilotbetrieb.
