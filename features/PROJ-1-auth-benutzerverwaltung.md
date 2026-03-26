# PROJ-1: Auth und Benutzerverwaltung

**Status:** In Review | **Phase:** 0 (Fundament) | **Erstellt:** 2026-03-25
**Letzte Verfeinerung:** 2026-03-26 (req-refine: Rollenmodell an ADR-002 angeglichen, fehlende Stories ergaenzt, Force-Refresh entschieden)

---

## 1. Ziel / Problem

Ohne Authentifizierung und Benutzerverwaltung ist keine weitere Fachfunktion nutzbar. Auth ist Voraussetzung fuer RLS (Mandantentrennung), Rollensteuerung und Audit-Trail. SSO ueber kommunales Active Directory ist K.O.-Kriterium aller vier Stakeholder-Personas.

## 2. Fachlicher Kontext & Stakeholder

- **P1 (Sachbearbeiter):** SSO ueber SAML/OIDC, kein separates Passwort
- **P2 (Einsteiger):** "Einmal einloggen und fertig" (SSO)
- **P3 (Referatsleiter):** Benutzerverwaltung durch eigene Admins, Rollenzuweisung
- **P4 (Amtsleiter):** Integration in kommunale IT-Landschaft, 2FA-Option
- **ADR-002:** Authentifizierung, SSO-Strategie und RBAC (OIDC primaer, SAML sekundaer, lokale Accounts Fallback, 5-Rollen-Hierarchie)

## 3. Funktionale Anforderungen

- FA-1: Login-Flow mit E-Mail/Passwort als Basis
- FA-2: OIDC-Provider-Konfiguration pro Tenant (Entra ID / generischer OIDC)
- FA-3: JWT Custom Claim `tenant_id` fuer RLS-Durchsetzung
- FA-4: 2FA (TOTP) optional, erzwingbar pro Rolle
- FA-5: Session-Management mit konfigurierbarem Inaktivitaets-Timeout (Standard 15 Min)
- FA-6: Cookie-basierter Auth-Flow fuer Server-Side-Rendering (`sb-access-token`)
- FA-7: Lokale Benutzerverwaltung (Benutzer anlegen, Rollen zuweisen, Passwort-Reset, Benutzer entfernen)
- FA-8: Rollenmodell gemaess ADR-002: `sachbearbeiter`, `referatsleiter`, `amtsleiter`, `tenant_admin`, `platform_admin`
- FA-9: Logout mit Cookie-Bereinigung und Redirect auf Login-Seite
- FA-10: Force-Refresh bei Rollenaenderung -- bei naechstem Request des betroffenen Nutzers wird ein Token-Refresh erzwungen, damit neue Rolle sofort wirksam wird

## 4. User Stories & Akzeptanzkriterien

### US-1: Login mit E-Mail/Passwort
Als Behoerdenmitarbeiter moechte ich mich mit E-Mail und Passwort anmelden.
- AC-1: Login-Seite mit E-Mail/Passwort-Formular
- AC-2: Erfolgreiche Anmeldung leitet auf Dashboard weiter
- AC-3: Fehlerhafte Anmeldung zeigt klare Fehlermeldung (nicht "Fehler 0x00FF44")
- AC-4: Session-Cookie `sb-access-token` wird gesetzt
- AC-5: Loading-State waehrend der Anmeldung (Button deaktiviert, Spinner)
- AC-6: Login-Seite erfuellt WCAG 2.2 AA (Tastaturnavigation, ARIA-Labels, Target Size >= 24x24px)

### US-2: SSO ueber OIDC
Als Sachbearbeiter moechte ich mich mit meinem AD-Konto anmelden ohne separates Passwort.
- AC-1: OIDC-Login-Button auf Login-Seite (konfigurierbar pro Tenant)
- AC-2: Redirect zu Entra ID / OIDC-Provider
- AC-3: Nach erfolgreicher Authentifizierung: JWT enthaelt `tenant_id` Custom Claim
- AC-4: Kein separates Konto im System noetig

### US-3: Rollenzuweisung durch Admin
Als Tenant-Admin moechte ich Benutzern Rollen zuweisen, damit Berechtigungen gesteuert werden.
- AC-1: Admin-Oberflaeche fuer Benutzerverwaltung (Tabelle mit Benutzern des eigenen Mandanten)
- AC-2: Zuweisbare Rollen: `sachbearbeiter`, `referatsleiter`, `amtsleiter`, `tenant_admin` (4 Tenant-Rollen gemaess ADR-002)
- AC-3: Rollenaenderung wird beim naechsten Request des betroffenen Nutzers wirksam (Force-Refresh-Mechanismus)
- AC-4: `platform_admin` wird im Tenant-Admin-UI NICHT angeboten (existiert ausserhalb des Tenant-Kontexts, ADR-002)
- AC-5: Loading- und Error-States bei Rollenaenderung

