# ADR-016: Transport-Abstraktion fuer Eingangskanal-Routing

## Status
Accepted

## Datum
2026-03-29

## Autor
Senior Software Architect

## Kontext

Das Fachverfahren muss XBau-Nachrichten ueber verschiedene Transportwege senden und empfangen. Aktuell sind drei Transportprotokolle identifiziert:

| Transportweg | Protokoll | Technologie | Phase | Feature |
|---|---|---|---|---|
| **XTA** (OSCI-Transport) | OSCI 1.2 / 2.0, SOAP, WS-Security | Java-Sidecar (Governikus-Lib) | Phase 2 | PROJ-11 |
| **FIT-Connect** | REST, OAuth2, JWE | Node.js Docker-Container | Phase 3 | PROJ-18 |
| **service-bw** | Proprietaere REST-API | Node.js (Adapter) | Phase 2 (nach Evaluation) | PROJ-45 |
| **Manuell** | XML-Upload/-Download im Browser | Next.js (bestehend, PROJ-7) | Phase 1 (aktiv) | PROJ-7 |

Jeder Transportweg laeuft in einem eigenen isolierten Service (ADR-015, ADR-003). Die Kommunikation mit dem Fachverfahren erfolgt ausschliesslich ueber die `background_jobs`-Tabelle (ADR-008).

### Problemstellung

Ohne Abstraktion muesste das Fachverfahren fuer jeden Transportweg eigene Routing-Logik, Fehlerbehandlung und Status-Tracking implementieren. Bei Hinzufuegen eines neuen Transportwegs (z.B. EGVP, kuenftiger OZG-Standard) waere eine Aenderung der Kernlogik noetig. Ausserdem ist der Transportweg pro Mandant konfigurierbar -- ein Mandant in NRW nutzt XTA, ein Mandant in BW nutzt service-bw, ein spaeterer Mandant nutzt FIT-Connect.

## Entscheidung

### 1. TransportService im Fachverfahren (Strategy Pattern)

Das Fachverfahren kennt nur zwei Operationen:
- **Sende Nachricht** (`dispatch`): Nimmt eine `xbau_nachrichten`-ID entgegen und routet sie an den konfigurierten Transportweg.
- **Empfange Nachricht** (`receive`): Wird vom Transport-Service via Webhook aufgerufen, wenn eine Nachricht eingeht.

```typescript
// src/lib/services/transport/transport-service.ts
interface TransportService {
  dispatch(nachrichtId: string, tenantId: string): Promise<{ jobId: string }>;
}

// Routing-Logik:
// 1. tenant_transport_config laden (Mandanten-Konfiguration)
// 2. Job in background_jobs schreiben mit type = transportweg-spezifisch
// 3. Isolierter Service pickt Job auf und versendet
```

Das Fachverfahren implementiert KEINE Transportlogik. Es schreibt lediglich einen Job mit dem korrekten Typ in die `background_jobs`-Tabelle. Der isolierte Service (XTA, FIT-Connect, service-bw) liest und verarbeitet den Job.

### 2. EingangskanalAdapter Interface (fuer isolierte Services)

Jeder isolierte Transport-Service implementiert ein einheitliches Adapter-Interface. Da die Services in verschiedenen Sprachen laufen (Java, Node.js), ist der formale Vertrag die `background_jobs`-Tabelle: Job-Typen und das JSON-Schema fuer `input`/`output` sind die verbindliche Schnittstelle. Das TypeScript-Interface dient der Dokumentation:

```typescript
// Konzeptionelles Interface (Vertrag wird ueber background_jobs JSON-Schema formalisiert)
interface EingangskanalAdapter {
  // Polling auf externe Quelle (XTA-Postfach, FIT-Connect Retrieval API, service-bw REST)
  poll(): Promise<EingehendeNachricht[]>;

  // Bestaetigung an externe Quelle (XTA-Empfangsbestaetigung, FIT-Connect ACK)
  acknowledge(externId: string): Promise<void>;

  // Versand einer Nachricht an externe Quelle
  send(nachricht: AusgehendeNachricht): Promise<SendeErgebnis>;
}
```

