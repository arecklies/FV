# Nutzertestergebnisse Baugenehmigungs-Fachverfahren (Simulation)

**Testdatum:** 14.--15. Mai 2026
**Testort:** Konferenzzentrum Dortmund
**Software-Version:** v0.9.4-pilot

> **Hinweis:** Dies ist eine realistische Simulation basierend auf deployed Features, Pilotkommunen und typischen Behoerden-Nutzerprofilen.

---

## Tag 1: Bestandskunden (8 Teilnehmer)

### Teilnehmerprofile

| ID | Kommune | Rolle | Erfahrung | Aktuelle Software |
|----|---------|-------|-----------|-------------------|
| P1-DO1 | Dortmund | Sachbearbeiter | 14 Jahre | FV-Desktop (Power-User) |
| P1-DO2 | Dortmund | Sachbearbeiterin | 11 Jahre | FV-Desktop |
| P1-SO1 | Soest | Sachbearbeiter | 5 Jahre | FV-Desktop |
| P1-SO2 | Soest | Referatsleiterin | 15 Jahre | FV-Desktop |
| P1-LE1 | Leipzig | Sachbearbeiterin | 3 Jahre | ProBauG |
| P1-LE2 | Leipzig | Sachbearbeiter | 7 Jahre | ProBauG |
| P1-FR1 | Freiburg | Sachbearbeiter | 8 Jahre | Prosoz NEO |
| P1-FR2 | Freiburg | Teamleiterin | 12 Jahre | Prosoz NEO |

### Task Completion Rate

| Szenario | TCR | Mittlere Zeit | Mittlere Fehler |
|----------|-----|---------------|-----------------|
| Vorgang anlegen (Wizard) | 100% | 79,3s | 0,6 |
| Frist-Dashboard + Pause | 100% | 51,5s | 0,1 |
| Workflow + Vier-Augen | 87,5% | 142,0s | 0,6 |
| Volltextsuche + Navigation | 75% | 44,1s | 0,4 |
| Verlaengerung Baugenehmigung | 100% | 43,3s | 0,1 |

### SUS-Scores

| Teilnehmer | SUS-Score | Bewertung |
|------------|--------:|-----------|
| P1-DO1 | 62,5 | Marginal |
| P1-DO2 | 67,5 | Marginal |
| P1-SO1 | 72,5 | OK |
| P1-SO2 | 70,0 | OK |
| P1-LE1 | 55,0 | Schlecht |
| P1-LE2 | 65,0 | Marginal |
| P1-FR1 | 60,0 | Marginal |
| P1-FR2 | 68,0 | Marginal |
| **Durchschnitt** | **65,1** | **Marginal** |

### NPS: -50 (0 Promoter, 5 Passive, 3 Detractors)

### Blocker-Analyse

| Fehlendes Feature | Blocker fuer | Kritikalitaet |
|-------------------|-------------|---------------|
| Dokumentenverwaltung (PROJ-5) | 8/8 | **Absoluter Blocker** |
| Bescheiderzeugung (PROJ-6) | 8/8 | **Absoluter Blocker** |
| ToEB-Beteiligung (PROJ-12) | 6/8 | **Hoher Blocker** |
| XTA-Anbindung (PROJ-11) | 5/8 | **Absoluter Blocker** (Echtbetrieb) |
| Adressfilter (PROJ-40) | 4/8 | Mittlerer Blocker |
| Audit-Trail (PROJ-10) | 3/8 | Mittlerer Blocker |
| Massenoperationen (PROJ-17) | 2/8 | Mittlerer Blocker |

### Positive Ueberraschungen

| Feature | Bewertung | Repraesentatives Zitat |
|---------|-----------|----------------------|
| Frist-Ampel + Dashboard | 8/8 positiv | "Das ist das Beste an der ganzen Software" |
| Volltextsuche | 7/8 positiv | "Viel schneller als die alte Suche" |
| Modernes Design | 8/8 positiv | "Sieht aus wie eine richtige Web-Anwendung" |
| Workflow-Bestaetigungsdialog | 7/8 positiv | "Hab schon zweimal versehentlich den Status geaendert" |
| Frist-Pause | 5/8 positiv | "Das hat in der alten Software komplett gefehlt" |
| Statistik-Karten | 6/8 positiv | "Auf einen Blick sehe ich, wo es brennt" |
| Performance | 8/8 positiv | "48 Sekunden fuer einen neuen Vorgang. Alte Software: sechs Minuten" |

### Migrationsakzeptanz

| Antwort | Anzahl |
|---------|-------:|
| Ja, sofort | 0 |
| Ja, wenn Kernfunktionen fertig | 5 |
| Nur unter Vorbehalt | 2 |
| Nein | 1 |

---

## Tag 2: Berufseinsteiger / Quereinsteiger (6 Teilnehmer)

### Teilnehmerprofile

| ID | Alter | Hintergrund | Kommune | Seit wann in Bauaufsicht |
|----|------:|-------------|---------|--------------------------|
| P2-DO1 | 23 | Verwaltungsfachangestellte, erster Job | Dortmund | 4 Monate |
| P2-LE1 | 34 | Quereinsteiger IT-Branche | Leipzig | 2 Monate |
| P2-FR1 | 27 | Geographin, Referendariat | Freiburg | 6 Monate |
| P2-SO1 | 25 | Verwaltungswirt, frisch aus Studium | Soest | 3 Monate |
| P2-LE2 | 31 | Architektin, Seitenwechsel | Leipzig | 5 Monate |
| P2-DO2 | 29 | Kauffrau Bueromanagement, Quereinstieg | Dortmund | 7 Monate |

### Task Completion Rate

