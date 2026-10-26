import type {
  LiveQuote,
  MetricCard as MetricCardData
} from '@/types'
import MetricIcon from './MetricIcon'
import {
  formatAsOf,
  formatSignedPercent,
  toneFor,
  trendFor
} from './metricFormat'

const trendArrow = {
  up: '↑',
  down: '↓',
  flat: '→'
} as const

function formatLiveValue(live: LiveQuote): string {
  const value = live.value.toLocaleString('pt-BR', {
    minimumFractionDigits: live.decimals,
    maximumFractionDigits: live.decimals
  })

  return `${live.prefix ?? ''}${value}${live.suffix ?? ''}`
}

export default function MetricCard({
  metric,
  live,
  pending = false
}: {
  metric: MetricCardData
  live?: LiveQuote
  pending?: boolean
}) {
  const isPending = pending && !live
  const value = isPending
    ? '—'
    : live
      ? formatLiveValue(live)
      : metric.value
  const delta = isPending
    ? '—'
    : live
      ? formatSignedPercent(live.changePercent)
      : metric.delta
  const deltaLabel = isPending ? '' : live ? 'agora' : metric.deltaLabel
  const trend = isPending
    ? 'flat'
    : live
      ? trendFor(live.changePercent)
      : metric.trend
  const tone = isPending
    ? 'neutral'
    : live
      ? toneFor(live.changePercent, live.positiveIsGood)
      : metric.tone
  const severity = isPending
    ? 'normal'
    : live
      ? Math.abs(live.changePercent) >= 3
        ? 'warning'
        : 'normal'
      : metric.severity
  const source = live ? live.source : metric.source
  const updatedAt = live ? live.updatedAt : metric.updatedAt

  return (
    <article className={`metric-card panel metric-${severity}`}>
      <div className="metric-head">
        <h2 className="metric-label">{metric.label}</h2>
        <div className="metric-head-right">
          {live && (
            <span className={`live-badge live-${live.status}`}>
              {live.status === 'live' ? 'LIVE' : 'STALE'}
            </span>
          )}
          <MetricIcon name={metric.icon} />
        </div>
      </div>

      <div className="metric-value-row">
        <span className="metric-value">{value}</span>
        <span className={`metric-delta tone-${tone}`}>
          <span aria-hidden="true">{trendArrow[trend]}</span>
          {delta}
          {deltaLabel && (
            <span className="metric-delta-label">{deltaLabel}</span>
          )}
        </span>
      </div>

      <p className="metric-description">{metric.description}</p>

      <div className="metric-footer">
        {isPending ? (
          <span>aguardando</span>
        ) : (
          <>
            <span>{source}</span>
            <time dateTime={updatedAt}>{formatAsOf(updatedAt)}</time>
          </>
        )}
      </div>
    </article>
  )
}
