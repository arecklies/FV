# IT-Administrationshandbuch

**Version:** 1.0 | **Stand:** 27. Maerz 2026
**Zielgruppe:** IT-Abteilungen kommunaler Verwaltungen

---

## 1. Systemvoraussetzungen

### Browser
| Browser | Mindestversion |
|---|---|
| Google Chrome | 120+ |
| Mozilla Firefox | 120+ |
| Microsoft Edge | 120+ |
| Safari (iPad) | 17+ |

JavaScript und Cookies muessen aktiviert sein.

## 2. Netzwerkanforderungen

| Zweck | Port | Protokoll |
|---|---|---|
| Webanwendung + API | 443 | HTTPS (TLS 1.2+) |

- HTTPS-Inspection wird unterstuetzt (kein Certificate Pinning)
- Mindestens 2 Mbit/s pro gleichzeitigem Nutzer

## 3. Authentifizierung

**Aktuell:** E-Mail + Passwort (min. 8 Zeichen), Sitzungsdauer 1 Stunde
**Geplant (Phase 2):** SAML 2.0 / OpenID Connect, FIDO2/WebAuthn

## 4. Datenhaltung

| Aspekt | Details |
|---|---|
| Rechenzentrum | AWS eu-central-1 (Frankfurt am Main) |
| Verschluesselung Transit | TLS 1.2+ (HSTS aktiviert) |
| Verschluesselung at Rest | AES-256 |
| Mandantentrennung | Row-Level Security (PostgreSQL) |
| Backups | Taeglich, 30 Tage Aufbewahrung |

## 5. Security Headers

```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: origin-when-cross-origin
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-XSS-Protection: 0
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

## 6. Verfuegbarkeit

Wartungsfenster: Samstag 02:00-06:00 Uhr (angekuendigt). SLA-Details werden bei Vertragsabschluss mitgeteilt.

## 7. Kontakt

Technische Details werden bei Mandanteneinrichtung mitgeteilt.
