# Bedrohungsmodell (STRIDE) -- PROJ-1: Auth und Benutzerverwaltung

**Erstellt:** 2026-03-26
**Autor:** Senior Security Engineer
**Scope:** PROJ-1 (Auth, SSO, RBAC, Session) + PROJ-2 (Mandantentrennung/RLS)
**Grundlage:** ADR-002 (Auth/RBAC), ADR-007 (Multi-Tenancy), security.md

---

## Systemkontext

```
Browser (Sachbearbeiter)
  |
  | HTTPS (TLS 1.2+)
  |
Next.js Server (lokal oder Vercel)
  |
  ├── API Routes: /api/auth/*, /api/admin/*
  │     ├── requireAuth() -- Session pruefen
  │     ├── requireRole() -- RBAC pruefen
  │     └── writeAuditLog() -- Protokollierung
  |
  ├── Supabase Auth (Session, JWT, OIDC, TOTP)
  │     ├── JWT mit Claims: sub, tenant_id, role, aud
  │     └── Cookie: sb-access-token (HttpOnly, Secure, SameSite)
  |
  └── Supabase PostgreSQL
        ├── RLS-Policies: tenant_id = jwt.tenant_id
        ├── tenant_members: user_id + tenant_id + role
        └── audit_log: append-only
```

**Trust Boundaries:**
1. Browser <-> Next.js Server (TLS)
2. Next.js Server <-> Supabase Auth (HTTPS, Service-Role-Key)
3. Next.js Server <-> Supabase PostgreSQL (HTTPS, JWT oder Service-Role-Key)
4. Next.js Server <-> OIDC-Provider (HTTPS, Client-Secret)

---

## S -- Spoofing (Identitaetsvortaeuschung)

### S-1: Gestohlener Session-Cookie

| Attribut | Wert |
|---|---|
| **Bedrohung** | Angreifer stiehlt `sb-access-token` Cookie (z.B. durch XSS, Netzwerk-Sniffing, physischen Zugang) und gibt sich als authentifizierter Nutzer aus |
| **Wahrscheinlichkeit** | Mittel |
| **Auswirkung** | Hoch -- Voller Zugriff auf alle Daten des Tenants mit der Rolle des Opfers |
| **Schutzmassnahmen** | Cookie-Flags: `HttpOnly`, `Secure`, `SameSite=Lax`. CSP im Report-Only (PROJ-38), spaeter Enforcing. Inaktivitaets-Timeout (15 Min Default). Token-Lebensdauer 1h (ADR-002). |
| **Restrisiko** | XSS innerhalb der CSP-Policy koennte Cookie exfiltrieren, solange CSP nicht enforced ist. Physischer Zugang nicht verhinderbar. |
| **Prioritaet** | **HOCH** -- CSP auf Enforcing umstellen sobald stabil |

### S-2: OIDC-Token-Manipulation

| Attribut | Wert |
|---|---|
| **Bedrohung** | Angreifer manipuliert den OIDC-Callback und injiziert einen falschen `tenant_id` Claim |
| **Wahrscheinlichkeit** | Niedrig |
| **Auswirkung** | Kritisch -- Zugriff auf fremden Tenant |
| **Schutzmassnahmen** | JWT wird serverseitig von Supabase signiert (HMAC-SHA256 oder RS256). `tenant_id` wird NICHT aus dem OIDC-Token uebernommen, sondern aus `tenant_members` nach erfolgreicher Auth aufgeloest. OIDC `state`-Parameter gegen CSRF. |
| **Restrisiko** | Wenn Supabase-JWT-Secret kompromittiert wird, koennen beliebige Claims gesetzt werden. |
| **Prioritaet** | MITTEL -- Supabase-Secret-Rotation dokumentieren |

### S-3: Brute-Force auf E-Mail/Passwort-Login

| Attribut | Wert |
|---|---|
| **Bedrohung** | Angreifer probiert tausende Passwort-Kombinationen gegen `/api/auth/login` |
| **Wahrscheinlichkeit** | Hoch |
| **Auswirkung** | Mittel -- Kontozugang bei schwachem Passwort |
| **Schutzmassnahmen** | Rate-Limiting auf Auth-Endpunkten (security.md). Supabase Auth hat integriertes Rate-Limiting (standardmaessig). Account-Lockout nach X fehlgeschlagenen Versuchen. 2FA erzwungen fuer Admin-Rollen. |
| **Restrisiko** | In-Memory Rate-Limiting auf Serverless unzuverlaessig. Supabase-internes Rate-Limiting ist die primaere Verteidigung. |
| **Prioritaet** | **HOCH** -- Supabase Auth Rate-Limiting-Konfiguration verifizieren |

