import type {BreakpointConfig, FolieOptions} from './types'

interface ParsedShortcut {
  ctrl: boolean
  shift: boolean
  alt: boolean
  key: string
}

const DEFAULTS = {
  columns: 12,
  gutter: '20px',
  margin: '20px',
  color: '#ff0000',
  opacity: 0.1,
  rowColor: '#ff0000',
  rowOpacity: 0.1,
  zIndex: 2147483647,
  shortcut: 'ctrl+g',
  showOnStart: true,
  toggleButton: false,
  mode: 'fill' as const,
}

interface ResolvedOptions {
  base: BreakpointConfig
  breakpoints: Record<number, BreakpointConfig>
  color: string
  opacity: number
  rowColor: string
  rowOpacity: number
  zIndex: number
  shortcut: string
  showOnStart: boolean
  toggleButton: boolean
  mode: 'fill' | 'outline'
}

class Folie {
  private options: ResolvedOptions
  private wrapper: HTMLElement | null = null
  private rowWrapper: HTMLElement | null = null
  private styleEl: HTMLStyleElement | null = null
  private toggleBtn: HTMLButtonElement | null = null
  private visible = false
  private shortcut: ParsedShortcut
  private mql: Array<{mql: MediaQueryList; cfg: BreakpointConfig}> = []
  private ac: AbortController | null = null

  constructor(opts: FolieOptions = {}) {
    const {columns, gutter, margin, row, rowGutter, rowMargin, rowColor, rowOpacity, breakpoints, ...rest} = opts

    const hasShorthand = columns !== undefined || gutter !== undefined || margin !== undefined
    const hasBreakpoints = breakpoints !== undefined && Object.keys(breakpoints).length > 0

    const defaultBase: BreakpointConfig = {
      columns: DEFAULTS.columns,
      gutter: DEFAULTS.gutter,
      margin: DEFAULTS.margin,
    }

    let resolvedBase: BreakpointConfig
    let resolvedBreakpoints: Record<number, BreakpointConfig>

    if (!hasShorthand && !hasBreakpoints) {
      resolvedBase = defaultBase
      resolvedBreakpoints = {}
    } else if (hasShorthand && !hasBreakpoints) {
      resolvedBase = {
        columns: columns ?? DEFAULTS.columns,
        gutter: gutter ?? DEFAULTS.gutter,
        margin: margin ?? DEFAULTS.margin,
      }
      resolvedBreakpoints = {}
    } else if (!hasShorthand && hasBreakpoints) {
      resolvedBase = defaultBase
      resolvedBreakpoints = breakpoints!
    } else {
      resolvedBase = {
        columns: columns ?? DEFAULTS.columns,
        gutter: gutter ?? DEFAULTS.gutter,
        margin: margin ?? DEFAULTS.margin,
      }
      resolvedBreakpoints = breakpoints!
    }

    if (row !== undefined) resolvedBase.row = row
    if (rowGutter !== undefined) resolvedBase.rowGutter = rowGutter
    if (rowMargin !== undefined) resolvedBase.rowMargin = rowMargin

    const mode = rest.mode ?? 'fill'
    const opacity = rest.opacity ?? (mode === 'outline' ? 0.5 : DEFAULTS.opacity)
    this.options = {
      ...DEFAULTS, ...rest,
      base: resolvedBase,
      breakpoints: resolvedBreakpoints,
      mode, opacity,
      rowColor: rowColor ?? DEFAULTS.rowColor,
      rowOpacity: rowOpacity ?? DEFAULTS.rowOpacity,
    }
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
    this.rowWrapper?.remove()
    this.styleEl?.remove()
    this.toggleBtn?.remove()
    this.wrapper = null
    this.rowWrapper = null
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
    if (this.rowWrapper) this.rowWrapper.style.display = ''
  }

  private hide(): void {
    if (this.wrapper) {
      this.wrapper.style.display = 'none'
      this.visible = false
    }
    if (this.rowWrapper) this.rowWrapper.style.display = 'none'
  }

  private toggle(): void {
    this.visible ? this.hide() : this.show()
  }

  private createDOM(container: HTMLElement): void {
    this.wrapper = document.createElement('div')
    this.wrapper.className = 'fl-wrapper'
    this.wrapper.setAttribute('aria-hidden', 'true')
    this.wrapper.style.zIndex = String(this.options.zIndex)
    if (this.options.mode === 'outline') this.wrapper.dataset.flMode = 'outline'
    container.appendChild(this.wrapper)

    if (this.options.base.row !== undefined) {
      this.rowWrapper = document.createElement('div')
      this.rowWrapper.className = 'fl-row-wrapper'
      this.rowWrapper.setAttribute('aria-hidden', 'true')
      this.rowWrapper.style.zIndex = String(this.options.zIndex)
      container.appendChild(this.rowWrapper)
    }
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
      '.fl-row-wrapper {',
      '  position: fixed;',
      '  inset: 0;',
      '  pointer-events: none;',
      '  display: grid;',
      '  grid-template-rows: repeat(var(--fl-rows), 1fr);',
      '  gap: var(--fl-row-gutter);',
      '  padding: var(--fl-row-margin) 0;',
      '}',
      '.fl-row {',
      '  width: 100%;',
      '  background: var(--fl-row-color);',
      '  opacity: var(--fl-row-opacity);',
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
      '.fl-wrapper[data-fl-mode="outline"] .fl-col {',
      '  background: transparent;',
      '  box-shadow: inset 1px 0 0 0 var(--fl-color), inset -1px 0 0 0 var(--fl-color);',
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
    const {base, breakpoints} = this.options
    const entries = [
      {minPx: 0, cfg: base},
      ...Object.entries(breakpoints).map(([k, cfg]) => ({minPx: Number(k), cfg: {...base, ...cfg}})),
    ].sort((a, b) => a.minPx - b.minPx)

    return entries.map((entry, i) => {
      const next = entries[i + 1]
      const query = next
        ? `(min-width: ${entry.minPx}px) and (max-width: ${next.minPx - 1}px)`
        : `(min-width: ${entry.minPx}px)`
      return {query, cfg: entry.cfg}
    })
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
    s.setProperty('--fl-gutter', cfg.gutter as string)
    s.setProperty('--fl-margin', cfg.margin as string)
    s.setProperty('--fl-color', this.options.color)
    s.setProperty('--fl-opacity', String(this.options.opacity))

    if (this.wrapper.childElementCount !== cfg.columns) {
      const frag = document.createDocumentFragment()
      for (let i = 0; i < cfg.columns!; i++) {
        const col = document.createElement('div')
        col.className = 'fl-col'
        frag.appendChild(col)
      }
      this.wrapper.replaceChildren(frag)
    }

    if (this.rowWrapper && cfg.row !== undefined) {
      const rs = this.rowWrapper.style
      rs.setProperty('--fl-rows', String(cfg.row))
      rs.setProperty('--fl-row-gutter', cfg.rowGutter as string)
      rs.setProperty('--fl-row-margin', cfg.rowMargin as string)
      rs.setProperty('--fl-row-color', this.options.rowColor)
      rs.setProperty('--fl-row-opacity', String(this.options.rowOpacity))

      if (this.rowWrapper.childElementCount !== cfg.row) {
        const frag = document.createDocumentFragment()
        for (let i = 0; i < cfg.row; i++) {
          const row = document.createElement('div')
          row.className = 'fl-row'
          frag.appendChild(row)
        }
        this.rowWrapper.replaceChildren(frag)
      }
    }
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
