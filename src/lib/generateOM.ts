/**
 * generateOM.ts
 * Institutional OM/BOV PPTX generator using pptxgenjs
 * Slides: Cover · Exec Summary · Financials · Unit Mix · Comp Charts · Photo Grid · Broker Bios
 */
import PptxGenJS from 'pptxgenjs'
import type { Property, CompFeedItem } from '../types'

// ── Brand ─────────────────────────────────────────────────────
const C = {
  navy:    '1B2A4A',
  slate:   '0F172A',
  gold:    'C5963A',
  teal:    '3B9CB5',
  white:   'F8FAFC',
  gray:    '94A3B8',
  lightBg: '1E2D4F',
  darkBg:  '0F172A',
  red:     'EF4444',
  green:   '22C55E',
}

// ── Formatting ────────────────────────────────────────────────
const fmt$ = (v?: number | null) => v == null ? 'N/A' : `$${Math.round(v).toLocaleString()}`
const fmtPct = (v?: number | null, dec = 2) => v == null ? 'N/A' : `${Number(v).toFixed(dec)}%`
const fmtNum = (v?: number | null) => v == null ? 'N/A' : Math.round(v).toLocaleString()

// ── Slide dimensions (widescreen 10" × 5.625") ────────────────
const W = 10
const H = 5.625

// ── Helper: add branded slide background ─────────────────────
function addBg(slide: PptxGenJS.Slide, dark = true) {
  slide.addShape('rect', {
    x: 0, y: 0, w: W, h: H,
    fill: { color: dark ? C.slate : C.navy },
    line: { color: C.slate, width: 0 },
  })
}

// ── Helper: gold accent bar ───────────────────────────────────
function goldBar(slide: PptxGenJS.Slide, y: number, w = W) {
  slide.addShape('rect', { x: 0, y, w, h: 0.04, fill: { color: C.gold }, line: { color: C.gold, width: 0 } })
}

// ── Helper: section label ─────────────────────────────────────
function sectionLabel(slide: PptxGenJS.Slide, text: string, x: number, y: number, color = C.gold) {
  slide.addText(text.toUpperCase(), {
    x, y, w: 4, h: 0.2,
    fontSize: 7, bold: true, color,
    fontFace: 'Calibri', charSpacing: 3,
  })
}

// ── Helper: metric box ────────────────────────────────────────
function metricBox(
  slide: PptxGenJS.Slide,
  label: string, value: string, sub: string,
  x: number, y: number, w = 2.2, h = 0.9,
  highlight = false
) {
  slide.addShape('rect', {
    x, y, w, h,
    fill: { color: highlight ? C.gold : C.lightBg },
    line: { color: highlight ? C.gold : '2D3F5E', width: 1 },
  })
  slide.addText(label.toUpperCase(), {
    x: x + 0.1, y: y + 0.08, w: w - 0.2, h: 0.15,
    fontSize: 6, bold: true, color: highlight ? C.slate : C.gray,
    fontFace: 'Calibri', charSpacing: 2,
  })
  slide.addText(value, {
    x: x + 0.1, y: y + 0.22, w: w - 0.2, h: 0.35,
    fontSize: 16, bold: true, color: highlight ? C.slate : C.white,
    fontFace: 'Calibri',
  })
  if (sub) {
    slide.addText(sub, {
      x: x + 0.1, y: y + 0.68, w: w - 0.2, h: 0.15,
      fontSize: 7, color: highlight ? C.slate : C.gray,
      fontFace: 'Calibri',
    })
  }
}

