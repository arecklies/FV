# UX-Konzept: PROJ-3 Vorgangsverwaltung

**Erstellt:** 2026-03-26
**Autor:** Senior UI/UX Designer
**Design-Prinzip:** "Show less, offer more" (Progressive Disclosure)
**Referenzen:** PROJ-3 Spec, ADR-011 (Workflow Engine), Umfrage-Auswertung, Research-Synthese

---

## 1. Seitenstruktur (3 Kern-Views)

```
/vorgaenge                    → Vorgangsliste (Hauptarbeitsflaeche)
/vorgaenge/neu                → Vorgang anlegen (Dialog oder Seite)
/vorgaenge/[id]               → Vorgangsdetail (Tabs-basiert)
```

---

## 2. View 1: Vorgangsliste (`/vorgaenge`)

### Layout (Desktop 1440px)

```
┌─ Sidebar (240px) ──────────────────────────────────────────────────────────────────┐
│ Logo                        ┌─ Hauptbereich ─────────────────────────────────────┐ │
│                             │                                                     │ │
│ [Dashboard]                 │ Vorgaenge (142)              [Ctrl+K Suche] [+ Neu] │ │
│ [Vorgaenge] ← aktiv        │─────────────────────────────────────────────────────│ │
│ [Fristen]                   │ Filter: [Status v] [Verfahren v] [Zeitraum v]      │ │
│ [Dokumente]                 │         [Nur meine ○]  [Massenauswahl ☐]           │ │
│                             │─────────────────────────────────────────────────────│ │
│ ─────────                   │ ☐ │ AZ          │ Adresse       │ Typ    │ Status  │ │
│ [Admin]                     │   │             │               │        │         │ │
│                             │ ☐ │ 2026/BG-142 │ Musterstr. 12 │ BG reg │ ● Prfg  │ │
│                             │ ☐ │ 2026/BG-139 │ Hauptstr. 5   │ BG ver │ ◐ ToEB  │ │
│                             │ ☐ │ 2026/VB-023 │ Parkweg 1     │ VB     │ ⚠ Frist!│ │
│                             │ ☐ │ 2026/NA-008 │ Bergstr. 22   │ NA     │ ● Eingg │ │
│                             │   │ ...         │               │        │         │ │
│                             │─────────────────────────────────────────────────────│ │
│                             │ Seite 1 von 6    [< 1 2 3 ... 6 >]    25 pro Seite │ │
│                             └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### Komponenten-Hierarchie

```
VorgaengeSeite (Server Component)
├── VorgaengeHeader
│   ├── Breadcrumb (shadcn breadcrumb.tsx)
│   ├── Titel + Zaehler
│   ├── SucheButton (oeffnet Command-Palette, Ctrl+K)
│   └── NeuButton (Button shadcn, Ctrl+N)
├── VorgaengeFilter
│   ├── Select: Status (shadcn select.tsx)
│   ├── Select: Verfahrensart (shadcn select.tsx)
│   ├── Select: Zeitraum (shadcn select.tsx)
│   ├── Switch: "Nur meine" (shadcn switch.tsx)
│   └── Checkbox: Massenauswahl-Modus (shadcn checkbox.tsx)
├── VorgaengeTabelle (Client Component)
│   ├── Table (shadcn table.tsx)
│   │   ├── TableHeader (sortierbar per Klick)
│   │   └── TableRow je Vorgang
│   │       ├── Checkbox (Massenauswahl)
│   │       ├── Aktenzeichen (Link -> Vorgangsdetail)
│   │       ├── Adresse
│   │       ├── Verfahrensart (Badge shadcn)
│   │       ├── StatusBadge (eigene Komposition)
│   │       ├── FristAmpelBadge (eigene Komposition, PROJ-4)
│   │       ├── Zustaendiger (Avatar shadcn)
│   │       └── AktionenMenu (DropdownMenu shadcn)
│   └── MassenaktionLeiste (sichtbar wenn >= 1 Checkbox aktiv)
│       ├── "X ausgewaehlt"
│       ├── Button: Status aendern
│       ├── Button: Zuweisen
│       └── Button: Frist verschieben
├── VorgaengePagination (shadcn pagination.tsx)
└── VorgaengeEmpty (Empty State bei 0 Ergebnissen)
```

### Spalten-Definition

| Spalte | Desktop | Tablet | Mobile | Sortierbar |
|---|:---:|:---:|:---:|:---:|
| Checkbox | Ja | Ja | Nein | Nein |
| Aktenzeichen | Ja | Ja | Ja | Ja |
| Adresse | Ja | Ja | Ja (gekuerzt) | Ja |
| Verfahrensart | Ja | Badge-only | Nein | Ja |
| Status | Ja | Ja | Ja | Ja |
| Frist-Ampel | Ja | Ja | Ja | Ja |
| Zustaendiger | Ja | Nein | Nein | Ja |
| Aktionen | Ja | Ja | Ja | Nein |

### Mobile (375px): Card-Layout statt Tabelle

```
┌──────────────────────────────┐
│ 2026/BG-142         ⚠ 3 Tg  │
│ Musterstr. 12, 50667 Koeln   │
│ Baugenehmigung regulaer      │
│ ● In Pruefung    [⋮ Aktionen]│
└──────────────────────────────┘
```

Auf Mobile wird die Table durch eine Card-Liste ersetzt (`Card` shadcn). Die Frist-Ampel wandert in die obere rechte Ecke.

---

## 3. View 2: Vorgang anlegen (`/vorgaenge/neu`)

### UX-Prinzip: Progressive Disclosure

**Einsteiger (P2)** sieht nur 4 Pflichtfelder. **Experte (P1)** kann erweiterte Felder aufklappen.

```
┌─────────────────────────────────────────────────┐
│ Neuen Vorgang anlegen                     [X]   │
│─────────────────────────────────────────────────│
│                                                 │
│ Verfahrensart *                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ Baugenehmigung (regulaer)                   │ │
│ │ Baugenehmigung (vereinfacht)                │ │
│ │ Freistellungsverfahren                      │ │
│ │ Vorbescheid                                 │ │
│ │ Nutzungsaenderung                           │ │
│ │ Abbruchgenehmigung                          │ │
│ ├─────────────────────────────────────────────┤ │
│ │ ▸ Weitere Verfahrensarten (5)               │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ Bauherr (Name) *           ___________________  │
│ Grundstueck (Adresse) *    ___________________  │
│ Bezeichnung                ___________________  │
│                                                 │
│ ▸ Erweiterte Angaben (eingeklappt)              │
│   Flurstueck: _________  Gemarkung: _________   │
│   Entwurfsverfasser: _________________________   │
│   Bemerkungen: _______________________________   │
│                                                 │
│            [Abbrechen]  [Vorgang anlegen]        │
└─────────────────────────────────────────────────┘
```

### Komponenten

```
VorgangAnlegenDialog (Dialog shadcn oder Sheet shadcn)
├── Form (shadcn form.tsx + Zod-Validierung)
│   ├── VerfahrensartSelect (Command shadcn -- Gruppiert, durchsuchbar)
│   │   ├── CommandGroup "Haeufig" (Top 6)
│   │   └── CommandGroup "Weitere" (Collapsible shadcn)
│   ├── Input: Bauherr Name (shadcn input.tsx, required)
│   ├── Input: Grundstueck Adresse (shadcn input.tsx, required)
│   ├── Input: Bezeichnung (shadcn input.tsx, optional)
│   └── Collapsible: Erweiterte Angaben (shadcn collapsible.tsx)
│       ├── Input: Flurstueck
│       ├── Input: Gemarkung
│       ├── Input: Entwurfsverfasser
│       └── Textarea: Bemerkungen (shadcn textarea.tsx)
├── FormError (Zod-Fehler als Alert shadcn)
└── FormActions
    ├── Button: Abbrechen (variant="outline")
    └── Button: Vorgang anlegen (variant="default")
