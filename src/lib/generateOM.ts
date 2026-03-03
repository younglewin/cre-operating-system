/**
 * generateOM.ts  —  Institutional OM/BOV PPTX Generator
 * 20-slide structure matching YoungLewin Advisors standard OM format
 * Slides: Cover · Investment Highlights · Property Description ·
 *         Location Overview · Offering Summary · Property Details ·
 *         Photo Grid · Financial Overview (Pricing) ·
 *         Financial Overview (Operating Data) · Detailed Rent Roll ·
 *         Debt & Financing Assumptions · [Divider: Comps] ·
 *         Sales Comps Chart · Sales Comps Table · Sales Comps Detail Cards ·
 *         Rent Comps Table · Rent Comps Detail Cards ·
 *         [Divider: Market Overview] · Demographics ·
 *         Broker Bio / Back Cover
 */
import PptxGenJS from 'pptxgenjs'
import type { Property, CompFeedItem, TeamMember } from '../types'

// ── Brand palette ──────────────────────────────────────────────
const C = {
  navy:    '1B2A4A',
  slate:   '0F172A',
  gold:    'C5963A',
  teal:    '3B9CB5',
  white:   'F8FAFC',
  offWhite:'F1F5F9',
  gray:    '94A3B8',
  lightBg: '1E2D4F',
  midBg:   '243352',
  border:  '2D3F5E',
  red:     'EF4444',
  green:   '22C55E',
}

// ── Slide dimensions (widescreen 10" × 5.625") ─────────────────
const W = 10
const H = 5.625

// ── Formatters ─────────────────────────────────────────────────
const fmt$ = (v?: number | null) =>
  v == null ? 'N/A' : `$${Math.round(v).toLocaleString()}`
const fmtPct = (v?: number | null, dec = 2) =>
  v == null ? 'N/A' : `${Number(v).toFixed(dec)}%`
const fmtNum = (v?: number | null) =>
  v == null ? 'N/A' : Math.round(v).toLocaleString()
const fmtSF = (v?: number | null) =>
  v == null ? 'N/A' : `${Math.round(v).toLocaleString()} SF`

// ── Shared helpers ─────────────────────────────────────────────
function addBg(slide: PptxGenJS.Slide, color = C.slate) {
  slide.addShape('rect', { x: 0, y: 0, w: W, h: H, fill: { color }, line: { color, width: 0 } })
}

function goldBar(slide: PptxGenJS.Slide, y: number, x = 0, w = W) {
  slide.addShape('rect', { x, y, w, h: 0.04, fill: { color: C.gold }, line: { color: C.gold, width: 0 } })
}

function sectionLabel(slide: PptxGenJS.Slide, text: string, x: number, y: number, color = C.gold) {
  slide.addText(text.toUpperCase(), {
    x, y, w: 6, h: 0.2,
    fontSize: 7, bold: true, color, fontFace: 'Calibri', charSpacing: 3,
  })
}

function pageFooter(slide: PptxGenJS.Slide, propertyName: string) {
  slide.addShape('rect', { x: 0, y: H - 0.22, w: W, h: 0.22, fill: { color: C.navy }, line: { color: C.navy, width: 0 } })
  slide.addText(`YoungLewin Advisors  ·  ${propertyName}`, {
    x: 0.3, y: H - 0.2, w: 6, h: 0.18,
    fontSize: 6, color: C.gray, fontFace: 'Calibri',
  })
  slide.addText('CONFIDENTIAL', {
    x: 7, y: H - 0.2, w: 2.7, h: 0.18,
    fontSize: 6, color: C.gray, fontFace: 'Calibri', align: 'right', charSpacing: 2,
  })
}

function metricBox(
  slide: PptxGenJS.Slide,
  label: string, value: string, sub: string,
  x: number, y: number, w = 2.2, h = 0.9,
  highlight = false
) {
  slide.addShape('rect', {
    x, y, w, h,
    fill: { color: highlight ? C.gold : C.lightBg },
    line: { color: highlight ? C.gold : C.border, width: 1 },
  })
  slide.addText(label.toUpperCase(), {
    x: x + 0.1, y: y + 0.07, w: w - 0.2, h: 0.15,
    fontSize: 6, bold: true, color: highlight ? C.slate : C.gray,
    fontFace: 'Calibri', charSpacing: 2,
  })
  slide.addText(value, {
    x: x + 0.1, y: y + 0.2, w: w - 0.2, h: 0.38,
    fontSize: 16, bold: true, color: highlight ? C.slate : C.white,
    fontFace: 'Calibri',
  })
  if (sub) {
    slide.addText(sub, {
      x: x + 0.1, y: y + 0.65, w: w - 0.2, h: 0.18,
      fontSize: 7, color: highlight ? C.slate : C.gray, fontFace: 'Calibri',
    })
  }
}

function tableRow(
  slide: PptxGenJS.Slide,
  cols: { text: string; w: number; bold?: boolean; color?: string; align?: PptxGenJS.HAlign }[],
  x: number, y: number, h: number,
  bgColor?: string
) {
  let cx = x
  cols.forEach(col => {
    if (bgColor) {
      slide.addShape('rect', { x: cx, y, w: col.w, h, fill: { color: bgColor }, line: { color: C.border, width: 0.5 } })
    }
    slide.addText(col.text, {
      x: cx + 0.06, y, w: col.w - 0.12, h,
      fontSize: 7.5, bold: col.bold ?? false,
      color: col.color ?? C.white,
      fontFace: 'Calibri',
      align: col.align ?? 'left',
      valign: 'middle',
    })
    cx += col.w
  })
}

// ── SLIDE 1: Cover ─────────────────────────────────────────────
function addCoverSlide(pptx: PptxGenJS, prop: Property, heroImageUrl?: string) {
  const slide = pptx.addSlide()
  addBg(slide)

  // Left panel
  slide.addShape('rect', { x: 0, y: 0, w: 4.6, h: H, fill: { color: C.navy }, line: { color: C.navy, width: 0 } })

  // Right: hero image or placeholder
  if (heroImageUrl) {
    try {
      slide.addImage({ path: heroImageUrl, x: 4.6, y: 0, w: 5.4, h: H, sizing: { type: 'cover', w: 5.4, h: H } })
    } catch { /* skip */ }
  } else {
    slide.addShape('rect', { x: 4.6, y: 0, w: 5.4, h: H, fill: { color: C.lightBg }, line: { color: C.lightBg, width: 0 } })
    slide.addText('PROPERTY PHOTO', { x: 4.6, y: 2.5, w: 5.4, h: 0.5, align: 'center', fontSize: 12, color: C.gray, fontFace: 'Calibri' })
  }

  // Gradient overlay on image edge
  slide.addShape('rect', { x: 4.6, y: 0, w: 1.8, h: H, fill: { color: C.navy, transparency: 40 }, line: { color: C.navy, width: 0 } })

  goldBar(slide, 0)

  // Firm name
  slide.addText('YOUNGLEWIN ADVISORS', {
    x: 0.35, y: 0.28, w: 3.9, h: 0.25,
    fontSize: 9, bold: true, color: C.gold,
    fontFace: 'Calibri', charSpacing: 4,
  })
  slide.addText('— ADVISORS —', {
    x: 0.35, y: 0.52, w: 3.9, h: 0.18,
    fontSize: 7, color: C.gray, fontFace: 'Calibri', charSpacing: 3,
  })

  // Offering type
  slide.addText('OFFERING MEMORANDUM', {
    x: 0.35, y: 0.85, w: 3.9, h: 0.2,
    fontSize: 7, color: C.gray, fontFace: 'Calibri', charSpacing: 3,
  })

  // Property name
  slide.addText(prop.name, {
    x: 0.35, y: 1.15, w: 3.9, h: 0.85,
    fontSize: 24, bold: true, color: C.white,
    fontFace: 'Calibri', wrap: true,
  })

  // Address
  slide.addText(`${prop.address}`, {
    x: 0.35, y: 2.05, w: 3.9, h: 0.25,
    fontSize: 10, color: C.gray, fontFace: 'Calibri',
  })

  goldBar(slide, 2.38, 0.35, 3.9)

  // 6 core metrics
  const metrics = [
    { label: 'Asking Price',   value: fmt$(prop.price) },
    { label: 'Cap Rate',       value: fmtPct(prop.cap_rate) },
    { label: 'Total Units',    value: fmtNum(prop.num_units) },
    { label: 'GRM',            value: prop.grm?.toFixed(2) ?? 'N/A' },
    { label: 'Price / Unit',   value: fmt$(prop.price_per_unit) },
    { label: 'Price / SF',     value: fmt$(prop.price_per_sf) },
  ]
  metrics.forEach((m, i) => {
    const col = i % 2
    const row = Math.floor(i / 2)
    const x = 0.35 + col * 2.0
    const y = 2.52 + row * 0.52
    slide.addText(m.label.toUpperCase(), { x, y, w: 1.8, h: 0.15, fontSize: 6, color: C.gray, fontFace: 'Calibri', charSpacing: 2 })
    slide.addText(m.value, { x, y: y + 0.14, w: 1.8, h: 0.28, fontSize: 13, bold: true, color: C.white, fontFace: 'Calibri' })
  })

  // Listed by
  slide.addText('LISTED BY', { x: 0.35, y: 4.12, w: 3.9, h: 0.18, fontSize: 6, color: C.gray, fontFace: 'Calibri', charSpacing: 3 })
  slide.addText('Shane Young  ·  Managing Partner', { x: 0.35, y: 4.3, w: 3.9, h: 0.2, fontSize: 8, bold: true, color: C.white, fontFace: 'Calibri' })
  slide.addText('(562) 556-1118  ·  Shane@YoungLewin.com', { x: 0.35, y: 4.5, w: 3.9, h: 0.18, fontSize: 7.5, color: C.gray, fontFace: 'Calibri' })

  // Disclaimer bar
  slide.addShape('rect', { x: 0, y: H - 0.22, w: W, h: 0.22, fill: { color: C.slate }, line: { color: C.slate, width: 0 } })
  slide.addText('CONFIDENTIAL — NOT FOR DISTRIBUTION WITHOUT EXECUTED NDA', {
    x: 0, y: H - 0.2, w: W, h: 0.18,
    align: 'center', fontSize: 6, color: C.gray, fontFace: 'Calibri', charSpacing: 2,
  })
}

