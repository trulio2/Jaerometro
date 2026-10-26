export function formatAsOf(value: string): string {
  if (/^\d{4}-\d{2}$/.test(value)) {
    return `${value.slice(5, 7)}/${value.slice(2, 4)}`
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return `${value.slice(8, 10)}/${value.slice(5, 7)}`
  }

  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function formatSignedPercent(value: number): string {
  const formatted = Math.abs(value).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
  const signal = value > 0 ? '+' : value < 0 ? '-' : ''

  return `${signal}${formatted}%`
}

export function trendFor(value: number): 'up' | 'down' | 'flat' {
  if (value > 0) return 'up'
  if (value < 0) return 'down'
  return 'flat'
}

export function toneFor(
  value: number,
  positiveIsGood: boolean
): 'positive' | 'negative' | 'neutral' {
  if (value === 0) return 'neutral'

  return (value > 0) === positiveIsGood ? 'positive' : 'negative'
}
