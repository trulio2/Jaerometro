import { useEffect, useState } from 'react'
import type { DashboardFeed } from '@/types'

const feedLabel: Record<DashboardFeed, string> = {
  live: 'FEED ATIVO',
  stale: 'FEED ATRASADO',
  offline: 'FEED OFFLINE'
}

function feedStatus(generatedAt: string, now: Date): DashboardFeed {
  const generated = new Date(generatedAt).getTime()

  if (Number.isNaN(generated)) return 'offline'

  const age = now.getTime() - generated

  if (age <= 36 * 60 * 60 * 1000) return 'live'
  if (age <= 72 * 60 * 60 * 1000) return 'stale'
  return 'offline'
}

export default function DashboardHeader({
  generatedAt
}: {
  generatedAt: string
}) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const date = now.toISOString().slice(0, 10)
  const time = now.toISOString().slice(11, 19)
  const feed = feedStatus(generatedAt, now)

  return (
    <header className="dashboard-header panel">
      <div className="dashboard-title">
        <span className="dashboard-mark" aria-hidden="true">
          ◈
        </span>
        <div>
          <h1>
            JAEROMETRO <span>// V1.0</span>
          </h1>
          <p>Monitoramento Macro-Financeiro de Alta Frequência</p>
        </div>
      </div>

      <div className="dashboard-status">
        <time dateTime={now.toISOString()}>
          {date} {time} UTC
        </time>
        <span className={`feed feed-${feed}`}>{feedLabel[feed]}</span>
      </div>
    </header>
  )
}
