import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Map as MapboxMap, Marker, type MapRef } from 'react-map-gl/mapbox'
import { MapPin, Search, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { BottomSheet } from '../components/BottomSheet'
import { CrowdBars } from '../components/CrowdBars'
import { useApp } from '../lib/appContext'
import {
  agoLabel,
  crowdColor,
  crowdInk,
  crowdLabel,
  openSeatsLabel,
  getCrowdLevel,
  hasOutlets,
  outletSummary,
  shortName,
} from '../lib/crowd'
import { getFreshnessLevel } from '../lib/freshness'
import { distanceMeters, walkMinutes } from '../lib/geo'
import { getIntent, sortForIntent } from '../lib/intent'
import { getSnapHeights, type SheetSnap } from '../lib/sheetSnaps'
import { filterSpots } from '../lib/spotFilters'
import { usePlaceSearch, type PlaceResult } from '../lib/usePlaceSearch'
import type { Location } from '../types/location'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined
// Keeps map content clear of the search bar and filter chips.
const MAP_TOP_PADDING = 150
// The best matches get a name label on the map; the rest are dots.
const LABELLED_PINS = 3
// Labelled pins closer together than this would overlap, so the lower-ranked one stays a dot.
const LABEL_SPACING_M = 260
// How many of the best matches the map frames.
const FRAMED_SPOTS = 6
const STALE_COLOR = '#B8C3C9'

type FilterId = 'seats' | 'outlets' | 'open'
const filterChips: { id: FilterId; label: string }[] = [
  { id: 'seats', label: 'Seats open' },
  { id: 'outlets', label: 'Outlets' },
  { id: 'open', label: 'Open now' },
]

// Recolors Mapbox's light style to the brand map: pale-blue water, grey land, white roads.
function applyBrandColors(map: MapRef) {
  const m = map.getMap()
  for (const layer of m.getStyle().layers ?? []) {
    try {
      if (layer.type === 'background') m.setPaintProperty(layer.id, 'background-color', '#E9EEF1')
      else if (layer.type === 'fill' && layer.id.includes('water')) m.setPaintProperty(layer.id, 'fill-color', '#D2EAF2')
      else if (layer.type === 'fill' && layer.id.includes('building')) m.setPaintProperty(layer.id, 'fill-color', '#DCE2E6')
      else if (layer.type === 'fill' && /^land|landuse|national-park/.test(layer.id)) m.setPaintProperty(layer.id, 'fill-color', '#E9EEF1')
      else if (layer.type === 'line' && /road|bridge|tunnel/.test(layer.id)) m.setPaintProperty(layer.id, 'line-color', '#FFFFFF')
    } catch {
      // A layer that can't take the color keeps Mapbox's default.
    }
  }
}

function fitToSpots(map: MapRef | null, spots: Location[], snap: SheetSnap, animate = true) {
  if (!map || spots.length === 0) return
  const lngs = spots.map((spot) => spot.lng)
  const lats = spots.map((spot) => spot.lat)
  const bottom = getSnapHeights(map.getContainer().clientHeight)[snap] + 24
  map.fitBounds(
    [
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)],
    ],
    { padding: { top: MAP_TOP_PADDING, bottom, left: 96, right: 96 }, maxZoom: 16, animate },
  )
}

