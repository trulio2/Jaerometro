export type DashboardFeed = 'live' | 'stale' | 'offline'

export type MetricSeverity = 'normal' | 'warning' | 'critical'

export type MetricTrend = 'up' | 'down' | 'flat'

export type MetricTone = 'positive' | 'negative' | 'neutral'

export type MetricIconName =
  | 'currency'
  | 'inflation'
  | 'risk'
  | 'curve'
  | 'flow'
  | 'crypto'

export type ChartAxis = 'left' | 'right'

export type ChartKind = 'line' | 'bar' | 'candle'

export type DashboardSection = 'market' | 'fiscal' | 'monetary' | 'future'

export type Severity = 'normal' | 'warning' | 'critical'

export type AlertSeverity = 'critical' | 'warning' | 'info'

export interface MetricCard {
  id: string
  label: string
  description: string
  value: string
  // Secondary reading shown next to the value, e.g. debt in R$.
  detail?: string
  delta: string
  deltaLabel: string
  trend: MetricTrend
  tone: MetricTone
  severity: MetricSeverity
  icon: MetricIconName
  source: string
  updatedAt: string
}

export interface SeriesPoint {
  date: string
  label?: string
  value: number
  severity?: Severity
  open?: number
  high?: number
  low?: number
  close?: number
}

export interface ChartSeries {
  id: string
  label: string
  color: string
  axis: ChartAxis
  // Only used by line charts: 'area' fills the space under the line.
  type?: 'line' | 'area'
  dashed?: boolean
  decimals?: number
  prefix?: string
  suffix?: string
  points: SeriesPoint[]
}

export interface DashboardChart {
  id: string
  title: string
  subtitle: string
  kind: ChartKind
  section: DashboardSection
  series: ChartSeries[]
}

export interface DashboardAlert {
  id: string
  severity: AlertSeverity
  title: string
  message: string
  at: string
}

export interface DashboardNews {
  id: string
  title: string
  source: string
  url: string
  publishedAt: string
  topic?: string
}

export interface ImpostometroData {
  value: number
  incrementPerSecond: number
  updatedAt: string
}

export interface DashboardSnapshot {
  generatedAt: string
  metrics: MetricCard[]
  charts: DashboardChart[]
  alerts: DashboardAlert[]
  news: DashboardNews[]
  impostometro: ImpostometroData | null
}

export interface IDashboardService {
  load(): Promise<void>
  refresh(): Promise<void>
}

export interface IDashboardRepository {
  fetchSnapshot(): Promise<DashboardSnapshot>
}
