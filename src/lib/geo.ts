export interface LatLng {
  lat: number
  lng: number
}

export const CAMPUS_CENTER: LatLng = { lat: 43.0745, lng: -89.4 }
// Further than this from campus, walking times and "near you" stop being useful.
const NEAR_CAMPUS_M = 6000
// Streets aren't straight lines.
const DETOUR_FACTOR = 1.3
const WALK_M_PER_MIN = 80

export function distanceMeters(a: LatLng, b: LatLng): number {
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLng = (b.lng - a.lng) * rad
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h))
}

export function walkMinutes(from: LatLng, to: LatLng): number {
  return Math.max(1, Math.round((distanceMeters(from, to) * DETOUR_FACTOR) / WALK_M_PER_MIN))
}

export function isNearCampus(point: LatLng): boolean {
  return distanceMeters(point, CAMPUS_CENTER) <= NEAR_CAMPUS_M
}
