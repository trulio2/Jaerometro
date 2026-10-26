import { useEffect } from 'react'
import { useStore } from 'zustand'
import IoC from '@/modules/ioc'
import { SERVICES, type IRealtimeService } from '@/types'
import { realtimeStore } from './realtime.store'

export function useRealtimeQuotes() {
  const service = IoC.getOrCreateInstance<IRealtimeService>(SERVICES.REALTIME)
  const quotes = useStore(realtimeStore, (state) => state.quotes)
  const btc = useStore(realtimeStore, (state) => state.btc)
  const impostometro = useStore(realtimeStore, (state) => state.impostometro)

  useEffect(() => {
    service.start()
    return () => service.stop()
  }, [service])

  return { quotes, btc, impostometro }
}