### US-4: Logout
Als Behoerdenmitarbeiter moechte ich mich abmelden koennen.
- AC-1: Logout-Button im Header/Navigation sichtbar
- AC-2: Session-Cookie `sb-access-token` wird geloescht
- AC-3: Redirect auf Login-Seite nach Abmeldung
- AC-4: Abmeldung wird im Audit-Log protokolliert

### US-5: Passwort-Reset (Self-Service)
Als Behoerdenmitarbeiter moechte ich mein Passwort selbst zuruecksetzen koennen, ohne ein Ticket beim Anbieter zu eroeffnen.
- AC-1: "Passwort vergessen?"-Link auf Login-Seite
- AC-2: E-Mail-basierter Reset-Flow (Supabase Auth resetPasswordForEmail)
- AC-3: Neue Passwort-Eingabe mit Mindestanforderung (8 Zeichen)
- AC-4: Erfolgreiche Aenderung zeigt Bestaetigung und leitet auf Login weiter

### US-6: Benutzer aus Mandant entfernen
Als Tenant-Admin moechte ich einen Benutzer aus meinem Mandanten entfernen koennen.
- AC-1: Entfernen-Aktion in der Benutzerliste (mit Bestaetigung-Dialog)
- AC-2: Selbstloeschung wird verhindert (Fehlermeldung)
- AC-3: Entfernung wird im Audit-Log protokolliert
- AC-4: Entfernter Benutzer verliert sofort Zugriff auf Mandantendaten

## 5. Nicht-funktionale Anforderungen

- NFR-1: Automatische Session-Abmeldung nach konfigurierbarer Inaktivitaet (Standard 15 Min, Activity-Ping bei aktiver Nutzung)
- NFR-2: 2FA erzwingbar pro Rolle (Admin-Rollen immer)
- NFR-3: Kein Passwort-Reset ueber Anbieter-Ticketsystem noetig (Self-Service)
- NFR-4: WCAG 2.2 AA fuer alle Auth-Seiten (Login, Reset, Admin-Panel)

## 6. Spezialisten-Trigger

- **Security Engineer:** Auth-Architektur-Review, 2FA-Konzept, Session-Sicherheit, Force-Refresh-Mechanismus
- **Database Architect:** User-/Rollen-Schema, Tenant-Members-Tabelle
- **Frontend Developer:** Login-UI, Auth-Provider, Session-Handling, Admin-Benutzerverwaltung

## 7. Offene Fragen

1. Supabase-Plan-Entscheidung: Team oder Enterprise fuer SAML-Support?
2. Recovery Codes bei 2FA: Wie viele, wie ausliefern? (ADR-002: 8 Codes, einmalig anzeigen -- bestaetigen oder aendern?)
3. Account-Linking: Lokales Konto spaeter mit SSO verknuepfen?

## 8. Annahmen

- Supabase Auth deckt OIDC und 2FA/TOTP nativ ab
- SAML wird erst in Phase 2 benoetigt (kein Blocker fuer Phase 0)
- Erster Tenant wird manuell angelegt (kein Self-Service-Onboarding)
- Force-Refresh-Mechanismus: Bei Rollenaenderung wird ein Flag in `tenant_members` gesetzt (`role_changed_at`). Middleware prueft ob `role_changed_at > token.iat` und erzwingt Token-Refresh.

## 9. Abhaengigkeiten

| Abhaengigkeit | Typ |
|---|---|
| Supabase-Projekt eingerichtet (EU-Region) | Voraussetzung |
| ADR-002 (Auth-Strategie und RBAC) | Architekturentscheidung |
| PROJ-2 (Mandanten-Schema) | Parallel, JWT Custom Claims |

## 10. Fachliche Risiken

| Risiko | Wahrscheinlichkeit | Auswirkung | Gegenmassnahme |
|---|---|---|---|
| Kommune hat kein Entra ID | Mittel | Lokale Accounts als Fallback | Im Rollenzuweisungs-UI abgedeckt |
| Session-Timeout stoert bei langen Bearbeitungen | Mittel | Nutzerfrust | Activity-Ping bei aktiver Nutzung |
| OIDC-Konfiguration je Tenant komplex | Mittel | Onboarding-Aufwand | Dokumentierter Onboarding-Prozess |
| Force-Refresh erhoet Middleware-Komplexitaet | Niedrig | Fehlerquelle | Dedizierter Test fuer Force-Refresh-Pfad |
