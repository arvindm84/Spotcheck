import { useMemo, useState } from 'react'
import { Check, ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../lib/appContext'
import { crowdColor, crowdInk, crowdLabel, getCrowdLevel, type CrowdLevel } from '../lib/crowd'
import { getPromotion, getSpotStats, postPromotion } from '../lib/data'

const BUSINESS_CATEGORIES = ['coffee', 'food']

const seatSummary: Record<CrowdLevel, string> = {
  quiet: 'seats open',
  moderate: 'some seats',
  busy: 'few seats',
  packed: 'no seats',
}

// Pricing isn't set yet, so the plans don't quote one.
const plans = [
  { id: 'listing', name: 'Listing', price: 'Free' },
  { id: 'featured', name: 'Featured', price: 'Pricing soon' },
  { id: 'premium', name: 'Premium', price: 'Pricing soon' },
]

export function BusinessView() {
  const { locations, openCheckIn, showToast } = useApp()
  const navigate = useNavigate()
  const businesses = useMemo(
    () =>
      locations
        .filter((spot) => BUSINESS_CATEGORIES.includes(spot.category))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [locations],
  )
  const [businessId, setBusinessId] = useState<string | null>(() => getPromotion()?.locationId ?? null)
  const [offer, setOffer] = useState('')
  const [plan, setPlan] = useState('featured')
  const business = businesses.find((spot) => spot.id === businessId) ?? businesses[0]

  if (!business) {
    return <div className="absolute inset-0 z-30 flex items-center justify-center bg-paper text-mute">Loading…</div>
  }

  const level = getCrowdLevel(business.busyScore)
  const stats = getSpotStats(business.id)

  const promote = () => {
    const title = offer.trim()
    if (!title) return
    postPromotion(business.id, title)
    setOffer('')
    showToast('Posted — it’s the featured spot on Events tonight.')
  }

  return (
    <div className="absolute inset-0 z-30 overflow-y-auto bg-paper px-4 pb-10 pt-5">
      <button
        type="button"
        aria-label="Back"
        onClick={() => navigate(-1)}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-white"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>

      <div className="mt-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[15px] font-medium text-mute">SpotCheck for Business</p>
          <h1 className="font-display text-[26px] font-extrabold leading-tight tracking-tight">{business.name}</h1>
        </div>
        <span className="mt-1 flex shrink-0 items-center gap-1.5 rounded-xl bg-shallows px-3 py-1.5 text-[14px] font-bold text-lake">
          <Check className="h-4 w-4" strokeWidth={3} />
          Verified
        </span>
      </div>

      <label className="mt-2 flex items-center gap-2 text-[13px] text-mute">
        Demo — preview as
        <select
          value={business.id}
          onChange={(event) => setBusinessId(event.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-line bg-white px-2 py-1 text-[13px] text-ink"
        >
          {businesses.map((spot) => (
            <option key={spot.id} value={spot.id}>
              {spot.name}
            </option>
          ))}
        </select>
      </label>

      <div
        style={{ background: crowdColor[level], color: crowdInk[level] }}
        className="mt-4 flex items-center justify-between gap-3 rounded-3xl p-4"
      >
        <div className="min-w-0">
          <p className="text-[14px] font-semibold">Students see you as</p>
          <p className="font-display text-[24px] font-extrabold leading-tight">
            {crowdLabel[level]} · {seatSummary[level]}
          </p>
        </div>
        <button
          type="button"
          onClick={() => openCheckIn(business)}
          className="h-11 shrink-0 rounded-xl bg-white px-4 text-[15px] font-bold text-ink"
        >
          Update
        </button>
      </div>

      <div className="mt-4 flex gap-2.5">
        {[
          { label: 'Map views', value: stats.views, sub: 'this week' },
          { label: 'Saves', value: stats.saves, sub: 'this week' },
          { label: 'Directions', value: stats.directions, sub: 'taps' },
        ].map(({ label, value, sub }) => (
          <div key={label} className="flex-1 rounded-2xl bg-white p-3">
            <p className="text-[13px] text-mute">{label}</p>
            <p className="font-display text-[22px] font-bold leading-tight">{value}</p>
            <p className="text-[12px] text-mute">{sub}</p>
          </div>
        ))}
      </div>
      <p className="mt-1.5 px-1 text-[12px] text-mute">Prototype: counted from this device only.</p>

      <div className="mt-4 rounded-3xl bg-white p-4">
        <h2 className="font-display text-[18px] font-bold">Promote tonight</h2>
        <label htmlFor="offer" className="mt-3 block text-[14px] font-bold">
          Offer or event
        </label>
        <input
          id="offer"
          value={offer}
          onChange={(event) => setOffer(event.target.value)}
          maxLength={60}
          placeholder="e.g. Study night, open till 1 am"
          className="mt-2 h-12 w-full rounded-2xl border border-line bg-paper px-4 text-[15px] outline-none placeholder:text-mute focus:border-lake"
        />
        <button
          type="button"
          disabled={!offer.trim()}
          onClick={promote}
          className="mt-3 h-[50px] w-full rounded-2xl bg-terrace font-display text-[16px] font-bold text-ink disabled:opacity-40"
        >
          Post to Tonight
        </button>
      </div>

      <h2 className="mb-2 mt-6 text-xs font-bold uppercase tracking-wider text-mute">Your plan</h2>
      <div className="flex gap-2.5">
        {plans.map(({ id, name, price }) => (
          <button
            key={id}
            type="button"
            aria-pressed={plan === id}
            onClick={() => setPlan(id)}
            className={`flex-1 rounded-2xl p-3 text-left ${
              plan === id ? 'bg-lake text-white' : 'border border-line bg-white text-ink'
            }`}
          >
            <span className="block font-display text-[15px] font-bold">{name}</span>
            <span className={`block text-[13px] ${plan === id ? 'text-white/85' : 'text-mute'}`}>{price}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
