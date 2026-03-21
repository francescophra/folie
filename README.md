![folie](folie_cover.png)

# Folie

**[Live demo →](https://francescophra.github.io/folie/)**

Lightweight column grid overlay for the browser. Same columns, gutter, and margin as your Figma layout grid. Toggle it while you build.

## How it works

Figma's Layout Grid panel defines a grid with `columns`, `gutter`, and `margin` — folie uses those exact values. It mounts a fixed, semi-transparent CSS Grid overlay on top of your page, updated on resize for each breakpoint. Toggle it with `Ctrl+G` or an optional button.

## Install

```sh
npm install folie-grid
# or
yarn add folie-grid
```

## Usage

The package ships TypeScript declarations. No `@types/` package needed.

### Minimal — built-in defaults

```js
import Folie from "folie-grid";

new Folie().mount();
```

### Top-level shorthand

Pass `columns`, `gutter`, and `margin` directly — applies at all viewport widths.

```js
// mirror the Figma layout grid
new Folie({
  columns: 12,
  gutter: "10px",
  margin: "20px",
}).mount();
```

### Per-breakpoint config

Use numeric min-width keys. Top-level `columns`/`gutter`/`margin` becomes the base (0px+) config and can be combined with `breakpoints`. All fields are optional — unspecified fields inherit from the base.

```js
new Folie({
  columns: 6, gutter: "10px", margin: "20px", // base: 0px+
  breakpoints: {
    768:  {columns: 8}, // gutter/margin inherited
    1024: {columns: 12, gutter: "20px", margin: "20px"},
  },
}).mount();
```

If `breakpoints` is provided without shorthand, DEFAULTS (`columns: 12, gutter: 20px, margin: 20px`) are used as the base config.

### Row overlay

Add a horizontal row overlay alongside the column grid:

```js
new Folie({
  columns: 12, gutter: "20px", margin: "20px",
  rows: 8, rowsGutter: "20px", rowsMargin: "20px",
  rowsColor: "#0000ff", rowsOpacity: 0.05,
}).mount();
```

Row count can also be overridden per breakpoint:

```js
new Folie({
  columns: 6, gutter: "20px", margin: "20px",
  rows: 6, rowsGutter: "20px", rowsMargin: "20px",
  breakpoints: {
    1024: {columns: 12, rows: 10},
  },
}).mount();
```

### TypeScript

```ts
import Folie, { type FolieOptions, type BreakpointConfig, type Color } from "folie-grid";

const config: FolieOptions = {
  columns: 12,
  gutter: "20px",
  margin: "clamp(16px, 5vw, 80px)",
  breakpoints: {
    768:  { columns: 8 } satisfies BreakpointConfig,
    1280: { columns: 12, gutter: "30px" },
  },
};

const grid = new Folie(config).mount();

// destroy on HMR teardown
if (import.meta.hot) {
  import.meta.hot.dispose(() => grid.destroy());
}
```

## Options

| Option         | Type      | Default      | Description                                                                       |
| -------------- | --------- | ------------ | --------------------------------------------------------------------------------- |
| `columns`      | `number`  | `12`         | Column count at 0px+ (base). Acts as the catch-all when no `breakpoints` are set. |
| `gutter`       | `Spacer`  | `20px`       | Gutter at 0px+ (base).                                                            |
| `margin`       | `Spacer`  | `20px`       | Margin at 0px+ (base).                                                            |
| `breakpoints`  | `object`  | —            | Per-breakpoint config keyed by numeric min-width (px). Can be combined with shorthand. |
| `showOnStart`  | `boolean` | `true`       | Whether the grid is visible immediately on `mount()`                              |
| `toggleButton` | `boolean` | `false`      | When `true`, mounts a 40×40 button fixed to the bottom-left that toggles the grid |
| `rows`         | `number`  | —            | Number of rows. If omitted, no row overlay is rendered.                           |
| `rowsGutter`   | `Spacer`  | —            | Vertical gap between rows.                                                        |
| `rowsMargin`   | `Spacer`  | —            | Top/bottom padding of the row overlay.                                            |
| `rowsColor`    | `Color`   | `#ff0000`    | Row background color (global, not per-breakpoint)                                 |
| `rowsOpacity`  | `number`  | `0.1`        | Row opacity (global, not per-breakpoint)                                          |
| `color`        | `Color`   | `#ff0000`    | Column background color                                                           |
| `opacity`      | `number`  | `0.1`        | Column opacity                                                                    |
| `zIndex`       | `number`  | `2147483647` | z-index of the overlay                                                            |
| `shortcut`     | `string`  | `ctrl+g`     | Keyboard shortcut to toggle visibility                                            |
| `mode`         | `'fill' \| 'outline'` | `'fill'` | `'outline'` renders columns as inset box-shadow borders instead of filled rectangles. When `mode` is `'outline'` and `opacity` is not set, opacity defaults to `0.5` |

### Spacer

Any CSS length value, a CSS custom property, or a `var()` reference:

```
20px · 1.5rem · 2vw · clamp(10px, 2vw, 24px) · var(--my-gutter) · --my-token
```

### Color

Any CSS color value accepted by `background` / `box-shadow`:

```
#ff0000 · rgb(255,0,0) · rgba(255,0,0,0.5) · hsl(0,100%,50%) · transparent · currentColor · var(--brand)
```

## Breakpoint config

Keys are numeric min-widths in px. Ranges are inferred from adjacent keys. `columns`, `gutter`, and `margin` match the Layout Grid fields in Figma's design panel.

| Key           | Type     | Required | Description                                                             |
| ------------- | -------- | -------- | ----------------------------------------------------------------------- |
| `columns`     | `number` | no       | Number of columns — inherits from base if omitted                       |
| `gutter`      | `Spacer` | no       | Gap between columns — inherits from base if omitted                     |
| `margin`      | `Spacer` | no       | Left/right padding — inherits from base if omitted                      |
| `rows`        | `number` | no       | Number of rows — inherits from base if omitted                          |
| `rowsGutter`  | `Spacer` | no       | Vertical gap between rows — inherits from base if omitted               |
| `rowsMargin`  | `Spacer` | no       | Top/bottom padding of the row overlay — inherits from base if omitted   |

### Default base config

When no shorthand is provided, the following is used as the base (0px+):

| columns | gutter | margin |
| ------- | ------ | ------ |
| 12      | 20px   | 20px   |

## CSS custom properties

The overlay is driven by CSS custom properties set on `.fl-wrapper`. You can override them in your own CSS if needed.

| Property            | Description              |
| ------------------- | ------------------------ |
| `--fl-columns`      | Number of columns        |
| `--fl-gutter`       | Gap between columns      |
| `--fl-margin`       | Left/right padding       |
| `--fl-color`        | Column color             |
| `--fl-opacity`      | Column opacity           |
| `--fl-rows`         | Number of rows           |
| `--fl-rows-gutter`   | Vertical gap between rows |
| `--fl-rows-margin`   | Top/bottom padding       |
| `--fl-rows-color`    | Row color                |
| `--fl-rows-opacity`  | Row opacity              |

## API

| Method              | Description                                            |
| ------------------- | ------------------------------------------------------ |
| `mount(container?)` | Attach overlay to container (default: `document.body`) |
| `destroy()`         | Remove overlay, toggle button, and all listeners       |

## Keyboard shortcut

Default: `Ctrl+G`. Toggle visibility. Customise via the `shortcut` option:

```js
new Folie({shortcut: "ctrl+shift+g"});
```

## License

MIT
