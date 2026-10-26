import type {
  IRealtimeRepository,
  IRealtimeService
} from '@/types'
import { realtimeStore } from './realtime.store'

const POLL_INTERVAL_MS = 30_000

export default class RealtimeService implements IRealtimeService {
  private timer: number | null = null
  private running = false
  private inFlight = false

  constructor(private realtimeRepository: IRealtimeRepository) {}

  public start(): void {
    if (this.running) return

    this.running = true
    document.addEventListener('visibilitychange', this.handleVisibility)
    void this.refresh()
    this.timer = window.setInterval(() => {
      void this.refresh()
    }, POLL_INTERVAL_MS)
  }

  public stop(): void {
    this.running = false

    if (this.timer !== null) {
      window.clearInterval(this.timer)
      this.timer = null
    }

    document.removeEventListener('visibilitychange', this.handleVisibility)
  }

  private handleVisibility = (): void => {
    if (document.visibilityState === 'visible') {
      void this.refresh()
    }
  }

  private async refresh(): Promise<void> {
    if (
      !this.running ||
      this.inFlight ||
      document.visibilityState !== 'visible'
    ) {
      return
    }

    this.inFlight = true

    try {
      const [usd, ibov, btc, ewz, impostometro] =
        await Promise.allSettled([
          this.realtimeRepository.fetchUsd(),
          this.realtimeRepository.fetchIbov(),
          this.realtimeRepository.fetchBtc(),
          this.realtimeRepository.fetchEwz(),
          this.realtimeRepository.fetchImpostometro()
        ])

      if (usd.status === 'fulfilled') {
        realtimeStore.getState().setQuote(usd.value)
      } else {
        realtimeStore.getState().markStale('usd')
      }

      if (ibov.status === 'fulfilled') {
        realtimeStore.getState().setQuote(ibov.value)
      } else {
        realtimeStore.getState().markStale('ibov')
      }

      if (btc.status === 'fulfilled') {
        realtimeStore.getState().setBtc(btc.value)
      } else {
        realtimeStore.getState().markBtcStale()
      }

      if (ewz.status === 'fulfilled') {
        realtimeStore.getState().setQuote(ewz.value)
      } else {
        realtimeStore.getState().markStale('ewz')
      }

      if (impostometro.status === 'fulfilled' && impostometro.value) {
        realtimeStore.getState().setImpostometro(impostometro.value)
      }
    } finally {
      this.inFlight = false
    }
  }
}
