# ADR-005: Audit-Trail und Revisionssicherheit

## Status
Accepted (Review 2026-03-26: Stufenmodell bestaetigt durch STRIDE T-3, Security-Kick-off. Stufe 2 vor Pilotbetrieb Pflicht.)

## Kontext

Gefordert: Revisionssicherer Audit-Trail (TR-ESOR oder vergleichbar), unveraenderliches Protokoll aller Zugriffe. Problem: Service-Role-Key kann UPDATE/DELETE auf Audit-Tabelle ausfuehren.

## Entscheidung

**Stufenmodell:**

### Stufe 1: Append-Only Audit-Log in PostgreSQL (MVP)
- Tabelle `audit_log`: id, tenant_id, user_id, action, resource_type, resource_id, payload (jsonb), ip_address, created_at
- RLS: Nur INSERT erlaubt, kein UPDATE/DELETE fuer Client-Rollen
- Logging ueber `writeAuditLog()` -- keine direkten Inserts
- Dokumentiertes Restrisiko: Service-Role kann manipulieren

### Stufe 2: Integritaetssicherung (nach MVP)
- Verkettete SHA-256-Hashes (vorheriger_hash + payload + timestamp)
- Periodischer Export in S3 Object Lock (WORM) auf S3-kompatiblem Speicher
- Object Lock Compliance Mode verhindert Loeschung

### Stufe 3: TR-ESOR-Konformitaet (Langfristziel)
- Qualifizierte Zeitstempel (TSA) fuer Audit-Batches
- Beweiswerterhaltung nach TR-ESOR 1.2
- Entscheidung nach Pilotauswertung

## Begruendung

1. Soft-Delete reicht nicht: `deleted_at` kann per Service-Role ueberschrieben werden
2. PostgreSQL als Startpunkt: Kein zusaetzliches System im MVP
3. Stufenmodell vermeidet Overengineering: PostgreSQL -> S3 WORM -> TR-ESOR
4. Verkettete Hashes: Nachtraegliche Integritaetspruefung auch bei DB-Kompromittierung

## Konsequenzen

- (+) Sofortige Audit-Faehigkeit im MVP
- (+) Klarer Migrationspfad zu TR-ESOR
- (-) Service-Role kann in Stufe 1 noch manipulieren
- (-) S3 Object Lock erfordert zusaetzlichen Dienst

## Referenzen
- Anforderung Audit-Trail: `Input/AnFo/bauaufsicht_anforderungen.md`, Abschnitt 3.3
- Backend Rules: `writeAuditLog()` als einzige Schnittstelle
