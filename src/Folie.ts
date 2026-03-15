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
  private options: ResolvedOptions
  private wrapper: HTMLElement | null = null
  private styleEl: HTMLStyleElement | null = null
  private toggleBtn: HTMLButtonElement | null = null
  private visible = false
  private shortcut: ParsedShortcut
  private mql: Array<{mql: MediaQueryList; cfg: BreakpointConfig}> = []
  private ac: AbortController | null = null

  constructor(opts: FolieOptions = {}) {
    const {columns, gutter, margin, breakpoints, ...rest} = opts

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

    this.options = {...DEFAULTS, ...rest, breakpoints: resolvedBreakpoints}
    this.shortcut = this.parseShortcut(this.options.shortcut)
  }

  mount(container: HTMLElement = document.body): this {
    if (this.wrapper) return this
    this.ac = new AbortController()
    this.injectStyles()
    this.createDOM(container)
    if (this.options.toggleButton) this.createToggleButton()
    this.setupMediaQueries()
    this.options.showOnStart ? this.show() : this.hide()
    return this
  }

  destroy(): void {
    this.ac?.abort()
    this.ac = null
    this.mql = []
    this.wrapper?.remove()
    this.styleEl?.remove()
    this.toggleBtn?.remove()
    this.wrapper = null
    this.styleEl = null
    this.toggleBtn = null
    this.visible = false
  }

  // --- private ---

  private show(): void {
    if (this.wrapper) {
      this.wrapper.style.display = ''
      this.visible = true
    }
  }

  private hide(): void {
    if (this.wrapper) {
      this.wrapper.style.display = 'none'
      this.visible = false
    }
  }

  private toggle(): void {
    this.visible ? this.hide() : this.show()
  }

  private createDOM(container: HTMLElement): void {
    this.wrapper = document.createElement('div')
    this.wrapper.className = 'fl-wrapper'
    this.wrapper.setAttribute('aria-hidden', 'true')
    this.wrapper.style.zIndex = String(this.options.zIndex)
    container.appendChild(this.wrapper)
  }

  private injectStyles(): void {
    this.styleEl = document.createElement('style')
    this.styleEl.textContent = [
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
      `  z-index: ${this.options.zIndex};`,
      '}',
    ].join('\n')
    document.head.appendChild(this.styleEl)
  }

  private createToggleButton(): void {
    const btn = document.createElement('button')
    btn.className = 'fl-toggle'
    btn.type = 'button'
    btn.setAttribute('aria-label', 'Toggle grid')
    btn.style.setProperty('--fl-color', this.options.color)
    btn.style.setProperty('--fl-opacity', String(this.options.opacity))
    btn.addEventListener('click', () => this.toggle(), {signal: this.ac!.signal})
    document.body.appendChild(btn)
    this.toggleBtn = btn
  }

  private buildRangeQueries(): Array<{query: string; cfg: BreakpointConfig}> {
    const values = Object.values(this.options.breakpoints)
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

  private setupMediaQueries(): void {
    const {signal} = this.ac!

    this.mql = this.buildRangeQueries().map(({query, cfg}) => ({
      mql: window.matchMedia(query),
      cfg,
    }))

    const initial = this.mql.find(({mql}) => mql.matches) ?? this.mql[this.mql.length - 1]
    if (initial) this.applyBreakpoint(initial.cfg)

    for (const {mql, cfg} of this.mql) {
      mql.addEventListener(
        'change',
        (e) => {
          if (e.matches) this.applyBreakpoint(cfg)
        },
        {signal},
      )
    }

    window.addEventListener('keydown', (e) => this.handleKeydown(e), {signal})
  }

  private applyBreakpoint(cfg: BreakpointConfig): void {
    if (!this.wrapper) return
    const s = this.wrapper.style
    s.setProperty('--fl-columns', String(cfg.columns))
    s.setProperty('--fl-gutter', cfg.gutter)
    s.setProperty('--fl-margin', cfg.margin)
    s.setProperty('--fl-color', this.options.color)
    s.setProperty('--fl-opacity', String(this.options.opacity))

    if (this.wrapper.childElementCount === cfg.columns) return
    const frag = document.createDocumentFragment()
    for (let i = 0; i < cfg.columns; i++) {
      const col = document.createElement('div')
      col.className = 'fl-col'
      frag.appendChild(col)
    }
    this.wrapper.replaceChildren(frag)
  }

  private handleKeydown(e: KeyboardEvent): void {
    const {ctrl, shift, alt, key} = this.shortcut
    if (ctrl !== e.ctrlKey || shift !== e.shiftKey || alt !== e.altKey) return
    if (e.key.toLowerCase() !== key) return
    e.preventDefault()
    this.toggle()
  }

  private parseShortcut(shortcut: string): ParsedShortcut {
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