```

---

## 4. View 3: Vorgangsdetail (`/vorgaenge/[id]`)

### Layout: Tabs-basiert mit fixem Header

```
┌─────────────────────────────────────────────────────────┐
│ ← Zurueck   2026/BG-142   Baugenehmigung (regulaer)    │
│              Musterstr. 12, 50667 Koeln                 │
│                                                         │
│ Status: ● In Pruefung          Frist: ⚠ 3 Tage         │
│                                                         │
│ ┌─ Workflow-Stepper (ADR-011) ────────────────────────┐ │
│ │ ● Eingang → ● Vollst. → ● ToEB → ◉ Pruefung       │ │
│ │ → ○ Bescheid → ○ Freigabe → ○ Zustellung           │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Naechster Schritt: Bauvorhaben anhand der LBO pruefen.  │
│ [Genehmigung empfehlen]  [Ablehnung empfehlen]          │
│                                                         │
│ [Grunddaten] [Beteiligte] [Dokumente] [Fristen] [Hist.] │
│─────────────────────────────────────────────────────────│
│                                                         │
│ (Tab-Inhalt je nach Auswahl)                            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Komponenten-Hierarchie

```
VorgangDetailSeite (Server Component fuer Daten, Client fuer Interaktion)
├── VorgangDetailHeader (sticky)
│   ├── Button: Zurueck (← Pfeil)
│   ├── Aktenzeichen + Verfahrensart + Adresse
│   ├── StatusBadge
│   ├── FristAmpelBadge (PROJ-4)
│   └── AktionenMenu (DropdownMenu shadcn)
│       ├── Vorgang uebergeben
│       ├── Wiedervorlage setzen
│       ├── Kommentar hinzufuegen
│       └── Vorgang archivieren
├── WorkflowStepper (eigene Komposition, ADR-011)
│   ├── StepperItem je Workflow-Schritt (Progress shadcn + Badge)
│   │   ├── Status: abgeschlossen (●), aktiv (◉), ausstehend (○)
│   │   └── Label + optional Datum
│   ├── HinweisBox (Alert shadcn): Naechster Schritt Erklaerung
│   └── AktionsButtons: Die erlaubten naechsten Schritte
├── Tabs (shadcn tabs.tsx)
│   ├── Tab "Grunddaten"
│   │   ├── Card: Bauherr-Daten
│   │   ├── Card: Grundstueck-Daten
│   │   ├── Card: Verfahrensdetails
│   │   └── Collapsible: Erweiterte Angaben (Progressive Disclosure)
│   ├── Tab "Beteiligte"
│   │   ├── Table: Bauherr, Entwurfsverfasser, Statiker, ToEB
│   │   └── Button: Beteiligten hinzufuegen
│   ├── Tab "Dokumente" (PROJ-5)
│   │   ├── DropZone
│   │   └── Dokumentenliste mit Versionierung
│   ├── Tab "Fristen" (PROJ-4)
│   │   ├── FristListe mit Ampeln
│   │   └── Button: Frist hinzufuegen
│   └── Tab "Historie"
│       ├── Timeline: Workflow-Schritte + Kommentare + Aenderungen
│       └── KommentarForm (Textarea + Button)
└── AutoSaveIndicator ("Gespeichert" / "Nicht gespeichert")
```

