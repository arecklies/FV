# User Research Synthesebericht
## Zielgruppe: Untere Bauaufsichtsbehörde
### Product Research & UX | Interne Verwendung
**Version 1.0 | März 2026 | Vertraulich**

---

## 1. Studiendesign und Methodik

### 1.1 Hintergrund
Im Rahmen der Produktplanung für die nächste Hauptversion unserer SaaS-Lösung für Bauaufsichtsbehörden wurden qualitative Anforderungsinterviews mit vier Stakeholder-Profilen einer kommunalen Bauaufsichtsbehörde durchgeführt. Ziel war es, das vollständige Anforderungsspektrum über alle Hierarchieebenen hinweg zu erfassen, Übereinstimmungen zu identifizieren und Konfliktpotenziale frühzeitig aufzudecken.

### 1.2 Interviewte Personas

| ID | Rolle | Erfahrung | Gewichtung im Kaufprozess |
|---|---|---|---|
| P1 | Erfahrener Sachbearbeiter | ~15 Jahre Bauaufsicht, mehrere Fachverfahren | Nutzereinfluss, informelle Veto-Macht |
| P2 | Berufseinsteiger / Sachbearbeiter | ~1 Jahr, digital native | Adoption-Indikator, Usability-Proxy |
| P3 | Referatsleiter | Führungserfahrung, operativ nah | Formaler Entscheider auf Fachebene |
| P4 | Amtsleiter | Strategisch, politiknah | Budgetverantwortung, finaler Entscheider |

### 1.3 Methodik
- Leitfadengestützte Einzelinterviews (je ca. 60–90 Minuten)
- Nachträgliche schriftliche Anforderungsformulierungen der Befragten
- Thematische Codierung und Clusterung nach Häufigkeit, Dringlichkeit und Hierarchieebene
- Gewichtung nach **Kaufrelevanz**, **Nutzungsfrequenz** und **Risikopotenzial bei Nichterfüllung**

---

## 2. Gesamtübersicht: Themenlandkarte

Die identifizierten Anforderungsthemen lassen sich in **6 Obercluster** einteilen:

```
A  Funktionale Fachtiefe         (Verfahren, Fristen, Bescheide, Gebühren)
B  Benutzerfreundlichkeit / UX   (Design, Navigation, Onboarding, Hilfe)
C  Steuerung & Reporting         (Dashboard, Kennzahlen, Freizeichnung)
D  Technische Infrastruktur      (SSO, APIs, Sicherheit, Datenschutz)
E  Betrieb & Vertrag             (SLA, Migration, Kosten, Vergabe)
F  Organisation & Menschen       (Changemanagement, Schulung, Personalrat)
```

---

## 3. Gemeinsamkeiten – konsensuale Anforderungen

Die folgenden Themen wurden von **mindestens drei der vier Personas** genannt oder impliziert und gelten als **stabiler Anforderungskonsens**. Sie sollten als nicht-verhandelbare Produktbestandteile behandelt werden.

### 3.1 ★★★ Höchste Priorität (alle 4 Personas einig)

#### Fristmanagement und Fristverfolgung
Alle vier Befragten adressieren explizit oder implizit das Thema Fristen. P1 fordert technische Details (gesetzliche Fristen nach LBO), P2 farbliche Ampeldarstellung, P3 Eskalation und Monitoring, P4 politische Haftungsvermeidung. **Der geteilte Kern: Fristen dürfen im System nicht unsichtbar sein.**

> **Produktimplikation:** Fristmanagement ist kein Feature – es ist die Kernfunktion. Eine zentrale, konfigurierbare Frist-Engine mit Eskalationsstufen, Rollen-spezifischen Darstellungen und Audit-Log ist Pflicht.

#### Datensicherheit und DSGVO-Konformität
P1 fordert BSI-Grundschutz und Verschlüsselung, P2 weiß, dass Daten in Deutschland bleiben müssen, P3 fordert AVV und Mandantentrennung, P4 braucht das als politisches Argument.

