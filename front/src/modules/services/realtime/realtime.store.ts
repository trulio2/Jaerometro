import { create } from 'zustand'
import type { BtcQuote, ImpostometroData, LiveQuote } from '@/types'

type RealtimeState = {
  quotes: Record<string, LiveQuote>
  btc: BtcQuote | null
  impostometro: ImpostometroData | null
  setQuote: (quote: LiveQuote) => void
  setBtc: (quote: BtcQuote) => void
  setImpostometro: (data: ImpostometroData) => void
  markStale: (id: string) => void
  markBtcStale: () => void
}

export const realtimeStore = create<RealtimeState>()((set) => ({
  quotes: {},
  btc: null,
  impostometro: null,
  setQuote: (quote) =>
    set((state) => ({
      quotes: { ...state.quotes, [quote.id]: quote }
    })),
  setBtc: (btc) => set({ btc }),
  setImpostometro: (impostometro) => set({ impostometro }),
  markStale: (id) =>
    set((state) => {
      const current = state.quotes[id]

      if (!current || current.status === 'stale') return state

      return {
        quotes: {
          ...state.quotes,
          [id]: { ...current, status: 'stale' }
        }
      }
    }),
  markBtcStale: () =>
    set((state) => {
      if (!state.btc || state.btc.status === 'stale') return state

      return { btc: { ...state.btc, status: 'stale' } }
    })
}))