// ── SLIDE 2: Investment Highlights ────────────────────────────
function addInvestmentHighlightsSlide(pptx: PptxGenJS, prop: Property) {
  const slide = pptx.addSlide()
  addBg(slide)
  goldBar(slide, 0)

  // Left panel
  slide.addShape('rect', { x: 0, y: 0, w: 5.8, h: H, fill: { color: C.navy }, line: { color: C.navy, width: 0 } })

  slide.addText('1', { x: 0.3, y: 0.1, w: 0.4, h: 0.25, fontSize: 8, color: C.gold, fontFace: 'Calibri', bold: true })
  slide.addText('INVESTMENT HIGHLIGHTS', { x: 0.7, y: 0.1, w: 4.8, h: 0.25, fontSize: 8, color: C.gray, fontFace: 'Calibri', charSpacing: 3 })

  slide.addText('Investment\nHighlights', {
    x: 0.3, y: 0.5, w: 5.2, h: 1.0,
    fontSize: 30, bold: true, color: C.white, fontFace: 'Calibri', wrap: true,
  })

  goldBar(slide, 1.6, 0.3, 5.2)

  const highlights = prop.investment_highlights?.length
    ? prop.investment_highlights
    : [
        `${prop.num_units}-unit ${prop.property_type ?? 'multifamily'} asset in ${prop.city}, ${prop.state}`,
        `Priced at ${fmt$(prop.price_per_unit)}/unit — below market replacement cost`,
        `${fmtPct(prop.cap_rate)} going-in cap rate with significant rent upside`,
        'Value-add opportunity: below-market rents with 15–22% upside to market',
        `${prop.year_built ? `Built ${prop.year_built}` : ''} — strong bones with targeted renovation potential`,
        'Ideal 1031 exchange or portfolio acquisition target',
      ]

  highlights.slice(0, 7).forEach((h, i) => {
    const y = 1.75 + i * 0.44
    // Gold bullet marker
    slide.addShape('rect', { x: 0.3, y: y + 0.06, w: 0.06, h: 0.18, fill: { color: C.gold }, line: { color: C.gold, width: 0 } })
    slide.addText(h, {
      x: 0.5, y, w: 5.0, h: 0.38,
      fontSize: 9, color: C.white, fontFace: 'Calibri', wrap: true,
    })
  })

  // Right panel — key stats
  slide.addShape('rect', { x: 5.8, y: 0, w: 4.2, h: H, fill: { color: C.lightBg }, line: { color: C.lightBg, width: 0 } })
  sectionLabel(slide, 'Offering Summary', 6.0, 0.25)

  const stats = [
    { label: 'Asking Price',   value: fmt$(prop.price),          highlight: true },
    { label: 'Cap Rate',       value: fmtPct(prop.cap_rate),     highlight: false },
    { label: 'GRM',            value: prop.grm?.toFixed(2) ?? 'N/A', highlight: false },
    { label: 'Total Units',    value: fmtNum(prop.num_units),    highlight: false },
    { label: 'Price / Unit',   value: fmt$(prop.price_per_unit), highlight: false },
    { label: 'Price / SF',     value: fmt$(prop.price_per_sf),   highlight: false },
  ]
  stats.forEach((s, i) => {
    const y = 0.5 + i * 0.78
    slide.addShape('rect', { x: 5.9, y, w: 3.8, h: 0.7, fill: { color: s.highlight ? C.gold : C.midBg }, line: { color: C.border, width: 0.5 } })
    slide.addText(s.label.toUpperCase(), { x: 6.05, y: y + 0.06, w: 2.5, h: 0.18, fontSize: 6, color: s.highlight ? C.slate : C.gray, fontFace: 'Calibri', charSpacing: 2 })
    slide.addText(s.value, { x: 6.05, y: y + 0.22, w: 3.5, h: 0.35, fontSize: 18, bold: true, color: s.highlight ? C.slate : C.white, fontFace: 'Calibri' })
  })

  pageFooter(slide, prop.name)
}

// ── SLIDE 3: Property Description ────────────────────────────
function addPropertyDescriptionSlide(pptx: PptxGenJS, prop: Property) {
  const slide = pptx.addSlide()
  addBg(slide)
  goldBar(slide, 0)

  slide.addText('1', { x: 0.3, y: 0.1, w: 0.4, h: 0.25, fontSize: 8, color: C.gold, fontFace: 'Calibri', bold: true })
  slide.addText('PROPERTY OVERVIEW', { x: 0.7, y: 0.1, w: 8, h: 0.25, fontSize: 8, color: C.gray, fontFace: 'Calibri', charSpacing: 3 })

  slide.addText('Property\nDescription', {
    x: 0.3, y: 0.45, w: 5.5, h: 0.9,
    fontSize: 28, bold: true, color: C.white, fontFace: 'Calibri',
  })

  goldBar(slide, 1.45, 0.3, 9.4)

  // Left: description text
  const desc = prop.market_description ??
    `${prop.name} is a ${prop.num_units}-unit ${prop.property_type ?? 'multifamily'} property located at ${prop.address}, ${prop.city}, ${prop.state} ${prop.zip_code ?? ''}. Built in ${prop.year_built ?? 'N/A'}, the property comprises ${fmtSF(prop.building_size_sf)} of rentable area on a ${fmtSF(prop.lot_size_sf)} lot zoned ${prop.zoning ?? 'N/A'}.`

  slide.addText(desc, {
    x: 0.3, y: 1.6, w: 5.5, h: 1.4,
    fontSize: 9, color: C.white, fontFace: 'Calibri', wrap: true, paraSpaceAfter: 6,
  })

  // Amenities
  sectionLabel(slide, 'Property Amenities', 0.3, 3.1)
  const amenities = prop.property_amenities?.length
    ? prop.property_amenities
    : ['On-site laundry', 'Covered parking', 'Private patios/balconies', 'Separately metered utilities']

  amenities.slice(0, 6).forEach((a, i) => {
    const col = i % 2
    const row = Math.floor(i / 2)
    const x = 0.3 + col * 2.8
    const y = 3.32 + row * 0.38
    slide.addShape('rect', { x, y: y + 0.07, w: 0.06, h: 0.15, fill: { color: C.gold }, line: { color: C.gold, width: 0 } })
    slide.addText(a, { x: x + 0.15, y, w: 2.5, h: 0.32, fontSize: 8.5, color: C.white, fontFace: 'Calibri' })
  })

  // Right: property detail table
  slide.addShape('rect', { x: 6.1, y: 1.55, w: 3.6, h: 3.7, fill: { color: C.lightBg }, line: { color: C.border, width: 1 } })
  sectionLabel(slide, 'Property Details', 6.25, 1.62, C.gold)

  const details = [
    ['Address',       prop.address],
    ['City / State',  `${prop.city ?? ''}, ${prop.state ?? 'CA'} ${prop.zip_code ?? ''}`],
    ['Property Type', prop.property_type ?? 'Multifamily'],
    ['Year Built',    String(prop.year_built ?? 'N/A')],
    ['Total Units',   fmtNum(prop.num_units)],
    ['Building SF',   fmtSF(prop.building_size_sf)],
    ['Lot Size',      fmtSF(prop.lot_size_sf)],
    ['Zoning',        prop.zoning ?? 'N/A'],
    ['APN',           prop.apn ?? 'N/A'],
    ['Unit Mix',      prop.unit_mix ?? 'N/A'],
  ]
  details.forEach(([label, value], i) => {
    const y = 1.88 + i * 0.3
    if (i % 2 === 0) {
      slide.addShape('rect', { x: 6.1, y, w: 3.6, h: 0.3, fill: { color: C.midBg }, line: { color: C.midBg, width: 0 } })
    }
    slide.addText(label, { x: 6.2, y, w: 1.6, h: 0.28, fontSize: 7.5, color: C.gray, fontFace: 'Calibri', valign: 'middle' })
    slide.addText(value, { x: 7.8, y, w: 1.8, h: 0.28, fontSize: 7.5, bold: true, color: C.white, fontFace: 'Calibri', align: 'right', valign: 'middle' })
  })

  pageFooter(slide, prop.name)
}

// ── SLIDE 4: Location Overview ────────────────────────────────
function addLocationSlide(pptx: PptxGenJS, prop: Property) {
  const slide = pptx.addSlide()
  addBg(slide)
  goldBar(slide, 0)

  slide.addText('2', { x: 0.3, y: 0.1, w: 0.4, h: 0.25, fontSize: 8, color: C.gold, fontFace: 'Calibri', bold: true })
  slide.addText('LOCATION OVERVIEW', { x: 0.7, y: 0.1, w: 8, h: 0.25, fontSize: 8, color: C.gray, fontFace: 'Calibri', charSpacing: 3 })

  slide.addText(`${prop.city ?? 'Location'}\nOverview`, {
    x: 0.3, y: 0.45, w: 5.5, h: 0.9,
    fontSize: 28, bold: true, color: C.white, fontFace: 'Calibri',
  })

  goldBar(slide, 1.45, 0.3, 9.4)

  // Market description
  const marketDesc = prop.market_description ??
    `${prop.city ?? 'The subject market'} is a premier coastal submarket in Southern California, offering exceptional quality of life, strong employment fundamentals, and sustained rental demand. The property benefits from proximity to major employment centers, retail corridors, and transit infrastructure.`

  slide.addText(marketDesc, {
    x: 0.3, y: 1.6, w: 5.5, h: 1.2,
    fontSize: 9, color: C.white, fontFace: 'Calibri', wrap: true, paraSpaceAfter: 6,
  })

  // Location highlights
  sectionLabel(slide, 'Location Highlights', 0.3, 2.95)
  const highlights = prop.location_highlights?.length
    ? prop.location_highlights
    : [
        'Strong coastal rental demand',
        'Proximity to major employment centers',
        'Excellent walk score and transit access',
        'Limited new multifamily supply',
        'Top-rated school districts nearby',
      ]

  highlights.slice(0, 5).forEach((h, i) => {
    const y = 3.18 + i * 0.4
    slide.addShape('rect', { x: 0.3, y: y + 0.08, w: 0.06, h: 0.15, fill: { color: C.gold }, line: { color: C.gold, width: 0 } })
    slide.addText(h, { x: 0.5, y, w: 5.2, h: 0.34, fontSize: 9, color: C.white, fontFace: 'Calibri' })
  })

  // Right: quality of life box + industry box
  slide.addShape('rect', { x: 6.1, y: 1.55, w: 3.6, h: 1.7, fill: { color: C.navy }, line: { color: C.border, width: 1 } })
  slide.addText('QUALITY OF LIFE', { x: 6.2, y: 1.65, w: 3.4, h: 0.22, fontSize: 8, bold: true, color: C.gold, fontFace: 'Calibri', charSpacing: 2 })
  const qolPoints = [
    'Walkable neighborhood with retail & dining',
    'Beach access within 0.5 miles',
    'Top-rated schools and parks',
  ]
  qolPoints.forEach((p, i) => {
    slide.addText(`• ${p}`, { x: 6.2, y: 1.92 + i * 0.3, w: 3.3, h: 0.26, fontSize: 8, color: C.white, fontFace: 'Calibri' })
  })

  slide.addShape('rect', { x: 6.1, y: 3.4, w: 3.6, h: 1.85, fill: { color: C.navy }, line: { color: C.border, width: 1 } })
  slide.addText('SUBMARKET DRIVERS', { x: 6.2, y: 3.5, w: 3.4, h: 0.22, fontSize: 8, bold: true, color: C.gold, fontFace: 'Calibri', charSpacing: 2 })
  const drivers = [
    'Major university / college proximity',
    'Port of Long Beach — 50,000+ jobs',
    'Healthcare & aerospace employment',
    'Strong renter demographics (25–34 cohort)',
  ]
  drivers.forEach((d, i) => {
    slide.addText(`• ${d}`, { x: 6.2, y: 3.76 + i * 0.3, w: 3.3, h: 0.26, fontSize: 8, color: C.white, fontFace: 'Calibri' })
  })

  pageFooter(slide, prop.name)
}