> **Produktimplikation:** Hosting in Deutschland / EU, AVV-Muster bereitstellen, Zertifizierungen sichtbar machen. Das ist kein technisches Differenzierungsmerkmal, sondern Marktzugangsvoraussetzung.

#### Single Sign-On (SSO)
P1 nennt es als technische Anforderung, P2 will sich nicht mit Passwörtern herumschlagen, P3 braucht zentrale Benutzerverwaltung, P4 erwartet Integration in die kommunale IT-Landschaft.

> **Produktimplikation:** SAML 2.0 / OIDC-Anbindung an Active Directory ist ein Must-have, kein Add-on.

#### Support auf Deutsch mit Telefon-Erreichbarkeit
Alle vier Befragten – explizit oder implizit – erwarten menschlichen, deutschsprachigen Support. P2 formuliert es am direktesten: „Wenn's brennt, muss man jemanden anrufen können."

> **Produktimplikation:** Reines Ticketsystem ist ein Ausschlussgrund. Telefonischer Support innerhalb der Kernarbeitszeit muss Standard-SLA-Bestandteil sein.

#### Datenmigration und Datenexport
P1 kennt das Migrationsrisiko aus Erfahrung, P3 fordert Testmigration und Abnahmeprotokoll, P4 will kein Vendor Lock-in und braucht Ausstiegsoptionen für den Stadtrat.

> **Produktimplikation:** Vollständiger Datenexport in maschinenlesbarem Format muss vertraglich und technisch garantiert sein. Migrationswerkzeuge und Testumgebung sind Pflichtbestandteile jedes Angebots.

---

### 3.2 ★★ Hohe Priorität (3 von 4 Personas)

| Thema | P1 | P2 | P3 | P4 | Kernaussage |
|---|:---:|:---:|:---:|:---:|----|
| Übersichtliche Vorgangsliste / Dashboard | ✓ | ✓ | ✓ | – | Jeder braucht einen Überblick, aber auf unterschiedlicher Aggregationsstufe |
| Dokumentenverwaltung mit Versionierung | ✓ | ✓ | ✓ | – | Drag & Drop für P2, Versionierung für P1, Revisionssicherheit für P3 |
| Schulung & Onboarding | ✓ | ✓ | ✓ | (✓) | Format unterschiedlich, Bedarf universell |
| Textbausteine & Vorlagen | ✓ | ✓ | ✓ | – | P1: fachliche Tiefe; P2: Einfachheit; P3: behördliche Pflege |
| Konfigurierbarkeit ohne Anbieter | ✓ | – | ✓ | ✓ | Autonomie gegenüber Softwareanbieter ist politisch und operativ gewünscht |
| OZG / Online-Antragseingang | ✓ | (✓) | ✓ | ✓ | Technisch bei P1, strategisch bei P4 |
| Beteiligungsmanagement TÖB | ✓ | – | ✓ | (✓) | Kernprozess in der Bauaufsicht |
| Transparente Kostenstruktur | – | – | ✓ | ✓ | Budgetplanung und Vergabe |

---

## 4. Widersprüche – Konfliktpotenziale

Dies ist der analytisch wertvollste Abschnitt. Widersprüche sind keine Fehler in der Erhebung – sie spiegeln reale Interessenkonflikte wider, die bei der Produktgestaltung und im Vertrieb aktiv adressiert werden müssen.

---

### ⚡ Widerspruch 1: Fachtiefe vs. Einfachheit
**Kritikalität: HOCH**

| | P1 (Erfahrener SB) | P2 (Einsteiger) |
|---|---|---|
| Aussage | Alle Verfahrensarten vollständig abgebildet, inkl. OWiG, Schwarzbau, Baulast | Aufgeräumtes Design, selbsterklärend, keine 200 Menüpunkte |
| Implikation | Komplexes System mit vollständigem Funktionsumfang | Schlankes System mit niedrigschwelligem Einstieg |