// ── Slide 1: Cover ────────────────────────────────────────────
function addCoverSlide(pptx: PptxGenJS, prop: Property, heroImageUrl?: string) {
  const slide = pptx.addSlide()
  addBg(slide)

  // Left dark panel
  slide.addShape('rect', { x: 0, y: 0, w: 4.5, h: H, fill: { color: C.navy }, line: { color: C.navy, width: 0 } })

  // Hero image (right side)
  if (heroImageUrl) {
    try {
      slide.addImage({ path: heroImageUrl, x: 4.5, y: 0, w: 5.5, h: H, sizing: { type: 'cover', w: 5.5, h: H } })
    } catch { /* skip if image fails */ }
  } else {
    slide.addShape('rect', { x: 4.5, y: 0, w: 5.5, h: H, fill: { color: C.lightBg }, line: { color: C.lightBg, width: 0 } })
    slide.addText('PROPERTY PHOTO', { x: 4.5, y: 2.5, w: 5.5, h: 0.5, align: 'center', fontSize: 12, color: C.gray, fontFace: 'Calibri' })
  }

  // Gradient overlay on right
  slide.addShape('rect', { x: 4.5, y: 0, w: 2, h: H, fill: { color: C.navy, transparency: 30 }, line: { color: C.navy, width: 0 } })

  // Gold top bar
  goldBar(slide, 0)

  // Logo / firm name
  slide.addText('YOUNGLEWI N ADVISORS', {
    x: 0.3, y: 0.25, w: 3.8, h: 0.25,
    fontSize: 9, bold: true, color: C.gold,
    fontFace: 'Calibri', charSpacing: 4,
  })

  // Offering label
  slide.addText('OFFERING MEMORANDUM', {
    x: 0.3, y: 0.65, w: 3.8, h: 0.2,
    fontSize: 7, color: C.gray,
    fontFace: 'Calibri', charSpacing: 3,
  })

  // Property name
  slide.addText(prop.name, {
    x: 0.3, y: 1.05, w: 3.8, h: 0.8,
    fontSize: 22, bold: true, color: C.white,
    fontFace: 'Calibri', wrap: true,
  })

  // Address
  slide.addText(prop.address, {
    x: 0.3, y: 1.95, w: 3.8, h: 0.3,
    fontSize: 10, color: C.gray,
    fontFace: 'Calibri',
  })

  goldBar(slide, 2.35, 3.8)

  // Key metrics
  const metrics = [
    { label: 'Asking Price', value: fmt$(prop.price) },
    { label: 'Cap Rate',     value: fmtPct(prop.cap_rate) },
    { label: 'Total Units',  value: fmtNum(prop.num_units) },
    { label: 'Year Built',   value: String(prop.year_built ?? 'N/A') },
  ]
  metrics.forEach((m, i) => {
    const y = 2.55 + i * 0.55
    slide.addText(m.label.toUpperCase(), { x: 0.3, y, w: 1.5, h: 0.18, fontSize: 6, color: C.gray, fontFace: 'Calibri', charSpacing: 2 })
    slide.addText(m.value, { x: 0.3, y: y + 0.17, w: 3.8, h: 0.28, fontSize: 14, bold: true, color: C.white, fontFace: 'Calibri' })
  })

  // Bottom disclaimer
  slide.addText('CONFIDENTIAL — NOT FOR DISTRIBUTION WITHOUT EXECUTED NDA', {
    x: 0, y: H - 0.22, w: W, h: 0.22,
    align: 'center', fontSize: 6, color: C.gray,
    fontFace: 'Calibri', charSpacing: 2,
    fill: { color: C.slate },
  })
}

// ── Slide 2: Executive Summary ────────────────────────────────
function addExecSummarySlide(pptx: PptxGenJS, prop: Property) {
  const slide = pptx.addSlide()
  addBg(slide)
  goldBar(slide, 0)

  slide.addText('EXECUTIVE SUMMARY', {
    x: 0.4, y: 0.15, w: 9, h: 0.35,
    fontSize: 18, bold: true, color: C.white, fontFace: 'Calibri',
  })
  slide.addText(prop.name, {
    x: 0.4, y: 0.5, w: 9, h: 0.25,
    fontSize: 11, color: C.gold, fontFace: 'Calibri',
  })

  goldBar(slide, 0.78)

  // Investment highlights
  sectionLabel(slide, 'Investment Highlights', 0.4, 0.9)
  const highlights = [
    `${prop.num_units}-unit ${prop.property_type} asset in ${prop.city}, ${prop.state}`,
    `${prop.zoning ?? 'N/A'} zoning — ${prop.lot_size_sf ? prop.lot_size_sf.toLocaleString() + ' SF lot' : 'N/A'}`,
    `${prop.building_size_sf ? prop.building_size_sf.toLocaleString() + ' SF' : 'N/A'} of rentable area built in ${prop.year_built ?? 'N/A'}`,
    `Priced at ${fmt$(prop.price_per_unit)}/unit and ${fmt$(prop.price_per_sf)}/SF`,
    `${fmtPct(prop.cap_rate)} cap rate with ${prop.grm?.toFixed(2) ?? 'N/A'}x GRM`,
    'Ideal 1031 exchange or value-add repositioning opportunity',
  ]
  highlights.forEach((h, i) => {
    slide.addText(`• ${h}`, {
      x: 0.4, y: 1.1 + i * 0.28, w: 5.5, h: 0.25,
      fontSize: 9, color: C.white, fontFace: 'Calibri',
    })
  })

  // Property details box
  slide.addShape('rect', { x: 6.2, y: 0.88, w: 3.5, h: 4.4, fill: { color: C.lightBg }, line: { color: '2D3F5E', width: 1 } })
  sectionLabel(slide, 'Property Details', 6.35, 0.95, C.gold)

  const details = [
    ['Address',       prop.address],
    ['Property Type', prop.property_type ?? 'Multifamily'],
    ['Total Units',   fmtNum(prop.num_units)],
    ['Building SF',   prop.building_size_sf ? prop.building_size_sf.toLocaleString() + ' SF' : 'N/A'],
    ['Lot Size',      prop.lot_size_sf ? prop.lot_size_sf.toLocaleString() + ' SF' : 'N/A'],
    ['Year Built',    String(prop.year_built ?? 'N/A')],
    ['Zoning',        prop.zoning ?? 'N/A'],
    ['APN',           prop.apn ?? 'N/A'],
    ['Asking Price',  fmt$(prop.price)],
    ['Price/Unit',    fmt$(prop.price_per_unit)],
    ['Price/SF',      fmt$(prop.price_per_sf)],
    ['Cap Rate',      fmtPct(prop.cap_rate)],
    ['GRM',           prop.grm?.toFixed(2) ?? 'N/A'],
  ]
  details.forEach(([label, value], i) => {
    const y = 1.15 + i * 0.27
    slide.addText(label, { x: 6.35, y, w: 1.5, h: 0.22, fontSize: 8, color: C.gray, fontFace: 'Calibri' })
    slide.addText(value, { x: 7.85, y, w: 1.7, h: 0.22, fontSize: 8, bold: true, color: C.white, fontFace: 'Calibri', align: 'right' })
    if (i < details.length - 1) {
      slide.addShape('line', { x: 6.35, y: y + 0.23, w: 3.2, h: 0, line: { color: '2D3F5E', width: 0.5 } })
    }
  })

  goldBar(slide, H - 0.04)
}

