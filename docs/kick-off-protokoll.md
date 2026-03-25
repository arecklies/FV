# Projekt Kick-off Protokoll
## Bauaufsichts-SaaS | 25. Maerz 2026

---

## Teilnehmer

| Rolle | Status |
|---|---|
| Software Architect | Anwesend |
| Senior Security Engineer | Anwesend |
| Database Architect | Anwesend |
| Senior Frontend Developer | Anwesend |
| Senior Backend Developer | Anwesend |
| Senior QS Engineer | Anwesend |
| Senior UI/UX Designer | Anwesend |

---

## 1. Gemeinsames Projektverstaendnis

**Konsens aller Rollen:** Wir bauen das erste Cloud-native SaaS-Fachverfahren fuer deutsche Bauaufsichtsbehoerden. Das System muss vier Stakeholder-Ebenen gleichzeitig bedienen (Fachtiefe, UX, Fuehrung, Politik), 8 K.O.-Kriterien erfuellen und ab Phase 1 mit einer NRW-Pilotkommune produktiv nutzbar sein. Die Architektur basiert auf Next.js + Supabase (RLS) + Vercel mit Service-Kapselung (ADR-003).

---

## 2. Vereinbarte Build-Reihenfolge

```
Phase 0 (parallel, 4-6 Wochen):
  PROJ-1 (Auth/SSO) + PROJ-2 (Mandanten/RLS) gleichzeitig
  Synchronisationspunkt: JWT Custom Claim tenant_id

Phase 1 - Schicht 1:
  PROJ-3 (Vorgangsverwaltung) -- Kernfachtabelle

Phase 1 - Schicht 2 (parallel):
  PROJ-4 (Fristmanagement)
  PROJ-5 (Dokumentenverwaltung)
  PROJ-7 (XBau-Basis)

Phase 1 - Schicht 3:
  PROJ-6 (Bescheiderzeugung) -- braucht PROJ-3 + PROJ-5
  PROJ-8 (Datenexport) -- braucht PROJ-2 + PROJ-3 + PROJ-5
```

---

## 3. Identifizierte ADR-Luecken (Architect)

| ADR | Thema | Blockiert | Prioritaet |
|---|---|---|---|
| **ADR-008** | Dokumenten-Storage und Upload (Supabase Storage vs. S3 vs. tus) | PROJ-5 | Hoch |
| **ADR-009** | Asynchrone Verarbeitung / Background Jobs (Vercel 55s-Limit) | PROJ-4, 5, 6, 8 | **Kritisch** |
| **ADR-010** | PDF-Generierung (Puppeteer laeuft nicht auf Vercel Serverless) | PROJ-6 | Mittel |
| ADR-002 erg. | RBAC-Modell (Rollen-Tabelle, Middleware-Pattern) | PROJ-1 | Hoch |

**5 ADRs noch "Proposed":** ADR-001, 002, 004, 005, 006 muessen vor Phase-1-Start auf "Accepted" gesetzt werden.

---

## 4. Konsolidierte Risiken (alle Rollen)

### Kritisch
| Risiko | Identifiziert von | Gegenmassnahme |
|---|---|---|
| **Service-Role-Key umgeht RLS** -- ein fehlender tenant_id-Filter = Cross-Tenant-Datenleck | Security, DB, Architect, Backend | Minimierung, Code-Review-Pflicht, automatisierte Tests, zentrales Gateway |
| **Vercel 55s-Timeout** -- 4 Phase-1-Features benoetigen Langlaeufer | Architect, Backend | ADR-009 (Background Jobs) sofort erstellen |
| **Fristberechnung fachlich fehlerhaft** -- rechtliche Konsequenzen | QS, Backend | Unit-Tests gegen Quelldokumente, Vier-Augen bei Konfiguration |

### Hoch
| Risiko | Identifiziert von | Gegenmassnahme |
|---|---|---|
| **CLOUD-Act-Exposition** bei US-Anbietern | Security, Architect | Phase-2 Self-Hosted parallel evaluieren, formale Risikoakzeptanz |
| **Fehlende RLS-Policy auf neuer Tabelle** | DB, Security, QS | CI-Check: jede Tabelle hat RLS + 4 Policies |
| **Datenexport als Exfiltrations-Vektor** | Security | 2FA-Re-Auth, Rate-Limiting, Vier-Augen-Freigabe |
| **500MB-Upload auf Vercel unmoeglich** | Frontend | ADR-008 (Storage-Strategie) klaeren |
| **Bescheid-Editor Komplexitaet** | Frontend | UX-Handoff VOR Implementierung |

---

## 5. Security-Warnungen (verbindlich fuer alle)

1. **Keine Service-Role-Query ohne tenant_id-Filter** -- Cross-Tenant = Meldepflicht 72h (DSGVO Art. 33)
2. **Keine Tabelle ohne RLS** -- auch nicht temporaer, auch nicht "nur fuer Tests"
3. **Keine Fehlermeldungen mit internen Details an Client** -- generische Meldung, Details ins Server-Log
4. **Keine Secrets in Git** -- Pre-Commit-Hook einrichten (gitleaks/detect-secrets)
5. **Kein Auth-Bypass** -- jede API-Route ruft `requireAuth()` auf, keine Ausnahmen
6. **Cross-Tenant-Fund = sofortiger Stopp** -- Eskalation an PO, kein "fixen wir spaeter"

