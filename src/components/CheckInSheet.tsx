import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { useApp } from '../lib/appContext'
import {
  CROWD_LEVELS,
  crowdColor,
  crowdInk,
  crowdLabel,
  crowdScore,
  noiseLabel,
  splitName,
  type CrowdLevel,
} from '../lib/crowd'
import { submitCheckIn } from '../lib/data'
import { distanceMeters } from '../lib/geo'
import type { Location, NoiseLevel, OutletLevel } from '../types/location'

const NOISE_LEVELS: NoiseLevel[] = ['whisper', 'chatter', 'loud']
const OUTLET_LEVELS: OutletLevel[] = ['plenty', 'few', 'none']
const outletChoice: Record<OutletLevel, string> = { plenty: 'Plenty', few: 'A few', none: 'None' }

interface ChoiceProps {
  label: string
  selected: boolean
  onClick: () => void
  // Selected fill; defaults to Lake.
  color?: string
  ink?: string
}

function Choice({ label, selected, onClick, color = '#0F5C7A', ink = '#FFFFFF' }: ChoiceProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      style={selected ? { background: color, color: ink } : undefined}
      className={`h-[52px] flex-1 rounded-2xl text-[15px] font-semibold ${
        selected ? 'border-[3px] border-ink' : 'border border-line bg-paper text-ink'
      }`}
    >
      {label}
    </button>
  )
}

interface CheckInSheetProps {
  // null: ask which spot first (the "Check in" tab).
  initialLocation: Location | null
  onClose: () => void
}

export function CheckInSheet({ initialLocation, onClose }: CheckInSheetProps) {
  const { locations, userLocation, refresh, showToast } = useApp()
  const [location, setLocation] = useState(initialLocation)
  const [query, setQuery] = useState('')
  const [crowd, setCrowd] = useState<CrowdLevel | null>(null)
  const [noise, setNoise] = useState<NoiseLevel | null>(null)
  const [outlets, setOutlets] = useState<OutletLevel | null>(null)
  const [posting, setPosting] = useState(false)
  // Plays the exit animation; its end calls onClose.
  const [closing, setClosing] = useState(false)
  const close = () => setClosing(true)
  // In case the exit animation never ends (e.g. the tab is hidden).
  useEffect(() => {
    if (!closing) return
    const timer = window.setTimeout(onClose, 500)
    return () => window.clearTimeout(timer)
  }, [closing, onClose])

  // Nearest first when we know where the visitor is.
  const choices = useMemo(() => {
    const q = query.trim().toLowerCase()
    const matches = locations.filter(
      (spot) => spot.isActive && (!q || `${spot.name} ${spot.address}`.toLowerCase().includes(q)),
    )
    if (!userLocation) return matches.sort((a, b) => a.name.localeCompare(b.name))
    return matches.sort((a, b) => distanceMeters(userLocation, a) - distanceMeters(userLocation, b))
  }, [locations, query, userLocation])

  const post = async () => {
    if (!location || !crowd) return
    setPosting(true)
    const result = await submitCheckIn({
      locationId: location.id,
      busyScore: crowdScore[crowd],
      noise,
      outlets,
    })
    await refresh()
    showToast(
      result === 'server'
        ? 'Thanks — your update is live.'
        : result === 'too-soon'
          ? 'You updated this spot a few minutes ago. Try again in 10 minutes.'
          : 'Saved on this device — the server couldn’t be reached.',
    )
    close()
  }

  const name = location ? splitName(location.name) : null

  return (
    <div
      className={`absolute inset-0 z-50 flex flex-col justify-end bg-ink ${closing ? 'animate-fade-out pointer-events-none' : 'animate-fade-in'}`}
    >
      <button type="button" aria-label="Close" onClick={close} className="min-h-16 flex-1" />
      <div
        role="dialog"
        aria-label="Check in"
        className={`flex max-h-[88%] flex-col rounded-t-[28px] bg-white ${closing ? 'animate-sheet-down' : 'animate-sheet-up'}`}
        onAnimationEnd={(event) => {
          if (closing && event.target === event.currentTarget) onClose()
        }}
      >
        <div className="flex justify-center pb-2 pt-3">
          <span className="h-1 w-10 rounded-full bg-line" />
        </div>

        {!location ? (
          <div className="flex min-h-0 flex-col px-5 pb-6">
            <h2 className="font-display text-[28px] font-bold leading-tight tracking-tight">Where are you?</h2>
            <p className="mt-1 text-[15px] text-mute">
              {userLocation ? 'Closest spots first.' : 'Pick the spot you’re at.'}
            </p>
            <label className="mt-4 flex h-12 shrink-0 items-center gap-2.5 rounded-2xl border border-line bg-paper px-4">
              <Search className="h-4 w-4 text-mute" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search a spot"
                className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-mute"
              />
            </label>
            <div className="mt-3 flex min-h-0 flex-col gap-2 overflow-y-auto">
              {choices.map((spot) => (
                <button
                  key={spot.id}
                  type="button"
                  onClick={() => setLocation(spot)}
                  className="rounded-2xl bg-paper px-4 py-3 text-left"
                >
                  <span className="block text-[15px] font-semibold">{spot.name}</span>
                  <span className="block text-[13px] text-mute">{spot.address}</span>
                </button>
              ))}
              {choices.length === 0 && <p className="py-6 text-center text-sm text-mute">No spots match.</p>}
            </div>
          </div>
        ) : (
          <div className="overflow-y-auto px-5 pb-8">
            <p className="text-[15px] font-medium text-mute">
              {name?.place ? `${name.place} · ${name.title}` : name?.title}
            </p>
            <h2 className="mt-0.5 font-display text-[28px] font-bold leading-tight tracking-tight">
              How is it right now?
            </h2>
            <p className="mt-1 text-[15px] text-mute">Three taps. Helps everyone behind you.</p>

            <h3 className="mb-2.5 mt-6 text-[15px] font-semibold">Crowd</h3>
            <div className="flex gap-2">
              {CROWD_LEVELS.map((level) => (
                <Choice
                  key={level}
                  label={crowdLabel[level]}
                  selected={crowd === level}
                  onClick={() => setCrowd(level)}
                  color={crowdColor[level]}
                  ink={crowdInk[level]}
                />
              ))}
            </div>

            <h3 className="mb-2.5 mt-6 text-[15px] font-semibold">Noise</h3>
            <div className="flex gap-2">
              {NOISE_LEVELS.map((level) => (
                <Choice
                  key={level}
                  label={noiseLabel[level]}
                  selected={noise === level}
                  onClick={() => setNoise(noise === level ? null : level)}
                />
              ))}
            </div>

            <h3 className="mb-2.5 mt-6 text-[15px] font-semibold">Free outlets?</h3>
            <div className="flex gap-2">
              {OUTLET_LEVELS.map((level) => (
                <Choice
                  key={level}
                  label={outletChoice[level]}
                  selected={outlets === level}
                  onClick={() => setOutlets(outlets === level ? null : level)}
                />
              ))}
            </div>

            <button
              type="button"
              disabled={!crowd || posting}
              onClick={post}
              className="mt-7 h-14 w-full rounded-2xl bg-lake font-display text-lg font-bold text-white disabled:opacity-40"
            >
              {posting ? 'Posting…' : 'Post update'}
            </button>
            <p className="mt-4 text-center text-[13px] text-mute">
              Anonymous. Your update is never tied to your name.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
