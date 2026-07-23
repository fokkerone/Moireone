# Moiré-Flowfield-Generator — Design

## Ziel

Ein interaktives p5.js/TypeScript-Sketch, das Moiré-Muster erzeugt: mehrere Layer aus parallelen, farbigen Linien, die jeweils einem eigenen Perlin-Noise-Flowfield folgen und übereinandergelegt werden. Alle Parameter sind über ein HTML-Control-Panel live einstellbar. Das Ergebnis kann als SVG exportiert werden.

Referenzbild (vom Nutzer bereitgestellt): dichte diagonale Linienscharen, durch leicht unterschiedliche Winkel/Abstände entsteht eine wellenförmige Interferenz (Moiré). Ziel-Ästhetik: ähnliche Interferenzeffekte, aber mit organisch gebogenen (flowfield-verzerrten) statt rein geraden Linien.

## Nicht-Ziele

- Keine Animation über Zeit — das Muster ist statisch und wird nur bei Parameteränderung neu berechnet.
- Kein bildbasiertes Flowfield (Foto dient nur als visuelle Referenz für Look, nicht als Dateneingabe).
- Kein PNG-Export (nur SVG).
- Kein Farbverlauf/Gradient-Hintergrund — Hintergrund ist eine einzelne, einstellbare Volltonfarbe.

## Architektur

Alle neuen Module liegen unter `src/`, TypeScript, ES-Module-Imports.

### `flowfield.ts`
Reine Funktion `fieldAngle(layer: LayerParams, x: number, y: number): number`. Berechnet aus `p.noise(x * noiseScale, y * noiseScale, layer.seed)` einen Wert in `[-1, 1]`, skaliert mit `noiseStrength`, addiert auf `layer.baseAngle`. Keine p5-Zeichenlogik, nur Mathematik — leicht isoliert testbar/nachvollziehbar.

### `lineGenerator.ts`
Funktion `generateLayerLines(layer: LayerParams, width: number, height: number): Point[][]`.
- Verteilt Startpunkte entlang der Kante senkrecht zu `layer.baseAngle` im Abstand `layer.spacing`, versetzt über die gesamte Canvas-Diagonale (damit auch bei Rotation die Fläche abgedeckt ist).
- Für jeden Startpunkt: iterativer Walk mit fester Schrittweite (z.B. 4px), Richtung bei jedem Schritt = `fieldAngle(layer, x, y)`, bis der Punkt die Canvas verlässt oder eine Maximalschrittzahl erreicht ist.
- Gibt pro Layer ein Array von Punktlisten (eine Liste pro Linie) zurück.

### `render.ts`
- `renderPattern(p: p5, state: PatternState): LayerLines[]` — zeichnet Hintergrund (`state.background`), ruft pro Layer `generateLayerLines` auf, zeichnet jede Linie mit `p.beginShape()`/`p.vertex()` in Layer-Farbe/-Alpha/-Strichstärke, gibt die berechneten Linien zurück (Cache für Export).
- Kein `p.draw()`-Loop — Sketch nutzt `p.noLoop()`, Neuzeichnen erfolgt explizit über `p.redraw()` nach State-Änderungen.

### `svgExport.ts`
- `exportSvg(state: PatternState, cachedLines: LayerLines[], width, height): void`.
- Baut ein `<svg>`-Dokument per String-Template: `<rect>` für Hintergrund, pro Layer/Linie ein `<polyline points="...">` mit `stroke`, `stroke-opacity`, `stroke-width`, `fill="none"`.
- Erstellt `Blob` (`image/svg+xml`), triggert Download über einen unsichtbaren `<a download>`-Link.
- Nutzt denselben Linien-Cache wie die Canvas-Anzeige — keine doppelte Berechnung, WYSIWYG-Export.

### `controls.ts`
- Baut das Control-Panel als DOM-Elemente (kein Framework), eingefügt in ein `#controls`-Element in `index.html`.
- **Global:** Layer-Anzahl-Slider (2–5), Hintergrundfarbe (`<input type="color">`), Export-SVG-Button.
- **Pro Layer** (eigener Block, vollständig unabhängig): Farbe, Basiswinkel (0–360°), Noise-Scale, Noise-Stärke, Linienabstand, Strichstärke, Deckkraft — jeweils Slider bzw. Color-Picker.
- Bei Änderung der Layer-Anzahl werden Param-Objekte + UI-Blöcke ergänzt/entfernt; neue Layer erhalten Default-Werte aus einer kleinen Farbpalette mit leicht verschobenem Winkel (Ausgangspunkt zum Experimentieren, kein Anspruch auf "perfekten" Default-Moiré).
- Jede Eingabe ruft einen `onChange`-Callback auf, der State mutiert und `p.redraw()` anstößt.

### `state.ts`
```ts
interface LayerParams {
  color: string;
  baseAngle: number;
  noiseScale: number;
  noiseStrength: number;
  spacing: number;
  weight: number;
  alpha: number;
  seed: number;
}
interface PatternState {
  background: string;
  layers: LayerParams[];
}
```

### `main.ts`
Instance-Mode-Sketch: `setup()` erstellt Canvas (fullscreen, bestehendes Verhalten bleibt), initialisiert `state`, baut Controls, ruft einmal `renderPattern`. `windowResized()` passt Canvas-Größe an und rendert neu.

## Datenfluss

```
Control-Input ändert sich
  → state mutiert (state.ts)
  → p.redraw() ausgelöst
  → render.ts: renderPattern(p, state)
      → pro Layer: lineGenerator.generateLayerLines()
      → zeichnet auf Canvas, cached Ergebnis
  → Export-Button liest gecachte Linien → svgExport.ts baut SVG, Download
```

## UI-Layout

Canvas füllt weiterhin den gesamten Viewport (bestehendes Fullscreen-CSS bleibt unverändert). Das Control-Panel ist eine fixe, scrollbare Sidebar (rechts, `position: fixed`), die über der Canvas liegt, mit halbtransparentem Hintergrund für Lesbarkeit.

## Fehlerbehandlung

Keine besonderen Fehlerfälle erwartet — alle Eingaben sind durch `min`/`max`/`step` auf den `<input>`-Elementen begrenzt, ungültige Zustände können nicht entstehen. Bei 0 Layern (sollte durch Slider-Minimum 2 nicht möglich sein) wird nichts gerendert außer dem Hintergrund.

## Testing

Manuelle Verifikation im Browser (Live Reload): Regler bewegen, Layer-Anzahl ändern, SVG-Export öffnen und visuell mit Canvas-Darstellung vergleichen (WYSIWYG-Check).
