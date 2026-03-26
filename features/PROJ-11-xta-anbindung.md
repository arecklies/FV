# PROJ-11: XTA-Anbindung (OSCI-Transport)

**Status:** Planned | **Phase:** 2 (Compliance und Integration) | **Erstellt:** 2026-03-25
**Umbenannt:** 2026-03-26 (vormals "OZG-Portal-Anbindung (FIT-Connect)" — Kundenfeedback: Bestandskunden nutzen XTA, nicht FIT-Connect)

---

## 1. Ziel / Problem

Bestandskunden uebermitteln und empfangen XBau-Nachrichten aktuell ausschliesslich ueber den XTA-Service (XML Transport Adapter / OSCI-Transport). Ohne XTA-Anbindung ist kein automatisierter Nachrichtenaustausch moeglich — der manuelle XML-Upload (PROJ-7 MVP) ist keine Dauerloesung fuer den Produktivbetrieb.

## 2. Fachlicher Kontext & Stakeholder

- **P1 (Sachbearbeiter):** "Nachrichten kommen automatisch rein, ich muss nichts hochladen"
- **P4 (Amtsleiter):** Automatisierter Austausch mit Serviceportalen
- **Kundenfeedback 2026-03-26:** Alle Bestandskunden nutzen XTA, kein Kunde hat FIT-Connect

## 3. Funktionale Anforderungen

- FA-1: XTA-Client-Anbindung (OSCI-Transport-Protokoll)
- FA-2: Empfang eingehender XBau-Nachrichten (Polling auf XTA-Postfach)
- FA-3: Versand ausgehender XBau-Nachrichten (Bescheide, Statistiken)
- FA-4: OSCI-Zertifikatsverwaltung (Client- und Server-Zertifikate)
- FA-5: Transportprotokollierung (Sende-/Empfangsbestaetigung im Vorgang)
- FA-6: Fehlerbehandlung: Zustellfehler mit Retry und Eskalation

## 4. User Stories & Akzeptanzkriterien

### US-1: Eingehende XBau-Nachrichten automatisch empfangen
Als Sachbearbeiter moechte ich Bauantraege automatisch ueber XTA empfangen, ohne XML-Dateien manuell hochzuladen.
- AC-1: System pollt regelmaessig das XTA-Postfach auf neue Nachrichten
- AC-2: Eingehende XBau-XML wird automatisch geparst und als Vorgang angelegt
- AC-3: Empfangsbestaetigung wird im Vorgang protokolliert
- AC-4: Bei Parser-Fehler: Nachricht in Fehler-Queue mit Benachrichtigung

### US-2: Ausgehende XBau-Nachrichten automatisch versenden
Als System moechte ich Bescheide und Statistiken automatisch ueber XTA versenden.
- AC-1: Generierte XBau-XML wird ueber XTA an das Serviceportal gesendet
- AC-2: Sendebestaetigung wird im Vorgang protokolliert
- AC-3: Bei Zustellfehler: Retry (3x), dann Eskalation an Sachbearbeiter

### US-3: Zertifikatsverwaltung
Als Admin moechte ich OSCI-Zertifikate konfigurieren koennen.
- AC-1: Upload von Client- und Server-Zertifikaten im Admin-Bereich
- AC-2: Zertifikatsablauf-Warnung 30 Tage vor Ablauf
- AC-3: Zertifikate sind mandantenspezifisch (je Tenant eigene Zertifikate)

## 5. Nicht-funktionale Anforderungen

- NFR-1: XTA-Polling als Background Job (ADR-008, nicht synchron in API-Route)
- NFR-2: OSCI-Verschluesselung gemaess XTA-Spezifikation
- NFR-3: Mandantentrennung: Jeder Tenant hat eigenes XTA-Postfach und Zertifikate
- NFR-4: Audit-Trail fuer alle Sende-/Empfangsvorgaenge

## 6. Spezialisten-Trigger

- **Backend Developer:** XTA-Client-Integration (OSCI-Bibliothek)
- **Security Engineer:** Zertifikatsmanagement, OSCI-Verschluesselung
- **DevOps:** Background-Job-Infrastruktur fuer Polling
- **Migration Architect:** Uebergangsplanung XTA → FIT-Connect

## 7. Offene Fragen

1. Welche OSCI-Java-Bibliothek verwenden? (Governikus SDK, eigene Implementierung?)
2. XTA-Server-Infrastruktur: Stellt der Kunde den XTA-Server, oder betreiben wir einen?
3. Polling-Intervall: Wie oft soll das XTA-Postfach abgefragt werden?

## 8. Annahmen

- OSCI-Transport erfordert Java-Komponente (kein reines Node.js moeglich)
- XTA-Server wird vom Kunden oder dessen IT-Dienstleister betrieben
- XTA ist Uebergangsloesung — FIT-Connect (PROJ-18) loest XTA langfristig ab

## 9. Abhaengigkeiten

| Abhaengigkeit | Typ |
|---|---|
| PROJ-7 (XBau-Basisschnittstelle) | XBau-Parsing und -Generierung |
| ADR-008 (Background Jobs) | Polling als asynchroner Job |
| PROJ-18 (FIT-Connect) | Langfristiger Nachfolger |

## 10. Fachliche Risiken

| Risiko | Wahrscheinlichkeit | Auswirkung | Gegenmassnahme |
|---|---|---|---|
| OSCI-Bibliothek erfordert Java-Container | Hoch | Infrastruktur-Komplexitaet | Evaluierung: Sidecar-Container oder Supabase Edge Function |
| Zertifikatsablauf unbemerkt | Mittel | Nachrichtenaustausch stoppt | Ablauf-Warnung 30 Tage vorher |
| XTA-Server-Ausfaelle beim Kunden | Mittel | Nachrichten verzoegert | Retry-Logik + Fehler-Queue |

## 11. Scope / Nicht-Scope

**Scope:** XTA-Client (Senden + Empfangen), Zertifikatsverwaltung, Polling-Job, Fehlerbehandlung
**Nicht-Scope:** XTA-Server-Betrieb (Kundeninfrastruktur), FIT-Connect (PROJ-18), OSCI-Intermediar-Betrieb
