import type { CheckIn, Location } from '../types/location'

// The "Usually on Tuesdays" chart: nine 90-minute buckets from 10 am to 11:30 pm.
export const BUCKET_STARTS = [10, 11.5, 13, 14.5, 16, 17.5, 19, 20.5, 22]
const BUCKET_HOURS = 1.5
// A bucket uses real check-ins once it has this many for that weekday.
const MIN_REPORTS_PER_BUCKET = 3
// The chart is labelled "from check-ins" once this many buckets are backed by real reports.
const MIN_REAL_BUCKETS = 5

// How busy each kind of place usually gets through the day (0-10), used until check-ins fill in.
const TYPICAL: Record<string, number[]> = {
  study: [2, 3, 5, 6, 7.5, 9, 7.5, 5.5, 3.5],
  coffee: [7, 8, 7, 6, 5, 4, 3, 2.5, 2],
  food: [3, 7, 8, 4, 4, 7, 8, 5, 3],
  venue: [1, 1, 2, 2, 3, 5, 7, 8.5, 9],
  outdoors: [3, 4, 6, 7, 7, 6, 4, 2, 1],
}

function typicalFor(category: string): number[] {
  if (category === 'coffee') return TYPICAL.coffee
  if (category === 'food') return TYPICAL.food
  if (category === 'venue') return TYPICAL.venue
  if (category === 'park' || category === 'shop') return TYPICAL.outdoors
  return TYPICAL.study
}

function bucketOf(date: Date): number {
  const hour = date.getHours() + date.getMinutes() / 60
  return BUCKET_STARTS.findIndex((start) => hour >= start && hour < start + BUCKET_HOURS)
}

export interface DayPattern {
  values: number[]
  // Index of the bucket that contains "now", or -1 outside 10 am - 11:30 pm.
  nowIndex: number
  fromCheckIns: boolean
}

export function getDayPattern(location: Location, reports: CheckIn[], now = new Date()): DayPattern {
  const sums = BUCKET_STARTS.map(() => ({ total: 0, count: 0 }))
  for (const report of reports) {
    const at = new Date(report.reportedAt)
    if (at.getDay() !== now.getDay()) continue
    const bucket = bucketOf(at)
    if (bucket < 0) continue
    sums[bucket].total += report.busyScore
    sums[bucket].count += 1
  }

  const typical = typicalFor(location.category)
  let realBuckets = 0
  const values = typical.map((value, i) => {
    if (sums[i].count < MIN_REPORTS_PER_BUCKET) return value
    realBuckets += 1
    return sums[i].total / sums[i].count
  })
  return { values, nowIndex: bucketOf(now), fromCheckIns: realBuckets >= MIN_REAL_BUCKETS }
}

function hourLabel(hour: number): string {
  const whole = Math.floor(hour)
  const h12 = whole % 12 === 0 ? 12 : whole % 12
  const minutes = hour % 1 ? ':30' : ''
  return `${h12}${minutes} ${whole < 12 ? 'am' : 'pm'}`
}

// One line under the chart, e.g. "Quieter after 8:30 pm."
export function patternSummary({ values, nowIndex }: DayPattern): string {
  const peak = values.indexOf(Math.max(...values))
  if (nowIndex < 0) return `Busiest around ${hourLabel(BUCKET_STARTS[peak])}.`
  const current = values[nowIndex]
  const quieter = values.findIndex((value, i) => i > nowIndex && value <= current - 2)
  if (quieter > 0) return `Quieter after ${hourLabel(BUCKET_STARTS[quieter])}.`
  const busier = values.findIndex((value, i) => i > nowIndex && value >= current + 2)
  if (busier > 0) return `Gets busier around ${hourLabel(BUCKET_STARTS[busier])}.`
  return 'About this busy for the rest of the day.'
}