export function ExploreView() {
  const { locations, intent: intentId, userLocation, now } = useApp()
  const intent = getIntent(intentId ?? 'focus')
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<FilterId[]>([])
  const [snap, setSnap] = useState<SheetSnap>('peek')
  const [mapLoaded, setMapLoaded] = useState(false)
  const mapRef = useRef<MapRef>(null)
  const placeResults = usePlaceSearch(query)
  const trimmedQuery = query.trim()

  const results = useMemo(() => {
    const matches = filterSpots(locations, {
      query,
      categoryId: 'all',
      vibeSlugs: [],
      openNow: filters.includes('open'),
    }).filter((spot) => {
      // A search looks across every kind of spot.
      if (!query.trim() && intent.categories && !intent.categories.includes(spot.category)) return false
      if (filters.includes('outlets') && !hasOutlets(spot)) return false
      if (filters.includes('seats')) {
        return spot.busyScore <= 5 && getFreshnessLevel(spot.lastUpdated, now) !== 'stale'
      }
      return true
    })
    return sortForIntent(matches, intent.id, userLocation)
  }, [locations, query, filters, intent, userLocation, now])

  // Frame the best matches whenever what's being asked for changes (not on every data refresh).
  const framedKey = `${mapLoaded}|${locations.length > 0}|${intent.id}|${filters.join()}|${trimmedQuery}`
  const resultsRef = useRef(results)
  const snapRef = useRef(snap)
  useEffect(() => {
    resultsRef.current = results
    snapRef.current = snap
  })
  useEffect(() => {
    fitToSpots(mapRef.current, resultsRef.current.slice(0, FRAMED_SPOTS), snapRef.current)
  }, [framedKey])

  const openSpot = useCallback((spot: Location) => navigate(`/spot/${spot.id}`), [navigate])

  const selectPlace = (place: PlaceResult) => {
    setQuery('')
    setSnap('peek')
    mapRef.current?.flyTo({ center: [place.lng, place.lat], zoom: 16 })
  }

  const toggleFilter = (id: FilterId) =>
    setFilters((current) => (current.includes(id) ? current.filter((f) => f !== id) : [...current, id]))

  const labelledIds = useMemo(() => {
    const labelled: Location[] = []
    for (const spot of results) {
      if (labelled.length === LABELLED_PINS) break
      if (labelled.every((other) => distanceMeters(other, spot) > LABEL_SPACING_M)) labelled.push(spot)
    }
    return new Set(labelled.map((spot) => spot.id))
  }, [results])
  const title = trimmedQuery
    ? `${results.length} ${results.length === 1 ? 'spot matches' : 'spots match'} “${trimmedQuery}”`
    : `${intent.listTitle} ${userLocation ? 'near you' : 'on campus'}`

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#E9EEF1]">
      <MapboxMap
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{ longitude: -89.4, latitude: 43.0745, zoom: 14.5 }}
        mapStyle="mapbox://styles/mapbox/light-v11"
        onDragStart={() => setSnap('peek')}
        onLoad={() => {
          if (mapRef.current) applyBrandColors(mapRef.current)
          setMapLoaded(true)
        }}
      >
        {results.map((spot) => {
          const labelled = labelledIds.has(spot.id)
          const stale = getFreshnessLevel(spot.lastUpdated, now) === 'stale'
          const level = getCrowdLevel(spot.busyScore)
          const color = stale ? STALE_COLOR : crowdColor[level]
          const status = stale ? 'No recent update' : crowdLabel[level]
          return (
            <Marker
              key={spot.id}
              longitude={spot.lng}
              latitude={spot.lat}
              anchor={labelled ? 'bottom' : 'center'}
              style={{ zIndex: labelled ? 2 : 1 }}
            >
              {labelled ? (
                <button
                  type="button"
                  onClick={() => openSpot(spot)}
                  className="flex flex-col items-center"
                  aria-label={`${spot.name}: ${status}`}
                >
                  <span
                    style={{ background: color, color: stale ? '#0F1E26' : crowdInk[level] }}
                    className="whitespace-nowrap rounded-[10px] px-2.5 py-1.5 font-sans text-[13px] font-bold shadow-[0_2px_8px_rgba(15,30,38,0.25)]"
                  >
                    {shortName(spot.name)} · {stale ? '?' : crowdLabel[level]}
                  </span>
                  <span className="h-2 w-[3px] bg-ink" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => openSpot(spot)}
                  aria-label={`${spot.name}: ${status}`}
                  style={{ background: color }}
                  className="block h-[18px] w-[18px] rounded-full border-[3px] border-white shadow-[0_1px_4px_rgba(15,30,38,0.3)]"
                />
              )}
            </Marker>
          )
        })}

        {userLocation && (
          <Marker longitude={userLocation.lng} latitude={userLocation.lat} style={{ zIndex: 3 }}>
            <span aria-label="You are here" className="flex h-10 w-10 items-center justify-center rounded-full bg-lake/20">
              <span className="h-[22px] w-[22px] rounded-full border-[3px] border-white bg-lake" />
            </span>
          </Marker>
        )}
      </MapboxMap>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 px-4 pt-4">
        <label className="pointer-events-auto flex h-[50px] items-center gap-3 rounded-2xl bg-white px-4 shadow-[0_2px_10px_rgba(15,30,38,0.14)]">
          <Search className="h-5 w-5 shrink-0 text-mute" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setSnap('half')}
            placeholder="Search a spot, building or café"
            aria-label="Search a spot, building or café"
            className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-mute"
          />
          {query && (
            <button type="button" aria-label="Clear search" onClick={() => setQuery('')}>
              <X className="h-5 w-5 text-mute" />
            </button>
          )}
        </label>

        <div className="mt-2.5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => navigate('/welcome')}
            aria-label={`Looking for ${intent.label}. Change`}
            className="pointer-events-auto h-[34px] rounded-full bg-lake px-3.5 text-[13px] font-bold text-white shadow-[0_1px_5px_rgba(15,30,38,0.14)]"
          >
            {intent.label}
          </button>
          {filterChips.map(({ id, label }) => {
            const active = filters.includes(id)
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                onClick={() => toggleFilter(id)}
                className={`pointer-events-auto h-[34px] rounded-full px-3.5 text-[13px] font-bold shadow-[0_1px_5px_rgba(15,30,38,0.14)] ${
                  active ? 'bg-lake text-white' : 'bg-white text-ink'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      <BottomSheet
        snap={snap}
        onSnapChange={setSnap}
        header={
          <div className="flex items-center justify-between gap-3 px-4 pb-3">
            <h2 className="font-display text-[20px] font-bold leading-tight tracking-tight">{title}</h2>
            <span className="flex shrink-0 items-center gap-1.5 text-[13px] text-mute">
              <span className="h-2 w-2 rounded-full bg-terrace" />
              Live
            </span>
          </div>
        }
      >
        <div className="flex flex-col gap-3 px-4 pb-6">
          {results.map((spot) => {
            const stale = getFreshnessLevel(spot.lastUpdated, now) === 'stale'
            const level = getCrowdLevel(spot.busyScore)
            const outlets = outletSummary(spot)
            const details = stale
              ? ['No recent check-in', outlets]
              : [crowdLabel[level], `${openSeatsLabel(spot).toLowerCase()} seats`, outlets]
            const meta = [
              userLocation ? `${walkMinutes(userLocation, spot)} min walk` : null,
              `updated ${agoLabel(spot.lastUpdated, now)}`,
            ]
            return (
              <button
                key={spot.id}
                type="button"
                onClick={() => openSpot(spot)}
                className="flex w-full items-center gap-3 rounded-2xl bg-paper p-2.5 text-left"
              >
                <span
                  style={{ background: stale ? '#DDE3E7' : crowdColor[level] }}
                  className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[14px]"
                >
                  <CrowdBars level={stale ? 'quiet' : level} size={14} color={stale ? '#56666F' : crowdInk[level]} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-display text-[16px] font-bold">{spot.name.replace(': ', ' · ')}</span>
                  <span className="block truncate text-[13px] text-mute">{details.filter(Boolean).join(' · ')}</span>
                  <span className="block truncate text-[13px] text-mute">{meta.filter(Boolean).join(' · ')}</span>
                </span>
              </button>
            )
          })}

          {results.length === 0 && placeResults.length === 0 && (
            <div className="py-4 text-center">
              <p className="text-sm text-mute">No spots match right now.</p>
              <button
                type="button"
                onClick={() => {
                  setQuery('')
                  setFilters([])
                }}
                className="mt-2 text-sm font-bold text-lake"
              >
                Clear search and filters
              </button>
            </div>
          )}

          {placeResults.length > 0 && (
            <>
              <h3 className="mt-2 text-xs font-bold uppercase tracking-wider text-mute">Addresses</h3>
              {placeResults.map((place) => (
                <button
                  key={`${place.lat},${place.lng}`}
                  type="button"
                  onClick={() => selectPlace(place)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-line px-4 py-3 text-left"
                >
                  <MapPin className="h-4 w-4 shrink-0 text-mute" />
                  <span className="min-w-0 truncate text-sm">{place.label}</span>
                </button>
              ))}
            </>
          )}
        </div>
      </BottomSheet>
    </div>
  )
}
