import {beforeEach, afterEach, describe, it, expect} from 'vitest'
import Folie from '../index.js'

let folie

beforeEach(() => {
  document.head.innerHTML = ''
  document.body.innerHTML = ''
})

afterEach(() => {
  folie?.destroy()
  folie = null
})

// --- DOM: mount and destroy ---

describe('mount', () => {
  it('appends .fl-wrapper to document.body by default', () => {
    folie = new Folie({columns: 4}).mount()
    expect(document.body.querySelector('.fl-wrapper')).not.toBeNull()
  })

  it('appends .fl-wrapper to a custom container', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    folie = new Folie({columns: 4}).mount(container)
    expect(container.querySelector('.fl-wrapper')).not.toBeNull()
  })

  it('injects a <style> tag into document.head', () => {
    folie = new Folie({columns: 4}).mount()
    expect(document.head.querySelector('style')).not.toBeNull()
  })

  it('is idempotent — second mount does not duplicate elements', () => {
    folie = new Folie({columns: 4}).mount()
    folie.mount()
    expect(document.body.querySelectorAll('.fl-wrapper').length).toBe(1)
    expect(document.head.querySelectorAll('style').length).toBe(1)
  })
})

describe('destroy', () => {
  it('removes wrapper, style tag, and toggle button', () => {
    folie = new Folie({columns: 4, toggleButton: true}).mount()
    folie.destroy()
    folie = null
    expect(document.body.querySelector('.fl-wrapper')).toBeNull()
    expect(document.head.querySelector('style')).toBeNull()
    expect(document.body.querySelector('.fl-toggle')).toBeNull()
  })
})

// --- Columns ---

describe('columns', () => {
  it('{columns: 4} renders 4 .fl-col divs', () => {
    folie = new Folie({columns: 4}).mount()
    expect(document.querySelectorAll('.fl-col').length).toBe(4)
  })

  it('{columns: 12} renders 12 .fl-col divs', () => {
    folie = new Folie({columns: 12}).mount()
    expect(document.querySelectorAll('.fl-col').length).toBe(12)
  })
})

// --- Spacer values (gutter / margin) ---

describe('Spacer values', () => {
  const cases = [
    ['px',  '20px'],
    ['rem', '1.5rem'],
    ['vw',  '2vw'],
    ['var()', 'var(--my-gutter)'],
  ]

  for (const [label, value] of cases) {
    it(`accepts ${label} as gutter`, () => {
      folie = new Folie({columns: 4, gutter: value, margin: '20px'}).mount()
      expect(document.querySelector('.fl-wrapper').style.getPropertyValue('--fl-gutter')).toBe(value)
    })

    it(`accepts ${label} as margin`, () => {
      folie = new Folie({columns: 4, gutter: '20px', margin: value}).mount()
      expect(document.querySelector('.fl-wrapper').style.getPropertyValue('--fl-margin')).toBe(value)
    })
  }
})

// --- Color values ---

describe('Color values', () => {
  const cases = [
    ['hex',         '#00ff00'],
    ['rgb()',       'rgb(0,255,0)'],
    ['rgba()',      'rgba(0,255,0,0.5)'],
    ['hsl()',       'hsl(120,100%,50%)'],
    ['transparent', 'transparent'],
    ['var()',       'var(--brand)'],
  ]

  for (const [label, value] of cases) {
    it(`accepts ${label} as color`, () => {
      folie = new Folie({columns: 4, color: value}).mount()
      expect(document.querySelector('.fl-wrapper').style.getPropertyValue('--fl-color')).toBe(value)
    })
  }
})

// --- CSS custom properties ---

describe('CSS custom properties', () => {
  it('sets --fl-columns correctly', () => {
    folie = new Folie({columns: 6, gutter: '16px', margin: '24px'}).mount()
    const wrapper = document.querySelector('.fl-wrapper')
    expect(wrapper.style.getPropertyValue('--fl-columns')).toBe('6')
  })

  it('sets --fl-gutter correctly', () => {
    folie = new Folie({columns: 4, gutter: '16px', margin: '24px'}).mount()
    const wrapper = document.querySelector('.fl-wrapper')
    expect(wrapper.style.getPropertyValue('--fl-gutter')).toBe('16px')
  })

  it('sets --fl-margin correctly', () => {
    folie = new Folie({columns: 4, gutter: '16px', margin: '24px'}).mount()
    const wrapper = document.querySelector('.fl-wrapper')
    expect(wrapper.style.getPropertyValue('--fl-margin')).toBe('24px')
  })

  it('sets --fl-color correctly', () => {
    folie = new Folie({columns: 4, color: '#00ff00'}).mount()
    const wrapper = document.querySelector('.fl-wrapper')
    expect(wrapper.style.getPropertyValue('--fl-color')).toBe('#00ff00')
  })

  it('sets --fl-opacity correctly', () => {
    folie = new Folie({columns: 4, opacity: 0.2}).mount()
    const wrapper = document.querySelector('.fl-wrapper')
    expect(wrapper.style.getPropertyValue('--fl-opacity')).toBe('0.2')
  })
})

// --- Mode ---

describe('mode', () => {
  it('default (fill) — no data-fl-mode attribute on wrapper', () => {
    folie = new Folie({columns: 4}).mount()
    const wrapper = document.querySelector('.fl-wrapper')
    expect(wrapper.dataset.flMode).toBeUndefined()
  })

  it('{mode: "outline"} sets data-fl-mode="outline" on wrapper', () => {
    folie = new Folie({columns: 4, mode: 'outline'}).mount()
    const wrapper = document.querySelector('.fl-wrapper')
    expect(wrapper.dataset.flMode).toBe('outline')
  })

  it('{mode: "outline"} uses default opacity of 0.5', () => {
    folie = new Folie({columns: 4, mode: 'outline'}).mount()
    const wrapper = document.querySelector('.fl-wrapper')
    expect(wrapper.style.getPropertyValue('--fl-opacity')).toBe('0.5')
  })
})

