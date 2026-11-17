import { createContext, useContext } from 'react'
import type { DataSource } from './data'
import type { LatLng } from './geo'
import type { IntentId } from './intent'
import type { Location, VibeTag } from '../types/location'

export interface AppState {
  locations: Location[]
  vibeTags: VibeTag[]
  loaded: boolean
  dataSource: DataSource
  refresh: () => Promise<void>
  // Time of the last refresh (ms); what "updated 4 min ago" is measured from.
  now: number
  // null until the visitor has picked one on the onboarding screen.
  intent: IntentId | null
  setIntent: (intent: IntentId) => void
  savedSpotIds: string[]
  toggleSaved: (locationId: string) => void
  // Only set when the visitor shared their location and is near campus.
  userLocation: LatLng | null
  requestLocation: () => void
  // Opens the check-in sheet; with no spot it first asks where the visitor is.
  openCheckIn: (location?: Location) => void
  showToast: (message: string) => void
}

export const AppContext = createContext<AppState | null>(null)

export function useApp(): AppState {
  const state = useContext(AppContext)
  if (!state) throw new Error('useApp must be used inside AppProvider')
  return state
}
