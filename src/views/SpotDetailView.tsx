import { useEffect, useMemo, useState } from 'react'
import { Armchair, AudioLines, Bookmark, ChevronLeft, Plug, type LucideIcon } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { CrowdBars } from '../components/CrowdBars'
import { useApp } from '../lib/appContext'
import {
  agoLabel,
  categoryLabel,
  crowdColor,
  crowdHint,
  crowdInk,
  crowdLabel,
  openSeatsLabel,
  getCrowdLevel,
  hasOutlets,
  noiseLabel,
  outletLabel,
  splitName,
  usualNoise,
} from '../lib/crowd'
import { getCheckIns, trackSpot } from '../lib/data'
import { getFreshnessLevel } from '../lib/freshness'
import { getOpenStatus } from '../lib/openingHours'
import { BUCKET_STARTS, getDayPattern, patternSummary } from '../lib/patterns'
import type { CheckIn } from '../types/location'

const HOUR_MS = 60 * 60 * 1000
const RECENT_MS = 90 * 60 * 1000
const WEEKDAYS = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays']
// Axis labels under the first, third, seventh and last bars, as in the design.
const AXIS_LABELS: Record<number, string> = { 0: '10a', 2: '1p', 6: '7p', 8: '10p' }
const CHART_HEIGHT = 136

function Stat({ Icon, label, value }: { Icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex-1 rounded-2xl bg-white p-3">
      <Icon className="h-5 w-5 text-lake" strokeWidth={2} />
      <p className="mt-2 text-[13px] text-mute">{label}</p>
      <p className="font-display text-[17px] font-bold leading-tight">{value}</p>
    </div>
  )
}