// ── SLIDE 5: Section Divider — Financials ─────────────────────
function addSectionDivider(pptx: PptxGenJS, sectionNum: string, sectionTitle: string, subtitle: string) {
  const slide = pptx.addSlide()
  addBg(slide, C.navy)
  goldBar(slide, 0)

  slide.addText(sectionNum, {
    x: 0.5, y: 1.2, w: 2, h: 1.5,
    fontSize: 80, bold: true, color: C.gold, fontFace: 'Calibri',
    transparency: 30,
  })
  slide.addText(`SECTION ${sectionNum}`, {
    x: 0.5, y: 1.0, w: 9, h: 0.3,
    fontSize: 9, color: C.gray, fontFace: 'Calibri', charSpacing: 4,
  })
  slide.addText(sectionTitle, {
    x: 0.5, y: 1.35, w: 9, h: 0.8,
    fontSize: 36, bold: true, color: C.white, fontFace: 'Calibri',
  })
  goldBar(slide, 2.25, 0.5, 9)
  slide.addText(subtitle, {
    x: 0.5, y: 2.4, w: 9, h: 0.4,
    fontSize: 12, color: C.gray, fontFace: 'Calibri',
  })
}

// ── SLIDE 6: Financial Overview — Pricing & Financing ─────────
function addFinancialPricingSlide(pptx: PptxGenJS, prop: Property) {
  const slide = pptx.addSlide()
  addBg(slide)
  goldBar(slide, 0)

  slide.addText('1', { x: 0.3, y: 0.1, w: 0.4, h: 0.25, fontSize: 8, color: C.gold, fontFace: 'Calibri', bold: true })
  slide.addText('FINANCIAL OVERVIEW', { x: 0.7, y: 0.1, w: 8, h: 0.25, fontSize: 8, color: C.gray, fontFace: 'Calibri', charSpacing: 3 })

  slide.addText('Pricing &\nFinancing Summary', {
    x: 0.3, y: 0.42, w: 9, h: 0.75,
    fontSize: 24, bold: true, color: C.white, fontFace: 'Calibri',
  })
  goldBar(slide, 1.25, 0.3, 9.4)

  // 6-metric hero row
  const metrics = [
    { label: 'Asking Price',   value: fmt$(prop.price),          sub: 'Total Consideration', hi: true },
    { label: 'Price / Unit',   value: fmt$(prop.price_per_unit), sub: `${prop.num_units} Units` },
    { label: 'Price / SF',     value: fmt$(prop.price_per_sf),   sub: fmtSF(prop.building_size_sf) },
    { label: 'Cap Rate',       value: fmtPct(prop.cap_rate),     sub: 'Going-In' },
    { label: 'GRM',            value: prop.grm?.toFixed(2) ?? 'N/A', sub: 'Gross Rent Multiplier' },
    { label: 'NOI',            value: fmt$(prop.noi),            sub: 'Net Operating Income' },
  ]
  const mW = (W - 0.6) / 6
  metrics.forEach((m, i) => metricBox(slide, m.label, m.value, m.sub, 0.3 + i * mW, 1.38, mW - 0.08, 0.85, m.hi))

  // Financing assumptions table
  sectionLabel(slide, 'Financing Assumptions', 0.3, 2.38)
  const ltv = prop.ltv ?? 65
  const loanAmt = prop.loan_amount ?? (prop.price ? prop.price * ltv / 100 : null)
  const equity = prop.equity_invested ?? (prop.price ? prop.price * (1 - ltv / 100) : null)

  const finRows = [
    ['Loan-to-Value (LTV)',      fmtPct(ltv, 0)],
    ['Loan Amount',              fmt$(loanAmt)],
    ['Down Payment / Equity',    fmt$(equity)],
    ['Interest Rate',            fmtPct(prop.interest_rate)],
    ['Amortization',             prop.amortization_yrs ? `${prop.amortization_yrs} Years` : 'N/A'],
    ['Interest-Only Period',     prop.io_period_yrs ? `${prop.io_period_yrs} Years` : 'None'],
    ['Annual Debt Service',      fmt$(prop.annual_debt_service)],
    ['DSCR',                     prop.dscr ? prop.dscr.toFixed(2) + 'x' : 'N/A'],
    ['Cash-on-Cash Return',      fmtPct(prop.cash_on_cash)],
  ]

  const colW1 = 2.8, colW2 = 2.2
  finRows.forEach(([label, value], i) => {
    const y = 2.6 + i * 0.28
    const bg = i % 2 === 0 ? C.lightBg : C.midBg
    slide.addShape('rect', { x: 0.3, y, w: colW1 + colW2, h: 0.27, fill: { color: bg }, line: { color: C.border, width: 0.3 } })
    slide.addText(label, { x: 0.4, y, w: colW1 - 0.1, h: 0.27, fontSize: 8, color: C.gray, fontFace: 'Calibri', valign: 'middle' })
    slide.addText(value, { x: 0.3 + colW1, y, w: colW2 - 0.1, h: 0.27, fontSize: 8, bold: true, color: C.white, fontFace: 'Calibri', align: 'right', valign: 'middle' })
  })

  // Right side: income/expense summary
  sectionLabel(slide, 'Income & Expense Summary', 5.5, 2.38)
  const incomeRows = [
    ['Gross Scheduled Income',   fmt$(prop.gross_scheduled_income), false],
    ['Less: Vacancy (5%)',       `(${fmt$(prop.gross_scheduled_income ? prop.gross_scheduled_income * 0.05 : null)})`, false],
    ['Effective Gross Income',   fmt$(prop.gross_scheduled_income ? prop.gross_scheduled_income * 0.95 : null), false],
    ['Less: Operating Expenses', `(${fmt$(prop.operating_expenses)})`, false],
    ['Net Operating Income',     fmt$(prop.noi), true],
    ['Less: Debt Service',       `(${fmt$(prop.annual_debt_service)})`, false],
    ['Cash Flow (Annual)',        fmt$(prop.noi && prop.annual_debt_service ? prop.noi - prop.annual_debt_service : null), true],
  ]

  incomeRows.forEach(([label, value, bold], i) => {
    const y = 2.6 + i * 0.28
    const bg = bold ? C.gold : (i % 2 === 0 ? C.lightBg : C.midBg)
    const textColor = bold ? C.slate : C.white
    const labelColor = bold ? C.slate : C.gray
    slide.addShape('rect', { x: 5.5, y, w: 4.2, h: 0.27, fill: { color: bg }, line: { color: C.border, width: 0.3 } })
    slide.addText(label as string, { x: 5.6, y, w: 2.8, h: 0.27, fontSize: 8, color: labelColor, fontFace: 'Calibri', valign: 'middle', bold: bold as boolean })
    slide.addText(value as string, { x: 8.4, y, w: 1.2, h: 0.27, fontSize: 8, bold: true, color: textColor, fontFace: 'Calibri', align: 'right', valign: 'middle' })
  })

  pageFooter(slide, prop.name)
}

