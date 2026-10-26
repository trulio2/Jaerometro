import type {
  BtcQuote,
  ImpostometroData,
  IRealtimeRepository,
  LiveQuote,
  LiveStatus
} from '@/types'

type AwesomeUsdResponse = {
  USDBRL?: {
    bid: string
    pctChange: string
    timestamp: string
  }
}

type B3Quote = {
  closPric: number
  dtTm: string
  prcFlcn: number
}

type B3Response = {
  TradgFlr?: {
    date?: string
    scty?: {
      lstQtn?: B3Quote[]
    }
  }
}

type CoinGeckoResponse = {
  bitcoin?: {
    usd?: number
    brl?: number
    usd_24h_change?: number
    brl_24h_change?: number
    last_updated_at?: number
  }
}

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number
        regularMarketChangePercent?: number
        regularMarketTime?: number
      }
    }>
  }
}

const STALE_AFTER_MS = 5 * 60_000

function statusFor(updatedAt: string): LiveStatus {
  const age = Date.now() - new Date(updatedAt).getTime()

  return age <= STALE_AFTER_MS ? 'live' : 'stale'
}

function parseNumber(value: string | number): number {
  return Number(String(value).replace(',', '.'))
}

export default class RealtimeRepository implements IRealtimeRepository {
  public async fetchUsd(): Promise<LiveQuote> {
    const response = await fetch(
      'https://economia.awesomeapi.com.br/json/last/USD-BRL',
      { cache: 'no-store' }
    )

    if (!response.ok) {
      throw new Error(`Falha no dólar (${response.status})`)
    }

    const payload = (await response.json()) as AwesomeUsdResponse
    const quote = payload.USDBRL

    if (!quote) throw new Error('Dólar indisponível')

    const updatedAt = new Date(
      Number(quote.timestamp) * 1000
    ).toISOString()

    return {
      id: 'usd',
      value: parseNumber(quote.bid),
      changePercent: parseNumber(quote.pctChange),
      updatedAt,
      source: 'AwesomeAPI',
      status: statusFor(updatedAt),
      positiveIsGood: true,
      decimals: 2,
      prefix: 'R$ '
    }
  }

  public async fetchBtc(): Promise<BtcQuote> {
    const url = new URL('https://api.coingecko.com/api/v3/simple/price')
    url.searchParams.set('ids', 'bitcoin')
    url.searchParams.set('vs_currencies', 'usd,brl')
    url.searchParams.set('include_24hr_change', 'true')
    url.searchParams.set('include_last_updated_at', 'true')

    const response = await fetch(url, { cache: 'no-store' })

    if (!response.ok) {
      throw new Error(`Falha no BTC (${response.status})`)
    }

    const payload = (await response.json()) as CoinGeckoResponse
    const quote = payload.bitcoin

    if (!quote?.usd || !quote.brl) throw new Error('BTC indisponível')

    const updatedAt = new Date(
      (quote.last_updated_at ?? Date.now() / 1000) * 1000
    ).toISOString()

    return {
      usd: quote.usd,
      brl: quote.brl,
      usdChangePercent: quote.usd_24h_change ?? 0,
      brlChangePercent: quote.brl_24h_change ?? 0,
      updatedAt,
      source: 'CoinGecko',
      status: statusFor(updatedAt)
    }
  }

  public async fetchImpostometro(): Promise<ImpostometroData | null> {
    const proxyUrl = import.meta.env
      .VITE_IMPOSTOMETRO_PROXY_URL as string | undefined

    if (!proxyUrl) return null

    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const url = new URL(proxyUrl)
    url.searchParams.set('dataInicial', `01/01/${year}`)
    url.searchParams.set('dataFinal', `${day}/${month}/${year}`)

    const response = await fetch(url, { cache: 'no-store' })

    if (!response.ok) {
      throw new Error(`Falha no Impostômetro (${response.status})`)
    }

    const payload = (await response.json()) as {
      Valor?: number
      Incremento?: number
      Data?: string
    }

    if (!payload.Valor || !payload.Incremento || !payload.Data) {
      throw new Error('Impostômetro indisponível')
    }

    const raw = payload.Data.split('.')[0]

    return {
      value: payload.Valor,
      incrementPerSecond: payload.Incremento,
      updatedAt: new Date(`${raw}-03:00`).toISOString()
    }
  }

  public async fetchEwz(): Promise<LiveQuote> {
    const target =
      'https://query1.finance.yahoo.com/v8/finance/chart/' +
      'EWZ?range=1d&interval=5m'
    const response = await fetch(
      `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`,
      { cache: 'no-store' }
    )

    if (!response.ok) {
      throw new Error(`Falha no EWZ (${response.status})`)
    }

    const payload = (await response.json()) as YahooChartResponse
    const meta = payload.chart?.result?.[0]?.meta

    if (!meta?.regularMarketPrice || !meta.regularMarketTime) {
      throw new Error('EWZ indisponível')
    }

    const updatedAt = new Date(
      meta.regularMarketTime * 1000
    ).toISOString()

    return {
      id: 'ewz',
      value: meta.regularMarketPrice,
      changePercent: meta.regularMarketChangePercent ?? 0,
      updatedAt,
      source: 'Yahoo Finance',
      status: statusFor(updatedAt),
      positiveIsGood: true,
      decimals: 2,
      prefix: 'US$ '
    }
  }

  public async fetchIbov(): Promise<LiveQuote> {
    const response = await fetch(
      'https://cotacao.b3.com.br/mds/api/v1/DailyFluctuationHistory/IBOV',
      { cache: 'no-store', headers: { Accept: 'application/json' } }
    )

    if (!response.ok) {
      throw new Error(`Falha no IBOV (${response.status})`)
    }

    const payload = (await response.json()) as B3Response
    const date = payload.TradgFlr?.date
    const quotes = payload.TradgFlr?.scty?.lstQtn ?? []
    const quote = quotes[quotes.length - 1]

    if (!date || !quote) throw new Error('IBOV indisponível')

    const updatedAt = new Date(
      `${date}T${quote.dtTm}-03:00`
    ).toISOString()

    return {
      id: 'ibov',
      value: parseNumber(quote.closPric),
      changePercent: parseNumber(quote.prcFlcn),
      updatedAt,
      source: 'B3',
      status: statusFor(updatedAt),
      positiveIsGood: true,
      decimals: 0,
      suffix: ' pts'
    }
  }
}