### S-4: Account-Takeover via Account-Linking

| Attribut | Wert |
|---|---|
| **Bedrohung** | Angreifer erstellt lokales Konto mit E-Mail eines SSO-Nutzers und verknuepft spaeter mit SSO-Identitaet |
| **Wahrscheinlichkeit** | Mittel |
| **Auswirkung** | Hoch -- Uebernahme eines Behoerdenkontos |
| **Schutzmassnahmen** | Account-Linking NUR ueber E-Mail-Verifizierung, NIE automatisch (ADR-002). Lokale Konten und SSO-Konten bleiben getrennt bis explizit verknuepft. Admin muss Linking bestaetigen. |
| **Restrisiko** | Social Engineering gegenueber Admin moeglich. |
| **Prioritaet** | MITTEL -- Account-Linking als eigenes Feature planen, nicht im MVP |

---

## T -- Tampering (Datenmanipulation)

### T-1: Cross-Tenant-Schreibzugriff ueber Service-Role

| Attribut | Wert |
|---|---|
| **Bedrohung** | Backend-Code nutzt `createServiceRoleClient()` ohne `tenant_id`-Filter und schreibt Daten in falschen Tenant |
| **Wahrscheinlichkeit** | Mittel (strukturelles Risiko bei jedem neuen Feature) |
| **Auswirkung** | Kritisch -- Datenintegritaet verletzt, DSGVO-Meldepflicht |
| **Schutzmassnahmen** | Service-Role-Nutzung minimieren (ADR-007). Jede Service-Role-Query MUSS expliziten `tenant_id`-Filter haben. Code-Review-Pflicht fuer jede Service-Role-Nutzung. RLS-Integrationstests (QS Engineer). |
| **Restrisiko** | Ein einziger vergessener Filter genuegt. Strukturelles Risiko, das nie vollstaendig eliminiert werden kann. |
| **Prioritaet** | **KRITISCH** -- CI-Check + Code-Review als Gate |

### T-2: Rollen-Eskalation durch JWT-Manipulation

| Attribut | Wert |
|---|---|
| **Bedrohung** | Angreifer aendert `role` Claim im JWT von "sachbearbeiter" auf "tenant_admin" |
| **Wahrscheinlichkeit** | Sehr niedrig |
| **Auswirkung** | Kritisch -- Volle Admin-Rechte |
| **Schutzmassnahmen** | JWT ist serverseitig signiert. Manipulation wird bei Signaturpruefung erkannt. `role` wird bei Token-Refresh aus `tenant_members` neu gelesen, nicht aus dem alten Token uebernommen. |
| **Restrisiko** | JWT-Secret-Kompromittierung (siehe S-2). |
| **Prioritaet** | NIEDRIG -- Supabase-Signaturmechanismus ist robust |

### T-3: Audit-Log-Manipulation ueber Service-Role

| Attribut | Wert |
|---|---|
| **Bedrohung** | Kompromittierter Server oder Insider nutzt Service-Role-Key um Audit-Eintraege zu loeschen oder aendern |
| **Wahrscheinlichkeit** | Niedrig |
| **Auswirkung** | Kritisch -- Audit-Trail verliert Beweiskraft, Revisionssicherheit nicht mehr gewaehrleistet |
| **Schutzmassnahmen** | RLS: deny-all fuer UPDATE/DELETE auf `audit_log` (Client-Rollen). Stufe 2 (ADR-005): Verkettete SHA-256-Hashes + S3 WORM-Export. writeAuditLog() als einziger Zugriffspunkt. |
| **Restrisiko** | In Stufe 1 (MVP) kann Service-Role die Audit-Tabelle manipulieren. Dokumentiertes Restrisiko. |
| **Prioritaet** | **HOCH** -- Stufe 2 vor Pilotbetrieb mit Echtdaten implementieren |

---

## R -- Repudiation (Bestreitbarkeit)

### R-1: Aktionen ohne Audit-Trail

