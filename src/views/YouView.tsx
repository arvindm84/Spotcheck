import { ChevronRight, Store } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { CrowdBars } from '../components/CrowdBars'
import { useApp } from '../lib/appContext'
import { crowdColor, crowdInk, crowdLabel, getCrowdLevel } from '../lib/crowd'
import { getIntent } from '../lib/intent'

export function YouView() {
  const { locations, intent, savedSpotIds, dataSource, loaded } = useApp()
  const navigate = useNavigate()
  const savedSpots = locations.filter((spot) => savedSpotIds.includes(spot.id))
  const current = getIntent(intent ?? 'focus')

  return (
    <div className="absolute inset-0 z-30 overflow-y-auto bg-paper px-4 pb-8 pt-12">
      <h1 className="font-display text-[32px] font-extrabold leading-tight tracking-tight">You</h1>

      <div className="mt-4 flex items-center justify-between rounded-3xl bg-white p-4">
        <div>
          <p className="text-[13px] text-mute">Looking for</p>
          <p className="font-display text-[18px] font-bold">{current.label}</p>
          <p className="text-[14px] text-mute">{current.sub}</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/welcome')}
          className="h-10 rounded-xl bg-shallows px-4 text-[14px] font-bold text-lake"
        >
          Change
        </button>
      </div>

      <h2 className="mb-2 mt-6 text-xs font-bold uppercase tracking-wider text-mute">Saved spots</h2>
      {savedSpots.length === 0 ? (
        <p className="rounded-3xl bg-white p-4 text-[14px] text-mute">
          Tap the bookmark on a spot to keep it here.
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {savedSpots.map((spot) => {
            const level = getCrowdLevel(spot.busyScore)
            return (
              <button
                key={spot.id}
                type="button"
                onClick={() => navigate(`/spot/${spot.id}`)}
                className="flex items-center gap-3 rounded-2xl bg-white p-2.5 text-left"
              >
                <span
                  style={{ background: crowdColor[level] }}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                >
                  <CrowdBars level={level} size={12} color={crowdInk[level]} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-[15px] font-bold">{spot.name}</span>
                  <span className="block text-[13px] text-mute">{crowdLabel[level]}</span>
                </span>
                <ChevronRight className="h-5 w-5 text-mute" />
              </button>
            )
          })}
        </div>
      )}

      <h2 className="mb-2 mt-6 text-xs font-bold uppercase tracking-wider text-mute">Own a spot?</h2>
      <button
        type="button"
        onClick={() => navigate('/business')}
        className="flex w-full items-center gap-3 rounded-3xl bg-white p-4 text-left"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-shallows">
          <Store className="h-5 w-5 text-lake" />
        </span>
        <span className="flex-1">
          <span className="block font-display text-[16px] font-bold">SpotCheck for Business</span>
          <span className="block text-[14px] text-mute">See how students see you, promote tonight</span>
        </span>
        <ChevronRight className="h-5 w-5 text-mute" />
      </button>

      {loaded && (
        <p className="mt-8 flex items-center justify-center gap-2 text-[12px] text-mute">
          <span className={`h-2 w-2 rounded-full ${dataSource === 'live' ? 'bg-terrace' : 'bg-line'}`} />
          {dataSource === 'live' ? 'Connected to live data' : 'Showing demo data'}
        </p>
      )}
    </div>
  )
}
