# Anforderungen an die neue SaaS-Webanwendung
## Perspektive: Referatsleiter, untere Bauaufsichtsbehörde
**Stand: März 2026**

---

## 1. Vorbemerkung

Die Einführung einer neuen SaaS-Lösung ist kein IT-Projekt. Es ist ein **Organisationsentwicklungsprojekt mit IT-Unterstützung**. Als Referatsleiter trage ich die Verantwortung dafür, dass mein Referat handlungsfähig bleibt – vor, während und nach dem Wechsel. Meine Anforderungen sind daher strategischer und führungsbezogener Natur, ergänzen aber die operativen Anforderungen meiner Sachbearbeiter ausdrücklich.

---

## 2. Steuerung und Führung

Das System muss mir ermöglichen, meinen Verantwortungsbereich zu **überblicken, zu steuern und gegenüber der Behördenleitung zu berichten** – ohne dass ich jeden Vorgang einzeln aufrufen muss.

### 2.1 Führungscockpit / Management-Dashboard
- Echtzeit-Übersicht über alle Vorgänge des Referats: nach Status, Verfahrensart, Sachbearbeiter, Fälligkeit
- **Rückstandsanzeige**: Wie viele Vorgänge überschreiten die gesetzlichen oder internen Bearbeitungsfristen? Wer bearbeitet sie?
- **Auslastungsverteilung**: Wie viele offene Vorgänge hat jede Sachbearbeiterin / jeder Sachbearbeiter? Gibt es Ungleichgewichte?
- Fristgefährdete Vorgänge prominent und gefiltert darstellbar (z. B. „alle Vorgänge, bei denen die gesetzliche Frist in ≤ 10 Werktagen abläuft")
- Ampellogik: rot/gelb/grün auf Referats- und Sachbearbeiterebene

### 2.2 Berichtswesen und Statistik
- **Konfigurierbare Berichte** ohne Programmierkenntnisse erstellbar (z. B. monatliche Eingangs-/Ausgangszahlen, Verfahrensdauer je Typ, Bescheidquoten)
- Export in Excel, PDF und idealerweise direkter Versand per E-Mail an die Behördenleitung
- Vergleich von Zeiträumen (Vorjahr, Vorquartal) für Trendanalysen
- Kennzahlen für **Kommunalberichte, Landesstatistiken und politische Gremien** (z. B. Stadtrat) abrufbar
- Ad-hoc-Abfragen ohne IT-Ticket: Ich muss eine kurzfristige Anfrage der Dezernatsleitung in 10 Minuten beantworten können, nicht in 3 Tagen

### 2.3 Personalsteuerung und Vertretungsregelungen
- **Vertretungskonzept** abbildbar: Wer vertritt wen im Urlaubs- oder Krankheitsfall? Automatische Übergabe von Fristen und Wiedervorlagen
- Vorgänge **umzuweisen** ohne Datenverlust – mit Benachrichtigung des neuen Bearbeiters
- Auswertung: Bearbeitungszeiten je Sachbearbeiter (nicht zur Kontrolle, sondern zur Weiterentwicklung und fairen Aufgabenverteilung)
- Neue Mitarbeitende schnell einzubinden: Zugänge, Berechtigungen und Rollenprofile ohne langen IT-Vorlauf

---

## 3. Organisation und Prozesse

### 3.1 Konfigurierbarkeit durch die Behörde
- **Ich** – nicht der Softwareanbieter – muss einfache Anpassungen selbst vornehmen können:
  - Textbausteine und Nebenbestimmungen pflegen
  - Vorlagen für Bescheide und Standardschreiben anpassen
  - Bearbeitungsschritte und Wiedervorlagen konfigurieren
  - Benutzer anlegen, Rollen zuweisen, Berechtigungen vergeben
- Kostenpflichtige Customizing-Aufträge für jede Kleinigkeit sind **nicht akzeptabel**

### 3.2 Qualitätssicherung
- **Vier-Augen-Prinzip** konfigurierbar: Bestimmte Bescheide oder Verfügungen müssen von mir oder einer Vertretung gegengezeichnet werden, bevor sie rausgehen
- Digitaler **Freizeichnungsworkflow**: Sachbearbeiter erstellt → Referatsleiter prüft/zeichnet frei → Versand
- Wiedervorlage-Monitoring: Ich will sehen, welche Wiedervorlagen schon lange unbearbeitet liegen
- Protokollierung von Bescheidänderungen nach Ersterfassung (wer hat wann was geändert und warum?)

### 3.3 Wissensmanagement
- Interne **Arbeitshinweise und Dienstanweisungen** direkt im System hinterlegen und aktuell halten
- Verknüpfung von Rechtsnormen und internen Hinweisen mit Vorgangstypen
- Nachvollziehbarkeit von Entscheidungspraktiken: Wie wurde ein vergleichbarer Fall bisher entschieden? (Suche in abgeschlossenen Vorgängen)

---

## 4. Rechtliche Verantwortung und Compliance

Als Referatsleiter bin ich mitverantwortlich für die Rechtmäßigkeit des behördlichen Handelns. Das System muss mich dabei absichern.

- **Nachweisbarkeit**: Jede Entscheidung, jeder Versand, jede Fristverlängerung muss revisionssicher dokumentiert sein
- **Zustellnachweise** digital abrufbar (wann wurde der Bescheid zugestellt? Rückschein digital?)
- Vollständiger **Audit-Trail**: Im Falle einer Dienstaufsichtsbeschwerde oder eines Widerspruchsverfahrens muss ich lückenlos nachvollziehen können, was wann wer getan hat
- System muss **Widerspruchs- und Klageverfahren** abbilden: Verknüpfung mit dem Ausgangsbescheid, Aktenvorlage an die Widerspruchsbehörde
- Keine eigenmächtigen Datenänderungen durch den Anbieter ohne mein Wissen – vertraglich abgesichert

---

## 5. Einführung und Changemanagement

Das ist der Punkt, der über Erfolg oder Misserfolg entscheidet – und der in Ausschreibungen systematisch unterschätzt wird.

### 5.1 Projektorganisation
- Klare **Projektstruktur** mit definierten Meilensteinen, Ansprechpartnern auf Anbieterseite und auf unserer Seite
- Ich benötige ein **Lastenheft / eine Leistungsbeschreibung**, die der Anbieter vor Vertragsschluss verbindlich bestätigt
- **Abnahmekriterien** schriftlich festgelegt: Wann gilt das System als eingeführt und abgenommen?

### 5.2 Schulung und Begleitung
- Unterschiedliche Schulungsformate für unterschiedliche Nutzergruppen:
  - Erfahrene Sachbearbeiter: vertiefende Fachschulung, Unterschiede zum Altsystem
  - Berufseinsteiger: Basisschulung mit Onboarding-Begleitung
  - Ich als Führungskraft: Schulung zu Dashboard, Berichtswesen, Administration
- **Train-the-Trainer**: Ich will interne Multiplikatoren aufbauen, nicht dauerhaft vom Anbieter abhängig sein
- Schulungsunterlagen bleiben nach Ende der Einführung im Eigentum der Behörde

### 5.3 Parallelbetrieb und Go-Live
- Definierter **Parallelbetrieb** (Altsystem + neues System) für mindestens 4–6 Wochen
- Klare Regelung: Ab wann werden neue Vorgänge ausschließlich im neuen System angelegt?
- Eskalationsweg für den Go-Live-Tag: direkter Ansprechpartner beim Anbieter, nicht nur Ticketsystem
- **Rollback-Plan**: Was passiert, wenn das neue System beim Go-Live kritische Fehler zeigt?

---

## 6. Wirtschaftlichkeit und Vergabe

### 6.1 Kostenstruktur
- Transparentes, **nachvollziehbares Preismodell**: Lizenzkosten je Nutzer oder je Behörde, Speicherkosten, Supportkosten, Updatekosten – alles offen ausgewiesen
- **Keine versteckten Kosten** für Standardintegrationen (z. B. LDAP-Anbindung, OZG-Schnittstelle dürfen nicht separat berechnet werden)
- Kostenschätzung für typische Anpassungswünsche vorab (Tagesatz, Aufwandsschätzung)
- Vertragslaufzeit und Kündigungsfristen **behördenfreundlich**: keine 5-Jahres-Mindestlaufzeiten ohne Ausstiegsoption

### 6.2 Vergaberechtliche Anforderungen
- Der Anbieter muss Referenzen aus dem **öffentlichen Sektor / Bauverwaltung** nachweisen können
- **EVB-IT-Vertrag** oder gleichwertiges Vertragswerk
- Unterauftragnehmer und Hosting-Partner müssen offengelegt werden
- Datenschutzkonforme Auftragsverarbeitung (AVV) muss vor Vertragsschluss vorliegen

---

## 7. Schnittstellen zur Behördenorganisation

- Anbindung an das **Dokumentenmanagementsystem (DMS)** der Gesamtbehörde, falls vorhanden
- Kompatibilität mit der kommunalen **E-Akte-Strategie** (falls vorhanden oder geplant)
- Schnittstelle zum **Personalverwaltungssystem** für Abwesenheiten (Urlaub, Krank) – zumindest lesend, damit Vertretungsregelungen automatisch greifen
- Abstimmung mit der **zentralen IT der Behörde** zu Netzwerk, Proxy, SSO, Endgeräten – der Anbieter muss kooperationsbereit und technisch auskunftsfähig sein

---

## 8. Risiken, die ich im Blick habe

| Risiko | Maßnahme |
|---|---|
| Akzeptanzprobleme bei erfahrenen Sachbearbeitern | Frühzeitige Beteiligung, Schulung, Feedbackkanal |
| Datenverlust bei Migration | Testmigration, schriftliche Abnahme, Protokoll |
| Unterschätzte Einarbeitungszeit → Bearbeitungsrückstand | Personalreserve einplanen, Priorisierung von Vorgängen |
| Anbieter-Insolvenz / Produktabkündigung | Datenexport-Recht vertraglich sichern, Escrow-Regelung |
| Fehlanreize durch Kennzahlendruck | Kennzahlen als Steuerungs-, nicht als Sanktionsinstrument nutzen |
| Verzögerte Freischaltung durch IT-Abteilung | Frühzeitige Einbindung der zentralen IT |

---

## 9. Mein Kernanliegen in einem Satz

> Das System muss meinem Referat helfen, **rechtmäßig, fristgerecht und effizient** zu arbeiten – und es muss mir als Führungskraft die Werkzeuge geben, das jederzeit nachzuweisen und zu steuern. Alles andere ist nachrangig.

---

*Formuliert aus der Perspektive eines Referatsleiters in der unteren Bauaufsichtsbehörde.*