// ── Slide 3: Financial Summary ────────────────────────────────
function addFinancialsSlide(pptx: PptxGenJS, prop: Property) {
  const slide = pptx.addSlide()
  addBg(slide)
  goldBar(slide, 0)

  slide.addText('FINANCIAL ANALYSIS', {
    x: 0.4, y: 0.15, w: 9, h: 0.35,
    fontSize: 18, bold: true, color: C.white, fontFace: 'Calibri',
  })
  goldBar(slide, 0.55)

  // Metric boxes row 1
  const row1 = [
    { label: 'Asking Price',   value: fmt$(prop.price),          sub: 'Total Consideration', highlight: true },
    { label: 'Price / Unit',   value: fmt$(prop.price_per_unit), sub: `${prop.num_units} Units` },
    { label: 'Price / SF',     value: fmt$(prop.price_per_sf),   sub: `${prop.building_size_sf?.toLocaleString() ?? 'N/A'} SF` },
    { label: 'Cap Rate',       value: fmtPct(prop.cap_rate),     sub: 'Going-In' },
  ]
  row1.forEach((m, i) => metricBox(slide, m.label, m.value, m.sub, 0.3 + i * 2.35, 0.7, 2.2, 0.9, m.highlight))

  // Metric boxes row 2
  const row2 = [
    { label: 'GRM',            value: prop.grm?.toFixed(2) ?? 'N/A', sub: 'Gross Rent Multiplier' },
    { label: 'NOI',            value: fmt$(prop.noi),                sub: 'Net Operating Income' },
    { label: 'Gross Income',   value: fmt$(prop.gross_scheduled_income), sub: 'Gross Scheduled Income' },
    { label: 'Vacancy Rate',   value: fmtPct(prop.vacancy_rate),    sub: 'Estimated' },
  ]
  row2.forEach((m, i) => metricBox(slide, m.label, m.value, m.sub, 0.3 + i * 2.35, 1.72, 2.2, 0.9))

  // Pro Forma table
  sectionLabel(slide, 'Pro Forma Income & Expense', 0.4, 2.78)
  const proFormaRows = [
    ['Gross Scheduled Income (GSI)',    fmt$(prop.gross_scheduled_income), ''],
    ['Less: Vacancy & Credit Loss (5%)', `(${fmt$(prop.gross_scheduled_income ? prop.gross_scheduled_income * 0.05 : null)})`, ''],
    ['Effective Gross Income (EGI)',    fmt$(prop.gross_scheduled_income ? prop.gross_scheduled_income * 0.95 : null), ''],
    ['Less: Operating Expenses',        `(${fmt$(prop.operating_expenses)})`, ''],
    ['Net Operating Income (NOI)',      fmt$(prop.noi), 'BOLD'],
    ['Annual Debt Service (Est.)',      fmt$(prop.annual_debt_service), ''],
    ['Pre-Tax Cash Flow',               fmt$(prop.noi && prop.annual_debt_service ? prop.noi - prop.annual_debt_service : null), ''],
    ['Cash-on-Cash Return',             fmtPct(prop.cash_on_cash), 'BOLD'],
    ['DSCR',                            prop.dscr?.toFixed(2) ?? 'N/A', ''],
  ]
  proFormaRows.forEach(([label, value, style], i) => {
    const y = 3.0 + i * 0.26
    const isBold = style === 'BOLD'
    const isTotal = label.includes('NOI') || label.includes('Cash-on-Cash')
    slide.addShape('rect', { x: 0.3, y, w: 9.4, h: 0.25, fill: { color: isTotal ? C.lightBg : (i % 2 === 0 ? C.slate : '111827') }, line: { color: C.slate, width: 0 } })
    slide.addText(label, { x: 0.4, y: y + 0.03, w: 7, h: 0.2, fontSize: 8, bold: isBold, color: isTotal ? C.gold : C.white, fontFace: 'Calibri' })
    slide.addText(value, { x: 7.4, y: y + 0.03, w: 2.2, h: 0.2, fontSize: 8, bold: isBold, color: isTotal ? C.gold : C.white, fontFace: 'Calibri', align: 'right' })
  })

  goldBar(slide, H - 0.04)
}