| Szenario | TCR | Mittlere Zeit |
|----------|-----|---------------|
| Vorgang anlegen (Wizard) | 83,3% | 138,0s |
| Frist-Dashboard verstehen | 100% | 56,3s |
| Workflow-Schritt wechseln | 83,3% | 105,0s |

### Begriffe die NICHT verstanden wurden

| Begriff | Nicht verstanden |
|---------|:---------------:|
| Genehmigungsfreistellung | 5/6 |
| Kenntnisgabeverfahren | 5/6 |
| ToEB | 5/6 |
| Verfahrensart | 4/6 |
| Formelle Pruefung | 4/6 |
| Materielle Pruefung | 4/6 |
| Frist-Hemmung | 4/6 |
| Gebaeueklasse | 3/6 |
| Sonderbau | 3/6 |
| Ampelstatus "gehemmt" | 3/6 |
| Freizeichnung | 3/6 |
| Nutzungsaenderung | 2/6 |

### SUS-Scores

| Teilnehmer | SUS-Score | Bewertung |
|------------|--------:|-----------|
| P2-DO1 | 57,5 | Schlecht |
| P2-LE1 | 77,5 | Gut (IT-Hintergrund) |
| P2-FR1 | 52,5 | Schlecht |
| P2-SO1 | 60,0 | Marginal |
| P2-LE2 | 75,0 | Gut (Architektur-Hintergrund) |
| P2-DO2 | 45,0 | Schlecht |
| **Durchschnitt** | **61,3** | **Marginal** |

### Onboarding-Praeferenzen (Top 3)

1. Glossar mit Erklaerungen / Mouseover (5/6)
2. Interaktives Tutorial in der Software (4/6)
3. Praesenzschulung mit Beispielfaellen (4/6)
4. PDF-Handbuch (0/6)

---

## Afterwork-Abend: Gedaechtnisprotokoll

**Ort:** Restaurant "Zum Alten Rathaus", 18:45--21:30 Uhr
**Anwesend:** P1-DO1, P1-DO2, P1-SO1, P1-SO2, P1-FR2, P2-LE1, P2-DO1

### Zentrale Einsichten (nicht im offiziellen Bericht)

**1. Die Kaufentscheidung ist politisch, nicht technisch.**
Die Sachbearbeiter bewerten positiv, aber entschieden wird bei Kaemmerern, Digitalisierungsbeauftragten und Amtsleitungen. Diese waren nicht im Test.

> Petra (Soest): "Mein Amtsleiter fragt genau eine Sache: Kann ich Bescheide rausschicken? Wenn die Antwort Nein ist, dann ist das Gespraech vorbei."

**2. Die Angst vor dem Uebergang ist real.**

> Thomas (Soest): "Ich habe Angst, dass wir ueberflussig werden. Wenn das System alles automatisch berechnet -- Fristen, Ampeln, Workflow -- was mache ich dann noch?"

> Lisa (Dortmund, 23): "Ich habe Angst, dass mein Vorgesetzter denkt, ich bin ungeeignet. Mein Team hat keine Zeit, mich einzuarbeiten."

**3. Das Timing ist entscheidend.**
Freiburg hat ein politisches Fenster (neue Buergermeisterin). Soest hat Personalnot. Alle sagen: Kommt erst mit Dokumenten und Bescheiden.

> Petra: "Sagt ehrlich: Herbst 2026 sind Dokumente und Bescheide fertig. Dann warten wir. Aber wenn ihr im Juni kommt und sagt 'wir sind bereit' und dann fehlt die Haelfte -- dann verliert ihr uns."

**4. Performance als Ueberraschungs-Highlight.**

> Ralf (Dortmund, 14 Jahre): "48 Sekunden fuer einen neuen Vorgang. In der alten Software brauche ich sechs Minuten. Wenn die Dokumentenverwaltung genauso schnell ist, dann bin ich dabei."

**5. Workarounds die ersetzt werden koennten.**
- Excel-Listen fuer Fristen (Thomas, jeden Montag 1,5h)
- Access-Datenbank fuer Strassenzuordnung (Soest, seit 10 Jahren)
- Papierarchiv fuer Bauherr-Suche (Dortmund)
- 200 Outlook-Wiedervorlagen (Petra)

**6. Informelle Feature-Wuensche (nur am Abend genannt).**
- Vorgang-Notizen / interner Kommentar
- Wiedervorlagen mit Erinnerung
- Gebuehrenberechnung (mindestens Grundgebuehr)
- Schnittstelle zum DMS der Kommune (d.velop)
- Dark Mode

---

## Handlungsempfehlung

### Absolut-Blocker (vor Pilotstart loesen)
1. **PROJ-5 Dokumentenverwaltung** -- 8/8 Bestandskunden, taeglich 20-30x benoetigt
2. **PROJ-6 Bescheiderzeugung** -- 8/8 Bestandskunden, "Auto ohne Lenkrad"
3. **PROJ-12 ToEB-Beteiligung** -- 6/8 Bestandskunden, bei jedem groesseren Vorhaben

### Hohe Prioritaet (vor Echtbetrieb)
4. **PROJ-11 XTA-Anbindung** -- Pflicht fuer Nachrichtenversand
5. **PROJ-16 Glossar/Onboarding** -- 5/6 Einsteiger, ohne nicht nutzbar
6. **PROJ-10 Audit-Trail** -- Fuehrungskraefte koennen ohne nicht verantworten

### Quick-Wins (sofort umsetzbar)
7. Statistik-Karten als echte Filter statt Sortierung (PROJ-50 Nachbesserung)
8. Aktenzeichen-Format konfigurierbar machen
9. Wizard-Default fuer erfahrene User konfigurierbar

### Realistischer Pilotzeitraum: Q4 2026 (nicht Q2)
