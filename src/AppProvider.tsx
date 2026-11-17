import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { CheckInSheet } from './components/CheckInSheet'
import { AppContext, type AppState } from './lib/appContext'
import {
  getDataSource,
  getLocations,
  getSavedSpotIds,
  getVibeTags,
  setSpotSaved,
  type DataSource,
} from './lib/data'
import { isNearCampus, type LatLng } from './lib/geo'
import type { IntentId } from './lib/intent'
import type { Location, VibeTag } from './types/location'

const REFRESH_MS = 60_000
const TOAST_MS = 3200

export function AppProvider({ children }: { children: ReactNode }) {
  const [locations, setLocations] = useState<Location[]>([])
  const [vibeTags, setVibeTags] = useState<VibeTag[]>([])
  const [loaded, setLoaded] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [dataSource, setDataSource] = useState<DataSource>('demo')
  // Kept in memory only, so every visit starts on the onboarding screen.
  const [intent, setIntent] = useState<IntentId | null>(null)
  const [savedSpotIds, setSavedSpotIds] = useState<string[]>(getSavedSpotIds)
  const [userLocation, setUserLocation] = useState<LatLng | null>(null)
  const [checkIn, setCheckIn] = useState<{ location: Location | null } | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)

  const refresh = useCallback(async () => {
    const data = await getLocations()
    setLocations(data)
    setNow(Date.now())
    setDataSource(getDataSource())
    setLoaded(true)
  }, [])

  const requestLocation = useCallback(() => {
    if (!('geolocation' in navigator)) return
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const point = { lat: position.coords.latitude, lng: position.coords.longitude }
        setUserLocation(isNearCampus(point) ? point : null)
      },
      () => setUserLocation(null),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    )
  }, [])

  useEffect(() => {
    // Spots first, so the tags request knows whether the server answered.
    const first = window.setTimeout(() => refresh().then(() => getVibeTags().then(setVibeTags)), 0)
    const timer = window.setInterval(refresh, REFRESH_MS)
    return () => {
      window.clearTimeout(first)
      window.clearInterval(timer)
    }
  }, [refresh])

  // Returning visitors who already allowed location get it without a new prompt.
  useEffect(() => {
    navigator.permissions
      ?.query({ name: 'geolocation' })
      .then((status) => {
        if (status.state === 'granted') requestLocation()
      })
      .catch(() => {})
  }, [requestLocation])

  const toggleSaved = useCallback((locationId: string) => {
    setSavedSpotIds((current) => setSpotSaved(locationId, !current.includes(locationId)))
  }, [])

  const openCheckIn = useCallback((location?: Location) => {
    setCheckIn({ location: location ?? null })
  }, [])

  const closeCheckIn = useCallback(() => setCheckIn(null), [])

  const showToast = useCallback((message: string) => {
    setToast(message)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), TOAST_MS)
  }, [])

  const state = useMemo<AppState>(
    () => ({
      locations,
      vibeTags,
      loaded,
      dataSource,
      refresh,
      now,
      intent,
      setIntent,
      savedSpotIds,
      toggleSaved,
      userLocation,
      requestLocation,
      openCheckIn,
      showToast,
    }),
    [
      locations,
      vibeTags,
      loaded,
      dataSource,
      refresh,
      now,
      intent,
      setIntent,
      savedSpotIds,
      toggleSaved,
      userLocation,
      requestLocation,
      openCheckIn,
      showToast,
    ],
  )

  return (
    <AppContext.Provider value={state}>
      {children}
      {checkIn && <CheckInSheet initialLocation={checkIn.location} onClose={closeCheckIn} />}
      {toast && (
        <div
          role="status"
          className="animate-fade-in pointer-events-none absolute inset-x-4 bottom-24 z-[60] rounded-2xl bg-ink px-4 py-3 text-center text-sm font-medium text-white shadow-lg"
        >
          {toast}
        </div>
      )}
    </AppContext.Provider>
  )
}
