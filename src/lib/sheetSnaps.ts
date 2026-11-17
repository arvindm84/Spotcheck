export type SheetSnap = 'peek' | 'half' | 'full'

export const SNAP_ORDER: SheetSnap[] = ['peek', 'half', 'full']

const PEEK_HEIGHT = 244
// Space left above the sheet at full height so the search bar and filters stay reachable.
const TOP_CLEARANCE = 84

export function getSnapHeights(containerHeight: number): Record<SheetSnap, number> {
  const full = Math.max(PEEK_HEIGHT, containerHeight - TOP_CLEARANCE)
  const half = Math.min(full, Math.max(PEEK_HEIGHT, containerHeight * 0.5))
  return { peek: PEEK_HEIGHT, half, full }
}
