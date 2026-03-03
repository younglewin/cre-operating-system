// CRE Operating System - Data Formatters

/**
 * Format a number as a dollar price with no decimals (e.g., $4,250,000)
 */
export function formatPrice(value: number | undefined | null): string {
  if (value == null) return 'N/A'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

/**
 * Format a cap rate or GRM to 2 decimal places (e.g., 5.25%)
 */
export function formatCapRate(value: number | undefined | null): string {
  if (value == null) return 'N/A'
  return `${value.toFixed(2)}%`
}

/**
 * Format a GRM to 2 decimal places (e.g., 13.50x)
 */
export function formatGRM(value: number | undefined | null): string {
  if (value == null) return 'N/A'
  return `${value.toFixed(2)}x`
}

/**
 * Format a price per SF or price per unit
 */
export function formatPricePer(value: number | undefined | null): string {
  if (value == null) return 'N/A'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

/**
 * Format a distance in miles to 2 decimal places
 */
export function formatDistance(value: number | undefined | null): string {
  if (value == null) return 'N/A'
  return `${value.toFixed(2)} mi`
}

/**
 * Format a number with commas (e.g., 4,500 SF)
 */
export function formatNumber(value: number | undefined | null): string {
  if (value == null) return 'N/A'
  return new Intl.NumberFormat('en-US').format(value)
}

/**
 * Calculate distance between two lat/lng points in miles (Haversine formula)
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3958.8 // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}
