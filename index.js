const DEFAULTS = {
  breakpoints: {
    mobile: {columns: 6, gutter: "10px", margin: "20px", until: 767},
    tablet: {columns: 8, gutter: "10px", margin: "15px", until: 1023},
    desktop: {columns: 12, gutter: "20px", margin: "20px"},
  },
  color: "#ff0000",
  opacity: 0.1,
  zIndex: 2147483647,
  shortcut: "ctrl+g",
  showOnStart: true,
  toggleButton: false,
};

export class Folie {
  constructor(options = {}) {
    const {columns, gutter, margin, breakpoints, ...rest} = options;

    let resolvedBreakpoints;
    if (breakpoints) {
      resolvedBreakpoints = breakpoints;
    } else if (columns !== undefined || gutter !== undefined || margin !== undefined) {
      resolvedBreakpoints = {
        base: {
          columns: columns ?? 12,
          gutter: gutter ?? "20px",
          margin: margin ?? "20px",
        },
      };
    } else {
      resolvedBreakpoints = DEFAULTS.breakpoints;
    }

    this._options = {...DEFAULTS, ...rest, breakpoints: resolvedBreakpoints};
    this._shortcut = this._parseShortcut(this._options.shortcut);
    this._wrapper = null;
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
    this._styleEl?.remove();
    this._toggleBtn?.remove();
    this._wrapper = null;
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
  }

  _hide() {
    if (this._wrapper) {
      this._wrapper.style.display = "none";
      this._visible = false;
    }
  }

  _toggle() {
    this._visible ? this._hide() : this._show();
  }

  _createDOM(container) {
    this._wrapper = document.createElement("div");
    this._wrapper.className = "fl-wrapper";
    this._wrapper.setAttribute("aria-hidden", "true");
    this._wrapper.style.zIndex = String(this._options.zIndex);
    container.appendChild(this._wrapper);
  }

  _injectStyles() {
    this._styleEl = document.createElement("style");
    this._styleEl.textContent = [".fl-wrapper {", "  position: fixed;", "  inset: 0;", "  pointer-events: none;", "  display: grid;", "  grid-template-columns: repeat(var(--fl-columns), 1fr);", "  gap: var(--fl-gutter);", "  padding: 0 var(--fl-margin);", "}", ".fl-col {", "  height: 100%;", "  background: var(--fl-color);", "  opacity: var(--fl-opacity);", "}", ".fl-toggle {", "  position: fixed;", "  bottom: 0px;", "  left: 0px;", "  width: 40px;", "  height: 40px;", "  background: var(--fl-color);", "  opacity: 0.5;", "  border: none;", "  cursor: pointer;", "  padding: 0;", `  z-index: ${this._options.zIndex};`, "}"].join("\n");
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
    const values = Object.values(this._options.breakpoints);
    const bounded = values.filter((cfg) => cfg.until !== undefined).sort((a, b) => a.until - b.until);
    const catchAll = values.find((cfg) => cfg.until === undefined);

    const ranges = [];

    for (let i = 0; i < bounded.length; i++) {
      const cfg = bounded[i];
      const minPx = i === 0 ? 0 : bounded[i - 1].until + 1;
      const query = `(min-width: ${minPx}px) and (max-width: ${cfg.until}px)`;
      ranges.push({query, cfg});
    }

    if (catchAll) {
      const last = bounded[bounded.length - 1];
      const query = last ? `(min-width: ${last.until + 1}px)` : "(min-width: 0px)";
      ranges.push({query, cfg: catchAll});
    }

    return ranges;
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

    if (this._wrapper.childElementCount === cfg.columns) return;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < cfg.columns; i++) {
      const col = document.createElement("div");
      col.className = "fl-col";
      frag.appendChild(col);
    }
    this._wrapper.replaceChildren(frag);
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
