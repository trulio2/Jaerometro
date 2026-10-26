import { useEffect, useState } from 'react'
import type {
  BtcQuote,
  DashboardFeed,
  ImpostometroData,
  LiveQuote,
  LiveStatus,
  MetricCard
} from '@/types'
import {
  formatAsOf,
  formatQuote,
  formatSignedPercent,
  toneFor
} from './metricFormat'

type TickerStatus = LiveStatus | 'pending' | 'snapshot'

interface TickerQuote {
  id: string
  label: string
  value: string
  change?: number
  positiveIsGood?: boolean
  status: TickerStatus
  detail?: string
}

const statusLabel: Record<TickerStatus, string> = {
  live: 'Ao vivo',
  stale: 'Atrasado',
  pending: 'Aguardando',
  snapshot: 'Snapshot diário'
}

const feedLabel: Record<DashboardFeed, string> = {
  live: 'FEED ATIVO',
  stale: 'FEED ATRASADO',
  offline: 'FEED OFFLINE'
}

const liveQuoteLabels = [
  { id: 'usd', label: 'DÓLAR' },
  { id: 'ibov', label: 'IBOV' },
  { id: 'ewz', label: 'EWZ' }
]

function feedStatus(generatedAt: string, now: Date): DashboardFeed {
  const generated = new Date(generatedAt).getTime()

  if (Number.isNaN(generated)) return 'offline'

  const age = now.getTime() - generated

  if (age <= 36 * 60 * 60 * 1000) return 'live'
  if (age <= 72 * 60 * 60 * 1000) return 'stale'
  return 'offline'
}

function impostometroValue(data: ImpostometroData): number {
  const updatedAt = new Date(data.updatedAt).getTime()
  const elapsed = Math.max(0, (Date.now() - updatedAt) / 1000)

  return data.value + data.incrementPerSecond * elapsed
}

function useNow(): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  return now
}

function fromLive(id: string, label: string, live?: LiveQuote): TickerQuote {
  if (!live) return { id, label, value: '—', status: 'pending' }

  return {
    id,
    label,
    value: formatQuote(live.value, live),
    change: live.changePercent,
    positiveIsGood: live.positiveIsGood,
    status: live.status,
    detail: `${live.source} · ${formatAsOf(live.updatedAt)}`
  }
}

function fromBtc(btc: BtcQuote | null | undefined): TickerQuote[] {
  if (!btc) {
    return [
      { id: 'btc-usd', label: 'BTC/USD', value: '—', status: 'pending' },
      { id: 'btc-brl', label: 'BTC/BRL', value: '—', status: 'pending' }
    ]
  }

  const detail = `${btc.source} · ${formatAsOf(btc.updatedAt)}`

  return [
    {
      id: 'btc-usd',
      label: 'BTC/USD',
      value: formatQuote(btc.usd, { decimals: 0, prefix: 'US$ ' }),
      change: btc.usdChangePercent,
      status: btc.status,
      detail
    },
    {
      id: 'btc-brl',
      label: 'BTC/BRL',
      value: formatQuote(btc.brl, { decimals: 0, prefix: 'R$ ' }),
      change: btc.brlChangePercent,
      status: btc.status,
      detail
    }
  ]
}

function TickerItem({ quote }: { quote: TickerQuote }) {
  const tone =
    quote.change === undefined
      ? 'neutral'
      : toneFor(quote.change, quote.positiveIsGood ?? true)
  const title = [quote.label, statusLabel[quote.status], quote.detail]
    .filter(Boolean)
    .join(' — ')

  return (
    <li className="ticker-item" title={title}>
      <span
        className={`ticker-dot ticker-${quote.status}`}
        aria-label={statusLabel[quote.status]}
      />
      <span className="ticker-label">{quote.label}</span>
      <span className="ticker-value">{quote.value}</span>
      {quote.change !== undefined && (
        <span className={`ticker-change tone-${tone}`}>
          {formatSignedPercent(quote.change)}
        </span>
      )}
    </li>
  )
}

function ImpostometroItem({ data }: { data: ImpostometroData }) {
  const [value, setValue] = useState(() => impostometroValue(data))

  useEffect(() => {
    const tick = () => setValue(impostometroValue(data))
    tick()
    const timer = window.setInterval(tick, 1000)

    return () => window.clearInterval(timer)
  }, [data])

  return (
    <TickerItem
      quote={{
        id: 'impostometro',
        label: 'IMPOSTÔMETRO',
        value: formatQuote(value, { decimals: 0, prefix: 'R$ ' }),
        status: 'live',
        detail: 'Arrecadação estimada no ano · impostometro.com.br'
      }}
    />
  )
}

export default function TickerStrip({
  generatedAt,
  metrics,
  liveQuotes,
  btc,
  impostometro
}: {
  generatedAt: string
  metrics: MetricCard[]
  liveQuotes?: Record<string, LiveQuote>
  btc?: BtcQuote | null
  impostometro?: ImpostometroData | null
}) {
  const now = useNow()
  const feed = feedStatus(generatedAt, now)
  const janjometro = metrics.find((metric) => metric.id === 'janjometro')
  const quotes = [
    ...liveQuoteLabels.map(({ id, label }) =>
      fromLive(id, label, liveQuotes?.[id])
    ),
    ...fromBtc(btc)
  ]

  return (
    <header className="ticker panel">
      <ul className="ticker-list" aria-label="Cotações ao vivo">
        {quotes.map((quote) => (
          <TickerItem key={quote.id} quote={quote} />
        ))}
        {impostometro && <ImpostometroItem data={impostometro} />}
        {janjometro && (
          <TickerItem
            quote={{
              id: janjometro.id,
              label: janjometro.label,
              value: janjometro.value,
              status: 'snapshot',
              detail: `${janjometro.description} · ${janjometro.source}`
            }}
          />
        )}
      </ul>

      <div className="ticker-meta">
        <time dateTime={now.toISOString()}>
          {now.toISOString().slice(11, 19)} UTC
        </time>
        <span
          className={`feed feed-${feed}`}
          title={`Snapshot gerado em ${formatAsOf(generatedAt)}`}
        >
          {feedLabel[feed]}
        </span>
      </div>
    </header>
  )
}