| Attribut | Wert |
|---|---|
| **Bedrohung** | Nutzer fuehrt sicherheitsrelevante Aktion aus (Rollenaenderung, Export, Login) ohne dass sie protokolliert wird |
| **Wahrscheinlichkeit** | Mittel (bei neuen Features die Audit-Log vergessen) |
| **Auswirkung** | Hoch -- Keine Nachweisbarkeit bei Dienstaufsichtsbeschwerden oder DSGVO-Auskunftsanfragen |
| **Schutzmassnahmen** | `writeAuditLog()` als PFLICHT in jedem API-Endpunkt (backend.md). Testabdeckung: Jeder Endpunkt muss Audit-Eintrag erzeugen. QS-Gate: Kein Deployment ohne Audit-Log-Test. |
| **Restrisiko** | Lesezugriffe (SELECT) werden in Stufe 1 nicht geloggt. Erst ab Stufe 2 (ADR-005). |
| **Prioritaet** | MITTEL -- Test-Coverage fuer Audit-Eintraege als QS-Gate |

### R-2: Fehlende Zeitstempel-Integritaet

| Attribut | Wert |
|---|---|
| **Bedrohung** | Audit-Eintraege haben manipulierte Zeitstempel (z.B. durch Server-Zeitsynchronisationsfehler) |
| **Wahrscheinlichkeit** | Niedrig |
| **Auswirkung** | Mittel -- Reihenfolge von Aktionen nicht nachvollziehbar |
| **Schutzmassnahmen** | `created_at DEFAULT now()` in PostgreSQL (DB-seitig, nicht applikationsseitig). NTP-Synchronisation des Servers. Stufe 3: Qualifizierte Zeitstempel (TSA). |
| **Restrisiko** | PostgreSQL `now()` kann bei Clock-Drift falsch sein. In der Praxis vernachlaessigbar. |
| **Prioritaet** | NIEDRIG |

---

## I -- Information Disclosure (Daten-Preisgabe)

### I-1: Cross-Tenant-Lesezugriff

| Attribut | Wert |
|---|---|
| **Bedrohung** | Nutzer von Tenant A liest Daten von Tenant B (durch fehlende RLS, fehlenden Filter, API-Bug) |
| **Wahrscheinlichkeit** | Mittel |
| **Auswirkung** | Kritisch -- DSGVO-Verstoss, K.O.-Kriterium-Verletzung, Meldepflicht |
| **Schutzmassnahmen** | RLS auf jeder mandantenfaehigen Tabelle (ADR-007). Defense-in-Depth: Zusaetzlicher `tenant_id`-Filter in Service-Schicht. RLS-Integrationstests fuer alle 4 Operationen. CI-Gate: Fehlgeschlagene RLS-Tests blockieren Deployment. |
| **Restrisiko** | Neue Tabelle ohne RLS-Policy (Entwicklerfehler). CI-Check muss das auffangen. |
| **Prioritaet** | **KRITISCH** -- RLS-CI-Check implementieren |

### I-2: Error-Leakage in API-Responses

| Attribut | Wert |
|---|---|
| **Bedrohung** | API-Fehlermeldungen enthalten Datenbank-Strukturen, SQL-Fragmente, Stack-Traces oder Supabase-interne Details |
| **Wahrscheinlichkeit** | Hoch (typischer Entwicklerfehler) |
| **Auswirkung** | Mittel -- Angreifer lernt DB-Schema und kann gezieltere Angriffe planen |
| **Schutzmassnahmen** | Error-Leakage-Verbot (security.md): Generische Meldung an Client, Details nur ins Server-Log. `validationError()` und `serverError()` als einzige Response-Helfer. Kein `err.message` in Responses. |
| **Restrisiko** | Neue Endpunkte die nicht die Helfer-Funktionen nutzen. Code-Review-Pflicht. |
| **Prioritaet** | MITTEL -- Error-Helfer als ersten Code implementieren |

### I-3: JWT-Claims in Browser-DevTools sichtbar

| Attribut | Wert |
|---|---|
| **Bedrohung** | `tenant_id` und `role` sind im JWT sichtbar (Base64-decoded). Ein Nutzer sieht den Tenant anderer Nutzer wenn er Zugang zu deren Browser hat. |
| **Wahrscheinlichkeit** | Niedrig |
| **Auswirkung** | Niedrig -- tenant_id ist eine UUID, kein Geheimnis. role ist keine sensible Information. |
| **Schutzmassnahmen** | Kein sensible Daten in JWT-Claims (keine E-Mail, kein Name). tenant_id und role sind fuer den Betrieb noetig. |
| **Restrisiko** | Akzeptabel. JWT-Claims sind by design sichtbar. |
| **Prioritaet** | NIEDRIG -- Kein Handlungsbedarf |

