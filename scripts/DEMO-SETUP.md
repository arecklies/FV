# Demo-Umgebung einrichten (vollstaendig lokal)

Kein Internet noetig. Alles laeuft lokal via Docker.
Dauer: ca. 15-20 Minuten. Ergebnis: Demo unter http://localhost:3000

## Voraussetzungen

- Docker Desktop laeuft
- Node.js installiert
- Supabase CLI installiert (`npx supabase --version` → 2.x)

## 1. Supabase lokal starten (5 Min)

```bash
npx supabase start
```

Beim ersten Mal werden Docker-Images geladen (~2-3 Min).
Am Ende zeigt die CLI die lokalen URLs und Keys:

```
API URL:      http://127.0.0.1:54321
GraphQL URL:  http://127.0.0.1:54321/graphql/v1
S3 Storage:   http://127.0.0.1:54321/storage/v1/s3
DB URL:       postgresql://postgres:postgres@127.0.0.1:54322/postgres
Studio URL:   http://127.0.0.1:54323
Inbucket URL: http://127.0.0.1:54324
anon key:     eyJ...  ← kopieren
service_role: eyJ...  ← kopieren
```

## 2. .env.local konfigurieren (1 Min)

```bash
cp .env.local.example .env.local
```

Werte aus der `supabase start`-Ausgabe eintragen:

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key von oben>
SUPABASE_SERVICE_ROLE_KEY=<service_role key von oben>
CRON_SECRET=demo-cron-secret-2026
```

## 3. Datenbank + Demo-Daten laden (2 Min)

```bash
npx supabase db reset
```

Das fuehrt automatisch aus:
1. Alle 3 Migrationen (Schema, Vorgangsverwaltung, Fristmanagement)
2. `supabase/seed.sql` (Demo-Daten: Benutzer, Vorgaenge, Fristen)

## 4. App starten (1 Min)

```bash
npm install   # falls noch nicht geschehen
npm run dev
```

Oeffnen: **http://localhost:3000**

## 5. Demo-Zugaenge

| Rolle | E-Mail | Passwort |
|---|---|---|
| Sachbearbeiter | `demo-sb@bauaufsicht.example` | `Demo2026!sb` |
| Referatsleiter | `demo-rl@bauaufsicht.example` | `Demo2026!rl` |

## 6. Demo-Drehbuch

### Login (1 Min)
- http://localhost:3000/login
- Als Sachbearbeiter einloggen

### Vorgangsliste mit Frist-Ampel (3 Min)
- 8 Vorgaenge in verschiedenen Stadien
- **Frist-Ampel** in jeder Zeile (gruen/gelb/rot/dunkelrot/gehemmt)
- "Frist"-Spalte klicken → Sortierung nach Dringlichkeit
- BG-0005 (dunkelrot) erscheint oben

### Vorgang-Detail: BG-0004 (rot, kritisch) (3 Min)
- Klick auf BG-0004 → Detail-Ansicht
- Kopfbereich: Workflow-Badge "Fachliche Prüfung" + rote Ampel
- **Fristen-Tab** oeffnen → Gesamtfrist mit roter Ampel

### Frist verlaengern (2 Min)
- "Verlängern" klicken
- 10 Werktage eingeben
- Begründung: "Nachforderung Statik gemäß § 69 BauO NRW"
- → Ampel springt auf gelb/gruen

### Frist hemmen (2 Min)
- BG-0001 oeffnen → Fristen-Tab
- "Hemmen" klicken
- Grund: "Unvollständige Unterlagen, Nachforderung am 20.03.2026"
- → Ampel zeigt "Gehemmt" (Pause-Symbol)
- "Hemmung aufheben" → Frist wird automatisch verlaengert

### Workflow-Aktion mit Auto-Frist (3 Min)
- BG-0002 oeffnen → Workflow-Tab
- Schritt: "Vollständigkeitsprüfung"
- "Vollständig" klicken → Schritt wechselt zu "Beteiligung"
- **Fristen-Tab**: Neue Beteiligungsfrist automatisch angelegt!
- "Das merkt sich das System für Sie — 20 Werktage gemäß § 72 BauO NRW"

### Vier-Augen-Freigabe (2 Min)
- Ausloggen → als Referatsleiter einloggen
- BG-0006 oeffnen → Workflow-Tab
- "Freizeichnen" oder "Zur Überarbeitung" — nur Referatsleiter sieht das

### Gehemmte Frist zeigen (1 Min)
- BG-0006 → Fristen-Tab
- Gehemmte Frist mit Grund "Standsicherheitsnachweis fehlt"

## 7. Lokalen Stack beenden

```bash
npx supabase stop
```

## 8. Zuruecksetzen (bei Problemen)

```bash
npx supabase db reset    # Datenbank komplett neu + Seed
```

## Troubleshooting

| Problem | Loesung |
|---|---|
| `supabase start` haengt | Docker Desktop pruefen, ggf. neu starten |
| Login schlaegt fehl | `npx supabase db reset` — Seed neu laden |
| Keine Vorgaenge | Seed pruefen: `npx supabase db reset` |
| Port belegt (54321) | Anderen Port in `supabase/config.toml` setzen |
| Studio oeffnen | http://127.0.0.1:54323 (lokales Supabase Dashboard) |
