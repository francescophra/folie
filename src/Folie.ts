import type {BreakpointConfig, FolieOptions} from './types'

interface ParsedShortcut {
  ctrl: boolean
  shift: boolean
  alt: boolean
  key: string
}

const DEFAULTS = {
  breakpoints: {
    mobile: {columns: 6, gutter: '10px', margin: '20px', until: 767},
    tablet: {columns: 8, gutter: '10px', margin: '15px', until: 1023},
    desktop: {columns: 12, gutter: '20px', margin: '20px'},
  },
  color: '#ff0000',
  opacity: 0.1,
  zIndex: 2147483647,
  shortcut: 'ctrl+g',
  showOnStart: true,
  toggleButton: false,
}

interface ResolvedOptions {
  breakpoints: Record<string, BreakpointConfig>
  color: string
  opacity: number
  zIndex: number
  shortcut: string
  showOnStart: boolean
  toggleButton: boolean
}

export class Folie {
  private _options: ResolvedOptions
  private _wrapper: HTMLElement | null = null
  private _styleEl: HTMLStyleElement | null = null
  private _toggleBtn: HTMLButtonElement | null = null
  private _visible = false
  private _shortcut: ParsedShortcut
  private _mql: Array<{mql: MediaQueryList; cfg: BreakpointConfig}> = []
  private _ac: AbortController | null = null

  constructor(options: FolieOptions = {}) {
    const {columns, gutter, margin, breakpoints, ...rest} = options

    let resolvedBreakpoints: Record<string, BreakpointConfig>
    if (breakpoints) {
      resolvedBreakpoints = breakpoints
    } else if (columns !== undefined || gutter !== undefined || margin !== undefined) {
      resolvedBreakpoints = {
        base: {
          columns: columns ?? 12,
          gutter: gutter ?? '20px',
          margin: margin ?? '20px',
        },
      }
    } else {
      resolvedBreakpoints = DEFAULTS.breakpoints
    }

    this._options = {...DEFAULTS, ...rest, breakpoints: resolvedBreakpoints}
    this._shortcut = this._parseShortcut(this._options.shortcut)
  }

  mount(container: HTMLElement = document.body): this {
    if (this._wrapper) return this
    this._ac = new AbortController()
    this._injectStyles()
    this._createDOM(container)
    if (this._options.toggleButton) this._createToggleButton()
    this._setupMediaQueries()
    this._options.showOnStart ? this._show() : this._hide()
    return this
  }

  destroy(): void {
    this._ac?.abort()
    this._ac = null
    this._mql = []
    this._wrapper?.remove()
    this._styleEl?.remove()
    this._toggleBtn?.remove()
    this._wrapper = null
    this._styleEl = null
    this._toggleBtn = null
    this._visible = false
  }

  // --- private ---

  private _show(): void {
    if (this._wrapper) {
      this._wrapper.style.display = ''
      this._visible = true
    }
  }

  private _hide(): void {
    if (this._wrapper) {
      this._wrapper.style.display = 'none'
      this._visible = false
    }
  }

  private _toggle(): void {
    this._visible ? this._hide() : this._show()
  }

  private _createDOM(container: HTMLElement): void {
    this._wrapper = document.createElement('div')
    this._wrapper.className = 'fl-wrapper'
    this._wrapper.setAttribute('aria-hidden', 'true')
    this._wrapper.style.zIndex = String(this._options.zIndex)
    container.appendChild(this._wrapper)
  }

  private _injectStyles(): void {
    this._styleEl = document.createElement('style')
    this._styleEl.textContent = [
      '.fl-wrapper {',
      '  position: fixed;',
      '  inset: 0;',
      '  pointer-events: none;',
      '  display: grid;',
      '  grid-template-columns: repeat(var(--fl-columns), 1fr);',
      '  gap: var(--fl-gutter);',
      '  padding: 0 var(--fl-margin);',
      '}',
      '.fl-col {',
      '  height: 100%;',
      '  background: var(--fl-color);',
      '  opacity: var(--fl-opacity);',
      '}',
      '.fl-toggle {',
      '  position: fixed;',
      '  bottom: 0px;',
      '  left: 0px;',
      '  width: 40px;',
      '  height: 40px;',
      '  background: var(--fl-color);',
      '  opacity: 0.5;',
      '  border: none;',
      '  cursor: pointer;',
      '  padding: 0;',
      `  z-index: ${DEFAULTS.zIndex};`,
      '}',
    ].join('\n')
    document.head.appendChild(this._styleEl)
  }