---

## 5. Globale Suche (Command-Palette, `Ctrl+K`)

```
┌─────────────────────────────────────────────────┐
│ 🔍 Vorgang, Adresse oder Aktenzeichen suchen... │
│─────────────────────────────────────────────────│
│ Letzte Vorgaenge                                │
│   2026/BG-142  Musterstr. 12     ● In Pruefung │
│   2026/VB-023  Parkweg 1         ⚠ Frist!      │
│─────────────────────────────────────────────────│
│ Ergebnisse fuer "Muster"                        │
│   2026/BG-142  Musterstr. 12     ● In Pruefung │
│   2026/BG-098  Musterweg 3       ✓ Abgeschl.   │
│   Thomas Mueller (Bauherr in 3 Vorgaengen)      │
└─────────────────────────────────────────────────┘
```

Nutzt `Command` (shadcn command.tsx) -- bereits installiert. Gruppiert in "Letzte Vorgaenge" und "Suchergebnisse". Tastaturnavigierbar (Pfeiltasten, Enter).

---

## 6. Design-Tokens und Tailwind-Snippets

### Status-Farben (Frist-Ampel)

```css
/* In globals.css oder tailwind.config.ts */
--frist-gruen: hsl(142, 76%, 36%);      /* Im Zeitplan */
--frist-gelb: hsl(45, 93%, 47%);        /* Warnung */
--frist-rot: hsl(0, 84%, 60%);          /* Kritisch */
--frist-dunkelrot: hsl(0, 72%, 40%);    /* Ueberfaellig */
```

