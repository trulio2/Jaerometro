import type { ReactNode } from 'react'
import type { MetricIconName } from '@/types'

const icons: Record<MetricIconName, ReactNode> = {
  currency: (
    <>
      <path d="M12 3v18" />
      <path d="M16.5 7.5c0-1.7-2-3-4.5-3s-4.5 1.3-4.5 3 2 3 4.5 3 4.5 1.3 4.5 3-2 3-4.5 3-4.5-1.3-4.5-3" />
    </>
  ),
  inflation: (
    <>
      <path d="M19 5 5 19" />
      <circle cx="7.5" cy="7.5" r="2.5" />
      <circle cx="16.5" cy="16.5" r="2.5" />
    </>
  ),
  risk: (
    <>
      <path d="M12 3 4.5 6v5.5c0 4.4 3.1 8.1 7.5 9.5 4.4-1.4 7.5-5.1 7.5-9.5V6L12 3Z" />
      <path d="M12 8v4" />
      <circle cx="12" cy="15.5" r=".75" fill="currentColor" />
    </>
  ),
  curve: (
    <>
      <path d="M4 19V5M4 19h16" />
      <path d="m7 15 4-4 3 2 5-6" />
    </>
  ),
  flow: (
    <>
      <path d="M4 14c2.5 0 2.5-3 5-3s2.5 3 5 3 2.5-3 5-3" />
      <path d="M4 9c2.5 0 2.5-3 5-3s2.5 3 5 3 2.5-3 5-3" />
    </>
  ),
  crypto: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 8h4.2a2.3 2.3 0 0 1 0 4.6H9m0 0h4.8a2.3 2.3 0 0 1 0 4.6H9M10.5 6v12M13.5 6v12" />
    </>
  )
}

export default function MetricIcon({ name }: { name: MetricIconName }) {
  return (
    <svg
      className="metric-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {icons[name]}
    </svg>
  )
}