**Analyse:** Dies ist der klassische UX-Widerspruch zwischen Power-User und Casual-User – in einer Behörde aber beide dauerhaft relevant. P1 wird auch in 10 Jahren noch dort arbeiten. P2 wird in 3 Jahren P1 sein.

> **Produktempfehlung:** Progressive Disclosure als Designprinzip. Einfache Standardoberfläche mit kontextsensitiv einblendbaren Expertenfeldern. Konfigurierbare Rollprofile (Einsteiger-Modus / Expertenmodus). Dies ist eine Designentscheidung, keine Architekturentscheidung.

---

### ⚡ Widerspruch 2: Stabilität vs. Innovationstempo
**Kritikalität: MITTEL**

| | P1 / P3 | P2 / P4 |
|---|---|---|
| Aussage | Keine Update-Überraschungen, lange Vorlaufzeiten, Parallelbetrieb | Modernes Design, aktuelle Features, Wettbewerb um Fachkräfte |
| Implikation | Langsame, stabile Releasezyklen | Schnelle, sichtbare Weiterentwicklung |

**Analyse:** P1 und P3 haben schlechte Erfahrungen mit ungekündigten Updates gemacht. P4 hingegen braucht das moderne System als Recruiting-Argument. P2 würde ein veraltetes System als Rückschritt erleben.

> **Produktempfehlung:** Zwei-Schienen-Release-Strategie: Stabile LTS-Linie für Kernfunktionen (Ankündigung 4 Wochen vorher, Testinstanz) + optionales Early-Access-Programm für neue UX-Features. Changelog muss transparent und laienverständlich sein.

---

### ⚡ Widerspruch 3: Zentralisierung vs. Behördenautonomie
**Kritikalität: MITTEL**

| | P4 (Amtsleiter) | P3 / P1 |
|---|---|---|
| Aussage | Interkommunale Rahmenverträge, skalierbare Lizenz, Standardisierung | Konfigurierbarkeit nach eigenem Recht, eigene Textbausteine, eigene Prozesse |
| Implikation | Möglichst standardisiertes Produkt für viele Kommunen | Möglichst anpassbares Produkt für die eigene Behörde |

**Analyse:** Standardisierung senkt unsere Entwicklungskosten und erhöht die Skalierbarkeit. Aber Behörden wechseln das Fachverfahren nur alle 10–15 Jahre – und sie tun es, weil die Vorgänger-Lösung „nicht zu uns gepasst hat". Fehlende Anpassbarkeit ist historisch einer der häufigsten Abwanderungsgründe.

> **Produktempfehlung:** Klar zwischen Kern (nicht konfigurierbar, standardisiert) und Schale (konfigurierbar durch Behörde-Admins) trennen. Konfigurierbarkeitsspielraum für Textbausteine, Workflows, Fristen, Rollen. Keine Code-Customizings, aber breite No-Code-Konfigurationsschicht.

---

### ⚡ Widerspruch 4: Offlinefähigkeit vs. reinem SaaS-Ansatz
**Kritikalität: NIEDRIG-MITTEL**

| | P1 / P2 | SaaS-Architektur |
|---|---|---|
| Aussage | Außendienst, Tablet, instabile Verbindung → Offline-Lesezugriff | Reine Cloud-Anwendung, kein lokaler Zustand |
| Implikation | Progressive Web App mit Offline-Cache nötig | Erhöhter Entwicklungsaufwand, Synchronisierungskonflikte |

> **Produktempfehlung:** Lesender Offline-Modus (Service Worker / PWA) als kurzfristiges Ziel. Schreibender Offline-Modus mittelfristig evaluieren – aber nur für klar abgegrenzte Außendienst-Formulare (z. B. Bauzustandsbesichtigung), nicht für die gesamte Anwendung.

---

### ⚡ Widerspruch 5: Kennzahlen als Steuerung vs. Kennzahlen als Kontrolle
**Kritikalität: NIEDRIG (aber sozial hochrelevant)**

