# API-Referenz: Fristmanagement (PROJ-4)

**Version:** 1.0 | **Status:** Deployed | **Datum:** 2026-03-26

## Uebersicht

Das Fristmanagement stellt API-Endpunkte fuer die Verwaltung gesetzlicher Fristen bereit.
Fristen werden pro Vorgang angelegt, mit Ampellogik (gruen/gelb/rot/dunkelrot/gehemmt) versehen
und koennen verlaengert oder gehemmt werden. Alle Aenderungen werden im Audit-Trail protokolliert.

**Basis-URL:** `/api`
**Authentifizierung:** Cookie-basierte Supabase-Session (alle Endpunkte ausser `/api/internal/*`)

## Endpunkte

### GET /api/vorgaenge/{id}/fristen

Alle aktiven Fristen eines Vorgangs laden.

**Auth:** Session (Cookie)

**Path-Parameter:**
| Parameter | Typ | Beschreibung |
|---|---|---|
| `id` | UUID | Vorgang-ID |

**Response 200:**
```json
{
  "fristen": [
    {
      "id": "uuid",
      "tenant_id": "uuid",
      "vorgang_id": "uuid",
      "typ": "gesamtfrist",
      "bezeichnung": "Gesamtfrist Baugenehmigung",
      "start_datum": "2026-03-01T00:00:00.000Z",
      "end_datum": "2026-06-01T00:00:00.000Z",
      "werktage": 60,
      "status": "gruen",
      "gehemmt": false,
      "hemmung_grund": null,
      "hemmung_start": null,
      "hemmung_ende": null,
      "hemmung_tage": 0,
      "verlaengert": false,
      "verlaengerung_grund": null,
      "original_end_datum": null,
      "aktiv": true,
      "created_at": "2026-03-01T00:00:00.000Z",
      "updated_at": "2026-03-01T00:00:00.000Z"
    }
  ]
}
```

**Fehler:**
| Status | Bedeutung |
|---|---|
| 400 | Ungueltige Vorgang-ID (kein UUID) |
| 401 | Nicht authentifiziert |
| 404 | Vorgang nicht gefunden oder anderer Mandant |

---

### POST /api/vorgaenge/{id}/fristen

Neue Frist fuer einen Vorgang anlegen. Enddatum und Ampelstatus werden automatisch berechnet.

**Auth:** Session (Cookie)

**Path-Parameter:**
| Parameter | Typ | Beschreibung |
|---|---|---|
| `id` | UUID | Vorgang-ID |

**Request-Body:**
```json
{
  "typ": "gesamtfrist",
  "bezeichnung": "Gesamtfrist Baugenehmigung",
  "werktage": 60,
  "start_datum": "2026-03-01T00:00:00.000Z"
}
```

| Feld | Typ | Pflicht | Beschreibung |
|---|---|---|---|
| `typ` | string | Ja | Fristtyp (z.B. gesamtfrist, beteiligungsfrist, nachforderungsfrist) |
| `bezeichnung` | string | Ja | Bezeichnung fuer die Anzeige |
| `werktage` | int > 0 | Ja | Fristdauer in Werktagen |
| `start_datum` | ISO 8601 datetime | Ja | Startdatum der Frist |

**Response 201:**
```json
{
  "frist": { ... }
}
```

**Verhalten:**
- Enddatum wird aus `start_datum` + `werktage` berechnet (Wochenenden und Feiertage des Bundeslandes werden uebersprungen)
- Ampelstatus wird sofort berechnet
- Audit-Log-Eintrag `frist.created` wird geschrieben

---

### PATCH /api/vorgaenge/{id}/fristen/{fristId}/verlaengerung

Bestehende Frist verlaengern. Begruendung ist Pflichtfeld.

**Auth:** Session (Cookie)

**Path-Parameter:**
| Parameter | Typ | Beschreibung |
|---|---|---|
| `id` | UUID | Vorgang-ID |
| `fristId` | UUID | Frist-ID |

**Request-Body:**
```json
{
  "zusaetzliche_werktage": 10,
  "begruendung": "Nachforderung wegen fehlender Unterlagen"
}
```

| Feld | Typ | Pflicht | Beschreibung |
|---|---|---|---|
| `zusaetzliche_werktage` | int > 0 | Ja | Anzahl zusaetzlicher Werktage |
| `begruendung` | string | Ja | Begruendung fuer die Verlaengerung |

**Response 200:**
```json
{
  "frist": { ... }
}
```

**Verhalten:**
- Neues Enddatum = altes Enddatum + zusaetzliche Werktage (Feiertage beruecksichtigt)
- `original_end_datum` wird gespeichert (nur beim ersten Mal)
- Ampelstatus wird neu berechnet
- Audit-Log-Eintrag `frist.verlaengert` mit altem und neuem Enddatum

**Fehler:**
| Status | Bedeutung |
|---|---|
| 404 | Frist nicht gefunden |

---

### POST /api/vorgaenge/{id}/fristen/{fristId}/hemmung

Frist hemmen (pausieren). Waehrend der Hemmung zaehlt die Frist nicht weiter.

**Auth:** Session (Cookie)

**Request-Body:**
```json
{
  "grund": "Nachforderung wegen Unvollstaendigkeit der Unterlagen",
  "ende": "2026-05-01T00:00:00.000Z"
}
```

| Feld | Typ | Pflicht | Beschreibung |
|---|---|---|---|
| `grund` | string | Ja | Begruendung fuer die Hemmung |
| `ende` | ISO 8601 datetime | Nein | Optionales geplantes Enddatum der Hemmung |

**Response 200:**
```json
{
  "frist": { ... }
}
```

**Verhalten:**
- Status wird auf `gehemmt` gesetzt
- `hemmung_start` wird auf den aktuellen Zeitpunkt gesetzt
- Audit-Log-Eintrag `frist.gehemmt`

