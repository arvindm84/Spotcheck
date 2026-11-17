import type { Location } from '../types/location'
import { getFreshnessLevel } from './freshness'
import { walkMinutes, type LatLng } from './geo'

export type IntentId = 'focus' | 'group' | 'hangout' | 'events'

export interface Intent {
  id: IntentId
  label: string
  sub: string
  // Sheet title on the map, before "near you" / "on campus".
  listTitle: string
  // null = every kind of spot
  categories: string[] | null
}

export const intents: Intent[] = [
  {
    id: 'focus',
    label: 'Deep focus',
    sub: 'Quiet, solo, outlets',
    listTitle: 'Best for focus',
    categories: ['library', 'study', 'union'],
  },
  {
    id: 'group',
    label: 'Group work',
    sub: 'Tables, talking OK',
    listTitle: 'Best for group work',
    categories: ['library', 'study', 'union'],
  },
  {
    id: 'hangout',
    label: 'Chill hangout',
    sub: 'Cafés, good vibe',
    listTitle: 'Best for hanging out',
    categories: ['coffee', 'food', 'union', 'park'],
  },
  {
    id: 'events',
    label: "What's on",
    sub: 'Events tonight',
    listTitle: 'Least busy',
    categories: null,
  },
]

export function getIntent(id: IntentId): Intent {
  return intents.find((intent) => intent.id === id) ?? intents[0]
}

// Lower is a better fit.
function fitScore(location: Location, intent: IntentId): number {
  let score = location.busyScore
  const tags = location.vibeTagSlugs
  if (intent === 'focus') {
    if (location.atmosphereScore === 'Lively') score += 3
    if (location.atmosphereScore === 'Moderate') score += 1
    if (tags.includes('silent-study')) score -= 2
    if (tags.includes('lots-of-outlets') || location.amenities.includes('Outlets')) score -= 1
  } else if (intent === 'group') {
    if (tags.includes('group-friendly')) score -= 3
    if (tags.includes('silent-study')) score += 3
  } else if (intent === 'hangout') {
    if (location.category === 'coffee') score -= 1
    if (tags.includes('silent-study')) score += 3
  }
  return score
}

// Best fit first; a short walk counts for it, and spots with no recent report sink to the bottom.
export function sortForIntent(locations: Location[], intent: IntentId, from: LatLng | null): Location[] {
  const now = Date.now()
  const rank = (location: Location) =>
    fitScore(location, intent) +
    (from ? walkMinutes(from, location) / 4 : 0) +
    (getFreshnessLevel(location.lastUpdated, now) === 'stale' ? 100 : 0)
  return [...locations].sort((a, b) => rank(a) - rank(b))
}
