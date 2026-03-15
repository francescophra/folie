# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-03-15

### Added
- Initial release as `folie`
- CSS Grid overlay driven by CSS custom properties (`--fl-columns`, `--fl-gutter`, `--fl-margin`, `--fl-color`, `--fl-opacity`)
- Per-breakpoint config via `breakpoints` option using `MediaQueryList` (no resize listener)
- Top-level shorthand: `columns`, `gutter`, `margin` applied at all widths
- `showOnStart` option (default `true`)
- `toggleButton` option — mounts a 40×40 fixed button
- `color` and `opacity` options
- `shortcut` option (default `ctrl+g`)
- `mount()` / `destroy()` API
- Zero dependencies, plain ESM, no build step
