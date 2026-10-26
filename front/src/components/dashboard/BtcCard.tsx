import type { BtcQuote } from '@/types'
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

function formatUsd(value: number): string {
  return `US$ ${value.toLocaleString('pt-BR', {
    maximumFractionDigits: 0
  })}`
}

function formatBrl(value: number): string {
  return `R$ ${value.toLocaleString('pt-BR', {
    maximumFractionDigits: 0
  })}`
}

export default function BtcCard({ data }: { data: BtcQuote | null }) {
  const trend = data ? trendFor(data.usdChangePercent) : 'flat'
  const tone = data ? toneFor(data.usdChangePercent, true) : 'neutral'
  const brlTone = data ? toneFor(data.brlChangePercent, true) : 'neutral'

  return (
    <article className="metric-card panel metric-live btc-card">
      <div className="metric-head">
        <h2 className="metric-label">BTC/USD</h2>
        <div className="metric-head-right">
          {data && (
            <span className={`live-badge live-${data.status}`}>
              {data.status === 'live' ? 'LIVE' : 'STALE'}
            </span>
          )}
          <MetricIcon name="crypto" />
        </div>
      </div>

      <div className="metric-value-row">
        <span className="metric-value">
          {data ? formatUsd(data.usd) : 'US$ —'}
        </span>
        <span className={`metric-delta tone-${tone}`}>
          <span aria-hidden="true">{trendArrow[trend]}</span>
          {data ? formatSignedPercent(data.usdChangePercent) : '—'}
          <span className="metric-delta-label">24h</span>
        </span>
      </div>

      <div className="btc-secondary">
        <span className="btc-secondary-label">BTC/BRL</span>
        <span className="btc-secondary-value">
          {data ? formatBrl(data.brl) : 'R$ —'}
        </span>
        <span className={`btc-secondary-change tone-${brlTone}`}>
          {data ? formatSignedPercent(data.brlChangePercent) : '—'}
        </span>
      </div>

      <div className="metric-footer">
        <span>{data?.source ?? 'CoinGecko'}</span>
        {data ? (
          <time dateTime={data.updatedAt}>{formatAsOf(data.updatedAt)}</time>
        ) : (
          <span>aguardando</span>
        )}
      </div>
    </article>
  )
}
