# Product Requirements Document (PRD)
# SaaS-Fachverfahren fuer deutsche Bauaufsichtsbehoerden

**Version:** 1.0
**Stand:** 25. Maerz 2026
**Verantwortlich:** Senior Produktmanager
**Status:** Accepted
**Quellen:** Stakeholder-Interviews (P1-P4), Research-Synthese, Fachliche Anforderungsanalyse

---

## 1. Vision und Positionierung

### 1.1 Produktvision

> Das erste echte Cloud-native Fachverfahren fuer deutsche Bauaufsichtsbehoerden: modern, rechtssicher, konfigurierbar -- und so einfach zu bedienen, dass es Fachkraefte anzieht statt sie zu vertreiben.

Wir loesen On-Premise-Altverfahren (ProBauG, IDA, NOLIS, ADVOBAURECHT) durch eine moderne SaaS-Webanwendung ab. Das System ist OZG-konform, XBau-faehig und orientiert sich am BSI-Grundschutz.

### 1.2 Strategische Hypothese

Deutsche untere Bauaufsichtsbehoerden arbeiten mit veralteten On-Premise-Fachverfahren, die hohe Wartungskosten verursachen, keine moderne UX bieten und die OZG-Umsetzung behindern. Eine Cloud-native SaaS-Loesung, die gleichzeitig fachlich vollstaendig, regulatorisch konform und modern bedienbar ist, kann diesen Markt oeffnen -- wenn sie die vier Entscheidungsebenen (fachlich, UX, Fuehrung, politisch) gleichzeitig bedient.

### 1.3 Marktkontext

Der Markt fuer Bauaufsichts-Fachverfahren in Deutschland ist oligopolistisch strukturiert. Die etablierten Anbieter (ProBauG, IDA, NOLIS) bieten ausschliesslich On-Premise-Loesungen an mit UX-Design aus den fruehen 2000ern, keiner nativen Cloud-Faehigkeit und hohen Wartungskosten. Systemwechsel finden typischerweise alle 10-15 Jahre statt. Der aktuelle OZG-Umsetzungsdruck und der Fachkraeftemangel schaffen ein Zeitfenster fuer einen Cloud-nativen Herausforderer.

---

## 2. Zielgruppen (Target Users)

### P1: Erfahrener Sachbearbeiter (~15 Jahre)
- **Rolle im Kauf:** Informelle Veto-Macht, Nutzereinfluss
- **Beduerfnis:** Vollstaendige fachliche Abbildung aller Verfahrensarten inkl. OWiG, Schwarzbau, Baulast
- **Pain Points:** Mangelnde Migrationsqualitaet, fehlende Fachtiefe in neuen Systemen

### P2: Berufseinsteiger (~1 Jahr, Digital Native)
- **Rolle im Kauf:** Adoption-Indikator, Usability-Proxy
- **Beduerfnis:** Modernes, selbsterklaerbares Design, schnelles Onboarding
- **Pain Points:** Altverfahren mit Windows-XP-Aesthetik, 200 Menuepunkte

### P3: Referatsleiter (Fuehrung, operativ nah)
- **Rolle im Kauf:** Formaler Entscheider auf Fachebene
- **Beduerfnis:** Dashboard, Rueckstandsanzeige, Vier-Augen-Workflow, Ad-hoc-Auswertungen
- **Pain Points:** Keine Echtzeitkennzahlen, manuelle Berichte

### P4: Amtsleiter (strategisch, politiknah)
- **Rolle im Kauf:** Budgetverantwortung, finaler Entscheider
- **Beduerfnis:** TCO-Transparenz, politische Absicherung, Zukunftssicherheit, Foerdermittel
- **Pain Points:** Unklare Kostenstrukturen, Vendor Lock-in, fehlende Referenzen

---

## 3. K.O.-Kriterien (8 Ausschlusskriterien)

| # | Kriterium | Phase | Status |
|---|---|---|---|
| K1 | Datenhaltung ausschliesslich in der EU | Phase 0 | Konfiguration |
| K2 | Vollstaendiger Datenexport (kein Vendor Lock-in) | Phase 1 | Geplant |
| K3 | XBau- oder OZG-Schnittstelle | Phase 1/2 | Geplant |
| K4 | Mandantentrennung bei Mehrmandantenfaehigkeit | Phase 0 | Geplant |
| K5 | Deutschsprachiger Support mit Telefon | Phase 1 | Organisatorisch |
| K6 | SLA mit verbindlichen Reaktions-/Loesungszeiten | Phase 1 | Organisatorisch |
| K7 | Testumgebung (Staging) verfuegbar | Phase 0 | Erfuellt |
| K8 | Gebuehrenberechnung an Landesrecht anpassbar | Phase 3 | Geplant |

---

