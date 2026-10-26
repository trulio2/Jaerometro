import type {
  BtcQuote,
  ImpostometroData,
  LiveQuote,
  MetricCard as MetricCardData
} from '@/types'
import BtcCard from './BtcCard'
import ImpostometroCard from './ImpostometroCard'
import MetricCard from './MetricCard'

const liveOnlyMetrics = new Set(['usd', 'ibov', 'ewz'])

export default function MetricGrid({
  metrics,
  impostometro,
  liveQuotes,
  btc
}: {
  metrics: MetricCardData[]
  impostometro?: ImpostometroData | null
  liveQuotes?: Record<string, LiveQuote>
  btc?: BtcQuote | null
}) {
  return (
    <section className="dashboard-metrics" aria-label="Indicadores">
      {metrics.map((metric) => {
        const live = liveQuotes?.[metric.id]

        return (
          <MetricCard
            key={metric.id}
            metric={metric}
            live={live}
            pending={liveOnlyMetrics.has(metric.id) && !live}
          />
        )
      })}
      <BtcCard data={btc ?? null} />
      <ImpostometroCard data={impostometro ?? null} />
    </section>
  )
}