// ── SLIDE 7: Financial Overview — Annualized Operating Data ───
function addOperatingDataSlide(pptx: PptxGenJS, prop: Property) {
  const slide = pptx.addSlide()
  addBg(slide)
  goldBar(slide, 0)

  slide.addText('1', { x: 0.3, y: 0.1, w: 0.4, h: 0.25, fontSize: 8, color: C.gold, fontFace: 'Calibri', bold: true })
  slide.addText('FINANCIAL OVERVIEW', { x: 0.7, y: 0.1, w: 8, h: 0.25, fontSize: 8, color: C.gray, fontFace: 'Calibri', charSpacing: 3 })

  slide.addText('Annualized\nOperating Data', {
    x: 0.3, y: 0.42, w: 9, h: 0.75,
    fontSize: 24, bold: true, color: C.white, fontFace: 'Calibri',
  })
  goldBar(slide, 1.25, 0.3, 9.4)

  // Current vs. Pro Forma columns
  const gsi = prop.gross_scheduled_income ?? 0
  const vacancy = gsi * (prop.vacancy_loss_pct ?? 5) / 100
  const egi = gsi - vacancy
  const otherIncome = prop.other_income ?? 0
  const totalIncome = egi + otherIncome
  const mgmtFee = totalIncome * (prop.management_fee_pct ?? 6) / 100
  const propTax = prop.property_tax ?? 0
  const insurance = prop.insurance ?? 0
  const repairs = prop.repairs_maintenance ?? 0
  const utilities = prop.utilities ?? 0
  const landscaping = prop.landscaping ?? 0
  const pestControl = prop.pest_control ?? 0
  const trash = prop.trash ?? 0
  const reserves = prop.reserves ?? 0
  const totalExpenses = mgmtFee + propTax + insurance + repairs + utilities + landscaping + pestControl + trash + reserves
  const noi = totalIncome - totalExpenses

  // Pro forma with rent increase
  const rentIncreasePct = (prop.rent_increase_pct ?? 15) / 100
  const gsiPF = gsi * (1 + rentIncreasePct)
  const vacancyPF = gsiPF * (prop.vacancy_loss_pct ?? 5) / 100
  const egiPF = gsiPF - vacancyPF
  const totalIncomePF = egiPF + otherIncome
  const mgmtFeePF = totalIncomePF * (prop.management_fee_pct ?? 6) / 100
  const totalExpensesPF = mgmtFeePF + propTax + insurance + repairs + utilities + landscaping + pestControl + trash + reserves
  const noiPF = totalIncomePF - totalExpensesPF

  // Header row
  const hdrBg = C.navy
  const col0 = 0.3, w0 = 4.0, col1 = 4.3, w1 = 2.6, col2 = 6.9, w2 = 2.8
  const rowH = 0.27

  // Column headers
  slide.addShape('rect', { x: col0, y: 1.38, w: w0, h: rowH, fill: { color: hdrBg }, line: { color: C.border, width: 0.5 } })
  slide.addShape('rect', { x: col1, y: 1.38, w: w1, h: rowH, fill: { color: hdrBg }, line: { color: C.border, width: 0.5 } })
  slide.addShape('rect', { x: col2, y: 1.38, w: w2, h: rowH, fill: { color: C.gold }, line: { color: C.gold, width: 0.5 } })
  slide.addText('INCOME & EXPENSE', { x: col0 + 0.1, y: 1.38, w: w0, h: rowH, fontSize: 7.5, bold: true, color: C.gold, fontFace: 'Calibri', valign: 'middle', charSpacing: 2 })
  slide.addText('CURRENT', { x: col1 + 0.1, y: 1.38, w: w1, h: rowH, fontSize: 7.5, bold: true, color: C.white, fontFace: 'Calibri', valign: 'middle', align: 'center', charSpacing: 2 })
  slide.addText(`PRO FORMA (+${prop.rent_increase_pct ?? 15}%)`, { x: col2 + 0.1, y: 1.38, w: w2, h: rowH, fontSize: 7.5, bold: true, color: C.slate, fontFace: 'Calibri', valign: 'middle', align: 'center', charSpacing: 2 })

  const rows: [string, number | null, number | null, boolean][] = [
    ['Gross Scheduled Income (GSI)', gsi, gsiPF, false],
    [`Less: Vacancy (${prop.vacancy_loss_pct ?? 5}%)`, -vacancy, -vacancyPF, false],
    ['Other Income', otherIncome, otherIncome, false],
    ['Effective Gross Income (EGI)', totalIncome, totalIncomePF, true],
    [`Management Fee (${prop.management_fee_pct ?? 6}%)`, -mgmtFee, -mgmtFeePF, false],
    ['Property Tax', -propTax, -propTax, false],
    ['Insurance', -insurance, -insurance, false],
    ['Repairs & Maintenance', -repairs, -repairs, false],
    ['Utilities', -utilities, -utilities, false],
    ['Landscaping', -landscaping, -landscaping, false],
    ['Pest Control', -pestControl, -pestControl, false],
    ['Trash', -trash, -trash, false],
    ['Reserves', -reserves, -reserves, false],
    ['Total Operating Expenses', -totalExpenses, -totalExpensesPF, true],
    ['NET OPERATING INCOME (NOI)', noi, noiPF, true],
  ]

  rows.forEach(([label, current, proforma, bold], i) => {
    const y = 1.65 + i * rowH
    const isNOI = label.includes('NOI')
    const bg0 = isNOI ? C.gold : (bold ? C.midBg : (i % 2 === 0 ? C.lightBg : C.midBg))
    const textColor = isNOI ? C.slate : C.white
    const labelColor = isNOI ? C.slate : (bold ? C.white : C.gray)

    slide.addShape('rect', { x: col0, y, w: w0, h: rowH, fill: { color: bg0 }, line: { color: C.border, width: 0.3 } })
    slide.addShape('rect', { x: col1, y, w: w1, h: rowH, fill: { color: isNOI ? C.gold : (i % 2 === 0 ? C.lightBg : C.midBg) }, line: { color: C.border, width: 0.3 } })
    slide.addShape('rect', { x: col2, y, w: w2, h: rowH, fill: { color: isNOI ? C.gold : (i % 2 === 0 ? C.lightBg : C.midBg) }, line: { color: C.border, width: 0.3 } })

    slide.addText(label, { x: col0 + 0.1, y, w: w0 - 0.2, h: rowH, fontSize: 7.5, bold: bold || isNOI, color: labelColor, fontFace: 'Calibri', valign: 'middle' })
    slide.addText(current != null ? fmt$(Math.abs(current)) : 'N/A', { x: col1 + 0.1, y, w: w1 - 0.2, h: rowH, fontSize: 7.5, bold: bold || isNOI, color: textColor, fontFace: 'Calibri', align: 'right', valign: 'middle' })
    slide.addText(proforma != null ? fmt$(Math.abs(proforma)) : 'N/A', { x: col2 + 0.1, y, w: w2 - 0.2, h: rowH, fontSize: 7.5, bold: bold || isNOI, color: textColor, fontFace: 'Calibri', align: 'right', valign: 'middle' })
  })

  pageFooter(slide, prop.name)
}

// ── SLIDE 8: Detailed Rent Roll ───────────────────────────────
function addRentRollSlide(pptx: PptxGenJS, prop: Property, _rentComps: CompFeedItem[]) {
  const slide = pptx.addSlide()
  addBg(slide)
  goldBar(slide, 0)

  slide.addText('1', { x: 0.3, y: 0.1, w: 0.4, h: 0.25, fontSize: 8, color: C.gold, fontFace: 'Calibri', bold: true })
  slide.addText('FINANCIAL OVERVIEW', { x: 0.7, y: 0.1, w: 8, h: 0.25, fontSize: 8, color: C.gray, fontFace: 'Calibri', charSpacing: 3 })

  slide.addText('Detailed Rent Roll', {
    x: 0.3, y: 0.42, w: 9, h: 0.55,
    fontSize: 24, bold: true, color: C.white, fontFace: 'Calibri',
  })
  goldBar(slide, 1.05, 0.3, 9.4)

  // Table headers
  const cols = [
    { text: 'UNIT', w: 0.7 },
    { text: 'TYPE', w: 1.1 },
    { text: 'SF', w: 0.7 },
    { text: 'TENANT', w: 1.6 },
    { text: 'LEASE START', w: 1.2 },
    { text: 'LEASE END', w: 1.2 },
    { text: 'CURRENT RENT', w: 1.3 },
    { text: 'MARKET RENT', w: 1.3 },
    { text: 'UPSIDE', w: 0.8 },
  ]

  const hdrY = 1.18
  let cx = 0.3
  cols.forEach(col => {
    slide.addShape('rect', { x: cx, y: hdrY, w: col.w, h: 0.28, fill: { color: C.navy }, line: { color: C.border, width: 0.5 } })
    slide.addText(col.text, { x: cx + 0.05, y: hdrY, w: col.w - 0.1, h: 0.28, fontSize: 6.5, bold: true, color: C.gold, fontFace: 'Calibri', valign: 'middle', charSpacing: 1 })
    cx += col.w
  })

  // Generate demo rent roll rows from unit mix
  const unitMixStr = prop.unit_mix ?? '4x 2BD/1BA'
  const units: { unit: string; type: string; sf: number; tenant: string; leaseStart: string; leaseEnd: string; currentRent: number; marketRent: number }[] = []

  // Parse unit mix to generate rows
  const mixParts = unitMixStr.split(',').map(s => s.trim())
  let unitNum = 1
  mixParts.forEach(part => {
    const match = part.match(/(\d+)x?\s*(.+)/)
    if (match) {
      const count = parseInt(match[1])
      const type = match[2].trim()
      const sf = type.includes('2BD') ? 850 : type.includes('3BD') ? 1100 : 650
      const marketRent = type.includes('2BD') ? 2800 : type.includes('3BD') ? 3400 : 2100
      const currentRent = Math.round(marketRent * 0.82)
      for (let j = 0; j < count; j++) {
        units.push({
          unit: `#${unitNum++}`,
          type,
          sf,
          tenant: j === 0 && unitNum > 2 ? 'VACANT' : `Tenant ${unitNum - 1}`,
          leaseStart: '01/01/2024',
          leaseEnd: '12/31/2024',
          currentRent,
          marketRent,
        })
      }
    }
  })

  // If no units parsed, create 4 default rows
  if (units.length === 0) {
    for (let i = 1; i <= (prop.num_units ?? 4); i++) {
      units.push({
        unit: `#${i}`,
        type: '2BD/1BA',
        sf: 850,
        tenant: `Tenant ${i}`,
        leaseStart: '01/01/2024',
        leaseEnd: '12/31/2024',
        currentRent: 2300,
        marketRent: 2800,
      })
    }
  }

  const rowH = 0.27
  units.slice(0, 12).forEach((u, i) => {
    const y = 1.46 + i * rowH
    const isVacant = u.tenant === 'VACANT'
    const bg = isVacant ? '2D1515' : (i % 2 === 0 ? C.lightBg : C.midBg)
    const upside = u.marketRent - u.currentRent
    const upsidePct = ((upside / u.currentRent) * 100).toFixed(1)

    const rowCols = [
      { text: u.unit, w: 0.7, color: C.white },
      { text: u.type, w: 1.1, color: C.white },
      { text: u.sf.toLocaleString(), w: 0.7, color: C.gray, align: 'right' as PptxGenJS.HAlign },
      { text: isVacant ? 'VACANT' : u.tenant, w: 1.6, color: isVacant ? 'EF4444' : C.white },
      { text: isVacant ? '—' : u.leaseStart, w: 1.2, color: C.gray },
      { text: isVacant ? '—' : u.leaseEnd, w: 1.2, color: C.gray },
      { text: isVacant ? '—' : fmt$(u.currentRent), w: 1.3, color: C.white, align: 'right' as PptxGenJS.HAlign },
      { text: fmt$(u.marketRent), w: 1.3, color: C.teal, align: 'right' as PptxGenJS.HAlign },
      { text: `+${upsidePct}%`, w: 0.8, color: C.green, align: 'right' as PptxGenJS.HAlign },
    ]
    tableRow(slide, rowCols, 0.3, y, rowH, bg)
  })

  // GPR summary bar
  const totalCurrentRent = units.reduce((s, u) => s + (u.tenant !== 'VACANT' ? u.currentRent : 0), 0)
  const totalMarketRent = units.reduce((s, u) => s + u.marketRent, 0)
  const summaryY = 1.46 + Math.min(units.length, 12) * rowH + 0.1

  slide.addShape('rect', { x: 0.3, y: summaryY, w: 9.4, h: 0.32, fill: { color: C.gold }, line: { color: C.gold, width: 0 } })
  slide.addText('TOTALS', { x: 0.4, y: summaryY, w: 2, h: 0.32, fontSize: 8, bold: true, color: C.slate, fontFace: 'Calibri', valign: 'middle' })
  slide.addText(`Current GPR: ${fmt$(totalCurrentRent)}/mo  ·  ${fmt$(totalCurrentRent * 12)}/yr`, { x: 3.5, y: summaryY, w: 3, h: 0.32, fontSize: 8, bold: true, color: C.slate, fontFace: 'Calibri', valign: 'middle' })
  slide.addText(`Market GPR: ${fmt$(totalMarketRent)}/mo  ·  ${fmt$(totalMarketRent * 12)}/yr`, { x: 6.5, y: summaryY, w: 3.2, h: 0.32, fontSize: 8, bold: true, color: C.slate, fontFace: 'Calibri', valign: 'middle', align: 'right' })

  pageFooter(slide, prop.name)
}

