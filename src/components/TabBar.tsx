import { CalendarDays, CircleCheck, Map, User } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../lib/appContext'

const tabs = [
  { path: '/', label: 'Map', Icon: Map },
  { path: '/events', label: 'Events', Icon: CalendarDays },
  { path: null, label: 'Check in', Icon: CircleCheck },
  { path: '/you', label: 'You', Icon: User },
] as const

export function TabBar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { openCheckIn } = useApp()

  return (
    <nav className="z-40 flex shrink-0 border-t border-line bg-white pb-[max(env(safe-area-inset-bottom),10px)] pt-2.5">
      {tabs.map(({ path, label, Icon }) => {
        const active = path === pathname
        return (
          <button
            key={label}
            type="button"
            aria-current={active ? 'page' : undefined}
            onClick={() => (path ? navigate(path) : openCheckIn())}
            className={`flex flex-1 flex-col items-center gap-1 text-[11px] font-semibold ${
              active ? 'text-lake' : 'text-mute'
            }`}
          >
            <Icon className="h-6 w-6" strokeWidth={1.9} />
            {label}
          </button>
        )
      })}
    </nav>
  )
}
