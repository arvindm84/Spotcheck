import type {
  AtmosphereScore,
  CheckIn,
  Location,
  NoiseLevel,
  OutletLevel,
  Promotion,
  SpotEvent,
  VibeTag,
} from '../types/location'
import { mockEvents, mockLocations, mockVibeTags } from './mockData'
import { getSupabaseClient } from './supabaseClient'

// ---------------------------------------------------------------------------------------------
// Live backend, with a fallback
// ---------------------------------------------------------------------------------------------

// supabase-js retries failed reads for 20-30 s; a prototype shouldn't sit on an empty map that long.
const LIVE_TIMEOUT_MS = 4000
// A spot's live crowd reading averages the reports from this window (same as the SQL trigger).
const REPORT_WINDOW_MS = 90 * 60 * 1000

export type DataSource = 'live' | 'demo'

// 'demo' until a read from Supabase succeeds.
let dataSource: DataSource = 'demo'
// Set when the first read fails, so later calls don't each wait out the timeout.
let liveUnavailable = false
let lastLiveLocations: Location[] | null = null

export function getDataSource(): DataSource {
  return dataSource
}

function liveClient() {
  return liveUnavailable ? null : getSupabaseClient()
}

function withTimeout<T>(promise: PromiseLike<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timed out reaching the server')), LIVE_TIMEOUT_MS)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}

// ---------------------------------------------------------------------------------------------
// On-device storage (saved spots, check-ins the server didn't take, demo counters)
// ---------------------------------------------------------------------------------------------

function readStore<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`spotcheck.${key}`)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeStore(key: string, value: unknown) {
  try {
    localStorage.setItem(`spotcheck.${key}`, JSON.stringify(value))
  } catch {
    // Private windows can refuse storage; the app still works for the session.
  }
}

function localCheckIns(): CheckIn[] {
  return readStore<CheckIn[]>('checkIns', [])
}

// Check-ins kept on this device count toward the spots they were made at.
function applyLocalCheckIns(locations: Location[]): Location[] {
  const recent = localCheckIns().filter(
    (report) => Date.now() - new Date(report.reportedAt).getTime() < REPORT_WINDOW_MS,
  )
  if (recent.length === 0) return locations
  return locations.map((location) => {
    const mine = recent.filter((report) => report.locationId === location.id)
    if (mine.length === 0) return location
    const latest = mine.reduce((a, b) => (a.reportedAt > b.reportedAt ? a : b))
    if (latest.reportedAt <= location.lastUpdated) return location
    return {
      ...location,
      busyScore: Math.round(mine.reduce((sum, report) => sum + report.busyScore, 0) / mine.length),
      lastUpdated: latest.reportedAt,
    }
  })
}

// ---------------------------------------------------------------------------------------------
// Spots
// ---------------------------------------------------------------------------------------------

interface LocationRow {
  id: string
  name: string
  category: string
  lat: number
  lng: number
  address: string
  hours_description: string
  opening_hours: string | null
  amenities: string[]
  busy_score: number
  atmosphere_score: string
  is_active: boolean
  is_featured: boolean
  last_updated: string
  location_tags: { vibe_tags: { slug: string } | null }[]
}

function toLocation(row: LocationRow): Location {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    lat: row.lat,
    lng: row.lng,
    address: row.address,
    hoursDescription: row.hours_description,
    openingHours: row.opening_hours ?? null,
    amenities: row.amenities,
    busyScore: row.busy_score,
    atmosphereScore: row.atmosphere_score as AtmosphereScore,
    isActive: row.is_active,
    isFeatured: row.is_featured,
    vibeTagSlugs: row.location_tags
      .map((tag) => tag.vibe_tags?.slug)
      .filter((slug): slug is string => Boolean(slug)),
    lastUpdated: row.last_updated,
  }
}