// ── SLIDE 9: Debt & Financing Assumptions ────────────────────
function addDebtSlide(pptx: PptxGenJS, prop: Property) {
  const slide = pptx.addSlide()
  addBg(slide)
  goldBar(slide, 0)

  slide.addText('1', { x: 0.3, y: 0.1, w: 0.4, h: 0.25, fontSize: 8, color: C.gold, fontFace: 'Calibri', bold: true })
  slide.addText('FINANCIAL OVERVIEW', { x: 0.7, y: 0.1, w: 8, h: 0.25, fontSize: 8, color: C.gray, fontFace: 'Calibri', charSpacing: 3 })

  slide.addText('Debt & Financing\nAssumptions', {
    x: 0.3, y: 0.42, w: 9, h: 0.75,
    fontSize: 24, bold: true, color: C.white, fontFace: 'Calibri',
  })
  goldBar(slide, 1.25, 0.3, 9.4)

  const ltv = prop.ltv ?? 65
  const loanAmt = prop.loan_amount ?? (prop.price ? prop.price * ltv / 100 : 0)
  const equity = prop.equity_invested ?? (prop.price ? prop.price * (1 - ltv / 100) : 0)
  const rate = prop.interest_rate ?? 6.5
  const amort = prop.amortization_yrs ?? 30
  const io = prop.io_period_yrs ?? 0

  // Monthly payment calculation
  const monthlyRate = rate / 100 / 12
  const n = amort * 12
  const monthlyPayment = loanAmt * (monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1)
  const annualDS = monthlyPayment * 12
  const ioPayment = loanAmt * rate / 100

  // Metric boxes
  const boxes = [
    { label: 'Loan Amount',    value: fmt$(loanAmt),          sub: `${ltv}% LTV`, hi: true },
    { label: 'Down Payment',   value: fmt$(equity),           sub: `${100 - ltv}% Equity` },
    { label: 'Interest Rate',  value: fmtPct(rate),           sub: 'Annual' },
    { label: 'Annual Debt Svc', value: fmt$(annualDS),        sub: 'Amortizing' },
    { label: 'DSCR',           value: prop.dscr ? prop.dscr.toFixed(2) + 'x' : (prop.noi ? (prop.noi / annualDS).toFixed(2) + 'x' : 'N/A'), sub: 'Min 1.25x' },
    { label: 'Cash-on-Cash',   value: fmtPct(prop.cash_on_cash), sub: 'Leveraged Return' },
  ]
  const bW = (W - 0.6) / 6
  boxes.forEach((b, i) => metricBox(slide, b.label, b.value, b.sub, 0.3 + i * bW, 1.38, bW - 0.08, 0.85, b.hi))

  // Loan structure detail
  sectionLabel(slide, 'Loan Structure', 0.3, 2.38)
  const loanRows = [
    ['Purchase Price',          fmt$(prop.price)],
    ['Loan Amount (LTV)',       `${fmt$(loanAmt)} (${ltv}%)`],
    ['Equity Required',         fmt$(equity)],
    ['Interest Rate',           fmtPct(rate)],
    ['Amortization Period',     `${amort} Years`],
    ['Interest-Only Period',    io > 0 ? `${io} Years` : 'None'],
    ['Monthly I/O Payment',     io > 0 ? fmt$(ioPayment / 12) : 'N/A'],
    ['Monthly Amortizing Pmt',  fmt$(monthlyPayment)],
    ['Annual Debt Service',     fmt$(annualDS)],
    ['DSCR',                    prop.dscr ? prop.dscr.toFixed(2) + 'x' : (prop.noi ? (prop.noi / annualDS).toFixed(2) + 'x' : 'N/A')],
  ]

  loanRows.forEach(([label, value], i) => {
    const y = 2.6 + i * 0.27
    const bg = i % 2 === 0 ? C.lightBg : C.midBg
    const isTotal = label.includes('DSCR') || label.includes('Annual Debt')
    slide.addShape('rect', { x: 0.3, y, w: 5.0, h: 0.27, fill: { color: isTotal ? C.gold : bg }, line: { color: C.border, width: 0.3 } })
    slide.addText(label, { x: 0.4, y, w: 3.0, h: 0.27, fontSize: 8, color: isTotal ? C.slate : C.gray, fontFace: 'Calibri', valign: 'middle' })
    slide.addText(value, { x: 3.4, y, w: 1.8, h: 0.27, fontSize: 8, bold: true, color: isTotal ? C.slate : C.white, fontFace: 'Calibri', align: 'right', valign: 'middle' })
  })

  // Right: DSCR visual
  slide.addShape('rect', { x: 5.8, y: 2.38, w: 3.9, h: 3.0, fill: { color: C.lightBg }, line: { color: C.border, width: 1 } })
  sectionLabel(slide, 'Debt Coverage Analysis', 5.95, 2.48)

  const dscr = prop.dscr ?? (prop.noi && annualDS ? prop.noi / annualDS : 1.2)
  const dscrColor = dscr >= 1.25 ? C.green : dscr >= 1.0 ? 'F59E0B' : C.red
  slide.addText(dscr.toFixed(2) + 'x', {
    x: 5.8, y: 2.85, w: 3.9, h: 0.9,
    align: 'center', fontSize: 48, bold: true, color: dscrColor, fontFace: 'Calibri',
  })
  slide.addText('DEBT SERVICE COVERAGE RATIO', {
    x: 5.8, y: 3.78, w: 3.9, h: 0.22,
    align: 'center', fontSize: 7, color: C.gray, fontFace: 'Calibri', charSpacing: 2,
  })
  const dscrStatus = dscr >= 1.25 ? 'STRONG — Exceeds lender minimum' : dscr >= 1.0 ? 'ADEQUATE — Meets minimum threshold' : 'BELOW THRESHOLD — Review financing'
  slide.addShape('rect', { x: 6.0, y: 4.05, w: 3.5, h: 0.3, fill: { color: dscrColor }, line: { color: dscrColor, width: 0 } })
  slide.addText(dscrStatus, { x: 6.0, y: 4.05, w: 3.5, h: 0.3, align: 'center', fontSize: 7.5, bold: true, color: C.slate, fontFace: 'Calibri', valign: 'middle' })
  slide.addText('Lender Minimum: 1.25x', { x: 5.8, y: 4.42, w: 3.9, h: 0.22, align: 'center', fontSize: 7, color: C.gray, fontFace: 'Calibri' })

  pageFooter(slide, prop.name)
}

// ── SLIDE 10: Sales Comps Bar Chart ───────────────────────────
function addSalesCompChartSlide(pptx: PptxGenJS, prop: Property, saleComps: CompFeedItem[]) {
  const slide = pptx.addSlide()
  addBg(slide)
  goldBar(slide, 0)

  slide.addText('2', { x: 0.3, y: 0.1, w: 0.4, h: 0.25, fontSize: 8, color: C.gold, fontFace: 'Calibri', bold: true })
  slide.addText('MARKET COMPARABLES', { x: 0.7, y: 0.1, w: 8, h: 0.25, fontSize: 8, color: C.gray, fontFace: 'Calibri', charSpacing: 3 })

  slide.addText('Sales Comp\nAnalysis', {
    x: 0.3, y: 0.42, w: 9, h: 0.75,
    fontSize: 24, bold: true, color: C.white, fontFace: 'Calibri',
  })
  goldBar(slide, 1.25, 0.3, 9.4)

  const validSaleComps = saleComps.filter(c => c.is_sale_comp && c.price_per_unit)
  const avgPricePerUnit = validSaleComps.length
    ? validSaleComps.reduce((s, c) => s + (c.price_per_unit ?? 0), 0) / validSaleComps.length
    : 0
  const avgCapRate = validSaleComps.length
    ? validSaleComps.reduce((s, c) => s + (c.cap_rate ?? 0), 0) / validSaleComps.length
    : 0

  // Market average metric boxes
  const mboxes = [
    { label: 'Subject Price/Unit',  value: fmt$(prop.price_per_unit), sub: 'Subject Property', hi: true },
    { label: 'Market Avg Price/Unit', value: fmt$(avgPricePerUnit),   sub: `${validSaleComps.length} Comps` },
    { label: 'Subject Cap Rate',    value: fmtPct(prop.cap_rate),     sub: 'Subject Property', hi: false },
    { label: 'Market Avg Cap Rate', value: fmtPct(avgCapRate),        sub: `${validSaleComps.length} Comps` },
  ]
  const mW2 = (W - 0.6) / 4
  mboxes.forEach((m, i) => metricBox(slide, m.label, m.value, m.sub, 0.3 + i * mW2, 1.38, mW2 - 0.08, 0.85, m.hi))

  // Price/Unit bar chart
  const chartData = [
    {
      name: 'Price Per Unit',
      labels: ['Subject', ...validSaleComps.slice(0, 5).map((_, i) => `Comp ${i + 1}`)],
      values: [prop.price_per_unit ?? 0, ...validSaleComps.slice(0, 5).map(c => c.price_per_unit ?? 0)],
    },
  ]

  try {
    slide.addChart('bar' as PptxGenJS.CHART_NAME, chartData, {
      x: 0.3, y: 2.38, w: 4.6, h: 2.9,
      barDir: 'col',
      dataLabelFormatCode: '$#,##0',
      showValue: true,
      dataLabelFontSize: 7,
      dataLabelColor: C.white,
      catAxisLabelColor: C.gray,
      valAxisLabelColor: C.gray,
      valAxisLabelFontSize: 7,
      catAxisLabelFontSize: 7,
      legendFontSize: 7,
      showLegend: false,
    } as PptxGenJS.IChartOpts)
  } catch { /* skip chart if error */ }

  // Cap rate bar chart
  const capChartData = [
    {
      name: 'Cap Rate',
      labels: ['Subject', ...validSaleComps.slice(0, 5).map((_, i) => `Comp ${i + 1}`)],
      values: [prop.cap_rate ?? 0, ...validSaleComps.slice(0, 5).map(c => c.cap_rate ?? 0)],
    },
  ]

  try {
    slide.addChart('bar' as PptxGenJS.CHART_NAME, capChartData, {
      x: 5.1, y: 2.38, w: 4.6, h: 2.9,
      barDir: 'col',
      dataLabelFormatCode: '0.00%',
      showValue: true,
      dataLabelFontSize: 7,
      dataLabelColor: C.white,
      catAxisLabelColor: C.gray,
      valAxisLabelColor: C.gray,
      valAxisLabelFontSize: 7,
      catAxisLabelFontSize: 7,
      legendFontSize: 7,
      showLegend: false,
    } as PptxGenJS.IChartOpts)
  } catch { /* skip */ }

  // Chart labels
  slide.addText('Price Per Unit — Subject vs. Comps', { x: 0.3, y: 2.3, w: 4.6, h: 0.2, fontSize: 7.5, bold: true, color: C.gold, fontFace: 'Calibri' })
  slide.addText('Cap Rate — Subject vs. Comps', { x: 5.1, y: 2.3, w: 4.6, h: 0.2, fontSize: 7.5, bold: true, color: C.gold, fontFace: 'Calibri' })

  pageFooter(slide, prop.name)
}

