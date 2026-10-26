import type { DashboardNews } from '@/types'

function formatPublished(value: string): string {
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function NewsPanel({ news }: { news: DashboardNews[] }) {
  if (!news.length) return null

  return (
    <section className="dashboard-section">
      <header className="section-heading">
        <h2>NOTÍCIAS CRUCIAIS</h2>
        <span>{String(news.length).padStart(2, '0')} itens</span>
      </header>

      <div className="news-grid">
        {news.map((item) => (
          <a
            key={item.id}
            className="panel news-card"
            href={item.url}
            target="_blank"
            rel="noreferrer"
          >
            <span className="news-source">{item.source}</span>
            <h3>{item.title}</h3>
            <time dateTime={item.publishedAt}>
              {formatPublished(item.publishedAt)}
            </time>
          </a>
        ))}
      </div>
    </section>
  )
}
