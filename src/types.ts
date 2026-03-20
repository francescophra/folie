export interface BreakpointConfig {
  columns?: number
  gutter?: Spacer
  margin?: Spacer
  row?: number
  rowGutter?: Spacer
  rowMargin?: Spacer
}

export interface FolieOptions {
  columns?: number
  gutter?: Spacer
  margin?:  Spacer
  row?: number
  rowGutter?: Spacer
  rowMargin?: Spacer
  rowColor?: Color
  rowOpacity?: number
  breakpoints?: Record<number, BreakpointConfig>
  color?: Color
  opacity?: Opacity
  zIndex?: number
  shortcut?: string
  showOnStart?: boolean
  toggleButton?: boolean
  mode?: 'fill' | 'outline'
}

type Spacer = CSSUnit | CustomProperty | Var

type CSSUnit =
  | `${number}px` | `${number}pt` | `${number}pc`
  | `${number}cm` | `${number}mm` | `${number}in`
  | `${number}em` | `${number}rem` | `${number}ch` | `${number}ex`
  | `${number}vw` | `${number}vh` | `${number}vmin` | `${number}vmax`
  | `${number}svw` | `${number}svh`
  | `${number}lvw` | `${number}lvh`
  | `${number}dvw` | `${number}dvh`
  | `${number}fr`
  | '0'

type Opacity = '0.1' | '0.2' | '0.3' | '0.4' | '0.5' | '0.6' | '0.7' | '0.8' | '0.9' | '1.0'

type RGB = `rgb(${string})`
type RGBA = `rgba(${string})`
type HEX = `#${string}`
type HSL = `hsl(${string})`
type HSLA = `hsla(${string})`
type Var = `var(${string})`
type CustomProperty = `--${string}`
type Transparent = 'transparent'
type CurrentColor = 'currentColor'

type CssGlobals = 'inherit' | 'initial' | 'revert' | 'unset'

export type Color =
  | CurrentColor
  | Transparent
  | RGB
  | RGBA
  | HEX
  | HSL
  | HSLA
  | Var
  | CustomProperty
  | CssGlobals