// --- Visibility ---

describe('visibility', () => {
  it('{showOnStart: true} (default) — wrapper is visible', () => {
    folie = new Folie({columns: 4, showOnStart: true}).mount()
    const wrapper = document.querySelector('.fl-wrapper')
    expect(wrapper.style.display).not.toBe('none')
  })

  it('{showOnStart: false} — wrapper has display: none', () => {
    folie = new Folie({columns: 4, showOnStart: false}).mount()
    const wrapper = document.querySelector('.fl-wrapper')
    expect(wrapper.style.display).toBe('none')
  })
})

// --- Breakpoints (numeric key API) ---

describe('breakpoints', () => {
  it('combined shorthand + breakpoints — highest breakpoint applied in jsdom (matchMedia always false)', () => {
    folie = new Folie({
      columns: 4, gutter: '10px', margin: '20px',
      breakpoints: {1024: {columns: 8, gutter: '20px', margin: '30px'}},
    }).mount()
    const wrapper = document.querySelector('.fl-wrapper')
    expect(wrapper.style.getPropertyValue('--fl-columns')).toBe('8')
  })

  it('breakpoints only — DEFAULTS used as base; highest breakpoint applied in jsdom', () => {
    folie = new Folie({
      breakpoints: {1024: {columns: 8, gutter: '20px', margin: '30px'}},
    }).mount()
    const wrapper = document.querySelector('.fl-wrapper')
    expect(wrapper.style.getPropertyValue('--fl-columns')).toBe('8')
  })

  it('partial breakpoint inherits gutter and margin from base', () => {
    folie = new Folie({
      columns: 6, gutter: '10px', margin: '20px',
      breakpoints: {1024: {columns: 12}},
    }).mount()
    const wrapper = document.querySelector('.fl-wrapper')
    expect(wrapper.style.getPropertyValue('--fl-gutter')).toBe('10px')
    expect(wrapper.style.getPropertyValue('--fl-margin')).toBe('20px')
  })

  it('_buildRangeQueries — bounded ranges for all but last, open-ended for last', () => {
    const f = new Folie({
      columns: 4,
      breakpoints: {
        768: {columns: 8, gutter: '20px', margin: '15px'},
        1024: {columns: 12, gutter: '30px', margin: '20px'},
      },
    })
    const ranges = f._buildRangeQueries()
    expect(ranges[0].query).toBe('(min-width: 0px) and (max-width: 767px)')
    expect(ranges[1].query).toBe('(min-width: 768px) and (max-width: 1023px)')
    expect(ranges[2].query).toBe('(min-width: 1024px)')
  })
})

// --- Rows ---

describe('rows', () => {
  it('without rows — no .fl-row-wrapper in document', () => {
    folie = new Folie({columns: 4}).mount()
    expect(document.querySelector('.fl-row-wrapper')).toBeNull()
  })

  it('{rows: 4} renders 4 .fl-row divs', () => {
    folie = new Folie({columns: 4, rows: 4, rowsGutter: '10px', rowsMargin: '10px'}).mount()
    expect(document.querySelectorAll('.fl-row').length).toBe(4)
  })

  it('sets --fl-rows, --fl-row-gutter, --fl-row-margin correctly', () => {
    folie = new Folie({columns: 4, rows: 6, rowsGutter: '16px', rowsMargin: '24px'}).mount()
    const rw = document.querySelector('.fl-row-wrapper')
    expect(rw.style.getPropertyValue('--fl-rows')).toBe('6')
    expect(rw.style.getPropertyValue('--fl-row-gutter')).toBe('16px')
    expect(rw.style.getPropertyValue('--fl-row-margin')).toBe('24px')
  })

  it('sets --fl-row-color and --fl-row-opacity correctly', () => {
    folie = new Folie({columns: 4, rows: 4, rowsGutter: '10px', rowsMargin: '10px', rowColor: '#0000ff', rowOpacity: 0.05}).mount()
    const rw = document.querySelector('.fl-row-wrapper')
    expect(rw.style.getPropertyValue('--fl-row-color')).toBe('#0000ff')
    expect(rw.style.getPropertyValue('--fl-row-opacity')).toBe('0.05')
  })

  it('partial breakpoint inherits rowsGutter and rowsMargin from base', () => {
    folie = new Folie({
      columns: 4, rows: 6, rowsGutter: '10px', rowsMargin: '20px',
      breakpoints: {1024: {rows: 10}},
    }).mount()
    const rw = document.querySelector('.fl-row-wrapper')
    expect(rw.style.getPropertyValue('--fl-row-gutter')).toBe('10px')
    expect(rw.style.getPropertyValue('--fl-row-margin')).toBe('20px')
  })
})

// --- Toggle button ---

describe('toggleButton', () => {
  it('{toggleButton: false} (default) — no .fl-toggle in document', () => {
    folie = new Folie({columns: 4}).mount()
    expect(document.querySelector('.fl-toggle')).toBeNull()
  })

  it('{toggleButton: true} — .fl-toggle is created in document.body', () => {
    folie = new Folie({columns: 4, toggleButton: true}).mount()
    expect(document.body.querySelector('.fl-toggle')).not.toBeNull()
  })
})