---

## 6. Schema-Reihenfolge (Database Architect)

```
Migration 1: tenants + tenant_members + RLS (deny-all)
Migration 2: audit_log + RLS (insert-only)
Migration 3: config_verfahrensarten + config_fristen + RLS (deny-all)
Migration 4: vorgaenge + vorgang_status_historie + Indizes + GIN-Index
Migration 5: fristen + frist_ereignisse + Indizes
Migration 6: beteiligte + vorgang_beteiligte
Migration 7: dokumente + OCR-Index
```

---

## 7. API-Design (Backend Developer)

- Phase 0: 10 Auth/Admin-Endpunkte
- Phase 1: ~20 Fach-Endpunkte (Verfahren, Fristen, Dokumente, XBau, Export)
- 9 Service-Module unter `src/lib/services/`
- Alle Endpunkte: Auth-Check, Zod-Validierung, `.limit()`, Security Headers

---

## 8. UX-Entscheidungen (UX Designer)

- **Progressive Disclosure auf 3 Ebenen**: Navigation (Collapsible), Formularfelder (Accordion), Konfigurierbare Profile (Einsteiger/Experte)
- **2 getrennte Dashboards**: Sachbearbeiter ("Mein Arbeitstag") vs. Referatsleiter ("Mein Referat steuern")
- **Frist-Ampel**: Immer Farbe + Icon + Text (nie nur Farbe) -- WCAG 2.2 AA
- **5 Widersprueche geloest**: Progressive Disclosure, Change-Management-Badges, Kern/Schale-UI, Auto-Save, Aggregiertes Reporting
- **35 shadcn/ui-Komponenten vorhanden**, 7 weitere zu installieren (Calendar, DatePicker, etc.)

---

## 9. Qualitaetsgates (QS Engineer)

| Gate | Blockierend |
|---|---|
| RLS-Tests gruen (alle Tabellen, alle 4 Ops) | Ja |
| Testabdeckung >= 80% neue Dateien | Ja |
| XSD-Validierung generierter XBau-XMLs | Ja |
| WCAG 2.2 AA (jest-axe + axe-core, Lighthouse >= 90) | Ja |
| DB-Migration vor App-Deployment | Ja |
| Kein Cross-Tenant-Leak im Export | Ja |

---

## 10. Offene Klaerungspunkte

| # | Frage | Verantwortlich | Blockiert |
|---|---|---|---|
| 1 | Supabase-Plan-Entscheidung (Pro/Team/Enterprise) -- SAML erst ab Team | Architect + PO | PROJ-1 |
| 2 | Background-Job-Strategie (Vercel Cron, Inngest, pg_cron, externer Worker) | Architect | PROJ-4,5,6,8 |
| 3 | Upload-Strategie (Supabase Storage direkt vs. tus-Protokoll) | Architect + Backend | PROJ-5 |
| 4 | PDF-Generierung auf Serverless (Puppeteer, LibreOffice, externer Dienst) | Architect | PROJ-6 |
| 5 | RBAC-Implementierung (Custom Claims, DB-Rollen, Middleware) | Architect + Security | PROJ-1 |
| 6 | JWT Custom Claim tenant_id -- wie technisch gesetzt (Hook, Edge Function)? | DB Architect + Backend | PROJ-2 |
| 7 | E-Mail-Versand fuer Erinnerungen (Resend, SendGrid, Postmark) | Backend | PROJ-4 |

---

## 11. Vereinbarte naechste Schritte

| Rolle | Naechste Aktion | Skill |
|---|---|---|
| **Architect** | ADR-009 (Background Jobs) erstellen -- **blockiert 4 Features** | `/arch-adr` |
| **Architect** | ADR-002 um RBAC ergaenzen, alle Proposed-ADRs reviewen | `/arch-adr` |
| **Security** | Bedrohungsmodell (STRIDE) fuer Phase 0 | `/sec-threatmodel` |
| **DB Architect** | Schema fuer PROJ-2 (tenants, tenant_members, audit_log, RLS) | `/db-schema` |
| **UX Designer** | UX-Konzept fuer PROJ-3 (Vorgangsliste) -- definiert visuelle Sprache | `/ux-concept` |
| **Backend** | Shared Infrastruktur (security-headers.ts, errors.ts, auth.ts, writeAuditLog) | `/backend-api` |
| **Frontend** | Login-UI (PROJ-1) nach UX-Handoff | `/frontend-component` |
| **QS** | Testinfrastruktur aufsetzen + Testplan PROJ-1/PROJ-2 | `/qs-testplan` |

---

## 12. Fazit

Das Team hat ein gemeinsames Verstaendnis der Anforderungen, Architektur und Risiken. Die groessten Blocker sind:
1. **ADR-009 (Background Jobs)** -- ohne diese Entscheidung sind 4 Phase-1-Features nicht planbar
2. **RBAC-Modell** -- ohne dies kann Phase 0 nicht starten
3. **Service-Role-Risiko** -- strukturell, muss durch Prozess (Code-Review) und Technik (Tests) beherrscht werden

**Naechstes Meeting:** Nach Fertigstellung von ADR-009 und PROJ-2 Schema-Entwurf.

---

*Protokoll erstellt am 25.03.2026*
