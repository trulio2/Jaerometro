import type { SeriesPoint } from '@/types'

export type CandleTimeframe = '1M' | '12M'

export interface Candle {
  date: string
  open: number
  high: number
  low: number
  close: number
}

export interface AveragePoint {
  date: string
  value: number
}

const WINDOW = 12

export function toCandles(points: SeriesPoint[]): Candle[] {
  return points.map((point) => ({
    date: point.date,
    open: point.open ?? point.value,
    high: point.high ?? point.value,
    low: point.low ?? point.value,
    close: point.close ?? point.value
  }))
}

// Each candle covers the 12 months ending on its date.
export function rollingCandles(candles: Candle[]): Candle[] {
  const result: Candle[] = []

  for (let index = WINDOW - 1; index < candles.length; index++) {
    const chunk = candles.slice(index - WINDOW + 1, index + 1)

    result.push({
      date: candles[index].date,
      open: chunk[0].open,
      high: Math.max(...chunk.map((candle) => candle.high)),
      low: Math.min(...chunk.map((candle) => candle.low)),
      close: chunk[chunk.length - 1].close
    })
  }

  return result
}

export function movingAverage(candles: Candle[]): AveragePoint[] {
  const result: AveragePoint[] = []
  let sum = 0

  candles.forEach((candle, index) => {
    sum += candle.close

    if (index >= WINDOW) sum -= candles[index - WINDOW].close
    if (index >= WINDOW - 1) {
      result.push({ date: candle.date, value: sum / WINDOW })
    }
  })

  return result
}
