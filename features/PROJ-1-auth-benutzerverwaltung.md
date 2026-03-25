# PROJ-1: Auth und Benutzerverwaltung

**Status:** Planned | **Phase:** 0 (Fundament) | **Erstellt:** 2026-03-25

---

## 1. Ziel / Problem

Ohne Authentifizierung und Benutzerverwaltung ist keine weitere Fachfunktion nutzbar. Auth ist Voraussetzung fuer RLS (Mandantentrennung), Rollensteuerung und Audit-Trail. SSO ueber kommunales Active Directory ist K.O.-Kriterium aller vier Stakeholder-Personas.

## 2. Fachlicher Kontext & Stakeholder

- **P1 (Sachbearbeiter):** SSO ueber SAML/OIDC, kein separates Passwort
- **P2 (Einsteiger):** "Einmal einloggen und fertig" (SSO)
- **P3 (Referatsleiter):** Benutzerverwaltung durch eigene Admins, Rollenzuweisung
- **P4 (Amtsleiter):** Integration in kommunale IT-Landschaft, 2FA-Option
- **ADR-002:** Authentifizierung und SSO-Strategie (OIDC primaer, SAML sekundaer, lokale Accounts Fallback)

## 3. Funktionale Anforderungen

- FA-1: Login-Flow mit E-Mail/Passwort als Basis
- FA-2: OIDC-Provider-Konfiguration pro Tenant (Entra ID / generischer OIDC)
- FA-3: JWT Custom Claim `tenant_id` fuer RLS-Durchsetzung
- FA-4: 2FA (TOTP) optional, erzwingbar pro Rolle
- FA-5: Session-Management mit konfigurierbarem Inaktivitaets-Timeout (Standard 15 Min)
- FA-6: Cookie-basierter Auth-Flow fuer Server-Side-Rendering (`sb-access-token`)
- FA-7: Lokale Benutzerverwaltung (Benutzer anlegen, Rollen zuweisen, Passwort-Reset)
- FA-8: Rollenmodell: Admin, Sachbearbeiter, Referatsleiter, Amtsleiter

## 4. User Stories & Akzeptanzkriterien

### US-1: Login mit E-Mail/Passwort
Als Behoerdenmitarbeiter moechte ich mich mit E-Mail und Passwort anmelden.
- AC-1: Login-Seite mit E-Mail/Passwort-Formular
- AC-2: Erfolgreiche Anmeldung leitet auf Dashboard weiter
- AC-3: Fehlerhafte Anmeldung zeigt klare Fehlermeldung (nicht "Fehler 0x00FF44")
- AC-4: Session-Cookie `sb-access-token` wird gesetzt

### US-2: SSO ueber OIDC
Als Sachbearbeiter moechte ich mich mit meinem AD-Konto anmelden ohne separates Passwort.
- AC-1: OIDC-Login-Button auf Login-Seite (konfigurierbar pro Tenant)
- AC-2: Redirect zu Entra ID / OIDC-Provider
- AC-3: Nach erfolgreicher Authentifizierung: JWT enthaelt `tenant_id` Custom Claim
- AC-4: Kein separates Konto im System noetig

### US-3: Rollenzuweisung durch Admin
Als Behoerden-Admin moechte ich Benutzern Rollen zuweisen, damit Berechtigungen gesteuert werden.
- AC-1: Admin-Oberflaeche fuer Benutzerverwaltung
- AC-2: Rollen: Admin, Sachbearbeiter, Referatsleiter, Amtsleiter
- AC-3: Rollenaenderung sofort wirksam (naechster Request)

## 5. Nicht-funktionale Anforderungen

- NFR-1: Automatische Session-Abmeldung nach konfigurierbarer Inaktivitaet
- NFR-2: 2FA erzwingbar pro Rolle (Admin-Rollen immer)
- NFR-3: Kein Passwort-Reset ueber Anbieter-Ticketsystem noetig
- NFR-4: WCAG 2.2 AA fuer Login-Seite

## 6. Spezialisten-Trigger

- **Security Engineer:** Auth-Architektur-Review, 2FA-Konzept, Session-Sicherheit
- **Database Architect:** User-/Rollen-Schema, Tenant-Members-Tabelle
- **Frontend Developer:** Login-UI, Auth-Provider, Session-Handling

## 7. Offene Fragen

1. Supabase-Plan-Entscheidung: Team oder Enterprise fuer SAML-Support?
2. Recovery Codes bei 2FA: Wie viele, wie ausliefern?
3. Account-Linking: Lokales Konto spaeter mit SSO verknuepfen?

## 8. Annahmen

- Supabase Auth deckt OIDC und 2FA/TOTP nativ ab
- SAML wird erst in Phase 2 benoetigt (kein Blocker fuer Phase 0)
- Erster Tenant wird manuell angelegt (kein Self-Service-Onboarding)

## 9. Abhaengigkeiten

| Abhaengigkeit | Typ |
|---|---|
| Supabase-Projekt eingerichtet (EU-Region) | Voraussetzung |
| ADR-002 (Auth-Strategie) | Architekturentscheidung |
| PROJ-2 (Mandanten-Schema) | Parallel, JWT Custom Claims |

## 10. Fachliche Risiken

| Risiko | Wahrscheinlichkeit | Auswirkung | Gegenmassnahme |
|---|---|---|---|
| Kommune hat kein Entra ID | Mittel | Lokale Accounts als Fallback | Im Rollenzuweisungs-UI abgedeckt |
| Session-Timeout stoert bei langen Bearbeitungen | Mittel | Nutzerfrust | Activity-Ping bei aktiver Nutzung |
| OIDC-Konfiguration je Tenant komplex | Mittel | Onboarding-Aufwand | Dokumentierter Onboarding-Prozess |
