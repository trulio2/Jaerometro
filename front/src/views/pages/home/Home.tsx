import {
  AlertsPanel,
  BarChartPanel,
  CandlestickPanel,
  DashboardHeader,
  LineChartPanel,
  MetricGrid,
  NewsPanel
} from '@/components/dashboard'
import { useDashboard, useRealtimeQuotes } from '@/modules/services'
import type { DashboardSection } from '@/types'
import './Home.css'

const sectionOrder: DashboardSection[] = [
  'market',
  'fiscal',
  'monetary',
  'future'
]

const sectionLabel: Record<DashboardSection, string> = {
  market: 'MERCADO E CÂMBIO',
  fiscal: 'FISCAL E DÍVIDA',
  monetary: 'MONETÁRIO E INFLAÇÃO',
  future: 'EXPECTATIVAS FUTURAS'
}

function DashboardSkeleton() {
  return (
    <div className="dashboard">
      <div className="dashboard-header panel skeleton skeleton-header" />
      <div className="dashboard-layout">
        <div className="dashboard-main">
          <div className="dashboard-metrics">
            {Array.from({ length: 12 }, (_, index) => (
              <div
                key={index}
                className="metric-card panel skeleton skeleton-card"
              />
            ))}
          </div>
          <div className="dashboard-charts">
            <div className="panel skeleton skeleton-chart" />
            <div className="panel skeleton skeleton-chart" />
          </div>
        </div>
        <div className="panel skeleton skeleton-alerts" />
      </div>
    </div>
  )
}

function Home() {
  const { snapshot, status, error, refresh } = useDashboard()
  const {
    quotes: liveQuotes,
    btc,
    impostometro: liveImpostometro
  } = useRealtimeQuotes()

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

  return (
    <div className="dashboard">
      <DashboardHeader generatedAt={snapshot.generatedAt} />

      <div className="dashboard-layout">
        <div className="dashboard-main">
          <MetricGrid
            metrics={snapshot.metrics}
            impostometro={liveImpostometro ?? snapshot.impostometro}
            liveQuotes={liveQuotes}
            btc={btc}
          />

          {sectionOrder.map((section) => {
            const charts = snapshot.charts.filter(
              (chart) => chart.section === section
            )

            if (!charts.length) return null

            return (
              <section key={section} className="dashboard-section">
                <header className="section-heading">
                  <h2>{sectionLabel[section]}</h2>
                  <span>{String(charts.length).padStart(2, '0')} painéis</span>
                </header>

                <div className="dashboard-charts">
                  {charts.map((chart) =>
                    chart.kind === 'line' ? (
                      <LineChartPanel key={chart.id} chart={chart} />
                    ) : chart.kind === 'candle' ? (
                      <CandlestickPanel key={chart.id} chart={chart} />
                    ) : (
                      <BarChartPanel key={chart.id} chart={chart} />
                    )
                  )}
                </div>
              </section>
            )
          })}

          <NewsPanel news={snapshot.news ?? []} />

          <footer className="dashboard-footer">
            Gráficos por{' '}
            <a
              href="https://www.tradingview.com/"
              target="_blank"
              rel="noreferrer"
            >
              TradingView
            </a>
          </footer>
        </div>

        <AlertsPanel alerts={snapshot.alerts} />
      </div>
    </div>
  )
}

export default Home
