# PROJ-38: E-Mail-Benachrichtigungen Fristeskalation

**Status:** Planned | **Phase:** 1 (Kern-MVP Erweiterung) | **Erstellt:** 2026-03-27
**Herkunft:** Kunden-Session 27.03.2026, F-05 (Herr Oezdemir, Dortmund, P3)
**Prioritaet:** Mittel

---

## 1. Ziel / Problem

Sachbearbeiter sind nicht den ganzen Tag im System. Wenn eine Frist auf Rot springt, erfahren sie das erst beim naechsten Login. Dortmund fordert aktive E-Mail-Benachrichtigungen bei Fristeskalationen, damit Sachbearbeiter rechtzeitig reagieren koennen.

## 2. Fachlicher Kontext & Stakeholder

- **P3 (Referatsleiter, Dortmund):** "Unsere Sachbearbeiter sind nicht den ganzen Tag im System. Das muss aktiv gepusht werden."
- **P1 (Sachbearbeiter):** Will nicht staendig ins System schauen muessen
- **PROJ-4:** Fristmanagement — Ampelwechsel als Trigger
- **PROJ-22:** Cron-Job berechnet Ampelstatus — koennte E-Mail-Versand ausloesen

## 3. Funktionale Anforderungen

- FA-1: E-Mail an zustaendigen Sachbearbeiter wenn Frist auf Gelb wechselt
- FA-2: E-Mail an zustaendigen Sachbearbeiter UND Referatsleiter wenn Frist auf Rot wechselt
- FA-3: E-Mail enthaelt: Vorgangsbezeichnung, Aktenzeichen (falls vorhanden), Fristtyp, Restzeit, Direktlink zum Vorgang
- FA-4: Keine Duplikat-Mails (max. 1 Mail pro Frist pro Ampelwechsel)
- FA-5: E-Mail-Benachrichtigungen koennen pro Nutzer deaktiviert werden

## 4. User Stories & Akzeptanzkriterien

### US-1: E-Mail bei Fristeskalation erhalten
Als Sachbearbeiter moechte ich per E-Mail benachrichtigt werden wenn eine meiner Fristen auf Gelb oder Rot wechselt.
- AC-1: E-Mail wird innerhalb von 15 Minuten nach Ampelwechsel versendet (Cron-Intervall)
- AC-2: E-Mail enthaelt Vorgangsbezeichnung, Fristtyp, Restzeit und Direktlink
- AC-3: Kein Duplikat: pro Frist und Ampelwechsel maximal 1 E-Mail
- AC-4: E-Mail ist in deutscher Sprache mit UTF-8-Umlauten

### US-2: Benachrichtigungen konfigurieren
Als Sachbearbeiter moechte ich E-Mail-Benachrichtigungen ein-/ausschalten koennen.
- AC-1: Toggle in den persoenlichen Einstellungen
- AC-2: Standard: aktiviert
- AC-3: Referatsleiter-Benachrichtigung bei Rot ist nicht abschaltbar

## 5. Nicht-funktionale Anforderungen

- NFR-1: E-Mail-Versand darf Cron-Job-Laufzeit nicht signifikant verlaengern (async/Queue)
- NFR-2: Keine sensiblen Daten in E-Mails (keine Antragsteller-Namen, nur Vorgangs-ID und Fristtyp)
- NFR-3: Rate-Limiting: max. 50 Mails pro Cron-Lauf (Schutz vor Massenversand bei Datenmigration)

## 6. Spezialisten-Trigger

- **Senior Backend Developer:** Cron-Job-Erweiterung, E-Mail-Template, Supabase Edge Function oder externer Provider
- **Senior Security Engineer:** Keine PII in Mails, Env-Variable fuer API-Key
- **DevOps/Platform Engineer:** E-Mail-Provider-Konfiguration (Resend, Postmark oder Supabase SMTP)

## 7. Offene Fragen

- Q-1: Welcher E-Mail-Provider? (Supabase Auth nutzt bereits einen — gleichen verwenden?)
- ~~Q-2: Soll der Referatsleiter eine taegliche Zusammenfassung statt Einzel-Mails erhalten?~~ **Geklaert (Session 28.03.2026, Dortmund F-05):** Ja, Digest-Mail als Standardmodus. Einzel-Mails fuehren zu Benachrichtigungs-Muedigkeit bei 30+ Fristen. Format: Morgens eine Mail mit Zusammenfassung aller Ampelwechsel.
- Q-3: Benachrichtigung auch bei Gelb→Gruen (Entwarnung)?

## 8. Annahmen

- A-1: PROJ-4, PROJ-22 (Cron-Job) und PROJ-34 (konfigurierbare Schwellenwerte) sind deployed
- A-2: E-Mail-Adressen sind ueber Supabase Auth verfuegbar
- A-3: E-Mail-Provider wird als Env-Variable konfiguriert

## 9. Abhaengigkeiten

- **PROJ-4** (Fristmanagement): Ampelwechsel als Trigger-Event
- **PROJ-22** (Cron-Job): Integration in bestehenden Cron-Lauf
- **PROJ-34** (Schwellenwerte): Konfigurierte Schwellen bestimmen Trigger-Zeitpunkt
- **PROJ-1** (Auth): E-Mail-Adressen der Nutzer

## 10. Fachliche Risiken

| Risiko | Auswirkung | Gegenmassnahme |
|---|---|---|
| E-Mail-Flut bei vielen Fristen | Nutzer deaktiviert Benachrichtigungen | Zusammenfassung statt Einzel-Mails (Phase 2) |
| E-Mail landet im Spam | Nutzer verpasst Eskalation | SPF/DKIM-Konfiguration, professioneller Provider |

## 11. Scope / Nicht-Scope

**Scope:**
- E-Mail bei Ampelwechsel Gelb und Rot
- Duplikat-Schutz
- Opt-out pro Nutzer (ausser Referatsleiter-Rot)
- Einfaches Text/HTML-Template

**Nicht-Scope:**
- Taegliche Zusammenfassungs-Mail (Digest)
- Push-Notifications (Browser/Mobile)
- In-App-Benachrichtigungszentrale
- Benachrichtigung bei anderen Events (Workflow-Wechsel, Freigabe)
