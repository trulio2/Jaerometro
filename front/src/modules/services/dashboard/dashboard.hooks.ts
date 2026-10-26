import { useEffect } from 'react'
import { useStore } from 'zustand'
import IoC from '@/modules/ioc'
import { SERVICES, type IDashboardService } from '@/types'
import { dashboardStore } from './dashboard.store'

export function useDashboard() {
  const service = IoC.getOrCreateInstance<IDashboardService>(SERVICES.DASHBOARD)
  const snapshot = useStore(dashboardStore, (state) => state.snapshot)
  const status = useStore(dashboardStore, (state) => state.status)
  const error = useStore(dashboardStore, (state) => state.error)

  useEffect(() => {
    if (status === 'idle') void service.load()
  }, [service, status])

  return {
    snapshot,
    status,
    error,
    refresh: () => service.refresh()
  }
}
