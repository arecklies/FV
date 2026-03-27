# API-Referenz: Geltungsdauer und Verlängerung (PROJ-48)

**Version:** 1.0 | **Status:** Deployed | **Datum:** 2026-03-27

## Übersicht

Baugenehmigungen haben eine gesetzliche Geltungsdauer (NRW: § 75 Abs. 1 BauO NRW, BW: § 62 LBO BW). Das Feld `geltungsdauer_bis` auf dem Vorgang wird automatisch bei Bescheidzustellung gesetzt. Sachbearbeiter können die Geltungsdauer vor Ablauf verlängern.

**Basis-URL:** `/api`
**Authentifizierung:** Cookie-basierte Supabase-Session (alle Endpunkte)

## Automatisches Verhalten

### Geltungsdauer bei Bescheidzustellung

Beim Workflow-Übergang zum Schritt `zustellung` wird `geltungsdauer_bis` automatisch berechnet:
- **Quelle:** `config_fristen` mit `typ = 'geltungsdauer'` (Kalendertage, nicht Werktage)
- **Standard:** 1095 Kalendertage (3 Jahre) für NRW und BW
- **Ausnahme:** Kenntnisgabeverfahren (Kategorie `kenntnisgabe`) — keine Geltungsdauer

Kein separater API-Call nötig — der bestehende `POST /api/vorgaenge/{id}/workflow-aktion` löst das automatisch aus.

## Endpunkte

### POST /api/vorgaenge/{id}/geltungsdauer-verlaengerung

Geltungsdauer einer erteilten Baugenehmigung verlängern.

**Auth:** Session (Cookie)

**Path-Parameter:**
| Parameter | Typ | Beschreibung |
|---|---|---|
| `id` | UUID | Vorgang-ID |

**Request-Body:**
```json
{
  "antragsdatum": "2026-03-27",
  "begruendung": "Bauherr benötigt zusätzliche Planungszeit aufgrund Lieferengpässen",
  "verlaengerung_tage": 365
}
```

| Feld | Typ | Pflicht | Validierung |
|---|---|---|---|
| `antragsdatum` | string (YYYY-MM-DD) | Ja | ISO-Datum |
| `begruendung` | string | Ja | Min. 10 Zeichen |
| `verlaengerung_tage` | integer | Ja | 1–1095 (max. 3 Jahre) |

**Response 201:**
```json
{
  "message": "Geltungsdauer verlängert",
  "id": "uuid-der-verlaengerung",
  "neues_datum": "2030-03-27T00:00:00.000Z"
}
```

**Fehler-Responses:**

| Status | Fehler | Ursache |
|---|---|---|
| 400 | `Verlängerung nur für abgeschlossene Vorgänge möglich` | Vorgang nicht im Status `abgeschlossen` |
| 400 | `Kenntnisgabeverfahren haben keine verlängerbare Geltungsdauer` | Verfahrensart-Kategorie ist `kenntnisgabe` |
| 400 | `Keine Geltungsdauer gesetzt — bitte zuerst manuell nachpflegen` | `geltungsdauer_bis` ist NULL |
| 400 | `Genehmigung ist bereits erloschen — Verlängerung nicht mehr möglich` | `geltungsdauer_bis` liegt in der Vergangenheit |
| 400 | `Ungültige Eingabe` | Zod-Validierungsfehler (mit `fields`-Objekt) |
| 401 | `Nicht authentifiziert` | Keine gültige Session |
| 404 | `Vorgang nicht gefunden` | ID ungültig oder nicht im Tenant |

**Audit-Trail:** `geltungsdauer.verlaengert` mit Payload `{ altes_datum, neues_datum, verlaengerung_tage, antragsdatum }`

---

### GET /api/vorgaenge/{id}/geltungsdauer-verlaengerung

Verlängerungshistorie eines Vorgangs abrufen.

**Auth:** Session (Cookie)

**Path-Parameter:**
| Parameter | Typ | Beschreibung |
|---|---|---|
| `id` | UUID | Vorgang-ID |

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "tenant_id": "uuid",
      "vorgang_id": "uuid",
      "altes_datum": "2029-03-27T00:00:00.000Z",
      "neues_datum": "2030-03-27T00:00:00.000Z",
      "antragsdatum": "2026-03-27",
      "begruendung": "Bauherr benötigt zusätzliche Planungszeit",
      "verlaengerung_tage": 365,
      "sachbearbeiter_id": "uuid",
      "sachbearbeiter_email": "mueller@behoerde.de",
      "created_at": "2026-03-27T10:00:00.000Z"
    }
  ]
}
```

**Sortierung:** Neueste Verlängerung zuerst (`created_at DESC`)
**Limit:** 50 Einträge

---

## Datenmodell

### Neue Spalte: `vorgaenge.geltungsdauer_bis`

| Spalte | Typ | Nullable | Beschreibung |
|---|---|---|---|
| `geltungsdauer_bis` | `timestamptz` | Ja | Ablaufdatum der Baugenehmigung. NULL bei Kenntnisgabe und noch nicht zugestellten Vorgängen. |

### Neue Tabelle: `vorgang_verlaengerungen`

**Zugriff:** Service-Only (deny-all RLS). Kein direkter Client-Zugriff.

| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | uuid | Primärschlüssel |
| `tenant_id` | uuid | FK → tenants |
| `vorgang_id` | uuid | FK → vorgaenge (CASCADE) |
| `altes_datum` | timestamptz | Geltungsdauer VOR Verlängerung |
| `neues_datum` | timestamptz | Geltungsdauer NACH Verlängerung |
| `antragsdatum` | date | Datum des Verlängerungsantrags |
| `begruendung` | text | Begründung (Pflicht) |
| `verlaengerung_tage` | integer | Verlängerung in Kalendertagen |
| `sachbearbeiter_id` | uuid | FK → auth.users |
| `created_at` | timestamptz | Erstellzeitpunkt |

### Erweiterte Tabelle: `config_fristen`

| Neue Spalte | Typ | Beschreibung |
|---|---|---|
| `kalendertage` | integer (nullable) | Fristdauer in Kalendertagen. Mutually exclusive mit `werktage`. |

**CHECK-Constraint:** Genau eines von `werktage` oder `kalendertage` muss gesetzt sein.

## Konfiguration

Geltungsdauer ist je Bundesland und Verfahrensart konfigurierbar:

| Bundesland | Verfahrensart | Kalendertage | Rechtsgrundlage |
|---|---|---|---|
| NRW | Baugenehmigung (regulär) | 1095 | § 75 Abs. 1 BauO NRW |
| NRW | Baugenehmigung (vereinfacht) | 1095 | § 75 Abs. 1 BauO NRW |
| NRW | Freistellungsverfahren | 1095 | § 63 Abs. 4 BauO NRW |
| BW | Baugenehmigung (vereinfacht) | 1095 | § 62 LBO BW |
| BW | Baugenehmigung (regulär) | 1095 | § 62 LBO BW |
| BW | Bauvorbescheid | 1095 | § 62 LBO BW |

**Kein Eintrag für:** BW Kenntnisgabeverfahren (keine Geltungsdauer).