// ── Slide 4: Unit Mix ─────────────────────────────────────────
function addUnitMixSlide(pptx: PptxGenJS, prop: Property, rentComps: CompFeedItem[]) {
  const slide = pptx.addSlide()
  addBg(slide)
  goldBar(slide, 0)

  slide.addText('UNIT MIX & RENT ANALYSIS', {
    x: 0.4, y: 0.15, w: 9, h: 0.35,
    fontSize: 18, bold: true, color: C.white, fontFace: 'Calibri',
  })
  goldBar(slide, 0.55)

  // Subject unit mix table
  sectionLabel(slide, 'Subject Property Unit Mix', 0.4, 0.65)
  const mixHeaders = ['Unit Type', 'Units', 'Avg SF', 'Current Rent', 'Market Rent', '$/SF']
  const colWidths = [1.8, 0.7, 0.8, 1.2, 1.2, 0.8]
  let xPos = 0.3

  // Header row
  mixHeaders.forEach((h, i) => {
    slide.addShape('rect', { x: xPos, y: 0.85, w: colWidths[i], h: 0.25, fill: { color: C.navy }, line: { color: C.gold, width: 0.5 } })
    slide.addText(h, { x: xPos + 0.05, y: 0.87, w: colWidths[i] - 0.1, h: 0.2, fontSize: 7, bold: true, color: C.gold, fontFace: 'Calibri' })
    xPos += colWidths[i]
  })

  // Parse unit mix from property
  const mixStr = prop.unit_mix ?? '4x 2BD/1BA'
  const mixParts = mixStr.split(',').map((s: string) => s.trim())
  mixParts.forEach((part: string, i: number) => {
    const match = part.match(/(\d+)x\s*(.+)/)
    const count = match ? parseInt(match[1]) : 1
    const type = match ? match[2] : part
    const avgSF = prop.unit_sf ?? Math.round((prop.building_size_sf ?? 4800) / (prop.num_units ?? 4))
    const estRent = Math.round(avgSF * 2.8)

    xPos = 0.3
    const rowY = 1.1 + i * 0.28
    const rowData = [type, String(count), `${avgSF} SF`, fmt$(estRent), fmt$(Math.round(estRent * 1.05)), `$${(estRent / avgSF).toFixed(2)}`]
    rowData.forEach((val, j) => {
      slide.addShape('rect', { x: xPos, y: rowY, w: colWidths[j], h: 0.25, fill: { color: i % 2 === 0 ? C.lightBg : C.slate }, line: { color: '2D3F5E', width: 0.5 } })
      slide.addText(val, { x: xPos + 0.05, y: rowY + 0.03, w: colWidths[j] - 0.1, h: 0.2, fontSize: 8, color: C.white, fontFace: 'Calibri' })
      xPos += colWidths[j]
    })
  })

  // Rent comp comparison
  sectionLabel(slide, 'Rent Comp Market Survey', 0.4, 2.1)
  const rentHeaders = ['Property', 'Address', 'Unit Type', 'Unit SF', 'Monthly Rent', '$/SF/Mo']
  const rentColW = [2.2, 2.5, 1.2, 0.8, 1.2, 0.8]
  xPos = 0.3
  rentHeaders.forEach((h, i) => {
    slide.addShape('rect', { x: xPos, y: 2.3, w: rentColW[i], h: 0.25, fill: { color: C.navy }, line: { color: C.teal, width: 0.5 } })
    slide.addText(h, { x: xPos + 0.05, y: 2.32, w: rentColW[i] - 0.1, h: 0.2, fontSize: 7, bold: true, color: C.teal, fontFace: 'Calibri' })
    xPos += rentColW[i]
  })

  rentComps.slice(0, 5).forEach((comp, i) => {
    xPos = 0.3
    const rowY = 2.55 + i * 0.27
    const rent = comp.monthly_rent ?? comp.price_per_unit ?? 0
    const sf = comp.unit_sf ?? 900
    const rowData = [
      comp.name ?? 'N/A',
      comp.address ?? 'N/A',
      comp.unit_mix ?? comp.unit_type ?? 'N/A',
      `${sf} SF`,
      fmt$(rent),
      `$${(rent / sf).toFixed(2)}`,
    ]
    rowData.forEach((val, j) => {
      slide.addShape('rect', { x: xPos, y: rowY, w: rentColW[j], h: 0.24, fill: { color: i % 2 === 0 ? C.lightBg : C.slate }, line: { color: '2D3F5E', width: 0.5 } })
      slide.addText(val, { x: xPos + 0.05, y: rowY + 0.03, w: rentColW[j] - 0.1, h: 0.18, fontSize: 7.5, color: C.white, fontFace: 'Calibri' })
      xPos += rentColW[j]
    })
  })

  goldBar(slide, H - 0.04)
}

