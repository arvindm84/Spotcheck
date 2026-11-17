export type AtmosphereScore = 'Calm' | 'Moderate' | 'Lively'

export interface VibeTag {
  id: string
  slug: string
  label: string
}

export interface Location {
  id: string
  name: string
  category: string
  lat: number
  lng: number
  address: string
  hoursDescription: string
  // OpenStreetMap opening_hours syntax (e.g. "Mo-Fr 07:00-22:00; Sa,Su 08:00-20:00"); null when not verified.
  openingHours: string | null
  amenities: string[]
  busyScore: number
  atmosphereScore: AtmosphereScore
  isActive: boolean
  isFeatured: boolean
  vibeTagSlugs: string[]
  lastUpdated: string
}

export type NoiseLevel = 'whisper' | 'chatter' | 'loud'
export type OutletLevel = 'plenty' | 'few' | 'none'

// One row of `busy_reports`. `noise` and `outlets` need migration 0004.
export interface CheckIn {
  locationId: string
  busyScore: number
  noise: NoiseLevel | null
  outlets: OutletLevel | null
  reportedAt: string
}

// One row of `events` (migration 0004).
export interface SpotEvent {
  id: string
  title: string
  venue: string
  locationId: string | null
  startsAt: string
  freeFood: boolean
}

// A business's "Promote tonight" post, shown as the featured card on the Events screen.
export interface Promotion {
  locationId: string
  title: string
  postedAt: string
}