| | P3 / P4 | P1 / P2 |
|---|---|---|
| Aussage | Bearbeitungszeiten je Sachbearbeiter, Auslastungsverteilung, Rückstandslisten | Keine Aussage – aber erkennbare Sensibilität |
| Implikation | Führungskräfte wollen Leistungsdaten | Sachbearbeiter werden Reporting als Kontrolle wahrnehmen |

**Analyse:** P3 formuliert explizit „nicht zur Kontrolle, sondern zur Weiterentwicklung" – er ist sich des Problems bewusst. Trotzdem: Wenn das Dashboard diese Daten zeigt, werden sie genutzt. Das ist ein Implementierungsrisiko für die Akzeptanz und potenziell ein Thema für den Personalrat.

> **Produktempfehlung:** Berichtsdaten für Führungskräfte auf aggregierter Ebene voreingestellt (Referat, nicht Person). Drill-Down auf Personenebene nur mit expliziter Konfiguration und – idealerweise – Hinweis auf Mitbestimmungserfordernisse. Wir sollten das in unserer Dokumentation aktiv adressieren.

---

## 5. Gewichtungsmatrix: Anforderungen nach Kaufrelevanz

Die folgende Matrix bewertet jede Anforderungsdimension nach zwei Achsen:
- **Kaufrelevanz**: Wie stark beeinflusst die Erfüllung/Nichterfüllung die Kaufentscheidung?
- **Nutzungsfrequenz**: Wie häufig ist das Feature im täglichen Betrieb relevant?

| Anforderung | Kaufrelevanz | Nutzungsfrequenz | Priorisierung |
|---|:---:|:---:|:---:|
| Fristmanagement | ★★★★★ | ★★★★★ | **MUST HAVE** |
| DSGVO / Datensicherheit | ★★★★★ | ★★★ | **MUST HAVE** |
| SSO / AD-Anbindung | ★★★★★ | ★★★★ | **MUST HAVE** |
| Datenexport / Migrationstool | ★★★★★ | ★★ | **MUST HAVE** |
| Dt. Support mit Telefon | ★★★★★ | ★★ | **MUST HAVE** |
| OZG-Schnittstelle / XBau | ★★★★★ | ★★★ | **MUST HAVE** |
| Volles Verfahrensspektrum (P1) | ★★★★ | ★★★★★ | **MUST HAVE** |
| Benutzerfreundlichkeit / UX (P2) | ★★★★ | ★★★★★ | **MUST HAVE** |
| Führungs-Dashboard / Reporting (P3) | ★★★★ | ★★★ | **SHOULD HAVE** |
| Wirtschaftlichkeitsnachweis (P4) | ★★★★ | ★ | **SHOULD HAVE** |
| Vier-Augen-Freigabe-Workflow | ★★★ | ★★★★ | **SHOULD HAVE** |
| Gebührenberechnung | ★★★ | ★★★★ | **SHOULD HAVE** |
| Offline-Modus (Außendienst) | ★★★ | ★★ | **SHOULD HAVE** |
| Personalrat-kompatibles Reporting | ★★★ | ★ | **SHOULD HAVE** |
| Schulungskonzept / E-Learning | ★★★ | ★★ | **SHOULD HAVE** |
| Dark Mode | ★ | ★★★★ | **NICE TO HAVE** |
| Kammer-Schnittstelle (auto. Prüfung) | ★★ | ★★ | **NICE TO HAVE** |
| Interkommunaler Anwenderbeirat | ★★ | ★ | **NICE TO HAVE** |

---

## 6. Implikationen für Vertrieb und Produktkommunikation

### 6.1 Stakeholder-spezifische Kommunikation

Die Interviews zeigen klar: **Es gibt nicht „den einen Käufer".** Je nach Gesprächspartner müssen unterschiedliche Botschaften im Vordergrund stehen:

