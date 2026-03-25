# ADR-003: Service-Architektur und Kapselung

## Status
Accepted

## Kontext

Die Anwendung umfasst mehrere fachliche Domaenen (Verfahren, Fristen, XBau, Gebuehren, Dokumente, Audit). Ohne klare Kapselungsgrenzen entsteht ein Monolith. Services muessen aus API-Routes, Server Components und Queue-Workern aufrufbar sein.

## Entscheidung

**Fachlogik in eigenstaendige Service-Module unter `src/lib/services/`, API-Routes als duenne Adapter.**

### Service-Schnitt

| Service | Verantwortung | Modul |
|---|---|---|
| VerfahrenService | Anlage, Status, Workflow | `src/lib/services/verfahren/` |
| FristService | Berechnung, Eskalation, Erinnerungen | `src/lib/services/fristen/` |
| XBauService | XML-Generierung, Parsing, Codelisten | `src/lib/xbau/` |
| AuditService | Append-Only-Logging | `src/lib/services/audit/` |
| DokumentenService | Upload, Versionierung, Suche | `src/lib/services/dokumente/` |
| GebuehrenService | Berechnung nach Landesrecht | `src/lib/services/gebuehren/` |
| BeteiligungService | ToEB-Beteiligung, Stellungnahmen | `src/lib/services/beteiligung/` |

### Architektur-Schichten

```
API-Route (src/app/api/...)
  +-- Auth-Check (requireAuth/requireAdmin)
  +-- Zod-Validierung (Request)
  +-- Service-Aufruf (src/lib/services/...)
  +-- HTTP-Response mit Security Headers

Service (src/lib/services/...)
  +-- Fachlogik (reine Funktionen, kein HTTP-Kontext)
  +-- Supabase-Client (injiziert, nicht global)
  +-- Typisierte Ein-/Ausgaben (Zod-Schemas)
```

### Regeln
- Services erhalten Supabase-Client als Parameter (Dependency Injection)
- Services kennen kein HTTP (kein Request/Response)
- API-Routes maximal 30 Zeilen: Auth, Validierung, Service-Aufruf, Response
- Jeder Service hat `index.ts` (public API) und `types.ts`

## Begruendung

1. Wiederverwendbarkeit: `FristService.berechne()` aus API-Route, Server Component und Cron-Job
2. Testbarkeit: Reine Funktionen mit injizierbaren Abhaengigkeiten
3. Kein Microservice-Overhead: Kapselung innerhalb Next.js
4. Schrittweise Extraktion: Service-Schnittstelle steht, falls spaeter Queue-Worker noetig

## Konsequenzen

- (+) Klare Verantwortungsgrenzen, parallele Entwicklung
- (+) Test-Coverage pro Service messbar
- (-) Zusaetzliche Abstraktionsschicht
- (-) Cross-Service-Transaktionen muessen koordiniert werden
