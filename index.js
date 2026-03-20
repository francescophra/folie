const DEFAULTS = {
  columns: 12,
  gutter: "20px",
  margin: "20px",
  color: "#ff0000",
  opacity: 0.1,
  rowColor: "#ff0000",
  rowOpacity: 0.1,
  zIndex: 2147483647,
  shortcut: "ctrl+g",
  showOnStart: true,
  toggleButton: false,
  mode: "fill",
};

class Folie {
  constructor(options = {}) {
    const {columns, gutter, margin, rows, rowsGutter, rowsMargin, rowColor, rowOpacity, breakpoints, ...rest} = options;

    const hasShorthand = columns !== undefined || gutter !== undefined || margin !== undefined;
    const hasBreakpoints = breakpoints !== undefined && Object.keys(breakpoints).length > 0;

    const defaultBase = {
      columns: DEFAULTS.columns,
      gutter: DEFAULTS.gutter,
      margin: DEFAULTS.margin,
    };

    let resolvedBase, resolvedBreakpoints;

    if (!hasShorthand && !hasBreakpoints) {
      resolvedBase = defaultBase;
      resolvedBreakpoints = {};
    } else if (hasShorthand && !hasBreakpoints) {
      resolvedBase = {
        columns: columns ?? DEFAULTS.columns,
        gutter: gutter ?? DEFAULTS.gutter,
        margin: margin ?? DEFAULTS.margin,
      };
      resolvedBreakpoints = {};
    } else if (!hasShorthand && hasBreakpoints) {
      resolvedBase = defaultBase;
      resolvedBreakpoints = breakpoints;
    } else {
      resolvedBase = {
        columns: columns ?? DEFAULTS.columns,
        gutter: gutter ?? DEFAULTS.gutter,
        margin: margin ?? DEFAULTS.margin,
      };
      resolvedBreakpoints = breakpoints;
    }

    if (rows !== undefined) resolvedBase.rows = rows;
    if (rowsGutter !== undefined) resolvedBase.rowsGutter = rowsGutter;
    if (rowsMargin !== undefined) resolvedBase.rowsMargin = rowsMargin;

    const mode = rest.mode ?? 'fill';
    const opacity = rest.opacity ?? (mode === 'outline' ? 0.5 : DEFAULTS.opacity);
    this._options = {
      ...DEFAULTS, ...rest,
      base: resolvedBase,
      breakpoints: resolvedBreakpoints,
      mode, opacity,
      rowColor: rowColor ?? DEFAULTS.rowColor,
      rowOpacity: rowOpacity ?? DEFAULTS.rowOpacity,
    };
    this._shortcut = this._parseShortcut(this._options.shortcut);
    this._wrapper = null;
    this._rowWrapper = null;
    this._styleEl = null;
    this._toggleBtn = null;
    this._visible = false;
    this._mql = []; // Array<{ mql: MediaQueryList, cfg: object }>
    this._ac = null; // AbortController — owns all listener lifetimes
  }

  mount(container = document.body) {
    if (this._wrapper) return this;
    this._ac = new AbortController();
    this._injectStyles();
    this._createDOM(container);
    if (this._options.toggleButton) this._createToggleButton();
    this._setupMediaQueries();
    this._options.showOnStart ? this._show() : this._hide();
    return this;
  }

  destroy() {
    this._ac?.abort();
    this._ac = null;
    this._mql = [];
    this._wrapper?.remove();
    this._rowWrapper?.remove();
    this._styleEl?.remove();
    this._toggleBtn?.remove();
    this._wrapper = null;
    this._rowWrapper = null;
    this._styleEl = null;
    this._toggleBtn = null;
    this._visible = false;
  }

  // --- private ---

  _show() {
    if (this._wrapper) {
      this._wrapper.style.display = "";
      this._visible = true;
    }
    if (this._rowWrapper) this._rowWrapper.style.display = "";
  }

  _hide() {
    if (this._wrapper) {
      this._wrapper.style.display = "none";
      this._visible = false;
    }
    if (this._rowWrapper) this._rowWrapper.style.display = "none";
  }

  _toggle() {
    this._visible ? this._hide() : this._show();
  }

  _createDOM(container) {
    this._wrapper = document.createElement("div");
    this._wrapper.className = "fl-wrapper";
    this._wrapper.setAttribute("aria-hidden", "true");
    this._wrapper.style.zIndex = String(this._options.zIndex);
    if (this._options.mode === 'outline') this._wrapper.dataset.flMode = 'outline';
    container.appendChild(this._wrapper);

    if (this._options.base.rows !== undefined) {
      this._rowWrapper = document.createElement("div");
      this._rowWrapper.className = "fl-row-wrapper";
      this._rowWrapper.setAttribute("aria-hidden", "true");
      this._rowWrapper.style.zIndex = String(this._options.zIndex);
      container.appendChild(this._rowWrapper);
    }
  }

