# PROJ-41: Loeschkonzept und Aufbewahrungsfristen (DSGVO)

**Status:** Planned | **Phase:** 2 (Compliance und Integration) | **Erstellt:** 2026-03-27
**Herkunft:** Kunden-Session 27.03.2026, F-08 (Herr Dr. Wiesner, Leipzig, P4)
**Prioritaet:** Mittel (Vertragsvoraussetzung Leipzig)

---

## 1. Ziel / Problem

Leipzigs Datenschutzbeauftragter wird vor Vertragsschluss ein Loeschkonzept verlangen. Bauakten muessen nach landesrechtlichen Aufbewahrungsfristen (typisch 10 Jahre nach Abschluss) geloescht oder archiviert werden koennen. Ohne Loeschkonzept kein Vertrag mit Leipzig.

## 2. Fachlicher Kontext & Stakeholder

- **P4 (Amtsleiter, Leipzig):** "Unser Datenschutzbeauftragter wird das vor Vertragsschluss pruefen"
- **DSGVO Art. 17:** Recht auf Loeschung
- **DSGVO Art. 5(1)(e):** Speicherbegrenzung
- **Landesarchivgesetze:** Anbietungspflicht an Landesarchiv vor Loeschung
- **PROJ-10** (Audit-Trail): Audit-Daten haben eigene Aufbewahrungspflicht

## 3. Funktionale Anforderungen

- FA-1: Konfigurierbare Aufbewahrungsfristen je Vorgangstyp (in Jahren)
- FA-2: Automatische Kennzeichnung von Vorgaengen deren Aufbewahrungsfrist abgelaufen ist
- FA-3: Loeschvorgang als Admin-Aktion (nicht automatisch — Human-in-the-Loop)
- FA-4: Loeschprotokoll (was wurde wann von wem geloescht)
- FA-5: Vollstaendige Loeschung aller personenbezogenen Daten (Antragsteller, Beteiligte)
- FA-6: Archivierungs-Export vor Loeschung (maschinenlesbar, PROJ-8 Format)

## 4. User Stories & Akzeptanzkriterien

### US-1: Abgelaufene Aufbewahrungsfristen anzeigen
Als Admin moechte ich sehen, welche Vorgaenge zur Loeschung anstehen, damit ich die Anbietungspflicht erfuellen und dann loeschen kann.
- AC-1: Admin-Ansicht listet alle Vorgaenge mit abgelaufener Aufbewahrungsfrist
- AC-2: Sortierung nach Ablaufdatum
- AC-3: Export der Liste fuer Landesarchiv-Anbietung

### US-2: Vorgang datenschutzkonform loeschen
Als Admin moechte ich einen Vorgang vollstaendig loeschen, nachdem die Aufbewahrungsfrist abgelaufen ist.
- AC-1: Loeschung entfernt alle personenbezogenen Daten (Soft-Delete reicht NICHT fuer DSGVO)
- AC-2: Statistische Daten (anonymisiert) bleiben fuer Reporting erhalten
- AC-3: Loeschprotokoll wird erstellt (ohne personenbezogene Daten)
- AC-4: Vier-Augen-Prinzip fuer Loeschung (zweiter Admin bestaetigt)

## 5. Nicht-funktionale Anforderungen

- NFR-1: Loeschung muss vollstaendig sein (inkl. Dokumente, Audit-Trail-PII, Backups)
- NFR-2: Performance: Massenloeschung > 100 Vorgaenge muss moeglich sein
- NFR-3: Compliance-Nachweis: Loeschprotokoll als PDF exportierbar

## 6. Spezialisten-Trigger

- **Senior Security Engineer:** DSGVO-Konformitaet, PII-Identifikation, Backup-Loeschung
- **Database Architect:** Hard-Delete-Strategie, Anonymisierung, Referenzielle Integritaet
- **Senior Software Architect:** Archivierungs-Architektur, Backup-Retention
- **Technical Writer:** Loeschkonzept-Dokument fuer Datenschutzbeauftragte

## 7. Offene Fragen

- Q-1: Welche Aufbewahrungsfristen gelten in den verschiedenen Bundeslaendern?
- Q-2: Muessen Dokumente (PDFs, Plaene) separat geloescht werden (Object Storage)?
- Q-3: Wie werden Backups behandelt? (Supabase Point-in-Time Recovery enthaelt geloeschte Daten)
- Q-4: Anbietungspflicht an Landesarchiv — wie wird der Workflow abgebildet?

## 8. Annahmen

- A-1: Hard-Delete ist noetig fuer DSGVO-Konformitaet (Soft-Delete allein genuegt nicht)
- A-2: Aufbewahrungsfrist beginnt mit Abschluss des Vorgangs (nicht mit Anlage)
- A-3: Loeschkonzept-Dokument wird fuer Vertragsgespräche benoetigt, bevor Code existiert

## 9. Abhaengigkeiten

- **PROJ-8** (Datenexport): Archivierungsformat fuer Pre-Loeschung-Export
- **PROJ-10** (Audit-Trail): Audit-Daten haben eigene Aufbewahrungsregeln
- **PROJ-5** (Dokumentenverwaltung): Dokumente muessen mitgeloescht werden
- **PROJ-2** (Mandanten-Schema): Loeschung muss mandantenkonform sein

## 10. Fachliche Risiken

| Risiko | Auswirkung | Gegenmassnahme |
|---|---|---|
| Unvollstaendige Loeschung (PII in Logs, Backups) | DSGVO-Verstoss | PII-Audit durch Security Engineer |
| Versehentliche Loeschung aktiver Vorgaenge | Datenverlust | Vier-Augen + Aufbewahrungsfrist-Pruefung |
| Landesrechtlich unterschiedliche Fristen | Komplexitaet | Konfigurierbare Fristen je BL |

## 11. Scope / Nicht-Scope

**Scope:**
- Konfigurierbare Aufbewahrungsfristen
- Admin-Ansicht fuer loeschfaehige Vorgaenge
- Hard-Delete mit Loeschprotokoll
- Archivierungs-Export vor Loeschung
- Loeschkonzept-Dokument fuer DSB

**Nicht-Scope:**
- Automatische Loeschung (immer manuell mit Vier-Augen)
- Backup-Bereinigung (Supabase PITR — organisatorisch loesen)
- Landesarchiv-Schnittstelle (manueller Export genuegt im MVP)
- Anonymisierung als Alternative zur Loeschung (Phase 3)
