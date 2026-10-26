import { useDashboard, useRealtimeQuotes } from '@/modules/services'
import TickerStrip from './TickerStrip'

// Owns the live-quote polling, so it runs only while the ticker is on screen.
export default function LiveTicker() {
  const { snapshot } = useDashboard()
  const { quotes, btc, impostometro } = useRealtimeQuotes()

  if (!snapshot) return null

  return (
    <TickerStrip
      generatedAt={snapshot.generatedAt}
      liveQuotes={quotes}
      btc={btc}
      impostometro={impostometro ?? snapshot.impostometro}
    />
  )
}
