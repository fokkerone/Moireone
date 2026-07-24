# React/shadcn/Tailwind Control-Panel Rewrite — Design

## Ziel

Das bestehende Vanilla-DOM-Control-Panel (`src/controls.ts`) und die manuelle p5-Verdrahtung (`src/main.ts`) werden durch eine React-Anwendung ersetzt, gestylt mit Tailwind CSS v4 und shadcn/ui-Komponenten (aktuelle Version). Zusätzlich werden mehrere lange gewünschte Verbesserungen an der generativen Logik und der Bedienbarkeit umgesetzt: ein neuer "Zoom"-Parameter pro Layer, globale (statt pro-Layer) Regler für Abstand und Linienbreite mit größerem Wertebereich, flache Linien-Enden, numerische Eingabefelder neben allen Reglern, sowie Duplizieren/Löschen/Drag-and-Drop-Neuordnung der Layer statt eines globalen Anzahl-Sliders.

## Nicht-Ziele

- Die reine Logik (`flowfield.ts`, `lineGenerator.ts`, `svgExport.ts`, `palette.ts`) wird inhaltlich nicht verändert — nur `state.ts` (Default-Werte, Layer-Verwaltungsfunktionen) und die Verdrahtung ändern sich strukturell.
- Kein Server-Side-Rendering, keine Routing-Bibliothek — eine einzige React-Root-Komponente genügt.
- Keine automatisierten Tests für reine DOM-/React-Komponenten-Verdrahtung (wie schon bei `controls.ts`/`main.ts`/`render.ts` zuvor) — nur die bestehenden reinen Logikmodule bleiben unit-getestet.

## Architektur

### Tech-Stack
- **React 19** (aktuelle Version), eingebunden über `@vitejs/plugin-react` in `vite.config.ts`.
- **Tailwind CSS v4**: CSS-first-Konfiguration (`@import "tailwindcss";` in einer globalen CSS-Datei, kein `tailwind.config.js` nötig), via `@tailwindcss/vite`-Plugin.
- **shadcn/ui**: aktuelle CLI (`pnpm dlx shadcn@latest init`), Style "base-nova" (aktueller Base-UI-Preset der CLI, nicht Radix — daher nicht "new-york"), Komponenten: `Accordion`, `Slider`, `Input`, `Button`, `Label`.
- **@dnd-kit/core` + `@dnd-kit/sortable`**: für Drag-and-Drop-Neuordnung der Layer-Accordion-Panels (shadcn hat keine eigene DnD-Komponente, dies ist die gängige Kombination in der shadcn-Community).

### Wiederverwendete Module (unverändert)
`src/types.ts`, `src/flowfield.ts`, `src/lineGenerator.ts`, `src/palette.ts`, `src/svgExport.ts` bleiben Framework-agnostische, reine Funktionen mit ihren bestehenden Unit-Tests.

### Neue/geänderte Module

**`src/types.ts` (Erweiterung)**
- `LayerParams` bekommt ein neues Feld: `zoom: number`.

**`src/flowfield.ts` (kleine Anpassung)**
- `fieldAngle` berechnet die effektive Sample-Scale als `layer.noiseScale / layer.zoom` statt `layer.noiseScale` direkt. Höherer Zoom vergrößert einen kleineren Ausschnitt des Noise-Feldes über die ganze Canvas.

**`src/state.ts` (Umbau der Layer-Verwaltung)**
- `createDefaultLayer(index)`: neues Feld `zoom: 1` ergänzt.
- Neu: `duplicateLayer(state: PatternState, index: number): PatternState` — fügt eine Kopie des Layers an Index `index` direkt danach ein (Farbe/Winkel-Variante optional gleich, alle anderen Werte identisch übernommen), no-op falls bereits `MAX_LAYERS` erreicht.
- Neu: `removeLayer(state: PatternState, index: number): PatternState` — entfernt den Layer an Index `index`, no-op falls bereits `MIN_LAYERS` erreicht.
- Neu: `reorderLayers(state: PatternState, fromIndex: number, toIndex: number): PatternState` — verschiebt einen Layer an eine neue Position (ändert die Zeichenreihenfolge/Z-Stapel).
- Neu: `setGlobalSpacing(state: PatternState, spacing: number): PatternState` und `setGlobalWeight(state: PatternState, weight: number): PatternState` — schreiben denselben Wert in **alle** Layer gleichzeitig (Datenmodell bleibt pro-Layer, UI exponiert nur einen gemeinsamen Regler).
- `setLayerCount`/der globale Anzahl-Slider entfallen ersatzlos (durch Duplizieren/Löschen/Drag-and-Drop ersetzt).

**`src/render.ts` (kleine Anpassung)**
- Zeichnet Linien mit flachem Enden-Stil: `p.strokeCap(p.SQUARE)` (p5-Äquivalent zu SVG `stroke-linecap: butt` — exakt gerader Abschluss ohne Überstand).

**`src/svgExport.ts` (kleine Anpassung)**
- Jedes `<polyline>` bekommt zusätzlich `stroke-linecap="butt"`, damit Canvas- und SVG-Ausgabe visuell übereinstimmen (WYSIWYG bleibt erhalten).

### Neue React-Struktur

- `src/main.tsx` — React-Root (ersetzt `main.ts`), rendert `<App />` in ein `#root`-Element.
- `src/App.tsx` — hält `PatternState` per `useState`, rendert `<Canvas state={state} onChange={...} />` und `<Sidebar state={state} onChange={...} />`.
- `src/components/Canvas.tsx` — kapselt die p5-Instanz: erstellt sie einmal in einem `useEffect` mit leerem Dependency-Array (Mount), hält die aktuelle `PatternState` in einem `useRef` (damit die p5-Callbacks immer den neuesten Stand sehen, ohne die Instanz neu zu erstellen), ruft bei State-Änderungen `p.redraw()` auf; `p.draw` ruft weiterhin `renderPattern` auf und cached die Linien in einem Ref fürs Export. `windowResized` bleibt wie bisher.
- `src/components/Sidebar.tsx` — globaler Bereich: Hintergrundfarbe (natives `<input type="color">` in shadcn-Optik), globaler Abstand-Regler, globaler Linienbreite-Regler (jeweils `ParamSlider`), Export-Button (shadcn `Button`), darunter `<LayerAccordion>`.
- `src/components/LayerAccordion.tsx` — shadcn `Accordion` (Typ `multiple`, damit mehrere Layer gleichzeitig offen sein können), umschlossen von `@dnd-kit`s `DndContext`/`SortableContext`; jedes `AccordionItem` ist ein draggable `LayerPanel`.
- `src/components/LayerPanel.tsx` — ein Layer: Farbe, `ParamSlider` für Winkel, Noise-Scale, Noise-Stärke, Kurven-Trägheit, Zoom, Deckkraft (kein Abstand/Linienbreite mehr, die sind jetzt global); Duplizieren-Button (deaktiviert bei 5 Layern) und Löschen-Button (deaktiviert bei 2 Layern) im Panel-Header neben dem Drag-Handle.
- `src/components/ParamSlider.tsx` — wiederverwendbare Komponente: shadcn `Slider` + shadcn `Input type="number"` nebeneinander, bidirektional synchron (Eingabe im Zahlenfeld aktualisiert den Slider und umgekehrt), Werte werden auf `min`/`max` geclampt.

