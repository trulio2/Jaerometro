import { useEffect, useState } from 'react'
import type { ImpostometroData } from '@/types'
import MetricIcon from './MetricIcon'

function currentValue(data: ImpostometroData): number {
  const updatedAt = new Date(data.updatedAt).getTime()
  const elapsed = Math.max(0, (Date.now() - updatedAt) / 1000)

  return data.value + data.incrementPerSecond * elapsed
}

function formatValue(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0
  })
}

export default function ImpostometroCard({
  data
}: {
  data: ImpostometroData | null
}) {
  const [value, setValue] = useState(() =>
    data ? currentValue(data) : 0
  )

  useEffect(() => {
    if (!data) return

    const tick = () => setValue(currentValue(data))
    tick()
    const timer = window.setInterval(tick, 1000)

    return () => window.clearInterval(timer)
  }, [data])

  if (!data) return null

  return (
    <article className="metric-card panel metric-live">
      <div className="metric-head">
        <h2 className="metric-label">IMPOSTÔMETRO</h2>
        <MetricIcon name="currency" />
      </div>

      <div className="metric-value-row">
        <span className="metric-value metric-value-live">
          {formatValue(value)}
        </span>
        <span className="metric-delta tone-neutral">
          <span className="live-dot" aria-hidden="true" />
          Ao vivo
        </span>
      </div>

      <p className="metric-description">Arrecadação estimada no ano</p>

      <div className="metric-footer">
        <span>impostometro.com.br</span>
        <time dateTime={data.updatedAt}>agora</time>
      </div>
    </article>
  )
}
