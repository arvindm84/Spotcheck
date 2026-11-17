import { useEffect, useState } from 'react'
import { Bookmark } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../lib/appContext'
import { agoLabel, crowdLabel, getCrowdLevel } from '../lib/crowd'
import { getEvents, getPromotion, getSavedEventIds, setEventSaved, type EventsResult } from '../lib/data'
import type { SpotEvent } from '../types/location'

type TabId = 'tonight' | 'week' | 'food'
const tabs: { id: TabId; label: string }[] = [
  { id: 'tonight', label: 'Tonight' },
  { id: 'week', label: 'This week' },
  { id: 'food', label: 'Free food' },
]

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
// An event stays under "Tonight" for this long after it starts.
const STARTED_GRACE_MS = 2 * 60 * 60 * 1000

function isToday(event: SpotEvent, now: Date): boolean {
  return new Date(event.startsAt).toDateString() === now.toDateString()
}

function timeParts(iso: string): { time: string; suffix: string } {
  const date = new Date(iso)
  const hours = date.getHours()
  return {
    time: `${hours % 12 === 0 ? 12 : hours % 12}:${String(date.getMinutes()).padStart(2, '0')}`,
    suffix: hours < 12 ? 'AM' : 'PM',
  }
}

export function EventsView() {
  const { locations, dataSource, now: nowMs } = useApp()
  const navigate = useNavigate()
  const [tab, setTab] = useState<TabId>('tonight')
  const [result, setResult] = useState<EventsResult | null>(null)
  const [savedIds, setSavedIds] = useState<string[]>(getSavedEventIds)
  const promotion = getPromotion()

  // Re-read once the spots have loaded, when we know whether the server is answering.
  useEffect(() => {
    getEvents().then(setResult)
  }, [dataSource])

  const now = new Date(nowMs)
  const upcoming = (result?.events ?? []).filter(
    (event) => new Date(event.startsAt).getTime() > now.getTime() - STARTED_GRACE_MS,
  )
  const shown =
    tab === 'tonight'
      ? upcoming.filter((event) => isToday(event, now))
      : tab === 'food'
        ? upcoming.filter((event) => event.freeFood)
        : upcoming

  const promoted = promotion ? locations.find((spot) => spot.id === promotion.locationId) : null

  return (
    <div className="absolute inset-0 z-30 overflow-y-auto bg-paper px-4 pb-8 pt-12">
      <p className="text-[15px] font-medium text-mute">{WEEKDAYS[now.getDay()]}</p>
      <h1 className="font-display text-[32px] font-extrabold leading-tight tracking-tight">Tonight on campus</h1>

      <div className="mt-4 flex gap-2">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            aria-pressed={tab === id}
            onClick={() => setTab(id)}
            className={`h-[36px] rounded-full px-4 text-[14px] font-bold ${
              tab === id ? 'bg-lake text-white' : 'border border-line bg-white text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-3xl bg-ink p-5 text-white">
        <div className="flex items-center justify-between">
          <span className="rounded-lg bg-terrace px-2 py-1 text-[13px] font-bold text-ink">Featured spot</span>
          <span className="text-[13px] text-white/60">Sponsored</span>
        </div>
        {promotion && promoted ? (
          <button type="button" onClick={() => navigate(`/spot/${promoted.id}`)} className="mt-3 block w-full text-left">
            <span className="block font-display text-[22px] font-bold leading-snug">
              {promoted.name} — {promotion.title}
            </span>
            <span className="mt-2 block text-[15px] text-white/65">{promoted.address.split(',')[0]}</span>
            <span className="mt-3 flex items-center gap-2.5 text-[13px] text-white/65">
              <span className="rounded-lg bg-crowd-quiet px-2 py-1 font-bold text-ink">
                {crowdLabel[getCrowdLevel(promoted.busyScore)]} now
              </span>
              Posted by the business · updated {agoLabel(promoted.lastUpdated, nowMs)}
            </span>
          </button>
        ) : (
          <>
            <p className="mt-3 font-display text-[22px] font-bold leading-snug">
              Partner café — study night, open till 1 am
            </p>
            <p className="mt-2 text-[15px] text-white/65">
              Example listing. Post a real one from You → SpotCheck for Business.
            </p>
          </>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {shown.map((event) => {
          const spot = locations.find((location) => location.id === event.locationId)
          const { time, suffix } = timeParts(event.startsAt)
          const saved = savedIds.includes(event.id)
          const start = new Date(event.startsAt)
          const details = [
            tab !== 'tonight' && !isToday(event, now) ? WEEKDAYS[start.getDay()].slice(0, 3) : null,
            event.venue,
            event.freeFood ? 'Free food' : spot ? `${crowdLabel[getCrowdLevel(spot.busyScore)]} crowd` : null,
          ]
          return (
            <div key={event.id} className="flex items-center gap-3 rounded-3xl bg-white p-3">
              <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-shallows">
                <span className="font-display text-[17px] font-bold leading-none">{time}</span>
                <span className="mt-0.5 text-[11px] text-mute">{suffix}</span>
              </div>
              <button
                type="button"
                disabled={!spot}
                onClick={() => spot && navigate(`/spot/${spot.id}`)}
                className="min-w-0 flex-1 text-left"
              >
                <span className="block truncate font-display text-[16px] font-bold">{event.title}</span>
                <span className="block truncate text-[14px] text-mute">{details.filter(Boolean).join(' · ')}</span>
              </button>
              <button
                type="button"
                aria-label={saved ? 'Remove from saved' : 'Save event'}
                aria-pressed={saved}
                onClick={() => setSavedIds(setEventSaved(event.id, !saved))}
                className="flex h-10 w-10 shrink-0 items-center justify-center"
              >
                <Bookmark className="h-5 w-5" fill={saved ? '#0F1E26' : 'none'} />
              </button>
            </div>
          )
        })}

        {result && shown.length === 0 && (
          <p className="py-8 text-center text-sm text-mute">
            {tab === 'tonight' ? 'Nothing else on tonight. Check This week.' : 'Nothing listed yet.'}
          </p>
        )}
        {result?.isSample && shown.length > 0 && (
          <p className="pt-1 text-center text-[12px] text-mute">Sample events for the prototype.</p>
        )}
      </div>
    </div>
  )
}
