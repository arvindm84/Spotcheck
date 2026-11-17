import type { Location, NoiseLevel, OutletLevel } from '../types/location'

// Brand crowd scale: always shown as word + bars + color.
export type CrowdLevel = 'quiet' | 'moderate' | 'busy' | 'packed'

export const CROWD_LEVELS: CrowdLevel[] = ['quiet', 'moderate', 'busy', 'packed']

export function getCrowdLevel(busyScore: number): CrowdLevel {
  if (busyScore <= 3) return 'quiet'
  if (busyScore <= 5) return 'moderate'
  if (busyScore <= 8) return 'busy'
  return 'packed'
}

// The busy_score a check-in at each level writes to `busy_reports`.
export const crowdScore: Record<CrowdLevel, number> = { quiet: 2, moderate: 5, busy: 7, packed: 10 }

export const crowdLabel: Record<CrowdLevel, string> = {
  quiet: 'Quiet',
  moderate: 'Moderate',
  busy: 'Busy',
  packed: 'Packed',
}

export const crowdHint: Record<CrowdLevel, string> = {
  quiet: 'Plenty of room — take your pick',
  moderate: 'Filling up — seats are still easy to find',
  busy: 'Seats go fast — look around the edges',
  packed: 'Hard to find a seat right now',
}

export const crowdColor: Record<CrowdLevel, string> = {
  quiet: '#B9E2EF',
  moderate: '#5FB0C9',
  busy: '#E8792B',
  packed: '#A8390B',
}

// Text/bars drawn on top of the crowd color.
export const crowdInk: Record<CrowdLevel, string> = {
  quiet: '#0F1E26',
  moderate: '#0F1E26',
  busy: '#0F1E26',
  packed: '#FFFFFF',
}

export const noiseLabel: Record<NoiseLevel, string> = {
  whisper: 'Whisper',
  chatter: 'Chatter',
  loud: 'Loud',
}

export const outletLabel: Record<OutletLevel, string> = {
  plenty: 'Plenty',
  few: 'Some free',
  none: 'None free',
}

// Until someone reports noise, fall back to the spot's usual atmosphere.
export function usualNoise(location: Location): NoiseLevel {
  if (location.atmosphereScore === 'Calm') return 'whisper'
  if (location.atmosphereScore === 'Moderate') return 'chatter'
  return 'loud'
}

export function hasOutlets(location: Location): boolean {
  return location.amenities.includes('Outlets') || location.vibeTagSlugs.includes('lots-of-outlets')
}

export function outletSummary(location: Location): string | null {
  if (location.vibeTagSlugs.includes('lots-of-outlets')) return 'outlets at most tables'
  if (location.amenities.includes('Outlets')) return 'some outlets'
  return null
}

// Rough seat counts by kind of place; we have no per-spot capacity yet, so open seats are an estimate.
const TYPICAL_SEATS: Record<string, number> = {
  library: 160,
  union: 90,
  study: 70,
  coffee: 28,
  food: 40,
  venue: 60,
  park: 40,
  shop: 10,
}

export function estimateOpenSeats(location: Location): number {
  const capacity = TYPICAL_SEATS[location.category] ?? 40
  const open = capacity * (1 - Math.min(10, Math.max(0, location.busyScore)) / 10)
  return open > 20 ? Math.round(open / 5) * 5 : Math.round(open)
}

// "~20", or "Few" when it's down to a handful.
export function openSeatsLabel(location: Location): string {
  const seats = estimateOpenSeats(location)
  return seats < 4 ? 'Few' : `~${seats}`
}

export function agoLabel(iso: string, now = Date.now()): string {
  const minutes = Math.round((now - new Date(iso).getTime()) / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hr ago`
  return `${Math.round(hours / 24)} d ago`
}

// "Memorial Union: Main Floor Window Room" -> ["Memorial Union", "Main Floor Window Room"];
// "Peet's Coffee (Union South)" -> ["Union South", "Peet's Coffee"].
export function splitName(name: string): { place: string | null; title: string } {
  const colon = name.indexOf(': ')
  if (colon > 0) return { place: name.slice(0, colon), title: name.slice(colon + 2) }
  const paren = /^(.*?)\s*\((.+)\)\s*$/.exec(name)
  if (paren) return { place: paren[2], title: paren[1] }
  return { place: null, title: name }
}

// Short name for a map label.
export function shortName(name: string): string {
  const base = name.split(/[:(]/)[0].trim()
  return base.length > 18 ? base.split(' ').slice(0, 2).join(' ') : base
}

export const categoryLabel: Record<string, string> = {
  library: 'Library',
  union: 'Union',
  study: 'Study spot',
  coffee: 'Café',
  food: 'Food',
  venue: 'Venue',
  park: 'Outdoors',
  shop: 'Shop',
}
