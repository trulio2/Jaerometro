import type { ImpostometroData } from './dashboard.types'

export type LiveStatus = 'live' | 'stale'

export interface LiveQuote {
  id: string
  value: number
  changePercent: number
  updatedAt: string
  source: string
  status: LiveStatus
  positiveIsGood: boolean
  decimals: number
  prefix?: string
  suffix?: string
}

export interface BtcQuote {
  usd: number
  brl: number
  usdChangePercent: number
  brlChangePercent: number
  updatedAt: string
  source: string
  status: LiveStatus
}

export interface IRealtimeService {
  start(): void
  stop(): void
}

export interface IRealtimeRepository {
  fetchUsd(): Promise<LiveQuote>
  fetchIbov(): Promise<LiveQuote>
  fetchBtc(): Promise<BtcQuote>
  fetchEwz(): Promise<LiveQuote>
  fetchImpostometro(): Promise<ImpostometroData | null>
}
