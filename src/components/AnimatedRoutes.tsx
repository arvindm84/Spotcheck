import { useEffect, useState, type AnimationEvent, type ReactNode } from 'react'
import { NavigationType, Routes, useNavigationType, type Location } from 'react-router-dom'

// Leaving screens are removed when their animation ends, or after this long if it never does
// (a hidden tab pauses animations; reduced-motion makes them instant).
const EXIT_FALLBACK_MS = 600

export interface TransitionClasses {
  // Animation for the screen arriving.
  enter: string
  // Animation for the screen leaving; its end removes the screen.
  exit: string
  // Whether the leaving screen is drawn above the arriving one (going back: it slides off the top).
  exitOnTop: boolean
}

interface Entry {
  location: Location
  className: string
  leaving: boolean
  onTop: boolean
}

interface AnimatedRoutesProps {
  // The location this layer shows; null shows nothing.
  location: Location | null
  // How to animate, given how the visitor navigated and whether a screen replaces the leaving one.
  transition: (navigationType: NavigationType, hasNext: boolean) => TransitionClasses
  // <Route> elements.
  children: ReactNode
}

// Like <Routes>, but keeps the previous screen mounted while it animates out.
export function AnimatedRoutes({ location, transition, children }: AnimatedRoutesProps) {
  const navigationType = useNavigationType()
  const [entries, setEntries] = useState<Entry[]>(() =>
    location ? [{ location, className: '', leaving: false, onTop: false }] : [],
  )

  // Adjusting state while rendering (rather than in an effect) avoids a frame where the new screen
  // shows without its enter animation.
  const current = entries.find((entry) => !entry.leaving) ?? null
  if ((current?.location.key ?? null) !== (location?.key ?? null)) {
    const { enter, exit, exitOnTop } = transition(navigationType, location !== null)
    setEntries([
      // A screen coming straight back while still leaving replaces its leaving copy.
      ...entries.filter((entry) => entry.leaving && entry.location.key !== location?.key),
      ...(current ? [{ ...current, className: exit, leaving: true, onTop: exitOnTop }] : []),
      ...(location ? [{ location, className: enter, leaving: false, onTop: !exitOnTop }] : []),
    ])
  }

  const remove = (key: string) =>
    setEntries((all) => all.filter((entry) => !(entry.leaving && entry.location.key === key)))

  const leavingKeys = entries
    .filter((entry) => entry.leaving)
    .map((entry) => entry.location.key)
    .join(' ')
  useEffect(() => {
    if (!leavingKeys) return
    const timer = window.setTimeout(() => {
      const keys = new Set(leavingKeys.split(' '))
      setEntries((all) => all.filter((entry) => !(entry.leaving && keys.has(entry.location.key))))
    }, EXIT_FALLBACK_MS)
    return () => window.clearTimeout(timer)
  }, [leavingKeys])

  const finish = (entry: Entry) => (event: AnimationEvent<HTMLDivElement>) => {
    // Animations inside the screen bubble up too.
    if (event.target === event.currentTarget && entry.leaving) remove(entry.location.key)
  }

  return entries.map((entry) => (
    <div
      key={entry.location.key}
      className={`absolute inset-0 ${entry.className} ${entry.leaving ? 'pointer-events-none' : 'pointer-events-auto'}`}
      style={{ zIndex: entry.onTop ? 2 : 1 }}
      onAnimationEnd={finish(entry)}
      aria-hidden={entry.leaving || undefined}
    >
      <Routes location={entry.location}>{children}</Routes>
    </div>
  ))
}