| Gesprächspartner | Primäres Argument | Zu vermeiden |
|---|---|---|
| P1 (erfahrener SB) | Vollständiges Verfahrensspektrum, Fachtiefe, Migrationsqualität | Buzzwords, Demo nur mit Standardfunktionen |
| P2 (Einsteiger) | Modernes Design, schnelles Onboarding, Tablet-Nutzung | Überladene Feature-Listen |
| P3 (Referatsleiter) | Vier-Augen-Prinzip, Reporting, SLA-Qualität | Rein technische Präsentationen |
| P4 (Amtsleiter) | TCO-Transparenz, Referenzen, politische Absicherung | Fehlende Kostenklarheit, vage SLAs |

### 6.2 Häufige Einwände und Gegenargumente

**„Das alte System kennen wir wenigstens."**
→ Migrationskonzept zeigen, Referenzbesuche bei Bestandskunden anbieten, Parallelbetrieb zusichern

**„SaaS ist uns zu abhängig vom Anbieter."**
→ Datenexport live demonstrieren, Escrow-Regelung proaktiv anbieten, AVV vorlegen

**„Wir haben kein Budget."**
→ Fördermittelberatung anbieten, TCO-Kalkulator bereitstellen, Einsparungsnachweis aus Referenzkommunen

**„Das passt nicht zu unserer Landesbauordnung."**
→ Konfigurierbare Rechtsgrundlagen demonstrieren, ggf. länderspezifische Referenzen benennen

---

## 7. Empfehlungen an die Produktentwicklung

### Kurzfristig (nächstes Release)
1. **Progressive Disclosure** in der Navigation einführen – Einsteiger-Modus als konfigurierbares Rollenprofil
2. **Frist-Dashboard** auf Rollenebene splitten: Sachbearbeiter-Sicht vs. Referatsleiter-Sicht
3. **Datenexport-Funktion** prominent platzieren und in Demo-Szenarien aufnehmen (Kaufargument P4)
4. **Onboarding-Tour** für Erstnutzer implementieren (Kaufargument P2, Akzeptanzrisiko senken)

### Mittelfristig (Roadmap 12 Monate)
5. **Vier-Augen-Workflow** als konfigurierbarer Freigabeprozess (Kaufargument P3)
6. **Offline-Lesemodus** als PWA für Außendienst (Differenzierungsmerkmal)
7. **Reporting-Modul** mit aggregierten Amts-/Referatskennzahlen und Export (Kaufargument P3/P4)
8. **Schulungsplattform** mit Video-Tutorials und Sandbox-Umgebung produktseitig hosten

### Strategisch (18+ Monate)
9. **Anwenderbeirat** etablieren – kommunale Vertreter in der Produktentwicklung
10. **Länderspezifische Module** für weitere Landesbauordnungen strukturiert einplanen
11. **KI-gestützte Vollständigkeitsprüfung** bei Antragseingang evaluieren (OZG-Anträge)

---

## 8. Fazit

Die vier Interviews zeigen ein kohärentes, aber vielschichtiges Anforderungsbild. Die wichtigste Erkenntnis:

> **Das Produkt muss auf vier verschiedenen Ebenen gleichzeitig überzeugen – fachlich, usability-seitig, führungstechnisch und politisch. Wer nur eine Ebene bedient, verliert den Auftrag an der nächsten.**

Der stärkste Konsens liegt bei Compliance-Themen (Datenschutz, SSO, Datenexport) und bei Fristmanagement – beides sind Einstiegshürden, keine Differenzierungsmerkmale. Der eigentliche Wettbewerbsvorteil liegt in der **UX-Qualität für erfahrene Nutzer** und in der **Reporting-Qualität für Führungskräfte** – beides wird von Mitbewerbern regelmäßig unterschätzt.

---

*Erstellt durch: Product Research & UX | Vertraulich – nur für internen Gebrauch*
*Nächste Schritte: Priorisierungsworkshop mit Product Owner und Engineering Lead*
