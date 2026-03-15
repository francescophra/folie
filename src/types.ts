export interface BreakpointConfig {
  columns: number
  gutter: string
  margin: string
  until?: number
}

export interface FolieOptions {
  columns?: number
  gutter?: string
  margin?: string
  breakpoints?: Record<string, BreakpointConfig>
  color?: string
  opacity?: number
  zIndex?: number
  shortcut?: string
  showOnStart?: boolean
  toggleButton?: boolean
}