// ── Slide 5: Comp Chart (Subject vs Market Average) ───────────
function addCompChartSlide(pptx: PptxGenJS, prop: Property, saleComps: CompFeedItem[]) {
  const slide = pptx.addSlide()
  addBg(slide)
  goldBar(slide, 0)

  slide.addText('COMPARABLE SALES ANALYSIS', {
    x: 0.4, y: 0.15, w: 9, h: 0.35,
    fontSize: 18, bold: true, color: C.white, fontFace: 'Calibri',
  })
  goldBar(slide, 0.55)

  // Calculate market averages from active comps
  const validComps = saleComps.filter(c => c.price != null && c.cap_rate != null)
  const avgPrice     = validComps.length ? validComps.reduce((s, c) => s + (c.price ?? 0), 0) / validComps.length : 0
  const avgCapRate   = validComps.length ? validComps.reduce((s, c) => s + (c.cap_rate ?? 0), 0) / validComps.length : 0
  const avgPriceUnit = validComps.length ? validComps.reduce((s, c) => s + (c.price_per_unit ?? 0), 0) / validComps.length : 0
  const avgPriceSF   = validComps.length ? validComps.reduce((s, c) => s + (c.price_per_sf ?? 0), 0) / validComps.length : 0

  // Market averages summary boxes
  const avgs = [
    { label: 'Avg Sale Price',  value: fmt$(avgPrice),     sub: `${validComps.length} Comps` },
    { label: 'Avg Cap Rate',    value: fmtPct(avgCapRate), sub: 'Market Avg' },
    { label: 'Avg Price/Unit',  value: fmt$(avgPriceUnit), sub: 'Per Unit' },
    { label: 'Avg Price/SF',    value: fmt$(avgPriceSF),   sub: 'Per SF' },
  ]
  avgs.forEach((a, i) => metricBox(slide, a.label, a.value, a.sub, 0.3 + i * 2.35, 0.65, 2.2, 0.8))

  // Bar chart: Subject vs Market Avg — Price/Unit
  sectionLabel(slide, 'Price Per Unit — Subject vs. Market Average', 0.4, 1.6)
  const chartDataPriceUnit = [
    {
      name: 'Price / Unit',
      labels: ['Subject', 'Market Avg', ...saleComps.slice(0, 4).map((_, i) => `Comp ${i + 1}`)],
      values: [
        prop.price_per_unit ?? 0,
        avgPriceUnit,
        ...saleComps.slice(0, 4).map(c => c.price_per_unit ?? 0),
      ],
    },
  ]
  slide.addChart('bar', chartDataPriceUnit, {
    x: 0.3, y: 1.8, w: 4.5, h: 2.8,
    barDir: 'col',
    chartColors: [C.gold, C.teal, C.gray, C.gray, C.gray, C.gray],
    showLegend: false,
    showValue: true,
    dataLabelFontSize: 7,
    dataLabelColor: C.white,
    catAxisLabelColor: C.gray,
    valAxisLabelColor: C.gray,
    catAxisLabelFontSize: 8,
    valAxisLabelFontSize: 7,
  })

  // Bar chart: Cap Rate comparison
  sectionLabel(slide, 'Cap Rate — Subject vs. Market Average', 5.1, 1.6)
  const chartDataCapRate = [
    {
      name: 'Cap Rate',
      labels: ['Subject', 'Market Avg', ...saleComps.slice(0, 4).map((_, i) => `Comp ${i + 1}`)],
      values: [
        prop.cap_rate ?? 0,
        avgCapRate,
        ...saleComps.slice(0, 4).map(c => c.cap_rate ?? 0),
      ],
    },
  ]
  slide.addChart('bar', chartDataCapRate, {
    x: 5.1, y: 1.8, w: 4.5, h: 2.8,
    barDir: 'col',
    chartColors: [C.gold, C.teal, C.gray, C.gray, C.gray, C.gray],
    showLegend: false,
    showValue: true,
    dataLabelFontSize: 7,
    dataLabelColor: C.white,
    catAxisLabelColor: C.gray,
    valAxisLabelColor: C.gray,
    catAxisLabelFontSize: 8,
    valAxisLabelFontSize: 7,
  })

  goldBar(slide, H - 0.04)
}