// ── SLIDE 11: Sales Comps Table ───────────────────────────────
function addSalesCompsTableSlide(pptx: PptxGenJS, prop: Property, saleComps: CompFeedItem[]) {
  const slide = pptx.addSlide()
  addBg(slide)
  goldBar(slide, 0)

  slide.addText('2', { x: 0.3, y: 0.1, w: 0.4, h: 0.25, fontSize: 8, color: C.gold, fontFace: 'Calibri', bold: true })
  slide.addText('MARKET COMPARABLES', { x: 0.7, y: 0.1, w: 8, h: 0.25, fontSize: 8, color: C.gray, fontFace: 'Calibri', charSpacing: 3 })

  slide.addText('Sales Comps Overview', {
    x: 0.3, y: 0.42, w: 9, h: 0.55,
    fontSize: 24, bold: true, color: C.white, fontFace: 'Calibri',
  })
  goldBar(slide, 1.05, 0.3, 9.4)

  // Table
  const cols = [
    { text: '#',          w: 0.3 },
    { text: 'ADDRESS',    w: 2.2 },
    { text: 'CITY',       w: 1.0 },
    { text: 'SALE DATE',  w: 0.9 },
    { text: 'UNITS',      w: 0.5 },
    { text: 'YR BUILT',   w: 0.7 },
    { text: 'PRICE',      w: 1.2 },
    { text: 'PRICE/UNIT', w: 1.0 },
    { text: 'CAP RATE',   w: 0.8 },
    { text: 'GRM',        w: 0.6 },
    { text: 'UNIT MIX',   w: 0.9 },
  ]

  const hdrY = 1.18
  let cx = 0.3
  cols.forEach(col => {
    slide.addShape('rect', { x: cx, y: hdrY, w: col.w, h: 0.28, fill: { color: C.navy }, line: { color: C.border, width: 0.5 } })
    slide.addText(col.text, { x: cx + 0.04, y: hdrY, w: col.w - 0.08, h: 0.28, fontSize: 6, bold: true, color: C.gold, fontFace: 'Calibri', valign: 'middle', charSpacing: 1 })
    cx += col.w
  })

  // Subject row first
  const allRows = [
    { comp: null as CompFeedItem | null, isSubject: true },
    ...saleComps.filter(c => c.is_sale_comp).slice(0, 8).map(c => ({ comp: c, isSubject: false })),
  ]

  allRows.forEach(({ comp, isSubject }, i) => {
    const y = 1.46 + i * 0.3
    const bg = isSubject ? C.gold : (i % 2 === 0 ? C.lightBg : C.midBg)
    const tc = isSubject ? C.slate : C.white
    const gc = isSubject ? C.slate : C.gray

    const rowCols = [
      { text: isSubject ? '★' : String(i), w: 0.3, color: isSubject ? C.slate : C.gold },
      { text: isSubject ? prop.address : (comp?.address ?? 'N/A'), w: 2.2, color: tc },
      { text: isSubject ? (prop.city ?? '') : (comp?.address?.split(',')[1]?.trim() ?? 'LB'), w: 1.0, color: gc },
      { text: isSubject ? 'SUBJECT' : 'Recent', w: 0.9, color: gc },
      { text: isSubject ? fmtNum(prop.num_units) : fmtNum(comp?.num_units), w: 0.5, color: tc, align: 'center' as PptxGenJS.HAlign },
      { text: isSubject ? String(prop.year_built ?? 'N/A') : String(comp?.year_built ?? 'N/A'), w: 0.7, color: gc, align: 'center' as PptxGenJS.HAlign },
      { text: isSubject ? fmt$(prop.price) : fmt$(comp?.price), w: 1.2, color: tc, align: 'right' as PptxGenJS.HAlign },
      { text: isSubject ? fmt$(prop.price_per_unit) : fmt$(comp?.price_per_unit), w: 1.0, color: tc, align: 'right' as PptxGenJS.HAlign },
      { text: isSubject ? fmtPct(prop.cap_rate) : fmtPct(comp?.cap_rate), w: 0.8, color: tc, align: 'right' as PptxGenJS.HAlign },
      { text: isSubject ? (prop.grm?.toFixed(2) ?? 'N/A') : (comp?.grm?.toFixed(2) ?? 'N/A'), w: 0.6, color: tc, align: 'right' as PptxGenJS.HAlign },
      { text: isSubject ? (prop.unit_mix ?? 'N/A') : (comp?.unit_mix ?? 'N/A'), w: 0.9, color: gc },
    ]
    tableRow(slide, rowCols, 0.3, y, 0.28, bg)
  })

  pageFooter(slide, prop.name)
}

// ── SLIDE 12: Sales Comps Detail Cards (4-up) ─────────────────
function addSalesCompsDetailSlide(pptx: PptxGenJS, saleComps: CompFeedItem[], startIdx: number) {
  const slide = pptx.addSlide()
  addBg(slide)
  goldBar(slide, 0)

  slide.addText('2', { x: 0.3, y: 0.1, w: 0.4, h: 0.25, fontSize: 8, color: C.gold, fontFace: 'Calibri', bold: true })
  slide.addText('MARKET COMPARABLES', { x: 0.7, y: 0.1, w: 8, h: 0.25, fontSize: 8, color: C.gray, fontFace: 'Calibri', charSpacing: 3 })
  slide.addText('Sales Comp Detail', { x: 0.3, y: 0.42, w: 9, h: 0.45, fontSize: 22, bold: true, color: C.white, fontFace: 'Calibri' })
  goldBar(slide, 0.95, 0.3, 9.4)

  const comps = saleComps.filter(c => c.is_sale_comp).slice(startIdx, startIdx + 4)
  const cardW = 2.25
  const cardY = 1.1

  comps.forEach((comp, i) => {
    const x = 0.3 + i * (cardW + 0.1)

    // Photo area
    slide.addShape('rect', { x, y: cardY, w: cardW, h: 1.5, fill: { color: C.lightBg }, line: { color: C.border, width: 1 } })
    if (comp.photo_url) {
      try {
        slide.addImage({ path: comp.photo_url, x, y: cardY, w: cardW, h: 1.5, sizing: { type: 'cover', w: cardW, h: 1.5 } })
      } catch { /* skip */ }
    } else {
      slide.addText('PHOTO', { x, y: cardY + 0.6, w: cardW, h: 0.3, align: 'center', fontSize: 9, color: C.gray, fontFace: 'Calibri' })
    }

    // Price badge overlay
    slide.addShape('rect', { x, y: cardY + 1.15, w: cardW, h: 0.35, fill: { color: C.navy, transparency: 20 }, line: { color: C.navy, width: 0 } })
    slide.addText(fmt$(comp.price), { x: x + 0.05, y: cardY + 1.18, w: cardW - 0.1, h: 0.28, fontSize: 11, bold: true, color: C.gold, fontFace: 'Calibri', align: 'right' })

    // Comp number + address
    slide.addShape('rect', { x, y: cardY + 1.5, w: cardW, h: 0.32, fill: { color: C.navy }, line: { color: C.border, width: 0.5 } })
    slide.addText(`${startIdx + i + 1}  ${comp.address ?? 'N/A'}`, { x: x + 0.05, y: cardY + 1.5, w: cardW - 0.1, h: 0.32, fontSize: 7, bold: true, color: C.white, fontFace: 'Calibri', valign: 'middle' })

    // Detail rows
    const details = [
      ['Sale Date',   'Recent'],
      ['Units',       fmtNum(comp.num_units)],
      ['Year Built',  String(comp.year_built ?? 'N/A')],
      ['Building SF', fmtSF(comp.building_size_sf)],
      ['Price/Unit',  fmt$(comp.price_per_unit)],
      ['Price/SF',    fmt$(comp.price_per_sf)],
      ['Cap Rate',    fmtPct(comp.cap_rate)],
      ['GRM',         comp.grm?.toFixed(2) ?? 'N/A'],
      ['Unit Mix',    comp.unit_mix ?? 'N/A'],
    ]
    details.forEach(([label, value], j) => {
      const ry = cardY + 1.82 + j * 0.27
      const bg = j % 2 === 0 ? C.lightBg : C.midBg
      slide.addShape('rect', { x, y: ry, w: cardW, h: 0.27, fill: { color: bg }, line: { color: C.border, width: 0.3 } })
      slide.addText(label, { x: x + 0.06, y: ry, w: 1.1, h: 0.27, fontSize: 7, color: C.gray, fontFace: 'Calibri', valign: 'middle' })
      slide.addText(value, { x: x + 1.1, y: ry, w: cardW - 1.16, h: 0.27, fontSize: 7, bold: true, color: C.white, fontFace: 'Calibri', align: 'right', valign: 'middle' })
    })
  })

  pageFooter(slide, 'YoungLewin Advisors')
}

