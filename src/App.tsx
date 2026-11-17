import { useState } from 'react'
import { Navigate, NavigationType, Route, useLocation, type Location } from 'react-router-dom'
import { AnimatedRoutes, type TransitionClasses } from './components/AnimatedRoutes'
import { TabBar } from './components/TabBar'
import { useApp } from './lib/appContext'
import { BusinessView } from './views/BusinessView'
import { EventsView } from './views/EventsView'
import { ExploreView } from './views/ExploreView'
import { OnboardingView } from './views/OnboardingView'
import { SpotDetailView } from './views/SpotDetailView'
import { YouView } from './views/YouView'

const KNOWN_PATHS = /^\/(welcome|events|you|business|spot\/[^/]+)?$/
// Screens that sit between the map and the tab bar.
const TAB_SCREENS = ['/events', '/you']

// Tabs cross-fade: a new tab fades in over the old one, which stays put underneath (so the map
// doesn't flash through); going back to the map fades the tab out.
function tabTransition(_: NavigationType, hasNext: boolean): TransitionClasses {
  return { enter: 'animate-tab-in', exit: hasNext ? 'animate-hold' : 'animate-tab-out', exitOnTop: !hasNext }
}

// Full screens push in from the right and slide back out when going back. Leaving one any other
// way (e.g. onboarding → map) fades it out.
function pushTransition(navigationType: NavigationType): TransitionClasses {
  const back = navigationType === NavigationType.Pop
  return {
    enter: back ? 'animate-screen-in' : 'animate-push-in',
    exit: back ? 'animate-push-out' : 'animate-screen-out',
    exitOnTop: back,
  }
}

// The map and the tab bar stay mounted and never change size (resizing Mapbox makes it jump).
// Tab screens are drawn over the map; full screens over everything, tab bar included.
function App() {
  const location = useLocation()
  const { pathname } = location
  const { intent } = useApp()

  // The tab screen under a full screen stays the one it was opened from (e.g. You under Business).
  const isTabScreen = TAB_SCREENS.includes(pathname)
  const isFullScreen = KNOWN_PATHS.test(pathname) && pathname !== '/' && !isTabScreen
  const [tabLocation, setTabLocation] = useState<Location | null>(isTabScreen ? location : null)
  const nextTabLocation = isTabScreen ? location : isFullScreen ? tabLocation : null
  if (nextTabLocation?.key !== tabLocation?.key) setTabLocation(nextTabLocation)

  if (!intent && pathname !== '/welcome') return <Navigate to="/welcome" replace />
  if (!KNOWN_PATHS.test(pathname)) return <Navigate to="/" replace />

  return (
    <>
      <div className="relative min-h-0 flex-1">
        <ExploreView />
        <div className="pointer-events-none absolute inset-0 z-30">
          <AnimatedRoutes location={nextTabLocation} transition={tabTransition}>
            <Route path="/events" element={<EventsView />} />
            <Route path="/you" element={<YouView />} />
          </AnimatedRoutes>
        </div>
      </div>
      <TabBar />
      <div className="pointer-events-none absolute inset-0 z-[45] overflow-hidden">
        <AnimatedRoutes location={isFullScreen ? location : null} transition={pushTransition}>
          <Route path="/welcome" element={<OnboardingView />} />
          <Route path="/spot/:id" element={<SpotDetailView />} />
          <Route path="/business" element={<BusinessView />} />
        </AnimatedRoutes>
      </div>
    </>
  )
}

export default App
