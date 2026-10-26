import type { ChartSeries } from '@/types'

export function formatSeriesValue(
  value: number,
  series?: ChartSeries
): string {
  const decimals = series?.decimals ?? 0
  const number = value.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })

  return `${series?.prefix ?? ''}${number}${series?.suffix ?? ''}`
}

export function formatAxisValue(
  value: number,
  series?: ChartSeries
): string {
  if (series?.suffix === '%' || series?.suffix === '% PIB') {
    return `${value.toFixed(1)}%`
  }

  return String(Math.round(value))
}
