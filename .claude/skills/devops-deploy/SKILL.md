---
name: devops-deploy
description: Plant und führt Deployments durch. Erzwingt DB→Backend→Frontend-Reihenfolge, prüft .env.local.example, Rollback-Fähigkeit und Security Headers. Aufruf mit /devops-deploy [PROJ-X]
---

Lies zuerst:
- DB-Migrations-Ausführungsplan (Ausgabe von `/db-migration`)
- Aktuelle Umgebungskonfiguration: `.env.local.example`
- `.claude/rules/security.md` – Secrets und Security Headers
- `.claude/rules/general.md` – Qualitätsgates und Deployment-Reihenfolge

Agiere als **DevOps/Platform Engineer** gemäß `.claude/agents/devops-platform-engineer.md`.

## Aufgabe
Plane und führe ein Deployment durch.

## Schritte
1. Prüfe Deployment-Reihenfolge (zwingend):
   **DB-Migration → Backend-Deployment → Frontend-Deployment**
2. Prüfe Netzwerk-Voraussetzungen:
   - Supabase API erreichbar? (Behörden-Proxy kann TCP 443 blockieren)
   - Workaround: `SUPABASE_DB_PASSWORD` als Umgebungsvariable setzen, falls CLI-Login fehlschlägt
   - PowerShell: `$env:SUPABASE_DB_PASSWORD='<passwort>'` (einfache Anführungszeichen bei Sonderzeichen)
   - Bash/cmd: `set SUPABASE_DB_PASSWORD=<passwort>` oder `export SUPABASE_DB_PASSWORD='<passwort>'`
   - Vercel erreichbar? DNS/Proxy-Einschränkungen dokumentieren
3. Identifiziere neue Umgebungsvariablen:
   - In `.env.local.example` dokumentiert? → Nutzer informieren
4. Prüfe Rollback-Fähigkeit für jeden Schritt
5. Stelle Logging und Monitoring für neue Komponenten sicher
6. **Security-Header-Verifikation (Pflicht):**
   - `grep -n "X-XSS-Protection\|Content-Security-Policy\|X-Frame-Options\|Strict-Transport-Security" src/lib/api/security-headers.ts next.config.ts`
   - Abgleich gegen `.claude/rules/security.md` Abschnitt "Security Headers"
   - Fehlende oder abweichende Header = Blocker fuer Deployment
7. Hole Nutzer-Freigabe bei destruktiven Schritten ein (Human-in-the-Loop)

## Deployment-Checkliste
```markdown
- [ ] DB-Migration erfolgreich ausgeführt
- [ ] .env.local.example vollständig und aktuell
- [ ] Security Headers konfiguriert
- [ ] RLS-Tests grün (Pipeline-Bestätigung)
- [ ] Rollback-Plan dokumentiert
- [ ] Backend deployed und healthy
- [ ] Frontend deployed und healthy
- [ ] Monitoring aktiv
```

## Ausgabe
- Deployment-Plan (Schritte, Reihenfolge)
- Konfigurationsbedarf (neue Umgebungsvariablen)
- Rollback-Plan
- Operative Risiken
- **Nächster Schritt:** `/docs-write` für Release-Dokumentation oder `/devops-ops` für Betriebsüberwachung