export async function getLocations(): Promise<Location[]> {
  const supabase = liveClient()
  if (supabase) {
    try {
      const { data, error } = await withTimeout(
        supabase.from('locations').select('*, location_tags(vibe_tags(slug))'),
      )
      if (error || !data) throw error ?? new Error('No data')
      dataSource = 'live'
      lastLiveLocations = (data as LocationRow[]).map(toLocation)
    } catch {
      // Never reached the server: stop trying. Reached it before: keep the last good reading.
      if (!lastLiveLocations) liveUnavailable = true
    }
  }
  return applyLocalCheckIns(lastLiveLocations ?? mockLocations)
}

export async function getVibeTags(): Promise<VibeTag[]> {
  const supabase = liveClient()
  if (!supabase) return mockVibeTags
  try {
    const { data, error } = await withTimeout(supabase.from('vibe_tags').select('id, slug, label'))
    if (error || !data) return mockVibeTags
    return data
  } catch {
    return mockVibeTags
  }
}

// ---------------------------------------------------------------------------------------------
// Check-ins
// ---------------------------------------------------------------------------------------------

export interface CheckInInput {
  locationId: string
  busyScore: number
  noise: NoiseLevel | null
  outlets: OutletLevel | null
}

// 'server': saved to Supabase. 'device': the server wasn't reachable or refused, so the check-in
// is kept on this device only. 'too-soon': the server allows one report per spot every 10 minutes.
export type CheckInResult = 'server' | 'device' | 'too-soon'

const RLS_VIOLATION = '42501'
const UNKNOWN_COLUMN = 'PGRST204'

export async function submitCheckIn(input: CheckInInput): Promise<CheckInResult> {
  const supabase = dataSource === 'live' ? liveClient() : null
  if (supabase) {
    try {
      // Reports need a signed-in reporter; visitors get an anonymous Supabase session
      // (Authentication → Sign In / Providers → "Allow anonymous sign-ins").
      const { data: session } = await withTimeout(supabase.auth.getSession())
      if (!session.session) {
        const { error } = await withTimeout(supabase.auth.signInAnonymously())
        if (error) throw error
      }

      const base = { location_id: input.locationId, busy_score: input.busyScore }
      let { error } = await withTimeout(
        supabase.from('busy_reports').insert({ ...base, noise: input.noise, outlets: input.outlets }),
      )
      // Migration 0004 not applied yet: the crowd reading still goes through.
      if (error?.code === UNKNOWN_COLUMN) {
        ;({ error } = await withTimeout(supabase.from('busy_reports').insert(base)))
      }
      if (error?.code === RLS_VIOLATION) return 'too-soon'
      if (error) throw error
      return 'server'
    } catch (error) {
      console.warn('[check-in] not saved to the server, keeping it on this device', error)
    }
  }

  const checkIn: CheckIn = { ...input, reportedAt: new Date().toISOString() }
  writeStore('checkIns', [...localCheckIns(), checkIn].slice(-200))
  return 'device'
}

interface ReportRow {
  busy_score: number
  noise?: NoiseLevel | null
  outlets?: OutletLevel | null
  reported_at: string
}

// A spot's recent check-ins, newest first (up to ~2 months, for the "usually" chart).
export async function getCheckIns(locationId: string): Promise<CheckIn[]> {
  const mine = localCheckIns().filter((report) => report.locationId === locationId)
  const supabase = dataSource === 'live' ? liveClient() : null
  let remote: CheckIn[] = []
  if (supabase) {
    try {
      const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
      const query = (columns: string) =>
        withTimeout(
          supabase
            .from('busy_reports')
            .select(columns)
            .eq('location_id', locationId)
            .gte('reported_at', since)
            .order('reported_at', { ascending: false })
            .limit(1000),
        )
      let { data, error } = await query('busy_score, noise, outlets, reported_at')
      if (error) ({ data, error } = await query('busy_score, reported_at'))
      if (!error && data) {
        remote = (data as unknown as ReportRow[]).map((row) => ({
          locationId,
          busyScore: row.busy_score,
          noise: row.noise ?? null,
          outlets: row.outlets ?? null,
          reportedAt: row.reported_at,
        }))
      }
    } catch {
      // Fall through with whatever is on this device.
    }
  }
  return [...remote, ...mine].sort((a, b) => b.reportedAt.localeCompare(a.reportedAt))
}

// ---------------------------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------------------------

