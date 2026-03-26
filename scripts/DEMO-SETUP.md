# Demo-Umgebung einrichten (Kunden-Vorfuehrung)

Dauer: ca. 30-45 Minuten. Ergebnis: Lokale Demo unter http://localhost:3000

## 1. Supabase-Projekt anlegen (10 Min)

1. https://supabase.com → Neues Projekt erstellen
2. Region: **Frankfurt (eu-central-1)**
3. Passwort notieren (wird fuer DB-Zugang benoetigt)
4. Warten bis Projekt bereit ist (~2 Min)

## 2. .env.local konfigurieren (2 Min)

```bash
cp .env.local.example .env.local
```

Werte aus Supabase Dashboard (Settings → API):
```
NEXT_PUBLIC_SUPABASE_URL=https://<projekt-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
CRON_SECRET=demo-cron-secret-2026
```

## 3. Datenbank-Migrationen ausfuehren (5 Min)

Option A — Supabase CLI:
```bash
npx supabase link --project-ref <projekt-ref>
npx supabase db push
```

Option B — Manuell im SQL Editor:
1. Supabase Dashboard → SQL Editor
2. Migrationen in dieser Reihenfolge ausfuehren:
   - `supabase/migrations/20260326100000_proj2_mandanten_schema_rls.sql`
   - `supabase/migrations/20260326120000_proj3_vorgangsverwaltung.sql`
   - `supabase/migrations/20260326140000_proj4_fristmanagement.sql`

## 4. Demo-Benutzer anlegen (3 Min)

Supabase Dashboard → Authentication → Users → **Add User** (Email):

| E-Mail | Passwort | Rolle |
|---|---|---|
| `demo-sb@bauaufsicht.example` | `Demo2026!sb` | Sachbearbeiter |
| `demo-rl@bauaufsicht.example` | `Demo2026!rl` | Referatsleiter |

**UUIDs notieren!** (werden in der ID-Spalte angezeigt)

## 5. Demo-Daten einspielen (5 Min)

1. `scripts/demo-seed.sql` oeffnen
2. Die zwei Platzhalter-UUIDs ersetzen:
   - `00000000-0000-0000-0000-000000000001` → UUID des Sachbearbeiters
   - `00000000-0000-0000-0000-000000000002` → UUID des Referatsleiters
3. Im Supabase SQL Editor ausfuehren

## 6. App starten (1 Min)

```bash
npm install   # falls noch nicht geschehen
npm run dev
```

Oeffnen: http://localhost:3000

## 7. Demo-Drehbuch

### Login
- URL: http://localhost:3000/login
- Email: `demo-sb@bauaufsicht.example` / Passwort: `Demo2026!sb`

### Vorgangsliste zeigen
- 8 Vorgaenge in verschiedenen Stadien
- **Frist-Ampel** neben jedem Vorgang (gruen/gelb/rot/dunkelrot/gehemmt)
- Sortierung nach "Frist" klicken → dringendste oben

### Vorgang-Detail oeffnen (BG-0004, rot)
- Kopfbereich: Workflow-Badge + Ampel-Badge
- **Fristen-Tab**: Gesamtfrist mit roter Ampel, Enddatum sichtbar

### Frist verlaengern (BG-0004)
- "Verlängern" klicken
- 10 Werktage, Begründung: "Nachforderung Statik"
- Ampel springt auf gelb/gruen

### Frist hemmen (BG-0001)
- Vorgang BG-0001 oeffnen → Fristen-Tab
- "Hemmen" klicken
- Grund: "Unvollständige Unterlagen"
- Ampel zeigt "Gehemmt"

### Hemmung aufheben
- "Hemmung aufheben" klicken
- Frist wird automatisch verlaengert

### Workflow-Aktion (BG-0002)
- Vorgang BG-0002 → Workflow-Tab
- "Vollständig" klicken → Schritt wechselt zu "Beteiligung"
- Fristen-Tab: Neue Beteiligungsfrist automatisch angelegt (PROJ-19!)

### Als Referatsleiter einloggen
- Logout → Login als demo-rl@bauaufsicht.example
- Vorgang BG-0006 → Freizeichnung: Nur Referatsleiter kann freigeben

## Troubleshooting

| Problem | Loesung |
|---|---|
| Login schlaegt fehl | Email-Confirmation in Supabase deaktivieren: Auth → Settings → "Confirm email" aus |
| Keine Vorgaenge sichtbar | Seed-Script pruefen: UUIDs der Benutzer korrekt? |
| Fristen fehlen | Migration 20260326140000 ausgefuehrt? |
| 500-Fehler bei API | .env.local pruefen: SUPABASE_SERVICE_ROLE_KEY korrekt? |