Jeder Service setzt dieses Interface mit den Spezifika seines Protokolls um:
- **xta-service/** (Java-Sidecar): OSCI-Transport, WS-Security, Governikus-Lib
- **fit-connect-service/** (Node.js Docker): REST, OAuth2, JWE-Verschluesselung
- **service-bw-adapter/** (Node.js Docker, nach PROJ-45 Evaluation): Proprietaere REST-API

### 3. Mandanten-Konfiguration: `tenant_transport_config`

Neue Tabelle fuer die Zuordnung Mandant zu Transportweg:

```sql
CREATE TABLE tenant_transport_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  transportweg text NOT NULL CHECK (transportweg IN ('manuell', 'xta', 'fit_connect', 'service_bw')),
  config jsonb NOT NULL DEFAULT '{}',
  -- Alle Werte in config sind NICHT-sensitive Konfiguration (URLs, Destination-IDs).
  -- Sensitive Credentials (API-Keys, Zertifikate, OAuth-Secrets) werden NIEMALS in config gespeichert.
  -- Stattdessen: Referenz auf Env-Variable (z.B. "XTA_CERT_KEY_TENANT_ABC") oder Supabase Vault Secret-ID.
  -- XTA: { postfach_id, server_url, zertifikat_env_ref: "XTA_CERT_TENANT_ABC" }
  -- FIT-Connect: { destination_id, oauth_url, client_id, client_secret_vault_ref: "vault:fc-secret-abc" }
  -- service-bw: { api_url, api_key_env_ref: "SERVICEBW_KEY_TENANT_ABC" }
  -- Manuell: {} (keine Konfiguration)
  aktiv boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, transportweg)
);

-- Ein Mandant kann mehrere Transportwege parallel konfiguriert haben
-- (z.B. XTA fuer Bestandskunden + service-bw fuer BW-Portale)
-- Der primaere Transportweg wird ueber eine Spalte in der tenants-Tabelle gesteuert
```

**RLS:** Service-Only (deny-all fuer Client-Rollen). Zugriff nur ueber Service-Role im Backend.

### 4. Routing-Algorithmus

```
1. Ausgehende Nachricht soll versendet werden (z.B. Bescheid)
2. TransportService laedt tenant_transport_config WHERE tenant_id = ? AND aktiv = true
3. Bestimmung des Transportwegs:
   a. Empfaenger-Adresse vorhanden? → Transportweg des Empfaengers
   b. Kein Empfaenger? → Default-Transportweg des Mandanten (tenants.default_transportweg)
   c. Transportweg = 'manuell'? → Kein Job, Nachricht zum Download bereitstellen
4. Job in background_jobs schreiben:
   type: 'transport_xta_send' | 'transport_fitconnect_send' | 'transport_servicebw_send'
   input: { nachricht_id, transport_config_id, empfaenger }
5. Isolierter Service verarbeitet Job
```

### 5. Eingehende Nachrichten (Polling)

```
1. Isolierter Service pollt externe Quelle (eigenstaendig, konfiguriertes Intervall)
2. Neue Nachricht gefunden:
   a. Service schreibt in background_jobs: type = 'xbau_parse', input = { roh_xml, herkunft: 'xta'|'fit_connect'|'service_bw' }
   b. XBau-Service (ADR-015) parst die Nachricht
   c. Fachverfahren wird via Webhook benachrichtigt
3. Service bestaetigt Empfang an externe Quelle (acknowledge)
```

Die Polling-Frequenz ist pro Transport-Service konfigurierbar (z.B. XTA alle 60s, FIT-Connect alle 120s).

### 6. Job-Typen (Erweiterung ADR-008)

Neue Job-Typen fuer die Transport-Abstraktion:

| Job-Typ | Service | Richtung | Beschreibung |
|---|---|---|---|
| `transport_xta_send` | xta-service | Ausgang | OSCI-Versand |
| `transport_xta_poll` | xta-service | Eingang | XTA-Postfach abfragen |
| `transport_fitconnect_send` | fit-connect-service | Ausgang | FIT-Connect Submission |
| `transport_fitconnect_poll` | fit-connect-service | Eingang | FIT-Connect Retrieval |
| `transport_servicebw_send` | service-bw-adapter | Ausgang | service-bw REST-Versand |
| `transport_servicebw_poll` | service-bw-adapter | Eingang | service-bw REST-Polling |

Bestehende Job-Typen aus ADR-008 und ADR-015 (`xbau_generate`, `xbau_parse`, `xbau_validate`) bleiben unveraendert. Die Transport-Jobs sind eine separate Schicht.

### 7. Verzeichnisstruktur

```
src/lib/services/transport/
  transport-service.ts       # Routing-Logik (Strategy Pattern)
  transport-config.ts        # Laden/Cachen der Mandanten-Konfiguration
  types.ts                   # TransportService Interface, Typen

xta-service/                 # Isolierter Java-Sidecar (PROJ-11)
  Dockerfile
  src/

fit-connect-service/         # Isolierter Node.js-Container (PROJ-18)
  Dockerfile
  package.json
  src/

service-bw-adapter/          # Nach PROJ-45 Evaluation (optional)
  Dockerfile
  package.json
  src/
```

## Begruendung

1. **Strategy Pattern** entkoppelt Fachlogik von Transportprotokollen. Das Fachverfahren kennt keine OSCI-Details, keine OAuth2-Flows, keine proprietaeren APIs.
2. **Isolierte Services** (ADR-015, ADR-003) kapseln die Protokoll-Komplexitaet. Ein XBau-Versionswechsel oder ein neuer Transportweg erfordert keine Aenderung am Fachverfahren.
3. **background_jobs als Kommunikationskanal** (ADR-008) ist bereits etabliert und bewaehrt. Kein neuer Kommunikationsmechanismus noetig.
4. **Mandanten-Konfiguration** ermoeglicht heterogene Kundenlandschaft: NRW-Kunden nutzen XTA, BW-Kunden nutzen service-bw, zukuenftige Kunden nutzen FIT-Connect -- alles im selben System.
5. **Erweiterbarkeit**: Ein neuer Transportweg (z.B. EGVP, zukuenftiger OZG-Standard) erfordert nur: neuen isolierten Service + neue Zeile in `tenant_transport_config` + neuen Job-Typ. Keine Aenderung an bestehendem Code.

## Konsequenzen

### Positiv
- Fachverfahren bleibt transportweg-agnostisch -- "sende Nachricht" / "empfange Nachricht" als einzige Operationen
- Parallelbetrieb mehrerer Transportwege pro Mandant ist architektonisch vorgesehen (Uebergangsphase XTA zu FIT-Connect)
- Jeder Transport-Service kann unabhaengig deployed, skaliert und aktualisiert werden
- `tenant_transport_config` ist die zentrale Steuerungstabelle -- Transportweg-Wechsel ist eine Konfigurationsaenderung, kein Code-Deployment
- Fehlerbehandlung und Retry sind pro Transport-Service isoliert (OSCI-Retry unterscheidet sich von REST-Retry)

### Negativ / Risiken
- Drei isolierte Services erhoehen die Betriebskomplexitaet (Monitoring, Deployment, Log-Aggregation)
- Java-Sidecar (XTA) erfordert JVM-Infrastruktur neben dem Node.js-Stack
- `tenant_transport_config.config` enthaelt ausschliesslich nicht-sensitive Konfiguration. Sensitive Credentials werden ueber Env-Variablen-Referenzen oder Supabase Vault Secret-IDs indirekt adressiert -- nie als Klartext in der Datenbank gespeichert.
- Polling-basierte Eingaenge (XTA, FIT-Connect) haben inhaerent eine Latenz (Polling-Intervall)

### Neutral
- Der manuelle Transportweg ("manuell") erfordert keinen isolierten Service -- er bleibt im Fachverfahren (PROJ-7 MVP-Pfad)
- service-bw-Integration ist abhaengig vom Evaluationsergebnis (PROJ-45). Die Architektur ist vorbereitet, aber der Adapter wird erst nach Go implementiert
- Die Tabelle `tenant_transport_config` wird erst mit Phase 2 (Multi-Tenancy, ADR-007) befuellt. In Phase 1 ist "manuell" der einzige aktive Transportweg

## Verworfene Alternativen

### 1. Direkter Transportweg-Code im Fachverfahren
- **Pro:** Kein zusaetzlicher Service, einfacheres Deployment
- **Contra:** OSCI erfordert Java (nicht in Node.js moeglich). Jeder neue Transportweg verunreinigt das Fachverfahren. Protokoll-Updates erzwingen Fachverfahren-Deployment. Verletzt ADR-003 (Service-Isolation) und ADR-015 (isolierter XBau-Service)
- **Fazit:** Nicht tragfaehig bei drei verschiedenen Protokollen

### 2. Zentraler Transport-Gateway-Service (ein Service fuer alle Transportwege)
- **Pro:** Ein Service statt drei, einfacheres Deployment
- **Contra:** Java (XTA) und Node.js (FIT-Connect) in einem Container mischen ist fragil. Deployment-Kopplung: XTA-Update erzwingt FIT-Connect-Neudeployment. Single Point of Failure
- **Fazit:** Widerspricht dem Prinzip der Isolation und der unabhaengigen Deploybarkeit

### 3. Message Broker (RabbitMQ, NATS) statt background_jobs
- **Pro:** Echte asynchrone Nachrichtenvermittlung, Push statt Poll, bessere Skalierung
- **Contra:** Zusaetzliche Infrastruktur (Hosting, Monitoring, Kosten). Widerspricht Lean-Startup-Ansatz (ADR-008). background_jobs ist bereits etabliert und ausreichend fuer die erwartete Last (< 50 Mandanten in Phase 2)
- **Fazit:** Option fuer Phase 3 (Skalierung > 50 Mandanten), aber kein Bedarf in Phase 2

### 4. Webhook-basierter Eingang statt Polling
- **Pro:** Geringere Latenz, kein Polling-Overhead
- **Contra:** XTA unterstuetzt keine Webhooks (nur OSCI-Polling). FIT-Connect-Webhook-Support ist optional und nicht bei allen Serviceportalen verfuegbar. Oeffentlich erreichbarer Webhook-Endpunkt erhoet Angriffsflaeche
- **Fazit:** Als Optimierung fuer FIT-Connect evaluieren, aber Polling bleibt Fallback

## Skalierungspfad

| Phase | Transportwege | Infrastruktur |
|---|---|---|
| Phase 1 (aktiv) | Manuell (PROJ-7) | Kein isolierter Service noetig |
| Phase 2 | + XTA (PROJ-11), ggf. + service-bw (PROJ-45) | xta-service (Java-Sidecar), ggf. service-bw-adapter |
| Phase 3 | + FIT-Connect (PROJ-18) | fit-connect-service (Node.js) |
| Phase 4 (Sunset) | FIT-Connect (primaer), XTA (Altlast) | xta-service wird nach Kundenmigration abgeschaltet |

## Beteiligte Rollen

| Rolle | Verantwortung |
|---|---|
| Senior Software Architect | Transport-Abstraktion, Adapter-Interface, Routing-Algorithmus |
| Senior Backend Developer | TransportService-Implementierung, tenant_transport_config, Job-Routing |
| Database Architect | tenant_transport_config-Schema, RLS, Indizes |
| DevOps/Platform Engineer | Docker-Container fuer isolierte Services, Monitoring, Log-Aggregation |
| Senior Security Engineer | Zertifikats-/Credential-Management in config-JSONB, Service-zu-Service-Auth |
| Migration Architect | Phasenplanung XTA → FIT-Connect Uebergang |
| Senior QS Engineer | Transport-Routing-Tests, Fehler-Szenarien, Parallelbetrieb-Tests |

## Referenzen

- **ADR-003:** Service-Architektur und Kapselung (Services muessen isoliert und unabhaengig deploybar sein)
- **ADR-004:** XBau-Integrationsstrategie (Versionierung, Codelisten, Namespace-Handling)
- **ADR-008:** Asynchrone Verarbeitung und Background Jobs (background_jobs-Tabelle, Job-Lifecycle)
- **ADR-015:** XBau-Nachrichten-Datenmodell und Verarbeitungspipeline (isolierter XBau-Service, Webhook-Pattern)
- **PROJ-7:** XBau-Basisschnittstelle (manueller Import/Export, Phase 1)
- **PROJ-11:** XTA-Anbindung (OSCI-Transport, Java-Sidecar, Phase 2)
- **PROJ-18:** FIT-Connect-Anbindung (REST + OAuth2, Phase 3)
- **PROJ-45:** service-bw Evaluation (Spike, proprietaere REST-API, Phase 2)
