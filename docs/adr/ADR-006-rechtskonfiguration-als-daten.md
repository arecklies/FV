# ADR-006: Rechtskonfiguration als Daten

## Status
Accepted (Review 2026-03-26: Hybridmodell bestaetigt durch Experten-Interview Plattform-Architekt. Umfrage bestaetigt: Gebuehren Phase 3, Verfahrensarten Phase 1.)

## Kontext

16 Landesbauordnungen mit unterschiedlichen Verfahrensarten, Fristen, Gebuehrentabellen, Vorlagepflichten. K.O.-Kriterium Nr. 8: Gebuehrenberechnung muss an Landesrecht anpassbar sein. 3/4 Personas fordern Konfigurierbarkeit ohne Anbieter.

## Entscheidung

**Hybrides Modell: Kernlogik als Code, Konfigurationsdaten als DB-Datensaetze.**

### Kern (Code, nicht konfigurierbar)
- Verfahrens-Engine (Statusuebergaenge, Workflow)
- Fristberechnungs-Algorithmus (Werktage, Feiertage)
- Gebuehrenberechnungs-Engine (Formel-Interpreter)
- XBau-Nachrichtengenerierung

### Schale (Daten, konfigurierbar pro Bundesland)

| Bereich | Speicherort | Aenderungsfrequenz |
|---|---|---|
| Verfahrensarten + Voraussetzungen | DB: `config_verfahrensarten` | Selten |
| Fristen + Eskalationsstufen | DB: `config_fristen` | Selten |
| Gebaeueklassen + Schwellenwerte | Code: `src/lib/regelwerk/` | Selten, komplex |
| Gebuehrentabellen + Formeln | DB: `config_gebuehren` | Jaehrlich |
| Vorlagepflichten | DB: `config_vorlagen` | Selten |
| Textbausteine | DB: `text_bausteine` | Haeufig |

### Neues Bundesland hinzufuegen
1. Regelwerk-Dateien unter `src/lib/regelwerk/<bl>/` aus PDF generieren
2. Konfigurationsdaten in DB einspielen
3. Bundesland in `BUNDESLAND_AKTIV` aktivieren
4. Tests gegen PDF ausfuehren
5. Kein Feature-Branch noetig

## Begruendung

1. Neues BL = Datensatz, nicht Feature-Branch (Skalierung auf 16 BL)
2. Behoerden-Autonomie bei Textbausteinen und Gebuehrentabellen
3. Kein Overengineering: Gebaeueklassen bleiben Code (komplexe Abhaengigkeiten)
4. Nachvollziehbarkeit: Code unter Git + Daten mit Audit-Trail

## Konsequenzen

- (+) Skalierung auf 16 BL ohne Codebasis-Explosion
- (+) Behoerden-Autonomie bei redaktionellen Aenderungen
- (-) Hybrid-Modell erhoet Komplexitaet
- (-) Admin-UI fuer DB-Konfiguration noetig

## Referenzen
- K.O.-Kriterium Nr. 8: `Input/AnFo/bauaufsicht_anforderungen.md`
- Bestehende Struktur: `src/lib/regelwerk/`