  _injectStyles() {
    this._styleEl = document.createElement("style");
    this._styleEl.textContent = [".fl-wrapper {", "  position: fixed;", "  inset: 0;", "  pointer-events: none;", "  display: grid;", "  grid-template-columns: repeat(var(--fl-columns), 1fr);", "  gap: var(--fl-gutter);", "  padding: 0 var(--fl-margin);", "}", ".fl-col {", "  height: 100%;", "  background: var(--fl-color);", "  opacity: var(--fl-opacity);", "}", ".fl-row-wrapper {", "  position: fixed;", "  inset: 0;", "  pointer-events: none;", "  display: grid;", "  grid-template-rows: repeat(var(--fl-rows), 1fr);", "  gap: var(--fl-row-gutter);", "  padding: var(--fl-row-margin) 0;", "}", ".fl-row {", "  width: 100%;", "  background: var(--fl-row-color);", "  opacity: var(--fl-row-opacity);", "}", ".fl-toggle {", "  position: fixed;", "  bottom: 0px;", "  left: 0px;", "  width: 40px;", "  height: 40px;", "  background: var(--fl-color);", "  opacity: 0.5;", "  border: none;", "  cursor: pointer;", "  padding: 0;", `  z-index: ${this._options.zIndex};`, "}", ".fl-wrapper[data-fl-mode=\"outline\"] .fl-col {", "  background: transparent;", "  box-shadow: inset 1px 0 0 0 var(--fl-color), inset -1px 0 0 0 var(--fl-color);", "}"].join("\n");
    document.head.appendChild(this._styleEl);
  }

  _createToggleButton() {
    const btn = document.createElement("button");
    btn.className = "fl-toggle";
    btn.type = "button";
    btn.setAttribute("aria-label", "Toggle grid");
    btn.style.setProperty("--fl-color", this._options.color);
    btn.style.setProperty("--fl-opacity", String(this._options.opacity));
    btn.addEventListener("click", () => this._toggle(), {signal: this._ac.signal});
    document.body.appendChild(btn);
    this._toggleBtn = btn;
  }

  _buildRangeQueries() {
    const {base, breakpoints} = this._options;
    const entries = [
      {minPx: 0, cfg: base},
      ...Object.entries(breakpoints).map(([k, cfg]) => ({minPx: Number(k), cfg: {...base, ...cfg}})),
    ].sort((a, b) => a.minPx - b.minPx);

    return entries.map((entry, i) => {
      const next = entries[i + 1];
      const query = next
        ? `(min-width: ${entry.minPx}px) and (max-width: ${next.minPx - 1}px)`
        : `(min-width: ${entry.minPx}px)`;
      return {query, cfg: entry.cfg};
    });
  }

  _setupMediaQueries() {
    const {signal} = this._ac;

    this._mql = this._buildRangeQueries().map(({query, cfg}) => ({
      mql: window.matchMedia(query),
      cfg,
    }));

    // Apply the currently-matching breakpoint immediately
    const initial = this._mql.find(({mql}) => mql.matches) ?? this._mql[this._mql.length - 1];
    if (initial) this._applyBreakpoint(initial.cfg);

    // Fire on future boundary crossings only (e.matches guards the exit event)
    for (const {mql, cfg} of this._mql) {
      mql.addEventListener(
        "change",
        (e) => {
          if (e.matches) this._applyBreakpoint(cfg);
        },
        {signal},
      );
    }

    window.addEventListener("keydown", (e) => this._handleKeydown(e), {signal});
  }

  _applyBreakpoint(cfg) {
    if (!this._wrapper) return;
    const s = this._wrapper.style;
    s.setProperty("--fl-columns", String(cfg.columns));
    s.setProperty("--fl-gutter", cfg.gutter);
    s.setProperty("--fl-margin", cfg.margin);
    s.setProperty("--fl-color", this._options.color);
    s.setProperty("--fl-opacity", String(this._options.opacity));

    if (this._wrapper.childElementCount !== cfg.columns) {
      const frag = document.createDocumentFragment();
      for (let i = 0; i < cfg.columns; i++) {
        const col = document.createElement("div");
        col.className = "fl-col";
        frag.appendChild(col);
      }
      this._wrapper.replaceChildren(frag);
    }

    if (this._rowWrapper && cfg.rows !== undefined) {
      const rs = this._rowWrapper.style;
      rs.setProperty("--fl-rows", String(cfg.rows));
      rs.setProperty("--fl-row-gutter", cfg.rowsGutter);
      rs.setProperty("--fl-row-margin", cfg.rowsMargin);
      rs.setProperty("--fl-row-color", this._options.rowColor);
      rs.setProperty("--fl-row-opacity", String(this._options.rowOpacity));

      if (this._rowWrapper.childElementCount !== cfg.rows) {
        const frag = document.createDocumentFragment();
        for (let i = 0; i < cfg.rows; i++) {
          const row = document.createElement("div");
          row.className = "fl-row";
          frag.appendChild(row);
        }
        this._rowWrapper.replaceChildren(frag);
      }
    }
  }

  _handleKeydown(e) {
    const {ctrl, shift, alt, key} = this._shortcut;
    if (ctrl !== e.ctrlKey || shift !== e.shiftKey || alt !== e.altKey) return;
    if (e.key.toLowerCase() !== key) return;
    e.preventDefault();
    this._toggle();
  }

  _parseShortcut(shortcut) {
    const parts = shortcut
      .toLowerCase()
      .split("+")
      .map((p) => p.trim());
    return {
      ctrl: parts.includes("ctrl"),
      shift: parts.includes("shift"),
      alt: parts.includes("alt"),
      key: parts[parts.length - 1],
    };
  }
}

export default Folie;