## 4. Core Features (Roadmap)

### Phase 0 -- Fundament (4-6 Wochen)
Technische Basis mit Auth, Mandantentrennung und Infrastruktur.

| Prio | Feature | K.O. |
|---|---|---|
| P0 | Auth und Login (Supabase Auth, Session, 2FA) | K4 |
| P0 | Tenant-Schema (RLS-basiert, tenant_id) | K1, K4 |
| P0 | RBAC Basis (Admin, Sachbearbeiter, Referatsleiter, Amtsleiter) | K4 |
| P0 | Staging-Umgebung (Vercel Preview + Supabase Test) | K7 |
| P0 | Security Baseline (TLS, AES-256, Headers, Audit-Log-Struktur) | K1 |

### Phase 1 -- Kern-MVP (4-6 Monate)
Pilotfaehiges Produkt fuer eine Behoerde mit Standardverfahren.

| Prio | Feature | Persona |
|---|---|---|
| P0 | Vorgangsverwaltung (CRUD, Status, Workflow) | P1, P2 |
| P0 | Fristmanagement mit Eskalation und Ampellogik | Alle |
| P0 | Dokumentenverwaltung mit Versionierung | P1, P2 |
| P0 | Bescheiderzeugung mit Textbausteinen (PDF/A) | P1, P2 |
| P0 | SSO/OIDC-Anbindung | Alle |
| P0 | XBau-Basisschnittstelle (Import/Export) | P1 |
| P0 | Vollstaendiger Datenexport (JSON/XML + PDF) | P4 |
| P1 | Globale Suche, Dashboard, Beteiligungsmanagement | P1-P3 |

### Phase 2 -- Compliance und Integration (4-6 Monate)
Regulatorische Vollstaendigkeit, vergaberechtlich ausschreibungsfaehig.

| Prio | Feature | K.O. |
|---|---|---|
| P0 | XBau bidirektional (vollstaendig) | K3 |
| P0 | SSO/SAML 2.0 (Active Directory) | - |
| P0 | Vier-Augen-Freigabe-Workflow | - |
| P0 | Audit-Trail (revisionssicher) | - |
| P0 | OZG-Portal-Anbindung (FIT-Connect) | K3 |
| P1 | Erweiterte Verfahrensarten, Vertretung, DMS-Schnittstelle | - |

### Phase 3 -- Fuehrung und Skalierung (4-6 Monate)
Dashboard, Gebuehren, Offline fuer Breitenrollout.

| Prio | Feature | K.O. |
|---|---|---|
| P0 | Fuehrungs-Dashboard und Reporting | - |
| P0 | Gebuehrenberechnung (landesspezifisch) | K8 |
| P1 | PWA/Offline-Lesemodus, Geodaten (ALKIS/WMS) | - |
| P2 | Schulungsplattform, Dark Mode | - |

---

## 5. Success Metrics

| KPI | Zielwert | Zeitpunkt |
|---|---|---|
| Pilotbehoerde produktiv | 1 Behoerde, >= 95% Standardverfahren | Ende Phase 1 + 3 Mo |
| Fristversaeumnisse | 0 kritische | Laufend |
| Onboarding-Zeit | <= 3 Tage bis produktiv | Ab Phase 1 |
| System Uptime | >= 99,5% | Laufend |
| Seitenladezeit | < 2 Sekunden | Laufend |
| K.O.-Kriterien erfuellt | 8/8 | Ende Phase 2 |
| Zahlende Behoerden | 3-5 | 18 Monate nach Phase 1 |
| NPS Pilotnutzer | >= 40 | 6 Mo nach Pilot |
| Landesbauordnungen | >= 3 | 24 Monate |

---

## 6. Constraints

### Regulatorisch
- DSGVO (AVV Pflicht), BSI-Grundschutz (Orientierung), OZG/XBau, 16 LBOs
- BITV 2.0 / WCAG 2.2 AA, TR-ESOR, Vergaberecht (UVgO/VgV)

### Technisch
- EU-Hosting (kein Drittstaaten-Transfer), Browser-basiert (Chrome/Firefox/Edge)
- >= 50 gleichzeitige Nutzer, Upload >= 200 MB (Ziel 500 MB)
- Session-Timeout konfigurierbar (Standard 15 Min)

### Organisatorisch
- Lean Startup, kleines Kernteam
- Erste LBO: BauO NRW
- Parallelbetrieb 4-6 Wochen, Einfuehrungszeit 12-18 Monate

---

## 7. Non-Goals (nicht im MVP)

- Vollstaendige Gebuehrenberechnung (Phase 3)
- Schreibender Offline-Modus (Post-Phase 3)
- KI-gestuetzte Vollstaendigkeitspruefung (Post-Phase 3)
- Kammer-Schnittstelle, Dark Mode (Nice-to-Have)
- Schema-per-Tenant, On-Premise-Deployment (nicht geplant)
- Scanschnittstelle TWAIN (Legacy, Browser-inkompatibel)