// ── Slide 6: Comp Sales Table ─────────────────────────────────
function addCompTableSlide(pptx: PptxGenJS, saleComps: CompFeedItem[]) {
  const slide = pptx.addSlide()
  addBg(slide)
  goldBar(slide, 0)

  slide.addText('COMPARABLE SALES TABLE', {
    x: 0.4, y: 0.15, w: 9, h: 0.35,
    fontSize: 18, bold: true, color: C.white, fontFace: 'Calibri',
  })
  goldBar(slide, 0.55)

  const headers = ['Property', 'Address', 'Units', 'Year', 'Sale Price', 'Price/Unit', 'Price/SF', 'Cap Rate', 'Unit Mix']
  const colW    = [1.6, 2.0, 0.5, 0.5, 1.1, 0.9, 0.8, 0.7, 1.5]
  let xPos = 0.15

  headers.forEach((h, i) => {
    slide.addShape('rect', { x: xPos, y: 0.65, w: colW[i], h: 0.28, fill: { color: C.navy }, line: { color: C.gold, width: 0.5 } })
    slide.addText(h, { x: xPos + 0.05, y: 0.67, w: colW[i] - 0.1, h: 0.22, fontSize: 7, bold: true, color: C.gold, fontFace: 'Calibri' })
    xPos += colW[i]
  })

  saleComps.slice(0, 8).forEach((comp, i) => {
    xPos = 0.15
    const rowY = 0.93 + i * 0.55
    const rowData = [
      comp.name ?? 'N/A',
      comp.address ?? 'N/A',
      String(comp.num_units ?? 'N/A'),
      String(comp.year_built ?? 'N/A'),
      fmt$(comp.price),
      fmt$(comp.price_per_unit),
      fmt$(comp.price_per_sf),
      fmtPct(comp.cap_rate),
      comp.unit_mix ?? 'N/A',
    ]
    rowData.forEach((val, j) => {
      slide.addShape('rect', { x: xPos, y: rowY, w: colW[j], h: 0.52, fill: { color: i % 2 === 0 ? C.lightBg : C.slate }, line: { color: '2D3F5E', width: 0.5 } })
      slide.addText(val, { x: xPos + 0.05, y: rowY + 0.04, w: colW[j] - 0.1, h: 0.44, fontSize: 7.5, color: C.white, fontFace: 'Calibri', wrap: true })
      xPos += colW[j]
    })
  })

  goldBar(slide, H - 0.04)
}

// ── Slide 7: Photo Grid ───────────────────────────────────────
function addPhotoGridSlide(pptx: PptxGenJS, comps: CompFeedItem[]) {
  const slide = pptx.addSlide()
  addBg(slide)
  goldBar(slide, 0)

  slide.addText('COMPARABLE PROPERTY PHOTOS', {
    x: 0.4, y: 0.15, w: 9, h: 0.35,
    fontSize: 18, bold: true, color: C.white, fontFace: 'Calibri',
  })
  goldBar(slide, 0.55)

  const photosWithUrls = comps.filter(c => c.photo_url).slice(0, 6)
  const cols = 3
  const imgW = 3.0
  const imgH = 1.9

  photosWithUrls.forEach((comp, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const x = 0.3 + col * (imgW + 0.2)
    const y = 0.7 + row * (imgH + 0.5)

    try {
      slide.addImage({ path: comp.photo_url!, x, y, w: imgW, h: imgH, sizing: { type: 'cover', w: imgW, h: imgH } })
    } catch {
      slide.addShape('rect', { x, y, w: imgW, h: imgH, fill: { color: C.lightBg }, line: { color: '2D3F5E', width: 1 } })
      slide.addText('PHOTO', { x, y: y + imgH / 2 - 0.15, w: imgW, h: 0.3, align: 'center', fontSize: 10, color: C.gray, fontFace: 'Calibri' })
    }

    // Caption
    slide.addShape('rect', { x, y: y + imgH, w: imgW, h: 0.42, fill: { color: C.navy }, line: { color: C.navy, width: 0 } })
    slide.addText(comp.name ?? 'N/A', { x: x + 0.05, y: y + imgH + 0.03, w: imgW - 0.1, h: 0.18, fontSize: 8, bold: true, color: C.white, fontFace: 'Calibri' })
    slide.addText(`${fmt$(comp.price)} · ${fmtPct(comp.cap_rate)} Cap`, { x: x + 0.05, y: y + imgH + 0.22, w: imgW - 0.1, h: 0.15, fontSize: 7, color: C.gold, fontFace: 'Calibri' })
  })

  if (photosWithUrls.length === 0) {
    slide.addText('No property photos available.\nUpload photos via the Deal Engine to populate this slide.', {
      x: 1, y: 2, w: 8, h: 1.5,
      align: 'center', fontSize: 12, color: C.gray, fontFace: 'Calibri',
    })
  }

  goldBar(slide, H - 0.04)
}

