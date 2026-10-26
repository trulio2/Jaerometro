import type { DashboardNews } from '@/types'

function formatPublished(value: string): string {
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function NewsPanel({
  news,
  limit,
  compact = false
}: {
  news: DashboardNews[]
  limit?: number
  compact?: boolean
}) {
  if (!news.length) return null

  const items = limit ? news.slice(0, limit) : news

  return (
    <section className={`news-panel${compact ? ' news-compact' : ''}`}>
      <header className="section-heading">
        <h2>NOTÍCIAS CRUCIAIS</h2>
        <span>{String(items.length).padStart(2, '0')} itens</span>
      </header>

      <div className="news-grid">
        {items.map((item) => (
          <a
            key={item.id}
            className="panel news-card"
            href={item.url}
            target="_blank"
            rel="noreferrer"
          >
            <span className="news-source">
              {item.topic ? `${item.topic} · ${item.source}` : item.source}
            </span>
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
