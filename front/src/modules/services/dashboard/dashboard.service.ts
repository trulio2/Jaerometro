import type { IDashboardRepository, IDashboardService } from '@/types'
import { dashboardStore } from './dashboard.store'

export default class DashboardService implements IDashboardService {
  constructor(private dashboardRepository: IDashboardRepository) {}

  public load(): Promise<void> {
    if (dashboardStore.getState().status === 'loading') return Promise.resolve()
    return this.refresh()
  }

  public async refresh(): Promise<void> {
    dashboardStore.getState().setLoading()

    try {
      const snapshot = await this.dashboardRepository.fetchSnapshot()
      dashboardStore.getState().setSnapshot(snapshot)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Falha ao carregar dados'
      dashboardStore.getState().setError(message)
    }
  }
}