// ── Slide 8: Broker Bios ──────────────────────────────────────
function addBrokerBiosSlide(pptx: PptxGenJS) {
  const slide = pptx.addSlide()
  addBg(slide)
  goldBar(slide, 0)

  slide.addText('EXCLUSIVELY LISTED BY', {
    x: 0.4, y: 0.15, w: 9, h: 0.35,
    fontSize: 18, bold: true, color: C.white, fontFace: 'Calibri',
  })
  goldBar(slide, 0.55)

  const brokers = [
    {
      name: 'Shane Young',
      title: 'Principal | Co-Founder',
      company: 'YoungLewin Advisors',
      phone: '(310) 555-0100',
      email: 'shane@younglewi n.com',
      license: 'CA DRE #00000001',
      bio: 'Shane Young is a principal and co-founder of YoungLewin Advisors, specializing in the acquisition and disposition of multifamily assets throughout Southern California. With deep expertise in SB9/ADU development and co-living repositioning, Shane brings a vertically integrated perspective to every transaction.',
    },
    {
      name: 'Dan Lewin',
      title: 'Principal | Co-Founder',
      company: 'YoungLewin Advisors',
      phone: '(310) 555-0101',
      email: 'dan@younglewi n.com',
      license: 'CA DRE #00000002',
      bio: 'Dan Lewin is a principal and co-founder of YoungLewin Advisors. Dan brings extensive experience in multifamily investment sales, development underwriting, and capital markets. His background spans brokerage, development, and property management through the YoungLewin platform.',
    },
  ]

  brokers.forEach((broker, i) => {
    const x = 0.3 + i * 4.85
    const w = 4.5

    // Bio card
    slide.addShape('rect', { x, y: 0.7, w, h: 4.5, fill: { color: C.lightBg }, line: { color: '2D3F5E', width: 1 } })

    // Photo placeholder
    slide.addShape('rect', { x: x + 0.2, y: 0.85, w: 1.2, h: 1.4, fill: { color: C.navy }, line: { color: C.gold, width: 1 } })
    slide.addText('PHOTO', { x: x + 0.2, y: 1.4, w: 1.2, h: 0.3, align: 'center', fontSize: 8, color: C.gray, fontFace: 'Calibri' })

    // Name & title
    slide.addText(broker.name, { x: x + 1.55, y: 0.85, w: 2.8, h: 0.35, fontSize: 16, bold: true, color: C.white, fontFace: 'Calibri' })
    slide.addText(broker.title, { x: x + 1.55, y: 1.2, w: 2.8, h: 0.22, fontSize: 9, color: C.gold, fontFace: 'Calibri' })
    slide.addText(broker.company, { x: x + 1.55, y: 1.42, w: 2.8, h: 0.22, fontSize: 9, color: C.gray, fontFace: 'Calibri' })

    // Gold divider
    slide.addShape('line', { x: x + 0.2, y: 2.35, w: w - 0.4, h: 0, line: { color: C.gold, width: 0.5 } })

    // Bio text
    slide.addText(broker.bio, { x: x + 0.2, y: 2.45, w: w - 0.4, h: 1.5, fontSize: 8, color: C.gray, fontFace: 'Calibri', wrap: true })

    // Contact info
    slide.addShape('line', { x: x + 0.2, y: 4.0, w: w - 0.4, h: 0, line: { color: '2D3F5E', width: 0.5 } })
    slide.addText(`${broker.phone}  ·  ${broker.email}`, { x: x + 0.2, y: 4.1, w: w - 0.4, h: 0.2, fontSize: 8, color: C.white, fontFace: 'Calibri' })
    slide.addText(broker.license, { x: x + 0.2, y: 4.3, w: w - 0.4, h: 0.2, fontSize: 7, color: C.gray, fontFace: 'Calibri' })
  })

  // Firm footer
  slide.addShape('rect', { x: 0, y: H - 0.5, w: W, h: 0.5, fill: { color: C.navy }, line: { color: C.navy, width: 0 } })
  slide.addText('YoungLewin Advisors  ·  Multifamily Investment Sales  ·  Southern California', {
    x: 0, y: H - 0.42, w: W, h: 0.3,
    align: 'center', fontSize: 8, color: C.gold, fontFace: 'Calibri', charSpacing: 2,
  })
  goldBar(slide, H - 0.04)
}

