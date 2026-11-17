import { useState } from 'react'
import { Coffee, Notebook, Star, Users, type LucideIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { useApp } from '../lib/appContext'
import { intents, type IntentId } from '../lib/intent'

const icons: Record<IntentId, LucideIcon> = {
  focus: Notebook,
  group: Users,
  hangout: Coffee,
  events: Star,
}

export function OnboardingView() {
  const { intent, setIntent, requestLocation } = useApp()
  const [choice, setChoice] = useState<IntentId>(intent ?? 'focus')
  const navigate = useNavigate()

  const start = () => {
    setIntent(choice)
    // Asked here, on a tap, so the browser's location prompt has context.
    requestLocation()
    navigate(choice === 'events' ? '/events' : '/', { replace: true })
  }

  return (
    <div className="absolute inset-0 z-30 flex flex-col overflow-y-auto bg-paper px-5 pb-6 pt-14">
      <Logo />
      <h1 className="mt-8 font-display text-[38px] font-extrabold leading-[1.06] tracking-tight">
        What are you looking for right now?
      </h1>
      <p className="mt-4 text-[17px] leading-snug text-mute">
        We'll sort spots around campus by what fits. Change it anytime.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-3">
        {intents.map(({ id, label, sub }) => {
          const Icon = icons[id]
          const selected = id === choice
          return (
            <button
              key={id}
              type="button"
              aria-pressed={selected}
              onClick={() => setChoice(id)}
              className={`flex h-[148px] flex-col justify-between rounded-3xl p-[18px] text-left ${
                selected ? 'bg-lake text-white' : 'border border-line bg-white text-ink'
              }`}
            >
              <Icon className="h-6 w-6" strokeWidth={2} />
              <span>
                <span className="block font-display text-lg font-bold">{label}</span>
                <span className={`block text-sm ${selected ? 'text-white/85' : 'text-mute'}`}>{sub}</span>
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-7 flex gap-3 rounded-2xl bg-shallows p-4">
        <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-terrace" />
        <p className="text-[15px] leading-snug">
          Status comes from students checking in. A 10-second check-in keeps it accurate for everyone.
        </p>
      </div>

      <button
        type="button"
        onClick={start}
        className="mt-7 h-14 shrink-0 rounded-2xl bg-lake font-display text-lg font-bold text-white"
      >
        Show me spots
      </button>
    </div>
  )
}
