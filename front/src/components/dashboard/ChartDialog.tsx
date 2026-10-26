import { useEffect, useRef } from 'react'
import type { DashboardChart } from '@/types'
import ChartPanel from './ChartPanel'

export default function ChartDialog({
  chart,
  onClose
}: {
  chart: DashboardChart
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current

    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className="chart-dialog"
      aria-label={chart.title}
      onClose={onClose}
      onClick={(event) => {
        // A click on the backdrop lands on the dialog element itself.
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="chart-dialog-body">
        <button
          type="button"
          className="candle-btn chart-dialog-close"
          onClick={onClose}
        >
          Fechar ✕
        </button>
        <ChartPanel key={chart.id} chart={chart} />
      </div>
    </dialog>
  )
}
