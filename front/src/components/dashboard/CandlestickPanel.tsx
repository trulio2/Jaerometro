import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ColorType,
  CrosshairMode,
  LineStyle,
  createChart,
  type IChartApi,
  type Time
} from 'lightweight-charts'
import type { DashboardChart } from '@/types'
import { formatSeriesValue } from './chartFormat'
import ExpandButton from './ExpandButton'
import {
  movingAverage,
  rollingCandles,
  toCandles,
  type Candle,
  type CandleTimeframe
} from './candleData'

const BAR_SPACING: Record<CandleTimeframe, number> = {
  '1M': 7,
  '12M': 9
}

const MIN_BAR_SPACING = 3
const MAX_BAR_SPACING = 24
const ZOOM_STEP = 1.3
const AVERAGE_COLOR = '#f5c542'

const timeframes: CandleTimeframe[] = ['1M', '12M']

function toTime(date: string): Time {
  return (date.length === 7 ? `${date}-01` : date) as Time
}

export default function CandlestickPanel({
  chart,
  onExpand
}: {
  chart: DashboardChart
  onExpand?: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const [timeframe, setTimeframe] = useState<CandleTimeframe>('1M')
  const [hovered, setHovered] = useState<Candle | null>(null)
  const series = chart.series[0]

  const monthly = useMemo(() => toCandles(series?.points ?? []), [series])
  const candles = useMemo(
    () => (timeframe === '1M' ? monthly : rollingCandles(monthly)),
    [monthly, timeframe]
  )
  const average = useMemo(
    () => (timeframe === '1M' ? movingAverage(monthly) : []),
    [monthly, timeframe]
  )
  const shown = hovered ?? candles[candles.length - 1]

  useEffect(() => {
    const container = containerRef.current

    if (!container || !series) return

    const chartApi = createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: '#0b1117' },
        textColor: '#7d8d9e',
        fontFamily: 'ui-monospace, Consolas, monospace',
        fontSize: 11,
        attributionLogo: false
      },
      grid: {
        vertLines: { color: '#16222c' },
        horzLines: { color: '#16222c' }
      },
      rightPriceScale: {
        borderColor: '#1e2c38',
        scaleMargins: { top: 0.08, bottom: 0.08 }
      },
      timeScale: {
        borderColor: '#1e2c38',
        timeVisible: false,
        secondsVisible: false,
        barSpacing: BAR_SPACING[timeframe],
        minBarSpacing: MIN_BAR_SPACING,
        rightOffset: 1,
        fixLeftEdge: true,
        fixRightEdge: true
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: '#4b657a',
          width: 1,
          labelBackgroundColor: '#243444'
        },
        horzLine: {
          color: '#4b657a',
          width: 1,
          labelBackgroundColor: '#243444'
        }
      },
      // Wheel stays with the page; drag to pan, drag the time axis to zoom.
      handleScroll: {
        mouseWheel: false,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false
      },
      handleScale: {
        mouseWheel: false,
        pinch: true,
        axisPressedMouseMove: { time: true, price: false },
        axisDoubleClickReset: { time: true, price: true }
      }
    })

    const decimals = series.decimals ?? 2
    const priceFormat = {
      type: 'price' as const,
      precision: decimals,
      minMove: 1 / 10 ** decimals
    }

    const candleSeries = chartApi.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
      priceLineColor: '#26a69a',
      priceLineWidth: 1,
      priceFormat
    })

    candleSeries.setData(
      candles.map((candle) => ({ ...candle, time: toTime(candle.date) }))
    )

    if (average.length) {
      const averageSeries = chartApi.addLineSeries({
        color: AVERAGE_COLOR,
        lineWidth: 1,
        lineStyle: LineStyle.Solid,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
        priceFormat
      })

      averageSeries.setData(
        average.map((point) => ({
          time: toTime(point.date),
          value: point.value
        }))
      )
    }

    chartApi.subscribeCrosshairMove((param) => {
      const data = param.seriesData.get(candleSeries)

      setHovered(
        data && 'open' in data
          ? {
              date: String(data.time),
              open: data.open,
              high: data.high,
              low: data.low,
              close: data.close
            }
          : null
      )
    })

    chartRef.current = chartApi

    const observer = new ResizeObserver(() => {
      chartApi.applyOptions({
        width: container.clientWidth,
        height: container.clientHeight
      })
    })

    observer.observe(container)

    return () => {
      observer.disconnect()
      chartRef.current = null
      chartApi.remove()
    }
  }, [series, candles, average, timeframe])

  function zoom(factor: number) {
    const timeScale = chartRef.current?.timeScale()

    if (!timeScale) return

    const current = timeScale.options().barSpacing
    const next = Math.min(
      MAX_BAR_SPACING,
      Math.max(MIN_BAR_SPACING, current * factor)
    )

    timeScale.applyOptions({ barSpacing: next })
  }

  function reset() {
    const timeScale = chartRef.current?.timeScale()

    timeScale?.applyOptions({ barSpacing: BAR_SPACING[timeframe] })
    timeScale?.scrollToRealTime()
  }

  return (
    <section className="panel chart-panel candle-panel">
      <header className="candle-head">
        <div className="candle-title">
          <span className="candle-symbol">{series?.label ?? chart.title}</span>
          {average.length > 0 && (
            <span className="candle-average">MM12</span>
          )}
        </div>
        <div className="candle-toolbar">
          <div
            className="candle-timeframes"
            role="group"
            aria-label="Intervalo das velas"
          >
            {timeframes.map((option) => (
              <button
                key={option}
                type="button"
                className="candle-btn"
                aria-pressed={timeframe === option}
                title={
                  option === '1M'
                    ? 'Velas mensais'
                    : 'Cada vela representa os últimos 12 meses'
                }
                onClick={() => setTimeframe(option)}
              >
                {option}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="candle-btn"
            aria-label="Diminuir zoom"
            onClick={() => zoom(1 / ZOOM_STEP)}
          >
            −
          </button>
          <button
            type="button"
            className="candle-btn"
            aria-label="Aumentar zoom"
            onClick={() => zoom(ZOOM_STEP)}
          >
            +
          </button>
          <button
            type="button"
            className="candle-btn"
            aria-label="Restaurar visualização"
            title="Restaurar visualização"
            onClick={reset}
          >
            ⟲
          </button>
          {onExpand && <ExpandButton title={chart.title} onClick={onExpand} />}
        </div>
        {series && shown && (
          <div className="candle-ohlc">
            <span>A {formatSeriesValue(shown.open, series)}</span>
            <span>M {formatSeriesValue(shown.high, series)}</span>
            <span>m {formatSeriesValue(shown.low, series)}</span>
            <span>F {formatSeriesValue(shown.close, series)}</span>
          </div>
        )}
      </header>

      <div
        ref={containerRef}
        className="chart-body candle-body"
        role="img"
        aria-label={chart.title}
      />
    </section>
  )
}