---

## 8. Go-to-Market: Pilot-First-Strategie

**NRW als erster Markt** (396 Kommunen, hoher OZG-Druck, Foerderprogramme).

```
Phase 0-1 -> Pilotbehoerde NRW (1 Kommune, 20-50 SB)
Phase 2   -> Early Adopter (3-5 Behoerden NRW, Rahmenvertrag)
Phase 3   -> Breitenrollout (weitere Bundeslaender)
```

### Stakeholder-Ansprache
| Stakeholder | Primaeres Argument | Instrument |
|---|---|---|
| Amtsleiter (P4) | TCO, OZG-Compliance, Foerdermittel | Entscheider-Praesentation, TCO-Kalkulator |
| Referatsleiter (P3) | Reporting, Vier-Augen, SLA | Fach-Demo mit Dashboard |
| Sachbearbeiter (P1) | Verfahrensspektrum, Migration | Deep-Dive-Demo |
| Einsteiger (P2) | Modernes Design, Onboarding | Hands-on Sandbox |

---

## 9. Differenzierung

| Merkmal | Unser Vorteil | Wettbewerber-Schwaeche |
|---|---|---|
| UX-Qualitaet | Progressive Disclosure, Onboarding | Windows-XP-Aesthetik |
| Reporting | Echtzeit-Dashboard, Ad-hoc-Abfragen | Manuelle Excel-Exporte |
| SaaS-Oekonomie | Kein Server, auto Updates, skalierbar | Eigene Server, IT-Personal |
| Konfigurierbarkeit | Self-Service (No-Code) | Kostenpflichtige Customizing |
| XBau-Integration | Cloud-nativ | Nachgeruestetes Zusatzmodul |
| Datenexport | Vollstaendig, jederzeit | Proprietaer, Vendor Lock-in |

### Design-Prinzipien (aus Widerspruchsanalyse)
1. **Show less, offer more** -- Progressive Disclosure (Fachtiefe vs. Einfachheit)
2. **Stable core, evolving shell** -- LTS + Early-Access (Stabilitaet vs. Innovation)
3. **Kern fix, Schale flexibel** -- Standard + Konfiguration (Zentralisierung vs. Autonomie)
4. **Online first, offline capable** -- PWA-Lesemodus (SaaS vs. Offline)
5. **Steuern, nicht ueberwachen** -- Aggregiertes Reporting (Kennzahlen-Widerspruch)

---

## 10. Risiken

### Produktrisiken
| Risiko | Wahrscheinlichkeit | Massnahme |
|---|---|---|
| Fachliche Luecken im MVP | Hoch | P1 frueh einbinden, iteratives Feedback |
| XBau-Konformitaet unvollstaendig | Mittel | XSD-Validierung automatisiert |
| Performance bei grossen Dokumenten | Mittel | Resumable Upload, CDN |

### Marktrisiken
| Risiko | Wahrscheinlichkeit | Massnahme |
|---|---|---|
| Lange Beschaffungszyklen | Hoch | Pilot ohne formale Vergabe |
| Wettbewerber bringt SaaS-Version | Niedrig | Speed-to-Market, UX als Burggraben |
| Landesrechtliche Aenderungen | Mittel | Regelwerk-Engine, kein Hardcoding |

### Organisatorische Risiken (beim Kunden)
| Risiko | Wahrscheinlichkeit | Massnahme |
|---|---|---|
| Mitarbeiterwiderstand | Hoch | Changemanagement-Konzept mitliefern |
| Personalrat blockiert | Mittel | Dienstvereinbarungs-Muster bereitstellen |
| Zentrale IT verzoegert SSO | Hoch | SSO als eigenes Workpackage |

---

## 11. Zeitleiste

```
Q2 2026     Q3 2026     Q4 2026     Q1 2027     Q2 2027     Q3 2027
|--Phase 0--|------------ Phase 1 (MVP) -----------|
                                     |-- Pilot NRW --|
                                            |------ Phase 2 (Compliance) ------|
                                                               |-- Early Adopter --|
                                                                          |-- Phase 3 --|
```

- **M1:** Phase 0 abgeschlossen -- Q2 2026
- **M2:** MVP feature-complete -- Q4 2026
- **M3:** Pilotbehoerde produktiv -- Q1 2027
- **M4:** 8/8 K.O.-Kriterien erfuellt -- Q2 2027
- **M5:** 3-5 zahlende Behoerden -- Q4 2027

---

*Naechster Review: Nach Abschluss Phase 0.*
*Aenderungen erfordern Abstimmung zwischen Senior PM und Product Owner.*
