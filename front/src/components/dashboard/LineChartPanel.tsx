import { useId } from 'react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import type { DashboardChart } from '@/types'
import { formatAxisValue, formatSeriesValue } from './chartFormat'
import ExpandButton from './ExpandButton'

type ChartRow = Record<string, string | number | null>

function toRows(chart: DashboardChart): ChartRow[] {
  const labels = new Map<string, string>()
  const dates = new Set<string>()

  chart.series.forEach((series) => {
    series.points.forEach((point) => {
      dates.add(point.date)

      if (point.label) labels.set(point.date, point.label)
    })
  })

  return [...dates].sort().map((date) => {
    const row: ChartRow = {
      date,
      label: labels.get(date) ?? date
    }

    chart.series.forEach((series) => {
      const point = series.points.find((item) => item.date === date)
      row[series.id] = point?.value ?? null
    })

    return row
  })
}

export default function LineChartPanel({
  chart,
  onExpand
}: {
  chart: DashboardChart
  onExpand?: () => void
}) {
  const primary = chart.series[0]
  const hasRight = chart.series.some((series) => series.axis === 'right')
  const leftSeries =
    chart.series.find((series) => series.axis === 'left') ?? primary
  const leftCrossesZero = chart.series.some(
    (series) =>
      series.axis === 'left' &&
      series.points.some((point) => point.value < 0) &&
      series.points.some((point) => point.value > 0)
  )
  // The same chart can be mounted twice (grid and dialog), so gradient ids
  // need to be unique per instance; useId's punctuation is not valid in url().
  const gradientPrefix = `area${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const areaSeries = chart.series.filter((series) => series.type === 'area')

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
          <ComposedChart
            data={toRows(chart)}
            margin={{ top: 8, right: 4, left: -8, bottom: 0 }}
          >
            {areaSeries.length > 0 && (
              <defs>
                {areaSeries.map((series) => (
                  <linearGradient
                    key={series.id}
                    id={`${gradientPrefix}-${series.id}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor={series.color} stopOpacity={0.32} />
                    <stop offset="100%" stopColor={series.color} stopOpacity={0.02} />
                  </linearGradient>
                ))}
              </defs>
            )}
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
              yAxisId="left"
              tick={{ fill: '#69878a', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={38}
              domain={['auto', 'auto']}
              tickFormatter={(value: number) =>
                formatAxisValue(value, leftSeries)
              }
            />
            {hasRight && (
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: '#69878a', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={44}
                domain={['auto', 'auto']}
                tickFormatter={(value: number) =>
                  formatAxisValue(
                    value,
                    chart.series.find((series) => series.axis === 'right')
                  )
                }
              />
            )}
            <Tooltip
              contentStyle={{
                background: '#0b1416',
                border: '1px solid #243f42',
                borderRadius: 4,
                fontFamily: 'var(--mono)',
                fontSize: 11
              }}
              labelStyle={{ color: '#69878a' }}
              itemStyle={{ color: '#d9e8e9' }}
              labelFormatter={(label) => `Período: ${label}`}
              formatter={(value, name) => {
                const match = chart.series.find((item) => item.label === name)
                return [
                  formatSeriesValue(Number(value), match),
                  name
                ]
              }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              height={26}
              iconType="plainline"
              wrapperStyle={{
                fontFamily: 'var(--mono)',
                fontSize: 10,
                color: '#69878a'
              }}
            />
            {leftCrossesZero && (
              <ReferenceLine yAxisId="left" y={0} stroke="#2a4245" />
            )}
            {chart.series.map((series) =>
              series.type === 'area' ? (
                <Area
                  key={series.id}
                  yAxisId={series.axis}
                  type="monotone"
                  dataKey={series.id}
                  name={series.label}
                  stroke={series.color}
                  strokeWidth={2}
                  fill={`url(#${gradientPrefix}-${series.id})`}
                  activeDot={{ r: 3, strokeWidth: 0 }}
                  isAnimationActive={false}
                />
              ) : (
                <Line
                  key={series.id}
                  yAxisId={series.axis}
                  type="monotone"
                  dataKey={series.id}
                  name={series.label}
                  stroke={series.color}
                  strokeWidth={2}
                  strokeDasharray={series.dashed ? '5 4' : undefined}
                  dot={series.points.length <= 6 ? { r: 2.5, strokeWidth: 0 } : false}
                  activeDot={{ r: 3, strokeWidth: 0 }}
                  isAnimationActive={false}
                />
              )
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
