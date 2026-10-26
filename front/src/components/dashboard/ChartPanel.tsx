import type { DashboardChart } from '@/types'
import BarChartPanel from './BarChartPanel'
import CandlestickPanel from './CandlestickPanel'
import LineChartPanel from './LineChartPanel'

export default function ChartPanel({
  chart,
  onExpand
}: {
  chart: DashboardChart
  onExpand?: () => void
}) {
  if (chart.kind === 'candle') {
    return <CandlestickPanel chart={chart} onExpand={onExpand} />
  }

  if (chart.kind === 'line') {
    return <LineChartPanel chart={chart} onExpand={onExpand} />
  }

  return <BarChartPanel chart={chart} onExpand={onExpand} />
}