**Fehler:**
| Status | Bedeutung |
|---|---|
| 404 | Frist nicht gefunden |
| 409 | Frist ist bereits gehemmt |

---

### DELETE /api/vorgaenge/{id}/fristen/{fristId}/hemmung

Hemmung aufheben. Die Frist wird um die Hemmungstage verlaengert.

**Auth:** Session (Cookie)

**Kein Request-Body erforderlich.**

**Response 200:**
```json
{
  "frist": { ... }
}
```

**Verhalten:**
- Hemmungstage = Werktage zwischen `hemmung_start` und jetzt
- Enddatum wird um die Hemmungstage verlaengert
- `hemmung_tage` wird kumuliert (bei mehrfacher Hemmung)
- Status wird neu berechnet (gruen/gelb/rot/dunkelrot)
- Audit-Log-Eintrag `frist.hemmung_aufgehoben` mit Hemmungstagen

**Fehler:**
| Status | Bedeutung |
|---|---|
| 404 | Frist nicht gefunden |
| 409 | Frist ist nicht gehemmt |

---

### GET /api/fristen/gefaehrdet

Fristgefaehrdete Vorgaenge fuer das Dashboard (Referatsleiter).

**Auth:** Session (Cookie)

**Query-Parameter:**
| Parameter | Typ | Default | Beschreibung |
|---|---|---|---|
| `seite` | int > 0 | 1 | Seitennummer |
| `pro_seite` | int 1-100 | 25 | Eintraege pro Seite |

**Response 200:**
```json
{
  "fristen": [
    {
      "frist": { ... },
      "vorgang_aktenzeichen": "2026/BG-0001",
      "vorgang_bezeichnung": "Neubau EFH",
      "zustaendiger_user_id": "uuid"
    }
  ],
  "total": 42,
  "seite": 1,
  "pro_seite": 25
}
```

**Filter:** Nur Fristen mit Status `gelb`, `rot` oder `dunkelrot`. Sortiert nach Enddatum (dringendste zuerst).

---

### POST /api/internal/fristen/ampel-update

Interner Endpunkt fuer den Cron-Job (ADR-008). Aktualisiert den Ampelstatus aller aktiven Fristen.

**Auth:** Bearer Token (`CRON_SECRET` Umgebungsvariable)

```
Authorization: Bearer <CRON_SECRET>
```

**Kein Request-Body erforderlich.**

**Response 200:**
```json
{
  "aktualisiert": 5
}
```

**Fehler:**
| Status | Bedeutung |
|---|---|
| 401 | CRON_SECRET fehlt oder ungueltig |
| 500 | CRON_SECRET nicht konfiguriert |

**Cron-Konfiguration (pg_cron):**
```sql
SELECT cron.schedule(
  'frist-ampel-update',
  '0 6 * * *',
  $$
    SELECT net.http_post(
      url := 'https://<app-url>/api/internal/fristen/ampel-update',
      headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET>'),
      body := '{}'::jsonb
    );
  $$
);
```

## Ampellogik

| Status | Bedingung | Icon | Farbe |
|---|---|---|---|
| `gruen` | > 50% der Frist uebrig | CheckCircle | Gruen |
| `gelb` | 25-50% uebrig | AlertTriangle | Gelb |
| `rot` | < 25% uebrig ODER < 5 Werktage | AlertCircle | Rot |
| `dunkelrot` | Frist ueberschritten (0 WT) | XCircle | Dunkelrot |
| `gehemmt` | Frist ist pausiert | PauseCircle | Grau |

Darstellung ist WCAG 2.2 AA-konform: Farbe + Icon + Text (nie nur Farbe).

## Datenmodell

### vorgang_fristen (mandantenfaehig)

| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | UUID | Primaerschluessel |
| `tenant_id` | UUID | Mandant (RLS) |
| `vorgang_id` | UUID | Zugehoeriger Vorgang |
| `typ` | text | Fristtyp (gesamtfrist, beteiligungsfrist, ...) |
| `bezeichnung` | text | Anzeigename |
| `start_datum` | timestamptz | Fristbeginn |
| `end_datum` | timestamptz | Fristende (berechnet) |
| `werktage` | int | Fristdauer in Werktagen |
| `status` | text | Ampelstatus |
| `gehemmt` | boolean | Hemmungsstatus |
| `hemmung_grund` | text | Begruendung der Hemmung |
| `hemmung_start` | timestamptz | Beginn der Hemmung |
| `hemmung_ende` | timestamptz | Ende der Hemmung |
| `hemmung_tage` | int | Kumulierte Hemmungstage |
| `verlaengert` | boolean | Ob verlaengert wurde |
| `verlaengerung_grund` | text | Begruendung der Verlaengerung |
| `original_end_datum` | timestamptz | Urspruengliches Enddatum vor Verlaengerung |

### config_fristen (Service-Only)

Gesetzliche Fristen je Bundesland und Verfahrensart. Zugriff nur ueber Service-Role.

### config_feiertage (Service-Only)

Feiertage je Bundesland (+ bundesweite). Fuer Werktage-Berechnung.

## Umgebungsvariablen

| Variable | Beschreibung | Pflicht |
|---|---|---|
| `CRON_SECRET` | Shared Secret fuer internen Ampel-Update-Endpunkt | Ja (fuer Cron-Job) |

Generieren: `openssl rand -base64 32`

## Referenzen

- Feature-Spec: `features/PROJ-4-fristmanagement.md`
- ADR-003: Service-Architektur (FristService)
- ADR-006: Rechtskonfiguration als Daten (config_fristen)
- ADR-008: Background Jobs (Cron Ampel-Update)
- Migration: `supabase/migrations/20260326140000_proj4_fristmanagement.sql`