## Datenfluss

```
Nutzer-Interaktion (Slider/Zahlenfeld/Drag/Duplizieren/Löschen)
  → React-State-Update in App.tsx (setState mit einer der state.ts-Funktionen
    oder einem gezielten Layer-Patch)
  → Re-Render von <Sidebar> (neue Werte in den Controls)
  → <Canvas> registriert die State-Änderung via useEffect/Ref
    → p.redraw() wird aufgerufen
    → renderPattern() zeichnet neu, cached Linien-Geometrie in einem Ref
  → Export-Button liest den aktuellen State + den gecachten Linien-Ref
    → svgExport.buildSvgString() erzeugt SVG (inkl. stroke-linecap="butt")
```

## UI-Layout

Unverändert zum bisherigen Look: Canvas füllt den Viewport, Sidebar rechts fixiert, scrollbar, halbtransparenter dunkler Hintergrund. Innerhalb der Sidebar jetzt: globaler Bereich oben (Hintergrund, Abstand, Linienbreite, Export), darunter das Accordion mit den Layer-Panels (aufklappbar, per Drag-Handle neu sortierbar).

## Geänderte Wertebereiche

- **Abstand** (jetzt global): 4–50 (vorher pro Layer 4–60, jetzt geringfügig anderer Maximalwert lt. Nutzer-Wunsch).
- **Linienbreite** (jetzt global): 0,5–50 (vorher pro Layer 0,5–6).
- **Zoom** (neu, pro Layer): 1–20, Default 1.
- Noise-Scale, Noise-Stärke, Kurven-Trägheit, Winkel, Deckkraft: unverändert (0,0002–0,05 / 0–360 / 1–45 / 0–360 / 0–1).

## Fehlerbehandlung

Wie zuvor: alle numerischen Eingaben sind durch `min`/`max` auf Slider und Zahlenfeld begrenzt (das Zahlenfeld clampt beim Verlassen des Feldes auf den gültigen Bereich). Duplizieren/Löschen sind bei den Layer-Grenzen (2/5) deaktiviert statt einen Fehler zu werfen. Drag-and-Drop über die Grenzen des Accordions hinaus wird von `@dnd-kit` selbst ignoriert (kein Drop-Ziel außerhalb der Liste).

## Testing

Wie bei den bisherigen DOM-/Rendering-Modulen: keine automatisierten Tests für React-Komponenten oder die p5-Verdrahtung (dokumentierte Ausnahme, manuell im Browser verifiziert). Die bestehenden Unit-Tests für `flowfield.ts`, `lineGenerator.ts`, `state.ts` (die neuen Funktionen `duplicateLayer`/`removeLayer`/`reorderLayers`/`setGlobalSpacing`/`setGlobalWeight` bekommen eigene Unit-Tests nach demselben Muster wie `setLayerCount`) und `svgExport.ts` bleiben bestehen bzw. werden erweitert.