  private _createToggleButton(): void {
    const btn = document.createElement('button')
    btn.className = 'fl-toggle'
    btn.type = 'button'
    btn.setAttribute('aria-label', 'Toggle grid')
    btn.style.setProperty('--fl-color', this._options.color)
    btn.style.setProperty('--fl-opacity', String(this._options.opacity))
    btn.addEventListener('click', () => this._toggle(), {signal: this._ac!.signal})
    document.body.appendChild(btn)
    this._toggleBtn = btn
  }

  private _buildRangeQueries(): Array<{query: string; cfg: BreakpointConfig}> {
    const values = Object.values(this._options.breakpoints)
    const bounded = values
      .filter((cfg): cfg is BreakpointConfig & {until: number} => cfg.until !== undefined)
      .sort((a, b) => a.until - b.until)
    const catchAll = values.find((cfg) => cfg.until === undefined)

    const ranges: Array<{query: string; cfg: BreakpointConfig}> = []

    for (let i = 0; i < bounded.length; i++) {
      const cfg = bounded[i]
      const minPx = i === 0 ? 0 : bounded[i - 1].until + 1
      const query = `(min-width: ${minPx}px) and (max-width: ${cfg.until}px)`
      ranges.push({query, cfg})
    }

    if (catchAll) {
      const last = bounded[bounded.length - 1]
      const query = last ? `(min-width: ${last.until + 1}px)` : '(min-width: 0px)'
      ranges.push({query, cfg: catchAll})
    }

    return ranges
  }

  private _setupMediaQueries(): void {
    const {signal} = this._ac!

    this._mql = this._buildRangeQueries().map(({query, cfg}) => ({
      mql: window.matchMedia(query),
      cfg,
    }))

    const initial = this._mql.find(({mql}) => mql.matches)
    if (initial) this._applyBreakpoint(initial.cfg)

    for (const {mql, cfg} of this._mql) {
      mql.addEventListener(
        'change',
        (e) => {
          if (e.matches) this._applyBreakpoint(cfg)
        },
        {signal},
      )
    }

    window.addEventListener('keydown', (e) => this._handleKeydown(e), {signal})
  }

  private _applyBreakpoint(cfg: BreakpointConfig): void {
    if (!this._wrapper) return
    const s = this._wrapper.style
    s.setProperty('--fl-columns', String(cfg.columns))
    s.setProperty('--fl-gutter', cfg.gutter)
    s.setProperty('--fl-margin', cfg.margin)
    s.setProperty('--fl-color', this._options.color)
    s.setProperty('--fl-opacity', String(this._options.opacity))

    if (this._wrapper.childElementCount === cfg.columns) return
    const frag = document.createDocumentFragment()
    for (let i = 0; i < cfg.columns; i++) {
      const col = document.createElement('div')
      col.className = 'fl-col'
      frag.appendChild(col)
    }
    this._wrapper.replaceChildren(frag)
  }

  private _handleKeydown(e: KeyboardEvent): void {
    const {ctrl, shift, alt, key} = this._shortcut
    if (ctrl !== e.ctrlKey || shift !== e.shiftKey || alt !== e.altKey) return
    if (e.key.toLowerCase() !== key) return
    e.preventDefault()
    this._toggle()
  }

  private _parseShortcut(shortcut: string): ParsedShortcut {
    const parts = shortcut
      .toLowerCase()
      .split('+')
      .map((p) => p.trim())
    return {
      ctrl: parts.includes('ctrl'),
      shift: parts.includes('shift'),
      alt: parts.includes('alt'),
      key: parts[parts.length - 1],
    }
  }
}

export default Folie
