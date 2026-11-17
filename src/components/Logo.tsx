// Pin + check, with the orange "live" dot.
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <path fill="#0F5C7A" d="M19 37S4 25 4 15.500a15 15 0 0 1 30 0C34 25 19 37 19 37Z" />
      <path
        fill="none"
        stroke="#fff"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m12.500 15.500 5 5 9-9"
      />
      <circle cx="32" cy="6" r="4.500" fill="#F26B2A" />
    </svg>
  )
}

export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark />
      <span className="font-display text-xl font-bold tracking-tight text-ink">SpotCheck</span>
    </div>
  )
}
