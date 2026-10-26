import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import type { DashboardChart, Severity } from '@/types'
import { formatAxisValue, formatSeriesValue } from './chartFormat'
import ExpandButton from './ExpandButton'

const barColor: Record<Severity, string> = {
  normal: '#2de2e6',
  warning: '#f5c542',
  critical: '#ff4d5e'
}

export default function BarChartPanel({
  chart,
  onExpand
}: {
  chart: DashboardChart
  onExpand?: () => void
}) {
  const series = chart.series[0]
  const points = series?.points ?? []

  return (
    <section className="panel chart-panel">
      <header className="panel-heading">
        <div>
          <h2>{chart.title}</h2>
          <p>{chart.subtitle}</p>
        </div>
        {onExpand && <ExpandButton title={chart.title} onClick={onExpand} />}
      </header>

      <div className="chart-body" role="img" aria-label={chart.title}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={points}
            margin={{ top: 8, right: 4, left: -8, bottom: 0 }}
          >
            <CartesianGrid
              stroke="#1a2b2e"
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fill: '#69878a', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              minTickGap={22}
            />
            <YAxis
              tick={{ fill: '#69878a', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={38}
              tickFormatter={(value: number) =>
                formatAxisValue(value, series)
              }
            />
            <Tooltip
              cursor={{ fill: 'rgba(45, 226, 230, 0.04)' }}
              contentStyle={{
                background: '#0b1416',
                border: '1px solid #243f42',
                borderRadius: 4,
                fontFamily: 'var(--mono)',
                fontSize: 11
              }}
              labelStyle={{ color: '#69878a' }}
              itemStyle={{ color: '#d9e8e9' }}
              labelFormatter={(value) => `Período: ${value}`}
              formatter={(value) => [
                formatSeriesValue(Number(value), series),
                series?.label ?? chart.title
              ]}
            />
            <Bar dataKey="value" radius={[2, 2, 0, 0]} isAnimationActive={false}>
              {points.map((point) => (
                <Cell
                  key={point.date}
                  fill={barColor[point.severity ?? 'normal']}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