// ── Slide 9: Disclaimer ───────────────────────────────────────
function addDisclaimerSlide(pptx: PptxGenJS) {
  const slide = pptx.addSlide()
  addBg(slide)
  goldBar(slide, 0)

  slide.addText('CONFIDENTIALITY & DISCLAIMER', {
    x: 0.4, y: 0.2, w: 9, h: 0.35,
    fontSize: 16, bold: true, color: C.white, fontFace: 'Calibri',
  })
  goldBar(slide, 0.6)

  const disclaimer = `This Offering Memorandum ("OM") has been prepared by YoungLewin Advisors ("Broker") and has been reviewed by the Owner. The OM contains selected information pertaining to the Property and does not purport to be all-inclusive or to contain all of the information which prospective investors may need or desire. All financial projections are based on assumptions relating to the general economy, competition, and other factors beyond the control of the Owner and Broker and, therefore, are subject to material variation.

The information contained in this OM has been obtained from sources we believe to be reliable; however, neither Owner nor Broker has verified, and will not verify, any of the information contained herein, nor has Owner or Broker conducted any investigation regarding these matters and makes no warranty or representation whatsoever regarding the accuracy or completeness of the information provided.

All potential buyers must take appropriate measures to verify all of the information set forth herein. Prospective buyers shall be responsible for their costs and expenses of investigating the Property.

This OM is subject to prior placement, errors, omissions, changes or withdrawal without notice and does not constitute a recommendation, endorsement or advice as to the value of the Property by Broker or the Owner. Each prospective buyer is to rely upon its own investigation, evaluation and judgment as to the advisability of purchasing the Property described herein.

Owner and Broker expressly reserve the right, at their sole discretion, to reject any or all expressions of interest or offers to purchase the Property, and/or to terminate discussions with any entity at any time with or without notice which may arise as a result of review of this OM.

This OM is not to be reproduced and/or used without the prior written consent of YoungLewin Advisors. CA DRE License #00000000.`

  slide.addText(disclaimer, {
    x: 0.4, y: 0.75, w: 9.2, h: 4.5,
    fontSize: 7.5, color: C.gray, fontFace: 'Calibri',
    wrap: true, paraSpaceAfter: 8,
  })

  goldBar(slide, H - 0.04)
}

// ── Main Export Function ──────────────────────────────────────
export interface GenerateOMOptions {
  property: Property
  saleComps: CompFeedItem[]
  rentComps: CompFeedItem[]
  heroImageUrl?: string
  type?: 'om' | 'bov'
}

export async function generateOM(options: GenerateOMOptions): Promise<void> {
  const { property, saleComps, rentComps, heroImageUrl, type = 'om' } = options

  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE'
  pptx.author = 'YoungLewin Advisors'
  pptx.company = 'YoungLewin Advisors'
  pptx.subject = `${type === 'om' ? 'Offering Memorandum' : 'Broker Opinion of Value'} — ${property.name}`
  pptx.title = property.name

  // Define master slide theme
  pptx.defineSlideMaster({
    title: 'MASTER',
    background: { color: C.slate },
  })

  addCoverSlide(pptx, property, heroImageUrl)
  addExecSummarySlide(pptx, property)
  addFinancialsSlide(pptx, property)
  addUnitMixSlide(pptx, property, rentComps)
  addCompChartSlide(pptx, property, saleComps)
  addCompTableSlide(pptx, saleComps)
  addPhotoGridSlide(pptx, [...saleComps, ...rentComps])
  addBrokerBiosSlide(pptx)
  addDisclaimerSlide(pptx)

  const fileName = `${property.name.replace(/[^a-zA-Z0-9]/g, '_')}_${type === 'om' ? 'OM' : 'BOV'}_YoungLewin.pptx`
  await pptx.writeFile({ fileName })
}
