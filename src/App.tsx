import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { TabBar } from './components/TabBar'
import { useApp } from './lib/appContext'
import { BusinessView } from './views/BusinessView'
import { EventsView } from './views/EventsView'
import { ExploreView } from './views/ExploreView'
import { OnboardingView } from './views/OnboardingView'
import { SpotDetailView } from './views/SpotDetailView'
import { YouView } from './views/YouView'

const TAB_PATHS = ['/', '/events', '/you']

// The map stays mounted underneath; every other screen is drawn over it, so going back to the map
// keeps its position and doesn't reload Mapbox.
function App() {
  const { pathname } = useLocation()
  const { intent } = useApp()

  if (!intent && pathname !== '/welcome') return <Navigate to="/welcome" replace />

  return (
    <>
      <div className="relative min-h-0 flex-1">
        <ExploreView />
        <Routes>
          <Route path="/" element={null} />
          <Route path="/welcome" element={<OnboardingView />} />
          <Route path="/spot/:id" element={<SpotDetailView />} />
          <Route path="/events" element={<EventsView />} />
          <Route path="/you" element={<YouView />} />
          <Route path="/business" element={<BusinessView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      {TAB_PATHS.includes(pathname) && <TabBar />}
    </>
  )
}

export default App
