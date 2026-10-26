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

  // Keep one decimal for series like "R$ 11,1 tri" so nearby ticks differ.
  return value.toLocaleString('pt-BR', {
    maximumFractionDigits: Math.min(series?.decimals ?? 0, 1)
  })
}
