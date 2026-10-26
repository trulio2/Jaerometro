import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { DashboardSnapshot } from '@/types'

type DashboardStatus = 'idle' | 'loading' | 'ready' | 'error'

type DashboardState = {
  snapshot: DashboardSnapshot | null
  status: DashboardStatus
  error: string | null
  setLoading: () => void
  setSnapshot: (snapshot: DashboardSnapshot) => void
  setError: (error: string) => void
}

export const dashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      snapshot: null,
      status: 'idle',
      error: null,
      setLoading: () => set({ status: 'loading', error: null }),
      setSnapshot: (snapshot) =>
        set({ snapshot, status: 'ready', error: null }),
      setError: (error) => set({ status: 'error', error })
    }),
    {
      name: 'jaerometro-dashboard',
      partialize: (state) => ({ snapshot: state.snapshot })
    }
  )
)
