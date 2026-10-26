import type { CSSProperties } from 'react'
import { Navigate, NavLink, useParams, useSearchParams } from 'react-router-dom'
import {
  AlertsPanel,
  ChartDialog,
  ChartPanel,
  MetricTile,
  NewsPanel
} from '@/components/dashboard'
import { useDashboard } from '@/modules/services'
import type {
  DashboardChart,
  DashboardSection,
  DashboardSnapshot
} from '@/types'
import './Home.css'

type DashboardTab = 'overview' | DashboardSection | 'news'

const tabs: { id: DashboardTab; path: string; label: string }[] = [
  { id: 'overview', path: '', label: 'Visão geral' },
  { id: 'market', path: 'mercado', label: 'Mercado' },
  { id: 'fiscal', path: 'fiscal', label: 'Fiscal' },
  { id: 'monetary', path: 'monetario', label: 'Monetário' },
  { id: 'future', path: 'futuro', label: 'Futuro' },
  { id: 'news', path: 'noticias', label: 'Notícias' }
]

// The most crisis-relevant readings, shown together on the first screen.
const overviewMetricIds = [
  'debt',
  'ipca',
  'selic',
  'real-rate',
  'flow',
  'interest',
  'janjometro'
]
const overviewChartIds = ['usd-12m', 'debt-12m', 'real-rate-12m', 'ipca-12m']

function gridStyle(count: number): CSSProperties {
  const cols = count <= 3 ? count : count === 4 ? 2 : 3

  return {
    '--cols': cols,
    '--rows': Math.ceil(count / cols)
  } as CSSProperties
}

function pick<T extends { id: string }>(items: T[], ids: string[]): T[] {
  return ids.flatMap((id) => items.find((item) => item.id === id) ?? [])
}

function tabCount(snapshot: DashboardSnapshot, tab: DashboardTab): number {
  if (tab === 'overview') return 0
  if (tab === 'news') return snapshot.news?.length ?? 0
  return snapshot.charts.filter((chart) => chart.section === tab).length
}

function DashboardTabs({ snapshot }: { snapshot: DashboardSnapshot }) {
  return (
    <nav className="dashboard-tabs" aria-label="Seções do painel">
      <ul>
        {tabs.map((tab) => {
          const count = tabCount(snapshot, tab.id)

          return (
            <li key={tab.id}>
              <NavLink
                to={`/${tab.path}`}
                end
                className={({ isActive }) =>
                  `dashboard-tab${isActive ? ' active' : ''}`
                }
              >
                {tab.label}
                {count > 0 && <span className="tab-count">{count}</span>}
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

function ChartGrid({
  charts,
  onExpand
}: {
  charts: DashboardChart[]
  onExpand: (id: string) => void
}) {
  return (
    <div className="chart-grid" style={gridStyle(charts.length)}>
      {charts.map((chart) => (
        <ChartPanel
          key={chart.id}
          chart={chart}
          onExpand={() => onExpand(chart.id)}
        />
      ))}
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="dashboard">
      <div className="skeleton-tabs" />
      <div className="overview">
        <div className="overview-metrics">
          {overviewMetricIds.map((id) => (
            <div key={id} className="metric-tile panel skeleton" />
          ))}
        </div>
        <div className="chart-grid" style={gridStyle(4)}>
          {overviewChartIds.map((id) => (
            <div key={id} className="panel skeleton skeleton-chart" />
          ))}
        </div>
        <div className="overview-side panel skeleton" />
      </div>
    </div>
  )
}

function Home() {
  const { tab: tabPath = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { snapshot, status, error, refresh } = useDashboard()
  const tab = tabs.find((item) => item.path === tabPath)

  if (!tab) return <Navigate to="/" replace />

  if (!snapshot) {
    if (status === 'error') {
      return (
        <section className="dashboard-error panel">
          <h1>Falha no feed</h1>
          <p>{error ?? 'Não foi possível carregar o dashboard.'}</p>
          <button type="button" className="btn" onClick={() => void refresh()}>
            Tentar novamente
          </button>
        </section>
      )
    }

    return <DashboardSkeleton />
  }

  const expandedChart = snapshot.charts.find(
    (chart) => chart.id === searchParams.get('chart')
  )

  const expand = (id: string) =>
    setSearchParams({ chart: id }, { replace: true })

  const collapse = () =>
    setSearchParams(
      (params) => {
        params.delete('chart')
        return params
      },
      { replace: true }
    )

  return (
    <div className="dashboard">
      <DashboardTabs snapshot={snapshot} />

      {tab.id === 'overview' ? (
        <div className="overview">
          <section className="overview-metrics" aria-label="Indicadores">
            {pick(snapshot.metrics, overviewMetricIds).map((metric) => (
              <MetricTile key={metric.id} metric={metric} />
            ))}
          </section>

          <ChartGrid
            charts={pick(snapshot.charts, overviewChartIds)}
            onExpand={expand}
          />

          <div className="overview-side">
            <AlertsPanel alerts={snapshot.alerts} />
            <NewsPanel news={snapshot.news ?? []} limit={3} compact />
          </div>
        </div>
      ) : tab.id === 'news' ? (
        <NewsPanel news={snapshot.news ?? []} />
      ) : (
        <ChartGrid
          charts={snapshot.charts.filter((chart) => chart.section === tab.id)}
          onExpand={expand}
        />
      )}

      {expandedChart && (
        <ChartDialog chart={expandedChart} onClose={collapse} />
      )}
    </div>
  )
}

export default Home
