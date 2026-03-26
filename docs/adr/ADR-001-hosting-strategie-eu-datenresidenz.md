# ADR-001: Hosting-Strategie und EU-Datenresidenz

## Status
Accepted (Review 2026-03-26: Konsistent mit PRD, STRIDE-Modell, Kick-off-Protokoll. Phasenmodell bestaetigt.)

## Kontext

Die Anwendung verarbeitet personenbezogene Daten (Bauherren, Eigentuemer, Behoerdenmitarbeiter). K.O.-Kriterium Nr. 1: Datenhaltung ausschliesslich in der EU. BSI-Grundschutz-Orientierung gefordert.

Der Tech Stack setzt auf Vercel (Next.js) und Supabase Cloud (PostgreSQL, Auth). Beide sind US-Unternehmen mit EU-Regionen (Frankfurt). Supabase Cloud hat keine BSI-C5-Attestierung. Beide unterliegen dem US CLOUD Act.

## Entscheidung

**Phasenmodell:**

### Phase 1: MVP und Pilotbetrieb
- Vercel mit EU-Region (Frankfurt)
- Supabase Cloud mit EU-Region (Frankfurt)
- DSGVO-Konformitaet ueber DPA/AVV beider Anbieter
- Akzeptables Risikoprofil fuer Entwicklung und Pilotbetrieb

### Phase 2: Produktivbetrieb (Evaluierung ab Pilotabschluss)
- Self-Hosted-Variante evaluieren: Supabase Self-Hosted auf deutschem Hoster (Hetzner, IONOS, Open Telekom Cloud)
- Vercel-Alternative: Self-Hosted Next.js oder Vercel Enterprise
- Ziel: Vollstaendige Datenresidenz ohne CLOUD-Act-Exposition

### Migrations-Pfad
- Supabase Cloud -> Self-Hosted: PostgreSQL-Dump/Restore
- Vercel -> Self-Hosted: Docker-basiertes Next.js Deployment
- Kein Vendor-Lock-in: Keine proprietaeren Vercel-Features in Kernlogik

## Begruendung

1. Schnelle Iteration im MVP ohne Infrastruktur-Aufwand
2. EU-Regionen verfuegbar (Daten physisch in EU)
3. Kommunale Beschaffung dauert 6-12 Monate -- Phase 2 kann vorbereitet werden
4. Self-Hosted-Betrieb erfordert DevOps-Kapazitaet, die im MVP nicht verfuegbar ist

## Konsequenzen

- (+) Sofortiger Entwicklungsstart, automatisches Scaling
- (-) CLOUD-Act-Exposition in Phase 1
- (-) Supabase Cloud ohne C5-Attestierung -- Argumentation gegenueber Behoerden eingeschraenkt
- (o) Kein Vercel-Lock-in bei Standard-Next.js-Features

## Risiken

| Risiko | Wahrscheinlichkeit | Auswirkung | Gegenmassnahme |
|---|---|---|---|
| CLOUD Act Datenzugriff | Niedrig | Hoch | Phase 2 priorisieren, Verschluesselung at rest |
| Vergabe lehnt Cloud ohne C5 ab | Mittel | Hoch | Phase 2 als verbindliche Roadmap kommunizieren |
| Self-Hosted uebersteigt DevOps-Kapazitaet | Mittel | Mittel | Managed K8s oder Supabase Enterprise evaluieren |
| Metadaten-Transfer ueber US-Infrastruktur | Mittel | Niedrig | CDN/DNS auf EU-Anbieter umstellen (Phase 2) |

## Referenzen
- K.O.-Kriterium Nr. 1: `Input/AnFo/bauaufsicht_anforderungen.md`, Abschnitt 8
- BSI-Grundschutz: Anforderungen Abschnitt 3.3
