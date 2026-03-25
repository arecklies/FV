---
description: Generiert XBau-Sample-XMLs, listet bekannte Validierungsprobleme und bereitet Nacharbeit vor. Aufruf mit /xbau-validate
---

Lies zuerst:
- Alle XBau-Generatoren: `git ls-files src/lib/xbau/generate-*.ts`
- XSD-Quelldateien: `Input/xsd+xsd_dev/xsd/xbau-nachrichten.xsd`
- `.claude/rules/backend.md` – Abschnitt „XBau / XML-Generierung"

Agiere als **Senior Backend Developer** gemäß `.claude/agents/senior-backend-developer.md`.

## Aufgabe
Generiere alle XBau-Sample-XMLs und bereite Validierung vor.

## Schritte
1. Führe `npx tsx scripts/generate-sample-xml.ts` aus
2. Prüfe für jeden Generator: Werden alle Code-Elemente mit `<code>` Kind erzeugt?
3. Prüfe Namespace-Qualifizierung: `xbau:`-Prefix auf allen baukasten-Elementen?
4. Prüfe `listURI`/`listVersionID` gegen `Input/xsd+xsd_dev/xsd/xbau-codes.xsd`
5. Liste gefundene Abweichungen auf
6. Warte auf externe Validierungsergebnisse vom Nutzer

## Ausgabe
- Generierte Dateien (Pfade)
- Selbstprüfungs-Ergebnisse
- **Nächster Schritt:** Nutzer validiert extern, meldet Fehler → Fix-Zyklus