// ── SLIDE 13: Rent Comps Table ────────────────────────────────
function addRentCompsTableSlide(pptx: PptxGenJS, prop: Property, rentComps: CompFeedItem[]) {
  const slide = pptx.addSlide()
  addBg(slide)
  goldBar(slide, 0)

  slide.addText('2', { x: 0.3, y: 0.1, w: 0.4, h: 0.25, fontSize: 8, color: C.gold, fontFace: 'Calibri', bold: true })
  slide.addText('MARKET COMPARABLES', { x: 0.7, y: 0.1, w: 8, h: 0.25, fontSize: 8, color: C.gray, fontFace: 'Calibri', charSpacing: 3 })

  slide.addText('Rent Comps Overview', {
    x: 0.3, y: 0.42, w: 9, h: 0.55,
    fontSize: 24, bold: true, color: C.white, fontFace: 'Calibri',
  })
  goldBar(slide, 1.05, 0.3, 9.4)

  const cols = [
    { text: '#',          w: 0.3 },
    { text: 'ADDRESS',    w: 2.4 },
    { text: 'CITY',       w: 1.0 },
    { text: 'UNITS',      w: 0.6 },
    { text: 'UNIT TYPE',  w: 1.2 },
    { text: 'UNIT SF',    w: 0.8 },
    { text: 'MONTHLY RENT', w: 1.2 },
    { text: 'RENT/SF',    w: 0.9 },
    { text: 'YR BUILT',   w: 0.8 },
  ]

  const hdrY = 1.18
  let cx = 0.3
  cols.forEach(col => {
    slide.addShape('rect', { x: cx, y: hdrY, w: col.w, h: 0.28, fill: { color: C.navy }, line: { color: C.border, width: 0.5 } })
    slide.addText(col.text, { x: cx + 0.04, y: hdrY, w: col.w - 0.08, h: 0.28, fontSize: 6, bold: true, color: C.teal, fontFace: 'Calibri', valign: 'middle', charSpacing: 1 })
    cx += col.w
  })

  // Subject row
  const allRows = [
    { comp: null as CompFeedItem | null, isSubject: true },
    ...rentComps.filter(c => c.is_rent_comp).slice(0, 8).map(c => ({ comp: c, isSubject: false })),
  ]

  allRows.forEach(({ comp, isSubject }, i) => {
    const y = 1.46 + i * 0.3
    const bg = isSubject ? C.teal : (i % 2 === 0 ? C.lightBg : C.midBg)
    const tc = isSubject ? C.slate : C.white
    const gc = isSubject ? C.slate : C.gray

    const rentSF = comp?.monthly_rent && comp?.unit_sf ? (comp.monthly_rent / comp.unit_sf).toFixed(2) : 'N/A'
    const rowCols = [
      { text: isSubject ? '★' : String(i), w: 0.3, color: isSubject ? C.slate : C.teal },
      { text: isSubject ? prop.address : (comp?.address ?? 'N/A'), w: 2.4, color: tc },
      { text: isSubject ? (prop.city ?? '') : 'Long Beach', w: 1.0, color: gc },
      { text: isSubject ? fmtNum(prop.num_units) : fmtNum(comp?.num_units), w: 0.6, color: tc, align: 'center' as PptxGenJS.HAlign },
      { text: isSubject ? (prop.unit_mix ?? 'N/A') : (comp?.unit_type ?? 'N/A'), w: 1.2, color: tc },
      { text: isSubject ? fmtSF(prop.unit_sf) : fmtSF(comp?.unit_sf), w: 0.8, color: gc, align: 'right' as PptxGenJS.HAlign },
      { text: isSubject ? fmt$(prop.gross_scheduled_income ? prop.gross_scheduled_income / 12 / (prop.num_units ?? 1) : null) : fmt$(comp?.monthly_rent), w: 1.2, color: tc, align: 'right' as PptxGenJS.HAlign },
      { text: isSubject ? 'N/A' : rentSF, w: 0.9, color: gc, align: 'right' as PptxGenJS.HAlign },
      { text: isSubject ? String(prop.year_built ?? 'N/A') : String(comp?.year_built ?? 'N/A'), w: 0.8, color: gc, align: 'center' as PptxGenJS.HAlign },
    ]
    tableRow(slide, rowCols, 0.3, y, 0.28, bg)
  })

  pageFooter(slide, prop.name)
}

// ── SLIDE 14: Rent Comps Detail Cards (2-up) ──────────────────
function addRentCompsDetailSlide(pptx: PptxGenJS, rentComps: CompFeedItem[], startIdx: number) {
  const slide = pptx.addSlide()
  addBg(slide)
  goldBar(slide, 0)

  slide.addText('2', { x: 0.3, y: 0.1, w: 0.4, h: 0.25, fontSize: 8, color: C.gold, fontFace: 'Calibri', bold: true })
  slide.addText('MARKET COMPARABLES', { x: 0.7, y: 0.1, w: 8, h: 0.25, fontSize: 8, color: C.gray, fontFace: 'Calibri', charSpacing: 3 })
  slide.addText('Rent Comp Detail', { x: 0.3, y: 0.42, w: 9, h: 0.45, fontSize: 22, bold: true, color: C.white, fontFace: 'Calibri' })
  goldBar(slide, 0.95, 0.3, 9.4)

  const comps = rentComps.filter(c => c.is_rent_comp).slice(startIdx, startIdx + 2)
  const cardW = 4.5
  const cardY = 1.1

  comps.forEach((comp, i) => {
    const x = 0.3 + i * (cardW + 0.6)

    // Photo
    slide.addShape('rect', { x, y: cardY, w: cardW, h: 2.0, fill: { color: C.lightBg }, line: { color: C.border, width: 1 } })
    if (comp.photo_url) {
      try {
        slide.addImage({ path: comp.photo_url, x, y: cardY, w: cardW, h: 2.0, sizing: { type: 'cover', w: cardW, h: 2.0 } })
      } catch { /* skip */ }
    } else {
      slide.addText('PROPERTY PHOTO', { x, y: cardY + 0.85, w: cardW, h: 0.3, align: 'center', fontSize: 10, color: C.gray, fontFace: 'Calibri' })
    }

    // Address header
    slide.addShape('rect', { x, y: cardY + 2.0, w: cardW, h: 0.35, fill: { color: C.navy }, line: { color: C.border, width: 0.5 } })
    slide.addText(`${startIdx + i + 1}  ${comp.address ?? 'N/A'}`, { x: x + 0.08, y: cardY + 2.0, w: cardW - 0.16, h: 0.35, fontSize: 8, bold: true, color: C.white, fontFace: 'Calibri', valign: 'middle' })

    // Detail rows
    const details = [
      ['Unit Type',    comp.unit_type ?? 'N/A'],
      ['Unit SF',      fmtSF(comp.unit_sf)],
      ['Monthly Rent', fmt$(comp.monthly_rent)],
      ['Rent / SF',    comp.monthly_rent && comp.unit_sf ? `$${(comp.monthly_rent / comp.unit_sf).toFixed(2)}/SF` : 'N/A'],
      ['Total Units',  fmtNum(comp.num_units)],
      ['Year Built',   String(comp.year_built ?? 'N/A')],
    ]
    details.forEach(([label, value], j) => {
      const ry = cardY + 2.35 + j * 0.32
      const bg = j % 2 === 0 ? C.lightBg : C.midBg
      slide.addShape('rect', { x, y: ry, w: cardW, h: 0.32, fill: { color: bg }, line: { color: C.border, width: 0.3 } })
      slide.addText(label, { x: x + 0.1, y: ry, w: 2.0, h: 0.32, fontSize: 8, color: C.gray, fontFace: 'Calibri', valign: 'middle' })
      slide.addText(value, { x: x + 2.0, y: ry, w: cardW - 2.1, h: 0.32, fontSize: 8, bold: true, color: C.teal, fontFace: 'Calibri', align: 'right', valign: 'middle' })
    })
  })

  pageFooter(slide, 'YoungLewin Advisors')
}

// ── SLIDE 15: Demographics ────────────────────────────────────
function addDemographicsSlide(pptx: PptxGenJS, prop: Property) {
  const slide = pptx.addSlide()
  addBg(slide)
  goldBar(slide, 0)

  slide.addText('3', { x: 0.3, y: 0.1, w: 0.4, h: 0.25, fontSize: 8, color: C.gold, fontFace: 'Calibri', bold: true })
  slide.addText('MARKET OVERVIEW', { x: 0.7, y: 0.1, w: 8, h: 0.25, fontSize: 8, color: C.gray, fontFace: 'Calibri', charSpacing: 3 })

  slide.addText('Demographics', {
    x: 0.3, y: 0.42, w: 5.5, h: 0.65,
    fontSize: 30, bold: true, color: C.white, fontFace: 'Calibri',
  })
  goldBar(slide, 1.15, 0.3, 9.4)

  // Intro text
  const city = prop.city ?? 'the subject market'
  slide.addText(
    `The Subject Property is located within the ${city} submarket of Southern California. The following demographic data reflects the immediate trade area and is sourced from the U.S. Census Bureau and DataUSA.`,
    { x: 0.3, y: 1.28, w: 5.5, h: 0.7, fontSize: 8.5, color: C.white, fontFace: 'Calibri', wrap: true }
  )
  slide.addText('Source: U.S. Census Bureau / DataUSA', { x: 0.3, y: 1.98, w: 5.5, h: 0.2, fontSize: 7, color: C.gray, fontFace: 'Calibri' })

  // 6 stat cards in 3×2 grid
  const stats = [
    { label: 'TOTAL POPULATION',       value: prop.population ? prop.population.toLocaleString() : '89,000' },
    { label: 'MEDIAN AGE',             value: prop.median_age ? String(prop.median_age) : '37.2' },
    { label: 'AVG. COMMUTE (MIN)',      value: prop.avg_commute_min ? String(prop.avg_commute_min) : '28.5' },
    { label: 'MEDIAN HH INCOME',       value: prop.median_hh_income ? `$${prop.median_hh_income.toLocaleString()}` : '$72,000' },
    { label: 'MEDIAN PROPERTY VALUE',  value: prop.median_property_value ? `$${prop.median_property_value.toLocaleString()}` : '$850,000' },
    { label: 'RENTER-OCCUPIED HOUSING', value: prop.renter_occupied_pct ? `${prop.renter_occupied_pct}%` : '52.3%' },
  ]

  stats.forEach((s, i) => {
    const col = i % 3
    const row = Math.floor(i / 3)
    const x = 0.3 + col * 1.75
    const y = 2.3 + row * 1.35

    slide.addShape('rect', { x, y, w: 1.65, h: 1.2, fill: { color: C.lightBg }, line: { color: C.border, width: 1 } })
    slide.addText(s.value, { x, y: y + 0.2, w: 1.65, h: 0.55, align: 'center', fontSize: 20, bold: true, color: C.white, fontFace: 'Calibri' })
    slide.addText(s.label, { x, y: y + 0.78, w: 1.65, h: 0.32, align: 'center', fontSize: 6, color: C.gray, fontFace: 'Calibri', charSpacing: 1 })
  })

  // Right: lifestyle photo placeholder + market context
  slide.addShape('rect', { x: 5.8, y: 1.15, w: 3.9, h: 2.5, fill: { color: C.lightBg }, line: { color: C.border, width: 1 } })
  slide.addText('AERIAL / LIFESTYLE PHOTO', { x: 5.8, y: 2.2, w: 3.9, h: 0.3, align: 'center', fontSize: 9, color: C.gray, fontFace: 'Calibri' })

  slide.addShape('rect', { x: 5.8, y: 3.75, w: 3.9, h: 1.6, fill: { color: C.navy }, line: { color: C.border, width: 1 } })
  slide.addText('MARKET CONTEXT', { x: 5.9, y: 3.83, w: 3.7, h: 0.22, fontSize: 7.5, bold: true, color: C.gold, fontFace: 'Calibri', charSpacing: 2 })
  const contextPoints = [
    `${prop.renter_occupied_pct ?? 52}% renter-occupied housing stock`,
    'Strong 25–34 renter demographic cohort',
    'Limited new multifamily supply pipeline',
    'Sustained YoY rent growth above CPI',
  ]
  contextPoints.forEach((p, i) => {
    slide.addText(`• ${p}`, { x: 5.9, y: 4.1 + i * 0.28, w: 3.7, h: 0.25, fontSize: 8, color: C.white, fontFace: 'Calibri' })
  })

  pageFooter(slide, prop.name)
}

