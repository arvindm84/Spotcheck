import { CROWD_LEVELS, type CrowdLevel } from '../lib/crowd'

const BAR_HEIGHTS = [0.3, 0.5, 0.75, 1]

interface CrowdBarsProps {
  level: CrowdLevel
  // Height of the tallest bar, in px.
  size?: number
  color?: string
}

// Four rising bars; one more is filled at each crowd level.
export function CrowdBars({ level, size = 20, color = '#0F1E26' }: CrowdBarsProps) {
  const filled = CROWD_LEVELS.indexOf(level) + 1
  const width = size * 0.3
  return (
    <span aria-hidden="true" className="inline-flex items-end" style={{ gap: size * 0.14, height: size }}>
      {BAR_HEIGHTS.map((height, i) => (
        <span
          key={height}
          style={{
            width,
            height: size * height,
            borderRadius: width * 0.3,
            background: color,
            opacity: i < filled ? 1 : 0.25,
          }}
        />
      ))}
    </span>
  )
}