interface EventRow {
  id: string
  title: string
  venue: string
  location_id: string | null
  starts_at: string
  free_food: boolean
}

export interface EventsResult {
  events: SpotEvent[]
  // True when these are the built-in sample events rather than rows from the `events` table.
  isSample: boolean
}

// Events from the start of today through the next 7 days, soonest first.
export async function getEvents(): Promise<EventsResult> {
  const supabase = dataSource === 'live' ? liveClient() : null
  if (supabase) {
    try {
      const start = new Date()
      start.setHours(0, 0, 0, 0)
      const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000)
      const { data, error } = await withTimeout(
        supabase
          .from('events')
          .select('id, title, venue, location_id, starts_at, free_food')
          .gte('starts_at', start.toISOString())
          .lt('starts_at', end.toISOString())
          .order('starts_at'),
      )
      if (!error && data && data.length > 0) {
        return {
          isSample: false,
          events: (data as EventRow[]).map((row) => ({
            id: row.id,
            title: row.title,
            venue: row.venue,
            locationId: row.location_id,
            startsAt: row.starts_at,
            freeFood: row.free_food,
          })),
        }
      }
    } catch {
      // Fall through to the sample events.
    }
  }
  return { events: mockEvents(), isSample: true }
}

// ---------------------------------------------------------------------------------------------
// Saved spots and events (on this device)
// ---------------------------------------------------------------------------------------------

export function getSavedSpotIds(): string[] {
  return readStore<string[]>('savedSpots', [])
}

export function setSpotSaved(locationId: string, saved: boolean): string[] {
  const next = getSavedSpotIds().filter((id) => id !== locationId)
  if (saved) {
    next.push(locationId)
    trackSpot(locationId, 'saves')
  }
  writeStore('savedSpots', next)
  return next
}

export function getSavedEventIds(): string[] {
  return readStore<string[]>('savedEvents', [])
}

export function setEventSaved(eventId: string, saved: boolean): string[] {
  const next = getSavedEventIds().filter((id) => id !== eventId)
  if (saved) next.push(eventId)
  writeStore('savedEvents', next)
  return next
}

// ---------------------------------------------------------------------------------------------
// SpotCheck for Business (prototype: counted and stored on this device)
// ---------------------------------------------------------------------------------------------

export type SpotMetric = 'views' | 'saves' | 'directions'
export type SpotStats = Record<SpotMetric, number>

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

function readMetrics(): Record<string, Partial<Record<SpotMetric, number[]>>> {
  return readStore('metrics', {})
}

export function trackSpot(locationId: string, metric: SpotMetric) {
  const metrics = readMetrics()
  const forSpot = metrics[locationId] ?? {}
  const cutoff = Date.now() - WEEK_MS
  forSpot[metric] = [...(forSpot[metric] ?? []).filter((at) => at > cutoff), Date.now()]
  metrics[locationId] = forSpot
  writeStore('metrics', metrics)
}

// This week's counts for one spot.
export function getSpotStats(locationId: string): SpotStats {
  const forSpot = readMetrics()[locationId] ?? {}
  const cutoff = Date.now() - WEEK_MS
  const count = (metric: SpotMetric) => (forSpot[metric] ?? []).filter((at) => at > cutoff).length
  return { views: count('views'), saves: count('saves'), directions: count('directions') }
}

// Tonight's promotion, if one was posted today.
export function getPromotion(): Promotion | null {
  const promotion = readStore<Promotion | null>('promotion', null)
  if (!promotion) return null
  return new Date(promotion.postedAt).toDateString() === new Date().toDateString() ? promotion : null
}

export function postPromotion(locationId: string, title: string): Promotion {
  const promotion: Promotion = { locationId, title, postedAt: new Date().toISOString() }
  writeStore('promotion', promotion)
  return promotion
}

// ---------------------------------------------------------------------------------------------
// Onboarding choice (on this device)
// ---------------------------------------------------------------------------------------------

export function getStoredIntent(): string | null {
  return readStore<string | null>('intent', null)
}

export function storeIntent(intent: string) {
  writeStore('intent', intent)
}