### FristAmpelBadge (eigene Komposition)

```tsx
// Immer: Farbe + Icon + Text (nie nur Farbe -- WCAG)
<Badge variant="outline" className="border-green-600 text-green-700 bg-green-50">
  <CheckCircle className="h-3 w-3 mr-1" /> Im Plan
</Badge>

<Badge variant="outline" className="border-yellow-600 text-yellow-800 bg-yellow-50">
  <AlertTriangle className="h-3 w-3 mr-1" /> 7 Tage
</Badge>

<Badge variant="destructive">
  <AlertCircle className="h-3 w-3 mr-1" /> 3 Tage
</Badge>

<Badge className="bg-red-900 text-white">
  <XCircle className="h-3 w-3 mr-1" /> -2 Tage
</Badge>
```

### StatusBadge

```tsx
<Badge variant="outline">Eingegangen</Badge>
<Badge variant="secondary">In Pruefung</Badge>
<Badge className="bg-blue-100 text-blue-800">ToEB-Beteiligung</Badge>
<Badge className="bg-purple-100 text-purple-800">Freizeichnung</Badge>
<Badge className="bg-green-100 text-green-800">Abgeschlossen</Badge>
```

### Typografie

| Element | Klasse | Verwendung |
|---|---|---|
| Seitentitel | `text-2xl font-semibold tracking-tight` | "Vorgaenge (142)" |
| Sektionsueberschrift | `text-lg font-medium` | Tab-Titel, Card-Header |
| Tabellentext | `text-sm` | Vorgangsliste-Zeilen |
| Hilfetexte | `text-xs text-muted-foreground` | Tooltips, Untertitel |
| Aktenzeichen | `font-mono text-sm` | Monospace fuer AZ |

---

## 7. User Flows

### Flow 1: Vorgang anlegen (P2 Einsteiger)

```
Vorgangsliste → [+ Neu] oder Ctrl+N
  → Dialog oeffnet sich
  → Verfahrensart waehlen (Top 6 sichtbar)
  → Bauherr-Name eingeben
  → Adresse eingeben
  → [Vorgang anlegen]
  → Redirect zu Vorgangsdetail
  → Workflow-Stepper zeigt: "Eingegangen → Naechster Schritt: Vollstaendigkeitspruefung"
```

### Flow 2: Vorgang suchen und bearbeiten (P1 Experte)

```
Ueberall → Ctrl+K
  → Command-Palette oeffnet sich
  → Aktenzeichen oder Adresse tippen
  → Ergebnis mit Pfeiltasten auswaehlen, Enter
  → Vorgangsdetail oeffnet sich
  → Tab "Grunddaten" oder direkt Workflow-Aktion
```

### Flow 3: Massenoperation (P1)

```
Vorgangsliste → Massenauswahl-Checkbox aktivieren
  → Mehrere Vorgaenge anklicken
  → Massenaktions-Leiste erscheint am unteren Rand
  → [Status aendern] → Dialog mit Status-Auswahl
  → Bestaetigung → Alle ausgewaehlten Vorgaenge aktualisiert
```

---

## 8. States

### Empty State (keine Vorgaenge)

```
┌─────────────────────────────────────────────┐
│                                             │
│     📋                                      │
│     Noch keine Vorgaenge vorhanden.         │
│                                             │
│     Legen Sie Ihren ersten Vorgang an,      │
│     um mit der Bearbeitung zu beginnen.     │
│                                             │
│     [Ersten Vorgang anlegen]                │
│                                             │
│     Tipp: Mit Ctrl+N koennen Sie jederzeit  │
│     einen neuen Vorgang anlegen.            │
│                                             │
└─────────────────────────────────────────────┘
```

### Loading State

- Vorgangsliste: `Skeleton` (shadcn skeleton.tsx) -- 5 Zeilen mit Skeleton-Bloechen
- Vorgangsdetail: Skeleton fuer Header + Tab-Inhalt

### Error State