export function SpotDetailView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { locations, vibeTags, loaded, savedSpotIds, toggleSaved, openCheckIn, now } = useApp()
  const location = locations.find((spot) => spot.id === id)
  const [loadedCheckIns, setLoadedCheckIns] = useState<{ key: string; checkIns: CheckIn[] } | null>(null)

  useEffect(() => {
    if (id) trackSpot(id, 'views')
  }, [id])

  // Reload when a new report lands (lastUpdated moves).
  const checkInsKey = `${id}|${location?.lastUpdated}`
  useEffect(() => {
    if (!id) return
    let cancelled = false
    getCheckIns(id).then((checkIns) => {
      if (!cancelled) setLoadedCheckIns({ key: checkInsKey, checkIns })
    })
    return () => {
      cancelled = true
    }
  }, [id, checkInsKey])

  const checkIns = useMemo(
    () => (loadedCheckIns?.key.startsWith(`${id}|`) ? loadedCheckIns.checkIns : []),
    [loadedCheckIns, id],
  )
  const pattern = useMemo(() => (location ? getDayPattern(location, checkIns) : null), [location, checkIns])

  if (!location || !pattern) {
    return (
      <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-paper">
        <p className="text-mute">{loaded ? 'That spot isn’t on SpotCheck.' : 'Loading…'}</p>
        {loaded && (
          <button type="button" onClick={() => navigate('/')} className="font-bold text-lake">
            Back to the map
          </button>
        )}
      </div>
    )
  }

  const { place, title } = splitName(location.name)
  const stale = getFreshnessLevel(location.lastUpdated, now) === 'stale'
  const level = getCrowdLevel(location.busyScore)
  const saved = savedSpotIds.includes(location.id)
  const thisHour = checkIns.filter((report) => now - new Date(report.reportedAt).getTime() < HOUR_MS).length
  const recent = checkIns.filter((report) => now - new Date(report.reportedAt).getTime() < RECENT_MS)
  const reportedNoise = recent.find((report) => report.noise)?.noise
  const reportedOutlets = recent.find((report) => report.outlets)?.outlets
  const openStatus = getOpenStatus(location.openingHours)
  const closes = openStatus?.isOpen ? /Closes (.+)$/.exec(openStatus.label)?.[1] : null

  const tags = [
    ...location.vibeTagSlugs.map((slug) => vibeTags.find((tag) => tag.slug === slug)?.label),
    ...location.amenities,
    closes ? `Open till ${closes}` : openStatus && !openStatus.isOpen ? 'Closed now' : null,
  ].filter((tag): tag is string => Boolean(tag))

  const directions = () => {
    trackSpot(location.id, 'directions')
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}&travelmode=walking`,
      '_blank',
      'noopener',
    )
  }

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-paper">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-5">
        <div className="flex justify-between">
          <button
            type="button"
            aria-label="Back"
            onClick={() => navigate(-1)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            aria-label={saved ? 'Remove from saved' : 'Save spot'}
            aria-pressed={saved}
            onClick={() => toggleSaved(location.id)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white"
          >
            <Bookmark className="h-5 w-5" fill={saved ? '#0F1E26' : 'none'} />
          </button>
        </div>

        <p className="mt-5 text-[15px] font-medium text-mute">{place ?? categoryLabel[location.category] ?? 'Spot'}</p>
        <h1 className="font-display text-[32px] font-extrabold leading-[1.08] tracking-tight">{title}</h1>
        <p className="mt-1.5 flex items-center gap-2 text-[15px] text-mute">
          <span className={`h-2 w-2 shrink-0 rounded-full ${stale ? 'bg-line' : 'bg-terrace'}`} />
          Updated {agoLabel(location.lastUpdated, now)}
          {thisHour > 0 && ` · ${thisHour} ${thisHour === 1 ? 'check-in' : 'check-ins'} this hour`}
        </p>

        <div
          style={stale ? { background: '#DDE3E7', color: '#0F1E26' } : { background: crowdColor[level], color: crowdInk[level] }}
          className="mt-4 flex items-center justify-between gap-4 rounded-3xl px-5 py-5"
        >
          <div>
            <p className="text-[14px] font-semibold">{stale ? 'Last reported' : 'Crowd right now'}</p>
            <p className="font-display text-[34px] font-extrabold leading-tight">{crowdLabel[level]}</p>
            <p className="text-[14px]">{stale ? 'No check-ins lately — be the first to update it' : crowdHint[level]}</p>
          </div>
          <CrowdBars level={level} size={34} color={stale ? '#0F1E26' : crowdInk[level]} />
        </div>

        <div className="mt-4 flex gap-2.5">
          <Stat Icon={AudioLines} label="Noise" value={noiseLabel[reportedNoise ?? usualNoise(location)]} />
          <Stat Icon={Armchair} label="Open seats" value={stale ? '—' : openSeatsLabel(location)} />
          <Stat
            Icon={Plug}
            label="Outlets"
            value={reportedOutlets ? outletLabel[reportedOutlets] : hasOutlets(location) ? 'Available' : '—'}
          />
        </div>

        {tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span key={tag} className="rounded-[10px] bg-shallows px-2.5 py-1.5 text-[14px] font-semibold">
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-4 rounded-3xl bg-white p-4">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-[18px] font-bold">Usually on {WEEKDAYS[new Date().getDay()]}</h2>
            <span className="text-[13px] text-mute">{pattern.fromCheckIns ? 'from check-ins' : 'typical pattern'}</span>
          </div>
          <div className="mt-3 flex items-end gap-1.5" style={{ height: CHART_HEIGHT }}>
            {pattern.values.map((value, i) => {
              const isNow = i === pattern.nowIndex
              return (
                <span
                  key={BUCKET_STARTS[i]}
                  style={{
                    height: Math.max(14, (Math.min(10, value) / 10) * (CHART_HEIGHT - 8)),
                    background: crowdColor[getCrowdLevel(Math.round(value))],
                  }}
                  className={`flex-1 rounded-md ${isNow ? 'outline outline-[3px] outline-offset-2 outline-ink' : ''}`}
                />
              )
            })}
          </div>
          <div className="mt-2.5 flex gap-1.5 text-[13px] text-mute">
            {pattern.values.map((_, i) => (
              <span key={BUCKET_STARTS[i]} className="flex-1 whitespace-nowrap text-center">
                {i === pattern.nowIndex ? 'Now' : (AXIS_LABELS[i] ?? '')}
              </span>
            ))}
          </div>
          <p className="mt-3 text-[14px] text-mute">{patternSummary(pattern)}</p>
        </div>

        <p className="mt-4 px-1 text-[13px] text-mute">
          {location.address}
          {openStatus ? ` · ${openStatus.label}` : ''}
        </p>
      </div>

      <div className="flex shrink-0 gap-2.5 bg-paper px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-2">
        <button
          type="button"
          onClick={directions}
          className="h-14 flex-[2] rounded-2xl border border-line bg-white font-display text-[16px] font-bold"
        >
          Directions
        </button>
        <button
          type="button"
          onClick={() => openCheckIn(location)}
          className="h-14 flex-[3] rounded-2xl bg-lake font-display text-[16px] font-bold text-white"
        >
          I'm here — update it
        </button>
      </div>
    </div>
  )
}