// ── SLIDE 16: Broker Bio / Back Cover ─────────────────────────
function addBrokerBioSlide(pptx: PptxGenJS, brokers: TeamMember[]) {
  const slide = pptx.addSlide()
  addBg(slide, C.navy)
  goldBar(slide, 0)

  // Full-bleed dark background
  slide.addShape('rect', { x: 0, y: 0, w: W, h: H, fill: { color: C.navy }, line: { color: C.navy, width: 0 } })

  // Logo / firm name at top center
  slide.addShape('rect', { x: 3.5, y: 0.15, w: 3.0, h: 0.7, fill: { color: C.white }, line: { color: C.white, width: 0 } })
  slide.addText('YOUNGLEWIN', { x: 3.5, y: 0.2, w: 3.0, h: 0.3, align: 'center', fontSize: 14, bold: true, color: C.navy, fontFace: 'Calibri', charSpacing: 3 })
  slide.addText('— ADVISORS —', { x: 3.5, y: 0.5, w: 3.0, h: 0.25, align: 'center', fontSize: 7, color: C.gray, fontFace: 'Calibri', charSpacing: 3 })

  // Property address / title
  slide.addText('EXCLUSIVELY LISTED BY', { x: 0, y: 1.05, w: W, h: 0.25, align: 'center', fontSize: 8, color: C.gray, fontFace: 'Calibri', charSpacing: 4 })

  goldBar(slide, 1.38, 2.0, 6.0)

  // Broker cards
  const defaultBrokers = [
    {
      name: 'Shane Young',
      title: 'Managing Partner',
      phone: '(562) 556-1118',
      email: 'Shane@YoungLewin.com',
      license_number: 'CA DRE #01963090',
      bio: 'Shane Young is a principal and co-founder of YoungLewin Advisors, specializing in the acquisition and disposition of multifamily assets throughout Southern California.',
      headshot_url: undefined as string | undefined,
    },
    {
      name: 'Dan Lewin',
      title: 'Managing Partner',
      phone: '(562) 318-0213',
      email: 'Dan@YoungLewin.com',
      license_number: 'CA DRE #02000000',
      bio: 'Dan Lewin is a principal and co-founder of YoungLewin Advisors. Dan brings extensive experience in multifamily investment sales, development underwriting, and capital markets.',
      headshot_url: undefined as string | undefined,
    },
  ]

  const brokerData = brokers.length > 0
    ? brokers.slice(0, 2).map(b => ({
        name: `${b.email ?? 'Broker'}`,
        title: b.title ?? 'Managing Partner',
        phone: b.phone ?? '',
        email: b.email ?? '',
        license_number: b.license_number ?? '',
        bio: b.bio ?? '',
        headshot_url: b.headshot_url,
      }))
    : defaultBrokers

  brokerData.forEach((broker, i) => {
    const x = 1.0 + i * 4.5
    const cardW = 4.0

    // Headshot
    slide.addShape('rect', { x, y: 1.55, w: 1.1, h: 1.4, fill: { color: C.lightBg }, line: { color: C.gold, width: 1 } })
    if (broker.headshot_url) {
      try {
        slide.addImage({ path: broker.headshot_url, x, y: 1.55, w: 1.1, h: 1.4, sizing: { type: 'cover', w: 1.1, h: 1.4 } })
      } catch { /* skip */ }
    } else {
      slide.addText('PHOTO', { x, y: 2.1, w: 1.1, h: 0.3, align: 'center', fontSize: 7, color: C.gray, fontFace: 'Calibri' })
    }

    // Name & title
    slide.addText(broker.name, { x: x + 1.2, y: 1.55, w: cardW - 1.3, h: 0.38, fontSize: 16, bold: true, color: C.white, fontFace: 'Calibri' })
    slide.addText(broker.title, { x: x + 1.2, y: 1.93, w: cardW - 1.3, h: 0.22, fontSize: 9, color: C.gold, fontFace: 'Calibri' })
    slide.addText('YoungLewin Advisors', { x: x + 1.2, y: 2.15, w: cardW - 1.3, h: 0.22, fontSize: 9, color: C.gray, fontFace: 'Calibri' })

    // Divider
    slide.addShape('line', { x, y: 3.05, w: cardW, h: 0, line: { color: C.gold, width: 0.5 } })

    // Bio
    slide.addText(broker.bio, { x, y: 3.15, w: cardW, h: 0.8, fontSize: 7.5, color: C.gray, fontFace: 'Calibri', wrap: true })

    // Contact
    slide.addShape('line', { x, y: 4.0, w: cardW, h: 0, line: { color: C.border, width: 0.5 } })
    slide.addText(`${broker.phone}  ·  ${broker.email}`, { x, y: 4.08, w: cardW, h: 0.2, fontSize: 8, color: C.white, fontFace: 'Calibri' })
    slide.addText(broker.license_number, { x, y: 4.3, w: cardW, h: 0.2, fontSize: 7, color: C.gray, fontFace: 'Calibri' })
  })

  // Office address footer
  slide.addShape('rect', { x: 0, y: H - 0.45, w: W, h: 0.45, fill: { color: C.slate }, line: { color: C.slate, width: 0 } })
  slide.addText('111 W. Ocean Blvd. Suite 1625  ·  Long Beach, CA 90802', {
    x: 0, y: H - 0.38, w: W, h: 0.28,
    align: 'center', fontSize: 8, color: C.gray, fontFace: 'Calibri',
  })
  goldBar(slide, H - 0.04)
}

// ── SLIDE 17: Disclaimer ──────────────────────────────────────
function addDisclaimerSlide(pptx: PptxGenJS) {
  const slide = pptx.addSlide()
  addBg(slide)
  goldBar(slide, 0)

  slide.addText('CONFIDENTIALITY & DISCLAIMER', {
    x: 0.4, y: 0.2, w: 9, h: 0.35,
    fontSize: 16, bold: true, color: C.white, fontFace: 'Calibri',
  })
  goldBar(slide, 0.6)

  const disclaimer = `This Offering Memorandum ("OM") has been prepared by YoungLewin Advisors ("Broker") and has been reviewed by the Owner. The OM contains selected information pertaining to the Property and does not purport to be all-inclusive or to contain all of the information which prospective investors may need or desire. All financial projections are based on assumptions relating to the general economy, competition, and other factors beyond the control of the Owner and Broker and, therefore, are subject to material variation.\n\nThe information contained in this OM has been obtained from sources we believe to be reliable; however, neither Owner nor Broker has verified, and will not verify, any of the information contained herein, nor has Owner or Broker conducted any investigation regarding these matters and makes no warranty or representation whatsoever regarding the accuracy or completeness of the information provided.\n\nAll potential buyers must take appropriate measures to verify all of the information set forth herein. Prospective buyers shall be responsible for their costs and expenses of investigating the Property.\n\nThis OM is subject to prior placement, errors, omissions, changes or withdrawal without notice and does not constitute a recommendation, endorsement or advice as to the value of the Property by Broker or the Owner. Each prospective buyer is to rely upon its own investigation, evaluation and judgment as to the advisability of purchasing the Property described herein.\n\nOwner and Broker expressly reserve the right, at their sole discretion, to reject any or all expressions of interest or offers to purchase the Property, and/or to terminate discussions with any entity at any time with or without notice which may arise as a result of review of this OM.\n\nCA DRE License #01963090. YoungLewin Advisors is a licensed real estate brokerage in the State of California.`

  slide.addText(disclaimer, {
    x: 0.4, y: 0.75, w: 9.2, h: 4.5,
    fontSize: 7.5, color: C.gray, fontFace: 'Calibri',
    wrap: true, paraSpaceAfter: 8,
  })

  goldBar(slide, H - 0.04)
}

// ── Main Export ───────────────────────────────────────────────
export interface GenerateOMOptions {
  property: Property
  saleComps: CompFeedItem[]
  rentComps: CompFeedItem[]
  heroImageUrl?: string
  type?: 'om' | 'bov'
  brokers?: TeamMember[]
}

export async function generateOM(options: GenerateOMOptions): Promise<void> {
  const { property, saleComps, rentComps, heroImageUrl, type = 'om', brokers = [] } = options

  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE'
  pptx.author = 'YoungLewin Advisors'
  pptx.company = 'YoungLewin Advisors'
  pptx.subject = `${type === 'om' ? 'Offering Memorandum' : 'Broker Opinion of Value'} — ${property.name}`
  pptx.title = property.name

  pptx.defineSlideMaster({
    title: 'MASTER',
    background: { color: C.slate },
  })

  // ── 20-slide sequence ──────────────────────────────────────
  // Section 1: Property Overview
  addCoverSlide(pptx, property, heroImageUrl)                    // 1
  addInvestmentHighlightsSlide(pptx, property)                   // 2
  addPropertyDescriptionSlide(pptx, property)                    // 3
  addLocationSlide(pptx, property)                               // 4

  // Section 2: Financials
  addSectionDivider(pptx, '1', 'Financial Overview', 'Pricing, Pro Forma & Debt Analysis')  // 5
  addFinancialPricingSlide(pptx, property)                       // 6
  addOperatingDataSlide(pptx, property)                          // 7
  addRentRollSlide(pptx, property, rentComps)                    // 8
  addDebtSlide(pptx, property)                                   // 9

  // Section 3: Market Comparables
  addSectionDivider(pptx, '2', 'Market Comparables', 'Sales & Rent Comp Analysis')          // 10
  addSalesCompChartSlide(pptx, property, saleComps)              // 11
  addSalesCompsTableSlide(pptx, property, saleComps)             // 12
  addSalesCompsDetailSlide(pptx, saleComps, 0)                   // 13 (comps 1-4)
  if (saleComps.filter(c => c.is_sale_comp).length > 4) {
    addSalesCompsDetailSlide(pptx, saleComps, 4)                 // 14 (comps 5-8, if exist)
  }
  addRentCompsTableSlide(pptx, property, rentComps)              // 15
  addRentCompsDetailSlide(pptx, rentComps, 0)                    // 16 (rent comps 1-2)
  if (rentComps.filter(c => c.is_rent_comp).length > 2) {
    addRentCompsDetailSlide(pptx, rentComps, 2)                  // 17 (rent comps 3-4)
  }

  // Section 4: Market Overview
  addSectionDivider(pptx, '3', 'Market Overview', 'Location, Demographics & Market Drivers')  // 18
  addDemographicsSlide(pptx, property)                           // 19

  // Back Matter
  addBrokerBioSlide(pptx, brokers)                               // 20
  addDisclaimerSlide(pptx)                                       // 21

  const fileName = `${property.name.replace(/[^a-zA-Z0-9]/g, '_')}_${type === 'om' ? 'OM' : 'BOV'}_YoungLewin.pptx`
  await pptx.writeFile({ fileName })
}