```tsx
<Alert variant="destructive">
  <AlertTitle>Vorgaenge konnten nicht geladen werden</AlertTitle>
  <AlertDescription>
    Bitte pruefen Sie Ihre Internetverbindung und versuchen Sie es erneut.
    <Button variant="link" onClick={retry}>Erneut versuchen</Button>
  </AlertDescription>
</Alert>
```

### Conflict State (Parallelbearbeitung)

```tsx
<Alert variant="warning">
  <AlertTitle>Aenderungskonflikt</AlertTitle>
  <AlertDescription>
    Dieser Vorgang wurde von [Name] um [Uhrzeit] geaendert.
    <Button variant="link">Aenderungen anzeigen</Button>
    <Button variant="link">Meine Version beibehalten</Button>
  </AlertDescription>
</Alert>
```

---

## 9. Accessibility (WCAG 2.2 AA)

| Kriterium | Umsetzung |
|---|---|
| **2.4.11 Focus Not Obscured** | Sticky Header hat `scroll-padding-top: 4rem`. Fokussierte Tabellenzeile scrollt unter Header sichtbar. |
| **2.5.8 Target Size 24x24** | Alle Buttons, Checkboxen, Dropdown-Trigger min. `min-h-6 min-w-6`. |
| **3.2.6 Consistent Help** | Hilfetexte immer unter dem Seitentitel, rechts neben Aktionen. |
| **3.3.7 Redundant Entry** | Bei "Vorgang anlegen" -> Bauherr-Daten werden im Vorgangsdetail vorausgefuellt, nicht erneut abgefragt. |
| **Frist-Ampel** | Farbe + Icon + Text. `aria-label="Frist kritisch, noch 3 Tage"`. Nie nur Farbe. |
| **Tabelle** | `role="grid"`, sortierbare Spalten mit `aria-sort`. Pfeiltasten-Navigation. |
| **Command-Palette** | Radix-basiert, Screenreader-kompatibel. `aria-label="Vorgang suchen"`. |
| **Massenauswahl** | `aria-label="X Vorgaenge ausgewaehlt"`. Checkbox-Status per Screenreader angekuendigt. |
| **Auto-Save** | Visueller + Screenreader-Indikator: `role="status"` auf Save-Indicator. |

---

## 10. Fehlende shadcn-Komponenten

| Komponente | Benoetigt fuer | Aktion |
|---|---|---|
| `calendar` | Wiedervorlage-Datum, Fristkalender | `npx shadcn@latest add calendar --yes` |
| `date-picker` | Filterung nach Zeitraum | Komposition aus Popover + Calendar |
| `hover-card` | Vorgang-Schnellvorschau in Liste | `npx shadcn@latest add hover-card --yes` |

Alle anderen benoetigten Komponenten (Table, Badge, Command, Dialog, Tabs, Form, Collapsible, Sheet, Dropdown-Menu, Pagination, Skeleton, Alert, Tooltip, Button, Input, Select, Switch, Checkbox, Textarea, Progress, Breadcrumb, Avatar, Sidebar) sind bereits installiert.

---

## 11. Zusammenfassung: Neue Fachkomponenten

| Komponente | Basis | Zweck |
|---|---|---|
| `StatusBadge` | Badge | Farbcodierter Verfahrensstatus |
| `FristAmpelBadge` | Badge + Icon | Frist-Visualisierung (Farbe + Icon + Text) |
| `WorkflowStepper` | Progress + Badge | ADR-011 Prozessfortschritt |
| `VorgaengeTabelle` | Table + Checkbox | Sortierbar, filterbar, Massenauswahl |
| `MassenaktionLeiste` | Sticky Footer + Buttons | Sammelaktionen auf ausgewaehlte Vorgaenge |
| `AutoSaveIndicator` | Badge (role=status) | "Gespeichert" / "Nicht gespeichert" |
| `VorgangAnlegenDialog` | Dialog/Sheet + Form | Progressive Disclosure, Zod-validiert |

---

**Naechster Schritt:** `/ux-handoff PROJ-3` fuer die vollstaendige Frontend-Spezifikation mit exakten Tailwind-Klassen, allen Prop-Interfaces und Responsive-Breakpoints.
