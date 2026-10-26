import type { MetricCard } from '@/types'
import { formatAsOf } from './metricFormat'

const trendArrow = {
  up: '↑',
  down: '↓',
  flat: '→'
} as const

export default function MetricTile({ metric }: { metric: MetricCard }) {
  return (
    <article
      className={`metric-tile panel metric-${metric.severity}`}
      title={`${metric.description} · ${metric.source}`}
    >
      <div className="metric-tile-head">
        <h2 className="metric-label">{metric.label}</h2>
        <time dateTime={metric.updatedAt}>{formatAsOf(metric.updatedAt)}</time>
      </div>

      <div className="metric-value-row">
        <span className="metric-value">{metric.value}</span>
        <span className={`metric-delta tone-${metric.tone}`}>
          <span aria-hidden="true">{trendArrow[metric.trend]}</span>
          {metric.delta}
          {metric.deltaLabel && (
            <span className="metric-delta-label">{metric.deltaLabel}</span>
          )}
        </span>
      </div>
    </article>
  )
}
