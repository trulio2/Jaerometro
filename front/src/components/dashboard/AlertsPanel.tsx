import type { AlertSeverity, DashboardAlert } from '@/types'
import { formatAsOf } from './metricFormat'

const alertIcon: Record<AlertSeverity, string> = {
  critical: 'M12 3 2.8 20h18.4L12 3Zm0 5.2v5.1m0 3.1v.1',
  warning: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-5.2v-5.1m0-3.1v-.1',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-9.4V16m0-7.2v-.1'
}

function AlertIcon({ severity }: { severity: AlertSeverity }) {
  return (
    <svg
      className="alert-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={alertIcon[severity]} />
    </svg>
  )
}

export default function AlertsPanel({ alerts }: { alerts: DashboardAlert[] }) {
  return (
    <aside className="panel alerts-panel" aria-label="Log de alertas">
      <header className="alerts-header">
        <h2>LOG DE ALERTAS</h2>
        <span className="alerts-count">
          {String(alerts.length).padStart(2, '0')} ATIVOS
        </span>
      </header>

      <ul className="alerts-list">
        {alerts.map((alert) => (
          <li key={alert.id} className={`alert alert-${alert.severity}`}>
            <AlertIcon severity={alert.severity} />
            <div className="alert-content">
              <div className="alert-title-row">
                <h3>{alert.title}</h3>
                <time dateTime={alert.at}>{formatAsOf(alert.at)}</time>
              </div>
              <p>{alert.message}</p>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  )
}