---

## D -- Denial of Service

### D-1: Unbegrenzte Login-Versuche

| Attribut | Wert |
|---|---|
| **Bedrohung** | Angreifer flutet `/api/auth/login` mit tausenden Requests pro Sekunde |
| **Wahrscheinlichkeit** | Hoch |
| **Auswirkung** | Mittel -- Auth-Service wird langsam, legitime Nutzer koennen sich nicht einloggen |
| **Schutzmassnahmen** | Supabase Auth internes Rate-Limiting. Applikationsseitiges Rate-Limiting auf Login-Endpunkt (5 Versuche/Min/IP). Account-Lockout nach 10 Fehlversuchen (15 Min Sperre). |
| **Restrisiko** | In-Memory Rate-Limiting unzuverlaessig auf Serverless. Lokal (MVP) funktioniert es. |
| **Prioritaet** | **HOCH** -- Rate-Limiting als einer der ersten Endpunkte |

### D-2: Session-Exhaustion

| Attribut | Wert |
|---|---|
| **Bedrohung** | Angreifer erzeugt tausende valide Sessions durch automatisierte Logins |
| **Wahrscheinlichkeit** | Niedrig |
| **Auswirkung** | Mittel -- Supabase Auth Session-Storage wird belastet |
| **Schutzmassnahmen** | Rate-Limiting auf Login. Supabase Auth begrenzt Sessions pro User. Inaktivitaets-Timeout raeurt alte Sessions. |
| **Restrisiko** | Bei kompromittierten Credentials koennte ein Angreifer viele Sessions erzeugen. 2FA schuetzt dagegen. |
| **Prioritaet** | NIEDRIG |

---

## E -- Elevation of Privilege (Rechte-Eskalation)

### E-1: Sachbearbeiter aendert eigene Rolle in tenant_members

| Attribut | Wert |
|---|---|
| **Bedrohung** | Sachbearbeiter versucht ueber eine API-Route seine eigene Rolle auf `tenant_admin` zu aendern |
| **Wahrscheinlichkeit** | Mittel |
| **Auswirkung** | Kritisch -- Volle Admin-Rechte ohne Berechtigung |
| **Schutzmassnahmen** | RLS auf `tenant_members`: deny-all fuer Client-Rollen (Service-Only-Tabelle). Rollenaenderung nur ueber `/api/admin/users/[id]` mit `requireRole('tenant_admin')`. Audit-Log fuer jede Rollenaenderung. |
| **Restrisiko** | Ein Bug in der Admin-API koennte die Rollen-Pruefung umgehen. Tests und Code-Review. |
| **Prioritaet** | **HOCH** -- tenant_members als Service-Only mit deny-all RLS |

### E-2: Plattform-Admin-Zugang ohne 2FA

| Attribut | Wert |
|---|---|
| **Bedrohung** | Plattform-Admin-Konto wird ohne 2FA betrieben und durch Credential-Stuffing uebernommen |
| **Wahrscheinlichkeit** | Niedrig (wenn 2FA erzwungen) |
| **Auswirkung** | Kritisch -- Cross-Tenant-Zugriff, Service-Role-Nutzung, Tenant-Manipulation |
| **Schutzmassnahmen** | 2FA fuer Plattform-Admin PFLICHT (ADR-002). Nur ein dediziertes Konto. IP-Einschraenkung wenn moeglich. Alle Aktionen im Audit-Log. |
| **Restrisiko** | Social Engineering, SIM-Swapping bei SMS-2FA (wir nutzen TOTP, nicht SMS -- kein Risiko). |
| **Prioritaet** | MITTEL -- 2FA-Enforcement in Login-Flow implementieren |

### E-3: OIDC-Provider liefert falsche Rolleninformation

