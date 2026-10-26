import type { DashboardSnapshot, IDashboardRepository } from '@/types'

const DATA_URL = `${import.meta.env.BASE_URL}data/dashboard.json`

export default class DashboardRepository implements IDashboardRepository {
  public async fetchSnapshot(): Promise<DashboardSnapshot> {
    const response = await fetch(DATA_URL, { cache: 'no-cache' })

    if (!response.ok) {
      throw new Error(`Falha ao carregar dados (${response.status})`)
    }

    return (await response.json()) as DashboardSnapshot
  }
}