| Attribut | Wert |
|---|---|
| **Bedrohung** | Kompromittierter oder falsch konfigurierter OIDC-Provider liefert Claims die eine hoehere Rolle implizieren |
| **Wahrscheinlichkeit** | Niedrig |
| **Auswirkung** | Hoch -- Unberechtigte Rollenzuweisung |
| **Schutzmassnahmen** | Rollen werden NICHT aus dem OIDC-Token uebernommen. Die Rolle wird aus `tenant_members` gelesen (interne Datenbank). Der OIDC-Provider liefert nur die Identitaet (sub, email), nicht die Berechtigung. |
| **Restrisiko** | Keines -- Rollen sind vollstaendig intern verwaltet. |
| **Prioritaet** | NIEDRIG -- Architekturell geloest |

---

## Risikomatrix (zusammengefasst)

| ID | Bedrohung | W | A | Risiko | Prioritaet |
|---|---|:---:|:---:|:---:|---|
| **T-1** | Cross-Tenant-Schreibzugriff (Service-Role) | M | K | **Kritisch** | Sofort: CI-Check + Code-Review |
| **I-1** | Cross-Tenant-Lesezugriff | M | K | **Kritisch** | Sofort: RLS-Tests als CI-Gate |
| **S-1** | Gestohlener Session-Cookie | M | H | **Hoch** | CSP auf Enforcing, Token-Lebensdauer kurz |
| **S-3** | Brute-Force Login | H | M | **Hoch** | Rate-Limiting verifizieren |
| **T-3** | Audit-Log-Manipulation | N | K | **Hoch** | ADR-005 Stufe 2 vor Pilot |
| **D-1** | Login-Flooding (DoS) | H | M | **Hoch** | Rate-Limiting implementieren |
| **E-1** | Rollen-Eskalation via API | M | K | **Hoch** | tenant_members deny-all, requireRole |
| **R-1** | Fehlende Audit-Eintraege | M | H | **Mittel** | Audit-Test als QS-Gate |
| **I-2** | Error-Leakage | H | M | **Mittel** | Error-Helfer als erste Implementierung |
| **S-4** | Account-Linking Takeover | M | H | **Mittel** | Linking erst nach E-Mail-Verifizierung |
| **E-2** | Plattform-Admin ohne 2FA | N | K | **Mittel** | 2FA-Enforcement |
| **S-2** | OIDC-Token-Manipulation | N | K | **Niedrig** | Supabase-Signatur schuetzt |
| **T-2** | JWT-Manipulation | SN | K | **Niedrig** | Signatur schuetzt |
| **I-3** | JWT-Claims in DevTools | N | N | **Niedrig** | Akzeptabel |
| **R-2** | Zeitstempel-Manipulation | N | M | **Niedrig** | DB-seitiges now() |
| **D-2** | Session-Exhaustion | N | M | **Niedrig** | Rate-Limiting + Timeout |
| **E-3** | OIDC liefert falsche Rolle | N | H | **Niedrig** | Rollen intern verwaltet |

*W = Wahrscheinlichkeit (SN=Sehr Niedrig, N=Niedrig, M=Mittel, H=Hoch), A = Auswirkung (N=Niedrig, M=Mittel, H=Hoch, K=Kritisch)*

---

## Pflicht-Massnahmen vor Implementierung von PROJ-1

| # | Massnahme | Verantwortlich | Blockiert |
|---|---|---|---|
| 1 | **RLS-Integrationstests** als CI-Gate einrichten (QS) | QS Engineer | Jedes Deployment |
| 2 | **Error-Response-Helfer** (`validationError`, `serverError`) als erste Dateien | Backend Developer | Alle API-Routes |
| 3 | **Security-Headers** in `src/lib/api/security-headers.ts` | Backend Developer | Alle API-Routes |
| 4 | **Rate-Limiting auf Auth-Endpunkten** verifizieren (Supabase-Config) | Security Engineer | Login-Endpunkt |
| 5 | **Service-Role-Nutzungsrichtlinie** dokumentieren | Security Engineer | Code-Reviews |
| 6 | **Cookie-Flags pruefen**: HttpOnly, Secure, SameSite=Lax | Security Engineer | Login-Implementierung |
| 7 | **`tenant_id` aus tenant_members, NICHT aus OIDC-Token** | Backend Developer | OIDC-Integration |

---

## Naechster Schritt

`/sec-review` fuer PROJ-1-Implementierung sobald erster Code existiert. Bis dahin: Massnahmen 1-7 als Voraussetzungen in die PROJ-1-Spec aufnehmen.

Alternativ: `/db-schema PROJ-2` um die RLS-Policies zu implementieren, die die kritischsten Bedrohungen (T-1, I-1, E-1) adressieren.
